// Režim sa nastaví ešte pred vykreslením, aby stránka nebliklo: voľba používateľa, inak zariadenie.
// Rovnaká logika je v src/lib/theme.ts. Samostatný súbor (nie inline), aby ho povolila Content-Security-Policy.
;(function () {
  var stored = null
  try {
    stored = localStorage.getItem('rigtrack:theme')
  } catch (error) {}
  var dark = stored === 'dark' || (stored !== 'light' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
})()
