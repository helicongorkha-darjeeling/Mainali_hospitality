// Makes small WebGL textures (max 1100px) from public/images into public/textures.
// Run: node scripts/make-textures.mjs
import { readdir, mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const src = path.resolve("public/images");
const out = path.resolve("public/textures");
await mkdir(out, { recursive: true });

for (const f of await readdir(src)) {
  if (!f.endsWith(".webp")) continue;
  const img = sharp(path.join(src, f));
  const { width, height } = await img.metadata();
  await img.resize({ width: 1100, height: 1100, fit: "inside", withoutEnlargement: true }).webp({ quality: 78 }).toFile(path.join(out, f));
  console.log(f, `${width}x${height}`, (height / width).toFixed(2));
}
