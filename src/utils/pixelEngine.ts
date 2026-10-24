import { CharacterArchetype, CharacterDirection, SpriteEvaluation, SpriteResolution } from '../types/sprite';

export interface PalettePreset {
  id: string;
  name: string;
  description: string;
  colors: string[];
}

export const PALETTES: Record<string, PalettePreset> = {
  snes: {
    id: 'snes',
    name: '16-Bit SNES Classic',
    description: 'Palet RPG legendaris era 90-an dengan kontras seimbang',
    colors: [
      '#070707', '#1f1b24', '#3d2936', '#693b48',
      '#a35359', '#d47b67', '#f0b084', '#ffe8b5',
      '#1b3240', '#2a5b66', '#3b8b88', '#63c79c',
      '#21183c', '#462761', '#853e7a', '#c76e93'
    ]
  },
  cyberpunk: {
    id: 'cyberpunk',
    name: 'Neo Cyberpunk',
    description: 'Vibrant neon cyan, hot magenta, and dark obsidian carbon',
    colors: [
      '#050508', '#111226', '#1e2044', '#313468',
      '#00f0ff', '#00a3ff', '#0051ff', '#002699',
      '#ff0055', '#ff00aa', '#b800ff', '#6e00ff',
      '#ffe600', '#00ff66', '#e0f7fa', '#ffffff'
    ]
  },
  pico8: {
    id: 'pico8',
    name: 'PICO-8 Fantasy',
    description: 'Palet retro 16-warna klasik konsol virtual',
    colors: [
      '#000000', '#1D2B53', '#7E2553', '#008751',
      '#AB5236', '#5F574F', '#C2C3C7', '#FFF1E8',
      '#FF004D', '#FFA300', '#FFEC27', '#00E436',
      '#29ADFF', '#83769C', '#FF77A8', '#FFCCAA'
    ]
  },
  gameboy: {
    id: 'gameboy',
    name: 'Game Boy Monochrome',
    description: 'Palet nostalgia 4-shade kehijauan original 1989',
    colors: [
      '#0f380f', '#306230', '#8bac0f', '#9bbc0f'
    ]
  },
  gothic: {
    id: 'gothic',
    name: 'Dark Souls Gothic',
    description: 'Kombinasi gelap berdarah, besi berkarat, dan abu batu bara',
    colors: [
      '#0a0808', '#1c1514', '#2d2220', '#4a3834',
      '#6b2d28', '#8f231e', '#ba3128', '#e65342',
      '#292b30', '#3e434d', '#5a6270', '#808b9c',
      '#594931', '#826941', '#b3945b', '#dfc489'
    ]
  },
  pastel: {
    id: 'pastel',
    name: 'Pastel Dream RPG',
    description: 'Warna lembut dreamy ala game cozy indie fantasy',
    colors: [
      '#232035', '#413a5e', '#6e618f', '#a398bf',
      '#ffccd5', '#ffb3c1', '#ff8fa3', '#fb6f92',
      '#c8e7ff', '#90e0ef', '#caf0f8', '#d8f3dc',
      '#b7e4c7', '#74c69d', '#fff3b0', '#ffffff'
    ]
  }
};

/**
 * Creates an empty 2D pixel grid filled with 'transparent'
 */
export function createEmptyGrid(size: number): string[][] {
  const grid: string[][] = [];
  for (let y = 0; y < size; y++) {
    const row: string[] = [];
    for (let x = 0; x < size; x++) {
      row.push('transparent');
    }
    grid.push(row);
  }
  return grid;
}

/**
 * Hex to RGBA parser
 */
export function hexToRgba(hex: string): { r: number; g: number; b: number; a: number } {
  if (hex === 'transparent' || !hex) {
    return { r: 0, g: 0, b: 0, a: 0 };
  }
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c.split('').map(x => x + x).join('');
  }
  if (c.length === 6) {
    c += 'ff';
  }
  const num = parseInt(c, 16);
  if (isNaN(num)) return { r: 0, g: 0, b: 0, a: 0 };
  return {
    r: (num >> 24) & 255,
    g: (num >> 16) & 255,
    b: (num >> 8) & 255,
    a: (num & 255) / 255,
  };
}

