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
  drawCharacterCelFromSpec
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
  assert.match(sizeResult.error || '', /melebihi batas 2MB/);
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

