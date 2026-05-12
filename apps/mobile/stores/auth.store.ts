import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import type { User } from "../lib/api";

type AuthState = {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isPhoneVerified: boolean;
  isProfileComplete: boolean;
  hasPinSet: boolean;
  biometricsEnabled: boolean;
  hydrate: () => Promise<void>;
  login: (user: User, accessToken: string, refreshToken: string) => Promise<void>;
  logout: () => Promise<void>;
  setTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  setProfileComplete: () => void;
  setPinSet: () => void;
  setBiometricsEnabled: (enabled: boolean) => Promise<void>;
  setUser: (user: User) => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isPhoneVerified: false,
  isProfileComplete: false,
  hasPinSet: false,
  biometricsEnabled: false,
  hydrate: async () => {
    const [accessToken, refreshToken, storedUser, biometricsEnabled] = await Promise.all([
      SecureStore.getItemAsync("accessToken"),
      SecureStore.getItemAsync("refreshToken"),
      SecureStore.getItemAsync("user"),
      SecureStore.getItemAsync("biometricsEnabled")
    ]);
    const user = storedUser ? (JSON.parse(storedUser) as User) : null;
    set({
      accessToken,
      refreshToken,
      user,
      isPhoneVerified: Boolean(user?.isPhoneVerified),
      isProfileComplete: Boolean(user?.isProfileComplete),
      hasPinSet: Boolean(user?.hasPinSet),
      biometricsEnabled: biometricsEnabled === "true"
    });
  },
  login: async (user, accessToken, refreshToken) => {
    await SecureStore.setItemAsync("accessToken", accessToken);
    await SecureStore.setItemAsync("refreshToken", refreshToken);
    await SecureStore.setItemAsync("user", JSON.stringify(user));
    set({
      user,
      accessToken,
      refreshToken,
      isPhoneVerified: Boolean(user.isPhoneVerified),
      isProfileComplete: Boolean(user.isProfileComplete),
      hasPinSet: Boolean(user.hasPinSet)
    });
  },
  logout: async () => {
    await SecureStore.deleteItemAsync("accessToken");
    await SecureStore.deleteItemAsync("refreshToken");
    await SecureStore.deleteItemAsync("user");
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isPhoneVerified: false,
      isProfileComplete: false,
      hasPinSet: false
    });
  },
  setTokens: async (accessToken, refreshToken) => {
    await SecureStore.setItemAsync("accessToken", accessToken);
    await SecureStore.setItemAsync("refreshToken", refreshToken);
    set({ accessToken, refreshToken });
  },
  setProfileComplete: () => set({ isProfileComplete: true }),
  setPinSet: () => set({ hasPinSet: true }),
  setBiometricsEnabled: async (enabled) => {
    await SecureStore.setItemAsync("biometricsEnabled", enabled ? "true" : "false");
    set({ biometricsEnabled: enabled });
  },
  setUser: async (user) => {
    await SecureStore.setItemAsync("user", JSON.stringify(user));
    set({
      user,
      isPhoneVerified: Boolean(user.isPhoneVerified),
      isProfileComplete: Boolean(user.isProfileComplete),
      hasPinSet: Boolean(user.hasPinSet)
    });
  }
}));
