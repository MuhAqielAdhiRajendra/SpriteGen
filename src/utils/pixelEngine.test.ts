import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createEmptyGrid,
  hexToRgba,
  rgbaToHex,
  colorDistance,
  quantizeToPalette,
  generateProceduralCharacter,
  evaluateSpriteMatrix,
  applyAutoRefinement,
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

test('generateProceduralCharacter creates valid 32x32, 64x64, 128x128 character matrices and frames', () => {
  // Test 32x32
  const char32 = generateProceduralCharacter({
    prompt: 'A valiant knight with silver armor, red cape, and shiny claymore',
    resolution: 32,
    paletteKey: 'snes',
    archetype: 'knight',
    direction: 'front'
  });

  assert.equal(char32.pixels.length, 32);
  assert.equal(char32.pixels[0].length, 32);
  assert.ok(char32.features.length > 0);
  assert.ok(char32.frames.idle.length >= 2);
  assert.ok(char32.frames.walk.length === 4);
  assert.ok(char32.frames.attack.length === 3);

  // Verify non-transparent pixels exist (character has rendered substance)
  let filled32 = 0;
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      if (char32.pixels[y][x] !== 'transparent') filled32++;
    }
  }
  assert.ok(filled32 > 50, `Expected >50 pixels filled, got ${filled32}`);

  // Test 64x64
  const char64 = generateProceduralCharacter({
    prompt: 'Cyberpunk netrunner with neon katana and glowing visor',
    resolution: 64,
    paletteKey: 'cyberpunk',
    archetype: 'cyberpunk',
    direction: 'front'
  });
  assert.equal(char64.pixels.length, 64);
  assert.equal(char64.pixels[0].length, 64);

  // Test 128x128
  const char128 = generateProceduralCharacter({
    prompt: 'Dark wizard casting spells with glowing crystal staff',
    resolution: 128,
    paletteKey: 'gothic',
    archetype: 'mage',
    direction: 'front'
  });
  assert.equal(char128.pixels.length, 128);
  assert.equal(char128.pixels[0].length, 128);
});

test('evaluateSpriteMatrix performs AI vision inspection scoring', () => {
  const char = generateProceduralCharacter({
    prompt: 'Holy paladin with shield and blessed warhammer',
    resolution: 32,
    paletteKey: 'snes',
    archetype: 'paladin',
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
  // Place an isolated stray pixel in the corner
  grid[5][5] = '#ffffff';
  // Place connected block
  grid[15][15] = '#ff0000';
  grid[15][16] = '#ff0000';

  const refined = applyAutoRefinement(grid, PALETTES.snes.colors);
  // Isolated pixel should have been cleaned
  assert.equal(refined[5][5], 'transparent');
  // Connected block remains intact
  assert.equal(refined[15][15], '#ff0000');
  assert.equal(refined[15][16], '#ff0000');
});
