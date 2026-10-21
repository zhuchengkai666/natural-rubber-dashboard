import { installChartTemplateStyles } from "./三分之一尺寸折线图-同比模板/chart-core.js?v=20260902b";
import { renderEditableMonthlyChart } from "./dashboard-editable-chart-runtime-v2.js?v=20261016b";

const tireApp = document.querySelector("#app");
const tireDataPromise = fetch("./data/tire-export-data.json?v=20260907a", { cache: "no-store" })
  .then((response) => response.ok ? response.json() : Promise.reject(new Error("tire-export-data.json HTTP " + response.status)))
  .catch((error) => {
    console.error("tire dashboard data load failed", error);
    return null;
  });

let tireResizeObserver = null;
let tireRenderFrame = 0;

const tireStyle = document.createElement("style");
tireStyle.textContent = `
.tire-dashboard-layout {
  display: grid;
  gap: 30px;
}
.tire-metrics {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 14px;
  width: 100%;
}
.tire-metric {
  min-width: 0;
  min-height: 118px;
  padding: 18px 21px 15px;
  border: 1px solid var(--line);
  border-top: 2px solid var(--red);
  border-radius: 6px;
  background: #fff;
  box-shadow: 0 9px 24px rgb(37 42 48 / 7%);
}
.tire-metric-label {
  display: block;
  margin-bottom: 13px;
  color: var(--muted);
  font-size: 12px;
  font-weight: 600;
}
.tire-metric-value {
  display: block;
  color: var(--ink);
  font-family: var(--font-mono);
  font-size: 31px;
  font-weight: 700;
  letter-spacing: -.075em;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.tire-metric-value em {
  margin-left: 6px;
  color: var(--muted);
  font-family: var(--font-sans);
  font-size: 13px;
  font-style: normal;
  font-weight: 500;
  letter-spacing: 0;
}
.tire-metric-note {
  display: inline-block;
  margin-top: 13px;
  color: #7e8792;
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: .01em;
  text-shadow: none;
  font-variant-numeric: tabular-nums;
}
.tire-metric-note.is-positive {
  color: var(--red);
  text-shadow: 0 2px 8px rgb(241 38 38 / 20%);
}
.tire-metric-note.is-negative {
  color: #3f8b61;
  text-shadow: 0 2px 8px rgb(63 139 97 / 22%);
}
.tire-data-section,
.tire-chart-section {
  display: grid;
  gap: 13px;
}
.tire-tables-row {
  display: flex;
  align-items: flex-start;
  gap: 24px;
  width: max-content;
  max-width: 100%;
  overflow-x: auto;
  padding-bottom: 2px;
}
.tire-tables-row > .tire-table-panel {
  flex: 0 0 auto;
}
.tire-table-wrap {
  width: max-content;
  max-width: 100%;
  overflow-x: auto;
  border: 1px solid var(--line);
  background: #fff;
}
.tire-data-table {
  width: max-content;
  min-width: 0;
  table-layout: auto;
  border-collapse: collapse;
}
.tire-data-table th,
.tire-data-table td {
  height: 37px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--line-soft);
  text-align: right;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.tire-data-table th:first-child,
.tire-data-table td:first-child {
  min-width: 224px;
  text-align: left;
}
.tire-data-table th {
  color: var(--muted-2);
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 500;
}
.tire-data-table td {
  color: var(--ink);
  font-family: var(--font-mono);
  font-size: 10px;
}
.tire-data-table td:first-child {
  overflow: hidden;
  font-family: var(--font-sans);
  font-size: 11px;
  text-overflow: ellipsis;
}
.tire-annual-table th:first-child,
.tire-annual-table td:first-child {
  min-width: 116px;
}
.tire-annual-table td:first-child {
  overflow: visible;
  text-overflow: clip;
}
.tire-data-table tbody tr:last-child td { border-bottom: 0; }
.tire-data-table .tire-group-row td {
  background: #fafbfb;
  font-weight: 600;
}
.tire-data-table .tire-total-row td {
  border-top: 1px solid var(--line);
  color: var(--ink);
  font-weight: 700;
}
.tire-data-table .tire-group-row.is-yoy-positive td,
.tire-data-table .tire-total-row.is-yoy-positive td {
  background: #fff5f5;
  color: var(--ink);
  font-weight: 600;
}
.tire-data-table .tire-group-row.is-yoy-positive td.is-positive,
.tire-data-table .tire-total-row.is-yoy-positive td.is-positive { color: var(--red); }
.tire-data-table .tire-group-row.is-yoy-positive td.is-negative,
.tire-data-table .tire-total-row.is-yoy-positive td.is-negative { color: #3f8b61; }
.tire-data-table .tire-group-row.is-yoy-negative td,
.tire-data-table .tire-total-row.is-yoy-negative td {
  background: #f0faf4;
  color: var(--ink);
  font-weight: 600;
}
.tire-data-table .tire-group-row.is-yoy-negative td.is-negative,
.tire-data-table .tire-total-row.is-yoy-negative td.is-negative { color: #3f8b61; }
.tire-data-table .tire-group-row.is-yoy-negative td.is-positive,
.tire-data-table .tire-total-row.is-yoy-negative td.is-positive { color: var(--red); }
.tire-annual-table tbody tr.is-yoy-positive td {
  background: #fff;
  color: var(--ink);
}
.tire-annual-table tbody tr.is-yoy-positive td.is-positive { color: var(--red); }
.tire-annual-table tbody tr.is-yoy-positive td.is-negative { color: #3f8b61; }
.tire-annual-table tbody tr.is-yoy-negative td {
  background: #fff;
  color: var(--ink);
}
.tire-annual-table tbody tr.is-yoy-negative td.is-negative { color: #3f8b61; }
.tire-annual-table tbody tr.is-yoy-negative td.is-positive { color: var(--red); }
.tire-row-label { display: inline-flex; align-items: center; gap: 8px; }
.tire-row-label-child { padding-left: 21px; color: var(--muted); }
.tire-row-mark {
  color: var(--red);
  font-family: var(--font-mono);
  font-size: 10px;
}
.tire-chart-grid {
  display: grid;
  grid-template-columns: repeat(3, 432px);
  gap: 16px;
  width: max-content;
}
.tire-chart-card { width: 432px; }
.tire-chart-card .country-chart-header h2 { font-size: 14px; }
.tire-chart-card .country-chart-meta { font-size: 8px; }
.tire-chart-card .country-chart-legend .legend-item { font-size: 8px; }
@media (max-width: 760px) {
  .tire-metrics { grid-template-columns: repeat(2, minmax(0, 220px)); width: max-content; }
  .tire-metric { padding-left: 17px; padding-right: 17px; }
  .tire-metric-value { font-size: 27px; }
}
`;
document.head.appendChild(tireStyle);
installChartTemplateStyles();

