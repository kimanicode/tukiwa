import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, TextInput, View } from "react-native";
import { colors } from "../ui";

type PinInputProps = {
  length?: number;
  onComplete: (pin: string) => void;
  onClear?: () => void;
  error?: boolean;
  disabled?: boolean;
};

export function PinInput({
  length = 4,
  onComplete,
  onClear,
  error,
  disabled
}: PinInputProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<TextInput>(null);
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!error) return;
    setValue("");
    onClear?.();
    Animated.sequence([
      Animated.timing(shake, { toValue: 10, duration: 45, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -10, duration: 45, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 8, duration: 45, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 45, useNativeDriver: true })
    ]).start();
  }, [error, onClear, shake]);

  function update(nextValue: string) {
    const next = nextValue.replace(/\D/g, "").slice(0, length);
    setValue(next);
    if (next.length === length) {
      onComplete(next);
    }
  }

  return (
    <Pressable onPress={() => inputRef.current?.focus()} disabled={disabled}>
      <Animated.View style={[styles.row, { transform: [{ translateX: shake }] }]}>
        {Array.from({ length }).map((_, index) => {
          const filled = index < value.length;
          return (
            <View
              key={index}
              style={[
                styles.dot,
                filled ? styles.dotFilled : styles.dotEmpty,
                error ? styles.dotError : null
              ]}
            />
          );
        })}
      </Animated.View>
      <TextInput
        ref={inputRef}
        style={styles.hidden}
        value={value}
        onChangeText={update}
        keyboardType="number-pad"
        maxLength={length}
        editable={!disabled}
        autoFocus
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "center", flexDirection: "row", gap: 18, justifyContent: "center", paddingVertical: 18 },
  dot: { borderRadius: 16, height: 22, width: 22 },
  dotEmpty: { backgroundColor: "transparent", borderColor: colors.line, borderWidth: 2 },
  dotFilled: { backgroundColor: colors.green, borderColor: colors.green, borderWidth: 2 },
  dotError: { backgroundColor: colors.red, borderColor: colors.red },
  hidden: { height: 1, opacity: 0, position: "absolute", width: 1 }
});
