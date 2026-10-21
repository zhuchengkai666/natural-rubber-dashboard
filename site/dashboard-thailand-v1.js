import { installChartTemplateStyles } from "./三分之一尺寸折线图-同比模板/chart-core.js?v=20260902b";
import { renderEditableMonthlyChart } from "./dashboard-editable-chart-runtime-v2.js?v=20261016b";
import { compactTableDisplayNote, compactTableUnitLabel } from "./dashboard-table-utils-v1.js?v=20260822c";

const thailandApp = document.querySelector("#app");
let thailandData = null;
let thailandError = null;
let thailandFrame = 0;
let thailandResizeObserver = null;

installChartTemplateStyles();

const thailandStyle = document.createElement("style");
thailandStyle.textContent = `
.thailand-page-host { display: block; min-width: 0; }
.thailand-layout { display: grid; gap: 34px; min-width: 0; }
.thailand-intro-controls { grid-template-columns: 120px 90px !important; }
.thailand-headline-metrics { grid-template-columns: repeat(4, 268px) !important; margin-bottom: 0 !important; }
.thailand-headline-metrics .headline-metric-value { white-space: nowrap; }
.thailand-headline-metrics .headline-metric.is-count .headline-metric-value { font-size: 25px; letter-spacing: -.06em; }
.thailand-tables { display: grid; gap: 0; width: max-content; max-width: 100%; min-width: 0; }
.thailand-table-block {
  justify-self: start;
  width: 100%;
  max-width: 100%;
  border: 1px solid var(--line);
  border-radius: 0;
  background: #fff;
  overflow: hidden;
}
.thailand-table-block + .thailand-table-block { margin-top: -1px; }
.thailand-table-block:first-child { border-radius: 4px 4px 0 0; }
.thailand-table-block:last-child { border-radius: 0 0 4px 4px; }
.thailand-table-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  min-height: 52px;
  padding: 13px 16px 11px;
  border-bottom: 1px solid var(--line-soft);
  background: #fbfcfc;
}
.thailand-table-header h2 { margin: 0; color: var(--ink); font-size: 15px; font-weight: 600; letter-spacing: -.025em; }
.thailand-table-header p { max-width: 780px; margin: 5px 0 0; color: var(--muted-2); font-size: 10px; line-height: 1.5; }
.thailand-table-unit { flex: 0 0 auto; color: var(--muted-2); font-family: var(--font-mono); font-size: 9px; letter-spacing: .06em; white-space: nowrap; }
.thailand-table-scroll { max-width: 100%; overflow-x: auto; text-align: left; }
.thailand-data-table { width: auto; min-width: 1160px; table-layout: auto; border-collapse: collapse; }
.thailand-data-table th,
.thailand-data-table td {
  height: 39px;
  padding: 9px 14px;
  border-bottom: 1px solid var(--line-soft);
  color: var(--ink);
  font-family: var(--font-mono);
  font-size: 10px;
  text-align: right;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.thailand-data-table th {
  height: 36px;
  color: var(--muted-2);
  background: #fff;
  font-size: 9px;
  font-weight: 500;
  letter-spacing: .035em;
}
.thailand-data-table th:first-child,
.thailand-data-table td:first-child {
  min-width: 190px;
  padding-left: 16px;
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 500;
  text-align: left;
}
.thailand-data-table th:not(:first-child),
.thailand-data-table td:not(:first-child) { min-width: 104px; }
.thailand-data-table tbody tr:last-child td { border-bottom: 0; }
.thailand-data-table tbody tr.is-emphasis td { font-weight: 650; }
.thailand-data-table tbody tr.is-emphasis.is-yoy-positive td { color: var(--ink); background: #fff5f5; }
.thailand-data-table tbody tr.is-emphasis.is-yoy-negative td { color: var(--ink); background: #f0faf4; }
.thailand-data-table tbody tr.is-emphasis.is-yoy-positive td.is-positive { color: var(--red); }
.thailand-data-table tbody tr.is-emphasis.is-yoy-negative td.is-negative { color: #3f8b61; }
.thailand-data-table tbody tr.is-emphasis td.is-positive { color: var(--red); }
.thailand-data-table tbody tr.is-emphasis td.is-negative { color: #3f8b61; }
.thailand-data-table td.is-positive { color: var(--red); font-weight: 650; }
.thailand-data-table td.is-negative { color: #3f8b61; font-weight: 650; }
.thailand-data-table td.is-empty { color: var(--muted-2); }
.thailand-chart-sections { display: grid; gap: 40px; min-width: 0; }
.thailand-chart-section { display: grid; gap: 10px; min-width: 0; }
.thailand-section-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 18px;
  padding: 0 0 10px;
  border-bottom: 1px solid var(--line);
}
.thailand-section-heading h2 { margin: 0; color: var(--ink); font-size: 17px; font-weight: 600; letter-spacing: -.035em; }
.thailand-section-heading span { color: var(--muted-2); font-family: var(--font-mono); font-size: 9px; letter-spacing: .06em; }
.thailand-chart-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; align-items: start; }
.thailand-chart { min-width: 0; border-radius: 3px; overflow: hidden; }
.thailand-chart .country-chart-header h2 { font-size: 14px; }
.thailand-scope-note {
  padding: 14px 0 2px;
  border-top: 1px solid var(--line);
  color: var(--muted-2);
  font-size: 10px;
  line-height: 1.7;
}
.thailand-scope-note strong { color: var(--ink); font-weight: 600; }
.thailand-error { max-width: 720px; padding: 22px; border: 1px solid #edc8c8; background: #fff8f8; color: var(--ink); }
.thailand-error code { display: block; margin-top: 10px; color: var(--red); font-family: var(--font-mono); font-size: 10px; }
@media (max-width: 1120px) {
  .thailand-chart-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 760px) {
  .thailand-headline-metrics { grid-template-columns: repeat(2, 220px) !important; }
  .thailand-chart-grid { grid-template-columns: 1fr; }
  .thailand-table-header { align-items: flex-start; }
  .thailand-data-table { min-width: 1080px; }
}
`;
document.head.appendChild(thailandStyle);

