import { ScrollView, StyleSheet, Text, View } from "react-native";
import { AppHeader, BottomNav, colors, GreenPanel, PrimaryButton, Screen } from "../../components/ui";

const transactions = [
  ["♙", "Monthly contribution", "Umoja Sisters Chama · 2d ago", "-Ksh 5,000", false],
  ["↙", "Merry-go-round payout", "From Umoja Sisters · 20 Apr", "+Ksh 60,000", true],
  ["⇄", "Loan repayment", "Hustlers Table Banking · 18 Apr", "-Ksh 7,500", false],
  ["⌁", "MMF top-up", "CIC Money Market · 15 Apr", "-Ksh 10,000", false],
  ["↙", "M-Pesa deposit", "From 0712 345 678 · 12 Apr", "+Ksh 20,000", true],
  ["♙", "Monthly contribution", "Jenga Wealth Group · 5 Apr", "-Ksh 10,000", false]
];

export default function WalletScreen() {
  return (
    <Screen>
      <AppHeader title="Wallet" subtitle="Tukiwa account" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <GreenPanel>
          <Text style={styles.panelLabel}>AVAILABLE BALANCE</Text>
          <Text style={styles.balance}>Ksh 48,350</Text>
          <Text style={styles.mpesa}>M-Pesa · +254 712 345 678</Text>
          <View style={styles.walletActions}>
            <PrimaryButton tone="outline" style={styles.walletButton}>↙  Deposit</PrimaryButton>
            <PrimaryButton tone="green" style={styles.walletButtonSoft}>↗  Withdraw</PrimaryButton>
          </View>
        </GreenPanel>

        <Text style={styles.section}>Transactions</Text>
        <View style={styles.list}>
          {transactions.map(([icon, title, sub, amount, positive]) => (
            <View key={`${title}-${sub}`} style={styles.tx}>
              <View style={[styles.txIcon, positive ? styles.txIconGreen : null]}><Text style={styles.txIconText}>{icon}</Text></View>
              <View style={styles.txBody}>
                <Text style={styles.txTitle}>{title}</Text>
                <Text style={styles.txSub}>{sub}</Text>
              </View>
              <Text style={positive ? styles.amountPositive : styles.amountNegative}>{amount}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
      <BottomNav active="Wallet" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 112 },
  panelLabel: { fontFamily: "sans-serif", color: "rgba(255,255,255,0.72)", fontSize: 12, fontWeight: "800" },
  balance: { fontFamily: "sans-serif", color: colors.white, fontSize: 36, fontWeight: "900", marginTop: 12 },
  mpesa: { fontFamily: "sans-serif", color: "rgba(255,255,255,0.86)", fontSize: 12, marginTop: 3 },
  walletActions: { flexDirection: "row", gap: 12, marginTop: 22 },
  walletButton: { flex: 1 },
  walletButtonSoft: { backgroundColor: "rgba(255,255,255,0.16)", flex: 1 },
  section: { fontFamily: "sans-serif", color: colors.text, fontSize: 15, fontWeight: "900", marginTop: 26, marginBottom: 10 },
  list: { backgroundColor: colors.surface, borderColor: colors.line, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 16 },
  tx: { alignItems: "center", borderBottomColor: colors.line, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", paddingVertical: 14 },
  txIcon: { alignItems: "center", backgroundColor: "#F1EEE4", borderRadius: 20, height: 40, justifyContent: "center", width: 40 },
  txIconGreen: { backgroundColor: colors.greenLight },
  txIconText: { fontFamily: "sans-serif", color: colors.text, fontSize: 16 },
  txBody: { flex: 1, marginLeft: 12 },
  txTitle: { fontFamily: "sans-serif", color: colors.text, fontSize: 14, fontWeight: "900" },
  txSub: { fontFamily: "sans-serif", color: colors.textMuted, fontSize: 11, marginTop: 3 },
  amountPositive: { fontFamily: "sans-serif", color: colors.green, fontSize: 14, fontWeight: "900" },
  amountNegative: { fontFamily: "sans-serif", color: colors.text, fontSize: 14, fontWeight: "900" }
});
