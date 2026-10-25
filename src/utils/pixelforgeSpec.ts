// pixelforgeSpec.ts
// Pipeline: prompt (+ referensi gambar) -> AI Art Director mengisi CharacterSpec lengkap
//           -> validasi + diversity guard -> kode merender frame berbasis layout -> post-process.

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

// New modular slot enums for silhouette diversity
export const HEIGHTS = ['short', 'normal', 'tall'] as const;
export const HEAD_SIZES = ['small', 'normal', 'big'] as const;
export const LEG_LENGTHS = ['short', 'normal', 'long'] as const;
export const TRAITS = ['horns', 'pointy_ears', 'tail', 'hunch', 'wings', 'beard', 'none'] as const;
export const ACCESSORIES = ['scarf', 'belt', 'gloves', 'boots', 'shoulder_pad', 'backpack', 'quiver'] as const;
export const HAIR_STYLES = ['none', 'short', 'spiky', 'long'] as const;

export type Archetype = (typeof ARCHETYPES)[number];
export type Anim = (typeof ANIMS)[number];
export type BodyType = (typeof BODIES)[number];
export type HeadType = (typeof HEADS)[number];
export type WeaponType = (typeof WEAPONS)[number];
export type OffhandType = (typeof OFFHANDS)[number];
export type CapeType = (typeof CAPES)[number];

export type HeightType = (typeof HEIGHTS)[number];
export type HeadSizeType = (typeof HEAD_SIZES)[number];
export type LegLengthType = (typeof LEG_LENGTHS)[number];
export type CharacterTrait = (typeof TRAITS)[number];
export type CharacterAccessory = (typeof ACCESSORIES)[number];
export type HairStyle = (typeof HAIR_STYLES)[number];

export interface CharacterProportions {
  height: HeightType;
  headSize: HeadSizeType;
  torsoWidth: 1 | 2 | 3;
  legLength: LegLengthType;
  armThickness: 1 | 2;
}

export interface CharacterVariants {
  hair: number;   // 0..4
  head: number;   // 0..3
  torso: number;  // 0..3
  weapon: number; // 0..3
}

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
  // Optional modular diversity fields
  proportions?: CharacterProportions;
  variants?: CharacterVariants;
  traits?: CharacterTrait[];
  accessories?: CharacterAccessory[];
  hairStyle?: HairStyle;
}

export const DEFAULT_PROPORTIONS: CharacterProportions = {
  height: 'normal',
  headSize: 'normal',
  torsoWidth: 2,
  legLength: 'normal',
  armThickness: 1,
};

export const DEFAULT_VARIANTS: CharacterVariants = {
  hair: 0,
  head: 0,
  torso: 0,
  weapon: 0,
};

// JSON schema untuk structured output CharacterSpec (Gemini responseSchema)
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
    proportions: {
      type: 'object',
      properties: {
        height: { type: 'string', enum: [...HEIGHTS] },
        headSize: { type: 'string', enum: [...HEAD_SIZES] },
        torsoWidth: { type: 'integer', enum: [1, 2, 3] },
        legLength: { type: 'string', enum: [...LEG_LENGTHS] },
        armThickness: { type: 'integer', enum: [1, 2] },
      },
    },
    variants: {
      type: 'object',
      properties: {
        hair: { type: 'integer', minimum: 0, maximum: 4 },
        head: { type: 'integer', minimum: 0, maximum: 3 },
        torso: { type: 'integer', minimum: 0, maximum: 3 },
        weapon: { type: 'integer', minimum: 0, maximum: 3 },
      },
    },
    traits: {
      type: 'array',
      items: { type: 'string', enum: [...TRAITS] },
    },
    accessories: {
      type: 'array',
      items: { type: 'string', enum: [...ACCESSORIES] },
    },
    hairStyle: {
      type: 'string',
      enum: [...HAIR_STYLES],
    },
  },
} as const;

