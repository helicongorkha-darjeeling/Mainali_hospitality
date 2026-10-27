/**
 * Builds the social share card: public/images/og-card.jpg, 1200×630.
 *
 * The source photo is 4:3, so social platforms crop it unpredictably. This crops it once, to the
 * 1.91:1 that Facebook, WhatsApp, X, LinkedIn and iMessage all expect, and writes JPEG because a
 * few scrapers still don't read WebP.
 *
 * Run: node scripts/make-og-image.mjs
 */
import sharp from "sharp";

const SOURCE = "public/images/teesta-hotel-under-the-blue-sky.webp";
const OUT = "public/images/og-card.jpg";

const info = await sharp(SOURCE)
  // `position: "attention"` keeps the busiest part of the frame (the hotel) rather than the sky.
  .resize(1200, 630, { fit: "cover", position: sharp.strategy.attention })
  .jpeg({ quality: 82, mozjpeg: true })
  .toFile(OUT);

console.log(`${OUT}  ${info.width}×${info.height}  ${(info.size / 1024).toFixed(0)} KB`);
