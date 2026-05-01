import { createChamaSchema } from "@chama/shared";
import axios from "axios";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { ActivityIndicator, Alert, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";
import { z } from "zod";
import { FormSection } from "../../../components/create-chama/FormSection";
import { InviteShareCard } from "../../../components/create-chama/InviteShareCard";
import { formatKes, MoneyInput } from "../../../components/create-chama/MoneyInput";
import { PhoneInviteInput } from "../../../components/create-chama/PhoneInviteInput";
import { ReviewItem } from "../../../components/create-chama/ReviewItem";
import { SelectCard } from "../../../components/create-chama/SelectCard";
import { WizardStep } from "../../../components/create-chama/WizardStep";
import { AppHeader, BottomNav, colors, GreenPanel, PrimaryButton, Screen, SoftCard } from "../../../components/ui";
import { apiErrorMessage, endpoints, type Chama, type CreateChamaRequest } from "../../../lib/api";
import { chamaInviteLink, chamaInviteMessage } from "../../../lib/invite";
import { useChamaStore } from "../../../stores/chama.store";

type SharedCreateChamaData = z.infer<typeof createChamaSchema>;
type ChamaType = SharedCreateChamaData["type"] | "HYBRID";
type StepId = "basics" | "contributions" | "members" | "payments" | "rotations" | "loans" | "investments" | "governance" | "review";
type SubmitState = "idle" | "creating" | "inviting" | "success" | "error";

type ChamaFormData = Omit<SharedCreateChamaData, "type"> & {
  type: ChamaType;
  category: "friends" | "family" | "workmates" | "business" | "community";
  location: string;
  chamaImage: string;
  contributionAmount: number;
  contributionInterval: "daily" | "weekly" | "bi_weekly" | "monthly";
  dueDay: string;
  startDate: string;
  gracePeriodDays: number;
  latePenaltyType: "none" | "fixed" | "percentage";
  latePenaltyValue: number;
  expectedMemberCount: number;
  inviteMode: "invite_only" | "admin_approval" | "anyone_with_link";
  invitePhones: string[];
  paymentMethod: "mpesa" | "bank_transfer" | "manual_record";
  collectionAccountType: "chama_wallet" | "treasurer_number" | "paybill" | "till_number";
  collectionAccountValue: string;
  withdrawalRule: "treasurer_only" | "admin_approval" | "multi_signature";
  minimumApprovalsRequired: number;
  payoutAmount: number;
  payoutFrequency: "weekly" | "bi_weekly" | "monthly";
  rotationOrder: "random" | "manual" | "first_joined_first_paid";
  firstRecipient: string;
  missedPaymentRule: "skip_payout" | "fine_member" | "pause_cycle";
  loansEnabled: boolean;
  eligibilityCyclesRequired: number;
  maxLoanType: "fixed" | "contribution_multiplier";
  maxLoanValue: number;
  interestRate: number;
  repaymentPeriodMonths: number;
  loanApprovalMethod: "admin_approval" | "member_vote" | "automatic_rules";
  lateRepaymentPenalty: number;
  investmentGoal: "money_market_fund" | "land" | "treasury_bills" | "shares" | "group_business" | "other";
  targetAmount: number;
  investmentContributionAmount: number;
  riskLevel: "low" | "medium" | "high";
  profitSharingMethod: "equal_share" | "based_on_contribution" | "custom_percentage";
  votingRule: "simple_majority" | "two_thirds" | "admin_only";
  withdrawalPolicy: string;
  memberExitPolicy: string;
  refundPolicy: string;
  disputeResolutionMethod: string;
  meetingFrequency: "weekly" | "monthly" | "quarterly" | "as_needed";
  recordVisibility: "everyone_sees_everything" | "members_see_own_records" | "admin_only_reports";
};

const stepMeta: Record<StepId, { title: string; subtitle: string }> = {
  basics: { title: "Chama basics", subtitle: "Name the group, choose the chama model, and add a short profile." },
  contributions: { title: "Contribution rules", subtitle: "Set the savings amount, due cycle, grace period, and late penalties." },
  members: { title: "Members & invites", subtitle: "Plan the group size and prepare member invitations." },
  payments: { title: "Payment setup", subtitle: "Choose how members pay and how withdrawals are controlled." },
  rotations: { title: "Merry-go-round", subtitle: "Configure payout cadence and rotation order." },
  loans: { title: "Loan settings", subtitle: "Define table banking eligibility, limits, interest, and approvals." },
  investments: { title: "Investment settings", subtitle: "Set the group investment target and profit-sharing model." },
  governance: { title: "Governance & rules", subtitle: "Document decision-making, exits, refunds, and record visibility." },
  review: { title: "Review & create", subtitle: "Confirm every section before creating the chama." }
};

const defaults: ChamaFormData = {
  name: "",
  type: "TABLE_BANKING",
  description: "",
  logoUrl: undefined,
  category: "community",
  location: "",
  chamaImage: "",
  contributionAmount: 0,
  contributionInterval: "monthly",
  dueDay: "5",
  startDate: "2026-05-01",
  gracePeriodDays: 3,
  latePenaltyType: "none",
  latePenaltyValue: 0,
  expectedMemberCount: 10,
  inviteMode: "invite_only",
  invitePhones: [],
  paymentMethod: "mpesa",
  collectionAccountType: "chama_wallet",
  collectionAccountValue: "",
  withdrawalRule: "admin_approval",
  minimumApprovalsRequired: 2,
  payoutAmount: 0,
  payoutFrequency: "monthly",
  rotationOrder: "random",
  firstRecipient: "",
  missedPaymentRule: "fine_member",
  loansEnabled: true,
  eligibilityCyclesRequired: 3,
  maxLoanType: "contribution_multiplier",
  maxLoanValue: 3,
  interestRate: 8,
  repaymentPeriodMonths: 6,
  loanApprovalMethod: "admin_approval",
  lateRepaymentPenalty: 3,
  investmentGoal: "money_market_fund",
  targetAmount: 0,
  investmentContributionAmount: 0,
  riskLevel: "medium",
  profitSharingMethod: "based_on_contribution",
  votingRule: "simple_majority",
  withdrawalPolicy: "",
  memberExitPolicy: "",
  refundPolicy: "",
  disputeResolutionMethod: "",
  meetingFrequency: "monthly",
  recordVisibility: "everyone_sees_everything"
};

export default function CreateChamaScreen() {
  const form = useForm<ChamaFormData>({ defaultValues: defaults });
  const queryClient = useQueryClient();
  const addChama = useChamaStore((state) => state.addChama);
  const setActiveChama = useChamaStore((state) => state.setActiveChama);
  const values = form.watch();
  const [index, setIndex] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [inviteProgress, setInviteProgress] = useState({ current: 0, total: 0 });
  const [createdChama, setCreatedChama] = useState<Chama | null>(null);
  const [inviteWarning, setInviteWarning] = useState(false);

  const steps = useMemo(() => visibleSteps(values.type), [values.type]);
  const currentStep = steps[Math.min(index, steps.length - 1)];
  const inviteLink = createdChama ? chamaInviteLink(createdChama.id) : chamaInviteLink("chamaId_placeholder");

  function setField<K extends keyof ChamaFormData>(field: K, value: ChamaFormData[K]) {
    form.setValue(field as never, value as never, { shouldDirty: true });
  }

  function goNext() {
    const nextErrors = validateStep(currentStep, form.getValues());
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setIndex((value) => Math.min(value + 1, steps.length - 1));
  }

  function goBack() {
    if (index === 0) {
      router.back();
      return;
    }
    setIndex((value) => Math.max(value - 1, 0));
  }

  async function submitChama() {
    const nextErrors = validateStep("review", form.getValues());
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    const formData = form.getValues();
    setSubmitError(null);
    setSubmitState("creating");
    setInviteWarning(false);

    try {
      if (formData.type === "HYBRID") {
        throw new Error("Hybrid chamas are not supported by this backend yet.");
      }

      const request = toCreateChamaRequest(formData);
      const chama = await endpoints.createChama(request);
      addChama(chama);
      setActiveChama(chama);
      setCreatedChama(chama);
      await queryClient.invalidateQueries({ queryKey: ["my-chamas"] });

      let failedInvites = false;
      if (formData.invitePhones.length > 0) {
        setSubmitState("inviting");
        setInviteProgress({ current: 0, total: formData.invitePhones.length });
        for (const [phoneIndex, phone] of formData.invitePhones.entries()) {
          setInviteProgress({ current: phoneIndex + 1, total: formData.invitePhones.length });
          try {
            await endpoints.inviteMember(chama.id, phone);
          } catch {
            failedInvites = true;
          }
        }
      }

      setInviteWarning(failedInvites);
      setSubmitState("success");
    } catch (error) {
      setSubmitState("error");
      setSubmitError(submitMessage(error));
    }
  }

  if (submitState === "success" && createdChama) {
    return (
      <Screen>
        <AppHeader title="Create Chama" back />
        <View style={styles.successWrap}>
          <GreenPanel style={styles.successCard}>
            <View style={styles.checkCircle}>
              <Text style={styles.checkText}>✓</Text>
            </View>
            <Text style={styles.successTitle}>{createdChama.name}</Text>
            <Text style={styles.successSub}>Your chama setup is ready. Invite members to start collecting contributions.</Text>
          </GreenPanel>
          {inviteWarning ? (
            <Pressable style={styles.warningBanner} onPress={() => setInviteWarning(false)}>
              <Text style={styles.warningText}>Chama created. Some invites failed to send.</Text>
            </Pressable>
          ) : null}
          <PrimaryButton
            onPress={() => {
              router.replace(`/(app)/chama/${createdChama.id}` as never);
              if (inviteWarning) {
                setTimeout(() => Alert.alert("Invite warning", "Chama created. Some invites failed to send."), 250);
              }
            }}
          >
            View Chama
          </PrimaryButton>
          <PrimaryButton tone="outline" onPress={() => Share.share({ message: chamaInviteMessage(createdChama.name, createdChama.id) })}>Share Invite Link</PrimaryButton>
        </View>
        <BottomNav active="Chamas" />
      </Screen>
    );
  }

  return (
    <Screen>
      <AppHeader title="Create Chama" subtitle="Guided setup" back />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <WizardStep title={stepMeta[currentStep].title} subtitle={stepMeta[currentStep].subtitle} current={index + 1} total={steps.length}>
          {currentStep === "basics" ? <BasicsStep values={values} setField={setField} errors={errors} /> : null}
          {currentStep === "contributions" ? <ContributionsStep values={values} setField={setField} errors={errors} /> : null}
          {currentStep === "members" ? <MembersStep values={values} setField={setField} errors={errors} inviteLink={inviteLink} /> : null}
          {currentStep === "payments" ? <PaymentsStep values={values} setField={setField} errors={errors} /> : null}
          {currentStep === "rotations" ? <RotationsStep values={values} setField={setField} errors={errors} /> : null}
          {currentStep === "loans" ? <LoansStep values={values} setField={setField} errors={errors} /> : null}
          {currentStep === "investments" ? <InvestmentsStep values={values} setField={setField} errors={errors} /> : null}
          {currentStep === "governance" ? <GovernanceStep values={values} setField={setField} errors={errors} /> : null}
          {currentStep === "review" ? <ReviewStep values={values} inviteLink={inviteLink} /> : null}
          {currentStep === "review" && submitError ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{submitError}</Text>
            </View>
          ) : null}
        </WizardStep>
      </ScrollView>
      <View style={styles.footer}>
        <Pressable style={styles.backButton} onPress={goBack}>
          <Text style={styles.backText}>{index === 0 ? "Cancel" : "Back"}</Text>
        </Pressable>
        <Pressable style={styles.nextButton} onPress={currentStep === "review" ? submitChama : goNext} disabled={submitState === "creating" || submitState === "inviting"}>
          {submitState === "creating" || submitState === "inviting" ? <ActivityIndicator color={colors.white} size="small" /> : null}
          <Text style={styles.nextText}>{buttonLabel(currentStep, submitState, inviteProgress)}</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

function BasicsStep({ values, setField, errors }: StepProps) {
  return (
    <>
      <FormSection title="Identity">
        <Field label="Chama name" error={errors.name}>
          <TextInput style={styles.input} placeholder="e.g. Umoja Sisters Chama" placeholderTextColor={colors.textMuted} value={values.name} onChangeText={(text) => setField("name", text)} />
        </Field>
        <Field label="Description">
          <TextInput style={[styles.input, styles.textArea]} multiline placeholder="What is this chama for?" placeholderTextColor={colors.textMuted} value={values.description ?? ""} onChangeText={(text) => setField("description", text)} />
        </Field>
        <Field label="Location">
          <TextInput style={styles.input} placeholder="e.g. Nairobi" placeholderTextColor={colors.textMuted} value={values.location} onChangeText={(text) => setField("location", text)} />
        </Field>
        <Pressable style={styles.imagePlaceholder} onPress={() => setField("chamaImage", "placeholder")}>
          <Text style={styles.imageText}>{values.chamaImage ? "Image placeholder selected" : "Add chama image placeholder"}</Text>
        </Pressable>
      </FormSection>
      <FormSection title="Chama type">
        <OptionGrid>
          <SelectCard icon="↻" label="Merry-go-round" description="Rotational member payouts." selected={values.type === "MERRY_GO_ROUND"} onPress={() => setField("type", "MERRY_GO_ROUND")} />
          <SelectCard icon="▣" label="Table banking" description="Savings, meetings, and member loans." selected={values.type === "TABLE_BANKING"} onPress={() => setField("type", "TABLE_BANKING")} />
          <SelectCard icon="⌁" label="Investment" description="Pool capital into shared assets." selected={values.type === "INVESTMENT"} onPress={() => setField("type", "INVESTMENT")} />
          <SelectCard icon="+" label="Hybrid" description="Rotations, loans, and investments together." selected={values.type === "HYBRID"} onPress={() => setField("type", "HYBRID")} />
        </OptionGrid>
        {errors.type ? <ErrorText>{errors.type}</ErrorText> : null}
      </FormSection>
      <FormSection title="Category">
        <ChipGroup value={values.category} options={["friends", "family", "workmates", "business", "community"]} onChange={(value) => setField("category", value as ChamaFormData["category"])} />
      </FormSection>
    </>
  );
}

function ContributionsStep({ values, setField, errors }: StepProps) {
  return (
    <>
      <FormSection title="Savings cycle">
        <MoneyInput label="Contribution amount" value={values.contributionAmount} onChange={(value) => setField("contributionAmount", value)} error={errors.contributionAmount} />
        <ChipGroup value={values.contributionInterval} options={["daily", "weekly", "bi_weekly", "monthly"]} onChange={(value) => setField("contributionInterval", value as ChamaFormData["contributionInterval"])} />
        <Field label={values.contributionInterval === "weekly" ? "Due weekday" : "Due day"} error={errors.dueDay}>
          <ChipGroup
            value={values.dueDay}
            options={values.contributionInterval === "weekly" ? ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] : Array.from({ length: 28 }, (_, idx) => String(idx + 1))}
            onChange={(value) => setField("dueDay", value)}
          />
        </Field>
        <Field label="Start date">
          <TextInput style={styles.input} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textMuted} value={values.startDate} onChangeText={(text) => setField("startDate", text)} />
        </Field>
      </FormSection>
      <FormSection title="Late payments">
        <Field label="Grace period days">
          <NumberInput value={values.gracePeriodDays} onChange={(value) => setField("gracePeriodDays", value)} />
        </Field>
        <ChipGroup value={values.latePenaltyType} options={["none", "fixed", "percentage"]} onChange={(value) => setField("latePenaltyType", value as ChamaFormData["latePenaltyType"])} />
        {values.latePenaltyType !== "none" ? (
          values.latePenaltyType === "fixed" ? (
            <MoneyInput label="Late penalty amount" value={values.latePenaltyValue} onChange={(value) => setField("latePenaltyValue", value)} error={errors.latePenaltyValue} />
          ) : (
            <Field label="Late penalty percentage" error={errors.latePenaltyValue}>
              <NumberInput value={values.latePenaltyValue} onChange={(value) => setField("latePenaltyValue", value)} suffix="%" />
            </Field>
          )
        ) : null}
      </FormSection>
    </>
  );
}

