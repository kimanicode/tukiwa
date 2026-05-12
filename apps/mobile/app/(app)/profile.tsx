import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { AppHeader, BottomNav, colors, GreenPanel, Screen, SoftCard, useThemeColors } from "../../components/ui";
import { useAuthStore } from "../../stores/auth.store";
import { useThemeStore } from "../../stores/theme.store";

export default function ProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const theme = useThemeColors();
  const isDark = useThemeStore((state) => state.resolvedTheme === "dark");
  const toggleDarkMode = useThemeStore((state) => state.toggleDarkMode);
  const name = user?.fullName || "Profile";
  const phone = user?.phone ? `+${user.phone}` : "No phone linked";

  return (
    <Screen>
      <AppHeader title="Profile" back />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <GreenPanel style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(name)}</Text>
          </View>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.phone}>{phone}</Text>
          <View style={styles.profileStats}>
            <View style={styles.profileStat}>
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>Chamas</Text>
            </View>
            <View style={styles.profileStat}>
              <Text style={styles.statValue}>KES 0</Text>
              <Text style={styles.statLabel}>Saved</Text>
            </View>
          </View>
        </GreenPanel>

        <Section
          title="ACCOUNT"
          items={["M-Pesa & payment methods", "Security & PIN", "Notifications"]}
          icons={["▭", "◇", "🔔"]}
          onPress={(item) => {
            if (item === "Security & PIN") router.push("/(app)/profile/security");
          }}
        />
        <View style={styles.section}>
          <SoftCard style={styles.sectionCard}>
            <View style={styles.option}>
              <View style={styles.optionLeft}>
                <Text style={[styles.optionIcon, { color: theme.textMuted }]}>◐</Text>
                <View>
                  <Text style={[styles.optionText, { color: theme.text }]}>Dark mode</Text>
                  <Text style={[styles.optionSub, { color: theme.textMuted }]}>Use the low-light Tukiwa theme</Text>
                </View>
              </View>
              <Switch
                value={isDark}
                onValueChange={() => void toggleDarkMode()}
                trackColor={{ false: "#D8D2C4", true: colors.greenLight }}
                thumbColor={isDark ? colors.green : "#F8F4EA"}
              />
            </View>
          </SoftCard>
        </View>
        <Section title="SUPPORT" items={["Help center", "Terms & privacy"]} icons={["?", "□"]} />

        <Pressable style={styles.signOut} onPress={logout}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
        <Text style={styles.version}>Tukiwa v1.0 · Made in Nairobi KE</Text>
      </ScrollView>
      <BottomNav active="Home" />
    </Screen>
  );
}

function Section({
  title,
  items,
  icons,
  onPress
}: {
  title: string;
  items: string[];
  icons: string[];
  onPress?: (item: string) => void;
}) {
  const theme = useThemeColors();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>{title}</Text>
      <SoftCard style={styles.sectionCard}>
        {items.map((item, index) => (
          <Pressable
            key={item}
            style={[styles.option, index === items.length - 1 ? styles.optionLast : null]}
            onPress={() => onPress?.(item)}
          >
            <View style={styles.optionLeft}>
              <Text style={[styles.optionIcon, { color: theme.textMuted }]}>{icons[index]}</Text>
              <Text style={[styles.optionText, { color: theme.text }]}>{item}</Text>
            </View>
            <Text style={[styles.chevron, { color: theme.textMuted }]}>›</Text>
          </Pressable>
        ))}
      </SoftCard>
    </View>
  );
}

function initials(value: string) {
  return value.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 112 },
  profileCard: { alignItems: "center", paddingTop: 20 },
  avatar: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.14)",
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 32,
    borderWidth: 4,
    height: 64,
    justifyContent: "center",
    width: 64
  },
  avatarText: { fontFamily: "sans-serif", color: "#102817", fontSize: 16, fontWeight: "900" },
  name: { fontFamily: "sans-serif", color: colors.white, fontSize: 18, fontWeight: "900", marginTop: 16 },
  phone: { fontFamily: "sans-serif", color: "rgba(255,255,255,0.88)", fontSize: 12, marginTop: 4 },
  profileStats: { flexDirection: "row", gap: 12, marginTop: 18, width: "100%" },
  profileStat: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 18,
    flex: 1,
    paddingVertical: 12
  },
  statValue: { fontFamily: "sans-serif", color: colors.white, fontSize: 14, fontWeight: "900" },
  statLabel: { fontFamily: "sans-serif", color: "rgba(255,255,255,0.88)", fontSize: 10, marginTop: 3 },
  section: { marginTop: 22 },
  sectionTitle: { fontFamily: "sans-serif", color: colors.textMuted, fontSize: 12, fontWeight: "800", letterSpacing: 0.5, marginBottom: 8 },
  sectionCard: { padding: 0 },
  option: {
    alignItems: "center",
    borderBottomColor: colors.line,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 15
  },
  optionLast: { borderBottomWidth: 0 },
  optionLeft: { alignItems: "center", flexDirection: "row", gap: 12 },
  optionIcon: { fontFamily: "sans-serif", color: colors.textMuted, fontSize: 17, width: 18 },
  optionText: { fontFamily: "sans-serif", color: colors.text, fontSize: 14 },
  optionSub: { fontFamily: "sans-serif", color: colors.textMuted, fontSize: 11, marginTop: 3 },
  chevron: { fontFamily: "sans-serif", color: colors.textMuted, fontSize: 24, lineHeight: 24 },
  signOut: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 22,
    paddingVertical: 14
  },
  signOutText: { fontFamily: "sans-serif", color: "#EF4444", fontSize: 14, fontWeight: "900" },
  version: { fontFamily: "sans-serif", color: colors.textMuted, fontSize: 11, marginTop: 18, textAlign: "center" }
});
