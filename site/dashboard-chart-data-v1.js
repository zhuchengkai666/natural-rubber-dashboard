import { TREND_TEMPLATE, trendQueries, combineTrend } from './monthly-trend-template.js?v=20260920c';
// One batched result client for both system defaults and user formulas.
const requests = new Map();
let flush;
export function requestChartSeries(chart, force = false) {
  if (chart.template === TREND_TEMPLATE) {
    const snapshot=JSON.parse(JSON.stringify(chart));
    return Promise.all(trendQueries(snapshot).map(q=>requestChartSeries(q,force))).then(results=>combineTrend(snapshot,results));
  }
  const query = Object.fromEntries(['bindings','bindingFilters','expression','unit','startDate','endDate','template'].map(k=>[k,chart[k]]));
  const key = JSON.stringify(query);
  return new Promise((resolve,reject)=>{
    const item=requests.get(key)||{query,force,listeners:[]};
    item.force ||= force; item.listeners.push({resolve,reject}); requests.set(key,item);
    if (flush) return;
    flush=setTimeout(async()=>{
      flush=null; const batch=[...requests.values()]; requests.clear();
      try {
        const response=await fetch('/api/custom-series/batch',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({charts:batch.map(i=>({...i.query,force:i.force}))})});
        const data=await response.json();
        if (!response.ok || !data.ok || data.results?.length!==batch.length) throw Error(data.error||'图表结果响应不完整');
        data.results.forEach((entry,index)=>{
          const item=batch[index];
          if (!entry.ok) {item.listeners.forEach(l=>l.reject(Error(entry.error)));return;}
          const result=entry.result||{ok:true,points:[],expression:item.query.expression,cache:{state:entry.state,key:entry.key,error:entry.error}};
          result._query=item.query;
          item.listeners.forEach(l=>l.resolve(result));
        });
      } catch(error) {batch.forEach(i=>i.listeners.forEach(l=>l.reject(error)));}
    },0);
  });
}

const pages=new Map();
export function systemChartDefinitions(route) {
  if (!pages.has(route)) pages.set(route,fetch('/api/system-charts?route='+encodeURIComponent(route)).then(async r=>{
    const data=await r.json(); if(!r.ok||!data.ok) throw Error(data.error||'系统图表定义加载失败');
    return new Map(data.charts.map(c=>[c.chartId,c]));
  }).catch(error=>{pages.delete(route);throw error;}));
  return pages.get(route);
}

export const CHART_TEMPLATES=Object.freeze({monthly:'月度模板','monthly-trend':'月度模块-非季节性图',daily:'日度模板',spread:'月差专用'});

// Keep chart-definition explanations readable in both the custom editor popup
// and the unified system-chart title tooltip.  Internal metric ids and cache
// keys are useful for diagnostics, but are not a chart's business definition.
const CHART_ALIASES = 'ABCDEFGHIJKLMNOPQRST';
const INTERNAL_METRIC_ID = /^(?:system_|metric_|derived_|business_)[a-z0-9_-]{8,}$/i;
const TECHNICAL_METRIC_LABEL = /(?:^|[·|])\s*(?:sum|avg|average|mean|min|max|count|value)\s*$/i;
const TECHNICAL_DESCRIPTION = /^(?:自动发现字段；来源|用户定义派生指标；|多国海关月度橡胶数量；)/;
const GENERIC_METRIC_NOTES = new Set([
  '沿用系统原图业务口径；只读仓库计算，缺失不补零。',
  '沿用系统原图业务口径；只读仓库计算，缺失不补零',
  '只读仓库计算，缺失不补零。',
  '只读仓库计算，缺失不补零',
]);

export function chartStatusLabel(state) {
  if (!state) return '待计算';
  return ({
    ready: '已完成',
    pending: '首次计算中',
    updating: '更新中（沿用上次结果）',
    failed: '更新失败（沿用上次结果）',
  })[state] || '待计算';
}

export function chartMetricDisplayLabel(metric, fallback = '指标') {
  const label = String(metric?.label || '').trim();
  const id = String(metric?.id || '').trim();
  if (label && !INTERNAL_METRIC_ID.test(label) && !TECHNICAL_METRIC_LABEL.test(label)) return label;
  if (id && !INTERNAL_METRIC_ID.test(id) && !TECHNICAL_METRIC_LABEL.test(id)) return id;
  return fallback;
}

