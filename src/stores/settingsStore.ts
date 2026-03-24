import { create } from "zustand";

type Theme = "light" | "dark" | "system";

interface SettingsState {
  theme: Theme;
  deviceName: string;
  quickAccept: boolean;
  roomId: string;

  // Actions
  setTheme: (theme: Theme) => void;
  setDeviceName: (name: string) => void;
  setQuickAccept: (enabled: boolean) => void;
  setRoomId: (roomId: string) => void;

  // Derived
  resolvedTheme: () => "light" | "dark";
}

function getStoredTheme(): Theme {
  try {
    return (localStorage.getItem("dropit-theme") as Theme) || "system";
  } catch {
    return "system";
  }
}

function applyTheme(theme: Theme) {
  const resolved =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;

  document.documentElement.classList.toggle("dark", resolved === "dark");
  // Update theme-color meta tag
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", resolved === "dark" ? "#121212" : "#FF573E");
  }
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  theme: getStoredTheme(),
  deviceName: "",
  quickAccept: false,
  roomId: "default",

  setTheme: (theme) => {
    localStorage.setItem("dropit-theme", theme);
    applyTheme(theme);
    set({ theme });
  },
  setDeviceName: (deviceName) => set({ deviceName }),
  setQuickAccept: (quickAccept) => set({ quickAccept }),
  setRoomId: (roomId) => set({ roomId }),

  resolvedTheme: () => {
    const theme = get().theme;
    if (theme === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    return theme;
  },
}));

// Apply on load
applyTheme(getStoredTheme());

// Listen for system theme changes
window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", () => {
    const theme = useSettingsStore.getState().theme;
    if (theme === "system") {
      applyTheme("system");
    }
  });
