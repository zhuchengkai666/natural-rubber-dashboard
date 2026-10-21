import { shouldShowChartSeries, shouldShowTableSeries } from "./三分之一尺寸折线图-同比模板/chart-core.js?v=20260902b";
import { renderEditableMonthlyChart } from "./dashboard-editable-chart-runtime-v2.js?v=20261016b";
import { wanTFromKt, wanTSeriesFromKt } from "./dashboard-mass-unit-v1.js";
const layoutApp = document.querySelector("#app");
let layoutData = null;
let chartResizeObserver = null;

const layoutStyle = document.createElement("style");
layoutStyle.textContent = `
:root { --canvas: #ffffff; }
html, body, .main-content, .content-wrap { background: #ffffff; }
.topbar { background: #ffffff; }
.page-intro .eyebrow, .page-description { display: none; }
.page-intro { margin-bottom: 22px; }
.page-intro h1 { max-width: none; margin-bottom: 0; font-size: clamp(28px, 3.2vw, 44px); line-height: 1.05; letter-spacing: -.05em; }
.subnav-item em { margin-left: 6px; color: var(--muted-2); font-family: var(--font-mono); font-size: 8px; font-style: normal; }
.country-layout { display: grid; gap: 22px; }
.country-summary { justify-self: start; width: max-content; max-width: 100%; border: 1px solid var(--line); background: #ffffff; overflow: hidden; }
.country-table-wrap { width: max-content; max-width: 100%; overflow-x: auto; text-align: left; }
.country-table { width: 800px; min-width: 800px; table-layout: fixed; border-collapse: collapse; }
.country-table th, .country-table td { padding: 13px 16px; border-bottom: 1px solid var(--line-soft); text-align: right; white-space: nowrap; }
.country-table th:first-child, .country-table td:first-child { width: 200px; text-align: left; }
.country-table th:nth-child(n+2), .country-table td:nth-child(n+2) { width: 120px; }
.country-table th { color: var(--muted-2); font-family: var(--font-mono); font-size: 10px; font-weight: 400; letter-spacing: .04em; }
.country-table td { height: 44px; color: var(--ink); font-family: var(--font-mono); font-size: 11px; }
.country-table td:first-child { font-family: var(--font-sans); font-size: 12px; font-weight: 500; }
.country-table tbody tr:first-child.is-yoy-positive td { color: var(--ink); font-weight: 600; background: #fff5f5; }
.country-table tbody tr:first-child.is-yoy-negative td { color: var(--ink); font-weight: 600; background: #f0faf4; }
.country-table tbody tr:first-child td.is-positive { color: var(--red); }
.country-table tbody tr:first-child td.is-negative { color: #3f8b61; }
.country-table tbody tr:last-child td { border-bottom: 0; }
.country-table .metric-empty { color: var(--muted-2); }
.country-charts { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; align-items: start; }
.country-chart { min-width: 0; border: 1px solid var(--line); background: #ffffff; }
.country-chart-header { display: block; min-height: 68px; padding: 15px 16px 11px; border-bottom: 1px solid var(--line-soft); }
.country-chart-header h2 { margin: 0; font-size: 15px; font-weight: 500; line-height: 1.35; letter-spacing: -.03em; }
.country-chart-meta { display: flex; gap: 12px; margin-top: 8px; color: var(--muted-2); font-family: var(--font-mono); font-size: 9px; letter-spacing: .04em; text-transform: uppercase; }
.country-chart-legend { display: flex; flex-wrap: wrap; gap: 7px 12px; padding: 10px 16px 7px; }
.country-chart-legend .legend-item { display: inline-flex; align-items: center; gap: 5px; color: #68727b; font-family: var(--font-mono); font-size: 9px; line-height: 1; }
.country-chart-legend .legend-swatch { display: inline-block; width: 18px; height: 2px; background: #9aa1a8; }
.country-chart-legend .legend-swatch.bar { width: 8px; height: 10px; background: #d5dadd; border: 1px solid #c1c7cc; }
.chart-stage { position: relative; min-height: 276px; padding: 0 8px 8px; }
.seasonal-chart { display: block; width: 100%; height: 276px; }
.chart-tooltip { position: absolute; z-index: 2; display: none; pointer-events: none; min-width: 132px; padding: 9px 10px; border: 1px solid #c7cdd3; background: #ffffff; box-shadow: 0 8px 22px rgb(35 43 50 / 12%); font-family: var(--font-mono); font-size: 9px; }
.tooltip-title { margin-bottom: 6px; color: var(--ink); }
.tooltip-row { display: flex; justify-content: space-between; gap: 12px; padding: 2px 0; color: var(--muted); }
.tooltip-value { color: var(--ink); }
@media (max-width: 1120px) {
  .country-charts { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 760px) {
  .country-table { width: 800px; min-width: 800px; }
  .country-charts { grid-template-columns: 1fr; }
  .country-chart-header { min-height: 0; }
  .seasonal-chart, .chart-stage { height: 260px; min-height: 260px; }
}
`;
document.head.appendChild(layoutStyle);

