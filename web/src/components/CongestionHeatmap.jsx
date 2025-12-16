import { useMemo } from "react";
import { getUtilizationColor } from "../utils/protocol";

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function CongestionHeatmap({ data }) {
  if (!data || !data.data || data.data.length === 0) {
    return (
      <div className="congestion-heatmap">
        <div className="heatmap-header">
          <h2 className="section-title">Congestion Heatmap</h2>
        </div>
        <div className="heatmap-card skeleton">
          <div className="skeleton-content"></div>
        </div>
        <style jsx>{`
          .congestion-heatmap {
            margin-bottom: 2rem;
          }
          .heatmap-header {
            margin-bottom: 1rem;
          }
          .section-title {
            font-size: 1rem;
            font-weight: 600;
            color: var(--text-primary);
            margin: 0;
          }
          .heatmap-card {
            background: var(--bg-card);
            border: 1px solid var(--border-primary);
            border-radius: 12px;
            padding: 1.25rem;
          }
          .skeleton {
            animation: pulse 2s infinite;
            min-height: 250px;
          }
          .skeleton-content {
            height: 210px;
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

  const { data: heatmapData, blob_target, blob_max } = data;

  // Organize data into a 2D grid (day x hour)
  const grid = useMemo(() => {
    const result = {};
    heatmapData.forEach((cell) => {
      const key = `${cell.day_of_week}-${cell.hour}`;
      result[key] = cell;
    });
    return result;
  }, [heatmapData]);

  // Calculate min/max for color scaling
  const stats = useMemo(() => {
    const utilizations = heatmapData
      .filter((c) => c.block_count > 0)
      .map((c) => c.avg_utilization);

    if (utilizations.length === 0) {
      return { min: 0, max: 100, avg: 50 };
    }

    return {
      min: Math.min(...utilizations),
      max: Math.max(...utilizations),
      avg: utilizations.reduce((a, b) => a + b, 0) / utilizations.length,
    };
  }, [heatmapData]);

  return (
    <>
      <div className="congestion-heatmap">
        <div className="heatmap-header">
          <div className="header-left">
            <h2 className="section-title">Congestion Heatmap</h2>
            <span className="subtitle">
              Avg utilization by hour & day (UTC) • Last 7 days
            </span>
          </div>
          <div className="header-right"></div>
        </div>

        <div className="heatmap-card">
          {/* Stats summary */}
          <div className="stats-row">
            <div className="stat">
              <span className="stat-label">Peak Utilization</span>
              <span
                className="stat-value"
                style={{ color: getUtilizationColor(stats.max) }}
              >
                {stats.max.toFixed(1)}%
              </span>
            </div>
            <div className="stat">
              <span className="stat-label">Average</span>
              <span
                className="stat-value"
                style={{ color: getUtilizationColor(stats.avg) }}
              >
                {stats.avg.toFixed(1)}%
              </span>
            </div>
            <div className="stat">
              <span className="stat-label">Minimum</span>
              <span
                className="stat-value"
                style={{ color: getUtilizationColor(stats.min) }}
              >
                {stats.min.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Heatmap grid */}
          <div className="heatmap-container">
            {/* Hour labels (top) */}
            <div className="hour-labels">
              <div className="day-label-spacer"></div>
              {HOURS.filter((_, i) => i % 3 === 0).map((hour) => (
                <span key={hour} className="hour-label">
                  {hour.toString().padStart(2, "0")}
                </span>
              ))}
            </div>

            {/* Grid rows (one per day) */}
            <div className="grid-rows">
              {DAYS_OF_WEEK.map((day, dayIndex) => (
                <div key={day} className="grid-row">
                  <span className="day-label">{day}</span>
                  <div className="cells-row">
                    {HOURS.map((hour) => {
                      const cell = grid[`${dayIndex}-${hour}`];
                      return (
                        <HeatmapCell
                          key={`${dayIndex}-${hour}`}
                          cell={cell}
                          day={day}
                          hour={hour}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="legend">
            <span className="legend-label">Low</span>
            <div className="legend-gradient">
              <div className="gradient-bar"></div>
            </div>
            <span className="legend-label">High</span>
            <div className="legend-thresholds">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
              <span>150%+</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .congestion-heatmap {
          margin-bottom: 2rem;
        }

        .heatmap-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1rem;
        }

        .header-left {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
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

        .protocol-badge {
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--text-secondary);
          background: var(--bg-secondary);
          padding: 0.25rem 0.75rem;
          border-radius: 4px;
          border: 1px solid var(--border-primary);
        }

        .heatmap-card {
          background: var(--bg-card);
          border: 1px solid var(--border-primary);
          border-radius: 12px;
          padding: 1.25rem;
          transition: all 0.2s;
        }

        .heatmap-card:hover {
          border-color: var(--border-secondary);
        }

        .stats-row {
          display: flex;
          gap: 2rem;
          margin-bottom: 1.25rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--border-primary);
        }

        .stat {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .stat-label {
          font-size: 0.625rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-secondary);
        }

        .stat-value {
          font-size: 1.25rem;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
        }

        .heatmap-container {
          overflow-x: auto;
        }

        .hour-labels {
          display: flex;
          margin-bottom: 0.25rem;
        }

        .day-label-spacer {
          width: 40px;
          flex-shrink: 0;
        }

        .hour-label {
          font-size: 0.5rem;
          color: var(--text-secondary);
          flex: 3;
          text-align: center;
        }

        .grid-rows {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .grid-row {
          display: flex;
          align-items: center;
        }

        .day-label {
          width: 40px;
          flex-shrink: 0;
          font-size: 0.625rem;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .cells-row {
          display: flex;
          gap: 2px;
          flex: 1;
        }

        .legend {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border-primary);
        }

        .legend-label {
          font-size: 0.625rem;
          color: var(--text-secondary);
        }

        .legend-gradient {
          flex: 1;
          max-width: 200px;
        }

        .gradient-bar {
          height: 8px;
          border-radius: 4px;
          background: linear-gradient(
            to right,
            #22c55e 0%,
            #3b82f6 33%,
            #f59e0b 50%,
            #f97316 66%,
            #ef4444 100%
          );
        }

        .legend-thresholds {
          display: flex;
          gap: 1rem;
          margin-left: 1rem;
        }

        .legend-thresholds span {
          font-size: 0.5rem;
          color: var(--text-secondary);
        }

        @media (max-width: 768px) {
          .heatmap-header {
            flex-direction: column;
            gap: 0.5rem;
          }

          .stats-row {
            flex-wrap: wrap;
            gap: 1rem;
          }

          .legend {
            flex-wrap: wrap;
          }

          .legend-thresholds {
            width: 100%;
            margin-left: 0;
            margin-top: 0.5rem;
            justify-content: space-between;
          }
        }
      `}</style>
    </>
  );
}

function HeatmapCell({ cell, day, hour }) {
  const hasData = cell && cell.block_count > 0;
  const utilization = hasData ? cell.avg_utilization : 0;
  const saturation = hasData ? cell.avg_saturation : 0;
  const gasPrice = hasData ? cell.avg_gas_price : 0;
  const blockCount = hasData ? cell.block_count : 0;

  const bgColor = hasData
    ? getUtilizationColor(utilization)
    : "var(--border-primary)";
  const opacity = hasData ? Math.max(0.3, Math.min(1, utilization / 100)) : 0.2;

  const formatGwei = (wei) => {
    if (!wei) return "0";
    const gwei = wei / 1e9;
    if (gwei < 0.001) return gwei.toFixed(6);
    if (gwei < 1) return gwei.toFixed(4);
    return gwei.toFixed(2);
  };

  const tooltipContent = hasData
    ? `${day} ${hour.toString().padStart(2, "0")}:00 UTC\nUtilization: ${utilization.toFixed(1)}%\nSaturation: ${saturation.toFixed(1)}%\nGas Price: ${formatGwei(gasPrice)} Gwei\nBlocks: ${blockCount}`
    : `${day} ${hour.toString().padStart(2, "0")}:00 UTC\nNo data`;

  return (
    <div
      className="heatmap-cell"
      style={{
        backgroundColor: bgColor,
        opacity: opacity,
      }}
      title={tooltipContent}
    >
      <style jsx>{`
        .heatmap-cell {
          flex: 1;
          min-width: 8px;
          height: 20px;
          border-radius: 2px;
          transition: all 0.2s;
          cursor: help;
        }

        .heatmap-cell:hover {
          opacity: 0;
          transform: scale(1.2);
          z-index: 10;
        }
      `}</style>
    </div>
  );
}

export default CongestionHeatmap;
