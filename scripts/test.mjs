import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildCarouselProject} from '../codegen/carousel3d.js';
import {contrastRatio, deriveCarouselPalette} from '../lib/color-system.js';
import {encodeZip} from '../lib/zip.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
const forbiddenDirectories = ['raw', 'registry', 'manifests', 'boundaries', 'prototype', 'reports', 'schemas'];

for (const directory of forbiddenDirectories) {
  assert.equal(fs.existsSync(path.join(root, directory)), false, `${directory}/ must not be included in the standalone package.`);
}
assert.match(source, /buildCarouselProject/, 'The standalone app must generate a Remotion project.');
assert.match(source, /id="color-theme"/, 'The standalone app must expose theme-driven color controls.');
assert.match(source, /data-action="relink-color"/, 'Role colors must support manual override recovery.');
assert.match(styles, /@keyframes orbit-spin/, 'The browser preview must contain real 3D orbit motion.');
assert.doesNotMatch(source, /catalog\.json|renderLibrary|genericPreview/, 'Library catalog behavior must not leak into the standalone card.');

const samples = fs.readdirSync(path.join(root, 'assets', 'samples')).filter((name) => name.endsWith('.png'));
assert.equal(samples.length, 5, 'The standalone demo must contain exactly five sample cards.');

const palette = deriveCarouselPalette('#0055a5');
assert.equal(palette.strategy, '冷蓝 × 柿橙');
assert.ok(contrastRatio(palette.background, palette.text) >= 4.5, 'Generated text/background pair must satisfy WCAG AA.');

const assets = [1, 2, 3].map((index) => ({
  name: `card-${index}.png`,
  type: 'image/png',
  data: new Uint8Array([137, 80, 78, 71, index]),
}));
const generated = buildCarouselProject({
  projectName: 'Standalone Validation',
  colors: {...palette, overrides: {background: false, red: true, blue: false}},
  visual: {fitMode: 'cover', cardScale: 0.9, cornerRadius: 18, cameraTilt: -4},
  motion: {direction: 'counterclockwise', durationSeconds: 6, radius: 420, perspective: 1700, startCard: 1},
  assets,
  licenseText: fs.readFileSync(path.join(root, 'LICENSE'), 'utf8'),
});

const manifest = JSON.parse(generated.files.find((file) => file.path === 'project-manifest.json').text);
assert.equal(manifest.template, 'carousel-3d');
assert.equal(manifest.cardCount, 3);
assert.equal(manifest.colors.theme, '#0055a5');
assert.deepEqual(manifest.palette.manualOverrides, ['red']);
assert.deepEqual(manifest.output, {width: 1080, height: 1920, fps: 30, durationInFrames: 180});
assert.equal(generated.files.filter((file) => file.path.startsWith('public/cards/')).length, 3);

const zip = encodeZip(generated.files);
const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
assert.equal(view.getUint32(0, true), 0x04034b50);
assert.equal(view.getUint32(zip.length - 22, true), 0x06054b50);

console.log(JSON.stringify({
  status: 'passed',
  standaloneTemplate: manifest.template,
  sampleCards: samples.length,
  generatedFiles: generated.files.length,
  zipBytes: zip.length,
}, null, 2));
