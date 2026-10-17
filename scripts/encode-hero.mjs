// Re-encodes a hotel video for the scroll-scrubbed hero.
// Usage: node scripts/encode-hero.mjs "path/to/video.mp4" [seconds-to-keep]
// Short keyframe interval (-g 5) keeps seeking smooth while scrolling; audio is dropped.
import { execFileSync } from "node:child_process";
import ffmpeg from "ffmpeg-static";

const [src, keep = "13.3"] = process.argv.slice(2);
if (!src) {
  console.error('Usage: node scripts/encode-hero.mjs "video.mp4" [seconds]');
  process.exit(1);
}

const run = (args) => execFileSync(ffmpeg, ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: "inherit" });

run([
  "-i", src, "-t", keep, "-an",
  "-vf", "scale=720:1280:flags=lanczos,fps=30",
  "-c:v", "libx264", "-preset", "slow", "-crf", "26", "-profile:v", "high", "-pix_fmt", "yuv420p",
  "-g", "5", "-keyint_min", "5", "-sc_threshold", "0", "-movflags", "+faststart",
  "public/video/hero.mp4",
]);
run(["-i", src, "-frames:v", "1", "-vf", "scale=720:1280:flags=lanczos", "-c:v", "libwebp", "-quality", "80", "public/video/hero-poster.webp"]);
console.log("Wrote public/video/hero.mp4 and hero-poster.webp");
