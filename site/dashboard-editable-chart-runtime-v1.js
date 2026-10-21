import {
  renderDailySeasonalChart,
  renderSeasonalChart,
} from "./三分之一尺寸折线图-同比模板/chart-core.js?v=20260902b";

const editableChartRegistry = new WeakMap();

function cleanDefinition(card, definition = {}) {
  const title = String(definition.title || card?.querySelector("h2")?.textContent || "").trim();
  const chartId = String(definition.chartId || card?.dataset.seriesId || card?.dataset.chartId || "").trim();
  const chartType = String(definition.chartType || card?.dataset.chartType || "monthly-seasonal").trim();
  const sourceLabel = String(definition.sourceLabel || chartId || title).trim();
  const unit = String(definition.unit || "").trim();
  const size = ["third", "four-fifths", "full"].includes(definition.size)
    ? definition.size
    : (["third", "four-fifths", "full"].includes(card?.dataset.chartSize) ? card.dataset.chartSize : "third");
  const rawMetrics = Array.isArray(definition.metrics) && definition.metrics.length
    ? definition.metrics
    : [{ alias: "A", id: chartId, label: sourceLabel || title }];
  const metrics = rawMetrics.slice(0, 6).map((metric, index) => ({
    alias: String(metric?.alias || "ABCDEF"[index] || "A"),
    id: String(metric?.id || chartId || "").trim(),
    label: String(metric?.label || metric?.id || sourceLabel || title).trim(),
  }));
  const parameters = definition.parameters && typeof definition.parameters === "object"
    ? { ...definition.parameters }
    : {};
  const sectionId = String(definition.sectionId || parameters.sectionId || card?.dataset.chartSection || "").trim();
  if (sectionId) parameters.sectionId = sectionId;
  return { chartId, sectionId, chartType, sourceLabel, title, unit, size, metrics, parameters };
}

export function registerEditableChart(card, definition = {}) {
  if (!(card instanceof Element)) return null;
  const normalized = cleanDefinition(card, definition);
  if (normalized.chartId) card.dataset.seriesId = normalized.chartId;
  if (normalized.chartType) card.dataset.chartType = normalized.chartType;
  if (normalized.sourceLabel) card.dataset.metricSource = normalized.sourceLabel;
  if (normalized.sectionId) card.dataset.chartSection = normalized.sectionId;
  card.dataset.chartSize = normalized.size;
  card.dataset.chartRegistered = "true";
  editableChartRegistry.set(card, normalized);
  card.dispatchEvent(new CustomEvent("dashboard:chart-registered", {
    bubbles: true,
    detail: normalized,
  }));
  return normalized;
}

export function setEditableChartSection(card, sectionId) {
  if (!(card instanceof Element)) return null;
  const normalizedSectionId = String(sectionId || "").trim();
  if (!normalizedSectionId) return getEditableChartDefinition(card);
  const current = editableChartRegistry.get(card) || cleanDefinition(card);
  const normalized = cleanDefinition(card, {
    ...current,
    sectionId: normalizedSectionId,
    parameters: { ...current.parameters, sectionId: normalizedSectionId },
  });
  card.dataset.chartSection = normalizedSectionId;
  editableChartRegistry.set(card, normalized);
  return normalized;
}

export function getEditableChartDefinition(card) {
  if (!(card instanceof Element)) return null;
  return editableChartRegistry.get(card) || cleanDefinition(card);
}

export function renderEditableMonthlyChart({ card, chartId, sourceLabel, title, unit, sectionId, size = "third", metrics, ...options }) {
  registerEditableChart(card, {
    chartId,
    chartType: "monthly-seasonal",
    sourceLabel,
    title,
    unit: unit || options.tooltipUnit,
    size,
    metrics,
    parameters: { sectionId: sectionId || "", frequency: "monthly", template: "seasonal-yoy" },
  });
  return renderSeasonalChart(options);
}

export function renderEditableDailyChart({ card, chartId, sourceLabel, title, unit, sectionId, size, metrics, ...options }) {
  registerEditableChart(card, {
    chartId,
    chartType: "daily-seasonal",
    sourceLabel,
    title,
    unit: unit || options.tooltipUnit,
    size: size || (options.template === "large" ? "four-fifths" : "third"),
    metrics,
    parameters: {
      sectionId: sectionId || "",
      frequency: "daily",
      template: options.template || "",
      fullYear: Boolean(options.fullYear),
      crossYear: Boolean(options.crossYear),
      axisStartYear: options.axisStartYear ?? null,
      axisStartMonth: options.axisStartMonth ?? null,
    },
  });
  return renderDailySeasonalChart(options);
}

window.dashboardEditableChartDefinition = getEditableChartDefinition;
window.dashboardEditableChartSetSection = setEditableChartSection;
