// Renders scripts/brand/*.svg into the PNG/JPG assets referenced by app.json and the Play listing.
// Usage: npm run brand
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');

// Real wordmark face: the same files Plan C will load in the app.
const fontFiles = [
  'node_modules/@expo-google-fonts/archivo-narrow/700Bold/ArchivoNarrow_700Bold.ttf',
  'node_modules/@expo-google-fonts/archivo-narrow/500Medium/ArchivoNarrow_500Medium.ttf',
].map((p) => path.join(root, p));

const jobs = [
  { svg: 'icon.svg', out: 'assets/images/icon.png', width: 1024 },
  { svg: 'icon-foreground.svg', out: 'assets/images/adaptive-icon.png', width: 1024 },
  { svg: 'icon-monochrome.svg', out: 'assets/images/adaptive-icon-mono.png', width: 1024 },
  { svg: 'icon-foreground.svg', out: 'assets/images/splash-icon.png', width: 1024 },
  { svg: 'icon.svg', out: 'assets/store/icon-512.png', width: 512 },
  { svg: 'feature-graphic.svg', out: 'assets/store/feature-graphic-1024x500.png', width: 1024, jpg: 'assets/store/feature-graphic-1024x500.jpg' },
];

function renderPng(svgFile, width) {
  const svg = readFileSync(path.join(here, svgFile), 'utf8');
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    font: { fontFiles, loadSystemFonts: false, defaultFontFamily: 'Archivo Narrow' },
  });
  return resvg.render().asPng();
}

for (const job of jobs) {
  const png = renderPng(job.svg, job.width);
  const outPath = path.join(root, job.out);
  mkdirSync(path.dirname(outPath), { recursive: true });
  writeFileSync(outPath, png);
  console.log(`wrote ${job.out}`);
  if (job.jpg) {
    // Play wants the feature graphic as JPEG or 24-bit PNG without alpha; flatten onto Rubber and encode JPEG.
    await sharp(png).flatten({ background: '#141517' }).jpeg({ quality: 92, chromaSubsampling: '4:4:4' }).toFile(path.join(root, job.jpg));
    console.log(`wrote ${job.jpg}`);
  }
}
