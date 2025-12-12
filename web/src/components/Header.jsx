import { useState, useRef, useEffect } from "react";
import { Search, Clock, AlertCircle, Loader2 } from "lucide-react";

const BLOCK_OPTIONS = [
  { value: 50, label: "Last 50 blocks" },
  { value: 100, label: "Last 100 blocks" },
  { value: 200, label: "Last 200 blocks" },
  { value: 500, label: "Last 500 blocks" },
  { value: 1000, label: "Last 1000 blocks" },
  { value: 2000, label: "Last 2000 blocks" },
];

function Header({ onSearch, selectedBlocks, onBlocksChange, lastUpdate }) {
  const [searchValue, setSearchValue] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

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
        setSearchError(`Block #${blockNumber} not found`);
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
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedLabel =
    BLOCK_OPTIONS.find((opt) => opt.value === selectedBlocks)?.label ||
    "Last 100 blocks";

  return (
    <>
      <header className="header">
        <div className="header-content">
          <div className="header-left">
            <div className="search-wrapper">
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
                  />
                  {isSearching && (
                    <Loader2 size={16} className="search-loading" />
                  )}
                </div>
                <button
                  type="submit"
                  className="search-button"
                  disabled={isSearching || !searchValue.trim()}
                >
                  {isSearching ? (
                    <Loader2 size={16} className="spin" />
                  ) : (
                    "Search"
                  )}
                </button>
              </form>
              {searchError && (
                <div className="search-error">
                  <AlertCircle size={14} />
                  <span>{searchError}</span>
                </div>
              )}
            </div>
          </div>

          <div className="header-right">
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
      </header>

      <style jsx>{`
        .header {
          background: var(--bg-secondary);
          border-bottom: 1px solid var(--border-primary);
          position: sticky;
          top: 0;
          z-index: 100;
          backdrop-filter: blur(10px);
        }

        .header-content {
          max-width: 1600px;
          margin: 0 auto;
          padding: 1rem 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 2rem;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 2rem;
          flex: 1;
        }

        .search-wrapper {
          position: relative;
          max-width: 400px;
          width: 100%;
        }

        .search-form {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .search-input-wrapper {
          position: relative;
          flex: 1;
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
          padding: 0.625rem 2.5rem 0.625rem 2.5rem;
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

        .search-button {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.625rem 1rem;
          background: linear-gradient(
            135deg,
            var(--accent-purple) 0%,
            #9333ea 100%
          );
          border: none;
          border-radius: 8px;
          color: white;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
          min-width: 80px;
        }

        .search-button:hover:not(:disabled) {
          background: linear-gradient(
            135deg,
            var(--accent-purple-hover) 0%,
            #a855f7 100%
          );
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(147, 51, 234, 0.3);
        }

        .search-button:active:not(:disabled) {
          transform: translateY(0);
        }

        .search-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .spin {
          animation: spin 1s linear infinite;
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
          font-size: 0.8125rem;
          animation: fadeIn 0.2s ease-out;
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

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 1.5rem;
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

        @media (max-width: 1024px) {
          .header-content {
            padding: 1rem;
            gap: 1rem;
          }

          .search-wrapper {
            max-width: 280px;
          }
        }

        @media (max-width: 768px) {
          .header-content {
            flex-direction: column;
            align-items: stretch;
            gap: 1rem;
          }

          .header-left {
            flex-direction: column;
            align-items: stretch;
            gap: 1rem;
          }

          .header-right {
            width: 100%;
            justify-content: space-between;
          }

          .search-wrapper {
            max-width: 100%;
          }
        }
      `}</style>
    </>
  );
}

export default Header;
