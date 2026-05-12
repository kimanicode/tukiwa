import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import {
  AppHeader,
  Badge,
  colors,
  PrimaryButton,
  RowItem,
  Screen,
  SoftCard,
  ui
} from "../../../../components/ui";
import { cents, endpoints } from "../../../../lib/api";

export default function SignatoriesScreen() {
  const { chamaId = "" } = useLocalSearchParams<{ chamaId: string }>();
  const queryClient = useQueryClient();
  const [requiredApprovals, setRequiredApprovals] = useState(2);
  const [threshold, setThreshold] = useState("5000");
  const [selectedUserId, setSelectedUserId] = useState("");

  const signatories = useQuery({
    queryKey: ["treasury-signatories", chamaId],
    queryFn: () => endpoints.getSignatories(chamaId),
    enabled: Boolean(chamaId),
    retry: false
  });
  const settings = useQuery({
    queryKey: ["treasury-settings", chamaId],
    queryFn: async () => {
      const data = await endpoints.getTreasurySettings(chamaId);
      setRequiredApprovals(data.requiredApprovals);
      setThreshold(String(Math.round(data.proposalThresholdCents / 100)));
      return data;
    },
    enabled: Boolean(chamaId),
    retry: false
  });
  const chama = useQuery({
    queryKey: ["chama", chamaId],
    queryFn: () => endpoints.getChama(chamaId),
    enabled: Boolean(chamaId),
    retry: false
  });

  const saveSettings = useMutation({
    mutationFn: () =>
      endpoints.updateTreasurySettings(chamaId, {
        treasuryEnabled: true,
        requiredApprovals,
        proposalThresholdCents: Number(threshold || 0) * 100
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["treasury-settings", chamaId] })
  });
  const addSignatory = useMutation({
    mutationFn: () => endpoints.addSignatory(chamaId, selectedUserId),
    onSuccess: () => {
      setSelectedUserId("");
      queryClient.invalidateQueries({ queryKey: ["treasury-signatories", chamaId] });
    }
  });
  const removeSignatory = useMutation({
    mutationFn: (signatoryId: string) => endpoints.removeSignatory(chamaId, signatoryId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["treasury-signatories", chamaId] })
  });

  const existingIds = new Set(signatories.data?.map((item) => item.userId) ?? []);
  const addableMembers = (chama.data?.members ?? []).filter((member) => !existingIds.has(member.user.id));

  return (
    <Screen>
      <AppHeader title="Signatories" subtitle="Set up multi-person approvals" back />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SoftCard>
          <View style={ui.rowBetween}>
            <View>
              <Text style={styles.title}>Treasury protection</Text>
              <Text style={styles.muted}>Transfers above the threshold require approvals.</Text>
            </View>
            <Badge tone={settings.data?.treasuryEnabled ? "green" : "amber"}>{settings.data?.treasuryEnabled ? "On" : "Off"}</Badge>
          </View>
          <View style={styles.stepper}>
            <Text style={styles.label}>Required approvals</Text>
            <View style={styles.stepperControls}>
              <Pressable style={styles.stepButton} onPress={() => setRequiredApprovals(Math.max(1, requiredApprovals - 1))}><Text style={styles.stepText}>-</Text></Pressable>
              <Text style={styles.stepValue}>{requiredApprovals}</Text>
              <Pressable style={styles.stepButton} onPress={() => setRequiredApprovals(Math.min(10, requiredApprovals + 1))}><Text style={styles.stepText}>+</Text></Pressable>
            </View>
          </View>
          <Text style={styles.label}>Proposal threshold</Text>
          <TextInput style={styles.input} value={threshold} onChangeText={setThreshold} keyboardType="number-pad" />
          <Text style={styles.muted}>Current: {cents(Number(threshold || 0) * 100).replace("KES", "Ksh")}</Text>
          <PrimaryButton tone="green" onPress={() => saveSettings.mutate()}>
            {saveSettings.isPending ? "Saving..." : "Save settings"}
          </PrimaryButton>
        </SoftCard>

        <SoftCard style={styles.listCard}>
          <Text style={styles.title}>Active signatories</Text>
          {(signatories.data ?? []).map((signatory) => (
            <RowItem
              key={signatory.id}
              title={signatory.user?.fullName ?? "Signatory"}
              subtitle={`Added ${new Date(signatory.addedAt).toLocaleDateString("en-KE")}`}
              avatarTone="green"
              right={
                <Pressable onPress={() => removeSignatory.mutate(signatory.id)}>
                  <Badge tone="red">Remove</Badge>
                </Pressable>
              }
            />
          ))}
        </SoftCard>

        <SoftCard>
          <Text style={styles.title}>Add signatory</Text>
          {addableMembers.map((member) => (
            <Pressable key={member.id} onPress={() => setSelectedUserId(member.user.id)}>
              <RowItem
                title={member.user.fullName}
                subtitle={member.role}
                avatarTone="teal"
                right={<Badge tone={selectedUserId === member.user.id ? "green" : "muted"}>{selectedUserId === member.user.id ? "Selected" : "Choose"}</Badge>}
              />
            </Pressable>
          ))}
          <PrimaryButton tone="green" onPress={() => addSignatory.mutate()} style={{ marginTop: 12 }}>
            {addSignatory.isPending ? "Adding..." : "Add selected signatory"}
          </PrimaryButton>
        </SoftCard>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, padding: 20, paddingBottom: 80 },
  title: { color: colors.text, fontSize: 16, fontWeight: "900" },
  muted: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  label: { color: colors.textMuted, fontSize: 12, fontWeight: "800", marginBottom: 8, marginTop: 14 },
  input: { backgroundColor: colors.surface, borderColor: colors.line, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, color: colors.text, padding: 14 },
  listCard: { paddingVertical: 14 },
  stepper: { marginTop: 8 },
  stepperControls: { alignItems: "center", flexDirection: "row", gap: 16, marginTop: 8 },
  stepButton: { alignItems: "center", backgroundColor: colors.navy, borderRadius: 18, height: 36, justifyContent: "center", width: 36 },
  stepText: { color: colors.white, fontSize: 20, fontWeight: "900" },
  stepValue: { color: colors.text, fontSize: 18, fontWeight: "900" }
});
