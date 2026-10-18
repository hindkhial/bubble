import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useEffect, useState } from 'react';
import { useAccount } from '../state/Account';
import { ACCOUNT_IMAGE } from '../api/library';
import { useTheme } from '../theme/Theme';
import type { ImageSourcePropType, StyleProp, ViewStyle } from 'react-native';

export function CoverPhoto({ source, style }: { source: ImageSourcePropType; style?: StyleProp<ViewStyle> }) {
  const uri=source&&typeof source==='object'&&!Array.isArray(source)&&'uri' in source?source.uri:undefined;
  if(uri?.startsWith(ACCOUNT_IMAGE))return <AccountCover id={uri.slice(ACCOUNT_IMAGE.length)} style={style}/>;
  return (
    <View style={[styles.frame, style]}>
      <Image source={source} resizeMode="contain" style={styles.image} accessible={false} />
    </View>
  );
}

function AccountCover({id,style}:{id:string;style?:StyleProp<ViewStyle>}) {
  const account=useAccount();
  const {colors}=useTheme();
  const [uri,setUri]=useState<string>();const [error,setError]=useState(false);const [retry,setRetry]=useState(0);
  useEffect(()=>{
    let active=true;const controller=new AbortController();setUri(undefined);setError(false);
    if(account.user)void account.repository.api.request<{dataUri:string}>('GET','/library/'+id+'/image',undefined,controller.signal)
      .then(value=>{if(active)setUri(value.dataUri);})
      .catch(problem=>{if(active){setError(true);account.reportError(problem);}});
    return()=>{active=false;controller.abort();};
  },[id,account.user?.id,retry]);
  return <View style={[styles.frame,style,{backgroundColor:colors.lavender}]}>{uri?<Image source={{uri}} resizeMode="contain" style={styles.image} accessible={false}/>:error?<Pressable accessibilityRole="button" accessibilityLabel="Retry loading photo" onPress={()=>setRetry(value=>value+1)} style={styles.retry}><Text style={{color:colors.text}}>Photo unavailable · Retry</Text></Pressable>:<Text style={{color:colors.text}} accessibilityLiveRegion="polite">Loading photo…</Text>}</View>;
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden', backgroundColor: '#E8DEF3' },
  image: { width: '100%', height: '100%' },
  retry: {flex:1,minHeight:48,alignItems:'center',justifyContent:'center'},
});
