import { access, mkdir } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import defu from 'defu';
import sharp from 'sharp';
import 'wxt';
import { defineWxtModule } from 'wxt/modules';

export default defineWxtModule<SizedIconsOptions>({
  name: '@crepidoma/wxt-sized-icons',
  configKey: 'sizedIcons',
  async setup(wxt, options) {
    const parsedOptions = defu<Required<SizedIconsOptions>, SizedIconsOptions[]>(options, {
      enabled: true,
      baseIconPath: 'assets/icon.png',
      developmentIndicator: 'grayscale',
      sizes: [128, 48, 32, 16],
      overrides: {},
    });

    if (!parsedOptions.enabled) {
      return wxt.logger.warn(`\`[sized-icons]\` ${this.name} disabled`);
    }

    // Build the size -> source image map.
    // - sizes: generated from baseIconPath (same behavior as auto-icons)
    // - overrides: per-size source image (replace an existing size or add a new one)
    // The final set of sizes is the union of `sizes` and the keys of `overrides`.
    const baseIconPath = resolve(wxt.config.srcDir, parsedOptions.baseIconPath);
    const sources = new Map<number, string>();
    for (const size of parsedOptions.sizes) {
      sources.set(size, baseIconPath);
    }
    for (const [size, path] of Object.entries(parsedOptions.overrides)) {
      sources.set(Number(size), resolve(wxt.config.srcDir, path));
    }

    if (sources.size === 0) {
      return wxt.logger.warn('`[sized-icons]` No icon sizes specified, skipping icon generation');
    }

    // Check existence. Missing source images are warned about and skipped.
    const resolvedPaths = new Map<number, string>();
    const rejectedPaths = new Map<number, string>();
    await Promise.all(
      [...sources.entries()].map(async ([size, path]) => {
        if (await exists(path)) {
          resolvedPaths.set(size, path);
        } else {
          rejectedPaths.set(size, path);
        }
      }),
    );

    if (rejectedPaths.size > 0) {
      const list = [...rejectedPaths.entries()].map(([size, path]) => ` - ${size}: ${relative(wxt.config.srcDir, path)}`).join('\n');
      if (resolvedPaths.size === 0) {
        return wxt.logger.warn(`\`[sized-icons]\` No valid icon source paths found, skipping icon generation:\n${list}`);
      }
      wxt.logger.warn(`\`[sized-icons]\` Some icon source paths were not found and will be skipped:\n${list}`);
    }

    wxt.hooks.hook('build:manifestGenerated', (_wxt, manifest) => {
      if (manifest.icons) {
        _wxt.logger.warn('`[sized-icons]` icons property found in manifest, overwriting with auto-generated icons');
      }
      manifest.icons = Object.fromEntries([...resolvedPaths.keys()].map((size) => [size, `icons/${size}.png`]));
    });

    wxt.hooks.hook('build:done', async (_wxt, output) => {
      const iconsDir = resolve(_wxt.config.outDir, 'icons');
      await mkdir(iconsDir, { recursive: true });

      const generated: string[] = [];
      await Promise.all(
        [...resolvedPaths.entries()].map(async ([size, path]) => {
          const image = await renderIcon(path, size, parsedOptions.developmentIndicator, _wxt.config.mode);
          const generatedPath = resolve(iconsDir, `${size}.png`);
          await image.toFile(generatedPath);
          generated.push(generatedPath);
          output.publicAssets.push({ type: 'asset', fileName: `icons/${size}.png` });
        }),
      );

      _wxt.logger.info(`\`[sized-icons]\` Generated icon(s):\n${generated.map((path) => ` - ${relative(_wxt.config.srcDir, path)}`).join('\n')}`);
    });

    wxt.hooks.hook('prepare:publicPaths', (_wxt, paths) => {
      for (const size of resolvedPaths.keys()) {
        paths.push(`icons/${size}.png`);
      }
    });
  },
});

async function exists(path: string): Promise<boolean> {
  return access(path).then(
    () => true,
    () => false,
  );
}

/** Resize the source image and return a sharp instance with the development indicator (grayscale / overlay) applied. */
async function renderIcon(sourcePath: string, size: number, indicator: DevelopmentIndicator, mode: string): Promise<sharp.Sharp> {
  const image = sharp(sourcePath).resize(size).png();
  if (mode !== 'development' || indicator === false) {
    return image;
  }
  if (indicator === 'grayscale') {
    return image.grayscale();
  }
  // overlay: place a yellow band with black "DEV" text over the bottom half of the icon.
  const overlay = await sharp(buildDevOverlay(size)).png().toBuffer();
  return image.composite([{ input: overlay, left: 0, top: 0 }]);
}

function buildDevOverlay(size: number): Buffer {
  const rectHeight = Math.round(size * 0.5);
  const fontSize = Math.round(size * 0.35);
  return Buffer.from(
    `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="${size - rectHeight}" width="${size}" height="${rectHeight}" fill="#ffff00" />
  <text x="${size / 2}" y="${size - rectHeight / 2}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="bold" fill="black" text-anchor="middle" dominant-baseline="middle">DEV</text>
</svg>`,
  );
}

type DevelopmentIndicator = 'grayscale' | 'overlay' | false;

/** Options for the sized-icons module. */
export interface SizedIconsOptions {
  /**
   * Enable icon generation.
   * @default true
   */
  enabled?: boolean;
  /**
   * Base image used for every size listed in `sizes`. Relative to the project's src directory.
   * @default 'assets/icon.png'
   */
  baseIconPath?: string;
  /**
   * Visual indicator applied to icons in development mode.
   * `'grayscale'` converts to grayscale, `'overlay'` adds a yellow "DEV" band,
   * `false` disables any indicator.
   * @default 'grayscale'
   */
  developmentIndicator?: DevelopmentIndicator;
  /**
   * Sizes generated from `baseIconPath`.
   * @default [128, 48, 32, 16]
   */
  sizes?: number[];
  /**
   * Per-size source image overrides, relative to the project's src directory.
   * Give specific sizes a different image, or add sizes beyond `sizes`.
   * The final size set is the union of `sizes` and these keys.
   * @default {}
   */
  overrides?: Record<number, string>;
}

declare module 'wxt' {
  export interface InlineConfig {
    sizedIcons?: SizedIconsOptions;
  }
}
