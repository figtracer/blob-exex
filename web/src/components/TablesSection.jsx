import {
  formatNumber,
  formatBytes,
  formatGwei,
  formatTimeAgo,
  truncateHash,
  truncateAddress,
} from "../utils/format";
import ChainBadge from "./ChainBadge";

function TablesSection({ blocks, senders, blobTransactions, onBlockClick }) {
  if (!blocks || !senders || !blobTransactions) {
    return (
      <div className="tables-section">
        <div className="tables-grid">
          <div className="table-card skeleton">
            <div className="skeleton-title"></div>
            <div className="skeleton-table"></div>
          </div>
          <div className="table-card skeleton">
            <div className="skeleton-title"></div>
            <div className="skeleton-table"></div>
          </div>
        </div>
        <div className="table-card skeleton" style={{ marginTop: "1rem" }}>
          <div className="skeleton-title"></div>
          <div className="skeleton-table"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="tables-section">
        <div className="tables-grid">
          {/* Latest Blob Transactions */}
          <div className="table-card fade-in">
            <h2 className="table-title">Latest Blob Transactions</h2>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Tx Hash</th>
                    <th>Block</th>
                    <th>Chain</th>
                    <th>Blobs</th>
                    <th>Size</th>
                    <th>Gas Price</th>
                  </tr>
                </thead>
                <tbody>
                  {blobTransactions.slice(0, 10).map((tx, index) => (
                    <tr key={index}>
                      <td>
                        <span className="mono highlight">
                          {truncateHash(tx.tx_hash)}
                        </span>
                      </td>
                      <td>
                        <span className="number">
                          {formatNumber(tx.block_number)}
                        </span>
                      </td>
                      <td>
                        <ChainBadge chainName={tx.chain_name} size="sm" />
                      </td>
                      <td>
                        <span className="number">{tx.blob_count || 0}</span>
                      </td>
                      <td>
                        <span className="muted">
                          {formatBytes(tx.blob_size)}
                        </span>
                      </td>
                      <td>
                        <span className="number-alt">
                          {formatGwei(tx.gas_price)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Senders */}
          <div className="table-card fade-in">
            <h2 className="table-title">Top Senders</h2>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Chain</th>
                    <th>Address</th>
                    <th>Txs</th>
                    <th>Blobs</th>
                    <th>Total Size</th>
                  </tr>
                </thead>
                <tbody>
                  {senders.slice(0, 10).map((sender, index) => (
                    <tr key={index}>
                      <td>
                        <ChainBadge chainName={sender.chain_name} size="sm" />
                      </td>
                      <td>
                        <span className="mono highlight">
                          {truncateAddress(sender.sender)}
                        </span>
                      </td>
                      <td>
                        <span className="number">
                          {formatNumber(sender.tx_count)}
                        </span>
                      </td>
                      <td>
                        <span className="number">
                          {formatNumber(sender.blob_count)}
                        </span>
                      </td>
                      <td>
                        <span className="muted">
                          {formatBytes(sender.total_size)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Recent Blocks */}
        <div className="table-card fade-in" style={{ marginTop: "1rem" }}>
          <h2 className="table-title">Recent Blocks</h2>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Block</th>
                  <th>Time</th>
                  <th>Txs</th>
                  <th>Blobs</th>
                  <th>Blob Size</th>
                  <th>Gas Price</th>
                </tr>
              </thead>
              <tbody>
                {blocks.slice(0, 20).map((block, index) => (
                  <tr
                    key={index}
                    className="clickable"
                    onClick={() => onBlockClick(block)}
                  >
                    <td>
                      <span className="number highlight">
                        {formatNumber(block.block_number)}
                      </span>
                    </td>
                    <td>
                      <span className="muted">
                        {formatTimeAgo(block.timestamp)}
                      </span>
                    </td>
                    <td>
                      <span className="number">{block.tx_count || 0}</span>
                    </td>
                    <td>
                      <span className="number">{block.blob_count || 0}</span>
                    </td>
                    <td>
                      <span className="muted">
                        {formatBytes(block.blob_size)}
                      </span>
                    </td>
                    <td>
                      <span className="number-alt">
                        {formatGwei(block.gas_price)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <style jsx>{`
        .tables-section {
          margin-bottom: 2rem;
        }

        .tables-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
          gap: 1rem;
        }

        .table-card {
          background: var(--bg-card);
          border: 1px solid var(--border-primary);
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.2s;
        }

        .table-card:hover {
          border-color: var(--border-secondary);
        }

        .table-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-secondary);
          padding: 1rem 1.25rem;
          border-bottom: 1px solid var(--border-primary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          background: var(--bg-secondary);
        }

        .table-scroll {
          max-height: 500px;
          overflow-y: auto;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
        }

        .data-table th,
        .data-table td {
          padding: 0.75rem 1rem;
          text-align: left;
          border-bottom: 1px solid var(--border-primary);
        }

        .data-table th {
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-tertiary);
          background: var(--bg-secondary);
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .data-table td {
          font-size: 0.8rem;
          color: var(--text-primary);
        }

        .data-table tbody tr {
          transition: background 0.15s;
        }

        .data-table tbody tr:hover {
          background: var(--bg-hover);
        }

        .data-table tbody tr.clickable {
          cursor: pointer;
        }

        .data-table tbody tr.clickable:active {
          background: var(--bg-tertiary);
        }

        .mono {
          font-family:
            "JetBrains Mono", "SF Mono", Monaco, "Cascadia Code", monospace;
          font-size: 0.75rem;
        }

        .number {
          color: var(--accent-purple);
          font-variant-numeric: tabular-nums;
        }

        .number-alt {
          color: var(--accent-yellow);
          font-variant-numeric: tabular-nums;
        }

        .highlight {
          color: var(--accent-cyan);
        }

        .muted {
          color: var(--text-secondary);
          font-variant-numeric: tabular-nums;
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

        .skeleton-table {
          height: 400px;
          background: var(--border-primary);
          margin: 1rem;
          border-radius: 8px;
        }

        @media (max-width: 1024px) {
          .tables-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .table-card {
            border-radius: 8px;
          }

          .table-title {
            padding: 0.75rem 1rem;
            font-size: 0.8rem;
          }

          .data-table th,
          .data-table td {
            padding: 0.5rem 0.75rem;
            font-size: 0.75rem;
          }

          .data-table th {
            font-size: 0.65rem;
          }

          .table-scroll {
            max-height: 400px;
          }
        }
      `}</style>
    </>
  );
}

export default TablesSection;
