import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { AppHeader, BottomNav, colors, GreenPanel, PrimaryButton, Screen, SoftCard } from "../../../components/ui";
import { cents, endpoints } from "../../../lib/api";

export default function ContributeScreen() {
  const { chamaId = "" } = useLocalSearchParams<{ chamaId: string }>();
  const chama = useQuery({ queryKey: ["chama", chamaId], queryFn: () => endpoints.getChama(chamaId), enabled: Boolean(chamaId) });
  const due = useMemo(() => ({
    amount: chama.data?.settings?.contributionAmount || 500000,
    dueDate: new Date().toISOString()
  }), [chama.data?.settings?.contributionAmount]);
  const feePreview = useQuery({
    queryKey: ["fee-preview", "CONTRIBUTION", due.amount],
    queryFn: () => endpoints.getFeePreview(due.amount, "CONTRIBUTION"),
    enabled: due.amount > 0
  });
  const mutation = useMutation({
    mutationFn: () => endpoints.initiateContribution(chamaId, { amount: due.amount, dueDate: due.dueDate })
  });
  const fee = feePreview.data ?? {
    feeAmount: 0,
    netAmount: due.amount,
    chargeAmount: due.amount,
    feeRate: 0.008,
    deductionModel: "on_top" as const
  };

  return (
    <Screen>
      <AppHeader title="Pay via M-Pesa" back />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <GreenPanel>
          <Text style={styles.panelLabel}>AMOUNT</Text>
          <View style={styles.amountRow}>
            <Text style={styles.currency}>KES</Text>
            <Text style={styles.amount}>{Math.round(due.amount / 100).toLocaleString("en-KE")}</Text>
          </View>
          <View style={styles.chips}>
            {["KES 1.0K", "KES 5.0K", "KES 10K", "KES 20K"].map((chip) => (
              <View key={chip} style={styles.chip}><Text style={styles.chipText}>{chip}</Text></View>
            ))}
          </View>
        </GreenPanel>

        <Text style={styles.label}>M-Pesa phone</Text>
        <View style={styles.phoneBox}>
          <Text style={styles.phoneIcon}>▯</Text>
          <Text style={styles.phone}>+254 712 345 678</Text>
        </View>

        <SoftCard style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Contribution amount</Text>
            <Text style={styles.summaryValue}>{kes(due.amount)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Platform fee ({(fee.feeRate * 100).toFixed(1)}%)</Text>
            <Text style={styles.summaryValue}>{feePreview.isLoading ? "..." : kes(fee.feeAmount)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total charged</Text>
            <Text style={styles.total}>{kes(fee.chargeAmount)}</Text>
          </View>
        </SoftCard>

        <PrimaryButton tone="green" onPress={() => mutation.mutate()}>Pay now</PrimaryButton>
      </ScrollView>
      <BottomNav active="Wallet" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 112 },
  panelLabel: { fontFamily: "sans-serif", color: "rgba(255,255,255,0.72)", fontSize: 12, fontWeight: "800" },
  amountRow: { alignItems: "flex-end", flexDirection: "row", gap: 10, marginTop: 6 },
  currency: { fontFamily: "sans-serif", color: "rgba(255,255,255,0.82)", fontSize: 12, fontWeight: "900", marginBottom: 8 },
  amount: { fontFamily: "sans-serif", color: colors.white, fontSize: 36, fontWeight: "900" },
  chips: { flexDirection: "row", gap: 10, marginTop: 16 },
  chip: { backgroundColor: "rgba(255,255,255,0.16)", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 7 },
  chipText: { fontFamily: "sans-serif", color: colors.white, fontSize: 11, fontWeight: "900" },
  label: { fontFamily: "sans-serif", color: colors.text, fontSize: 12, fontWeight: "800", marginTop: 26, marginBottom: 8 },
  phoneBox: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.line, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 12, padding: 15 },
  phoneIcon: { fontFamily: "sans-serif", color: colors.textMuted, fontSize: 16 },
  phone: { fontFamily: "sans-serif", color: colors.text, fontSize: 14 },
  summary: { gap: 22, marginTop: 20 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between" },
  divider: { backgroundColor: colors.line, height: StyleSheet.hairlineWidth },
  summaryLabel: { fontFamily: "sans-serif", color: colors.textMuted, fontSize: 12 },
  summaryValue: { fontFamily: "sans-serif", color: colors.text, fontSize: 14, fontWeight: "900" },
  total: { fontFamily: "sans-serif", color: colors.green, fontSize: 16, fontWeight: "900" }
});

function kes(amount: number): string {
  return cents(amount).replace("KES", "KSh");
}
