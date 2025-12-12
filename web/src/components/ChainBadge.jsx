import {
  getChainColor,
  getChainIcon,
  getChainDisplayName,
} from "../utils/chains";

function ChainBadge({ chainName, showIcon = true, size = "md" }) {
  const color = getChainColor(chainName);
  const icon = getChainIcon(chainName);
  const displayName = getChainDisplayName(chainName);

  const sizeClasses = {
    sm: "chain-badge-sm",
    md: "chain-badge-md",
    lg: "chain-badge-lg",
  };

  return (
    <>
      <span className={`chain-badge ${sizeClasses[size]}`}>
        {showIcon && icon && (
          <img src={icon} alt={displayName} className="chain-icon" />
        )}
        <span className="chain-name">{displayName}</span>
      </span>

      <style jsx>{`
        .chain-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.25rem 0.625rem;
          border-radius: 6px;
          font-weight: 500;
          white-space: nowrap;
          background: ${color}20;
          color: ${color};
          border: 1px solid ${color}40;
        }

        .chain-badge-sm {
          font-size: 0.7rem;
          padding: 0.2rem 0.5rem;
          gap: 0.25rem;
        }

        .chain-badge-md {
          font-size: 0.75rem;
        }

        .chain-badge-lg {
          font-size: 0.875rem;
          padding: 0.375rem 0.75rem;
          gap: 0.5rem;
        }

        .chain-icon {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          object-fit: cover;
        }

        .chain-badge-sm .chain-icon {
          width: 12px;
          height: 12px;
        }

        .chain-badge-lg .chain-icon {
          width: 16px;
          height: 16px;
        }

        .chain-name {
          line-height: 1;
        }
      `}</style>
    </>
  );
}

export default ChainBadge;
