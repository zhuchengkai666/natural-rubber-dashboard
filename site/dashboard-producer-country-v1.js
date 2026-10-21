import { installChartTemplateStyles } from "./三分之一尺寸折线图-同比模板/chart-core.js?v=20260902b";
import { renderEditableMonthlyChart } from "./dashboard-editable-chart-runtime-v2.js?v=20261016b";
import { compactTableDisplayNote, compactTableUnitLabel } from "./dashboard-table-utils-v1.js?v=20260822c";

const producerApp = document.querySelector("#app");
const producerRoutes = [
  { key: "international_demand_observation", label: "国际需求观察", sub: "INTERNATIONAL DEMAND" },
  { key: "latex_diversion_observation", label: "胶水分流观察", sub: "LATEX DIVERSION" },
  { key: "thailand", label: "泰国", sub: "THAILAND" },
  { key: "vietnam", label: "越南", sub: "VIETNAM" },
  { key: "indonesia", label: "印尼", sub: "INDONESIA" },
  { key: "malaysia", label: "马来西亚", sub: "MALAYSIA" },
  { key: "cote_divoire", label: "科特迪瓦", sub: "COTE D'IVOIRE" },
  { key: "united_states", label: "美国", sub: "UNITED STATES" },
  { key: "european_union", label: "欧盟", sub: "EUROPEAN UNION" },
  { key: "india", label: "印度", sub: "INDIA" },
  { key: "japan", label: "日本", sub: "JAPAN" },
  { key: "south_korea", label: "韩国", sub: "SOUTH KOREA" },
];
const newProducerRoutes = new Set([
  "indonesia",
  "malaysia",
  "cote_divoire",
  "united_states",
  "european_union",
  "india",
  "japan",
  "south_korea",
]);

let producerPayload = null;
let producerError = null;
let producerFrame = 0;
let producerResizeObserver = null;

installChartTemplateStyles();

const producerStyle = document.createElement("style");
producerStyle.textContent = `
.producer-page-intro {
  display: flex;
  justify-content: space-between;
  gap: 30px;
  align-items: flex-end;
  margin-bottom: 32px;
}
.producer-page-intro h1 {
  margin-bottom: 12px;
  font-size: 44px;
  font-weight: 500;
  letter-spacing: -.065em;
  line-height: .92;
}
.producer-country-page-host { display: block; min-width: 0; }
.producer-country-chart .country-chart-header h2 { font-size: 14px; }
.producer-country-error {
  max-width: 720px;
  padding: 22px;
  border: 1px solid #edc8c8;
  background: #fff8f8;
  color: var(--ink);
}
.producer-country-error code {
  display: block;
  margin-top: 10px;
  color: var(--red);
  font-family: var(--font-mono);
  font-size: 10px;
}
@media (max-width: 760px) {
  .producer-page-intro { display: block; }
  .producer-page-intro .intro-controls { margin-top: 24px; }
}
`;
document.head.appendChild(producerStyle);