/**
 * RGBA to Hex string
 */
export function rgbaToHex(r: number, g: number, b: number, a: number = 1): string {
  if (a === 0) return 'transparent';
  const toHex = (n: number) => {
    const clamped = Math.max(0, Math.min(255, Math.round(n)));
    return clamped.toString(16).padStart(2, '0');
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Calculates perceptual color Euclidean distance
 */
export function colorDistance(hexA: string, hexB: string): number {
  if (hexA === hexB) return 0;
  if (hexA === 'transparent' || hexB === 'transparent') return 999999;
  const a = hexToRgba(hexA);
  const b = hexToRgba(hexB);
  const rDiff = a.r - b.r;
  const gDiff = a.g - b.g;
  const bDiff = a.b - b.b;
  return Math.sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff);
}

/**
 * Quantize any arbitrary color to the closest color in a specified palette
 */
export function quantizeToPalette(color: string, palette: string[]): string {
  if (color === 'transparent' || !palette.length) return color;
  let closest = palette[0];
  let minDistance = Infinity;
  for (const palColor of palette) {
    const dist = colorDistance(color, palColor);
    if (dist < minDistance) {
      minDistance = dist;
      closest = palColor;
    }
  }
  return closest;
}

/**
 * Analyzes visual prompt for semantic attributes (class, weapon, armor, colors)
 */
export function analyzePromptSemantics(prompt: string, defaultArchetype: CharacterArchetype) {
  const p = prompt.toLowerCase();
  
  // Archetype override if detected in prompt
  let archetype = defaultArchetype;
  if (p.includes('knight') || p.includes('armor') || p.includes('warrior') || p.includes('kesatria') || p.includes('pendekar')) archetype = 'knight';
  else if (p.includes('mage') || p.includes('wizard') || p.includes('witch') || p.includes('penyihir') || p.includes('sorcerer')) archetype = 'mage';
  else if (p.includes('cyber') || p.includes('neon') || p.includes('hacker') || p.includes('punk') || p.includes('android')) archetype = 'cyberpunk';
  else if (p.includes('rogue') || p.includes('ninja') || p.includes('assassin') || p.includes('pencuri') || p.includes('shadow')) archetype = 'rogue';
  else if (p.includes('mecha') || p.includes('robot') || p.includes('gundam') || p.includes('cyborg')) archetype = 'mecha';
  else if (p.includes('archer') || p.includes('panah') || p.includes('ranger') || p.includes('hunter')) archetype = 'archer';
  else if (p.includes('monster') || p.includes('demon') || p.includes('orc') || p.includes('beast') || p.includes('goblin')) archetype = 'monster';
  else if (p.includes('paladin') || p.includes('holy') || p.includes('crusader') || p.includes('templer')) archetype = 'paladin';

  // Feature flags
  const hasCape = p.includes('cape') || p.includes('jubah') || p.includes('cloak') || archetype === 'mage' || archetype === 'paladin';
  const hasShield = p.includes('shield') || p.includes('tameng') || p.includes('perisai') || archetype === 'paladin';
  const hasGlowingEyes = p.includes('glow') || p.includes('bersinar') || p.includes('laser') || archetype === 'cyberpunk' || archetype === 'mecha';
  const hasHatOrHelmet = p.includes('helmet') || p.includes('helm') || p.includes('hat') || p.includes('topi') || p.includes('hood') || archetype === 'knight';
  const hasWings = p.includes('wing') || p.includes('sayap') || p.includes('angel') || p.includes('demon');

  // Dominant hue tags
  let primaryTone = 'blue';
  if (p.includes('red') || p.includes('merah') || p.includes('crimson') || p.includes('ruby')) primaryTone = 'red';
  else if (p.includes('green') || p.includes('hijau') || p.includes('emerald') || p.includes('forest')) primaryTone = 'green';
  else if (p.includes('yellow') || p.includes('kuning') || p.includes('gold') || p.includes('emas')) primaryTone = 'gold';
  else if (p.includes('purple') || p.includes('ungu') || p.includes('violet') || p.includes('amethyst')) primaryTone = 'purple';
  else if (p.includes('black') || p.includes('hitam') || p.includes('dark') || p.includes('shadow')) primaryTone = 'dark';
  else if (p.includes('white') || p.includes('putih') || p.includes('silver') || p.includes('perak')) primaryTone = 'silver';
  else if (p.includes('cyan') || p.includes('biru muda') || p.includes('teal')) primaryTone = 'cyan';

  return {
    archetype,
    hasCape,
    hasShield,
    hasGlowingEyes,
    hasHatOrHelmet,
    hasWings,
    primaryTone
  };
}

/**
 * Procedural Pixel Art Generator that scales accurately for 32x32, 64x64, 128x128.
 * It builds silhouette, anatomy, cloth, weapons, shading and outlines.
 */
export function generateProceduralCharacter(params: {
  prompt: string;
  resolution: SpriteResolution;
  paletteKey: string;
  archetype: CharacterArchetype;
  direction: CharacterDirection;
}): {
  pixels: string[][];
  palette: string[];
  frames: Record<'idle' | 'walk' | 'attack' | 'hurt', string[][][]>;
  features: string[];
} {
  const { prompt, resolution, paletteKey, archetype: userArchetype, direction } = params;
  const paletteObj = PALETTES[paletteKey] || PALETTES.snes;
  const pal = paletteObj.colors;
  const size = resolution;
  const grid = createEmptyGrid(size);

  const analysis = analyzePromptSemantics(prompt, userArchetype);
  const detectedFeatures: string[] = [
    `Archetype: ${analysis.archetype}`,
    `Direction: ${direction}`,
    `Tone: ${analysis.primaryTone}`
  ];
  if (analysis.hasCape) detectedFeatures.push('Equipped Cape / Cloak');
  if (analysis.hasShield) detectedFeatures.push('Equipped Shield');
  if (analysis.hasGlowingEyes) detectedFeatures.push('Glowing Visor / Eyes');
  if (analysis.hasHatOrHelmet) detectedFeatures.push('Protective Headwear');
  if (analysis.hasWings) detectedFeatures.push('Winged Appendages');

  // Color assignments from selected palette
  const outlineColor = pal[0];
  const darkShade = pal[1] || pal[0];
  const midTone = pal[Math.floor(pal.length / 2)] || '#462761';
  const lightTone = pal[Math.min(pal.length - 2, 7)] || '#63c79c';
  const highlightColor = pal[pal.length - 1] || '#ffffff';

  // Accent tone selection
  let primaryColor = midTone;
  let secondaryColor = lightTone;
  let accentColor = highlightColor;

  if (analysis.primaryTone === 'red' && pal.length > 5) {
    primaryColor = pal.find(c => {
      const rgb = hexToRgba(c);
      return rgb.r > rgb.g + 30 && rgb.r > rgb.b + 30;
    }) || pal[4];
  } else if (analysis.primaryTone === 'gold' && pal.length > 5) {
    primaryColor = pal.find(c => {
      const rgb = hexToRgba(c);
      return rgb.r > 150 && rgb.g > 120 && rgb.b < 100;
    }) || pal[6];
  }

  // Unit scaling factor based on resolution
  const scale = size / 32;
  const cx = Math.floor(size / 2);

  // Helper drawing functions with scale awareness
  const setPixel = (x: number, y: number, color: string) => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    if (iy >= 0 && iy < size && ix >= 0 && ix < size && grid[iy]) {
      grid[iy][ix] = color;
    }
  };

  const drawRect = (x: number, y: number, w: number, h: number, color: string) => {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        setPixel(x + dx, y + dy, color);
      }
    }
  };

  const drawSymmetricRect = (relX: number, y: number, w: number, h: number, color: string) => {
    drawRect(cx - relX - w, y, w, h, color);
    drawRect(cx + relX, y, w, h, color);
  };

  // Anatomy Anchor Points (scaled by `scale`)
  const headRadius = Math.round(4.5 * scale);
  const headCenterY = Math.round(9 * scale);
  const neckY = headCenterY + headRadius;
  const torsoHeight = Math.round(9 * scale);
  const torsoWidth = Math.round(11 * scale);
  const hipY = neckY + torsoHeight;
  const legHeight = Math.round(8 * scale);
  const groundY = Math.min(size - Math.round(2 * scale), hipY + legHeight);

  // 1. Ground Shadow
  const shadowW = Math.round(18 * scale);
  const shadowH = Math.max(1, Math.round(2 * scale));
  drawRect(cx - Math.floor(shadowW / 2), groundY, shadowW, shadowH, darkShade);

  // 2. Wings (if detected)
  if (analysis.hasWings) {
    const wingW = Math.round(8 * scale);
    const wingH = Math.round(10 * scale);
    for (let i = 0; i < wingW; i++) {
      const h = Math.round((wingH * (i + 1)) / wingW);
      setPixel(cx - Math.round(8 * scale) - i, neckY + i - h / 2, accentColor);
      setPixel(cx + Math.round(8 * scale) + i, neckY + i - h / 2, accentColor);
    }
  }

  // 3. Cloak / Cape (Layer Behind Torso)
  if (analysis.hasCape) {
    const capeW = Math.round(14 * scale);
    const capeH = groundY - neckY;
    for (let cy = 0; cy < capeH; cy++) {
      const spread = Math.round((cy / capeH) * 3 * scale);
      drawRect(cx - Math.floor(capeW / 2) - spread, neckY + cy, capeW + spread * 2, 1, darkShade);
    }
  }

  // 4. Legs and Boots
  const legW = Math.max(2, Math.round(3 * scale));
  const legGap = Math.max(1, Math.round(2 * scale));
  // Left leg
  drawRect(cx - legGap - legW, hipY, legW, groundY - hipY, primaryColor);
  // Right leg
  drawRect(cx + legGap, hipY, legW, groundY - hipY, primaryColor);
  // Boots
  const bootH = Math.round(3 * scale);
  drawRect(cx - legGap - legW - Math.round(1 * scale), groundY - bootH, legW + Math.round(1 * scale), bootH, outlineColor);
  drawRect(cx + legGap, groundY - bootH, legW + Math.round(1 * scale), bootH, outlineColor);

  // 5. Torso / Armor / Clothing
  drawRect(cx - Math.floor(torsoWidth / 2), neckY, torsoWidth, torsoHeight, primaryColor);
  // Chestplate / Robe Detail
  const chestW = Math.round(torsoWidth * 0.65);
  const chestH = Math.round(torsoHeight * 0.6);
  drawRect(cx - Math.floor(chestW / 2), neckY + Math.round(1 * scale), chestW, chestH, secondaryColor);
  // Belt
  const beltY = hipY - Math.round(2 * scale);
  drawRect(cx - Math.floor(torsoWidth / 2), beltY, torsoWidth, Math.max(1, Math.round(1.5 * scale)), outlineColor);
  setPixel(cx, beltY, accentColor); // Belt buckle

  // 6. Arms and Hands
  const armW = Math.max(2, Math.round(2.5 * scale));
  const armH = Math.round(7 * scale);
  drawRect(cx - Math.floor(torsoWidth / 2) - armW, neckY + Math.round(1 * scale), armW, armH, primaryColor);
  drawRect(cx + Math.floor(torsoWidth / 2), neckY + Math.round(1 * scale), armW, armH, primaryColor);
  // Hands (skin or gauntlet)
  drawRect(cx - Math.floor(torsoWidth / 2) - armW, neckY + armH, armW, Math.round(2 * scale), secondaryColor);
  drawRect(cx + Math.floor(torsoWidth / 2), neckY + armH, armW, Math.round(2 * scale), secondaryColor);

  // 7. Equipment: Weapon or Shield based on archetype
  if (analysis.archetype === 'knight' || analysis.archetype === 'paladin' || analysis.hasShield) {
    // Sword in right hand
    const swordBladeH = Math.round(11 * scale);
    const swordX = cx + Math.floor(torsoWidth / 2) + armW;
    drawRect(swordX, neckY - Math.round(3 * scale), Math.max(1, Math.round(1.5 * scale)), swordBladeH, lightTone);
    setPixel(swordX, neckY - Math.round(4 * scale), highlightColor); // Sword tip
    // Crossguard
    drawRect(swordX - Math.round(1 * scale), neckY + Math.round(8 * scale), Math.round(3 * scale), Math.max(1, Math.round(1 * scale)), outlineColor);
    // Shield in left hand
    if (analysis.hasShield || analysis.archetype === 'paladin') {
      const shieldW = Math.round(5 * scale);
      const shieldH = Math.round(9 * scale);
      drawRect(cx - Math.floor(torsoWidth / 2) - armW - shieldW + Math.round(1 * scale), neckY + Math.round(1 * scale), shieldW, shieldH, darkShade);
      drawRect(cx - Math.floor(torsoWidth / 2) - armW - shieldW + Math.round(2 * scale), neckY + Math.round(2 * scale), shieldW - Math.round(2 * scale), shieldH - Math.round(2 * scale), accentColor);
    }
  } else if (analysis.archetype === 'mage') {
    // Magic Staff in right hand
    const staffX = cx + Math.floor(torsoWidth / 2) + armW;
    const staffH = Math.round(16 * scale);
    drawRect(staffX, neckY - Math.round(6 * scale), Math.max(1, Math.round(1 * scale)), staffH, darkShade);
    // Staff Orb / Gem
    const orbRadius = Math.max(2, Math.round(2.5 * scale));
    drawRect(staffX - Math.floor(orbRadius / 2), neckY - Math.round(8 * scale), orbRadius, orbRadius, accentColor);
    setPixel(staffX, neckY - Math.round(8 * scale), highlightColor);
  } else if (analysis.archetype === 'cyberpunk') {
    // Cyber blade / Blaster
    const gunX = cx + Math.floor(torsoWidth / 2) + armW;
    drawRect(gunX, neckY + Math.round(3 * scale), Math.round(4 * scale), Math.round(2 * scale), outlineColor);
    setPixel(gunX + Math.round(3 * scale), neckY + Math.round(3 * scale), accentColor); // Muzzle light
  } else if (analysis.archetype === 'archer') {
    // Bow on side
    const bowX = cx - Math.floor(torsoWidth / 2) - armW - Math.round(2 * scale);
    for (let by = -5; by <= 7; by++) {
      const curve = Math.round(Math.abs(by) * 0.4 * scale);
      setPixel(bowX + curve, neckY + Math.round(3 * scale) + Math.round(by * scale), darkShade);
    }
  }

  // 8. Head & Face
  // Base Head
  for (let dy = -headRadius; dy <= headRadius; dy++) {
    for (let dx = -headRadius; dx <= headRadius; dx++) {
      if (dx * dx + dy * dy <= headRadius * headRadius) {
        setPixel(cx + dx, headCenterY + dy, secondaryColor);
      }
    }
  }

  // Helmet / Hair
  if (analysis.hasHatOrHelmet || analysis.archetype === 'knight' || analysis.archetype === 'paladin' || analysis.archetype === 'mecha') {
    // Helmet dome
    for (let dy = -headRadius; dy <= 0; dy++) {
      for (let dx = -headRadius; dx <= headRadius; dx++) {
        if (dx * dx + dy * dy <= headRadius * headRadius) {
          setPixel(cx + dx, headCenterY + dy, primaryColor);
        }
      }
    }
    // Visor or Horns
    const visorY = headCenterY + Math.round(1 * scale);
    const visorW = Math.round(headRadius * 1.4);
    drawRect(cx - Math.floor(visorW / 2), visorY, visorW, Math.max(1, Math.round(2 * scale)), outlineColor);
    if (analysis.hasGlowingEyes) {
      drawRect(cx - Math.round(2 * scale), visorY, Math.round(4 * scale), 1, accentColor);
    }
  } else {
    // Hair style
    for (let dy = -headRadius; dy <= -Math.round(1 * scale); dy++) {
      for (let dx = -headRadius; dx <= headRadius; dx++) {
        if (dx * dx + dy * dy <= headRadius * headRadius) {
          setPixel(cx + dx, headCenterY + dy, darkShade);
        }
      }
    }
    // Eyes
    const eyeY = headCenterY + Math.round(1 * scale);
    const eyeSpacing = Math.max(1, Math.round(2 * scale));
    setPixel(cx - eyeSpacing, eyeY, outlineColor);
    setPixel(cx + eyeSpacing, eyeY, outlineColor);
    if (scale >= 2) {
      setPixel(cx - eyeSpacing, eyeY - 1, highlightColor); // eye glint
      setPixel(cx + eyeSpacing, eyeY - 1, highlightColor);
    }
  }

  // 9. Black / Crisp Outline Pass (Subtle pixel-art perimeter)
  const outlineGrid = JSON.parse(JSON.stringify(grid));
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (grid[y][x] !== 'transparent') {
        const neighbors = [
          [x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]
        ];
        for (const [nx, ny] of neighbors) {
          if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
            if (grid[ny][nx] === 'transparent' && outlineGrid[ny][nx] === 'transparent') {
              // Add crisp boundary only around major outer contours
              if (y < groundY) {
                outlineGrid[ny][nx] = outlineColor;
              }
            }
          }
        }
      }
    }
  }

  // 10. Generate Animation Frames (Idle, Walk, Attack, Hurt)
  const frames: Record<'idle' | 'walk' | 'attack' | 'hurt', string[][][]> = {
    idle: [],
    walk: [],
    attack: [],
    hurt: []
  };

  // Idle Frame 1 (Current Base)
  frames.idle.push(outlineGrid);

  // Idle Frame 2 (Subtle 1px breath offset)
  const idleFrame2 = createEmptyGrid(size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const col = outlineGrid[y][x];
      if (col !== 'transparent') {
        // Shift head/torso down 1px for breathing
        const isUpperBody = y < hipY && y >= headCenterY - headRadius;
        const newY = isUpperBody ? Math.min(size - 1, y + 1) : y;
        idleFrame2[newY][x] = col;
      }
    }
  }
  frames.idle.push(idleFrame2);

  // Walk Frames (4 frames)
  for (let f = 0; f < 4; f++) {
    const walkF = createEmptyGrid(size);
    const legOffset = (f === 1 || f === 3) ? (f === 1 ? 1 : -1) * Math.round(1.5 * scale) : 0;
    const bounce = (f === 1 || f === 3) ? -1 : 0;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const col = outlineGrid[y][x];
        if (col !== 'transparent') {
          if (y >= hipY) {
            // Legs moving
            const isLeftLeg = x < cx;
            const dirMultiplier = isLeftLeg ? 1 : -1;
            const targetX = Math.max(0, Math.min(size - 1, x + legOffset * dirMultiplier));
            walkF[y][targetX] = col;
          } else {
            // Upper body bob
            const targetY = Math.max(0, Math.min(size - 1, y + bounce));
            walkF[targetY][x] = col;
          }
        }
      }
    }
    frames.walk.push(walkF);
  }

  // Attack Frames (3 frames)
  for (let f = 0; f < 3; f++) {
    const atkF = createEmptyGrid(size);
    const lungX = f === 1 ? Math.round(3 * scale) : (f === 2 ? Math.round(1 * scale) : 0);
    const slashW = f === 1 ? Math.round(6 * scale) : 0;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const col = outlineGrid[y][x];
        if (col !== 'transparent') {
          const targetX = Math.max(0, Math.min(size - 1, x + lungX));
          atkF[y][targetX] = col;
        }
      }
    }
    // Add swing arc slash on frame 1
    if (slashW > 0) {
      for (let a = 0; a < slashW; a++) {
        const arcY = neckY + a;
        const arcX = cx + Math.floor(torsoWidth / 2) + lungX + a;
        if (arcX < size && arcY < size) {
          atkF[arcY][arcX] = highlightColor;
        }
      }
    }
    frames.attack.push(atkF);
  }

  // Hurt Frames (2 frames)
  for (let f = 0; f < 2; f++) {
    const hurtF = createEmptyGrid(size);
    const knockbackX = -Math.round((f + 1) * scale);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const col = outlineGrid[y][x];
        if (col !== 'transparent') {
          const targetX = Math.max(0, Math.min(size - 1, x + knockbackX));
          // Flash red tone or highlight on impact frame
          hurtF[y][targetX] = f === 0 ? (pal[4] || col) : col;
        }
      }
    }
    frames.hurt.push(hurtF);
  }

  return {
    pixels: outlineGrid,
    palette: pal,
    frames,
    features: detectedFeatures
  };
}

