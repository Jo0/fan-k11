// ─────────────────────────────────────────────────────────────────────────────
// theme.js — random theme on page load, dropdown to override for the session
// ─────────────────────────────────────────────────────────────────────────────

const THEMES = [
  { key: 'a', label: 'P31 · PHOSPHOR' },
  { key: 'b', label: 'AMBER · P7'     },
  { key: 'c', label: 'COLD OXIDE'     },
  { key: 'd', label: 'W3C · DEFAULT'  },
  { key: 'e', label: 'W3C · DARK'     },
];

function setTheme(key) {
  document.documentElement.setAttribute('data-theme', key);
  const sel = document.getElementById('themeSel');
  if (sel) sel.value = key;
}

// Pick a random theme every page load
const randomTheme = THEMES[Math.floor(Math.random() * THEMES.length)].key;
setTheme(randomTheme);