// Schema untuk Analisis Gambar Referensi (Langkah A)
export const REFERENCE_ANALYSIS_SCHEMA = {
  type: 'object',
  required: [
    'headToBodyRatio',
    'bodyBuild',
    'height',
    'headSize',
    'hairStyle',
    'hairColor',
    'skinColor',
    'outfitColors',
    'accessories',
    'weaponType',
    'traits',
    'styleNotes',
  ],
  properties: {
    headToBodyRatio: { type: 'number', description: 'Rasio tinggi kepala terhadap tinggi total karakter (misal 0.22 - 0.38)' },
    bodyBuild: { type: 'string', enum: ['slim', 'normal', 'heavy'] },
    height: { type: 'string', enum: ['short', 'normal', 'tall'] },
    headSize: { type: 'string', enum: ['small', 'normal', 'big'] },
    hairStyle: { type: 'string', enum: ['none', 'short', 'spiky', 'long', 'hood', 'helmet'] },
    hairColor: { type: 'string', description: 'Warna rambut heksadesimal 6 digit (#RRGGBB)' },
    skinColor: { type: 'string', description: 'Warna kulit heksadesimal 6 digit (#RRGGBB)' },
    outfitColors: {
      type: 'object',
      required: ['primary', 'secondary', 'accent', 'metal'],
      properties: {
        primary: { type: 'string' },
        secondary: { type: 'string' },
        accent: { type: 'string' },
        metal: { type: 'string' },
      },
    },
    accessories: {
      type: 'array',
      items: { type: 'string', enum: ['scarf', 'belt', 'cape', 'gloves', 'boots', 'shoulder_pad', 'backpack', 'quiver'] },
    },
    weaponType: { type: 'string', enum: ['sword', 'axe', 'staff', 'bow', 'dagger', 'none'] },
    traits: {
      type: 'array',
      items: { type: 'string', enum: ['horns', 'pointy_ears', 'tail', 'hunch', 'wings', 'beard', 'none'] },
    },
    styleNotes: { type: 'string', description: 'Catatan singkat ciri visual khusus' },
  },
} as const;

export const REFERENCE_ANALYSIS_PROMPT = `
Kamu adalah MASTER ART DIRECTOR pixel art.
Tugasmu adalah menganalisis gambar referensi karakter/sprite pixel art yang diberikan secara presisi dan objektif.
Ekstrak siluet proporsi fisik, gaya rambut, warna pakaian, aksesori dominan, jenis senjata, dan ciri khas visual (traits).
Balas HANYA objek JSON sesuai responseSchema.
Aturan:
- Semua warna dalam format hex 6 digit (#RRGGBB).
- headToBodyRatio adalah desimal (misal 0.32 untuk kepala besar/chibi, 0.22 untuk ksatria jangkung).
- styleNotes berisi ringkasan singkat dalam 1-2 kalimat bahasa Indonesia mengenai ciri khas siluet karakter ini.
`.trim();

