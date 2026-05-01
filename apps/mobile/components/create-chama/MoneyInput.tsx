import { StyleSheet, Text, TextInput, View } from "react-native";
import { colors } from "../ui";

export function MoneyInput({
  label,
  value,
  onChange,
  error,
  placeholder = "KSh 0"
}: {
  label: string;
  value: number;
  onChange: (cents: number) => void;
  error?: string;
  placeholder?: string;
}) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        keyboardType="number-pad"
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        value={value ? formatKes(value) : ""}
        onChangeText={(text) => onChange(toCents(text))}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export function formatKes(cents: number) {
  return `KSh ${(cents / 100).toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
}

function toCents(value: string) {
  const raw = value.replace(/\D/g, "");
  return raw ? Number(raw) * 100 : 0;
}

const styles = StyleSheet.create({
  wrap: { gap: 7 },
  label: { fontFamily: "sans-serif", color: colors.text, fontSize: 12, fontWeight: "900" },
  input: {
    fontFamily: "sans-serif",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    color: colors.text,
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 14
  },
  error: { fontFamily: "sans-serif", color: colors.red, fontSize: 12 }
});