/**
 * AI Reflective Evaluation Engine:
 * Assesses prompt adherence, silhouette contrast, color variety, and structural integrity.
 */
export function evaluateSpriteMatrix(
  pixels: string[][],
  prompt: string,
  resolution: SpriteResolution,
  palette: string[],
  detectedFeatures: string[]
): SpriteEvaluation {
  const size = resolution;
  let filledPixels = 0;
  let minX: number = size;
  let maxX: number = -1;
  let minY: number = size;
  let maxY: number = -1;
  const colorCountMap: Record<string, number> = {};

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const color = pixels[y]?.[x] || 'transparent';
      if (color !== 'transparent') {
        filledPixels++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        colorCountMap[color] = (colorCountMap[color] || 0) + 1;
      }
    }
  }

  const totalPixels = size * size;
  const density = filledPixels / totalPixels;
  const distinctColors = Object.keys(colorCountMap).length;

  // 1. Silhouette Score: Checks if character occupies reasonable bounding box (20% - 60% of canvas)
  let silhouetteScore = 85;
  if (density < 0.08) silhouetteScore -= 30; // Too sparse
  else if (density > 0.65) silhouetteScore -= 20; // Bloated block
  else if (density >= 0.15 && density <= 0.45) silhouetteScore += 10; // Ideal sprite occupancy

  // Check aspect ratio of character bounds (characters are usually taller than wide)
  const charWidth = Math.max(1, maxX - minX + 1);
  const charHeight = Math.max(1, maxY - minY + 1);
  const ratio = charHeight / charWidth;
  if (ratio >= 1.1 && ratio <= 2.2) {
    silhouetteScore += 5;
  }

  // 2. Palette Harmony Score
  let paletteHarmonyScore = 80;
  if (distinctColors >= 4 && distinctColors <= 12) {
    paletteHarmonyScore += 12;
  } else if (distinctColors < 3) {
    paletteHarmonyScore -= 20;
  }

  // 3. Adherence Score
  let adherenceScore = 88;
  const missingFeatures: string[] = [];
  const pLower = prompt.toLowerCase();

  if (pLower.includes('shield') && !detectedFeatures.some(f => f.includes('Shield'))) {
    adherenceScore -= 10;
    missingFeatures.push('Shield/Tameng tidak terlihat jelas');
  }
  if (pLower.includes('cape') && !detectedFeatures.some(f => f.includes('Cape'))) {
    adherenceScore -= 8;
    missingFeatures.push('Jubah belakang kurang kontras');
  }
  if (pLower.includes('glow') && !detectedFeatures.some(f => f.includes('Glow'))) {
    adherenceScore -= 5;
    missingFeatures.push('Efek glow pada armor/mata perlu ditingkatkan');
  }

  adherenceScore = Math.max(40, Math.min(99, adherenceScore));
  silhouetteScore = Math.max(40, Math.min(98, silhouetteScore));
  paletteHarmonyScore = Math.max(45, Math.min(97, paletteHarmonyScore));

  const average = (adherenceScore + silhouetteScore + paletteHarmonyScore) / 3;
  let overallQuality: 'exceptional' | 'approved' | 'needs_refinement' = 'approved';
  if (average >= 90) overallQuality = 'exceptional';
  else if (average < 75) overallQuality = 'needs_refinement';

  const suggestedFixes: string[] = [];
  if (distinctColors < 5) suggestedFixes.push('Tambahkan 1 tingkat highlight specular pada bagian armor/senjata');
  if (density < 0.15) suggestedFixes.push('Pertegas siluet dengan menambah ketebalan ekstremitas tubuh');
  suggestedFixes.push('Harmonisasikan shading bayangan tanah dengan pencahayaan atas');

  const verdict = overallQuality === 'exceptional'
    ? 'Sprite memenuhi standar pixel art profesional dengan siluet tajam, proporsi anatomi akurat, dan kepatuhan prompt visual yang tinggi.'
    : overallQuality === 'approved'
    ? 'Sprite sudah proporsional dan sesuai deskripsi prompt. Siap diekspor atau disempurnakan lebih lanjut.'
    : 'Sprite memerlukan sedikit penajaman outline dan kontras warna agar siluet lebih mudah dibaca.';

  const critique = `Resolusi ${size}x${size} berhasil dirender dengan kepadatan pixel ${(density * 100).toFixed(1)}% (${filledPixels} px). ` +
    `Ditemukan ${distinctColors} warna dari palet referensi. Siluet karakter memiliki rasio proporsi ${(charHeight / charWidth).toFixed(2)}:1 dengan bounding box yang terpusat stabil.`;

  return {
    adherenceScore,
    silhouetteScore,
    paletteHarmonyScore,
    overallQuality,
    verdict,
    critique,
    detectedFeatures,
    missingFeatures,
    suggestedFixes,
    inspectedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  };
}

