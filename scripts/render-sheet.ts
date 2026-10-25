import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {
  drawCharacterCelFromSpec,
  postProcessFrame,
  POSES,
  CharacterSpec,
  DEFAULT_SPEC,
  hexToRgba,
} from '../src/utils/pixelEngine.ts';

// 8 Diverse Character Specs
const SPECS: CharacterSpec[] = [
  {
    ...DEFAULT_SPEC,
    name: '1. KSATRIA HEAVY',
    archetype: 'fighter',
    body: 'heavy',
    proportions: { height: 'tall', headSize: 'small', torsoWidth: 3, legLength: 'long', armThickness: 2 },
    head: 'helmet_closed',
    weapon: 'sword',
    offhand: 'shield',
    cape: 'short',
    hairStyle: 'none',
    variants: { hair: 0, head: 0, torso: 1, weapon: 1 },
    traits: ['none'],
    accessories: ['shoulder_pad', 'belt', 'boots'],
    palette: {
      skin: '#fed7aa',
      hair: '#475569',
      primary: '#1e3a8a',
      secondary: '#1e293b',
      accent: '#f59e0b',
      metal: '#cbd5e1',
    },
  },
  {
    ...DEFAULT_SPEC,
    name: '2. GOBLIN ROGUE',
    archetype: 'goblin',
    body: 'slim',
    proportions: { height: 'short', headSize: 'big', torsoWidth: 1, legLength: 'short', armThickness: 1 },
    head: 'bare',
    weapon: 'dagger',
    offhand: 'none',
    cape: 'none',
    hairStyle: 'short',
    variants: { hair: 1, head: 2, torso: 3, weapon: 1 },
    traits: ['pointy_ears'],
    accessories: ['belt'],
    palette: {
      skin: '#4ade80',
      hair: '#14532d',
      primary: '#78350f',
      secondary: '#451a03',
      accent: '#ef4444',
      metal: '#94a3b8',
    },
  },
  {
    ...DEFAULT_SPEC,
    name: '3. PENYIHIR AGUNG',
    archetype: 'mage',
    body: 'slim',
    proportions: { height: 'tall', headSize: 'normal', torsoWidth: 1, legLength: 'long', armThickness: 1 },
    head: 'hood',
    weapon: 'staff',
    offhand: 'none',
    cape: 'long',
    hairStyle: 'none',
    variants: { hair: 0, head: 0, torso: 2, weapon: 0 },
    traits: ['none'],
    accessories: [],
    palette: {
      skin: '#ffedd5',
      hair: '#64748b',
      primary: '#581c87',
      secondary: '#3b0764',
      accent: '#38bdf8',
      metal: '#e2e8f0',
    },
  },
  {
    ...DEFAULT_SPEC,
    name: '4. PEMANAH ELF',
    archetype: 'archer',
    body: 'slim',
    proportions: { height: 'normal', headSize: 'normal', torsoWidth: 1, legLength: 'normal', armThickness: 1 },
    head: 'bare',
    weapon: 'bow',
    offhand: 'none',
    cape: 'none',
    hairStyle: 'long',
    variants: { hair: 2, head: 0, torso: 0, weapon: 2 },
    traits: ['pointy_ears'],
    accessories: ['quiver', 'boots'],
    palette: {
      skin: '#fef08a',
      hair: '#ca8a04',
      primary: '#15803d',
      secondary: '#166534',
      accent: '#fbbf24',
      metal: '#94a3b8',
    },
  },
  {
    ...DEFAULT_SPEC,
    name: '5. ZOMBIE BUNGKUK',
    archetype: 'zombie',
    body: 'normal',
    proportions: { height: 'short', headSize: 'normal', torsoWidth: 2, legLength: 'short', armThickness: 1 },
    head: 'bare',
    weapon: 'none',
    offhand: 'none',
    cape: 'none',
    hairStyle: 'short',
    variants: { hair: 0, head: 1, torso: 3, weapon: 0 },
    traits: ['hunch'],
    accessories: [],
    palette: {
      skin: '#86efac',
      hair: '#334155',
      primary: '#475569',
      secondary: '#1e293b',
      accent: '#dc2626',
      metal: '#64748b',
    },
  },
  {
    ...DEFAULT_SPEC,
    name: '6. HERO JAMBUL',
    archetype: 'fighter',
    body: 'normal',
    proportions: { height: 'normal', headSize: 'normal', torsoWidth: 2, legLength: 'normal', armThickness: 1 },
    head: 'bare',
    weapon: 'sword',
    offhand: 'none',
    cape: 'none',
    hairStyle: 'jambul',
    variants: { hair: 3, head: 0, torso: 0, weapon: 0 },
    traits: ['none'],
    accessories: ['scarf', 'belt', 'boots'],
    palette: {
      skin: '#fed7aa',
      hair: '#ea580c',
      primary: '#dc2626',
      secondary: '#991b1b',
      accent: '#facc15',
      metal: '#f1f5f9',
    },
  },
  {
    ...DEFAULT_SPEC,
    name: '7. NINJA SAYAP',
    archetype: 'fighter',
    body: 'slim',
    proportions: { height: 'normal', headSize: 'small', torsoWidth: 1, legLength: 'long', armThickness: 1 },
    head: 'hood',
    weapon: 'dagger',
    offhand: 'none',
    cape: 'none',
    hairStyle: 'none',
    variants: { hair: 0, head: 3, torso: 3, weapon: 1 },
    traits: ['wings'],
    accessories: ['scarf', 'gloves', 'boots'],
    palette: {
      skin: '#cbd5e1',
      hair: '#0f172a',
      primary: '#09090b',
      secondary: '#27272a',
      accent: '#a855f7',
      metal: '#e4e4e7',
    },
  },
  {
    ...DEFAULT_SPEC,
    name: '8. KURCACI JENGGOT',
    archetype: 'fighter',
    body: 'heavy',
    proportions: { height: 'short', headSize: 'normal', torsoWidth: 3, legLength: 'short', armThickness: 2 },
    head: 'helmet_open',
    weapon: 'axe',
    offhand: 'shield',
    cape: 'short',
    hairStyle: 'none',
    variants: { hair: 0, head: 0, torso: 1, weapon: 1 },
    traits: ['beard'],
    accessories: ['belt', 'boots'],
    palette: {
      skin: '#fed7aa',
      hair: '#b45309',
      primary: '#b91c1c',
      secondary: '#7f1d1d',
      accent: '#fbbf24',
      metal: '#f59e0b',
    },
  },
];

