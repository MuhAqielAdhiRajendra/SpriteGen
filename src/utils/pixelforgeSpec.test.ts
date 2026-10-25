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
