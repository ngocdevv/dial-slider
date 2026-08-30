import { describe, expect, test } from 'bun:test';
import { join } from 'node:path';

const packageRoot = join(import.meta.dir, '..');

describe('public package surface', () => {
  test('exports the component and supported public types only', async () => {
    const source = await Bun.file(join(packageRoot, 'src/index.ts')).text();
    expect(source).toContain('export { DialSlider }');
    expect(source).toContain('DialPreset');
    expect(source).toContain('DialSliderProps');
    expect(source).not.toContain('DIAL_CONFIG');
    expect(source).not.toContain('COLORS');
  });

  test('declares source, JavaScript, types, and React Native entry points', async () => {
    const manifest = await Bun.file(join(packageRoot, 'package.json')).json();
    expect(manifest.name).toBe('@ngocdevv/dial-slider');
    expect(manifest.main).toBe('./lib/commonjs/index.js');
    expect(manifest.module).toBe('./lib/module/index.js');
    expect(manifest.types).toBe('./lib/typescript/commonjs/src/index.d.ts');
    expect(manifest['react-native']).toBe('./src/index.ts');
    expect(manifest.exports['.']['react-native']).toBe('./src/index.ts');
  });
});
