import { currentYearAverage, shouldShowChartSeries, shouldShowTableSeries } from "./三分之一尺寸折线图-同比模板/chart-core.js?v=20260902b";
import { renderEditableMonthlyChart } from "./dashboard-editable-chart-runtime-v2.js?v=20261016b";
import { wanTFromKt, wanTSeriesFromKt } from "./dashboard-mass-unit-v1.js";
const productLayoutApp = document.querySelector("#app");
let productLayoutData = null;
let productChartResizeObserver = null;
let productLayoutQueued = false;

function productCurrentRoute() {
  const parts = window.location.hash.replace(/^#/, "").split("/");
  if (parts[0] !== "products" || !parts[1]) return null;
  return productLayoutData?.products?.find((product) => product.id === parts[1]) || null;
}

function productLatestMetric(series) {
  const latestMonth = productLayoutData?.latestMonth;
  return (series || []).find((item) => item.month === latestMonth) || null;
}

function productCurrentYearAverage(series) {
  return currentYearAverage(series, productLayoutData?.latestMonth);
}

function productCountrySeries(product) {
  return (productLayoutData?.countries || [])
    .map((country) => ({
      country,
      product: (country.productSeries || []).find((item) => item.id === product.id) || null
    }))
    .filter((item) => item.product);
}

function productFormatKt(value) {
  const quantity = wanTFromKt(value);
  return quantity === null ? "n/a" : quantity.toFixed(1);
}

function productFormatRate(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "n/a";
  const percent = Number(value) * 100;
  return (percent >= 0 ? "+" : "") + percent.toFixed(1) + "%";
}

function productMetricCell(value, formatter) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '<td class="metric-empty">n/a</td>';
  return "<td>" + formatter(Number(value)) + "</td>";
}

function productRateCell(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '<td class="metric-empty">n/a</td>';
  const className = Number(value) > 0 ? "is-positive" : Number(value) < 0 ? "is-negative" : "";
  return '<td class="' + className + '">' + productFormatRate(Number(value)) + "</td>";
}

function productTableRowClass(metric) {
  return Number(metric?.yoyRate) > 0 ? "is-yoy-positive" : Number(metric?.yoyRate) < 0 ? "is-yoy-negative" : "";
}

function productTableRow(label, metric, share) {
  return "<tr class=\"" + productTableRowClass(metric) + "\"><td>" + label + "</td>" +
    productMetricCell(metric?.valueKt, productFormatKt) +
    productRateCell(metric?.yoyRate) +
    productMetricCell(metric?.ytdKt, productFormatKt) +
    productRateCell(metric?.ytdYoyRate) +
    productMetricCell(share, (value) => value.toFixed(1) + "%") +
    "</tr>";
}

function productPageTitle(product, suffix) {
  const isCountry = Boolean(suffix && suffix.charAt(0) === "\u81ea");
  const base = isCountry
    ? "\u4e2d\u56fd\u8fdb\u53e3\u81ea" + suffix.slice(1) + product.label
    : "\u4e2d\u56fd\u8fdb\u53e3" + product.label + (suffix || "");
  return product.label === "\u4e73\u80f6" ? base + "\uff08\u672a\u6298\u5e72\uff09" : base;
}

function productTableRows(product, countryProducts) {
  const totalMetric = productLatestMetric(product.series);
  const rows = [productTableRow(product.label + "\u603b\u91cf", totalMetric, 100)];
  const totalValue = Number(totalMetric?.valueKt) || 0;
  rows.push(...countryProducts
    .filter(({ product: countryProduct }) => shouldShowTableSeries(countryProduct.series, productLayoutData?.latestMonth))
    .map(({ country, product: countryProduct }) => {
      const metric = productLatestMetric(countryProduct.series);
      const share = totalValue && Number.isFinite(Number(metric?.valueKt)) ? (Number(metric.valueKt) / totalValue) * 100 : null;
      return productTableRow(country.label, metric, share);
    }));
  return rows.join("");
}

