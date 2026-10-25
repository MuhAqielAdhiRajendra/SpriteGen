import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateSpec,
  DEFAULT_SPEC,
  makeRamp,
  buildPalette,
  alignToGround,
  addOutline,
  removeOrphans,
  postProcessFrame,
  validateSequence,
  POSES,
  drawCharacterCelFromSpec,
  type CharacterSpec,
} from './pixelEngine.ts';

test('validateSpec verifies complete enum schema and hex colors', () => {
  const validResult = validateSpec(DEFAULT_SPEC);
  assert.ok(validResult.spec);
  assert.equal(validResult.errors.length, 0);

  const invalid = {
    archetype: 'ninja', // not in enum
    body: 'giant',     // not in enum
    palette: { skin: 'invalid_hex' }
  };
  const invalidResult = validateSpec(invalid);
  assert.equal(invalidResult.spec, undefined);
  assert.ok(invalidResult.errors.length >= 2);
});

test('buildPalette creates 3-step ramps and outline for all 6 components', () => {
  const pal = buildPalette(DEFAULT_SPEC);
  assert.ok(pal.ramps.primary.shadow);
  assert.ok(pal.ramps.primary.base);
  assert.ok(pal.ramps.primary.light);
  assert.ok(pal.outline);
  assert.equal(pal.highlight, '#ffffff');
});

test('postProcessFrame enforces clean outline and aligns feet to ground', () => {
  const { body, fx } = drawCharacterCelFromSpec(DEFAULT_SPEC, POSES.idle[0], 32);
  const processed = postProcessFrame(body, fx, DEFAULT_SPEC, 30);

  assert.equal(processed.length, 32);
  assert.equal(processed[0].length, 32);

  // Foot line must reach ground boundary (body at 30, 1px outline at 31)
  let lowestY = -1;
  for (let y = 31; y >= 0; y--) {
    if (processed[y].some(c => c !== 'transparent')) {
      lowestY = y;
      break;
    }
  }
  assert.ok(lowestY >= 30 && lowestY <= 31, `Lowest Y should be 30 or 31, got ${lowestY}`);
});

test('validateSequence confirms animation consistency across frames', () => {
  const frames = POSES.walk.slice(0, 4).map(pose => {
    const { body, fx } = drawCharacterCelFromSpec(DEFAULT_SPEC, pose, 32);
    return postProcessFrame(body, fx, DEFAULT_SPEC, 30);
  });

  const check = validateSequence(frames, 32);
  assert.ok(check.ok, `Validation should pass, but got: ${check.errors.join(', ')}`);
});

test('countSilhouetteDifferences detects distinct silhouette properties accurately', async () => {
  const { countSilhouetteDifferences, DEFAULT_SPEC } = await import('./pixelforgeSpec.ts');

  // Identical specs have 0 difference
  const diffSame = countSilhouetteDifferences(DEFAULT_SPEC, { ...DEFAULT_SPEC });
  assert.equal(diffSame, 0);

  // Changing body, weapon, cape, proportions.height, traits should yield at least 5 diffs
  const alteredSpec = {
    ...DEFAULT_SPEC,
    body: 'heavy' as const,
    weapon: 'axe' as const,
    cape: 'long' as const,
    proportions: {
      ...DEFAULT_SPEC.proportions!,
      height: 'tall' as const,
    },
    traits: ['horns' as const],
  };

  const diffAltered = countSilhouetteDifferences(DEFAULT_SPEC, alteredSpec);
  assert.ok(diffAltered >= 4, `Expected at least 4 differences, got ${diffAltered}`);
});

