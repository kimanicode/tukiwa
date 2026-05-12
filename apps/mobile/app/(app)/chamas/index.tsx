import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AppHeader, BottomNav, colors, Pill, Screen, useThemeColors } from "../../../components/ui";
import { endpoints, type MyChama } from "../../../lib/api";

export default function ChamasScreen() {
  const { data } = useQuery({ queryKey: ["my-chamas"], queryFn: endpoints.getMyChamas });
  const theme = useThemeColors();
  const chamas = data ?? [];

  return (
    <Screen>
      <AppHeader
        title="Chamas"
        subtitle="Your savings circles"
        action={
          <Pressable style={styles.newChamaButton} onPress={() => router.push("/(app)/chama/create" as never)}>
            <Text style={styles.newChamaText}>New chama</Text>
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.search, { backgroundColor: theme === colors ? "#F1EEE4" : "#17251B" }]}>
          <Text style={[styles.searchIcon, { color: theme.textMuted }]}>⌕</Text>
          <TextInput style={[styles.searchInput, { color: theme.text }]} placeholder="Search chamas" placeholderTextColor={theme.textMuted} />
        </View>
        <View style={styles.filters}>
          <Pill active>All</Pill>
          <Pill>Merry-go-round</Pill>
          <Pill>Table banking</Pill>
          <Pill>Investment</Pill>
        </View>
        {chamas.length ? (
          chamas.map((item, index) => (
            <ChamaListCard key={item.chama.id} item={item} index={index} />
          ))
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: theme.surface, borderColor: theme.line }]}>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No chamas yet</Text>
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>Create a chama or accept an invite to get started.</Text>
          </View>
        )}
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

function ChamaListCard({ item, index }: { item: MyChama; index: number }) {
  const theme = useThemeColors();
  return (
    <Pressable key={item.chama.id} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line }]} onPress={() => router.push(`/(app)/chama/${item.chama.id}` as never)}>
      <View style={[styles.avatar, { backgroundColor: index === 0 ? colors.green : index === 1 ? colors.orange : index === 2 ? colors.rust : colors.teal }]}>
        <Text style={styles.avatarText}>{initials(item.chama.name)}</Text>
      </View>
      <View style={styles.body}>
        <Text style={[styles.name, { color: theme.text }]}>{item.chama.name}</Text>
        <Text style={[styles.type, { color: theme.textMuted }]}>{titleCase(item.chama.type)}</Text>
        <View style={styles.metaRow}>
          <Text style={[styles.meta, { color: theme.textMuted }]}>Members {item.memberCount ?? item.chama.members?.length ?? 0}</Text>
          <Text style={[styles.meta, { color: theme.textMuted }]}>Next {item.nextContributionDue ? new Date(item.nextContributionDue).toLocaleDateString("en-KE", { day: "numeric", month: "short" }) : "Not set"}</Text>
        </View>
      </View>
      <View style={styles.right}>
        <Text style={[styles.chevron, { color: theme.textMuted }]}>›</Text>
        <Text style={[styles.amount, { color: theme.text }]}>{compactMoney(item.chama.poolBalance ?? 0)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 112 },
  newChamaButton: { backgroundColor: colors.navy, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  newChamaText: { fontFamily: "sans-serif", color: colors.white, fontSize: 12, fontWeight: "900" },
  search: { alignItems: "center", backgroundColor: "#F1EEE4", borderRadius: 22, flexDirection: "row", gap: 10, height: 46, paddingHorizontal: 14 },
  searchIcon: { fontFamily: "sans-serif", color: colors.textMuted, fontSize: 22 },
  searchInput: { fontFamily: "sans-serif", color: colors.text, flex: 1, fontSize: 14 },
  filters: { flexDirection: "row", gap: 9, marginTop: 16 },
  card: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.line, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, flexDirection: "row", marginTop: 14, padding: 16 },
  emptyCard: { alignItems: "center", borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, gap: 6, marginTop: 18, padding: 24 },
  emptyTitle: { fontFamily: "sans-serif", color: colors.text, fontSize: 16, fontWeight: "900" },
  emptyText: { fontFamily: "sans-serif", color: colors.textMuted, fontSize: 12, lineHeight: 18, textAlign: "center" },
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
