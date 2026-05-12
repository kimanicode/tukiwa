import type { ReactNode } from "react";
import { router } from "expo-router";
import { Bitcoin, HandCoins, House, Users, WalletMinimal } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View, type DimensionValue, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeStore } from "../stores/theme.store";

type BadgeTone = "green" | "navy" | "amber" | "red" | "teal" | "muted";
type AvatarTone = "green" | "navy" | "amber" | "teal";

export const colors = {
  navy: "#061A40",
  navyDark: "#03102A",
  navyLight: "#E6ECF7",
  blueText: "#CDEED8",
  green: "#007A35",
  green2: "#07913F",
  greenLight: "#DFF3E7",
  greenSoft: "#EFF8F2",
  greenBright: "#2EBE72",
  teal: "#0F6E56",
  tealLight: "#E1F5EE",
  amber: "#F59E0B",
  amberDark: "#92400E",
  amberLight: "#FEF3C7",
  orange: "#F5A623",
  rust: "#C95F32",
  red: "#A32D2D",
  redLight: "#FCEBEB",
  canvas: "#FAF7ED",
  surface: "#FFFCF4",
  text: "#17231B",
  textMuted: "#667268",
  line: "#E3DED0",
  white: "#FFFFFF"
};

export const darkColors = {
  ...colors,
  navyLight: "#123C25",
  blueText: "#CDEED8",
  greenLight: "#123C25",
  greenSoft: "#0F2D1C",
  tealLight: "#12372E",
  amberLight: "#3D2D12",
  redLight: "#3D1717",
  canvas: "#07120C",
  surface: "#101C14",
  text: "#F3F8F0",
  textMuted: "#A9B8AB",
  line: "#243326"
};

export function useThemeColors() {
  return useThemeStore((state) => (state.resolvedTheme === "dark" ? darkColors : colors));
}

function badgeStyles(theme: typeof colors): Record<BadgeTone, StyleProp<TextStyle>> {
  return {
    green: { backgroundColor: theme.greenLight, color: theme.greenBright },
    navy: { backgroundColor: theme.greenLight, color: theme.greenBright },
    amber: { backgroundColor: theme.amberLight, color: theme.amber },
    red: { backgroundColor: theme.redLight, color: theme.red },
    teal: { backgroundColor: theme.tealLight, color: theme.teal },
    muted: { backgroundColor: theme === darkColors ? "#17251B" : "#F1F5F9", color: theme.textMuted }
  };
};

function avatarStyles(theme: typeof colors): Record<AvatarTone, { box: ViewStyle; text: TextStyle }> {
  return {
    green: { box: { backgroundColor: theme.greenLight }, text: { color: theme.greenBright } },
    navy: { box: { backgroundColor: theme.greenLight }, text: { color: theme.greenBright } },
    amber: { box: { backgroundColor: theme.amberLight }, text: { color: theme.amber } },
    teal: { box: { backgroundColor: theme.tealLight }, text: { color: theme.teal } }
  };
}

export function Screen({ children }: { children: ReactNode }) {
  const theme = useThemeColors();
  return (
    <SafeAreaView edges={["top"]} style={[styles.screen, { backgroundColor: theme.canvas }]}>
      {children}
    </SafeAreaView>
  );
}

export function AppHeader({
  title,
  subtitle,
  action,
  back
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  back?: boolean;
}) {
  const theme = useThemeColors();
  return (
    <View style={[styles.appHeader, { borderBottomColor: theme.line }]}>
      <View style={styles.headerLeft}>
        {back ? (
          <Pressable style={[styles.backCircle, { backgroundColor: theme === darkColors ? "#17251B" : "#F1EEE4" }]} onPress={() => router.back()}>
            <Text style={[styles.backArrow, { color: theme.text }]}>‹</Text>
          </Pressable>
        ) : null}
        <View>
          <Text style={[styles.appHeaderTitle, { color: theme.text }]}>{title}</Text>
          {subtitle ? <Text style={[styles.appHeaderSub, { color: theme.textMuted }]}>{subtitle}</Text> : null}
        </View>
      </View>
      {action}
    </View>
  );
}

