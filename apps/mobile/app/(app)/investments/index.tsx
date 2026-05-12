import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { cents, endpoints } from "../../../lib/api";
import { AppHeader, BottomNav, Card, CardTitle, colors, RowItem, Screen, TopMetric, ui } from "../../../components/ui";

export default function InvestmentsScreen() {
  const { chamaId = "" } = useLocalSearchParams<{ chamaId: string }>();
  const { data } = useQuery({
    queryKey: ["portfolio", chamaId],
    queryFn: () => endpoints.getPortfolio(chamaId),
    enabled: Boolean(chamaId)
  });
  const totalInvested = data?.investments.reduce((sum, item) => sum + item.amountInvested, 0) ?? 0;
  const currentValue = data?.investments.reduce((sum, item) => sum + item.currentValue, 0) ?? 0;
  const gainLoss = currentValue - totalInvested;
  const gainLossPct = totalInvested ? ((gainLoss / totalInvested) * 100).toFixed(1) : "0.0";

  return (
    <Screen>
      <AppHeader title="Investments" subtitle="Portfolio value and returns" />
      <View style={styles.metrics}>
        <View style={ui.rowGap}>
          <TopMetric label="Total invested" value={cents(totalInvested)} />
          <TopMetric label="Current value" value={cents(currentValue)} accent />
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card>
          <CardTitle>Portfolio breakdown</CardTitle>
          <View style={styles.breakdown}>
            <View style={styles.donut}>
              <Text style={gainLoss >= 0 ? styles.gainPct : styles.lossPct}>
                {gainLoss >= 0 ? "+" : ""}{gainLossPct}%
              </Text>
              <Text style={styles.returnText}>return</Text>
            </View>
            <View style={ui.flex1}>
              {data?.investments.slice(0, 3).map((investment, index) => (
                <View key={investment.name} style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: index === 0 ? colors.navy : index === 1 ? colors.green : colors.teal }]} />
                  <Text style={styles.legendText} numberOfLines={1}>
                    {investment.type.replaceAll("_", " ")} - {totalInvested ? Math.round((investment.amountInvested / totalInvested) * 100) : 0}%
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </Card>
        <Card>
          <CardTitle>Investments</CardTitle>
          {data?.investments.map((investment, index) => (
            <RowItem
              key={investment.name}
              title={investment.name}
              subtitle={`${investment.type.replaceAll("_", " ")} - invested ${cents(investment.amountInvested)}`}
              avatarTone={index % 3 === 0 ? "navy" : index % 3 === 1 ? "green" : "teal"}
              right={
                <View style={styles.right}>
                  <Text style={investment.gainLoss >= 0 ? styles.gainValue : styles.lossValue}>
                    {cents(investment.currentValue)}
                  </Text>
                  <Text style={investment.gainLoss >= 0 ? styles.gainSmall : styles.lossSmall}>
                    {investment.gainLoss >= 0 ? "+" : ""}{investment.gainLossPct}%
                  </Text>
                </View>
              }
            />
          ))}
        </Card>
        <Card>
          <CardTitle>My share value</CardTitle>
          <View style={ui.rowBetween}>
            <View>
              <Text style={styles.shareValue}>{cents(0)}</Text>
              <Text style={styles.shareSub}>Share value unavailable</Text>
            </View>
            <Text style={gainLoss >= 0 ? styles.shareGain : styles.shareLoss}>
              {gainLoss >= 0 ? "+" : ""}{cents(0)}
            </Text>
          </View>
        </Card>
      </ScrollView>
      <BottomNav active="Invest" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 10, padding: 20, paddingBottom: 112 },
  metrics: { paddingHorizontal: 20, paddingTop: 6 },
  breakdown: { alignItems: "center", flexDirection: "row", gap: 16 },
  donut: { alignItems: "center", borderColor: colors.navyLight, borderRadius: 40, borderWidth: 14, height: 80, justifyContent: "center", width: 80 },
  gainPct: { fontFamily: "sans-serif", color: colors.green, fontSize: 12, fontWeight: "800" },
  lossPct: { fontFamily: "sans-serif", color: colors.red, fontSize: 12, fontWeight: "800" },
  returnText: { fontFamily: "sans-serif", color: colors.textMuted, fontSize: 9 },
  legendRow: { alignItems: "center", flexDirection: "row", gap: 8, marginBottom: 5 },
  legendDot: { borderRadius: 4, height: 8, width: 8 },
  legendText: { fontFamily: "sans-serif", color: "#475569", fontSize: 11 },
  right: { alignItems: "flex-end" },
  gainValue: { fontFamily: "sans-serif", color: colors.green, fontSize: 13, fontWeight: "800" },
  lossValue: { fontFamily: "sans-serif", color: colors.red, fontSize: 13, fontWeight: "800" },
  gainSmall: { fontFamily: "sans-serif", color: colors.green, fontSize: 10 },
  lossSmall: { fontFamily: "sans-serif", color: colors.red, fontSize: 10 },
  shareValue: { fontFamily: "sans-serif", color: colors.text, fontSize: 24, fontWeight: "800" },
  shareSub: { fontFamily: "sans-serif", color: colors.textMuted, fontSize: 11, marginTop: 3 },
  shareGain: { fontFamily: "sans-serif", backgroundColor: colors.greenLight, borderRadius: 999, color: colors.green, fontSize: 10, fontWeight: "800", overflow: "hidden", paddingHorizontal: 9, paddingVertical: 4 },
  shareLoss: { fontFamily: "sans-serif", backgroundColor: colors.redLight, borderRadius: 999, color: colors.red, fontSize: 10, fontWeight: "800", overflow: "hidden", paddingHorizontal: 9, paddingVertical: 4 }
});
