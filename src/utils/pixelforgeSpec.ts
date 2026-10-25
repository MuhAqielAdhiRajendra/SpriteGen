// pixelforgeSpec.ts
// Pipeline: prompt -> AI hanya mengisi CharacterSpec (enum terbatas) -> validasi + retry
//           -> kode menyusun frame dari spec + pose -> post-process -> validasi antar frame.

// ============================================================
// 1. ENUM & TIPE SPEC (AI hanya boleh memilih dari sini)
// ============================================================
export const ARCHETYPES = ['fighter', 'archer', 'mage', 'goblin', 'zombie', 'npc'] as const;
export const BODIES = ['slim', 'normal', 'heavy'] as const;
export const HEADS = ['bare', 'hood', 'helmet_open', 'helmet_closed', 'horned'] as const;
export const WEAPONS = ['sword', 'axe', 'staff', 'bow', 'dagger', 'none'] as const;
export const OFFHANDS = ['shield', 'none'] as const;
export const CAPES = ['none', 'short', 'long'] as const;
export const ANIMS = ['idle', 'walk', 'attack'] as const;

export type Archetype = (typeof ARCHETYPES)[number];
export type Anim = (typeof ANIMS)[number];
export type BodyType = (typeof BODIES)[number];
export type HeadType = (typeof HEADS)[number];
export type WeaponType = (typeof WEAPONS)[number];
export type OffhandType = (typeof OFFHANDS)[number];
export type CapeType = (typeof CAPES)[number];

export interface CharacterSpec {
  name: string;
  archetype: Archetype;
  body: BodyType;
  head: HeadType;
  weapon: WeaponType;
  offhand: OffhandType;
  cape: CapeType;
  palette: {
    skin: string;
    hair: string;
    primary: string;
    secondary: string;
    accent: string;
    metal: string;
  };
  animations: Anim[];
}

// JSON schema untuk structured output (Gemini responseSchema / response_format)
export const SPEC_JSON_SCHEMA = {
  type: 'object',
  required: ['name', 'archetype', 'body', 'head', 'weapon', 'offhand', 'cape', 'palette', 'animations'],
  properties: {
    name: { type: 'string' },
    archetype: { type: 'string', enum: [...ARCHETYPES] },
    body: { type: 'string', enum: [...BODIES] },
    head: { type: 'string', enum: [...HEADS] },
    weapon: { type: 'string', enum: [...WEAPONS] },
    offhand: { type: 'string', enum: [...OFFHANDS] },
    cape: { type: 'string', enum: [...CAPES] },
    palette: {
      type: 'object',
      required: ['skin', 'hair', 'primary', 'secondary', 'accent', 'metal'],
      properties: {
        skin: { type: 'string' },
        hair: { type: 'string' },
        primary: { type: 'string' },
        secondary: { type: 'string' },
        accent: { type: 'string' },
        metal: { type: 'string' },
      },
    },
    animations: { type: 'array', items: { type: 'string', enum: [...ANIMS] } },
  },
} as const;

