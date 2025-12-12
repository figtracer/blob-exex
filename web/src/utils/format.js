// Format large numbers with commas
export function formatNumber(num) {
  if (num === null || num === undefined) return "0";
  return new Intl.NumberFormat("en-US").format(num);
}

// Format bytes to human readable format
export function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// Format Wei to Gwei
export function formatGwei(wei) {
  if (!wei) return "0 Gwei";
  const gwei = parseFloat(wei) / 1e9;
  if (gwei < 0.01) {
    return "<0.01 Gwei";
  } else if (gwei < 1) {
    return gwei.toFixed(3) + " Gwei";
  } else if (gwei < 100) {
    return gwei.toFixed(2) + " Gwei";
  } else {
    return gwei.toFixed(0) + " Gwei";
  }
}

// Format timestamp to relative time
export function formatTimeAgo(timestamp) {
  const now = Date.now();
  const diff = Math.floor((now - timestamp) / 1000);

  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// Format timestamp to readable date
export function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// Truncate hash for display
export function truncateHash(hash, startChars = 6, endChars = 4) {
  if (!hash) return "";
  if (hash.length <= startChars + endChars) return hash;
  return `${hash.slice(0, startChars)}...${hash.slice(-endChars)}`;
}

// Truncate address for display
export function truncateAddress(address, startChars = 6, endChars = 4) {
  if (!address) return "";
  if (address.length <= startChars + endChars) return address;
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}
