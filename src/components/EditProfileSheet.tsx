import { useEffect, useRef, useState } from 'react';
import { useNavigation } from 'expo-router';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { Profile } from '../state/Profile';
import { colors } from '../theme/tokens';
import { formStyles as styles } from './AddPreview';
import { ConfirmDialog } from './ConfirmDialog';
import { ProfileAvatar } from './ProfileAvatar';

const avatarColors = [
  { name: 'Lavender', value: colors.lavenderSoft },
  { name: 'Rose', value: colors.rose },
  { name: 'Sage', value: colors.sage },
  { name: 'Deep lavender', value: colors.lavenderDeep },
];

export function EditProfileSheet({ profile, onSave, onClose }: { profile: Profile; onSave: (profile: Profile) => void; onClose: () => void }) {
  const navigation = useNavigation();
  const [name, setName] = useState(profile.displayName);
  const [avatarColor, setAvatarColor] = useState(profile.avatarColor);
  const [error, setError] = useState('');
  const [discardOpen, setDiscardOpen] = useState(false);
  const blockedAction = useRef<Parameters<typeof navigation.dispatch>[0] | null>(null);
  const bypass = useRef(false);
  const browserBack = useRef(false);
  const dirtyRef = useRef(false);
  const saving = useRef(false);
  const dirty = name !== profile.displayName || avatarColor !== profile.avatarColor;
  dirtyRef.current = dirty;

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const url = window.location.href;
    const guard = { ...window.history.state, bubbleProfileEditGuard: true };
    window.history.pushState(guard, '', url);
    const onPopState = () => {
      if (bypass.current) return;
      browserBack.current = true;
      window.history.pushState(guard, '', url);
      if (dirtyRef.current) setDiscardOpen(true);
      else { bypass.current = true; onClose(); window.history.go(-2); }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => navigation.addListener('beforeRemove', (event) => {
    if (bypass.current || !dirty) return;
    event.preventDefault();
    blockedAction.current = event.data.action;
    setDiscardOpen(true);
  }), [navigation, dirty]);

  const leave = () => { bypass.current = true; onClose(); if (Platform.OS === 'web') window.history.back(); };
  const attemptClose = () => { if (dirty) setDiscardOpen(true); else leave(); };
  const discard = () => {
    bypass.current = true;
    setDiscardOpen(false);
    onClose();
    if (browserBack.current && Platform.OS === 'web') window.history.go(-2);
    else if (Platform.OS === 'web') window.history.back();
    else if (blockedAction.current) navigation.dispatch(blockedAction.current);
  };
  const save = () => {
    if (saving.current) return;
    const displayName = name.trim();
    if (!displayName) { setError('Please enter a display name.'); return; }
    saving.current = true;
    bypass.current = true;
    onSave({ displayName, avatarColor });
    if (Platform.OS === 'web') window.history.back();
  };

  return <Modal visible transparent animationType="slide" onRequestClose={attemptClose}>
    <KeyboardAvoidingView style={styles.scrim} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Pressable style={StyleSheet.absoluteFill} onPress={attemptClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Edit profile</Text>
          <Text style={styles.intro}>Make this space feel like yours.</Text>
          <View style={local.preview}><ProfileAvatar profile={{ displayName: name, avatarColor }} size={72} /></View>
          <Text style={styles.label}>Display name *</Text>
          <TextInput accessibilityLabel="Display name" autoCapitalize="words" style={styles.input} value={name} onChangeText={(value) => { setName(value); setError(''); }} maxLength={80} placeholder="Your name" placeholderTextColor={colors.muted} />
          <Text style={styles.label}>Avatar color</Text>
          <View style={styles.swatches}>{avatarColors.map((option) => <Pressable key={option.name} accessibilityRole="button" accessibilityLabel={`${option.name} avatar color${avatarColor === option.value ? ', selected' : ''}`} accessibilityState={{ selected: avatarColor === option.value }} onPress={() => setAvatarColor(option.value)} style={[styles.swatch, { backgroundColor: option.value }, avatarColor === option.value && styles.swatchSelected]}><Text style={styles.swatchCheck}>{avatarColor === option.value ? '✓' : ''}</Text></Pressable>)}</View>
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          <Pressable accessibilityRole="button" onPress={save} style={styles.save}><Text style={styles.saveText}>Save changes</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={attemptClose} style={styles.cancel}><Text style={styles.cancelText}>Cancel</Text></Pressable>
        </ScrollView>
      </View>
      <ConfirmDialog visible={discardOpen} title="Discard changes?" message="Your unsaved edits will be lost." confirmLabel="Discard changes" onCancel={() => setDiscardOpen(false)} onConfirm={discard} destructive={false} embedded />
    </KeyboardAvoidingView>
  </Modal>;
}

const local = StyleSheet.create({ preview: { alignItems: 'center', paddingVertical: 9 } });
