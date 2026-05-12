import { Eye, EyeOff } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppHeader, BottomNav, colors, GreenPanel, PrimaryButton, Screen, useThemeColors } from "../../components/ui";

const transactions: Array<[string, string, string, string, boolean]> = [];

export default function WalletScreen() {
  const theme = useThemeColors();
  const [amountVisible, setAmountVisible] = useState(true);

  return (
    <Screen>
      <AppHeader title="Wallet" subtitle="Tukiwa account" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <GreenPanel>
          <Text style={styles.panelLabel}>AVAILABLE BALANCE</Text>
          <View style={styles.balanceRow}>
            <Text style={styles.balance}>{amountVisible ? "Ksh 0.00" : "Ksh *****"}</Text>
            <Pressable style={styles.visibilityButton} onPress={() => setAmountVisible((visible) => !visible)}>
              {amountVisible ? (
                <Eye color={colors.white} size={18} strokeWidth={2.4} />
              ) : (
                <EyeOff color={colors.white} size={18} strokeWidth={2.4} />
              )}
            </Pressable>
          </View>
          <Text style={styles.mpesa}>No payment method linked</Text>
          <View style={styles.walletActions}>
            <PrimaryButton tone="outline" style={styles.walletButton}>Deposit</PrimaryButton>
            <PrimaryButton tone="green" style={styles.walletButtonSoft}>Withdraw</PrimaryButton>
          </View>
        </GreenPanel>

        <Text style={[styles.section, { color: theme.text }]}>Transactions</Text>
        <View style={[styles.list, { backgroundColor: theme.surface, borderColor: theme.line }]}>
          {transactions.length ? (
            transactions.map(([icon, title, sub, amount, positive]) => (
              <View key={`${title}-${sub}`} style={[styles.tx, { borderBottomColor: theme.line }]}>
                <View
                  style={[
                    styles.txIcon,
                    { backgroundColor: theme === colors ? "#F1EEE4" : "#17251B" },
                    positive ? styles.txIconGreen : null
                  ]}
                >
                  <Text style={[styles.txIconText, { color: theme.text }]}>{icon}</Text>
                </View>
                <View style={styles.txBody}>
                  <Text style={[styles.txTitle, { color: theme.text }]}>{title}</Text>
                  <Text style={[styles.txSub, { color: theme.textMuted }]}>{sub}</Text>
                </View>
                <Text style={[positive ? styles.amountPositive : styles.amountNegative, !positive ? { color: theme.text } : null]}>{amount}</Text>
              </View>
            ))
          ) : (
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>No transactions yet.</Text>
          )}
        </View>
      </ScrollView>
      <BottomNav active="Wallet" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 112 },
  panelLabel: { fontFamily: "sans-serif", color: "rgba(255,255,255,0.72)", fontSize: 12, fontWeight: "800" },
  balanceRow: { alignItems: "center", flexDirection: "row", gap: 10, marginTop: 12 },
  balance: { fontFamily: "sans-serif", color: colors.white, fontSize: 36, fontWeight: "900" },
  visibilityButton: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 18, height: 36, justifyContent: "center", width: 36 },
  mpesa: { fontFamily: "sans-serif", color: "rgba(255,255,255,0.86)", fontSize: 12, marginTop: 3 },
  walletActions: { flexDirection: "row", gap: 12, marginTop: 22 },
  walletButton: { flex: 1 },
  walletButtonSoft: { backgroundColor: colors.navy, flex: 1 },
  section: { fontFamily: "sans-serif", color: colors.text, fontSize: 15, fontWeight: "900", marginTop: 26, marginBottom: 10 },
  list: { backgroundColor: colors.surface, borderColor: colors.line, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 16 },
  tx: { alignItems: "center", borderBottomColor: colors.line, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", paddingVertical: 14 },
  txIcon: { alignItems: "center", backgroundColor: "#F1EEE4", borderRadius: 20, height: 40, justifyContent: "center", width: 40 },
  txIconGreen: { backgroundColor: colors.greenLight },
  txIconText: { fontFamily: "sans-serif", color: colors.text, fontSize: 16 },
  txBody: { flex: 1, marginLeft: 12 },
  txTitle: { fontFamily: "sans-serif", color: colors.text, fontSize: 14, fontWeight: "900" },
  txSub: { fontFamily: "sans-serif", color: colors.textMuted, fontSize: 11, marginTop: 3 },
  emptyText: { fontFamily: "sans-serif", color: colors.textMuted, fontSize: 12, paddingVertical: 20, textAlign: "center" },
  amountPositive: { fontFamily: "sans-serif", color: colors.green, fontSize: 14, fontWeight: "900" },
  amountNegative: { fontFamily: "sans-serif", color: colors.text, fontSize: 14, fontWeight: "900" }
});
