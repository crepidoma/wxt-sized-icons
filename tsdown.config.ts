import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: 'esm',
  dts: true,
  clean: true,
  // wxt is a peerDependency and sharp is native, so keep them external (tsdown externalizes dependencies by default).
});
