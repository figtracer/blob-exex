import { useMemo } from "react";
import { getChainIcon, getChainColor } from "../utils/chains";

function ChainProfiles({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="chain-profiles">
        <div className="profiles-header">
          <h2 className="section-title">Chain Behavior Profiles</h2>
        </div>
        <div className="profiles-card skeleton">
          <div className="skeleton-content"></div>
        </div>
        <style jsx>{`
          .chain-profiles {
            margin-bottom: 2rem;
          }
          .profiles-header {
            margin-bottom: 1rem;
          }
          .section-title {
            font-size: 1rem;
            font-weight: 600;
            color: var(--text-primary);
            margin: 0;
          }
          .profiles-card {
            background: var(--bg-card);
            border: 1px solid var(--border-primary);
            border-radius: 12px;
            padding: 1.25rem;
          }
          .skeleton {
            animation: pulse 2s infinite;
            min-height: 300px;
          }
          .skeleton-content {
            height: 260px;
            background: var(--border-primary);
            border-radius: 8px;
          }
          @keyframes pulse {
            0%,
            100% {
              opacity: 1;
            }
            50% {
              opacity: 0.5;
            }
          }
        `}</style>
      </div>
    );
  }

  // Filter to top chains with meaningful data, excluding "Other"
  const topChains = useMemo(() => {
    return data
      .filter(
        (chain) =>
          chain.total_transactions > 0 && chain.chain.toLowerCase() !== "other",
      )
      .slice(0, 12);
  }, [data]);

  return (
    <>
      <div className="chain-profiles">
        <div className="profiles-header"></div>
        <div className="profiles-grid">
          {topChains.map((chain) => (
            <ChainProfileCard key={chain.chain} profile={chain} />
          ))}
        </div>
      </div>

      <style jsx>{`
        .chain-profiles {
          margin-bottom: 2rem;
        }

        .profiles-header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 1rem;
        }

        .section-title {
          font-size: 1rem;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
        }

        .subtitle {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .profiles-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1rem;
        }

        @media (max-width: 768px) {
          .profiles-header {
            flex-direction: column;
            gap: 0.25rem;
          }

          .profiles-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}

function ChainProfileCard({ profile }) {
  const {
    chain,
    total_transactions,
    total_blobs,
    avg_blobs_per_tx,
    avg_posting_interval_secs,
    hourly_activity,
  } = profile;

  const chainIcon = getChainIcon(chain);
  const chainColor = getChainColor(chain);

  // Format posting interval
  const formatInterval = (secs) => {
    if (!secs || secs === 0) return "N/A";
    if (secs < 60) return `${secs.toFixed(0)}s`;
    if (secs < 3600) return `${(secs / 60).toFixed(1)}m`;
    return `${(secs / 3600).toFixed(1)}h`;
  };

  return (
    <div className="profile-card">
      <div className="card-header">
        <div className="chain-info">
          {chainIcon ? (
            <img src={chainIcon} alt={chain} className="chain-icon" />
          ) : (
            <div
              className="chain-icon-placeholder"
              style={{ backgroundColor: chainColor }}
            >
              {chain.charAt(0)}
            </div>
          )}
          <span className="chain-name" style={{ color: chainColor }}>
            {chain}
          </span>
        </div>
        <div className="stats-summary">
          <span className="stat-pill">
            {total_transactions.toLocaleString()} txs
          </span>
          <span className="stat-pill">
            {total_blobs.toLocaleString()} blobs
          </span>
        </div>
      </div>

      <div className="metrics-row">
        <div className="metric">
          <span className="metric-label">Batch Size</span>
          <span className="metric-value">
            {avg_blobs_per_tx.toFixed(2)} blobs/tx
          </span>
        </div>

        <div className="metric">
          <span className="metric-label">Post Frequency</span>
          <span className="metric-value">
            {formatInterval(avg_posting_interval_secs)}
          </span>
        </div>
      </div>

      {/* Hourly activity heatmap */}
      <div className="activity-section">
        <span className="metric-label">Hourly Activity (UTC)</span>
        <HourlyActivityBar activity={hourly_activity} chainColor={chainColor} />
      </div>

      <style jsx>{`
        .profile-card {
          background: var(--bg-card);
          border: 1px solid var(--border-primary);
          border-radius: 12px;
          padding: 1.25rem;
          transition: all 0.2s;
        }

        .profile-card:hover {
          border-color: var(--border-secondary);
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid var(--border-primary);
        }

        .chain-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .chain-icon {
          width: 24px;
          height: 24px;
          border-radius: 50%;
        }

        .chain-icon-placeholder {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 600;
          color: white;
        }

        .chain-name {
          font-size: 0.875rem;
          font-weight: 600;
        }

        .stats-summary {
          display: flex;
          gap: 0.5rem;
        }

        .stat-pill {
          font-size: 0.625rem;
          font-weight: 500;
          color: var(--text-secondary);
          background: var(--bg-secondary);
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
        }

        .metrics-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin-bottom: 0.75rem;
        }

        .metric {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          margin-bottom: 0.5rem;
        }

        .metric-label {
          font-size: 0.625rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-secondary);
        }

        .metric-value-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .metric-value {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-primary);
          font-variant-numeric: tabular-nums;
        }

        .rating-badge {
          font-size: 0.625rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .sensitivity-row {
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
        }

        .sensitivity-desc {
          font-size: 0.625rem;
          color: var(--text-secondary);
        }

        .activity-section {
          margin-top: 0.75rem;
          padding-top: 0.75rem;
          border-top: 1px solid var(--border-primary);
        }
      `}</style>
    </div>
  );
}

function HourlyActivityBar({ activity, chainColor }) {
  // activity is an array of 24 values (0-1 normalized)
  if (!activity || activity.length !== 24) {
    return (
      <div className="activity-bar empty">
        <span className="no-data">No activity data</span>
        <style jsx>{`
          .activity-bar.empty {
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .no-data {
            font-size: 0.625rem;
            color: var(--text-secondary);
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="activity-container">
      <div className="activity-bar">
        {activity.map((value, hour) => (
          <div
            key={hour}
            className="hour-cell"
            style={{
              backgroundColor: chainColor,
              opacity: Math.max(0.1, value),
            }}
            title={`${hour}:00 UTC: ${(value * 100).toFixed(0)}% activity`}
          />
        ))}
      </div>
      <div className="hour-labels">
        <span>0</span>
        <span>6</span>
        <span>12</span>
        <span>18</span>
        <span>23</span>
      </div>
      <style jsx>{`
        .activity-container {
          margin-top: 0.5rem;
        }

        .activity-bar {
          display: flex;
          gap: 2px;
          height: 20px;
          border-radius: 4px;
          overflow: hidden;
        }

        .hour-cell {
          flex: 1;
        }

        .hour-labels {
          display: flex;
          justify-content: space-between;
          margin-top: 0.25rem;
          font-size: 0.5rem;
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
}

export default ChainProfiles;
