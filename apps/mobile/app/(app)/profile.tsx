import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppHeader, BottomNav, colors, GreenPanel, Screen, SoftCard } from "../../components/ui";
import { useAuthStore } from "../../stores/auth.store";

export default function ProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const name = user?.fullName || "Amina Wanjiru";
  const phone = user?.phone ? `+${user.phone}` : "+254 712 345 678";

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
              <Text style={styles.statValue}>3</Text>
              <Text style={styles.statLabel}>Chamas</Text>
            </View>
            <View style={styles.profileStat}>
              <Text style={styles.statValue}>KES 313K</Text>
              <Text style={styles.statLabel}>Saved</Text>
            </View>
          </View>
        </GreenPanel>

        <Section title="ACCOUNT" items={["M-Pesa & payment methods", "Security & PIN", "Notifications"]} icons={["▭", "◇", "⌁"]} />
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

function Section({ title, items, icons }: { title: string; items: string[]; icons: string[] }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <SoftCard style={styles.sectionCard}>
        {items.map((item, index) => (
          <View key={item} style={[styles.option, index === items.length - 1 ? styles.optionLast : null]}>
            <View style={styles.optionLeft}>
              <Text style={styles.optionIcon}>{icons[index]}</Text>
              <Text style={styles.optionText}>{item}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </View>
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