// Simple 3x5 Pixel Font for Clean Labels
const FONT: Record<string, number[]> = {
  ' ': [0, 0, 0, 0, 0],
  '.': [0, 0, 0, 0, 2],
  ':': [0, 2, 0, 2, 0],
  '-': [0, 0, 7, 0, 0],
  '0': [7, 5, 5, 5, 7],
  '1': [2, 6, 2, 2, 7],
  '2': [7, 1, 7, 4, 7],
  '3': [7, 1, 3, 1, 7],
  '4': [5, 5, 7, 1, 1],
  '5': [7, 4, 7, 1, 7],
  '6': [7, 4, 7, 5, 7],
  '7': [7, 1, 2, 2, 2],
  '8': [7, 5, 7, 5, 7],
  '9': [7, 5, 7, 1, 7],
  'A': [2, 5, 7, 5, 5],
  'B': [6, 5, 6, 5, 6],
  'C': [7, 4, 4, 4, 7],
  'D': [6, 5, 5, 5, 6],
  'E': [7, 4, 7, 4, 7],
  'F': [7, 4, 6, 4, 4],
  'G': [7, 4, 5, 5, 7],
  'H': [5, 5, 7, 5, 5],
  'I': [7, 2, 2, 2, 7],
  'J': [1, 1, 1, 5, 2],
  'K': [5, 5, 6, 5, 5],
  'L': [4, 4, 4, 4, 7],
  'M': [5, 7, 5, 5, 5],
  'N': [5, 7, 7, 5, 5],
  'O': [7, 5, 5, 5, 7],
  'P': [7, 5, 7, 4, 4],
  'Q': [7, 5, 5, 7, 3],
  'R': [6, 5, 6, 5, 5],
  'S': [3, 4, 2, 1, 6],
  'T': [7, 2, 2, 2, 2],
  'U': [5, 5, 5, 5, 7],
  'V': [5, 5, 5, 5, 2],
  'W': [5, 5, 5, 7, 5],
  'X': [5, 5, 2, 5, 5],
  'Y': [5, 5, 2, 2, 2],
  'Z': [7, 1, 2, 4, 7],
};

function drawText(
  grid: number[][][],
  text: string,
  startX: number,
  startY: number,
  color: [number, number, number, number]
) {
  let cx = startX;
  const upper = text.toUpperCase();
  for (let i = 0; i < upper.length; i++) {
    const ch = upper[i];
    const glyph = FONT[ch] || FONT[' '];
    for (let row = 0; row < 5; row++) {
      const bits = glyph[row];
      for (let col = 0; col < 3; col++) {
        if ((bits & (4 >> col)) !== 0) {
          const px = cx + col;
          const py = startY + row;
          if (py >= 0 && py < grid.length && px >= 0 && px < grid[0].length) {
            grid[py][px] = [...color];
          }
        }
      }
    }
    cx += 4; // 3 width + 1 spacing
  }
}

// Generate PNG binary using CRC32 and Zlib
function createPngBuffer(width: number, height: number, rgbaData: Uint8Array): Buffer {
  const crcTable: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : (c >>> 1);
    }
    crcTable[n] = c;
  }

  function crc32(buf: Buffer): number {
    let crc = -1;
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
    }
    return (crc ^ (-1)) >>> 0;
  }

  function makeChunk(type: string, data: Buffer): Buffer {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(typeAndData), 0);
    return Buffer.concat([len, typeAndData, crc]);
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const ihdrChunk = makeChunk('IHDR', ihdr);

  // Scanlines with filter 0 (None)
  const scanlineLength = width * 4;
  const filtered = Buffer.alloc(height * (scanlineLength + 1));
  for (let y = 0; y < height; y++) {
    filtered[y * (scanlineLength + 1)] = 0; // filter None
    const rowStart = y * scanlineLength;
    for (let x = 0; x < scanlineLength; x++) {
      filtered[y * (scanlineLength + 1) + 1 + x] = rgbaData[rowStart + x];
    }
  }

  const compressed = zlib.deflateSync(filtered, { level: 9 });
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

