import * as LocalAuthentication from "expo-local-authentication";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { PinInput } from "../../components/ui/PinInput";
import { apiErrorMessage, endpoints } from "../../lib/api";
import { useAuthStore } from "../../stores/auth.store";
import { Card, colors, Screen, TopBar, ui } from "../../components/ui";

export default function PinLoginScreen() {
  const { phone = "", name = "" } = useLocalSearchParams<{ phone: string; name?: string }>();
  const login = useAuthStore((state) => state.login);
  const logout = useAuthStore((state) => state.logout);
  const biometricsEnabled = useAuthStore((state) => state.biometricsEnabled);
  const [error, setError] = useState(false);
  const [message, setMessage] = useState("");
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    if (!biometricsEnabled || !phone) return;
    void biometricLogin();
  }, [biometricsEnabled, phone]);

  async function biometricLogin() {
    try {
      const challenge = await endpoints.getBiometricChallenge(phone);
      const auth = await LocalAuthentication.authenticateAsync({
        promptMessage: "Confirm your identity to open Tukiwa"
      });
      if (!auth.success) return;
      const response = await endpoints.verifyBiometric(phone, challenge.biometricToken);
      await login(response.user, response.accessToken, response.refreshToken);
      router.replace("/(app)");
    } catch {
      // Fall back to PIN.
    }
  }

  async function complete(pin: string) {
    setError(false);
    setMessage("");
    try {
      const response = await endpoints.verifyPin({ phone, pin });
      await login(response.user, response.accessToken, response.refreshToken);
      router.replace("/(app)");
    } catch (err) {
      const text = apiErrorMessage(err);
      setMessage(text);
      setError(true);
      if (text.includes("Too many attempts")) setLocked(true);
    }
  }

  async function forgotPin() {
    try {
      await endpoints.requestOtp(phone);
      router.replace({ pathname: "/(auth)/otp", params: { phone, mode: "reset" } });
    } catch (err) {
      Alert.alert("Could not send OTP", apiErrorMessage(err));
    }
  }

  return (
    <Screen>
      <TopBar title={`Welcome back${name ? `, ${firstName(name)}` : ""}`} subtitle={phone} />
      <View style={ui.pagePad}>
        <Card>
          <Text style={styles.title}>{locked ? "PIN login is locked" : "Enter your PIN"}</Text>
          <PinInput onComplete={complete} error={error} disabled={locked} />
          {message ? <Text style={styles.error}>{message}</Text> : null}
        </Card>
        <Pressable onPress={forgotPin} style={styles.linkWrap}>
          <Text style={styles.link}>Forgot PIN?</Text>
        </Pressable>
        <Pressable onPress={() => { void logout(); router.replace("/(auth)/login"); }} style={styles.linkWrap}>
          <Text style={styles.mutedLink}>Not you?</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

function firstName(value: string) {
  return value.trim().split(/\s+/)[0] ?? "";
}

const styles = StyleSheet.create({
  title: { fontFamily: "sans-serif", color: colors.text, fontSize: 16, fontWeight: "900", textAlign: "center" },
  error: { fontFamily: "sans-serif", color: colors.red, fontSize: 13, fontWeight: "900", textAlign: "center" },
  linkWrap: { alignItems: "center", paddingVertical: 8 },
  link: { fontFamily: "sans-serif", color: colors.green, fontSize: 14, fontWeight: "900" },
  mutedLink: { fontFamily: "sans-serif", color: colors.textMuted, fontSize: 13, fontWeight: "800" }
});
