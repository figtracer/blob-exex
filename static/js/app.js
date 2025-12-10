// Constants
const POLL_INTERVAL = 3000;
const BLOB_SIZE_BYTES = 131072; // 128 KiB per blob

// State
let blobsChart, gasChart, chainChart;
let selectedBlocks = 100;
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
      enabled: false,
      external: customTooltip,
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

// Track mouse Y position for dampened tooltip movement
let mouseY = 0;
document.addEventListener("mousemove", (e) => {
  mouseY = e.clientY;
});

// Custom tooltip function that follows mouse with dampening
function customTooltip(context) {
  let tooltipEl = document.getElementById("chartjs-tooltip");

  if (!tooltipEl) {
    tooltipEl = document.createElement("div");
    tooltipEl.id = "chartjs-tooltip";
    tooltipEl.style.background = "#1e1e2e";
    tooltipEl.style.borderRadius = "4px";
    tooltipEl.style.color = "#cdd6f4";
    tooltipEl.style.opacity = 1;
    tooltipEl.style.pointerEvents = "none";
    tooltipEl.style.position = "absolute";
    tooltipEl.style.transform = "translate(-50%, -100%)";
    tooltipEl.style.border = "1px solid #45475a";
    tooltipEl.style.padding = "8px 12px";
    tooltipEl.style.fontSize = "0.8rem";
    tooltipEl.style.zIndex = "1000";
    tooltipEl.style.whiteSpace = "nowrap";
    document.body.appendChild(tooltipEl);
  }

  const tooltipModel = context.tooltip;
  if (tooltipModel.opacity === 0) {
    tooltipEl.style.opacity = 0;
    return;
  }

  if (tooltipModel.body) {
    const titleLines = tooltipModel.title || [];
    const bodyLines = tooltipModel.body.map((b) => b.lines);

    let innerHtml = "<div>";

    titleLines.forEach((title) => {
      innerHtml += `<div style="color: #a6adc8; margin-bottom: 4px; font-size: 0.75rem;">${title}</div>`;
    });

    bodyLines.forEach((body, i) => {
      innerHtml += `<div style="font-weight: 600;">${body}</div>`;
    });

    innerHtml += "</div>";
    tooltipEl.innerHTML = innerHtml;
  }

  const position = context.chart.canvas.getBoundingClientRect();
  const chartTop = position.top + window.pageYOffset;
  const chartBottom = position.bottom + window.pageYOffset;
  const chartHeight = chartBottom - chartTop;

  // Dampen vertical movement - tooltip moves only 30% of the chart height
  // centered around the middle of the chart
  const chartMiddle = chartTop + chartHeight * 0.4;
  const dampening = 0.3;
  const mouseOffset = (mouseY + window.pageYOffset - chartMiddle) * dampening;
  const tooltipY = chartMiddle + mouseOffset - 20;

  // Clamp to stay within chart bounds
  const clampedY = Math.max(
    chartTop + 10,
    Math.min(chartBottom - 60, tooltipY),
  );

  tooltipEl.style.opacity = 1;
  tooltipEl.style.left =
    position.left + window.pageXOffset + tooltipModel.caretX + "px";
  tooltipEl.style.top = clampedY + "px";
}

