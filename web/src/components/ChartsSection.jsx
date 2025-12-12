import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const CHAIN_COLORS = {
  base: "#0052ff",
  optimism: "#f38ba8",
  arbitrum: "#28a0f0",
  scroll: "#fab387",
  starknet: "#cba6f7",
  zksync: "#b4befe",
  linea: "#61dfff",
  taiko: "#e81899",
  blast: "#fcfc03",
  zora: "#5b5bd6",
  mode: "#dffe00",
  soneium: "#00d4ff",
  lighter: "#ffd700",
  unichain: "#ff007a",
  katana: "#ff6b35",
  codex: "#9d4edd",
  metal: "#8b8b8b",
  abstract: "#a855f7",
  world: "#10b981",
  ink: "#3b82f6",
  mantle: "#1a1a2e",
  cyber: "#00ff88",
  kroma: "#7c3aed",
  redstone: "#dc2626",
  fraxtal: "#818cf8",
  mint: "#4ade80",
  other: "#585b70",
};

function getChainColor(chainName) {
  if (!chainName) return CHAIN_COLORS.other;
  const normalized = chainName.toLowerCase().replace(/\s+/g, "");
  for (const [key, color] of Object.entries(CHAIN_COLORS)) {
    if (normalized.includes(key)) {
      return color;
    }
  }
  return CHAIN_COLORS.other;
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <p className="tooltip-label">{label}</p>
        {payload.map((entry, index) => (
          <p
            key={index}
            className="tooltip-value"
            style={{ color: entry.color }}
          >
            {entry.name}: {entry.value}
          </p>
        ))}
        <style jsx>{`
          .custom-tooltip {
            background: var(--bg-secondary);
            border: 1px solid var(--border-primary);
            border-radius: 8px;
            padding: 0.75rem;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          }

          .tooltip-label {
            font-size: 0.75rem;
            color: var(--text-secondary);
            margin-bottom: 0.5rem;
          }

          .tooltip-value {
            font-size: 0.875rem;
            font-weight: 600;
            margin: 0.25rem 0;
          }
        `}</style>
      </div>
    );
  }
  return null;
};

function ChartsSection({ chartData, chainStats }) {
  if (!chartData || !chainStats) {
    return (
      <div className="charts-section">
        <div className="charts-grid">
          <div className="chart-card skeleton">
            <div className="skeleton-title"></div>
            <div className="skeleton-chart"></div>
          </div>
          <div className="chart-card skeleton">
            <div className="skeleton-title"></div>
            <div className="skeleton-chart"></div>
          </div>
        </div>
        <div className="chart-card skeleton" style={{ marginTop: "1rem" }}>
          <div className="skeleton-title"></div>
          <div className="skeleton-chart"></div>
        </div>
      </div>
    );
  }

  // Process chart data for blobs per block
  const blobsData =
    chartData.labels?.map((label, index) => ({
      block: label,
      blobs: chartData.blobs?.[index] || 0,
    })) || [];

  // Process chart data for gas prices
  const gasData =
    chartData.labels?.map((label, index) => ({
      block: label,
      price: parseFloat((chartData.gas_prices?.[index] || 0) / 1e9).toFixed(2),
    })) || [];

  // Process chain stats
  const chainData = chainStats
    .sort((a, b) => b.count - a.count)
    .map((stat) => ({
      chain: stat.chain_name || "Unknown",
      count: stat.count || 0,
      color: getChainColor(stat.chain_name),
    }));

  return (
    <>
      <div className="charts-section">
        <div className="charts-grid">
          {/* Blobs per Block Chart */}
          <div className="chart-card fade-in">
            <h2 className="chart-title">Blobs per Block</h2>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={blobsData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border-primary)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="block"
                    tick={false}
                    stroke="var(--text-tertiary)"
                  />
                  <YAxis
                    stroke="var(--text-tertiary)"
                    tick={{ fill: "var(--text-tertiary)", fontSize: 12 }}
                  />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ fill: "rgba(167, 139, 250, 0.1)" }}
                  />
                  <Bar dataKey="blobs" radius={[4, 4, 0, 0]}>
                    {blobsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill="var(--accent-purple)" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gas Price Chart */}
          <div className="chart-card fade-in">
            <h2 className="chart-title">Blob Gas Price (Gwei)</h2>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={gasData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border-primary)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="block"
                    tick={false}
                    stroke="var(--text-tertiary)"
                  />
                  <YAxis
                    stroke="var(--text-tertiary)"
                    tick={{ fill: "var(--text-tertiary)", fontSize: 12 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke="var(--accent-yellow)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6, fill: "var(--accent-yellow)" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Chain Stats Chart */}
        <div className="chart-card fade-in" style={{ marginTop: "1rem" }}>
          <h2 className="chart-title">Blobs by Chain</h2>
          <div className="chart-container" style={{ height: "300px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chainData} layout="horizontal">
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border-primary)"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  stroke="var(--text-tertiary)"
                  tick={{ fill: "var(--text-tertiary)", fontSize: 12 }}
                />
                <YAxis
                  type="category"
                  dataKey="chain"
                  stroke="var(--text-tertiary)"
                  tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
                  width={100}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ fill: "rgba(167, 139, 250, 0.1)" }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {chainData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <style jsx>{`
        .charts-section {
          margin-bottom: 2rem;
        }

        .charts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .chart-card {
          background: var(--bg-card);
          border: 1px solid var(--border-primary);
          border-radius: 12px;
          padding: 1.25rem;
          transition: all 0.2s;
        }

        .chart-card:hover {
          border-color: var(--border-secondary);
        }

        .chart-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-secondary);
          margin-bottom: 1rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .chart-container {
          height: 250px;
          position: relative;
        }

        .skeleton {
          animation: pulse 2s infinite;
        }

        .skeleton-title {
          height: 16px;
          background: var(--border-primary);
          border-radius: 4px;
          width: 150px;
          margin-bottom: 1rem;
        }

        .skeleton-chart {
          height: 250px;
          background: var(--border-primary);
          border-radius: 8px;
        }

        @media (max-width: 1024px) {
          .charts-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .chart-card {
            padding: 1rem;
          }

          .chart-container {
            height: 200px;
          }
        }
      `}</style>
    </>
  );
}

export default ChartsSection;
