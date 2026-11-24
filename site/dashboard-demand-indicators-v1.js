import { systemChartDefinitions } from './dashboard-chart-data-v1.js?v=20261123d';
import { renderEditableDailyChart, renderEditableMonthlyChart } from './dashboard-editable-chart-runtime-v2.js?v=20261123d';

const route = 'demand_indicator_summary';
const sections = [
  {id:'demand-indicators', title:'轮胎指标', count:6},
  {id:'demand-auto-indicators', title:'汽车指标', count:5},
];
const app = document.getElementById('app');
const escape = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const isActive = () => location.hash.slice(1).split('/')[0] === route;

function cardMarkup({chartId,title,chart}) {
  const yoy = chart.template === 'monthly' ? '<span>同比 / %</span>' : '';
  return `<article class="country-chart thailand-chart demand-indicator-chart" data-demand-chart="${escape(chartId)}" data-chart-size="third">
    <header class="country-chart-header"><h2>${escape(title)}</h2><div class="country-chart-meta"><span>单位 / ${escape(chart.unit)}</span>${yoy}</div></header>
    <div class="country-chart-legend" aria-label="图例"></div>
    <div class="chart-stage"><svg class="seasonal-chart" role="img" aria-label="${escape(title)}"></svg><div class="chart-tooltip"></div></div>
  </article>`;
}

function renderCard(card, {chartId,title,chart,metrics,sectionId}) {
  const render = chart.template === 'daily' ? renderEditableDailyChart : renderEditableMonthlyChart;
  render({card,chartId,title,unit:chart.unit,sectionId,metrics,size:'third',template:'small',systemOnly:true,
    svg:card.querySelector('svg'),stage:card.querySelector('.chart-stage'),
    legend:card.querySelector('.country-chart-legend'),tooltip:card.querySelector('.chart-tooltip')});
}

let frame = 0, resizeObserver;
async function mount() {
  const host = isActive() && app?.querySelector('.demand-indicator-page-host');
  if (!host || host.dataset.state) return;
  host.dataset.state = 'loading';
  try {
    const definitions = await systemChartDefinitions(route);
    if (!host.isConnected || !isActive()) return;
    const expected = sections.reduce((count, section) => count + section.count, 0);
    if (definitions.size !== expected) throw Error('需求指标图表定义不完整，应为 ' + expected + ' 张');
    const groups = sections.map(({id,title,count}) => {
      const charts = [...definitions.values()].filter(chart => chart.sectionId === id);
      if (charts.length !== count) throw Error(title + '图表定义不完整，应为 ' + count + ' 张');
      return `<section class="thailand-chart-section" data-section-id="${id}">
        <header class="thailand-section-heading"><h2>${title}</h2></header>
        <div class="thailand-chart-grid" data-section-source="${id}">${charts.map(cardMarkup).join('')}</div>
      </section>`;
    });
    host.dataset.expectedCharts = expected;
    host.innerHTML = groups.join('') + `<p class="thailand-scope-note"><strong>数据口径：</strong>轮胎数据来自 Mysteel。开工率为中国样本产能利用率，成品库存为山东样本厂内库存可用天数；两者按各胎种实际周值绘制，不转月均、不补值。产量为全国半钢胎、全钢胎各自的月度实报量。汽车数据来自 Wind，按月以万辆展示；汽车出口含底盘，电动汽车出口采用“电动载人汽车”分类，不代表全部新能源汽车出口。</p>`;
    const cards = [...host.querySelectorAll('[data-demand-chart]')];
    const render = card => renderCard(card,definitions.get(card.dataset.demandChart));
    cards.forEach(render);
    resizeObserver?.disconnect();
    if ('ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(entries => entries.forEach(({target}) => {if (target.isConnected) render(target);}));
      cards.forEach(card => resizeObserver.observe(card));
    }
    host.dataset.state = 'mounted';
  } catch (error) {
    if (!host.isConnected) return;
    host.dataset.state = 'failed';
    host.innerHTML = `<div class="thailand-error"><strong>需求指标加载失败</strong><code>${escape(error.message)}</code></div>`;
  }
}

function schedule() {
  if (frame || !isActive()) return;
  frame = requestAnimationFrame(() => {frame=0; void mount();});
}
if (app) new MutationObserver(schedule).observe(app,{childList:true,subtree:true});
window.addEventListener('hashchange',() => {
  if (!isActive()) resizeObserver?.disconnect();
  schedule();
});
schedule();
