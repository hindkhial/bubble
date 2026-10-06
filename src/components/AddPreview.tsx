import { useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { newChecklistRow } from '../data/sample';
import type { ChecklistRow } from '../data/sample';
import { useContent } from '../state/Content';
import { colors } from '../theme/tokens';
import { ChecklistEditorRows } from './ChecklistEditorRows';

type Step = 'menu' | 'bubble' | 'note' | 'photo' | 'checklist' | 'destination';
type PickedPhoto = { uri: string; ratio: number };
export const bubblePalette = [
  { name: 'Lilac', value: colors.lavender },
  { name: 'Soft lavender', value: colors.lavenderSoft },
  { name: 'Deep lavender', value: colors.lavenderDeep },
];
const palette = bubblePalette;

export function AddPreview({ parentId = null }: { parentId?: string | null }) {
  const router = useRouter();
  const { bubbles, bubbleById, createBubble, createNote, createPhoto, createChecklist } = useContent();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState<Step>('menu');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<string>(colors.lavender);
  const [coverPhoto, setCoverPhoto] = useState<PickedPhoto | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [body, setBody] = useState('');
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [photoTitle, setPhotoTitle] = useState('');
  const [photoDescription, setPhotoDescription] = useState('');
  const [checklistTitle, setChecklistTitle] = useState('');
  const [checklistRows, setChecklistRows] = useState<ChecklistRow[]>(() => [newChecklistRow()]);
  const [destination, setDestination] = useState<string | null>(parentId);
  const [error, setError] = useState('');
  const [returnToFile, setReturnToFile] = useState<'note' | 'photo' | 'checklist' | null>(null);
  const [destinationReturn, setDestinationReturn] = useState<'note' | 'photo' | 'checklist'>('note');
  const [pendingBubble, setPendingBubble] = useState<{ title: string; description: string; color: string; cover?: { uri: string }; cardImageRatio?: number } | null>(null);
  const saving = useRef(false);

  const reset = () => {
    setStep('menu'); setTitle(''); setDescription(''); setColor(colors.lavender); setCoverPhoto(null);
    setNoteTitle(''); setBody(''); setPhoto(null); setPhotoTitle(''); setPhotoDescription(''); setChecklistTitle(''); setChecklistRows([newChecklistRow()]);
    setDestination(parentId); setError(''); setReturnToFile(null); setDestinationReturn('note'); setPendingBubble(null);
  };
  const close = () => { setVisible(false); reset(); };
  const open = () => { reset(); saving.current = false; setVisible(true); };
  const pickImage = async (target: 'cover' | 'photo') => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const picked = { uri: asset.uri, ratio: asset.width && asset.height ? asset.height / asset.width : 1 };
      if (target === 'cover') setCoverPhoto(picked);
      else setPhoto(picked);
      setError('');
    } catch {
      setError('Could not open your photos. Please try again.');
    }
  };
  const saveBubble = () => {
    if (saving.current) return;
    if (!title.trim()) { setError('Please give your Bubble a title.'); return; }
    saving.current = true;
    const cover = coverPhoto ? { uri: coverPhoto.uri } : undefined;
    const cardImageRatio = coverPhoto?.ratio;
    if (returnToFile) {
      setPendingBubble({ title: title.trim(), description: description.trim(), color, cover, cardImageRatio });
      setDestination('__pending__'); setTitle(''); setDescription(''); setError('');
      setStep(returnToFile); setReturnToFile(null); saving.current = false;
    } else {
      createBubble({ title, description, color, parentId, cover, cardImageRatio });
      close();
    }
  };
  const saveNote = () => {
    if (saving.current) return;
    if (!body.trim()) { setError('Write a little text before saving your note.'); return; }
    if (!destination || (destination !== '__pending__' && !bubbleById(destination))) { setError('Choose a Bubble for this note.'); return; }
    saving.current = true;
    const destinationId = pendingBubble && destination === '__pending__'
      ? createBubble({ ...pendingBubble, parentId: null }).id : destination;
    createNote({ title: noteTitle, body, bubbleId: destinationId });
    close();
    if (destinationId !== parentId) router.push(`/bubble/${destinationId}`);
  };
  const savePhoto = () => {
    if (saving.current) return;
    if (!photo) { setError('Choose a photo before saving.'); return; }
    if (!destination || (destination !== '__pending__' && !bubbleById(destination))) { setError('Choose a Bubble for this photo.'); return; }
    saving.current = true;
    const destinationId = pendingBubble && destination === '__pending__'
      ? createBubble({ ...pendingBubble, parentId: null }).id : destination;
    createPhoto({ title: photoTitle, description: photoDescription, bubbleId: destinationId, image: { uri: photo.uri }, cardImageRatio: photo.ratio });
    close();
    if (destinationId !== parentId) router.push(`/bubble/${destinationId}`);
  };
  const saveChecklist = () => {
    if (saving.current) return;
    if (!checklistRows.some((row) => row.text.trim())) { setError('Add at least one checklist item before saving.'); return; }
    if (!destination || (destination !== '__pending__' && !bubbleById(destination))) { setError('Choose a Bubble for this checklist.'); return; }
    saving.current = true;
    const destinationId = pendingBubble && destination === '__pending__'
      ? createBubble({ ...pendingBubble, parentId: null }).id : destination;
    createChecklist({ title: checklistTitle, rows: checklistRows, bubbleId: destinationId });
    close();
    if (destinationId !== parentId) router.push(`/bubble/${destinationId}`);
  };

  return <>
    <Pressable accessibilityRole="button" accessibilityLabel="Add content" onPress={open} style={styles.button}><Text style={styles.buttonText}>＋ Add</Text></Pressable>
    <Modal animationType="slide" transparent visible={visible} onRequestClose={close}>
      <KeyboardAvoidingView style={styles.scrim} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {step === 'menu' && <>
              <Text style={styles.title}>Add something</Text>
              <Text style={styles.intro}>Choose what you want to keep.</Text>
              <Pressable accessibilityRole="button" onPress={() => { setError(''); setStep('bubble'); }} style={styles.choice}><Text style={styles.choiceIcon}>◌</Text><View><Text style={styles.choiceTitle}>Bubble</Text><Text style={styles.choiceHelp}>A collection for things that belong together</Text></View><Text style={styles.chevron}>›</Text></Pressable>
              <Pressable accessibilityRole="button" onPress={() => { setError(''); setStep('note'); }} style={styles.choice}><Text style={styles.choiceIcon}>✎</Text><View><Text style={styles.choiceTitle}>Note</Text><Text style={styles.choiceHelp}>Write a thought, list, or link</Text></View><Text style={styles.chevron}>›</Text></Pressable>
              <Pressable accessibilityRole="button" onPress={() => { setError(''); setStep('photo'); }} style={styles.choice}><Text style={styles.choiceIcon}>▧</Text><View><Text style={styles.choiceTitle}>Photo</Text><Text style={styles.choiceHelp}>Keep an image with its details</Text></View><Text style={styles.chevron}>›</Text></Pressable>
              <Pressable accessibilityRole="button" onPress={() => { setError(''); setStep('checklist'); }} style={styles.choice}><Text style={styles.choiceIcon}>☑</Text><View><Text style={styles.choiceTitle}>Checklist</Text><Text style={styles.choiceHelp}>A list to work through, together in one Bubble</Text></View><Text style={styles.chevron}>›</Text></Pressable>
            </>}
            {step === 'bubble' && <>
              <Text style={styles.title}>New Bubble</Text>
              <Text style={styles.intro}>{returnToFile ? `Create a home for your ${returnToFile} first.` : parentId ? `Inside ${bubbleById(parentId)?.title ?? 'this Bubble'}` : 'In Your Bubbles'}</Text>
              <Text style={styles.label}>Title *</Text>
              <TextInput accessibilityLabel="Bubble title" style={styles.input} placeholder="Give it a name" placeholderTextColor={colors.muted} value={title} onChangeText={(value) => { setTitle(value); setError(''); }} maxLength={80} />
              <Text style={styles.label}>Description (optional)</Text>
              <TextInput accessibilityLabel="Bubble description" style={[styles.input, styles.description]} placeholder="What's this Bubble for?" placeholderTextColor={colors.muted} multiline textAlignVertical="top" value={description} onChangeText={setDescription} maxLength={280} />
              <Text style={styles.label}>Cover photo (optional)</Text>
              {coverPhoto && <Image source={{ uri: coverPhoto.uri }} style={styles.imagePreview} resizeMode="cover" accessibilityLabel="Selected Bubble cover" />}
              <Pressable accessibilityRole="button" onPress={() => pickImage('cover')} style={styles.pick}><Text style={styles.pickText}>{coverPhoto ? 'Change cover photo' : 'Choose cover photo'}</Text></Pressable>
              {coverPhoto && <Pressable accessibilityRole="button" onPress={() => setCoverPhoto(null)} style={styles.remove}><Text style={styles.removeText}>Remove photo</Text></Pressable>}
              <Text style={styles.label}>Color</Text>
              <View style={styles.swatches}>{palette.map((option) => <Pressable key={option.name} accessibilityRole="button" accessibilityLabel={`${option.name} color${color === option.value ? ', selected' : ''}`} onPress={() => setColor(option.value)} style={[styles.swatch, { backgroundColor: option.value }, color === option.value && styles.swatchSelected]}><Text style={styles.swatchCheck}>{color === option.value ? '✓' : ''}</Text></Pressable>)}</View>
              <Text style={styles.help}>The lavender cover is used when no photo is chosen.</Text>
              {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
              <Pressable accessibilityRole="button" onPress={saveBubble} style={styles.save}><Text style={styles.saveText}>Create Bubble</Text></Pressable>
            </>}
            {step === 'note' && <>
              <Text style={styles.title}>New note</Text>
              <Text style={styles.label}>Save to</Text>
              {bubbles.length ? <Pressable accessibilityRole="button" accessibilityLabel="Choose destination Bubble" onPress={() => { setDestinationReturn('note'); setError(''); setStep('destination'); }} style={styles.destination}><Text style={styles.destinationText}>{destination === '__pending__' ? pendingBubble?.title : destination ? bubbleById(destination)?.title ?? 'Choose a Bubble' : 'Choose a Bubble'}</Text><Text style={styles.chevron}>›</Text></Pressable> : pendingBubble ? <View style={styles.destination}><Text style={styles.destinationText}>{pendingBubble.title} (new Bubble)</Text></View> : <Pressable accessibilityRole="button" onPress={() => { setReturnToFile('note'); setStep('bubble'); setError(''); }} style={styles.destination}><Text style={styles.destinationText}>Create a Bubble first</Text><Text style={styles.chevron}>›</Text></Pressable>}
              <Text style={styles.label}>Title (optional)</Text>
              <TextInput accessibilityLabel="Note title" style={styles.input} placeholder="Untitled note" placeholderTextColor={colors.muted} value={noteTitle} onChangeText={setNoteTitle} maxLength={100} />
              <Text style={styles.label}>Your note *</Text>
              <TextInput accessibilityLabel="Note text" style={[styles.input, styles.noteBody]} placeholder="Start writing..." placeholderTextColor={colors.muted} multiline textAlignVertical="top" value={body} onChangeText={(value) => { setBody(value); setError(''); }} />
              {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
              <Pressable accessibilityRole="button" onPress={saveNote} style={styles.save}><Text style={styles.saveText}>Save note</Text></Pressable>
            </>}
            {step === 'photo' && <>
              <Text style={styles.title}>New photo</Text>
              <Text style={styles.label}>Save to</Text>
              {bubbles.length ? <Pressable accessibilityRole="button" accessibilityLabel="Choose destination Bubble" onPress={() => { setDestinationReturn('photo'); setError(''); setStep('destination'); }} style={styles.destination}><Text style={styles.destinationText}>{destination === '__pending__' ? pendingBubble?.title : destination ? bubbleById(destination)?.title ?? 'Choose a Bubble' : 'Choose a Bubble'}</Text><Text style={styles.chevron}>›</Text></Pressable> : pendingBubble ? <View style={styles.destination}><Text style={styles.destinationText}>{pendingBubble.title} (new Bubble)</Text></View> : <Pressable accessibilityRole="button" onPress={() => { setReturnToFile('photo'); setStep('bubble'); setError(''); }} style={styles.destination}><Text style={styles.destinationText}>Create a Bubble first</Text><Text style={styles.chevron}>›</Text></Pressable>}
              <Text style={styles.label}>Photo *</Text>
              {photo && <Image source={{ uri: photo.uri }} style={styles.imagePreview} resizeMode="cover" accessibilityLabel="Selected photo" />}
              <Pressable accessibilityRole="button" onPress={() => pickImage('photo')} style={styles.pick}><Text style={styles.pickText}>{photo ? 'Change photo' : 'Choose photo'}</Text></Pressable>
              <Text style={styles.label}>Title (optional)</Text>
              <TextInput accessibilityLabel="Photo title" style={styles.input} placeholder="Untitled photo" placeholderTextColor={colors.muted} value={photoTitle} onChangeText={setPhotoTitle} maxLength={100} />
              <Text style={styles.label}>Description (optional)</Text>
              <TextInput accessibilityLabel="Photo description" style={[styles.input, styles.noteBody]} placeholder="A memory, details, or links…" placeholderTextColor={colors.muted} multiline textAlignVertical="top" value={photoDescription} onChangeText={setPhotoDescription} />
              {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
              <Pressable accessibilityRole="button" onPress={savePhoto} style={styles.save}><Text style={styles.saveText}>Save photo</Text></Pressable>
            </>}
            {step === 'checklist' && <>
              <Text style={styles.title}>New checklist</Text>
              <Text style={styles.label}>Save to</Text>
              {bubbles.length ? <Pressable accessibilityRole="button" accessibilityLabel="Choose destination Bubble" onPress={() => { setDestinationReturn('checklist'); setError(''); setStep('destination'); }} style={styles.destination}><Text style={styles.destinationText}>{destination === '__pending__' ? pendingBubble?.title : destination ? bubbleById(destination)?.title ?? 'Choose a Bubble' : 'Choose a Bubble'}</Text><Text style={styles.chevron}>›</Text></Pressable> : pendingBubble ? <View style={styles.destination}><Text style={styles.destinationText}>{pendingBubble.title} (new Bubble)</Text></View> : <Pressable accessibilityRole="button" onPress={() => { setReturnToFile('checklist'); setStep('bubble'); setError(''); }} style={styles.destination}><Text style={styles.destinationText}>Create a Bubble first</Text><Text style={styles.chevron}>›</Text></Pressable>}
              <Text style={styles.label}>Title (optional)</Text>
              <TextInput accessibilityLabel="Checklist title" style={styles.input} placeholder="Untitled checklist" placeholderTextColor={colors.muted} value={checklistTitle} onChangeText={setChecklistTitle} maxLength={100} />
              <Text style={styles.label}>Items *</Text>
              <ChecklistEditorRows rows={checklistRows} onChange={(rows) => { setChecklistRows(rows); setError(''); }} />
              {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
              <Pressable accessibilityRole="button" onPress={saveChecklist} style={styles.save}><Text style={styles.saveText}>Save checklist</Text></Pressable>
            </>}
            {step === 'destination' && <>
              <Text style={styles.title}>Choose a Bubble</Text>
              <Text style={styles.intro}>Your {destinationReturn} will appear in this collection.</Text>
              {bubbles.map((bubble) => <Pressable key={bubble.id} accessibilityRole="button" onPress={() => { setDestination(bubble.id); setStep(destinationReturn); setError(''); }} style={styles.destinationChoice}><Text style={styles.destinationText}>{bubble.title}</Text>{destination === bubble.id && <Text style={styles.selected}>✓</Text>}</Pressable>)}
            </>}
            <Pressable accessibilityRole="button" onPress={close} style={styles.cancel}><Text style={styles.cancelText}>Cancel</Text></Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  </>;
}

export const formStyles = StyleSheet.create({
  button: { backgroundColor: colors.action, minHeight: 52, borderRadius: 26, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: colors.white, fontWeight: '700', fontSize: 16 },
  scrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(52,46,56,0.34)' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, paddingBottom: 30, maxHeight: '90%' },
  handle: { width: 42, height: 5, borderRadius: 3, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 20 },
  title: { color: colors.text, fontSize: 24, fontWeight: '700', marginBottom: 7 },
  intro: { color: colors.muted, fontSize: 14, lineHeight: 20, marginBottom: 18 },
  choice: { minHeight: 74, borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  choiceIcon: { color: colors.action, backgroundColor: colors.lavenderSoft, borderRadius: 18, overflow: 'hidden', width: 38, height: 38, lineHeight: 38, textAlign: 'center', fontSize: 24 },
  choiceTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  choiceHelp: { color: colors.muted, fontSize: 11, marginTop: 3 },
  chevron: { color: colors.action, marginLeft: 'auto', fontSize: 25 },
  label: { color: colors.text, fontWeight: '700', fontSize: 13, marginBottom: 7, marginTop: 12 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 16, backgroundColor: colors.white, paddingHorizontal: 14, paddingVertical: 12, color: colors.text, fontSize: 15, minHeight: 48 },
  description: { height: 86 }, noteBody: { height: 160 },
  imagePreview: { width: '100%', height: 130, borderRadius: 18, marginBottom: 8, backgroundColor: colors.lavenderSoft },
  pick: { minHeight: 48, borderRadius: 16, borderWidth: 1, borderColor: colors.action, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.lavenderSoft },
  pickText: { color: colors.action, fontSize: 14, fontWeight: '700' },
  remove: { paddingVertical: 8, alignSelf: 'center' }, removeText: { color: colors.muted, fontSize: 12 },
  swatches: { flexDirection: 'row', gap: 12, marginTop: 4 },
  swatch: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  swatchSelected: { borderWidth: 2, borderColor: colors.action },
  swatchCheck: { color: colors.action, fontSize: 19, fontWeight: '700' },
  help: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 10 },
  error: { color: '#9C3F55', fontSize: 13, marginTop: 12 },
  destination: { minHeight: 50, borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center' },
  destinationChoice: { minHeight: 51, borderBottomWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center' },
  destinationText: { color: colors.text, fontSize: 15, fontWeight: '600' }, selected: { color: colors.action, marginLeft: 'auto', fontSize: 18 },
  save: { backgroundColor: colors.action, minHeight: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  saveText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  cancel: { backgroundColor: colors.lavenderSoft, minHeight: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  cancelText: { color: colors.action, fontSize: 15, fontWeight: '700' },
});
const styles = formStyles;
