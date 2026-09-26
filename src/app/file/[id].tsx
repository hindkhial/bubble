import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useContent } from '../../state/Content';
import { colors, spacing } from '../../theme/tokens';

export default function FileDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { bubbleById, itemById } = useContent();
  const item = itemById(id);
  const bubble = item ? bubbleById(item.bubbleId) : undefined;

  if (!item || !bubble) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.missing}>
          <Text style={styles.title}>File not found</Text>
          <Pressable accessibilityRole="button" onPress={() => router.replace('/')}><Text style={styles.pathLink}>Go Home</Text></Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.toolbar}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.canGoBack() ? router.back() : router.replace(`/bubble/${bubble.id}`)} style={styles.backButton}><Text style={styles.backArrow}>‹</Text></Pressable>
          <Text style={styles.toolbarTitle} numberOfLines={1}>{item.type === 'NOTE' ? 'Note' : 'Photo'}</Text>
        </View>
        <View style={styles.path}>
          <Pressable accessibilityRole="button" onPress={() => router.replace('/')}><Text style={styles.pathLink}>Home</Text></Pressable>
          <Text style={styles.chevron}>›</Text>
          <Pressable accessibilityRole="button" onPress={() => router.push(`/bubble/${bubble.id}`)}><Text style={styles.pathLink} numberOfLines={1}>{bubble.title}</Text></Pressable>
          <Text style={styles.chevron}>›</Text>
          <Text style={styles.pathCurrent} numberOfLines={1}>{item.title}</Text>
        </View>

        {item.type === 'PHOTO' && item.image ? (
          <View style={[styles.photoFrame, { height: Math.min(width * 0.78, 360) }]}>
            <Image source={item.image} resizeMode="contain" style={styles.photo} accessibilityLabel={item.title} />
          </View>
        ) : null}

        <View style={styles.typeBadge}><Text style={styles.typeText}>{item.type === 'NOTE' ? '✎  NOTE' : '▧  PHOTO'}</Text></View>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.meta}>{item.meta}</Text>
        {item.body ? <View style={styles.bodyCard}><Text selectable style={styles.body}>{item.body}</Text></View> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.page, paddingBottom: 48 },
  toolbar: { height: 50, alignItems: 'center', justifyContent: 'center' },
  backButton: { position: 'absolute', left: 0, width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  backArrow: { color: colors.text, fontSize: 35, lineHeight: 38, marginTop: -4 },
  toolbarTitle: { color: colors.text, fontSize: 16, fontWeight: '700', maxWidth: '65%' },
  path: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 7, marginBottom: 20, overflow: 'hidden' },
  pathLink: { color: colors.muted, fontSize: 13 },
  chevron: { color: colors.muted, fontSize: 18 },
  pathCurrent: { color: colors.action, fontSize: 13, fontWeight: '700', flexShrink: 1 },
  photoFrame: { width: '100%', borderRadius: 28, backgroundColor: colors.lavenderSoft, overflow: 'hidden', marginBottom: 23 },
  photo: { width: '100%', height: '100%' },
  typeBadge: { alignSelf: 'flex-start', backgroundColor: colors.lavender, borderRadius: 15, paddingHorizontal: 11, paddingVertical: 6, marginBottom: 11 },
  typeText: { color: colors.action, fontSize: 10, fontWeight: '800', letterSpacing: 0.7 },
  title: { color: colors.text, fontSize: 29, lineHeight: 36, fontWeight: '700' },
  meta: { color: colors.muted, fontSize: 13, marginTop: 8, marginBottom: 22 },
  bodyCard: { backgroundColor: colors.surface, borderRadius: 24, borderWidth: 1, borderColor: colors.border, padding: 20 },
  body: { color: colors.text, fontSize: 16, lineHeight: 25 },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20 },
});
