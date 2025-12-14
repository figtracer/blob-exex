import { useState, useRef, useEffect } from "react";
import { Search, Clock, Info, Loader2 } from "lucide-react";

const BLOCK_OPTIONS = [
  { value: 50, label: "Last 50 blocks" },
  { value: 100, label: "Last 100 blocks" },
  { value: 200, label: "Last 200 blocks" },
  { value: 500, label: "Last 500 blocks" },
  { value: 1000, label: "Last 1000 blocks" },
];

function Header({
  onSearch,
  selectedBlocks,
  onBlocksChange,
  lastUpdate,
  stats,
}) {
  const [searchValue, setSearchValue] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const infoRef = useRef(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    const blockNumber = parseInt(searchValue);

    // Clear previous error
    setSearchError("");

    if (isNaN(blockNumber) || blockNumber <= 0) {
      setSearchError("Please enter a valid block number");
      return;
    }

    setIsSearching(true);

    try {
      const result = await onSearch(blockNumber);
      if (result === false) {
        // Show a more helpful error message with available block range
        if (stats?.earliest_block && stats?.latest_block) {
          if (blockNumber < stats.earliest_block) {
            setSearchError(
              `Block #${blockNumber} not found. First available: ${stats.earliest_block.toLocaleString()}`,
            );
          } else if (blockNumber > stats.latest_block) {
            setSearchError(
              `Block #${blockNumber} not found. Latest: ${stats.latest_block.toLocaleString()}`,
            );
          } else {
            setSearchError(`Block #${blockNumber} not found in database`);
          }
        } else {
          setSearchError(`Block #${blockNumber} not found`);
        }
      } else {
        setSearchValue("");
      }
    } catch (error) {
      setSearchError("Failed to search block");
    } finally {
      setIsSearching(false);
    }
  };

  // Clear error after 4 seconds
  useEffect(() => {
    if (searchError) {
      const timer = setTimeout(() => setSearchError(""), 4000);
      return () => clearTimeout(timer);
    }
  }, [searchError]);

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
      if (infoRef.current && !infoRef.current.contains(event.target)) {
        setShowInfoTooltip(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedLabel =
    BLOCK_OPTIONS.find((opt) => opt.value === selectedBlocks)?.label ||
    "Last 100 blocks";

  const blockRangeInfo =
    stats?.earliest_block && stats?.latest_block
      ? `Available blocks: ${stats.earliest_block.toLocaleString()} - ${stats.latest_block.toLocaleString()}`
      : "Loading block range...";

  return (
    <>
      <div className="controls-bar">
        <div className="controls-content">
          <div className="search-container">
            <form className="search-form" onSubmit={handleSearch}>
              <div className="search-input-wrapper">
                <Search size={16} className="search-icon" />
                <input
                  ref={searchInputRef}
                  type="text"
                  className={`search-input ${searchError ? "has-error" : ""}`}
                  placeholder="Search block number..."
                  value={searchValue}
                  onChange={(e) => {
                    setSearchValue(e.target.value);
                    setSearchError("");
                  }}
                  disabled={isSearching}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSearch(e);
                    }
                  }}
                />
                {isSearching && (
                  <Loader2 size={16} className="search-loading" />
                )}
              </div>
            </form>

            <div className="info-wrapper" ref={infoRef}>
              <button
                className="info-button"
                onClick={() => setShowInfoTooltip(!showInfoTooltip)}
                onMouseEnter={() => setShowInfoTooltip(true)}
                onMouseLeave={() => setShowInfoTooltip(false)}
                aria-label="Block range info"
              >
                <Info size={16} />
              </button>
              {showInfoTooltip && (
                <div className="info-tooltip">{blockRangeInfo}</div>
              )}
            </div>

            {searchError && (
              <div className="search-error">
                <span>{searchError}</span>
              </div>
            )}
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
          gap: 1.5rem;
        }

        .search-container {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          position: relative;
          flex: 1;
          max-width: 400px;
        }

        .search-form {
          flex: 1;
        }

        .search-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-icon {
          position: absolute;
          left: 12px;
          color: var(--text-tertiary);
          pointer-events: none;
        }

        .search-loading {
          position: absolute;
          right: 12px;
          color: var(--accent-purple);
          animation: spin 1s linear infinite;
        }

        .search-input {
          width: 100%;
          padding: 0.5rem 2.5rem 0.5rem 2.5rem;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-primary);
          border-radius: 8px;
          color: var(--text-primary);
          font-size: 0.875rem;
          transition: all 0.2s;
        }

        .search-input:hover:not(:disabled) {
          border-color: var(--border-secondary);
          background: var(--bg-card);
        }

        .search-input:focus {
          outline: none;
          border-color: var(--accent-purple);
          background: var(--bg-card);
          box-shadow: 0 0 0 3px rgba(167, 139, 250, 0.1);
        }

        .search-input::placeholder {
          color: var(--text-tertiary);
        }

        .search-input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .search-input.has-error {
          border-color: var(--error);
          background: rgba(239, 68, 68, 0.05);
        }

        .info-wrapper {
          position: relative;
        }

        .info-button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-primary);
          border-radius: 6px;
          color: var(--text-tertiary);
          cursor: pointer;
          transition: all 0.2s;
        }

        .info-button:hover {
          border-color: var(--border-secondary);
          color: var(--text-secondary);
          background: var(--bg-card);
        }

        .info-tooltip {
          position: absolute;
          top: calc(100% + 0.5rem);
          left: 50%;
          transform: translateX(-50%);
          padding: 0.5rem 0.75rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border-primary);
          border-radius: 6px;
          color: var(--text-secondary);
          font-size: 0.75rem;
          white-space: nowrap;
          z-index: 100;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          animation: fadeIn 0.15s ease-out;
        }

        .info-tooltip::before {
          content: "";
          position: absolute;
          top: -5px;
          left: 50%;
          transform: translateX(-50%);
          border-left: 5px solid transparent;
          border-right: 5px solid transparent;
          border-bottom: 5px solid var(--border-primary);
        }

        .search-error {
          position: absolute;
          top: calc(100% + 0.5rem);
          left: 0;
          right: 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 6px;
          color: var(--error);
          font-size: 0.75rem;
          animation: fadeIn 0.2s ease-out;
          z-index: 50;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .info-tooltip {
          animation: fadeInTooltip 0.15s ease-out;
        }

        @keyframes fadeInTooltip {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .controls-right {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .time-picker {
          position: relative;
        }

        .time-picker-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
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
          font-size: 0.875rem;
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
          min-width: 200px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-primary);
          border-radius: 8px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
          z-index: 1000;
          animation: fadeIn 0.15s ease-out;
        }

        .dropdown-section {
          padding: 0.5rem 0;
        }

        .dropdown-label {
          padding: 0.5rem 1rem;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-tertiary);
        }

        .dropdown-option {
          display: block;
          width: 100%;
          padding: 0.5rem 1rem;
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
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.15s;
        }

        .dropdown-option:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .dropdown-option.active {
          background: var(--bg-hover);
          color: var(--accent-purple);
        }

        .status {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          background: var(--success);
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
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        @media (max-width: 768px) {
          .controls-content {
            padding: 0 1rem;
            flex-direction: column;
            align-items: stretch;
            gap: 0.75rem;
          }

          .search-container {
            max-width: 100%;
          }

          .controls-right {
            justify-content: space-between;
          }
        }
      `}</style>
    </>
  );
}

export default Header;
