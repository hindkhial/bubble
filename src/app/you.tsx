import { AppearanceSheet } from '../components/AppearanceSheet';
import { useTheme } from '../theme/Theme';
import type { ThemeColors } from '../theme/appearance';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomNavigation } from '../components/BottomNavigation';
import { EditProfileSheet } from '../components/EditProfileSheet';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { useProfile } from '../state/Profile';
import { useContent } from '../state/Content';
import { profileActivity } from '../utils/profile';
import { spacing } from '../theme/tokens';

export default function YouScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { profile, updateProfile, storageError } = useProfile();
  const { items, bubbles } = useContent();
  const activity = profileActivity(items, bubbles);
  const [editing, setEditing] = useState(false);
  const [settingOpen, setSettingOpen] = useState<'Appearance' | 'Security' | null>(null);
  const [saved, setSaved] = useState(false);
  return <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text accessibilityRole="header" style={styles.heading}>You</Text>
      {storageError ? <Text accessibilityRole="alert" style={styles.sectionText}>{storageError}</Text> : null}
      <View style={styles.identity}>
        <ProfileAvatar profile={profile} size={72} />
        <View style={styles.identityText}>
          <Text style={styles.name}>{profile.displayName}</Text>
          <Text style={styles.caption}>{profile.bio || 'Your private space'}</Text>
        </View>
      </View>
      <Pressable accessibilityRole="button" onPress={() => { setSaved(false); setEditing(true); }} style={styles.edit}><Text style={styles.editText}>Edit profile</Text></Pressable>
      {saved ? <Text accessibilityLiveRegion="polite" style={styles.saved}>Profile updated.</Text> : null}
      <Text accessibilityRole="header" style={styles.sectionTitle}>Your activity</Text>
      <View style={styles.activity}>
        {[
          { value: activity.notes, label: 'Total notes' },
          { value: activity.bubbles, label: 'Total Bubbles' },
        ].map((stat) => <View key={stat.label} accessible accessibilityLabel={`${stat.label}: ${stat.value}`} style={styles.stat}>
          <Text style={styles.statValue}>{stat.value}</Text><Text style={styles.statLabel}>{stat.label}</Text>
        </View>)}
      </View>
      <Text style={styles.activityHelp}>Every note, list, task, and photo counts as a note. Bubbles include your nested spaces.</Text>
      {!items.length ? <Text style={styles.activityHelp}>A fresh start. Add your first note or list from the Add tab.</Text> : null}
      <Text accessibilityRole="header" style={styles.sectionTitle}>Settings</Text>
      <View style={styles.settings}>
        {(['Appearance', 'Security'] as const).map((setting) => <Pressable key={setting} accessibilityRole="button" onPress={() => setSettingOpen(setting)} style={styles.settingButton}>
          <Text style={styles.settingButtonText}>{setting}</Text>
        </Pressable>)}
      </View>
      <View style={styles.about}>
        <Text accessibilityRole="header" style={styles.settingTitle}>About Bubble</Text>
        <Text style={styles.sectionText}>Bubble is a little space for the things you want to keep close. Gather your notes, lists, photos, and everyday thoughts into Bubbles, and return to them whenever you need a quiet moment.</Text>
        <Text style={styles.sessionNote}>Profile and content are saved in this browser when local storage is available.</Text>
      </View>
    </ScrollView>
    <BottomNavigation active="you" />
    <Modal visible={settingOpen === 'Security'} transparent animationType="fade" onRequestClose={() => setSettingOpen(null)}>
      <View style={styles.scrim}>
        <View style={styles.appearancePanel} accessibilityViewIsModal>
          <Text accessibilityRole="header" style={styles.sectionTitle}>{settingOpen}</Text>
          <Text style={styles.sectionText}>Bubble has no connected account yet. App lock and account security options are not available in this version.</Text>
          <Pressable accessibilityRole="button" onPress={() => setSettingOpen(null)} style={styles.edit}><Text style={styles.editText}>Close</Text></Pressable>
        </View>
      </View>
    </Modal>
    {settingOpen === 'Appearance' ? <AppearanceSheet onClose={() => setSettingOpen(null)} /> : null}
    {editing ? <EditProfileSheet profile={profile} onClose={() => setEditing(false)} onSave={(changes) => { updateProfile(changes); setEditing(false); setSaved(true); }} /> : null}
  </SafeAreaView>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(52,46,56,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  appearancePanel: { width: '100%', maxWidth: 390, padding: 24, backgroundColor: colors.surface, borderRadius: spacing.radius },
  screen: { flex: 1, backgroundColor: colors.background },
  content: { width: '100%', maxWidth: 640, alignSelf: 'center', paddingHorizontal: spacing.page, paddingTop: 15, paddingBottom: 32 },
  heading: { color: colors.text, fontSize: 29, fontWeight: '700', marginBottom: 27 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  identityText: { flex: 1, minWidth: 0 },
  name: { color: colors.text, fontSize: 22, lineHeight: 28, fontWeight: '700' },
  caption: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 5 },
  edit: { alignSelf: 'flex-start', minHeight: 48, paddingHorizontal: 21, borderRadius: 24, backgroundColor: colors.lavenderSoft, alignItems: 'center', justifyContent: 'center', marginTop: 22, marginBottom: 20 },
  editText: { color: colors.action, fontSize: 14, fontWeight: '700' },
  saved: { color: colors.action, fontSize: 14, marginBottom: 18 },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '700', marginTop: 12, marginBottom: 14 },
  activity: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { flexGrow: 1, flexBasis: 100, backgroundColor: colors.lavenderSoft, borderRadius: 20, padding: 16 },
  statValue: { color: colors.text, fontSize: 25, fontWeight: '700', marginBottom: 5 },
  statLabel: { color: colors.action, fontSize: 13, lineHeight: 19 },
  activityHelp: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 10, marginBottom: 12 },
  settings: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  settingButton: { minHeight: 56, paddingHorizontal: 28, borderRadius: 28, backgroundColor: colors.lavender, justifyContent: 'center', alignItems: 'center' },
  settingButtonText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  settingTitle: { color: colors.text, fontSize: 15, fontWeight: '700', marginBottom: 7 },
  sectionText: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  sessionNote: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 12 },
  about: { marginTop: 24, paddingHorizontal: 4 },
});
