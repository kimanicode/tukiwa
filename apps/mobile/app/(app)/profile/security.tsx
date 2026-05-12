import * as LocalAuthentication from "expo-local-authentication";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { PinInput } from "../../../components/ui/PinInput";
import { apiErrorMessage, endpoints } from "../../../lib/api";
import { useAuthStore } from "../../../stores/auth.store";
import { AppHeader, colors, GreenPanel, PrimaryButton, Screen, SoftCard, ui, useThemeColors } from "../../../components/ui";

type ChangeStep = "idle" | "current" | "new" | "confirm";

export default function SecurityScreen() {
  const user = useAuthStore((state) => state.user);
  const login = useAuthStore((state) => state.login);
  const setPinSet = useAuthStore((state) => state.setPinSet);
  const biometricsEnabled = useAuthStore((state) => state.biometricsEnabled);
  const setBiometricsEnabled = useAuthStore((state) => state.setBiometricsEnabled);
  const [step, setStep] = useState<ChangeStep>("idle");
  const [newPin, setNewPin] = useState("");
  const [error, setError] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const theme = useThemeColors();

  async function toggleBiometrics(enabled: boolean) {
    if (!enabled) {
      await setBiometricsEnabled(false);
      return;
    }
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (!hasHardware || !isEnrolled) {
      Alert.alert("Biometrics not available on this device");
      return;
    }
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Confirm your identity to enable biometrics"
    });
    if (result.success) {
      await setBiometricsEnabled(true);
    }
  }

  async function completePin(pin: string) {
    setError(false);
    setMessage("");
    if (!user?.phone) {
      setMessage("Sign in again to change your PIN.");
      return;
    }

    if (step === "current") {
      setLoading(true);
      try {
        const response = await endpoints.verifyPin({ phone: user.phone, pin });
        await login(response.user, response.accessToken, response.refreshToken);
        setStep("new");
      } catch (err) {
        setError(true);
        setMessage(apiErrorMessage(err));
      } finally {
        setLoading(false);
      }
      return;
    }

    if (step === "new") {
      setNewPin(pin);
      setStep("confirm");
      return;
    }

    if (step === "confirm") {
      if (pin !== newPin) {
        setError(true);
        setMessage("PINs don't match");
        return;
      }
      setLoading(true);
      try {
        await endpoints.resetPin(newPin, pin);
        setPinSet();
        setStep("idle");
        setNewPin("");
        Alert.alert("PIN changed", "Your Tukiwa PIN has been updated.");
      } catch (err) {
        setError(true);
        setMessage(apiErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <Screen>
      <AppHeader title="Security & PIN" subtitle="Protect your Tukiwa account" back />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <GreenPanel style={styles.panel}>
          <Text style={styles.panelLabel}>ACCOUNT SECURITY</Text>
          <Text style={styles.panelTitle}>{user?.hasPinSet ? "PIN active" : "PIN not set"}</Text>
          <Text style={styles.panelText}>Use a private 4-digit PIN and optional device biometrics for faster sign-in.</Text>
        </GreenPanel>

        <SoftCard style={styles.section}>
          <View style={ui.rowBetween}>
            <View style={styles.optionTextWrap}>
              <Text style={[styles.optionTitle, { color: theme.text }]}>Change PIN</Text>
              <Text style={[styles.optionSub, { color: theme.textMuted }]}>Verify your current PIN, then choose a new one.</Text>
            </View>
            <PrimaryButton tone="green" onPress={() => setStep("current")} style={styles.smallButton}>Start</PrimaryButton>
          </View>
        </SoftCard>

        <SoftCard style={styles.section}>
          <View style={ui.rowBetween}>
            <View style={styles.optionTextWrap}>
              <Text style={[styles.optionTitle, { color: theme.text }]}>Use Face ID / Fingerprint</Text>
              <Text style={[styles.optionSub, { color: theme.textMuted }]}>Unlock with biometrics on this device.</Text>
            </View>
            <Switch value={biometricsEnabled} onValueChange={toggleBiometrics} />
          </View>
        </SoftCard>

        <SoftCard style={styles.section}>
          <Text style={[styles.optionTitle, { color: theme.text }]}>Recovery</Text>
          <Text style={[styles.optionSub, { color: theme.textMuted }]}>Forgot your PIN? Verify your phone by OTP and set a new PIN.</Text>
          <Pressable
            style={styles.recoveryButton}
            onPress={async () => {
              if (!user?.phone) return;
              try {
                await endpoints.requestOtp(user.phone);
                router.push({ pathname: "/(auth)/otp", params: { phone: user.phone, mode: "reset" } });
              } catch (err) {
                Alert.alert("Could not send OTP", apiErrorMessage(err));
              }
            }}
          >
            <Text style={styles.recoveryText}>Reset PIN with OTP</Text>
          </Pressable>
        </SoftCard>

        {step !== "idle" ? (
          <SoftCard style={styles.pinCard}>
            <Text style={[styles.pinTitle, { color: theme.text }]}>{stepTitle(step)}</Text>
            <PinInput
              key={step}
              onComplete={completePin}
              error={error}
              disabled={loading}
            />
            {message ? <Text style={[error ? styles.errorText : styles.statusText, !error ? { color: theme.textMuted } : null]}>{message}</Text> : null}
            <Pressable
              style={styles.cancel}
              onPress={() => {
                setStep("idle");
                setNewPin("");
                setError(false);
                setMessage("");
              }}
            >
              <Text style={[styles.cancelText, { color: theme.textMuted }]}>Cancel</Text>
            </Pressable>
          </SoftCard>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function stepTitle(step: ChangeStep): string {
  if (step === "current") return "Enter current PIN";
  if (step === "new") return "Enter new PIN";
  if (step === "confirm") return "Confirm new PIN";
  return "";
}

const styles = StyleSheet.create({
  content: { gap: 14, padding: 20, paddingBottom: 36 },
  panel: { gap: 8 },
  panelLabel: { fontFamily: "sans-serif", color: "rgba(255,255,255,0.72)", fontSize: 12, fontWeight: "900" },
  panelTitle: { fontFamily: "sans-serif", color: colors.white, fontSize: 30, fontWeight: "900" },
  panelText: { fontFamily: "sans-serif", color: "rgba(255,255,255,0.86)", fontSize: 13, lineHeight: 19 },
  section: { gap: 12 },
  optionTextWrap: { flex: 1, paddingRight: 12 },
  optionTitle: { fontFamily: "sans-serif", color: colors.text, fontSize: 15, fontWeight: "900" },
  optionSub: { fontFamily: "sans-serif", color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  smallButton: { minWidth: 84, paddingHorizontal: 12, paddingVertical: 10 },
  recoveryButton: { alignItems: "center", backgroundColor: colors.navy, borderRadius: 18, paddingVertical: 12 },
  recoveryText: { fontFamily: "sans-serif", color: colors.white, fontSize: 13, fontWeight: "900" },
  pinCard: { gap: 4 },
  pinTitle: { fontFamily: "sans-serif", color: colors.text, fontSize: 17, fontWeight: "900", textAlign: "center" },
  errorText: { fontFamily: "sans-serif", color: colors.red, fontSize: 13, fontWeight: "900", textAlign: "center" },
  statusText: { fontFamily: "sans-serif", color: colors.textMuted, fontSize: 13, fontWeight: "800", textAlign: "center" },
  cancel: { alignItems: "center", paddingVertical: 8 },
  cancelText: { fontFamily: "sans-serif", color: colors.textMuted, fontSize: 13, fontWeight: "900" }
});