function activePrimaryRoute() {
  return window.location.hash.replace(/^#/, "").split("/")[0] || "overview";
}

function activeCountryData() {
  const route = activePrimaryRoute();
  return newProducerRoutes.has(route) ? producerPayload?.countries?.[route] || null : null;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function producerNavMarkup(route) {
  return '<div class="subnav primary-subnav" aria-label="其他国家进出口" data-producer-nav-version="20260907b">' +
    producerRoutes.map((item) => {
      const active = item.key === route ? " active" : "";
      return '<a class="subnav-item primary-subnav-item' + active + '" href="#' + item.key + '"><span>' +
        escapeHtml(item.label) + '</span><small>↗</small></a>';
    }).join("") +
  "</div>";
}

function ensureProducerNavigation() {
  if (window.dashboardNavigationRender) return;
  const route = activePrimaryRoute();
  const producerButton = producerApp?.querySelector('.nav-item[data-route="international_demand_observation"], .nav-item[data-route="thailand"]');
  if (!producerButton) return;

  const primaryTitle = producerButton.querySelector(".nav-copy strong");
  const primarySub = producerButton.querySelector(".nav-copy small");
  if (primaryTitle) primaryTitle.textContent = "其他国家进出口";
  if (primarySub) primarySub.textContent = "OTHER COUNTRIES TRADE";

  if (!producerRoutes.some((item) => item.key === route)) return;
  const rubberImportButton = producerApp.querySelector('.nav-item[data-route="overview"]');
  rubberImportButton?.classList.remove("active");
  const rubberImportArrow = rubberImportButton?.querySelector(".nav-arrow");
  if (rubberImportArrow) rubberImportArrow.textContent = "↗";
  producerApp.querySelectorAll('.subnav[aria-label="中国橡胶进口"]').forEach((item) => item.remove());
  producerApp.querySelectorAll(".main-nav > .nav-item.active").forEach((item) => item.classList.remove("active"));
  producerButton.classList.add("active");
  const arrow = producerButton.querySelector(".nav-arrow");
  if (arrow) arrow.textContent = "⌃";

  const existing = producerApp.querySelector('.subnav[aria-label="其他国家进出口"], .subnav[aria-label="主产国出口"]');
  const expectedActive = existing?.querySelector(".subnav-item.active")?.getAttribute("href") === "#" + route;
  if (existing?.dataset.producerNavVersion === "20260907b" && expectedActive) return;
  producerApp.querySelectorAll('.subnav[aria-label="其他国家进出口"], .subnav[aria-label="主产国出口"]').forEach((item) => item.remove());
  producerButton.insertAdjacentHTML("afterend", producerNavMarkup(route));
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

function comparisonLabels(country) {
  const [yearText, monthText] = country.latestMonth.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const previous = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  return {
    current: monthLabel(country.latestMonth),
    priorYear: (year - 1) + "/" + month,
    priorMonth: previous.year + "/" + previous.month,
    currentYtd: year + "累计",
    priorYtd: (year - 1) + "同期累计",
  };
}

function seriesById(country, seriesId) {
  return country?.series?.[seriesId] || null;
}

function latestMetric(country, seriesId, monthKey = null) {
  const series = seriesById(country, seriesId);
  const targetMonth = monthKey || country?.latestMonth;
  return (series?.values || []).find((item) => item.month === targetMonth) || null;
}

function numberCell(value, digits = 1) {
  const className = Number.isFinite(Number(value)) ? "" : "is-empty";
  return '<td class="' + className + '">' + formatValue(value, digits) + "</td>";
}

function rateCell(value) {
  return '<td class="' + rateClass(value).trim() + '">' + formatRate(value) + "</td>";
}

function tableRows(country, table) {
  return table.rows.map((row) => {
    const series = seriesById(country, row.seriesId);
    const metric = latestMetric(country, row.seriesId);
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

function tableSectionMarkup(country, table) {
  const note = compactTableDisplayNote(table.note);
  return '<tbody class="dashboard-table-section" data-table-id="' + escapeHtml(table.id) + '">' +
    '<tr class="dashboard-table-subheading"><th colspan="9">' + escapeHtml(table.title) + '</th></tr>' +
    (note ? '<tr class="dashboard-table-subnote"><td colspan="9">' + escapeHtml(note) + '</td></tr>' : '') +
    tableRows(country, table) + '</tbody>';
}

function tablesMarkup(country) {
  const labels = comparisonLabels(country);
  const unit = compactTableUnitLabel(country.tables);
  return '<article class="thailand-table-block dashboard-table-panel" data-compact-table data-table-id="' + escapeHtml(country.route) + '-combined">' +
    '<header class="thailand-table-header dashboard-table-heading"><div class="dashboard-table-title-group"><h2 class="dashboard-table-title">' + escapeHtml(country.title) + '月度指标</h2></div>' +
    '<span class="thailand-table-unit dashboard-table-unit">单位 / ' + escapeHtml(unit) + '</span></header>' +
    '<div class="thailand-table-scroll dashboard-table-scroll"><table class="thailand-data-table dashboard-data-table"><thead><tr><th>项目</th><th>' +
      labels.current + '</th><th>' + labels.priorYear + '</th><th>' + labels.priorMonth +
      '</th><th>' + labels.currentYtd + '</th><th>' + labels.priorYtd +
      '</th><th>同比</th><th>累计同比</th><th>环比</th></tr></thead>' +
      country.tables.map((table) => tableSectionMarkup(country, table)).join("") + '</table></div></article>';
}

function headlineMarkup(country) {
  const cards = country.headline?.cards || [];
  const direction = country.tradeDirection === "import" ? "进口" : "出口";
  return '<section class="headline-metrics thailand-headline-metrics" aria-label="' + escapeHtml(country.countryName) + direction + '关键指标">' +
    cards.map((card) => {
      const metric = latestMetric(country, card.seriesId, card.monthKey);
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

function chartCardMarkup(country, chartItem, index) {
  const series = seriesById(country, chartItem.seriesId);
  const displayUnit = series?.unit === "条" ? "万条" : series?.unit || "";
  return '<article class="country-chart thailand-chart producer-country-chart" data-chart-index="' + index +
    '" data-series-id="' + escapeHtml(chartItem.seriesId) + '">' +
    '<header class="country-chart-header"><h2>' + escapeHtml(chartItem.title) +
    '</h2><div class="country-chart-meta"><span>单位 / ' + escapeHtml(displayUnit) +
    '</span><span>同比 / %</span></div></header><div class="country-chart-legend" aria-label="图例"></div>' +
    '<div class="chart-stage"><svg class="seasonal-chart" role="img" aria-label="' +
    escapeHtml(chartItem.title) + '季节性图表"></svg><div class="chart-tooltip"></div></div></article>';
}

function chartSectionMarkup(country, section) {
  return '<section class="thailand-chart-section" data-section-id="' + escapeHtml(section.id) + '">' +
    '<header class="thailand-section-heading"><h2>' + escapeHtml(section.title) +
    '</h2><span>SEASONAL LINE / YOY BAR</span></header><div class="thailand-chart-grid">' +
    section.charts.map((item, index) => chartCardMarkup(country, item, index)).join("") + "</div></section>";
}

function renderChart(country, card) {
  const series = seriesById(country, card.dataset.seriesId);
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

function renderAllCharts(country) {
  const cards = [...producerApp.querySelectorAll(".producer-country-chart")];
  if (producerResizeObserver) producerResizeObserver.disconnect();
  cards.forEach((card) => renderChart(country, card));
  if ("ResizeObserver" in window) {
    producerResizeObserver = new ResizeObserver(() => cards.forEach((card) => renderChart(country, card)));
    cards.forEach((card) => producerResizeObserver.observe(card));
  }
}

function introMarkup(country) {
  const direction = country.tradeDirection === "import" ? "CONSUMER IMPORT" : "PRODUCER EXPORT";
  return '<section class="producer-page-intro"><div><p class="eyebrow">04 / ' + direction + " / " +
    escapeHtml(country.countryCode) + '</p><h1>' + escapeHtml(country.title) +
    '</h1><p class="page-description">' + escapeHtml(country.description) +
    '</p></div><div class="intro-controls thailand-intro-controls">' +
    '<div class="intro-control"><span class="intro-control-label">更新月份</span><strong class="intro-control-value">' +
    escapeHtml(country.latestMonth) + '</strong></div><div class="intro-control"><span class="intro-control-label">单位</span>' +
    '<strong class="intro-control-value">' + escapeHtml(country.unitLabel) + "</strong></div></div></section>";
}

function ensureNewProducerShell(country) {
  const route = activePrimaryRoute();
  const contentWrap = producerApp?.querySelector(".content-wrap");
  if (!contentWrap) return null;
  if (contentWrap.dataset.producerRoute !== route) {
    contentWrap.dataset.producerRoute = route;
    contentWrap.innerHTML = introMarkup(country) +
      '<section class="producer-country-page-host" aria-label="' + escapeHtml(country.title) + '">' +
      '<div class="data-loading"><span class="status-dot"></span><span>正在加载' + escapeHtml(country.title) + "数据</span></div></section>";
  }
  const direction = country.tradeDirection === "import" ? "CONSUMER IMPORT" : "PRODUCER EXPORT";
  const breadcrumb = producerApp.querySelector(".breadcrumb");
  if (breadcrumb) breadcrumb.innerHTML = '<span>GLOBAL CUSTOMS</span><i>/</i><span>04 / ' + direction + " / " + escapeHtml(country.countryCode) + "</span>";
  const topbarLatest = producerApp.querySelector(".topbar-meta strong");
  if (topbarLatest) topbarLatest.textContent = country.latestMonth;
  document.title = country.title + "｜RUBBER DASHBOARD";
  return contentWrap.querySelector(".producer-country-page-host");
}

function renderNewProducerPage() {
  const route = activePrimaryRoute();
  if (!newProducerRoutes.has(route)) return;
  const country = activeCountryData();
  const fallback = producerPayload?.countries?.[route];
  const host = country ? ensureNewProducerShell(country) : fallback ? ensureNewProducerShell(fallback) : null;
  if (!host) return;
  if (producerError) {
    host.innerHTML = '<div class="producer-country-error"><strong>其他国家进出口数据加载失败</strong><code>' +
      escapeHtml(producerError.message) + "</code></div>";
    return;
  }
  if (!country) return;
  const readyKey = country.generatedAt + "|" + country.latestMonth;
  if (host.dataset.readyKey === readyKey && host.querySelector(".headline-metric") && host.querySelector(".producer-country-chart")) return;
  host.innerHTML = '<div class="thailand-layout">' +
    headlineMarkup(country) +
    '<section class="thailand-tables" aria-label="' + escapeHtml(country.countryName) + '月度指标表">' +
      tablesMarkup(country) + "</section>" +
    '<section class="thailand-chart-sections" aria-label="' + escapeHtml(country.countryName) + '季节性图表">' +
      country.chartSections.map((section) => chartSectionMarkup(country, section)).join("") + "</section>" +
    '<p class="thailand-scope-note"><strong>口径：</strong>' + escapeHtml(country.scopeNote) + "</p></div>";
  host.dataset.readyKey = readyKey;
  renderAllCharts(country);
  window.dispatchEvent(new CustomEvent("other-country-trade-dashboard-ready", {
    detail: { route, latestMonth: country.latestMonth, tradeDirection: country.tradeDirection || "export" },
  }));
}

function scheduleProducerPages() {
  if (producerFrame) return;
  producerFrame = requestAnimationFrame(() => {
    producerFrame = 0;
    ensureProducerNavigation();
    renderNewProducerPage();
  });
}

fetch("./data/producer-country-trade-data-v3.json?v=20260827a", { cache: "no-store" })
  .then((response) => {
    if (!response.ok) throw new Error("producer-country-trade-data-v3.json HTTP " + response.status);
    return response.json();
  })
  .then((data) => {
    producerPayload = data;
    window.producerCountryDashboardData = data;
    window.otherCountryTradeDashboardData = data;
    scheduleProducerPages();
  })
  .catch((error) => {
    producerError = error;
    console.error("Other country trade dashboard data load failed", error);
    scheduleProducerPages();
  });

new MutationObserver(scheduleProducerPages).observe(producerApp || document.body, { childList: true, subtree: true });
window.addEventListener("hashchange", scheduleProducerPages);
