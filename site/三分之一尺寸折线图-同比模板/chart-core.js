/*
 * 三分之一尺寸折线图-同比模板
 *
 * This module is the single source of truth for:
 * - chart dimensions and margins
 * - six-year seasonal lines
 * - current-year year-on-year bars
 * - axes, colors, legend and tooltip behavior
 * - the final cropped SVG viewBox
 */

export const CHART_TEMPLATE = Object.freeze({
  width: 520,
  height: 300,
  croppedViewBox: "0 18 520 274",
  visibleYears: 6,
  margin: Object.freeze({ top: 28, right: 48, bottom: 38, left: 42 }),
  colors: Object.freeze({
    2021: "#e7c8ab",
    2022: "#b7cbe1",
    2023: "#5e94bd",
    2024: "#2f8fa5",
    2025: "#6f2ca6",
    2026: "#ff1010",
  }),
  barColor: "#d5dadd",
});

// All page-level visibility decisions must use these shared rules.
export const CHART_VISIBILITY_RULES = Object.freeze({
  minCurrentYearAverageKt: 1,
  minCurrentYearYtdKt: 0.1,
  minOverviewCountryProductAverageKt: 0.1,
});

const TEMPLATE_STYLE_ID = "rubber-chart-template-style";

function svgElement(tag, attrs) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  Object.entries(attrs || {}).forEach(([name, value]) => node.setAttribute(name, value));
  return node;
}

function yearColor(year) {
  return CHART_TEMPLATE.colors[year] || "#9aa1a8";
}

function niceStep(roughStep, minimumStep = 0.1) {
  const safeStep = Math.max(Number(roughStep) || 0, minimumStep);
  const power = Math.pow(10, Math.floor(Math.log10(safeStep)));
  const normalized = safeStep / power;
  const multiplier = normalized >= 5 ? 5 : normalized >= 2 ? 2 : 1;
  return multiplier * power;
}

function makeAxis(values, targetTicks, symmetric) {
  const clean = values.filter((value) => value !== null && Number.isFinite(value));
  if (!clean.length) return { min: 0, max: 1, step: 0.2 };

  const dataMin = Math.min(...clean);
  const dataMax = Math.max(...clean);
  // Small quantity series are commonly expressed in 万吨 and can be much
  // smaller than 0.1. Do not apply the normal absolute span/tick floor to
  // them; otherwise a 0.03-valued series is forced into a 0–0.1 axis.
  const isSmallValueAxis = !symmetric && dataMax < 0.1 && dataMin > -0.1;
  const minimumSpan = isSmallValueAxis ? 0.01 : 1;
  const minimumStep = isSmallValueAxis ? 0.01 : 0.1;
  const span = Math.max(dataMax - dataMin, Math.abs(dataMax) * 0.1, minimumSpan);

  if (symmetric) {
    const bound = Math.max(Math.abs(dataMin), Math.abs(dataMax), 1) * 1.05;
    const step = niceStep((bound * 2) / targetTicks, 1);
    const symmetricBound = Math.ceil(bound / step) * step;
    return { min: -symmetricBound, max: symmetricBound, step };
  }

  const padding = span * 0.05;
  let lower = dataMin >= 0 ? Math.max(0, dataMin - padding) : dataMin - padding;
  let upper = dataMax + padding;
  const step = niceStep((upper - lower) / targetTicks, minimumStep);
  lower = Math.floor(lower / step) * step;
  upper = Math.ceil(upper / step) * step;
  return { min: lower, max: upper, step };
}

function axisTicks(axis) {
  const count = Math.max(1, Math.round((axis.max - axis.min) / axis.step));
  return Array.from({ length: count + 1 }, (_, index) => Number((axis.min + axis.step * index).toFixed(6)));
}

function formatAxis(value, step = null) {
  if (Math.abs(value) >= 100) return String(Math.round(value));
  if (Math.abs(value) >= 10) return value.toFixed(0);
  if (Number.isFinite(Number(step)) && Math.abs(Number(step)) < 0.1) {
    const digits = Math.min(4, Math.max(2, Math.ceil(-Math.log10(Math.abs(Number(step))))));
    return value.toFixed(digits);
  }
  return value.toFixed(1);
}

