import { Redirect } from "expo-router";
import { useAuthStore } from "../stores/auth.store";

export default function Index() {
  const accessToken = useAuthStore((state) => state.accessToken);
  return <Redirect href={accessToken ? "/(app)" : "/(auth)/login"} />;
}
