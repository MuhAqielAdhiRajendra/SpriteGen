import {
  CharacterDirection,
  SpriteEvaluation,
  SpriteResolution,
  AnimationType,
  ColorGradingMode,
  SpriteFrame
} from '../types/sprite';
import {
  CharacterSpec,
  Pose,
  POSES,
  getPose,
  tweenPose,
  Grid,
  buildPalette,
  postProcessFrame,
  alignToGround,
  addOutline,
  removeOrphans,
  upscaleNearest,
  validateSequence,
  DEFAULT_SPEC
} from './pixelforgeSpec';

export * from './pixelforgeSpec';

export interface PalettePreset {
  id: string;
  name: string;
  description: string;
  colors: string[];
}

export const PALETTES: Record<string, PalettePreset> = {
  vibrant_rpg: {
    id: 'vibrant_rpg',
    name: 'Vibrant Studio RPG (Default)',
    description: 'Palet ultra-vibrant dengan saturasi kaya, kontras tajam, dan warna bersih tanpa bayangan kotor',
    colors: [
      '#0f172a', '#1e293b', '#334155', '#475569',
      '#f43f5e', '#fb7185', '#fbbf24', '#fef08a',
      '#0284c7', '#38bdf8', '#059669', '#34d399',
      '#7c3aed', '#c084fc', '#f8fafc', '#ffffff'
    ]
  },
  clean_anime: {
    id: 'clean_anime',
    name: 'Clean Cel-Shaded Anime',
    description: 'Grading cel-shading modern khas anime: warna kulit bersih, busana cerah, dan outline tajam',
    colors: [
      '#111827', '#1f2937', '#374151', '#4b5563',
      '#e11d48', '#f43f5e', '#f59e0b', '#fde047',
      '#2563eb', '#60a5fa', '#10b981', '#6ee7b7',
      '#fed7aa', '#ffedd5', '#f9fafb', '#ffffff'
    ]
  },
  cyber_glow: {
    id: 'cyber_glow',
    name: 'Cyber Neon Lumina',
    description: 'Grading futuristik: cyan listrik, magenta tajam, ungu ultraviolet, dan specular neon',
    colors: [
      '#050508', '#0f172a', '#1e1b4b', '#312e81',
      '#00f0ff', '#0ea5e9', '#0284c7', '#38bdf8',
      '#f43f5e', '#ec4899', '#d946ef', '#a855f7',
      '#facc15', '#4ade80', '#e0f2fe', '#ffffff'
    ]
  },
  royal_gold: {
    id: 'royal_gold',
    name: 'Royal Gold & Sapphire',
    description: 'Kombinasi mewah: emas murni mengkilap, merah delima, dan zirah perak berkilau',
    colors: [
      '#0a0a0f', '#1c1917', '#292524', '#44403c',
      '#b91c1c', '#dc2626', '#d97706', '#f59e0b',
      '#fde047', '#fef9c3', '#1d4ed8', '#3b82f6',
      '#93c5fd', '#e2e8f0', '#f8fafc', '#ffffff'
    ]
  },
  snes: {
    id: 'snes',
    name: '16-Bit SNES Classic',
    description: 'Palet nostalgia RPG era 90-an dengan harmonisasi warna seimbang',
    colors: [
      '#070707', '#1f1b24', '#3d2936', '#693b48',
      '#a35359', '#d47b67', '#f0b084', '#ffe8b5',
      '#1b3240', '#2a5b66', '#3b8b88', '#63c79c',
      '#21183c', '#462761', '#853e7a', '#c76e93'
    ]
  },
  pastel: {
    id: 'pastel',
    name: 'Pastel Dream Fantasy',
    description: 'Warna lembut dreamy ala game cozy indie fantasy dengan kontras halus',
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
 * Deep clones a 2D pixel grid
 */
export function cloneGrid(grid: string[][]): string[][] {
  return grid.map(row => [...row]);
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
 * Calculates Euclidean color distance
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
 * Overloaded quantizeToPalette:
 * Can quantize a single hex string, or an entire 2D Grid!
 */
export function quantizeToPalette(target: string, palette: string[]): string;
export function quantizeToPalette(target: string[][], palette: string[]): string[][];
export function quantizeToPalette(target: string | string[][], palette: string[]): string | string[][] {
  if (Array.isArray(target)) {
    // 2D Grid quantize
    const cache = new Map<string, string>();
    return target.map(row =>
      row.map(c => {
        if (c === 'transparent' || !c) return 'transparent';
        const hit = cache.get(c);
        if (hit) return hit;
        let closest = palette[0] || '#ffffff';
        let minDistance = Infinity;
        for (const p of palette) {
          const d = colorDistance(c, p);
          if (d < minDistance) {
            minDistance = d;
            closest = p;
          }
        }
        cache.set(c, closest);
        return closest;
      })
    );
  }

  // Single color string quantize
  if (target === 'transparent' || !palette.length) return target;
  let closest = palette[0];
  let minDistance = Infinity;
  for (const palColor of palette) {
    const dist = colorDistance(target, palColor);
    if (dist < minDistance) {
      minDistance = dist;
      closest = palColor;
    }
  }
  return closest;
}

/**
 * Applies color grading to a palette
 */
export function applyColorGrading(palette: string[], mode: ColorGradingMode = 'vibrant'): string[] {
  return palette.map((hex, idx) => {
    if (hex === 'transparent') return hex;
    const rgba = hexToRgba(hex);

    if (mode === 'vibrant') {
      const max = Math.max(rgba.r, rgba.g, rgba.b);
      const min = Math.min(rgba.r, rgba.g, rgba.b);
      const isNeutral = (max - min) < 25;
      if (!isNeutral && idx > 2) {
        const r = Math.min(255, Math.round(rgba.r * 1.1));
        const g = Math.min(255, Math.round(rgba.g * 1.1));
        const b = Math.min(255, Math.round(rgba.b * 1.1));
        return rgbaToHex(r, g, b);
      }
    } else if (mode === 'neon') {
      if (rgba.b > rgba.r) {
        return rgbaToHex(Math.min(255, rgba.r + 10), Math.min(255, rgba.g + 20), Math.min(255, rgba.b + 35));
      }
    } else if (mode === 'warm') {
      return rgbaToHex(Math.min(255, rgba.r + 20), Math.min(255, rgba.g + 10), Math.max(0, rgba.b - 10));
    } else if (mode === 'cool') {
      return rgbaToHex(Math.max(0, rgba.r - 10), Math.min(255, rgba.g + 10), Math.min(255, rgba.b + 25));
    }
    return hex;
  });
}

/**
 * Detects whether user explicitly requested animations
 */
export function detectRequestedAnimations(prompt: string, explicit?: AnimationType[]): AnimationType[] {
  if (explicit && explicit.length > 0) {
    return explicit;
  }

  const p = prompt.toLowerCase();
  const detected: AnimationType[] = [];

  const hasWalk = p.includes('jalan') || p.includes('berjalan') || p.includes('langkah') || 
                  p.includes('lari') || p.includes('berlari') || p.includes('walk') || 
                  p.includes('walking') || p.includes('run') || p.includes('running');
  
  const hasAttack = p.includes('serang') || p.includes('menyerang') || p.includes('tebas') || 
                    p.includes('tebasan') || p.includes('ayun') || p.includes('pukul') || 
                    p.includes('tembak') || p.includes('attack') || p.includes('slash') || 
                    p.includes('strike') || p.includes('swing') || p.includes('shoot');
                    
  const hasHurt = p.includes('terluka') || p.includes('kena serang') || p.includes('pingsan') || 
                  p.includes('knockback') || p.includes('damage') || p.includes('hurt') || 
                  p.includes('hit');
                  
  const hasIdle = p.includes('idle') || p.includes('napas') || p.includes('bernapas') || 
                  p.includes('breathe') || p.includes('breathing') || p.includes('santai');

  const hasGenericAnimation = p.includes('animasi') || p.includes('gerak') || p.includes('bergerak') || 
                              p.includes('animated') || p.includes('animation') || p.includes('motion');

  if (hasWalk) detected.push('walk');
  if (hasAttack) detected.push('attack');
  if (hasHurt) detected.push('hurt');
  if (hasIdle) detected.push('idle');

  if (detected.length === 0 && hasGenericAnimation) {
    detected.push('walk');
  }

  return detected;
}

/**
 * Offline / Procedural prompt parser that outputs a validated CharacterSpec
 */
export function specFromPromptProcedural(prompt: string): CharacterSpec {
  const p = prompt.toLowerCase();

  // Archetype
  let archetype: CharacterSpec['archetype'] = 'fighter';
  if (p.includes('archer') || p.includes('panah') || p.includes('bow') || p.includes('ranger') || p.includes('pemburu')) {
    archetype = 'archer';
  } else if (p.includes('mage') || p.includes('penyihir') || p.includes('wizard') || p.includes('sorcerer') || p.includes('sihir') || p.includes('staff') || p.includes('tongkat')) {
    archetype = 'mage';
  } else if (p.includes('goblin') || p.includes('orc') || p.includes('monster hijau')) {
    archetype = 'goblin';
  } else if (p.includes('zombie') || p.includes('mayat') || p.includes('undead') || p.includes('tengkorak') || p.includes('ghoul')) {
    archetype = 'zombie';
  } else if (p.includes('npc') || p.includes('warga') || p.includes('penduduk') || p.includes('pedagang') || p.includes('rakyat')) {
    archetype = 'npc';
  }

  // Body
  let body: CharacterSpec['body'] = 'normal';
  if (p.includes('heavy') || p.includes('tebal') || p.includes('kekar') || p.includes('besar') || p.includes('raksasa') || p.includes('tank') || p.includes('plate') || p.includes('zirah tebal')) {
    body = 'heavy';
  } else if (archetype === 'archer' || archetype === 'mage' || archetype === 'goblin' || p.includes('slim') || p.includes('ramping') || p.includes('lincah') || p.includes('ninja') || p.includes('kecil')) {
    body = 'slim';
  }

  // Head
  let head: CharacterSpec['head'] = 'bare';
  if (p.includes('tanduk') || p.includes('horned') || p.includes('demon') || p.includes('iblis')) {
    head = 'horned';
  } else if (p.includes('helm tertutup') || p.includes('full helm') || p.includes('visor') || (body === 'heavy' && !p.includes('hood'))) {
    head = 'helmet_closed';
  } else if (p.includes('helm') || p.includes('helmet')) {
    head = 'helmet_open';
  } else if (p.includes('hood') || p.includes('tudung') || p.includes('jubah kepala') || archetype === 'mage') {
    head = 'hood';
  }

  // Weapon
  let weapon: CharacterSpec['weapon'] = 'sword';
  if (archetype === 'archer' || p.includes('bow') || p.includes('panah') || p.includes('busur')) {
    weapon = 'bow';
  } else if (archetype === 'mage' || p.includes('staff') || p.includes('tongkat') || p.includes('wand')) {
    weapon = 'staff';
  } else if (p.includes('axe') || p.includes('kapak')) {
    weapon = 'axe';
  } else if (archetype === 'goblin' || p.includes('belati') || p.includes('dagger') || p.includes('pisau')) {
    weapon = 'dagger';
  } else if (p.includes('tanpa senjata') || p.includes('tangan kosong') || p.includes('none')) {
    weapon = 'none';
  }

  // Offhand
  let offhand: CharacterSpec['offhand'] = 'none';
  if (p.includes('shield') || p.includes('perisai') || p.includes('tameng') || (archetype === 'fighter' && weapon === 'sword' && !p.includes('dua tangan'))) {
    offhand = 'shield';
  }

  // Cape
  let cape: CharacterSpec['cape'] = 'none';
  if (p.includes('jubah panjang') || p.includes('long cape') || p.includes('cloak') || (archetype === 'mage' && !p.includes('tanpa jubah'))) {
    cape = 'long';
  } else if (p.includes('jubah') || p.includes('cape') || p.includes('mantel')) {
    cape = 'short';
  }

  // Palette
  let skin = '#f2c9a0';
  let hair = '#4a3728';
  let primary = '#3b6fd8';
  let secondary = '#1e3a8a';
  let accent = '#f59e0b';
  let metal = '#cbd5e1';

  if (archetype === 'goblin') {
    skin = '#65a30d';
    hair = '#1c1917';
    primary = '#854d0e';
    secondary = '#533107';
    accent = '#eab308';
    metal = '#94a3b8';
  } else if (archetype === 'zombie') {
    skin = '#86efac';
    hair = '#334155';
    primary = '#475569';
    secondary = '#1e293b';
    accent = '#ef4444';
    metal = '#64748b';
  }

  if (p.includes('merah') || p.includes('red') || p.includes('crimson')) {
    primary = '#dc2626';
    secondary = '#7f1d1d';
    accent = '#fbbf24';
  } else if (p.includes('emas') || p.includes('gold') || p.includes('kuning')) {
    primary = '#d97706';
    secondary = '#78350f';
    accent = '#fef08a';
    metal = '#facc15';
  } else if (p.includes('hijau') || p.includes('green') || p.includes('emerald')) {
    primary = '#16a34a';
    secondary = '#14532d';
    accent = '#facc15';
  } else if (p.includes('ungu') || p.includes('purple') || p.includes('violet')) {
    primary = '#9333ea';
    secondary = '#581c87';
    accent = '#38bdf8';
  } else if (p.includes('cyan') || p.includes('biru muda') || p.includes('aqua')) {
    primary = '#0284c7';
    secondary = '#0c4a6e';
    accent = '#a5f3fc';
  } else if (p.includes('hitam') || p.includes('black') || p.includes('dark')) {
    primary = '#1e293b';
    secondary = '#0f172a';
    accent = '#f43f5e';
    metal = '#94a3b8';
  } else if (p.includes('putih') || p.includes('perak') || p.includes('silver')) {
    primary = '#64748b';
    secondary = '#334155';
    accent = '#38bdf8';
    metal = '#e2e8f0';
  }

  const nameWords = prompt.trim().split(/\s+/).slice(0, 3).join(' ');
  const name = nameWords.length > 0 ? nameWords.slice(0, 24) : 'Petualang';

  return {
    name,
    archetype,
    body,
    head,
    weapon,
    offhand,
    cape,
    palette: { skin, hair, primary, secondary, accent, metal },
    animations: ['idle', 'walk', 'attack']
  };
}

/**
 * Draws a complete standalone CEL FRAME of pixel art onto a blank grid.
 * Strict compliance with Rule #3:
 * - NO CSS transforms, NO bone rotations, NO tweening.
 * - Every cel is drawn with discrete pixel coordinates corresponding to its unique posture!
 */
export function drawCharacterCel(
  specOrSize: CharacterSpec | number,
  poseOrColors: any,
  sizeOrAnalysis?: any,
  legacyPose?: any
): any {
  if (typeof specOrSize === 'object' && 'archetype' in specOrSize) {
    // New signature: drawCharacterCel(spec, pose, size) -> { body, fx }
    const spec = specOrSize as CharacterSpec;
    const pose = poseOrColors as Pose;
    const size = typeof sizeOrAnalysis === 'number' ? sizeOrAnalysis : 32;
    return drawCharacterCelFromSpec(spec, pose, size);
  }

  // Legacy signature: drawCharacterCel(size, colors, analysis, pose) -> string[][]
  const size = specOrSize as number;
  const colors = poseOrColors;
  const analysis = sizeOrAnalysis;
  const pose = legacyPose;

  const grid = createEmptyGrid(size);
  const scale = size / 32;
  const cx = Math.floor(size / 2);

  const setPixel = (x: number, y: number, color: string) => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    if (iy >= 0 && iy < size && ix >= 0 && ix < size && color !== 'transparent') {
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

  const headRadius = Math.round(4.5 * scale);
  let headCenterY = Math.round(9 * scale);
  const torsoHeight = Math.round(8 * scale);
  const torsoWidth = Math.round(9 * scale);
  let torsoXOffset = 0;
  let torsoYOffset = 0;
  let legLeftOffset = 0;
  let legRightOffset = 0;
  let legLeftLift = 0;
  let legRightLift = 0;
  let armLeftAngle = 0;
  let armRightAngle = 0;
  let slashArc = false;

  if (pose.type === 'walk') {
    if (pose.step === 0) {
      legLeftOffset = -Math.round(3 * scale);
      legRightOffset = Math.round(3 * scale);
      armLeftAngle = Math.round(2 * scale);
      armRightAngle = -Math.round(2 * scale);
    } else if (pose.step === 1) {
      torsoYOffset = -Math.round(1 * scale);
      legRightLift = Math.round(2 * scale);
    } else if (pose.step === 2) {
      legLeftOffset = Math.round(3 * scale);
      legRightOffset = -Math.round(3 * scale);
      armLeftAngle = -Math.round(2 * scale);
      armRightAngle = Math.round(2 * scale);
    } else if (pose.step === 3) {
      torsoYOffset = -Math.round(1 * scale);
      legLeftLift = Math.round(2 * scale);
    }
  } else if (pose.type === 'attack') {
    if (pose.step === 0) {
      torsoXOffset = -Math.round(2 * scale);
      armRightAngle = -Math.round(4 * scale);
    } else if (pose.step === 1) {
      torsoXOffset = Math.round(3 * scale);
      armRightAngle = Math.round(4 * scale);
      slashArc = true;
    }
  }

  headCenterY += torsoYOffset;
  const neckY = headCenterY + headRadius;
  const hipY = neckY + torsoHeight;
  const groundY = Math.min(size - Math.round(2 * scale), hipY + Math.round(8 * scale));

  // Torso
  drawRect(cx + torsoXOffset - Math.floor(torsoWidth / 2), neckY, torsoWidth, torsoHeight, colors.primaryColor);

  // Legs
  const legW = Math.max(2, Math.round(2.5 * scale));
  const leftLegX = cx + torsoXOffset - legW - 1 + legLeftOffset;
  const rightLegX = cx + torsoXOffset + 1 + legRightOffset;
  drawRect(leftLegX, hipY, legW, groundY - legLeftLift - hipY, colors.secondaryColor);
  drawRect(rightLegX, hipY, legW, groundY - legRightLift - hipY, colors.secondaryColor);

  // Head
  for (let dy = -headRadius; dy <= headRadius; dy++) {
    for (let dx = -headRadius; dx <= headRadius; dx++) {
      if (dx * dx + dy * dy <= headRadius * headRadius) {
        setPixel(cx + torsoXOffset + dx, headCenterY + dy, colors.secondaryColor);
      }
    }
  }

  // Sword
  if (analysis?.hasSword !== false) {
    const swordBladeH = Math.round(10 * scale);
    const handX = cx + torsoXOffset + Math.floor(torsoWidth / 2) + 2;
    const handY = neckY + Math.round(2 * scale) + armRightAngle;
    drawRect(handX, handY - swordBladeH, Math.max(1, Math.round(1.5 * scale)), swordBladeH, colors.highlightColor);
  }

  if (slashArc) {
    for (let a = 0; a < 8; a++) {
      setPixel(cx + torsoXOffset + Math.round(6 * scale) + a, neckY - Math.round(2 * scale) + a, colors.highlightColor);
    }
  }

  return grid;
}

/**
 * Draws discrete pixel components for a CharacterSpec into body grid and fx grid
 */
export function drawCharacterCelFromSpec(
  spec: CharacterSpec,
  pose: Pose,
  size: number = 32
): { body: Grid; fx: Grid | null } {
  const body = createEmptyGrid(size);
  const fx = createEmptyGrid(size);

  const pal = buildPalette(spec);
  const { ramps } = pal;

  const setBodyPixel = (x: number, y: number, color: string) => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    if (iy >= 0 && iy < size && ix >= 0 && ix < size && color !== 'transparent') {
      body[iy][ix] = color;
    }
  };

  const drawBodyRect = (x: number, y: number, w: number, h: number, color: string) => {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        setBodyPixel(x + dx, y + dy, color);
      }
    }
  };

  const setFxPixel = (x: number, y: number, color: string) => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    if (iy >= 0 && iy < size && ix >= 0 && ix < size && color !== 'transparent') {
      fx[iy][ix] = color;
    }
  };

  const cx = 16;
  const groundY = 30;

  // Body proportions based on spec.body
  let torsoW = 8;
  let torsoH = 7;
  let legW = 2;
  if (spec.body === 'slim') {
    torsoW = 6;
    torsoH = 7;
    legW = 2;
  } else if (spec.body === 'heavy') {
    torsoW = 10;
    torsoH = 8;
    legW = 3;
  }

  const torsoX = cx - Math.floor(torsoW / 2);
  const torsoY = 13 + pose.bodyDy;
  const hipY = torsoY + torsoH;

  // 1. Cape (Behind body)
  if (spec.cape !== 'none') {
    const capeW = torsoW + (spec.cape === 'long' ? 2 : 0);
    const capeStartY = torsoY + 1;
    const capeEndY = spec.cape === 'long' ? groundY - 2 : hipY + 1;
    for (let cy = capeStartY; cy <= capeEndY; cy++) {
      const progress = (cy - capeStartY) / Math.max(1, capeEndY - capeStartY);
      const flare = spec.cape === 'long' ? Math.round(progress * 2) : 0;
      const sway = pose.capeSway * Math.round(progress * 2);
      const startX = cx - Math.floor(capeW / 2) - flare - sway;
      const width = capeW + flare * 2;
      for (let k = 0; k < width; k++) {
        const color = (k === 0 || k === width - 1) ? ramps.primary.shadow : ramps.primary.base;
        setBodyPixel(startX + k, cy, color);
      }
    }
  }

  // 2. Back Leg (drawn before torso so torso/front leg overlaps cleanly)
  const backLegX = cx - Math.floor(torsoW / 2) + pose.legBackX;
  const backLegGround = groundY - pose.legBackLift;
  drawBodyRect(backLegX, hipY, legW, Math.max(1, backLegGround - hipY - 2), ramps.secondary.shadow);
  drawBodyRect(backLegX, backLegGround - 2, legW, 2, ramps.metal.shadow);

  // 3. Back Arm (drawn behind torso)
  const backShoulderX = torsoX;
  const backShoulderY = torsoY + 1;
  const armLen = 5;
  const backRad = (pose.armBack * Math.PI) / 180;
  const backHandX = Math.round(backShoulderX + Math.sin(backRad) * armLen);
  const backHandY = Math.round(backShoulderY + Math.cos(backRad) * armLen);

  for (let s = 0; s <= armLen; s++) {
    const ax = Math.round(backShoulderX + (backHandX - backShoulderX) * (s / armLen));
    const ay = Math.round(backShoulderY + (backHandY - backShoulderY) * (s / armLen));
    setBodyPixel(ax, ay, ramps.primary.shadow);
  }
  setBodyPixel(backHandX, backHandY, ramps.skin.shadow);

  // 4. Torso / Armor / Clothing
  drawBodyRect(torsoX, torsoY, torsoW, torsoH, ramps.primary.base);
  for (let dy = 0; dy < torsoH; dy++) {
    setBodyPixel(torsoX, torsoY + dy, ramps.primary.shadow);
    setBodyPixel(torsoX + torsoW - 1, torsoY + dy, ramps.primary.light);
  }

  if (spec.archetype === 'fighter') {
    const plateW = torsoW - 2;
    drawBodyRect(torsoX + 1, torsoY + 1, plateW, 4, ramps.metal.base);
    setBodyPixel(cx, torsoY + 2, ramps.accent.base);
    setBodyPixel(cx, torsoY + 1, ramps.metal.light);
  } else if (spec.archetype === 'archer') {
    for (let d = 0; d < Math.min(torsoW, torsoH); d++) {
      setBodyPixel(torsoX + d, torsoY + d, ramps.secondary.base);
    }
  } else if (spec.archetype === 'mage') {
    drawBodyRect(torsoX, hipY, torsoW, 3, ramps.primary.base);
    setBodyPixel(cx, torsoY + 1, ramps.accent.base);
    setBodyPixel(cx, torsoY + 2, ramps.accent.light);
  } else if (spec.archetype === 'goblin') {
    drawBodyRect(torsoX, hipY, torsoW, 2, ramps.secondary.base);
    setBodyPixel(torsoX + 1, hipY + 2, ramps.secondary.base);
    setBodyPixel(torsoX + torsoW - 2, hipY + 2, ramps.secondary.base);
  }

  // Belt
  drawBodyRect(torsoX, hipY - 1, torsoW, 1, ramps.secondary.shadow);
  setBodyPixel(cx, hipY - 1, ramps.accent.base);

  // 5. Front Leg
  const frontLegX = cx + 1 + pose.legFrontX;
  const frontLegGround = groundY - pose.legFrontLift;
  drawBodyRect(frontLegX, hipY, legW, Math.max(1, frontLegGround - hipY - 2), ramps.secondary.base);
  drawBodyRect(frontLegX, frontLegGround - 2, legW, 2, ramps.metal.base);
  setBodyPixel(frontLegX + legW - 1, frontLegGround - 2, ramps.metal.light);

  // 6. Offhand (Shield)
  if (spec.offhand === 'shield') {
    const shieldX = cx - 3 + Math.round(pose.capeSway / 2);
    const shieldY = torsoY + 1;
    drawBodyRect(shieldX, shieldY, 5, 7, ramps.primary.base);
    drawBodyRect(shieldX, shieldY, 5, 1, ramps.metal.base);
    drawBodyRect(shieldX, shieldY + 6, 5, 1, ramps.metal.base);
    drawBodyRect(shieldX, shieldY, 1, 7, ramps.metal.base);
    drawBodyRect(shieldX + 4, shieldY, 1, 7, ramps.metal.base);
    setBodyPixel(shieldX + 2, shieldY + 3, ramps.accent.base);
    setBodyPixel(shieldX + 2, shieldY + 2, ramps.accent.light);
  }

  // 7. Head & Face
  const headX = cx + pose.headDx;
  const headY = 9 + pose.bodyDy + pose.headDy;
  const headR = spec.archetype === 'goblin' ? 3 : spec.body === 'heavy' ? 4 : 3.5;

  for (let dy = -Math.floor(headR); dy <= Math.floor(headR); dy++) {
    for (let dx = -Math.floor(headR); dx <= Math.floor(headR); dx++) {
      if (dx * dx + dy * dy <= headR * headR + 1) {
        setBodyPixel(headX + dx, headY + dy, ramps.skin.base);
      }
    }
  }

  setBodyPixel(headX, headY + Math.floor(headR), ramps.skin.shadow);
  setBodyPixel(headX - 1, headY + Math.floor(headR), ramps.skin.shadow);

  // Headwear
  if (spec.head === 'bare') {
    for (let dy = -Math.floor(headR); dy <= 0; dy++) {
      for (let dx = -Math.floor(headR); dx <= Math.floor(headR); dx++) {
        if (dx * dx + dy * dy <= headR * headR) {
          setBodyPixel(headX + dx, headY + dy, ramps.hair.base);
        }
      }
    }
    setBodyPixel(headX, headY - Math.floor(headR), ramps.hair.light);

    if (spec.archetype === 'goblin') {
      setBodyPixel(headX - Math.floor(headR) - 1, headY - 1, ramps.skin.base);
      setBodyPixel(headX - Math.floor(headR) - 2, headY - 2, ramps.skin.shadow);
      setBodyPixel(headX + Math.floor(headR) + 1, headY - 1, ramps.skin.base);
      setBodyPixel(headX + Math.floor(headR) + 2, headY - 2, ramps.skin.base);
    }
  } else if (spec.head === 'hood') {
    for (let dy = -Math.floor(headR) - 1; dy <= 1; dy++) {
      for (let dx = -Math.floor(headR) - 1; dx <= Math.floor(headR) + 1; dx++) {
        if (dx * dx + dy * dy <= (headR + 1) * (headR + 1)) {
          if (!(dx >= 0 && dx <= 2 && dy >= -1 && dy <= 1)) {
            setBodyPixel(headX + dx, headY + dy, ramps.primary.base);
          }
        }
      }
    }
    setBodyPixel(headX, headY - Math.floor(headR) - 1, ramps.primary.light);
  } else if (spec.head === 'helmet_open') {
    for (let dy = -Math.floor(headR); dy <= -1; dy++) {
      for (let dx = -Math.floor(headR); dx <= Math.floor(headR); dx++) {
        if (dx * dx + dy * dy <= headR * headR) {
          setBodyPixel(headX + dx, headY + dy, ramps.metal.base);
        }
      }
    }
    setBodyPixel(headX, headY - Math.floor(headR), ramps.metal.light);
    setBodyPixel(headX + 1, headY, ramps.metal.base);
  } else if (spec.head === 'helmet_closed') {
    for (let dy = -Math.floor(headR); dy <= Math.floor(headR); dy++) {
      for (let dx = -Math.floor(headR); dx <= Math.floor(headR); dx++) {
        if (dx * dx + dy * dy <= headR * headR) {
          setBodyPixel(headX + dx, headY + dy, ramps.metal.base);
        }
      }
    }
    for (let dx = -1; dx <= 2; dx++) {
      setBodyPixel(headX + dx, headY, pal.outline);
    }
    setBodyPixel(headX + 1, headY, ramps.accent.light);
    setBodyPixel(headX, headY - Math.floor(headR), ramps.metal.light);
  } else if (spec.head === 'horned') {
    for (let dy = -Math.floor(headR); dy <= 0; dy++) {
      for (let dx = -Math.floor(headR); dx <= Math.floor(headR); dx++) {
        if (dx * dx + dy * dy <= headR * headR) {
          setBodyPixel(headX + dx, headY + dy, ramps.metal.base);
        }
      }
    }
    setBodyPixel(headX - 3, headY - 3, ramps.accent.base);
    setBodyPixel(headX - 4, headY - 5, ramps.accent.light);
    setBodyPixel(headX + 3, headY - 3, ramps.accent.base);
    setBodyPixel(headX + 4, headY - 5, ramps.accent.light);
  }

  // Eyes
  if (spec.head !== 'helmet_closed') {
    const eyeX = headX + 1;
    const eyeY = headY;
    if (spec.archetype === 'zombie') {
      setBodyPixel(eyeX, eyeY, ramps.accent.light);
    } else {
      setBodyPixel(eyeX, eyeY, pal.outline);
      setBodyPixel(eyeX + 1, eyeY - 1, pal.highlight);
    }
  }

  // 8. Front Arm & Hand
  const frontShoulderX = torsoX + torsoW - 1;
  const frontShoulderY = torsoY + 1;
  const frontRad = (pose.armFront * Math.PI) / 180;
  const frontHandX = Math.round(frontShoulderX + Math.sin(frontRad) * armLen);
  const frontHandY = Math.round(frontShoulderY + Math.cos(frontRad) * armLen);

  for (let s = 0; s <= armLen; s++) {
    const ax = Math.round(frontShoulderX + (frontHandX - frontShoulderX) * (s / armLen));
    const ay = Math.round(frontShoulderY + (frontHandY - frontShoulderY) * (s / armLen));
    setBodyPixel(ax, ay, ramps.primary.base);
  }
  setBodyPixel(frontHandX, frontHandY, ramps.skin.base);

  // 9. Weapon
  if (spec.weapon !== 'none') {
    const wRad = (pose.weaponAngle * Math.PI) / 180;
    const dirX = Math.cos(wRad);
    const dirY = Math.sin(wRad);

    if (spec.weapon === 'sword') {
      const guardPerpX = -dirY;
      const guardPerpY = dirX;
      setBodyPixel(frontHandX + guardPerpX, frontHandY + guardPerpY, ramps.accent.base);
      setBodyPixel(frontHandX - guardPerpX, frontHandY - guardPerpY, ramps.accent.base);

      for (let b = 1; b <= 9; b++) {
        const bx = Math.round(frontHandX + dirX * b);
        const by = Math.round(frontHandY + dirY * b);
        setBodyPixel(bx, by, b === 9 ? pal.highlight : ramps.metal.base);
      }
    } else if (spec.weapon === 'axe') {
      for (let h = 1; h <= 8; h++) {
        const hx = Math.round(frontHandX + dirX * h);
        const hy = Math.round(frontHandY + dirY * h);
        setBodyPixel(hx, hy, ramps.secondary.shadow);
      }
      const tipX = Math.round(frontHandX + dirX * 8);
      const tipY = Math.round(frontHandY + dirY * 8);
      setBodyPixel(tipX, tipY, ramps.metal.base);
      setBodyPixel(tipX - 1, tipY - 1, ramps.metal.light);
      setBodyPixel(tipX, tipY - 2, pal.highlight);
      setBodyPixel(tipX + 1, tipY - 1, ramps.metal.light);
    } else if (spec.weapon === 'staff') {
      for (let s = -6; s <= 9; s++) {
        const sx = Math.round(frontHandX + dirX * s);
        const sy = Math.round(frontHandY + dirY * s);
        setBodyPixel(sx, sy, ramps.secondary.shadow);
      }
      const topX = Math.round(frontHandX + dirX * 9);
      const topY = Math.round(frontHandY + dirY * 9);
      setBodyPixel(topX, topY, ramps.accent.base);
      setBodyPixel(topX, topY - 1, ramps.accent.light);
      setBodyPixel(topX + 1, topY, pal.highlight);
    } else if (spec.weapon === 'bow') {
      for (let a = -4; a <= 4; a++) {
        const curveX = Math.round(frontHandX + dirX * 2 + Math.abs(a) * 0.5);
        const curveY = Math.round(frontHandY + a);
        setBodyPixel(curveX, curveY, ramps.secondary.base);
        setBodyPixel(frontHandX - 1, curveY, ramps.secondary.light);
      }
    } else if (spec.weapon === 'dagger') {
      for (let d = 1; d <= 4; d++) {
        const dx = Math.round(frontHandX + dirX * d);
        const dy = Math.round(frontHandY + dirY * d);
        setBodyPixel(dx, dy, d === 4 ? pal.highlight : ramps.metal.light);
      }
    }
  }

  // 10. Slash FX
  if (pose.slashFx > 0) {
    if (pose.slashFx === 1) {
      setFxPixel(frontHandX + 4, frontHandY - 4, ramps.accent.light);
      setFxPixel(frontHandX + 5, frontHandY - 5, pal.highlight);
    } else if (pose.slashFx === 2) {
      const arcPoints = 12;
      for (let p = 0; p < arcPoints; p++) {
        const t = p / (arcPoints - 1);
        const angle = -Math.PI * 0.4 + t * Math.PI * 0.8;
        const radius = 10;
        const ax = Math.round(frontHandX + Math.cos(angle) * radius);
        const ay = Math.round(frontHandY + Math.sin(angle) * radius);
        setFxPixel(ax, ay, pal.highlight);
        setFxPixel(ax - 1, ay, ramps.accent.light);
        setFxPixel(ax, ay + 1, ramps.accent.base);
      }
    } else if (pose.slashFx === 3) {
      setFxPixel(frontHandX + 7, frontHandY + 2, ramps.accent.light);
      setFxPixel(frontHandX + 9, frontHandY + 4, ramps.accent.base);
    }
  }

  return { body, fx };
}

