import {
  CharacterDirection,
  SpriteEvaluation,
  SpriteResolution,
  AnimationType,
  ColorGradingMode,
  SpriteFrame
} from '../types/sprite';

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
 * Detects whether the user explicitly requested animations in their prompt or options
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
 * Analyzes visual prompt for semantic attributes
 */
export function analyzePromptSemantics(prompt: string) {
  const p = prompt.toLowerCase();
  
  const hasHeavyArmor = p.includes('armor') || p.includes('zirah') || p.includes('besi') || p.includes('plate') || p.includes('perak') || p.includes('knight');
  const hasRobeOrCoat = p.includes('jubah') || p.includes('robe') || p.includes('coat') || p.includes('mantel') || p.includes('penyihir') || p.includes('tudung');
  const hasCyberSuit = p.includes('cyber') || p.includes('neon') || p.includes('sci-fi') || p.includes('robot') || p.includes('mecha') || p.includes('futuristik');

  const hasCape = p.includes('cape') || p.includes('jubah belakang') || p.includes('cloak') || hasRobeOrCoat;
  const hasShield = p.includes('shield') || p.includes('tameng') || p.includes('perisai');
  const hasSword = p.includes('pedang') || p.includes('blade') || p.includes('katana') || p.includes('sword') || p.includes('claymore') || p.includes('belati');
  const hasStaff = p.includes('tongkat') || p.includes('staff') || p.includes('wand') || p.includes('kristal');
  const hasBow = p.includes('panah') || p.includes('busur') || p.includes('bow');
  const hasGun = p.includes('pistol') || p.includes('senapan') || p.includes('blaster') || p.includes('meriam') || p.includes('gun');
  
  const hasGlowingEyes = p.includes('glow') || p.includes('bersinar') || p.includes('laser') || p.includes('menyala') || hasCyberSuit;
  const hasHatOrHelmet = p.includes('helmet') || p.includes('helm') || p.includes('hat') || p.includes('topi') || p.includes('tudung') || p.includes('hood') || hasHeavyArmor;
  const hasWings = p.includes('wing') || p.includes('sayap') || p.includes('angel') || p.includes('demon');

  let primaryTone = 'blue';
  if (p.includes('merah') || p.includes('red') || p.includes('crimson') || p.includes('ruby')) primaryTone = 'red';
  else if (p.includes('hijau') || p.includes('green') || p.includes('emerald') || p.includes('forest')) primaryTone = 'green';
  else if (p.includes('kuning') || p.includes('yellow') || p.includes('gold') || p.includes('emas')) primaryTone = 'gold';
  else if (p.includes('ungu') || p.includes('purple') || p.includes('violet') || p.includes('magenta')) primaryTone = 'purple';
  else if (p.includes('hitam') || p.includes('black') || p.includes('dark') || p.includes('obsidian')) primaryTone = 'dark';
  else if (p.includes('putih') || p.includes('white') || p.includes('silver') || p.includes('perak')) primaryTone = 'silver';
  else if (p.includes('cyan') || p.includes('biru muda') || p.includes('teal') || p.includes('aqua')) primaryTone = 'cyan';

  return {
    hasHeavyArmor,
    hasRobeOrCoat,
    hasCyberSuit,
    hasCape,
    hasShield,
    hasSword,
    hasStaff,
    hasBow,
    hasGun,
    hasGlowingEyes,
    hasHatOrHelmet,
    hasWings,
    primaryTone
  };
}

/**
 * Color Kit for cel pixel drawing
 */
interface ColorKit {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  outlineColor: string;
  highlightColor: string;
  skinTone: string;
}