// Initialize charts
function initCharts() {
  const blobsCtx = document.getElementById("blobs-chart").getContext("2d");
  blobsChart = new Chart(blobsCtx, {
    type: "bar",
    data: {
      labels: [],
      datasets: [
        {
          data: [],
          backgroundColor: "rgba(148, 226, 213, 0.7)",
          borderColor: "#94e2d5",
          borderWidth: 0,
          borderRadius: 1,
          barPercentage: 1.0,
          categoryPercentage: 1.0,
        },
      ],
    },
    options: {
      ...chartOptions,
      onHover: (event, elements) => {
        // Reset all bar colors
        blobsChart.data.datasets[0].backgroundColor =
          blobsChart.data.labels.map(() => "rgba(148, 226, 213, 0.7)");
        // Highlight hovered bar
        if (elements.length > 0) {
          const index = elements[0].index;
          const colors = blobsChart.data.labels.map((_, i) =>
            i === index ? "rgba(148, 226, 213, 1)" : "rgba(148, 226, 213, 0.5)",
          );
          blobsChart.data.datasets[0].backgroundColor = colors;
        }
        blobsChart.update("none");
      },
      plugins: {
        ...chartOptions.plugins,
        tooltip: {
          enabled: false,
          external: (context) => {
            customTooltip(context);
            const tooltipEl = document.getElementById("chartjs-tooltip");
            if (tooltipEl && context.tooltip.body) {
              const bodyLines = context.tooltip.dataPoints.map(
                (dp) => `${dp.parsed.y} blobs`,
              );
              const title = `Block ${context.tooltip.title[0]}`;
              tooltipEl.innerHTML = `
                <div style="color: #a6adc8; margin-bottom: 4px; font-size: 0.75rem;">${title}</div>
                <div style="font-weight: 600;">${bodyLines[0]}</div>
              `;
            }
          },
        },
      },
      scales: {
        x: {
          display: false,
          grid: { display: false },
        },
        y: {
          ...chartOptions.scales.y,
          beginAtZero: true,
          ticks: {
            ...chartOptions.scales.y.ticks,
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
          backgroundColor: "transparent",
          fill: false,
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 0,
        },
      ],
    },
    options: {
      ...chartOptions,
      plugins: {
        ...chartOptions.plugins,
        tooltip: {
          enabled: false,
          external: (context) => {
            customTooltip(context);
            const tooltipEl = document.getElementById("chartjs-tooltip");
            if (tooltipEl && context.tooltip.body) {
              const bodyLines = context.tooltip.dataPoints.map(
                (dp) => `${dp.parsed.y.toFixed(4)} Gwei`,
              );
              const title = `Block ${context.tooltip.title[0]}`;
              tooltipEl.innerHTML = `
                <div style="color: #a6adc8; margin-bottom: 4px; font-size: 0.75rem;">${title}</div>
                <div style="font-weight: 600;">${bodyLines[0]}</div>
              `;
            }
          },
        },
      },
      elements: {
        point: {
          radius: 0,
          hoverRadius: 6,
          hoverBackgroundColor: "#f9e2af",
          hoverBorderColor: "#f9e2af",
          hoverBorderWidth: 2,
        },
        line: { tension: 0.3 },
      },
      scales: {
        ...chartOptions.scales,
        y: {
          ...chartOptions.scales.y,
          beginAtZero: true,
          ticks: {
            ...chartOptions.scales.y.ticks,
            callback: (value) => Math.round(value),
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
  if (gwei >= 1000) {
    return gwei.toFixed(2) + " Gwei";
  }
  if (gwei >= 100) {
    return gwei.toFixed(3) + " Gwei";
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

// Modal functions
function showBlockModal(block) {
  const modal = document.getElementById("block-modal");
  const modalBody = document.getElementById("modal-body");

  console.log("Block transactions:", block.transactions);

  const txList =
    block.transactions && block.transactions.length > 0
      ? block.transactions
          .map(
            (tx) => `
        <div class="tx-item">
            <div class="tx-header">
                <a href="https://etherscan.io/tx/${tx.tx_hash}" target="_blank" class="tx-hash">${truncateHash(tx.tx_hash)}</a>
                <span class="chain-badge ${getChainBadgeClass(tx.chain)}">${tx.chain}</span>
            </div>
            <div class="tx-details">
                <span>${tx.blob_count} blob${tx.blob_count > 1 ? "s" : ""}</span>
                <span>${formatBytes(tx.blob_size)}</span>
            </div>
        </div>
    `,
          )
          .join("")
      : '<div class="tx-item"><div class="tx-details">No transactions found</div></div>';

  modalBody.innerHTML = `
        <div class="detail-grid">
            <div class="detail-item">
                <div class="detail-label">Block Height</div>
                <div class="detail-value">
                    <a href="https://beaconcha.in/block/${block.block_number}" target="_blank">${formatNumber(block.block_number)}</a>
                </div>
            </div>
            <div class="detail-item">
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

        <div class="tx-list">
            <h3 style="font-size: 0.85rem; color: var(--ctp-subtext1); margin-bottom: 0.75rem;">Blob Transactions (${block.tx_count})</h3>
            ${txList}
        </div>

        <div style="margin-top: 1rem; text-align: center;">
            <a href="https://beaconcha.in/block/${block.block_number}" target="_blank" style="color: var(--ctp-sapphire); font-size: 0.85rem;">
                View on Beaconcha.in
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
      data.latest_gas_price,
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

// Adaptive rendering: show all data for smaller datasets, use consistent
// max-width rendering for larger datasets to maintain performance
async function fetchChartData() {
  try {
    const res = await fetch(`/api/chart?blocks=${selectedBlocks}`);
    const data = await res.json();

    // For large datasets, sample the data to improve performance
    let sampledData = data;
    if (selectedBlocks > 2000) {
      const sampleRate = Math.ceil(selectedBlocks / 1000);
      sampledData = {
        labels: data.labels.filter((_, i) => i % sampleRate === 0),
        blobs: data.blobs.filter((_, i) => i % sampleRate === 0),
        gas_prices: data.gas_prices.filter((_, i) => i % sampleRate === 0),
      };
    }

    blobsChart.data.labels = sampledData.labels;
    blobsChart.data.datasets[0].data = sampledData.blobs;
    blobsChart.update("none");

    gasChart.data.labels = sampledData.labels;
    gasChart.data.datasets[0].data = sampledData.gas_prices;
    gasChart.update("none");
  } catch (e) {
    console.error("Failed to fetch chart data:", e);
  }
}

async function fetchChainStats() {
  try {
    const res = await fetch(`/api/chain-stats?hours=24`);
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

// Search for specific block
async function searchBlock() {
  const searchInput = document.getElementById("block-search");
  const blockNumber = parseInt(searchInput.value.trim());

  if (isNaN(blockNumber) || blockNumber < 0) {
    alert("Please enter a valid block number");
    return;
  }

  try {
    const res = await fetch(`/api/block?block_number=${blockNumber}`);
    const block = await res.json();

    if (block) {
      showBlockModal(block);
      searchInput.value = "";
    } else {
      alert(`Block ${blockNumber} not found or has no blob transactions`);
    }
  } catch (e) {
    console.error("Failed to search block:", e);
    alert("Error searching for block");
  }
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
      const blocks = parseInt(option.dataset.blocks);
      const label = option.dataset.label;

      selectedBlocks = blocks;
      timePickerLabel.textContent = label;

      timePickerOptions.forEach((opt) => opt.classList.remove("active"));
      option.classList.add("active");

      timePickerDropdown.classList.remove("open");

      fetchChartData();
      fetchChainStats();
    });
  });
}

// Initialize search
function initSearch() {
  const searchBtn = document.getElementById("search-btn");
  const searchInput = document.getElementById("block-search");

  searchBtn.addEventListener("click", searchBlock);
  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      searchBlock();
    }
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
  initSearch();
  initModal();
  refresh();
  setInterval(refresh, POLL_INTERVAL);
}

document.addEventListener("DOMContentLoaded", init);