async function renderDiversitySheet() {
  console.log('Generating Diversity Sprite Sheet for 8 Characters...');

  const spriteSize = 32;
  const numCharacters = SPECS.length;
  // Animations: Idle (2 frames), Walk (4 frames), Attack (4 frames) = 10 frames per row
  const framesPerChar = 10;
  const headerHeight = 24;
  const labelColWidth = 90;
  const colSpacing = 4;
  const rowSpacing = 8;
  const padding = 12;

  const totalWidth = padding * 2 + labelColWidth + framesPerChar * (spriteSize + colSpacing);
  const totalHeight = padding * 2 + headerHeight + numCharacters * (spriteSize + rowSpacing);

  // Canvas buffer: [y][x] = [r, g, b, a]
  const canvas: number[][][] = [];
  for (let y = 0; y < totalHeight; y++) {
    const row: number[][] = [];
    for (let x = 0; x < totalWidth; x++) {
      // Dark slate background: #090d16
      row.push([9, 13, 22, 255]);
    }
    canvas.push(row);
  }

  // Draw Header
  drawText(canvas, 'PIXELFORGE DIVERSITY SPRITESHEET (8 SPECS X IDLE/WALK/ATTACK)', padding, padding + 2, [56, 189, 248, 255]);
  drawText(canvas, 'IDLE (2F)', padding + labelColWidth, padding + 14, [203, 213, 225, 255]);
  drawText(canvas, 'WALK (4F)', padding + labelColWidth + 2 * (spriteSize + colSpacing), padding + 14, [203, 213, 225, 255]);
  drawText(canvas, 'ATTACK (4F)', padding + labelColWidth + 6 * (spriteSize + colSpacing), padding + 14, [203, 213, 225, 255]);

  // Render each character row
  for (let r = 0; r < numCharacters; r++) {
    const spec = SPECS[r];
    const rowY = padding + headerHeight + r * (spriteSize + rowSpacing);

    // Character Label
    drawText(canvas, spec.name, padding, rowY + 12, [251, 191, 36, 255]);

    // Frame sequence: 2 idle, 4 walk, 4 attack
    const poses = [
      ...POSES.idle.slice(0, 2),
      ...POSES.walk.slice(0, 4),
      ...POSES.attack.slice(0, 4),
    ];

    for (let f = 0; f < poses.length; f++) {
      const pose = poses[f];
      const { body, fx } = drawCharacterCelFromSpec(spec, pose, spriteSize);
      const postProcessed = postProcessFrame(body, fx, spec, 30);
      const frameX = padding + labelColWidth + f * (spriteSize + colSpacing);

      // Frame background tile
      for (let py = 0; py < spriteSize; py++) {
        for (let px = 0; px < spriteSize; px++) {
          const cy = rowY + py;
          const cx = frameX + px;
          // Checkerboard tile for sprite box
          const isCheck = ((Math.floor(px / 4) + Math.floor(py / 4)) % 2) === 0;
          canvas[cy][cx] = isCheck ? [19, 27, 44, 255] : [15, 23, 42, 255];
        }
      }

      // Blit sprite pixels
      for (let py = 0; py < spriteSize; py++) {
        for (let px = 0; px < spriteSize; px++) {
          const hex = postProcessed[py][px];
          if (hex !== 'transparent') {
            const { r: cr, g: cg, b: cb, a: ca } = hexToRgba(hex);
            const cy = rowY + py;
            const cx = frameX + px;
            canvas[cy][cx] = [cr, cg, cb, Math.round(ca * 255)];
          }
        }
      }
    }
  }

  // Convert to flat Uint8Array
  const flat = new Uint8Array(totalWidth * totalHeight * 4);
  let idx = 0;
  for (let y = 0; y < totalHeight; y++) {
    for (let x = 0; x < totalWidth; x++) {
      const [r, g, b, a] = canvas[y][x];
      flat[idx++] = r;
      flat[idx++] = g;
      flat[idx++] = b;
      flat[idx++] = a;
    }
  }

  const outDir = path.resolve(process.cwd(), 'out');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const pngBuffer = createPngBuffer(totalWidth, totalHeight, flat);
  const outPath = path.join(outDir, 'diversity-sheet.png');
  fs.writeFileSync(outPath, pngBuffer);

  console.log(`Successfully generated ${outPath} (${totalWidth}x${totalHeight}px, ${pngBuffer.length} bytes)`);
}

renderDiversitySheet().catch(err => {
  console.error('Failed to render diversity sheet:', err);
  process.exit(1);
});