function thailandRouteActive() {
  return window.location.hash.replace(/^#/, "").split("/")[0] === "thailand";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function seriesById(seriesId) {
  return thailandData?.series?.[seriesId] || null;
}

function latestMetric(seriesId) {
  const series = seriesById(seriesId);
  return (series?.values || []).find((item) => item.month === thailandData?.latestMonth) || null;
}

function formatValue(value, digits = 1) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "—";
  return Number(value).toLocaleString("zh-CN", { minimumFractionDigits: digits, maximumFractionDigits: digits });
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
  const [yearText, monthText] = thailandData.latestMonth.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const previousMonth = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  return {
    current: monthLabel(thailandData.latestMonth),
    priorYear: (year - 1) + "/" + month,
    priorMonth: previousMonth.year + "/" + previousMonth.month,
    currentYtd: year + "累计",
    priorYtd: (year - 1) + "同期累计",
  };
}

function numberCell(value, digits = 1) {
  return '<td class="' + (Number.isFinite(Number(value)) ? "" : "is-empty") + '">' + formatValue(value, digits) + "</td>";
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
  const unit = compactTableUnitLabel(thailandData.tables);
  return '<article class="thailand-table-block dashboard-table-panel" data-compact-table data-table-id="thailand-combined">' +
    '<header class="thailand-table-header dashboard-table-heading"><div class="dashboard-table-title-group"><h2 class="dashboard-table-title">泰国橡胶出口月度指标</h2></div>' +
    '<span class="thailand-table-unit dashboard-table-unit">单位 / ' + escapeHtml(unit) + '</span></header>' +
    '<div class="thailand-table-scroll dashboard-table-scroll"><table class="thailand-data-table dashboard-data-table"><thead><tr><th>项目</th><th>' + labels.current + '</th><th>' + labels.priorYear + '</th><th>' + labels.priorMonth + '</th><th>' + labels.currentYtd + '</th><th>' + labels.priorYtd + '</th><th>同比</th><th>累计同比</th><th>环比</th></tr></thead>' +
    thailandData.tables.map(tableSectionMarkup).join("") + '</table></div></article>';
}

function headlineMarkup() {
  const cards = thailandData.headline?.cards || [];
  return '<section class="headline-metrics thailand-headline-metrics" aria-label="泰国橡胶出口关键指标">' +
    cards.map((card) => {
      const metric = latestMetric(card.seriesId);
      const value = metric?.[card.valueKey];
      const rate = metric?.[card.rateKey];
      const countClass = card.unit === "条" ? " is-count" : "";
      return '<article class="headline-metric' + countClass + '"><span class="headline-metric-label">' + escapeHtml(card.label) + '</span><strong class="headline-metric-value">' + formatValue(value, card.digits ?? 1) + '<em>' + escapeHtml(card.unit) + '</em></strong><small class="headline-metric-note' + rateClass(rate) + '">' + escapeHtml(card.rateLabel) + ' ' + formatRate(rate) + '</small></article>';
    }).join("") +
  '</section>';
}

