/**
 * Device Identity
 *
 * Generates and persists a friendly device name per the PRD:
 *   "Device names are randomly generated on first launch (e.g., 'Orange Falcon')
 *    and stored locally. Users can change them."
 *
 * Also persists a stable device ID across sessions so peers can
 * recognize returning devices.
 */

const STORAGE_KEY_NAME = "dropit:device-name";
const STORAGE_KEY_ID = "dropit:device-id";

const ADJECTIVES = [
  "Amber", "Azure", "Blaze", "Bright", "Bronze", "Carbon", "Cedar",
  "Cobalt", "Coral", "Crimson", "Crystal", "Cyber", "Dark", "Dawn",
  "Delta", "Drift", "Dusk", "Echo", "Electric", "Ember", "Fern",
  "Fire", "Flash", "Frost", "Ghost", "Gold", "Grey", "Haze",
  "Indigo", "Iron", "Ivory", "Jade", "Jet", "Lunar", "Maple",
  "Marble", "Mist", "Neon", "Night", "Nova", "Olive", "Onyx",
  "Opal", "Orange", "Orchid", "Pearl", "Pine", "Prism", "Pulse",
  "Quartz", "Raven", "Red", "Rust", "Sage", "Sand", "Shadow",
  "Silk", "Silver", "Slate", "Solar", "Steel", "Stone", "Storm",
  "Swift", "Teal", "Thunder", "Titan", "Turbo", "Violet", "Volt",
  "Wild", "Zinc",
];

const NOUNS = [
  "Arrow", "Atlas", "Axle", "Bear", "Beacon", "Bolt", "Comet",
  "Condor", "Crane", "Crow", "Dart", "Drake", "Eagle", "Falcon",
  "Fang", "Finch", "Flare", "Fox", "Frost", "Glyph", "Gryphon",
  "Hare", "Hawk", "Helix", "Heron", "Hornet", "Husky", "Jackal",
  "Kite", "Kodiak", "Lance", "Lark", "Leopard", "Lion", "Lotus",
  "Lynx", "Mantis", "Merlin", "Moth", "Nexus", "Orca", "Osprey",
  "Otter", "Owl", "Panther", "Pebble", "Phoenix", "Pike", "Prowl",
  "Pulse", "Raptor", "Raven", "Ridge", "Robin", "Rover", "Sable",
  "Scout", "Shark", "Sparrow", "Spike", "Stallion", "Swift", "Talon",
  "Tiger", "Viper", "Wolf", "Wren", "Zenith",
];

function generateName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adj} ${noun}`;
}

function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Get or create the device name. Persists in localStorage.
 */
export function getDeviceName(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_NAME);
    if (stored) return stored;
  } catch {
    // localStorage unavailable (incognito, etc.)
  }

  const name = generateName();
  try {
    localStorage.setItem(STORAGE_KEY_NAME, name);
  } catch {
    // Best-effort persist
  }
  return name;
}

/**
 * Set a custom device name. Returns the new name.
 */
export function setDeviceName(name: string): string {
  const trimmed = name.trim().slice(0, 32) || generateName();
  try {
    localStorage.setItem(STORAGE_KEY_NAME, trimmed);
  } catch { /* ignore */ }
  return trimmed;
}

/**
 * Get or create a stable device ID. Persists in localStorage.
 */
export function getDeviceId(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_ID);
    if (stored) return stored;
  } catch { /* ignore */ }

  const id = generateId();
  try {
    localStorage.setItem(STORAGE_KEY_ID, id);
  } catch { /* ignore */ }
  return id;
}
