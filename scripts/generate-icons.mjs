// Generates the PWA icons in public/icons and the app favicon from one SVG.
// Run with: npm run icons
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";

const MAROON = "#6e1423";
const MAROON_DARK = "#4a0d18";
const WALLET = [
  "M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1",
  "M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4",
];

/**
 * @param {object} o
 * @param {number} o.radius  corner radius as a share of the size (0 = square)
 * @param {number} o.glyph   wallet size as a share of the icon
 */
function svg({ radius, glyph }) {
  const size = 512;
  const g = size * glyph;
  const offset = (size - g) / 2;
  const scale = g / 24;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${MAROON}"/>
      <stop offset="1" stop-color="${MAROON_DARK}"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * radius}" fill="url(#bg)"/>
  <g transform="translate(${offset} ${offset}) scale(${scale})" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    ${WALLET.map((d) => `<path d="${d}"/>`).join("\n    ")}
  </g>
</svg>`;
}

await mkdir("public/icons", { recursive: true });

const regular = Buffer.from(svg({ radius: 0.22, glyph: 0.5 }));
// Maskable icons need the glyph inside the central 80% safe zone and a full-bleed background.
const maskable = Buffer.from(svg({ radius: 0, glyph: 0.4 }));

await sharp(regular).resize(192).png().toFile("public/icons/icon-192.png");
await sharp(regular).resize(512).png().toFile("public/icons/icon-512.png");
await sharp(maskable).resize(512).png().toFile("public/icons/maskable-512.png");
// iOS ignores transparency and rounds corners itself, so use the square version.
await sharp(maskable).resize(180).png().toFile("src/app/apple-icon.png");
await writeFile("src/app/icon.svg", svg({ radius: 0.22, glyph: 0.5 }));

console.log("Icons written to public/icons and src/app");
