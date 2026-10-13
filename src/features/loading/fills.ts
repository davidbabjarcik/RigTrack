/** Farby balíkov; rovnaké poradie v pohľade zhora, v priestorovom pohľade aj v zozname. */
export const LOAD_FILLS = ['#38bdf8', '#a78bfa', '#34d399', '#fbbf24', '#fb7185', '#2dd4bf', '#f472b6', '#a3e635']

/**
 * Farby prekážok: tmavšie a tlmenejšie než balíky, aby sa nedali zameniť.
 * Prekážky sa značia písmenami (A, B, …), balíky číslami.
 */
export const OBSTACLE_FILLS = ['#64748b', '#92400e', '#4d7c0f', '#7e22ce', '#be123c', '#0f766e', '#1d4ed8', '#a16207']

export const obstacleFill = (index: number) => OBSTACLE_FILLS[index % OBSTACLE_FILLS.length]

/** 0 → A, 1 → B, … 26 → A2. */
export function obstacleLetter(index: number) {
  const letter = String.fromCharCode(65 + (index % 26))
  return index < 26 ? letter : `${letter}${Math.floor(index / 26) + 1}`
}
