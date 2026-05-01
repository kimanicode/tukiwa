import { StyleSheet, Text, View } from "react-native";
import { colors } from "../ui";

export function ReviewItem({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value === undefined || value === null || value === "" ? "Not set" : String(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    borderBottomColor: colors.line,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    paddingVertical: 10
  },
  label: { fontFamily: "sans-serif", color: colors.textMuted, flex: 1, fontSize: 12 },
  value: { fontFamily: "sans-serif", color: colors.text, flex: 1.2, fontSize: 12, fontWeight: "800", textAlign: "right" }
});
