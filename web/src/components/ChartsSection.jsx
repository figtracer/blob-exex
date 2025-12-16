import { useMemo, useCallback } from "react";
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
  ReferenceLine,
} from "recharts";
import { getChainIcon, getChainColor } from "../utils/chains";
import { BLOB_TARGET, BLOB_MAX } from "../utils/protocol";

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

// Custom Y-axis tick with chain logo or "Other" text
const ChainTick = ({ x, y, payload }) => {
  // Defensive check - payload might be undefined or have no value
  if (!payload || payload.value === undefined || payload.value === null) {
    return null;
  }

  const chainName = String(payload.value);
  const chainIcon = getChainIcon(chainName);

  return (
    <g transform={`translate(${x},${y})`}>
      {chainIcon ? (
        <image
          x={-20}
          y={-8}
          width={16}
          height={16}
          href={chainIcon}
          xlinkHref={chainIcon}
          preserveAspectRatio="xMidYMid meet"
        />
      ) : (
        <text
          x={-12}
          y={5}
          textAnchor="middle"
          fill="#71717a"
          fontSize={9}
          fontFamily="Inter, -apple-system, BlinkMacSystemFont, sans-serif"
        >
          {chainName.length > 6 ? chainName.substring(0, 5) + "…" : chainName}
        </text>
      )}
    </g>
  );
};

const formatGwei = (value) => value.toFixed(6);

// Get bar color based on blob count relative to target/max
function getBlobBarColor(blobCount) {
  if (blobCount <= BLOB_TARGET * 0.5) return "#22c55e"; // green - abundant
  if (blobCount <= BLOB_TARGET * 0.9) return "#3b82f6"; // blue - normal
  if (blobCount <= BLOB_TARGET * 1.2) return "#f59e0b"; // amber - pressured
  if (blobCount <= BLOB_MAX) return "#f97316"; // orange - congested
  return "#ef4444"; // red - saturated (at max)
}

function ChartsSection({ chartData, chainProfiles, onBlockClick }) {
  // Memoize processed chart data
  const blobsData = useMemo(() => {
    if (!chartData?.labels) return [];
    return chartData.labels.map((label, index) => ({
      block: label,
      blobs: chartData.blobs?.[index] || 0,
    }));
  }, [chartData?.labels, chartData?.blobs]);

  const gasData = useMemo(() => {
    if (!chartData?.labels) return [];
    return chartData.labels.map((label, index) => ({
      block: label,
      price: chartData.gas_prices?.[index] || 0,
    }));
  }, [chartData?.labels, chartData?.gas_prices]);

  const chainData = useMemo(() => {
    if (!chainProfiles) return [];
    return chainProfiles
      .filter((profile) => profile.total_blobs > 0)
      .sort((a, b) => b.total_blobs - a.total_blobs)
      .slice(0, 10)
      .map((profile) => ({
        chain: profile.chain || "Unknown",
        count: profile.total_blobs || 0,
        color: getChainColor(profile.chain),
      }));
  }, [chainProfiles]);

  // Memoize click handler
  const handleChartClick = useCallback(
    (data) => {
      if (data && data.activePayload && data.activePayload[0]) {
        const blockNumber = data.activePayload[0].payload.block;
        if (onBlockClick) {
          fetch(`/api/block?block_number=${blockNumber}`)
            .then((res) => res.json())
            .then((block) => {
              if (block) onBlockClick(block);
            });
        }
      }
    },
    [onBlockClick],
  );

  if (!chartData || !chainProfiles) {
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
                  onClick={handleChartClick}
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
                    cursor={{
                      fill: "rgba(167, 139, 250, 0.1)",
                      cursor: "pointer",
                    }}
                  />
                  <ReferenceLine
                    y={BLOB_TARGET}
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      position: "right",
                      fill: "#f59e0b",
                      fontSize: 9,
                    }}
                  />
                  <ReferenceLine
                    y={BLOB_MAX}
                    stroke="#ef4444"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      position: "right",
                      fill: "#ef4444",
                      fontSize: 9,
                    }}
                  />
                  <Bar dataKey="blobs" radius={[2, 2, 0, 0]} maxBarSize={8}>
                    {blobsData.map((entry) => (
                      <Cell
                        key={`cell-${entry.block}`}
                        fill={getBlobBarColor(entry.blobs)}
                        style={{ cursor: "pointer" }}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gas Price Chart */}
          <div className="chart-card fade-in">
            <div className="chart-header">
              <h2 className="chart-title">Blob Gas Price Per Block (Gwei)</h2>
            </div>
            <div className="chart-body">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart
                  data={gasData}
                  margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                  onClick={handleChartClick}
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
                    width={70}
                    tickFormatter={formatGwei}
                  />
                  <Tooltip
                    content={<CustomTooltip valueFormatter={formatGwei} />}
                    cursor={{
                      stroke: "#fbbf24",
                      strokeWidth: 1,
                      cursor: "pointer",
                    }}
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
                      cursor: "pointer",
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
                  tick={<ChainTick />}
                  width={30}
                  interval={0}
                />
                <Tooltip
                  content={<ChainTooltip />}
                  cursor={{ fill: "rgba(167, 139, 250, 0.1)" }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={24}>
                  {chainData.map((entry) => (
                    <Cell key={`chain-${entry.chain}`} fill={entry.color} />
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
          cursor: pointer;
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
