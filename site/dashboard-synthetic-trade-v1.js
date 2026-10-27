import {installChartTemplateStyles} from './三分之一尺寸折线图-同比模板/chart-core.js?v=20261019a';
import {renderEditableMonthlyChart} from './dashboard-editable-chart-runtime-v2.js?v=20261026a';
import {cnkrStats,cnkrHeaders} from './dashboard-synthetic-trade-model-v1.js?v=20261026a';

const app=document.querySelector('#app');
const routes=new Set(['china_butadiene','korea_butadiene','china_synthetic_rubber','korea_synthetic_rubber']);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const route=()=>location.hash.slice(1).split('/')[0];
const tone=value=>value>0?'is-positive':value<0?'is-negative':'';
const number=value=>Number.isFinite(value)?value.toLocaleString('zh-CN',{minimumFractionDigits:1,maximumFractionDigits:1}):'—';
const percentage=value=>Number.isFinite(value)?`${value>0?'+':''}${(value*100).toFixed(1)}%`:'—';
let frame=0;
let resizer=null;

installChartTemplateStyles();
const style=document.createElement('style');
style.textContent=`
.synthetic-trade-page-host,.cnkr-layout,.cnkr-chart-sections{min-width:0}
.cnkr-layout{display:grid;gap:28px}.cnkr-chart-sections{display:grid;gap:32px}
.cnkr-section{display:grid;gap:10px;min-width:0}
.cnkr-chart-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;align-items:start}
.cnkr-chart{min-width:0;overflow:hidden}.cnkr-chart .country-chart-header h2{font-size:14px}
.cnkr-table .cnkr-summary{font-weight:600}.cnkr-table .cnkr-summary-up{background:#fff5f5}
.cnkr-table .cnkr-summary-down{background:#f0faf4}.cnkr-table td{color:var(--ink)}
.cnkr-table td.is-positive,.cnkr-layout .metric-note.is-positive{color:#f12626}
.cnkr-table td.is-negative,.cnkr-layout .metric-note.is-negative{color:#3f8b61}
.cnkr-table td.is-empty{color:var(--muted-2)}.cnkr-layout .metric-note{font-size:11px}
@media(max-width:1120px){.cnkr-chart-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:760px){.cnkr-chart-grid{grid-template-columns:1fr}}
`;
document.head.append(style);

function cards(page) {
  const synthetic=page.route.includes('synthetic');
  return '<section class="metric-grid" aria-label="进出口关键指标">'+page.cardSeries.flatMap((sid,index)=>{
    const stats=cnkrStats(page.series[sid],page.latestMonth);
    const direction=index?'出口':'进口';
    return [{label:'当月'+direction+(synthetic?'合计':'量'),value:stats.current,rate:stats.yoy,rateLabel:'同比'},
      {label:'累计'+direction+(synthetic?'合计':'量'),value:stats.ytd,rate:stats.ytdYoy,rateLabel:'累计同比'}];
  }).map(item=>`<article class="metric-card"><p>${esc(item.label)}</p><div class="metric-value">${number(item.value)}<small>万吨</small></div><span class="metric-note ${tone(item.rate)}">${item.rateLabel} ${percentage(item.rate)}</span></article>`).join('')+'</section>';
}

function table(page) {
  const cell=value=>`<td${value===null?' class="is-empty"':''}>${number(value)}</td>`;
  const rate=value=>`<td class="${value===null?'is-empty':tone(value)}">${percentage(value)}</td>`;
  const body=page.tableSections.map(section=>'<tbody class="dashboard-table-section"><tr class="dashboard-table-subheading"><th colspan="9">'+esc(section.title)+'</th></tr>'+(section.note?'<tr><td colspan="9" class="dashboard-table-note">'+esc(section.note)+'</td></tr>':'')+section.rows.map(row=>{
    const m=cnkrStats(page.series[row.seriesId],page.latestMonth);
    const classes=row.summary?'cnkr-summary '+(m.yoy>0?'cnkr-summary-up':m.yoy<0?'cnkr-summary-down':''):'';
    return `<tr class="${classes}" data-cnkr-series="${esc(row.seriesId)}"><td>${esc(row.label)}</td>`+
      [m.current,m.prior,m.previous,m.ytd,m.priorYtd].map(cell).join('')+[m.yoy,m.ytdYoy,m.mom].map(rate).join('')+'</tr>';
  }).join('')+'</tbody>').join('');
  return `<article class="dashboard-table-panel cnkr-table" data-compact-table data-table-id="${page.route}-monthly"><header class="dashboard-table-heading"><div class="dashboard-table-title-group"><h2 class="dashboard-table-title">${esc(page.title)}月度指标</h2></div><span class="dashboard-table-unit">单位 / 万吨</span></header><div class="dashboard-table-scroll"><table class="dashboard-data-table"><thead><tr>${cnkrHeaders(page.latestMonth).map(h=>`<th>${h}</th>`).join('')}</tr></thead>${body}</table></div></article>`;
}

