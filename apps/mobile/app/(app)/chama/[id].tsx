import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  AppHeader,
  Badge,
  BottomNav,
  CircleButton,
  colors,
  GreenPanel,
  ProgressBar,
  RowItem,
  Screen,
  SoftCard,
  ui
} from "../../../components/ui";
import { cents, endpoints, type Chama, type Contribution, type Loan } from "../../../lib/api";
import { useAuthStore } from "../../../stores/auth.store";
import { useChamaStore } from "../../../stores/chama.store";

const tabs = ["Overview", "Contributions", "Loans", "Investments"] as const;

const fallbackChama: Chama = {
  id: "demo",
  name: "Umoja Sisters Chama",
  type: "MERRY_GO_ROUND",
  poolBalance: 48000000,
  settings: {
    contributionAmount: 500000,
    contributionCycle: "MONTHLY",
    loanInterestRate: 8,
    maxLoanMultiplier: 3,
    penaltyRate: 5,
    requiresMeetingForLoan: true
  },
  members: [
    { id: "m1", role: "ADMIN", shares: 2, user: { id: "u1", fullName: "Amina Wanjiru", phone: "254712345678" } },
    { id: "m2", role: "TREASURER", shares: 1, user: { id: "u2", fullName: "Faith Achieng", phone: "254722111222" } },
    { id: "m3", role: "MEMBER", shares: 1, user: { id: "u3", fullName: "Mercy Njeri", phone: "254733222333" } }
  ]
};