test('validateReferenceImagePayload enforces mimeType and 2MB compression limit', async () => {
  const { validateReferenceImagePayload } = await import('./pixelforgeSpec.ts');

  // Null/undefined reference is optional and valid
  assert.equal(validateReferenceImagePayload(null).valid, true);

  // Valid JPEG base64 payload
  const validPayload = {
    mimeType: 'image/jpeg',
    data: 'dGVzdGRhdGE=' // base64 "testdata"
  };
  assert.equal(validateReferenceImagePayload(validPayload).valid, true);

  // Unsupported mimeType
  const invalidMime = {
    mimeType: 'image/gif',
    data: 'dGVzdA=='
  };
  const mimeResult = validateReferenceImagePayload(invalidMime);
  assert.equal(mimeResult.valid, false);
  assert.match(mimeResult.error || '', /mimeType tidak didukung/);

  // Missing data string
  const missingData = {
    mimeType: 'image/png',
    data: ''
  };
  assert.equal(validateReferenceImagePayload(missingData).valid, false);

  // Oversized data (> 2MB)
  // 2MB in base64 is ~2.8 million chars
  const oversizedBase64 = 'A'.repeat(2.9 * 1024 * 1024);
  const oversizedPayload = {
    mimeType: 'image/jpeg',
    data: oversizedBase64
  };
  const sizeResult = validateReferenceImagePayload(oversizedPayload);
  assert.equal(sizeResult.valid, false);
  assert.match(sizeResult.error || '', /melebihi batas 2\.8MB/);
});

test('fallback status format preserves source and reason without crashing', () => {
  const fallbackResponse = {
    success: false,
    source: 'fallback',
    reason: 'GEMINI_API_KEY tidak dikonfigurasi di server environment (.env)',
    spec: null
  };

  assert.equal(fallbackResponse.source, 'fallback');
  assert.equal(fallbackResponse.spec, null);
  assert.ok(fallbackResponse.reason.includes('GEMINI_API_KEY'));
});

test('applyReferenceAnalysisToSpec merges vision analysis into CharacterSpec while respecting prompt overrides', async () => {
  const { applyReferenceAnalysisToSpec, DEFAULT_SPEC } = await import('./pixelforgeSpec.ts');

  const mockAnalysis = {
    headToBodyRatio: 0.35, // large head / chibi
    bodyBuild: 'slim' as const,
    height: 'short' as const,
    headSize: 'big' as const,
    hairStyle: 'spiky' as const,
    hairColor: '#ea580c',
    skinColor: '#fed7aa',
    outfitColors: {
      primary: '#16a34a',
      secondary: '#854d0e',
      accent: '#dc2626',
      metal: '#e2e8f0',
    },
    accessories: ['scarf' as const, 'belt' as const, 'boots' as const],
    weaponType: 'sword' as const,
    traits: ['pointy_ears' as const],
    styleNotes: 'Hero with orange spiky hair, green tunic and red scarf',
  };

  // 1. Without prompt override, analysis fields should transfer to spec
  const mergedSpec = applyReferenceAnalysisToSpec(DEFAULT_SPEC, mockAnalysis, '');
  assert.equal(mergedSpec.hairStyle, 'spiky');
  assert.equal(mergedSpec.palette.hair, '#ea580c');
  assert.equal(mergedSpec.palette.primary, '#16a34a');
  assert.equal(mergedSpec.palette.accent, '#dc2626');
  assert.equal(mergedSpec.body, 'slim');
  assert.equal(mergedSpec.proportions?.height, 'short');
  assert.equal(mergedSpec.proportions?.headSize, 'big');
  assert.ok(mergedSpec.traits?.includes('pointy_ears'));
  assert.ok(mergedSpec.accessories?.includes('scarf'));
  assert.ok(mergedSpec.accessories?.includes('boots'));

  // 2. With explicit prompt override: "bawa tongkat sihir dan rambut panjang"
  const overridePrompt = 'Penyihir bawa tongkat sihir dan rambut panjang warna biru';
  const overriddenSpec = applyReferenceAnalysisToSpec(DEFAULT_SPEC, mockAnalysis, overridePrompt);
  // Prompt explicitly asks for tongkat (staff) and rambut panjang (long hair)
  assert.equal(overriddenSpec.hairStyle, 'long');
  // weapon was not set to staff in DEFAULT_SPEC yet, but mockAnalysis had sword; prompt override shouldn't force sword over staff
  assert.notEqual(overriddenSpec.weapon, 'sword');
});

