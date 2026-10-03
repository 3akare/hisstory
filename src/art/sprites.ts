/**
 * Pixel sprites as text grids: one character per pixel.
 * `.` is transparent, letters are fixed colours (see palettes.BASE),
 * digits 1-6 are biome slots (they re-skin per chapter).
 */
export interface SpriteDef {
  rows: string[];
}

const s = (...rows: string[]): SpriteDef => ({ rows });

export const SPRITES = {
  apple: s(
    '....b...',
    '...bLL..',
    '.RRbRRr.',
    'RWWRRRRr',
    'RWRRRRRr',
    'RRRRRRrr',
    '.RRRRrr.',
    '..rrrr..',
  ),
  poison: s(
    '....b...',
    '...bLL..',
    '.PPbPPp.',
    'PWWPPPPp',
    'PWPPKPPp',
    'PPPKPKpp',
    '.PPPPpp.',
    '..pppp..',
  ),
  portal: s(
    '..CCCC..',
    '.CcWWcC.',
    'CcW..WcC',
    'CW.CC.WC',
    'CW.CC.WC',
    'CcW..WcC',
    '.CcWWcC.',
    '..CCCC..',
  ),
  floorA: s(
    '11111111',
    '11111111',
    '11131111',
    '11111111',
    '11111111',
    '11111131',
    '11111111',
    '11111111',
  ),
  floorB: s(
    '22222222',
    '22222222',
    '22222222',
    '22223222',
    '22222222',
    '22222222',
    '32222222',
    '22222222',
  ),
  tuft: s(
    '........',
    '........',
    '........',
    '........',
    '...3....',
    '.3.3.3..',
    '..333...',
    '........',
  ),
  flower: s(
    '........',
    '........',
    '...W....',
    '..WYW...',
    '...W....',
    '...3....',
    '........',
    '........',
  ),
  wall: s(
    '55555565',
    '44444464',
    '44444464',
    '66666666',
    '55655555',
    '44644444',
    '44644444',
    '66666666',
  ),
  heart: s(
    '.RR.RR.',
    'RWRRRRr',
    'RRRRRRr',
    '.RRRRr.',
    '..RRr..',
    '...r...',
  ),
  heartEmpty: s(
    '.kk.kk.',
    'kxkkkkk',
    'kkkkkkk',
    '.kkkkk.',
    '..kkk..',
    '...k...',
  ),
  hole: s(
    '..bbbb..',
    '.bKKKKb.',
    'bKKKKKKb',
    'bKKKKKKb',
    'bKKKKKKb',
    '.bKKKKb.',
    '..bbbb..',
    '........',
  ),
} satisfies Record<string, SpriteDef>;

export type SpriteId = keyof typeof SPRITES;
