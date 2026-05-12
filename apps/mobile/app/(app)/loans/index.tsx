import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppHeader, BottomNav, colors, GreenPanel, PrimaryButton, ProgressBar, Screen, useThemeColors } from "../../../components/ui";

const loans: Array<{ name: string; chama: string; amount: string; outstanding: string; interest: string; status: string }> = [];

export default function LoansScreen() {
  const theme = useThemeColors();

  return (
    <Screen>
      <AppHeader
        title="Loans"
        subtitle="Table banking"
        action={
          <Pressable style={styles.newLoanButton} onPress={() => router.push("/(app)/loans/apply" as never)}>
            <Text style={styles.newLoanText}>New loan</Text>
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <GreenPanel>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroLabel}>MY ACTIVE LOAN</Text>
              <Text style={styles.heroAmount}>Ksh 0.00</Text>
              <Text style={styles.heroSub}>No active loan</Text>
            </View>
            <Text style={styles.cardIcon}>Loan</Text>
          </View>
          <ProgressBar progress={0} tone="green" />
          <View style={styles.heroMeta}>
            <Text style={styles.heroMetaText}>No due date</Text>
            <Text style={styles.heroMetaText}>No interest</Text>
          </View>
          <PrimaryButton tone="outline" style={styles.repayButton}>Repay via M-Pesa</PrimaryButton>
        </GreenPanel>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>All loans</Text>
        {loans.length ? (
          loans.map((loan) => (
            <View key={loan.name} style={[styles.loanCard, { backgroundColor: theme.surface, borderColor: theme.line }]}>
              <View style={styles.loanHeader}>
                <View>
                  <Text style={[styles.loanName, { color: theme.text }]}>{loan.name}</Text>
                  <Text style={[styles.loanChama, { color: theme.textMuted }]}>{loan.chama}</Text>
                </View>
                <Text style={loan.status === "Active" ? styles.activeBadge : loan.status === "Pending" ? styles.pendingBadge : styles.repaidBadge}>{loan.status}</Text>
              </View>
              <View style={styles.loanStats}>
                <LoanStat label="Amount" value={loan.amount} />
                <LoanStat label="Outstanding" value={loan.outstanding} />
                <LoanStat label="Interest" value={loan.interest} />
              </View>
            </View>
          ))
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: theme.surface, borderColor: theme.line }]}>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No loans yet</Text>
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>Loan requests and repayments will appear here.</Text>
          </View>
        )}
      </ScrollView>
      <BottomNav active="Loans" />
    </Screen>
  );
}

function LoanStat({ label, value }: { label: string; value: string }) {
  const theme = useThemeColors();
  return (
    <View>
      <Text style={[styles.statLabel, { color: theme.textMuted }]}>{label}</Text>
      <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 112 },
  newLoanButton: { backgroundColor: colors.navy, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  newLoanText: { fontFamily: "sans-serif", color: colors.white, fontSize: 12, fontWeight: "900" },
  heroTop: { flexDirection: "row", justifyContent: "space-between" },
  heroLabel: { fontFamily: "sans-serif", color: "rgba(255,255,255,0.72)", fontSize: 12, fontWeight: "800" },
  heroAmount: { fontFamily: "sans-serif", color: colors.white, fontSize: 31, fontWeight: "900", marginTop: 14 },
  heroSub: { fontFamily: "sans-serif", color: "rgba(255,255,255,0.82)", fontSize: 12, marginTop: 3 },
  cardIcon: { fontFamily: "sans-serif", color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: "800" },
  heroMeta: { flexDirection: "row", justifyContent: "space-between", marginTop: 14 },
  heroMetaText: { fontFamily: "sans-serif", color: colors.white, fontSize: 12, fontWeight: "700" },
  repayButton: { backgroundColor: colors.navy, marginTop: 16 },
  sectionTitle: { fontFamily: "sans-serif", color: colors.text, fontSize: 15, fontWeight: "900", marginTop: 26 },
  loanCard: { backgroundColor: colors.surface, borderColor: colors.line, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, marginTop: 14, padding: 16 },
  emptyCard: { alignItems: "center", borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, gap: 6, marginTop: 14, padding: 24 },
  emptyTitle: { fontFamily: "sans-serif", color: colors.text, fontSize: 16, fontWeight: "900" },
  emptyText: { fontFamily: "sans-serif", color: colors.textMuted, fontSize: 12, lineHeight: 18, textAlign: "center" },
  loanHeader: { flexDirection: "row", justifyContent: "space-between" },
  loanName: { fontFamily: "sans-serif", color: colors.text, fontSize: 15, fontWeight: "900" },
  loanChama: { fontFamily: "sans-serif", color: colors.textMuted, fontSize: 12, marginTop: 4 },
  activeBadge: { fontFamily: "sans-serif", backgroundColor: colors.greenLight, borderRadius: 12, color: colors.green, fontSize: 12, fontWeight: "800", overflow: "hidden", paddingHorizontal: 10, paddingVertical: 5 },
  pendingBadge: { fontFamily: "sans-serif", backgroundColor: colors.amberLight, borderRadius: 12, color: colors.amber, fontSize: 12, fontWeight: "800", overflow: "hidden", paddingHorizontal: 10, paddingVertical: 5 },
  repaidBadge: { fontFamily: "sans-serif", backgroundColor: colors.greenLight, borderRadius: 12, color: colors.green, fontSize: 12, fontWeight: "800", overflow: "hidden", paddingHorizontal: 10, paddingVertical: 5 },
  loanStats: { flexDirection: "row", justifyContent: "space-between", marginTop: 18, paddingRight: 26 },
  statLabel: { fontFamily: "sans-serif", color: colors.textMuted, fontSize: 12 },
  statValue: { fontFamily: "sans-serif", color: colors.text, fontSize: 12, fontWeight: "800", marginTop: 2 }
});
