import { installChartTemplateStyles } from "./三分之一尺寸折线图-同比模板/chart-core.js?v=20261019a";
import { renderEditableMonthlyChart } from "./dashboard-editable-chart-runtime-v2.js?v=20261019a";

const diversionApp = document.querySelector("#app");
const diversionGroups = [
  { key: "china", heading: "中国进口验证", country: "中国", direction: "进口",
    latex: "乳胶", smoked: "烟片" },
  { key: "thailand", heading: "泰国胶水分流", country: "泰国", direction: "出口",
    latex: "rubber_export_latex", smoked: "rubber_export_smoked_sheet" },
  { key: "vietnam", heading: "越南胶水分流", country: "越南", direction: "出口",
    latex: "natural_export_400110", smoked: "natural_export_400121" },
];
const diversionComponents = ["latex", "smoked", "combined"];
let diversionSources = null;
let diversionLoading = null;
let diversionError = null;
let diversionFrame = 0;
let diversionResizeObserver = null;

installChartTemplateStyles();

const diversionStyle = document.createElement("style");
diversionStyle.textContent = `
.latex-diversion-page-host { display: block; min-width: 0; }
.latex-diversion-layout, .latex-diversion-chart-sections { display: grid; gap: 34px; min-width: 0; }
.latex-diversion-tables { display: grid; gap: 0; width: max-content; max-width: 100%; min-width: 0; }
.latex-diversion-table { justify-self: start; width: 100%; max-width: 100%; border: 1px solid var(--line); border-radius: 4px; background: #fff; }
.latex-diversion-section { display: grid; gap: 10px; min-width: 0; }
.latex-diversion-chart-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; align-items: start; }
.latex-diversion-chart { min-width: 0; overflow: hidden; }
.latex-diversion-chart .country-chart-header h2 { font-size: 14px; }
@media (max-width: 1120px) { .latex-diversion-chart-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 760px) { .latex-diversion-chart-grid { grid-template-columns: 1fr; } }
`;
document.head.appendChild(diversionStyle);

