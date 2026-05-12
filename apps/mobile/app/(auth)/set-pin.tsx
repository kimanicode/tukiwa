import { router } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { PinInput } from "../../components/ui/PinInput";
import { apiErrorMessage, endpoints } from "../../lib/api";
import { useAuthStore } from "../../stores/auth.store";
import { Card, colors, PrimaryButton, ProgressBar, Screen, TopBar, ui } from "../../components/ui";

export default function SetPinScreen() {
  const setPinSet = useAuthStore((state) => state.setPinSet);
  const [pin, setPin] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function complete(value: string) {
    setError(false);
    if (!confirming) {
      setPin(value);
      setConfirming(true);
      return;
    }
    if (value !== pin) {
      setError(true);
      return;
    }
    setLoading(true);
    try {
      await endpoints.setPin(pin, value);
      setPinSet();
      router.replace("/(app)");
    } catch (err) {
      Alert.alert("Could not set PIN", apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <TopBar title="Create your PIN" subtitle="Step 2 of 2" />
      <View style={ui.pagePad}>
        <ProgressBar progress={1} />
        <Card>
          <Text style={styles.title}>{confirming ? "Re-enter your PIN" : "You'll use this every time you open Tukiwa"}</Text>
          <PinInput
            key={confirming ? "confirm-pin" : "enter-pin"}
            onComplete={complete}
            error={error}
            disabled={loading}
          />
          {error ? <Text style={styles.error}>PINs don't match</Text> : null}
        </Card>
        {confirming ? (
          <PrimaryButton tone="outline" onPress={() => { setConfirming(false); setPin(""); }}>
            Start again
          </PrimaryButton>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: "sans-serif", color: colors.text, fontSize: 16, fontWeight: "900", textAlign: "center" },
  error: { fontFamily: "sans-serif", color: colors.red, fontSize: 13, fontWeight: "900", textAlign: "center" }
});