export function CircleButton({ label, onPress, muted }: { label: string; onPress?: () => void; muted?: boolean }) {
  const theme = useThemeColors();
  return (
    <Pressable style={[muted ? styles.circleButtonMuted : styles.circleButton, muted ? { backgroundColor: theme === darkColors ? "#17251B" : "#F1EEE4" } : null]} onPress={onPress}>
      <Text style={[muted ? styles.circleButtonTextMuted : styles.circleButtonText, muted ? { color: theme.text } : null]}>{label}</Text>
    </Pressable>
  );
}

export function BottomNav({ active }: { active: "Home" | "Chamas" | "Loans" | "Invest" | "Wallet" }) {
  const insets = useSafeAreaInsets();
  const theme = useThemeColors();
  const items: Array<{ label: "Home" | "Chamas" | "Loans" | "Invest" | "Wallet"; icon: string; path: string }> = [
    { label: "Home", icon: "⌂", path: "/(app)" },
    { label: "Chamas", icon: "♙", path: "/(app)/chamas" },
    { label: "Loans", icon: "▣", path: "/(app)/loans" },
    { label: "Invest", icon: "⌁", path: "/(app)/investments" },
    { label: "Wallet", icon: "▤", path: "/(app)/wallet" }
  ];

  return (
    <View style={[styles.bottomNav, { backgroundColor: theme.surface, borderTopColor: theme.line, height: 70 + insets.bottom, paddingBottom: Math.max(insets.bottom, 10) }]}>
      {items.map((item) => {
        const isActive = item.label === active;
        return (
          <Pressable key={item.label} style={styles.navItem} onPress={() => router.push(item.path as never)}>
            <View style={[isActive ? styles.navIconActive : styles.navIcon, isActive ? { backgroundColor: theme.greenLight } : null]}>
              {item.label === "Home" ? (
                <House color={isActive ? theme.greenBright : theme.textMuted} size={24} strokeWidth={isActive ? 2.6 : 2.2} />
              ) : item.label === "Chamas" ? (
                <Users color={isActive ? theme.greenBright : theme.textMuted} size={24} strokeWidth={isActive ? 2.6 : 2.2} />
              ) : item.label === "Loans" ? (
                <HandCoins color={isActive ? theme.greenBright : theme.textMuted} size={24} strokeWidth={isActive ? 2.6 : 2.2} />
              ) : item.label === "Invest" ? (
                <Bitcoin color={isActive ? theme.greenBright : theme.textMuted} size={24} strokeWidth={isActive ? 2.6 : 2.2} />
              ) : item.label === "Wallet" ? (
                <WalletMinimal color={isActive ? theme.greenBright : theme.textMuted} size={24} strokeWidth={isActive ? 2.6 : 2.2} />
              ) : (
                <Text style={[isActive ? styles.navIconTextActive : styles.navIconText, { color: isActive ? theme.greenBright : theme.textMuted }]}>{item.icon}</Text>
              )}
            </View>
            <Text style={[isActive ? styles.navLabelActive : styles.navLabel, { color: isActive ? theme.greenBright : theme.textMuted }]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function GreenPanel({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.greenPanel, style]}>{children}</View>;
}

export function SoftCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useThemeColors();
  return <View style={[styles.softCard, { backgroundColor: theme.surface, borderColor: theme.line }, style]}>{children}</View>;
}

export function Pill({ children, active }: { children: ReactNode; active?: boolean }) {
  return <View style={active ? styles.pillActive : styles.pill}><Text style={active ? styles.pillTextActive : styles.pillText}>{children}</Text></View>;
}

export function TopBar({
  backLabel,
  title,
  subtitle,
  action,
  children
}: {
  backLabel?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <View style={styles.topbar}>
      <View style={styles.topbarRow}>
        <Text style={styles.backLabel}>{backLabel ?? ""}</Text>
        {action}
      </View>
      <View style={styles.topbarTitleWrap}>
        <Text style={styles.topbarTitle}>{title}</Text>
        {subtitle ? <Text style={styles.topbarSub}>{subtitle}</Text> : null}
      </View>
      {children ? <View style={styles.topbarChildren}>{children}</View> : null}
    </View>
  );
}

export function TopMetric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={styles.topMetric}>
      <Text style={styles.topMetricLabel}>{label}</Text>
      <Text style={[styles.topMetricValue, accent ? styles.topMetricAccent : null]}>{value}</Text>
    </View>
  );
}

export function Card({ children, compact, style }: { children: ReactNode; compact?: boolean; style?: StyleProp<ViewStyle> }) {
  const theme = useThemeColors();
  return <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line }, compact ? styles.cardCompact : null, style]}>{children}</View>;
}

