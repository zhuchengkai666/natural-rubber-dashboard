import { currentYearAverage, shouldShowChartSeries, CHART_VISIBILITY_RULES } from "./三分之一尺寸折线图-同比模板/chart-core.js?v=20260902b";
import { renderEditableMonthlyChart } from "./dashboard-editable-chart-runtime-v2.js?v=20261019a";
import { wanTFromKt, wanTSeriesFromKt } from "./dashboard-mass-unit-v1.js";
const overviewRoot = document.querySelector("#app");
let overviewState = null;
let overviewDataPromise = null;
let overviewRenderQueued = false;
let overviewResizeObserver = null;

const overviewPalette = {
  2021: "#e7c8ab",
  2022: "#b7cbe1",
  2023: "#5e94bd",
  2024: "#2f8fa5",
  2025: "#6f2ca6",
  2026: "#ff1010",
};

const overviewStyle = document.createElement("style");
overviewStyle.textContent = `
.overview-page {
  display: grid;
  gap: 28px;
}
.overview-table-grid {
  display: grid;
  grid-template-columns: repeat(3, 432px);
  gap: 16px;
  width: max-content;
  max-width: none;
}
.overview-data-block {
  width: 432px;
  overflow: hidden;
  border: 1px solid var(--line);
  background: #fff;
}
.overview-data-block h2 {
  min-height: 40px;
  margin: 0;
  padding: 11px 14px 9px;
  border-bottom: 1px solid var(--line);
  color: var(--ink);
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -.02em;
}
.overview-data-table {
  width: 432px;
  table-layout: fixed;
  border-collapse: collapse;
}
.overview-data-table th,
.overview-data-table td {
  height: 34px;
  padding: 7px 10px;
  border-bottom: 1px solid var(--line-soft);
  white-space: nowrap;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.overview-data-table th:first-child,
.overview-data-table td:first-child {
  width: 122px;
  text-align: left;
}
.overview-data-table th:not(:first-child),
.overview-data-table td:not(:first-child) {
  width: 77.5px;
}
.overview-data-table th {
  color: var(--muted-2);
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 500;
}
.overview-data-table td {
  color: var(--ink);
  font-family: var(--font-mono);
  font-size: 10px;
}
.overview-data-table td:first-child {
  overflow: hidden;
  color: var(--ink);
  font-family: var(--font-sans);
  font-size: 11px;
  text-overflow: ellipsis;
}
.overview-data-table tbody tr:last-child td {
  border-bottom: 0;
}
.overview-data-table tbody tr:last-child.is-yoy-positive {
  background: #fff5f5;
}
.overview-data-table tbody tr:last-child.is-yoy-positive td {
  color: var(--ink);
  font-weight: 600;
}
.overview-data-table tbody tr:last-child.is-yoy-positive td.is-positive { color: var(--red); }
.overview-data-table tbody tr:last-child.is-yoy-positive td.is-negative { color: #3f8b61; }
.overview-data-table tbody tr:last-child.is-yoy-negative {
  background: #f0faf4;
}
.overview-data-table tbody tr:last-child.is-yoy-negative td {
  color: var(--ink);
  font-weight: 600;
}
.overview-data-table tbody tr:last-child.is-yoy-negative td.is-negative { color: #3f8b61; }
.overview-data-table tbody tr:last-child.is-yoy-negative td.is-positive { color: var(--red); }
.overview-data-table .metric-empty {
  color: var(--muted-2);
}
.overview-grid-table-panel {
  width: max-content;
  max-width: 100%;
}
.overview-grid-scroll {
  width: max-content;
  max-width: 100%;
  overflow-x: auto;
}
.overview-subtable-grid {
  display: grid;
  grid-template-columns: repeat(3, 364px);
  gap: 1px;
  width: max-content;
  background: var(--line);
}
.overview-subtable {
  min-width: 0;
  background: #fff;
}
.overview-subtable-title {
  display: flex;
  align-items: center;
  height: var(--dashboard-table-row-height);
  margin: 0;
  padding: 3px 10px 2px;
  border-bottom: 1px solid var(--line-soft);
  color: var(--ink);
  background: #f7f8f8;
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 600;
  line-height: 18px;
  letter-spacing: 0;
}
body .overview-grid-table-panel[data-compact-table] .overview-subtable .overview-data-table {
  width: 364px;
  max-width: none;
  table-layout: auto;
}
.overview-chart-section {
  display: grid;
  gap: 13px;
}
.overview-section-heading {
  display: flex;
  align-items: baseline;
  gap: 15px;
  margin: 0;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--line);
}
.overview-section-heading h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: -.035em;
}
.overview-section-heading span {
  color: var(--muted-2);
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: .05em;
}
.overview-charts {
  display: grid;
  grid-template-columns: repeat(3, 432px);
  gap: 16px;
  width: max-content;
}
.overview-country-groups {
  display: grid;
  gap: 22px;
}
.overview-country-group {
  display: grid;
  gap: 9px;
}
.overview-country-group-header {
  display: flex;
  align-items: baseline;
  gap: 10px;
  min-height: 28px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--line-soft);
}
.overview-country-group-header h3 {
  margin: 0;
  color: var(--ink);
  font-size: 15px;
  font-weight: 600;
}
.overview-country-group-header span {
  color: var(--muted-2);
  font-family: var(--font-mono);
  font-size: 9px;
}
.overview-chart-card {
  width: 432px;
}
.overview-chart-card .country-chart-header {
  min-height: 63px;
  padding: 13px 14px 9px;
  border-bottom: 0;
}
.overview-chart-card .country-chart-header h2 {
  font-size: 14px;
}
.overview-chart-card .country-chart-meta {
  margin-top: 7px;
  font-size: 8px;
}
.overview-chart-card .country-chart-legend {
  min-height: 27px;
  padding: 0 14px 4px;
  gap: 6px 11px;
}
.overview-chart-card .country-chart-legend .legend-item {
  font-size: 8px;
}
.overview-chart-card .chart-stage {
  min-height: 246px;
  height: 246px;
  padding: 0 4px;
}
.overview-chart-card .seasonal-chart {
  display: block;
  width: 100%;
  height: 246px;
  overflow: visible;
}
.overview-chart-card .chart-axis-label {
  font-size: 10px;
}
.overview-chart-card .chart-axis-title {
  display: none;
}
.overview-chart-card .chart-tooltip {
  font-size: 9px;
}
@media (max-width: 1760px) {
  .overview-table-grid,
  .overview-charts {
    grid-template-columns: repeat(3, 432px);
  }
}
`;
document.head.appendChild(overviewStyle);

function overviewEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function overviewNumber(value) {
  return value === null || value === undefined || !Number.isFinite(Number(value)) ? null : Number(value);
}

function overviewFormatKt(value) {
  const number = wanTFromKt(value);
  return number === null ? "—" : number.toLocaleString("zh-CN", { maximumFractionDigits: 1 });
}

function overviewFormatRate(value) {
  const number = overviewNumber(value);
  if (number === null) return "—";
  const percent = number * 100;
  return (percent >= 0 ? "+" : "") + percent.toFixed(1) + "%";
}

function overviewLatestMetric(series) {
  const latestMonth = overviewState?.latestMonth;
  return (series || []).find((item) => item.month === latestMonth) || null;
}

function overviewYearSum(series, year) {
  return (series || [])
    .filter((item) => Number(item.year) === Number(year))
    .reduce((sum, item) => sum + (overviewNumber(item.valueKt) || 0), 0);
}

function overviewCurrentYearAverage(series) {
  return currentYearAverage(series, overviewState?.latestMonth);
}

function overviewProductLabel(product) {
  return product?.label === "乳胶" ? "乳胶（未折干）" : product?.label || "—";
}

function overviewTableCountries() {
  const previousYear = Number(String(overviewState?.latestMonth || "").slice(0, 4)) - 1;
  const countries = (overviewState?.countries || [])
    .filter((country) => !country.isSynthetic && overviewYearSum(country.series, previousYear) > 100)
    .sort((left, right) => overviewYearSum(right.series, previousYear) - overviewYearSum(left.series));
  const laoMyanmarCambodia = (overviewState?.countries || []).find((country) => country.label === "老缅柬");
  return laoMyanmarCambodia && overviewYearSum(laoMyanmarCambodia.series, previousYear) > 100
    ? countries.concat(laoMyanmarCambodia)
    : countries;
}

function overviewChartCountries() {
  return (overviewState?.countries || [])
    .filter((country) => (!country.isSynthetic || country.label === "老缅柬") && country.label !== "菲律宾")
    .filter((country) => shouldShowChartSeries(country.series, overviewState?.latestMonth));
}

function overviewMetricCells(metric) {
  if (!metric) return '<td class="metric-empty">—</td><td class="metric-empty">—</td><td class="metric-empty">—</td><td class="metric-empty">—</td>';
  const yoyClass = Number(metric.yoyRate) > 0 ? "is-positive" : Number(metric.yoyRate) < 0 ? "is-negative" : "";
  const ytdYoyClass = Number(metric.ytdYoyRate) > 0 ? "is-positive" : Number(metric.ytdYoyRate) < 0 ? "is-negative" : "";
  return "<td>" + overviewFormatKt(metric.valueKt) + "</td>" +
    "<td>" + overviewFormatKt(metric.ytdKt) + "</td>" +
    "<td class=\"" + yoyClass + "\">" + overviewFormatRate(metric.yoyRate) + "</td>" +
    "<td class=\"" + ytdYoyClass + "\">" + overviewFormatRate(metric.ytdYoyRate) + "</td>";
}