function MembersStep({ values, setField, errors, inviteLink }: StepProps & { inviteLink: string }) {
  return (
    <>
      <FormSection title="Invite controls">
        <Field label="Expected member count" error={errors.expectedMemberCount}>
          <NumberInput value={values.expectedMemberCount} onChange={(value) => setField("expectedMemberCount", value)} />
        </Field>
        <ChipGroup value={values.inviteMode} options={["invite_only", "admin_approval", "anyone_with_link"]} onChange={(value) => setField("inviteMode", value as ChamaFormData["inviteMode"])} />
      </FormSection>
      <FormSection title="Phone invites">
        <PhoneInviteInput phones={values.invitePhones} onChange={(phones) => setField("invitePhones", phones)} />
      </FormSection>
      <InviteShareCard link={inviteLink} />
    </>
  );
}

function PaymentsStep({ values, setField, errors }: StepProps) {
  return (
    <>
      <FormSection title="Collection">
        <ChipGroup value={values.paymentMethod} options={["mpesa", "bank_transfer", "manual_record"]} onChange={(value) => setField("paymentMethod", value as ChamaFormData["paymentMethod"])} />
        <ChipGroup value={values.collectionAccountType} options={["chama_wallet", "treasurer_number", "paybill", "till_number"]} onChange={(value) => setField("collectionAccountType", value as ChamaFormData["collectionAccountType"])} />
        {values.collectionAccountType !== "chama_wallet" ? (
          <Field label={collectionLabel(values.collectionAccountType)} error={errors.collectionAccountValue}>
            <TextInput style={styles.input} placeholder={collectionLabel(values.collectionAccountType)} placeholderTextColor={colors.textMuted} value={values.collectionAccountValue} onChangeText={(text) => setField("collectionAccountValue", text)} />
          </Field>
        ) : null}
      </FormSection>
      <FormSection title="Withdrawals">
        <ChipGroup value={values.withdrawalRule} options={["treasurer_only", "admin_approval", "multi_signature"]} onChange={(value) => setField("withdrawalRule", value as ChamaFormData["withdrawalRule"])} />
        {values.withdrawalRule === "multi_signature" ? (
          <Field label="Minimum approvals" error={errors.minimumApprovalsRequired}>
            <NumberInput value={values.minimumApprovalsRequired} onChange={(value) => setField("minimumApprovalsRequired", value)} />
          </Field>
        ) : null}
      </FormSection>
    </>
  );
}

