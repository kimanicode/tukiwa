import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { apiErrorMessage, endpoints } from "../../lib/api";
import { useAuthStore } from "../../stores/auth.store";
import { Card, colors, PrimaryButton, Screen, TopBar, ui } from "../../components/ui";

export default function OtpScreen() {
  const { phone = "", mode = "login" } = useLocalSearchParams<{ phone: string; mode?: string }>();
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [seconds, setSeconds] = useState(60);
  const refs = useRef<Array<TextInput | null>>([]);
  const login = useAuthStore((state) => state.login);
  const code = useMemo(() => digits.join(""), [digits]);

  useEffect(() => {
    const timer = setInterval(() => setSeconds((value) => Math.max(value - 1, 0)), 1000);
    return () => clearInterval(timer);
  }, []);

  async function verify() {
    try {
      const response = await endpoints.verifyOtp(phone, code);
      await login(response.user, response.accessToken, response.refreshToken);
      if (mode === "reset") {
        router.replace("/(auth)/reset-pin");
      } else if (!response.user.isProfileComplete) {
        router.replace("/(auth)/profile-setup");
      } else if (!response.user.hasPinSet) {
        router.replace("/(auth)/set-pin");
      } else {
        router.replace("/(app)");
      }
    } catch (error) {
      Alert.alert("Could not verify OTP", apiErrorMessage(error));
    }
  }

  async function resend() {
    try {
      await endpoints.requestOtp(phone);
      setSeconds(60);
    } catch (error) {
      Alert.alert("Could not resend OTP", apiErrorMessage(error));
    }
  }

  return (
    <Screen>
      <TopBar title="Enter OTP" subtitle={`We sent a 6-digit code to ${phone}`} />
      <View style={ui.pagePad}>
        <Card>
          <View style={styles.otpRow}>
            {digits.map((digit, index) => (
              <TextInput
                key={index}
                ref={(input) => {
                  refs.current[index] = input;
                }}
                style={styles.otpInput}
                keyboardType="number-pad"
                maxLength={1}
                value={digit}
                onChangeText={(value) => {
                  const next = [...digits];
                  next[index] = value.replace(/\D/g, "");
                  setDigits(next);
                  if (value && index < 5) refs.current[index + 1]?.focus();
                }}
              />
            ))}
          </View>
        </Card>
        <PrimaryButton tone="green" onPress={verify} style={code.length !== 6 ? styles.disabled : null}>Verify and continue</PrimaryButton>
        <Pressable style={styles.resend} disabled={seconds > 0} onPress={resend}>
          <Text style={seconds > 0 ? styles.resendDisabled : styles.resendText}>
            {seconds > 0 ? `Resend in ${seconds}s` : "Resend OTP"}
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  otpRow: { flexDirection: "row", justifyContent: "space-between" },
  otpInput: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    color: colors.text,
    fontFamily: "sans-serif",
    fontSize: 20,
    fontWeight: "900",
    height: 56,
    textAlign: "center",
    width: 48
  },
  disabled: { opacity: 0.55 },
  resend: { alignItems: "center", paddingVertical: 8 },
  resendText: { fontFamily: "sans-serif", color: colors.green, fontSize: 14, fontWeight: "900" },
  resendDisabled: { fontFamily: "sans-serif", color: colors.textMuted, fontSize: 14 }
});
