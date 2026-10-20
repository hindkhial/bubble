import { useEffect } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

// Live regions cover web/Android. VoiceOver needs an explicit announcement.
// Depend on the message so unrelated renders do not repeat private feedback.
export function useAnnouncement(message: string | undefined) {
  useEffect(() => {
    if (Platform.OS === 'ios' && message) AccessibilityInfo.announceForAccessibility(message);
  }, [message]);
}
