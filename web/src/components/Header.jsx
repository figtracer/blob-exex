import { useState, useRef, useEffect } from "react";
import { Search, Clock } from "lucide-react";

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
  const dropdownRef = useRef(null);

  const handleSearch = (e) => {
    e.preventDefault();
    const blockNumber = parseInt(searchValue);
    if (!isNaN(blockNumber) && blockNumber > 0) {
      onSearch(blockNumber);
      setSearchValue("");
    }
  };

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
            <div className="logo">BLOBSGURU</div>
            <form className="search-form" onSubmit={handleSearch}>
              <input
                type="text"
                className="search-input"
                placeholder="Search block number..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
              />
              <button type="submit" className="search-button">
                <Search size={16} />
              </button>
            </form>
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

        .logo {
          font-family: "Space Grotesk", sans-serif;
          font-size: 1.5rem;
          font-weight: 700;
          letter-spacing: 1px;
          background: linear-gradient(
            135deg,
            var(--accent-purple) 0%,
            var(--accent-pink) 100%
          );
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          white-space: nowrap;
        }

        .search-form {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          max-width: 300px;
          width: 100%;
        }

        .search-input {
          flex: 1;
          padding: 0.5rem 0.75rem;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-primary);
          border-radius: 6px;
          color: var(--text-primary);
          font-size: 0.875rem;
          transition: all 0.2s;
        }

        .search-input:hover {
          border-color: var(--border-secondary);
        }

        .search-input:focus {
          outline: none;
          border-color: var(--accent-purple);
          background: var(--bg-card);
        }

        .search-input::placeholder {
          color: var(--text-tertiary);
        }

        .search-button {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.5rem;
          background: var(--accent-purple);
          border: none;
          border-radius: 6px;
          color: var(--bg-primary);
          cursor: pointer;
          transition: all 0.2s;
        }

        .search-button:hover {
          background: var(--accent-purple-hover);
          transform: translateY(-1px);
        }

        .search-button:active {
          transform: translateY(0);
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

        .status-text {
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        @media (max-width: 1024px) {
          .header-content {
            padding: 1rem;
            gap: 1rem;
          }

          .search-form {
            max-width: 200px;
          }
        }

        @media (max-width: 768px) {
          .header-content {
            flex-direction: column;
            align-items: stretch;
            gap: 1rem;
          }

          .header-left,
          .header-right {
            width: 100%;
          }

          .header-right {
            justify-content: space-between;
          }

          .search-form {
            max-width: 100%;
          }

          .logo {
            font-size: 1.25rem;
          }
        }
      `}</style>
    </>
  );
}

export default Header;
