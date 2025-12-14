import { X } from "lucide-react";
import {
  formatNumber,
  formatBytes,
  formatGwei,
  formatTimestamp,
  truncateHash,
} from "../utils/format";
import ChainBadge from "./ChainBadge";

// BPO1 constants
const BPO1_TARGET_BLOBS_PER_BLOCK = 10;
const BPO1_MAX_BLOBS_PER_BLOCK = 15;
const DATA_GAS_PER_BLOB = 131072;

function BlockModal({ block, onClose }) {
  if (!block) return null;

  // Calculate blob gas statistics
  const targetGas = BPO1_TARGET_BLOBS_PER_BLOCK * DATA_GAS_PER_BLOB;
  const maxGas = BPO1_MAX_BLOBS_PER_BLOCK * DATA_GAS_PER_BLOB;
  const blobGasUsed = block.gas_used || 0;
  const excessBlobGas = block.excess_blob_gas || 0;

  // Blob Gas percentage (of max)
  const blobGasPercent = ((blobGasUsed / maxGas) * 100).toFixed(2);

  // Difference from target (as percentage)
  const targetDiff = (((blobGasUsed - targetGas) / targetGas) * 100).toFixed(2);
  const targetDiffSign = targetDiff >= 0 ? "+" : "";

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
            <h2 className="modal-title">Block Details</h2>
            <button
              className="modal-close"
              onClick={onClose}
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>

          <div className="modal-body">
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
                <div className="detail-value highlight">
                  {block.total_blobs || 0}
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
                    {targetDiff}% Blob Gas Target
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
          color: var(--text-tertiary);
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

        .detail-info-icon {
          display: inline-block;
          margin-left: 0.375rem;
          font-size: 0.75rem;
          color: var(--text-tertiary);
          cursor: help;
          opacity: 0.7;
          transition: opacity 0.2s;
        }

        .detail-info-icon:hover {
          opacity: 1;
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

        .block-number-link {
          text-decoration: none;
          cursor: pointer;
          transition: all 0.2s;
          border-bottom: 2px solid transparent;
        }

        .block-number-link:hover {
          border-bottom-color: var(--accent-purple);
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

          .modal-title {
            font-size: 1rem;
          }

          .modal-body {
            padding: 1rem;
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
