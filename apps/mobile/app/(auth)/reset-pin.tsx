import { router } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { PinInput } from "../../components/ui/PinInput";
import { apiErrorMessage, endpoints } from "../../lib/api";
import { useAuthStore } from "../../stores/auth.store";
import { Card, colors, Screen, TopBar, ui } from "../../components/ui";

export default function ResetPinScreen() {
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
      await endpoints.resetPin(pin, value);
      setPinSet();
      Alert.alert("PIN updated successfully");
      router.replace("/(app)");
    } catch (err) {
      Alert.alert("Could not reset PIN", apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <TopBar title="Set a new PIN" subtitle={confirming ? "Re-enter your PIN" : "Choose 4 digits"} />
      <View style={ui.pagePad}>
        <Card>
          <Text style={styles.title}>{confirming ? "Confirm new PIN" : "New PIN"}</Text>
          <PinInput
            key={confirming ? "confirm-reset-pin" : "enter-reset-pin"}
            onComplete={complete}
            error={error}
            disabled={loading}
          />
          {error ? <Text style={styles.error}>PINs don't match</Text> : null}
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: "sans-serif", color: colors.text, fontSize: 16, fontWeight: "900", textAlign: "center" },
  error: { fontFamily: "sans-serif", color: colors.red, fontSize: 13, fontWeight: "900", textAlign: "center" }
});