function chartMarkup(page,section,item) {
  const id=`cnkr:${page.reporter}:${item.seriesId}`;
  return `<article class="country-chart thailand-chart cnkr-chart" data-series-id="${esc(id)}" data-cnkr-series="${esc(item.seriesId)}" data-chart-section="${esc(section.key)}" data-chart-size="third"><header class="country-chart-header"><h2>${esc(item.title)}</h2><div class="country-chart-meta"><span>单位 / 万吨</span><span>同比 / %</span></div></header><div class="country-chart-legend" aria-label="图例"></div><div class="chart-stage"><svg class="seasonal-chart" role="img" aria-label="${esc(item.title)}季节性图表"></svg><div class="chart-tooltip"></div></div></article>`;
}

function renderChart(card,page) {
  const series=page.series[card.dataset.cnkrSeries];
  renderEditableMonthlyChart({card,chartId:card.dataset.seriesId,title:series.label,sourceLabel:series.label,
    unit:'万吨',sectionId:card.dataset.chartSection,size:'third',
    svg:card.querySelector('.seasonal-chart'),stage:card.querySelector('.chart-stage'),
    tooltip:card.querySelector('.chart-tooltip'),legend:card.querySelector('.country-chart-legend'),
    series:series.values.map(p=>({...p,valueKt:p.value})),tooltipUnit:'万吨'});
}

function render(host,page) {
  if(!host.isConnected||route()!==page.route)return;
  host.innerHTML='<div class="cnkr-layout">'+cards(page)+table(page)+'<div class="cnkr-chart-sections">'+page.chartSections.map(section=>
    `<section class="thailand-chart-section cnkr-section" data-section-id="${esc(section.key)}"><header class="thailand-section-heading"><h2>${esc(section.title)}</h2><span>更新至 ${page.latestMonth} / MONTHLY</span></header><div class="thailand-chart-grid cnkr-chart-grid" data-section-source="${esc(section.key)}">${section.charts.map(c=>chartMarkup(page,section,c)).join('')}</div></section>`
  ).join('')+'</div><div class="thailand-scope-note"><strong>口径：</strong>'+page.notes.map(note=>`<p>${esc(note)}</p>`).join('')+'</div></div>';
  const intro=app.querySelector('.page-intro');
  if(intro){
    intro.querySelector('.intro-stamp')?.remove();
    let controls=intro.querySelector('.intro-controls');
    if(!controls){controls=document.createElement('div');intro.append(controls);}
    controls.className='intro-controls thailand-intro-controls';
    controls.innerHTML=`<div class="intro-control"><span class="intro-control-label">更新月份</span><strong class="intro-control-value">${page.latestMonth}</strong></div><div class="intro-control"><span class="intro-control-label">单位</span><strong class="intro-control-value">万吨</strong></div>`;
  }
  const top=app.querySelector('.topbar-meta strong');if(top)top.textContent=page.latestMonth;
  const chartCards=[...host.querySelectorAll('.cnkr-chart')];
  resizer?.disconnect();
  chartCards.forEach(card=>renderChart(card,page));
  if('ResizeObserver' in window){resizer=new ResizeObserver(()=>chartCards.forEach(card=>renderChart(card,page)));chartCards.forEach(card=>resizer.observe(card));}
  host.dataset.expectedCharts=String(chartCards.length);
  host.dataset.loaded='true';
  window.dispatchEvent(new CustomEvent('synthetic-trade-dashboard-ready',{detail:{route:page.route}}));
}

function initialize() {
  const key=route();
  if(!routes.has(key))return;
  const host=app?.querySelector('.synthetic-trade-page-host');
  if(!host||host.dataset.loadStarted)return;
  host.dataset.loadStarted='true';
  fetch('/api/synthetic-trade?route='+encodeURIComponent(key),{cache:'no-store'}).then(async response=>{
    const payload=await response.json();
    if(!response.ok||!payload.ok)throw Error(payload.error||'进出口数据读取失败');
    render(host,payload.page);
  }).catch(error=>{if(host.isConnected){host.innerHTML=`<div class="data-error">${esc(error.message)}</div>`;host.dataset.loaded='failed';}console.error(error);});
}
function schedule(){if(!frame)frame=requestAnimationFrame(()=>{frame=0;initialize();});}
new MutationObserver(schedule).observe(app||document.body,{childList:true,subtree:true});
window.addEventListener('hashchange',schedule);
schedule();
