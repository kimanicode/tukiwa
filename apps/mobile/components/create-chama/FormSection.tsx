import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, SoftCard } from "../ui";

export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      <SoftCard style={styles.card}>{children}</SoftCard>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  title: { fontFamily: "sans-serif", color: colors.text, fontSize: 15, fontWeight: "900" },
  card: { gap: 12 }
});
