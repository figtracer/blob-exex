import { useMemo } from "react";

// Format bytes to human readable
function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function DailyBlobsGraph({ data }) {
  // Process data into a map for quick lookup
  const { dayMap, maxBlobs, totalBlobs, totalSize, weeks } = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        dayMap: {},
        maxBlobs: 0,
        totalBlobs: 0,
        totalSize: 0,
        weeks: [],
      };
    }

    const map = {};
    let max = 0;
    let total = 0;
    let size = 0;

    data.forEach((d) => {
      map[d.date] = d;
      if (d.blob_count > max) max = d.blob_count;
      total += d.blob_count;
      size += d.total_size_bytes;
    });

    // Generate weeks for the last 365 days
    const today = new Date();
    const weeksData = [];

    // Start from 52 weeks ago, aligned to Sunday
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 364);
    // Align to the previous Sunday
    startDate.setDate(startDate.getDate() - startDate.getDay());

    let currentDate = new Date(startDate);
    let currentWeek = [];

    while (currentDate <= today) {
      const dateStr = currentDate.toISOString().split("T")[0];
      currentWeek.push({
        date: dateStr,
        dayOfWeek: currentDate.getDay(),
        data: map[dateStr] || null,
      });

      if (currentWeek.length === 7) {
        weeksData.push(currentWeek);
        currentWeek = [];
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Push any remaining days
    if (currentWeek.length > 0) {
      weeksData.push(currentWeek);
    }

    return {
      dayMap: map,
      maxBlobs: max,
      totalBlobs: total,
      totalSize: size,
      weeks: weeksData,
    };
  }, [data]);

  // Get color based on blob count intensity
  const getColor = (blobCount) => {
    if (!blobCount || blobCount === 0) return "var(--bg-secondary)";

    const intensity = blobCount / maxBlobs;

    if (intensity < 0.25) return "#0e4429";
    if (intensity < 0.5) return "#006d32";
    if (intensity < 0.75) return "#26a641";
    return "#39d353";
  };

  // Get month labels
  const monthLabels = useMemo(() => {
    const labels = [];
    let lastMonth = -1;

    weeks.forEach((week, weekIndex) => {
      const firstDay = week[0];
      if (firstDay) {
        const date = new Date(firstDay.date);
        const month = date.getMonth();
        if (month !== lastMonth) {
          labels.push({
            weekIndex,
            label: date.toLocaleDateString("en-US", { month: "short" }),
          });
          lastMonth = month;
        }
      }
    });

    return labels;
  }, [weeks]);

  if (!data || data.length === 0) {
    return (
      <div className="daily-blobs-graph">
        <div className="graph-card skeleton">
          <div className="skeleton-content"></div>
        </div>
        <style jsx>{`
          .daily-blobs-graph {
            flex: 1;
            min-width: 0;
          }
          .graph-card {
            background: var(--bg-card);
            border: 1px solid var(--border-primary);
            border-radius: 12px;
            padding: 1.25rem;
            height: 100%;
          }
          .skeleton {
            animation: pulse 2s infinite;
            min-height: 150px;
          }
          .skeleton-content {
            height: 120px;
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

  return (
    <>
      <div className="daily-blobs-graph">
        <div className="graph-card fade-in">
          <div className="graph-header">
            <div className="header-left">
              <h2 className="graph-title">Daily Blobs Graph</h2>
            </div>
            <div className="header-right">
              <span className="total-stat">{formatBytes(totalSize)}</span>
            </div>
          </div>

          <div className="graph-container">
            <div className="month-labels">
              {monthLabels.map((m, i) => (
                <span
                  key={i}
                  className="month-label"
                  style={{ gridColumnStart: m.weekIndex + 2 }}
                >
                  {m.label}
                </span>
              ))}
            </div>

            <div className="graph-body">
              <div className="day-labels">
                <span></span>
                <span>Mon</span>
                <span></span>
                <span>Wed</span>
                <span></span>
                <span>Fri</span>
                <span></span>
              </div>

              <div className="weeks-grid">
                {weeks.map((week, weekIndex) => (
                  <div key={weekIndex} className="week-column">
                    {week.map((day, dayIndex) => (
                      <div
                        key={`${weekIndex}-${dayIndex}`}
                        className="day-cell"
                        style={{
                          backgroundColor: getColor(day.data?.blob_count || 0),
                        }}
                        title={
                          day.data
                            ? `${day.date}: ${formatBytes(day.data.total_size_bytes)} (${day.data.blob_count.toLocaleString()} blobs, ${day.data.tx_count.toLocaleString()} txs)`
                            : `${day.date}: No data`
                        }
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div className="legend">
              <span className="legend-label">Less</span>
              <div className="legend-cells">
                <div
                  className="legend-cell"
                  style={{ backgroundColor: "var(--bg-secondary)" }}
                />
                <div
                  className="legend-cell"
                  style={{ backgroundColor: "#0e4429" }}
                />
                <div
                  className="legend-cell"
                  style={{ backgroundColor: "#006d32" }}
                />
                <div
                  className="legend-cell"
                  style={{ backgroundColor: "#26a641" }}
                />
                <div
                  className="legend-cell"
                  style={{ backgroundColor: "#39d353" }}
                />
              </div>
              <span className="legend-label">More</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .daily-blobs-graph {
          flex: 1;
          min-width: 0;
        }

        .graph-card {
          background: var(--bg-card);
          border: 1px solid var(--border-primary);
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.2s;
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .graph-card:hover {
          border-color: var(--border-secondary);
        }

        .graph-header {
          padding: 1rem 1.25rem;
          border-bottom: 1px solid var(--border-primary);
          background: var(--bg-secondary);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .graph-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 0;
        }

        .header-right {
          display: flex;
          gap: 1rem;
        }

        .total-stat {
          font-size: 0.75rem;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .graph-container {
          padding: 0.75rem;
          overflow-x: auto;
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .month-labels {
          display: grid;
          grid-template-columns: 24px repeat(53, 9px);
          gap: 2px;
          margin-bottom: 2px;
          font-size: 0.5625rem;
          color: var(--text-secondary);
        }

        .month-label {
          white-space: nowrap;
        }

        .graph-body {
          display: flex;
          gap: 2px;
        }

        .day-labels {
          display: flex;
          flex-direction: column;
          gap: 2px;
          font-size: 0.5rem;
          color: var(--text-secondary);
          padding-right: 2px;
        }

        .day-labels span {
          height: 9px;
          display: flex;
          align-items: center;
        }

        .weeks-grid {
          display: flex;
          gap: 2px;
        }

        .week-column {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .day-cell {
          width: 9px;
          height: 9px;
          border-radius: 2px;
          cursor: pointer;
          transition:
            transform 0.1s,
            box-shadow 0.1s;
        }

        .day-cell:hover {
          transform: scale(1.2);
          box-shadow: 0 0 4px rgba(57, 211, 83, 0.4);
          outline: 1px solid rgba(255, 255, 255, 0.2);
        }

        .legend {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 0.5rem;
          margin-top: 0.5rem;
          font-size: 0.5625rem;
          color: var(--text-secondary);
        }

        .legend-cells {
          display: flex;
          gap: 2px;
        }

        .legend-cell {
          width: 9px;
          height: 9px;
          border-radius: 2px;
        }

        .legend-label {
          font-size: 0.5rem;
        }

        @media (max-width: 768px) {
          .graph-container {
            padding: 0.5rem;
          }

          .graph-header {
            flex-direction: column;
            gap: 0.5rem;
            align-items: flex-start;
          }

          .header-right {
            flex-wrap: wrap;
            gap: 0.5rem;
          }
        }
      `}</style>
    </>
  );
}

export default DailyBlobsGraph;