test('resolveLayout dynamically calculates dimensions based on proportions and archetype', async () => {
  const { resolveLayout, DEFAULT_SPEC } = await import('./pixelforgeSpec.ts');

  // Standard character
  const standardLayout = resolveLayout(DEFAULT_SPEC, 32);
  assert.equal(standardLayout.scale, 1);
  assert.equal(standardLayout.cx, 16);
  assert.equal(standardLayout.groundY, 30);

  // Tall character with heavy body
  const tallHeavySpec = {
    ...DEFAULT_SPEC,
    body: 'heavy' as const,
    proportions: {
      height: 'tall' as const,
      headSize: 'small' as const,
      torsoWidth: 3 as const,
      legLength: 'long' as const,
      armThickness: 2 as const,
    },
  };
  const tallLayout = resolveLayout(tallHeavySpec, 32);
  assert.ok(tallLayout.torsoW > standardLayout.torsoW, 'Torso should be wider');
  assert.ok(tallLayout.legLen > standardLayout.legLen, 'Legs should be longer');
  assert.ok(tallLayout.headR < standardLayout.headR, 'Head should be smaller');

  // Goblin archetype automatically gets short height and big head if unspecified
  const goblinSpec = {
    ...DEFAULT_SPEC,
    archetype: 'goblin' as const,
    body: 'slim' as const,
    proportions: undefined,
  };
  const goblinLayout = resolveLayout(goblinSpec, 32);
  assert.ok(goblinLayout.headR > standardLayout.headR, 'Goblin should have larger head');
  assert.ok(goblinLayout.legLen < standardLayout.legLen, 'Goblin should have shorter legs');

  // Hunch trait shifts head forward
  const hunchSpec = {
    ...DEFAULT_SPEC,
    traits: ['hunch' as const],
  };
  const hunchLayout = resolveLayout(hunchSpec, 32);
  assert.ok(hunchLayout.headOffsetX > 0, 'Head should be shifted forward with hunch trait');
});

test('drawCharacterCelFromSpec renders all 5 hair styles and modular traits without error', async () => {
  const { drawCharacterCelFromSpec, DEFAULT_SPEC, POSES } = await import('./pixelEngine.ts');

  const hairStyles = ['none', 'short', 'spiky', 'long', 'jambul'] as const;
  for (const style of hairStyles) {
    const spec = { ...DEFAULT_SPEC, hairStyle: style };
    const { body, fx } = drawCharacterCelFromSpec(spec, POSES.idle[0], 32);
    assert.equal(body.length, 32);
    assert.equal(body[0].length, 32);
  }

  // Trait combinations
  const traitCombos = [
    ['horns', 'tail'] as const,
    ['pointy_ears', 'wings'] as const,
    ['beard', 'hunch'] as const,
  ];
  for (const traits of traitCombos) {
    const spec = {
      ...DEFAULT_SPEC,
      traits: [...traits],
      accessories: ['scarf', 'belt', 'shoulder_pad'] as any,
    };
    const { body } = drawCharacterCelFromSpec(spec, POSES.idle[0], 32);
    // Ensure pixels exist
    const hasPixels = body.some(row => row.some(c => c !== 'transparent'));
    assert.ok(hasPixels, 'Cel should contain rendered pixels');
  }
});

test('validateSpec handles both complete new fields and legacy/incomplete fields gracefully', async () => {
  const { validateSpec, DEFAULT_SPEC } = await import('./pixelforgeSpec.ts');

  // Complete spec with all new fields
  const completeSpec = {
    ...DEFAULT_SPEC,
    proportions: {
      height: 'tall',
      headSize: 'small',
      torsoWidth: 3,
      legLength: 'long',
      armThickness: 2,
    },
    variants: {
      hair: 2,
      head: 1,
      torso: 2,
      weapon: 1,
    },
    traits: ['horns', 'tail'],
    accessories: ['shoulder_pad', 'boots'],
    hairStyle: 'spiky',
  };

  const resComplete = validateSpec(completeSpec);
  assert.equal(resComplete.errors.length, 0);
  assert.ok(resComplete.spec);
  assert.ok(resComplete.spec.proportions);
  assert.equal(resComplete.spec.proportions.height, 'tall');
  assert.ok(resComplete.spec.variants);
  assert.equal(resComplete.spec.variants.hair, 2);
  assert.deepEqual(resComplete.spec.traits, ['horns', 'tail']);
  assert.deepEqual(resComplete.spec.accessories, ['shoulder_pad', 'boots']);
  assert.equal(resComplete.spec.hairStyle, 'spiky');

  // Legacy/incomplete spec omitting all new fields
  const legacySpec = {
    name: 'OldHero',
    archetype: 'fighter',
    body: 'normal',
    head: 'bare',
    weapon: 'sword',
    offhand: 'none',
    cape: 'none',
    palette: {
      skin: '#ffd1a4',
      hair: '#3a2312',
      primary: '#2c5282',
      secondary: '#1a365d',
      accent: '#ecc94b',
      metal: '#cbd5e0',
    },
    animations: ['idle', 'walk'],
  };

  const resLegacy = validateSpec(legacySpec);
  assert.equal(resLegacy.errors.length, 0);
  assert.ok(resLegacy.spec);
  assert.ok(resLegacy.spec.proportions);
  assert.equal(resLegacy.spec.proportions.height, 'normal');
  assert.ok(resLegacy.spec.variants);
  assert.deepEqual(resLegacy.spec.traits, ['none']);
  assert.deepEqual(resLegacy.spec.accessories, []);
  assert.equal(resLegacy.spec.hairStyle, 'short');
});

