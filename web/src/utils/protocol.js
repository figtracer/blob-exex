// Protocol constants for blob parameters
// Update these values when BPO2 or future forks activate

// BPO1 (current) blob parameters
export const BLOB_TARGET = 10;
export const BLOB_MAX = 15;

// Each blob is 128KB (131072 bytes) per EIP-4844
export const BLOB_SIZE_BYTES = 131072;

// Gas per blob (EIP-4844)
export const DATA_GAS_PER_BLOB = 131072;

// Get utilization color based on percentage
export function getUtilizationColor(utilization) {
  if (utilization <= 50) return "#22c55e"; // green
  if (utilization <= 90) return "#3b82f6"; // blue
  if (utilization <= 120) return "#f59e0b"; // amber
  if (utilization < 150) return "#f97316"; // orange
  return "#ef4444"; // red (at max: 150% = 15 blobs)
}

// Get saturation color based on percentage
export function getSaturationColor(saturation) {
  if (saturation <= 33) return "#22c55e"; // green (0-5 blobs)
  if (saturation <= 66) return "#f59e0b"; // amber (5-10 blobs)
  if (saturation < 100) return "#f97316"; // orange (10-14 blobs)
  return "#ef4444"; // red (at max: 100% = 15 blobs)
}
