import { wanTFromKt } from "./dashboard-mass-unit-v1.js";

const app = document.querySelector("#app");
let dashboardData = null;

function dashboardEscapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

const routeMeta = {
  futures_rubber: { title: "月差/持仓", kicker: "01 / FUTURES RUBBER", description: "用天然橡胶、20号胶和丁二烯橡胶的日度月差与持仓序列观察季节性。" },
  futures_position_rank: { title: "持仓龙虎榜", kicker: "02 / POSITION RANK", description: "仅展示 RU、NR、BR 各合约前 20 名会员的多空持仓及日增减，缺失数据不补零。" },
  weather_history: { title: "历史天气情况", kicker: "03 / WEATHER TRACKING", description: "" },
  weather_driver_detection: { title: "天气驱动因子检测", kicker: "03 / WEATHER TRACKING", description: "基于最新已同步天气驱动图表的观测与预测解读。" },
  overview: { title: "中国橡胶进口总览", kicker: "01 / OVERVIEW", description: "用一个总量变量观察中国橡胶进口的季节性、节奏与同比变化。" },
  countries: { title: "进口自各国", kicker: "02 / ORIGIN", description: "展示最近 60 个月月均进口量达到 0.1 万吨的国家、地区及组合口径。" },
  products: { title: "各胶种", kicker: "03 / PRODUCTS", description: "展示最近 60 个月月均进口量达到 0.1 万吨的胶种序列。" },
  tire_export: { title: "中国轮胎出口", kicker: "03 / TIRE EXPORT", description: "轮胎出口数据挂载区，后续接入按类别、国家和地区组织的重量序列。" },
  international_demand_observation: { title: "国际需求观察", kicker: "04 / INTERNATIONAL DEMAND", description: "用泰国、越南、印尼、马来西亚和科特迪瓦的出口中国、非中国地区及占比序列观察海外需求分布。" },
  latex_diversion_observation: { title: "胶水分流观察", kicker: "04 / LATEX DIVERSION", description: "对照中国进口与泰国、越南出口的乳胶折干、烟片胶及两项合计月度走势。" },
  thailand: { title: "泰国橡胶出口", kicker: "04 / PRODUCER EXPORT / THAILAND", description: "集中展示泰国橡胶出口、分品种、分国家、轮胎出口及综合净出口。" },
  vietnam: { title: "越南橡胶出口", kicker: "04 / PRODUCER EXPORT / VIETNAM", description: "集中展示越南橡胶总出口、分品种、出口分国家、进口分国家及轮胎出口折耗胶。" },
  custom_analysis: { title: "自定义分析", kicker: "06 / CUSTOM ANALYSIS", description: "从 DuckDB 指标目录选择时间序列，组合公式并保存为可复用的分析页面。" }
};

const rubberExportChildren = [
  { key: "overview", label: "中国总览", sub: "TOTAL IMPORT" },
  { key: "countries", label: "分国别", sub: "BY ORIGIN" },
  { key: "products", label: "分胶种", sub: "BY PRODUCT" }
];

const producerExportChildren = [
  { key: "international_demand_observation", label: "国际需求观察", sub: "INTERNATIONAL DEMAND" },
  { key: "latex_diversion_observation", label: "胶水分流观察", sub: "LATEX DIVERSION" },
  { key: "thailand", label: "泰国", sub: "THAILAND" },
  { key: "vietnam", label: "越南", sub: "VIETNAM" }
];

const routes = [
  { key: "futures_rubber", index: "01", label: "月差/持仓", sub: "MONTH SPREAD / OPEN INTEREST" },
  { key: "futures_position_rank", index: "02", label: "持仓龙虎榜", sub: "POSITION RANK / TOP 20" },
  { key: "rubber_export", index: "03", label: "中国橡胶进口", sub: "CHINA RUBBER IMPORT" },
  { key: "tire_export", index: "04", label: "中国轮胎出口", sub: "CHINA TIRE EXPORT" },
  { key: "producer_export", index: "05", label: "主产国出口", sub: "PRODUCER EXPORT" },
  { key: "custom_analysis", index: "06", label: "自定义分析", sub: "CUSTOM ANALYSIS" }
];

function countryItems() { return dashboardData ? dashboardData.countries : []; }
function productItems() { return dashboardData ? dashboardData.products : []; }
function customPageItems() {
  return Array.isArray(window.customDashboardPages)
    ? window.customDashboardPages.filter((item) => !item.isDeleted).map((item) => ({ ...item, label: item.title }))
    : [];
}

