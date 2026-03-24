/**
 * File Service
 *
 * Handles file chunking, reassembly, hashing, and download triggering.
 * All operations are browser-native — no dependencies.
 */

export const CHUNK_SIZE = 64 * 1024; // 64KB per PRD spec

/**
 * Read a file as an async generator of ArrayBuffer chunks.
 */
export async function* readFileAsChunks(
  file: File,
  chunkSize: number = CHUNK_SIZE
): AsyncGenerator<{ chunk: ArrayBuffer; index: number; total: number }> {
  const total = Math.ceil(file.size / chunkSize);
  let offset = 0;
  let index = 0;

  while (offset < file.size) {
    const slice = file.slice(offset, offset + chunkSize);
    const chunk = await slice.arrayBuffer();
    yield { chunk, index, total };
    offset += chunkSize;
    index++;
  }
}

/**
 * Reassemble an ordered array of ArrayBuffer chunks into a Blob.
 */
export function reassembleChunks(chunks: ArrayBuffer[], mimeType: string = ""): Blob {
  return new Blob(chunks, { type: mimeType });
}

/**
 * Compute SHA-256 hash of a Blob, returned as a hex string.
 */
export async function hashBlob(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Trigger a browser download for a Blob.
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke after a short delay to ensure download starts
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Format bytes into a human-readable string.
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[i]}`;
}
