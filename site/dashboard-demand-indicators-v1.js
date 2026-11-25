import { systemChartDefinitions } from './dashboard-chart-data-v1.js?v=20261123d';
import { renderEditableDailyChart, renderEditableMonthlyChart } from './dashboard-editable-chart-runtime-v2.js?v=20261123d';

const summaries = {
  demand_indicator_summary: {
    label:'需求指标', host:'.demand-indicator-page-host',
    sections:[{id:'demand-indicators',title:'轮胎指标',count:6},{id:'demand-auto-indicators',title:'汽车指标',count:5}],
    scope:'轮胎数据来自 Mysteel。开工率为中国样本产能利用率，成品库存为山东样本厂内库存可用天数；两者按各胎种实际周值绘制，不转月均、不补值。产量为全国半钢胎、全钢胎各自的月度实报量。汽车数据来自 Wind，按月以万辆展示；汽车出口含底盘，电动汽车出口采用“电动载人汽车”分类，不代表全部新能源汽车出口。',
  },
  synthetic_indicator_summary: {
    label:'合成指标', host:'.synthetic-indicator-page-host',
    sections:[{id:'synthetic-overview',title:'总览',count:4},
      {id:'synthetic-butadiene',title:'丁二烯',count:5},{id:'synthetic-br',title:'顺丁橡胶',count:4},
      {id:'synthetic-sbr',title:'丁苯橡胶',count:4},{id:'synthetic-sbs',title:'SBS',count:4},{id:'synthetic-abs',title:'ABS',count:4}],
    scope:'市场价和生产毛利使用钢联（Mysteel）日度数据。BR 主连按本库上期所 BR 合约日线拼接：每日持仓量最大者优先，并列按成交量、近月、合约代码确定，使用原始收盘价、不复权。丁二烯基差＝山东中部丁二烯市场价－BR 主连收盘价（跨品种价差）；山东民营基差＝山东民营 BR9000 市场价－BR 主连收盘价；同日两项均有值才计算。开工率使用产能利用率周值，顺丁仅含高顺。库存按实报周度日期绘制：丁二烯用港口库存，丁苯用厂内库存，ABS 用生产企业权益库存。顺丁橡胶库存、SBS库存分别按同日厂内库存＋贸易商库存计算，任一项无值则不计算，不补零。丁二烯两种工艺毛利单独展示。',
  },
};
const app = document.getElementById('app');
const escape = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const activeRoute = () => location.hash.slice(1).split('/')[0];

function cardMarkup({chartId,title,chart}, route) {
  const yoy = chart.template === 'monthly' ? '<span>同比 / %</span>' : '';
  const demand = route === 'demand_indicator_summary';
  return `<article class="country-chart thailand-chart${demand?' demand-indicator-chart':''}" data-summary-chart="${escape(chartId)}"${demand?` data-demand-chart="${escape(chartId)}"`:''} data-chart-size="third">
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
  const route = activeRoute();
  const page = Object.hasOwn(summaries, route) && summaries[route];
  const host = page && app?.querySelector(page.host);
  if (!host || host.dataset.state) return;
  host.dataset.state = 'loading';
  try {
    const definitions = await systemChartDefinitions(route);
    if (!host.isConnected || activeRoute() !== route) return;
    const expected = page.sections.reduce((count, section) => count + section.count, 0);
    if (definitions.size !== expected) throw Error(page.label + '图表定义不完整，应为 ' + expected + ' 张');
    const groups = page.sections.map(({id,title,count}) => {
      const charts = [...definitions.values()].filter(chart => chart.sectionId === id);
      if (charts.length !== count) throw Error(title + '图表定义不完整，应为 ' + count + ' 张');
      return `<section class="thailand-chart-section" data-section-id="${id}">
        <header class="thailand-section-heading"><h2>${title}</h2></header>
        <div class="thailand-chart-grid" data-section-source="${id}">${charts.map(chart=>cardMarkup(chart,route)).join('')}</div>
      </section>`;
    });
    host.dataset.expectedCharts = expected;
    host.innerHTML = groups.join('') + `<p class="thailand-scope-note"><strong>数据口径：</strong>${escape(page.scope)}</p>`;
    const cards = [...host.querySelectorAll('[data-summary-chart]')];
    const render = card => renderCard(card,definitions.get(card.dataset.summaryChart));
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
    host.innerHTML = `<div class="thailand-error"><strong>${escape(page.label)}加载失败</strong><code>${escape(error.message)}</code></div>`;
  }
}

function schedule() {
  if (frame || !Object.hasOwn(summaries, activeRoute())) return;
  frame = requestAnimationFrame(() => {frame=0; void mount();});
}
if (app) new MutationObserver(schedule).observe(app,{childList:true,subtree:true});
window.addEventListener('hashchange',() => {
  resizeObserver?.disconnect();
  schedule();
});
schedule();
