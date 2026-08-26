import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');

function pngInfo(file) {
  const b = readFileSync(file);
  assert.equal(b.toString('ascii', 1, 4), 'PNG', file + ' is not a PNG');
  // IHDR: width at byte 16, height at 20 (big-endian), colour type at 25 (6 = RGBA)
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20), colorType: b[25] };
}

const pngs = [
  ['assets/images/icon.png', 1024, 1024],
  ['assets/images/adaptive-icon.png', 1024, 1024],
  ['assets/images/adaptive-icon-mono.png', 1024, 1024],
  ['assets/images/splash-icon.png', 1024, 1024],
  ['assets/store/icon-512.png', 512, 512],
  ['assets/store/feature-graphic-1024x500.png', 1024, 500],
];
const transparent = ['assets/images/adaptive-icon.png', 'assets/images/adaptive-icon-mono.png', 'assets/images/splash-icon.png'];

test('render.mjs produces every brand asset at the required size', () => {
  execFileSync(process.execPath, [path.join(here, 'render.mjs')], { stdio: 'inherit' });
  for (const [rel, w, h] of pngs) {
    const file = path.join(root, rel);
    assert.ok(existsSync(file), rel + ' missing');
    const info = pngInfo(file);
    assert.equal(info.width, w, rel + ' width');
    assert.equal(info.height, h, rel + ' height');
  }
  for (const rel of transparent) {
    assert.equal(pngInfo(path.join(root, rel)).colorType, 6, rel + ' must keep transparency (RGBA)');
  }
  const jpg = readFileSync(path.join(root, 'assets/store/feature-graphic-1024x500.jpg'));
  assert.deepEqual([...jpg.subarray(0, 3)], [0xff, 0xd8, 0xff], 'feature graphic JPEG must start with the SOI marker');
});
