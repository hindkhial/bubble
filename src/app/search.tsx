import { useState, useEffect } from 'react';
import { useAccount } from '../state/Account';
import type { SampleItem } from '../data/sample';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomNavigation } from '../components/BottomNavigation';
import { CollectionGrid } from '../components/CollectionGrid';
import { useContent } from '../state/Content';
import { usePins } from '../state/Pins';
import { useTheme } from '../theme/Theme';
import { searchEverything, type SearchFilter } from '../utils/dashboard';

export default function SearchScreen() {
  const account=useAccount();
  const { colors } = useTheme();
  const { items, bubbles, storageError } = useContent();
  const { pinsFor } = usePins();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<SearchFilter | 'Bubbles'>('All');
  const pins = new Set([...pinsFor('root'), ...bubbles.flatMap((bubble) => pinsFor(bubble.id))]);
  const [remote,setRemote]=useState<SampleItem[]|null>(null);
  const [searchError,setSearchError]=useState('');
  useEffect(()=>{
    setRemote(null);setSearchError('');
    if(account.mode!=='account'||!account.user||!query.trim())return;
    let active=true;
    const controller=new AbortController();
    const timer=setTimeout(()=>{void account.repository.content(query,controller.signal).then(value=>{if(active)setRemote(value.items);}).catch(error=>{if(active){setSearchError('Search could not finish. Check your connection and try again.');account.reportError(error);}});},250);
    return ()=>{active=false;clearTimeout(timer);controller.abort();};
  },[query,account.mode,account.user?.id,account.items]);
  const searching = account.mode==='account' && !!account.user && !!query.trim() && remote===null && !searchError;
  const unavailable = account.mode==='account' && !account.user;
  const results = searchEverything(account.mode==='account'?[]:bubbles, account.mode==='account'&&query.trim()?remote??[]:items, query, filter, pins);
  return <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      <Text accessibilityRole="header" style={[styles.heading, { color: colors.text }]}>Search</Text>
      <Text style={{ color: colors.muted, marginBottom: 20 }}>{account.mode==='account'?'Search your private account notes and lists. A connection is required.':'Find a thought, a list, or a little detail. All on your device.'}</Text>
      <View style={styles.searchRow}>
        <TextInput accessibilityLabel="Search everything" maxLength={account.mode==='account'?200:undefined} value={query} onChangeText={setQuery} placeholder="Search everything" placeholderTextColor={colors.muted} autoCapitalize="none" autoCorrect={false} style={[styles.input, { color: colors.text, backgroundColor: colors.input, borderColor: colors.border }]} />
        {query ? <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setQuery('')} style={styles.clear}><Text style={{ color: colors.action }}>Clear</Text></Pressable> : null}
      </View>
      <View style={styles.filters}>{(account.mode==='account'?['All','Notes','Lists'] as const:['All','Bubbles','Notes','Lists'] as const).map((option) => <Pressable key={option} accessibilityRole="button" accessibilityState={{ selected: filter === option }} onPress={() => setFilter(option)} style={[styles.filter, { backgroundColor: filter === option ? colors.lavender : colors.surface, borderColor: colors.border }]}><Text style={{ color: colors.text }}>{option}</Text></Pressable>)}</View>
      {storageError ? <Text accessibilityRole="alert" style={{ color: colors.text, marginBottom: 16 }}>{storageError}</Text> : null}
      <Text accessibilityLiveRegion="polite" style={{ color: colors.muted, marginBottom: 12 }}>{unavailable ? 'Open account options to sign in again, or use local mode.' : searching ? 'Searching…' : searchError || `${results.length} ${results.length === 1 ? 'result' : 'results'}`}</Text>
      {unavailable || searching || searchError ? null : results.length ? <CollectionGrid entries={results} scopeId="root" respectEntryScopes /> : <View style={[styles.empty, { backgroundColor: colors.surface }]}><Text style={[styles.emptyTitle, { color: colors.text }]}>{query.trim() ? 'No matching thoughts yet' : 'A little space waiting to be filled'}</Text><Text style={{ color: colors.muted, lineHeight: 21 }}>{query.trim() ? 'Try another word or choose a different filter.' : 'Create a note or checklist from Add, then find it here.'}</Text></View>}
    </ScrollView>
    <BottomNavigation active="search" />
  </SafeAreaView>;
}
const styles = StyleSheet.create({ screen: { flex: 1 }, content: { width: '100%', maxWidth: 720, alignSelf: 'center', padding: 20, paddingBottom: 32 }, heading: { fontSize: 29, fontWeight: '700', marginBottom: 10 }, searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 }, input: { flex: 1, minWidth: 0, minHeight: 52, borderWidth: 1, borderRadius: 18, paddingHorizontal: 16, fontSize: 16 }, clear: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 8 }, filters: { flexWrap: 'wrap', flexDirection: 'row', gap: 10, marginVertical: 18 }, filter: { minHeight: 48, borderRadius: 24, borderWidth: 1, paddingHorizontal: 20, justifyContent: 'center' }, empty: { borderRadius: 24, padding: 24 }, emptyTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8 } });
