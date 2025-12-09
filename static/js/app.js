// Constants
const POLL_INTERVAL = 3000;
const BLOB_SIZE_BYTES = 131072; // 128 KiB per blob

// State
let blobsChart, gasChart, chainChart;
let selectedHours = 1;
let blocksData = [];

// Chart configuration
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    intersect: false,
    mode: "index",
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      enabled: true,
      backgroundColor: "#1e1e2e",
      borderColor: "#45475a",
      borderWidth: 1,
      titleColor: "#cdd6f4",
      bodyColor: "#a6adc8",
      padding: 10,
      displayColors: false,
      callbacks: {
        title: (ctx) => `Block ${ctx[0].label}`,
      },
    },
  },
  scales: {
    x: {
      display: false,
      grid: { display: false },
    },
    y: {
      grid: { color: "#313244" },
      ticks: { color: "#a6adc8" },
    },
  },
  elements: {
    point: { radius: 0, hoverRadius: 5 },
    line: { tension: 0.3 },
  },
};

// Initialize charts
function initCharts() {
  const blobsCtx = document.getElementById("blobs-chart").getContext("2d");
  blobsChart = new Chart(blobsCtx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          data: [],
          borderColor: "#94e2d5",
          backgroundColor: "rgba(148, 226, 213, 0.1)",
          fill: true,
          borderWidth: 2,
        },
      ],
    },
    options: {
      ...chartOptions,
      scales: {
        ...chartOptions.scales,
        y: {
          ...chartOptions.scales.y,
          beginAtZero: true,
          suggestedMax: 10,
          ticks: {
            ...chartOptions.scales.y.ticks,
            stepSize: 1,
            precision: 0,
          },
        },
      },
    },
  });

  const gasCtx = document.getElementById("gas-chart").getContext("2d");
  gasChart = new Chart(gasCtx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          data: [],
          borderColor: "#f9e2af",
          backgroundColor: "rgba(249, 226, 175, 0.1)",
          fill: true,
          borderWidth: 2,
        },
      ],
    },
    options: {
      ...chartOptions,
      scales: {
        ...chartOptions.scales,
        y: {
          ...chartOptions.scales.y,
          beginAtZero: false,
          ticks: {
            ...chartOptions.scales.y.ticks,
            precision: 4,
            callback: (value) => value.toFixed(4),
          },
        },
      },
    },
  });

  const chainCtx = document.getElementById("chain-chart").getContext("2d");
  chainChart = new Chart(chainCtx, {
    type: "bar",
    data: {
      labels: [],
      datasets: [
        {
          label: "Blobs",
          data: [],
          backgroundColor: [
            "#0052ff",
            "#f38ba8",
            "#28a0f0",
            "#fab387",
            "#cba6f7",
            "#b4befe",
            "#61dfff",
            "#e81899",
            "#585b70",
          ],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          backgroundColor: "#1e1e2e",
          borderColor: "#45475a",
          borderWidth: 1,
          titleColor: "#cdd6f4",
          bodyColor: "#a6adc8",
          padding: 10,
          callbacks: {
            label: (ctx) => `${ctx.label}: ${ctx.raw.toFixed(2)}%`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: "#a6adc8" },
        },
        y: {
          grid: { color: "#313244" },
          ticks: {
            color: "#a6adc8",
            callback: (value) => value + "%",
          },
          beginAtZero: true,
        },
      },
    },
  });
}

// Formatting utilities
function formatNumber(n) {
  return new Intl.NumberFormat().format(n);
}

