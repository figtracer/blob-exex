// Chain color mappings
export const CHAIN_COLORS = {
  base: "#0052ff",
  optimism: "#f38ba8",
  arbitrum: "#28a0f0",
  scroll: "#fab387",
  starknet: "#cba6f7",
  zksync: "#b4befe",
  linea: "#61dfff",
  taiko: "#e81899",
  blast: "#fcfc03",
  zora: "#5b5bd6",
  mode: "#dffe00",
  soneium: "#00d4ff",
  lighter: "#ffd700",
  unichain: "#ff007a",
  katana: "#ff6b35",
  codex: "#9d4edd",
  metal: "#8b8b8b",
  abstract: "#a855f7",
  world: "#10b981",
  ink: "#3b82f6",
  mantle: "#1a1a2e",
  cyber: "#00ff88",
  kroma: "#7c3aed",
  redstone: "#dc2626",
  fraxtal: "#818cf8",
  hemi: "#ff6b35",
  mint: "#4ade80",
  swell: "#00d4ff",
  zircuit: "#FFEE55",
  polynomial: "#6366f1",
  xlayer: "#000000",
  other: "#585b70",
};

// Chains that have icons available
export const CHAINS_WITH_ICONS = [
  "abstract",
  "arbitrum",
  "base",
  "codex",
  "hemi",
  "ink",
  "katana",
  "lighter",
  "linea",
  "metal",
  "mode",
  "optimism",
  "polynomial",
  "scroll",
  "soneium",
  "starknet",
  "swell",
  "unichain",
  "world",
  "xlayer",
  "zircuit",
  "zora",
];

export function getChainColor(chainName) {
  if (!chainName) return CHAIN_COLORS.other;
  const normalized = chainName.toLowerCase().replace(/\s+/g, "");
  for (const [key, color] of Object.entries(CHAIN_COLORS)) {
    if (normalized.includes(key)) {
      return color;
    }
  }
  return CHAIN_COLORS.other;
}

export function getChainIcon(chainName) {
  if (!chainName) return null;
  const normalized = chainName.toLowerCase().replace(/\s+/g, "");

  for (const chain of CHAINS_WITH_ICONS) {
    if (normalized.includes(chain)) {
      return `/icons/${chain}.png`;
    }
  }

  return null;
}

export function getChainDisplayName(chainName) {
  if (!chainName) return "Unknown";

  // Capitalize first letter of each word
  return chainName
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