function chartCardMarkup(chart, index) {
  const series = seriesById(chart.seriesId);
  const displayUnit = series?.unit === "条" ? "万条" : series?.unit || "";
  return '<article class="country-chart thailand-chart" data-chart-index="' + index + '" data-series-id="' + escapeHtml(chart.seriesId) + '">' +
    '<header class="country-chart-header"><h2>' + escapeHtml(chart.title) + '</h2><div class="country-chart-meta"><span>单位 / ' + escapeHtml(displayUnit) + '</span><span>同比 / %</span></div></header>' +
    '<div class="country-chart-legend" aria-label="图例"></div><div class="chart-stage"><svg class="seasonal-chart" role="img" aria-label="' + escapeHtml(chart.title) + '季节性图表"></svg><div class="chart-tooltip"></div></div></article>';
}

function chartSectionMarkup(section) {
  return '<section class="thailand-chart-section" data-section-id="' + escapeHtml(section.id) + '"><header class="thailand-section-heading"><h2>' + escapeHtml(section.title) + '</h2><span>SEASONAL LINE / YOY BAR</span></header><div class="thailand-chart-grid">' +
    section.charts.map(chartCardMarkup).join("") + '</div></section>';
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
    series: series.values.map((item) => ({ ...item, valueKt: item.value === null ? null : item.value / divisor })),
    tooltipUnit,
  });
}

function renderAllCharts() {
  const cards = [...thailandApp.querySelectorAll(".thailand-chart")];
  if (thailandResizeObserver) thailandResizeObserver.disconnect();
  cards.forEach(renderChart);
  if ("ResizeObserver" in window) {
    thailandResizeObserver = new ResizeObserver(() => cards.forEach(renderChart));
    cards.forEach((card) => thailandResizeObserver.observe(card));
  }
}

function updateIntro() {
  const intro = thailandApp.querySelector(".page-intro");
  if (!intro) return;
  let controls = intro.querySelector(".intro-controls");
  if (!controls) {
    controls = document.createElement("div");
    intro.appendChild(controls);
  }
  controls.className = "intro-controls thailand-intro-controls";
  controls.innerHTML = '<div class="intro-control"><span class="intro-control-label">更新月份</span><strong class="intro-control-value">' + escapeHtml(thailandData.latestMonth) + '</strong></div><div class="intro-control"><span class="intro-control-label">单位</span><strong class="intro-control-value">万吨 / 条</strong></div>';
}

function renderThailandPage() {
  if (!thailandRouteActive()) return;
  const host = thailandApp.querySelector(".thailand-page-host");
  if (!host) return;
  if (thailandError) {
    host.innerHTML = '<div class="thailand-error"><strong>泰国进出口数据加载失败</strong><code>' + escapeHtml(thailandError.message) + '</code></div>';
    return;
  }
  if (!thailandData) return;
  const readyKey = thailandData.generatedAt + "|" + thailandData.latestMonth;
  if (host.dataset.readyKey === readyKey) return;
  updateIntro();
  host.innerHTML = '<div class="thailand-layout">' +
    headlineMarkup() +
    '<section class="thailand-tables" aria-label="泰国进出口月度指标表">' + tablesMarkup() + '</section>' +
    '<section class="thailand-chart-sections" aria-label="泰国进出口季节性图表">' + thailandData.chartSections.map(chartSectionMarkup).join("") + '</section>' +
    '<p class="thailand-scope-note"><strong>口径：</strong>' + escapeHtml(thailandData.scopeNote || "") + '</p>' +
  '</div>';
  host.dataset.readyKey = readyKey;
  renderAllCharts();
  window.dispatchEvent(new CustomEvent("thailand-dashboard-ready", { detail: { latestMonth: thailandData.latestMonth } }));
}

function scheduleThailandPage() {
  if (thailandFrame) return;
  thailandFrame = requestAnimationFrame(() => {
    thailandFrame = 0;
    renderThailandPage();
  });
}

fetch("./data/thailand-trade-data-v2.json?v=20260828a", { cache: "no-store" })
  .then((response) => {
    if (!response.ok) throw new Error("thailand-trade-data-v2.json HTTP " + response.status);
    return response.json();
  })
  .then((data) => {
    thailandData = data;
    window.thailandDashboardData = data;
    scheduleThailandPage();
  })
  .catch((error) => {
    thailandError = error;
    console.error("Thailand dashboard data load failed", error);
    scheduleThailandPage();
  });

new MutationObserver(scheduleThailandPage).observe(thailandApp || document.body, { childList: true, subtree: true });
window.addEventListener("hashchange", scheduleThailandPage);