function resolveColorKit(pal: string[], primaryTone: string): ColorKit {
  const outlineColor = pal[0];
  const midTone = pal[Math.floor(pal.length / 2)] || '#38bdf8';
  const lightTone = pal[Math.min(pal.length - 2, 7)] || '#fef08a';
  const highlightColor = pal[pal.length - 1] || '#ffffff';
  const skinTone = pal[13] || '#fed7aa';

  let primaryColor = midTone;
  let secondaryColor = lightTone;
  let accentColor = highlightColor;

  if (primaryTone === 'red') {
    primaryColor = pal[4] || '#f43f5e';
    secondaryColor = pal[5] || '#fb7185';
  } else if (primaryTone === 'gold') {
    primaryColor = pal[6] || '#fbbf24';
    secondaryColor = pal[7] || '#fef08a';
  } else if (primaryTone === 'green') {
    primaryColor = pal[10] || '#059669';
    secondaryColor = pal[11] || '#34d399';
  } else if (primaryTone === 'purple') {
    primaryColor = pal[12] || '#7c3aed';
    secondaryColor = pal[13] || '#c084fc';
  } else if (primaryTone === 'cyan') {
    primaryColor = pal[8] || '#0284c7';
    secondaryColor = pal[9] || '#38bdf8';
  } else if (primaryTone === 'silver') {
    primaryColor = pal[3] || '#475569';
    secondaryColor = pal[14] || '#f8fafc';
  } else if (primaryTone === 'dark') {
    primaryColor = pal[1] || '#1e293b';
    secondaryColor = pal[2] || '#334155';
  }

  return { primaryColor, secondaryColor, accentColor, outlineColor, highlightColor, skinTone };
}

/**
 * Draws a complete, standalone CEL FRAME of pixel art onto a blank grid.
 * NOTE: Strict compliance with Rule #3:
 * - NO CSS transforms, NO bone rotations, NO tweening.
 * - Every cel is drawn with discrete pixel coordinates corresponding to its unique posture!
 */
