import {
  getChainColor,
  getChainIcon,
  getChainDisplayName,
} from "../utils/chains";

function ChainBadge({ chainName, showIcon = true, size = "md" }) {
  const color = getChainColor(chainName);
  const icon = getChainIcon(chainName);
  const displayName = getChainDisplayName(chainName);

  const sizeStyles = {
    sm: {
      fontSize: "0.7rem",
      padding: "0.2rem 0.5rem",
      gap: "0.25rem",
    },
    md: {
      fontSize: "0.75rem",
      padding: "0.25rem 0.625rem",
      gap: "0.375rem",
    },
    lg: {
      fontSize: "0.875rem",
      padding: "0.375rem 0.75rem",
      gap: "0.5rem",
    },
  };

  const iconSizes = {
    sm: { width: "12px", height: "12px" },
    md: { width: "14px", height: "14px" },
    lg: { width: "16px", height: "16px" },
  };

  const badgeStyle = {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: "6px",
    fontWeight: 500,
    whiteSpace: "nowrap",
    background: `${color}20`,
    color: color,
    border: `1px solid ${color}40`,
    ...sizeStyles[size],
  };

  const iconStyle = {
    borderRadius: "50%",
    objectFit: "cover",
    ...iconSizes[size],
  };

  return (
    <span style={badgeStyle}>
      {showIcon && icon && (
        <img src={icon} alt={displayName} style={iconStyle} />
      )}
      <span style={{ lineHeight: 1 }}>{displayName}</span>
    </span>
  );
}

export default ChainBadge;
