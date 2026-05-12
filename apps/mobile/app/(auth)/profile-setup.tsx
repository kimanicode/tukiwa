import { router } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";
import { apiErrorMessage, endpoints } from "../../lib/api";
import { useAuthStore } from "../../stores/auth.store";
import { Card, colors, PrimaryButton, ProgressBar, Screen, TopBar, ui } from "../../components/ui";

export default function ProfileSetupScreen() {
  const setUser = useAuthStore((state) => state.setUser);
  const [fullName, setFullName] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [loading, setLoading] = useState(false);
  const valid = fullName.trim().length >= 2 && /^\d{8}$/.test(nationalId);

  async function submit() {
    if (!valid) return;
    setLoading(true);
    try {
      const user = await endpoints.setupProfile({ fullName, nationalId });
      await setUser(user);
      router.replace("/(auth)/set-pin");
    } catch (error) {
      Alert.alert("Could not save profile", apiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <TopBar title="Set up your profile" subtitle="Step 1 of 2" />
      <View style={ui.pagePad}>
        <ProgressBar progress={0.5} />
        <Card style={styles.card}>
          <View style={styles.photo}><Text style={styles.camera}>⌁</Text></View>
          <TextInput style={ui.input} placeholder="Full name" value={fullName} onChangeText={setFullName} />
          <TextInput
            style={ui.input}
            placeholder="e.g. 12345678"
            keyboardType="number-pad"
            maxLength={8}
            value={nationalId}
            onChangeText={(value) => setNationalId(value.replace(/\D/g, "").slice(0, 8))}
          />
          <Text style={styles.helper}>Your ID is used for identity verification only.</Text>
        </Card>
        <PrimaryButton tone="green" onPress={submit} style={!valid || loading ? styles.disabled : null}>
          {loading ? "Saving..." : "Continue"}
        </PrimaryButton>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  photo: { alignItems: "center", alignSelf: "center", backgroundColor: "#F1EEE4", borderRadius: 42, height: 84, justifyContent: "center", width: 84 },
  camera: { color: colors.textMuted, fontSize: 24 },
  helper: { fontFamily: "sans-serif", color: colors.textMuted, fontSize: 12 },
  disabled: { opacity: 0.55 }
});