export default function ChamaDetailScreen() {
  const { id = "" } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((state) => state.user);
  const [tab, setTab] = useState<(typeof tabs)[number]>("Overview");
  const setActiveChama = useChamaStore((state) => state.setActiveChama);
  const chamaQuery = useQuery({
    queryKey: ["chama", id],
    queryFn: async () => {
      const chama = await endpoints.getChama(id);
      setActiveChama(chama);
      return chama;
    },
    retry: false
  });
  const contributions = useQuery({
    queryKey: ["contributions", id],
    queryFn: () => endpoints.getContributions(id),
    retry: false
  });
  const loans = useQuery({ queryKey: ["loans", id], queryFn: () => endpoints.getLoans(id), retry: false });
  const portfolio = useQuery({
    queryKey: ["portfolio", id],
    queryFn: () => endpoints.getPortfolio(id),
    enabled: chamaQuery.data?.type === "INVESTMENT",
    retry: false
  });

  const chama = chamaQuery.data ?? fallbackChama;
  const visibleTabs = useMemo(
    () => (chama.type === "INVESTMENT" ? tabs : tabs.filter((item) => item !== "Investments")),
    [chama.type]
  );
  const contributionList = contributions.data ?? demoContributions(chama);
  const loanList = loans.data ?? demoLoans;
  const paidContributions = contributionList.filter((item) => item.status === "PAID").length;
  const contributionProgress = contributionList.length ? paidContributions / contributionList.length : 0;
  const isAdmin =
    chama.members?.some((member) => member.role === "ADMIN" && member.user.id === user?.id) ??
    (!chamaQuery.data && id === "demo");

  return (
    <Screen>
      <AppHeader
        title={chama.name}
        subtitle={`${chama.members?.length ?? 0} members - ${titleCase(chama.type)}`}
        back
        action={
          isAdmin ? (
            <CircleButton label="⚙" onPress={() => router.push(`/(app)/chama/${chama.id}/settings` as never)} />
          ) : (
            <Badge tone="green">Active</Badge>
          )
        }
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <GreenPanel style={styles.hero}>
          <View style={ui.rowBetween}>
            <View>
              <Text style={styles.heroLabel}>POOL BALANCE</Text>
              <Text style={styles.heroAmount}>{cents(chama.poolBalance ?? 0).replace("KES", "Ksh")}</Text>
              <Text style={styles.heroSub}>{titleCase(chama.type)}</Text>
            </View>
            <View style={styles.initials}>
              <Text style={styles.initialsText}>{initials(chama.name)}</Text>
            </View>
          </View>
          <View style={styles.heroStats}>
            <HeroStat label="Monthly contribution" value={cents(chama.settings?.contributionAmount ?? 0)} />
            <HeroStat label="Cycle" value={titleCase(chama.settings?.contributionCycle ?? "MONTHLY")} />
          </View>
        </GreenPanel>

        <View style={styles.tabBar}>
          {visibleTabs.map((item) => (
            <Pressable key={item} style={item === tab ? styles.tabActive : styles.tab} onPress={() => setTab(item)}>
              <Text style={item === tab ? styles.tabTextActive : styles.tabText}>{item}</Text>
            </Pressable>
          ))}
        </View>

        {tab === "Overview" ? (
          <>
            <SoftCard>
              <View style={ui.rowBetween}>
                <Text style={styles.sectionTitle}>Next contribution</Text>
                <Badge tone="amber">Due soon</Badge>
              </View>
              <Text style={styles.amount}>{cents(chama.settings?.contributionAmount ?? 0).replace("KES", "Ksh")}</Text>
              <Text style={styles.muted}>{paidContributions} of {contributionList.length} members paid</Text>
              <ProgressBar progress={contributionProgress || 0.65} />
            </SoftCard>

            <View style={ui.rowBetween}>
              <Text style={styles.sectionTitle}>Members</Text>
              <Text style={styles.linkText}>{chama.members?.length ?? 0} total</Text>
            </View>
            <SoftCard style={styles.listCard}>
              {chama.members?.map((member, index) => (
                <RowItem
                  key={member.id}
                  title={member.user.fullName}
                  subtitle={`${titleCase(member.role)} - ${member.shares} share${member.shares === 1 ? "" : "s"}`}
                  avatarTone={index % 3 === 0 ? "green" : index % 3 === 1 ? "teal" : "amber"}
                  right={<Badge tone={member.role === "ADMIN" ? "green" : member.role === "TREASURER" ? "teal" : "muted"}>{titleCase(member.role)}</Badge>}
                />
              ))}
            </SoftCard>

            <SoftCard>
              <Text style={styles.sectionTitle}>Settings</Text>
              <View style={styles.settingsGrid}>
                <Setting label="Loan interest" value={`${chama.settings?.loanInterestRate ?? 8}% p.a.`} />
                <Setting label="Max loan" value={`${chama.settings?.maxLoanMultiplier ?? 3}x savings`} />
              </View>
            </SoftCard>
          </>
        ) : null}

        {tab === "Contributions" ? (
          <SoftCard style={styles.listCard}>
            {contributionList.map((item, index) => (
              <RowItem
                key={item.id}
                title={item.member?.user?.fullName ?? `Member ${index + 1}`}
                subtitle={`${cents(item.amount).replace("KES", "Ksh")} - ${formatDate(item.dueDate)}`}
                avatarTone={index % 2 === 0 ? "green" : "teal"}
                right={<Badge tone={item.status === "PAID" ? "green" : item.status === "PENDING" ? "amber" : "red"}>{titleCase(item.status)}</Badge>}
              />
            ))}
          </SoftCard>
        ) : null}

        {tab === "Loans" ? (
          <SoftCard style={styles.listCard}>
            {loanList.map((loan, index) => (
              <RowItem
                key={loan.id}
                title={cents(loan.amount).replace("KES", "Ksh")}
                subtitle={`Outstanding ${cents(loan.outstandingBalance ?? loan.totalDue).replace("KES", "Ksh")}`}
                avatarTone={index % 2 === 0 ? "amber" : "green"}
                right={<Badge tone={loan.status === "REPAID" ? "green" : loan.status === "PENDING" ? "amber" : "teal"}>{titleCase(loan.status)}</Badge>}
              />
            ))}
          </SoftCard>
        ) : null}

        {tab === "Investments" ? (
          <SoftCard style={styles.listCard}>
            {(portfolio.data?.investments ?? []).map((investment) => (
              <RowItem
                key={investment.name}
                title={investment.name}
                subtitle={`${titleCase(investment.type)} - ${cents(investment.currentValue).replace("KES", "Ksh")}`}
                avatarTone="teal"
                right={<Text style={investment.gainLoss >= 0 ? styles.gain : styles.loss}>{investment.gainLossPct}%</Text>}
              />
            ))}
          </SoftCard>
        ) : null}

        <View style={styles.actions}>
          <Pressable style={styles.primaryAction} onPress={() => router.push("/(app)/contribute" as never)}>
            <Text style={styles.primaryActionText}>Pay contribution</Text>
          </Pressable>
          <Pressable style={styles.secondaryAction} onPress={() => router.push("/(app)/loans/apply" as never)}>
            <Text style={styles.secondaryActionText}>Request loan</Text>
          </Pressable>
        </View>
      </ScrollView>

      <BottomNav active="Chamas" />
    </Screen>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.heroStat}>
      <Text style={styles.heroStatLabel}>{label}</Text>
      <Text style={styles.heroStatValue}>{value}</Text>
    </View>
  );
}

