import { X } from "lucide-react";
import {
  formatNumber,
  formatBytes,
  formatGwei,
  formatTimestamp,
  truncateHash,
} from "../utils/format";
import ChainBadge from "./ChainBadge";
import {
  BLOB_TARGET,
  BLOB_MAX,
  DATA_GAS_PER_BLOB,
  getUtilizationColor,
  getSaturationColor,
} from "../utils/protocol";

function BlockModal({ block, onClose }) {
  if (!block) return null;

  // Calculate blob gas statistics
  const targetGas = BLOB_TARGET * DATA_GAS_PER_BLOB;
  const maxGas = BLOB_MAX * DATA_GAS_PER_BLOB;
  const blobGasUsed = block.gas_used || 0;
  const excessBlobGas = block.excess_blob_gas || 0;
  const totalBlobs = block.total_blobs || 0;

  // Blob Gas percentage (of max)
  const blobGasPercent = ((blobGasUsed / maxGas) * 100).toFixed(2);

  // Difference from target (as percentage)
  const targetDiff = (((blobGasUsed - targetGas) / targetGas) * 100).toFixed(2);
  const targetDiffSign = targetDiff >= 0 ? "+" : "";

  // Derived metrics
  const targetUtilization = (totalBlobs / BLOB_TARGET) * 100;
  const saturationIndex = (totalBlobs / BLOB_MAX) * 100;
  const utilizationColor = getUtilizationColor(targetUtilization);
  const saturationColor = getSaturationColor(saturationIndex);

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <>
      <div className="modal-overlay" onClick={handleOverlayClick}>
        <div className="modal">
          <div className="modal-header">
            <div className="modal-header-left">
              <h2 className="modal-title">Block Details</h2>
            </div>
            <button
              className="modal-close"
              onClick={onClose}
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>

          <div className="modal-body">
            {/* Key metrics banner */}
            <div className="metrics-banner">
              <div className="metric-item">
                <span className="metric-label">Target Utilization</span>
                <span
                  className="metric-value"
                  style={{ color: utilizationColor }}
                >
                  {targetUtilization.toFixed(1)}%
                </span>
                <div className="metric-bar">
                  <div
                    className="metric-bar-fill"
                    style={{
                      width: `${Math.min(targetUtilization / 2, 100)}%`,
                      backgroundColor: utilizationColor,
                    }}
                  />
                  <div className="metric-bar-marker" title="Target (100%)" />
                </div>
              </div>
              <div className="metric-item">
                <span className="metric-label">Saturation Index</span>
                <span
                  className="metric-value"
                  style={{ color: saturationColor }}
                >
                  {saturationIndex.toFixed(1)}%
                </span>
                <div className="metric-bar">
                  <div
                    className="metric-bar-fill"
                    style={{
                      width: `${Math.min(saturationIndex, 100)}%`,
                      backgroundColor: saturationColor,
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="detail-grid">
              <div className="detail-item">
                <div className="detail-label">Block Number</div>
                <a
                  href={`https://beaconcha.in/block/${block.block_number}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="detail-value highlight block-number-link"
                >
                  {formatNumber(block.block_number)}
                </a>
              </div>

              <div className="detail-item">
                <div className="detail-label">Timestamp</div>
                <div className="detail-value">
                  {formatTimestamp(block.block_timestamp * 1000)}
                </div>
              </div>

              <div className="detail-item">
                <div className="detail-label">Blob Transactions</div>
                <div className="detail-value highlight">
                  {block.tx_count || 0}
                </div>
              </div>

              <div className="detail-item">
                <div className="detail-label">Total Blobs</div>
                <div className="detail-value">
                  <span className="highlight">{totalBlobs}</span>
                  <span className="detail-context">
                    {" "}
                    / {BLOB_TARGET} target / {BLOB_MAX} max
                  </span>
                </div>
              </div>

              <div className="detail-item">
                <div className="detail-label">Blob Size</div>
                <div className="detail-value">
                  {formatBytes(block.total_blob_size)}
                </div>
              </div>

              <div className="detail-item">
                <div className="detail-label">Blob Gas Price</div>
                <div className="detail-value">
                  {formatGwei(block.gas_price)}
                </div>
              </div>

              <div className="detail-item">
                <div className="detail-label">Blob Gas Used</div>
                <div className="detail-value">
                  {formatNumber(blobGasUsed)}
                  <span className="usage-percent"> / {blobGasPercent}%</span>
                  <div
                    className="target-diff"
                    style={{
                      color:
                        targetDiff >= 0
                          ? "var(--accent-green)"
                          : "var(--accent-red)",
                    }}
                  >
                    {targetDiffSign}
                    {targetDiff}% vs Target
                  </div>
                </div>
              </div>

              <div className="detail-item">
                <div className="detail-label">Excess Blob Gas</div>
                <div className="detail-value">
                  {formatNumber(excessBlobGas)}
                </div>
              </div>
            </div>

            {block.transactions && block.transactions.length > 0 && (
              <div className="tx-list">
                <h3 className="tx-list-title">
                  Transactions ({block.transactions.length})
                </h3>
                <div className="tx-items">
                  {block.transactions.map((tx, index) => (
                    <div key={index} className="tx-item">
                      <div className="tx-header">
                        <a
                          href={`https://etherscan.io/tx/${tx.tx_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="tx-hash mono tx-hash-link"
                        >
                          {truncateHash(tx.tx_hash, 10, 8)}
                        </a>
                        <ChainBadge chainName={tx.chain} size="sm" />
                      </div>
                      <div className="tx-details">
                        <span className="tx-detail">
                          <span className="tx-detail-label">Blobs:</span>
                          <span className="tx-detail-value">
                            {tx.blob_count || 0}
                          </span>
                        </span>
                        <span className="tx-detail">
                          <span className="tx-detail-label">Size:</span>
                          <span className="tx-detail-value">
                            {formatBytes(tx.blob_size)}
                          </span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          z-index: 1000;
          animation: fadeIn 0.2s ease-out;
        }

        .modal {
          background: var(--bg-secondary);
          border: 1px solid var(--border-primary);
          border-radius: 16px;
          max-width: 700px;
          width: 100%;
          max-height: 90vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
          animation: slideUp 0.3s ease-out;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid var(--border-primary);
          background: var(--bg-card);
        }

        .modal-header-left {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .modal-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .modal-close {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-primary);
          border-radius: 6px;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s;
        }

        .modal-close:hover {
          background: var(--bg-hover);
          border-color: var(--border-secondary);
          color: var(--text-primary);
        }

        .modal-body {
          padding: 1.5rem;
          overflow-y: auto;
          flex: 1;
        }

        .metrics-banner {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
          margin-bottom: 1.5rem;
          padding: 1rem;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-primary);
          border-radius: 12px;
        }

        .metric-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .metric-label {
          font-size: 0.625rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-tertiary);
        }

        .metric-value {
          font-size: 1.25rem;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
        }

        .metric-description {
          font-size: 0.625rem;
          color: var(--text-secondary);
        }

        .metric-bar {
          height: 4px;
          background: var(--border-primary);
          border-radius: 2px;
          position: relative;
          overflow: visible;
          margin-top: 0.25rem;
        }

        .metric-bar-fill {
          height: 100%;
          border-radius: 2px;
          transition: width 0.3s ease;
        }

        .metric-bar-marker {
          position: absolute;
          top: -2px;
          bottom: -2px;
          left: 50%;
          width: 2px;
          background: var(--text-secondary);
          opacity: 0.5;
          transform: translateX(-50%);
        }

        .detail-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .detail-item {
          background: var(--bg-tertiary);
          border: 1px solid var(--border-primary);
          border-radius: 8px;
          padding: 1rem;
        }

        .detail-label {
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-secondary);
          margin-bottom: 0.5rem;
        }

        .detail-value {
          font-size: 0.95rem;
          font-weight: 500;
          color: var(--text-primary);
          word-break: break-all;
        }

        .detail-value.highlight {
          color: var(--accent-purple);
          font-weight: 600;
        }

        .detail-context {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .usage-percent {
          color: var(--text-secondary);
          font-size: 0.85rem;
          margin-left: 0.25rem;
        }

        .target-diff {
          font-size: 0.75rem;
          margin-top: 0.25rem;
          font-weight: 600;
        }

        .tx-list {
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid var(--border-primary);
        }

        .tx-list-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-secondary);
          margin-bottom: 1rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .tx-items {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .tx-item {
          background: var(--bg-tertiary);
          border: 1px solid var(--border-primary);
          border-radius: 8px;
          padding: 1rem;
          transition: all 0.2s;
        }

        .tx-item:hover {
          border-color: var(--border-secondary);
          background: var(--bg-hover);
        }

        .tx-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
          gap: 1rem;
        }

        .tx-hash {
          font-size: 0.875rem;
          color: var(--accent-cyan);
        }

        .mono {
          font-family:
            "JetBrains Mono", "SF Mono", Monaco, "Cascadia Code", monospace;
        }

        .tx-details {
          display: flex;
          gap: 1.5rem;
          flex-wrap: wrap;
        }

        .tx-detail {
          display: flex;
          gap: 0.375rem;
          font-size: 0.8rem;
        }

        .tx-detail-label {
          color: var(--text-tertiary);
        }

        .tx-detail-value {
          color: var(--text-secondary);
          font-weight: 500;
        }

        .block-number-link,
        .block-number-link:link,
        .block-number-link:visited,
        .block-number-link:hover,
        .block-number-link:active {
          text-decoration: none;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
          border-bottom: none;
        }

        .block-number-link:hover {
          opacity: 0.8;
        }

        .tx-hash-link,
        .tx-hash-link:link,
        .tx-hash-link:visited,
        .tx-hash-link:hover,
        .tx-hash-link:active {
          text-decoration: none;
          cursor: pointer;
          transition: color 0.2s;
          border: none;
          border-bottom: none;
          outline: none;
          background: none;
          display: inline;
        }

        .tx-hash-link:hover {
          color: var(--accent-cyan);
          opacity: 0.8;
        }

        @media (max-width: 768px) {
          .modal-overlay {
            padding: 1rem;
          }

          .modal {
            max-height: 95vh;
            border-radius: 12px;
          }

          .modal-header {
            padding: 1rem;
          }

          .modal-header-left {
            flex-wrap: wrap;
            gap: 0.5rem;
          }

          .modal-title {
            font-size: 1rem;
          }

          .modal-body {
            padding: 1rem;
          }

          .metrics-banner {
            grid-template-columns: 1fr;
            gap: 0.75rem;
          }

          .detail-grid {
            grid-template-columns: 1fr;
            gap: 0.75rem;
          }

          .detail-item {
            padding: 0.75rem;
          }

          .tx-item {
            padding: 0.75rem;
          }

          .tx-details {
            gap: 1rem;
          }
        }
      `}</style>
    </>
  );
}

export default BlockModal;
