import { installChartTemplateStyles } from "./三分之一尺寸折线图-同比模板/chart-core.js?v=20260902b";
import { renderEditableMonthlyChart } from "./dashboard-editable-chart-runtime-v2.js?v=20261026a";
import { compactTableDisplayNote, compactTableUnitLabel } from "./dashboard-table-utils-v1.js?v=20260822c";

const vietnamApp = document.querySelector("#app");
let vietnamData = null;
let vietnamError = null;
let vietnamFrame = 0;
let vietnamResizeObserver = null;

installChartTemplateStyles();

const vietnamStyle = document.createElement("style");
vietnamStyle.textContent = `
.vietnam-page-host { display: block; min-width: 0; }
.vietnam-chart .country-chart-header h2 { font-size: 14px; }
.vietnam-error { max-width: 720px; padding: 22px; border: 1px solid #edc8c8; background: #fff8f8; color: var(--ink); }
.vietnam-error code { display: block; margin-top: 10px; color: var(--red); font-family: var(--font-mono); font-size: 10px; }
`;
document.head.appendChild(vietnamStyle);

function vietnamRouteActive() {
  return window.location.hash.replace(/^#/, "").split("/")[0] === "vietnam";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function seriesById(seriesId) {
  return vietnamData?.series?.[seriesId] || null;
}

function latestMetric(seriesId, month = vietnamData?.latestMonth) {
  const series = seriesById(seriesId);
  return (series?.values || []).find((item) => item.month === month) || null;
}

function formatValue(value, digits = 1) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "—";
  return Number(value).toLocaleString("zh-CN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatRate(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "—";
  const percent = Number(value) * 100;
  return (percent >= 0 ? "+" : "") + percent.toFixed(1) + "%";
}

function rateClass(value) {
  if (!Number.isFinite(Number(value))) return " is-empty";
  return Number(value) > 0 ? " is-positive" : Number(value) < 0 ? " is-negative" : "";
}

function tableRowTone(value) {
  return Number(value) > 0 ? "is-yoy-positive" : Number(value) < 0 ? "is-yoy-negative" : "";
}

function monthLabel(month) {
  const [year, monthNumber] = String(month || "").split("-");
  return year && monthNumber ? year + "/" + Number(monthNumber) : "—";
}

function comparisonLabels() {
  const [yearText, monthText] = vietnamData.latestMonth.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const previousMonth = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  return {
    current: monthLabel(vietnamData.latestMonth),
    priorYear: (year - 1) + "/" + month,
    priorMonth: previousMonth.year + "/" + previousMonth.month,
    currentYtd: year + "累计",
    priorYtd: (year - 1) + "同期累计",
  };
}

function numberCell(value, digits = 1) {
  const className = Number.isFinite(Number(value)) ? "" : "is-empty";
  return '<td class="' + className + '">' + formatValue(value, digits) + "</td>";
}

function rateCell(value) {
  return '<td class="' + rateClass(value).trim() + '">' + formatRate(value) + "</td>";
}

function tableRows(table) {
  return table.rows.map((row) => {
    const series = seriesById(row.seriesId);
    const metric = latestMetric(row.seriesId);
    const digits = series?.unit === "条" ? 0 : 1;
    const rowClass = [row.emphasis ? "is-emphasis" : "", tableRowTone(metric?.yoyRate)].filter(Boolean).join(" ");
    return '<tr class="' + rowClass + '"><td>' + escapeHtml(row.label) + "</td>" +
      numberCell(metric?.value, digits) +
      numberCell(metric?.priorYearValue, digits) +
      numberCell(metric?.priorMonthValue, digits) +
      numberCell(metric?.ytdValue, digits) +
      numberCell(metric?.priorYtdValue, digits) +
      rateCell(metric?.yoyRate) +
      rateCell(metric?.ytdYoyRate) +
      rateCell(metric?.momRate) +
    "</tr>";
  }).join("");
}

function tableSectionMarkup(table) {
  const note = compactTableDisplayNote(table.note);
  return '<tbody class="dashboard-table-section" data-table-id="' + escapeHtml(table.id) + '">' +
    '<tr class="dashboard-table-subheading"><th colspan="9">' + escapeHtml(table.title) + '</th></tr>' +
    (note ? '<tr class="dashboard-table-subnote"><td colspan="9">' + escapeHtml(note) + '</td></tr>' : '') +
    tableRows(table) + '</tbody>';
}

function tablesMarkup() {
  const labels = comparisonLabels();
  const unit = compactTableUnitLabel(vietnamData.tables);
  return '<article class="thailand-table-block dashboard-table-panel" data-compact-table data-table-id="vietnam-combined">' +
    '<header class="thailand-table-header dashboard-table-heading"><div class="dashboard-table-title-group"><h2 class="dashboard-table-title">越南橡胶出口月度指标</h2></div>' +
    '<span class="thailand-table-unit dashboard-table-unit">单位 / ' + escapeHtml(unit) + '</span></header>' +
    '<div class="thailand-table-scroll dashboard-table-scroll"><table class="thailand-data-table dashboard-data-table"><thead><tr><th>项目</th><th>' +
      labels.current + '</th><th>' + labels.priorYear + '</th><th>' + labels.priorMonth +
      '</th><th>' + labels.currentYtd + '</th><th>' + labels.priorYtd +
      '</th><th>同比</th><th>累计同比</th><th>环比</th></tr></thead>' +
      vietnamData.tables.map(tableSectionMarkup).join("") + '</table></div></article>';
}

function headlineMarkup() {
  const cards = vietnamData.headline?.cards || [];
  return '<section class="headline-metrics thailand-headline-metrics" aria-label="越南橡胶出口关键指标">' +
    cards.map((card) => {
      const metric = latestMetric(card.seriesId, card.latestMonth || vietnamData.latestMonth);
      const value = metric?.[card.valueKey];
      const rate = metric?.[card.rateKey];
      const countClass = card.unit === "条" ? " is-count" : "";
      return '<article class="headline-metric' + countClass + '"><span class="headline-metric-label">' +
        escapeHtml(card.label) + '</span><strong class="headline-metric-value">' +
        formatValue(value, card.digits ?? 1) + "<em>" + escapeHtml(card.unit) +
        '</em></strong><small class="headline-metric-note' + rateClass(rate) + '">' +
        escapeHtml(card.rateLabel) + " " + formatRate(rate) + "</small></article>";
    }).join("") +
  "</section>";
}

function chartCardMarkup(chart, index) {
  const series = seriesById(chart.seriesId);
  const displayUnit = series?.unit === "条" ? "万条" : series?.unit || "";
  return '<article class="country-chart thailand-chart vietnam-chart" data-chart-index="' + index +
    '" data-series-id="' + escapeHtml(chart.seriesId) + '">' +
    '<header class="country-chart-header"><h2>' + escapeHtml(chart.title) +
    '</h2><div class="country-chart-meta"><span>单位 / ' + escapeHtml(displayUnit) +
    '</span><span>同比 / %</span></div></header><div class="country-chart-legend" aria-label="图例"></div>' +
    '<div class="chart-stage"><svg class="seasonal-chart" role="img" aria-label="' +
    escapeHtml(chart.title) + '季节性图表"></svg><div class="chart-tooltip"></div></div></article>';
}

function chartSectionMarkup(section) {
  return '<section class="thailand-chart-section" data-section-id="' + escapeHtml(section.id) + '">' +
    '<header class="thailand-section-heading"><h2>' + escapeHtml(section.title) +
    '</h2><span>SEASONAL LINE / YOY BAR</span></header><div class="thailand-chart-grid">' +
    section.charts.map(chartCardMarkup).join("") + "</div></section>";
}

function renderChart(card) {
  const series = seriesById(card.dataset.seriesId);
  if (!series) return;
  const divisor = series.unit === "条" ? 10000 : 1;
  const tooltipUnit = series.unit === "条" ? "万条" : series.unit;
  renderEditableMonthlyChart({
    card,
    chartId: card.dataset.seriesId,
    sourceLabel: series.label || card.dataset.seriesId,
    title: card.querySelector("h2")?.textContent,
    unit: tooltipUnit,
    svg: card.querySelector(".seasonal-chart"),
    stage: card.querySelector(".chart-stage"),
    tooltip: card.querySelector(".chart-tooltip"),
    legend: card.querySelector(".country-chart-legend"),
    series: series.values.map((item) => ({
      ...item,
      valueKt: item.value === null ? null : item.value / divisor,
    })),
    tooltipUnit,
  });
}

function renderAllCharts() {
  const cards = [...vietnamApp.querySelectorAll(".vietnam-chart")];
  if (vietnamResizeObserver) vietnamResizeObserver.disconnect();
  cards.forEach(renderChart);
  if ("ResizeObserver" in window) {
    vietnamResizeObserver = new ResizeObserver(() => cards.forEach(renderChart));
    cards.forEach((card) => vietnamResizeObserver.observe(card));
  }
}

function updateIntro() {
  const intro = vietnamApp.querySelector(".page-intro");
  if (!intro) return;
  let controls = intro.querySelector(".intro-controls");
  if (!controls) {
    controls = document.createElement("div");
    intro.appendChild(controls);
  }
  controls.className = "intro-controls thailand-intro-controls";
  controls.innerHTML = '<div class="intro-control"><span class="intro-control-label">更新月份</span>' +
    '<strong class="intro-control-value">' + escapeHtml(vietnamData.latestMonth) +
    '</strong></div><div class="intro-control"><span class="intro-control-label">单位</span>' +
    '<strong class="intro-control-value">万吨 / 条</strong></div>';
}

function renderVietnamPage() {
  if (!vietnamRouteActive()) return;
  const host = vietnamApp.querySelector(".vietnam-page-host");
  if (!host) return;
  if (vietnamError) {
    host.innerHTML = '<div class="vietnam-error"><strong>越南进出口数据加载失败</strong><code>' +
      escapeHtml(vietnamError.message) + "</code></div>";
    return;
  }
  if (!vietnamData) return;
  const readyKey = vietnamData.generatedAt + "|" + vietnamData.latestMonth;
  if (host.dataset.readyKey === readyKey) return;
  updateIntro();
  host.innerHTML = '<div class="thailand-layout">' +
    headlineMarkup() +
    '<section class="thailand-tables" aria-label="越南进出口月度指标表">' +
      tablesMarkup() + "</section>" +
    '<section class="thailand-chart-sections" aria-label="越南进出口季节性图表">' +
      vietnamData.chartSections.map(chartSectionMarkup).join("") + "</section>" +
    '<p class="thailand-scope-note"><strong>口径：</strong>' + escapeHtml(vietnamData.scopeNote || "") + '</p>' +
  "</div>";
  host.dataset.readyKey = readyKey;
  renderAllCharts();
  window.dispatchEvent(new CustomEvent("vietnam-dashboard-ready", {
    detail: { latestMonth: vietnamData.latestMonth },
  }));
}

function scheduleVietnamPage() {
  if (vietnamFrame) return;
  vietnamFrame = requestAnimationFrame(() => {
    vietnamFrame = 0;
    renderVietnamPage();
  });
}

fetch("./data/vietnam-trade-data-v2.json?v=20260824a", { cache: "no-store" })
  .then((response) => {
    if (!response.ok) throw new Error("vietnam-trade-data-v2.json HTTP " + response.status);
    return response.json();
  })
  .then((data) => {
    vietnamData = data;
    window.vietnamDashboardData = data;
    scheduleVietnamPage();
  })
  .catch((error) => {
    vietnamError = error;
    console.error("Vietnam dashboard data load failed", error);
    scheduleVietnamPage();
  });

new MutationObserver(scheduleVietnamPage).observe(vietnamApp || document.body, {
  childList: true,
  subtree: true,
});
window.addEventListener("hashchange", scheduleVietnamPage);
