import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppHeader, BottomNav, CircleButton, colors, GreenPanel, PrimaryButton, ProgressBar, Screen } from "../../../components/ui";

const loans = [
  { name: "Amina Wanjiru", chama: "Hustlers Table Banking", amount: "KES 50K", outstanding: "KES 33K", interest: "8%", status: "Active" },
  { name: "Brian Otieno", chama: "Hustlers Table Banking", amount: "KES 80K", outstanding: "KES 80K", interest: "10%", status: "Pending" },
  { name: "Mercy Njeri", chama: "Hustlers Table Banking", amount: "KES 25K", outstanding: "Ksh 0", interest: "8%", status: "Repaid" }
];

export default function LoansScreen() {
  return (
    <Screen>
      <AppHeader
        title="Loans"
        subtitle="Table banking"
        action={<CircleButton label="+" onPress={() => router.push("/(app)/loans/apply" as never)} />}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <GreenPanel>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroLabel}>MY ACTIVE LOAN</Text>
              <Text style={styles.heroAmount}>Ksh 32,500</Text>
              <Text style={styles.heroSub}>Outstanding of Ksh 50,000</Text>
            </View>
            <Text style={styles.cardIcon}>▣</Text>
          </View>
          <ProgressBar progress={0.65} tone="green" />
          <View style={styles.heroMeta}>
            <Text style={styles.heroMetaText}>Due 15 Jul</Text>
            <Text style={styles.heroMetaText}>8% p.a.</Text>
          </View>
          <PrimaryButton tone="outline" style={styles.repayButton}>Repay via M-Pesa</PrimaryButton>
        </GreenPanel>

        <Text style={styles.sectionTitle}>All loans</Text>
        {loans.map((loan) => (
          <View key={loan.name} style={styles.loanCard}>
            <View style={styles.loanHeader}>
              <View>
                <Text style={styles.loanName}>{loan.name}</Text>
                <Text style={styles.loanChama}>{loan.chama}</Text>
              </View>
              <Text style={loan.status === "Active" ? styles.activeBadge : loan.status === "Pending" ? styles.pendingBadge : styles.repaidBadge}>{loan.status}</Text>
            </View>
            <View style={styles.loanStats}>
              <LoanStat label="Amount" value={loan.amount} />
              <LoanStat label="Outstanding" value={loan.outstanding} />
              <LoanStat label="Interest" value={loan.interest} />
            </View>
          </View>
        ))}
      </ScrollView>
      <BottomNav active="Loans" />
    </Screen>
  );
}

function LoanStat({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 112 },
  heroTop: { flexDirection: "row", justifyContent: "space-between" },
  heroLabel: { fontFamily: "sans-serif", color: "rgba(255,255,255,0.72)", fontSize: 12, fontWeight: "800" },
  heroAmount: { fontFamily: "sans-serif", color: colors.white, fontSize: 31, fontWeight: "900", marginTop: 14 },
  heroSub: { fontFamily: "sans-serif", color: "rgba(255,255,255,0.82)", fontSize: 12, marginTop: 3 },
  cardIcon: { fontFamily: "sans-serif", color: "rgba(255,255,255,0.7)", fontSize: 18 },
  heroMeta: { flexDirection: "row", justifyContent: "space-between", marginTop: 14 },
  heroMetaText: { fontFamily: "sans-serif", color: colors.white, fontSize: 12, fontWeight: "700" },
  repayButton: { backgroundColor: colors.surface, marginTop: 16 },
  sectionTitle: { fontFamily: "sans-serif", color: colors.text, fontSize: 15, fontWeight: "900", marginTop: 26 },
  loanCard: { backgroundColor: colors.surface, borderColor: colors.line, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, marginTop: 14, padding: 16 },
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
