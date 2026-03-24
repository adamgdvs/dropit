export interface Device {
  id: string;
  name: string;
  type: "laptop" | "phone" | "desktop" | "tablet";
  icon: string;
  status: "active" | "offline" | "connecting";
  connection: string;
}

export interface FileItem {
  id: string;
  name: string;
  size: string;
  type: string;
  icon: string;
  from?: string;
  time: string;
}

export interface Transfer {
  id: string;
  fileName: string;
  fileIcon: string;
  target: string;
  size: string;
  progress: number;
  speed?: string;
  eta?: string;
  status: "connecting" | "streaming" | "complete" | "failed";
}

export interface Folder {
  id: string;
  name: string;
  fileCount: number;
  size: string;
}

export const devices: Device[] = [
  { id: "1", name: "Studio Mac", type: "laptop", icon: "laptop_mac", status: "active", connection: "Local Network" },
  { id: "2", name: "iPhone 15", type: "phone", icon: "smartphone", status: "active", connection: "Bluetooth" },
  { id: "3", name: "Home Terminal", type: "desktop", icon: "desktop_windows", status: "offline", connection: "Offline" },
];

export const recentTargets = [
  { id: "t1", initials: "EV", name: "Elena Vance", device: "Archive Station 01" },
  { id: "t2", initials: "MT", name: "Marcus Thorne", device: "Partner Link" },
];

export const recentFiles: FileItem[] = [
  { id: "f1", name: "Mountain_Series_04.raw", size: "24.5 MB", type: "image", icon: "image", time: "2m ago" },
  { id: "f2", name: "Annual_Report.pdf", size: "1.2 MB", type: "document", icon: "description", time: "15m ago" },
  { id: "f3", name: "Product_B-Roll.mp4", size: "156 MB", type: "video", icon: "videocam", time: "1h ago" },
  { id: "f4", name: "Project_Terra_V2.fig", size: "8.4 MB", type: "design", icon: "token", time: "4h ago" },
];

export const receivedFiles: FileItem[] = [
  { id: "r1", name: "Tuscan_Sunrise_04.jpg", size: "12 MB", type: "image", icon: "image", from: "Julian Drake", time: "2h ago" },
  { id: "r2", name: "Project_Manifesto_v2.pdf", size: "3.4 MB", type: "document", icon: "picture_as_pdf", from: "Elena Moretti", time: "5h ago" },
  { id: "r3", name: "Terra_UI_Kit_Final.fig", size: "18 MB", type: "design", icon: "token", from: "Soren Olsen", time: "1d ago" },
  { id: "r4", name: "Brand_Assets.zip", size: "45 MB", type: "archive", icon: "folder_zip", from: "Maya Kaur", time: "2d ago" },
];

export const activeTransfers: Transfer[] = [
  { id: "x1", fileName: "manifesto_v2.pdf", fileIcon: "description", target: "Studio Mac", size: "14.2 MB", progress: 10, status: "connecting" },
  { id: "x2", fileName: "archive_scans.zip", fileIcon: "archive", target: "Elena Vance", size: "245.8 MB", progress: 45, speed: "12.4 MB/s", eta: "42s", status: "streaming" },
  { id: "x3", fileName: "report_final.xlsx", fileIcon: "check", target: "Marcus Thorne", size: "2.1 MB", progress: 100, status: "complete" },
];

export const transferHistory = [
  { id: "h1", title: "Bulk Transfer: Alpine Retreat", detail: "12 Files • Today, 2:45 PM • Source: Julian Drake", icon: "cloud_download" },
  { id: "h2", title: "Update: Brand Redesign", detail: "1 File • Today, 10:12 AM • Source: Elena Moretti", icon: "edit_note" },
];

export const folders: Folder[] = [
  { id: "d1", name: "Assets & Branding", fileCount: 24, size: "1.2 GB" },
  { id: "d2", name: "Research Docs", fileCount: 12, size: "450 MB" },
];

export const myFiles: FileItem[] = [
  { id: "m1", name: "Project_Brief_Final.pdf", size: "1.8 MB", type: "document", icon: "description", time: "" },
  { id: "m2", name: "Budget_Forecast.xlsx", size: "840 KB", type: "spreadsheet", icon: "table_chart", time: "" },
];

export const storageStats = {
  used: 850,
  total: 1000,
  breakdown: [
    { label: "Media", size: "420 GB" },
    { label: "Archives", size: "310 GB" },
    { label: "Systems", size: "120 GB" },
  ],
};
