const fs = require("fs");
const path = require("path");

const DAYS_PER_SONG = 1; // change to 2 or 3 to switch songs less often

const songs = JSON.parse(fs.readFileSync("songs.json", "utf8"));
const daysSinceEpoch = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
const index = Math.floor(daysSinceEpoch / DAYS_PER_SONG) % songs.length;
const song = songs[index];

const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

function coverDataUri(file) {
  if (!file) return null;
  const p = path.join("assets", "covers", file);
  if (!fs.existsSync(p)) return null;
  const ext = path.extname(file).slice(1).toLowerCase();
  const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  return `data:${mime};base64,` + fs.readFileSync(p).toString("base64");
}

const cover = coverDataUri(song.cover);
const label = cover
  ? `<image href="${cover}" x="288" y="178" width="124" height="124" preserveAspectRatio="xMidYMid slice" clip-path="url(#label)"/>`
  : `<circle cx="350" cy="240" r="62" fill="#C68B59"/>`;

const FONT = "Georgia, 'Times New Roman', serif";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 450" width="700" height="450">
  <defs><clipPath id="label"><circle cx="350" cy="240" r="62"/></clipPath></defs>
  <style>
    .spin { transform-box: view-box; transform-origin: 350px 240px; animation: spin 6s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  </style>
  <rect width="700" height="450" fill="#F5E6D3"/>
  <line x1="60" y1="14" x2="640" y2="14" stroke="#C68B59" stroke-width="1.5" stroke-dasharray="4 4"/>

  <text x="350" y="70" text-anchor="middle" font-family="${FONT}" font-size="34" font-weight="bold" letter-spacing="6" fill="#3E2723">ON THE SPEAKERS</text>
  <text x="350" y="99" text-anchor="middle" font-family="${FONT}" font-size="18" font-style="italic" fill="#C68B59">~ today's record ~</text>
  <line x1="200" y1="117" x2="500" y2="117" stroke="#C68B59" stroke-width="1.5"/>

  <g class="spin">
    <circle cx="350" cy="240" r="100" fill="#1a1a1a"/>
    <circle cx="350" cy="240" r="90" fill="none" stroke="#333" stroke-width="1"/>
    <circle cx="350" cy="240" r="80" fill="none" stroke="#2a2a2a" stroke-width="1"/>
    <circle cx="350" cy="240" r="71" fill="none" stroke="#333" stroke-width="1"/>
    ${label}
    <circle cx="350" cy="240" r="6" fill="#F5E6D3"/>
  </g>

  <text x="350" y="388" text-anchor="middle" font-family="${FONT}" font-size="26" font-weight="bold" fill="#3E2723">${esc(song.title)}</text>
  <text x="350" y="420" text-anchor="middle" font-family="${FONT}" font-size="20" font-style="italic" fill="#5D4037">${esc(song.artist)}</text>
</svg>
`;

fs.writeFileSync(path.join("assets", "now-playing.svg"), svg);

const alt = `Now playing: ${song.title} by ${song.artist}`;
const img = `<img src="https://raw.githubusercontent.com/kilzul/kilzul/main/assets/now-playing.svg?v=${daysSinceEpoch}" width="100%" alt="${esc(alt)}" />`;
const block =
  "<!-- SONG:START -->\n" +
  (song.url ? `<a href="${esc(song.url)}">${img}</a>` : img) +
  "\n<!-- SONG:END -->";

let readme = fs.readFileSync("README.md", "utf8");
readme = readme.replace(/<!-- SONG:START -->[\s\S]*?<!-- SONG:END -->/, () => block);
// Also refresh the stats image link so GitHub doesn't show a stale cached copy
readme = readme.replace(/assets\/stats\.svg(\?v=\d+)?/, `assets/stats.svg?v=${daysSinceEpoch}`);
fs.writeFileSync("README.md", readme);

console.log(`Picked: ${song.title} by ${song.artist}`);