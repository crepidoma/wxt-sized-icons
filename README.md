# wxt-module-sized-icons

A [WXT](https://wxt.dev) module for generating extension icons. Based on
[`@wxt-dev/auto-icons`](https://www.npmjs.com/package/@wxt-dev/auto-icons) (single base image →
all sizes, development indicator) with one extra capability: **a different source image per size**.

## Install

```sh
pnpm add -D @crepidoma/wxt-sized-icons
# peer dependency
pnpm add -D wxt
```

## Usage

Add the module and configure it under `sizedIcons` in `wxt.config.ts`:

```ts
import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@crepidoma/wxt-sized-icons'],
  sizedIcons: {
    // generated from baseIconPath
    sizes: [128, 48, 32, 16],
    // give specific sizes their own image, or add extra sizes
    overrides: {
      16: 'assets/icon-16.png',
      32: 'assets/icon-32.png',
    },
  },
});
```

The final set of generated sizes is the **union** of `sizes` and the keys of `overrides`.
Sizes not listed in `overrides` use `baseIconPath`.

## Options

| Option                 | Type                                   | Default              | Description                                                                 |
| ---------------------- | -------------------------------------- | -------------------- | --------------------------------------------------------------------------- |
| `enabled`              | `boolean`                              | `true`               | Enable icon generation.                                                     |
| `baseIconPath`         | `string`                               | `'assets/icon.png'`  | Base image for sizes in `sizes` (relative to src dir).                      |
| `developmentIndicator` | `'grayscale' \| 'overlay' \| false`    | `'grayscale'`        | Indicator applied in development mode.                                      |
| `sizes`                | `number[]`                             | `[128, 48, 32, 16]`  | Sizes generated from `baseIconPath`.                                        |
| `overrides`            | `Record<number, string>`               | `{}`                 | Per-size source image overrides (relative to src dir). Adds/replaces sizes. |

## Development

```sh
pnpm install
pnpm build      # tsdown → dist/
pnpm test       # vitest
pnpm lint       # biome
pnpm typecheck  # tsc --noEmit
pnpm publint    # validate package exports before publishing
```

## License

MIT