function tireRouteActive() {
  return (window.location.hash.replace(/^#/, "").split("/")[0] || "overview") === "tire_export";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatValue(value) {
  return value === null || value === undefined || !Number.isFinite(Number(value)) ? "—" : Number(value).toFixed(1);
}

function formatRate(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "—";
  const percent = Number(value) * 100;
  return (percent >= 0 ? "+" : "") + percent.toFixed(1) + "%";
}

function rateClass(value) {
  if (!Number.isFinite(Number(value))) return "";
  return Number(value) > 0 ? " is-positive" : Number(value) < 0 ? " is-negative" : "";
}

function latestMetric(series, latestMonth) {
  return (series || []).find((item) => item.month === latestMonth) || null;
}

function metricNote(metric, ytd = false) {
  const rate = ytd ? metric?.ytdYoyRate : metric?.yoyRate;
  return (ytd ? "累计同比 " : "同比 ") + formatRate(rate);
}

function metricCard(label, metric, ytd, valueKey) {
  return '<article class="tire-metric"><span class="tire-metric-label">' + escapeHtml(label) +
    '</span><strong class="tire-metric-value">' + formatValue(metric?.[valueKey]) + '<em>万吨</em></strong>' +
    '<small class="tire-metric-note' + rateClass(ytd ? metric?.ytdYoyRate : metric?.yoyRate) + '">' +
    metricNote(metric, ytd) + '</small></article>';
}

function metricsMarkup(data) {
  const latest = data.latestMonth;
  const semiWeight = latestMetric(data.categories.semi_steel_tire.weightSeries, latest);
  const allWeight = latestMetric(data.categories.all_steel_tire.weightSeries, latest);
  const totalConsumption = latestMetric(data.total.consumptionSeries, latest);
  return '<section class="tire-metrics" aria-label="轮胎出口关键指标">' +
    metricCard("半钢胎月度出口重量", semiWeight, false, "valueKt") +
    metricCard("半钢胎年累计出口重量", semiWeight, true, "ytdKt") +
    metricCard("全钢胎月度出口重量", allWeight, false, "valueKt") +
    metricCard("全钢胎年累计出口重量", allWeight, true, "ytdKt") +
    metricCard("合计年累计耗胶量", totalConsumption, true, "ytdKt") +
    '</section>';
}

function tableMetricCells(weight, consumption) {
  const yoyClass = Number(weight?.yoyRate) > 0 ? "is-positive" : Number(weight?.yoyRate) < 0 ? "is-negative" : "";
  const ytdYoyClass = Number(weight?.ytdYoyRate) > 0 ? "is-positive" : Number(weight?.ytdYoyRate) < 0 ? "is-negative" : "";
  return '<td>' + formatValue(weight?.valueKt) + '</td><td class="' + yoyClass + '">' + formatRate(weight?.yoyRate) +
    '</td><td>' + formatValue(weight?.ytdKt) + '</td><td class="' + ytdYoyClass + '">' + formatRate(weight?.ytdYoyRate) +
    '</td><td>' + formatValue(consumption?.ytdKt) + '</td>';
}

function tableTone(metric) {
  return Number(metric?.yoyRate) > 0 ? "is-yoy-positive" : Number(metric?.yoyRate) < 0 ? "is-yoy-negative" : "";
}

function tableRow(label, weight, consumption, className = "") {
  const rowClass = [className, tableTone(weight)].filter(Boolean).join(" ");
  return '<tr class="' + rowClass + '"><td>' + label + '</td>' + tableMetricCells(weight, consumption) + '</tr>';
}

function annualComparisonMetric(series, year, latestYear, latestMonthNumber) {
  const targetMonth = year === latestYear ? latestMonthNumber : 12;
  return (series || []).find((item) => item.year === year && item.monthNumber === targetMonth) || null;
}

function annualComparisonRateCell(metric) {
  const rate = metric?.ytdYoyRate;
  const className = Number(rate) > 0 ? "is-positive" : Number(rate) < 0 ? "is-negative" : "";
  return '<td class="' + className + '">' + formatRate(rate) + '</td>';
}

function annualComparisonRow(year, latestYear, latestMonthNumber, data) {
  const semi = annualComparisonMetric(data.categories.semi_steel_tire.weightSeries, year, latestYear, latestMonthNumber);
  const all = annualComparisonMetric(data.categories.all_steel_tire.weightSeries, year, latestYear, latestMonthNumber);
  const consumption = annualComparisonMetric(data.total.consumptionSeries, year, latestYear, latestMonthNumber);
  const yearLabel = year === latestYear ? year + '年（1—' + latestMonthNumber + '月）' : year + '年';
  const rowClass = tableTone({ yoyRate: consumption?.ytdYoyRate });
  return '<tr class="' + rowClass + '"><td>' + escapeHtml(yearLabel) + '</td>' +
    '<td>' + formatValue(semi?.ytdKt) + '</td>' + annualComparisonRateCell(semi) +
    '<td>' + formatValue(all?.ytdKt) + '</td>' + annualComparisonRateCell(all) +
    '<td>' + formatValue(consumption?.ytdKt) + '</td>' + annualComparisonRateCell(consumption) +
    '</tr>';
}

function annualComparisonTableMarkup(data) {
  const latest = data.latestMonth;
  const latestYear = Number(latest.slice(0, 4));
  const latestMonthNumber = Number(latest.slice(5, 7));
  const years = [...new Set([
    ...(data.categories.semi_steel_tire.weightSeries || []).map((item) => item.year),
    ...(data.categories.all_steel_tire.weightSeries || []).map((item) => item.year),
    ...(data.total.consumptionSeries || []).map((item) => item.year),
  ])].sort((left, right) => right - left);
  return '<article class="tire-table-panel dashboard-table-panel" data-compact-table data-table-id="tire-annual-comparison">' +
    '<header class="dashboard-table-heading has-note"><div class="dashboard-table-title-group"><h2 class="dashboard-table-title">轮胎出口年度对比</h2><p class="dashboard-table-note">年度累计 · ' + escapeHtml(latestYear + '年为1—' + latestMonthNumber + '月累计') + '</p></div><span class="dashboard-table-unit">单位 / 万吨</span></header>' +
    '<div class="tire-table-wrap dashboard-table-scroll"><table class="tire-data-table tire-annual-table dashboard-data-table"><thead><tr><th>年份</th><th>半钢胎出口 / 万吨</th><th>同比</th><th>全钢胎出口 / 万吨</th><th>同比</th><th>轮胎出口折耗胶 / 万吨</th><th>同比</th></tr></thead><tbody>' +
    years.map((year) => annualComparisonRow(year, latestYear, latestMonthNumber, data)).join("") +
    '</tbody></table></div></article>';
}

function tireTableMarkup(data) {
  const latest = data.latestMonth;
  const rows = [];
  ["semi_steel_tire", "all_steel_tire"].forEach((group) => {
    const category = data.categories[group];
    const weight = latestMetric(category.weightSeries, latest);
    const consumption = latestMetric(category.consumptionSeries, latest);
    rows.push(tableRow('<span class="tire-row-label"><span class="tire-row-mark">01</span><strong>' + escapeHtml(category.label) + '</strong></span>', weight, consumption, "tire-group-row"));
    data.regions.forEach((region) => {
      const regionGroup = region[group];
      const regionWeight = latestMetric(regionGroup.weightSeries, latest);
      const regionConsumption = latestMetric(regionGroup.consumptionSeries, latest);
      rows.push(tableRow('<span class="tire-row-label tire-row-label-child"><span class="tire-row-mark">└</span>' + escapeHtml(region.label) + '</span>', regionWeight, regionConsumption));
    });
  });
  const totalWeight = latestMetric(data.total.weightSeries, latest);
  const totalConsumption = latestMetric(data.total.consumptionSeries, latest);
  rows.push(tableRow('<span class="tire-row-label"><span class="tire-row-mark">Σ</span><strong>合计</strong></span>', totalWeight, totalConsumption, "tire-total-row"));
  return '<section class="tire-data-section" aria-label="轮胎出口分区域明细表"><div class="tire-tables-row">' +
    '<article class="tire-table-panel dashboard-table-panel" data-compact-table data-table-id="tire-region-detail">' +
      '<header class="dashboard-table-heading has-note"><div class="dashboard-table-title-group"><h2 class="dashboard-table-title">轮胎出口分区域明细</h2><p class="dashboard-table-note">MONTHLY / YTD / YOY · ' + escapeHtml(latest) + '</p></div><span class="dashboard-table-unit">单位 / 万吨</span></header>' +
      '<div class="tire-table-wrap dashboard-table-scroll"><table class="tire-data-table dashboard-data-table"><thead><tr><th>类别 / 地区</th><th>当月出口重量 / 万吨</th><th>月度同比</th><th>年累计出口重量 / 万吨</th><th>累计同比</th><th>年累计耗胶量 / 万吨</th></tr></thead><tbody>' + rows.join("") + '</tbody></table></div>' +
    '</article>' +
    annualComparisonTableMarkup(data) +
    '</div>' +
  '</section>';
}

function chartCard(title, series, seriesId) {
  return '<article class="country-chart tire-chart-card" data-series-id="' + escapeHtml(seriesId) + '" data-chart-type="monthly-seasonal"><header class="country-chart-header"><h2>' + escapeHtml(title) + '</h2><div class="country-chart-meta"><span>单位 / 万吨</span><span>同比 / %</span></div></header><div class="country-chart-legend" aria-label="图例"></div><div class="chart-stage"><svg class="seasonal-chart" role="img" aria-label="' + escapeHtml(title) + '季节性图表"></svg><div class="chart-tooltip"></div></div><span class="tire-chart-series" hidden>' + escapeHtml(JSON.stringify(series || [])) + '</span></article>';
}

function chartSection(title, note, cards) {
  return '<section class="tire-chart-section" aria-label="' + escapeHtml(title) + '"><header class="overview-section-heading"><h2>' + escapeHtml(title) + '</h2><span>' + escapeHtml(note) + '</span></header><div class="tire-chart-grid">' + cards.join("") + '</div></section>';
}

function chartsMarkup(data) {
  const national = [
    chartCard("中国半钢胎出口重量", data.categories.semi_steel_tire.weightSeries, "tire:semi-steel:weight"),
    chartCard("中国全钢胎出口重量", data.categories.all_steel_tire.weightSeries, "tire:all-steel:weight"),
    chartCard("中国轮胎出口折耗胶", data.total.consumptionSeries, "tire:total:consumption"),
  ];
  const semi = data.regions.map((region) => chartCard("中国出口至" + region.label + "半钢胎重量", region.semi_steel_tire.weightSeries, "tire:semi-steel:region:" + region.label));
  const all = data.regions.map((region) => chartCard("中国出口至" + region.label + "全钢胎重量", region.all_steel_tire.weightSeries, "tire:all-steel:region:" + region.label));
  return chartSection("中国轮胎出口", "半钢胎 / 全钢胎 / 合计耗胶量", national) +
    chartSection("半钢胎出口分区域", "8 REGIONS · SEASONAL + YOY", semi) +
    chartSection("全钢胎出口分区域", "8 REGIONS · SEASONAL + YOY", all);
}

function renderTireCharts(root) {
  const cards = [...root.querySelectorAll(".tire-chart-card")];
  if (tireResizeObserver) tireResizeObserver.disconnect();
  const draw = () => cards.forEach((card) => {
    const series = JSON.parse(card.querySelector(".tire-chart-series")?.textContent || "[]");
    renderEditableMonthlyChart({
      card,
      chartId: card.dataset.seriesId,
      sourceLabel: card.dataset.seriesId,
      title: card.querySelector("h2")?.textContent,
      unit: "万吨",
      svg: card.querySelector(".seasonal-chart"),
      stage: card.querySelector(".chart-stage"),
      tooltip: card.querySelector(".chart-tooltip"),
      legend: card.querySelector(".country-chart-legend"),
      series,
      tooltipUnit: "万吨",
    });
  });
  draw();
  if ("ResizeObserver" in window) {
    tireResizeObserver = new ResizeObserver(draw);
    cards.forEach((card) => tireResizeObserver.observe(card));
  }
}

function updateTireIntro(data) {
  const intro = tireApp?.querySelector(".page-intro");
  if (!intro) return;
  const description = intro.querySelector(".page-description");
  if (description) description.textContent = "仅显示半钢胎和全钢胎；重量单位为万吨，耗胶量按行业折算系数计算。";
  let controls = intro.querySelector(".intro-controls");
  if (!controls) {
    controls = document.createElement("div");
    controls.className = "intro-controls";
    intro.appendChild(controls);
  }
  controls.innerHTML = '<div class="intro-control"><span class="intro-control-label">更新月份</span><strong class="intro-control-value">' + escapeHtml(data.latestMonth) + '</strong></div><div class="intro-control"><span class="intro-control-label">单位</span><strong class="intro-control-value">万吨</strong></div>';
  controls.dataset.uiKey = data.latestMonth + "|tire_export";
}

async function applyTireLayout() {
  if (!tireApp || !tireRouteActive()) return;
  const page = tireApp.querySelector(".tire-export-page");
  if (!page || page.dataset.tireLayoutReady === "1") return;
  const data = await tireDataPromise;
  if (!data) {
    page.innerHTML = '<div class="empty-module"><span class="empty-mark">!</span><div><h3>轮胎出口数据暂不可用</h3><p>请先运行轮胎出口刷新流程生成前端数据文件。</p></div></div>';
    return;
  }
  updateTireIntro(data);
  page.dataset.tireLayoutReady = "1";
  page.innerHTML = '<div class="tire-dashboard-layout">' + metricsMarkup(data) + tireTableMarkup(data) + chartsMarkup(data) + '</div>';
  renderTireCharts(page);
}

function scheduleTireLayout() {
  if (tireRenderFrame) return;
  tireRenderFrame = requestAnimationFrame(() => {
    tireRenderFrame = 0;
    applyTireLayout();
  });
}

new MutationObserver(scheduleTireLayout).observe(tireApp || document.body, { childList: true, subtree: true });
window.addEventListener("hashchange", scheduleTireLayout);
scheduleTireLayout();