/**
 * Procedural Pixel Art Generator that scales accurately for 32x32, 64x64, 128x128.
 * Produces discrete Cel Frames without ground shadow using the CharacterSpec.
 */
export function generateProceduralCharacter(params: {
  prompt: string;
  resolution: SpriteResolution;
  paletteKey?: string;
  colorGrading?: ColorGradingMode;
  direction?: CharacterDirection;
  requestedAnimations?: AnimationType[];
  spec?: CharacterSpec;
}): {
  pixels: string[][];
  palette: string[];
  frames: SpriteFrame[];
  animations: Record<string, SpriteFrame[]>;
  features: string[];
  isAnimated: boolean;
  detectedAnimations: AnimationType[];
  spec: CharacterSpec;
} {
  const {
    prompt,
    resolution,
    requestedAnimations: explicitAnimations,
    spec: inputSpec
  } = params;

  // 1. Resolve Spec (either from input or procedural analysis)
  const spec: CharacterSpec = inputSpec || specFromPromptProcedural(prompt);

  // 2. Build Palette & Ramps
  const palObj = buildPalette(spec);
  const palette = [
    palObj.outline,
    spec.palette.primary,
    spec.palette.secondary,
    spec.palette.accent,
    spec.palette.metal,
    spec.palette.skin,
    spec.palette.hair,
    palObj.highlight
  ];

  const detectedAnimations = detectRequestedAnimations(prompt, explicitAnimations);
  const isAnimated = detectedAnimations.length > 0;
  const factor = resolution / 32;

  // 3. Assemble Animations from Spec + Pose Table
  const animations: Record<string, SpriteFrame[]> = {};

  // Build base single frame
  const { body: baseBody, fx: baseFx } = drawCharacterCelFromSpec(spec, POSES.idle[0], 32);
  const baseCel32 = postProcessFrame(baseBody, baseFx, spec, 30);
  const basePixels = upscaleNearest(baseCel32, factor);

  if (!isAnimated) {
    // Static mode: 1 single cel frame
    animations.idle = [
      { id: 'idle-0', name: 'Pose Dasar', pixels: basePixels }
    ];
  } else {
    // Animated mode: frame-by-frame cels
    animations.idle = POSES.idle.slice(0, 3).map((pose, i) => {
      const { body, fx } = drawCharacterCelFromSpec(spec, pose, 32);
      const cel32 = postProcessFrame(body, fx, spec, 30);
      const finalGrid = upscaleNearest(cel32, factor);
      return {
        id: `idle-${i}`,
        name: `Idle ${i + 1}`,
        pixels: finalGrid
      };
    });

    if (detectedAnimations.includes('walk') || isAnimated) {
      // 4-frame walk cycle sampled from contact and passing poses (0, 2, 3, 5)
      const walkKeyIndices = [0, 2, 3, 5];
      animations.walk = walkKeyIndices.map((poseIdx, i) => {
        const pose = POSES.walk[poseIdx] || POSES.walk[0];
        const { body, fx } = drawCharacterCelFromSpec(spec, pose, 32);
        const cel32 = postProcessFrame(body, fx, spec, 30);
        const finalGrid = upscaleNearest(cel32, factor);
        return {
          id: `walk-${i}`,
          name: `Walk ${i + 1}`,
          pixels: finalGrid
        };
      });
    }

    if (detectedAnimations.includes('attack') || isAnimated) {
      // 3-frame attack cycle: windup, slash strike, recover (1, 3, 5)
      const attackKeyIndices = [1, 3, 5];
      animations.attack = attackKeyIndices.map((poseIdx, i) => {
        const pose = POSES.attack[poseIdx] || POSES.attack[0];
        const { body, fx } = drawCharacterCelFromSpec(spec, pose, 32);
        const cel32 = postProcessFrame(body, fx, spec, 30);
        const finalGrid = upscaleNearest(cel32, factor);
        return {
          id: `attack-${i}`,
          name: `Attack ${i + 1}`,
          pixels: finalGrid
        };
      });
    }
  }

  // Active frames
  const activeKey = isAnimated ? (detectedAnimations[0] || 'idle') : 'idle';
  const activeFrames = animations[activeKey] || animations.idle;

  const features: string[] = [
    `Archetype: ${spec.archetype.toUpperCase()}`,
    `Body: ${spec.body}`,
    `Headwear: ${spec.head}`,
    `Weapon: ${spec.weapon}`,
    `Offhand: ${spec.offhand}`,
    `Cape: ${spec.cape}`,
    isAnimated ? `Animasi Frame-by-Frame: [${detectedAnimations.join(', ')}]` : 'Mode Karakter Statis (Single Cel)'
  ];

  return {
    pixels: basePixels,
    palette,
    frames: activeFrames,
    animations,
    features,
    isAnimated,
    detectedAnimations,
    spec
  };
}

