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

const tooltipStyles = {
  container: {
    background: "#16161f",
    border: "1px solid #252530",
    borderRadius: "8px",
    padding: "0.75rem 1rem",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
  },
  label: {
    fontSize: "0.7rem",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "#71717a",
    marginBottom: "0.5rem",
    margin: 0,
  },
  value: {
    fontSize: "0.875rem",
    fontWeight: 600,
    margin: "0.25rem 0",
  },
};

const CustomTooltip = ({ active, payload, label, valueFormatter }) => {
  if (active && payload && payload.length) {
    return (
      <div style={tooltipStyles.container}>
        <p style={tooltipStyles.label}>{label}</p>
        {payload.map((entry, index) => (
          <p
            key={index}
            style={{ ...tooltipStyles.value, color: entry.color || "#a78bfa" }}
          >
            {entry.name}:{" "}
            {valueFormatter ? valueFormatter(entry.value) : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const ChainTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div style={tooltipStyles.container}>
        <p style={{ ...tooltipStyles.label, color: data.color }}>
          {data.chain}
        </p>
        <p style={{ ...tooltipStyles.value, color: "#e4e4e7" }}>
          Blobs: {data.count.toLocaleString()}
        </p>
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

  // Process chart data for gas prices - backend already returns in Gwei, no need to divide again
  const gasData =
    chartData.labels?.map((label, index) => ({
      block: label,
      price: chartData.gas_prices?.[index] || 0,
    })) || [];

  // Process chain stats
  const chainData = chainStats
    .filter((stat) => stat.blob_count > 0)
    .sort((a, b) => b.blob_count - a.blob_count)
    .slice(0, 10)
    .map((stat) => ({
      chain: stat.chain || "Unknown",
      count: stat.blob_count || 0,
      color: getChainColor(stat.chain),
    }));

  const formatGwei = (value) => {
    if (value < 0.01) return "<0.01";
    if (value < 1) return value.toFixed(3);
    if (value < 100) return value.toFixed(2);
    return value.toFixed(0);
  };

  return (
    <>
      <div className="charts-section">
        <div className="charts-grid">
          {/* Blobs per Block Chart */}
          <div className="chart-card fade-in">
            <div className="chart-header">
              <h2 className="chart-title">Blobs per Block</h2>
            </div>
            <div className="chart-body">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={blobsData}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#252530"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="block"
                    tick={false}
                    axisLine={{ stroke: "#252530" }}
                    tickLine={false}
                  />
                  <YAxis
                    axisLine={{ stroke: "#252530" }}
                    tickLine={false}
                    tick={{ fill: "#71717a", fontSize: 11 }}
                    width={40}
                  />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ fill: "rgba(167, 139, 250, 0.1)" }}
                  />
                  <Bar dataKey="blobs" radius={[2, 2, 0, 0]} maxBarSize={8}>
                    {blobsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill="#a78bfa" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gas Price Chart */}
          <div className="chart-card fade-in">
            <div className="chart-header">
              <h2 className="chart-title">Blob Gas Price (Gwei)</h2>
            </div>
            <div className="chart-body">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart
                  data={gasData}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#252530"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="block"
                    tick={false}
                    axisLine={{ stroke: "#252530" }}
                    tickLine={false}
                  />
                  <YAxis
                    axisLine={{ stroke: "#252530" }}
                    tickLine={false}
                    tick={{ fill: "#71717a", fontSize: 11 }}
                    width={40}
                    tickFormatter={formatGwei}
                  />
                  <Tooltip
                    content={<CustomTooltip valueFormatter={formatGwei} />}
                  />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke="#fbbf24"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{
                      r: 4,
                      fill: "#fbbf24",
                      stroke: "#16161f",
                      strokeWidth: 2,
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Chain Stats Chart */}
        <div className="chart-card fade-in">
          <div className="chart-header">
            <h2 className="chart-title">Blobs by Chain</h2>
          </div>
          <div className="chart-body">
            <ResponsiveContainer
              width="100%"
              height={Math.max(300, chainData.length * 35)}
            >
              <BarChart
                data={chainData}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#252530"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  axisLine={{ stroke: "#252530" }}
                  tickLine={false}
                  tick={{ fill: "#71717a", fontSize: 11 }}
                  tickFormatter={(value) => value.toLocaleString()}
                />
                <YAxis
                  type="category"
                  dataKey="chain"
                  axisLine={{ stroke: "#252530" }}
                  tickLine={false}
                  tick={{ fill: "#a1a1aa", fontSize: 12 }}
                  width={80}
                />
                <Tooltip
                  content={<ChainTooltip />}
                  cursor={{ fill: "rgba(167, 139, 250, 0.1)" }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={24}>
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
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .chart-card {
          background: var(--bg-card);
          border: 1px solid var(--border-primary);
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.2s;
        }

        .chart-card:hover {
          border-color: var(--border-secondary);
        }

        .chart-header {
          padding: 1rem 1.25rem;
          border-bottom: 1px solid var(--border-primary);
          background: var(--bg-secondary);
        }

        .chart-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 0;
        }

        .chart-body {
          padding: 1rem;
        }

        .skeleton {
          animation: pulse 2s infinite;
        }

        .skeleton-title {
          height: 16px;
          background: var(--border-primary);
          border-radius: 4px;
          width: 150px;
          margin: 1rem 1.25rem;
        }

        .skeleton-chart {
          height: 220px;
          background: var(--border-primary);
          margin: 1rem;
          border-radius: 8px;
        }

        @media (max-width: 1024px) {
          .charts-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .chart-body {
            padding: 0.75rem;
          }
        }
      `}</style>
    </>
  );
}

export default ChartsSection;
