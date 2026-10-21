import { installChartTemplateStyles } from "./三分之一尺寸折线图-同比模板/chart-core.js?v=20260902b";
import { renderEditableMonthlyChart } from "./dashboard-editable-chart-runtime-v2.js?v=20261016b";

const internationalDemandApp = document.querySelector("#app");
const demandCountryConfigs = [
  {
    key: "thailand",
    label: "泰国",
    sourceKey: "thailand",
    suffix: "",
    series: { china: "rubber_export_china_total_export", nonChina: "rubber_destination_non_china", chinaShare: "rubber_china_share" },
  },
  {
    key: "vietnam",
    label: "越南",
    sourceKey: "vietnam",
    suffix: "（不包括复合胶）",
    series: { china: "rubber_export_china_total", nonChina: "rubber_export_non_china_total", chinaShare: "rubber_export_china_share" },
  },
  {
    key: "indonesia",
    label: "印尼",
    sourceKey: "indonesia",
    suffix: "",
    series: { china: "destination_china", nonChina: "destination_non_china", chinaShare: "china_share" },
  },
  {
    key: "malaysia",
    label: "马来西亚",
    sourceKey: "malaysia",
    suffix: "（不包括复合胶）",
    series: { china: "destination_china", nonChina: "destination_non_china", chinaShare: "china_share" },
  },
  {
    key: "cote_divoire",
    label: "科特迪瓦",
    sourceKey: "cote_divoire",
    suffix: "（不包括混合胶、复合胶）",
    series: { china: "destination_china", nonChina: "destination_non_china", chinaShare: "china_share" },
  },
];

const demandMetricConfigs = [
  { key: "china", label: "出口中国橡胶总量", unit: "万吨" },
  { key: "nonChina", label: "出口非中国地区橡胶总量", unit: "万吨" },
  { key: "nonChinaShare", label: "出口非中国地区占比", unit: "%" },
];

let demandSources = null;
let demandError = null;
let demandFrame = 0;
let demandResizeObserver = null;

installChartTemplateStyles();

const demandStyle = document.createElement("style");
demandStyle.textContent = `
.international-demand-page-host { display: block; min-width: 0; }
.international-demand-intro-controls { grid-template-columns: 120px 110px !important; }
.international-demand-layout { display: grid; gap: 34px; min-width: 0; }
.international-demand-chart-sections { display: grid; gap: 34px; min-width: 0; }
.international-demand-country-section { display: grid; gap: 10px; min-width: 0; }
.international-demand-country-section .thailand-section-heading { padding-bottom: 9px; }
.international-demand-country-section .thailand-section-heading h2 { font-size: 16px; }
.international-demand-country-section .thailand-chart-grid { gap: 14px; }
.international-demand-country-section .country-chart-header h2 { font-size: 13px; }
@media (max-width: 1120px) {
  .international-demand-country-section .thailand-chart-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 760px) {
  .international-demand-country-section .thailand-chart-grid { grid-template-columns: 1fr; }
}
`;
document.head.appendChild(demandStyle);

