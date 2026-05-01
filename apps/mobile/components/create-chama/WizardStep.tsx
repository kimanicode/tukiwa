import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, ProgressBar } from "../ui";

export function WizardStep({
  title,
  subtitle,
  current,
  total,
  children
}: {
  title: string;
  subtitle: string;
  current: number;
  total: number;
  children: ReactNode;
}) {
  return (
    <View style={styles.wrap}>
      <View>
        <Text style={styles.kicker}>STEP {current} OF {total}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <ProgressBar progress={current / total} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 16 },
  kicker: { fontFamily: "sans-serif", color: colors.green, fontSize: 11, fontWeight: "900" },
  title: { fontFamily: "sans-serif", color: colors.text, fontSize: 24, fontWeight: "900", marginTop: 4 },
  subtitle: { fontFamily: "sans-serif", color: colors.textMuted, fontSize: 13, lineHeight: 19, marginTop: 4 }
});
