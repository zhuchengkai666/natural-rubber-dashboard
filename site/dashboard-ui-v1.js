import { wanTFromKt } from "./dashboard-mass-unit-v1.js";

const dashboardUiApp = document.querySelector("#app");
let dashboardUiData = null;
let dashboardUiPromise = null;
let dashboardUiFrame = 0;

const dashboardUiStyle = document.createElement("style");
dashboardUiStyle.textContent = `
.topbar { display: none !important; }
.content-wrap { padding-top: 34px !important; }
.page-intro {
  align-items: flex-start !important;
  margin-bottom: 24px !important;
}
.page-intro .eyebrow,
.page-intro .page-description,
.intro-stamp {
  display: none !important;
}
.intro-controls {
  display: grid;
  grid-template-columns: 120px 90px;
  gap: 22px;
  align-items: start;
  min-height: 50px;
  padding: 0;
  white-space: nowrap;
}
.intro-controls.futures-intro-controls {
  display: flex;
  align-items: flex-start;
  min-height: 36px;
}
.futures-refresh-button {
  min-width: 104px;
  height: 36px;
  padding: 0 15px;
  border: 1px solid var(--line);
  border-radius: 3px;
  background: #fff;
  color: var(--ink);
  cursor: pointer;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: .06em;
  transition: border-color .16s ease, background-color .16s ease, color .16s ease;
}
.futures-refresh-button:hover {
  border-color: var(--ink);
  background: #f5f7f8;
}
.futures-refresh-button:disabled {
  color: var(--muted-2);
  cursor: wait;
  opacity: .7;
}
.intro-control {
  display: grid;
  gap: 7px;
  min-width: 0;
}
.intro-control-label {
  height: 14px;
  color: var(--muted-2);
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: .08em;
  line-height: 14px;
}
.intro-control-value {
  height: 20px;
  color: var(--ink);
  font-family: var(--font-mono);
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
  font-variant-numeric: tabular-nums;
}
.headline-metrics {
  display: grid;
  grid-template-columns: repeat(2, 268px);
  gap: 14px;
  width: max-content;
  margin: 0 0 26px;
}
.headline-metric {
  min-height: 118px;
  padding: 18px 21px 15px;
  border: 1px solid var(--line);
  border-top: 2px solid var(--red);
  border-radius: 6px;
  background: #fff;
  box-shadow: 0 9px 24px rgb(37 42 48 / 7%);
}
.headline-metric-label {
  display: block;
  margin-bottom: 13px;
  color: var(--muted);
  font-size: 12px;
  font-weight: 600;
}
.headline-metric-value {
  display: block;
  color: var(--ink);
  font-family: var(--font-mono);
  font-size: 31px;
  font-weight: 700;
  letter-spacing: -.075em;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.headline-metric-value em {
  margin-left: 6px;
  color: var(--muted);
  font-family: var(--font-sans);
  font-size: 13px;
  font-style: normal;
  font-weight: 500;
  letter-spacing: 0;
}
.headline-metric-note {
  display: inline-block;
  margin-top: 13px;
  color: #7e8792;
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: .01em;
  text-shadow: none;
}
.headline-metric-note.is-positive {
  color: var(--red);
  text-shadow: 0 2px 8px rgb(241 38 38 / 20%);
}
.headline-metric-note.is-negative {
  color: #3f8b61;
  text-shadow: 0 2px 8px rgb(63 139 97 / 22%);
}
@media (max-width: 760px) {
  .intro-controls { grid-template-columns: 100px 80px; gap: 12px; }
  .headline-metrics { grid-template-columns: repeat(2, 220px); }
  .headline-metric { padding-left: 17px; padding-right: 17px; }
  .headline-metric-value { font-size: 27px; }
}
`;
document.head.appendChild(dashboardUiStyle);

