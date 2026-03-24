import type { Device } from "../data/mock";

interface DeviceCardProps {
  device: Device;
  variant?: "grid" | "list";
}

export default function DeviceCard({ device, variant = "list" }: DeviceCardProps) {
  const isOffline = device.status === "offline";

  if (variant === "grid") {
    return (
      <div
        className={`bg-surface border-2 border-on-surface p-6 cursor-pointer hover:bg-primary hover:text-white transition-colors group ${
          isOffline ? "opacity-40" : ""
        }`}
      >
        <div className="w-10 h-10 border-2 border-on-surface bg-surface-variant group-hover:bg-white flex items-center justify-center mb-4 transition-colors">
          <span className="material-symbols-outlined text-primary">{device.icon}</span>
        </div>
        <p className="font-black text-sm uppercase tracking-tight">{device.name}</p>
        <p className="text-[10px] opacity-70 uppercase font-bold">{device.connection}</p>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-3 p-2 border border-outline hover:border-primary transition-colors ${
        isOffline ? "opacity-40" : ""
      }`}
    >
      <div className="w-10 h-10 bg-surface-variant flex items-center justify-center text-primary">
        <span className="material-symbols-outlined">{device.icon}</span>
      </div>
      <div className="flex-1">
        <p className="text-sm font-bold uppercase tracking-tight">{device.name}</p>
        <p className={`text-[10px] font-bold uppercase ${isOffline ? "" : "text-primary"}`}>
          {device.status === "active" ? "Active" : device.status === "connecting" ? "Connecting" : "Offline"}
        </p>
      </div>
    </div>
  );
}
