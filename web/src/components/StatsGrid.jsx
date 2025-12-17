import { BLOB_TARGET, BLOB_MAX, BLOB_SIZE_BYTES } from "../utils/protocol";

function StatsGrid({ stats }) {
  if (!stats) {
    return (
      <div className="stats-grid">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="stat-card skeleton">
            <div className="skeleton-line"></div>
            <div className="skeleton-value"></div>
          </div>
        ))}
      </div>
    );
  }

  const formatNumber = (num) => {
    if (!num) return "0";
    return new Intl.NumberFormat("en-US").format(num);
  };

  const formatBytes = (bytes) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatGwei = (wei) => {
    if (!wei) return "0 Gwei";
    const gwei = parseFloat(wei) / 1e9;
    if (gwei < 0.001) return gwei.toFixed(6) + " Gwei";
    if (gwei < 1) return gwei.toFixed(4) + " Gwei";
    return gwei.toFixed(2) + " Gwei";
  };

  // Calculate utilization and saturation from avg blobs per block
  const avgBlobs = stats.avg_blobs_per_block ?? 0;
  const targetUtilization = (avgBlobs / BLOB_TARGET) * 100;
  const saturationIndex = (avgBlobs / BLOB_MAX) * 100;

  const statCards = [
    {
      title: "Total Blobs",
      value: formatNumber(stats.total_blobs),
      color: "cyan",
    },
    {
      title: "Total Blob Size",
      value: formatBytes(stats.total_blobs * BLOB_SIZE_BYTES),
      color: "blue",
    },
    {
      title: "Avg Blobs/Block",
      value: stats.avg_blobs_per_block?.toFixed(2) || "0",
      subtitle: `Target: ${BLOB_TARGET} | Max: ${BLOB_MAX}`,
      color: "purple",
    },
    {
      title: "Target Utilization",
      value: `${targetUtilization.toFixed(1)}%`,
      subtitle: `${avgBlobs.toFixed(1)} / ${BLOB_TARGET} blobs`,
      color: getUtilizationColorName(targetUtilization),
      hasBar: true,
      barValue: targetUtilization,
      barMax: 150,
      barMarker: 100, // 100% marker
    },
    {
      title: "Saturation Index",
      value: `${saturationIndex.toFixed(1)}%`,
      subtitle: `${avgBlobs.toFixed(1)} / ${BLOB_MAX} blobs`,
      color: getSaturationColorName(saturationIndex),
      hasBar: true,
      barValue: saturationIndex,
      barMax: 100,
    },
    {
      title: "Blob Gas Price",
      value: formatGwei(stats.latest_gas_price),
      color: "yellow",
    },
  ];

  return (
    <>
      <div className="stats-grid">
        {statCards.map((card, index) => (
          <div key={index} className="stat-card fade-in">
            <h3 className="stat-title">{card.title}</h3>
            <div
              className={`stat-value ${card.customColor ? "" : `stat-value-${card.color}`}`}
              style={card.customColor ? { color: card.customColor } : {}}
            >
              {card.value}
            </div>
            {card.subtitle && (
              <div className="stat-subtitle">{card.subtitle}</div>
            )}
            {card.hasBar && (
              <div className="stat-bar-container">
                <div className="stat-bar">
                  <div
                    className="stat-bar-fill"
                    style={{
                      width: `${Math.min((card.barValue / card.barMax) * 100, 100)}%`,
                      backgroundColor:
                        card.customColor || `var(--accent-${card.color})`,
                    }}
                  />
                  {card.barMarker && (
                    <div
                      className="stat-bar-marker"
                      style={{
                        left: `${(card.barMarker / card.barMax) * 100}%`,
                      }}
                      title="Target (100%)"
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <style jsx>{`
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          background: var(--bg-card);
          border: 1px solid var(--border-primary);
          border-radius: 12px;
          padding: 1.25rem;
          transition: all 0.2s;
        }

        .stat-card:hover {
          border-color: var(--border-secondary);
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
        }

        .stat-title {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-secondary);
          margin-bottom: 0.5rem;
        }

        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          line-height: 1.2;
        }

        .stat-subtitle {
          font-size: 0.625rem;
          color: var(--text-secondary);
          margin-top: 0.25rem;
        }

        .stat-bar-container {
          margin-top: 0.5rem;
        }

        .stat-bar {
          height: 6px;
          background: var(--border-primary);
          border-radius: 3px;
          position: relative;
          overflow: visible;
        }

        .stat-bar-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.3s ease;
        }

        .stat-bar-marker {
          position: absolute;
          top: -3px;
          bottom: -3px;
          width: 2px;
          background: var(--text-secondary);
          opacity: 0.6;
          transform: translateX(-50%);
        }

        .stat-value-cyan {
          color: var(--accent-cyan);
        }

        .stat-value-blue {
          color: var(--accent-blue);
        }

        .stat-value-purple {
          color: var(--accent-purple);
        }

        .stat-value-green {
          color: var(--accent-green);
        }

        .stat-value-yellow {
          color: var(--accent-yellow);
        }

        .stat-value-amber {
          color: #f59e0b;
        }

        .stat-value-orange {
          color: #f97316;
        }

        .stat-value-red {
          color: #ef4444;
        }

        .skeleton {
          animation: pulse 2s infinite;
        }

        .skeleton-line {
          height: 12px;
          background: var(--border-primary);
          border-radius: 4px;
          margin-bottom: 1rem;
          width: 60%;
        }

        .skeleton-value {
          height: 24px;
          background: var(--border-primary);
          border-radius: 4px;
          width: 80%;
        }

        @media (max-width: 768px) {
          .stats-grid {
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 0.75rem;
          }

          .stat-card {
            padding: 1rem;
          }

          .stat-value {
            font-size: 1.25rem;
          }
        }
      `}</style>
    </>
  );
}

// Helper to get color name for utilization
function getUtilizationColorName(utilization) {
  if (utilization <= 50) return "green";
  if (utilization <= 90) return "blue";
  if (utilization <= 120) return "amber";
  if (utilization <= 150) return "orange";
  return "red";
}

// Helper to get color name for saturation
function getSaturationColorName(saturation) {
  if (saturation <= 25) return "green";
  if (saturation <= 50) return "blue";
  if (saturation <= 75) return "amber";
  if (saturation <= 95) return "orange";
  return "red";
}

export default StatsGrid;
