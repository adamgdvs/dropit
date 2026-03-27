import { NavLink, useNavigate } from "react-router-dom";
import { useDeviceStore } from "../stores/deviceStore";
import { useFileStore } from "../stores/fileStore";
import { getDeviceName } from "../services/deviceIdentity";

const navItems = [
  { to: "/", icon: "dashboard", label: "Dashboard" },
  { to: "/send", icon: "outbox", label: "Send" },
  { to: "/received", icon: "move_to_inbox", label: "Received" },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const isConnected = useDeviceStore((s) => s.isSignalingConnected);
  const myName = useDeviceStore((s) => s.myName);
  const receivedCount = useFileStore((s) => s.received.length);
  const displayName = myName || getDeviceName();

  const getBadge = (to: string) => {
    if (to === "/received" && receivedCount > 0) return receivedCount;
    return null;
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-surface-container-low border-r border-surface-container-high flex-col py-8 px-4 z-40 hidden md:flex">
        {/* Logo Section */}
        <div className="mb-12 px-2">
          <h1 className="text-xl font-black text-primary font-headline tracking-tight uppercase">DropIt Node</h1>
          <p className="text-[10px] text-secondary/40 font-mono tracking-widest mt-1">v4.2.0-alpha</p>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 flex flex-col gap-2">
          {navItems.map((item) => {
            const badge = getBadge(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `flex items-center justify-between px-4 py-3 font-headline text-sm font-medium tracking-wide transition-all duration-300 ${
                    isActive
                      ? "text-primary border-r-2 border-primary bg-gradient-to-r from-primary/10 to-transparent"
                      : "text-gray-500 hover:text-gray-300 hover:bg-surface-container-high hover:translate-x-1"
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined">{item.icon}</span>
                  {item.label}
                </div>
                {badge !== null && (
                  <span className="font-mono text-[10px] bg-primary/20 text-primary px-2 py-0.5 animate-pulse uppercase">
                    +{badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User Profile & Footer Actions */}
        <div className="mt-auto space-y-4">
          <div className="p-4 bg-surface-container-highest rounded-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-secondary border border-outline">
                <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold truncate">{displayName}</p>
                <p className={`text-[10px] font-mono tracking-widest ${isConnected ? "text-green-500" : "text-secondary/60"}`}>
                  {isConnected ? "NODE LINKED" : "OFFLINE"}
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate("/send")}
              className="w-full bg-primary text-white py-2 font-headline text-xs font-bold uppercase tracking-widest hover:opacity-80 active:scale-95 transition-all"
            >
              New Transfer
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom NavBar — clean 4-tab layout */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 w-full bg-surface-container-low border-t border-surface-container-high z-50">
        <div className="flex justify-around items-stretch">
          <NavLink to="/" end aria-label="Dashboard" className={({ isActive }) => `flex-1 flex flex-col items-center justify-center gap-1 py-3 min-h-[48px] transition-colors ${isActive ? "text-primary" : "text-on-surface-variant"}`}>
            {({ isActive }) => (
              <>
                {isActive && <span className="absolute top-0 w-8 h-0.5 bg-primary rounded-full" />}
                <span className="material-symbols-outlined text-[22px]">dashboard</span>
                <span className="text-[9px] font-headline uppercase font-bold tracking-wider">Dash</span>
              </>
            )}
          </NavLink>
          <NavLink to="/send" aria-label="Send files" className={({ isActive }) => `flex-1 flex flex-col items-center justify-center gap-1 py-3 min-h-[48px] transition-colors ${isActive ? "text-primary" : "text-on-surface-variant"}`}>
            {({ isActive }) => (
              <>
                {isActive && <span className="absolute top-0 w-8 h-0.5 bg-primary rounded-full" />}
                <span className="material-symbols-outlined text-[22px]">send</span>
                <span className="text-[9px] font-headline uppercase font-bold tracking-wider">Send</span>
              </>
            )}
          </NavLink>
          <NavLink to="/received" aria-label="Received files" className={({ isActive }) => `flex-1 flex flex-col items-center justify-center gap-1 py-3 min-h-[48px] transition-colors relative ${isActive ? "text-primary" : "text-on-surface-variant"}`}>
            {({ isActive }) => (
              <>
                {isActive && <span className="absolute top-0 w-8 h-0.5 bg-primary rounded-full" />}
                <span className="material-symbols-outlined text-[22px]">move_to_inbox</span>
                <span className="text-[9px] font-headline uppercase font-bold tracking-wider">Inbox</span>
                {receivedCount > 0 && (
                  <span className="absolute top-2 right-1/4 w-4 h-4 bg-primary text-white text-[8px] font-bold flex items-center justify-center rounded-full">{receivedCount > 9 ? "9+" : receivedCount}</span>
                )}
              </>
            )}
          </NavLink>
          <button onClick={() => navigate("/send")} aria-label="Settings" className="flex-1 flex flex-col items-center justify-center gap-1 py-3 min-h-[48px] text-on-surface-variant">
            <span className="material-symbols-outlined text-[22px]">settings</span>
            <span className="text-[9px] font-headline uppercase font-bold tracking-wider">Settings</span>
          </button>
        </div>
      </nav>
    </>
  );
}
