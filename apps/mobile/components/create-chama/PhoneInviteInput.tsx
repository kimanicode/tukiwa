import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors } from "../ui";

const phoneRegex = /^(07|01)\d{8}$/;

export function PhoneInviteInput({
  phones,
  onChange
}: {
  phones: string[];
  onChange: (phones: string[]) => void;
}) {
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  function addPhone() {
    const next = phone.trim();
    if (!phoneRegex.test(next)) {
      setError("Use a valid Kenyan phone number.");
      return;
    }
    if (phones.includes(next)) {
      setError("This phone number is already invited");
      return;
    }
    onChange([...phones, next]);
    setPhone("");
    setError("");
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          keyboardType="phone-pad"
          maxLength={10}
          placeholder="07XXXXXXXX"
          placeholderTextColor={colors.textMuted}
          value={phone}
          onChangeText={setPhone}
        />
        <Pressable style={styles.button} onPress={addPhone}>
          <Text style={styles.buttonText}>Add</Text>
        </Pressable>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.chips}>
        {phones.map((item) => (
          <Pressable key={item} style={styles.chip} onPress={() => onChange(phones.filter((phoneItem) => phoneItem !== item))}>
            <Text style={styles.chipText}>{item} x</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  row: { flexDirection: "row", gap: 10 },
  input: {
    fontFamily: "sans-serif",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    color: colors.text,
    flex: 1,
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 14
  },
  button: { alignItems: "center", backgroundColor: colors.navy, borderRadius: 18, justifyContent: "center", paddingHorizontal: 18 },
  buttonText: { fontFamily: "sans-serif", color: colors.white, fontSize: 13, fontWeight: "900" },
  error: { fontFamily: "sans-serif", color: colors.red, fontSize: 12 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { backgroundColor: colors.greenLight, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  chipText: { fontFamily: "sans-serif", color: colors.green, fontSize: 12, fontWeight: "800" }
});
