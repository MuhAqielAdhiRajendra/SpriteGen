import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createEmptyGrid,
  cloneGrid,
  hexToRgba,
  rgbaToHex,
  colorDistance,
  quantizeToPalette,
  generateProceduralCharacter,
  evaluateSpriteMatrix,
  applyAutoRefinement,
  detectRequestedAnimations,
  synthesizeAnimationSequence,
  PALETTES
} from './pixelEngine';

test('createEmptyGrid generates correct dimensions and transparency', () => {
  const grid32 = createEmptyGrid(32);
  assert.equal(grid32.length, 32);
  assert.equal(grid32[0].length, 32);
  assert.equal(grid32[15][15], 'transparent');

  const grid64 = createEmptyGrid(64);
  assert.equal(grid64.length, 64);
  assert.equal(grid64[0].length, 64);

  const grid128 = createEmptyGrid(128);
  assert.equal(grid128.length, 128);
  assert.equal(grid128[0].length, 128);
});

test('cloneGrid creates an independent deep copy of 2D pixels', () => {
  const original = createEmptyGrid(32);
  original[10][10] = '#ff0000';
  const copy = cloneGrid(original);
  assert.equal(copy[10][10], '#ff0000');
  copy[10][10] = '#00ff00';
  assert.equal(original[10][10], '#ff0000', 'Original should remain unchanged');
  assert.equal(copy[10][10], '#00ff00', 'Copy should be modified');
});

test('hexToRgba and rgbaToHex work correctly with color conversions', () => {
  const white = hexToRgba('#ffffff');
  assert.equal(white.r, 255);
  assert.equal(white.g, 255);
  assert.equal(white.b, 255);
  assert.equal(white.a, 1);

  const black = hexToRgba('#000000');
  assert.equal(black.r, 0);
  assert.equal(black.g, 0);
  assert.equal(black.b, 0);

  const hexBack = rgbaToHex(255, 0, 128);
  assert.equal(hexBack.toLowerCase(), '#ff0080');

  const transparentRgba = hexToRgba('transparent');
  assert.equal(transparentRgba.a, 0);
  assert.equal(rgbaToHex(0, 0, 0, 0), 'transparent');
});

test('colorDistance computes accurate Euclidean color distance', () => {
  const distIdentical = colorDistance('#ffffff', '#ffffff');
  assert.equal(distIdentical, 0);

  const distBlackWhite = colorDistance('#000000', '#ffffff');
  assert.ok(distBlackWhite > 400);

  const distClose = colorDistance('#ff0000', '#fe0000');
  assert.ok(distClose < 5);
});

test('quantizeToPalette maps arbitrary colors to closest palette color', () => {
  const pal = ['#000000', '#ffffff', '#ff0000', '#0000ff'];
  const res1 = quantizeToPalette('#050505', pal);
  assert.equal(res1, '#000000');

  const res2 = quantizeToPalette('#e8e8e8', pal);
  assert.equal(res2, '#ffffff');

  const res3 = quantizeToPalette('#e61919', pal);
  assert.equal(res3, '#ff0000');
});

test('detectRequestedAnimations detects motion keywords or returns empty for static requests', () => {
  const static1 = detectRequestedAnimations('Ksatria berzirah perak dengan jubah biru');
  assert.equal(static1.length, 0);

  const static2 = detectRequestedAnimations('Penyihir wanita dengan tongkat kristal');
  assert.equal(static2.length, 0);

  const walkAnim = detectRequestedAnimations('Ksatria sedang berjalan');
  assert.ok(walkAnim.includes('walk'));

  const attackAnim = detectRequestedAnimations('Pendekar menyerang dengan tebasan pedang');
  assert.ok(attackAnim.includes('attack'));

  const genericAnim = detectRequestedAnimations('Buatkan karakter animasi');
  assert.ok(genericAnim.length > 0);
});

test('generateProceduralCharacter creates static single-frame cel when no animation requested', () => {
  const char = generateProceduralCharacter({
    prompt: 'Ksatria suci dengan zirah emas dan perisai putih',
    resolution: 32,
    paletteKey: 'vibrant_rpg',
    colorGrading: 'vibrant',
    direction: 'front'
  });

  assert.equal(char.pixels.length, 32);
  assert.equal(char.isAnimated, false);
  assert.equal(char.frames.length, 1);
  assert.equal(char.animations.idle.length, 1);
  assert.equal(char.animations.walk, undefined);
  assert.equal(char.animations.attack, undefined);

  // Ground shadow must not exist
  assert.equal(char.pixels[31][0], 'transparent');
  assert.equal(char.pixels[30][0], 'transparent');
});

test('generateProceduralCharacter creates independent cel frames when animation is requested', () => {
  const char = generateProceduralCharacter({
    prompt: 'Ksatria suci dengan zirah emas sedang berjalan dan menyerang',
    resolution: 32,
    paletteKey: 'vibrant_rpg',
    colorGrading: 'vibrant',
    direction: 'front'
  });

  assert.equal(char.isAnimated, true);
  assert.ok(char.animations.walk.length === 4);
  assert.ok(char.animations.attack.length === 3);

  // Each cel frame must have independent pixel grid
  const walkFrame0 = char.animations.walk[0].pixels;
  const walkFrame1 = char.animations.walk[1].pixels;
  assert.notEqual(walkFrame0, walkFrame1, 'Cels must be distinct objects');
});

test('synthesizeAnimationSequence produces genuine frame-by-frame cel sequence on demand', () => {
  const pal = PALETTES.vibrant_rpg.colors;
  const walkCels = synthesizeAnimationSequence('walk', 32, pal, 'Robot tempur mecha');
  assert.equal(walkCels.length, 4);

  const attackCels = synthesizeAnimationSequence('attack', 32, pal, 'Robot tempur mecha');
  assert.equal(attackCels.length, 3);

  const hurtCels = synthesizeAnimationSequence('hurt', 32, pal, 'Robot tempur mecha');
  assert.equal(hurtCels.length, 2);
});

test('evaluateSpriteMatrix performs AI vision inspection scoring', () => {
  const char = generateProceduralCharacter({
    prompt: 'Holy paladin with shield and blessed warhammer',
    resolution: 32,
    paletteKey: 'vibrant_rpg',
    direction: 'front'
  });

  const evaluation = evaluateSpriteMatrix(
    char.pixels,
    'Holy paladin with shield and blessed warhammer',
    32,
    char.palette,
    char.features
  );

  assert.ok(evaluation.adherenceScore >= 50 && evaluation.adherenceScore <= 100);
  assert.ok(evaluation.silhouetteScore >= 50 && evaluation.silhouetteScore <= 100);
  assert.ok(evaluation.paletteHarmonyScore >= 50 && evaluation.paletteHarmonyScore <= 100);
  assert.ok(evaluation.verdict.length > 0);
  assert.ok(evaluation.critique.length > 0);
  assert.ok(Array.isArray(evaluation.suggestedFixes));
});

test('applyAutoRefinement removes isolated pixels without corrupting grid', () => {
  const grid = createEmptyGrid(32);
  grid[5][5] = '#ffffff';
  grid[15][15] = '#ff0000';
  grid[15][16] = '#ff0000';

  const refined = applyAutoRefinement(grid, PALETTES.snes.colors);
  assert.equal(refined[5][5], 'transparent');
  assert.equal(refined[15][15], '#ff0000');
  assert.equal(refined[15][16], '#ff0000');
});