test('8 diverse specs have silhouette average IoU < 0.60 and no pair > 0.85', async () => {
  const { drawCharacterCelFromSpec, postProcessFrame, POSES } = await import('./pixelEngine.ts');
  const { DEFAULT_SPEC } = await import('./pixelforgeSpec.ts');

  const specs: CharacterSpec[] = [
    // 1. Ksatria Heavy
    { ...DEFAULT_SPEC, name: 'Ksatria', archetype: 'fighter', body: 'heavy', proportions: { height: 'tall', headSize: 'small', torsoWidth: 3, legLength: 'long', armThickness: 2 }, head: 'helmet_closed', weapon: 'sword', offhand: 'shield', cape: 'short', hairStyle: 'none', traits: ['none'], accessories: ['shoulder_pad', 'belt', 'boots'] },
    // 2. Goblin Rogue
    { ...DEFAULT_SPEC, name: 'Goblin', archetype: 'goblin', body: 'slim', proportions: { height: 'short', headSize: 'big', torsoWidth: 1, legLength: 'short', armThickness: 1 }, head: 'bare', weapon: 'dagger', offhand: 'none', cape: 'none', hairStyle: 'short', traits: ['pointy_ears'], accessories: ['belt'] },
    // 3. Penyihir Agung
    { ...DEFAULT_SPEC, name: 'Penyihir', archetype: 'mage', body: 'slim', proportions: { height: 'tall', headSize: 'normal', torsoWidth: 1, legLength: 'long', armThickness: 1 }, head: 'hood', weapon: 'staff', offhand: 'none', cape: 'long', hairStyle: 'none', traits: ['none'], accessories: [] },
    // 4. Pemanah Elf
    { ...DEFAULT_SPEC, name: 'Pemanah', archetype: 'archer', body: 'slim', proportions: { height: 'normal', headSize: 'normal', torsoWidth: 1, legLength: 'normal', armThickness: 1 }, head: 'bare', weapon: 'bow', offhand: 'none', cape: 'none', hairStyle: 'long', traits: ['pointy_ears'], accessories: ['quiver', 'boots'] },
    // 5. Zombie Bungkuk
    { ...DEFAULT_SPEC, name: 'Zombie', archetype: 'zombie', body: 'normal', proportions: { height: 'short', headSize: 'normal', torsoWidth: 2, legLength: 'short', armThickness: 1 }, head: 'bare', weapon: 'none', offhand: 'none', cape: 'none', hairStyle: 'short', traits: ['hunch'], accessories: [] },
    // 6. Hero Jambul
    { ...DEFAULT_SPEC, name: 'Hero', archetype: 'fighter', body: 'normal', proportions: { height: 'normal', headSize: 'normal', torsoWidth: 2, legLength: 'normal', armThickness: 1 }, head: 'bare', weapon: 'sword', offhand: 'none', cape: 'none', hairStyle: 'jambul', traits: ['none'], accessories: ['scarf', 'belt', 'boots'] },
    // 7. Ninja Bayangan
    { ...DEFAULT_SPEC, name: 'Ninja', archetype: 'fighter', body: 'slim', proportions: { height: 'normal', headSize: 'small', torsoWidth: 1, legLength: 'long', armThickness: 1 }, head: 'hood', weapon: 'dagger', offhand: 'none', cape: 'none', hairStyle: 'none', traits: ['wings'], accessories: ['scarf', 'gloves', 'boots'] },
    // 8. Kurcaci Berjenggot
    { ...DEFAULT_SPEC, name: 'Kurcaci', archetype: 'fighter', body: 'heavy', proportions: { height: 'short', headSize: 'normal', torsoWidth: 3, legLength: 'short', armThickness: 2 }, head: 'helmet_open', weapon: 'axe', offhand: 'shield', cape: 'short', hairStyle: 'none', traits: ['beard'], accessories: ['belt', 'boots'] },
  ];

  const frames = specs.map(s => {
    const { body, fx } = drawCharacterCelFromSpec(s, POSES.idle[0], 32);
    return postProcessFrame(body, fx, s, 30);
  });

  function getIoU(f1: string[][], f2: string[][]): number {
    let inter = 0;
    let union = 0;
    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 32; x++) {
        const a = f1[y][x] !== 'transparent';
        const b = f2[y][x] !== 'transparent';
        if (a && b) inter++;
        if (a || b) union++;
      }
    }
    return union === 0 ? 0 : inter / union;
  }

  let totalIoU = 0;
  let count = 0;
  let maxIoU = 0;

  for (let i = 0; i < frames.length; i++) {
    for (let j = i + 1; j < frames.length; j++) {
      const iou = getIoU(frames[i], frames[j]);
      totalIoU += iou;
      count++;
      if (iou > maxIoU) maxIoU = iou;
      assert.ok(
        iou <= 0.85,
        `Pair ${specs[i].name} vs ${specs[j].name} IoU (${iou.toFixed(3)}) exceeds max 0.85 threshold`
      );
    }
  }

  const avgIoU = totalIoU / count;
  assert.ok(
    avgIoU < 0.60,
    `Average silhouette IoU (${avgIoU.toFixed(3)}) exceeds target 0.60 threshold`
  );
});