function seriesValues(series, year) {
  const map = new Map(
    (series || [])
      .filter((item) => Number(item.year) === Number(year))
      .map((item) => {
        const rawValue = item?.valueKt;
        const value = rawValue === null || rawValue === undefined || rawValue === ""
          ? null
          : Number(rawValue);
        return [Number(item.monthNumber), Number.isFinite(value) ? value : null];
      })
  );
  return Array.from({ length: 12 }, (_, index) => {
    const value = map.get(index + 1);
    return value === undefined ? null : value;
  });
}

function currentYearFromLatestMonth(latestMonth) {
  const year = Number(String(latestMonth || "").slice(0, 4));
  return Number.isFinite(year) ? year : null;
}

export function currentYearAverage(series, latestMonth) {
  const year = currentYearFromLatestMonth(latestMonth);
  if (year === null) return 0;
  const values = (series || [])
    .filter((item) => Number(item.year) === year)
    .map((item) => item?.valueKt)
    .filter((value) => value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value)))
    .map(Number);
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

export function shouldShowChartSeries(series, latestMonth, minAverageKt = CHART_VISIBILITY_RULES.minCurrentYearAverageKt) {
  return currentYearAverage(series, latestMonth) >= minAverageKt;
}

export function shouldShowTableSeries(series, latestMonth) {
  const metric = (series || []).find((item) => item.month === latestMonth);
  return Number(metric?.ytdKt) >= CHART_VISIBILITY_RULES.minCurrentYearYtdKt;
}

function linePath(values, x, y) {
  let path = "";
  let connected = false;
  values.forEach((value, index) => {
    if (value === null || !Number.isFinite(value)) {
      connected = false;
      return;
    }
    path += (connected ? " L " : " M ") + x(index).toFixed(1) + " " + y(value).toFixed(1);
    connected = true;
  });
  return path.trim();
}

export function renderSeasonalLegend(container, visibleYears, currentYear, showYoy = true) {
  if (!container) return;
  container.innerHTML = "";

  visibleYears.forEach((year) => {
    const item = document.createElement("span");
    item.className = "legend-item";
    item.innerHTML = '<i class="legend-swatch" style="background:' + yearColor(year) + '"></i><span>' + year + "</span>";
    container.appendChild(item);
  });

  if (!showYoy) return;
  const yoy = document.createElement("span");
  yoy.className = "legend-item";
  yoy.innerHTML = '<i class="legend-swatch bar"></i><span>' + currentYear + " " + String.fromCharCode(21516, 27604) + "</span>";
  container.appendChild(yoy);
}

