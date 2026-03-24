import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import ConnectionBar from "./ConnectionBar";
import TransferToast from "./TransferToast";
import { useTransferContext } from "../context/TransferContext";
import { useTransferStore } from "../stores/transferStore";

export default function Layout() {
  const { pendingOffer, respondToOffer } = useTransferContext();
  const history = useTransferStore((s) => s.history);
  const [liveMessage, setLiveMessage] = useState("");

  useEffect(() => {
    if (history.length === 0) return;
    const latest = history[0];
    if (latest.status === "complete") {
      setLiveMessage(`Transfer complete: ${latest.fileName}`);
    } else if (latest.status === "failed") {
      setLiveMessage(`Transfer failed: ${latest.fileName}. ${latest.errorMessage || ""}`);
    } else if (latest.status === "rejected") {
      setLiveMessage(`Transfer declined: ${latest.fileName}`);
    }
  }, [history]);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Scanline effect */}
      <div className="scanline-effect" />

      <Sidebar />
      <main className="md:ml-72 min-h-screen pb-20 md:pb-0 relative">
        <TopBar />
        <ConnectionBar />
        <Outlet />
      </main>

      {pendingOffer && (
        <TransferToast
          offer={pendingOffer.offer}
          onDecide={respondToOffer}
        />
      )}

      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {liveMessage}
      </div>
    </div>
  );
}