function demandRouteActive() {
  return window.location.hash.replace(/^#/, "").split("/")[0] === "international_demand_observation";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function sourceFor(config) {
  return demandSources?.[config.sourceKey] || null;
}

function latestMonth() {
  return demandCountryConfigs
    .map((config) => sourceFor(config)?.latestMonth)
    .filter(Boolean)
    .sort()
    .at(-1) || "—";
}

function prepareSeries(source, seriesId, metricKey) {
  const sourceSeries = source?.series?.[seriesId];
  if (!sourceSeries) return { id: seriesId, label: seriesId, unit: metricKey === "nonChinaShare" ? "%" : "万吨", values: [] };
  return {
    ...sourceSeries,
    unit: metricKey === "nonChinaShare" ? "%" : sourceSeries.unit,
    values: (sourceSeries.values || []).map((item) => {
      const raw = item?.value;
      const valueKt = raw === null || raw === undefined || raw === ""
        ? null
        : metricKey === "nonChinaShare" ? 100 - Number(raw) : Number(raw);
      return { ...item, valueKt: Number.isFinite(valueKt) ? valueKt : null };
    }),
  };
}

function chartSpecs(config) {
  const source = sourceFor(config);
  return demandMetricConfigs.map((metric) => {
    const seriesId = metric.key === "china" ? config.series.china : metric.key === "nonChina" ? config.series.nonChina : config.series.chinaShare;
    return {
      ...metric,
      series: prepareSeries(source, seriesId, metric.key),
      title: config.label + metric.label + config.suffix,
    };
  });
}

function chartCardMarkup(config, spec, index) {
  const displayUnit = spec.unit || spec.series.unit || "";
  return '<article class="country-chart thailand-chart international-demand-chart" data-chart-index="' + index +
    '" data-country-key="' + escapeHtml(config.key) + '" data-metric-key="' + escapeHtml(spec.key) + '">' +
    '<header class="country-chart-header"><h2>' + escapeHtml(spec.title) +
    '</h2><div class="country-chart-meta"><span>单位 / ' + escapeHtml(displayUnit) +
    '</span><span>同比 / %</span></div></header><div class="country-chart-legend" aria-label="图例"></div>' +
    '<div class="chart-stage"><svg class="seasonal-chart" role="img" aria-label="' +
    escapeHtml(spec.title) + '季节性图表"></svg><div class="chart-tooltip"></div></div></article>';
}

function countrySectionMarkup(config, startIndex) {
  const source = sourceFor(config);
  const specs = chartSpecs(config);
  return '<section class="thailand-chart-section international-demand-country-section" data-country-key="' +
    escapeHtml(config.key) + '"><header class="thailand-section-heading"><h2>' + escapeHtml(config.label) +
    '出口目的地结构</h2><span>更新至 ' + escapeHtml(source?.latestMonth || "—") + ' / EXPORT DESTINATION</span></header>' +
    '<div class="thailand-chart-grid international-demand-chart-grid">' +
    specs.map((spec, index) => chartCardMarkup(config, spec, startIndex + index)).join("") + '</div></section>';
}

function updateIntro() {
  const intro = internationalDemandApp?.querySelector(".page-intro");
  if (!intro) return;
  const heading = intro.querySelector("h1");
  if (heading) heading.textContent = "国际需求观察";
  const description = intro.querySelector(".page-description");
  if (description) description.textContent = "比较五个主产国出口中国与非中国地区的月度数量及需求分布变化。";
  let controls = intro.querySelector(".intro-controls");
  if (!controls) {
    controls = document.createElement("div");
    intro.appendChild(controls);
  }
  controls.className = "intro-controls thailand-intro-controls international-demand-intro-controls";
  controls.innerHTML = '<div class="intro-control"><span class="intro-control-label">最新月份</span><strong class="intro-control-value">' +
    escapeHtml(latestMonth()) + '</strong></div><div class="intro-control"><span class="intro-control-label">单位</span><strong class="intro-control-value">万吨 / %</strong></div>';
}

function renderChart(card) {
  const config = demandCountryConfigs.find((item) => item.key === card.dataset.countryKey);
  if (!config) return;
  const spec = chartSpecs(config).find((item) => item.key === card.dataset.metricKey);
  if (!spec) return;
  renderEditableMonthlyChart({
    card,
    chartId: "demand:" + card.dataset.countryKey + ":" + card.dataset.metricKey,
    sourceLabel: card.dataset.countryKey + "/" + card.dataset.metricKey,
    title: card.querySelector("h2")?.textContent,
    unit: spec.unit,
    svg: card.querySelector(".seasonal-chart"),
    stage: card.querySelector(".chart-stage"),
    tooltip: card.querySelector(".chart-tooltip"),
    legend: card.querySelector(".country-chart-legend"),
    series: spec.series.values,
    tooltipUnit: spec.unit,
  });
}

function renderAllCharts() {
  const cards = [...internationalDemandApp.querySelectorAll(".international-demand-chart")];
  if (demandResizeObserver) demandResizeObserver.disconnect();
  cards.forEach(renderChart);
  if ("ResizeObserver" in window) {
    demandResizeObserver = new ResizeObserver(() => cards.forEach(renderChart));
    cards.forEach((card) => demandResizeObserver.observe(card));
  }
}

function renderDemandPage() {
  if (!demandRouteActive()) return;
  const host = internationalDemandApp?.querySelector(".international-demand-page-host");
  if (!host) return;
  if (demandError) {
    host.innerHTML = '<div class="producer-country-error"><strong>国际需求观察数据加载失败</strong><code>' +
      escapeHtml(demandError.message) + '</code></div>';
    return;
  }
  if (!demandSources) return;
  updateIntro();
  const readyKey = demandCountryConfigs.map((config) => sourceFor(config)?.generatedAt + "|" + sourceFor(config)?.latestMonth).join(";");
  if (host.dataset.readyKey === readyKey && host.querySelectorAll(".international-demand-chart").length === 15) return;
  host.innerHTML = '<div class="international-demand-layout"><section class="thailand-chart-sections international-demand-chart-sections" aria-label="五国出口需求观察图表">' +
    demandCountryConfigs.map((config, index) => countrySectionMarkup(config, index * demandMetricConfigs.length)).join("") +
    '</section><p class="thailand-scope-note"><strong>口径：</strong>出口中国、出口非中国地区及占比沿用各国页面现有序列，缺失月份保留为空，不补零。越南和马来西亚相关三项不包括复合胶；科特迪瓦相关三项不包括混合胶、复合胶。马来西亚数据最新至 ' +
    escapeHtml(sourceFor(demandCountryConfigs.find((config) => config.key === "malaysia"))?.latestMonth || "—") + '。</p></div>';
  host.dataset.readyKey = readyKey;
  renderAllCharts();
  window.dispatchEvent(new CustomEvent("international-demand-dashboard-ready", {
    detail: { latestMonth: latestMonth(), chartCount: 15 },
  }));
}

function scheduleDemandPage() {
  if (demandFrame) return;
  demandFrame = requestAnimationFrame(() => {
    demandFrame = 0;
    renderDemandPage();
  });
}

Promise.all([
  fetch("./data/thailand-trade-data-v2.json?v=20260907a", { cache: "no-store" }).then((response) => {
    if (!response.ok) throw new Error("thailand-trade-data-v2.json HTTP " + response.status);
    return response.json();
  }),
  fetch("./data/vietnam-trade-data-v2.json?v=20260907a", { cache: "no-store" }).then((response) => {
    if (!response.ok) throw new Error("vietnam-trade-data-v2.json HTTP " + response.status);
    return response.json();
  }),
  fetch("./data/producer-country-trade-data-v3.json?v=20260907a", { cache: "no-store" }).then((response) => {
    if (!response.ok) throw new Error("producer-country-trade-data-v3.json HTTP " + response.status);
    return response.json();
  }),
]).then(([thailand, vietnam, producer]) => {
  demandSources = {
    thailand,
    vietnam,
    indonesia: producer.countries?.indonesia,
    malaysia: producer.countries?.malaysia,
    cote_divoire: producer.countries?.cote_divoire,
  };
  if (demandCountryConfigs.some((config) => !sourceFor(config))) throw new Error("生产国出口观察数据缺少国家序列");
  window.internationalDemandObservationData = demandSources;
  scheduleDemandPage();
}).catch((error) => {
  demandError = error;
  console.error("International demand observation data load failed", error);
  scheduleDemandPage();
});

new MutationObserver(scheduleDemandPage).observe(internationalDemandApp || document.body, { childList: true, subtree: true });
window.addEventListener("hashchange", scheduleDemandPage);
