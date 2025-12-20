import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

import { formatBytes, formatGwei } from "../utils/format";
import {
  BLOB_TARGET,
  BLOB_MAX,
  BLOB_SIZE_BYTES,
  getUtilizationColor,
  getSaturationColor,
  getUtilizationColorName,
  getSaturationColorName,
  BASE_BLUE,
} from "../utils/protocol";

function StatsGrid({ stats, chainProfiles }) {
  if (!stats) {
    return (
      <div className="stats-grid">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="stat-item skeleton">
            <div className="skeleton-line"></div>
            <div className="skeleton-value"></div>
          </div>
        ))}
      </div>
    );
  }

  // Calculate utilization and saturation from avg blobs per block
  const avgBlobs = stats.avg_blobs_per_block ?? 0;
  const targetUtilization = (avgBlobs / BLOB_TARGET) * 100;
  const saturationIndex = (avgBlobs / BLOB_MAX) * 100;

  // Process chain data for pie chart
  const { chainData, totalBlobs } = (() => {
    if (!chainProfiles) return { chainData: [], totalBlobs: 0 };

    const allTotal = chainProfiles.reduce(
      (sum, p) => sum + (p.total_blobs || 0),
      0,
    );

    const filtered = chainProfiles
      .filter((profile) => profile.total_blobs > 0)
      .sort((a, b) => b.total_blobs - a.total_blobs);

    // Generate gradient colors based on rank
    const generateGradientColor = (index, total) => {
      // Create smooth gradient with extended color range for better distinction
      // Largest slice = darkest, smallest = lightest
      // Color stops: dark indigo -> indigo -> blue -> light blue -> cyan
      const ratio = total > 1 ? index / (total - 1) : 0;

      // Extended gradient with 5 color stops for more variety
      const colorStops = [
        { r: 55, g: 48, b: 163 }, // #3730a3 - darker indigo (largest)
        { r: 79, g: 70, b: 229 }, // #4f46e5 - indigo
        { r: 59, g: 130, b: 246 }, // #3b82f6 - blue
        { r: 96, g: 165, b: 250 }, // #60a5fa - light blue
        { r: 125, g: 211, b: 252 }, // #7dd3fc - cyan (smallest)
      ];

      // Find which segment of the gradient we're in
      const segmentSize = 1 / (colorStops.length - 1);
      const segmentIndex = Math.min(
        Math.floor(ratio / segmentSize),
        colorStops.length - 2,
      );
      const segmentRatio = (ratio - segmentIndex * segmentSize) / segmentSize;

      // Interpolate between the two color stops
      const start = colorStops[segmentIndex];
      const end = colorStops[segmentIndex + 1];

      const r = Math.round(start.r + (end.r - start.r) * segmentRatio);
      const g = Math.round(start.g + (end.g - start.g) * segmentRatio);
      const b = Math.round(start.b + (end.b - start.b) * segmentRatio);

      return `rgb(${r}, ${g}, ${b})`;
    };

    const data = filtered.map((profile, index) => {
      const percentage =
        allTotal > 0 ? ((profile.total_blobs || 0) / allTotal) * 100 : 0;
      return {
        chain: profile.chain || "Unknown",
        count: profile.total_blobs || 0,
        color: generateGradientColor(index, filtered.length),
        percentage,
      };
    });

    return { chainData: data, totalBlobs: allTotal };
  })();

  const ChainPieTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload[0]) return null;
    const data = payload[0].payload;

    return (
      <div
        style={{
          background: "#0a0a0f",
          border: "1px solid #252530",
          borderRadius: "8px",
          padding: "0.75rem",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
        }}
      >
        <div
          style={{
            fontSize: "0.6875rem",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "#71717a",
            marginBottom: "0.375rem",
            margin: 0,
          }}
        >
          {data.chain}
        </div>
        <div
          style={{
            fontSize: "0.875rem",
            fontWeight: 700,
            margin: 0,
          }}
        >
          {data.count.toLocaleString()} blobs
        </div>
        <div
          style={{
            fontSize: "0.75rem",
            color: "#71717a",
            marginTop: "0.25rem",
          }}
        >
          {data.percentage.toFixed(1)}%
        </div>
      </div>
    );
  };

  const statCards = [
    {
      title: "Total Blob Size",
      value: formatBytes(stats.total_blobs * BLOB_SIZE_BYTES),
      color: "white",
    },
    {
      title: "Blob Gas Price",
      value: formatGwei(stats.latest_gas_price),
      color: "white",
    },
    {
      title: "Avg Blobs/Block",
      value: stats.avg_blobs_per_block?.toFixed(2) || "0",
      subtitle: `Target: ${BLOB_TARGET} | Max: ${BLOB_MAX}`,
      color: getSaturationColorName(saturationIndex),
      customColor: getSaturationColor(saturationIndex),
    },
    {
      title: "Target Utilization",
      value: `${targetUtilization.toFixed(1)}%`,
      subtitle: `${avgBlobs.toFixed(1)} / ${BLOB_TARGET} blobs`,
      color: getUtilizationColorName(targetUtilization),
      customColor: getUtilizationColor(targetUtilization),
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
      customColor: getSaturationColor(saturationIndex),
      hasBar: true,
      barValue: saturationIndex,
      barMax: 100,
    },
  ];

  return (
    <>
      <div className="stats-grid">
        {/* Pie Chart - First Item */}
        <div className="stat-item stat-pie fade-in">
          <div className="pie-container">
            <div className="pie-center-text">
              <div className="pie-total">{totalBlobs.toLocaleString()}</div>
              <div className="pie-label">Total</div>
            </div>
            <div className="pie-chart-wrapper">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={chainData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={2}
                    dataKey="count"
                    isAnimationActive={false}
                    stroke="none"
                  >
                    {chainData.map((entry) => (
                      <Cell key={`pie-${entry.chain}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={<ChainPieTooltip />}
                    wrapperStyle={{ zIndex: 1000 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Other Stats */}
        {statCards.map((card, index) => (
          <div key={index} className="stat-item fade-in">
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
                      backgroundColor: card.customColor || BASE_BLUE,
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
          grid-template-columns: 200px repeat(5, 1fr);
          gap: 1.5rem;
          margin-bottom: 0.5rem;
          margin-top: -4rem;
          align-items: start;
        }

        .stat-item {
          transition: all 0.2s;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          padding-top: 87px;
          min-height: auto;
        }

        .stat-pie {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 220px;
          padding-top: 20px;
        }

        .pie-container {
          position: relative;
          width: 100%;
          height: 180px;
        }

        .pie-center-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
          pointer-events: none;
          z-index: 1;
        }

        .pie-chart-wrapper {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 2;
        }

        .pie-total {
          font-size: 1rem;
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1;
          margin-bottom: 0.25rem;
        }

        .pie-label {
          font-size: 0.56rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 500;
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

        .stat-value-white {
          color: var(--text-primary);
        }

        .stat-value-lightBlue {
          color: #60a5fa;
        }

        .stat-value-blue {
          color: #3b82f6;
        }

        .stat-value-indigo {
          color: #4f46e5;
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

        @media (max-width: 1400px) {
          .stats-grid {
            grid-template-columns: 180px repeat(5, 1fr);
            gap: 1.25rem;
          }

          .stat-item {
            padding-top: 82px;
          }

          .stat-pie {
            padding-top: 15px;
          }
        }

        @media (max-width: 1200px) {
          .stats-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 1rem;
            align-items: stretch;
          }

          .stat-item {
            padding-top: 0;
          }

          .stat-pie {
            grid-column: 1 / -1;
            order: -1 !important;
            padding-top: 0;
          }

          .pie-container {
            height: 200px;
          }

          .pie-total {
            font-size: 1.5rem;
          }
        }

        @media (max-width: 768px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 1rem;
          }

          .stat-item {
            padding-top: 0;
          }

          .stat-pie {
            grid-column: 1 / -1;
            padding-top: 0;
          }

          .stat-value {
            font-size: 1.25rem;
          }

          .pie-total {
            font-size: 1.25rem;
          }

          .pie-container {
            height: 180px;
          }
        }

        @media (max-width: 480px) {
          .stats-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }

          .stat-pie {
            grid-column: 1;
          }
        }
      `}</style>
    </>
  );
}

export default StatsGrid;
