import '@testing-library/jest-dom/vitest'

// Testy očakávajú slovenské texty (prehliadač v teste má angličtinu).
try {
  localStorage.setItem('rigtrack:lang', 'sk')
} catch {
  // node prostredie bez úložiska
}