// ============================================================
// 2. PROMPT UNTUK AI (pakai sebagai systemInstruction di /api/gemini/generate)
// ============================================================
export const SPRITE_SYSTEM_PROMPT = `
Kamu adalah ART DIRECTOR untuk generator sprite pixel art 2D side-view bergaya retro RPG cel-shaded.
Tugasmu BUKAN menggambar pixel. Tugasmu hanya memilih komponen karakter dan palet warna.
Kode di sisi game yang akan menggambar pixel dan animasinya, jadi jangan menulis koordinat atau angka pixel.

ATURAN OUTPUT
1. Balas HANYA dengan satu objek JSON valid sesuai schema. Tanpa markdown, tanpa penjelasan.
2. Semua field bertipe enum WAJIB memakai nilai persis dari daftar yang diizinkan. Jangan membuat nilai baru.
   - archetype: fighter | archer | mage | goblin | zombie | npc
   - body: slim | normal | heavy
   - head: bare | hood | helmet_open | helmet_closed | horned
   - weapon: sword | axe | staff | bow | dagger | none
   - offhand: shield | none
   - cape: none | short | long
   - animations: pilih dari idle | walk | attack (selalu sertakan ketiganya kecuali diminta lain)
3. Jika prompt user meminta sesuatu yang tidak ada di daftar (misal "tombak"), pilih padanan terdekat
   (tombak -> staff) dan tetap valid. Jangan menolak.

ATURAN PEMILIHAN
- Konsisten dengan archetype: fighter -> sword/axe + (sering) shield; archer -> bow, body slim;
  mage -> staff, hood/bare, cape; goblin -> dagger/none, body slim, kulit hijau; zombie -> weapon none/dagger, kulit pucat kehijauan.
- Siluet harus mudah dibaca di 32x32: jangan menumpuk terlalu banyak aksesori (maks 3 ciri menonjol).
- body "heavy" cocok dengan zirah tebal/shield, "slim" untuk archer/mage/goblin.

ATURAN PALET (semua format hex 6 digit, contoh #3b82f6)
- Tepat 6 warna: skin, hair, primary, secondary, accent, metal. JANGAN tentukan warna outline (diurus kode).
- primary = warna dominan pakaian/zirah; secondary = warna pendamping yang kontras sedang;
  accent = satu warna kecil mencolok (permata, sihir, sabuk); metal = abu/perak/emas untuk senjata & pelat.
- Jaga kontras: primary dan secondary harus beda luminans jelas. Hindari warna terlalu jenuh sekaligus (maks 1 warna neon).
- skin harus warna kulit/makhluk yang masuk akal, bukan sama dengan primary.

CONTOH
User: "ksatria zirah biru dengan pedang dan perisai, jubah merah pendek"
{"name":"Ksatria Biru","archetype":"fighter","body":"heavy","head":"helmet_closed","weapon":"sword","offhand":"shield","cape":"short","palette":{"skin":"#f2c9a0","hair":"#5b3a29","primary":"#3b6fd8","secondary":"#2a4a9c","accent":"#e5484d","metal":"#c9d1d9"},"animations":["idle","walk","attack"]}

User: "goblin hijau kecil bawa belati"
{"name":"Goblin","archetype":"goblin","body":"slim","head":"bare","weapon":"dagger","offhand":"none","cape":"none","palette":{"skin":"#6abf4b","hair":"#3a2f1f","primary":"#8b5e34","secondary":"#5a3d22","accent":"#f5c542","metal":"#aab4be"},"animations":["idle","walk","attack"]}
`.trim();

// Prompt opsional untuk kritik visual (kirim sprite sheet PNG ke model vision)
export const VISION_CRITIC_PROMPT = `
Ini sprite sheet pixel art: setiap baris adalah satu animasi, setiap kolom adalah satu frame.
Nilai dan balas HANYA JSON: {"sameCharacter":bool,"issues":[string],"fixes":[string]}.
Cek: (1) apakah karakter sama di semua frame (warna, proporsi, perlengkapan), (2) ada bagian terpotong/hilang,
(3) kaki menapak garis tanah yang sama, (4) pose walk/attack terbaca jelas, (5) outline utuh tanpa putus.
"fixes" harus berupa perubahan pada SPEC (enum/palet), bukan instruksi menggambar pixel.
`.trim();

// ============================================================
// 3. VALIDASI SPEC + RETRY
// ============================================================
const HEX = /^#[0-9a-fA-F]{6}$/;
const oneOf = <T extends readonly string[]>(list: T, v: unknown): v is T[number] =>
  typeof v === 'string' && (list as readonly string[]).includes(v as T[number]);