// ============================================================
// 2. PROMPT UNTUK AI (pakai sebagai systemInstruction di /api/gemini/generate)
// ============================================================
export const SPRITE_SYSTEM_PROMPT = `
Kamu adalah ART DIRECTOR SENIOR untuk generator sprite pixel art 2D side-view bergaya retro RPG cel-shaded.
Tugasmu BUKAN menggambar pixel. Tugasmu hanya memilih komponen karakter, proporsi anatomis, varian visual, aksesori, dan palet warna.
Kode render di sisi game yang akan menggambar pixel dan animasinya, jadi jangan menulis koordinat atau angka pixel acak.

ATURAN OUTPUT
1. Balas HANYA dengan satu objek JSON valid sesuai schema CharacterSpec. Tanpa markdown, tanpa penjelasan teks.
2. Semua field bertipe enum WAJIB memakai nilai persis dari daftar yang diizinkan:
   - archetype: fighter | archer | mage | goblin | zombie | npc
   - body: slim | normal | heavy
   - head: bare | hood | helmet_open | helmet_closed | horned
   - weapon: sword | axe | staff | bow | dagger | none
   - offhand: shield | none
   - cape: none | short | long
   - hairStyle: none | short | spiky | long
   - proportions:
     * height: short | normal | tall
     * headSize: small | normal | big
     * torsoWidth: 1 | 2 | 3
     * legLength: short | normal | long
     * armThickness: 1 | 2
   - variants: hair (0..4), head (0..3), torso (0..3), weapon (0..3)
   - traits: horns | pointy_ears | tail | hunch | wings | beard | none (maks 2)
   - accessories: scarf | belt | gloves | boots | shoulder_pad | backpack | quiver (maks 3)
   - animations: selalu sertakan ["idle", "walk", "attack"] kecuali diminta lain

ATURAN REFERENSI vs PROMPT
- REFERENSI GAMBAR = ACUAN BENTUK, PROPORSI, CIRI KHAS AKSESORI, DAN GAYA VISUAL.
- PROMPT PENGGUNA = ACUAN ISI CERITA & REVISI SPESIFIK.
- Jika ada pertentangan (misal: referensi berbaju hijau tapi prompt minta jubah hitam, atau referensi bawa pedang tapi prompt minta panah), MAKA PERINTAH PROMPT PENGGUNA MENANG dan menggantikan bagian tersebut.

ATURAN PALET (semua format hex 6 digit, contoh #3b82f6)
- Tepat 6 warna: skin, hair, primary, secondary, accent, metal. JANGAN tentukan warna outline (diurus kode).
- primary = warna dominan pakaian/zirah; secondary = warna pendamping dengan kontras luminans jelas (>0.06);
  accent = satu warna kecil mencolok (permata, syal, sihir, sabuk); metal = abu/perak/emas untuk senjata & pelat.
- skin harus warna kulit/makhluk yang masuk akal dan kontras dengan pakaian.

6 CONTOH DENGAN SILUET & PROPORSI YANG SANGAT BERAGAM:

Contoh 1 (Ksatria Heavy-Tall):
User: "ksatria zirah pelat baja berat jangkung dengan pedang bermata ganda dan perisai perak"
{"name":"Ksatria Baja","archetype":"fighter","body":"heavy","head":"helmet_closed","weapon":"sword","offhand":"shield","cape":"short","proportions":{"height":"tall","headSize":"small","torsoWidth":3,"legLength":"long","armThickness":2},"variants":{"hair":0,"head":1,"torso":2,"weapon":1},"traits":["none"],"accessories":["shoulder_pad","boots","belt"],"hairStyle":"none","palette":{"skin":"#f2c9a0","hair":"#2b2b2b","primary":"#475569","secondary":"#1e293b","accent":"#38bdf8","metal":"#e2e8f0"},"animations":["idle","walk","attack"]}

Contoh 2 (Goblin Short-Big-Head):
User: "goblin kerdil licik berkepala besar dengan telinga runcing membawa belati racun"
{"name":"Goblin Kerdil","archetype":"goblin","body":"slim","head":"bare","weapon":"dagger","offhand":"none","cape":"none","proportions":{"height":"short","headSize":"big","torsoWidth":1,"legLength":"short","armThickness":1},"variants":{"hair":1,"head":0,"torso":0,"weapon":0},"traits":["pointy_ears"],"accessories":["belt"],"hairStyle":"short","palette":{"skin":"#65a30d","hair":"#1c1917","primary":"#854d0e","secondary":"#533107","accent":"#eab308","metal":"#94a3b8"},"animations":["idle","walk","attack"]}

Contoh 3 (Penyihir Tall-Slim):
User: "penyihir agung jangkung ramping bertudung mistis dan jubah panjang ungu berkilau"
{"name":"Penyihir Agung","archetype":"mage","body":"slim","head":"hood","weapon":"staff","offhand":"none","cape":"long","proportions":{"height":"tall","headSize":"normal","torsoWidth":1,"legLength":"long","armThickness":1},"variants":{"hair":0,"head":2,"torso":3,"weapon":2},"traits":["none"],"accessories":["cape"],"hairStyle":"none","palette":{"skin":"#fed7aa","hair":"#e2e8f0","primary":"#7e22ce","secondary":"#3b0764","accent":"#38bdf8","metal":"#facc15"},"animations":["idle","walk","attack"]}

Contoh 4 (Pemanah Slim dengan Quiver):
User: "pemanah lincah elf dengan busur kayu dan tabung panah di punggung"
{"name":"Pemanah Hutan","archetype":"archer","body":"slim","head":"bare","weapon":"bow","offhand":"none","cape":"none","proportions":{"height":"normal","headSize":"normal","torsoWidth":1,"legLength":"normal","armThickness":1},"variants":{"hair":2,"head":0,"torso":1,"weapon":3},"traits":["pointy_ears"],"accessories":["quiver","boots"],"hairStyle":"long","palette":{"skin":"#ffedd5","hair":"#facc15","primary":"#15803d","secondary":"#14532d","accent":"#ea580c","metal":"#78716c"},"animations":["idle","walk","attack"]}

Contoh 5 (Zombie Hunch tanpa senjata):
User: "mayat hidup bungkuk merangkak tubuh pucat mengerikan tangan kosong"
{"name":"Zombie Bungkuk","archetype":"zombie","body":"normal","head":"bare","weapon":"none","offhand":"none","cape":"none","proportions":{"height":"short","headSize":"normal","torsoWidth":2,"legLength":"short","armThickness":1},"variants":{"hair":3,"head":0,"torso":0,"weapon":0},"traits":["hunch"],"accessories":[],"hairStyle":"short","palette":{"skin":"#86efac","hair":"#334155","primary":"#475569","secondary":"#1e293b","accent":"#ef4444","metal":"#64748b"},"animations":["idle","walk","attack"]}

Contoh 6 (Pahlawan Rambut Spiky + Scarf + Belt - sesuai referensi):
User: "pemuda petualang rambut jabrik oranye dengan syal merah melingkar di leher dan sabuk kulit bertualang memegang pedang perak"
{"name":"Petualang Jingga","archetype":"fighter","body":"normal","head":"bare","weapon":"sword","offhand":"none","cape":"none","proportions":{"height":"normal","headSize":"normal","torsoWidth":2,"legLength":"normal","armThickness":1},"variants":{"hair":4,"head":0,"torso":1,"weapon":0},"traits":["none"],"accessories":["scarf","belt","boots"],"hairStyle":"spiky","palette":{"skin":"#fed7aa","hair":"#ea580c","primary":"#16a34a","secondary":"#854d0e","accent":"#dc2626","metal":"#e2e8f0"},"animations":["idle","walk","attack"]}
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

  // Gracefully validate optional diversity fields with fallback defaults (never reject valid old spec)
  const proportions: CharacterProportions = {
    height: oneOf(HEIGHTS, r.proportions?.height) ? r.proportions.height : DEFAULT_PROPORTIONS.height,
    headSize: oneOf(HEAD_SIZES, r.proportions?.headSize) ? r.proportions.headSize : DEFAULT_PROPORTIONS.headSize,
    torsoWidth: [1, 2, 3].includes(Number(r.proportions?.torsoWidth)) ? (Number(r.proportions.torsoWidth) as 1 | 2 | 3) : DEFAULT_PROPORTIONS.torsoWidth,
    legLength: oneOf(LEG_LENGTHS, r.proportions?.legLength) ? r.proportions.legLength : DEFAULT_PROPORTIONS.legLength,
    armThickness: [1, 2].includes(Number(r.proportions?.armThickness)) ? (Number(r.proportions.armThickness) as 1 | 2) : DEFAULT_PROPORTIONS.armThickness,
  };

  const variants: CharacterVariants = {
    hair: typeof r.variants?.hair === 'number' && r.variants.hair >= 0 && r.variants.hair <= 4 ? Math.floor(r.variants.hair) : 0,
    head: typeof r.variants?.head === 'number' && r.variants.head >= 0 && r.variants.head <= 3 ? Math.floor(r.variants.head) : 0,
    torso: typeof r.variants?.torso === 'number' && r.variants.torso >= 0 && r.variants.torso <= 3 ? Math.floor(r.variants.torso) : 0,
    weapon: typeof r.variants?.weapon === 'number' && r.variants.weapon >= 0 && r.variants.weapon <= 3 ? Math.floor(r.variants.weapon) : 0,
  };

  const validTraits = Array.isArray(r.traits)
    ? (r.traits.filter((t: unknown) => oneOf(TRAITS, t)) as CharacterTrait[]).slice(0, 2)
    : [];
  const traits: CharacterTrait[] = validTraits.length > 0 ? validTraits : ['none'];

  const validAccessories = Array.isArray(r.accessories)
    ? (r.accessories.filter((a: unknown) => oneOf(ACCESSORIES, a)) as CharacterAccessory[]).slice(0, 3)
    : [];

  const hairStyle: HairStyle = oneOf(HAIR_STYLES, r.hairStyle) ? r.hairStyle : 'short';

  if (errors.length) return { errors };

  return {
    spec: {
      ...r,
      name: String(r.name ?? 'Karakter').slice(0, 24),
      proportions,
      variants,
      traits,
      accessories: validAccessories,
      hairStyle,
    } as CharacterSpec,
    errors,
  };
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
  proportions: { ...DEFAULT_PROPORTIONS },
  variants: { ...DEFAULT_VARIANTS },
  traits: ['none'],
  accessories: [],
  hairStyle: 'short',
};

// ============================================================
// 3.5. HELPER DIVERSITY & VALIDASI REFERENSI
// ============================================================
export function countSilhouetteDifferences(a: CharacterSpec, b: CharacterSpec): number {
  let diff = 0;
  if (a.body !== b.body) diff++;
  if (a.head !== b.head) diff++;
  if (a.weapon !== b.weapon) diff++;
  if (a.offhand !== b.offhand) diff++;
  if (a.cape !== b.cape) diff++;
  if (a.proportions?.height !== b.proportions?.height) diff++;
  if (a.proportions?.headSize !== b.proportions?.headSize) diff++;
  if (a.proportions?.torsoWidth !== b.proportions?.torsoWidth) diff++;
  if (a.proportions?.legLength !== b.proportions?.legLength) diff++;
  if (a.proportions?.armThickness !== b.proportions?.armThickness) diff++;

  const traitsA = (a.traits || []).slice().sort().join(',');
  const traitsB = (b.traits || []).slice().sort().join(',');
  if (traitsA !== traitsB) diff++;

  if (a.hairStyle !== b.hairStyle) diff++;

  return diff;
}

export function validateReferenceImagePayload(referenceImage: any): { valid: boolean; error?: string } {
  if (!referenceImage) return { valid: true };
  if (typeof referenceImage !== 'object') {
    return { valid: false, error: 'referenceImage harus berupa objek { mimeType, data }' };
  }
  const validMimes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
  const mime = String(referenceImage.mimeType || '').toLowerCase();
  if (!validMimes.includes(mime)) {
    return { valid: false, error: `mimeType tidak didukung: ${referenceImage.mimeType}. Hanya PNG, JPEG, dan WebP yang diizinkan.` };
  }
  if (!referenceImage.data || typeof referenceImage.data !== 'string') {
    return { valid: false, error: 'data gambar base64 tidak boleh kosong dan harus berupa string' };
  }
  const rawBase64 = referenceImage.data.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');
  const sizeBytes = Math.round((rawBase64.length * 3) / 4);
  const maxBytes = 2 * 1024 * 1024; // 2MB
  if (sizeBytes > maxBytes) {
    return { valid: false, error: `Ukuran gambar melebihi batas 2MB (${Math.round(sizeBytes / 1024)} KB terkompresi)` };
  }
  return { valid: true };
}

export function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

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
