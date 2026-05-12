import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Linking, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";
import { AppHeader, Badge, colors, PrimaryButton, RowItem, Screen, SoftCard, ui } from "../../../../components/ui";
import { PhoneInviteInput } from "../../../../components/create-chama/PhoneInviteInput";
import { cents, endpoints } from "../../../../lib/api";
import { chamaInviteLink, chamaInviteMessage } from "../../../../lib/invite";
import { useAuthStore } from "../../../../stores/auth.store";
import { useChamaStore } from "../../../../stores/chama.store";

export default function ChamaSettingsScreen() {
  const { id = "" } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((state) => state.user);
  const setActiveChama = useChamaStore((state) => state.setActiveChama);
  const queryClient = useQueryClient();
  const [phones, setPhones] = useState<string[]>([]);
  const [inviteWarning, setInviteWarning] = useState("");
  const [draft, setDraft] = useState({ name: "", description: "", maxMembers: "" });

  const chamaQuery = useQuery({
    queryKey: ["chama", id],
    queryFn: async () => {
      const chama = await endpoints.getChama(id);
      setActiveChama(chama);
      setDraft((value) => ({
        ...value,
        name: value.name || chama.name,
        description: value.description || chama.description || ""
      }));
      return chama;
    },
    retry: false
  });

  const chama = chamaQuery.data;

  const inviteLink = chama ? chamaInviteLink(chama.id) : "";
  const isAdmin = chama?.members?.some((member) => member.role === "ADMIN" && member.user.id === user?.id) ?? false;
  const pendingMembers: Array<{ id: string; name: string; phone: string }> = [];

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!chama) throw new Error("Chama data is not available");
      return endpoints.updateChama(chama.id, {
        name: draft.name.trim(),
        description: draft.description.trim() || null
      });
    },
    onSuccess: async (updated) => {
      if (!chama) return;
      setActiveChama({ ...chama, ...updated });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["chama", chama.id] }),
        queryClient.invalidateQueries({ queryKey: ["my-chamas"] })
      ]);
      Alert.alert("Saved", "Chama details updated.");
    },
    onError: () => Alert.alert("Could not save", "Check your connection and try again.")
  });

  async function sendInvites() {
    if (!chama) return;
    setInviteWarning("");
    let failed = false;
    for (const phone of phones) {
      try {
        await endpoints.inviteMember(chama.id, phone);
      } catch {
        failed = true;
      }
    }
    setPhones([]);
    setInviteWarning(failed ? "Some invites failed to send." : "Invites sent.");
    await queryClient.invalidateQueries({ queryKey: ["chama", chama.id] });
  }

  if (!chama) {
    return (
      <Screen>
        <AppHeader title="Chama settings" subtitle="No chama data available" back />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>No chama data</Text>
            <Text style={styles.emptyText}>Settings could not be loaded for this chama.</Text>
          </View>
        </ScrollView>
      </Screen>
    );
  }

  if (!isAdmin) {
    return (
      <Screen>
        <AppHeader title="Chama settings" back />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>Read-only settings</Text>
            <Text style={styles.emptyText}>Only chama admins can edit settings or approve members.</Text>
          </View>
          <SoftCard style={styles.section}>
            <Pressable
              style={styles.navRow}
              onPress={() =>
                router.push({
                  pathname: "/(app)/chama/settings/governance",
                  params: { chamaId: chama.id }
                } as never)
              }
            >
              <View style={styles.navIcon}>
                <Text style={styles.navIconText}>⚙</Text>
              </View>
              <View style={styles.navBody}>
                <Text style={styles.sectionTitle}>Governance & Rules</Text>
                <Text style={styles.helperText}>View voting, policies, records, and meeting cadence.</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          </SoftCard>
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen>
      <AppHeader title="Chama settings" subtitle={chama.name} back />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SoftCard style={styles.section}>
          <View style={ui.rowBetween}>
            <Text style={styles.sectionTitle}>Invite link</Text>
            <Badge tone="green">Admin</Badge>
          </View>
          <Text style={styles.link}>{inviteLink}</Text>
          <View style={styles.shareRow}>
            <ShareButton label="Share" onPress={() => Share.share({ message: chamaInviteMessage(chama.name, chama.id) })} />
            <ShareButton label="WhatsApp" onPress={() => Linking.openURL(`whatsapp://send?text=${encodeURIComponent(chamaInviteMessage(chama.name, chama.id))}`)} />
            <ShareButton label="SMS" onPress={() => Linking.openURL(`sms:?body=${encodeURIComponent(chamaInviteMessage(chama.name, chama.id))}`)} />
          </View>
        </SoftCard>

        <SoftCard style={styles.section}>
          <Text style={styles.sectionTitle}>Invite members</Text>
          <PhoneInviteInput phones={phones} onChange={setPhones} />
          <PrimaryButton onPress={sendInvites} style={phones.length ? null : styles.disabledButton}>Send invites</PrimaryButton>
          {inviteWarning ? <Text style={styles.statusText}>{inviteWarning}</Text> : null}
        </SoftCard>

        <SoftCard style={styles.section}>
          <Text style={styles.sectionTitle}>Pending approvals</Text>
          {pendingMembers.length ? pendingMembers.map((member) => (
            <View key={member.id} style={styles.approvalRow}>
              <View>
                <Text style={styles.memberName}>{member.name}</Text>
                <Text style={styles.memberPhone}>{member.phone}</Text>
              </View>
              <View style={styles.approvalActions}>
                <SmallButton label="Approve" tone="green" />
                <SmallButton label="Reject" />
              </View>
            </View>
          )) : <Text style={styles.helperText}>No pending approvals.</Text>}
        </SoftCard>

        <SoftCard style={styles.section}>
          <Text style={styles.sectionTitle}>Chama details</Text>
          <Field label="Name">
            <TextInput style={styles.input} value={draft.name || chama.name} onChangeText={(name) => setDraft((value) => ({ ...value, name }))} />
          </Field>
          <Field label="Description">
            <TextInput
              style={[styles.input, styles.textArea]}
              multiline
              value={draft.description || chama.description || ""}
              onChangeText={(description) => setDraft((value) => ({ ...value, description }))}
            />
          </Field>
          <PrimaryButton onPress={() => updateMutation.mutate()}>{updateMutation.isPending ? "Saving..." : "Save changes"}</PrimaryButton>
        </SoftCard>

        <SoftCard style={styles.section}>
          <Text style={styles.sectionTitle}>Useful limits</Text>
          <Field label="Maximum members">
            <TextInput style={styles.input} keyboardType="number-pad" value={draft.maxMembers} onChangeText={(maxMembers) => setDraft((value) => ({ ...value, maxMembers }))} />
          </Field>
          <SettingRow label="Contribution amount" value={cents(chama.settings?.contributionAmount ?? 0).replace("KES", "KSh")} />
          <SettingRow label="Contribution cycle" value={chama.settings?.contributionCycle ?? "MONTHLY"} />
          <SettingRow label="Loan interest" value={`${chama.settings?.loanInterestRate ?? 0}% p.a.`} />
          <SettingRow label="Max loan multiplier" value={`${chama.settings?.maxLoanMultiplier ?? 3}x`} />
          <Text style={styles.helperText}>Backend settings update endpoints are not available yet, so financial limits are shown here for admin review.</Text>
        </SoftCard>

        <SoftCard style={styles.section}>
          <Pressable
            style={styles.navRow}
            onPress={() =>
              router.push({
                pathname: "/(app)/chama/settings/governance",
                params: { chamaId: chama.id }
              } as never)
            }
          >
            <View style={styles.navIcon}>
              <Text style={styles.navIconText}>⚙</Text>
            </View>
            <View style={styles.navBody}>
              <Text style={styles.sectionTitle}>Governance & Rules</Text>
              <Text style={styles.helperText}>Voting, policies, records, and meeting cadence.</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        </SoftCard>

        <SoftCard style={styles.section}>
          <Text style={styles.sectionTitle}>Members</Text>
          {chama.members?.map((member, index) => (
            <RowItem
              key={member.id}
              title={member.user.fullName}
              subtitle={`${member.user.phone} - ${member.shares} share${member.shares === 1 ? "" : "s"}`}
              avatarTone={index % 3 === 0 ? "green" : index % 3 === 1 ? "teal" : "amber"}
              right={<Badge tone={member.role === "ADMIN" ? "green" : member.role === "TREASURER" ? "teal" : "muted"}>{titleCase(member.role)}</Badge>}
            />
          ))}
        </SoftCard>
      </ScrollView>
    </Screen>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.settingRow}>
      <Text style={styles.settingLabel}>{label}</Text>
      <Text style={styles.settingValue}>{value}</Text>
    </View>
  );
}

function ShareButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.shareButton} onPress={onPress}>
      <Text style={styles.shareText}>{label}</Text>
    </Pressable>
  );
}

function SmallButton({ label, tone }: { label: string; tone?: "green" }) {
  return (
    <Pressable style={tone === "green" ? styles.smallButtonGreen : styles.smallButton}>
      <Text style={tone === "green" ? styles.smallButtonTextGreen : styles.smallButtonText}>{label}</Text>
    </Pressable>
  );
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

const styles = StyleSheet.create({
  content: { gap: 14, padding: 20, paddingBottom: 36 },
  section: { gap: 13 },
  sectionTitle: { fontFamily: "sans-serif", color: colors.text, fontSize: 16, fontWeight: "900" },
  link: { fontFamily: "sans-serif", color: colors.green, fontSize: 13, fontWeight: "900" },
  shareRow: { flexDirection: "row", gap: 8 },
  shareButton: { alignItems: "center", backgroundColor: colors.navy, borderRadius: 999, flex: 1, paddingVertical: 10 },
  shareText: { fontFamily: "sans-serif", color: colors.white, fontSize: 12, fontWeight: "900" },
  disabledButton: { opacity: 0.55 },
  statusText: { fontFamily: "sans-serif", color: colors.textMuted, fontSize: 12, fontWeight: "800", textAlign: "center" },
  approvalRow: { alignItems: "center", borderBottomColor: colors.line, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", justifyContent: "space-between", paddingVertical: 10 },
  memberName: { fontFamily: "sans-serif", color: colors.text, fontSize: 14, fontWeight: "900" },
  memberPhone: { fontFamily: "sans-serif", color: colors.textMuted, fontSize: 12, marginTop: 2 },
  approvalActions: { flexDirection: "row", gap: 7 },
  smallButtonGreen: { backgroundColor: colors.navy, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
  smallButton: { backgroundColor: "#F1EEE4", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
  smallButtonTextGreen: { fontFamily: "sans-serif", color: colors.white, fontSize: 11, fontWeight: "900" },
  smallButtonText: { fontFamily: "sans-serif", color: colors.textMuted, fontSize: 11, fontWeight: "900" },
  field: { gap: 7 },
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
  textArea: { minHeight: 82, textAlignVertical: "top" },
  settingRow: { borderBottomColor: colors.line, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", justifyContent: "space-between", paddingVertical: 9 },
  settingLabel: { fontFamily: "sans-serif", color: colors.textMuted, fontSize: 12 },
  settingValue: { fontFamily: "sans-serif", color: colors.text, fontSize: 12, fontWeight: "900" },
  helperText: { fontFamily: "sans-serif", color: colors.textMuted, fontSize: 11, lineHeight: 16 },
  navRow: { alignItems: "center", flexDirection: "row", gap: 12 },
  navIcon: { alignItems: "center", backgroundColor: colors.greenLight, borderRadius: 18, height: 36, justifyContent: "center", width: 36 },
  navIconText: { fontFamily: "sans-serif", color: colors.green, fontSize: 16, fontWeight: "900" },
  navBody: { flex: 1, gap: 3 },
  chevron: { fontFamily: "sans-serif", color: colors.textMuted, fontSize: 28, fontWeight: "600" },
  emptyWrap: { alignItems: "center", padding: 24 },
  emptyTitle: { fontFamily: "sans-serif", color: colors.text, fontSize: 18, fontWeight: "900" },
  emptyText: { fontFamily: "sans-serif", color: colors.textMuted, fontSize: 13, lineHeight: 19, marginTop: 6, textAlign: "center" }
});
