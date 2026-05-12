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
import { PinInput } from "../../../../components/ui/PinInput";
import { cents, endpoints } from "../../../../lib/api";
import { useAuthStore } from "../../../../stores/auth.store";

export default function ProposalDetailScreen() {
  const { chamaId = "", proposalId = "" } = useLocalSearchParams<{ chamaId: string; proposalId: string }>();
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [pin, setPin] = useState("");
  const [reason, setReason] = useState("");
  const [mode, setMode] = useState<"approve" | "reject">("approve");

  const proposalQuery = useQuery({
    queryKey: ["treasury-proposal", chamaId, proposalId],
    queryFn: () => endpoints.getProposal(chamaId, proposalId),
    enabled: Boolean(chamaId && proposalId),
    retry: false
  });

  const proposal = proposalQuery.data;
  const hasVoted = proposal?.approvals?.some((approval) => approval.signatoryId === user?.id);
  const isPending = proposal?.status === "PENDING" && !hasVoted;
  const approved = proposal?.approvals?.filter((approval) => approval.action === "APPROVED").length ?? 0;

  const approve = useMutation({
    mutationFn: () => endpoints.approveProposal(chamaId, proposalId, pin),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["treasury-proposal", chamaId, proposalId] })
  });
  const reject = useMutation({
    mutationFn: () => endpoints.rejectProposal(chamaId, proposalId, pin, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["treasury-proposal", chamaId, proposalId] })
  });

  return (
    <Screen>
      <AppHeader title="Review transfer" subtitle="Trustless Treasury approval" back />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {proposal ? (
          <>
            <SoftCard>
              <View style={ui.rowBetween}>
                <Text style={styles.title}>{proposal.recipientName}</Text>
                <Badge tone={proposal.status === "PENDING" ? "amber" : proposal.status === "EXECUTED" ? "green" : "muted"}>{label(proposal.status)}</Badge>
              </View>
              <Text style={styles.amount}>{cents(proposal.amount).replace("KES", "Ksh")}</Text>
              <Text style={styles.muted}>{proposal.description}</Text>
              <View style={styles.metaGrid}>
                <Meta label="Type" value={label(proposal.type)} />
                <Meta label="Approvals" value={`${approved} / ${proposal.requiredApprovals}`} />
                <Meta label="Expires" value={formatDate(proposal.expiresAt)} />
              </View>
            </SoftCard>

            <SoftCard>
              <Text style={styles.title}>Approval timeline</Text>
              {(proposal.approvals ?? []).length === 0 ? (
                <Text style={styles.muted}>No signatory has reviewed this proposal yet.</Text>
              ) : (
                proposal.approvals?.map((approval) => (
                  <RowItem
                    key={approval.id}
                    title={approval.signatory?.fullName ?? "Signatory"}
                    subtitle={approval.reason ?? formatDate(approval.signedAt)}
                    avatarTone={approval.action === "APPROVED" ? "green" : "amber"}
                    right={<Badge tone={approval.action === "APPROVED" ? "green" : "red"}>{label(approval.action)}</Badge>}
                  />
                ))
              )}
            </SoftCard>

            {isPending ? (
              <SoftCard>
                <Text style={styles.title}>Your approval is required</Text>
                <View style={styles.feeBox}>
                  <Meta label="Transfer amount" value={cents(proposal.amount).replace("KES", "Ksh")} />
                  <Meta label="Platform fee" value="Calculated on execution" />
                  <Meta label="Recipient receives" value="Net of fee" />
                </View>
                <View style={styles.modeRow}>
                  <Pressable style={mode === "approve" ? styles.modeActive : styles.mode} onPress={() => setMode("approve")}>
                    <Text style={mode === "approve" ? styles.modeTextActive : styles.modeText}>Approve</Text>
                  </Pressable>
                  <Pressable style={mode === "reject" ? styles.modeDanger : styles.mode} onPress={() => setMode("reject")}>
                    <Text style={mode === "reject" ? styles.modeTextActive : styles.modeText}>Reject</Text>
                  </Pressable>
                </View>
                {mode === "reject" ? (
                  <TextInput
                    style={styles.input}
                    value={reason}
                    onChangeText={setReason}
                    placeholder="Reason for rejection"
                    multiline
                    maxLength={500}
                  />
                ) : null}
                <PinInput length={4} onComplete={setPin} error={approve.isError || reject.isError} />
                <PrimaryButton
                  tone={mode === "approve" ? "green" : "outline"}
                  onPress={() => (mode === "approve" ? approve.mutate() : reject.mutate())}
                >
                  {approve.isPending || reject.isPending ? "Submitting..." : mode === "approve" ? "Approve transfer" : "Reject transfer"}
                </PrimaryButton>
              </SoftCard>
            ) : null}
          </>
        ) : (
          <SoftCard><Text style={styles.muted}>Loading proposal...</Text></SoftCard>
        )}
      </ScrollView>
    </Screen>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.meta}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-KE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

const styles = StyleSheet.create({
  content: { gap: 14, padding: 20, paddingBottom: 80 },
  title: { color: colors.text, fontSize: 16, fontWeight: "900" },
  amount: { color: colors.green, fontSize: 30, fontWeight: "900", marginTop: 10 },
  muted: { color: colors.textMuted, fontSize: 12, marginTop: 6 },
  metaGrid: { gap: 10, marginTop: 16 },
  meta: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  metaLabel: { color: colors.textMuted, fontSize: 12 },
  metaValue: { color: colors.text, flex: 1, fontSize: 12, fontWeight: "800", textAlign: "right" },
  feeBox: { backgroundColor: "#F1EEE4", borderRadius: 18, gap: 10, marginTop: 12, padding: 14 },
  modeRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  mode: { alignItems: "center", backgroundColor: "#F1EEE4", borderRadius: 16, flex: 1, paddingVertical: 12 },
  modeActive: { alignItems: "center", backgroundColor: colors.navy, borderRadius: 16, flex: 1, paddingVertical: 12 },
  modeDanger: { alignItems: "center", backgroundColor: colors.red, borderRadius: 16, flex: 1, paddingVertical: 12 },
  modeText: { color: colors.textMuted, fontSize: 13, fontWeight: "900" },
  modeTextActive: { color: colors.white, fontSize: 13, fontWeight: "900" },
  input: { backgroundColor: colors.surface, borderColor: colors.line, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, color: colors.text, marginTop: 12, minHeight: 84, padding: 14, textAlignVertical: "top" }
});
