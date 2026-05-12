import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  AppHeader,
  Badge,
  BottomNav,
  colors,
  RowItem,
  Screen,
  SoftCard,
  StatBox,
  StatRow,
  ui
} from "../../../../components/ui";
import { cents, endpoints, type ProposalStatus, type TxProposal } from "../../../../lib/api";
import { useChamaStore } from "../../../../stores/chama.store";

const filters: Array<"ALL" | ProposalStatus> = ["ALL", "PENDING", "EXECUTED", "REJECTED"];

export default function TreasuryFeedScreen() {
  const { chamaId = "" } = useLocalSearchParams<{ chamaId: string }>();
  const [filter, setFilter] = useState<(typeof filters)[number]>("ALL");
  const setProposals = useChamaStore((state) => state.setProposals);
  const proposals = useChamaStore((state) => state.proposals);

  const proposalsQuery = useQuery({
    queryKey: ["treasury-proposals", chamaId, filter],
    queryFn: async () => {
      const data = await endpoints.getProposals(chamaId, filter === "ALL" ? undefined : { status: filter });
      setProposals(data);
      return data;
    },
    enabled: Boolean(chamaId),
    retry: false
  });
  const anomalies = useQuery({
    queryKey: ["treasury-anomalies", chamaId],
    queryFn: () => endpoints.getAnomalies(chamaId),
    enabled: Boolean(chamaId),
    retry: false
  });

  const data = proposalsQuery.data ?? proposals;
  const pending = data.filter((proposal) => proposal.status === "PENDING");
  const thisMonthTotal = useMemo(() => {
    const now = new Date();
    return data
      .filter((proposal) => {
        const date = new Date(proposal.createdAt);
        return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
      })
      .reduce((sum, proposal) => sum + proposal.amount, 0);
  }, [data]);
  const allTimeTotal = data.reduce((sum, proposal) => sum + proposal.amount, 0);

  return (
    <Screen>
      <AppHeader title="Treasury" subtitle="Multi-signature approvals" back />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {anomalies.data?.length ? (
          <SoftCard style={styles.warning}>
            <Text style={styles.warningTitle}>{anomalies.data.length} proposal(s) flagged for review</Text>
            <Text style={styles.warningText}>Review unusual transfers before approving.</Text>
          </SoftCard>
        ) : null}

        <StatRow>
          <StatBox label="Pending" value={`${pending.length}`} tone="green" />
          <StatBox label="This month" value={cents(thisMonthTotal).replace("KES", "Ksh")} />
          <StatBox label="All time" value={cents(allTimeTotal).replace("KES", "Ksh")} tone="green" />
        </StatRow>

        <View style={styles.filterRow}>
          {filters.map((item) => (
            <Pressable key={item} style={filter === item ? styles.filterActive : styles.filter} onPress={() => setFilter(item)}>
              <Text style={filter === item ? styles.filterTextActive : styles.filterText}>{label(item)}</Text>
            </Pressable>
          ))}
        </View>

        <SoftCard style={styles.listCard}>
          {data.length === 0 ? (
            <Text style={styles.empty}>No treasury proposals yet.</Text>
          ) : (
            data.map((proposal) => (
              <ProposalRow key={proposal.id} proposal={proposal} chamaId={chamaId} />
            ))
          )}
        </SoftCard>
      </ScrollView>
      <BottomNav active="Chamas" />
    </Screen>
  );
}

function ProposalRow({ proposal, chamaId }: { proposal: TxProposal; chamaId: string }) {
  const approved = proposal.approvals?.filter((approval) => approval.action === "APPROVED").length ?? 0;
  return (
    <Pressable onPress={() => router.push(`/(app)/chama/treasury/${proposal.id}?chamaId=${chamaId}` as never)}>
      <RowItem
        title={`${proposal.recipientName} - ${cents(proposal.amount).replace("KES", "Ksh")}`}
        subtitle={`${label(proposal.type)} - ${approved} of ${proposal.requiredApprovals} approved`}
        avatarTone={proposal.status === "PENDING" ? "amber" : proposal.status === "EXECUTED" ? "green" : "teal"}
        right={<Badge tone={statusTone(proposal.status)}>{label(proposal.status)}</Badge>}
      />
    </Pressable>
  );
}

function statusTone(status: ProposalStatus) {
  if (status === "PENDING") return "amber";
  if (status === "EXECUTED") return "green";
  if (status === "REJECTED" || status === "FAILED") return "red";
  return "muted";
}

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

const styles = StyleSheet.create({
  content: { gap: 14, padding: 20, paddingBottom: 118 },
  warning: { backgroundColor: colors.amberLight },
  warningTitle: { color: colors.amberDark, fontSize: 14, fontWeight: "900" },
  warningText: { color: colors.amberDark, fontSize: 12, marginTop: 4 },
  filterRow: { flexDirection: "row", gap: 8 },
  filter: { backgroundColor: "#F1EEE4", borderRadius: 18, paddingHorizontal: 13, paddingVertical: 8 },
  filterActive: { backgroundColor: colors.navy, borderRadius: 18, paddingHorizontal: 13, paddingVertical: 8 },
  filterText: { color: colors.textMuted, fontSize: 12, fontWeight: "800" },
  filterTextActive: { color: colors.white, fontSize: 12, fontWeight: "900" },
  listCard: { paddingVertical: 4 },
  empty: { ...ui.muted, textAlign: "center", paddingVertical: 18 }
});
