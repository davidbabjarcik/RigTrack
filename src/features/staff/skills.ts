/** Návrhy pri písaní – pulty, zosilňovače, svetlá a práce, ktoré sa v branži bežne uvádzajú. */
export const SKILL_SUGGESTIONS = [
  'Avolites', 'GrandMA2', 'GrandMA3', 'ChamSys', 'Obsidian Onyx', 'Hog 4', 'Daslight', 'Capture', 'Resolume Arena', 'Resolume Avenue',
  'Behringer X32', 'Midas M32', 'Midas Pro', 'Allen & Heath dLive', 'Allen & Heath SQ', 'Yamaha CL/QL', 'Yamaha TF', 'DiGiCo', 'Soundcraft Vi',
  'Crown', 'Lab.gruppen', 'Powersoft', 'L-Acoustics', 'd&b audiotechnik', 'RCF', 'Smaart', 'Dante',
  'Novastar', 'Barco', 'vMix', 'OBS', 'ATEM',
  'Pioneer CDJ / DJM', 'Rigging', 'Práca vo výškach', 'Montáž truss', 'Nivtec pódium', 'Elektrikár (§)', 'Vysokozdvižný vozík', 'Plošina',
]

/** Zručnosti sa ukladajú ako jeden text oddelený čiarkami (spätne kompatibilné so staršími kartami). */
export const parseSkills = (text: string) => [...new Set(text.split(/[,;\n]/).map((item) => item.trim()).filter(Boolean))]
export const joinSkills = (skills: string[]) => skills.join(', ')
