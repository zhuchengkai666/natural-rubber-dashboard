import {
  renderDailySeasonalChart,
  renderSeasonalChart,
} from "./三分之一尺寸折线图-同比模板/chart-core.js?v=20261019a";

// Different cache-busting URLs must share registrations with the page editor.
const runtimeKey = Symbol.for('rubber.dashboard.chart-runtime.v2');
const runtimeState = window[runtimeKey] ||= {registry:new WeakMap(),activeCards:new Map(),watchersInstalled:false};
const editableChartRegistry = runtimeState.registry;
import { requestChartSeries, systemChartDefinitions, chartTemplateOptions, chartTooltipModel } from './dashboard-chart-data-v1.js?v=20260916j';
const activeCards = runtimeState.activeCards;

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
  const metrics = rawMetrics.slice(0, 20).map((metric, index) => ({
    alias: String(metric?.alias || "ABCDEFGHIJKLMNOPQRST"[index] || "A"),
    id: String(metric?.id || chartId || "").trim(),
    label: String(metric?.label || metric?.id || sourceLabel || title).trim(),
  }));
  const parameters = definition.parameters && typeof definition.parameters === "object"
    ? { ...definition.parameters }
    : {};
  const sectionId = String(definition.sectionId || parameters.sectionId || card?.dataset.chartSection || "").trim();
  if (sectionId) parameters.sectionId = sectionId;
  return { chartId, sectionId, chartType, sourceLabel, title, unit, size, metrics, parameters, chart: definition.chart || editableChartRegistry.get(card)?.chart || null };
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
  return renderSystemChart(card, chartId, options, 'monthly');
}

export function renderEditableDailyChart({ card, chartId, sourceLabel, title, unit, sectionId, size, metrics, systemChartId, ...options }) {
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
  return renderSystemChart(card, systemChartId || chartId, options, 'daily');
}

function drawResult(card, entry) {
  const result=entry.payload;
  if(!result)return;
  card.dataset.seriesState=result.cache?.state||'ready';
  let badge=card.querySelector('[data-system-series-status]');
  if(!badge){badge=document.createElement('span');badge.dataset.systemSeriesStatus='true';badge.dataset.exportUi='true';card.querySelector('header')?.appendChild(badge);}
  const status=({pending:'计算中',updating:'更新中',failed:'更新失败'})[result.cache?.state]||'';
  if(badge.textContent!==status)badge.textContent=status;
  badge.title=result.cache?.error||'';
  const heading=card.querySelector('h2');
  if(heading){
    const model=chartTooltipModel(result,entry.definition.title,result.expression||entry.definition.chart.expression||'');
    const lines=['图表口径：'+model.title,'指标：'+(model.metrics.map(metric=>metric.alias+'＝'+metric.label).join('；')||'尚未绑定指标'),
      '计算：'+model.formula.text,'数据范围：'+model.range,'状态：'+model.status];
    if(model.notes.length)lines.push('说明：'+model.notes.join('；'));
    heading.title=lines.join('\n');
  }
  if(!result.points?.length&&['pending','updating'].includes(result.cache?.state)){
    card.dataset.chartReady='false';
    entry.options.svg?.replaceChildren();
    entry.options.legend?.replaceChildren();
    return;
  }
  const options={...entry.options,...chartTemplateOptions(result,card.dataset.chartSize)};
  if(entry.frequency==='monthly')renderSeasonalChart(options);else renderDailySeasonalChart(options);
  card.dataset.chartReady='true';
  card.dataset.systemResult='true';
}

async function refreshCard(card, entry, force=false) {
  if(entry.busy){if(force)entry.forceAfterBusy=true;return;}
  entry.busy=true;
  try {
    const result=await requestChartSeries(entry.definition.chart,force);
    if(activeCards.get(card)!==entry||!card.isConnected)return;
    if(!result.points?.length&&entry.payload?.points?.length&&result.cache?.state!=='ready'&&entry.payload.cache?.key===result.cache?.key) {
      entry.payload={...entry.payload,cache:{...entry.payload.cache,state:result.cache.state,error:result.cache.error}};
    } else entry.payload=result;
    const key=JSON.stringify(result.cache);
    if(key!==entry.rendered){entry.rendered=key;drawResult(card,entry);}
  }catch(error){entry.payload={...(entry.payload||{}),cache:{...entry.payload?.cache,state:'failed',error:error.message}};drawResult(card,entry);}
  finally{
    entry.busy=false;
    if(entry.forceAfterBusy&&activeCards.get(card)===entry&&card.isConnected){
      entry.forceAfterBusy=false;
      void refreshCard(card,entry,true);
    }
  }
}

function loadSystemDefinition(card,entry) {
  if(entry.definitionLoading)return;
  entry.definitionLoading=true;
  systemChartDefinitions(entry.route).then(definitions=>{
    if(activeCards.get(card)!==entry||!card.isConnected)return;
    const definition=definitions.get(entry.id);
    if(!definition)throw Error('原图指标尚未映射：'+entry.route+' / '+entry.id);
    entry.definition=definition;
    card.title='';
    bindDefinition(card,definition);
    const force=Boolean(entry.forceOnReady);
    entry.forceOnReady=false;
    refreshCard(card,entry,force);
  }).catch(error=>{
    if(activeCards.get(card)!==entry)return;
    card.dataset.seriesState='failed';
    card.dataset.chartReady='false';
    card.title=error.message;
    console.error(error);
  }).finally(()=>{entry.definitionLoading=false;});
}

function renderSystemChart(card, id, options, frequency) {
  const route=location.hash.replace(/^#/,'').split('/').filter(Boolean).slice(0,2).join('/')||'overview';
  // Explicit read-only fallback. Never change the user's formula or saved overlay.
  if(new URLSearchParams(location.search).get('legacySystemCharts')==='1') {
    card.dataset.chartReady='true';
    return frequency==='monthly'?renderSeasonalChart(options):renderDailySeasonalChart(options);
  }
  const previous=activeCards.get(card);
  if(previous && previous.id!==id){
    card.dataset.customOriginalTitle=card.querySelector('h2')?.textContent||'';
    options.svg?.replaceChildren();options.legend?.replaceChildren();
    if(options.tooltip)options.tooltip.hidden=true;
    card.dataset.seriesState='pending';
  }
  if(previous?.id===id&&previous.route===route){
    previous.options=options;
    if(previous.definition)bindDefinition(card,previous.definition);
    const layout=card.clientWidth+'|'+card.dataset.chartSize;
    if(previous.payload && previous.layout!==layout && !card.classList.contains('has-custom-chart-override')){previous.layout=layout;drawResult(card,previous);}
    return;
  }
  const entry={id,route,frequency,options};activeCards.set(card,entry);card.dataset.chartReady='false';
  loadSystemDefinition(card,entry);
}

function bindDefinition(card, definition) {
  const current=editableChartRegistry.get(card);
  const metrics=definition.metrics || Object.entries(definition.chart.bindings).map(([alias,id])=>({alias,id,label:definition.title}));
  if(JSON.stringify(current?.chart)===JSON.stringify(definition.chart) && JSON.stringify(current?.metrics)===JSON.stringify(metrics))return;
  registerEditableChart(card,{...current,chart:definition.chart,
    metrics,
    parameters:{...current?.parameters,template:definition.chart.template}});
}



window.dashboardEditableChartDefinitionV2 = getEditableChartDefinition;
window.dashboardEditableChartSetSectionV2 = setEditableChartSection;