export function validateSpec(raw: unknown): { spec?: CharacterSpec; errors: string[] } {
  const errors: string[] = [];
  const r = raw as Record<string, any>;
  if (!r || typeof r !== 'object') return { errors: ['Output bukan objek JSON'] };

  if (!oneOf(ARCHETYPES, r.archetype)) errors.push(`archetype tidak valid: ${r.archetype}`);
  if (!oneOf(BODIES, r.body)) errors.push(`body tidak valid: ${r.body}`);
  if (!oneOf(HEADS, r.head)) errors.push(`head tidak valid: ${r.head}`);
  if (!oneOf(WEAPONS, r.weapon)) errors.push(`weapon tidak valid: ${r.weapon}`);
  if (!oneOf(OFFHANDS, r.offhand)) errors.push(`offhand tidak valid: ${r.offhand}`);
  if (!oneOf(CAPES, r.cape)) errors.push(`cape tidak valid: ${r.cape}`);
  for (const k of ['skin', 'hair', 'primary', 'secondary', 'accent', 'metal']) {
    if (!HEX.test(r.palette?.[k] ?? '')) errors.push(`palette.${k} bukan hex 6 digit: ${r.palette?.[k]}`);
  }
  if (!Array.isArray(r.animations) || r.animations.length === 0 || !r.animations.every((a: unknown) => oneOf(ANIMS, a))) {
    errors.push('animations harus array berisi idle/walk/attack');
  }
  if (r.palette && HEX.test(r.palette.primary ?? '') && HEX.test(r.palette.secondary ?? '')) {
    if (Math.abs(luminance(r.palette.primary) - luminance(r.palette.secondary)) < 0.06) {
      errors.push('primary dan secondary terlalu mirip luminansnya, beri kontras lebih jelas');
    }
  }
  if (errors.length) return { errors };
  return { spec: { ...r, name: String(r.name ?? 'Karakter').slice(0, 24) } as CharacterSpec, errors };
}

/** callModel: fungsi yang memanggil model dan mengembalikan teks JSON mentah. */
export async function generateSpecWithRetry(
  callModel: (systemPrompt: string, userPrompt: string) => Promise<string>,
  userPrompt: string,
  maxTry = 3,
): Promise<CharacterSpec> {
  let feedback = '';
  for (let i = 0; i < maxTry; i++) {
    const text = await callModel(SPRITE_SYSTEM_PROMPT, userPrompt + feedback);
    try {
      const json = JSON.parse(text.replace(/^```json|```$/g, '').trim());
      const { spec, errors } = validateSpec(json);
      if (spec) return spec;
      feedback = `\n\nPERBAIKI kesalahan berikut dari jawaban sebelumnya:\n- ${errors.join('\n- ')}`;
    } catch {
      feedback = '\n\nJawaban sebelumnya bukan JSON valid. Balas HANYA JSON.';
    }
  }
  return DEFAULT_SPEC; // fallback aman, jangan sampai pipeline gagal total
}

export const DEFAULT_SPEC: CharacterSpec = {
  name: 'Petualang',
  archetype: 'fighter',
  body: 'normal',
  head: 'bare',
  weapon: 'sword',
  offhand: 'none',
  cape: 'none',
  palette: {
    skin: '#f2c9a0',
    hair: '#5b3a29',
    primary: '#3b6fd8',
    secondary: '#2a4a9c',
    accent: '#e5484d',
    metal: '#c9d1d9',
  },
  animations: ['idle', 'walk', 'attack'],
};

// ============================================================
// 4. WARNA: ramp shading konsisten (shadow/base/light) + outline otomatis
// ============================================================
type RGB = [number, number, number];
const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));
export const hexToRgb = (hex: string): RGB => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as RGB;
export const rgbToHex = (c: RGB) =>
  '#' + c.map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
const mix = (a: RGB, b: RGB, t: number): RGB => [0, 1, 2].map((i) => a[i] + (b[i] - a[i]) * t) as RGB;

