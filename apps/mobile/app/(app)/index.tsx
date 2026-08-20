import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Bell,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Eye,
  EyeOff,
  HandCoins,
  Plus,
  TrendingUp,
  WalletMinimal
} from "lucide-react-native";
import { router } from "expo-router";
import { useState, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { BottomNav, colors, GreenPanel, Screen, SoftCard, ui, useThemeColors } from "../../components/ui";
import { cents, endpoints, type HomeSummary, type MyChama } from "../../lib/api";
import { useAuthStore } from "../../stores/auth.store";

const emptySummary: HomeSummary = {
  walletBalance: 0,
  chamaBalance: 0,
  totalBalance: 0,
  nextAction: null,
  chamas: [],
  insights: {
    monthlySaved: 0,
    activeLoan: 0,
    investmentReturnPct: 0
  },
  recentActivity: []
};

export default function HomeScreen() {
  const user = useAuthStore((state) => state.user);
  const theme = useThemeColors();
  const [amountsVisible, setAmountsVisible] = useState(true);
  const { data } = useQuery({ queryKey: ["home-summary"], queryFn: endpoints.getHomeSummary });
  const summary = data ?? emptySummary;
  const chamas = summary.chamas;
  const firstName = user?.fullName?.split(" ")[0] || "there";
  const urgentDueLabel = summary.nextAction?.dueDate ? relativeDueLabel(summary.nextAction.dueDate) : null;
  const hasUrgentAction = Boolean(summary.nextAction && urgentDueLabel !== "later");

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.homeHeader}>
          <View style={ui.rowGap}>
            <Pressable
              style={[styles.initials, { backgroundColor: theme.surface, borderColor: theme.line }]}
              onPress={() => router.push("/(app)/profile" as never)}
            >
              <Text style={[styles.initialsText, { color: theme.text }]}>{initials(user?.fullName || "")}</Text>
            </Pressable>
            <View style={styles.headerCopy}>
              <Text style={[styles.greeting, { color: theme.text }]}>Karibu, {firstName}</Text>
              <Text style={[styles.statusText, { color: theme.textMuted }]}>
                {hasUrgentAction ? `Next contribution due ${urgentDueLabel}` : "You are all caught up today"}
              </Text>
            </View>
          </View>
          <Pressable style={[styles.bell, { backgroundColor: theme.surface, borderColor: theme.line }]}>
            <Bell color={theme.text} size={20} strokeWidth={2.4} />
          </Pressable>
        </View>

        <GreenPanel style={styles.balanceCard}>
          <View style={styles.balanceTopRow}>
            <Text style={styles.balanceLabel}>TOTAL BALANCE</Text>
            <Pressable style={styles.visibilityButton} onPress={() => setAmountsVisible((visible) => !visible)}>
              {amountsVisible ? (
                <Eye color={colors.white} size={18} strokeWidth={2.4} />
              ) : (
                <EyeOff color={colors.white} size={18} strokeWidth={2.4} />
              )}
            </Pressable>
          </View>
          <Text style={styles.balanceAmount}>{amountsVisible ? formatKes(summary.totalBalance) : "KES ******"}</Text>
          <Text style={styles.balanceBreakdown}>
            Wallet: {amountsVisible ? formatKes(summary.walletBalance ?? 0) : "KES ***"}  •  Chamas: {amountsVisible ? formatKes(summary.chamaBalance) : "KES ***"}
          </Text>
        </GreenPanel>

        <View style={styles.quickActions}>
          <QuickAction
            label="Contribute"
            primary
            icon={<HandCoins color={colors.white} size={21} strokeWidth={2.4} />}
            onPress={() => router.push("/(app)/contribute" as never)}
          />
          <QuickAction
            label="Deposit"
            icon={<ArrowDownToLine color={colors.navy} size={20} strokeWidth={2.4} />}
            onPress={() => router.push("/(app)/contribute" as never)}
          />
          <QuickAction
            label="Withdraw"
            icon={<ArrowUpFromLine color={colors.navy} size={20} strokeWidth={2.4} />}
            onPress={() => router.push("/(app)/wallet" as never)}
          />
          <QuickAction
            label="New Chama"
            icon={<Plus color={colors.navy} size={20} strokeWidth={2.6} />}
            onPress={() => router.push("/(app)/chama/create" as never)}
          />
        </View>

        <SoftCard style={styles.actionNeeded}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Action needed</Text>
            {hasUrgentAction ? <Text style={styles.urgentPill}>Due {urgentDueLabel}</Text> : <CheckCircle2 color={colors.green} size={20} strokeWidth={2.4} />}
          </View>
          {hasUrgentAction ? (
            <View style={styles.actionBody}>
              <View style={styles.actionIconWrap}>
                <CalendarClock color={colors.navy} size={22} strokeWidth={2.4} />
              </View>
              <View style={styles.actionTextWrap}>
                <Text style={[styles.actionTitle, { color: theme.text }]}>{formatKes(summary.nextAction?.amount ?? 0)} due {urgentDueLabel}</Text>
                <Text style={[styles.actionSub, { color: theme.textMuted }]}>{summary.nextAction?.chamaName} monthly contribution</Text>
              </View>
              <Pressable style={styles.payNowButton} onPress={() => router.push("/(app)/contribute" as never)}>
                <Text style={styles.payNowText}>Pay now</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.emptyAction}>
              <Text style={[styles.actionTitle, { color: theme.text }]}>No payments due today</Text>
              <Text style={[styles.actionSub, { color: theme.textMuted }]}>You are on track across your chamas.</Text>
            </View>
          )}
        </SoftCard>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>My chamas</Text>
          <Pressable onPress={() => router.push("/(app)/chamas" as never)}>
            <Text style={styles.seeAll}>See all</Text>
          </Pressable>
        </View>

        {chamas.length ? (
          chamas.slice(0, 3).map((item, index) => (
            <ChamaCard key={item.chama.id} item={item} index={index} visible={amountsVisible} />
          ))
        ) : (
          <SoftCard style={styles.emptyCard}>
            <Text style={[styles.actionTitle, { color: theme.text }]}>No chamas yet</Text>
            <Text style={[styles.actionSub, { color: theme.textMuted }]}>Create or join a chama to see it here.</Text>
          </SoftCard>
        )}

        <View style={styles.insightsGrid}>
          <InsightCard icon={<WalletMinimal color={colors.navy} size={19} strokeWidth={2.4} />} label="Monthly saved" value={formatKes(summary.insights.monthlySaved)} />
          <InsightCard icon={<CircleDollarSign color={colors.amber} size={19} strokeWidth={2.4} />} label="Active loan" value={formatKes(summary.insights.activeLoan)} accent="orange" />
          <InsightCard icon={<TrendingUp color={colors.green} size={19} strokeWidth={2.4} />} label="Investment return" value={`${summary.insights.investmentReturnPct >= 0 ? "+" : ""}${summary.insights.investmentReturnPct}%`} accent="green" />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent activity</Text>
          <Pressable onPress={() => router.push("/(app)/wallet" as never)}>
            <Text style={styles.seeAll}>See all</Text>
          </Pressable>
        </View>

        <SoftCard style={styles.activityCard}>
          {summary.recentActivity.length ? summary.recentActivity.map((item) => (
            <View key={item.id} style={[styles.activityRow, { borderBottomColor: theme.line }]}>
              <View style={[styles.activityIcon, { backgroundColor: item.direction === "income" ? colors.greenLight : "#F4ECE7" }]}>
                {item.direction === "income" ? (
                  <ArrowDownToLine color={colors.green} size={17} strokeWidth={2.4} />
                ) : (
                  <ArrowUpFromLine color={colors.rust} size={17} strokeWidth={2.4} />
                )}
              </View>
              <View style={styles.activityBody}>
                <Text style={[styles.activityTitle, { color: theme.text }]}>{item.title}</Text>
                <Text style={[styles.activitySub, { color: theme.textMuted }]}>{item.source} · {formatActivityDate(item.date)}</Text>
              </View>
              <Text style={[styles.activityAmount, item.direction === "income" ? styles.income : { color: theme.text }]}>
                {item.direction === "income" ? "+" : "-"}{formatKes(Math.abs(item.amount))}
              </Text>
            </View>
          )) : (
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>No recent activity.</Text>
          )}
        </SoftCard>
      </ScrollView>
      <BottomNav active="Home" />
    </Screen>
  );
}

