import { useState, useRef, useEffect } from "react";

import { Clock } from "lucide-react";

const BLOCK_OPTIONS = [
  { value: 50, label: "Last 50 blocks" },
  { value: 100, label: "Last 100 blocks" },
  { value: 200, label: "Last 200 blocks" },
  { value: 500, label: "Last 500 blocks" },
  { value: 1000, label: "Last 1000 blocks" },
];

function Header({ selectedBlocks, onBlocksChange, lastUpdate }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const formatLastUpdate = () => {
    if (!lastUpdate) return "Connecting...";
    const seconds = Math.floor((Date.now() - lastUpdate.getTime()) / 1000);
    if (seconds < 5) return "Just now";
    if (seconds < 60) return `${seconds}s ago`;
    return `${Math.floor(seconds / 60)}m ago`;
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedLabel =
    BLOCK_OPTIONS.find((opt) => opt.value === selectedBlocks)?.label ||
    "Last 100 blocks";

  return (
    <>
      <div className="controls-bar">
        <div className="controls-content">
          <div className="controls-left">
            <img
              src="/icons/favicon.png?v=3"
              alt="EXBLOB"
              className="header-favicon"
            />
          </div>

          <div className="controls-right">
            <div className="time-picker" ref={dropdownRef}>
              <button
                className="time-picker-button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                <Clock size={14} />
                <span>{selectedLabel}</span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    transform: dropdownOpen ? "rotate(180deg)" : "none",
                    transition: "transform 0.2s",
                  }}
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>

              {dropdownOpen && (
                <div className="time-picker-dropdown">
                  <div className="dropdown-section">
                    <div className="dropdown-label">Block ranges</div>
                    {BLOCK_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        className={`dropdown-option ${selectedBlocks === option.value ? "active" : ""}`}
                        onClick={() => {
                          onBlocksChange(option.value);
                          setDropdownOpen(false);
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="status">
              <div className="status-dot"></div>
              <span className="status-text">{formatLastUpdate()}</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .controls-bar {
          padding: 0.75rem 0;
        }

        .controls-content {
          max-width: 1600px;
          margin: 0 auto;
          padding: 0 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
        }

        .controls-left {
          display: flex;
          align-items: center;
        }

        .controls-right {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .header-favicon {
          width: 32px;
          height: 32px;
          opacity: 0.8;
          transition: opacity 0.2s;
        }

        .header-favicon:hover {
          opacity: 1;
        }

        .time-picker {
          position: relative;
        }

        .time-picker-button {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.35rem 0.5rem;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-primary);
          border-radius: 6px;
          color: var(--text-primary);
          font-family:
            "Inter",
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            Roboto,
            Oxygen,
            Ubuntu,
            sans-serif;
          font-size: 0.65rem;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .time-picker-button:hover {
          border-color: var(--border-secondary);
          background: var(--bg-card);
        }

        .time-picker-dropdown {
          position: absolute;
          top: calc(100% + 0.5rem);
          right: 0;
          min-width: 160px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-primary);
          border-radius: 8px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
          z-index: 1000;
          animation: fadeIn 0.15s ease-out;
        }

        .dropdown-section {
          padding: 0.25rem 0;
        }

        .dropdown-label {
          padding: 0.375rem 0.75rem;
          font-size: 0.6875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-tertiary);
        }

        .dropdown-option {
          display: block;
          width: 100%;
          padding: 0.4rem 0.75rem;
          background: none;
          border: none;
          text-align: left;
          color: var(--text-secondary);
          font-family:
            "Inter",
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            Roboto,
            Oxygen,
            Ubuntu,
            sans-serif;
          font-size: 0.8125rem;
          cursor: pointer;
          transition: all 0.15s;
        }

        .dropdown-option:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .dropdown-option.active {
          background: var(--bg-hover);
          color: #3b82f6;
        }

        .status {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          background: #10b981;
          border-radius: 50%;
          animation: pulse 2s infinite;
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

        .status-text {
          font-size: 0.73rem;
          color: var(--text-secondary);
        }

        @media (max-width: 768px) {
          .controls-content {
            padding: 0 1rem;
            gap: 0.75rem;
            flex-direction: column;
          }

          .controls-right {
            width: 100%;
            justify-content: space-between;
          }
        }
      `}</style>
    </>
  );
}

export default Header;