export function luminance(hex: string) {
  const [r, g, b] = hexToRgb(hex);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

export function makeRamp(hex: string) {
  const c = hexToRgb(hex);
  return {
    shadow: rgbToHex(mix(c, [30, 27, 75], 0.38)),   // bayangan condong ke biru-ungu
    base: hex,
    light: rgbToHex(mix(c, [255, 244, 214], 0.36)), // cahaya condong ke krem hangat
  };
}

export function buildPalette(spec: CharacterSpec) {
  const p = spec.palette;
  const ramps = {
    skin: makeRamp(p.skin),
    hair: makeRamp(p.hair),
    primary: makeRamp(p.primary),
    secondary: makeRamp(p.secondary),
    accent: makeRamp(p.accent),
    metal: makeRamp(p.metal),
  };
  const outline = rgbToHex(mix(hexToRgb(p.primary), [10, 10, 25], 0.82));
  return { ramps, outline, highlight: '#ffffff' };
}

// ============================================================
// 5. TABEL POSE (keyframe). Semua karakter memakai tabel yang sama.
//    Konvensi sudut (derajat): 0 = lurus ke bawah, + = ke depan (arah hadap), - = ke belakang.
//    weaponAngle: -90 = tegak ke atas, 0 = ke depan horizontal, +90 = ke bawah.
//    dy: + = turun. legLift: piksel kaki diangkat dari tanah.
// ============================================================
export interface Pose {
  bodyDy: number;
  headDx: number;
  headDy: number;
  armFront: number;
  armBack: number;
  legFrontX: number;
  legBackX: number;
  legFrontLift: number;
  legBackLift: number;
  weaponAngle: number;
  capeSway: number;
  slashFx: 0 | 1 | 2 | 3; // 0 = tanpa efek, 1-3 = fase busur tebasan
}

const P = (o: Partial<Pose>): Pose => ({
  bodyDy: 0,
  headDx: 0,
  headDy: 0,
  armFront: 10,
  armBack: -10,
  legFrontX: 1,
  legBackX: -1,
  legFrontLift: 0,
  legBackLift: 0,
  weaponAngle: -60,
  capeSway: 0,
  slashFx: 0,
  ...o,
});

export const POSES: Record<Anim, Pose[]> = {
  idle: [
    P({}),
    P({ bodyDy: 0, headDy: 0 }),
    P({ bodyDy: 1, headDy: 1, capeSway: 1 }),
    P({ bodyDy: 1, headDy: 1, capeSway: 1 }),
  ],
  walk: [ // contact, down, passing, contact(kebalikan), down, passing
    P({ legFrontX: 3, legBackX: -3, armFront: -25, armBack: 25, capeSway: 1 }),
    P({ bodyDy: 1, legFrontX: 2, legBackX: -2, armFront: -12, armBack: 12 }),
    P({ bodyDy: 0, legFrontX: 0, legBackX: 0, legBackLift: 2, armFront: 0, armBack: 0, capeSway: -1 }),
    P({ legFrontX: -3, legBackX: 3, armFront: 25, armBack: -25, capeSway: -1 }),
    P({ bodyDy: 1, legFrontX: -2, legBackX: 2, armFront: 12, armBack: -12 }),
    P({ bodyDy: 0, legFrontX: 0, legBackX: 0, legFrontLift: 2, armFront: 0, armBack: 0, capeSway: 1 }),
  ],
  attack: [ // antisipasi, wind-up, tebas 1, tebas 2 (puncak), follow-through, recover
    P({ bodyDy: 1, headDx: -1, armFront: -40, weaponAngle: -120, legFrontX: 2, legBackX: -3 }),
    P({ bodyDy: 1, headDx: -1, armFront: -70, weaponAngle: -150, legFrontX: 2, legBackX: -3 }),
    P({ bodyDy: 0, headDx: 1, armFront: 30, weaponAngle: -20, slashFx: 1, legFrontX: 4, legBackX: -2 }),
    P({ bodyDy: 0, headDx: 2, armFront: 70, weaponAngle: 40, slashFx: 2, legFrontX: 4, legBackX: -2, capeSway: 2 }),
    P({ bodyDy: 1, headDx: 1, armFront: 60, weaponAngle: 60, slashFx: 3, legFrontX: 3, legBackX: -2 }),
    P({ bodyDy: 0, armFront: 20, weaponAngle: -40, legFrontX: 1, legBackX: -1 }),
  ],
};

export const getPose = (anim: Anim, frame: number): Pose => POSES[anim][frame % POSES[anim].length];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => t * t * (3 - 2 * t);

/** Untuk membuat frame in-between (misal 6 -> 12 frame) tanpa menggambar ulang. */
export function tweenPose(a: Pose, b: Pose, t: number): Pose {
  const e = ease(t);
  const out = { ...a } as any;
  for (const k of Object.keys(a) as (keyof Pose)[]) {
    if (k === 'slashFx') out[k] = t < 0.5 ? a[k] : b[k];
    else out[k] = Math.round(lerp(a[k] as number, b[k] as number, e));
  }
  return out as Pose;
}

// ============================================================
// 6. UTILITAS GRID & POST-PROCESS
// ============================================================
export type Grid = string[][]; // 'transparent' atau '#rrggbb'
const T = 'transparent';
const opaque = (g: Grid, x: number, y: number) => !!g[y] && !!g[y][x] && g[y][x] !== T;

export const cloneGrid = (g: Grid): Grid => g.map((r) => [...r]);

/** Snap tiap pixel ke warna palet terdekat, supaya jumlah warna terkunci. */
export function quantizeToPalette(grid: Grid, palette: string[]): Grid {
  const rgbs = palette.map(hexToRgb);
  const cache = new Map<string, string>();
  return grid.map((row) =>
    row.map((c) => {
      if (c === T) return c;
      const hit = cache.get(c);
      if (hit) return hit;
      const [r, g, b] = hexToRgb(c);
      let best = 0;
      let bd = Infinity;
      rgbs.forEach(([pr, pg, pb], i) => {
        const d = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
        if (d < bd) {
          bd = d;
          best = i;
        }
      });
      cache.set(c, palette[best]);
      return palette[best];
    }),
  );
}

/** Hapus pixel yatim, TAPI lindungi warna tertentu (pupil, glint, percikan sihir). */
export function removeOrphans(grid: Grid, protect: Set<string> = new Set()): Grid {
  const size = grid.length;
  const out = cloneGrid(grid);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!opaque(grid, x, y) || protect.has(grid[y][x])) continue;
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if ((dx || dy) && opaque(grid, x + dx, y + dy)) n++;
        }
      }
      if (n === 0) out[y][x] = T;
    }
  }
  return out;
}