function dashboardUiRoute() {
  const parts = window.location.hash.replace(/^#/, "").split("/");
  return { primary: parts[0] || "overview", itemId: parts[1] || "" };
}

function dashboardUiFormatKt(value) {
  const quantity = wanTFromKt(value);
  return quantity === null ? "—" : quantity.toFixed(1);
}

function dashboardUiFormatRate(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "—";
  const percent = Number(value) * 100;
  return (percent >= 0 ? "+" : "") + percent.toFixed(1) + "%";
}

function dashboardUiRateClass(value) {
  if (!Number.isFinite(Number(value))) return "";
  return Number(value) > 0 ? " is-positive" : Number(value) < 0 ? " is-negative" : "";
}

function dashboardUiLatest(series) {
  return (series || []).find((item) => item.month === dashboardUiData?.latestMonth) || null;
}

function dashboardUiSelected() {
  const route = dashboardUiRoute();
  const items = route.primary === "countries" ? dashboardUiData?.countries : dashboardUiData?.products;
  return (items || []).find((item) => item.id === route.itemId) || null;
}

function dashboardUiLabel(item, suffix) {
  const base = item?.label === "乳胶" ? "乳胶（未折干）" : item?.label || "橡胶";
  return base + suffix;
}

function dashboardUiMetricMarkup(item) {
  const route = dashboardUiRoute();
  const metric = dashboardUiLatest(item?.series);
  if (!metric) return "";
  const isOverview = route.primary === "overview";
  const labelBase = isOverview ? "中国橡胶进口" : route.primary === "countries" ? (item.label + "橡胶") : dashboardUiLabel(item, "");
  const totalLabel = labelBase + "总量" + (isOverview ? "（折干）" : "");
  const ytdLabel = labelBase + "累计量" + (isOverview ? "（折干）" : "");
  return '<section class="headline-metrics" aria-label="关键进口量指标">' +
    '<article class="headline-metric"><span class="headline-metric-label">' + totalLabel + '</span><strong class="headline-metric-value">' + dashboardUiFormatKt(metric.valueKt) + '<em>万吨</em></strong><small class="headline-metric-note' + dashboardUiRateClass(metric.yoyRate) + '">同比 ' + dashboardUiFormatRate(metric.yoyRate) + '</small></article>' +
    '<article class="headline-metric"><span class="headline-metric-label">' + ytdLabel + '</span><strong class="headline-metric-value">' + dashboardUiFormatKt(metric.ytdKt) + '<em>万吨</em></strong><small class="headline-metric-note' + dashboardUiRateClass(metric.ytdYoyRate) + '">累计同比 ' + dashboardUiFormatRate(metric.ytdYoyRate) + '</small></article>' +
    '</section>';
}

function dashboardUiToast(message, isError = false) {
  document.querySelector(".dashboard-toast")?.remove();
  const toast = document.createElement("div");
  toast.className = "dashboard-toast";
  toast.textContent = message;
  if (isError) toast.style.borderColor = "#b42318";
  document.body.appendChild(toast);
  window.setTimeout(() => toast.remove(), isError ? 7000 : 4200);
}

function dashboardUiApply() {
  if (!dashboardUiApp || !dashboardUiData) return;
  const intro = dashboardUiApp.querySelector(".page-intro");
  if (!intro) return;
  const route = dashboardUiRoute();
  if (!["overview", "countries", "products", "futures_rubber", "futures_position_rank"].includes(route.primary)) return;
  const isFutures = route.primary === "futures_rubber";
  const isPositionRank = route.primary === "futures_position_rank";
  const latest = isFutures
    ? (window.futuresRubberUiData?.latestDate || "—")
    : isPositionRank
      ? (window.positionRankUiData?.latestDate || "—")
    : (dashboardUiData.latestMonth || "");
  let controls = intro.querySelector(".intro-controls");
  if (!controls) {
    controls = document.createElement("div");
    controls.className = "intro-controls";
    intro.appendChild(controls);
  }
  const key = latest + "|" + route.primary + "|" + (isFutures ? "futures" : "imports");
  if (controls.dataset.uiKey !== key) {
    controls.classList.toggle("futures-intro-controls", isFutures || isPositionRank);
    controls.innerHTML = isFutures || isPositionRank
      ? '<div class="intro-control"><span class="intro-control-label">最新日期</span><strong class="intro-control-value">' + latest + '</strong></div>'
      : '<div class="intro-control"><span class="intro-control-label">更新月份</span><strong class="intro-control-value">' + latest + '</strong></div>' +
        '<div class="intro-control"><span class="intro-control-label">单位</span><strong class="intro-control-value">万吨</strong></div>';
    controls.dataset.uiKey = key;
  }
      
  const metricMount = dashboardUiApp.querySelector(".headline-metrics");
  if (isFutures) {
    metricMount?.remove();
    return;
  }
  const selected = route.primary === "overview" ? dashboardUiData?.overview : dashboardUiSelected();
  if (!selected) {
    metricMount?.remove();
    return;
  }
  if (!metricMount) {
    const fragment = document.createRange().createContextualFragment(dashboardUiMetricMarkup(selected));
    intro.insertAdjacentElement("afterend", fragment.firstElementChild);
  }
}

function dashboardUiSchedule() {
  if (dashboardUiFrame) return;
  dashboardUiFrame = requestAnimationFrame(() => {
    dashboardUiFrame = 0;
    dashboardUiApply();
  });
}

dashboardUiPromise = fetch("./data/dashboard-data.json?v=20260723", { cache: "no-store" })
  .then((response) => response.ok ? response.json() : null)
  .then((data) => {
    dashboardUiData = data;
    dashboardUiSchedule();
  })
  .catch((error) => console.error("dashboard ui data load failed", error));

new MutationObserver(dashboardUiSchedule).observe(dashboardUiApp || document.body, { childList: true, subtree: true });
window.addEventListener("hashchange", dashboardUiSchedule);
window.addEventListener('futures-rubber-data-ready', dashboardUiSchedule);

window.addEventListener('position-rank-data-ready', dashboardUiSchedule);