export function drawCharacterCel(
  size: number,
  colors: ColorKit,
  analysis: ReturnType<typeof analyzePromptSemantics>,
  pose: {
    type: 'idle' | 'walk' | 'attack' | 'hurt';
    step: number;
  }
): string[][] {
  const grid = createEmptyGrid(size);
  const scale = size / 32;
  const cx = Math.floor(size / 2);

  const setPixel = (x: number, y: number, color: string) => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    if (iy >= 0 && iy < size && ix >= 0 && ix < size) {
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

  // Base anatomical proportions
  const headRadius = Math.round(4.5 * scale);
  let headCenterY = Math.round(9 * scale);
  let torsoHeight = Math.round(9 * scale);
  let torsoWidth = Math.round(11 * scale);
  let torsoXOffset = 0;
  let torsoYOffset = 0;

  // Modulate pose anatomy depending on the exact animation step (cel)
  let legLeftOffset = 0;
  let legRightOffset = 0;
  let legLeftLift = 0;
  let legRightLift = 0;
  let armLeftAngle = 0;
  let armRightAngle = 0;
  let slashArc = false;
  let impactFlash = false;

  if (pose.type === 'walk') {
    if (pose.step === 0) {
      // Step 0: Contact Pose - Left foot forward, right foot trailing back
      legLeftOffset = -Math.round(3.5 * scale);
      legRightOffset = Math.round(3.5 * scale);
      armLeftAngle = Math.round(2 * scale);
      armRightAngle = -Math.round(2 * scale);
    } else if (pose.step === 1) {
      // Step 1: Passing Pose - Left leg planted straight, right leg bent passing, body rises 1px
      torsoYOffset = -Math.round(1 * scale);
      legLeftOffset = 0;
      legRightOffset = Math.round(1 * scale);
      legRightLift = Math.round(2 * scale); // Right foot lifted off ground
      armLeftAngle = 0;
      armRightAngle = 0;
    } else if (pose.step === 2) {
      // Step 2: Contact Pose - Right foot forward, left foot trailing back
      legLeftOffset = Math.round(3.5 * scale);
      legRightOffset = -Math.round(3.5 * scale);
      armLeftAngle = -Math.round(2 * scale);
      armRightAngle = Math.round(2 * scale);
    } else if (pose.step === 3) {
      // Step 3: Passing Pose - Right leg planted straight, left leg bent passing, body rises 1px
      torsoYOffset = -Math.round(1 * scale);
      legLeftOffset = -Math.round(1 * scale);
      legLeftLift = Math.round(2 * scale); // Left foot lifted off ground
      legRightOffset = 0;
      armLeftAngle = 0;
      armRightAngle = 0;
    }
  } else if (pose.type === 'attack') {
    if (pose.step === 0) {
      // Step 0: Anticipation / Wind-up - Crouched low, weapon pulled back behind shoulder
      torsoYOffset = Math.round(1 * scale);
      torsoXOffset = -Math.round(2 * scale);
      armRightAngle = -Math.round(4 * scale); // Weapon pulled back
      legLeftOffset = -Math.round(2 * scale);
      legRightOffset = Math.round(2 * scale);
    } else if (pose.step === 1) {
      // Step 1: Strike / Slash - Full forward lunge, wide glowing blade arc
      torsoXOffset = Math.round(3 * scale);
      armRightAngle = Math.round(4 * scale); // Weapon extended forward
      slashArc = true;
      legLeftOffset = -Math.round(4 * scale);
      legRightOffset = Math.round(4 * scale);
    } else if (pose.step === 2) {
      // Step 2: Follow-through / Recovery - Blade lowered, stance settling
      torsoXOffset = Math.round(1 * scale);
      armRightAngle = Math.round(1 * scale);
      legLeftOffset = -Math.round(2 * scale);
      legRightOffset = Math.round(2 * scale);
    }
  } else if (pose.type === 'hurt') {
    if (pose.step === 0) {
      // Step 0: Impact - Recoiling backwards, flash tint
      torsoXOffset = -Math.round(3 * scale);
      torsoYOffset = -Math.round(1 * scale);
      armLeftAngle = -Math.round(3 * scale);
      armRightAngle = Math.round(3 * scale);
      impactFlash = true;
    } else if (pose.step === 1) {
      // Step 1: Stagger recovery - Low crouch
      torsoXOffset = -Math.round(1 * scale);
      torsoYOffset = Math.round(1 * scale);
      legLeftOffset = -Math.round(3 * scale);
      legRightOffset = Math.round(2 * scale);
    }
  } else if (pose.type === 'idle') {
    if (pose.step === 1) {
      // Breathing inhale: chest rises 1px
      torsoYOffset = -Math.round(1 * scale);
    }
  }

  headCenterY += torsoYOffset;
  const neckY = headCenterY + headRadius;
  const hipY = neckY + torsoHeight;
  const groundY = Math.min(size - Math.round(2 * scale), hipY + Math.round(8 * scale));

  const bodyPrimary = impactFlash ? (colors.accentColor) : colors.primaryColor;
  const bodySecondary = impactFlash ? '#ffffff' : colors.secondaryColor;

  // 1. Cloak / Cape (Drawn behind torso)
  if (analysis.hasCape) {
    const capeW = Math.round(14 * scale);
    const capeH = groundY - neckY;
    for (let cy = 0; cy < capeH; cy++) {
      const spread = Math.round((cy / capeH) * 3 * scale);
      // Cape flares slightly based on movement
      const capeSway = -torsoXOffset;
      drawRect(cx + torsoXOffset + capeSway - Math.floor(capeW / 2) - spread, neckY + cy, capeW + spread * 2, 1, colors.primaryColor);
    }
  }

  // 2. Wings (if detected)
  if (analysis.hasWings) {
    const wingW = Math.round(8 * scale);
    const wingH = Math.round(10 * scale);
    for (let i = 0; i < wingW; i++) {
      const h = Math.round((wingH * (i + 1)) / wingW);
      setPixel(cx + torsoXOffset - Math.round(8 * scale) - i, neckY + i - h / 2, colors.accentColor);
      setPixel(cx + torsoXOffset + Math.round(8 * scale) + i, neckY + i - h / 2, colors.accentColor);
    }
  }

  // 3. Legs and Feet (Drawn per cel position)
  const legW = Math.max(2, Math.round(3 * scale));
  const legGap = Math.max(1, Math.round(2 * scale));
  const bootH = Math.round(3 * scale);

  // Left leg
  const leftLegX = cx + torsoXOffset - legGap - legW + legLeftOffset;
  const leftLegGround = groundY - legLeftLift;
  drawRect(leftLegX, hipY, legW, Math.max(1, leftLegGround - hipY), bodyPrimary);
  drawRect(leftLegX - Math.round(1 * scale), leftLegGround - bootH, legW + Math.round(1 * scale), bootH, colors.outlineColor);

  // Right leg
  const rightLegX = cx + torsoXOffset + legGap + legRightOffset;
  const rightLegGround = groundY - legRightLift;
  drawRect(rightLegX, hipY, legW, Math.max(1, rightLegGround - hipY), bodyPrimary);
  drawRect(rightLegX, rightLegGround - bootH, legW + Math.round(1 * scale), bootH, colors.outlineColor);

  // 4. Torso / Armor / Clothing
  drawRect(cx + torsoXOffset - Math.floor(torsoWidth / 2), neckY, torsoWidth, torsoHeight, bodyPrimary);
  // Chestplate / Robe Detail
  const chestW = Math.round(torsoWidth * 0.65);
  const chestH = Math.round(torsoHeight * 0.6);
  drawRect(cx + torsoXOffset - Math.floor(chestW / 2), neckY + Math.round(1 * scale), chestW, chestH, bodySecondary);
  // Belt
  const beltY = hipY - Math.round(2 * scale);
  drawRect(cx + torsoXOffset - Math.floor(torsoWidth / 2), beltY, torsoWidth, Math.max(1, Math.round(1.5 * scale)), colors.outlineColor);
  setPixel(cx + torsoXOffset, beltY, colors.accentColor);

  // 5. Arms and Hands (Cel-drawn angles)
  const armW = Math.max(2, Math.round(2.5 * scale));
  const armH = Math.round(7 * scale);

  // Left arm
  const armLY = neckY + Math.round(1 * scale);
  const armLX = cx + torsoXOffset - Math.floor(torsoWidth / 2) - armW;
  drawRect(armLX, armLY + armLeftAngle, armW, armH, bodyPrimary);
  drawRect(armLX, armLY + armLeftAngle + armH, armW, Math.round(2 * scale), bodySecondary); // Left hand

  // Right arm (Weapon hand)
  const armRY = neckY + Math.round(1 * scale);
  const armRX = cx + torsoXOffset + Math.floor(torsoWidth / 2);
  drawRect(armRX, armRY + armRightAngle, armW, armH, bodyPrimary);
  drawRect(armRX, armRY + armRightAngle + armH, armW, Math.round(2 * scale), bodySecondary); // Right hand

  // 6. Weapons & Equipment
  const weaponHandX = armRX + Math.floor(armW / 2);
  const weaponHandY = armRY + armRightAngle + armH;

  if (analysis.hasSword || (!analysis.hasStaff && !analysis.hasBow && !analysis.hasGun)) {
    // Sword blade
    const swordBladeH = Math.round(12 * scale);
    if (pose.type === 'attack' && pose.step === 1) {
      // Horizontal thrust/slash angle
      drawRect(weaponHandX, weaponHandY - Math.round(2 * scale), swordBladeH, Math.max(1, Math.round(1.5 * scale)), colors.highlightColor);
      drawRect(weaponHandX - Math.round(1 * scale), weaponHandY - Math.round(4 * scale), Math.max(1, Math.round(1.5 * scale)), Math.round(5 * scale), colors.outlineColor);
    } else {
      // Vertical blade
      drawRect(weaponHandX, weaponHandY - swordBladeH, Math.max(1, Math.round(1.5 * scale)), swordBladeH, colors.secondaryColor);
      setPixel(weaponHandX, weaponHandY - swordBladeH - 1, colors.highlightColor);
      drawRect(weaponHandX - Math.round(1 * scale), weaponHandY - Math.round(3 * scale), Math.round(3 * scale), Math.max(1, Math.round(1 * scale)), colors.outlineColor);
    }
  }

  // Draw bright sword slash arc in cel frame
  if (slashArc) {
    const slashW = Math.round(10 * scale);
    for (let a = 0; a < slashW; a++) {
      const arcX = cx + torsoXOffset + Math.round(6 * scale) + a;
      const arcY = neckY - Math.round(3 * scale) + Math.round(Math.sin((a / slashW) * Math.PI) * 5 * scale);
      if (arcX >= 0 && arcX < size && arcY >= 0 && arcY < size) {
        setPixel(arcX, arcY, colors.highlightColor);
        setPixel(arcX, arcY + 1, colors.accentColor);
      }
    }
  }

  if (analysis.hasShield) {
    const shieldW = Math.round(5 * scale);
    const shieldH = Math.round(9 * scale);
    drawRect(armLX - shieldW + Math.round(1 * scale), armLY + armLeftAngle, shieldW, shieldH, bodyPrimary);
    drawRect(armLX - shieldW + Math.round(2 * scale), armLY + armLeftAngle + Math.round(1 * scale), shieldW - Math.round(2 * scale), shieldH - Math.round(2 * scale), colors.accentColor);
  } else if (analysis.hasStaff) {
    const staffH = Math.round(16 * scale);
    drawRect(armLX - Math.round(1 * scale), armLY - Math.round(6 * scale), Math.max(1, Math.round(1 * scale)), staffH, bodyPrimary);
    const orbRadius = Math.max(2, Math.round(2.5 * scale));
    drawRect(armLX - Math.floor(orbRadius / 2), armLY - Math.round(8 * scale), orbRadius, orbRadius, colors.accentColor);
    setPixel(armLX, armLY - Math.round(8 * scale), colors.highlightColor);
  }

  // 7. Head & Face
  for (let dy = -headRadius; dy <= headRadius; dy++) {
    for (let dx = -headRadius; dx <= headRadius; dx++) {
      if (dx * dx + dy * dy <= headRadius * headRadius) {
        setPixel(cx + torsoXOffset + dx, headCenterY + dy, bodySecondary);
      }
    }
  }

  // Helmet / Hair
  if (analysis.hasHatOrHelmet || analysis.hasHeavyArmor) {
    for (let dy = -headRadius; dy <= 0; dy++) {
      for (let dx = -headRadius; dx <= headRadius; dx++) {
        if (dx * dx + dy * dy <= headRadius * headRadius) {
          setPixel(cx + torsoXOffset + dx, headCenterY + dy, bodyPrimary);
        }
      }
    }
    const visorY = headCenterY + Math.round(1 * scale);
    const visorW = Math.round(headRadius * 1.4);
    drawRect(cx + torsoXOffset - Math.floor(visorW / 2), visorY, visorW, Math.max(1, Math.round(2 * scale)), colors.outlineColor);
    if (analysis.hasGlowingEyes) {
      drawRect(cx + torsoXOffset - Math.round(2 * scale), visorY, Math.round(4 * scale), 1, colors.accentColor);
    }
  } else {
    for (let dy = -headRadius; dy <= -Math.round(1 * scale); dy++) {
      for (let dx = -headRadius; dx <= headRadius; dx++) {
        if (dx * dx + dy * dy <= headRadius * headRadius) {
          setPixel(cx + torsoXOffset + dx, headCenterY + dy, bodyPrimary);
        }
      }
    }
    // Eyes
    const eyeY = headCenterY + Math.round(1 * scale);
    const eyeSpacing = Math.max(1, Math.round(2 * scale));
    setPixel(cx + torsoXOffset - eyeSpacing, eyeY, colors.outlineColor);
    setPixel(cx + torsoXOffset + eyeSpacing, eyeY, colors.outlineColor);
    if (scale >= 2) {
      setPixel(cx + torsoXOffset - eyeSpacing, eyeY - 1, colors.highlightColor);
      setPixel(cx + torsoXOffset + eyeSpacing, eyeY - 1, colors.highlightColor);
    }
  }

  // 8. Crisp Cel-Shaded Outline (No Ground Shadow)
  const outlineGrid = JSON.parse(JSON.stringify(grid)) as string[][];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (grid[y][x] !== 'transparent') {
        const neighbors = [
          [x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]
        ];
        for (const [nx, ny] of neighbors) {
          if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
            if (grid[ny][nx] === 'transparent' && outlineGrid[ny][nx] === 'transparent') {
              if (y < groundY + 1) {
                outlineGrid[ny][nx] = colors.outlineColor;
              }
            }
          }
        }
      }
    }
  }

  return outlineGrid;
}

