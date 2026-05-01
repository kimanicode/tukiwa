import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { BottomNav, colors, GreenPanel, Screen, SoftCard, ui } from "../../components/ui";
import { cents, endpoints, type MyChama } from "../../lib/api";
import { useAuthStore } from "../../stores/auth.store";

const demoChamas: MyChama[] = [
  { role: "MEMBER", nextContributionDue: "2026-05-04", chama: { id: "demo-1", name: "Umoja Sisters Chama", type: "MERRY_GO_ROUND", poolBalance: 48000000 } },
  { role: "TREASURER", nextContributionDue: "2026-05-12", chama: { id: "demo-2", name: "Hustlers Table Banking", type: "TABLE_BANKING", poolBalance: 120000000 } },
  { role: "MEMBER", nextContributionDue: "2026-05-18", chama: { id: "demo-3", name: "Jenga Wealth Group", type: "INVESTMENT", poolBalance: 380000000 } }
];

export default function HomeScreen() {
  const user = useAuthStore((state) => state.user);
  const { data } = useQuery({ queryKey: ["my-chamas"], queryFn: endpoints.getMyChamas });
  const chamas = data?.length ? data : demoChamas;
  const totalSaved = chamas.reduce((sum, item) => sum + (item.chama.poolBalance ?? 0), 0);
  const firstName = user?.fullName?.split(" ")[0] || "Amina";

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <GreenPanel style={styles.hero}>
          <View style={ui.rowBetween}>
            <View style={ui.rowGap}>
              <Pressable style={styles.initials} onPress={() => router.push("/(app)/profile" as never)}>
                <Text style={styles.initialsText}>{initials(user?.fullName || "Amina Wanjiru")}</Text>
              </Pressable>
              <View>
                <Text style={styles.hello}>Karibu,</Text>
                <Text style={styles.name}>{firstName}</Text>
              </View>
            </View>
            <View style={styles.bell}><Text style={styles.bellText}>⌁</Text></View>
          </View>
          <Text style={styles.heroLabel}>TOTAL SAVED</Text>
          <Text style={styles.heroAmount}>{cents(totalSaved || 31290000).replace("KES", "Ksh")}</Text>
          <Text style={styles.heroSub}>Across {chamas.length || 3} active chamas</Text>
          <View style={styles.actions}>
            {[
              ["↙", "Deposit", "/(app)/contribute"],
              ["↗", "Withdraw", "/(app)/wallet"],
              ["+", "New chama", "/(app)/chama/create"],
              ["⌁", "Invest", "/(app)/investments"]
            ].map(([icon, label, href]) => (
              <Pressable key={label} style={styles.action} onPress={() => router.push(href as never)}>
                <Text style={styles.actionIcon}>{icon}</Text>
                <Text style={styles.actionText}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </GreenPanel>

        <SoftCard style={styles.walletStrip}>
          <View>
            <Text style={styles.stripLabel}>Tukiwa wallet</Text>
            <Text style={styles.stripValue}>Ksh 48,350</Text>
          </View>
          <View style={styles.stripRight}>
            <Text style={styles.stripLabel}>M-Pesa linked</Text>
            <Text style={styles.stripPhone}>+254 712 345 678</Text>
          </View>
        </SoftCard>

        <View style={styles.stats}>
          <MiniStat icon="♙" value={String(chamas.length || 3)} label="Chamas" />
          <MiniStat icon="▣" value="KES 32.5K" label="Active loan" accent="orange" />
          <MiniStat icon="⌁" value="+11.2%" label="YTD return" accent="green" />
        </View>

        <View style={ui.rowBetween}>
          <Text style={styles.sectionTitle}>My chamas</Text>
          <Pressable onPress={() => router.push("/(app)/chamas" as never)}>
            <Text style={styles.seeAll}>See all</Text>
          </Pressable>
        </View>

        {chamas.map((item, index) => (
          <ChamaCard key={item.chama.id} item={item} index={index} />
        ))}
      </ScrollView>
      <BottomNav active="Home" />
    </Screen>
  );
}

function MiniStat({ icon, value, label, accent }: { icon: string; value: string; label: string; accent?: "orange" | "green" }) {
  return (
    <SoftCard style={styles.miniStat}>
      <Text style={styles.miniIcon}>{icon}</Text>
      <Text style={[styles.miniValue, accent === "orange" ? styles.orange : accent === "green" ? styles.green : null]}>{value}</Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </SoftCard>
  );
}

function ChamaCard({ item, index }: { item: MyChama; index: number }) {
  const bg = index % 3 === 0 ? colors.green : index % 3 === 1 ? colors.orange : colors.rust;
  return (
    <Pressable style={styles.chamaCard} onPress={() => router.push(`/(app)/chama/${item.chama.id}` as never)}>
      <View style={[styles.chamaAvatar, { backgroundColor: bg }]}>
        <Text style={styles.chamaAvatarText}>{initials(item.chama.name)}</Text>
      </View>
      <View style={styles.chamaBody}>
        <Text style={styles.chamaName}>{item.chama.name}</Text>
        <Text style={styles.chamaType}>{titleCase(item.chama.type)}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>♙ {item.chama.members?.length ?? (index + 1) * 6 + 6}</Text>
          <Text style={styles.meta}>□ {item.nextContributionDue ? new Date(item.nextContributionDue).toLocaleDateString("en-KE", { day: "numeric", month: "short" }) : "4 May"}</Text>
        </View>
      </View>
      <View style={styles.cardRight}>
        <Text style={styles.chevron}>›</Text>
        <Text style={styles.pool}>{compactMoney(item.chama.poolBalance ?? 0)}</Text>
      </View>
    </Pressable>
  );
}

function initials(value: string) {
  return value.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function compactMoney(centsValue: number) {
  const value = centsValue / 100;
  if (value >= 1000000) return `KES ${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `KES ${Math.round(value / 1000)}K`;
  return `KES ${value.toLocaleString("en-KE")}`;
}

const styles = StyleSheet.create({
  content: { paddingBottom: 110 },
  hero: { borderTopLeftRadius: 0, borderTopRightRadius: 0, paddingTop: 26 },
  initials: { alignItems: "center", backgroundColor: "rgba(0,0,0,0.18)", borderRadius: 20, height: 40, justifyContent: "center", width: 40 },
  initialsText: { fontFamily: "sans-serif", color: "#0E2A18", fontWeight: "900" },
  hello: { fontFamily: "sans-serif", color: "rgba(255,255,255,0.78)", fontSize: 12 },
  name: { fontFamily: "sans-serif", color: colors.white, fontSize: 15, fontWeight: "900" },
  bell: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 21, height: 42, justifyContent: "center", width: 42 },
  bellText: { fontFamily: "sans-serif", color: colors.white, fontSize: 20 },
  heroLabel: { fontFamily: "sans-serif", color: "rgba(255,255,255,0.72)", fontSize: 12, fontWeight: "700", marginTop: 28 },
  heroAmount: { fontFamily: "sans-serif", color: colors.white, fontSize: 36, fontWeight: "900", marginTop: 6 },
  heroSub: { fontFamily: "sans-serif", color: "rgba(255,255,255,0.82)", fontSize: 12, marginTop: 3 },
  actions: { flexDirection: "row", gap: 8, marginTop: 24 },
  action: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.16)", borderRadius: 16, flex: 1, paddingVertical: 12 },
  actionIcon: { fontFamily: "sans-serif", color: colors.white, fontSize: 18, fontWeight: "900" },
  actionText: { fontFamily: "sans-serif", color: colors.white, fontSize: 11, fontWeight: "800", marginTop: 5 },
  walletStrip: { flexDirection: "row", justifyContent: "space-between", marginHorizontal: 20, marginTop: -16 },
  stripLabel: { fontFamily: "sans-serif", color: colors.textMuted, fontSize: 12 },
  stripValue: { fontFamily: "sans-serif", color: colors.text, fontSize: 21, fontWeight: "900", marginTop: 5 },
  stripRight: { alignItems: "flex-end" },
  stripPhone: { fontFamily: "sans-serif", color: colors.text, fontSize: 12, fontWeight: "700", marginTop: 5 },
  stats: { flexDirection: "row", gap: 12, paddingHorizontal: 20, paddingTop: 20 },
  miniStat: { flex: 1, padding: 13 },
  miniIcon: { fontFamily: "sans-serif", color: colors.textMuted, fontSize: 18 },
  miniValue: { fontFamily: "sans-serif", color: colors.text, fontSize: 14, fontWeight: "900", marginTop: 14 },
  miniLabel: { fontFamily: "sans-serif", color: colors.textMuted, fontSize: 11, marginTop: 4 },
  orange: { color: colors.amber },
  green: { color: colors.green },
  sectionTitle: { fontFamily: "sans-serif", color: colors.text, fontSize: 18, fontWeight: "900", paddingLeft: 20, paddingTop: 26 },
  seeAll: { fontFamily: "sans-serif", color: colors.green, fontSize: 12, fontWeight: "800", paddingRight: 20, paddingTop: 26 },
  chamaCard: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.line, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, flexDirection: "row", marginHorizontal: 20, marginTop: 14, padding: 16 },
  chamaAvatar: { alignItems: "center", borderRadius: 24, height: 48, justifyContent: "center", width: 48 },
  chamaAvatarText: { fontFamily: "sans-serif", color: colors.white, fontSize: 16, fontWeight: "900" },
  chamaBody: { flex: 1, marginLeft: 14 },
  chamaName: { fontFamily: "sans-serif", color: colors.text, fontSize: 16, fontWeight: "900" },
  chamaType: { fontFamily: "sans-serif", color: colors.textMuted, fontSize: 12, marginTop: 4 },
  metaRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  meta: { fontFamily: "sans-serif", color: colors.textMuted, fontSize: 12 },
  cardRight: { alignItems: "flex-end", alignSelf: "stretch", justifyContent: "space-between" },
  chevron: { fontFamily: "sans-serif", color: colors.textMuted, fontSize: 25 },
  pool: { fontFamily: "sans-serif", color: colors.text, fontSize: 12, fontWeight: "900" }
});
