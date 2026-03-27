import { useSettingsStore } from "../stores/settingsStore";
import { useNavigate } from "react-router-dom";

export default function TopBar() {
  const navigate = useNavigate();
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
    <header className="fixed top-0 w-full z-30 bg-background flex justify-between items-center px-4 py-2.5 md:pl-68 border-b border-surface-container-high/30">
      <div className="flex items-center gap-6 flex-1">
        <div className="md:hidden text-2xl font-bold text-primary tracking-tight font-headline uppercase">DropIt</div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={cycleTheme}
          className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-primary transition-colors duration-200"
          title={`Theme: ${theme}`}
          aria-label={`Switch theme, current: ${theme}`}
        >
          <span className="material-symbols-outlined">{themeIcon}</span>
        </button>
        
        <div className="h-6 w-px bg-surface-container-highest mx-2 hidden md:block"></div>
        
        <button
          onClick={() => navigate("/send")}
          className="hidden lg:block bg-transparent border border-primary/30 text-primary px-4 py-2.5 min-h-[44px] font-headline text-xs font-bold uppercase tracking-tighter hover:bg-primary/10 transition-all"
        >
          New Transfer
        </button>
      </div>
    </header>
  );
}