function RotationsStep({ values, setField, errors }: StepProps) {
  return (
    <>
      <FormSection title="Payouts">
        <MoneyInput label="Payout amount" value={values.payoutAmount} onChange={(value) => setField("payoutAmount", value)} error={errors.payoutAmount} />
        <ChipGroup value={values.payoutFrequency} options={["weekly", "bi_weekly", "monthly"]} onChange={(value) => setField("payoutFrequency", value as ChamaFormData["payoutFrequency"])} />
        <ChipGroup value={values.rotationOrder} options={["random", "manual", "first_joined_first_paid"]} onChange={(value) => setField("rotationOrder", value as ChamaFormData["rotationOrder"])} />
        {values.rotationOrder === "manual" ? (
          <Field label="First recipient" error={errors.firstRecipient}>
            <TextInput style={styles.input} placeholder="Member name" placeholderTextColor={colors.textMuted} value={values.firstRecipient} onChangeText={(text) => setField("firstRecipient", text)} />
          </Field>
        ) : null}
        <ChipGroup value={values.missedPaymentRule} options={["skip_payout", "fine_member", "pause_cycle"]} onChange={(value) => setField("missedPaymentRule", value as ChamaFormData["missedPaymentRule"])} />
      </FormSection>
      <SoftCard style={styles.previewCard}>
        <Text style={styles.sectionTitle}>Rotation preview</Text>
        {["Wanjiku", "James", "Grace", "Aisha"].map((name, idx) => (
          <View key={name} style={styles.previewRow}>
            <View style={styles.previewDot}><Text style={styles.previewDotText}>{idx + 1}</Text></View>
            <Text style={styles.previewName}>{name}</Text>
            <Text style={styles.previewDate}>Cycle {idx + 1}</Text>
          </View>
        ))}
      </SoftCard>
    </>
  );
}

