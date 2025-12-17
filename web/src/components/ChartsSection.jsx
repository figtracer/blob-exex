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
import {
  BLOB_TARGET,
  BLOB_MAX,
  BASE_BLUE,
  GRADIENT_COLORS,
} from "../utils/protocol";

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
            style={{ ...tooltipStyles.value, color: entry.color || BASE_BLUE }}
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

const formatGweiChart = (value) => value.toFixed(6);

// Get bar color based on blob count relative to target/max
// Uses blue-to-indigo gradient: light blue (low) -> blue -> indigo (90%+ = max)
function getBlobBarColor(blobCount) {
  const saturationPercent = (blobCount / BLOB_MAX) * 100;

  if (saturationPercent < 50) return GRADIENT_COLORS.lightBlue; // 0-7.5 blobs
  if (saturationPercent < 90) return GRADIENT_COLORS.blue; // 7.5-13.5 blobs
  return GRADIENT_COLORS.indigo; // 13.5-15 blobs (90%+ = max, always same color)
}

function ChartsSection({ chartData, onBlockClick }) {
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

  if (!chartData) {
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
                      fill: "rgba(59, 130, 246, 0.1)",
                      cursor: "pointer",
                    }}
                  />
                  <ReferenceLine
                    y={BLOB_TARGET}
                    stroke="#4f46e5"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    fillOpacity={0.3}
                    label={{
                      position: "right",
                      fill: "#4f46e5",
                      fontSize: 9,
                    }}
                  />
                  <ReferenceLine
                    y={BLOB_MAX}
                    stroke="#4f46e5"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    fillOpacity={0.3}
                    label={{
                      position: "right",
                      fill: "#4f46e5",
                      fontSize: 9,
                    }}
                  />
                  <Bar
                    dataKey="blobs"
                    radius={[2, 2, 0, 0]}
                    maxBarSize={8}
                    isAnimationActive={false}
                  >
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
                    tickFormatter={formatGweiChart}
                  />
                  <Tooltip
                    content={<CustomTooltip valueFormatter={formatGweiChart} />}
                    cursor={{
                      stroke: BASE_BLUE,
                      strokeWidth: 1,
                      cursor: "pointer",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke={BASE_BLUE}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{
                      r: 4,
                      fill: BASE_BLUE,
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
      </div>

      <style jsx>{`
        .charts-section {
          margin-bottom: 1.5rem;
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
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .chart-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 0;
        }

        .chart-subtitle {
          font-size: 0.75rem;
          color: var(--text-secondary);
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