export function CardTitle({ children }: { children: ReactNode }) {
  const theme = useThemeColors();
  return <Text style={[styles.cardTitle, { color: theme.textMuted }]}>{children}</Text>;
}

export function Badge({ children, tone = "muted" }: { children: ReactNode; tone?: BadgeTone }) {
  const theme = useThemeColors();
  return <Text style={[styles.badge, badgeStyles(theme)[tone]]}>{children}</Text>;
}

export function Avatar({ label, tone = "navy" }: { label: string; tone?: AvatarTone }) {
  const theme = useThemeColors();
  const avatarTone = avatarStyles(theme);
  return (
    <View style={[styles.avatar, avatarTone[tone].box]}>
      <Text style={[styles.avatarText, avatarTone[tone].text]}>{initials(label)}</Text>
    </View>
  );
}

export function RowItem({
  title,
  subtitle,
  right,
  avatarTone: tone = "navy"
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  avatarTone?: AvatarTone;
}) {
  const theme = useThemeColors();
  return (
    <View style={[styles.rowItem, { borderBottomColor: theme.line }]}>
      <View style={styles.rowLeft}>
        <Avatar label={title} tone={tone} />
        <View style={styles.rowTextWrap}>
          <Text style={[styles.rowName, { color: theme.text }]} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={[styles.rowSub, { color: theme.textMuted }]} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
      </View>
      {right ? <View style={styles.rowRight}>{right}</View> : null}
    </View>
  );
}

export function ProgressBar({ progress, tone = "green" }: { progress: number; tone?: "green" | "navy" }) {
  const width = `${Math.max(0, Math.min(progress, 1)) * 100}%` as DimensionValue;
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width, backgroundColor: tone === "navy" ? colors.navy : colors.green }]} />
    </View>
  );
}

export function PrimaryButton({
  children,
  onPress,
  tone = "navy",
  style
}: {
  children: ReactNode;
  onPress?: () => void;
  tone?: "navy" | "green" | "outline";
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useThemeColors();
  return (
    <Pressable
      style={[
        styles.button,
        tone === "outline" ? [styles.buttonOutline, { borderColor: theme.line }] : tone === "green" ? styles.buttonGreen : styles.buttonNavy,
        style
      ]}
      onPress={onPress}
    >
      <Text style={[styles.buttonText, tone === "outline" ? styles.buttonTextOutline : null]}>{children}</Text>
    </Pressable>
  );
}

export function StatRow({ children }: { children: ReactNode }) {
  return <View style={styles.statRow}>{children}</View>;
}

export function StatBox({ label, value, tone }: { label: string; value: string; tone?: "green" | "navy" }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, tone === "green" ? styles.textGreen : tone === "navy" ? styles.textNavy : null]}>{value}</Text>
    </View>
  );
}