function LoansStep({ values, setField, errors }: StepProps) {
  return (
    <FormSection title="Loan rules">
      <SelectCard icon={values.loansEnabled ? "✓" : "x"} label="Loans enabled" description="Allow members to request table banking loans." selected={values.loansEnabled} onPress={() => setField("loansEnabled", !values.loansEnabled)} />
      {values.loansEnabled ? (
        <>
          <Field label="Eligibility cycles required">
            <NumberInput value={values.eligibilityCyclesRequired} onChange={(value) => setField("eligibilityCyclesRequired", value)} />
          </Field>
          <ChipGroup value={values.maxLoanType} options={["fixed", "contribution_multiplier"]} onChange={(value) => setField("maxLoanType", value as ChamaFormData["maxLoanType"])} />
          {values.maxLoanType === "fixed" ? (
            <MoneyInput label="Max loan amount" value={values.maxLoanValue} onChange={(value) => setField("maxLoanValue", value)} error={errors.maxLoanValue} />
          ) : (
            <Field label="Contribution multiplier" error={errors.maxLoanValue}>
              <NumberInput value={values.maxLoanValue} onChange={(value) => setField("maxLoanValue", value)} suffix="x" />
            </Field>
          )}
          <Field label="Interest rate">
            <NumberInput value={values.interestRate} onChange={(value) => setField("interestRate", value)} suffix="%" />
          </Field>
          <Field label="Repayment period months">
            <NumberInput value={values.repaymentPeriodMonths} onChange={(value) => setField("repaymentPeriodMonths", value)} />
          </Field>
          <ChipGroup value={values.loanApprovalMethod} options={["admin_approval", "member_vote", "automatic_rules"]} onChange={(value) => setField("loanApprovalMethod", value as ChamaFormData["loanApprovalMethod"])} />
          <Field label="Late repayment penalty">
            <NumberInput value={values.lateRepaymentPenalty} onChange={(value) => setField("lateRepaymentPenalty", value)} suffix="%" />
          </Field>
        </>
      ) : null}
    </FormSection>
  );
}

