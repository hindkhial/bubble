import { useEffect, useRef, useState } from 'react';
import { useNavigation } from 'expo-router';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { Bubble, ChecklistRow, SampleItem } from '../data/sample';
import { colors } from '../theme/tokens';
import { bubblePalette, formStyles as styles } from './AddPreview';
import { ChecklistEditorRows } from './ChecklistEditorRows';
import { ConfirmDialog } from './ConfirmDialog';

type Draft = { title: string; description: string; color: string; body: string; rows: ChecklistRow[] };

export function EditContentSheet({ entry, onSave, onClose }: {
  entry: Bubble | SampleItem;
  onSave: (draft: Draft) => void;
  onClose: () => void;
}) {
  const navigation = useNavigation();
  const isBubble = 'parentId' in entry;
  const isChecklist = !isBubble && entry.type === 'CHECKLIST';
  const initial = {
    title: entry.title,
    description: isBubble ? entry.description : '',
    color: isBubble ? entry.color ?? colors.lavender : colors.lavender,
    body: isBubble ? '' : entry.body,
    rows: isChecklist ? (entry.rows ?? []).map((row) => ({ ...row })) : [],
  };
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [color, setColor] = useState(initial.color);
  const [body, setBody] = useState(initial.body);
  const [rows, setRows] = useState<ChecklistRow[]>(initial.rows);
  const [error, setError] = useState('');
  const [discardOpen, setDiscardOpen] = useState(false);
  const blockedAction = useRef<Parameters<typeof navigation.dispatch>[0] | null>(null);
  const bypass = useRef(false);
  const browserBack = useRef(false);
  const dirtyRef = useRef(false);
  const saving = useRef(false);
  const dirty = title !== initial.title || description !== initial.description || color !== initial.color || body !== initial.body || JSON.stringify(rows) !== JSON.stringify(initial.rows);
  dirtyRef.current = dirty;

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const url = window.location.href;
    const guard = { ...window.history.state, bubbleEditGuard: true };
    window.history.pushState(guard, '', url);
    const onPopState = () => {
      if (bypass.current) return;
      browserBack.current = true;
      window.history.pushState(guard, '', url);
      if (dirtyRef.current) setDiscardOpen(true);
      else {
        bypass.current = true;
        onClose();
        window.history.go(-2);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const leave = () => {
    bypass.current = true;
    onClose();
    if (Platform.OS === 'web') window.history.back();
  };

  useEffect(() => navigation.addListener('beforeRemove', (event) => {
    if (bypass.current || !dirty) return;
    event.preventDefault();
    blockedAction.current = event.data.action;
    setDiscardOpen(true);
  }), [navigation, dirty]);

  const attemptClose = () => {
    if (dirty) setDiscardOpen(true);
    else leave();
  };
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
    if (isBubble && !title.trim()) { setError('Please give your Bubble a title.'); return; }
    if (isChecklist && !rows.some((row) => row.text.trim())) { setError('Add at least one checklist item before saving.'); return; }
    if (!isBubble && !isChecklist && !body.trim()) { setError('Write a little text before saving your note.'); return; }
    saving.current = true;
    bypass.current = true;
    onSave({ title, description, color, body, rows });
    if (Platform.OS === 'web') window.history.back();
  };

  return <>
    <Modal visible animationType="slide" transparent onRequestClose={attemptClose}>
      <KeyboardAvoidingView style={styles.scrim} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={StyleSheet.absoluteFill} onPress={attemptClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>{isBubble ? 'Edit Bubble' : isChecklist ? 'Edit checklist' : 'Edit note'}</Text>
            <Text style={styles.intro}>Your changes will appear in this demo collection.</Text>
            <Text style={styles.label}>Title {isBubble ? '*' : '(optional)'}</Text>
            <TextInput accessibilityLabel={isBubble ? 'Bubble title' : isChecklist ? 'Checklist title' : 'Note title'} style={styles.input} placeholder={isBubble ? 'Give it a name' : isChecklist ? 'Untitled checklist' : 'Untitled note'} placeholderTextColor={colors.muted} value={title} onChangeText={(value) => { setTitle(value); setError(''); }} maxLength={isBubble ? 80 : 100} />
            {isBubble ? <>
              <Text style={styles.label}>Description (optional)</Text>
              <TextInput accessibilityLabel="Bubble description" style={[styles.input, styles.description]} multiline textAlignVertical="top" value={description} onChangeText={setDescription} maxLength={280} />
              <Text style={styles.label}>Color</Text>
              <View style={styles.swatches}>{bubblePalette.map((option) => <Pressable key={option.name} accessibilityRole="button" accessibilityLabel={`${option.name} color${color === option.value ? ', selected' : ''}`} onPress={() => setColor(option.value)} style={[styles.swatch, { backgroundColor: option.value }, color === option.value && styles.swatchSelected]}><Text style={styles.swatchCheck}>{color === option.value ? '✓' : ''}</Text></Pressable>)}</View>
            </> : isChecklist ? <>
              <Text style={styles.label}>Items *</Text>
              <ChecklistEditorRows rows={rows} onChange={(next) => { setRows(next); setError(''); }} />
            </> : <>
              <Text style={styles.label}>Your note *</Text>
              <TextInput accessibilityLabel="Note text" style={[styles.input, styles.noteBody]} multiline textAlignVertical="top" value={body} onChangeText={(value) => { setBody(value); setError(''); }} />
            </>}
            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
            <Pressable accessibilityRole="button" onPress={save} style={styles.save}><Text style={styles.saveText}>Save changes</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={attemptClose} style={styles.cancel}><Text style={styles.cancelText}>Cancel</Text></Pressable>
          </ScrollView>
        </View>
        <ConfirmDialog visible={discardOpen} title="Discard changes?" message="Your unsaved edits will be lost." confirmLabel="Discard changes" onCancel={() => setDiscardOpen(false)} onConfirm={discard} destructive={false} embedded />
      </KeyboardAvoidingView>
    </Modal>
  </>;
}