/**
 * Synthesizes a new frame-by-frame animation sequence on demand
 */
export function synthesizeAnimationSequence(
  animType: AnimationType,
  resolution: SpriteResolution,
  palette: string[],
  prompt: string,
  spec?: CharacterSpec
): SpriteFrame[] {
  const activeSpec = spec || specFromPromptProcedural(prompt);
  const factor = resolution / 32;

  let selectedPoses: Pose[] = [];
  if (animType === 'walk') {
    selectedPoses = [POSES.walk[0], POSES.walk[2], POSES.walk[3], POSES.walk[5]];
  } else if (animType === 'attack') {
    selectedPoses = [POSES.attack[1], POSES.attack[3], POSES.attack[5]];
  } else if (animType === 'hurt') {
    // 2 hurt frames: Impact (recoiling) and Stagger recovery
    selectedPoses = [
      {
        bodyDy: -1,
        headDx: -2,
        headDy: -1,
        armFront: 50,
        armBack: -40,
        legFrontX: 2,
        legBackX: -3,
        legFrontLift: 1,
        legBackLift: 0,
        weaponAngle: 70,
        capeSway: -2,
        slashFx: 0
      },
      {
        bodyDy: 1,
        headDx: -1,
        headDy: 1,
        armFront: 20,
        armBack: -20,
        legFrontX: 1,
        legBackX: -1,
        legFrontLift: 0,
        legBackLift: 0,
        weaponAngle: 20,
        capeSway: 1,
        slashFx: 0
      }
    ];
  } else {
    selectedPoses = POSES.idle.slice(0, 3);
  }

  return selectedPoses.map((pose, i) => {
    const { body, fx } = drawCharacterCelFromSpec(activeSpec, pose, 32);
    const cel32 = postProcessFrame(body, fx, activeSpec, 30);
    const finalGrid = upscaleNearest(cel32, factor);
    return {
      id: `${animType}-${i}-${Date.now()}`,
      name: `${animType.toUpperCase()} ${i + 1}`,
      pixels: finalGrid
    };
  });
}

