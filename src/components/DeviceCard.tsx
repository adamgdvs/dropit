interface Device {
  id: string;
  name: string;
  deviceType: "desktop" | "laptop" | "mobile" | "tablet" | "phone";
  connectionState?: "connected" | "disconnected" | "connecting";
  [key: string]: any;
}

interface DeviceCardProps {
  device: Device;
  onClick?: () => void;
}

export default function DeviceCard({ device, onClick }: DeviceCardProps) {
  const isConnected = device.connectionState === "connected";
  const isConnecting = device.connectionState === "connecting";

  const getIcon = () => {
    switch (device.deviceType) {
      case "phone":
      case "mobile":
        return "smartphone";
      case "tablet":
        return "tablet_mac";
      default:
        return "laptop_mac";
    }
  };

  return (
    <div
      onClick={onClick}
      className={`group p-4 bg-surface-container-lowest border-l-2 transition-all duration-300 cursor-pointer
        ${isConnected ? "border-primary hover:bg-surface-container" : isConnecting ? "border-yellow-500" : "border-transparent opacity-60 hover:border-gray-500"}
      `}
    >
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-surface-container-highest flex items-center justify-center text-secondary relative">
          <span className={`material-symbols-outlined ${isConnected ? "text-primary" : ""}`}>{getIcon()}</span>
          {isConnected && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full animate-pulse shadow-[0_0_8px_rgba(255,81,58,0.6)]"></span>
          )}
        </div>
        <div className="flex-1 overflow-hidden">
          <p className="text-sm font-bold font-headline uppercase truncate">{device.name}</p>
          <p className="text-[10px] text-secondary/50 font-mono truncate">
            {isConnected ? "SECURE TUNNEL • ACTIVE" : isConnecting ? "NEGOTIATING..." : "NO SIGNAL"}
          </p>
        </div>
        <button className={`${isConnected ? "text-primary" : "text-gray-500"} opacity-0 group-hover:opacity-100 transition-opacity`}>
          <span className="material-symbols-outlined">sync</span>
        </button>
      </div>
    </div>
  );
}