/** Outline 1px di sisi luar (4 arah). Jalankan SEKALI setelah semua layer digabung, tanpa layer FX. */
export function addOutline(grid: Grid, color: string): Grid {
  const size = grid.length;
  const out = cloneGrid(grid);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (opaque(grid, x, y)) continue;
      if (opaque(grid, x - 1, y) || opaque(grid, x + 1, y) || opaque(grid, x, y - 1) || opaque(grid, x, y + 1)) {
        out[y][x] = color;
      }
    }
  }
  return out;
}

/** Pastikan telapak kaki selalu di groundY (geser vertikal saja, lunge horizontal tetap terjaga). */
export function alignToGround(grid: Grid, groundY: number): Grid {
  const size = grid.length;
  let foot = -1;
  for (let y = size - 1; y >= 0 && foot < 0; y--) {
    if (grid[y].some((c) => c !== T)) foot = y;
  }
  if (foot < 0 || foot === groundY) return grid;
  const shift = groundY - foot;
  const out: Grid = Array.from({ length: size }, () => Array(size).fill(T));
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const ny = y + shift;
      if (ny >= 0 && ny < size) out[ny][x] = grid[y][x];
    }
  }
  return out;
}

/** Urutan resmi per frame. Layer FX (slash) ditempel SETELAH outline. */
export function postProcessFrame(body: Grid, fx: Grid | null, spec: CharacterSpec, groundY: number): Grid {
  const pal = buildPalette(spec);
  const colors = Object.values(pal.ramps)
    .flatMap((r) => [r.shadow, r.base, r.light])
    .concat(pal.outline, pal.highlight);
  let g = quantizeToPalette(body, colors);
  g = removeOrphans(g, new Set([pal.highlight]));
  g = alignToGround(g, groundY);
  g = addOutline(g, pal.outline);
  if (fx) {
    for (let y = 0; y < g.length; y++) {
      for (let x = 0; x < g.length; x++) {
        if (fx[y]?.[x] && fx[y][x] !== T) {
          g[y][x] = fx[y][x];
        }
      }
    }
  }
  return g;
}

