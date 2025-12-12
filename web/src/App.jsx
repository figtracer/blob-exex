import { useState, useEffect } from "react";
import Header from "./components/Header";
import StatsGrid from "./components/StatsGrid";
import ChartsSection from "./components/ChartsSection";
import TablesSection from "./components/TablesSection";
import BlockModal from "./components/BlockModal";

function App() {
  const [stats, setStats] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [senders, setSenders] = useState([]);
  const [chartData, setChartData] = useState(null);
  const [chainStats, setChainStats] = useState([]);
  const [blobTransactions, setBlobTransactions] = useState([]);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [selectedBlocks, setSelectedBlocks] = useState(100);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all data
  const fetchData = async () => {
    try {
      const [statsRes, blocksRes, sendersRes, chartRes, chainRes, txsRes] =
        await Promise.all([
          fetch("/api/stats"),
          fetch("/api/blocks"),
          fetch("/api/senders"),
          fetch(`/api/chart?blocks=${selectedBlocks}`),
          fetch("/api/chain-stats"),
          fetch("/api/blob-transactions"),
        ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (blocksRes.ok) setBlocks(await blocksRes.json());
      if (sendersRes.ok) setSenders(await sendersRes.json());
      if (chartRes.ok) setChartData(await chartRes.json());
      if (chainRes.ok) setChainStats(await chainRes.json());
      if (txsRes.ok) setBlobTransactions(await txsRes.json());

      setLastUpdate(new Date());
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      setIsLoading(false);
    }
  };

  // Initial fetch and polling
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [selectedBlocks]);

  // Search for a block
  const handleBlockSearch = async (blockNumber) => {
    try {
      const res = await fetch(`/api/block?number=${blockNumber}`);
      if (res.ok) {
        const block = await res.json();
        setSelectedBlock(block);
      } else {
        alert("Block not found");
      }
    } catch (error) {
      console.error("Error searching block:", error);
      alert("Error searching block");
    }
  };

  return (
    <div className="app">
      <Header
        onSearch={handleBlockSearch}
        selectedBlocks={selectedBlocks}
        onBlocksChange={setSelectedBlocks}
        lastUpdate={lastUpdate}
      />

      <main className="main-content">
        {isLoading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading data...</p>
          </div>
        ) : (
          <>
            <StatsGrid stats={stats} />
            <ChartsSection chartData={chartData} chainStats={chainStats} />
            <TablesSection
              blocks={blocks}
              senders={senders}
              blobTransactions={blobTransactions}
              onBlockClick={setSelectedBlock}
            />
          </>
        )}
      </main>

      {selectedBlock && (
        <BlockModal
          block={selectedBlock}
          onClose={() => setSelectedBlock(null)}
        />
      )}

      <style jsx>{`
        .app {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        .main-content {
          flex: 1;
          max-width: 1600px;
          width: 100%;
          margin: 0 auto;
          padding: 2rem;
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 60vh;
          gap: 1rem;
          color: var(--text-secondary);
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid var(--border-accent);
          border-top-color: var(--accent-purple);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @media (max-width: 768px) {
          .main-content {
            padding: 1rem;
          }
        }
      `}</style>
    </div>
  );
}

export default App;