/**
 * Procedural Pixel Art Generator that scales accurately for 32x32, 64x64, 128x128.
 * Produces discrete Cel Frames without ground shadow.
 */
export function generateProceduralCharacter(params: {
  prompt: string;
  resolution: SpriteResolution;
  paletteKey?: string;
  colorGrading?: ColorGradingMode;
  direction?: CharacterDirection;
  requestedAnimations?: AnimationType[];
}): {
  pixels: string[][];
  palette: string[];
  frames: SpriteFrame[];
  animations: Record<string, SpriteFrame[]>;
  features: string[];
  isAnimated: boolean;
  detectedAnimations: AnimationType[];
} {
  const {
    prompt,
    resolution,
    paletteKey = 'vibrant_rpg',
    colorGrading = 'vibrant',
    direction = 'front',
    requestedAnimations: explicitAnimations
  } = params;

  const paletteObj = PALETTES[paletteKey] || PALETTES.vibrant_rpg;
  const rawPal = paletteObj.colors;
  const pal = applyColorGrading(rawPal, colorGrading);
  const size = resolution;

  const analysis = analyzePromptSemantics(prompt);
  const detectedAnimations = detectRequestedAnimations(prompt, explicitAnimations);
  const isAnimated = detectedAnimations.length > 0;
  const colors = resolveColorKit(pal, analysis.primaryTone);

  // Generate Base Standing Frame (Frame 1)
  const basePixels = drawCharacterCel(size, colors, analysis, { type: 'idle', step: 0 });

  const detectedFeatures: string[] = [
    `Arah: ${direction}`,
    `Nuansa Warna: ${analysis.primaryTone.toUpperCase()}`,
    isAnimated ? `Animasi Frame-by-Frame: [${detectedAnimations.join(', ')}]` : 'Mode Karakter Statis (1 Frame Cel)'
  ];

  if (analysis.hasHeavyArmor) detectedFeatures.push('Zirah Logam');
  if (analysis.hasRobeOrCoat) detectedFeatures.push('Jubah / Mantel');
  if (analysis.hasCape) detectedFeatures.push('Jubah Belakang');
  if (analysis.hasShield) detectedFeatures.push('Perisai');
  if (analysis.hasSword) detectedFeatures.push('Pedang');
  if (analysis.hasStaff) detectedFeatures.push('Tongkat Sihir');
  if (analysis.hasBow) detectedFeatures.push('Busur Panah');
  if (analysis.hasWings) detectedFeatures.push('Sayap');

  // Build Cel Animations (Frame-by-Frame independent pixel matrices)
  const animations: Record<string, SpriteFrame[]> = {
    idle: [
      { id: 'idle-0', name: 'Idle 1 (Pose Dasar)', pixels: basePixels }
    ]
  };

  // If user requested 'idle' animation, add breathing frames
  if (detectedAnimations.includes('idle')) {
    const idleStep1 = drawCharacterCel(size, colors, analysis, { type: 'idle', step: 1 });
    const idleStep2 = drawCharacterCel(size, colors, analysis, { type: 'idle', step: 0 });
    animations.idle = [
      { id: 'idle-0', name: 'Idle 1 (Napas)', pixels: basePixels },
      { id: 'idle-1', name: 'Idle 2 (Dada Naik)', pixels: idleStep1 },
      { id: 'idle-2', name: 'Idle 3 (Settle)', pixels: idleStep2 }
    ];
  }

  // If user requested 'walk', synthesize 4 distinct cel frames
  if (detectedAnimations.includes('walk')) {
    animations.walk = [
      { id: 'walk-0', name: 'Walk 1 (Kaki Kiri Depan)', pixels: drawCharacterCel(size, colors, analysis, { type: 'walk', step: 0 }) },
      { id: 'walk-1', name: 'Walk 2 (Passing - Kaki Naik)', pixels: drawCharacterCel(size, colors, analysis, { type: 'walk', step: 1 }) },
      { id: 'walk-2', name: 'Walk 3 (Kaki Kanan Depan)', pixels: drawCharacterCel(size, colors, analysis, { type: 'walk', step: 2 }) },
      { id: 'walk-3', name: 'Walk 4 (Passing - Kaki Naik)', pixels: drawCharacterCel(size, colors, analysis, { type: 'walk', step: 3 }) }
    ];
  }

  // If user requested 'attack', synthesize 3 distinct cel frames
  if (detectedAnimations.includes('attack')) {
    animations.attack = [
      { id: 'attack-0', name: 'Attack 1 (Persiapan / Wind-up)', pixels: drawCharacterCel(size, colors, analysis, { type: 'attack', step: 0 }) },
      { id: 'attack-1', name: 'Attack 2 (Tebasan Penuh)', pixels: drawCharacterCel(size, colors, analysis, { type: 'attack', step: 1 }) },
      { id: 'attack-2', name: 'Attack 3 (Follow-through)', pixels: drawCharacterCel(size, colors, analysis, { type: 'attack', step: 2 }) }
    ];
  }

  // If user requested 'hurt', synthesize 2 distinct cel frames
  if (detectedAnimations.includes('hurt')) {
    animations.hurt = [
      { id: 'hurt-0', name: 'Hurt 1 (Impact / Terhentak)', pixels: drawCharacterCel(size, colors, analysis, { type: 'hurt', step: 0 }) },
      { id: 'hurt-1', name: 'Hurt 2 (Stagger Recovery)', pixels: drawCharacterCel(size, colors, analysis, { type: 'hurt', step: 1 }) }
    ];
  }

  // Determine active frame sequence
  const activeKey = detectedAnimations[0] || 'idle';
  const activeFrames = animations[activeKey] || animations.idle;

  return {
    pixels: basePixels,
    palette: pal,
    frames: activeFrames,
    animations,
    features: detectedFeatures,
    isAnimated,
    detectedAnimations
  };
}