function InvestmentsStep({ values, setField, errors }: StepProps) {
  return (
    <>
      <FormSection title="Investment plan">
        <ChipGroup value={values.investmentGoal} options={["money_market_fund", "land", "treasury_bills", "shares", "group_business", "other"]} onChange={(value) => setField("investmentGoal", value as ChamaFormData["investmentGoal"])} />
        <MoneyInput label="Target amount" value={values.targetAmount} onChange={(value) => setField("targetAmount", value)} error={errors.targetAmount} />
        <MoneyInput label="Investment contribution" value={values.investmentContributionAmount} onChange={(value) => setField("investmentContributionAmount", value)} error={errors.investmentContributionAmount} />
      </FormSection>
      <FormSection title="Risk & returns">
        <OptionGrid>
          {(["low", "medium", "high"] as const).map((item) => (
            <SelectCard key={item} icon={item === "low" ? "1" : item === "medium" ? "2" : "3"} label={titleCase(item)} description={`${titleCase(item)} risk portfolio`} selected={values.riskLevel === item} onPress={() => setField("riskLevel", item)} />
          ))}
        </OptionGrid>
        <ChipGroup value={values.profitSharingMethod} options={["equal_share", "based_on_contribution", "custom_percentage"]} onChange={(value) => setField("profitSharingMethod", value as ChamaFormData["profitSharingMethod"])} />
      </FormSection>
    </>
  );
}