// Directory nodes always resolve to the first available child page.
function defaultChildRoute(primary) {
  const items = primary === "countries" ? countryItems() : primary === "products" ? productItems() : [];
  return items[0] ? primary + "/" + items[0].id : primary;
}

function formatKt(value) {
  const quantity = wanTFromKt(value);
  return quantity === null ? "—" : quantity.toLocaleString("zh-CN", { maximumFractionDigits: 1 });
}

function formatRate(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "—";
  const number = Number(value) * 100;
  return (number >= 0 ? "+" : "") + number.toFixed(1) + "%";
}

function getRoute() {
  const raw = window.location.hash.replace(/^#\/?/, "");
  const parts = raw.split("?")[0].split("/");
  const known = parts[0] !== "custom_analysis" && (Boolean(routeMeta[parts[0]]) || window.dashboardNavigationHasRoute?.(parts[0]));
  if (!known) {
    window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search + "#futures_rubber");
    parts.splice(0, parts.length, "futures_rubber");
  } else if (window.location.hash.startsWith("#/")) {
    window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search + "#" + raw);
  }
  // Known extension routes still use the existing base shell until their renderer mounts.
  const primary = routeMeta[parts[0]] ? parts[0] : "overview";
  const items = primary === "countries"
    ? countryItems()
    : primary === "products"
      ? productItems()
      : primary === "custom_analysis" ? customPageItems() : [];
  const itemId = parts[1] || (items[0] ? items[0].id : "");
  return { primary, selected: items.find((item) => item.id === itemId) || null };
}

function customAnalysisChildNavMarkup(route) {
  if (route.primary !== "custom_analysis") return "";
  const pages = customPageItems();
  if (!pages.length) return "";
  return '<div class="subnav" aria-label="自定义分析页面">' + pages.map((item) => {
    const active = route.selected && route.selected.id === item.id ? " active" : "";
    return '<a class="subnav-item' + active + '" href="#custom_analysis/' + item.id + '"><span>' + dashboardEscapeHtml(item.label) + '</span><small>↗</small></a>';
  }).join("") + '</div>';
}

function isRubberExportRoute(primary) {
  return rubberExportChildren.some((item) => item.key === primary);
}

function rubberExportChildNavMarkup(route) {
  if (!isRubberExportRoute(route.primary)) return "";
  return '<div class="subnav primary-subnav" aria-label="中国橡胶进口">' +
    rubberExportChildren.map((item) => {
      const active = item.key === route.primary ? " active" : "";
      const target = item.key === "countries" || item.key === "products" ? defaultChildRoute(item.key) : item.key;
      return '<a class="subnav-item primary-subnav-item' + active + '" href="#' + target + '"><span>' + item.label + '</span><small>↗</small></a>';
    }).join("") + '</div>';
}

function isProducerExportRoute(primary) {
  return producerExportChildren.some((item) => item.key === primary);
}

function producerExportChildNavMarkup(route) {
  if (!isProducerExportRoute(route.primary)) return "";
  return '<div class="subnav primary-subnav" aria-label="主产国出口">' +
    producerExportChildren.map((item) => {
      const active = item.key === route.primary ? " active" : "";
      return '<a class="subnav-item primary-subnav-item' + active + '" href="#' + item.key + '"><span>' + item.label + '</span><small>↗</small></a>';
    }).join("") + '</div>';
}

function childNavMarkup(items, primary, route) {
  if (route.primary !== primary) return "";
  return '<div class="subnav" aria-label="' + (primary === "countries" ? "国家和地区" : "胶种") + '">' +
    items.map((item) => {
      const active = route.selected && route.selected.id === item.id ? " active" : "";
      const synthetic = item.isSynthetic ? '<em>组合</em>' : "";
      return '<a class="subnav-item' + active + '" href="#' + primary + '/' + item.id + '"><span>' + item.label + synthetic + '</span><small>↗</small></a>';
    }).join("") + '</div>';
}

