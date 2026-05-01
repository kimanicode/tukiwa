import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { endpoints } from "../../../lib/api";
import { Badge, Card, CardTitle, colors, ProgressBar, Screen, TopBar, ui } from "../../../components/ui";

export default function RotationTimelineScreen() {
  const { chamaId = "" } = useLocalSearchParams<{ chamaId: string }>();
  const { data = [] } = useQuery({
    queryKey: ["rotations", chamaId],
    queryFn: () => endpoints.getRotations(chamaId)
  });
  const current = data.find((rotation) => rotation.status === "SCHEDULED");

  return (
    <Screen>
      <TopBar
        backLabel="Chama"
        title="Rotation schedule"
        subtitle={`Current: ${current?.member?.user?.fullName ?? "Not scheduled"}`}
      >
        <View style={styles.currentBox}>
          <View style={ui.rowBetween}>
            <View>
              <Text style={styles.topLabel}>Current recipient</Text>
              <Text style={styles.topValue}>{current?.member?.user?.fullName ?? "None"}</Text>
            </View>
            <View style={styles.right}>
              <Text style={styles.topLabel}>Payout date</Text>
              <Text style={styles.topDate}>
                {current?.scheduledAt ? new Date(current.scheduledAt).toLocaleDateString("en-KE", { month: "short", day: "numeric" }) : "TBD"}
              </Text>
            </View>
          </View>
        </View>
      </TopBar>
      <ScrollView contentContainerStyle={{ padding: 12, gap: 10 }}>
        <Card>
          <View style={ui.rowBetween}>
            <CardTitle>Collection progress</CardTitle>
            <Text style={styles.paidText}>9/12 paid</Text>
          </View>
          <ProgressBar progress={0.75} />
          <Text style={styles.progressSub}>Collection progress for the current payout</Text>
        </Card>
        <Card>
          <CardTitle>Full rotation</CardTitle>
          <View style={styles.timeline}>
            {data.map((rotation, index) => {
              const active = rotation.id === current?.id;
              const done = rotation.status === "PAID";
              const isLast = index === data.length - 1;
              return (
                <View key={rotation.id} style={active ? styles.timelineItemActive : styles.timelineItem}>
                  <View style={styles.timelineRail}>
                    <View style={done ? styles.dotDone : active ? styles.dotActive : styles.dotPending}>
                      <Text style={done ? styles.dotTextDone : active ? styles.dotTextActive : styles.dotTextPending}>
                        {done ? "OK" : rotation.position}
                      </Text>
                    </View>
                    {!isLast ? <View style={styles.line} /> : null}
                  </View>
                  <View style={styles.timelineBody}>
                    <View style={ui.flex1}>
                      <Text style={active ? styles.memberActive : styles.memberName} numberOfLines={1}>
                        {rotation.member?.user?.fullName ?? "Member"}
                      </Text>
                      <Text style={styles.memberDate}>
                        {new Date(rotation.scheduledAt).toLocaleDateString("en-KE", { month: "long", year: "numeric" })}
                      </Text>
                    </View>
                    <Badge tone={done ? "green" : active ? "navy" : "muted"}>{done ? "Paid out" : active ? "In progress" : "Pending"}</Badge>
                  </View>
                </View>
              );
            })}
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  currentBox: { backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  topLabel: { fontFamily: "sans-serif", color: colors.blueText, fontSize: 10 },
  topValue: { fontFamily: "sans-serif", color: colors.white, fontSize: 15, fontWeight: "800", marginTop: 3 },
  topDate: { fontFamily: "sans-serif", color: colors.greenBright, fontSize: 13, fontWeight: "800", marginTop: 3 },
  right: { alignItems: "flex-end" },
  paidText: { fontFamily: "sans-serif", color: colors.green, fontSize: 11, fontWeight: "800" },
  progressSub: { fontFamily: "sans-serif", color: colors.textMuted, fontSize: 10, marginTop: 5 },
  timeline: { paddingVertical: 4 },
  timelineItem: { flexDirection: "row", gap: 10, paddingVertical: 8 },
  timelineItemActive: { backgroundColor: "#F8FAFC", borderRadius: 9, flexDirection: "row", gap: 10, paddingHorizontal: 4, paddingVertical: 8 },
  timelineRail: { alignItems: "center" },
  dotDone: { alignItems: "center", backgroundColor: colors.greenLight, borderRadius: 12, height: 24, justifyContent: "center", width: 24 },
  dotActive: { alignItems: "center", backgroundColor: colors.navy, borderRadius: 12, height: 24, justifyContent: "center", width: 24 },
  dotPending: { alignItems: "center", backgroundColor: "#F8FAFC", borderColor: colors.line, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, height: 24, justifyContent: "center", width: 24 },
  dotTextDone: { fontFamily: "sans-serif", color: colors.green, fontSize: 9, fontWeight: "800" },
  dotTextActive: { fontFamily: "sans-serif", color: colors.white, fontSize: 10, fontWeight: "800" },
  dotTextPending: { fontFamily: "sans-serif", color: colors.textMuted, fontSize: 10, fontWeight: "800" },
  line: { backgroundColor: "#E2E8F0", height: 32, marginTop: 4, width: 2 },
  timelineBody: { alignItems: "center", flex: 1, flexDirection: "row", justifyContent: "space-between", minWidth: 0 },
  memberName: { fontFamily: "sans-serif", color: colors.text, fontSize: 13, fontWeight: "800" },
  memberActive: { fontFamily: "sans-serif", color: colors.navy, fontSize: 13, fontWeight: "800" },
  memberDate: { fontFamily: "sans-serif", color: colors.textMuted, fontSize: 11, marginTop: 2 }
});