function overviewRow(label, series, emphasis = false) {
  const metric = overviewLatestMetric(series);
  const tone = Number(metric?.yoyRate) > 0 ? "is-yoy-positive" : Number(metric?.yoyRate) < 0 ? "is-yoy-negative" : "";
  const rowClass = [emphasis ? "is-emphasis" : "", tone].filter(Boolean).join(" ");
  return "<tr class=\"" + rowClass + "\"><td title=\"" + overviewEscape(label) + "\">" + overviewEscape(label) + "</td>" + overviewMetricCells(metric) + "</tr>";
}

function overviewSubtable(title, rows) {
  return '<section class="overview-subtable" aria-label="' + overviewEscape(title) + '">' +
    '<h3 class="overview-subtable-title">' + overviewEscape(title) + '</h3>' +
    '<table class="overview-data-table dashboard-data-table"><thead><tr><th>胶种</th><th>' +
    overviewEscape((overviewState.latestMonth || "").replace("-", "/")) +
    '</th><th>累计值</th><th>同比</th><th>累计同比</th></tr></thead><tbody>' + rows +
    '</tbody></table></section>';
}

function overviewProductSubtable() {
  const products = overviewState.products || [];
  const rows = products.map((product) => overviewRow(overviewProductLabel(product), product.series)).join("");
  return overviewSubtable("按胶种", rows + overviewRow("合计", overviewState.overview?.series, true));
}

function overviewCountrySubtable(country) {
  const productById = new Map((country.productSeries || []).map((item) => [item.id, item]));
  const rows = (overviewState.products || []).map((product) => {
    const productSeries = productById.get(product.id);
    return overviewRow(overviewProductLabel(product), productSeries?.series || []);
  }).join("");
  return overviewSubtable(country.label, rows + overviewRow("合计", country.series, true));
}

function overviewTableMarkup() {
  return '<section class="overview-table-grid" aria-label="中国橡胶进口月度概览">' +
    '<article class="overview-data-block overview-grid-table-panel dashboard-table-panel" data-compact-table>' +
    '<header class="dashboard-table-heading"><div class="dashboard-table-title-group"><h2 class="dashboard-table-title">中国橡胶进口月度指标</h2></div><span class="dashboard-table-unit">单位 / 万吨</span></header>' +
    '<div class="dashboard-table-scroll overview-grid-scroll"><div class="overview-subtable-grid">' +
    overviewProductSubtable() + overviewTableCountries().map(overviewCountrySubtable).join("") +
    '</div></div></article></section>';
}

function overviewRenderChart(card, series) {
  renderEditableMonthlyChart({
    card,
    chartId: "overview:" + String(card.dataset.overviewChart || "chart"),
    sourceLabel: card.dataset.overviewChart || "overview",
    title: card.querySelector("h2")?.textContent,
    unit: "万吨",
    svg: card.querySelector(".seasonal-chart"),
    stage: card.querySelector(".chart-stage"),
    tooltip: card.querySelector(".chart-tooltip"),
    legend: card.querySelector(".country-chart-legend"),
    series: wanTSeriesFromKt(series),
    tooltipUnit: "万吨",
  });
}

function overviewChartCard(title, series, key) {
  return '<article class="country-chart overview-chart-card" data-overview-chart="' + overviewEscape(key) + '">' +
    '<header class="country-chart-header"><h2>' + overviewEscape(title) + '</h2><div class="country-chart-meta"><span>单位 / 万吨</span><span>同比 / %</span></div></header>' +
    '<div class="country-chart-legend" aria-label="图例"></div><div class="chart-stage"><svg class="seasonal-chart" role="img" aria-label="' + overviewEscape(title) + '"></svg><div class="chart-tooltip"></div></div></article>';
}

function overviewChartSection(title, _note, specs) {
  return '<section class="overview-chart-section"><header class="overview-section-heading"><h2>' + overviewEscape(title) + '</h2></header><div class="overview-charts">' +
    specs.map((spec) => overviewChartCard(spec.title, spec.series, spec.key)).join("") + '</div></section>';
}

function overviewCountryChartSpecs(country) {
  const total = [{
    key: "country-total-" + country.id,
    title: "中国进口自" + country.label + "橡胶（折干）",
    series: country.series,
  }];
  const productSpecs = (overviewState.products || []).map((product) => {
    const productSeries = (country.productSeries || []).find((item) => item.id === product.id);
    if (!productSeries || !shouldShowChartSeries(productSeries.series, overviewState?.latestMonth, CHART_VISIBILITY_RULES.minOverviewCountryProductAverageKt)) return null;
    return {
      key: "country-" + country.id + "-product-" + product.id,
      title: "中国进口自" + country.label + overviewProductLabel(product),
      series: productSeries.series,
    };
  }).filter(Boolean);
  return total.concat(productSpecs);
}