async function loadLayoutData() {
  try {
    const response = await fetch("./data/dashboard-data.json?v=20230728", { cache: "no-store" });
    if (response.ok) layoutData = await response.json();
  } catch (error) {
    console.error(error);
  }
}

function setPrimaryLabels() {
  const countryButton = layoutApp.querySelector('[data-route="countries"] strong');
  const productButton = layoutApp.querySelector('[data-route="products"] strong');
  if (countryButton && countryButton.textContent !== "分国别") countryButton.textContent = "分国别";
  if (productButton && productButton.textContent !== "分胶种") productButton.textContent = "分胶种";
}

function currentPrimary() {
  const hash = window.location.hash.replace("#", "");
  return hash.split("/")[0] || "overview";
}

function currentCountry() {
  const countryId = window.location.hash.replace("#", "").split("/")[1];
  return (layoutData?.countries || []).find((item) => item.id === countryId) || layoutData?.countries?.[0] || null;
}

function currentCountryName() {
  const country = currentCountry();
  if (country) return country.label;
  return layoutApp.querySelector(".page-intro h1")?.textContent?.trim().replace(/^中国进口自/, "").replace(/橡胶$/, "") || "泰国";
}

function firstChildHash(primary) {
  const items = primary === "countries" ? layoutData?.countries : layoutData?.products;
  return items && items[0] ? "#" + primary + "/" + items[0].id : "#" + primary;
}

function routeToFirstChild(event) {
  const button = event.target.closest("button[data-route]");
  if (!button || !layoutData) return;
  const primary = button.dataset.route;
  if (primary !== "countries" && primary !== "products") return;
  event.preventDefault();
  event.stopImmediatePropagation();
  window.location.hash = firstChildHash(primary);
}

function blankMetric(value, formatter) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '<td class="metric-empty">n/a</td>';
  return "<td>" + formatter(Number(value)) + "</td>";
}

function blankRateMetric(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '<td class="metric-empty">n/a</td>';
  const className = Number(value) > 0 ? "is-positive" : Number(value) < 0 ? "is-negative" : "";
  return '<td class="' + className + '">' + formatRate(Number(value)) + "</td>";
}

function formatKt(value) { return wanTFromKt(value).toFixed(1); }

function formatRate(value) {
  const percent = value * 100;
  return (percent >= 0 ? "+" : "") + percent.toFixed(1) + "%";
}

function latestMetric(series) {
  const latestMonth = layoutData?.latestMonth;
  return (series || []).find((item) => item.month === latestMonth) || null;
}

function tableRowClass(metric) {
  return Number(metric?.yoyRate) > 0 ? "is-yoy-positive" : Number(metric?.yoyRate) < 0 ? "is-yoy-negative" : "";
}

function tableRow(label, metric, share) {
  return "<tr class=\"" + tableRowClass(metric) + "\"><td>" + label + "</td>" +
    blankMetric(metric?.valueKt, formatKt) +
    blankRateMetric(metric?.yoyRate) +
    blankMetric(metric?.ytdKt, formatKt) +
    blankRateMetric(metric?.ytdYoyRate) +
    blankMetric(share, (value) => value.toFixed(1) + "%") +
    "</tr>";
}

function tableRows(country) {
  const totalMetric = latestMetric(country?.series);
  const totalValue = totalMetric?.valueKt || 0;
  const rows = [tableRow("橡胶总量", totalMetric, totalValue ? 100 : null)];
  (country?.productSeries || []).filter((product) => shouldShowTableSeries(product.series, layoutData?.latestMonth)).forEach((product) => {
    const metric = latestMetric(product.series);
    const share = totalValue ? ((metric?.valueKt || 0) / totalValue) * 100 : null;
    rows.push(tableRow(product.label, metric, share));
  });
  return rows.join("");
}