function QuickAction({ icon, label, onPress, primary }: { icon: ReactNode; label: string; onPress: () => void; primary?: boolean }) {
  const theme = useThemeColors();
  return (
    <Pressable
      style={[
        styles.quickAction,
        primary ? styles.quickActionPrimary : { backgroundColor: theme.surface, borderColor: theme.line }
      ]}
      onPress={onPress}
    >
      <View style={[styles.quickIcon, primary ? styles.quickIconPrimary : styles.quickIconMuted]}>{icon}</View>
      <Text style={[styles.quickLabel, primary ? styles.quickLabelPrimary : { color: theme.text }]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

function InsightCard({ icon, label, value, accent }: { icon: ReactNode; label: string; value: string; accent?: "orange" | "green" }) {
  const theme = useThemeColors();
  return (
    <SoftCard style={styles.insightCard}>
      {icon}
      <Text style={[styles.insightValue, { color: theme.text }, accent === "orange" ? styles.orange : accent === "green" ? styles.green : null]}>{value}</Text>
      <Text style={[styles.insightLabel, { color: theme.textMuted }]}>{label}</Text>
    </SoftCard>
  );
}

function ChamaCard({ item, index, visible }: { item: MyChama; index: number; visible: boolean }) {
  const theme = useThemeColors();
  const bg = index % 3 === 0 ? colors.green : index % 3 === 1 ? colors.orange : colors.rust;
  const members = item.memberCount ?? item.chama.members?.length ?? 0;
  const progress = item.cycleProgress ?? 0;
  const nextDate = item.nextContributionDue
    ? new Date(item.nextContributionDue).toLocaleDateString("en-KE", { day: "numeric", month: "short" })
    : "Not set";

  return (
    <Pressable style={[styles.chamaCard, { backgroundColor: theme.surface, borderColor: theme.line }]} onPress={() => router.push(`/(app)/chama/${item.chama.id}` as never)}>
      <View style={styles.chamaTop}>
        <View style={[styles.chamaAvatar, { backgroundColor: bg }]}>
          <Text style={styles.chamaAvatarText}>{initials(item.chama.name)}</Text>
        </View>
        <View style={styles.chamaBody}>
          <Text style={[styles.chamaName, { color: theme.text }]} numberOfLines={1}>{item.chama.name}</Text>
          <Text style={[styles.chamaType, { color: theme.textMuted }]}>{titleCase(item.chama.type)}</Text>
        </View>
        <View style={styles.chamaRight}>
          <Text style={[styles.pool, { color: theme.text }]}>{visible ? compactMoney(item.chama.poolBalance ?? 0) : "KES ***"}</Text>
          <Text style={[styles.meta, { color: theme.textMuted }]}>{members} members</Text>
        </View>
      </View>
      <View style={styles.chamaMetaGrid}>
        <Text style={[styles.meta, { color: theme.textMuted }]}>Next contribution: {nextDate}</Text>
        <Text style={[styles.meta, { color: theme.textMuted }]}>{item.nextPayoutLabel ?? "No payout scheduled"}</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
      </View>
      <Text style={[styles.progressLabel, { color: theme.textMuted }]}>{Math.round(progress * 100)}% of this cycle funded</Text>
    </Pressable>
  );
}

function initials(value: string) {
  return value.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "?";
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

function formatKes(centsValue: number) {
  return cents(centsValue).replace("KES", "KES");
}

function formatActivityDate(dateValue: string) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return dateValue;
  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const days = Math.round((startToday.getTime() - startDate.getTime()) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return date.toLocaleDateString("en-KE", { day: "numeric", month: "short" });
}

function relativeDueLabel(dateValue: string) {
  const today = new Date();
  const due = new Date(dateValue);
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const days = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (days < 0) return "overdue";
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days <= 7) return `in ${days} days`;
  return "later";
}

const styles = StyleSheet.create({
  content: { gap: 14, padding: 16, paddingBottom: 116 },
  homeHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  headerCopy: { minWidth: 0 },
  initials: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.line, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, height: 44, justifyContent: "center", width: 44 },
  initialsText: { fontFamily: "sans-serif", color: colors.text, fontWeight: "900" },
  greeting: { fontFamily: "sans-serif", color: colors.text, fontSize: 18, fontWeight: "900" },
  statusText: { fontFamily: "sans-serif", color: colors.textMuted, fontSize: 12, marginTop: 3 },
  bell: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.line, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, height: 44, justifyContent: "center", width: 44 },
  balanceCard: { borderRadius: 24, padding: 20 },
  balanceTopRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  balanceLabel: { fontFamily: "sans-serif", color: "rgba(255,255,255,0.72)", fontSize: 12, fontWeight: "800" },
  visibilityButton: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 18, height: 36, justifyContent: "center", width: 36 },
  balanceAmount: { fontFamily: "sans-serif", color: colors.white, fontSize: 34, fontWeight: "900", marginTop: 10 },
  balanceBreakdown: { fontFamily: "sans-serif", color: "rgba(255,255,255,0.84)", fontSize: 12, fontWeight: "700", marginTop: 8 },
  quickActions: { flexDirection: "row", gap: 8 },
  quickAction: { alignItems: "center", borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, flex: 1, minHeight: 76, paddingHorizontal: 5, paddingVertical: 10 },
  quickActionPrimary: { backgroundColor: colors.navy, borderColor: colors.navy },
  quickIcon: { alignItems: "center", borderRadius: 16, height: 32, justifyContent: "center", width: 32 },
  quickIconPrimary: { backgroundColor: "rgba(255,255,255,0.14)" },
  quickIconMuted: { backgroundColor: colors.navyLight },
  quickLabel: { fontFamily: "sans-serif", color: colors.text, fontSize: 11, fontWeight: "900", marginTop: 7 },
  quickLabelPrimary: { color: colors.white },
  actionNeeded: { gap: 13, padding: 16 },
  cardHeaderRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  sectionTitle: { fontFamily: "sans-serif", color: colors.text, fontSize: 17, fontWeight: "900" },
  urgentPill: { fontFamily: "sans-serif", backgroundColor: colors.amberLight, borderRadius: 999, color: colors.amberDark, fontSize: 11, fontWeight: "900", overflow: "hidden", paddingHorizontal: 10, paddingVertical: 5 },
  actionBody: { alignItems: "center", flexDirection: "row", gap: 11 },
  actionIconWrap: { alignItems: "center", backgroundColor: colors.navyLight, borderRadius: 18, height: 44, justifyContent: "center", width: 44 },
  actionTextWrap: { flex: 1, minWidth: 0 },
  actionTitle: { fontFamily: "sans-serif", color: colors.text, fontSize: 14, fontWeight: "900" },
  actionSub: { fontFamily: "sans-serif", color: colors.textMuted, fontSize: 12, lineHeight: 17, marginTop: 3 },
  payNowButton: { alignItems: "center", backgroundColor: colors.navy, borderRadius: 16, justifyContent: "center", minHeight: 44, paddingHorizontal: 14 },
  payNowText: { fontFamily: "sans-serif", color: colors.white, fontSize: 12, fontWeight: "900" },
  emptyAction: { gap: 4, paddingBottom: 2 },
  emptyCard: { gap: 4 },
  emptyText: { fontFamily: "sans-serif", color: colors.textMuted, fontSize: 12, paddingVertical: 16, textAlign: "center" },
  sectionHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  seeAll: { fontFamily: "sans-serif", color: colors.green, fontSize: 12, fontWeight: "900" },
  chamaCard: { backgroundColor: colors.surface, borderColor: colors.line, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, gap: 12, padding: 16 },
  chamaTop: { alignItems: "center", flexDirection: "row" },
  chamaAvatar: { alignItems: "center", borderRadius: 24, height: 48, justifyContent: "center", width: 48 },
  chamaAvatarText: { fontFamily: "sans-serif", color: colors.white, fontSize: 16, fontWeight: "900" },
  chamaBody: { flex: 1, marginLeft: 12, minWidth: 0 },
  chamaName: { fontFamily: "sans-serif", color: colors.text, fontSize: 15, fontWeight: "900" },
  chamaType: { fontFamily: "sans-serif", color: colors.textMuted, fontSize: 12, marginTop: 4 },
  chamaRight: { alignItems: "flex-end", marginLeft: 8 },
  pool: { fontFamily: "sans-serif", color: colors.text, fontSize: 13, fontWeight: "900" },
  chamaMetaGrid: { gap: 5 },
  meta: { fontFamily: "sans-serif", color: colors.textMuted, fontSize: 11, fontWeight: "700" },
  progressTrack: { backgroundColor: "#E9E4D6", borderRadius: 999, height: 7, overflow: "hidden" },
  progressFill: { backgroundColor: colors.green, borderRadius: 999, height: 7 },
  progressLabel: { fontFamily: "sans-serif", color: colors.textMuted, fontSize: 11, fontWeight: "700" },
  insightsGrid: { flexDirection: "row", gap: 9 },
  insightCard: { flex: 1, minHeight: 96, padding: 12 },
  insightValue: { fontFamily: "sans-serif", color: colors.text, fontSize: 14, fontWeight: "900", marginTop: 10 },
  insightLabel: { fontFamily: "sans-serif", color: colors.textMuted, fontSize: 11, fontWeight: "700", marginTop: 4 },
  orange: { color: colors.amber },
  green: { color: colors.green },
  activityCard: { paddingHorizontal: 14, paddingVertical: 2 },
  activityRow: { alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 11, minHeight: 64 },
  activityIcon: { alignItems: "center", borderRadius: 18, height: 36, justifyContent: "center", width: 36 },
  activityBody: { flex: 1, minWidth: 0 },
  activityTitle: { fontFamily: "sans-serif", color: colors.text, fontSize: 13, fontWeight: "900" },
  activitySub: { fontFamily: "sans-serif", color: colors.textMuted, fontSize: 11, marginTop: 3 },
  activityAmount: { fontFamily: "sans-serif", color: colors.text, fontSize: 12, fontWeight: "900" },
  income: { color: colors.green }
});
