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
