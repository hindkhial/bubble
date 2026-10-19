import test from 'node:test';
import assert from 'node:assert/strict';
import { accentPalette, getThemeColors, themedAvatarColor, bubblePalette, bubbleShade } from '../src/theme/appearance.ts';

test('Bubble shade choices follow every accent in both modes without changing stored keys', () => {
  for (const accent of accentPalette) for (const mode of ['light', 'dark']) {
    const shades = bubblePalette.map(option => bubbleShade(option.value, mode, accent.name));
    assert.equal(new Set(shades).size, 3);
    assert.equal(shades[0], mode === 'dark' ? accent.dark : accent.value);
    for (const shade of shades) assert.ok(contrast(getThemeColors(mode, accent.name).text, shade) >= 4.5);
  }
  assert.notEqual(bubbleShade(bubblePalette[0].value, 'light', 'Sky blue'), bubbleShade(bubblePalette[0].value, 'light', 'Rose'));
});

function luminance(hex) {
  const channels = hex.slice(1).match(/../g).map((v) => parseInt(v, 16) / 255).map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
function contrast(a, b) {
  const values = [luminance(a), luminance(b)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test('all seven accents have matching darker shades', () => {
  assert.equal(accentPalette.length, 7);
  for (const accent of accentPalette) {
    const light = getThemeColors('light', accent.name);
    const dark = getThemeColors('dark', accent.name);
    assert.equal(light.lavender, accent.value);
    assert.equal(dark.lavender, accent.dark);
    assert.ok(luminance(accent.dark) < luminance(accent.value));
    assert.equal(themedAvatarColor(accent.value, 'dark'), accent.dark);
    assert.equal(themedAvatarColor(accent.value, 'light'), accent.value);
  }
});

test('text and action colors remain readable for every mode and accent', () => {
  for (const accent of accentPalette) for (const mode of ['light', 'dark']) {
    const colors = getThemeColors(mode, accent.name);
    for (const surface of [colors.background, colors.surface, colors.input, colors.lavender]) {
      assert.ok(contrast(colors.text, surface) >= 4.5, `${mode} ${accent.name} text`);
    }
    assert.ok(contrast(colors.action, colors.lavender) >= 4.5, `${mode} ${accent.name} action`);
    assert.ok(contrast(colors.onAction, colors.action) >= 4.5, `${mode} ${accent.name} button`);
  }
});

// Caption/meta text on colored cards uses colors.text (covered above).
// Destructive/error text sits on these neutral form/menu surfaces.
test('destructive labels and muted form text meet normal text contrast in both themes', () => {
  for (const mode of ['light', 'dark']) for (const accent of accentPalette) {
    const colors = getThemeColors(mode, accent.name);
    for (const surface of [colors.background, colors.surface, colors.input]) {
      assert.ok(contrast(colors.destructive, surface) >= 4.5, `${mode} destructive text`);
      assert.ok(contrast(colors.muted, surface) >= 4.5, `${mode} muted text`);
    }
  }
});
