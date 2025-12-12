import { TrendingUp, Database, BarChart3, Box, Fuel } from "lucide-react";

function StatsGrid({ stats }) {
  if (!stats) {
    return (
      <div className="stats-grid">
        {[...Array(5)].map((_, i) => (
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
    if (gwei < 0.01) {
      return "<0.01 Gwei";
    } else if (gwei < 1) {
      return gwei.toFixed(3) + " Gwei";
    } else if (gwei < 100) {
      return gwei.toFixed(2) + " Gwei";
    } else {
      return gwei.toFixed(0) + " Gwei";
    }
  };

  const statCards = [
    {
      title: "Total Blobs",
      value: formatNumber(stats.total_blobs),
      icon: Box,
      color: "cyan",
    },
    {
      title: "Total Blob Size",
      value: formatBytes(stats.total_blob_size),
      icon: Database,
      color: "blue",
    },
    {
      title: "Avg Blobs/Block",
      value: stats.avg_blobs_per_block?.toFixed(2) || "0",
      icon: BarChart3,
      color: "purple",
    },
    {
      title: "Latest Block",
      value: formatNumber(stats.latest_block),
      icon: TrendingUp,
      color: "green",
    },
    {
      title: "Blob Gas Price",
      value: formatGwei(stats.avg_gas_price),
      icon: Fuel,
      color: "yellow",
    },
  ];

  return (
    <>
      <div className="stats-grid">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} className="stat-card fade-in">
              <div className="stat-header">
                <h3 className="stat-title">{card.title}</h3>
                <div className={`stat-icon stat-icon-${card.color}`}>
                  <Icon size={18} />
                </div>
              </div>
              <div className={`stat-value stat-value-${card.color}`}>
                {card.value}
              </div>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
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

        .stat-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 0.75rem;
        }

        .stat-title {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-secondary);
        }

        .stat-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          opacity: 0.8;
        }

        .stat-icon-cyan {
          background: rgba(34, 211, 238, 0.1);
          color: var(--accent-cyan);
        }

        .stat-icon-blue {
          background: rgba(96, 165, 250, 0.1);
          color: var(--accent-blue);
        }

        .stat-icon-purple {
          background: rgba(167, 139, 250, 0.1);
          color: var(--accent-purple);
        }

        .stat-icon-green {
          background: rgba(52, 211, 153, 0.1);
          color: var(--accent-green);
        }

        .stat-icon-yellow {
          background: rgba(251, 191, 36, 0.1);
          color: var(--accent-yellow);
        }

        .stat-value {
          font-size: 1.75rem;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          line-height: 1;
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
          height: 28px;
          background: var(--border-primary);
          border-radius: 4px;
          width: 80%;
        }

        @media (max-width: 768px) {
          .stats-grid {
            grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
            gap: 0.75rem;
          }

          .stat-card {
            padding: 1rem;
          }

          .stat-value {
            font-size: 1.5rem;
          }

          .stat-icon {
            width: 28px;
            height: 28px;
          }
        }
      `}</style>
    </>
  );
}

export default StatsGrid;