function Setting({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.setting}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={styles.settingValue}>{value}</Text>
    </View>
  );
}

function demoContributions(chama: Chama): Contribution[] {
  return (chama.members ?? []).map((member, index) => ({
    id: `demo-c-${member.id}`,
    chamaId: chama.id,
    memberId: member.id,
    amount: chama.settings?.contributionAmount ?? 500000,
    status: index === 2 ? "PENDING" : "PAID",
    dueDate: "2026-05-04",
    member: { user: member.user }
  }));
}

const demoLoans: Loan[] = [
  { id: "loan-1", amount: 5000000, totalDue: 5400000, outstandingBalance: 3250000, status: "DISBURSED" },
  { id: "loan-2", amount: 2500000, totalDue: 2700000, outstandingBalance: 0, status: "REPAID" }
];

function initials(value: string) {
  return value.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-KE", { day: "numeric", month: "short" });
}

const styles = StyleSheet.create({
  content: { gap: 16, padding: 20, paddingBottom: 118 },
  hero: { gap: 18 },
  heroLabel: { fontFamily: "sans-serif", color: "rgba(255,255,255,0.74)", fontSize: 12, fontWeight: "800" },
  heroAmount: { fontFamily: "sans-serif", color: colors.white, fontSize: 34, fontWeight: "900", marginTop: 8 },
  heroSub: { fontFamily: "sans-serif", color: "rgba(255,255,255,0.84)", fontSize: 12, marginTop: 4 },
  initials: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.16)", borderRadius: 28, height: 56, justifyContent: "center", width: 56 },
  initialsText: { fontFamily: "sans-serif", color: colors.white, fontSize: 18, fontWeight: "900" },
  heroStats: { flexDirection: "row", gap: 12 },
  heroStat: { backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 17, flex: 1, padding: 13 },
  heroStatLabel: { fontFamily: "sans-serif", color: "rgba(255,255,255,0.78)", fontSize: 10 },
  heroStatValue: { fontFamily: "sans-serif", color: colors.white, fontSize: 13, fontWeight: "900", marginTop: 5 },
  tabBar: { backgroundColor: "#F1EEE4", borderRadius: 18, flexDirection: "row", padding: 4 },
  tab: { alignItems: "center", borderRadius: 15, flex: 1, paddingVertical: 9 },
  tabActive: { alignItems: "center", backgroundColor: colors.green, borderRadius: 15, flex: 1, paddingVertical: 9 },
  tabText: { fontFamily: "sans-serif", color: colors.textMuted, fontSize: 11, fontWeight: "800" },
  tabTextActive: { fontFamily: "sans-serif", color: colors.white, fontSize: 11, fontWeight: "900" },
  sectionTitle: { fontFamily: "sans-serif", color: colors.text, fontSize: 16, fontWeight: "900" },
  amount: { fontFamily: "sans-serif", color: colors.text, fontSize: 28, fontWeight: "900", marginTop: 10 },
  muted: { fontFamily: "sans-serif", color: colors.textMuted, fontSize: 12, marginTop: 4 },
  linkText: { fontFamily: "sans-serif", color: colors.green, fontSize: 12, fontWeight: "800" },
  listCard: { paddingVertical: 4 },
  settingsGrid: { flexDirection: "row", gap: 12, marginTop: 14 },
  setting: { backgroundColor: "#F1EEE4", borderRadius: 16, flex: 1, padding: 13 },
  settingValue: { fontFamily: "sans-serif", color: colors.text, fontSize: 13, fontWeight: "900", marginTop: 6 },
  gain: { fontFamily: "sans-serif", color: colors.green, fontSize: 12, fontWeight: "900" },
  loss: { fontFamily: "sans-serif", color: colors.red, fontSize: 12, fontWeight: "900" },
  actions: { flexDirection: "row", gap: 12, marginTop: 2 },
  primaryAction: { alignItems: "center", backgroundColor: colors.green, borderRadius: 18, flex: 1, paddingVertical: 15 },
  primaryActionText: { fontFamily: "sans-serif", color: colors.white, fontSize: 13, fontWeight: "900" },
  secondaryAction: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.line, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, flex: 1, paddingVertical: 15 },
  secondaryActionText: { fontFamily: "sans-serif", color: colors.green, fontSize: 13, fontWeight: "900" }
});
