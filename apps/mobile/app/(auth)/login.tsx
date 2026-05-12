import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { apiErrorMessage, endpoints } from "../../lib/api";
import { Card, colors, PrimaryButton, Screen, TopBar, ui } from "../../components/ui";

const kenyaPhonePattern = /^(07|01)\d{8}$/;

export default function LoginScreen() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const normalized = phone.replace(/\D/g, "").slice(0, 10);
  const valid = kenyaPhonePattern.test(normalized);

  async function continueAuth(forceOtp = false) {
    if (!valid) {
      Alert.alert("Invalid phone", "Enter a valid Kenyan phone number.");
      return;
    }
    setLoading(true);
    try {
      const status = await endpoints.getPhoneStatus(normalized);
      if (!forceOtp && !status.isNewUser && status.hasPinSet) {
        router.push({ pathname: "/(auth)/pin-login", params: { phone: normalized, name: status.fullName ?? "" } });
        return;
      }
      await endpoints.requestOtp(normalized);
      router.push({ pathname: "/(auth)/otp", params: { phone: normalized, mode: forceOtp ? "reset" : "login" } });
    } catch (error) {
      Alert.alert("Could not continue", apiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <TopBar title="Karibu Tukiwa" subtitle="Secure access for your chama money" />
      <View style={ui.pagePad}>
        <Card style={styles.hero}>
          <Text style={styles.flag}>🇰🇪</Text>
          <Text style={styles.title}>Enter your phone number</Text>
          <Text style={styles.subtitle}>We'll check whether to use OTP or your Tukiwa PIN.</Text>
          <View style={styles.phoneRow}>
            <Text style={styles.prefix}>+254</Text>
            <TextInput
              style={styles.input}
              keyboardType="phone-pad"
              placeholder="7XXXXXXXX"
              value={normalized.startsWith("0") ? normalized.slice(1) : normalized}
              onChangeText={(value) => setPhone(value.startsWith("0") ? value : `0${value}`)}
              maxLength={9}
            />
          </View>
          {!valid && normalized.length > 0 ? <Text style={styles.error}>Use 07XX or 01XX, 10 digits.</Text> : null}
        </Card>
        <PrimaryButton tone="green" onPress={() => continueAuth(false)} style={!valid || loading ? styles.disabled : null}>
          {loading ? "Checking..." : "Continue"}
        </PrimaryButton>
        <Pressable onPress={() => continueAuth(true)} style={styles.linkWrap}>
          <Text style={styles.link}>Having trouble? Use OTP instead</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: 12 },
  flag: { fontSize: 36 },
  title: { fontFamily: "sans-serif", color: colors.text, fontSize: 22, fontWeight: "900" },
  subtitle: { fontFamily: "sans-serif", color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  phoneRow: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.line, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 10, marginTop: 8, paddingHorizontal: 14 },
  prefix: { fontFamily: "sans-serif", color: colors.green, fontSize: 16, fontWeight: "900" },
  input: { color: colors.text, flex: 1, fontFamily: "sans-serif", fontSize: 18, fontWeight: "800", paddingVertical: 15 },
  error: { fontFamily: "sans-serif", color: colors.red, fontSize: 12 },
  disabled: { opacity: 0.55 },
  linkWrap: { alignItems: "center", paddingVertical: 10 },
  link: { fontFamily: "sans-serif", color: colors.green, fontSize: 13, fontWeight: "900" }
});