function navMarkup(route) {
  if (window.dashboardNavigationRender) return window.dashboardNavigationRender(route, countryItems(), productItems());
  return routes.map((item) => {
    const isDirectory = item.key === "rubber_export" || item.key === "producer_export" || item.key === "custom_analysis";
    const active = item.key === "rubber_export"
      ? isRubberExportRoute(route.primary)
      : item.key === "producer_export" ? isProducerExportRoute(route.primary) : item.key === route.primary;
    const target = item.key === "rubber_export"
      ? "overview"
      : item.key === "producer_export"
        ? producerExportChildren[0]?.key || "overview"
        : item.key === "custom_analysis"
          ? (customPageItems()[0] ? "custom_analysis/" + customPageItems()[0].id : "custom_analysis")
          : item.key;
    const arrow = isDirectory ? (active ? "⌃" : "⌄") : "↗";
    const detailChildren = route.primary === "countries"
      ? childNavMarkup(countryItems(), "countries", route)
      : route.primary === "products" ? childNavMarkup(productItems(), "products", route) : "";
    const children = item.key === "rubber_export"
      ? rubberExportChildNavMarkup(route) + detailChildren
      : item.key === "producer_export"
        ? producerExportChildNavMarkup(route)
        : item.key === "custom_analysis" ? customAnalysisChildNavMarkup(route) : "";
    return '<button class="nav-item' + (active ? " active" : "") + '" data-route="' + target + '" type="button">' +
      '<span class="nav-index">' + item.index + '</span>' +
      '<span class="nav-copy"><strong>' + item.label + '</strong><small>' + item.sub + '</small></span>' +
      '<span class="nav-arrow">' + arrow + '</span>' +
    '</button>' + children;
  }).join("");
}

function shellMarkup(route) {
  const meta = routeMeta[route.primary];
  const isPositionRank = route.primary === "futures_position_rank";
  const isCustom = route.primary === "custom_analysis";
  const isWeatherHistory = route.primary === "weather_history";
  const isWeatherDriver = route.primary === "weather_driver_detection";
  const pageTitle = route.selected ? route.selected.label : meta.title;
  const pageDescription = route.primary === "custom_analysis" && route.selected
    ? "按已保存的 DuckDB 指标和公式实时生成折线图。"
    : route.primary === "tire_export"
    ? meta.description
    : route.selected ? "查看 " + route.selected.label + " 的中国进口趋势与同比变化。" : meta.description;
  const pageKicker = route.selected ? meta.kicker + " / " + route.selected.label : meta.kicker;
  const latestHeader = isCustom ? "实时查询" : isPositionRank ? (window.positionRankUiData?.latestDate || "—") : isWeatherHistory ? "打开时读取" : isWeatherDriver ? "最新已同步" : dashboardData.latestMonth;
  const introUnit = isWeatherHistory ? "IMAGE" : isWeatherDriver ? "AI" : isCustom ? "AUTO" : isPositionRank ? "手" : ["overview", "countries", "products", "latex_diversion_observation"].includes(route.primary) ? "万吨" : "kt";
  const introNote = isWeatherHistory ? "LOCAL / LATEST FILE" : isWeatherDriver ? "基于已同步图表" : isCustom ? "DUCKDB / FORMULA / LINE" : isPositionRank ? "DAILY / LONG / SHORT / NET" : "MONTHLY / YTD / YOY";
  const introStamp = isWeatherDriver
    ? '<div class="intro-stamp weather-driver-actions"><small data-weather-last-updated>最后成功更新：读取中</small><small data-weather-refresh-status role="status" aria-live="polite"></small></div>'
    : '<div class="intro-stamp"><span>UNIT</span><strong>' + introUnit + '</strong><small>' + introNote + '</small></div>';
  const headerMarkup = isWeatherHistory ? '' : '<header class="topbar"><div class="breadcrumb"><span>' + (isWeatherDriver ? 'WEATHER' : isPositionRank ? 'FUTURES' : 'CN CUSTOMS') + '</span><i>/</i><span>' + meta.kicker + '</span></div>' +
    '<div class="topbar-meta"><span class="update-dot"></span><span>' + (isWeatherDriver ? '最后更新' : isCustom ? '数据方式' : isPositionRank ? '最新交易日' : '最新月份') + '</span><strong' + (isWeatherDriver ? ' data-weather-header-updated' : '') + '>' + latestHeader + '</strong></div></header>';
  const introMarkup = isWeatherHistory ? '' : '<section class="page-intro"><div><p class="eyebrow">' + dashboardEscapeHtml(pageKicker) + '</p><h1>' + dashboardEscapeHtml(pageTitle) + '</h1><p class="page-description">' + dashboardEscapeHtml(pageDescription) + '</p></div>' + introStamp + '</section>';
  return '<div class="app-shell">' +
    '<aside class="sidebar"><a class="brand" href="#futures_rubber"><span class="brand-mark">R</span><span><strong>RUBBER</strong><small>RUBBER DATA DASHBOARD</small></span></a>' +
      '<div class="sidebar-rule"></div><p class="sidebar-label">ANALYSIS</p><nav class="main-nav" aria-label="主导航">' + navMarkup(route) + '</nav>' +
      '<div class="sidebar-bottom"><div class="status-line"><span class="status-dot"></span><span>WAREHOUSE READY</span></div><p>Customs data monitor<br />Rubber / tire / other series</p></div>' +
    '</aside><main class="main-content' + (isWeatherHistory ? ' weather-history-main' : '') + '">' + headerMarkup +
      '<div class="content-wrap">' + introMarkup + renderPage(route) + '</div></main></div>';
}

