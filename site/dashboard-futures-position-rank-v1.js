import { registerEditableChart } from "./dashboard-editable-chart-runtime-v1.js?v=20260914a";
import { availableRankDates, availableRankContracts, rankGroupHasContent, rankDateAfterLoad } from "./dashboard-position-rank-dates-v1.js?v=20261022a";

const rankApp = document.querySelector("#app");
let rankData = null;
let rankLoadPromise = null;
let rankRefreshPromise = null;
const rankCaptureParams = new URLSearchParams(window.location.search);
const rankHashQueryIndex = window.location.hash.indexOf("?");
const rankHashParams = new URLSearchParams(rankHashQueryIndex >= 0 ? window.location.hash.slice(rankHashQueryIndex + 1) : "");
const rankCaptureParam = (name, fallback = "") => rankCaptureParams.get(name) || rankHashParams.get(name) || fallback;
const rankCapturedState = rankCaptureParams.get("native-export") === "1" ? {
  productCode: rankCaptureParam("rank-product", "NR"),
  date: rankCaptureParam("rank-date"),
  contractCode: rankCaptureParam("rank-contract", "MAIN"),
  member: rankCaptureParam("rank-member"),
  aggregateExpanded: rankCaptureParam("rank-aggregate-expanded") === "1",
} : null;
let rankState = {
  productCode: rankCapturedState?.productCode || "NR",
  date: rankCapturedState?.date || "",
  contractCode: rankCapturedState?.contractCode || "MAIN",
  member: rankCapturedState?.member || "",
  memberSearch: "",
  aggregateExpanded: Boolean(rankCapturedState?.aggregateExpanded),
};

const rankStyle = document.createElement("style");
rankStyle.textContent = `
.futures-position-rank-page { display: grid; gap: 22px; }
.position-rank-toolbar {
  display: flex; flex-wrap: wrap; align-items: end; gap: 12px 16px;
  padding: 12px 14px; border: 1px solid var(--line); background: #fff;
}
.position-rank-control { display: grid; gap: 5px; min-width: 160px; }
.position-rank-member-control { min-width: 220px; }
.position-rank-control label { color: var(--muted-2); font-family: var(--font-mono); font-size: 9px; letter-spacing: .06em; }
.position-rank-member-picker { position: relative; }
.position-rank-member-picker input {
  width: 100%; height: 31px; min-width: 0; padding: 0 28px 0 9px; border: 1px solid var(--line);
  border-radius: 3px; color: var(--ink); background: #fff; font-family: var(--font-sans); font-size: 11px;
}
.position-rank-member-picker::after {
  position: absolute; top: 8px; right: 9px; color: var(--muted-2); content: "⌄"; pointer-events: none;
}
.position-rank-member-options {
  position: absolute; z-index: 20; top: calc(100% + 3px); right: 0; left: 0; max-height: 240px; overflow-y: auto;
  padding: 3px; border: 1px solid var(--line); border-radius: 3px; background: #fff; box-shadow: 0 8px 18px rgba(24, 32, 38, .10);
}
.position-rank-member-option {
  display: block; width: 100%; padding: 6px 8px; border: 0; border-radius: 2px; color: var(--ink); background: transparent;
  font-family: var(--font-sans); font-size: 11px; line-height: 16px; text-align: left; cursor: pointer;
}
.position-rank-member-option:hover, .position-rank-member-option[aria-selected="true"] { background: #f0f4f5; }
.position-rank-table-layout {
  display: grid; grid-template-columns: repeat(2, max-content); align-items: start; justify-content: start; gap: 18px;
}
.position-rank-control select {
  height: 31px; min-width: 160px; padding: 0 26px 0 9px; border: 1px solid var(--line);
  border-radius: 3px; color: var(--ink); background: #fff; font-family: var(--font-mono); font-size: 11px;
}
.position-rank-status {
  flex: 1 1 300px; min-height: 31px; padding: 7px 0 0; color: var(--muted-2);
  font-family: var(--font-sans); font-size: 11px; line-height: 17px;
}
.position-rank-status strong { color: var(--ink); font-weight: 600; }
.position-rank-status.is-error strong { color: #a33d3d; }
.position-rank-layout { display: grid; grid-template-columns: minmax(0, 1fr); gap: 22px; }
.position-rank-table-card { width: max-content; max-width: 100%; }
.position-rank-table-card .dashboard-data-table { width: max-content; min-width: 0; table-layout: auto; }
.position-rank-table th, .position-rank-table td { font-size: 11px; font-weight: 500; }
.position-rank-expand-row td { padding-top: 8px; text-align: left; }
.position-rank-expand { padding: 0; border: 0; color: var(--muted-2); background: transparent; font-family: var(--font-mono); font-size: 10px; cursor: pointer; }
.position-rank-expand:hover { color: var(--ink); text-decoration: underline; }
.position-rank-table td.member-cell { text-align: left; font-family: var(--font-sans); }
.position-rank-table td.number-cell, .position-rank-table th.number-cell { text-align: right; }
.position-rank-table td.change-cell.is-positive { color: var(--red); }
.position-rank-table td.change-cell.is-negative { color: #3f8b61; }
.position-rank-table .muted-cell { color: #707b84; }
.futures-position-rank-chart-card {
  width: min(100%, 1120px); border: 1px solid var(--line); background: #fff;
}
.position-rank-chart-header {
  display: flex; justify-content: space-between; gap: 18px; align-items: end;
  padding: 14px 16px 10px; border-bottom: 1px solid var(--line-soft);
}
.position-rank-chart-header h2 { margin: 0; color: var(--ink); font-size: 17px; font-weight: 600; letter-spacing: -.03em; }
.position-rank-chart-header p { margin: 5px 0 0; color: var(--muted-2); font-family: var(--font-mono); font-size: 9px; letter-spacing: .04em; }
.position-rank-chart-meta { color: var(--muted-2); font-family: var(--font-mono); font-size: 9px; white-space: nowrap; }
.position-rank-chart-legend { display: flex; flex-wrap: wrap; gap: 7px 15px; padding: 8px 16px 2px; color: var(--muted-2); font-family: var(--font-mono); font-size: 9px; }
.position-rank-chart-legend span { display: inline-flex; align-items: center; gap: 5px; }
.position-rank-chart-legend i { display: inline-block; width: 18px; height: 2px; }
.position-rank-chart-stage { height: 390px; min-height: 330px; padding: 5px 10px 10px; }
.position-rank-chart-stage { position: relative; }
.position-rank-chart-stage svg { display: block; width: 100%; height: 100%; overflow: visible; }
.position-rank-chart-tooltip {
  position: absolute; z-index: 2; display: none; pointer-events: none; min-width: 168px;
  padding: 9px 10px; border: 1px solid #c7cdd3; background: #fff;
  box-shadow: 0 8px 22px rgb(35 43 50 / 12%); font-family: var(--font-mono); font-size: 10px;
}
.position-rank-chart-tooltip .tooltip-title { margin-bottom: 6px; color: var(--ink); font-weight: 600; }
.position-rank-chart-tooltip .tooltip-row { display: flex; justify-content: space-between; gap: 16px; padding: 2px 0; color: var(--muted); }
.position-rank-chart-tooltip .tooltip-value { color: var(--ink); }
.position-rank-chart-stage text { fill: #7b858e; font-family: var(--font-mono); font-size: 10px; }
.position-rank-chart-stage .grid-line { stroke: #e9edef; stroke-width: 1; }
.position-rank-chart-stage .axis-line { stroke: #cdd3d7; stroke-width: 1; }
.position-rank-chart-stage .crosshair { stroke: #89939d; stroke-dasharray: 3 5; stroke-width: 1; opacity: .65; pointer-events: none; }
.position-rank-chart-stage .series-line { fill: none; stroke-width: 2; vector-effect: non-scaling-stroke; }
.position-rank-chart-stage .series-point { stroke: #fff; stroke-width: 1.5; vector-effect: non-scaling-stroke; }
.position-rank-chart-stage .empty-chart { fill: #7b858e; font-family: var(--font-sans); font-size: 13px; }
.position-rank-note { margin: 0; color: var(--muted-2); font-size: 11px; line-height: 18px; }
@media (max-width: 760px) {
  .position-rank-control, .position-rank-control select, .position-rank-control input { width: 100%; min-width: 0; }
  .position-rank-table-layout { grid-template-columns: minmax(0, max-content); }
  .position-rank-status { flex-basis: 100%; }
  .position-rank-chart-header { align-items: start; flex-direction: column; }
  .position-rank-chart-stage { height: 320px; }
}
`;
document.head.appendChild(rankStyle);

