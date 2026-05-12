import type { GovernanceSettingsInput } from "@chama/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SelectCard } from "../../../../components/create-chama/SelectCard";
import { AppHeader, colors, PrimaryButton, Screen, SoftCard } from "../../../../components/ui";
import { endpoints, type Chama } from "../../../../lib/api";
import { useAuthStore } from "../../../../stores/auth.store";
import { useChamaStore } from "../../../../stores/chama.store";

type VotingRule = "simple_majority" | "two_thirds" | "admin_only";
type MeetingFrequency = "weekly" | "monthly" | "quarterly" | "as_needed";
type RecordVisibility =
  | "everyone_sees_everything"
  | "members_see_own_records"
  | "admin_only_reports";

type GovernanceForm = {
  votingRule: VotingRule;
  withdrawalPolicy: string;
  memberExitPolicy: string;
  refundPolicy: string;
  disputeResolutionMethod: string;
  meetingFrequency: MeetingFrequency;
  recordVisibility: RecordVisibility;
};

const governanceDefaults: GovernanceForm = {
  votingRule: "simple_majority",
  withdrawalPolicy: "Withdrawals require treasurer approval.",
  memberExitPolicy:
    "A member may exit with 30 days notice. Outstanding loans must be cleared before exit.",
  refundPolicy:
    "Contributions are non-refundable once pooled. Exit payouts are calculated at the end of the current contribution cycle.",
  disputeResolutionMethod:
    "Disputes are first handled internally by the admin. Unresolved disputes are escalated to a member vote.",
  meetingFrequency: "monthly",
  recordVisibility: "members_see_own_records"
};

