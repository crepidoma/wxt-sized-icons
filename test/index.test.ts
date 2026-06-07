import { describe, expect, it } from 'vitest';
import sizedIcons from '../src/index';

describe('wxt-module-sized-icons', () => {
  it('is a wxt module with the expected name and config key', () => {
    expect(sizedIcons.name).toBe('@crepidoma/wxt-sized-icons');
    expect(sizedIcons.configKey).toBe('sizedIcons');
    expect(typeof sizedIcons.setup).toBe('function');
  });
});