const rankColors = { long: "#c74949", short: "#3f8b61", net: "#365f87" };

function rankEscape(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function rankRoute() { return (window.location.hash.replace(/^#/, "").split("/")[0] || "overview"); }
function rankIsRoute() { return rankRoute() === "futures_position_rank"; }
function rankProducts() { return Array.isArray(rankData?.products) ? rankData.products : []; }
function rankProduct(code) { return rankProducts().find((item) => item.code === code) || rankProducts()[0] || null; }
function rankGroups(productCode, date, contractCode = "ALL") {
  const resolvedContract = rankResolvedContract(productCode, date, contractCode);
  return (rankData?.groups || []).filter((group) => group.productCode === productCode && (!date || group.date === date) && (resolvedContract === "ALL" || group.contractCode === resolvedContract));
}
function rankCoverage(productCode, date) {
  return (rankData?.coverage || []).find((item) => item.productCode === productCode && item.date === date) || null;
}
function rankFormat(value) {
  return value === null || value === undefined || !Number.isFinite(Number(value)) ? "—" : Number(value).toLocaleString("zh-CN");
}
function rankValueClass(value) { return Number(value) > 0 ? "is-positive" : Number(value) < 0 ? "is-negative" : ""; }
function rankRowValues(row) {
  return { rank: row[0], longMember: row[1] || null, long: row[2], longChange: row[3], shortMember: row[4] || null, short: row[5], shortChange: row[6] };
}
function rankGroupRows(group) { return (group?.rows || []).map(rankRowValues); }

function rankMainContract(productCode, date) {
  const targetDate = date || rankData?.latestDate;
  const candidates = (rankData?.groups || [])
    .filter((group) => group.productCode === productCode && (!targetDate || group.date === targetDate))
    .map((group) => ({
      contractCode: group.contractCode,
      disclosedOpenInterest: rankGroupRows(group).reduce((total, row) => {
        const long = Number(row.long);
        const short = Number(row.short);
        return total + (Number.isFinite(long) ? long : 0) + (Number.isFinite(short) ? short : 0);
      }, 0),
    }))
    .filter((item) => item.disclosedOpenInterest > 0)
    .sort((left, right) => right.disclosedOpenInterest - left.disclosedOpenInterest || left.contractCode.localeCompare(right.contractCode));
  return candidates[0]?.contractCode || (rankData?.groups || []).find(group => group.productCode === productCode && group.date === targetDate && rankGroupHasContent(group))?.contractCode || null;
}

function rankResolvedContract(productCode, date, contractCode) {
  return contractCode === "MAIN" ? rankMainContract(productCode, date) : contractCode;
}

function rankContractOptions(product, date) {
  const mainContract = rankMainContract(product?.code, date);
  return [
    { value: "MAIN", label: mainContract ? "主力合约（" + mainContract + "）" : "主力合约" },
    { value: "ALL", label: "全部已披露合约" },
    ...availableRankContracts(rankData, product?.code).map((code) => ({ value: code, label: code })),
  ];
}

function rankAvailableDates(productCode, contractCode = "ALL") {
  return availableRankDates(rankData, productCode, contractCode);
}

function rankMembers(productCode, date, contractCode = "ALL") {
  const ordered = rankAllRows(productCode, date, "", contractCode).map((row) => row.member);
  if (ordered.length && ["MAIN", "ALL"].includes(contractCode)) return ordered;
  const set = new Set(ordered);
  for (const group of rankGroups(productCode, "", contractCode === "MAIN" ? "ALL" : contractCode)) {
    for (const row of rankGroupRows(group)) {
      if (row.longMember) set.add(row.longMember);
      if (row.shortMember) set.add(row.shortMember);
    }
  }
  return [...ordered, ...[...set].filter(member => !ordered.includes(member)).sort((left, right) => left.localeCompare(right, "zh-CN"))];
}

function rankSingleRows(productCode, date, contractCode) {
  const group = rankGroups(productCode, date, contractCode)[0];
  const byRank = new Map(rankGroupRows(group).map((row) => [Number(row.rank), row]));
  return Array.from({ length: 20 }, (_, index) => {
    const row = byRank.get(index + 1) || {};
    return { rank: index + 1, longMember: row.longMember || null, long: row.long ?? null, longChange: row.longChange ?? null, shortMember: row.shortMember || null, short: row.short ?? null, shortChange: row.shortChange ?? null };
  });
}

function rankAllRows(productCode, date, memberFilter = "", contractCode = "ALL") {
  const aggregate = new Map();
  for (const group of rankGroups(productCode, date, contractCode)) {
    for (const row of rankGroupRows(group)) {
      for (const side of ["long", "short"]) {
        const member = side === "long" ? row.longMember : row.shortMember;
        if (!member || (memberFilter && member !== memberFilter)) continue;
        const item = aggregate.get(member) || { member, long: 0, longChange: 0, short: 0, shortChange: 0, longCount: 0, shortCount: 0, contracts: new Set() };
        const value = side === "long" ? row.long : row.short;
        const change = side === "long" ? row.longChange : row.shortChange;
        if (value !== null && value !== undefined && Number.isFinite(Number(value))) {
          item[side] += Number(value); item[side + "Count"] += 1;
        }
        if (change !== null && change !== undefined && Number.isFinite(Number(change))) item[side + "Change"] += Number(change);
        item.contracts.add(group.contractCode);
        aggregate.set(member, item);
      }
    }
  }
  return [...aggregate.values()].map((item) => ({
    member: item.member,
    long: item.longCount ? item.long : null,
    longChange: item.longCount ? item.longChange : null,
    short: item.shortCount ? item.short : null,
    shortChange: item.shortCount ? item.shortChange : null,
    contracts: item.contracts.size,
  })).sort((left, right) => Math.max(Number(right.long || -1), Number(right.short || -1)) - Math.max(Number(left.long || -1), Number(left.short || -1)) || left.member.localeCompare(right.member, "zh-CN"));
}

function rankStatusText(coverage, product) {
  if (!coverage) return "当前交易日暂无覆盖记录";
  const threshold = rankFormat(coverage.thresholdHands || product?.thresholdHands);
  const count = rankFormat(coverage.disclosedContractCount);
  const labels = { published: "已披露前20", not_disclosed: "未达到门槛/未披露", source_unavailable: "源站不可用", parse_error: "解析失败" };
  return '<strong>' + rankEscape(labels[coverage.status] || coverage.status) + '</strong> · 门槛 ' + threshold + ' 手 · 披露合约 ' + count + ' 个' + (coverage.error ? ' · ' + rankEscape(coverage.error.slice(0, 180)) : "");
}

function rankTableMarkup(product, date, contractCode, memberFilter) {
  const single = contractCode !== "ALL";
  const resolvedContract = rankResolvedContract(product.code, date, contractCode);
  const title = single
    ? product.code + " " + (resolvedContract || contractCode) + (contractCode === "MAIN" ? " 主力合约" : "") + "持仓龙虎榜"
    : product.code + " 全部已披露合约席位汇总";
  if (single) {
    const rows = rankSingleRows(product.code, date, contractCode);
    return '<article class="dashboard-table-panel position-rank-table-card" data-compact-table="true"><header class="dashboard-table-heading"><div class="dashboard-table-title-group"><h2 class="dashboard-table-title">' + rankEscape(title) + '</h2></div><span class="dashboard-table-unit">单位 / 手</span></header><div class="dashboard-table-scroll"><table class="dashboard-data-table position-rank-table"><thead><tr><th>多头会员</th><th class="number-cell">多头持仓</th><th class="number-cell">增减</th><th>空头会员</th><th class="number-cell">空头持仓</th><th class="number-cell">增减</th></tr></thead><tbody>' + rows.map((row) => '<tr><td class="member-cell ' + (row.longMember ? "" : "muted-cell") + '">' + rankEscape(row.longMember || "—") + '</td><td class="number-cell ' + (row.long === null ? "muted-cell" : "") + '">' + rankFormat(row.long) + '</td><td class="number-cell change-cell ' + rankValueClass(row.longChange) + '">' + rankFormat(row.longChange) + '</td><td class="member-cell ' + (row.shortMember ? "" : "muted-cell") + '">' + rankEscape(row.shortMember || "—") + '</td><td class="number-cell ' + (row.short === null ? "muted-cell" : "") + '">' + rankFormat(row.short) + '</td><td class="number-cell change-cell ' + rankValueClass(row.shortChange) + '">' + rankFormat(row.shortChange) + '</td></tr>').join("") + '</tbody></table></div></article>';
  }
  const rows = rankAllRows(product.code, date, memberFilter);
  const rowMarkup = (row) => '<tr><td class="member-cell">' + rankEscape(row.member) + '</td><td class="number-cell ' + (row.long === null ? "muted-cell" : "") + '">' + rankFormat(row.long) + '</td><td class="number-cell change-cell ' + rankValueClass(row.longChange) + '">' + rankFormat(row.longChange) + '</td><td class="number-cell ' + (row.short === null ? "muted-cell" : "") + '">' + rankFormat(row.short) + '</td><td class="number-cell change-cell ' + rankValueClass(row.shortChange) + '">' + rankFormat(row.shortChange) + '</td><td class="number-cell">' + rankFormat(row.contracts) + '</td></tr>';
  const visibleRows = rows.slice(0, 20);
  const extraRows = rows.slice(20);
  const aggregateExpanded = Boolean(rankState.aggregateExpanded);
  const extraMarkup = extraRows.length
    ? '<tbody class="position-rank-extra-rows"' + (aggregateExpanded ? '' : ' hidden') + '>' + extraRows.map(rowMarkup).join("") + '</tbody><tfoot><tr class="position-rank-expand-row"><td colspan="6"><button type="button" class="position-rank-expand" aria-expanded="' + (aggregateExpanded ? 'true' : 'false') + '" data-collapsed-label="展开其余 ' + extraRows.length + ' 个席位">' + (aggregateExpanded ? '收起其余席位' : '展开其余 ' + extraRows.length + ' 个席位') + '</button></td></tr></tfoot>'
    : "";
  return '<article class="dashboard-table-panel position-rank-table-card" data-compact-table="true"><header class="dashboard-table-heading"><div class="dashboard-table-title-group"><h2 class="dashboard-table-title">' + rankEscape(title) + '</h2></div><span class="dashboard-table-unit">单位 / 手</span></header><div class="dashboard-table-scroll"><table class="dashboard-data-table position-rank-table"><thead><tr><th>席位</th><th class="number-cell">多头持仓</th><th class="number-cell">增减</th><th class="number-cell">空头持仓</th><th class="number-cell">增减</th><th class="number-cell">披露合约数</th></tr></thead><tbody>' + (visibleRows.length ? visibleRows.map(rowMarkup).join("") : '<tr><td colspan="6" class="muted-cell">—</td></tr>') + '</tbody>' + extraMarkup + '</table></div></article>';
}

function rankNetRows(productCode, date, contractCode) {
  const aggregate = new Map();
  for (const group of rankGroups(productCode, date, contractCode)) {
    for (const row of rankGroupRows(group)) {
      const add = (member, side, value, change) => {
        if (!member || value === null || value === undefined || !Number.isFinite(Number(value))) return;
        const item = aggregate.get(member) || { member, long: 0, short: 0, longChange: 0, shortChange: 0, longSeen: false, shortSeen: false, longChangeSeen: false, shortChangeSeen: false, contracts: new Set() };
        item[side] += Number(value);
        item[side + "Seen"] = true;
        if (change !== null && change !== undefined && Number.isFinite(Number(change))) {
          item[side + "Change"] += Number(change);
          item[side + "ChangeSeen"] = true;
        }
        item.contracts.add(group.contractCode);
        aggregate.set(member, item);
      };
      add(row.longMember, "long", row.long, row.longChange);
      add(row.shortMember, "short", row.short, row.shortChange);
    }
  }
  const eligible = [...aggregate.values()].filter((item) => item.longSeen && item.shortSeen);
  return {
    long: eligible
      .filter((item) => item.long > item.short)
      .map((item) => ({ member: item.member, net: item.long - item.short, netChange: item.longChangeSeen && item.shortChangeSeen ? item.longChange - item.shortChange : null, contracts: item.contracts.size }))
      .sort((left, right) => right.net - left.net || left.member.localeCompare(right.member, "zh-CN")),
    short: eligible
      .filter((item) => item.short > item.long)
      .map((item) => ({ member: item.member, net: item.short - item.long, netChange: item.longChangeSeen && item.shortChangeSeen ? item.shortChange - item.longChange : null, contracts: item.contracts.size }))
      .sort((left, right) => right.net - left.net || left.member.localeCompare(right.member, "zh-CN")),
  };
}

function rankNetCell(row, showContracts) {
  const member = row?.member || "—";
  const valueClass = row ? "" : " muted-cell";
  const count = showContracts ? '<td class="number-cell' + valueClass + '">' + rankFormat(row?.contracts) + '</td>' : "";
  return '<td class="member-cell' + valueClass + '">' + rankEscape(member) + '</td><td class="number-cell' + valueClass + '">' + rankFormat(row?.net) + '</td><td class="number-cell change-cell' + valueClass + ' ' + rankValueClass(row?.netChange) + '">' + rankFormat(row?.netChange) + '</td>' + count;
}

function rankNetTableMarkup(product, date, contractCode) {
  const showContracts = contractCode === "ALL";
  const scopeLabel = contractCode === "MAIN"
    ? "主力合约（" + (rankResolvedContract(product.code, date, contractCode) || "暂无") + "）"
    : contractCode === "ALL" ? "全部已披露合约" : contractCode;
  const rows = rankNetRows(product.code, date, contractCode);
  const rowCount = Math.min(20, Math.max(rows.long.length, rows.short.length));
  const columnCount = showContracts ? 8 : 6;
  const body = rowCount ? Array.from({ length: rowCount }, (_, index) => '<tr>' + rankNetCell(rows.long[index], showContracts) + rankNetCell(rows.short[index], showContracts) + '</tr>').join("") : '<tr><td colspan="' + columnCount + '" class="muted-cell">—</td></tr>';
  const header = showContracts
    ? '<tr><th>净多头席位</th><th class="number-cell">净多头持仓</th><th class="number-cell">增减</th><th class="number-cell">披露合约数</th><th>净空头席位</th><th class="number-cell">净空头持仓</th><th class="number-cell">增减</th><th class="number-cell">披露合约数</th></tr>'
    : '<tr><th>净多头席位</th><th class="number-cell">净多头持仓</th><th class="number-cell">增减</th><th>净空头席位</th><th class="number-cell">净空头持仓</th><th class="number-cell">增减</th></tr>';
  return '<article class="dashboard-table-panel position-rank-table-card position-rank-net-table-card" data-compact-table="true"><header class="dashboard-table-heading"><div class="dashboard-table-title-group"><h2 class="dashboard-table-title">' + rankEscape(product.code + " " + scopeLabel + "净持仓龙虎榜") + '</h2></div><span class="dashboard-table-unit">单位 / 手</span></header><div class="dashboard-table-scroll"><table class="dashboard-data-table position-rank-table position-rank-net-table"><thead>' + header + '</thead><tbody>' + body + '</tbody></table></div></article>';
}

function rankHistory(productCode, contractCode, member) {
  const dates = rankAvailableDates(productCode, contractCode).reverse();
  return dates.map((date) => {
    let long = null; let short = null; let longSeen = false; let shortSeen = false;
    for (const group of rankGroups(productCode, date, contractCode)) {
      for (const row of rankGroupRows(group)) {
        if (row.longMember === member) { longSeen = true; if (row.long !== null && row.long !== undefined) long = (long || 0) + Number(row.long); }
        if (row.shortMember === member) { shortSeen = true; if (row.short !== null && row.short !== undefined) short = (short || 0) + Number(row.short); }
      }
    }
    const longValue = longSeen ? long : null;
    const shortValue = shortSeen ? short : null;
    return { date, long: longValue, short: shortValue, net: longValue !== null && shortValue !== null ? longValue - shortValue : null };
  });
}

function rankSvgMarkers(points, key, x, y) {
  return points.map((point, index) => {
    const value = point[key];
    if (value === null || value === undefined || !Number.isFinite(Number(value))) return "";
    const previous = points[index - 1]?.[key];
    const next = points[index + 1]?.[key];
    const hasPrevious = previous !== null && previous !== undefined && Number.isFinite(Number(previous));
    const hasNext = next !== null && next !== undefined && Number.isFinite(Number(next));
    if (hasPrevious || hasNext) return "";
    return '<circle class="series-point" cx="' + x(index).toFixed(1) + '" cy="' + y(Number(value)).toFixed(1) + '" r="4" fill="' + rankColors[key] + '"></circle>';
  }).join("");
}

function rankSvgPath(points, key, x, y) {
  let path = ""; let open = false;
  for (let index = 0; index < points.length; index += 1) {
    const value = points[index][key];
    if (value === null || value === undefined || !Number.isFinite(Number(value))) { open = false; continue; }
    const command = open ? "L" : "M";
    path += command + x(index).toFixed(1) + "," + y(Number(value)).toFixed(1) + " "; open = true;
  }
  return path.trim();
}

function rankChartMarkup(product, contractCode, member) {
  const scopeLabel = contractCode === "MAIN" ? "主力合约" : contractCode === "ALL" ? "全部已披露合约" : contractCode;
  const title = member ? product.code + " · " + member + " · " + scopeLabel : "选择席位查看持仓历史";
  return '<article class="futures-position-rank-chart-card" data-series-id="futures:position-rank:' + rankEscape(product.code) + ':' + rankEscape(contractCode) + ':' + rankEscape(member || "none") + '" data-chart-type="timeline-multiline" data-chart-size="full"><header class="position-rank-chart-header"><div><h2>' + rankEscape(title) + '</h2><p>历史折线 / 缺失值不插值、不补零</p></div><span class="position-rank-chart-meta">单位 / 手</span></header><div class="position-rank-chart-legend"><span><i style="background:' + rankColors.long + '"></i>多头持仓</span><span><i style="background:' + rankColors.short + '"></i>空头持仓</span><span><i style="background:' + rankColors.net + '"></i>披露净持仓（多减空）</span></div><div class="position-rank-chart-stage" data-rank-chart="true"><div class="position-rank-chart-tooltip" role="status" aria-live="polite"></div></div></article>';
}

function rankPositionTooltip(tooltip, stage, event, fallbackWidth = 190, fallbackHeight = 112) {
  if (!tooltip || !stage || !event) return;
  const stageRect = stage.getBoundingClientRect();
  const stageWidth = Math.max(stage.clientWidth || stageRect.width, 1);
  const stageHeight = Math.max(stage.clientHeight || stageRect.height, 1);
  const pointerX = event.clientX - stageRect.left;
  const pointerY = event.clientY - stageRect.top;
  const gap = 12;
  const edge = 8;
  const measured = tooltip.getBoundingClientRect();
  const tooltipWidth = measured.width || fallbackWidth;
  const tooltipHeight = measured.height || fallbackHeight;
  const rightLeft = pointerX + gap;
  const leftLeft = pointerX - gap - tooltipWidth;
  const rightFits = rightLeft + tooltipWidth <= stageWidth - edge;
  const leftFits = leftLeft >= edge;
  const maxLeft = Math.max(edge, stageWidth - edge - tooltipWidth);
  let left = rightFits ? rightLeft : leftFits ? leftLeft : pointerX >= stageWidth / 2 ? leftLeft : rightLeft;
  left = Math.max(edge, Math.min(maxLeft, left));
  const aboveTop = pointerY - tooltipHeight - gap;
  const belowTop = pointerY + gap;
  const maxTop = Math.max(edge, stageHeight - edge - tooltipHeight);
  let top = aboveTop >= edge ? aboveTop : belowTop <= maxTop ? belowTop : aboveTop;
  top = Math.max(edge, Math.min(maxTop, top));
  tooltip.style.left = Math.round(left) + "px";
  tooltip.style.top = Math.round(top) + "px";
}

function rankRenderSvg(stage, points) {
  const width = 980; const height = 350; const left = 58; const right = 20; const top = 20; const bottom = 42;
  const values = points.flatMap((point) => [point.long, point.short, point.net]).filter((value) => value !== null && Number.isFinite(Number(value))).map(Number);
  const innerWidth = width - left - right; const innerHeight = height - top - bottom;
  const x = (index) => left + (points.length <= 1 ? innerWidth / 2 : index * innerWidth / (points.length - 1));
  const min = values.length ? Math.min(0, ...values) : 0; const max = values.length ? Math.max(1, ...values) : 1; const span = Math.max(max - min, 1);
  const y = (value) => top + (max - value) * innerHeight / span;
  const ticks = Array.from({ length: 5 }, (_, index) => max - span * index / 4);
  const labels = points.length ? [0, Math.floor((points.length - 1) / 2), points.length - 1] : [];
  const tooltip = stage.querySelector(".position-rank-chart-tooltip");
  const chartMarkup = '<svg viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="席位多空持仓历史折线图">' + ticks.map((tick) => '<line class="grid-line" x1="' + left + '" x2="' + (width - right) + '" y1="' + y(tick).toFixed(1) + '" y2="' + y(tick).toFixed(1) + '"></line><text x="' + (left - 8) + '" y="' + (y(tick) + 3).toFixed(1) + '" text-anchor="end">' + rankEscape(rankFormat(Math.round(tick))) + '</text>').join("") + '<line class="axis-line" x1="' + left + '" x2="' + (width - right) + '" y1="' + (height - bottom) + '" y2="' + (height - bottom) + '"></line>' + labels.map((index) => '<text x="' + x(index).toFixed(1) + '" y="' + (height - 14) + '" text-anchor="middle">' + rankEscape(points[index].date) + '</text>').join("") + (values.length ? '<path class="series-line" stroke="' + rankColors.long + '" d="' + rankSvgPath(points, "long", x, y) + '"></path><path class="series-line" stroke="' + rankColors.short + '" d="' + rankSvgPath(points, "short", x, y) + '"></path><path class="series-line" stroke="' + rankColors.net + '" d="' + rankSvgPath(points, "net", x, y) + '"></path>' + rankSvgMarkers(points, "long", x, y) + rankSvgMarkers(points, "short", x, y) + rankSvgMarkers(points, "net", x, y) : '<text class="empty-chart" x="' + (width / 2) + '" y="' + (height / 2) + '" text-anchor="middle">请选择有披露记录的席位</text>') + '</svg>';
  stage.innerHTML = chartMarkup;
  if (tooltip) stage.appendChild(tooltip);
  const svg = stage.querySelector("svg");
  if (!svg || !values.length) {
    if (tooltip) tooltip.style.display = "none";
    return;
  }
  const crosshair = document.createElementNS("http://www.w3.org/2000/svg", "line");
  crosshair.setAttribute("class", "crosshair");
  crosshair.setAttribute("x1", x(0));
  crosshair.setAttribute("x2", x(0));
  crosshair.setAttribute("y1", top);
  crosshair.setAttribute("y2", height - bottom);
  svg.appendChild(crosshair);
  svg.onpointermove = (event) => {
    const rect = svg.getBoundingClientRect();
    const chartX = ((event.clientX - rect.left) / Math.max(rect.width, 1)) * width;
    const clampedX = Math.max(left, Math.min(width - right, chartX));
    const nearestIndex = points.length <= 1 ? 0 : Math.round((clampedX - left) / innerWidth * (points.length - 1));
    const point = points[Math.max(0, Math.min(points.length - 1, nearestIndex))];
    crosshair.setAttribute("x1", x(nearestIndex));
    crosshair.setAttribute("x2", x(nearestIndex));
    tooltip.innerHTML = '<div class="tooltip-title">' + rankEscape(point.date || "日期未知") + '</div>' +
      '<div class="tooltip-row"><span style="color:' + rankColors.long + '">多头持仓</span><span class="tooltip-value">' + rankEscape(rankFormat(point.long)) + ' 手</span></div>' +
      '<div class="tooltip-row"><span style="color:' + rankColors.short + '">空头持仓</span><span class="tooltip-value">' + rankEscape(rankFormat(point.short)) + ' 手</span></div>' +
      '<div class="tooltip-row"><span style="color:' + rankColors.net + '">披露净持仓</span><span class="tooltip-value">' + rankEscape(rankFormat(point.net)) + ' 手</span></div>';
    tooltip.style.display = "block";
    rankPositionTooltip(tooltip, stage, event);
  };
  svg.onpointerleave = () => {
    tooltip.style.display = "none";
    crosshair.setAttribute("x1", x(0));
    crosshair.setAttribute("x2", x(0));
  };
}

function rankSelectMarkup(id, label, options, value) {
  return '<div class="position-rank-control"><label for="' + id + '">' + label + '</label><select id="' + id + '"' + (options.length ? '' : ' disabled') + '>' + (options.length ? options.map((item) => '<option value="' + rankEscape(item.value) + '"' + (item.value === value ? " selected" : "") + '>' + rankEscape(item.label) + '</option>').join("") : '<option value="">暂无数据</option>') + '</select></div>';
}

function rankMemberMarkup(members, value, search) {
  const options = members.map((item) => '<button type="button" class="position-rank-member-option" role="option" aria-selected="' + (item === value ? "true" : "false") + '" data-member="' + rankEscape(item) + '">' + rankEscape(item) + '</button>').join("");
  return '<div class="position-rank-control position-rank-member-control"><label for="position-rank-member-search">席位（历史图）</label><div class="position-rank-member-picker"><input id="position-rank-member-search" type="search" value="' + rankEscape(search || value) + '" placeholder="搜索或选择席位" autocomplete="off" role="combobox" aria-autocomplete="list" aria-controls="position-rank-member-options" aria-expanded="false" aria-label="搜索或选择席位"><div id="position-rank-member-options" class="position-rank-member-options" role="listbox" hidden>' + options + '</div></div></div>';
}

function rankPageMarkup() {
  const product = rankProduct(rankState.productCode);
  if (!["MAIN", "ALL"].includes(rankState.contractCode) && !availableRankContracts(rankData, product?.code).includes(rankState.contractCode)) rankState.contractCode = "MAIN";
  const dates = rankAvailableDates(product?.code, rankState.contractCode);
  if (!dates.includes(rankState.date)) rankState.date = dates[0] || "";
  const contracts = rankContractOptions(product, rankState.date);
  if (!contracts.some((item) => item.value === rankState.contractCode)) rankState.contractCode = "MAIN";
  const members = rankMembers(product?.code, rankState.date, rankState.contractCode);
  if (!members.includes(rankState.member)) {
    rankState.member = members[0] || "";
    rankState.memberSearch = "";
  }
  const dateOptions = dates.map((item) => ({ value: item, label: item }));
  const productOptions = rankProducts().map((item) => ({ value: item.code, label: item.code + " · " + item.name }));
  const coverage = rankCoverage(product?.code, rankState.date);
  return '<section class="futures-position-rank-page" data-ready="false"><div class="position-rank-toolbar">' + rankSelectMarkup("position-rank-product", "品种", productOptions, product?.code || "") + rankSelectMarkup("position-rank-date", "交易日", dateOptions, rankState.date) + rankSelectMarkup("position-rank-contract", "合约范围", contracts, rankState.contractCode) + rankMemberMarkup(members, rankState.member, rankState.memberSearch) + '<p class="position-rank-status' + (coverage?.status === "source_unavailable" || coverage?.status === "parse_error" ? " is-error" : "") + '">' + rankStatusText(coverage, product) + '</p></div><div class="position-rank-layout"><div class="position-rank-table-mount"><div class="position-rank-table-layout">' + (product && rankState.date ? rankTableMarkup(product, rankState.date, rankState.contractCode, "") + rankNetTableMarkup(product, rankState.date, rankState.contractCode) : '<p class="position-rank-note">暂无持仓龙虎榜数据。</p>') + '</div></div>' + rankChartMarkup(product || { code: "", name: "" }, rankState.contractCode, rankState.member) + '</div><p class="position-rank-note">口径：公开日交易排名仅披露达到门槛的合约前20名；主力合约按所选交易日龙虎榜披露多空持仓合计最高的合约确定。净持仓龙虎榜仅纳入同时披露多头和空头数量的席位；净持仓及增减分别为多头减空头、多头增减减空头增减。全部已披露合约按实际披露合约汇总，并显示席位的披露合约数。历史图按一个席位显示多头、空头和“披露净持仓（多减空）”；该净值不代表席位全市场真实持仓。</p></section>';
}

function rankSyncShellMeta() {
  if (!rankIsRoute()) return;
  const latest = rankAvailableDates(rankState.productCode)[0] || "—";
  const meta = document.querySelector(".topbar-meta strong");
  if (meta) meta.textContent = latest;
  const label = document.querySelector(".topbar-meta span:not(.update-dot)");
  if (label) label.textContent = "最新交易日";
}

window.positionRankUiSelection = () => ({
  productCode: rankState.productCode,
  date: rankState.date,
  contractCode: rankState.contractCode,
  member: rankState.member,
  aggregateExpanded: Boolean(rankState.aggregateExpanded),
});

function rankRenderChart(host) {
  const product = rankProduct(rankState.productCode);
  const card = host.querySelector(".futures-position-rank-chart-card");
  const stage = host.querySelector("[data-rank-chart]");
  if (card) registerEditableChart(card, {
    chartId: card.dataset.seriesId,
    chartType: "timeline-multiline",
    sourceLabel: `${rankState.productCode}/${rankState.contractCode}/${rankState.member || "none"}`,
    title: card.querySelector("h2")?.textContent,
    unit: "手",
    size: "full",
    metrics: [
      { alias: "A", id: "long", label: "多头持仓" },
      { alias: "B", id: "short", label: "空头持仓" },
      { alias: "C", id: "net", label: "披露净持仓（多减空）" },
    ],
    parameters: { frequency: "daily", renderer: "position-rank", member: rankState.member || "" },
  });
  if (!product || !stage || !rankState.member) { if (stage) rankRenderSvg(stage, []); return; }
  rankRenderSvg(stage, rankHistory(product.code, rankState.contractCode, rankState.member));
}

function rankApplyMemberSearch(host, open = false) {
  const input = host.querySelector("#position-rank-member-search");
  const list = host.querySelector("#position-rank-member-options");
  if (!input || !list) return;
  const query = String(rankState.memberSearch || "").trim().toLocaleLowerCase();
  [...list.querySelectorAll(".position-rank-member-option")].forEach((option) => {
    option.hidden = Boolean(query && !option.textContent.toLocaleLowerCase().includes(query));
  });
  list.hidden = !open;
  input.setAttribute("aria-expanded", open ? "true" : "false");
}

function rankBind(host) {
  const bind = (id, handler) => host.querySelector("#" + id)?.addEventListener("change", (event) => { handler(event.target.value); rankRenderPage(); });
  bind("position-rank-product", (value) => { rankState.productCode = value; });
  bind("position-rank-date", (value) => { rankState.date = value; });
  bind("position-rank-contract", (value) => { rankState.contractCode = value; });

  const input = host.querySelector("#position-rank-member-search");
  input?.addEventListener("focus", () => rankApplyMemberSearch(host, true));
  input?.addEventListener("input", (event) => {
    rankState.memberSearch = event.target.value;
    rankApplyMemberSearch(host, true);
  });
  input?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      const first = [...host.querySelectorAll(".position-rank-member-option")].find((option) => !option.hidden);
      if (first) {
        rankState.member = first.dataset.member || "";
        rankState.memberSearch = "";
        rankRenderPage();
      }
    } else if (event.key === "Escape") {
      rankApplyMemberSearch(host, false);
    }
  });
  input?.addEventListener("blur", () => setTimeout(() => rankApplyMemberSearch(host, false), 150));
  host.querySelectorAll(".position-rank-member-option").forEach((option) => {
    option.addEventListener("mousedown", (event) => event.preventDefault());
    option.addEventListener("click", () => {
      rankState.member = option.dataset.member || "";
      rankState.memberSearch = "";
      rankRenderPage();
    });
  });
  host.querySelectorAll(".position-rank-expand").forEach((button) => {
    button.addEventListener("click", () => {
      const extraRows = host.querySelector(".position-rank-extra-rows");
      if (!extraRows) return;
      const expanded = extraRows.hidden;
      extraRows.hidden = !expanded;
      rankState.aggregateExpanded = expanded;
      button.setAttribute("aria-expanded", expanded ? "true" : "false");
      button.textContent = expanded ? "收起其余席位" : button.dataset.collapsedLabel;
    });
  });
  rankApplyMemberSearch(host, false);
}

function rankRenderPage() {
  if (!rankIsRoute() || !rankData || !rankApp) return;
  const host = rankApp.querySelector(".futures-position-rank-page-host");
  if (!host) return;
  host.innerHTML = rankPageMarkup();
  rankBind(host);
  rankRenderChart(host);
  host.dataset.rendered = "true";
  const page = host.querySelector(".futures-position-rank-page");
  if (page) page.dataset.ready = "true";
  rankSyncShellMeta();
}

async function loadRankData({ followLatest = false } = {}) {
  if (!rankLoadPromise) {
  rankLoadPromise = fetch("./data/futures-rubber-position-rank-data.json?v=20260921b", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("futures-rubber-position-rank-data.json HTTP " + response.status)))
      .then((data) => { rankData = data; rankState.date = rankDateAfterLoad(data, rankState.productCode, rankState.date, followLatest, rankState.contractCode); window.positionRankUiData = data; rankRenderPage(); window.dispatchEvent(new Event("position-rank-data-ready")); return data; });
  }
  return rankLoadPromise;
}




loadRankData().catch((error) => {
  const host = rankApp?.querySelector(".futures-position-rank-page-host");
  if (host) host.innerHTML = '<div class="data-error"><p class="eyebrow">POSITION RANK DATA LOAD ERROR</p><h2>持仓龙虎榜数据暂不可用</h2><code>' + rankEscape(error.message) + '</code></div>';
  console.error(error);
});

window.addEventListener("hashchange", () => { if (rankIsRoute()) { rankState = { ...rankState }; rankRenderPage(); } });
window.addEventListener("position-rank-data-ready", rankRenderPage);
new MutationObserver(() => {
  if (!rankIsRoute()) return;
  const host = rankApp?.querySelector(".futures-position-rank-page-host");
  if (host && host.dataset.rendered !== "true") rankRenderPage();
}).observe(rankApp || document.body, { childList: true, subtree: true });