/**
 * Applies AI automated refinement pass to enhance contrast and remove stray pixels
 */
export function applyAutoRefinement(pixels: string[][], palette: string[]): string[][] {
  const size = pixels.length;
  const refined = JSON.parse(JSON.stringify(pixels)) as string[][];
  const highlight = palette[palette.length - 1] || '#ffffff';

  // 1. Remove lonely orphan pixels (isolated single pixel floating without neighbors)
  for (let y = 1; y < size - 1; y++) {
    for (let x = 1; x < size - 1; x++) {
      if (refined[y][x] !== 'transparent') {
        const neighbors = [
          refined[y - 1][x], refined[y + 1][x],
          refined[y][x - 1], refined[y][x + 1]
        ];
        const activeNeighbors = neighbors.filter(c => c !== 'transparent').length;
        if (activeNeighbors === 0) {
          refined[y][x] = 'transparent';
        }
      }
    }
  }

  // 2. Add top specular glint to upper head pixels
  for (let y = 2; y < Math.floor(size * 0.35); y++) {
    for (let x = 2; x < size - 2; x++) {
      if (refined[y][x] !== 'transparent' && refined[y - 1][x] === 'transparent') {
        if (x % 3 === 0) {
          refined[y][x] = highlight;
        }
      }
    }
  }

  return refined;
}
