import { NavLink, useNavigate } from "react-router-dom";
import { useDeviceStore } from "../stores/deviceStore";
import { useTransferStore } from "../stores/transferStore";
import { useFileStore } from "../stores/fileStore";

const navItems = [
  { to: "/", num: "01", label: "Dashboard" },
  { to: "/files", num: "02", label: "My Files" },
  { to: "/send", num: "03", label: "Send" },
  { to: "/received", num: "04", label: "Received" },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const isConnected = useDeviceStore((s) => s.isSignalingConnected);
  const connectedDevices = useDeviceStore((s) => s.connectedDevices);
  const activeList = useTransferStore((s) => s.activeList);
  const receivedCount = useFileStore((s) => s.received.length);

  const connected = connectedDevices();
  const activeCount = activeList().length;

  const getBadge = (to: string) => {
    if (to === "/send" && activeCount > 0) return activeCount;
    if (to === "/received" && receivedCount > 0) return receivedCount;
    return null;
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-72 bg-surface border-r border-outline z-40 flex-col">
        {/* Logo */}
        <div className="p-8 border-b border-outline flex items-center gap-3">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" className="text-primary" />
            <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" className="text-primary" />
            <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" className="text-primary" />
          </svg>
          <div>
            <h1 className="font-bold text-xl tracking-widest uppercase leading-none">DROPIT</h1>
            <p className="font-mono text-[10px] text-primary tracking-widest mt-1">
              {isConnected
                ? `${connected.length} DEVICE${connected.length !== 1 ? "S" : ""} CONNECTED`
                : "OFFLINE"}
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-8 flex flex-col gap-1">
          {navItems.map((item) => {
            const badge = getBadge(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `flex items-center justify-between px-8 py-3 w-full text-left transition-colors border-l-2 group ${
                    isActive
                      ? "text-primary border-primary bg-primary/5"
                      : "text-on-surface-variant border-transparent hover:bg-surface-variant"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-4">
                      <span className={`font-mono text-xs transition-colors ${isActive ? "text-primary" : "text-on-surface-variant group-hover:text-on-surface"}`}>
                        {item.num}.
                      </span>
                      <span className="font-medium tracking-wide text-sm uppercase">{item.label}</span>
                    </div>
                    {badge !== null && (
                      <span className="font-mono text-[10px] bg-surface-variant px-2 py-0.5 text-on-surface">
                        {badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Init Transfer button */}
        <div className="p-6">
          <button
            onClick={() => navigate("/send")}
            className="w-full bg-primary text-white font-bold font-mono text-sm uppercase tracking-widest py-4 hover:bg-on-surface transition-colors flex items-center justify-center gap-2"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="stroke-current">
              <path d="M6 1V11M1 6H11" strokeWidth="2" />
            </svg>
            Init Transfer
          </button>
        </div>

        {/* System stats footer */}
        <div className="p-6 border-t border-outline font-mono text-[10px] text-on-surface-variant leading-relaxed">
          <div className="flex justify-between mb-1">
            <span>UPTIME</span>
            <span className="text-on-surface">—</span>
          </div>
          <div className="flex justify-between mb-1">
            <span>LATENCY</span>
            <span className="text-on-surface">{isConnected ? "12MS" : "—"}</span>
          </div>
          <div className="flex justify-between">
            <span>PROTOCOL</span>
            <span className="text-on-surface">KINETIC-P2P</span>
          </div>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface border-t border-outline z-40 flex items-center justify-around px-2">
        {navItems.map((item) => {
          const badge = getBadge(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 px-3 py-1 min-w-[48px] min-h-[48px] transition-colors ${
                  isActive ? "text-primary" : "text-on-surface-variant"
                }`
              }
            >
              <span className="font-mono text-[10px] font-bold relative">
                {item.num}
                {badge !== null && (
                  <span className="absolute -top-1 -right-3 text-[8px] font-bold bg-primary text-white w-3.5 h-3.5 flex items-center justify-center">
                    {badge}
                  </span>
                )}
              </span>
              <span className="text-[9px] font-bold uppercase tracking-tight">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </>
  );
}