export function chartDateRangeLabel(payload = {}) {
  const start = String(payload.startDate || '').trim();
  const end = String(payload.endDate || '').trim();
  if (!start || !end) return '等待数据';
  const monthly = payload.frequency === 'monthly';
  const format = value => monthly ? value.slice(0, 7) : value;
  const left = format(start), right = format(end);
  return left === right ? left : `${left} 至 ${right}`;
}

export function chartFormulaSummary(expression, bindings = {}) {
  const raw = String(expression || '').trim();
  if (!raw) return { raw: '', text: '未设置', direct: false };
  const directMatch = raw.match(/^([A-T])$/i);
  if (directMatch) {
    const alias = directMatch[1].toUpperCase();
    return { raw, text: `直接使用指标：${chartMetricDisplayLabel(bindings[alias], `指标 ${alias}`)}`, direct: true };
  }
  const text = raw.replace(/\b([A-T])\b/gi, (_, alias) => chartMetricDisplayLabel(bindings[String(alias).toUpperCase()], `指标 ${alias.toUpperCase()}`));
  return { raw, text, direct: false };
}

export function chartCoverageNotes(payload = {}) {
  const notes = [];
  const push = note => {
    const value = String(note || '').trim();
    if (!value || notes.some(existing => existing === value || existing.includes(value) || value.includes(existing))) return;
    notes.push(value);
  };
  for (const metric of Object.values(payload.bindings || {})) {
    for (const range of metric.coverage || []) {
      const start = String(range.startMonth || range.startDate || '').trim();
      const end = String(range.endMonth || range.endDate || start).trim();
      const period = start && end && start !== end ? `${start} 至 ${end}` : (start || '部分日期');
      const note = String(range.note || '').trim();
      if (note) {
        const omissions = [...note.matchAll(/不包括(?:来源未提供的)?([^；。,:：，\s]+)/g)]
          .map(match => match[1]).filter(value => value && value !== '什么');
        const missing = [...note.matchAll(/缺少([^；。,:：，]+)/g)].map(match => match[1].trim()).filter(Boolean);
        const summary = [...new Set([...omissions, ...missing])];
        // Coverage notes can be generated from a whole formula and contain
        // several source labels. Show only the business omission summary in
        // the primary tooltip; source-by-source text stays below Details.
        const readable = summary.length ? '不包括' + summary.join('、') : note;
        push(`${period}：${readable}`);
      }
    }
    const description = String(metric.description || '').trim();
    if (description && !GENERIC_METRIC_NOTES.has(description) && !TECHNICAL_DESCRIPTION.test(description)) {
      // Keep only the short business clauses in the primary view. The full
      // source description remains available under “完整计算信息”.
      const clauses = description.match(/(?:HS\d{4}折干[^；。]+|乳胶系数[^；。]+|原重不等同于折干|不包括[^；。]+)/g) || [];
      clauses.filter(clause => !/不包括什么|明细缺失不补零/.test(clause)).forEach(clause => push(clause));
    }
  }
  return [...new Set(notes)];
}

export function chartTooltipModel(payload = {}, fallbackTitle = '', expression = '') {
  const bindings = payload.bindings || {};
  const formula = chartFormulaSummary(payload.expression || expression, bindings);
  const metrics = Object.entries(bindings).map(([alias, metric]) => ({
    alias,
    label: chartMetricDisplayLabel(metric, `指标 ${alias}`),
    unit: String(metric?.unit || '').trim(),
    dateCount: Number(metric?.dateCount || 0),
    validCount: Number(metric?.validCount || 0),
  }));
  const cache = payload.cache || {};
  return {
    title: String(fallbackTitle || '图表口径').trim(),
    metrics,
    formula,
    range: chartDateRangeLabel(payload),
    frequency: payload.frequency === 'daily' ? '日度' : payload.frequency === 'monthly' ? '月度' : '',
    status: chartStatusLabel(cache.state),
    notes: chartCoverageNotes(payload),
    technical: {
      sourceVersion: String(cache.sourceVersion || '').trim(),
      computedAt: String(cache.computedAt || '').trim(),
      cacheKey: String(cache.key || '').trim(),
      error: String(cache.error || '').trim(),
      missingPolicy: String(payload.missingPolicy || '').includes('intersection dates')
        ? '仅使用各指标共同存在的日期；缺失值保留为空；除数为零时保留为空。'
        : String(payload.missingPolicy || '').trim(),
    },
  };
}

