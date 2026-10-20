import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { getThemeColors } from '../src/theme/appearance.ts';
import { validatePasswordChange } from '../src/api/authValidation.ts';

// Render the actual components with host primitives; no native runtime or new dependency.
function render(path, props = {}, mode = 'light') {
  const host = tag => ({ children, accessibilityLabel, accessibilityRole, secureTextEntry }) => React.createElement(tag,
    { 'aria-label': accessibilityLabel, role: accessibilityRole, ...(tag === 'input' ? { type: secureTextEntry ? 'password' : 'text' } : {}) }, children);
  const account = { mode: 'account', user: { email: 'synthetic@example.test' }, items: [], busy: false, loading: false, error: '' };
  const primitives = { View: host('div'), Text: host('span'), Pressable: host('button'), ScrollView: host('div'), TextInput: host('input'), KeyboardAvoidingView: host('div'), ActivityIndicator: host('progress'), Platform: { OS: 'ios' }, StyleSheet: { create: value => value } };
  const load = file => {
    const module = { exports: {} };
    const require = name => {
      if (name === 'react') return React;
      if (name === 'react-native') return primitives;
      if (name === 'react-native-safe-area-context') return { SafeAreaView: host('div') };
      if (name === 'expo-router') return { useRouter: () => ({}) };
      if (name.endsWith('/Account')) return { useAccount: () => account, configuredApi: () => 'https://localhost' };
      if (name.endsWith('/Theme')) return { useTheme: () => ({ colors: getThemeColors(mode, 'Lavender') }) };
      if (name.endsWith('/AddPreview')) return { createFormStyles: () => ({}) };
      if (name.endsWith('/useAnnouncement')) return { useAnnouncement: () => {} };
      if (name.endsWith('/BubbleLogo')) return load('../src/components/BubbleLogo.tsx');
      if (name.endsWith('/LogoutButton')) return load('../src/components/LogoutButton.tsx');
      if (name.endsWith('/Profile')) return { useProfile: () => ({ profile: { displayName: 'Synthetic name', bio: 'Synthetic bio' } }) };
      if (name.endsWith('/Content')) return { useContent: () => ({ items: [], bubbles: [] }) };
      if (name.endsWith('/profile')) return { profileActivity: () => ({ notes: 0, bubbles: 0 }) };
      if (name.endsWith('/tokens')) return { spacing: {} };
      if (name.endsWith('/browser')) return {};
      if (name.endsWith('/local')) return {};
      if (name.endsWith('/authValidation')) return { validatePasswordChange };
      if (name.endsWith('/transport')) return {};
      if (name.endsWith('/client')) return {};
      if (name.endsWith('/MotionAwareModal')) return { MotionAwareModal: () => null };
      for (const component of ['AppearanceSheet', 'EditProfileSheet', 'ProfileAvatar', 'BottomNavigation'])
        if (name.endsWith('/' + component)) return { [component]: () => React.createElement('i', { 'data-component': component }) };
      throw new Error('Unexpected dependency: ' + name);
    };
    const code = ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const original = require;
    new Function('require', 'module', 'exports', '__DEV__', code)(name => name === 'react/jsx-runtime' ? { jsx: (type, props, key) => React.createElement(type, { ...props, key }), jsxs: (type, props, key) => React.createElement(type, { ...props, key }), Fragment: React.Fragment } : original(name), module, module.exports, false);
    return module.exports;
  };
  const component = load(path);
  return renderToStaticMarkup(React.createElement(component.default || component.AuthExperience || component.NativeAccountSettings, props));
}

test('Welcome, login and signup render the shared brand logo without Appearance or profile avatars', () => {
  for (const mode of ['light', 'dark']) for (const kind of ['welcome', 'login', 'signup']) {
    const html = render('../src/components/AuthExperience.tsx', { kind }, mode);
    assert.match(html, /Bubble logo/); assert.doesNotMatch(html, /Appearance|ProfileAvatar|◌/);
    assert.match(html, /Log In/); assert.match(html, /Create Account/);
  }
});
test('Release authentication exposes private tester access only with the explicit build flag', () => {
  const previous = process.env.EXPO_PUBLIC_PRIVATE_BETA_ACCESS;
  try {
    delete process.env.EXPO_PUBLIC_PRIVATE_BETA_ACCESS;
    assert.doesNotMatch(render('../src/components/AuthExperience.tsx', { kind: 'login' }), /Private beta access/);
    process.env.EXPO_PUBLIC_PRIVATE_BETA_ACCESS = '1';
    for (const kind of ['login', 'signup']) {
      const html = render('../src/components/AuthExperience.tsx', { kind });
      assert.match(html, /Private beta access/);
      assert.doesNotMatch(html, /Appearance/);
    }
  } finally {
    if (previous === undefined) delete process.env.EXPO_PUBLIC_PRIVATE_BETA_ACCESS;
    else process.env.EXPO_PUBLIC_PRIVATE_BETA_ACCESS = previous;
  }
});
test('You retains Appearance and the actual avatar while displaying standalone Log Out', () => {
  const html = render('../src/app/(app)/you.tsx');
  assert.match(html, /Appearance/); assert.match(html, /Security/); assert.match(html, /Log Out/); assert.match(html, /ProfileAvatar/);
});
test('native Security offers Change Password and keeps the consent review, without Log Out', () => {
  const html = render('../src/components/NativeAccountSettings.tsx');
  assert.match(html, /Change Password/); assert.match(html, /Review existing device content/); assert.doesNotMatch(html, /Log Out/);
});
test('password form uses three secure fields with Save, Cancel and show controls', () => {
  const html = render('../src/app/(app)/change-password.tsx');
  for (const label of ['Current password', 'New password', 'Confirm new password', 'Save Changes', 'Cancel', 'Show passwords']) assert.ok(html.includes(label));
  assert.equal((html.match(/type="password"/g) || []).length, 3);
});
test('password change validates missing, weak, repeated, mismatched and Unicode byte-limited values', () => {
  assert.equal(validatePasswordChange('old-test-password', 'new-test-password', 'new-test-password'), null);
  for (const fields of [['', 'new-test-password', 'new-test-password'], ['old', 'short', 'short'], ['old', 'new-test-password', 'different'], ['same-test-password', 'same-test-password', 'same-test-password'], ['old', '😀'.repeat(19), '😀'.repeat(19)]]) assert.ok(validatePasswordChange(...fields));
  assert.equal(validatePasswordChange('old', '😀'.repeat(18), '😀'.repeat(18)), null);
});