export default function GovernanceSettingsScreen() {
  const { chamaId = "" } = useLocalSearchParams<{ chamaId: string }>();
  const user = useAuthStore((state) => state.user);
  const setActiveChama = useChamaStore((state) => state.setActiveChama);
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<GovernanceForm>(governanceDefaults);

  const chamaQuery = useQuery({
    queryKey: ["chama", chamaId],
    queryFn: async () => {
      const chama = await endpoints.getChama(chamaId);
      setActiveChama(chama);
      return chama;
    },
    enabled: Boolean(chamaId),
    retry: false
  });

  const initial = useMemo(
    () => toGovernanceForm(chamaQuery.data?.settings),
    [chamaQuery.data?.settings]
  );
  const isAdmin = useMemo(
    () =>
      chamaQuery.data?.members?.some(
        (member) => member.role === "ADMIN" && member.user.id === user?.id
      ) ?? false,
    [chamaQuery.data?.members, user?.id]
  );
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);

  useEffect(() => {
    if (chamaQuery.data?.settings) {
      setDraft(toGovernanceForm(chamaQuery.data.settings));
    }
  }, [chamaQuery.data?.settings]);

  const updateMutation = useMutation({
    mutationFn: () => endpoints.updateGovernanceSettings(chamaId, changedFields(draft, initial)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["chama", chamaId] });
      Alert.alert("Saved", "Governance policies updated");
      router.back();
    },
    onError: () => Alert.alert("Could not save", "Check your connection and try again.")
  });

  function setField<K extends keyof GovernanceForm>(field: K, value: GovernanceForm[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  return (
    <Screen>
      <AppHeader
        title="Governance & Rules"
        subtitle="These policies apply to all members of your chama"
        back
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {!isAdmin ? (
          <View style={styles.readOnlyBanner}>
            <Text style={styles.readOnlyText}>Only the chama admin can edit these policies.</Text>
          </View>
        ) : null}

        <SoftCard style={styles.section}>
          <Text style={styles.sectionTitle}>Decision making</Text>
          <Text style={styles.label}>Voting rule</Text>
          {isAdmin ? (
            <View style={styles.optionStack}>
              <SelectCard
                icon="1"
                label="Simple majority"
                description="More than half must agree"
                selected={draft.votingRule === "simple_majority"}
                onPress={() => setField("votingRule", "simple_majority")}
              />
              <SelectCard
                icon="⅔"
                label="Two-thirds"
                description="At least 2/3 must agree"
                selected={draft.votingRule === "two_thirds"}
                onPress={() => setField("votingRule", "two_thirds")}
              />
              <SelectCard
                icon="A"
                label="Admin decides"
                description="Admin makes final calls"
                selected={draft.votingRule === "admin_only"}
                onPress={() => setField("votingRule", "admin_only")}
              />
            </View>
          ) : (
            <ReadOnlyValue label={labelFor(draft.votingRule)} />
          )}

          <Text style={styles.label}>Meeting frequency</Text>
          {isAdmin ? (
            <View style={styles.grid}>
              {(["weekly", "monthly", "quarterly", "as_needed"] as const).map((option) => (
                <Pressable
                  key={option}
                  style={draft.meetingFrequency === option ? styles.gridOptionActive : styles.gridOption}
                  onPress={() => setField("meetingFrequency", option)}
                >
                  <Text style={draft.meetingFrequency === option ? styles.gridOptionTextActive : styles.gridOptionText}>
                    {labelFor(option)}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <ReadOnlyValue label={labelFor(draft.meetingFrequency)} />
          )}

          <Text style={styles.label}>Record visibility</Text>
          {isAdmin ? (
            <View style={styles.optionStack}>
              <SelectCard
                icon="◎"
                label="Full transparency"
                description="All members see all records"
                selected={draft.recordVisibility === "everyone_sees_everything"}
                onPress={() => setField("recordVisibility", "everyone_sees_everything")}
              />
              <SelectCard
                icon="◐"
                label="Personal view"
                description="Members see only their own records"
                selected={draft.recordVisibility === "members_see_own_records"}
                onPress={() => setField("recordVisibility", "members_see_own_records")}
              />
              <SelectCard
                icon="◇"
                label="Admin only"
                description="Only admin can view full reports"
                selected={draft.recordVisibility === "admin_only_reports"}
                onPress={() => setField("recordVisibility", "admin_only_reports")}
              />
            </View>
          ) : (
            <ReadOnlyValue label={labelFor(draft.recordVisibility)} />
          )}
        </SoftCard>

        <SoftCard style={styles.section}>
          <Text style={styles.sectionTitle}>Policies</Text>
          <PolicyField
            label="Withdrawal policy"
            value={draft.withdrawalPolicy}
            editable={isAdmin}
            onChange={(value) => setField("withdrawalPolicy", value)}
          />
          <PolicyField
            label="Member exit policy"
            value={draft.memberExitPolicy}
            editable={isAdmin}
            onChange={(value) => setField("memberExitPolicy", value)}
          />
          <PolicyField
            label="Refund policy"
            value={draft.refundPolicy}
            editable={isAdmin}
            onChange={(value) => setField("refundPolicy", value)}
          />
          <PolicyField
            label="Dispute resolution"
            value={draft.disputeResolutionMethod}
            editable={isAdmin}
            onChange={(value) => setField("disputeResolutionMethod", value)}
          />
        </SoftCard>

        {isAdmin ? (
          <PrimaryButton
            tone="green"
            style={!dirty || updateMutation.isPending ? styles.disabledButton : null}
            onPress={() => {
              if (dirty && !updateMutation.isPending) updateMutation.mutate();
            }}
          >
            {updateMutation.isPending ? "Saving..." : "Save changes"}
          </PrimaryButton>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function PolicyField({
  label,
  value,
  editable,
  onChange
}: {
  label: string;
  value: string;
  editable: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.policyCard}>
      <View style={styles.policyHeader}>
        <Text style={styles.policyLabel}>{label}</Text>
        {editable ? <Text style={styles.editIcon}>✎</Text> : null}
      </View>
      {editable ? (
        <>
          <TextInput
            style={styles.textArea}
            multiline
            maxLength={500}
            textAlignVertical="top"
            value={value}
            onChangeText={onChange}
          />
          <Text style={styles.counter}>{value.length} / 500</Text>
        </>
      ) : (
        <Text style={styles.readOnlyPolicy}>{value}</Text>
      )}
    </View>
  );
}

function ReadOnlyValue({ label }: { label: string }) {
  return <Text style={styles.readOnlyValue}>{label}</Text>;
}

function toGovernanceForm(settings: Chama["settings"] | undefined | null): GovernanceForm {
  return {
    votingRule: (settings?.votingRule as VotingRule | undefined) ?? governanceDefaults.votingRule,
    withdrawalPolicy: settings?.withdrawalPolicy ?? governanceDefaults.withdrawalPolicy,
    memberExitPolicy: settings?.memberExitPolicy ?? governanceDefaults.memberExitPolicy,
    refundPolicy: settings?.refundPolicy ?? governanceDefaults.refundPolicy,
    disputeResolutionMethod:
      settings?.disputeResolutionMethod ?? governanceDefaults.disputeResolutionMethod,
    meetingFrequency:
      (settings?.meetingFrequency as MeetingFrequency | undefined) ??
      governanceDefaults.meetingFrequency,
    recordVisibility:
      (settings?.recordVisibility as RecordVisibility | undefined) ??
      governanceDefaults.recordVisibility
  };
}

function changedFields(draft: GovernanceForm, initial: GovernanceForm): GovernanceSettingsInput {
  const payload: Partial<GovernanceForm> = {};
  for (const key of Object.keys(draft) as Array<keyof GovernanceForm>) {
    if (draft[key] !== initial[key]) {
      payload[key] = draft[key] as never;
    }
  }
  return payload as GovernanceSettingsInput;
}

function labelFor(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

const styles = StyleSheet.create({
  content: { gap: 14, padding: 20, paddingBottom: 36 },
  section: { gap: 14 },
  sectionTitle: { fontFamily: "sans-serif", color: colors.text, fontSize: 16, fontWeight: "900" },
  label: { fontFamily: "sans-serif", color: colors.text, fontSize: 12, fontWeight: "900", marginTop: 2 },
  optionStack: { gap: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  gridOption: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    flexBasis: "47%",
    paddingVertical: 14
  },
  gridOptionActive: {
    alignItems: "center",
    backgroundColor: colors.greenSoft,
    borderColor: colors.green,
    borderRadius: 18,
    borderWidth: 1,
    flexBasis: "47%",
    paddingVertical: 14
  },
  gridOptionText: { fontFamily: "sans-serif", color: colors.text, fontSize: 13, fontWeight: "900" },
  gridOptionTextActive: { fontFamily: "sans-serif", color: colors.green, fontSize: 13, fontWeight: "900" },
  policyCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 9,
    padding: 14
  },
  policyHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  policyLabel: { fontFamily: "sans-serif", color: colors.text, fontSize: 13, fontWeight: "900" },
  editIcon: { fontFamily: "sans-serif", color: colors.green, fontSize: 14, fontWeight: "900" },
  textArea: {
    fontFamily: "sans-serif",
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    minHeight: 88,
    padding: 0
  },
  counter: { fontFamily: "sans-serif", color: colors.textMuted, fontSize: 11, textAlign: "right" },
  readOnlyBanner: { backgroundColor: colors.amberLight, borderRadius: 18, padding: 13 },
  readOnlyText: { fontFamily: "sans-serif", color: colors.amberDark, fontSize: 12, fontWeight: "900" },
  readOnlyValue: {
    fontFamily: "sans-serif",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    color: colors.text,
    fontSize: 14,
    fontWeight: "900",
    padding: 14
  },
  readOnlyPolicy: { fontFamily: "sans-serif", color: colors.text, fontSize: 13, lineHeight: 19 },
  disabledButton: { opacity: 0.5 }
});