function formatGwei(wei) {
  const gwei = wei / 1e9;
  if (gwei < 0.0001) {
    return gwei.toExponential(2) + " Gwei";
  }
  return gwei.toFixed(4) + " Gwei";
}

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KiB", "MiB", "GiB", "TiB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function formatTimeAgo(timestamp) {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatTimestamp(timestamp) {
  return new Date(timestamp * 1000).toLocaleString();
}

function truncateHash(hash) {
  return hash.slice(0, 10) + "..." + hash.slice(-8);
}

function truncateAddress(addr) {
  return addr.slice(0, 10) + "..." + addr.slice(-8);
}

function getChainBadgeClass(chain) {
  const normalized = chain.toLowerCase().replace(/\s+/g, "");
  if (normalized.includes("base")) return "chain-base";
  if (normalized.includes("optimism")) return "chain-optimism";
  if (normalized.includes("arbitrum")) return "chain-arbitrum";
  if (normalized.includes("scroll")) return "chain-scroll";
  if (normalized.includes("starknet")) return "chain-starknet";
  if (normalized.includes("zksync")) return "chain-zksync";
  if (normalized.includes("linea")) return "chain-linea";
  if (normalized.includes("taiko")) return "chain-taiko";
  if (normalized.includes("blast")) return "chain-blast";
  if (normalized.includes("zora")) return "chain-zora";
  if (normalized.includes("mode")) return "chain-mode";
  return "chain-other";
}

// Calculate slot from block number (approximation)
function getSlotFromBlock(blockNumber) {
  const mergeBlock = 15537393;
  const mergeSlot = 4700013;
  return mergeSlot + (blockNumber - mergeBlock);
}

// Modal functions
function showBlockModal(block) {
  const modal = document.getElementById("block-modal");
  const modalBody = document.getElementById("modal-body");
  const slot = getSlotFromBlock(block.block_number);

  modalBody.innerHTML = `
        <div class="detail-grid">
            <div class="detail-item">
                <div class="detail-label">Block Height</div>
                <div class="detail-value">
                    <a href="https://lab.ethpandaops.io/ethereum/slots/${slot}?tab=block" target="_blank">${formatNumber(block.block_number)}</a>
                </div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Slot</div>
                <div class="detail-value">
                    <a href="https://lab.ethpandaops.io/ethereum/slots/${slot}" target="_blank">${formatNumber(slot)}</a>
                </div>
            </div>
            <div class="detail-item full-width">
                <div class="detail-label">Timestamp</div>
                <div class="detail-value">${formatTimeAgo(block.block_timestamp)} (${formatTimestamp(block.block_timestamp)})</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Blob Transactions</div>
                <div class="detail-value">${block.tx_count}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Total Blobs</div>
                <div class="detail-value">${block.total_blobs}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Blob Size</div>
                <div class="detail-value">${formatBytes(block.total_blob_size)} (${block.total_blobs} blobs)</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Blob Gas Used</div>
                <div class="detail-value">${formatNumber(block.gas_used)}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Blob Gas Price</div>
                <div class="detail-value">${formatGwei(block.gas_price)}</div>
            </div>
        </div>
        <div style="margin-top: 1rem; text-align: center;">
            <a href="https://etherscan.io/block/${block.block_number}" target="_blank" style="color: var(--ctp-sapphire); font-size: 0.85rem;">
                View on Etherscan
            </a>
        </div>
    `;
  modal.classList.add("open");
}

function closeModal() {
  document.getElementById("block-modal").classList.remove("open");
}

// Data fetching functions
async function fetchStats() {
  try {
    const res = await fetch("/api/stats");
    const data = await res.json();

    document.getElementById("total-blobs").textContent = formatNumber(
      data.total_blobs,
    );
    document.getElementById("total-blob-size").textContent = formatBytes(
      data.total_blobs * BLOB_SIZE_BYTES,
    );
    document.getElementById("avg-blobs").textContent =
      data.avg_blobs_per_block.toFixed(2);
    document.getElementById("latest-block").textContent = data.latest_block
      ? formatNumber(data.latest_block)
      : "-";
    document.getElementById("avg-gas").textContent = formatGwei(
      data.avg_gas_price,
    );
  } catch (e) {
    console.error("Failed to fetch stats:", e);
  }
}

async function fetchBlocks() {
  try {
    const res = await fetch("/api/blocks");
    blocksData = await res.json();

    const tbody = document.getElementById("blocks-table");
    tbody.innerHTML = blocksData
      .map(
        (b, idx) => `
                <tr class="clickable" data-block-idx="${idx}">
                    <td class="number">${formatNumber(b.block_number)}</td>
                    <td>${formatTimeAgo(b.block_timestamp)}</td>
                    <td>${b.tx_count}</td>
                    <td>${b.total_blobs}</td>
                    <td>${formatBytes(b.total_blob_size)}</td>
                    <td>${formatGwei(b.gas_price)}</td>
                </tr>
            `,
      )
      .join("");

    // Add click handlers
    tbody.querySelectorAll("tr.clickable").forEach((row) => {
      row.addEventListener("click", () => {
        const idx = parseInt(row.dataset.blockIdx);
        showBlockModal(blocksData[idx]);
      });
    });
  } catch (e) {
    console.error("Failed to fetch blocks:", e);
  }
}

async function fetchSenders() {
  try {
    const res = await fetch("/api/senders");
    const senders = await res.json();

    const tbody = document.getElementById("senders-table");
    tbody.innerHTML = senders
      .map(
        (s) => `
                <tr>
                    <td><span class="chain-badge ${getChainBadgeClass(s.chain)}">${s.chain}</span></td>
                    <td class="address" title="${s.address}">${truncateAddress(s.address)}</td>
                    <td>${formatNumber(s.tx_count)}</td>
                    <td>${formatNumber(s.total_blobs)}</td>
                    <td>${formatBytes(s.total_blob_size)}</td>
                </tr>
            `,
      )
      .join("");
  } catch (e) {
    console.error("Failed to fetch senders:", e);
  }
}

async function fetchChartData() {
  try {
    const res = await fetch(`/api/chart?hours=${selectedHours}`);
    const data = await res.json();

    blobsChart.data.labels = data.labels;
    blobsChart.data.datasets[0].data = data.blobs;
    blobsChart.update("none");

    gasChart.data.labels = data.labels;
    gasChart.data.datasets[0].data = data.gas_prices;
    gasChart.update("none");
  } catch (e) {
    console.error("Failed to fetch chart data:", e);
  }
}

async function fetchChainStats() {
  try {
    const res = await fetch(`/api/chain-stats?hours=${selectedHours}`);
    const data = await res.json();

    chainChart.data.labels = data.map((d) => d.chain);
    chainChart.data.datasets[0].data = data.map((d) => d.percentage);
    chainChart.update("none");
  } catch (e) {
    console.error("Failed to fetch chain stats:", e);
  }
}

async function fetchBlobTransactions() {
  try {
    const res = await fetch("/api/blob-transactions");
    const txs = await res.json();

    const tbody = document.getElementById("blob-txs-table");
    tbody.innerHTML = txs
      .map(
        (tx) => `
                <tr>
                    <td class="address" title="${tx.tx_hash}">${truncateHash(tx.tx_hash)}</td>
                    <td class="number">${formatNumber(tx.block_number)}</td>
                    <td><span class="chain-badge ${getChainBadgeClass(tx.chain)}">${tx.chain}</span></td>
                    <td>${tx.blob_count}</td>
                    <td>${formatBytes(tx.blob_size)}</td>
                    <td>${formatGwei(tx.gas_price)}</td>
                </tr>
            `,
      )
      .join("");
  } catch (e) {
    console.error("Failed to fetch blob transactions:", e);
  }
}

function updateTimestamp() {
  const now = new Date().toLocaleTimeString();
  document.getElementById("last-update").textContent = `Updated ${now}`;
}

async function refresh() {
  await Promise.all([
    fetchStats(),
    fetchBlocks(),
    fetchSenders(),
    fetchChartData(),
    fetchChainStats(),
    fetchBlobTransactions(),
  ]);
  updateTimestamp();
}

// Initialize time picker
function initTimePicker() {
  const timePickerBtn = document.getElementById("time-picker-btn");
  const timePickerDropdown = document.getElementById("time-picker-dropdown");
  const timePickerLabel = document.getElementById("time-picker-label");
  const timePickerOptions = document.querySelectorAll(".time-picker-option");

  timePickerBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    timePickerDropdown.classList.toggle("open");
  });

  document.addEventListener("click", () => {
    timePickerDropdown.classList.remove("open");
  });

  timePickerOptions.forEach((option) => {
    option.addEventListener("click", (e) => {
      e.stopPropagation();
      const hours = parseInt(option.dataset.hours);
      const label = option.dataset.label;

      selectedHours = hours;
      timePickerLabel.textContent = label;

      timePickerOptions.forEach((opt) => opt.classList.remove("active"));
      option.classList.add("active");

      timePickerDropdown.classList.remove("open");

      fetchChartData();
      fetchChainStats();
    });
  });
}

// Initialize modal handlers
function initModal() {
  document.getElementById("modal-close").addEventListener("click", closeModal);
  document.getElementById("block-modal").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });
}

// Initialize app
function init() {
  initCharts();
  initTimePicker();
  initModal();
  refresh();
  setInterval(refresh, POLL_INTERVAL);
}

// Start when DOM is ready
document.addEventListener("DOMContentLoaded", init);
