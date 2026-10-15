import { useAccount } from '../state/Account';
import { accentPalette, themedAvatarColor } from '../theme/appearance';
import { useTheme } from '../theme/Theme';
import type { ThemeColors } from '../theme/appearance';
import { useEffect, useRef, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { BIO_LIMIT, DISPLAY_NAME_LIMIT, validateProfile } from '../utils/profile';
import { useNavigation } from 'expo-router';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { Profile } from '../state/Profile';
import { createFormStyles } from './AddPreview';
import { ConfirmDialog } from './ConfirmDialog';
import { ProfileAvatar } from './ProfileAvatar';

const avatarColors = accentPalette;

export function EditProfileSheet({ profile, onSave, onClose }: { profile: Profile; onSave: (profile: Profile) => void | Promise<unknown>; onClose: () => void }) {
  const account=useAccount();
  const [avatarReference,setAvatarReference]=useState(profile.avatarReference??'');
  const { colors, mode } = useTheme();
  const styles = createFormStyles(colors);
  const local = createLocal(colors);
  const navigation = useNavigation();
  const [name, setName] = useState(profile.displayName);
  const [avatarColor, setAvatarColor] = useState(profile.avatarColor);
  const [bio, setBio] = useState(profile.bio);
  const [imageUri, setImageUri] = useState(profile.imageUri);
  const [avatarEmoji, setAvatarEmoji] = useState(profile.avatarEmoji ?? '');
  const [picking, setPicking] = useState(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const [error, setError] = useState('');
  const [discardOpen, setDiscardOpen] = useState(false);
  const blockedAction = useRef<Parameters<typeof navigation.dispatch>[0] | null>(null);
  const bypass = useRef(false);
  const saving = useRef(false);
  const dirty = name !== profile.displayName || avatarColor !== profile.avatarColor || bio !== profile.bio || imageUri !== profile.imageUri || avatarEmoji !== (profile.avatarEmoji ?? '') || avatarReference !== (profile.avatarReference??'');

  useEffect(() => navigation.addListener('beforeRemove', (event) => {
    if (bypass.current || !dirty) return;
    event.preventDefault();
    blockedAction.current = event.data.action;
    setDiscardOpen(true);
  }), [navigation, dirty]);

  const leave = () => { bypass.current = true; onClose(); };
  const attemptClose = () => { if (dirty) setDiscardOpen(true); else leave(); };
  const discard = () => {
    bypass.current = true;
    setDiscardOpen(false);
    onClose();
    if (blockedAction.current) navigation.dispatch(blockedAction.current);
  };
  const pickImage = async () => {
    setPicking(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85, base64: Platform.OS === 'web' });
      if (!mounted.current) return;
      if (!result.canceled && result.assets?.[0]) { setImageUri(Platform.OS === 'web' && result.assets[0].base64 ? `data:${result.assets[0].mimeType || 'image/jpeg'};base64,${result.assets[0].base64}` : result.assets[0].uri); setError(''); }
    } catch {
      if (mounted.current) setError('Could not open your photos. Please try again.');
    } finally {
      if (mounted.current) setPicking(false);
    }
  };
  const save = async () => {
    if (saving.current) return;
    const displayName = name.trim();
    const validation = validateProfile(name, bio);
    if (validation) { setError(validation); return; }
    saving.current = true;
    try { await onSave({ displayName, avatarColor, bio: bio.trim(), imageUri, avatarEmoji: avatarEmoji.trim() || undefined,avatarReference:avatarReference||null });bypass.current=true; }
    catch(problem){setError(problem instanceof Error?problem.message:'Could not save the profile.');}
    finally {saving.current=false;}
  };

  return <Modal visible transparent animationType="slide" onRequestClose={attemptClose}>
    <KeyboardAvoidingView style={styles.scrim} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Pressable style={StyleSheet.absoluteFill} onPress={attemptClose} />
      <View style={[styles.sheet, local.sheet]} accessibilityViewIsModal>
        <View style={styles.handle} />
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Edit profile</Text>
          <Text style={styles.intro}>Make this space feel like yours.</Text>
          <View style={local.preview}><ProfileAvatar profile={{ displayName: name, avatarColor, bio, imageUri, avatarEmoji }} size={72} /></View>
          {account.mode==='local' ? <><Pressable accessibilityRole="button" disabled={picking} accessibilityState={{ disabled: picking }} onPress={pickImage} style={styles.cancel}><Text style={styles.cancelText}>{picking ? 'Opening photos…' : imageUri ? 'Change photo' : 'Choose photo'}</Text></Pressable>
          {imageUri ? <Pressable accessibilityRole="button" onPress={() => setImageUri(undefined)} style={styles.cancel}><Text style={styles.cancelText}>Remove photo</Text></Pressable> : null}
          </> : <><Text style={styles.label}>Avatar reference</Text><Text style={styles.intro}>Existing avatar IDs only. Photos and uploads remain local; account images are not served yet.</Text><TextInput accessibilityLabel="Avatar reference" value={avatarReference} onChangeText={setAvatarReference} maxLength={43} placeholder="avatar:UUID (or leave empty)" style={styles.input} /></>}
          <Text style={styles.label}>Display name *</Text>
          <TextInput accessibilityLabel="Display name" autoCapitalize="words" style={styles.input} value={name} onChangeText={(value) => { setName(value); setError(''); }} maxLength={DISPLAY_NAME_LIMIT} placeholder="Your name" placeholderTextColor={colors.muted} />
          <Text style={styles.label}>Short bio</Text>
          <TextInput accessibilityLabel="Short bio" multiline textAlignVertical="top" style={[styles.input, local.bio]} value={bio} onChangeText={(value) => { setBio(value); setError(''); }} maxLength={BIO_LIMIT} placeholder="A little about you" placeholderTextColor={colors.muted} />
          <Text style={local.counter}>{bio.length}/{BIO_LIMIT}</Text>
          {account.mode==='local' ? <><Text style={styles.label}>Avatar emoji</Text>
          <Text style={styles.intro}>Choose a face or enter your favorite emoji. Your photo takes priority; remove it to show your emoji.</Text>
          <View style={local.emojis}>{['🐱', '🐻', '🐰', '🦊', '🐼', '🐸', '🌷', '✨'].map((emoji) => <Pressable key={emoji} accessibilityRole="button" accessibilityLabel={`Use ${emoji} avatar`} accessibilityState={{ selected: avatarEmoji === emoji }} onPress={() => setAvatarEmoji(emoji)} style={[local.emoji, avatarEmoji === emoji && local.emojiSelected]}><Text style={local.emojiText}>{emoji}</Text></Pressable>)}</View>
          <TextInput accessibilityLabel="Custom avatar emoji" value={avatarEmoji} onChangeText={setAvatarEmoji} maxLength={16} placeholder="Enter an emoji" placeholderTextColor={colors.muted} style={styles.input} />
          <Pressable accessibilityRole="button" onPress={() => setAvatarEmoji('')} style={styles.cancel}><Text style={styles.cancelText}>Use my initial</Text></Pressable>
          <Text style={styles.label}>Avatar color</Text>
          <View style={styles.swatches}>{avatarColors.map((option) => <Pressable key={option.name} accessibilityRole="button" accessibilityLabel={`${option.name} avatar color${avatarColor === option.value ? ', selected' : ''}`} accessibilityState={{ selected: avatarColor === option.value }} onPress={() => setAvatarColor(option.value)} style={[styles.swatch, { backgroundColor: themedAvatarColor(option.value, mode) }, avatarColor === option.value && styles.swatchSelected]}><Text style={styles.swatchCheck}>{avatarColor === option.value ? '✓' : ''}</Text></Pressable>)}</View>
          </> : null}
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          <Pressable accessibilityRole="button" onPress={save} style={styles.save}><Text style={styles.saveText}>Save changes</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={attemptClose} style={styles.cancel}><Text style={styles.cancelText}>Cancel</Text></Pressable>
        </ScrollView>
      </View>
      <ConfirmDialog visible={discardOpen} title="Discard changes?" message="Your unsaved edits will be lost." confirmLabel="Discard changes" onCancel={() => setDiscardOpen(false)} onConfirm={discard} destructive={false} embedded />
    </KeyboardAvoidingView>
  </Modal>;
}

const createLocal = (colors: ThemeColors) => StyleSheet.create({ emojis: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }, emoji: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24, borderWidth: 2, borderColor: colors.border }, emojiSelected: { borderColor: colors.action, backgroundColor: colors.lavenderSoft }, emojiText: { fontSize: 25 }, sheet: { width: '100%', maxWidth: 560, alignSelf: 'center' }, bio: { minHeight: 94 }, counter: { color: colors.muted, fontSize: 12, textAlign: 'right', marginTop: 6 }, preview: { alignItems: 'center', paddingVertical: 9 } });
