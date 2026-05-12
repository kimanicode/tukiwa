import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../ui";

export function SelectCard({
  icon,
  label,
  description,
  selected,
  onPress
}: {
  icon: ReactNode;
  label: string;
  description?: string;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={selected ? styles.active : styles.card} onPress={onPress}>
      <View style={selected ? styles.iconActive : styles.icon}>
        <Text style={selected ? styles.iconTextActive : styles.iconText}>{icon}</Text>
      </View>
      <View style={styles.body}>
        <Text style={selected ? styles.labelActive : styles.label}>{label}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 12,
    padding: 14
  },
  active: {
    alignItems: "center",
    backgroundColor: colors.greenSoft,
    borderColor: colors.green,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 14
  },
  icon: { alignItems: "center", backgroundColor: "#F1EEE4", borderRadius: 18, height: 36, justifyContent: "center", width: 36 },
  iconActive: { alignItems: "center", backgroundColor: colors.navy, borderRadius: 18, height: 36, justifyContent: "center", width: 36 },
  iconText: { fontFamily: "sans-serif", color: colors.textMuted, fontSize: 17, fontWeight: "900" },
  iconTextActive: { fontFamily: "sans-serif", color: colors.white, fontSize: 17, fontWeight: "900" },
  body: { flex: 1 },
  label: { fontFamily: "sans-serif", color: colors.text, fontSize: 14, fontWeight: "900" },
  labelActive: { fontFamily: "sans-serif", color: colors.green, fontSize: 14, fontWeight: "900" },
  description: { fontFamily: "sans-serif", color: colors.textMuted, fontSize: 12, lineHeight: 17, marginTop: 3 }
});
