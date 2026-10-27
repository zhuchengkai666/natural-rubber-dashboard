import { renderEditableDailyChart } from "./dashboard-editable-chart-runtime-v2.js?v=20261026a";

const futuresApp = document.querySelector("#app");
let futuresData = null;
let futuresDataPromise = null;
let futuresRefreshPromise = null;
const FUTURES_MIN_SPREAD_OPEN_INTEREST = 300;

const futuresStyle = document.createElement("style");
futuresStyle.textContent = `
.futures-page {
  display: grid;
  gap: 36px;
}
.futures-section {
  display: grid;
  gap: 14px;
}
.futures-section-heading {
  display: flex;
  align-items: baseline;
  gap: 14px;
  padding-bottom: 9px;
  border-bottom: 1px solid var(--line);
}
.futures-section-heading h2 {
  margin: 0;
  color: var(--ink);
  font-size: 21px;
  font-weight: 600;
  letter-spacing: -.04em;
}
.futures-section-heading span {
  color: var(--muted-2);
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: .08em;
}
.futures-large-chart-card {
  width: min(80%, 1080px);
  min-width: 760px;
  margin: 0 auto;
  border: 1px solid var(--line);
  background: #fff;
}
.futures-chart-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 18px;
  align-items: end;
  padding: 17px 20px 11px;
  border-bottom: 1px solid var(--line-soft);
}
.futures-chart-title {
  min-width: 0;
}
.futures-chart-title h2 {
  margin: 0;
  color: var(--ink);
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -.03em;
}
.futures-chart-title p {
  margin: 6px 0 0;
  color: var(--muted-2);
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: .05em;
}
.futures-chart-header .country-chart-meta {
  display: flex;
  gap: 12px;
  margin-top: 7px;
  color: var(--muted-2);
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: .04em;
  text-transform: uppercase;
}
.futures-controls {
  display: flex;
  align-items: end;
  gap: 10px;
}
.futures-control {
  display: grid;
  gap: 6px;
}
.futures-control label {
  color: var(--muted-2);
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: .06em;
}
.futures-control select {
  min-width: 150px;
  height: 32px;
  padding: 0 28px 0 10px;
  border: 1px solid var(--line);
  border-radius: 3px;
  color: var(--ink);
  background: #fff;
  font-family: var(--font-mono);
  font-size: 11px;
}
.futures-chart-legend {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 8px 14px;
  min-height: 26px;
  padding: 8px 20px 4px;
  overflow: hidden;
  white-space: nowrap;
}
.futures-chart-legend .legend-item {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 5px;
  color: #68727b;
  font-family: var(--font-mono);
  font-size: 9px;
}
.futures-chart-legend .legend-swatch {
  display: inline-block;
  width: 20px;
  height: 2px;
}
.futures-chart-stage {
  position: relative;
  min-height: 420px !important;
  height: 420px !important;
  padding: 3px 8px 8px;
}
.futures-large-chart-card.futures-large-chart-card .futures-chart-stage {
  min-height: 420px !important;
  height: 420px !important;
  padding: 3px 8px 8px !important;
}
.futures-large-chart-card .seasonal-chart {
  display: block;
  width: 100%;
  height: 410px !important;
}
.futures-small-groups {
  display: grid;
  gap: 22px;
}
.futures-product-group {
  display: grid;
  gap: 10px;
}
.futures-product-group-header {
  display: flex;
  align-items: baseline;
  gap: 10px;
  min-height: 27px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--line-soft);
}
.futures-product-group-header h3 {
  margin: 0;
  color: var(--ink);
  font-size: 15px;
  font-weight: 600;
}
.futures-product-group-header span {
  color: var(--muted-2);
  font-family: var(--font-mono);
  font-size: 9px;
}
.futures-small-chart-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}
.futures-small-chart-card {
  min-width: 0;
  border: 1px solid var(--line);
  background: #fff;
}
.futures-small-chart-card .country-chart-header {
  min-height: 54px;
  padding: 11px 14px 7px;
  border-bottom: 0;
}
.futures-small-chart-card .country-chart-header h2 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}
.futures-small-chart-card .country-chart-meta {
  display: flex;
  gap: 10px;
  margin-top: 6px;
  color: var(--muted-2);
  font-family: var(--font-mono);
  font-size: 8px;
}
.futures-small-chart-card .country-chart-legend {
  display: flex;
  gap: 7px 11px;
  min-height: 23px;
  padding: 5px 14px 2px;
  overflow: hidden;
  white-space: nowrap;
}
.futures-small-chart-card .chart-stage {
  position: relative;
  height: 250px;
  min-height: 250px;
  padding: 2px 4px 4px;
}
.futures-small-chart-card .seasonal-chart {
  display: block;
  width: 100%;
  height: 244px;
}
.futures-page .chart-tooltip {
  position: absolute;
  z-index: 2;
  display: none;
  min-width: 142px;
  padding: 9px 10px;
  border: 1px solid #c7cdd3;
  color: var(--ink);
  background: #fff;
  box-shadow: 0 8px 22px rgb(35 43 50 / 12%);
  font-family: var(--font-mono);
  font-size: 9px;
  pointer-events: none;
}
.futures-page .tooltip-title {
  margin-bottom: 6px;
  color: var(--ink);
  font-weight: 600;
}
.futures-page .tooltip-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  line-height: 1.65;
}
.futures-page .tooltip-value {
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}
@media (max-width: 900px) {
  .futures-large-chart-card { width: 100%; min-width: 0; }
  .futures-chart-header { grid-template-columns: 1fr; align-items: start; }
  .futures-controls { flex-wrap: wrap; }
}
`;
document.head.appendChild(futuresStyle);

function futuresEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function futuresRoute() {
  return (window.location.hash.replace(/^#/, "").split("/")[0] || "overview");
}

function productByCode(code) {
  return (futuresData?.products || []).find((item) => item.code === code) || futuresData?.products?.[0] || null;
}

function spreadByValue(value) {
  const [productCode, spreadCode] = String(value || "").split("|");
  const product = productByCode(productCode);
  return { product, spread: product?.spreads?.find((item) => item.code === spreadCode) || product?.spreads?.[0] || null };
}

function chartMarkup(title, unit, className, large = false, seriesId = title) {
  const cardClass = large ? "country-chart futures-large-chart-card " : "country-chart futures-small-chart-card ";
  const headerClass = large ? "futures-chart-header" : "country-chart-header";
  return '<article class="' + cardClass + className + '" data-series-id="' + futuresEscape(seriesId) + '" data-chart-type="daily-seasonal" data-chart-size="' + (large ? 'four-fifths' : 'third') + '">' +
    '<header class="' + headerClass + '">' +
      '<div class="futures-chart-title"><h2 class="futures-card-title">' + futuresEscape(title) + '</h2><p class="futures-card-subtitle">DAILY SEASONAL / RECENT 6 YEARS</p></div>' +
      '<div class="country-chart-meta"><span>单位 / ' + futuresEscape(unit) + '</span><span>日度值</span></div>' +
    '</header>' +
    '<div class="country-chart-legend futures-chart-legend" aria-label="图例"></div>' +
    '<div class="chart-stage futures-chart-stage"><svg class="seasonal-chart" role="img" aria-label="' + futuresEscape(title) + '日度季节性图表"></svg><div class="chart-tooltip"></div></div>' +
  '</article>';
}

function futuresPageMarkup() {
  return '<section class="futures-page">' +
    '<section class="futures-section futures-spread-section" aria-labelledby="futures-spread-heading">' +
      '<div class="futures-section-heading"><h2 id="futures-spread-heading">月差</h2><span>DAILY CALENDAR SPREAD SEASONALITY</span></div>' +
      '<article class="country-chart futures-large-chart-card futures-spread-main-card" data-series-id="futures:spread:main" data-chart-type="daily-seasonal" data-chart-size="four-fifths">' +
        '<header class="futures-chart-header">' +
          '<div class="futures-chart-title"><h2 class="futures-card-title">月差季节性</h2><p class="futures-card-subtitle">DAILY SEASONAL / RECENT 6 YEARS</p><div class="country-chart-meta"><span>单位 / 元/吨</span><span>日度收盘价差</span></div></div>' +
          '<div class="futures-controls"><div class="futures-control"><label for="futures-spread-select">选择月差</label><select id="futures-spread-select"></select></div></div>' +
        '</header>' +
        '<div class="country-chart-legend futures-chart-legend" aria-label="图例"></div>' +
        '<div class="chart-stage futures-chart-stage"><svg class="seasonal-chart" role="img" aria-label="月差日度季节性图表"></svg><div class="chart-tooltip"></div></div>' +
      '</article>' +
      '<div class="futures-small-groups"></div>' +
    '</section>' +
    '<section class="futures-section futures-position-section" aria-labelledby="futures-position-heading">' +
      '<div class="futures-section-heading"><h2 id="futures-position-heading">持仓</h2><span>DAILY OPEN INTEREST SEASONALITY</span></div>' +
      '<article class="country-chart futures-large-chart-card futures-position-main-card" data-series-id="futures:position:main" data-chart-type="daily-seasonal" data-chart-size="four-fifths">' +
        '<header class="futures-chart-header">' +
          '<div class="futures-chart-title"><h2 class="futures-card-title">持仓季节性</h2><p class="futures-card-subtitle">DAILY SEASONAL / RECENT 6 YEARS</p><div class="country-chart-meta"><span>单位 / 手</span><span>日度持仓量</span></div></div>' +
          '<div class="futures-controls">' +
            '<div class="futures-control"><label for="futures-product-select">选择品种</label><select id="futures-product-select"></select></div>' +
            '<div class="futures-control"><label for="futures-contract-select">选择合约</label><select id="futures-contract-select"></select></div>' +
          '</div>' +
        '</header>' +
        '<div class="country-chart-legend futures-chart-legend" aria-label="图例"></div>' +
        '<div class="chart-stage futures-chart-stage"><svg class="seasonal-chart" role="img" aria-label="持仓日度季节性图表"></svg><div class="chart-tooltip"></div></div>' +
      '</article>' +
    '</section>' +
  '</section>';
}

function renderChart(card, series, unit, template, options = {}) {
  if (!card) return;
  const minSpreadOpenInterest = Number(options.minSpreadOpenInterest);
  const excludeCalendarMonth = Number(options.excludeCalendarMonth);
  const chartSeries = (series || []).filter((point) => {
    if (Number.isFinite(minSpreadOpenInterest) && Number(point.spreadOpenInterest) < minSpreadOpenInterest) return false;
    if (Number.isFinite(excludeCalendarMonth)) {
      const month = Number(String(point.date || "").slice(5, 7));
      if (month === excludeCalendarMonth) return false;
    }
    return true;
  });
  renderEditableDailyChart({
    card,
    chartId: card.dataset.seriesId,
    sourceLabel: options.sourceLabel || card.dataset.seriesId,
    title: card.querySelector("h2")?.textContent,
    unit,
    metrics: options.metrics,
    systemChartId: options.systemChartId,
    svg: card.querySelector(".seasonal-chart"),
    stage: card.querySelector(".chart-stage"),
    tooltip: card.querySelector(".chart-tooltip"),
    legend: card.querySelector(".country-chart-legend"),
    series: chartSeries,
    template,
    tooltipUnit: unit,
    valueDigits: 0,
    fullYear: Boolean(options.fullYear),
    crossYear: Boolean(options.crossYear),
    axisStartYear: options.axisStartYear,
    axisStartMonth: options.axisStartMonth,
    axisEndYear: options.axisEndYear,
    axisEndMonth: options.axisEndMonth,
  });
}

function spreadCycleChart(spread) {
  const points = Array.isArray(spread?.series) ? spread.series : [];
  const nearMonth = Number(spread?.nearMonth);
  const eligiblePoints = points.filter((point) => {
    const spreadOpenInterest = Number(point.spreadOpenInterest);
    const calendarMonth = Number(String(point.date || "").slice(5, 7));
    return spreadOpenInterest >= FUTURES_MIN_SPREAD_OPEN_INTEREST && calendarMonth !== nearMonth;
  });
  const cycles = [...new Set(eligiblePoints.map((point) => Number(point.nearContractYear)).filter(Number.isFinite))].sort((left, right) => left - right);
  const visibleCycles = cycles.slice(-6);
  const visibleCycleSet = new Set(visibleCycles);
  const latestCycle = visibleCycles.at(-1);
  if (!Number.isFinite(latestCycle) || !Number.isFinite(nearMonth)) {
    return { series: points, options: {} };
  }

  const anchorYear = 2000;
  const syntheticTimestamp = (point) => {
    const cycleYear = Number(point.nearContractYear);
    const [year, month, day] = String(point.date || "").split("-").map(Number);
    if (![cycleYear, year, month, day].every(Number.isFinite)) return null;
    return Date.UTC(anchorYear + year - cycleYear, month - 1, day);
  };
  const visibleTimestamps = eligiblePoints
    .filter((point) => visibleCycleSet.has(Number(point.nearContractYear)))
    .map(syntheticTimestamp)
    .filter(Number.isFinite);
  if (!visibleTimestamps.length) return { series: points, options: {} };

  const startDate = new Date(Math.min(...visibleTimestamps));
  const endDate = new Date(Math.max(...visibleTimestamps));
  const startSyntheticYear = startDate.getUTCFullYear();
  const endSyntheticYear = endDate.getUTCFullYear();
  const axisStartMonth = startDate.getUTCMonth() + 1;
  const axisEndMonth = endDate.getUTCMonth() + 1;
  const axisStartYear = latestCycle + startSyntheticYear - anchorYear;
  const axisEndYear = latestCycle + endSyntheticYear - anchorYear;
  const timelineStart = Date.UTC(startSyntheticYear, axisStartMonth - 1, 1);
  const timelineEnd = Date.UTC(endSyntheticYear, axisEndMonth, 1);
  const timelineSpan = Math.max(timelineEnd - timelineStart, 1);

  const series = points.flatMap((point) => {
    const cycleYear = Number(point.nearContractYear);
    const syntheticDate = syntheticTimestamp(point);
    if (!Number.isFinite(syntheticDate) || !Number.isFinite(cycleYear)) return [];
    const nearCode = String(point.nearContractCode || "");
    const farCode = String(point.farContractCode || "");
    return [{
      ...point,
      groupKey: nearCode + "|" + farCode,
      groupLabel: nearCode.slice(2) + "-" + farCode.slice(2),
      groupOrder: cycleYear,
      groupYear: cycleYear + startSyntheticYear - anchorYear,
      timelineCoordinate: (syntheticDate - timelineStart) / timelineSpan,
      timelineAxisStartYear: axisStartYear,
      timelineAxisStartMonth: axisStartMonth,
      timelineAxisEndYear: axisEndYear,
      timelineAxisEndMonth: axisEndMonth,
    }];
  });

  return {
    series,
    options: { crossYear: true, axisStartYear, axisStartMonth, axisEndYear, axisEndMonth },
  };
}
function renderSpreadMain(host) {
  const select = host.querySelector("#futures-spread-select");
  const { product, spread } = spreadByValue(select?.value);
  const card = host.querySelector(".futures-spread-main-card");
  if (!product || !spread || !card) return;
  const chart = spreadCycleChart(spread);
  card.querySelector(".futures-card-title").textContent = spread.code;
  card.querySelector(".futures-card-subtitle").textContent = product.name + " · DAILY SEASONAL / RECENT 6 YEARS";
  renderChart(card, chart.series, product.priceUnit || "元/吨", "large", {
    ...chart.options,
    minSpreadOpenInterest: FUTURES_MIN_SPREAD_OPEN_INTEREST,
    excludeCalendarMonth: spread.nearMonth,
    sourceLabel: `${product.code} ${spread.code} 月差收盘价差`,
    systemChartId: `futures:spread:${product.code}:${spread.code}`,
    metrics: [{
      alias: "A",
      id: "mart.futures_rubber_month_spread_daily.spread_close_price",
      label: `${spread.code} 月差收盘价差（近月收盘价－远月收盘价）`,
    }],
  });
}

function contractMonthNumber(contract) {
  const deliveryMonth = Number(contract?.deliveryMonth);
  if (Number.isFinite(deliveryMonth) && deliveryMonth >= 1 && deliveryMonth <= 12) return deliveryMonth;
  const match = String(contract?.code || "").match(/(\d{2})$/);
  const parsed = match ? Number(match[1]) : NaN;
  return Number.isFinite(parsed) && parsed >= 1 && parsed <= 12 ? parsed : null;
}

function contractMonthFamily(product, month) {
  const candidates = (product?.contracts || [])
    .filter((contract) => contractMonthNumber(contract) === Number(month))
    .map((contract) => ({
      contract,
      series: [...(contract.series || [])].sort((left, right) => String(left.date).localeCompare(String(right.date))),
    }))
    .filter(({ series }) => series.length)
    .sort((left, right) => Number(left.contract.contractYear) - Number(right.contract.contractYear) || String(left.contract.code).localeCompare(String(right.contract.code)));
  const recentCandidates = candidates.slice(-6);
  const recentContracts = recentCandidates.map(({ contract }) => contract);
  const anchor = recentCandidates.at(-1);
  const anchorSeries = anchor?.series || [];
  const anchorFirst = String(anchorSeries[0]?.date || "").split("-").map(Number);
  const axisStartYear = Number(anchorFirst[0]);
  const axisStartMonth = Number(anchorFirst[1]);
  const axisEndYear = Number(anchor?.contract?.contractYear);
  const axisEndMonth = contractMonthNumber(anchor?.contract);
  const timelineStart = Date.UTC(2000, axisStartMonth - 1, 1);
  const timelineEnd = Date.UTC(2000 + axisEndYear - axisStartYear, axisEndMonth, 1);
  const timelineSpan = Math.max(timelineEnd - timelineStart, 1);
  const series = recentCandidates.flatMap(({ contract, series: contractSeries }) => {
    const sortedSeries = [...contractSeries].sort((left, right) => String(left.date).localeCompare(String(right.date)));
    const firstParts = String(sortedSeries[0]?.date || "").split("-").map(Number);
    const contractStartYear = Number(firstParts[0]);
    return sortedSeries.map((point) => {
      const parts = String(point.date || "").split("-").map(Number);
      const pointYear = Number(parts[0]);
      const pointMonth = Number(parts[1]);
      const pointDay = Number(parts[2]);
      const syntheticDate = Date.UTC(2000 + pointYear - contractStartYear, pointMonth - 1, pointDay);
      return {
        ...point,
        groupKey: contract.code,
        groupLabel: contract.code,
        groupOrder: Number(contract.contractYear),
        groupYear: Number(contract.contractYear),
        timelineCoordinate: (syntheticDate - timelineStart) / timelineSpan,
        timelineAxisStartYear: axisStartYear,
        timelineAxisStartMonth: axisStartMonth,
        timelineAxisEndYear: axisEndYear,
        timelineAxisEndMonth: axisEndMonth,
      };
    });
  });
  const code = product.code + String(month).padStart(2, "0");
  return {
    code,
    label: code,
    contracts: recentContracts,
    series,
    crossYear: true,
    axisStartYear,
    axisStartMonth,
    axisEndYear,
    axisEndMonth,
  };
}

function positionSelection(product, selection) {
  if (selection === "__TOTAL__") {
    return { kind: "total", record: product.totalOpenInterest };
  }

  let month = null;
  if (String(selection).startsWith("__MONTH__")) {
    month = Number(String(selection).replace("__MONTH__", ""));
  } else {
    month = null;
  }

  const family = month ? contractMonthFamily(product, month) : null;
  if (family?.contracts.length) {
    return { kind: "contract-family", record: family };
  }
  return { kind: "total", record: product.totalOpenInterest };
}

function renderPositionMain(host) {
  const product = productByCode(host.querySelector("#futures-product-select")?.value);
  const selection = host.querySelector("#futures-contract-select")?.value || "__TOTAL__";
  if (!product) return;

  const selected = positionSelection(product, selection);
  const card = host.querySelector(".futures-position-main-card");
  if (!selected.record || !card) return;

  const isFamily = selected.kind === "contract-family";
  const title = isFamily
    ? selected.record.code
    : product.code + " · 总持仓";
  const subtitle = isFamily
    ? product.name + " · DAILY CONTRACT SEASONAL / RECENT 6 CONTRACTS"
    : product.name + " · DAILY SEASONAL / RECENT 6 YEARS";

  card.querySelector(".futures-card-title").textContent = title;
  card.querySelector(".futures-card-subtitle").textContent = subtitle;

  const anchorContract = isFamily ? selected.record.contracts[selected.record.contracts.length - 1] : null;
  const anchorPoint = isFamily
    ? selected.record.series.find((point) => point.groupKey === anchorContract?.code)
    : null;
  const anchorParts = String(anchorPoint?.date || "").split("-").map(Number);
  const chartOptions = isFamily
    ? {
      crossYear: true,
      axisStartYear: Number.isFinite(Number(selected.record.axisStartYear)) ? Number(selected.record.axisStartYear) : anchorParts[0],
      axisStartMonth: Number.isFinite(Number(selected.record.axisStartMonth)) ? Number(selected.record.axisStartMonth) : anchorParts[1],
      axisEndYear: Number.isFinite(Number(selected.record.axisEndYear)) ? Number(selected.record.axisEndYear) : Number(anchorContract?.contractYear),
      axisEndMonth: Number.isFinite(Number(selected.record.axisEndMonth)) ? Number(selected.record.axisEndMonth) : contractMonthNumber(anchorContract),
      sourceLabel: `${product.code} ${selected.record.code} 合约持仓量`,
      systemChartId: `futures:family:${product.code}:${Number(selection.replace('__MONTH__',''))}`,
      metrics: [{
        alias: "A",
        id: "mart.futures_rubber_daily.open_interest",
        label: `${selected.record.code} 合约持仓量`,
      }],
    }
    : {
      fullYear: true,
      sourceLabel: `${product.code} 总持仓`,
      systemChartId: `futures:total:${product.code}`,
      metrics: [{
        alias: "A",
        id: `futures_${String(product.code || "").toLowerCase()}_open_interest`,
        label: `${product.code} 全部挂牌合约总持仓`,
      }],
    };
  renderChart(card, selected.record.series, product.openInterestUnit || "手", "large", chartOptions);
}

function renderSpreadSmallCards(host) {
  const mount = host.querySelector(".futures-small-groups");
  if (!mount || mount.dataset.ready === "true") return;
  mount.innerHTML = (futuresData.products || []).map((product) => {
    const rankedCodes = (product.topSpreads || []).map((item) => item.code);
    const ranked = rankedCodes.map((code) => product.spreads.find((item) => item.code === code)).filter(Boolean)
      .sort((left, right) => left.nearMonth - right.nearMonth || left.farMonth - right.farMonth || String(left.code).localeCompare(String(right.code)));
    const items = ranked.slice(0, 3);
    return '<section class="futures-product-group" aria-label="' + futuresEscape(product.code) + '月差推荐">' +
      '<div class="futures-product-group-header"><h3>' + futuresEscape(product.code) + '</h3><span>' + futuresEscape(product.name) + '</span></div>' +
      '<div class="futures-small-chart-grid">' +
        items.map((spread) => chartMarkup(spread.code, product.priceUnit || "元/吨", "futures-spread-small-card", false, "futures:spread:" + product.code + ":" + spread.code)).join("") +
      '</div>' +
    '</section>';
  }).join("");
  mount.dataset.ready = "true";
  const cards = [...mount.querySelectorAll(".futures-spread-small-card")];
  let index = 0;
  for (const product of futuresData.products || []) {
    const rankedCodes = (product.topSpreads || []).map((item) => item.code);
    const ranked = rankedCodes.map((code) => product.spreads.find((item) => item.code === code)).filter(Boolean)
      .sort((left, right) => left.nearMonth - right.nearMonth || left.farMonth - right.farMonth || String(left.code).localeCompare(String(right.code)));
    for (const spread of ranked.slice(0, 3)) {
      const card = cards[index++];
      if (!card) continue;
      card.querySelector(".futures-card-title").textContent = spread.code;
      card.querySelector(".futures-card-subtitle").textContent = product.name + " · DAILY SEASONAL";
      const chart = spreadCycleChart(spread);
      renderChart(card, chart.series, product.priceUnit || "元/吨", "small", {
        ...chart.options,
        minSpreadOpenInterest: FUTURES_MIN_SPREAD_OPEN_INTEREST,
        excludeCalendarMonth: spread.nearMonth,
        sourceLabel: `${product.code} ${spread.code} 月差收盘价差`,
        metrics: [{
          alias: "A",
          id: "mart.futures_rubber_month_spread_daily.spread_close_price",
          label: `${spread.code} 月差收盘价差（近月收盘价－远月收盘价）`,
        }],
      });
    }
  }
}

function fillSpreadSelect(host) {
  const select = host.querySelector("#futures-spread-select");
  if (!select || select.dataset.ready === "true") return;
  select.innerHTML = (futuresData.products || []).map((product) =>
    '<optgroup label="' + futuresEscape(product.code + " · " + product.name) + '">' +
      product.spreads.map((spread) => '<option value="' + futuresEscape(product.code + "|" + spread.code) + '">' + futuresEscape(spread.code) + '</option>').join("") +
    '</optgroup>'
  ).join("");
  const preferred = "RU|RU9-1";
  select.value = (futuresData.products.some((product) => product.spreads.some((spread) => product.code + "|" + spread.code === preferred)))
    ? preferred
    : select.options[0]?.value || "";
  select.dataset.ready = "true";
}

function fillPositionSelects(host) {
  const productSelect = host.querySelector("#futures-product-select");
  const contractSelect = host.querySelector("#futures-contract-select");
  if (!productSelect || !contractSelect) return;

  if (productSelect.dataset.ready !== "true") {
    productSelect.innerHTML = (futuresData.products || []).map((product) =>
      '<option value="' + futuresEscape(product.code) + '">' + futuresEscape(product.code + " · " + product.name) + '</option>'
    ).join("");
    productSelect.value = productByCode("RU")?.code || futuresData.products[0]?.code || "";
    productSelect.dataset.ready = "true";
  }

  const product = productByCode(productSelect.value);
  const previous = contractSelect.value;
  const months = [...new Set((product?.contracts || []).map(contractMonthNumber).filter((month) => month !== null))].sort((left, right) => left - right);
  const monthOptions = months.map((month) => {
    const code = product.code + String(month).padStart(2, "0");
    return '<option value="__MONTH__' + String(month).padStart(2, "0") + '">' + futuresEscape(code) + '</option>';
  }).join("");
  contractSelect.innerHTML = '<option value="__TOTAL__">' + TOTAL_LABEL + '</option>' + monthOptions;
  contractSelect.value = [...contractSelect.options].some((option) => option.value === previous) ? previous : "__TOTAL__";
  contractSelect.dataset.ready = "true";
}

const TOTAL_LABEL = String.fromCharCode(24635, 25345, 20179);

function bindFuturesControls(host) {
  if (host.dataset.bound === "true") return;
  host.querySelector("#futures-spread-select")?.addEventListener("change", () => renderSpreadMain(host));
  host.querySelector("#futures-product-select")?.addEventListener("change", () => {
    const contractSelect = host.querySelector("#futures-contract-select");
    if (contractSelect) contractSelect.dataset.ready = "";
    fillPositionSelects(host);
    renderPositionMain(host);
  });
  host.querySelector("#futures-contract-select")?.addEventListener("change", () => renderPositionMain(host));
  host.dataset.bound = "true";
}

function renderFuturesPage() {
  if (futuresRoute() !== "futures_rubber" || !futuresData) return;
  const host = futuresApp?.querySelector(".futures-page-host");
  if (!host) return;
  if (host.dataset.initialized !== "true") {
    host.innerHTML = futuresPageMarkup();
    host.dataset.initialized = "true";
    fillSpreadSelect(host);
    fillPositionSelects(host);
    renderSpreadSmallCards(host);
    bindFuturesControls(host);
  }
  renderSpreadMain(host);
  renderPositionMain(host);
  window.futuresRubberUiData = futuresData;
  window.dispatchEvent(new Event("futures-rubber-data-ready"));
}




futuresDataPromise = fetch("./data/futures-rubber-data.json?v=20260904a", { cache: "no-store" })
  .then((response) => response.ok ? response.json() : Promise.reject(new Error("futures-rubber-data.json HTTP " + response.status)))
  .then((data) => {
    futuresData = data;
    renderFuturesPage();
  })
  .catch((error) => {
    const host = futuresApp?.querySelector(".futures-page-host");
    if (host) host.innerHTML = '<div class="data-error"><p class="eyebrow">FUTURES DATA LOAD ERROR</p><h2>期货日度数据暂不可用</h2><code>' + futuresEscape(error.message) + '</code></div>';
    console.error(error);
  });

window.addEventListener("hashchange", renderFuturesPage);
new MutationObserver(() => {
  const host = futuresApp?.querySelector(".futures-page-host");
  if (futuresRoute() === "futures_rubber" && host && host.dataset.initialized !== "true") {
    renderFuturesPage();
  }
}).observe(futuresApp || document.body, { childList: true, subtree: true });
renderFuturesPage();