/**
 * Synthesizes a new frame-by-frame animation sequence on demand
 */
export function synthesizeAnimationSequence(
  animType: AnimationType,
  resolution: SpriteResolution,
  palette: string[],
  prompt: string
): SpriteFrame[] {
  const size = resolution;
  const analysis = analyzePromptSemantics(prompt);
  const colors = resolveColorKit(palette, analysis.primaryTone);

  if (animType === 'walk') {
    return [
      { id: `walk-0-${Date.now()}`, name: 'Walk 1 (Kaki Kiri Depan)', pixels: drawCharacterCel(size, colors, analysis, { type: 'walk', step: 0 }) },
      { id: `walk-1-${Date.now()}`, name: 'Walk 2 (Passing Naik)', pixels: drawCharacterCel(size, colors, analysis, { type: 'walk', step: 1 }) },
      { id: `walk-2-${Date.now()}`, name: 'Walk 3 (Kaki Kanan Depan)', pixels: drawCharacterCel(size, colors, analysis, { type: 'walk', step: 2 }) },
      { id: `walk-3-${Date.now()}`, name: 'Walk 4 (Passing Naik)', pixels: drawCharacterCel(size, colors, analysis, { type: 'walk', step: 3 }) }
    ];
  } else if (animType === 'attack') {
    return [
      { id: `attack-0-${Date.now()}`, name: 'Attack 1 (Wind-up)', pixels: drawCharacterCel(size, colors, analysis, { type: 'attack', step: 0 }) },
      { id: `attack-1-${Date.now()}`, name: 'Attack 2 (Tebasan Penuh)', pixels: drawCharacterCel(size, colors, analysis, { type: 'attack', step: 1 }) },
      { id: `attack-2-${Date.now()}`, name: 'Attack 3 (Follow-through)', pixels: drawCharacterCel(size, colors, analysis, { type: 'attack', step: 2 }) }
    ];
  } else if (animType === 'hurt') {
    return [
      { id: `hurt-0-${Date.now()}`, name: 'Hurt 1 (Impact)', pixels: drawCharacterCel(size, colors, analysis, { type: 'hurt', step: 0 }) },
      { id: `hurt-1-${Date.now()}`, name: 'Hurt 2 (Stagger)', pixels: drawCharacterCel(size, colors, analysis, { type: 'hurt', step: 1 }) }
    ];
  } else {
    // Idle
    return [
      { id: `idle-0-${Date.now()}`, name: 'Idle 1 (Napas Dasar)', pixels: drawCharacterCel(size, colors, analysis, { type: 'idle', step: 0 }) },
      { id: `idle-1-${Date.now()}`, name: 'Idle 2 (Dada Naik)', pixels: drawCharacterCel(size, colors, analysis, { type: 'idle', step: 1 }) },
      { id: `idle-2-${Date.now()}`, name: 'Idle 3 (Settle)', pixels: drawCharacterCel(size, colors, analysis, { type: 'idle', step: 0 }) }
    ];
  }
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
  if (distinctColors >= 4 && distinctColors <= 12) {
    paletteHarmonyScore += 10;
  } else if (distinctColors < 3) {
    paletteHarmonyScore -= 20;
  }

  let adherenceScore = 90;
  const missingFeatures: string[] = [];
  const pLower = prompt.toLowerCase();

  if (pLower.includes('shield') && !detectedFeatures.some(f => f.includes('Perisai') || f.includes('Shield'))) {
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
  suggestedFixes.push('Animasi berbasis frame-by-frame sejati tanpa rigging/translasi terprogram');

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
 * Applies AI automated refinement pass to enhance contrast and remove stray pixels
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
