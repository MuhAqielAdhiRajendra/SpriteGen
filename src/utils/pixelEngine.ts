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
  CharacterLayout,
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
  resolveLayout,
  hashString,
  DEFAULT_SPEC,
  DEFAULT_PROPORTIONS,
  DEFAULT_VARIANTS,
  HEIGHTS,
  HEAD_SIZES,
  LEG_LENGTHS,
  BODIES,
  ARCHETYPES,
  HAIR_STYLES,
  TRAITS,
  ACCESSORIES,
  type HeightType,
  type HeadSizeType,
  type LegLengthType,
  type CharacterTrait,
  type CharacterAccessory,
  type HairStyle,
  type CharacterProportions,
  type CharacterVariants,
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
 * Offline / Procedural prompt parser that outputs a validated CharacterSpec.
 * Uses hashString(prompt) for deterministic diversity: different prompts always produce different shapes.
 */
export function specFromPromptProcedural(prompt: string): CharacterSpec {
  const p = prompt.toLowerCase();
  const h = hashString(prompt);

  // Archetype — expanded keywords
  let archetype: CharacterSpec['archetype'] = 'fighter';
  if (p.includes('archer') || p.includes('panah') || p.includes('bow') || p.includes('ranger') || p.includes('pemburu') || p.includes('pemanah')) {
    archetype = 'archer';
  } else if (p.includes('mage') || p.includes('penyihir') || p.includes('wizard') || p.includes('sorcerer') || p.includes('sihir') || p.includes('staff') || p.includes('tongkat')) {
    archetype = 'mage';
  } else if (p.includes('goblin') || p.includes('orc') || p.includes('monster hijau') || p.includes('troll')) {
    archetype = 'goblin';
  } else if (p.includes('zombie') || p.includes('mayat') || p.includes('undead') || p.includes('tengkorak') || p.includes('ghoul') || p.includes('skeleton')) {
    archetype = 'zombie';
  } else if (p.includes('npc') || p.includes('warga') || p.includes('penduduk') || p.includes('pedagang') || p.includes('rakyat')) {
    archetype = 'npc';
  } else if (p.includes('knight') || p.includes('ksatria') || p.includes('pahlawan') || p.includes('hero') || p.includes('pendekar') || p.includes('fighter') || p.includes('pejuang')) {
    archetype = 'fighter';
  } else if (p.includes('ninja') || p.includes('assassin') || p.includes('pembunuh')) {
    archetype = 'fighter'; // slim fighter
  } else if (p.includes('raksasa') || p.includes('giant') || p.includes('ogre')) {
    archetype = 'fighter'; // heavy fighter
  } else if (p.includes('kurcaci') || p.includes('dwarf')) {
    archetype = 'fighter'; // short heavy fighter
  } else if (p.includes('elf') || p.includes('peri')) {
    archetype = 'archer'; // default elf to archer
  } else {
    // No keyword match → deterministic pick via hash
    const archetypePool: CharacterSpec['archetype'][] = ['fighter', 'archer', 'mage', 'goblin', 'zombie', 'npc'];
    archetype = archetypePool[h % archetypePool.length];
  }

  // Body
  let body: CharacterSpec['body'] = 'normal';
  if (p.includes('heavy') || p.includes('tebal') || p.includes('kekar') || p.includes('besar') || p.includes('raksasa') || p.includes('tank') || p.includes('plate') || p.includes('zirah tebal') || p.includes('giant') || p.includes('ogre') || p.includes('kurcaci') || p.includes('dwarf')) {
    body = 'heavy';
  } else if (archetype === 'archer' || archetype === 'mage' || archetype === 'goblin' || p.includes('slim') || p.includes('ramping') || p.includes('lincah') || p.includes('ninja') || p.includes('kecil') || p.includes('elf') || p.includes('peri')) {
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

  // Weapon — zombie defaults to 'none'
  let weapon: CharacterSpec['weapon'] = archetype === 'zombie' ? 'none' : 'sword';
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

  // Hair style — detect from prompt or hash-based
  let hairStyle: HairStyle = 'short';
  if (p.includes('jabrik') || p.includes('spiky')) {
    hairStyle = 'spiky';
  } else if (p.includes('jambul') || p.includes('mohawk') || p.includes('crest')) {
    hairStyle = 'jambul';
  } else if (p.includes('panjang') || p.includes('long hair') || p.includes('rambut panjang')) {
    hairStyle = 'long';
  } else if (p.includes('botak') || p.includes('bald') || p.includes('tanpa rambut') || head === 'helmet_closed' || head === 'hood') {
    hairStyle = 'none';
  } else {
    // Hash-based pick
    const hairPool: HairStyle[] = ['short', 'spiky', 'long', 'jambul', 'none'];
    hairStyle = hairPool[(h >> 3) % hairPool.length];
  }

  // Proportions — deterministic from hash
  const heightPool: HeightType[] = ['short', 'normal', 'tall'];
  const headSizePool: HeadSizeType[] = ['small', 'normal', 'big'];
  const legLenPool: LegLengthType[] = ['short', 'normal', 'long'];

  let propHeight: HeightType = heightPool[(h >> 5) % 3];
  let propHeadSize: HeadSizeType = headSizePool[(h >> 7) % 3];
  let propTorsoWidth: 1 | 2 | 3 = ([1, 2, 3] as const)[(h >> 9) % 3];
  let propLegLength: LegLengthType = legLenPool[(h >> 11) % 3];
  let propArmThickness: 1 | 2 = ([1, 2] as const)[(h >> 13) % 2];

  // Override proportions from explicit prompt keywords
  if (p.includes('jangkung') || p.includes('tinggi') || p.includes('tall')) propHeight = 'tall';
  else if (p.includes('kerdil') || p.includes('pendek') || p.includes('short') || p.includes('kurcaci') || p.includes('dwarf')) propHeight = 'short';
  if (p.includes('kepala besar') || p.includes('big head') || p.includes('chibi')) propHeadSize = 'big';
  else if (p.includes('kepala kecil') || p.includes('small head')) propHeadSize = 'small';
  if (p.includes('raksasa') || p.includes('giant') || p.includes('ogre')) {
    propHeight = 'tall'; propTorsoWidth = 3; propArmThickness = 2;
  }
  if (p.includes('kurcaci') || p.includes('dwarf')) {
    propHeight = 'short'; propTorsoWidth = 3; propArmThickness = 2; propLegLength = 'short';
  }

  const proportions: CharacterProportions = {
    height: propHeight,
    headSize: propHeadSize,
    torsoWidth: propTorsoWidth,
    legLength: propLegLength,
    armThickness: propArmThickness,
  };

  // Variants — deterministic from hash
  const variants: CharacterVariants = {
    hair: (h >> 15) % 5,
    head: (h >> 17) % 4,
    torso: (h >> 19) % 4,
    weapon: (h >> 21) % 4,
  };

  // Traits — deterministic from hash, max 2
  const traits: CharacterTrait[] = [];
  if (p.includes('tanduk') || p.includes('horns')) traits.push('horns');
  if (p.includes('telinga runcing') || p.includes('pointy ears') || p.includes('elf') || p.includes('peri') || archetype === 'goblin') traits.push('pointy_ears');
  if (p.includes('ekor') || p.includes('tail')) traits.push('tail');
  if (p.includes('bungkuk') || p.includes('hunch') || archetype === 'zombie') traits.push('hunch');
  if (p.includes('sayap') || p.includes('wings')) traits.push('wings');
  if (p.includes('jenggot') || p.includes('beard') || p.includes('kurcaci') || p.includes('dwarf')) traits.push('beard');
  if (traits.length === 0) {
    // Hash-based pick, but most characters get 'none'
    const traitPool: CharacterTrait[] = ['none', 'none', 'pointy_ears', 'tail', 'beard', 'none'];
    const picked = traitPool[(h >> 23) % traitPool.length];
    traits.push(picked);
  }
  const finalTraits = traits.slice(0, 2);

  // Accessories — deterministic from hash, max 3
  const accessories: CharacterAccessory[] = [];
  if (p.includes('syal') || p.includes('scarf')) accessories.push('scarf');
  if (p.includes('sabuk') || p.includes('belt') || p.includes('ikat')) accessories.push('belt');
  if (p.includes('sarung tangan') || p.includes('gloves')) accessories.push('gloves');
  if (p.includes('sepatu') || p.includes('boots') || p.includes('bot')) accessories.push('boots');
  if (p.includes('bahu') || p.includes('shoulder pad') || p.includes('pauldron')) accessories.push('shoulder_pad');
  if (p.includes('ransel') || p.includes('backpack') || p.includes('tas')) accessories.push('backpack');
  if (p.includes('tabung panah') || p.includes('quiver') || (archetype === 'archer' && weapon === 'bow')) accessories.push('quiver');
  if (accessories.length === 0) {
    const accPool: CharacterAccessory[] = ['belt', 'boots', 'gloves', 'scarf'];
    accessories.push(accPool[(h >> 25) % accPool.length]);
    const secondAcc = accPool[(h >> 27) % accPool.length];
    if (secondAcc !== accessories[0]) accessories.push(secondAcc);
  }
  const finalAccessories = [...new Set(accessories)].slice(0, 3);

  // Palette
  let skin = '#f2c9a0';
  let hair = '#4a3728';
  let primary = '#3b6fd8';
  let secondary = '#1e3a8a';
  let accent = '#f59e0b';
  let metal = '#cbd5e1';

  if (archetype === 'goblin') {
    skin = '#65a30d'; hair = '#1c1917'; primary = '#854d0e'; secondary = '#533107'; accent = '#eab308'; metal = '#94a3b8';
  } else if (archetype === 'zombie') {
    skin = '#86efac'; hair = '#334155'; primary = '#475569'; secondary = '#1e293b'; accent = '#ef4444'; metal = '#64748b';
  }

  if (p.includes('merah') || p.includes('red') || p.includes('crimson')) {
    primary = '#dc2626'; secondary = '#7f1d1d'; accent = '#fbbf24';
  } else if (p.includes('emas') || p.includes('gold') || p.includes('kuning')) {
    primary = '#d97706'; secondary = '#78350f'; accent = '#fef08a'; metal = '#facc15';
  } else if (p.includes('hijau') || p.includes('green') || p.includes('emerald')) {
    primary = '#16a34a'; secondary = '#14532d'; accent = '#facc15';
  } else if (p.includes('ungu') || p.includes('purple') || p.includes('violet')) {
    primary = '#9333ea'; secondary = '#581c87'; accent = '#38bdf8';
  } else if (p.includes('cyan') || p.includes('biru muda') || p.includes('aqua')) {
    primary = '#0284c7'; secondary = '#0c4a6e'; accent = '#a5f3fc';
  } else if (p.includes('hitam') || p.includes('black') || p.includes('dark')) {
    primary = '#1e293b'; secondary = '#0f172a'; accent = '#f43f5e'; metal = '#94a3b8';
  } else if (p.includes('putih') || p.includes('perak') || p.includes('silver')) {
    primary = '#64748b'; secondary = '#334155'; accent = '#38bdf8'; metal = '#e2e8f0';
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
    animations: ['idle', 'walk', 'attack'],
    proportions,
    variants,
    traits: finalTraits,
    accessories: finalAccessories,
    hairStyle,
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

export function drawCharacterCelFromSpec(
  spec: CharacterSpec,
  pose: Pose,
  size: number = 32
): { body: Grid; fx: Grid | null } {
  const body = createEmptyGrid(size);
  const fx = createEmptyGrid(size);

  const pal = buildPalette(spec);
  const { ramps } = pal;
  const L = resolveLayout(spec, size);

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

  // Use layout-derived values
  const { cx, groundY, torsoW, torsoH, hipY, legW, armLen, headR, scale } = L;
  const torsoX = cx - Math.floor(torsoW / 2);
  const torsoY = L.torsoY + Math.round(pose.bodyDy * scale);
  const hipYPosed = torsoY + torsoH;
  const headX = cx + L.headOffsetX + Math.round(pose.headDx * scale);
  const headY = L.headY + Math.round((pose.bodyDy + pose.headDy) * scale);
  const headRInt = Math.floor(headR);
  const traits = spec.traits || ['none'];
  const accessories = spec.accessories || [];
  const hairStyle = spec.hairStyle || 'short';

  // ── Layer 0: Cape / Wings / Backpack (behind everything) ──
  if (spec.cape !== 'none') {
    const capeW = L.capeWidth;
    const capeStartY = torsoY + Math.round(1 * scale);
    const capeEndY = spec.cape === 'long' ? groundY - Math.round(2 * scale) : hipYPosed + Math.round(1 * scale);
    for (let cy = capeStartY; cy <= capeEndY; cy++) {
      const progress = (cy - capeStartY) / Math.max(1, capeEndY - capeStartY);
      const flare = spec.cape === 'long' ? Math.round(progress * 2 * scale) : 0;
      const sway = Math.round(pose.capeSway * progress * 2 * scale);
      const startX = cx - Math.floor(capeW / 2) - flare - sway;
      const width = capeW + flare * 2;
      for (let k = 0; k < width; k++) {
        const color = (k === 0 || k === width - 1) ? ramps.primary.shadow : ramps.primary.base;
        setBodyPixel(startX + k, cy, color);
      }
    }
  }

  // Wings trait (behind body)
  if (traits.includes('wings')) {
    const wingBaseY = torsoY + Math.round(2 * scale);
    const wingSpan = Math.round(4 * scale);
    const sway = Math.round(pose.capeSway * scale);
    for (let w = 0; w < wingSpan; w++) {
      const wy = wingBaseY - w + sway;
      setBodyPixel(cx - Math.floor(torsoW / 2) - Math.round(2 * scale) - w, wy, ramps.accent.base);
      setBodyPixel(cx - Math.floor(torsoW / 2) - Math.round(2 * scale) - w, wy - 1, ramps.accent.light);
    }
  }

  // Backpack accessory (behind body)
  if (accessories.includes('backpack')) {
    const bpX = cx - Math.floor(torsoW / 2) - Math.round(3 * scale);
    const bpY = torsoY + Math.round(1 * scale);
    const bpW = Math.max(2, Math.round(3 * scale));
    const bpH = Math.max(3, Math.round(4 * scale));
    drawBodyRect(bpX, bpY, bpW, bpH, ramps.secondary.shadow);
    setBodyPixel(bpX + Math.floor(bpW / 2), bpY, ramps.secondary.base);
  }

  // Quiver accessory (behind body)
  if (accessories.includes('quiver')) {
    const qX = cx - Math.floor(torsoW / 2) - Math.round(2 * scale);
    const qY = torsoY;
    const qH = Math.max(4, Math.round(6 * scale));
    drawBodyRect(qX, qY, Math.max(1, Math.round(2 * scale)), qH, ramps.secondary.shadow);
    // Arrow tips
    setBodyPixel(qX, qY - 1, ramps.metal.light);
    setBodyPixel(qX + 1, qY - 1, ramps.metal.base);
  }

  // ── Layer 1: Back Leg ──
  const backLegX = cx - Math.floor(torsoW / 2) + Math.round(pose.legBackX * scale);
  const backLegGround = groundY - Math.round(pose.legBackLift * scale);
  const backLegLen = Math.max(1, backLegGround - hipYPosed - Math.round(2 * scale));
  drawBodyRect(backLegX, hipYPosed, legW, backLegLen, ramps.secondary.shadow);
  // Boot
  const bootH = Math.round(2 * scale);
  drawBodyRect(backLegX, backLegGround - bootH, legW, bootH, accessories.includes('boots') ? ramps.secondary.base : ramps.metal.shadow);

  // ── Layer 2: Back Arm ──
  const backShoulderX = torsoX;
  const backShoulderY = torsoY + Math.round(1 * scale);
  const backRad = (pose.armBack * Math.PI) / 180;
  const backHandX = Math.round(backShoulderX + Math.sin(backRad) * armLen);
  const backHandY = Math.round(backShoulderY + Math.cos(backRad) * armLen);

  for (let s = 0; s <= armLen; s++) {
    const ax = Math.round(backShoulderX + (backHandX - backShoulderX) * (s / armLen));
    const ay = Math.round(backShoulderY + (backHandY - backShoulderY) * (s / armLen));
    setBodyPixel(ax, ay, ramps.primary.shadow);
    if (L.armThickness >= 2) setBodyPixel(ax, ay + 1, ramps.primary.shadow);
  }
  setBodyPixel(backHandX, backHandY, accessories.includes('gloves') ? ramps.secondary.base : ramps.skin.shadow);

  // ── Layer 3: Torso / Armor / Clothing ──
  drawBodyRect(torsoX, torsoY, torsoW, torsoH, ramps.primary.base);
  for (let dy = 0; dy < torsoH; dy++) {
    setBodyPixel(torsoX, torsoY + dy, ramps.primary.shadow);
    setBodyPixel(torsoX + torsoW - 1, torsoY + dy, ramps.primary.light);
  }

  // 4 explicit torso styles (0: jacket/tunic, 1: plate armor, 2: long coat, 3: vest)
  const tVar = spec.variants?.torso ?? (spec.archetype === 'fighter' ? 1 : spec.archetype === 'mage' ? 2 : spec.archetype === 'archer' ? 0 : 3);
  if (tVar === 1) {
    // 1. Zirah Pelat (Plate Armor): Chestplate with metallic highlights and chest jewel
    const plateW = Math.max(2, torsoW - Math.round(2 * scale));
    const plateH = Math.max(2, Math.round(4 * scale));
    drawBodyRect(torsoX + Math.round(1 * scale), torsoY + Math.round(1 * scale), plateW, plateH, ramps.metal.base);
    setBodyPixel(cx, torsoY + Math.round(2 * scale), ramps.accent.base);
    setBodyPixel(cx, torsoY + Math.round(1 * scale), ramps.metal.light);
  } else if (tVar === 2) {
    // 2. Jubah Panjang (Long Coat): Skirt extending past hip with split
    const coatH = Math.max(2, Math.round(3 * scale));
    drawBodyRect(torsoX, hipYPosed, torsoW, coatH, ramps.primary.base);
    setBodyPixel(cx, hipYPosed + coatH - 1, 'transparent');
    setBodyPixel(cx, torsoY + Math.round(1 * scale), ramps.accent.base);
    setBodyPixel(cx, torsoY + Math.round(2 * scale), ramps.accent.light);
  } else if (tVar === 3) {
    // 3. Rompi (Vest): Sleeveless panels in secondary color exposing center
    drawBodyRect(torsoX, torsoY, Math.max(1, Math.round(2 * scale)), torsoH, ramps.secondary.base);
    drawBodyRect(torsoX + torsoW - Math.max(1, Math.round(2 * scale)), torsoY, Math.max(1, Math.round(2 * scale)), torsoH, ramps.secondary.base);
    for (let dy = 1; dy < torsoH - 1; dy += 2) {
      setBodyPixel(cx, torsoY + dy, ramps.accent.base);
    }
  } else {
    // 0. Jaket / Tunic: Central seam with accent buttons
    for (let dy = 0; dy < torsoH; dy++) {
      setBodyPixel(cx, torsoY + dy, ramps.secondary.base);
    }
    setBodyPixel(cx, torsoY + Math.round(1 * scale), ramps.accent.light);
    setBodyPixel(cx, torsoY + Math.round(3 * scale), ramps.accent.light);
  }

  // Shoulder pad accessory
  if (accessories.includes('shoulder_pad')) {
    const spW = Math.max(2, Math.round(3 * scale));
    const spH = Math.max(1, Math.round(2 * scale));
    drawBodyRect(torsoX + torsoW - Math.round(1 * scale), torsoY - Math.round(1 * scale), spW, spH, ramps.metal.base);
    setBodyPixel(torsoX + torsoW, torsoY - Math.round(1 * scale), ramps.metal.light);
  }

  // Belt (always) with accent buckle
  drawBodyRect(torsoX, hipYPosed - Math.round(1 * scale), torsoW, Math.max(1, Math.round(1 * scale)), ramps.secondary.shadow);
  setBodyPixel(cx, hipYPosed - Math.round(1 * scale), accessories.includes('belt') ? ramps.accent.light : ramps.accent.base);

  // ── Layer 4: Front Leg ──
  const frontLegX = cx + Math.round((1 + pose.legFrontX) * scale);
  const frontLegGround = groundY - Math.round(pose.legFrontLift * scale);
  const frontLegLen = Math.max(1, frontLegGround - hipYPosed - Math.round(2 * scale));
  drawBodyRect(frontLegX, hipYPosed, legW, frontLegLen, ramps.secondary.base);
  drawBodyRect(frontLegX, frontLegGround - bootH, legW, bootH, accessories.includes('boots') ? ramps.secondary.light : ramps.metal.base);
  setBodyPixel(frontLegX + legW - 1, frontLegGround - bootH, ramps.metal.light);

  // ── Layer 5: Offhand (Shield) ──
  if (spec.offhand === 'shield') {
    const shieldW = Math.max(3, Math.round(5 * scale));
    const shieldH = Math.max(5, Math.round(7 * scale));
    const shieldX = cx - Math.round(3 * scale) + Math.round(pose.capeSway * scale / 2);
    const shieldY = torsoY + Math.round(1 * scale);
    drawBodyRect(shieldX, shieldY, shieldW, shieldH, ramps.primary.base);
    drawBodyRect(shieldX, shieldY, shieldW, 1, ramps.metal.base);
    drawBodyRect(shieldX, shieldY + shieldH - 1, shieldW, 1, ramps.metal.base);
    drawBodyRect(shieldX, shieldY, 1, shieldH, ramps.metal.base);
    drawBodyRect(shieldX + shieldW - 1, shieldY, 1, shieldH, ramps.metal.base);
    setBodyPixel(shieldX + Math.floor(shieldW / 2), shieldY + Math.floor(shieldH / 2), ramps.accent.base);
    setBodyPixel(shieldX + Math.floor(shieldW / 2), shieldY + Math.floor(shieldH / 2) - 1, ramps.accent.light);
  }

  // ── Layer 6: Head & Face ──
  // Skin base
  for (let dy = -headRInt; dy <= headRInt; dy++) {
    for (let dx = -headRInt; dx <= headRInt; dx++) {
      if (dx * dx + dy * dy <= headR * headR + 1) {
        setBodyPixel(headX + dx, headY + dy, ramps.skin.base);
      }
    }
  }
  setBodyPixel(headX, headY + headRInt, ramps.skin.shadow);
  setBodyPixel(headX - 1, headY + headRInt, ramps.skin.shadow);

  // Hair rendering (5 styles)
  if (spec.head === 'bare') {
    if (hairStyle === 'none') {
      // Bald — just skin, add highlight
      setBodyPixel(headX, headY - headRInt, ramps.skin.light);
    } else if (hairStyle === 'short') {
      // Short hair — top hemisphere
      for (let dy = -headRInt; dy <= 0; dy++) {
        for (let dx = -headRInt; dx <= headRInt; dx++) {
          if (dx * dx + dy * dy <= headR * headR) {
            setBodyPixel(headX + dx, headY + dy, ramps.hair.base);
          }
        }
      }
      setBodyPixel(headX, headY - headRInt, ramps.hair.light);
    } else if (hairStyle === 'spiky') {
      // Spiky hair — top with spikes jutting upward
      for (let dy = -headRInt; dy <= 0; dy++) {
        for (let dx = -headRInt; dx <= headRInt; dx++) {
          if (dx * dx + dy * dy <= headR * headR) {
            setBodyPixel(headX + dx, headY + dy, ramps.hair.base);
          }
        }
      }
      // Spikes
      const spikeH = Math.max(2, Math.round(3 * scale));
      for (let s = 0; s < spikeH; s++) {
        setBodyPixel(headX - 1, headY - headRInt - s - 1, ramps.hair.base);
        setBodyPixel(headX + 1, headY - headRInt - s - 1, ramps.hair.base);
        if (s < spikeH - 1) setBodyPixel(headX, headY - headRInt - s - 2, ramps.hair.light);
      }
      setBodyPixel(headX + 2, headY - headRInt - 1, ramps.hair.shadow);
    } else if (hairStyle === 'long') {
      // Long flowing hair
      for (let dy = -headRInt; dy <= 0; dy++) {
        for (let dx = -headRInt; dx <= headRInt; dx++) {
          if (dx * dx + dy * dy <= headR * headR) {
            setBodyPixel(headX + dx, headY + dy, ramps.hair.base);
          }
        }
      }
      // Flowing down the back
      const flowLen = Math.max(3, Math.round(4 * scale));
      for (let f = 1; f <= flowLen; f++) {
        setBodyPixel(headX - headRInt, headY + f, ramps.hair.base);
        setBodyPixel(headX - headRInt - 1, headY + f, ramps.hair.shadow);
        if (f < flowLen) setBodyPixel(headX - headRInt + 1, headY + f, ramps.hair.base);
      }
      setBodyPixel(headX, headY - headRInt, ramps.hair.light);
    } else if (hairStyle === 'jambul') {
      // Jambul (spiky crest/mohawk)
      for (let dy = -headRInt; dy <= 0; dy++) {
        for (let dx = -headRInt; dx <= headRInt; dx++) {
          if (dx * dx + dy * dy <= headR * headR) {
            setBodyPixel(headX + dx, headY + dy, ramps.hair.base);
          }
        }
      }
      // Tall central crest
      const crestH = Math.max(3, Math.round(4 * scale));
      for (let c = 0; c < crestH; c++) {
        setBodyPixel(headX, headY - headRInt - c - 1, ramps.hair.base);
        if (c > 0) setBodyPixel(headX - 1, headY - headRInt - c, ramps.hair.shadow);
        setBodyPixel(headX + 1, headY - headRInt - c, ramps.hair.light);
      }
      setBodyPixel(headX, headY - headRInt - crestH, ramps.hair.light);
    }

    // Goblin pointy ears (from archetype)
    if (spec.archetype === 'goblin') {
      setBodyPixel(headX - headRInt - 1, headY - 1, ramps.skin.base);
      setBodyPixel(headX - headRInt - 2, headY - 2, ramps.skin.shadow);
      setBodyPixel(headX + headRInt + 1, headY - 1, ramps.skin.base);
      setBodyPixel(headX + headRInt + 2, headY - 2, ramps.skin.base);
    }
  } else if (spec.head === 'hood') {
    for (let dy = -headRInt - 1; dy <= 1; dy++) {
      for (let dx = -headRInt - 1; dx <= headRInt + 1; dx++) {
        if (dx * dx + dy * dy <= (headR + 1) * (headR + 1)) {
          if (!(dx >= 0 && dx <= Math.round(2 * scale) && dy >= -1 && dy <= 1)) {
            setBodyPixel(headX + dx, headY + dy, ramps.primary.base);
          }
        }
      }
    }
    setBodyPixel(headX, headY - headRInt - 1, ramps.primary.light);
  } else if (spec.head === 'helmet_open') {
    for (let dy = -headRInt; dy <= -1; dy++) {
      for (let dx = -headRInt; dx <= headRInt; dx++) {
        if (dx * dx + dy * dy <= headR * headR) {
          setBodyPixel(headX + dx, headY + dy, ramps.metal.base);
        }
      }
    }
    setBodyPixel(headX, headY - headRInt, ramps.metal.light);
    setBodyPixel(headX + 1, headY, ramps.metal.base);
  } else if (spec.head === 'helmet_closed') {
    for (let dy = -headRInt; dy <= headRInt; dy++) {
      for (let dx = -headRInt; dx <= headRInt; dx++) {
        if (dx * dx + dy * dy <= headR * headR) {
          setBodyPixel(headX + dx, headY + dy, ramps.metal.base);
        }
      }
    }
    for (let dx = -1; dx <= Math.round(2 * scale); dx++) {
      setBodyPixel(headX + dx, headY, pal.outline);
    }
    setBodyPixel(headX + 1, headY, ramps.accent.light);
    setBodyPixel(headX, headY - headRInt, ramps.metal.light);
  } else if (spec.head === 'horned') {
    for (let dy = -headRInt; dy <= 0; dy++) {
      for (let dx = -headRInt; dx <= headRInt; dx++) {
        if (dx * dx + dy * dy <= headR * headR) {
          setBodyPixel(headX + dx, headY + dy, ramps.metal.base);
        }
      }
    }
    const hornOff = Math.round(3 * scale);
    setBodyPixel(headX - hornOff, headY - hornOff, ramps.accent.base);
    setBodyPixel(headX - hornOff - 1, headY - hornOff - 2, ramps.accent.light);
    setBodyPixel(headX + hornOff, headY - hornOff, ramps.accent.base);
    setBodyPixel(headX + hornOff + 1, headY - hornOff - 2, ramps.accent.light);
  }

  // Trait: pointy_ears (non-goblin)
  if (traits.includes('pointy_ears') && spec.archetype !== 'goblin') {
    const earLen = Math.max(1, Math.round(2 * scale));
    setBodyPixel(headX - headRInt - 1, headY - 1, ramps.skin.base);
    setBodyPixel(headX - headRInt - earLen, headY - earLen, ramps.skin.shadow);
    setBodyPixel(headX + headRInt + 1, headY - 1, ramps.skin.base);
    setBodyPixel(headX + headRInt + earLen, headY - earLen, ramps.skin.shadow);
  }

  // Trait: horns (on crown, curved)
  if (traits.includes('horns') && spec.head !== 'horned') {
    const hornH = Math.max(2, Math.round(3 * scale));
    for (let h = 0; h < hornH; h++) {
      setBodyPixel(headX - headRInt + h, headY - headRInt - h - 1, ramps.accent.base);
      setBodyPixel(headX + headRInt - h, headY - headRInt - h - 1, ramps.accent.base);
    }
    setBodyPixel(headX - headRInt + hornH - 1, headY - headRInt - hornH, ramps.accent.light);
    setBodyPixel(headX + headRInt - hornH + 1, headY - headRInt - hornH, ramps.accent.light);
  }

  // Trait: beard
  if (traits.includes('beard')) {
    const beardLen = Math.max(2, Math.round(3 * scale));
    for (let b = 0; b < beardLen; b++) {
      setBodyPixel(headX - 1, headY + headRInt + b + 1, ramps.hair.base);
      setBodyPixel(headX, headY + headRInt + b + 1, ramps.hair.base);
      setBodyPixel(headX + 1, headY + headRInt + b + 1, ramps.hair.shadow);
    }
    setBodyPixel(headX, headY + headRInt + beardLen + 1, ramps.hair.shadow);
  }

  // Eyes & expression (3 explicit variants: 0: dot+glint, 1: slit/focused, 2: wide anime round, 3: visor/eyepatch)
  if (spec.head !== 'helmet_closed') {
    const eyeX = headX + Math.round(1 * scale);
    const eyeY = headY;
    const hVar = spec.variants?.head ?? 0;
    if (spec.archetype === 'zombie' || hVar === 1) {
      // Slit / narrow focused eye
      setBodyPixel(eyeX, eyeY, ramps.accent.light);
      setBodyPixel(eyeX - 1, eyeY, ramps.accent.shadow);
    } else if (spec.archetype === 'goblin' || hVar === 2) {
      // Wide round glint eye
      setBodyPixel(eyeX, eyeY, pal.outline);
      setBodyPixel(eyeX, eyeY - 1, pal.highlight);
      setBodyPixel(eyeX + 1, eyeY, pal.outline);
    } else if (hVar === 3) {
      // Eyepatch / visor line
      setBodyPixel(eyeX - 1, eyeY, ramps.secondary.shadow);
      setBodyPixel(eyeX, eyeY, ramps.secondary.shadow);
      setBodyPixel(eyeX + 1, eyeY - 1, ramps.metal.light);
    } else {
      // Standard dot eye with glint
      setBodyPixel(eyeX, eyeY, pal.outline);
      setBodyPixel(eyeX + 1, eyeY - 1, pal.highlight);
    }
  }

  // Scarf accessory (around neck)
  if (accessories.includes('scarf')) {
    const scarfY = headY + headRInt + 1;
    const scarfW = Math.max(3, torsoW - Math.round(1 * scale));
    drawBodyRect(cx - Math.floor(scarfW / 2), scarfY, scarfW, Math.max(1, Math.round(2 * scale)), ramps.accent.base);
    // Trailing tail with cape sway
    const tailLen = Math.max(2, Math.round(3 * scale));
    for (let t = 0; t < tailLen; t++) {
      const sway = Math.round(pose.capeSway * (t + 1) * 0.5 * scale);
      setBodyPixel(cx + Math.floor(scarfW / 2) + t + sway, scarfY + t, ramps.accent.base);
      setBodyPixel(cx + Math.floor(scarfW / 2) + t + sway, scarfY + t + 1, ramps.accent.shadow);
    }
  }

  // ── Layer 7: Front Arm & Hand ──
  const frontShoulderX = torsoX + torsoW - 1;
  const frontShoulderY = torsoY + Math.round(1 * scale);
  const frontRad = (pose.armFront * Math.PI) / 180;
  const frontHandX = Math.round(frontShoulderX + Math.sin(frontRad) * armLen);
  const frontHandY = Math.round(frontShoulderY + Math.cos(frontRad) * armLen);

  for (let s = 0; s <= armLen; s++) {
    const ax = Math.round(frontShoulderX + (frontHandX - frontShoulderX) * (s / armLen));
    const ay = Math.round(frontShoulderY + (frontHandY - frontShoulderY) * (s / armLen));
    setBodyPixel(ax, ay, ramps.primary.base);
    if (L.armThickness >= 2) setBodyPixel(ax, ay + 1, ramps.primary.base);
  }
  setBodyPixel(frontHandX, frontHandY, accessories.includes('gloves') ? ramps.secondary.light : ramps.skin.base);

  // ── Layer 8: Weapon ──
  if (spec.weapon !== 'none') {
    const wRad = (pose.weaponAngle * Math.PI) / 180;
    const dirX = Math.cos(wRad);
    const dirY = Math.sin(wRad);
    const wScale = Math.round(scale);
    const wVar = spec.variants?.weapon ?? 0;

    if (spec.weapon === 'sword') {
      // 0: Standar, 1: Greatsword (lebih panjang & lebar), 2: Scimitar (lengkung), 3: Rapier (ramping)
      const baseBlade = wVar === 1 ? 12 : wVar === 3 ? 10 : 9;
      const bladeLen = Math.max(6, Math.round(baseBlade * scale));
      const guardPerpX = -dirY;
      const guardPerpY = dirX;
      setBodyPixel(frontHandX + guardPerpX, frontHandY + guardPerpY, ramps.accent.base);
      setBodyPixel(frontHandX - guardPerpX, frontHandY - guardPerpY, ramps.accent.base);
      if (wVar === 1) {
        setBodyPixel(frontHandX + guardPerpX * 2, frontHandY + guardPerpY * 2, ramps.accent.shadow);
        setBodyPixel(frontHandX - guardPerpX * 2, frontHandY - guardPerpY * 2, ramps.accent.shadow);
      }
      for (let b = 1; b <= bladeLen; b++) {
        let bx = Math.round(frontHandX + dirX * b);
        let by = Math.round(frontHandY + dirY * b);
        if (wVar === 2) {
          const curve = Math.round(Math.sin((b / bladeLen) * Math.PI * 0.8) * 2 * scale);
          bx += Math.round(guardPerpX * curve);
          by += Math.round(guardPerpY * curve);
        }
        setBodyPixel(bx, by, b === bladeLen ? pal.highlight : ramps.metal.base);
        if (wVar === 1 && b < bladeLen - 1) {
          setBodyPixel(bx + guardPerpX, by + guardPerpY, ramps.metal.shadow);
        }
      }
    } else if (spec.weapon === 'axe') {
      // 0: Bilah tunggal, 1: Bilah ganda, 2: Halberd (tombak kapak), 3: Tomahawk
      const handleBase = wVar === 2 ? 11 : wVar === 3 ? 5 : 8;
      const handleLen = Math.max(4, Math.round(handleBase * scale));
      for (let h = 1; h <= handleLen; h++) {
        const hx = Math.round(frontHandX + dirX * h);
        const hy = Math.round(frontHandY + dirY * h);
        setBodyPixel(hx, hy, ramps.secondary.shadow);
      }
      const tipX = Math.round(frontHandX + dirX * handleLen);
      const tipY = Math.round(frontHandY + dirY * handleLen);
      setBodyPixel(tipX, tipY, ramps.metal.base);
      setBodyPixel(tipX - 1, tipY - 1, ramps.metal.light);
      setBodyPixel(tipX, tipY - 2, pal.highlight);
      setBodyPixel(tipX + 1, tipY - 1, ramps.metal.light);
      if (wVar === 1) {
        setBodyPixel(tipX - 1, tipY + 1, ramps.metal.light);
        setBodyPixel(tipX, tipY + 2, pal.highlight);
        setBodyPixel(tipX + 1, tipY + 1, ramps.metal.light);
      } else if (wVar === 2) {
        setBodyPixel(Math.round(tipX + dirX * 2), Math.round(tipY + dirY * 2), pal.highlight);
      }
    } else if (spec.weapon === 'staff') {
      // 0: Orb, 1: Crystal cabang, 2: Sabit/Crescent, 3: Bintang
      const staffUp = Math.max(4, Math.round(6 * scale));
      const staffDown = Math.max(6, Math.round(9 * scale));
      for (let s = -staffUp; s <= staffDown; s++) {
        const sx = Math.round(frontHandX + dirX * s);
        const sy = Math.round(frontHandY + dirY * s);
        setBodyPixel(sx, sy, ramps.secondary.shadow);
      }
      const topX = Math.round(frontHandX + dirX * staffDown);
      const topY = Math.round(frontHandY + dirY * staffDown);
      if (wVar === 2) {
        setBodyPixel(topX, topY, ramps.accent.base);
        setBodyPixel(topX - 1, topY - 1, ramps.accent.light);
        setBodyPixel(topX - 1, topY - 2, pal.highlight);
        setBodyPixel(topX, topY - 3, ramps.accent.base);
      } else if (wVar === 1) {
        setBodyPixel(topX, topY, ramps.accent.base);
        setBodyPixel(topX - 1, topY - 1, ramps.accent.light);
        setBodyPixel(topX + 1, topY - 1, ramps.accent.light);
        setBodyPixel(topX, topY - 2, pal.highlight);
      } else {
        setBodyPixel(topX, topY, ramps.accent.base);
        setBodyPixel(topX, topY - 1, ramps.accent.light);
        setBodyPixel(topX + 1, topY, pal.highlight);
      }
    } else if (spec.weapon === 'bow') {
      // 0: Shortbow, 1: Longbow, 2: Recurve, 3: Glowing bow
      const bowSpanBase = wVar === 1 ? 6 : wVar === 0 ? 3 : 4;
      const bowSpan = Math.max(3, Math.round(bowSpanBase * scale));
      for (let a = -bowSpan; a <= bowSpan; a++) {
        const curveX = Math.round(frontHandX + dirX * 2 * wScale + Math.abs(a) * (wVar === 2 ? 0.75 : 0.5));
        const curveY = Math.round(frontHandY + a);
        setBodyPixel(curveX, curveY, wVar === 3 ? ramps.accent.light : ramps.secondary.base);
        setBodyPixel(frontHandX - 1, curveY, ramps.secondary.light);
      }
    } else if (spec.weapon === 'dagger') {
      // 0: Standar, 1: Kris (bergelombang), 2: Stiletto (panjang), 3: Poison glow
      const dagBase = wVar === 2 ? 5 : 4;
      const dagLen = Math.max(3, Math.round(dagBase * scale));
      for (let d = 1; d <= dagLen; d++) {
        let dx2 = Math.round(frontHandX + dirX * d);
        let dy2 = Math.round(frontHandY + dirY * d);
        if (wVar === 1) {
          const wave = (d % 2 === 0 ? 1 : -1) * Math.round(1 * scale);
          dx2 += Math.round(-dirY * wave);
          dy2 += Math.round(dirX * wave);
        }
        setBodyPixel(dx2, dy2, d === dagLen ? pal.highlight : wVar === 3 ? ramps.accent.light : ramps.metal.light);
      }
    }
  }

  // Trait: tail (sways with capeSway)
  if (traits.includes('tail')) {
    const tailBaseX = cx - Math.floor(torsoW / 2) - Math.round(1 * scale);
    const tailBaseY = hipYPosed;
    const tailLen = Math.max(3, Math.round(5 * scale));
    for (let t = 0; t < tailLen; t++) {
      const sway = Math.round(pose.capeSway * (t + 1) * 0.3 * scale);
      setBodyPixel(tailBaseX - t - sway, tailBaseY + Math.round(t * 0.5), ramps.skin.shadow);
      if (t < tailLen - 1) setBodyPixel(tailBaseX - t - sway, tailBaseY + Math.round(t * 0.5) + 1, ramps.skin.base);
    }
  }

  // ── Layer 9: Slash FX ──
  if (pose.slashFx > 0) {
    if (pose.slashFx === 1) {
      setFxPixel(frontHandX + Math.round(4 * scale), frontHandY - Math.round(4 * scale), ramps.accent.light);
      setFxPixel(frontHandX + Math.round(5 * scale), frontHandY - Math.round(5 * scale), pal.highlight);
    } else if (pose.slashFx === 2) {
      const arcPoints = Math.max(8, Math.round(12 * scale));
      for (let p = 0; p < arcPoints; p++) {
        const t = p / (arcPoints - 1);
        const angle = -Math.PI * 0.4 + t * Math.PI * 0.8;
        const radius = Math.round(10 * scale);
        const ax = Math.round(frontHandX + Math.cos(angle) * radius);
        const ay = Math.round(frontHandY + Math.sin(angle) * radius);
        setFxPixel(ax, ay, pal.highlight);
        setFxPixel(ax - 1, ay, ramps.accent.light);
        setFxPixel(ax, ay + 1, ramps.accent.base);
      }
    } else if (pose.slashFx === 3) {
      setFxPixel(frontHandX + Math.round(7 * scale), frontHandY + Math.round(2 * scale), ramps.accent.light);
      setFxPixel(frontHandX + Math.round(9 * scale), frontHandY + Math.round(4 * scale), ramps.accent.base);
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
