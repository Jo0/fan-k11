// ─────────────────────────────────────────────────────────────────────────────
// nav.js — sticky nav scroll-spy
// Highlights the active nav link as the user scrolls through sections
// ─────────────────────────────────────────────────────────────────────────────

const NAV_SECTIONS = ['hero', 'overview', 'interactive', 'networks', 'faults'];

window.addEventListener('scroll', () => {
  const scrollY = window.scrollY + 80;   // offset for sticky nav height

  NAV_SECTIONS.forEach(id => {
    const section = document.getElementById(id);
    const link    = document.querySelector(`nav a[href="#${id}"]`);
    if (!section || !link) return;

    const active = scrollY >= section.offsetTop && scrollY < section.offsetTop + section.offsetHeight;
    link.classList.toggle('active', active);
  });
});