function diversionActive() {
  return location.hash.replace(/^#/, "").split("/")[0] === "latex_diversion_observation";
}

function diversionEscape(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function diversionTitle(group, component) {
  if (component === "latex") return `${group.country}乳胶${group.direction}（折干）`;
  if (component === "smoked") return `${group.country}烟片${group.direction}`;
  return `${group.country}乳胶＋烟片${group.direction}（折干）`;
}

function diversionSource(group) {
  return diversionSources?.[group.key] || null;
}

function diversionPoints(group, component) {
  const source = diversionSource(group);
  if (!source) return [];
  const raw = group.key === "china"
    ? source.products?.find((product) => product.label === group[component])?.series
    : source.series?.[group[component]]?.values;
  return (raw || []).map((point) => {
    const value = group.key === "china" ? point.valueKt : point.value;
    const scaled = value === null || value === undefined || value === ""
      ? null : Number(value) * (group.key === "china" ? 0.1 * (component === "latex" ? 0.6 : 1) : 1);
    return {
      month: point.month,
      year: Number(point.year || point.month.slice(0, 4)),
      monthNumber: Number(point.monthNumber || point.month.slice(5, 7)),
      valueKt: Number.isFinite(scaled) ? scaled : null,
    };
  });
}

function diversionFallbackSeries(group, component) {
  if (component !== "combined") return diversionPoints(group, component);
  const latex = new Map(diversionPoints(group, "latex").map((point) => [point.month, point.valueKt]));
  const smoked = new Map(diversionPoints(group, "smoked").map((point) => [point.month, point.valueKt]));
  return [...new Set([...latex.keys(), ...smoked.keys()])].sort().map((month) => {
    const a = latex.get(month), b = smoked.get(month);
    return { month, year: Number(month.slice(0, 4)), monthNumber: Number(month.slice(5, 7)),
      valueKt: Number.isFinite(a) && Number.isFinite(b) ? a + b : null };
  });
}

function diversionTableMetric(group, component, cutoffMonth) {
  const values = new Map(diversionFallbackSeries(group, component).map((point) => [point.month, point.valueKt]));
  const valueAt = (month) => {
    const value = values.get(month);
    return Number.isFinite(value) ? value : null;
  };
  const [year, monthNumber] = cutoffMonth.split("-").map(Number);
  const priorYearMonth = `${year - 1}-${String(monthNumber).padStart(2, "0")}`;
  const priorMonthDate = new Date(Date.UTC(year, monthNumber - 2, 1));
  const priorMonth = `${priorMonthDate.getUTCFullYear()}-${String(priorMonthDate.getUTCMonth() + 1).padStart(2, "0")}`;
  const ytdSum = (targetYear) => {
    let total = 0;
    for (let month = 1; month <= monthNumber; month += 1) {
      const value = valueAt(`${targetYear}-${String(month).padStart(2, "0")}`);
      if (value === null) return null;
      total += value;
    }
    return total;
  };
  const rate = (current, previous) => current === null || previous === null || previous === 0
    ? null : (current / previous) - 1;
  const current = valueAt(cutoffMonth);
  const priorYear = valueAt(priorYearMonth);
  const previousMonth = valueAt(priorMonth);
  const ytd = ytdSum(year);
  const priorYtd = ytdSum(year - 1);
  return {
    current, priorYear, previousMonth, ytd, priorYtd,
    yoy: rate(current, priorYear),
    ytdYoy: rate(ytd, priorYtd),
    mom: rate(current, previousMonth),
  };
}

function diversionTableNumber(value) {
  const valid = value !== null && Number.isFinite(value);
  const text = valid ? value.toLocaleString("zh-CN", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : "—";
  return '<td class="' + (valid ? "" : "is-empty") + '">' + text + "</td>";
}

function diversionTableRate(value) {
  const valid = value !== null && Number.isFinite(value);
  const text = valid ? `${value > 0 ? "+" : ""}${(value * 100).toFixed(1)}%` : "—";
  const className = !valid ? "is-empty" : value > 0 ? "is-positive" : value < 0 ? "is-negative" : "";
  return '<td class="' + className + '">' + text + "</td>";
}

function diversionTableMarkup() {
  const latestMonths = [...new Set(diversionGroups.map((group) => diversionSource(group)?.latestMonth).filter(Boolean))].sort();
  if (!latestMonths.length) return "";
  const cutoffMonth = latestMonths[0];
  const [year, month] = cutoffMonth.split("-").map(Number);
  const priorMonthDate = new Date(Date.UTC(year, month - 2, 1));
  const labels = {
    current: `${year}/${month}`,
    priorYear: `${year - 1}/${month}`,
    priorMonth: `${priorMonthDate.getUTCFullYear()}/${priorMonthDate.getUTCMonth() + 1}`,
    currentYtd: `${year}累计`,
    priorYtd: `${year - 1}同期累计`,
  };
  const note = latestMonths.length > 1
    ? `三组数据更新月份不同；为便于对照，表格统一截至共同月份 ${cutoffMonth}。`
    : "";
  const rows = diversionGroups.map((group) => {
    const entries = diversionComponents.map((component) => {
      const metric = diversionTableMetric(group, component, cutoffMonth);
      return '<tr><td>' + diversionEscape(diversionTitle(group, component)) + "</td>" +
        diversionTableNumber(metric.current) + diversionTableNumber(metric.priorYear) +
        diversionTableNumber(metric.previousMonth) + diversionTableNumber(metric.ytd) +
        diversionTableNumber(metric.priorYtd) + diversionTableRate(metric.yoy) +
        diversionTableRate(metric.ytdYoy) + diversionTableRate(metric.mom) + "</tr>";
    }).join("");
    return '<tbody class="dashboard-table-section"><tr class="dashboard-table-subheading"><th colspan="9">' +
      diversionEscape(group.heading) + "</th></tr>" + entries + "</tbody>";
  }).join("");
  return '<article class="dashboard-table-panel latex-diversion-table" data-compact-table data-table-id="latex-diversion-overview">' +
    '<header class="dashboard-table-heading' + (note ? " has-note" : "") + '"><div class="dashboard-table-title-group"><h2 class="dashboard-table-title">胶水分流观察月度指标</h2>' +
    (note ? '<p class="dashboard-table-note">' + diversionEscape(note) + "</p>" : "") +
    '</div><span class="dashboard-table-unit">单位 / 万吨</span></header>' +
    '<div class="dashboard-table-scroll"><table class="dashboard-data-table"><thead><tr><th>项目</th><th>' + labels.current +
    '</th><th>' + labels.priorYear + '</th><th>' + labels.priorMonth + '</th><th>' + labels.currentYtd +
    '</th><th>' + labels.priorYtd + '</th><th>同比</th><th>累计同比</th><th>环比</th></tr></thead>' + rows +
    '</table></div></article>';
}

function diversionCardMarkup(group, component, index) {
  const title = diversionTitle(group, component);
  return '<article class="country-chart thailand-chart latex-diversion-chart" data-country-key="' +
    group.key + '" data-component="' + component + '" data-chart-index="' + index +
    '" data-chart-size="third"><header class="country-chart-header"><h2>' + diversionEscape(title) +
    '</h2><div class="country-chart-meta"><span>单位 / 万吨</span><span>同比 / %</span></div></header>' +
    '<div class="country-chart-legend" aria-label="图例"></div><div class="chart-stage">' +
    '<svg class="seasonal-chart" role="img" aria-label="' + diversionEscape(title) + '季节性图表"></svg>' +
    '<div class="chart-tooltip"></div></div></article>';
}

function diversionSectionMarkup(group, index) {
  return '<section class="thailand-chart-section latex-diversion-section" data-country-key="' + group.key +
    '"><header class="thailand-section-heading"><h2>' + diversionEscape(group.heading) +
    '</h2><span>更新至 ' + diversionEscape(diversionSource(group)?.latestMonth || "—") +
    ' / MONTHLY</span></header><div class="thailand-chart-grid latex-diversion-chart-grid">' +
    diversionComponents.map((component, offset) => diversionCardMarkup(group, component, index * 3 + offset)).join("") +
    '</div></section>';
}

function diversionRenderCard(card) {
  const group = diversionGroups.find((item) => item.key === card.dataset.countryKey);
  const component = card.dataset.component;
  if (!group || !diversionComponents.includes(component)) return;
  renderEditableMonthlyChart({
    card,
    chartId: `diversion:${group.key}:${component}`,
    sourceLabel: `${group.country}/${component}`,
    title: diversionTitle(group, component),
    unit: "万吨",
    svg: card.querySelector(".seasonal-chart"),
    stage: card.querySelector(".chart-stage"),
    tooltip: card.querySelector(".chart-tooltip"),
    legend: card.querySelector(".country-chart-legend"),
    series: diversionFallbackSeries(group, component),
    tooltipUnit: "万吨",
  });
}

function diversionUpdateIntro() {
  const intro = diversionApp?.querySelector(".page-intro");
  if (!intro) return;
  let controls = intro.querySelector(".intro-controls");
  if (!controls) {
    controls = document.createElement("div");
    intro.appendChild(controls);
  }
  controls.className = "intro-controls thailand-intro-controls";
  const months = diversionGroups.map((group) => diversionSource(group)?.latestMonth).filter(Boolean);
  const latest = months.sort().at(-1) || "—";
  const topbarMonth = diversionApp.querySelector(".topbar-meta strong");
  if (topbarMonth) topbarMonth.textContent = latest;
  controls.innerHTML = '<div class="intro-control"><span class="intro-control-label">最新月份</span>' +
    '<strong class="intro-control-value">' + diversionEscape(latest) + '</strong></div>' +
    '<div class="intro-control"><span class="intro-control-label">单位</span>' +
    '<strong class="intro-control-value">万吨</strong></div>';
}

function diversionRender() {
  if (!diversionActive()) return;
  const host = diversionApp?.querySelector(".latex-diversion-page-host");
  if (!host) return;
  if (diversionError) {
    host.innerHTML = '<div class="producer-country-error"><strong>胶水分流观察数据加载失败</strong><code>' +
      diversionEscape(diversionError.message) + '</code></div>';
    return;
  }
  if (!diversionSources) { diversionLoad(); return; }
  const readyKey = diversionGroups.map((group) => {
    const source = diversionSource(group);
    return `${source.generatedAt}|${source.latestMonth}`;
  }).join(";");
  if (host.dataset.readyKey === readyKey && host.querySelectorAll(".latex-diversion-chart").length === 9) return;
  diversionUpdateIntro();
  host.innerHTML = '<div class="latex-diversion-layout"><div class="latex-diversion-tables" aria-label="胶水分流观察月度表格">' + diversionTableMarkup() + '</div>' +
    '<div class="latex-diversion-chart-sections" aria-label="胶水分流观察图表">' +
    diversionGroups.map(diversionSectionMarkup).join("") + '</div>' +
    '<p class="thailand-scope-note"><strong>口径：</strong>中国乳胶进口使用未折干实报量×0.60，' +
    '泰国和越南乳胶出口沿用现有折干序列；烟片按实报重量计。各国“乳胶＋烟片”仅将同月两项有效值相加，' +
    '任一项缺失则当月合计留空，不补零。三国分别采用中国进口、泰国出口、越南出口的全球月度口径，' +
    '不代表三国之间的双边流量；更新月份可能不同。</p></div>';
  host.dataset.readyKey = readyKey;
  const cards = [...host.querySelectorAll(".latex-diversion-chart")];
  diversionResizeObserver?.disconnect();
  cards.forEach(diversionRenderCard);
  if ("ResizeObserver" in window) {
    diversionResizeObserver = new ResizeObserver(() => cards.forEach(diversionRenderCard));
    cards.forEach((card) => diversionResizeObserver.observe(card));
  }
  window.dispatchEvent(new CustomEvent("latex-diversion-dashboard-ready", { detail: { chartCount: 9 } }));
}

function diversionSchedule() {
  if (diversionFrame) return;
  diversionFrame = requestAnimationFrame(() => { diversionFrame = 0; diversionRender(); });
}

function diversionLoad() {
  if (diversionLoading) return;
  const files = ["dashboard-data.json", "thailand-trade-data-v2.json", "vietnam-trade-data-v2.json"];
  diversionLoading = Promise.all(files.map(async (file) => {
    const response = await fetch(`./data/${file}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`${file} HTTP ${response.status}`);
    return response.json();
  })).then(([china, thailand, vietnam]) => {
    diversionSources = { china, thailand, vietnam };
    for (const group of diversionGroups) {
      if (!diversionPoints(group, "latex").length || !diversionPoints(group, "smoked").length) {
        throw new Error(`${group.country}乳胶或烟片月度序列缺失`);
      }
    }
  }).catch((error) => { diversionError = error; console.error("Latex diversion data load failed", error); })
    .finally(() => { diversionLoading = null; diversionSchedule(); });
}

new MutationObserver(diversionSchedule).observe(diversionApp || document.body, { childList: true, subtree: true });
window.addEventListener("hashchange", diversionSchedule);
diversionSchedule();
