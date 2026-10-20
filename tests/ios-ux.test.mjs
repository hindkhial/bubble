import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

function load(file, dependencies) {
  const module = { exports: {} };
  const code = ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function('require', 'module', 'exports', code)(name => {
    if (!(name in dependencies)) throw new Error('Unexpected import: ' + name);
    return dependencies[name];
  }, module, module.exports);
  return module.exports;
}

test('actual native announcement hook announces feedback on iOS only and ignores empty messages', () => {
  for (const OS of ['ios', 'android', 'web']) {
    const announcements = [], effects = [];
    const { useAnnouncement } = load('../src/accessibility/useAnnouncement.ts', {
      react: { useEffect: (effect, deps) => { effects.push(deps); effect(); } },
      'react-native': { Platform: { OS }, AccessibilityInfo: { announceForAccessibility: message => announcements.push(message) } },
    });
    useAnnouncement('Could not save. Your draft is retained.');
    useAnnouncement(''); useAnnouncement(undefined);
    assert.deepEqual(announcements, OS === 'ios' ? ['Could not save. Your draft is retained.'] : []);
    assert.deepEqual(effects, [['Could not save. Your draft is retained.'], [''], [undefined]]);
  }
});

test('actual shared form styles keep multiline inputs flexible and remove-photo targets at least 44 points', () => {
  const forms = readFileSync(new URL('../src/components/AddPreview.tsx', import.meta.url), 'utf8');
  const start = forms.indexOf('export const createFormStyles');
  const code = ts.transpileModule(forms.slice(start), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const module = { exports: {} };
  new Function('module', 'exports', 'StyleSheet', code)(module, module.exports, { create: value => value });
  const styles = module.exports.createFormStyles({});
  for (const field of ['description', 'noteBody']) {
    assert.equal(styles[field].height, undefined);
    assert.ok(styles[field].minHeight >= 44);
  }
  assert.ok(styles.remove.minHeight >= 44 && styles.remove.minWidth >= 44);
  for (const button of ['save', 'cancel']) assert.ok(styles[button].paddingVertical >= 12);
});

test('actual confirmation dialog scrolls long content within safe areas and preserves both actions', () => {
  const elements = [];
  const jsx = (type, props) => { const node = { type, props }; elements.push(node); return node; };
  const { ConfirmDialog } = load('../src/components/ConfirmDialog.tsx', {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    './MotionAwareModal': { MotionAwareModal: 'Modal' },
    '../theme/Theme': { useTheme: () => ({ colors: {} }) },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 59, bottom: 34 }) },
    'react-native': { View: 'View', Text: 'Text', Pressable: 'Pressable', ScrollView: 'ScrollView', StyleSheet: { create: value => value, absoluteFill: {} } },
  });
  let cancelled = 0, confirmed = 0;
  ConfirmDialog({ visible: true, title: 'Discard?', message: 'Long text '.repeat(200), confirmLabel: 'Discard changes', onCancel: () => cancelled++, onConfirm: () => confirmed++, embedded: true });
  assert.ok(elements.some(node => node.type === 'ScrollView'));
  const scrim = elements.find(node => node.props.accessibilityViewIsModal);
  assert.deepEqual(scrim.props.style[1], { paddingTop: 59, paddingBottom: 34 });
  const buttons = elements.filter(node => node.type === 'Pressable');
  assert.equal(buttons.length, 2);
  buttons[0].props.onPress(); buttons[1].props.onPress();
  assert.equal(cancelled, 1); assert.equal(confirmed, 1);
});

test('actual bottom navigation retains scalable labels, selected states and route actions', () => {
  const elements = [], routes = [];
  const jsx = (type, props) => { const node = { type, props }; elements.push(node); return node; };
  const { BottomNavigation } = load('../src/components/BottomNavigation.tsx', {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    '../theme/Theme': { useTheme: () => ({ colors: {} }) },
    'expo-router': { useRouter: () => ({ replace: route => routes.push(route) }) },
    './AddPreview': { AddPreview: 'AddPreview' },
    'react-native': { Platform: { OS: 'ios' }, Text: 'Text', Pressable: 'Pressable', View: 'View', StyleSheet: { create: value => value } },
  });
  BottomNavigation({ active: 'home' });
  for (const label of ['Home', 'Search', 'You']) {
    const text = elements.find(node => node.type === 'Text' && node.props.children === label);
    assert.notEqual(text.props.allowFontScaling, false);
  }
  for (const glyph of ['⌂', '⌕', '◌']) {
    const icon = elements.find(node => node.props.children === glyph);
    assert.equal(icon.props.allowFontScaling, false);
    assert.equal(icon.props.accessible, false);
  }
  const tabs = elements.filter(node => node.type === 'Pressable');
  assert.deepEqual(tabs.map(node => node.props.accessibilityState.selected), [true, false, false]);
  for (const tab of tabs) { assert.ok(tab.props.style.minHeight >= 44); tab.props.onPress(); }
  assert.deepEqual(routes, ['/search', '/you']);
});
