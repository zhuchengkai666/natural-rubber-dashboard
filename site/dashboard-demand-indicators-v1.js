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
    sections:[{id:'synthetic-overview',title:'总览',count:5},
      {id:'synthetic-butadiene',title:'丁二烯',count:10},{id:'synthetic-br',title:'顺丁橡胶',count:7},
      {id:'synthetic-sbr',title:'丁苯橡胶',count:6},{id:'synthetic-sbs',title:'SBS',count:5},{id:'synthetic-abs',title:'ABS',count:5}],
    scope:'市场价和生产毛利使用钢联（Mysteel）日度数据。BR 主连按本库上期所 BR 合约日线拼接：每日持仓量最大者优先，并列按成交量、近月、合约代码确定，使用原始收盘价、不复权。BR 月差＝主力收盘价－同日交割月紧随其后的合约收盘价，缺一腿不计算。丁二烯基差＝山东中部丁二烯市场价－BR 主连收盘价（跨品种价差）；山东民营基差＝山东民营 BR9000 市场价－BR 主连收盘价；同日两项均有值才计算。开工率和产量使用各品种实报周值，顺丁两项均仅含高顺。库存按实报周度日期绘制：丁二烯用港口库存，ABS 用生产企业权益库存。顺丁橡胶库存、丁苯橡胶库存和 SBS库存分别按同日厂内库存＋贸易商库存计算，任一项无值则不计算，不补零。丁二烯下游消费量合计为顺丁、丁苯、丁腈橡胶、ABS、SBS 五个行业的丁二烯实际月度消费量之和，五项齐备才计算。丁二烯进口利润（自韩国）＝山东中部丁二烯市场价－（韩国丁二烯 FOB 价＋45 美元/吨）×美元兑人民币在岸即期汇率×1.13×1.02＋200 元/吨。'
      +'顺丁橡胶出口利润（至东南亚）＝（高顺顺丁东南亚 CFR 价－中国 FOB 价－40 美元/吨）×美元兑人民币在岸即期汇率。两项利润各自的三个输入必须同日均有值，不前填。中国净进口量沿用进出口页的海关月度口径：进口－出口，单位万吨，负值为净出口；顺丁按海关 BR 口径，不限高顺。',
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