function renderPage(route) {
  if (route.primary === "futures_rubber") return futuresRubberPage();
  if (route.primary === "futures_position_rank") return futuresPositionRankPage();
  if (route.primary === "weather_history") return '<section class="weather-history-page-host" aria-label="历史天气情况"><img data-weather-original data-clipboard-src="/api/weather/latest-image?format=png" src="./weather-history.jpg?v=' + Date.now() + '" alt="最新CPC橡胶天气日报" loading="eager"></section>';
  if (route.primary === "weather_driver_detection") return '<section class="weather-driver-page-host" aria-label="天气驱动因子检测"><div class="data-loading">正在载入天气资料…</div></section>';
  if (route.primary === "countries") return countriesPage(route);
  if (route.primary === "products") return productsPage(route);
  if (route.primary === "tire_export") return tireExportPage();
  if (route.primary === "international_demand_observation") return internationalDemandObservationPage();
  if (route.primary === "latex_diversion_observation") return latexDiversionObservationPage();
  if (route.primary === "thailand") return thailandPage();
  if (route.primary === "vietnam") return vietnamPage();
  if (route.primary === "custom_analysis") return customAnalysisPage();
  return overviewPage();
}

function customAnalysisPage() {
  return '<section class="custom-analysis-page-host" aria-label="自定义分析"><div class="data-loading"><span class="status-dot"></span><span>正在加载自定义页面与指标目录</span></div></section>';
}

function futuresRubberPage() {
  return '<section class="futures-page-host" aria-label="月差与持仓日度季节性"><div class="data-loading"><span class="status-dot"></span><span>正在加载期货日度数据</span></div></section>';
}

function futuresPositionRankPage() {
  return '<section class="futures-position-rank-page-host" aria-label="持仓龙虎榜"><div class="data-loading"><span class="status-dot"></span><span>正在加载持仓龙虎榜数据</span></div></section>';
}

function tireExportPage() {
  return '<section class="framework-page tire-export-page" aria-label="中国轮胎出口数据挂载区">' +
    '<div class="framework-hero"><span class="large-index">03</span><div><p class="module-kicker">TIRE EXPORT WORKSPACE</p><h2>中国轮胎出口</h2><p>一级栏目已建立，后续将在此接入轮胎类别、国家与地区的出口重量数据。</p></div></div>' +
    '<div class="empty-module"><span class="empty-mark">03</span><div><h3>轮胎出口数据挂载区</h3><p>当前不设置二级栏目，待数据接入后直接在本页展示。</p></div></div>' +
  '</section>';
}

function thailandPage() {
  return '<section class="thailand-page-host" aria-label="泰国橡胶出口"><div class="data-loading"><span class="status-dot"></span><span>正在加载泰国橡胶出口数据</span></div></section>';
}

function internationalDemandObservationPage() {
  return '<section class="international-demand-page-host" aria-label="国际需求观察"><div class="data-loading"><span class="status-dot"></span><span>正在加载国际需求观察数据</span></div></section>';
}

function latexDiversionObservationPage() {
  return '<section class="latex-diversion-page-host" aria-label="胶水分流观察"><div class="data-loading"><span class="status-dot"></span><span>正在加载胶水分流观察数据</span></div></section>';
}

function vietnamPage() {
  return '<section class="vietnam-page-host" aria-label="越南橡胶出口"><div class="data-loading"><span class="status-dot"></span><span>正在加载越南橡胶进出口数据</span></div></section>';
}