/** Upscale nearest-neighbor: desain sekali di 32, hasil 64/128 tidak goyang. */
export function upscaleNearest(grid: Grid, factor: number): Grid {
  if (factor <= 1) return cloneGrid(grid);
  const size = grid.length;
  const targetSize = size * factor;
  const out: Grid = Array.from({ length: targetSize }, () => Array(targetSize).fill(T));
  for (let y = 0; y < targetSize; y++) {
    for (let x = 0; x < targetSize; x++) {
      out[y][x] = grid[Math.floor(y / factor)][Math.floor(x / factor)];
    }
  }
  return out;
}

// ============================================================
// 7. VALIDATOR ANTAR FRAME
// ============================================================
export function frameStats(g: Grid) {
  let count = 0;
  let sx = 0;
  let foot = -1;
  const colors = new Set<string>();
  g.forEach((row, y) =>
    row.forEach((c, x) => {
      if (c !== T) {
        count++;
        sx += x;
        foot = Math.max(foot, y);
        colors.add(c);
      }
    }),
  );
  return { count, cx: count ? sx / count : 0, footY: foot, colors: colors.size };
}

const median = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];

export function validateSequence(
  frames: Grid[],
  size: number,
  opts = { maxColors: 16, maxCountDelta: 0.35, maxFootDrift: 1, maxCenterDrift: 0.12 },
): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!frames.length) return { ok: false, errors: ['Rangkaian frame kosong'] };

  const stats = frames.map(frameStats);
  const mCount = median(stats.map((s) => s.count));
  const mFoot = median(stats.map((s) => s.footY));
  const mCx = median(stats.map((s) => s.cx));

  stats.forEach((s, i) => {
    if (frames[i].length !== size || frames[i].some((r) => r.length !== size)) {
      errors.push(`Frame ${i}: ukuran bukan ${size}x${size}`);
    }
    if (s.count === 0) {
      errors.push(`Frame ${i}: kosong`);
    }
    if (mCount > 0 && Math.abs(s.count - mCount) / Math.max(mCount, 1) > opts.maxCountDelta) {
      errors.push(`Frame ${i}: jumlah pixel melonjak (${s.count} vs median ${mCount})`);
    }
    if (mFoot >= 0 && Math.abs(s.footY - mFoot) > opts.maxFootDrift) {
      errors.push(`Frame ${i}: kaki tidak di garis tanah (${s.footY} vs ${mFoot})`);
    }
    if (Math.abs(s.cx - mCx) > size * opts.maxCenterDrift) {
      errors.push(`Frame ${i}: pusat massa bergeser terlalu jauh`);
    }
    if (s.colors > opts.maxColors) {
      errors.push(`Frame ${i}: ${s.colors} warna (maks ${opts.maxColors})`);
    }
  });

  return { ok: errors.length === 0, errors };
}
