import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomNavigation } from '../components/BottomNavigation';
import { EditProfileSheet } from '../components/EditProfileSheet';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { useProfile } from '../state/Profile';
import { colors, spacing } from '../theme/tokens';

export default function YouScreen() {
  const { profile, updateProfile } = useProfile();
  const [editing, setEditing] = useState(false);
  return <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.heading}>You</Text>
      <View style={styles.identity}>
        <ProfileAvatar profile={profile} size={64} />
        <View style={styles.identityText}>
          <Text style={styles.name} numberOfLines={2}>{profile.displayName}</Text>
          <Text style={styles.caption}>Your private space</Text>
        </View>
      </View>
      <Pressable accessibilityRole="button" onPress={() => setEditing(true)} style={styles.edit}><Text style={styles.editText}>Edit profile</Text></Pressable>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account status</Text>
        <Text style={styles.sectionText}>Demo profile — changes reset when the app restarts.</Text>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About Bubble</Text>
        <Text style={styles.sectionText}>Bubble — a little space for your notes, lists, and everyday thoughts.</Text>
      </View>
    </ScrollView>
    <BottomNavigation active="you" />
    {editing && <EditProfileSheet profile={profile} onClose={() => setEditing(false)} onSave={(changes) => { updateProfile(changes); setEditing(false); }} />}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.page, paddingTop: 15, paddingBottom: 32 },
  heading: { color: colors.text, fontSize: 29, fontWeight: '700', marginBottom: 27 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  identityText: { flex: 1 },
  name: { color: colors.text, fontSize: 22, lineHeight: 28, fontWeight: '700' },
  caption: { color: colors.muted, fontSize: 13, marginTop: 3 },
  edit: { alignSelf: 'flex-start', minHeight: 46, paddingHorizontal: 21, borderRadius: 23, backgroundColor: colors.lavenderSoft, alignItems: 'center', justifyContent: 'center', marginTop: 25, marginBottom: 33 },
  editText: { color: colors.action, fontSize: 14, fontWeight: '700' },
  section: { borderTopWidth: 1, borderColor: colors.border, paddingTop: 19, paddingBottom: 23 },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: '700', marginBottom: 7 },
  sectionText: { color: colors.muted, fontSize: 14, lineHeight: 21 },
});