function productChartCards(product, countryProducts) {
  const totalTitle = productPageTitle(product, "\u603b\u91cf");
  const totalAverage = productCurrentYearAverage(product.series);
  const cards = ['<article class="country-chart product-chart-card product-total-chart" data-chart-index="0" data-product-total="1" data-series-id="product:' + product.id + ':total" data-chart-type="monthly-seasonal" data-current-year-average-kt="' + totalAverage.toFixed(6) + '">' +
    '<header class="country-chart-header"><h2>' + totalTitle + '</h2><div class="country-chart-meta"><span>\u5355\u4f4d / \u4e07\u5428</span><span>\u540c\u6bd4 / %</span></div></header>' +
    '<div class="country-chart-legend" aria-label="\u56fe\u4f8b"></div><div class="chart-stage"><svg class="seasonal-chart" role="img" aria-label="' + totalTitle + '"></svg><div class="chart-tooltip"></div></div></article>'];
  countryProducts
    .filter(({ product: countryProduct }) => shouldShowChartSeries(countryProduct.series, productLayoutData?.latestMonth))
    .forEach(({ country, product: countryProduct }, index) => {
      const title = productPageTitle(product, "\u81ea" + country.label);
      const average = productCurrentYearAverage(countryProduct.series);
      cards.push('<article class="country-chart product-chart-card product-country-chart" data-chart-index="' + (index + 1) + '" data-country-id="' + country.id + '" data-series-id="product:' + product.id + ':country:' + country.id + '" data-chart-type="monthly-seasonal" data-current-year-average-kt="' + average.toFixed(6) + '">' +
        '<header class="country-chart-header"><h2>' + title + '</h2><div class="country-chart-meta"><span>\u5355\u4f4d / \u4e07\u5428</span><span>\u540c\u6bd4 / %</span></div></header>' +
        '<div class="country-chart-legend" aria-label="\u56fe\u4f8b"></div><div class="chart-stage"><svg class="seasonal-chart" role="img" aria-label="' + title + '"></svg><div class="chart-tooltip"></div></div></article>');
    });
  return cards.join("");
}

function renderProductChartCard(card, spec) {
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

function renderProductCharts(product, countryProducts) {
  const specs = [{ label: product.label + "\u603b\u91cf", series: product.series }];
  specs.push(...countryProducts
    .filter(({ product: countryProduct }) => shouldShowChartSeries(countryProduct.series, productLayoutData?.latestMonth))
    .map(({ country, product: countryProduct }) => ({ label: country.label, series: countryProduct.series })));
  const cards = [...productLayoutApp.querySelectorAll(".product-chart-card")];
  if (productChartResizeObserver) productChartResizeObserver.disconnect();
  cards.forEach((card, index) => renderProductChartCard(card, specs[index] || { series: [] }));
  if ("ResizeObserver" in window) {
    productChartResizeObserver = new ResizeObserver(() => cards.forEach((card, index) => renderProductChartCard(card, specs[index] || { series: [] })));
    cards.forEach((card) => productChartResizeObserver.observe(card));
  }
}

function productLayout() {
  if (!productLayoutApp || !productLayoutData) return;
  const product = productCurrentRoute();
  const page = productLayoutApp.querySelector(".framework-page");
  if (!product || !page || page.dataset.productLayoutReady === "1") return;
  const countryProducts = productCountrySeries(product);
  const pageTitle = productPageTitle(product);
  const introHeading = productLayoutApp.querySelector(".page-intro h1");
  if (introHeading) introHeading.textContent = pageTitle;
  page.dataset.productLayoutReady = "1";
  page.innerHTML = '<section class="country-layout product-layout" aria-label="\u5206\u80f6\u79cd\u6570\u636e\u5e03\u5c40">' +
    '<section class="country-summary dashboard-table-panel" data-compact-table aria-label="\u8fdb\u53e3\u6982\u89c8\u8868">' +
      '<header class="dashboard-table-heading"><div class="dashboard-table-title-group"><h2 class="dashboard-table-title">' + pageTitle + '\u5206\u56fd\u5bb6</h2></div><span class="dashboard-table-unit">\u5355\u4f4d / \u4e07\u5428</span></header>' +
      '<div class="country-table-wrap dashboard-table-scroll"><table class="country-table dashboard-data-table"><thead><tr><th>\u56fd\u522b</th><th>\u5f53\u6708</th><th>\u540c\u6bd4</th><th>\u5e74\u7d2f\u8ba1</th><th>\u7d2f\u8ba1\u540c\u6bd4</th><th>\u5360\u6bd4</th></tr></thead><tbody>' + productTableRows(product, countryProducts) + '</tbody></table></div>' +
    '</section>' +
    '<section class="country-charts product-country-charts" aria-label="\u5404\u56fd\u5b63\u8282\u6027\u56fe\u8868">' + productChartCards(product, countryProducts) + '</section>' +
  '</section>';
  renderProductCharts(product, countryProducts);
}

function queueProductLayout() {
  if (productLayoutQueued) return;
  productLayoutQueued = true;
  const run = () => {
    productLayoutQueued = false;
    if (window.location.hash.replace(/^#/, "").split("/")[0] === "products") productLayout();
  };
  if (typeof window.requestAnimationFrame === "function") window.requestAnimationFrame(run);
  else setTimeout(run, 0);
}

const productLayoutObserver = new MutationObserver(queueProductLayout);
productLayoutObserver.observe(productLayoutApp || document.body, { childList: true, subtree: true });
window.addEventListener("hashchange", queueProductLayout);

fetch("./data/dashboard-data.json?v=20230744", { cache: "no-store" })
  .then((response) => response.ok ? response.json() : null)
  .then((data) => {
    productLayoutData = data;
    queueProductLayout();
  })
  .catch((error) => console.error(error));