/**
 * AI Reflective Evaluation Engine
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

  let silhouetteScore = 88;
  if (density < 0.08) silhouetteScore -= 25;
  else if (density > 0.65) silhouetteScore -= 20;
  else if (density >= 0.15 && density <= 0.45) silhouetteScore += 10;

  const charWidth = Math.max(1, maxX - minX + 1);
  const charHeight = Math.max(1, maxY - minY + 1);
  const ratio = charHeight / charWidth;
  if (ratio >= 1.1 && ratio <= 2.2) {
    silhouetteScore += 5;
  }

  let paletteHarmonyScore = 85;
  if (distinctColors >= 4 && distinctColors <= 16) {
    paletteHarmonyScore += 10;
  } else if (distinctColors < 3) {
    paletteHarmonyScore -= 20;
  }

  let adherenceScore = 92;
  const missingFeatures: string[] = [];
  const pLower = prompt.toLowerCase();

  if (pLower.includes('shield') && !detectedFeatures.some(f => f.toLowerCase().includes('shield') || f.toLowerCase().includes('perisai'))) {
    adherenceScore -= 8;
    missingFeatures.push('Perisai belum terpasang jelas');
  }

  adherenceScore = Math.max(45, Math.min(99, adherenceScore));
  silhouetteScore = Math.max(45, Math.min(98, silhouetteScore));
  paletteHarmonyScore = Math.max(50, Math.min(98, paletteHarmonyScore));

  const average = (adherenceScore + silhouetteScore + paletteHarmonyScore) / 3;
  let overallQuality: 'exceptional' | 'approved' | 'needs_refinement' = 'approved';
  if (average >= 90) overallQuality = 'exceptional';
  else if (average < 75) overallQuality = 'needs_refinement';

  const suggestedFixes: string[] = [];
  if (distinctColors < 5) suggestedFixes.push('Tambahkan 1 tingkat highlight specular pada bagian armor/senjata');
  if (density < 0.15) suggestedFixes.push('Pertegas siluet dengan menambah ketebalan ekstremitas tubuh');
  suggestedFixes.push('Animasi berbasis discrete frame-by-frame sejati tanpa rigging skeletal');

  const verdict = overallQuality === 'exceptional'
    ? 'Sprite memenuhi standar animasi cel pixel art profesional. Setiap frame digambar secara mandiri tanpa rigging skeletal.'
    : overallQuality === 'approved'
    ? 'Sprite proporsional dan bersih. Rangkaian cel frame siap diekspor ke spritesheet atau GIF.'
    : 'Sprite memerlukan sedikit penajaman outline dan kontras warna.';

  const critique = `Resolusi ${size}x${size} berhasil dirender dengan kepadatan pixel ${(density * 100).toFixed(1)}% (${filledPixels} px). ` +
    `Grading menggunakan ${distinctColors} warna palet terindeks. Siluet cel frame mandiri tanpa bayangan lantai buatan, rasio proporsi ${(charHeight / charWidth).toFixed(2)}:1.`;

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
 * Applies automated refinement pass to enhance contrast and remove stray pixels
 */
export function applyAutoRefinement(pixels: string[][], palette: string[]): string[][] {
  const size = pixels.length;
  const refined = JSON.parse(JSON.stringify(pixels)) as string[][];
  const highlight = palette[palette.length - 1] || '#ffffff';

  // 1. Remove lonely orphan pixels
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
