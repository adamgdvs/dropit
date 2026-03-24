import { useSettingsStore } from "../stores/settingsStore";

export default function TopBar() {
  const theme = useSettingsStore((s) => s.theme);
  const resolvedTheme = useSettingsStore((s) => s.resolvedTheme);
  const setTheme = useSettingsStore((s) => s.setTheme);

  const cycleTheme = () => {
    const order: Array<"light" | "dark" | "system"> = ["light", "dark", "system"];
    const next = order[(order.indexOf(theme) + 1) % order.length];
    setTheme(next);
  };

  const themeIcon =
    theme === "system" ? "brightness_auto" :
    resolvedTheme() === "dark" ? "dark_mode" : "light_mode";

  return (
    <header className="flex items-center justify-between px-4 md:px-8 w-full h-14 md:h-0 bg-transparent sticky top-0 z-30">
      {/* Mobile logo */}
      <span className="md:hidden font-bold text-lg tracking-widest uppercase">DROPIT</span>

      <div className="flex-1" />

      <div className="flex items-center gap-1 absolute top-4 right-4 md:right-8 z-40">
        <button
          onClick={cycleTheme}
          className="w-10 h-10 border border-outline flex items-center justify-center text-on-surface-variant hover:border-primary hover:text-primary transition-colors"
          title={`Theme: ${theme}`}
          aria-label={`Current theme: ${theme}. Click to change.`}
        >
          <span className="material-symbols-outlined text-xl">{themeIcon}</span>
        </button>
        <button className="hidden md:flex w-10 h-10 border border-outline items-center justify-center text-on-surface-variant hover:border-primary hover:text-primary transition-colors">
          <span className="material-symbols-outlined text-xl">settings</span>
        </button>
      </div>
    </header>
  );
}