function GovernanceStep({ values, setField, errors }: StepProps) {
  return (
    <>
      <FormSection title="Decision rules">
        <ChipGroup value={values.votingRule} options={["simple_majority", "two_thirds", "admin_only"]} onChange={(value) => setField("votingRule", value as ChamaFormData["votingRule"])} />
        <ChipGroup value={values.meetingFrequency} options={["weekly", "monthly", "quarterly", "as_needed"]} onChange={(value) => setField("meetingFrequency", value as ChamaFormData["meetingFrequency"])} />
        <ChipGroup value={values.recordVisibility} options={["everyone_sees_everything", "members_see_own_records", "admin_only_reports"]} onChange={(value) => setField("recordVisibility", value as ChamaFormData["recordVisibility"])} />
      </FormSection>
      <FormSection title="Written policies">
        <PolicyInput label="Withdrawal policy" value={values.withdrawalPolicy} onChange={(text) => setField("withdrawalPolicy", text)} error={errors.withdrawalPolicy} multiline />
        <PolicyInput label="Member exit policy" value={values.memberExitPolicy} onChange={(text) => setField("memberExitPolicy", text)} error={errors.memberExitPolicy} multiline />
        <PolicyInput label="Refund policy" value={values.refundPolicy} onChange={(text) => setField("refundPolicy", text)} error={errors.refundPolicy} multiline />
        <PolicyInput label="Dispute resolution" value={values.disputeResolutionMethod} onChange={(text) => setField("disputeResolutionMethod", text)} error={errors.disputeResolutionMethod} />
      </FormSection>
    </>
  );
}

function ReviewStep({ values, inviteLink }: { values: ChamaFormData; inviteLink: string }) {
  return (
    <>
      <ReviewSection title="Basics">
        <ReviewItem label="Name" value={values.name} />
        <ReviewItem label="Type" value={titleCase(values.type)} />
        <ReviewItem label="Category" value={titleCase(values.category)} />
        <ReviewItem label="Location" value={values.location} />
      </ReviewSection>
      <ReviewSection title="Contributions">
        <ReviewItem label="Amount" value={formatKes(values.contributionAmount)} />
        <ReviewItem label="Interval" value={titleCase(values.contributionInterval)} />
        <ReviewItem label="Due day" value={values.dueDay} />
        <ReviewItem label="Penalty" value={values.latePenaltyType === "none" ? "None" : `${titleCase(values.latePenaltyType)} ${values.latePenaltyValue}`} />
      </ReviewSection>
      <ReviewSection title="Members">
        <ReviewItem label="Expected members" value={values.expectedMemberCount} />
        <ReviewItem label="Invite mode" value={titleCase(values.inviteMode)} />
        <ReviewItem label="Phone invites" value={values.invitePhones.join(", ")} />
      </ReviewSection>
      <ReviewSection title="Payments">
        <ReviewItem label="Payment method" value={titleCase(values.paymentMethod)} />
        <ReviewItem label="Collection" value={titleCase(values.collectionAccountType)} />
        <ReviewItem label="Withdrawal rule" value={titleCase(values.withdrawalRule)} />
      </ReviewSection>
      {hasRotations(values.type) ? (
        <ReviewSection title="Rotations">
          <ReviewItem label="Payout amount" value={formatKes(values.payoutAmount)} />
          <ReviewItem label="Frequency" value={titleCase(values.payoutFrequency)} />
          <ReviewItem label="Order" value={titleCase(values.rotationOrder)} />
        </ReviewSection>
      ) : null}
      {hasLoans(values.type) ? (
        <ReviewSection title="Loans">
          <ReviewItem label="Enabled" value={values.loansEnabled ? "Yes" : "No"} />
          <ReviewItem label="Max loan" value={values.maxLoanType === "fixed" ? formatKes(values.maxLoanValue) : `${values.maxLoanValue}x contributions`} />
          <ReviewItem label="Interest" value={`${values.interestRate}%`} />
        </ReviewSection>
      ) : null}
      {hasInvestments(values.type) ? (
        <ReviewSection title="Investments">
          <ReviewItem label="Goal" value={titleCase(values.investmentGoal)} />
          <ReviewItem label="Target" value={formatKes(values.targetAmount)} />
          <ReviewItem label="Risk" value={titleCase(values.riskLevel)} />
        </ReviewSection>
      ) : null}
      <ReviewSection title="Governance">
        <ReviewItem label="Voting" value={titleCase(values.votingRule)} />
        <ReviewItem label="Meetings" value={titleCase(values.meetingFrequency)} />
        <ReviewItem label="Records" value={titleCase(values.recordVisibility)} />
      </ReviewSection>
      <InviteShareCard link={inviteLink} />
    </>
  );
}

type StepProps = {
  values: ChamaFormData;
  setField: <K extends keyof ChamaFormData>(field: K, value: ChamaFormData[K]) => void;
  errors: Record<string, string>;
};

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {error ? <ErrorText>{error}</ErrorText> : null}
    </View>
  );
}

function PolicyInput({ label, value, onChange, error, multiline }: { label: string; value: string; onChange: (value: string) => void; error?: string; multiline?: boolean }) {
  return (
    <Field label={label} error={error}>
      <TextInput style={[styles.input, multiline ? styles.textArea : null]} multiline={multiline} placeholder={label} placeholderTextColor={colors.textMuted} value={value} onChangeText={onChange} />
    </Field>
  );
}

