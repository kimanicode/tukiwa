import * as SecureStore from "expo-secure-store";
import { Appearance } from "react-native";
import { create } from "zustand";

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

type ThemeState = {
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  hydrate: () => Promise<void>;
  setMode: (mode: ThemeMode) => Promise<void>;
  toggleDarkMode: () => Promise<void>;
};

function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === "system") {
    return Appearance.getColorScheme() === "dark" ? "dark" : "light";
  }
  return mode;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: "system",
  resolvedTheme: resolveTheme("system"),
  hydrate: async () => {
    const stored = await SecureStore.getItemAsync("themeMode");
    const mode = stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
    set({ mode, resolvedTheme: resolveTheme(mode) });
  },
  setMode: async (mode) => {
    await SecureStore.setItemAsync("themeMode", mode);
    set({ mode, resolvedTheme: resolveTheme(mode) });
  },
  toggleDarkMode: async () => {
    const next = get().resolvedTheme === "dark" ? "light" : "dark";
    await get().setMode(next);
  }
}));
