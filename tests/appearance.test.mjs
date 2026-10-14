import test from 'node:test';
import assert from 'node:assert/strict';
import { accentPalette, getThemeColors, themedAvatarColor } from '../src/theme/appearance.ts';

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
