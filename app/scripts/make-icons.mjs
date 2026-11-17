// Renders Haven's app icons (the home mark on Hearth Clay) into public/icons. Run: node scripts/make-icons.mjs
import sharp from 'sharp';

const CLAY = '#C47A5A';
const mark = (size, inset, radius) => {
  const s = size - inset * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" fill="${CLAY}"/>
  <g transform="translate(${inset} ${inset}) scale(${s / 24})">
    <path d="M5 11.5 12 5.5l7 6V19a1 1 0 0 1-1 1h-4v-5h-4v5H6a1 1 0 0 1-1-1v-7.5Z" fill="none" stroke="#FFFFFF" stroke-width="1.9" stroke-linejoin="round" stroke-linecap="round"/>
  </g>
</svg>`;
};

const out = [
  ['icon-192.png', 192, 30, 42],
  ['icon-512.png', 512, 80, 112],
  ['maskable-512.png', 512, 130, 0], // full-bleed, mark inside the safe zone
  ['apple-touch-icon.png', 180, 30, 0],
];
for (const [file, size, inset, radius] of out) {
  await sharp(Buffer.from(mark(size, inset, radius))).png().toFile(`public/icons/${file}`);
  console.log('wrote', file);
}