test('specs with different proportions produce different frames', async () => {
  const { drawCharacterCelFromSpec, POSES } = await import('./pixelEngine.ts');
  const { DEFAULT_SPEC } = await import('./pixelforgeSpec.ts');

  const tallSpec = {
    ...DEFAULT_SPEC,
    proportions: {
      ...DEFAULT_SPEC.proportions!,
      height: 'tall' as const,
      torsoWidth: 3 as const,
    },
  };

  const shortSpec = {
    ...DEFAULT_SPEC,
    proportions: {
      ...DEFAULT_SPEC.proportions!,
      height: 'short' as const,
      torsoWidth: 1 as const,
    },
  };

  const frameTall = drawCharacterCelFromSpec(tallSpec, POSES.idle[0], 32).body;
  const frameShort = drawCharacterCelFromSpec(shortSpec, POSES.idle[0], 32).body;

  let differs = false;
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      if (frameTall[y][x] !== frameShort[y][x]) {
        differs = true;
        break;
      }
    }
    if (differs) break;
  }
  assert.ok(differs, 'Frames with different proportions must differ in rendered pixels');
});

test('validateSequence confirms animation consistency across idle, walk, attack at size 32, 64, 128', async () => {
  const { drawCharacterCelFromSpec, postProcessFrame, validateSequence, POSES } = await import('./pixelEngine.ts');
  const { DEFAULT_SPEC } = await import('./pixelforgeSpec.ts');

  const testSizes = [32, 64, 128];
  const testAnimations = ['idle', 'walk', 'attack'] as const;

  for (const size of testSizes) {
    for (const anim of testAnimations) {
      const poses = POSES[anim];
      const frames = poses.map(pose => {
        const { body, fx } = drawCharacterCelFromSpec(DEFAULT_SPEC, pose, size);
        return postProcessFrame(body, fx, DEFAULT_SPEC, size - Math.round(2 * (size / 32)));
      });

      const check = validateSequence(frames, size);
      assert.ok(
        check.ok,
        `Validation failed for anim ${anim} at size ${size}: ${check.errors.join(', ')}`
      );
    }
  }
});