// Coordinates are presentation metadata, never alternate observations or dates.
export function chartTemplateOptions(payload, size='third') {
  const parameters=payload.parameters||{};
  let points=payload.points||[];
  const base={series:points,comparisonSeries:payload.comparisonPoints||[],tooltipUnit:payload.unit||'',
    template:size==='third'?'small':'large',valueDigits:payload.unit==='手'?0:2,fullYear:!!parameters.fullYear};
  if(payload.template==='spread') {
    const nearMonth=Number(parameters.nearMonth), minimum=Number(parameters.minSpreadOpenInterest);
    points=points.filter(p=>Number(p.spreadOpenInterest)>=minimum && Number(p.date.slice(5,7))!==nearMonth);
    const cycles=[...new Set(points.map(p=>Number(p.nearContractYear)).filter(Number.isFinite))].sort((a,b)=>a-b).slice(-6);
    const visible=new Set(cycles),latest=cycles.at(-1);
    const stamp=p=>{const [y,m,d]=p.date.split('-').map(Number);return Date.UTC(2000+y-Number(p.nearContractYear),m-1,d);};
    const dates=points.filter(p=>visible.has(Number(p.nearContractYear))).map(stamp);
    if(!dates.length)return {...base,series:[]};
    const first=new Date(Math.min(...dates)),last=new Date(Math.max(...dates));
    const axis={crossYear:true,axisStartYear:latest+first.getUTCFullYear()-2000,axisStartMonth:first.getUTCMonth()+1,
      axisEndYear:latest+last.getUTCFullYear()-2000,axisEndMonth:last.getUTCMonth()+1};
    const low=Date.UTC(first.getUTCFullYear(),axis.axisStartMonth-1,1),high=Date.UTC(last.getUTCFullYear(),axis.axisEndMonth,1);
    return {...base,...axis,valueDigits:0,series:points.map(p=>({...p,groupKey:p.nearContractCode+'|'+p.farContractCode,
      groupLabel:p.nearContractCode.slice(2)+'-'+p.farContractCode.slice(2),groupOrder:Number(p.nearContractYear),
      groupYear:Number(p.nearContractYear)+first.getUTCFullYear()-2000,timelineCoordinate:(stamp(p)-low)/Math.max(high-low,1),
      timelineAxisStartYear:axis.axisStartYear,timelineAxisStartMonth:axis.axisStartMonth,
      timelineAxisEndYear:axis.axisEndYear,timelineAxisEndMonth:axis.axisEndMonth}))};
  }
  if(parameters.contractFamily) {
    const groups=new Map();
    points.forEach(p=>{if(!groups.has(p.groupKey))groups.set(p.groupKey,[]);groups.get(p.groupKey).push(p);});
    const recent=[...groups.values()].map(g=>g.sort((a,b)=>a.date.localeCompare(b.date))).sort((a,b)=>a[0].contractYear-b[0].contractYear).slice(-6);
    if(!recent.length)return {...base,series:[]};
    const anchor=recent.at(-1)[0],start=(anchor.contractStartDate||anchor.date).split('-').map(Number),endYear=anchor.contractYear;
    const axis={crossYear:true,axisStartYear:start[0],axisStartMonth:start[1],axisEndYear:endYear,axisEndMonth:parameters.contractMonth};
    const low=Date.UTC(2000,start[1]-1,1),high=Date.UTC(2000+endYear-start[0],parameters.contractMonth,1);
    return {...base,...axis,series:recent.flatMap(group=>{
      const startYear=Number((group[0].contractStartDate||group[0].date).slice(0,4));
      return group.map(p=>{const [y,m,d]=p.date.split('-').map(Number);return {...p,groupYear:p.contractYear,
        timelineCoordinate:(Date.UTC(2000+y-startYear,m-1,d)-low)/Math.max(high-low,1),
        timelineAxisStartYear:axis.axisStartYear,timelineAxisStartMonth:axis.axisStartMonth,
        timelineAxisEndYear:axis.axisEndYear,timelineAxisEndMonth:axis.axisEndMonth};});
    })};
  }
  return base;
}