function overviewChartSpecs() {
  const productSpecs = (overviewState.products || [])
    .filter((product) => shouldShowChartSeries(product.series, overviewState?.latestMonth))
    .map((product) => ({
      key: "product-" + product.id,
      title: product.label === "乳胶" ? "中国进口乳胶（未折干）" : "中国进口" + product.label,
      series: product.series,
    }));
  const total = [{ key: "overview-total", title: "中国进口橡胶总量（折干）", series: overviewState.overview?.series || [] }];
  return {
    productSpecs: total.concat(productSpecs),
    countryGroups: overviewChartCountries().map((country) => ({ country, specs: overviewCountryChartSpecs(country) })),
  };
}

function overviewCountryChartSection(groups) {
  return '<section class="overview-chart-section" aria-label="分国别进口量"><header class="overview-section-heading"><h2>分国别进口量</h2></header><div class="overview-country-groups">' +
    groups.map((group) => '<section class="overview-country-group" aria-label="' + overviewEscape(group.country.label) + '进口量"><header class="overview-country-group-header"><h3>' + overviewEscape(group.country.label) + '</h3><span>中国进口自' + overviewEscape(group.country.label) + '</span></header><div class="overview-charts">' + group.specs.map((spec) => overviewChartCard(spec.title, spec.series, spec.key)).join("") + '</div></section>').join("") +
    '</div></section>';
}

function overviewMarkup() {
  const specs = overviewChartSpecs();
  return '<section class="overview-page" aria-label="中国橡胶进口总览数据布局">' + overviewTableMarkup() +
    overviewChartSection("进口总量与分胶种进口量", "总量及6个胶种", specs.productSpecs) +
    overviewCountryChartSection(specs.countryGroups) +
    '</section>';
}

function renderOverviewCharts() {
  const cards = [...overviewRoot.querySelectorAll(".overview-chart-card")];
  const chartSpecState = overviewChartSpecs();
  const specs = chartSpecState.productSpecs.concat(chartSpecState.countryGroups.flatMap((group) => group.specs));
  if (overviewResizeObserver) overviewResizeObserver.disconnect();
  cards.forEach((card, index) => overviewRenderChart(card, specs[index]?.series || []));
  if ("ResizeObserver" in window) {
    overviewResizeObserver = new ResizeObserver(() => cards.forEach((card, index) => overviewRenderChart(card, specs[index]?.series || [])));
    cards.forEach((card) => overviewResizeObserver.observe(card));
  }
}

function overviewRouteActive() {
  return (window.location.hash.replace(/^#/, "").split("/")[0] || "overview") === "overview";
}

function queueOverviewRender() {
  if (overviewRenderQueued) return;
  overviewRenderQueued = true;
  const run = () => {
    overviewRenderQueued = false;
    if (!overviewState || !overviewRouteActive()) return;
    const insertPoint = overviewRoot.querySelector(".page-intro");
    const oldPage = overviewRoot.querySelector(".overview-grid, .metric-grid, .lower-strip");
    if (!insertPoint || !oldPage || overviewRoot.querySelector(".overview-page")) return;

    overviewRoot.querySelectorAll(".metric-grid, .overview-grid, .lower-strip").forEach((node) => node.remove());
    const fragment = document.createRange().createContextualFragment(overviewMarkup());
    const overviewPage = fragment.firstElementChild;
    const metricMount = overviewRoot.querySelector(".headline-metrics");
    (metricMount || insertPoint).insertAdjacentElement("afterend", overviewPage);
    renderOverviewCharts();
  };
  if (typeof window.requestAnimationFrame === "function") window.requestAnimationFrame(run);
  else window.setTimeout(run, 0);
}

function loadOverviewData() {
  if (overviewDataPromise) return overviewDataPromise;
  overviewDataPromise = fetch("./data/dashboard-data.json?v=20260723", { cache: "no-store" })
    .then((response) => response.ok ? response.json() : null)
    .then((data) => {
      overviewState = data;
      queueOverviewRender();
      return data;
    })
    .catch((error) => {
      console.error("overview data load failed", error);
      return null;
    });
  return overviewDataPromise;
}

const overviewObserver = new MutationObserver(queueOverviewRender);
overviewObserver.observe(overviewRoot || document.body, { childList: true, subtree: true });
window.addEventListener("hashchange", queueOverviewRender);
loadOverviewData();