function NumberInput({ value, onChange, suffix }: { value: number; onChange: (value: number) => void; suffix?: string }) {
  return (
    <TextInput
      style={styles.input}
      keyboardType="number-pad"
      placeholder={suffix ? `0${suffix}` : "0"}
      placeholderTextColor={colors.textMuted}
      value={value ? `${value}` : ""}
      onChangeText={(text) => onChange(Number(text.replace(/\D/g, "")) || 0)}
    />
  );
}

function ChipGroup<T extends string>({ value, options, onChange }: { value: string; options: T[]; onChange: (value: T) => void }) {
  return (
    <View style={styles.chipWrap}>
      {options.map((item) => {
        const selected = item === value;
        return (
          <Pressable key={item} style={selected ? styles.chipActive : styles.chip} onPress={() => onChange(item)}>
            <Text style={selected ? styles.chipTextActive : styles.chipText}>{titleCase(item)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function OptionGrid({ children }: { children: React.ReactNode }) {
  return <View style={styles.optionGrid}>{children}</View>;
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <SoftCard style={styles.reviewCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </SoftCard>
  );
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return <Text style={styles.error}>{children}</Text>;
}

function toCreateChamaRequest(values: ChamaFormData): CreateChamaRequest {
  if (values.type === "HYBRID") {
    throw new Error("Hybrid chamas are not supported by this backend yet.");
  }

  const body: CreateChamaRequest = {
    name: values.name.trim(),
    type: values.type,
    ...(values.description?.trim() ? { description: values.description.trim() } : {}),
    ...(values.logoUrl?.trim() ? { logoUrl: values.logoUrl.trim() } : {})
  };

  return createChamaSchema.parse(body);
}

function buttonLabel(step: StepId, state: SubmitState, progress: { current: number; total: number }) {
  if (state === "creating") return "Creating...";
  if (state === "inviting") return `Sending invite ${progress.current} of ${progress.total}...`;
  return step === "review" ? "Create Chama" : "Continue";
}

function submitMessage(error: unknown) {
  if (error instanceof Error && error.message === "Hybrid chamas are not supported by this backend yet.") {
    return error.message;
  }

  if (axios.isAxiosError(error)) {
    if (error.code === "ECONNABORTED") {
      return "Request timed out. Your chama may have been created — check your chamas list.";
    }

    if (!error.response) {
      return "Connection failed. Try again.";
    }

    if (error.response.status === 409) {
      return "A chama with this name already exists";
    }

    if (error.response.status === 400) {
      return apiErrorMessage(error);
    }
  }

  return apiErrorMessage(error);
}

function visibleSteps(type: ChamaType): StepId[] {
  return [
    "basics",
    "contributions",
    "members",
    "payments",
    ...(hasRotations(type) ? (["rotations"] as StepId[]) : []),
    ...(hasLoans(type) ? (["loans"] as StepId[]) : []),
    ...(hasInvestments(type) ? (["investments"] as StepId[]) : []),
    "governance",
    "review"
  ];
}

function hasRotations(type: ChamaType) {
  return type === "MERRY_GO_ROUND" || type === "HYBRID";
}

function hasLoans(type: ChamaType) {
  return type === "TABLE_BANKING" || type === "HYBRID";
}

function hasInvestments(type: ChamaType) {
  return type === "INVESTMENT" || type === "HYBRID";
}

function validateStep(step: StepId, values: ChamaFormData): Record<string, string> {
  const next: Record<string, string> = {};
  if (step === "basics") {
    const result = createChamaSchema.omit({ type: true }).safeParse({ name: values.name, description: values.description || undefined, logoUrl: values.logoUrl });
    if (!result.success) next.name = "Chama name must be at least 2 characters";
    if (!values.type) next.type = "Choose a chama type";
  }
  if (step === "contributions") {
    if (values.contributionAmount <= 0) next.contributionAmount = "Contribution amount is required";
    if (!values.dueDay) next.dueDay = "Choose a due day";
    if (values.latePenaltyType !== "none" && values.latePenaltyValue <= 0) next.latePenaltyValue = "Penalty value is required";
  }
  if (step === "members" && values.expectedMemberCount < 2) next.expectedMemberCount = "A chama needs at least 2 expected members";
  if (step === "payments") {
    if (values.collectionAccountType !== "chama_wallet" && !values.collectionAccountValue.trim()) next.collectionAccountValue = "Collection account value is required";
    if (values.withdrawalRule === "multi_signature" && values.minimumApprovalsRequired < 2) next.minimumApprovalsRequired = "Minimum approvals must be at least 2";
  }
  if (step === "rotations") {
    if (values.payoutAmount <= 0) next.payoutAmount = "Payout amount is required";
    if (values.rotationOrder === "manual" && !values.firstRecipient.trim()) next.firstRecipient = "First recipient is required";
  }
  if (step === "loans" && values.loansEnabled && values.maxLoanValue <= 0) next.maxLoanValue = "Loan limit is required";
  if (step === "investments") {
    if (values.targetAmount <= 0) next.targetAmount = "Target amount is required";
    if (values.investmentContributionAmount <= 0) next.investmentContributionAmount = "Investment contribution is required";
  }
  if (step === "governance") {
    if (!values.withdrawalPolicy.trim()) next.withdrawalPolicy = "Withdrawal policy is required";
    if (!values.memberExitPolicy.trim()) next.memberExitPolicy = "Member exit policy is required";
    if (!values.refundPolicy.trim()) next.refundPolicy = "Refund policy is required";
    if (!values.disputeResolutionMethod.trim()) next.disputeResolutionMethod = "Dispute resolution method is required";
  }
  if (step === "review") {
    for (const visible of visibleSteps(values.type)) {
      if (visible === "review") continue;
      Object.assign(next, validateStep(visible, values));
    }
  }
  return next;
}

function collectionLabel(type: ChamaFormData["collectionAccountType"]) {
  if (type === "paybill") return "Paybill number";
  if (type === "till_number") return "Till number";
  if (type === "treasurer_number") return "Phone number";
  return "Collection account";
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

const styles = StyleSheet.create({
  content: { gap: 18, padding: 20, paddingBottom: 116 },
  footer: {
    backgroundColor: colors.surface,
    borderTopColor: colors.line,
    borderTopWidth: StyleSheet.hairlineWidth,
    bottom: 0,
    flexDirection: "row",
    gap: 12,
    left: 0,
    padding: 16,
    position: "absolute",
    right: 0
  },
  backButton: { alignItems: "center", backgroundColor: "#F1EEE4", borderRadius: 18, flex: 1, paddingVertical: 15 },
  backText: { fontFamily: "sans-serif", color: colors.text, fontSize: 13, fontWeight: "900" },
  nextButton: { alignItems: "center", backgroundColor: colors.green, borderRadius: 18, flex: 1.4, flexDirection: "row", gap: 8, justifyContent: "center", paddingVertical: 15 },
  nextText: { fontFamily: "sans-serif", color: colors.white, fontSize: 13, fontWeight: "900" },
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
  imagePlaceholder: { alignItems: "center", backgroundColor: "#F1EEE4", borderRadius: 18, padding: 18 },
  imageText: { fontFamily: "sans-serif", color: colors.textMuted, fontSize: 13, fontWeight: "800" },
  optionGrid: { gap: 10 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { backgroundColor: "#F1EEE4", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  chipActive: { backgroundColor: colors.green, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  chipText: { fontFamily: "sans-serif", color: colors.text, fontSize: 12, fontWeight: "800" },
  chipTextActive: { fontFamily: "sans-serif", color: colors.white, fontSize: 12, fontWeight: "900" },
  error: { fontFamily: "sans-serif", color: colors.red, fontSize: 12 },
  errorBanner: { backgroundColor: colors.redLight, borderRadius: 16, padding: 12 },
  errorBannerText: { fontFamily: "sans-serif", color: colors.red, fontSize: 12, fontWeight: "800" },
  previewCard: { gap: 12 },
  sectionTitle: { fontFamily: "sans-serif", color: colors.text, fontSize: 15, fontWeight: "900" },
  previewRow: { alignItems: "center", flexDirection: "row", gap: 12 },
  previewDot: { alignItems: "center", backgroundColor: colors.greenLight, borderRadius: 14, height: 28, justifyContent: "center", width: 28 },
  previewDotText: { fontFamily: "sans-serif", color: colors.green, fontSize: 12, fontWeight: "900" },
  previewName: { fontFamily: "sans-serif", color: colors.text, flex: 1, fontSize: 14, fontWeight: "900" },
  previewDate: { fontFamily: "sans-serif", color: colors.textMuted, fontSize: 12 },
  reviewCard: { paddingBottom: 6 },
  successWrap: { gap: 14, padding: 20 },
  successCard: { alignItems: "center", gap: 12, paddingVertical: 30 },
  warningBanner: { backgroundColor: colors.amberLight, borderRadius: 18, padding: 13 },
  warningText: { fontFamily: "sans-serif", color: colors.amberDark, fontSize: 12, fontWeight: "900", textAlign: "center" },
  checkCircle: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 34, height: 68, justifyContent: "center", width: 68 },
  checkText: { fontFamily: "sans-serif", color: colors.white, fontSize: 34, fontWeight: "900" },
  successTitle: { fontFamily: "sans-serif", color: colors.white, fontSize: 22, fontWeight: "900", textAlign: "center" },
  successSub: { fontFamily: "sans-serif", color: "rgba(255,255,255,0.84)", fontSize: 13, lineHeight: 19, textAlign: "center" }
});
