import { Alert, Platform, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/context/AuthContext';

// JWT'nin ortadaki (payload) kısmını çözüp içindeki bilgiyi okuyan küçük yardımcı fonksiyon.
// Yeni bir API isteği atmadan, cihazda zaten saklı olan token'dan kullanıcı adını çıkarıyoruz.
function decodeToken(token: string): { sub?: string; exp?: number } | null {
  try {
    const payload = token.split('.')[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export default function SettingsScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const insets = {
    ...safeAreaInsets,
    bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
  };
  const theme = useTheme();
  const { token, logout } = useAuth();

  const decoded = token ? decodeToken(token) : null;
  const username = decoded?.sub ?? 'Bilinmiyor';
  const expiryDate = decoded?.exp ? new Date(decoded.exp * 1000) : null;

  const contentPlatformStyle = Platform.select({
    android: {
      paddingTop: insets.top,
      paddingLeft: insets.left,
      paddingRight: insets.right,
      paddingBottom: insets.bottom,
    },
    web: {
      paddingTop: Spacing.six,
      paddingBottom: Spacing.four,
    },
  });

  function handleLogout() {
    Alert.alert('Çıkış yap', 'Oturumu kapatmak istediğine emin misin?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Çıkış yap', style: 'destructive', onPress: () => logout() },
    ]);
  }

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentInset={insets}
      contentContainerStyle={[styles.contentContainer, contentPlatformStyle]}>
      <ThemedView style={styles.container}>
        <ThemedView style={styles.titleContainer}>
          <ThemedText type="subtitle">Ayarlar</ThemedText>
        </ThemedView>

        <ThemedView style={styles.sectionsWrapper}>
          <ThemedView type="backgroundElement" style={styles.profileCard}>
            <ThemedText type="small" themeColor="textSecondary">
              Giriş yapan kullanıcı
            </ThemedText>
            <ThemedText type="title" style={styles.username}>
              {username}
            </ThemedText>
            {expiryDate && (
              <ThemedText type="small" themeColor="textSecondary">
                Oturum {expiryDate.toLocaleTimeString('tr-TR')} itibarıyla sona eriyor
              </ThemedText>
            )}
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.infoCard}>
            <ThemedText type="smallBold">Sentinel</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Güvenlik açığı tespit ve kriz yönetim sistemi
            </ThemedText>
          </ThemedView>

          <Pressable
            style={({ pressed }) => [styles.logoutButton, pressed && styles.pressed]}
            onPress={handleLogout}>
            <ThemedText type="smallBold" style={styles.logoutText}>
              Çıkış Yap
            </ThemedText>
          </Pressable>
        </ThemedView>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  container: {
    maxWidth: MaxContentWidth,
    flexGrow: 1,
    width: '100%',
  },
  titleContainer: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.six,
  },
  sectionsWrapper: {
    gap: Spacing.four,
    paddingHorizontal: Spacing.four,
  },
  profileCard: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.one,
  },
  username: {
    fontSize: 24,
    lineHeight: 30,
  },
  infoCard: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.one,
  },
  logoutButton: {
    backgroundColor: '#c62828',
    borderRadius: Spacing.three,
    padding: Spacing.four,
    alignItems: 'center',
  },
  logoutText: {
    color: '#fff',
  },
  pressed: {
    opacity: 0.7,
  },
});