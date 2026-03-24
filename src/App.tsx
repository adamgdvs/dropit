import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { TransferProvider } from "./context/TransferContext";
import Layout from "./components/Layout";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const MyFiles = lazy(() => import("./pages/MyFiles"));
const Send = lazy(() => import("./pages/Send"));
const Received = lazy(() => import("./pages/Received"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <span className="material-symbols-outlined text-4xl text-primary animate-spin">sync</span>
    </div>
  );
}

export default function App() {
  return (
    <TransferProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Suspense fallback={<PageLoader />}><Dashboard /></Suspense>} />
          <Route path="/files" element={<Suspense fallback={<PageLoader />}><MyFiles /></Suspense>} />
          <Route path="/send" element={<Suspense fallback={<PageLoader />}><Send /></Suspense>} />
          <Route path="/received" element={<Suspense fallback={<PageLoader />}><Received /></Suspense>} />
        </Route>
      </Routes>
    </TransferProvider>
  );
}