export const ui = StyleSheet.create({
  pagePad: { padding: 20, gap: 14 },
  row: { flexDirection: "row", alignItems: "center" },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rowGap: { flexDirection: "row", gap: 8 },
  flex1: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center" },
  muted: { color: colors.textMuted },
  title: { fontFamily: "sans-serif", color: colors.text, fontSize: 16, fontWeight: "700" },
  small: { fontFamily: "sans-serif", color: colors.textMuted, fontSize: 11 },
  sectionTitle: { fontFamily: "sans-serif", color: colors.text, fontSize: 16, fontWeight: "800", marginBottom: 10 },
  input: { fontFamily: "sans-serif", backgroundColor: colors.surface, borderColor: colors.line, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, color: colors.text, fontSize: 14, paddingHorizontal: 16, paddingVertical: 14 },
  fab: {
    position: "absolute",
    right: 24,
    bottom: 32,
    height: 56,
    width: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.navy,
    elevation: 6
  },
  fabText: { fontFamily: "sans-serif", color: colors.white, fontSize: 30, lineHeight: 34, fontWeight: "300" }
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  appHeader: {
    alignItems: "center",
    borderBottomColor: colors.line,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 20
  },
  headerLeft: { alignItems: "center", flexDirection: "row", gap: 12 },
  appHeaderTitle: { fontFamily: "sans-serif", color: colors.text, fontSize: 20, fontWeight: "900" },
  appHeaderSub: { fontFamily: "sans-serif", color: colors.textMuted, fontSize: 12, marginTop: 3 },
  backCircle: { alignItems: "center", backgroundColor: "#F1EEE4", borderRadius: 18, height: 36, justifyContent: "center", width: 36 },
  backArrow: { fontFamily: "sans-serif", color: colors.text, fontSize: 27, lineHeight: 29 },
  circleButton: { alignItems: "center", backgroundColor: colors.navy, borderRadius: 18, height: 36, justifyContent: "center", width: 36 },
  circleButtonMuted: { alignItems: "center", backgroundColor: "#F1EEE4", borderRadius: 18, height: 36, justifyContent: "center", width: 36 },
  circleButtonText: { fontFamily: "sans-serif", color: colors.white, fontSize: 20, fontWeight: "800", lineHeight: 22 },
  circleButtonTextMuted: { fontFamily: "sans-serif", color: colors.text, fontSize: 18, fontWeight: "800", lineHeight: 20 },
  bottomNav: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderTopColor: colors.line,
    borderTopWidth: StyleSheet.hairlineWidth,
    bottom: 0,
    flexDirection: "row",
    height: 84,
    justifyContent: "space-around",
    left: 0,
    paddingBottom: 14,
    paddingTop: 10,
    position: "absolute",
    right: 0
  },
  navItem: { alignItems: "center", flex: 1 },
  navIcon: { alignItems: "center", borderRadius: 22, height: 44, justifyContent: "center", width: 44 },
  navIconActive: { alignItems: "center", backgroundColor: colors.greenLight, borderRadius: 22, height: 44, justifyContent: "center", width: 44 },
  navIconText: { fontFamily: "sans-serif", color: colors.textMuted, fontSize: 24, fontWeight: "700" },
  navIconTextActive: { fontFamily: "sans-serif", color: colors.green, fontSize: 24, fontWeight: "900" },
  navLabel: { fontFamily: "sans-serif", color: colors.textMuted, fontSize: 11, marginTop: 2 },
  navLabelActive: { fontFamily: "sans-serif", color: colors.green, fontSize: 11, fontWeight: "800", marginTop: 2 },
  greenPanel: {
    backgroundColor: colors.green,
    borderRadius: 22,
    padding: 20,
    shadowColor: colors.green,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.14,
    shadowRadius: 20
  },
  softCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.05,
    shadowRadius: 14
  },
  pill: { backgroundColor: "#F1EEE4", borderRadius: 18, paddingHorizontal: 15, paddingVertical: 8 },
  pillActive: { backgroundColor: colors.navy, borderRadius: 18, paddingHorizontal: 15, paddingVertical: 8 },
  pillText: { fontFamily: "sans-serif", color: colors.text, fontSize: 12, fontWeight: "600" },
  pillTextActive: { fontFamily: "sans-serif", color: colors.white, fontSize: 12, fontWeight: "800" },
  topbar: { backgroundColor: colors.green, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 },
  topbarRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backLabel: { fontFamily: "sans-serif", color: colors.blueText, fontSize: 12, fontWeight: "500" },
  topbarTitleWrap: { marginTop: 12 },
  topbarTitle: { fontFamily: "sans-serif", color: colors.white, fontSize: 19, fontWeight: "700" },
  topbarSub: { fontFamily: "sans-serif", color: colors.blueText, fontSize: 12, marginTop: 3 },
  topbarChildren: { marginTop: 14 },
  topMetric: { flex: 1, backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9 },
  topMetricLabel: { fontFamily: "sans-serif", color: colors.blueText, fontSize: 10 },
  topMetricValue: { fontFamily: "sans-serif", color: colors.white, fontSize: 15, fontWeight: "700", marginTop: 3 },
  topMetricAccent: { color: colors.greenBright },
  card: { backgroundColor: colors.surface, borderColor: colors.line, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 16, paddingVertical: 14 },
  cardCompact: { paddingHorizontal: 12, paddingVertical: 8 },
  cardTitle: { fontFamily: "sans-serif", color: colors.textMuted, fontSize: 12, fontWeight: "700", marginBottom: 8 },
  badge: { fontFamily: "sans-serif", alignSelf: "flex-start", borderRadius: 999, fontSize: 10, fontWeight: "700", overflow: "hidden", paddingHorizontal: 9, paddingVertical: 4 },
  avatar: { alignItems: "center", borderRadius: 16, height: 32, justifyContent: "center", width: 32 },
  avatarText: { fontFamily: "sans-serif", fontSize: 11, fontWeight: "700" },
  rowItem: { alignItems: "center", borderBottomColor: "#F1F5F9", borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", justifyContent: "space-between", paddingVertical: 10 },
  rowLeft: { alignItems: "center", flex: 1, flexDirection: "row", gap: 10, minWidth: 0 },
  rowTextWrap: { flex: 1, minWidth: 0 },
  rowName: { fontFamily: "sans-serif", color: colors.text, fontSize: 13, fontWeight: "700" },
  rowSub: { fontFamily: "sans-serif", color: colors.textMuted, fontSize: 11, marginTop: 2 },
  rowRight: { alignItems: "flex-end", marginLeft: 10 },
  progressTrack: { backgroundColor: "#F1F5F9", borderRadius: 999, height: 6, marginTop: 8, overflow: "hidden" },
  progressFill: { borderRadius: 999, height: 6 },
  button: { borderRadius: 14, paddingVertical: 15 },
  buttonNavy: { backgroundColor: colors.navy },
  buttonGreen: { backgroundColor: colors.navy },
  buttonOutline: { backgroundColor: colors.navy, borderColor: colors.navy, borderWidth: StyleSheet.hairlineWidth },
  buttonText: { fontFamily: "sans-serif", color: colors.white, fontSize: 14, fontWeight: "700", textAlign: "center" },
  buttonTextOutline: { color: colors.white },
  statRow: { flexDirection: "row", gap: 8 },
  statBox: { backgroundColor: "#F8FAFC", borderRadius: 8, flex: 1, paddingHorizontal: 10, paddingVertical: 10 },
  statLabel: { fontFamily: "sans-serif", color: colors.textMuted, fontSize: 11 },
  statValue: { fontFamily: "sans-serif", color: colors.text, fontSize: 17, fontWeight: "700", marginTop: 3 },
  textGreen: { color: colors.green },
  textNavy: { color: colors.green }
});

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase();
}
