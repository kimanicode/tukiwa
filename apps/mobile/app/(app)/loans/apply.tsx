import { applyLoanSchema } from "@chama/shared";
import { useMutation } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AppHeader, BottomNav, colors, GreenPanel, PrimaryButton, ProgressBar, Screen, SoftCard, ui } from "../../../components/ui";
import { cents, endpoints } from "../../../lib/api";

export default function ApplyLoanScreen() {
  const { chamaId = "", eligibleMax = "20000000" } = useLocalSearchParams<{ chamaId: string; eligibleMax: string }>();
  const max = Number(eligibleMax);
  const [amount] = useState(Math.min(3000000, max));
  const [purpose, setPurpose] = useState("");
  const repayment = useMemo(() => Math.round(amount * 1.04), [amount]);
  const mutation = useMutation({
    mutationFn: () => endpoints.applyLoan(chamaId, applyLoanSchema.parse({ amount, installments: 1 }))
  });

  return (
    <Screen>
      <AppHeader title="Request loan" subtitle="Hustlers Table Banking" back />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <GreenPanel>
          <Text style={styles.panelLabel}>LOAN AMOUNT</Text>
          <Text style={styles.amount}>{cents(amount).replace("KES", "Ksh")}</Text>
          <ProgressBar progress={amount / max} tone="green" />
          <View style={ui.rowBetween}>
            <Text style={styles.range}>KES 5K</Text>
            <Text style={styles.range}>KES 200K</Text>
          </View>
        </GreenPanel>

        <View style={ui.rowBetween}>
          <Text style={styles.label}>Repayment period</Text>
          <Text style={styles.value}>6 months</Text>
        </View>
        <ProgressBar progress={0.64} tone="green" />

        <SoftCard style={styles.summary}>
          <SummaryRow label="Interest rate" value="8% p.a." />
          <SummaryRow label="Monthly repayment" value="Ksh 5,200" green />
          <SummaryRow label="Total payable" value={cents(repayment).replace("KES", "Ksh")} />
        </SoftCard>

        <Text style={styles.label}>Reason</Text>
        <TextInput
          style={styles.reason}
          placeholder="Briefly tell members why you need this loan."
          placeholderTextColor={colors.textMuted}
          value={purpose}
          onChangeText={setPurpose}
          multiline
        />

        <Text style={styles.label}>Guarantor (member)</Text>
        <View style={styles.select}><Text style={styles.selectText}>Faith Achieng</Text></View>

        <PrimaryButton tone="green" onPress={() => mutation.mutate()}>Submit request</PrimaryButton>
      </ScrollView>
      <BottomNav active="Loans" />
    </Screen>
  );
}

function SummaryRow({ label, value, green }: { label: string; value: string; green?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={green ? styles.summaryGreen : styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 112 },
  panelLabel: { fontFamily: "sans-serif", color: "rgba(255,255,255,0.72)", fontSize: 12, fontWeight: "800" },
  amount: { fontFamily: "sans-serif", color: colors.white, fontSize: 31, fontWeight: "900", marginTop: 8 },
  range: { fontFamily: "sans-serif", color: "rgba(255,255,255,0.82)", fontSize: 11, marginTop: 12 },
  label: { fontFamily: "sans-serif", color: colors.text, fontSize: 12, fontWeight: "800", marginTop: 22 },
  value: { fontFamily: "sans-serif", color: colors.text, fontSize: 12, fontWeight: "800", marginTop: 22 },
  summary: { gap: 18, marginTop: 20 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between" },
  summaryLabel: { fontFamily: "sans-serif", color: colors.textMuted, fontSize: 12 },
  summaryValue: { fontFamily: "sans-serif", color: colors.text, fontSize: 14, fontWeight: "900" },
  summaryGreen: { fontFamily: "sans-serif", color: colors.green, fontSize: 15, fontWeight: "900" },
  reason: { backgroundColor: colors.surface, borderColor: colors.line, borderRadius: 15, borderWidth: StyleSheet.hairlineWidth, color: colors.text, minHeight: 78, padding: 14, textAlignVertical: "top" },
  select: { backgroundColor: colors.surface, borderColor: colors.line, borderRadius: 15, borderWidth: StyleSheet.hairlineWidth, padding: 14 },
  selectText: { fontFamily: "sans-serif", color: colors.textMuted, fontSize: 14 }
});
