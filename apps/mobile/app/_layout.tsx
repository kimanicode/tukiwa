import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { router, Stack } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StatusBar, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { endpoints } from "../lib/api";
import { useAuthStore } from "../stores/auth.store";
import { colors, useThemeColors } from "../components/ui";
import { useThemeStore } from "../stores/theme.store";
import "../global.css";

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());
  const theme = useThemeColors();
  const isDark = useThemeStore((state) => state.resolvedTheme === "dark");
  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.canvas} />
      <QueryClientProvider client={queryClient}>
        <AuthGate />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

function AuthGate() {
  const hydrate = useAuthStore((state) => state.hydrate);
  const setUser = useAuthStore((state) => state.setUser);
  const logout = useAuthStore((state) => state.logout);
  const hydrateTheme = useThemeStore((state) => state.hydrate);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fallback = setTimeout(() => {
      if (!mounted) return;
      router.replace("/(auth)/login");
      setReady(true);
    }, 6000);

    async function boot() {
      try {
        await withTimeout(Promise.all([hydrate(), hydrateTheme()]), 3000);
        const token = useAuthStore.getState().accessToken;
        if (!token) {
          router.replace("/(auth)/login");
          return;
        }
        const status = await withTimeout(endpoints.getAuthStatus(), 8000);
        await setUser(status.user);
        if (!status.isPhoneVerified) {
          router.replace({ pathname: "/(auth)/otp", params: { phone: status.user.phone } });
        }
        else if (!status.isProfileComplete) router.replace("/(auth)/profile-setup");
        else if (!status.hasPinSet) router.replace("/(auth)/set-pin");
        else router.replace("/(app)");
      } catch {
        void logout();
        router.replace("/(auth)/login");
      } finally {
        clearTimeout(fallback);
        if (mounted) setReady(true);
      }
    }
    void boot();
    return () => {
      mounted = false;
      clearTimeout(fallback);
    };
  }, [hydrate, hydrateTheme, logout, setUser]);

  return (
    <View style={styles.root}>
      <Stack screenOptions={{ headerShown: false }} />
      {!ready ? <BootScreen /> : null}
    </View>
  );
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Startup timed out")), ms);
    promise
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timer));
  });
}

function BootScreen() {
  const theme = useThemeColors();
  return (
    <View style={[styles.bootScreen, { backgroundColor: theme.canvas }]}>
      <ActivityIndicator color={colors.green} />
      <Text style={[styles.bootTitle, { color: theme.text }]}>Tukiwa</Text>
      <Text style={[styles.bootText, { color: theme.textMuted }]}>Preparing your chama workspace</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bootScreen: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    backgroundColor: colors.canvas,
    gap: 10,
    justifyContent: "center",
    padding: 24,
    zIndex: 10
  },
  root: { flex: 1 },
  bootTitle: {
    color: colors.text,
    fontFamily: "sans-serif",
    fontSize: 24,
    fontWeight: "900"
  },
  bootText: {
    color: colors.textMuted,
    fontFamily: "sans-serif",
    fontSize: 13,
    fontWeight: "700"
  }
});