function positionChartTooltip(tooltip, stage, event, fallbackWidth = 180, fallbackHeight = 96) {
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
export function renderSeasonalChart({ svg, stage, tooltip, legend, series, comparisonSeries = [], tooltipUnit = "千吨" }) {
  if (!svg) return;

  const values = Array.isArray(series) ? series : [];
  const years = [...new Set(values.map((item) => Number(item.year)).filter(Number.isFinite))].sort((a, b) => a - b);
  const visibleYears = years.slice(-CHART_TEMPLATE.visibleYears);
  const currentYear = years[years.length - 1];
  const comparisonYear = Number.isFinite(currentYear) ? currentYear - 1 : null;
  const currentValues = seriesValues(values, currentYear);
  const comparisonValues = seriesValues([...comparisonSeries, ...values], comparisonYear);
  const yoyValues = currentValues.map((value, index) => {
    const base = comparisonValues[index];
    return value !== null && base !== null && base ? (value / base - 1) * 100 : null;
  });
  const valuesByYear = new Map(visibleYears.map((year) => [year, seriesValues(values, year)]));
  const valueAxis = makeAxis(visibleYears.flatMap((year) => valuesByYear.get(year) || []), 5, false);
  const yoyAxis = makeAxis(yoyValues, 4, true);
  const margin = CHART_TEMPLATE.margin;
  const { width, height } = CHART_TEMPLATE;
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const observedMonths = Array.from({ length: 12 }, (_, index) => index + 1)
    .filter((month) => visibleYears.some((year) => {
      const value = valuesByYear.get(year)?.[month - 1];
      return value !== null && Number.isFinite(value);
    }));
  const minMonth = observedMonths.length ? Math.min(...observedMonths) : 1;
  const maxMonth = observedMonths.length ? Math.max(...observedMonths) : 12;
  const monthCount = Math.max(1, maxMonth - minMonth + 1);
  const bucketWidth = innerWidth / monthCount;
  const x = (index) => margin.left + bucketWidth * (index - (minMonth - 1) + 0.5);
  const yValue = (value) => margin.top + innerHeight - ((value - valueAxis.min) / Math.max(valueAxis.max - valueAxis.min, 1e-9)) * innerHeight;
  const yYoy = (value) => margin.top + innerHeight - ((value - yoyAxis.min) / Math.max(yoyAxis.max - yoyAxis.min, 1e-9)) * innerHeight;

  renderSeasonalLegend(legend, visibleYears, currentYear);
  svg.setAttribute("viewBox", "0 0 " + width + " " + height);
  svg.innerHTML = "";

  const grid = svgElement("g", { "aria-hidden": "true" });
  axisTicks(valueAxis).forEach((tick) => {
    const yPos = yValue(tick);
    grid.appendChild(svgElement("line", { x1: margin.left, x2: width - margin.right, y1: yPos, y2: yPos, class: "chart-grid-line" }));
    const label = svgElement("text", { x: margin.left - 8, y: yPos + 3, "text-anchor": "end", class: "chart-axis-label" });
    label.textContent = formatAxis(tick, valueAxis.step);
    grid.appendChild(label);
  });

  for (let month = minMonth; month <= maxMonth; month += 1) {
    const xPos = x(month - 1);
    grid.appendChild(svgElement("line", { x1: xPos, x2: xPos, y1: margin.top, y2: height - margin.bottom, class: "chart-vertical-line" }));
    const label = svgElement("text", { x: xPos, y: height - 14, "text-anchor": month === minMonth ? "start" : month === maxMonth ? "end" : "middle", class: "chart-axis-label" });
    label.textContent = String(month).padStart(2, "0");
    grid.appendChild(label);
  }

  axisTicks(yoyAxis).forEach((tick) => {
    const yPos = yYoy(tick);
    const label = svgElement("text", { x: width - margin.right + 8, y: yPos + 3, class: "chart-axis-label" });
    label.textContent = Math.round(tick) + "%";
    grid.appendChild(label);
  });
  grid.appendChild(svgElement("line", { x1: width - margin.right, x2: width - margin.right, y1: margin.top, y2: height - margin.bottom, class: "chart-right-axis" }));
  grid.appendChild(svgElement("line", { x1: margin.left, x2: width - margin.right, y1: yYoy(0), y2: yYoy(0), class: "chart-zero-line" }));
  svg.appendChild(grid);

  const bars = svgElement("g", { "aria-hidden": "true" });
  yoyValues.forEach((value, index) => {
    const month = index + 1;
    if (value === null || month < minMonth || month > maxMonth) return;
    const yZero = yYoy(0);
    const yPos = yYoy(value);
    const barX = x(index) - bucketWidth / 2;
    bars.appendChild(svgElement("rect", { x: barX, y: Math.min(yZero, yPos), width: bucketWidth, height: Math.max(Math.abs(yPos - yZero), 1), class: "chart-yoy-bar" }));
  });
  svg.appendChild(bars);

  const lines = svgElement("g", { "aria-hidden": "true" });
  visibleYears.forEach((year) => {
    lines.appendChild(svgElement("path", { d: linePath(valuesByYear.get(year), x, yValue), fill: "none", stroke: yearColor(year), class: year === currentYear ? "chart-series current" : year === comparisonYear ? "chart-series comparison" : "chart-series" }));
  });
  svg.appendChild(lines);

  const crosshair = svgElement("line", { x1: x(minMonth - 1), x2: x(minMonth - 1), y1: margin.top, y2: height - margin.bottom, class: "chart-crosshair" });
  svg.appendChild(crosshair);

  svg.onpointermove = (event) => {
    if (!tooltip || !stage) return;
    const rect = svg.getBoundingClientRect();
    const chartX = ((event.clientX - rect.left) / rect.width) * width;
    const relativeMonth = (chartX - margin.left) / bucketWidth - 0.5;
    const month = Math.min(maxMonth, Math.max(minMonth, minMonth + Math.round(relativeMonth)));
    const index = month - 1;
    crosshair.setAttribute("x1", x(index));
    crosshair.setAttribute("x2", x(index));
    const current = currentValues[index];
    const comparison = comparisonValues[index];
    const yoy = yoyValues[index];
    tooltip.innerHTML = '<div class="tooltip-title">' + String(month).padStart(2, "0") + "月</div>" +
      '<div class="tooltip-row"><span style="color:#ff1010">' + currentYear + '</span><span class="tooltip-value">' + (current === null ? "-" : current.toFixed(1) + " " + tooltipUnit) + "</span></div>" +
      '<div class="tooltip-row"><span style="color:#88a7c4">' + comparisonYear + '</span><span class="tooltip-value">' + (comparison === null ? "-" : comparison.toFixed(1) + " " + tooltipUnit) + "</span></div>" +
      '<div class="tooltip-row"><span>同比</span><span class="tooltip-value">' + (yoy === null ? "-" : (yoy >= 0 ? "+" : "") + yoy.toFixed(1) + "%") + "</span></div>";
    tooltip.style.display = "block";
    positionChartTooltip(tooltip, stage, event, 150, 88);
  };

  svg.onpointerleave = () => {
    if (tooltip) tooltip.style.display = "none";
    crosshair.setAttribute("x1", x(minMonth - 1));
    crosshair.setAttribute("x2", x(minMonth - 1));
  };

  svg.setAttribute("viewBox", CHART_TEMPLATE.croppedViewBox);
}

export function installChartTemplateStyles() {
  if (document.getElementById(TEMPLATE_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = TEMPLATE_STYLE_ID;
  style.textContent = `
    .chart-grid-line { stroke: #dfe3e7; stroke-width: 1; }
    .chart-vertical-line { stroke: #eef1f3; stroke-width: 1; }
    .chart-axis-label { fill: #707880; font-family: "Cascadia Mono", Consolas, monospace; font-size: 10px; }
    .chart-right-axis { stroke: #cdd3d8; stroke-width: 1; }
    .chart-zero-line { stroke: #c8ced4; stroke-width: 1; stroke-dasharray: 3 5; }
    .chart-yoy-bar { fill: #d5dadd; opacity: .88; }
    .chart-series { stroke-width: 1.8; stroke-linecap: square; stroke-linejoin: bevel; vector-effect: non-scaling-stroke; opacity: .58; }
    .chart-series.current { stroke-width: 3.8; opacity: 1; }
    .chart-series.comparison { stroke-width: 2.5; opacity: .82; }
    .chart-crosshair { stroke: #89939d; stroke-dasharray: 3 5; stroke-width: 1; opacity: .65; pointer-events: none; }

    .country-chart-header { display: flex !important; align-items: baseline !important; flex-wrap: nowrap !important; gap: 8px !important; min-height: 0 !important; height: auto !important; padding: 8px 14px 3px !important; border-bottom: 0 !important; }
    .country-chart-header h2 { flex: 1 1 auto !important; min-width: 0 !important; padding-right: 0 !important; line-height: 1.15 !important; }
    .country-chart-meta { display: flex !important; flex: 0 0 auto !important; flex-wrap: nowrap !important; align-items: baseline !important; gap: 10px !important; margin: 0 !important; white-space: nowrap !important; line-height: 1 !important; }
    .country-chart-legend { display: flex !important; flex-wrap: nowrap !important; align-items: center !important; gap: 6px 12px !important; min-height: 0 !important; height: 20px !important; overflow: hidden !important; padding: 0 14px 4px !important; border-bottom: 0 !important; white-space: nowrap !important; }
    .country-chart-legend .legend-item { flex: 0 0 auto !important; }
    .country-chart .chart-stage { min-height: 252px !important; height: 252px !important; padding: 2px 4px 4px !important; }
    .country-chart .seasonal-chart { height: 246px !important; }
    .overview-section-heading { gap: 0 !important; padding: 0 !important; border-bottom: 0 !important; }
    .overview-section-heading > span { display: none !important; }
    .overview-chart-section { gap: 8px !important; }
    .overview-chart-card .country-chart-header, .overview-chart-card .country-chart-legend { min-height: 0 !important; }

    .chart-panel .chart-header { align-items: baseline; gap: 12px; padding: 9px 14px 3px; border-bottom: 0; }
    .chart-panel .chart-header > h2 { min-width: 0; flex: 1 1 auto; }
    .chart-panel .chart-header-meta { display: flex; flex: 0 0 auto; flex-wrap: nowrap; align-items: baseline; gap: 10px; white-space: nowrap; }
    .chart-panel .legend { display: flex; flex-wrap: nowrap; align-items: center; gap: 6px 12px; min-height: 0; overflow: hidden; padding: 0 14px 4px; border-bottom: 0; white-space: nowrap; }
    .chart-panel .legend-item { flex: 0 0 auto; }
    .chart-panel .chart-stage { min-height: 252px; padding: 2px 4px 4px; }
    .chart-panel .line-chart { height: 246px; }
  `;
  document.head.appendChild(style);
}


export const DAILY_CHART_TEMPLATES = Object.freeze({
  small: Object.freeze({
    width: 520,
    height: 300,
    margin: Object.freeze({ top: 28, right: 28, bottom: 38, left: 42 }),
  }),
  large: Object.freeze({
    width: 1200,
    height: 420,
    margin: Object.freeze({ top: 34, right: 34, bottom: 48, left: 62 }),
  }),
});

function dailyTemplateConfig(template) {
  return DAILY_CHART_TEMPLATES[template] || DAILY_CHART_TEMPLATES.small;
}

function dailyCalendarCoordinate(month, day) {
  const start = Date.UTC(2020, 0, 1);
  const date = Date.UTC(2020, Number(month) - 1, Number(day));
  return (date - start) / (Date.UTC(2021, 0, 1) - start);
}

function dailyPointValue(item) {
  const value = item?.value ?? item?.valueKt;
  return value === null || value === undefined || !Number.isFinite(Number(value)) ? null : Number(value);
}



function dailyTimelineCoordinate(year, month, day, startYear, startMonth, endYear, endMonth) {
  const baseYear = 2000;
  const start = Date.UTC(baseYear, Number(startMonth) - 1, 1);
  const date = Date.UTC(baseYear + Number(year) - Number(startYear), Number(month) - 1, Number(day));
  const end = Date.UTC(baseYear + Number(endYear) - Number(startYear), Number(endMonth), 1);
  return (date - start) / Math.max(end - start, 1);
}

function dailyPointDate(item) {
  const date = String(item?.date || "");
  const parts = date.split("-");
  const timelineCoordinate = Number(item?.timelineCoordinate);
  if (parts.length === 3) {
    return {
      date,
      year: Number(parts[0]),
      month: Number(parts[1]),
      day: Number(parts[2]),
      coordinate: Number.isFinite(timelineCoordinate) ? timelineCoordinate : dailyCalendarCoordinate(parts[1], parts[2]),
    };
  }
  return {
    date: "",
    year: Number(item?.year),
    month: Number(item?.month),
    day: Number(item?.day),
    coordinate: Number.isFinite(timelineCoordinate) ? timelineCoordinate : dailyCalendarCoordinate(item?.month, item?.day),
  };
}

function dailyFormatValue(value, digits) {
  if (value === null || !Number.isFinite(Number(value))) return "-";
  return Number(value).toLocaleString("zh-CN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function dailyLinePath(points, x, y) {
  return points
    .filter((point) => point.value !== null && Number.isFinite(point.value))
    .sort((left, right) => left.coordinate - right.coordinate)
    .map((point, index) => (index === 0 ? "M " : " L ") + x(point.coordinate).toFixed(1) + " " + y(point.value).toFixed(1))
    .join("");
}

function renderDailyLegend(container, groups) {
  if (!container) return;
  container.innerHTML = "";
  groups.forEach((group) => {
    const item = document.createElement("span");
    item.className = "legend-item";
    item.innerHTML = '<i class="legend-swatch" style="background:' + yearColor(group.colorYear) + '"></i><span>' + String(group.label) + "</span>";
    container.appendChild(item);
  });
}

export function renderDailySeasonalChart({
  svg,
  stage,
  tooltip,
  legend,
  series,
  template = "small",
  tooltipUnit = "",
  valueDigits = 0,
  fullYear = false,
  crossYear = false,
  axisStartYear = null,
  axisStartMonth = null,
  axisEndYear = null,
  axisEndMonth = null,
}) {
  if (!svg) return;
  const values = Array.isArray(series) ? series : [];
  const hasTimeline = values.some((item) => Number.isFinite(Number(item?.timelineCoordinate)));
  const useCrossYear = Boolean(crossYear || hasTimeline);
  const groupMap = new Map();

  values.forEach((item) => {
    const fallbackYear = Number(item?.year);
    const key = item?.groupKey ?? String(fallbackYear);
    if (!groupMap.has(key)) {
      const order = Number(item?.groupOrder);
      const groupYear = Number(item?.groupYear);
      groupMap.set(key, {
        key,
        label: item?.groupLabel ?? String(item?.year ?? ""),
        order: Number.isFinite(order) ? order : fallbackYear,
        colorYear: Number.isFinite(groupYear) ? groupYear : fallbackYear,
        items: [],
      });
    }
    groupMap.get(key).items.push(item);
  });

  const groups = [...groupMap.values()].sort((left, right) => {
    if (left.order !== right.order) return left.order - right.order;
    return String(left.key).localeCompare(String(right.key));
  });
  const visibleGroups = groups.slice(-CHART_TEMPLATE.visibleYears);
  const config = dailyTemplateConfig(template);
  const margin = config.margin;
  const { width, height } = config;
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const pointsByGroup = new Map();

  visibleGroups.forEach((group) => {
    pointsByGroup.set(
      group.key,
      group.items
        .map((item) => {
          const date = dailyPointDate(item);
          return { ...date, value: dailyPointValue(item) };
        })
        .filter((item) => Number.isFinite(item.coordinate)),
    );
  });

  const allPoints = [...pointsByGroup.values()].flat();
  const observedPoints = allPoints.filter((point) => point.value !== null && Number.isFinite(point.value));
  const rawMinCoordinate = observedPoints.length ? Math.min(...observedPoints.map((point) => point.coordinate)) : 0;
  const rawMaxCoordinate = observedPoints.length ? Math.max(...observedPoints.map((point) => point.coordinate)) : 1;
  const minimumSpan = 1 / 366;
  let domainMin = (fullYear || useCrossYear) ? 0 : rawMinCoordinate;
  let domainMax = (fullYear || useCrossYear) ? 1 : rawMaxCoordinate;
  if (domainMax - domainMin < minimumSpan) {
    const center = (domainMin + domainMax) / 2;
    domainMin = Math.max(0, center - minimumSpan / 2);
    domainMax = Math.min(1, center + minimumSpan / 2);
    if (domainMax - domainMin < minimumSpan) {
      domainMin = 0;
      domainMax = 1;
    }
  }
  const domainSpan = Math.max(domainMax - domainMin, 1e-9);
  const axisValues = observedPoints.map((item) => item.value);
  const valueAxis = makeAxis(axisValues, 5, false);
  const x = (coordinate) => margin.left + Math.max(0, Math.min(1, (coordinate - domainMin) / domainSpan)) * innerWidth;
  const yValue = (value) => margin.top + innerHeight - ((value - valueAxis.min) / Math.max(valueAxis.max - valueAxis.min, 1e-9)) * innerHeight;

  renderDailyLegend(legend, visibleGroups);
  svg.setAttribute("viewBox", "0 0 " + width + " " + height);
  svg.innerHTML = "";

  const grid = svgElement("g", { "aria-hidden": "true" });
  axisTicks(valueAxis).forEach((tick) => {
    const yPos = yValue(tick);
    grid.appendChild(svgElement("line", { x1: margin.left, x2: width - margin.right, y1: yPos, y2: yPos, class: "chart-grid-line" }));
    const label = svgElement("text", { x: margin.left - 8, y: yPos + 3, "text-anchor": "end", class: "chart-axis-label" });
    label.textContent = formatAxis(tick, valueAxis.step);
    grid.appendChild(label);
  });

  const timelineMeta = values.find((item) => Number.isFinite(Number(item?.timelineAxisStartYear)));
  const latestGroup = groups[groups.length - 1];
  const latestPoint = [...(latestGroup?.items || [])].sort((left, right) => String(left.date).localeCompare(String(right.date)))[0];
  const latestParts = String(latestPoint?.date || "").split("-").map(Number);
  const latestLabelMatch = String(latestGroup?.label || "").match(/(\d{2})$/);
  const inferredStartYear = Number(latestParts[0]);
  const inferredStartMonth = Number(latestParts[1]);
  const inferredEndYear = Number(latestGroup?.colorYear);
  const inferredEndMonth = latestLabelMatch ? Number(latestLabelMatch[1]) : inferredStartMonth;
  const effectiveAxisStartYear = Number.isFinite(Number(axisStartYear)) ? Number(axisStartYear) : Number.isFinite(Number(timelineMeta?.timelineAxisStartYear)) ? Number(timelineMeta.timelineAxisStartYear) : inferredStartYear;
  const effectiveAxisStartMonth = Number.isFinite(Number(axisStartMonth)) ? Number(axisStartMonth) : Number.isFinite(Number(timelineMeta?.timelineAxisStartMonth)) ? Number(timelineMeta.timelineAxisStartMonth) : inferredStartMonth;
  const effectiveAxisEndYear = Number.isFinite(Number(axisEndYear)) ? Number(axisEndYear) : Number.isFinite(Number(timelineMeta?.timelineAxisEndYear)) ? Number(timelineMeta.timelineAxisEndYear) : inferredEndYear;
  const effectiveAxisEndMonth = Number.isFinite(Number(axisEndMonth)) ? Number(axisEndMonth) : Number.isFinite(Number(timelineMeta?.timelineAxisEndMonth)) ? Number(timelineMeta.timelineAxisEndMonth) : inferredEndMonth;
  const calendarTicks = [];
  if (
    useCrossYear &&
    [effectiveAxisStartYear, effectiveAxisStartMonth, effectiveAxisEndYear, effectiveAxisEndMonth].every((value) => Number.isFinite(Number(value)))
  ) {
    let year = effectiveAxisStartYear;
    let month = effectiveAxisStartMonth;
    const endYear = effectiveAxisEndYear;
    const endMonth = effectiveAxisEndMonth;
    while (year < endYear || (year === endYear && month <= endMonth)) {
      calendarTicks.push({
        year,
        month,
        coordinate: dailyTimelineCoordinate(year, month, 1, effectiveAxisStartYear, effectiveAxisStartMonth, effectiveAxisEndYear, effectiveAxisEndMonth),
        label: String(year) + "-" + String(month).padStart(2, "0"),
      });
      month += 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }
    }
  } else {
    for (let month = 1; month <= 12; month += 1) {
      calendarTicks.push({
        month,
        coordinate: dailyCalendarCoordinate(month, 1),
        label: String(month).padStart(2, "0"),
      });
    }
  }

  calendarTicks.forEach((tick, index) => {
    const monthStart = tick.coordinate;
    const monthEnd = index + 1 < calendarTicks.length ? calendarTicks[index + 1].coordinate : domainMax;
    if (monthEnd < domainMin || monthStart > domainMax) return;
    const tickCoordinate = Math.max(domainMin, Math.min(domainMax, monthStart));
    const xPos = x(tickCoordinate);
    grid.appendChild(svgElement("line", { x1: xPos, x2: xPos, y1: margin.top, y2: height - margin.bottom, class: "chart-vertical-line" }));
    const label = svgElement("text", { x: xPos, y: height - 15, "text-anchor": Math.abs(tickCoordinate - domainMin) < 1e-8 ? "start" : Math.abs(tickCoordinate - domainMax) < 1e-8 ? "end" : "middle", class: "chart-axis-label" });
    label.textContent = tick.label;
    grid.appendChild(label);
  });
  svg.appendChild(grid);

  const lines = svgElement("g", { "aria-hidden": "true" });
  visibleGroups.forEach((group, index) => {
    const className = index === visibleGroups.length - 1 ? "chart-series current" : index === visibleGroups.length - 2 ? "chart-series comparison" : "chart-series";
    lines.appendChild(svgElement("path", {
      d: dailyLinePath(pointsByGroup.get(group.key) || [], x, yValue),
      fill: "none",
      stroke: yearColor(group.colorYear),
      class: className,
    }));
  });
  svg.appendChild(lines);

  const initialCoordinate = observedPoints.length ? Math.min(...observedPoints.map((point) => point.coordinate)) : domainMin;
  const crosshair = svgElement("line", {
    x1: x(initialCoordinate),
    x2: x(initialCoordinate),
    y1: margin.top,
    y2: height - margin.bottom,
    class: "chart-crosshair",
  });
  svg.appendChild(crosshair);

  svg.onpointermove = (event) => {
    if (!tooltip || !stage || !observedPoints.length) return;
    const rect = svg.getBoundingClientRect();
    const chartX = ((event.clientX - rect.left) / rect.width) * width;
    const coordinate = domainMin + Math.max(0, Math.min(1, (chartX - margin.left) / innerWidth)) * domainSpan;
    const nearest = observedPoints.reduce(
      (best, point) => Math.abs(point.coordinate - coordinate) < Math.abs(best.coordinate - coordinate) ? point : best,
      observedPoints[0],
    );
    crosshair.setAttribute("x1", x(nearest.coordinate));
    crosshair.setAttribute("x2", x(nearest.coordinate));
    const rows = visibleGroups.slice().reverse().map((group) => {
      const yearPoints = pointsByGroup.get(group.key) || [];
      const groupPoint = yearPoints.reduce(
        (best, point) => !best || Math.abs(point.coordinate - nearest.coordinate) < Math.abs(best.coordinate - nearest.coordinate) ? point : best,
        null,
      );
      const sameDay = groupPoint && groupPoint.value !== null && Math.abs(groupPoint.coordinate - nearest.coordinate) < 0.004;
      return '<div class="tooltip-row"><span style="color:' + yearColor(group.colorYear) + '">' + String(group.label) + '</span><span class="tooltip-value">' +
        (sameDay ? dailyFormatValue(groupPoint.value, valueDigits) + (tooltipUnit ? " " + tooltipUnit : "") : "-") +
        "</span></div>";
    }).join("");
    const tooltipDate = nearest.date || (String(nearest.year) + "-" + String(nearest.month).padStart(2, "0") + "-" + String(nearest.day).padStart(2, "0"));
    tooltip.innerHTML = '<div class="tooltip-title">' + tooltipDate + "</div>" + rows;
    tooltip.style.display = "block";
    positionChartTooltip(tooltip, stage, event, 210, 118);
  };

  svg.onpointerleave = () => {
    if (tooltip) tooltip.style.display = "none";
    crosshair.setAttribute("x1", x(initialCoordinate));
    crosshair.setAttribute("x2", x(initialCoordinate));
  };
}

installChartTemplateStyles();
