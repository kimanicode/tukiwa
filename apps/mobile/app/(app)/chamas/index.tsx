import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AppHeader, BottomNav, CircleButton, colors, Pill, Screen } from "../../../components/ui";
import { endpoints, type MyChama } from "../../../lib/api";

const demo: MyChama[] = [
  { role: "MEMBER", nextContributionDue: "2026-05-04", chama: { id: "demo-1", name: "Umoja Sisters Chama", type: "MERRY_GO_ROUND", poolBalance: 48000000 } },
  { role: "MEMBER", nextContributionDue: "2026-05-12", chama: { id: "demo-2", name: "Hustlers Table Banking", type: "TABLE_BANKING", poolBalance: 120000000 } },
  { role: "ADMIN", nextContributionDue: "2026-05-18", chama: { id: "demo-3", name: "Jenga Wealth Group", type: "INVESTMENT", poolBalance: 380000000 } },
  { role: "MEMBER", nextContributionDue: "2026-05-22", chama: { id: "demo-4", name: "Karura Investors Circle", type: "INVESTMENT", poolBalance: 690000000 } }
];

export default function ChamasScreen() {
  const { data } = useQuery({ queryKey: ["my-chamas"], queryFn: endpoints.getMyChamas });
  const chamas = data?.length ? data : demo;

  return (
    <Screen>
      <AppHeader
        title="Chamas"
        subtitle="Your savings circles"
        action={<CircleButton label="+" onPress={() => router.push("/(app)/chama/create" as never)} />}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.search}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput style={styles.searchInput} placeholder="Search chamas" placeholderTextColor={colors.textMuted} />
        </View>
        <View style={styles.filters}>
          <Pill active>All</Pill>
          <Pill>Merry-go-round</Pill>
          <Pill>Table banking</Pill>
          <Pill>Investment</Pill>
        </View>
        {chamas.map((item, index) => (
          <Pressable key={item.chama.id} style={styles.card} onPress={() => router.push(`/(app)/chama/${item.chama.id}` as never)}>
            <View style={[styles.avatar, { backgroundColor: index === 0 ? colors.green : index === 1 ? colors.orange : index === 2 ? colors.rust : colors.teal }]}>
              <Text style={styles.avatarText}>{initials(item.chama.name)}</Text>
            </View>
            <View style={styles.body}>
              <Text style={styles.name}>{item.chama.name}</Text>
              <Text style={styles.type}>{titleCase(item.chama.type)}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.meta}>♙ {(index + 2) * 6}</Text>
                <Text style={styles.meta}>□ {item.nextContributionDue ? new Date(item.nextContributionDue).toLocaleDateString("en-KE", { day: "numeric", month: "short" }) : "4 May"}</Text>
              </View>
            </View>
            <View style={styles.right}>
              <Text style={styles.chevron}>›</Text>
              <Text style={styles.amount}>{compactMoney(item.chama.poolBalance ?? 0)}</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
      <BottomNav active="Chamas" />
    </Screen>
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
  content: { padding: 20, paddingBottom: 112 },
  search: { alignItems: "center", backgroundColor: "#F1EEE4", borderRadius: 22, flexDirection: "row", gap: 10, height: 46, paddingHorizontal: 14 },
  searchIcon: { fontFamily: "sans-serif", color: colors.textMuted, fontSize: 22 },
  searchInput: { fontFamily: "sans-serif", color: colors.text, flex: 1, fontSize: 14 },
  filters: { flexDirection: "row", gap: 9, marginTop: 16 },
  card: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.line, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, flexDirection: "row", marginTop: 14, padding: 16 },
  avatar: { alignItems: "center", borderRadius: 24, height: 48, justifyContent: "center", width: 48 },
  avatarText: { fontFamily: "sans-serif", color: colors.white, fontSize: 16, fontWeight: "900" },
  body: { flex: 1, marginLeft: 14 },
  name: { fontFamily: "sans-serif", color: colors.text, fontSize: 16, fontWeight: "900" },
  type: { fontFamily: "sans-serif", color: colors.textMuted, fontSize: 12, marginTop: 4 },
  metaRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  meta: { fontFamily: "sans-serif", color: colors.textMuted, fontSize: 12 },
  right: { alignItems: "flex-end", alignSelf: "stretch", justifyContent: "space-between" },
  chevron: { fontFamily: "sans-serif", color: colors.textMuted, fontSize: 24 },
  amount: { fontFamily: "sans-serif", color: colors.text, fontSize: 12, fontWeight: "900" }
});
