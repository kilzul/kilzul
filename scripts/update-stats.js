const fs = require("fs");

const USER = "kilzul";
const FONT = "Georgia, 'Times New Roman', serif";

const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

async function main() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("No GITHUB_TOKEN found");

  const query = `query($login: String!) {
    user(login: $login) {
      followers { totalCount }
      repositories(first: 100, ownerAffiliations: OWNER, isFork: false, privacy: PUBLIC) {
        totalCount
        nodes {
          stargazerCount
          languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
            edges { size node { name } }
          }
        }
      }
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks { contributionDays { date contributionCount } }
        }
      }
    }
  }`;

  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "profile-readme",
    },
    body: JSON.stringify({ query, variables: { login: USER } }),
  });
  const json = await res.json();
  if (!res.ok || json.errors) {
    throw new Error("GitHub API error: " + JSON.stringify(json.errors || res.status));
  }

  const u = json.data.user;
  const repos = u.repositories.nodes;
  const stars = repos.reduce((sum, r) => sum + r.stargazerCount, 0);

  // Contribution streaks
  const calendar = u.contributionsCollection.contributionCalendar;
  const days = calendar.weeks.flatMap((w) => w.contributionDays);
  let longest = 0;
  let run = 0;
  for (const d of days) {
    run = d.contributionCount > 0 ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  let current = 0;
  let i = days.length - 1;
  if (i >= 0 && days[i].contributionCount === 0) i--; // today may not have contributions yet
  while (i >= 0 && days[i].contributionCount > 0) {
    current++;
    i--;
  }

  // Languages
  const bytes = new Map();
  for (const r of repos) {
    for (const e of r.languages.edges) {
      bytes.set(e.node.name, (bytes.get(e.node.name) || 0) + e.size);
    }
  }
  const totalBytes = [...bytes.values()].reduce((a, b) => a + b, 0);
  const langs = [...bytes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
  const rows = [
    ["Repositories", String(u.repositories.totalCount)],
    ["Stars Earned", String(stars)],
    ["Followers", String(u.followers.totalCount)],
    ["Contributions", `${calendar.totalContributions} this year`],
    ["Current Streak", plural(current, "day")],
    ["Longest Streak", plural(longest, "day")],
  ];

  const LANG_START = 535;
  const H = langs.length ? LANG_START + (langs.length - 1) * 38 + 40 : 570;

  let body = "";
  rows.forEach(([label, value], idx) => {
    const y = 170 + idx * 40;
    body += `
  <text x="60" y="${y}" font-family="${FONT}" font-size="22" font-weight="bold" fill="#3E2723">${esc(label)}</text>
  <line x1="240" y1="${y - 5}" x2="520" y2="${y - 5}" stroke="#C68B59" stroke-width="2" stroke-dasharray="2 6" stroke-linecap="round"/>
  <text x="640" y="${y}" text-anchor="end" font-family="${FONT}" font-size="20" fill="#3E2723">${esc(value)}</text>`;
  });

  let langBody = "";
  if (langs.length === 0) {
    langBody = `<text x="350" y="540" text-anchor="middle" font-family="${FONT}" font-size="18" font-style="italic" fill="#5D4037">No public code yet. The pot is empty.</text>`;
  } else {
    langs.forEach(([name, size], idx) => {
      const y = LANG_START + idx * 38;
      const pct = (size / totalBytes) * 100;
      const pctText = pct < 1 ? "<1%" : `${pct.toFixed(0)}%`;
      const barW = Math.max(6, Math.round((330 * pct) / 100));
      langBody += `
  <text x="60" y="${y}" font-family="${FONT}" font-size="18" fill="#3E2723">${esc(name)}</text>
  <rect x="220" y="${y - 14}" width="330" height="14" rx="7" fill="#E6D2BC"/>
  <rect x="220" y="${y - 14}" width="${barW}" height="14" rx="7" fill="#C68B59"/>
  <text x="640" y="${y}" text-anchor="end" font-family="${FONT}" font-size="18" fill="#3E2723">${pctText}</text>`;
    });
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 ${H}" width="700" height="${H}">
  <rect width="700" height="${H}" fill="#F5E6D3"/>
  <line x1="60" y1="14" x2="640" y2="14" stroke="#C68B59" stroke-width="1.5" stroke-dasharray="4 4"/>

  <text x="350" y="70" text-anchor="middle" font-family="${FONT}" font-size="34" font-weight="bold" letter-spacing="6" fill="#3E2723">TODAY'S MENU</text>
  <text x="350" y="99" text-anchor="middle" font-family="${FONT}" font-size="18" font-style="italic" fill="#C68B59">~ the daily specials, served fresh from GitHub ~</text>
  <line x1="200" y1="117" x2="500" y2="117" stroke="#C68B59" stroke-width="1.5"/>
${body}

  <line x1="60" y1="404" x2="640" y2="404" stroke="#C68B59" stroke-width="1.5" stroke-dasharray="4 4"/>

  <text x="350" y="450" text-anchor="middle" font-family="${FONT}" font-size="34" font-weight="bold" letter-spacing="6" fill="#3E2723">HOUSE BLENDS</text>
  <text x="350" y="479" text-anchor="middle" font-family="${FONT}" font-size="18" font-style="italic" fill="#C68B59">~ most-used languages ~</text>
  <line x1="200" y1="497" x2="500" y2="497" stroke="#C68B59" stroke-width="1.5"/>
${langBody}
</svg>
`;

  fs.mkdirSync("assets", { recursive: true });
  fs.writeFileSync("assets/stats.svg", svg);
  console.log(`Stats updated: ${u.repositories.totalCount} repos, ${stars} stars, streak ${current}`);
}

// If anything fails, keep the old stats.svg instead of breaking the whole run
main().catch((err) => {
  console.error("Stats update failed:", err.message);
});