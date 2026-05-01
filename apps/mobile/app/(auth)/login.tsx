import { zodResolver } from "@hookform/resolvers/zod";
import { devLoginSchema, requestOtpSchema } from "@chama/shared";
import { router } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";
import { z } from "zod";
import { apiErrorMessage, endpoints } from "../../lib/api";
import { useAuthStore } from "../../stores/auth.store";
import { Card, CardTitle, colors, PrimaryButton, Screen, TopBar, ui } from "../../components/ui";

const useDevLogin = __DEV__;
const loginSchema = useDevLogin ? devLoginSchema : requestOtpSchema;
type FormValues = z.infer<typeof devLoginSchema>;

export default function LoginScreen() {
  const login = useAuthStore((state) => state.login);
  const { control, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { phone: "2547", fullName: "" }
  });

  const submit = handleSubmit(async (values) => {
    try {
      if (useDevLogin) {
        const response = await endpoints.devLogin(values);
        await login(response.user, response.accessToken, response.refreshToken);
        router.replace("/(app)");
        return;
      }

      await endpoints.requestOtp({ phone: values.phone });
      router.push({ pathname: "/(auth)/verify-otp", params: { phone: values.phone } });
    } catch (error) {
      Alert.alert(useDevLogin ? "Could not login" : "Could not send OTP", apiErrorMessage(error));
    }
  });

  return (
    <Screen>
      <TopBar
        title="Karibu Tukiwa"
        subtitle={useDevLogin ? "Create a development account to continue" : "Sign in with your Kenyan phone number"}
      />
      <View style={ui.pagePad}>
      {useDevLogin ? (
        <Card>
          <CardTitle>Full name</CardTitle>
          <Controller
            control={control}
            name="fullName"
            render={({ field }) => (
              <TextInput
                style={ui.input}
                placeholder="Your name"
                value={field.value}
                onChangeText={field.onChange}
              />
            )}
          />
          {formState.errors.fullName ? (
            <Text style={styles.error}>{formState.errors.fullName.message}</Text>
          ) : null}
        </Card>
      ) : null}
      <Card>
        <CardTitle>Phone number</CardTitle>
        <Controller
          control={control}
          name="phone"
          render={({ field }) => (
            <TextInput
              style={ui.input}
              keyboardType="phone-pad"
              placeholder="2547XXXXXXXX"
              value={field.value}
              onChangeText={field.onChange}
            />
          )}
        />
        {formState.errors.phone ? (
          <Text style={styles.error}>{formState.errors.phone.message}</Text>
        ) : null}
      </Card>
      <PrimaryButton onPress={submit}>{useDevLogin ? "Create account and login" : "Send OTP"}</PrimaryButton>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: { fontFamily: "sans-serif", color: colors.red, fontSize: 12, marginTop: 8 }
});