function chartCards(selectedName, country) {
  const chartLabels = [{ label: "橡胶总量", series: country?.series || [] }, ...(country?.productSeries || []).filter((product) => shouldShowChartSeries(product.series, layoutData?.latestMonth))];
  return chartLabels.map((item, index) => {
    const title = item.label === "橡胶总量" ? "中国进口自" + selectedName + "橡胶总量" : "中国进口自" + selectedName + item.label;
    const seriesId = item.id || item.label || (index === 0 ? "total" : `series-${index}`);
    return '<article class="country-chart" data-chart-index="' + index + '" data-series-id="' + seriesId + '" data-chart-type="monthly-seasonal"><header class="country-chart-header"><h2>' + title + '</h2><div class="country-chart-meta"><span>单位 / 万吨</span><span>同比 / %</span></div></header><div class="country-chart-legend" aria-label="图例"></div><div class="chart-stage"><svg class="seasonal-chart" role="img" aria-label="' + title + '季节性图表"></svg><div class="chart-tooltip"></div></div></article>';
  }).join("");
}

function renderChartCard(card, spec) {
  renderEditableMonthlyChart({
    card,
    chartId: card.dataset.seriesId,
    sourceLabel: spec.label || card.dataset.seriesId,
    title: card.querySelector("h2")?.textContent,
    unit: "万吨",
    svg: card.querySelector(".seasonal-chart"),
    stage: card.querySelector(".chart-stage"),
    tooltip: card.querySelector(".chart-tooltip"),
    legend: card.querySelector(".country-chart-legend"),
    series: wanTSeriesFromKt(spec.series),
    tooltipUnit: "万吨",
  });
}

function renderCountryCharts(country) {
  const specs = [{ label: "橡胶总量", series: country?.series || [] }, ...(country?.productSeries || []).filter((product) => shouldShowChartSeries(product.series, layoutData?.latestMonth))];
  const cards = [...layoutApp.querySelectorAll(".country-chart")];
  if (chartResizeObserver) chartResizeObserver.disconnect();
  cards.forEach((card, index) => renderChartCard(card, specs[index] || { series: [] }));
  if ("ResizeObserver" in window) {
    chartResizeObserver = new ResizeObserver(() => cards.forEach((card, index) => renderChartCard(card, specs[index] || { series: [] })));
    cards.forEach((card) => chartResizeObserver.observe(card));
  }
}

function countryLayout() {
  const country = currentCountry();
  const selectedName = country?.label || currentCountryName();
  const pageTitle = "中国进口自" + selectedName + "橡胶";
  const introHeading = layoutApp.querySelector(".page-intro h1");
  if (introHeading && introHeading.textContent !== pageTitle) introHeading.textContent = pageTitle;
  const page = layoutApp.querySelector(".framework-page");
  if (!page || page.dataset.layoutReady === "1") return;
  page.dataset.layoutReady = "1";
  page.innerHTML = '<section class="country-layout" aria-label="分国别数据布局">' +
    '<section class="country-summary dashboard-table-panel" data-compact-table aria-label="进口概览表">' +
      '<header class="dashboard-table-heading"><div class="dashboard-table-title-group"><h2 class="dashboard-table-title">中国进口自' + selectedName + '分品种</h2></div><span class="dashboard-table-unit">单位 / 万吨</span></header>' +
      '<div class="country-table-wrap dashboard-table-scroll"><table class="country-table dashboard-data-table"><thead><tr><th>胶种</th><th>当月</th><th>同比</th><th>年累计</th><th>累计同比</th><th>占比</th></tr></thead><tbody>' + tableRows(country) + '</tbody></table></div>' +
    '</section>' +
    '<section class="country-charts" aria-label="季节性图表区域">' + chartCards(selectedName, country) + '</section>' +
  '</section>';
  renderCountryCharts(country);
}

function enhancePage() {
  if (!layoutApp || !layoutData) return;
  setPrimaryLabels();
  const primary = currentPrimary();
  if (primary === "countries" && window.location.hash.includes("/")) countryLayout();
  if (primary === "products") {
    const description = layoutApp.querySelector(".page-description");
    if (description) description.remove();
  }
}

layoutApp.addEventListener("click", routeToFirstChild, true);
const layoutObserver = new MutationObserver(() => enhancePage());
layoutObserver.observe(layoutApp, { childList: true, subtree: true });
window.addEventListener("hashchange", () => setTimeout(enhancePage, 0));

loadLayoutData().then(() => {
  const primary = currentPrimary();
  if ((primary === "countries" || primary === "products") && !window.location.hash.includes("/")) window.location.hash = firstChildHash(primary);
  enhancePage();
});