function overviewPage() {
  const overview = dashboardData.overview;
  const stats = [
    { label: "当月总进口", value: formatKt(overview.latestKt), unit: "万吨", note: dashboardData.latestMonth },
    { label: "年度累计", value: formatKt(overview.ytdKt), unit: "万吨", note: dashboardData.latestMonth.slice(0, 4) + " YTD" },
    { label: "当月同比", value: formatRate(overview.yoyRate), unit: "", note: "vs " + (Number(dashboardData.latestMonth.slice(0, 4)) - 1) + "-" + dashboardData.latestMonth.slice(5), tone: overview.yoyRate >= 0 ? "positive" : "negative" },
    { label: "数据月份", value: String(dashboardData.availableMonths), unit: "months", note: dashboardData.window.start + " → " + dashboardData.window.end }
  ];
  return '<section class="metric-grid">' + stats.map((item) => '<article class="metric-card"><p>' + item.label + '</p><div class="metric-value' + (item.tone ? " " + item.tone : "") + '">' + item.value + '<small>' + item.unit + '</small></div><span>' + item.note + '</span></article>').join("") + '</section>' +
    '<section class="module-grid overview-grid"><article class="module-panel chart-module"><header class="module-header"><div><p class="module-kicker">VISUALIZATION MOUNT / 01</p><h2>季节性进口折线图</h2></div><a class="module-link" href="./chart-template/index.html?cachebust=2023" target="_blank" rel="noreferrer">打开模板 ↗</a></header>' +
      '<div class="chart-mount"><div class="mount-topline"><span>SEASONAL LINE + YOY BAR</span><span>RECENT 6 YEARS</span></div><div class="mount-visual"><div class="mount-axis left"></div><div class="mount-lines"><span class="mount-line line-1"></span><span class="mount-line line-2"></span><span class="mount-line line-3"></span><span class="mount-line line-4"></span><span class="mount-line line-5"></span><span class="mount-line line-6"></span><div class="mount-bars"><i></i><i></i><i></i><i></i><i></i><i></i></div></div><div class="mount-axis right"></div></div><div class="mount-note"><span>已确认的季节性图表模板</span><span>数据源已接入筛选清单</span></div></div></article>' +
    '<aside class="module-panel decision-module"><header class="module-header"><div><p class="module-kicker">BUILD SEQUENCE / 02</p><h2>下一步</h2></div></header><div class="decision-list"><div class="decision-row"><span>01</span><div><strong>图表接入</strong><p>把最近 6 年月度序列接入已确认的折线加同比柱模板。</p></div></div><div class="decision-row"><span>02</span><div><strong>表格接入</strong><p>在图表下方展示当月量、累计量、同比与累计同比。</p></div></div><div class="decision-row"><span>03</span><div><strong>路由完善</strong><p>让国家和胶种子栏目读取各自的真实序列。</p></div></div></div></aside></section>' +
    '<section class="lower-strip"><div><span class="strip-number">A</span><strong>中国总览</strong><p>当前页面作为默认入口，突出总进口量和季节性节奏。</p></div><div><span class="strip-number">B</span><strong>进口自各国</strong><p>当前已筛出 ' + countryItems().length + ' 个达到阈值的国家和地区口径。</p></div><div><span class="strip-number">C</span><strong>各胶种</strong><p>当前已筛出 ' + productItems().length + ' 个达到阈值的胶种序列。</p></div></section>';
}

function countriesPage(route) {
  const selected = route.selected;
  const selectedTitle = selected ? selected.label + "进口视图" : "进口各国视图";
  const description = selected ? "当前已选择 " + selected.label + "，月均进口量约 " + formatKt(selected.avgMonthlyKt) + " 万吨。" : "国家与地区按最近 60 个月月均进口量筛选，组合地区单独保留。";
  return '<section class="framework-page"><div class="framework-hero"><span class="large-index">02</span><div><p class="module-kicker">ORIGIN WORKSPACE</p><h2>' + selectedTitle + '</h2><p>' + description + '</p></div></div>' +
    '<div class="framework-grid"><article class="framework-card"><span>DIMENSION</span><strong>国家 / 地区</strong><p>当前展示 ' + countryItems().length + ' 个达到阈值的国家、地区及组合口径。</p></article><article class="framework-card"><span>FILTER</span><strong>≥ 0.1 万吨 / 月</strong><p>以最近 ' + dashboardData.window.months + ' 个月的月均总进口量作为展示判断。</p></article><article class="framework-card"><span>OUTPUT</span><strong>图表 + 表格</strong><p>按选中的国家序列展示月度量、累计量及同比指标。</p></article></div>' +
    '<div class="empty-module"><span class="empty-mark">02</span><div><h3>' + selectedTitle + '挂载区</h3><p>数据序列已准备，下一阶段接入季节性图表和指标表格。</p></div></div></section>';
}

