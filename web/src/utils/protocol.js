// Protocol constants for blob parameters
// Update these values when BPO2 or future forks activate

// BPO1 (current) blob parameters
export const BLOB_TARGET = 10;
export const BLOB_MAX = 15;

// Each blob is 128KB (131072 bytes) per EIP-4844
export const BLOB_SIZE_BYTES = 131072;

// Gas per blob (EIP-4844)
export const DATA_GAS_PER_BLOB = 131072;

// Unified color scheme: Blue to Indigo gradient
// Used for percentage-based indicators (0% = light blue, 100% = dark indigo)
const COLOR_GRADIENT = {
  lightBlue: "#60a5fa", // 0-50% - light blue
  blue: "#3b82f6", // 50-90% - blue
  indigo: "#4f46e5", // 90-100% AND 100%+ - dark indigo (ALWAYS max color)
};

// Base blue color for non-percentage values
export const BASE_BLUE = "#3b82f6";

// Get color based on percentage (0-100+)
// Returns a color from the blue-to-indigo gradient
// 100% and above ALWAYS get indigo (the max color)
export function getPercentageColor(percentage) {
  if (percentage < 50) return COLOR_GRADIENT.lightBlue;
  if (percentage < 90) return COLOR_GRADIENT.blue;
  return COLOR_GRADIENT.indigo; // 90-100% and 100%+ all get indigo
}

// Get utilization color based on percentage (target-based, can exceed 100%)
// Uses blue-to-indigo gradient where indigo indicates at or exceeding target
export function getUtilizationColor(utilization) {
  if (utilization < 50) return COLOR_GRADIENT.lightBlue;
  if (utilization < 90) return COLOR_GRADIENT.blue;
  return COLOR_GRADIENT.indigo; // 90%+ all get the same indigo
}

// Get saturation color based on percentage (max-based, 0-100%)
// Uses blue-to-indigo gradient where indigo indicates at or near max capacity
export function getSaturationColor(saturation) {
  if (saturation < 50) return COLOR_GRADIENT.lightBlue;
  if (saturation < 90) return COLOR_GRADIENT.blue;
  return COLOR_GRADIENT.indigo; // 90-100% all get indigo
}

// Get color name for CSS class usage (returns color name string)
export function getPercentageColorName(percentage) {
  if (percentage < 50) return "lightBlue";
  if (percentage < 90) return "blue";
  return "indigo";
}

// Get utilization color name for CSS class usage
export function getUtilizationColorName(utilization) {
  if (utilization < 50) return "lightBlue";
  if (utilization < 90) return "blue";
  return "indigo";
}

// Get saturation color name for CSS class usage
export function getSaturationColorName(saturation) {
  if (saturation < 50) return "lightBlue";
  if (saturation < 90) return "blue";
  return "indigo";
}

// Export gradient colors for direct use
export const GRADIENT_COLORS = COLOR_GRADIENT;