function productsPage(route) {
  const selected = route.selected;
  const selectedTitle = selected ? selected.label + "进口视图" : "胶种进口视图";
  const description = selected ? "当前已选择 " + selected.label + "，月均进口量约 " + formatKt(selected.avgMonthlyKt) + " 万吨。" : "胶种按最近 60 个月月均进口量筛选，低于阈值的胶种不进入默认栏目。";
  return '<section class="framework-page"><div class="framework-hero"><span class="large-index">03</span><div><p class="module-kicker">PRODUCT WORKSPACE</p><h2>' + selectedTitle + '</h2><p>' + description + '</p></div></div>' +
    '<div class="framework-grid"><article class="framework-card"><span>DIMENSION</span><strong>产品组</strong><p>当前展示 ' + productItems().length + ' 个达到阈值的胶种栏目，巴拉塔胶仍保留在数据库中。</p></article><article class="framework-card"><span>FILTER</span><strong>≥ 0.1 万吨 / 月</strong><p>以最近 ' + dashboardData.window.months + ' 个月的月均进口量作为展示判断。</p></article><article class="framework-card"><span>OUTPUT</span><strong>图表 + 表格</strong><p>显示当月量、累计量、同比与累计同比。</p></article></div>' +
    '<div class="empty-module"><span class="empty-mark">03</span><div><h3>' + selectedTitle + '挂载区</h3><p>数据序列已准备，下一阶段接入季节性图表和指标表格。</p></div></div></section>';
}

function bindNavigation() {
  document.querySelectorAll("[data-route]").forEach((item) => item.addEventListener("click", () => { window.location.hash = item.dataset.route; }));
}

function render() {
  if (!dashboardData) return;
  const route = getRoute();
  app.innerHTML = shellMarkup(route);
  bindNavigation();
  document.title = route.primary === "futures_rubber"
      ? "月差/持仓｜RUBBER DASHBOARD"
      : route.primary === "tire_export"
      ? "中国轮胎出口｜RUBBER DASHBOARD"
      : route.primary === "international_demand_observation"
        ? "国际需求观察｜RUBBER DASHBOARD"
      : route.primary === "latex_diversion_observation"
        ? "胶水分流观察｜RUBBER DASHBOARD"
      : route.primary === "thailand"
      ? "泰国橡胶出口｜RUBBER DASHBOARD"
      : route.primary === "vietnam"
        ? "越南橡胶出口｜RUBBER DASHBOARD"
      : route.primary === "custom_analysis"
        ? (route.selected ? route.selected.label : "自定义分析") + "｜RUBBER DASHBOARD"
      : route.primary === "futures_position_rank"
        ? "持仓龙虎榜｜RUBBER DASHBOARD"
      : route.primary === "weather_history"
        ? "历史天气情况｜天气跟踪｜RUBBER DASHBOARD"
      : route.primary === "weather_driver_detection"
        ? "天气驱动因子检测｜天气跟踪｜RUBBER DASHBOARD"
      : route.primary === "overview"
        ? "中国橡胶进口总览｜RUBBER DASHBOARD"
        : (route.selected ? route.selected.label : routeMeta[route.primary].title) + "｜中国橡胶进口｜RUBBER DASHBOARD";
}

async function boot() {
  try {
    const response = await fetch("./data/dashboard-data.json?v=20230722", { cache: "no-store" });
    if (!response.ok) throw new Error("dashboard-data.json HTTP " + response.status);
    dashboardData = await response.json();
    render();
  } catch (error) {
    app.innerHTML = '<main class="data-error"><p class="eyebrow">DATA LOAD ERROR</p><h1>数据清单暂不可用</h1><p>请先运行 海关数据/管线/中国进口/export_dashboard_data.py 生成前端数据文件。</p><code>' + error.message + '</code></main>';
    console.error(error);
  }
}

window.addEventListener("hashchange", render);
window.rubberDashboardRender = render;
boot();
