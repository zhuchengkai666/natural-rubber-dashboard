const syntheticTradePages = [
  ['china_butadiene','中国丁二烯'], ['korea_butadiene','韩国丁二烯'],
  ['china_synthetic_rubber','中国合成橡胶'], ['korea_synthetic_rubber','韩国合成橡胶'],
];
const builtin = [
  ['futures_rubber','月差/持仓','','futures_rubber'],
  ['futures_position_rank','持仓龙虎榜','','futures_position_rank'],
  ['weather_tracking','天气跟踪','',''],
  ['weather_history','历史天气情况','weather_tracking','weather_history'],
  ['weather_driver_detection','天气驱动因子检测','weather_tracking','weather_driver_detection'],
  ['demand_tracking','需求跟踪','',''],
  ['demand_indicator_summary','需求指标汇总','demand_tracking','demand_indicator_summary'],
  ['tire_export','中国轮胎出口','demand_tracking','tire_export'],
  ['rubber_export','中国橡胶进口','',''],
  ['overview','中国总览','rubber_export','overview'],
  ['countries','分国别','rubber_export','countries'],
  ['products','分胶种','rubber_export','products'],
  ['producer_export','其他国家进出口','',''],
  ...[['international_demand_observation','国际需求观察'],['latex_diversion_observation','胶水分流观察'],['thailand','泰国'],['vietnam','越南'],
      ['indonesia','印尼'],['malaysia','马来西亚'],['cote_divoire','科特迪瓦'],['united_states','美国'],
      ['european_union','欧盟'],['india','印度'],['japan','日本'],['south_korea','韩国']]
      .map(([id,label])=>[id,label,'producer_export',id]),
  ['synthetic_tracking','合成胶/丁二烯跟踪','',''],
  ['synthetic_indicator_summary','合成指标汇总','synthetic_tracking','synthetic_indicator_summary'],
  ['synthetic_trade','合成/丁二烯进出口','synthetic_tracking',syntheticTradePages[0][0]],
  ['custom_analysis','自定义分析','','custom_analysis'],
].map(([id,label,parentId,route])=>({id,label,parentId,route}));
let navigation = {nodes:[],revision:''};
let selectedRoot = '';
const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function api() {
    const response = await fetch('/api/custom-navigation', { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || '目录读取失败');
    return data;
  }
function nodes() {
  const pages = (window.customDashboardPages || []).filter(p=>!p.isDeleted);
  const pageIds = new Set(pages.map(p=>'page-'+p.id));
  const legacyTrade = !navigation.nodes.some(n=>n.id==='synthetic_tracking');
  const result = navigation.nodes.filter(n=>(!n.id.startsWith('page-') || pageIds.has(n.id)) &&
    (!legacyTrade || !syntheticTradePages.some(([route])=>n.id===route && n.route===route))).map(n=>({...n}));
  const addDemandGroup = !result.some(n=>n.id==='demand_tracking');
  if (legacyTrade) {
    for (const n of result) {
      if (n.id==='synthetic_trade') Object.assign(n,builtin.find(item=>item.id===n.id));
      else if (n.parentId==='synthetic_trade') n.parentId='synthetic_tracking';
    }
  }
  for (const n of builtin) if (!result.some(x=>x.id===n.id)) {
    if (n.id === 'synthetic_tracking' || n.parentId === 'synthetic_tracking') {
      const afterId = n.id==='synthetic_tracking' ? 'producer_export' : 'synthetic_tracking';
      const afterChildren = n.parentId==='synthetic_tracking' && !(legacyTrade && n.id==='synthetic_indicator_summary');
      const last = result.findLastIndex(x=>x.id===afterId || (afterChildren && x.parentId===afterId));
      if (last >= 0) { result.splice(last+1,0,{...n}); continue; }
    }
    if (n.id === 'weather_tracking') {
      const rankIndex = result.findIndex(x=>x.id==='futures_position_rank');
      if (rankIndex >= 0) { result.splice(rankIndex + 1, 0, {...n}); continue; }
    }
    if (n.parentId === 'weather_tracking') {
      const weatherChildren = result.map((x,i)=>x.parentId==='weather_tracking'?i:-1).filter(i=>i>=0);
      const weatherRoot = result.findIndex(x=>x.id==='weather_tracking');
      result.splice(weatherChildren.length ? weatherChildren.at(-1) + 1 : weatherRoot + 1, 0, {...n});
      continue;
    }
    if (n.id === 'demand_tracking' || n.parentId === 'demand_tracking') {
      const afterId = n.id === 'demand_tracking' ? 'weather_tracking' : 'demand_tracking';
      const last = result.findLastIndex(x=>x.id===afterId || x.parentId===afterId);
      if (last >= 0) { result.splice(last+1,0,{...n}); continue; }
    }
    if (n.id === 'latex_diversion_observation') {
      const demandIndex = result.findIndex(x=>x.id==='international_demand_observation');
      if (demandIndex >= 0) { result.splice(demandIndex + 1, 0, {...n}); continue; }
    }
    result.push({...n});
  }
  // Older saved navigation already contains tire_export as its own root.
  // Migrate when introducing the group; thereafter preserve explicit edits.
  if (addDemandGroup) {
    const tireIndex = result.findIndex(n=>n.id==='tire_export' && !n.parentId && n.route==='tire_export');
    if (tireIndex >= 0) {
      const [tire] = result.splice(tireIndex,1);
      const summaryIndex = result.findIndex(n=>n.id==='demand_indicator_summary');
      result.splice(summaryIndex+1,0,{...tire,parentId:'demand_tracking'});
    }
  }
  for (const p of pages) {
    const id = 'page-'+p.id;
    const parentId = p.navigationParent==='synthetic_trade' ? 'synthetic_tracking' : p.navigationParent;
    if (!result.some(n=>n.id===id)) result.push({id,label:p.title,parentId:parentId || 'custom_analysis',route:'custom_analysis/'+p.id});
  }
  const roots = new Set(result.filter(n=>!n.parentId).map(n=>n.id));
  for (const n of result) if (n.parentId && !roots.has(n.parentId)) n.parentId='custom_analysis';
  const excluded = new Set(['custom_analysis']); let changed = true; while(changed) { changed = false; for(const n of result) if(excluded.has(n.parentId) && !excluded.has(n.id)) { excluded.add(n.id); changed = true; } } return result.filter(n => !excluded.has(n.id));
}
window.customNavigationRoots = () => nodes().filter(n=>!n.parentId);
window.dashboardSyntheticTradePages = syntheticTradePages;
window.dashboardNavigationHasRoute = primary => nodes().some(n => String(n.route || '').split('/')[0] === primary && Boolean(primary));
window.customNavigationRefresh = async () => { navigation=await api(); };
window.dashboardNavigationRender = (route, countryItems, productItems) => {
  const items = nodes();
  const current = location.hash.slice(1) || 'futures_rubber';
  const active = n => n.id==='synthetic_trade' ? syntheticTradePages.some(([key])=>key===current)
    : n.route && (current===n.route || (['countries','products'].includes(n.route) && current.startsWith(n.route+'/')));
  const target = n => {
    if (n.route==='countries') return countryItems[0] ? 'countries/'+countryItems[0].id : 'countries';
    if (n.route==='products') return productItems[0] ? 'products/'+productItems[0].id : 'products';
    return n.route;
  };
  return items.filter(n=>!n.parentId).map((root,index)=>{
    const children = items.filter(n=>n.parentId===root.id);
    const expanded = selectedRoot===root.id || (!selectedRoot && (active(root)||children.some(active)));
    const href = root.route || target(children[0] || {});
    const primary = `<button class="nav-item${expanded?' active':''}" data-nav-id="${esc(root.id)}" ${href?'data-route="'+esc(href)+'"':'data-nav-empty="'+esc(root.id)+'"'} type="button"><span class="nav-index">${String(index+1).padStart(2,'0')}</span><span class="nav-copy"><strong>${esc(root.label)}</strong><small>${children.length?'ANALYSIS DIRECTORY':'ANALYSIS PAGE'}</small></span><span class="nav-arrow">${children.length?(expanded?'⌃':'⌄'):'↗'}</span></button>`;
    return primary + (expanded && children.length ? `<div class="subnav primary-subnav" aria-label="${esc(root.label)}">`+children.map(n=>{
      const isActive = active(n);
      const trade = n.id==='synthetic_trade';
      const details = trade ? syntheticTradePages
        : (n.id==='countries' ? countryItems : n.id==='products' ? productItems : [])
            .map(d=>[n.route+'/'+d.id,d.label]);
      const expandedDetails = Boolean(isActive && details.length);
      return `<a class="subnav-item${isActive?' active':''}" data-nav-id="${esc(n.id)}" href="#${esc(target(n))}"${trade?` aria-expanded="${expandedDetails}"`:''}><span>${esc(n.label)}</span><small>${trade?(expandedDetails?'⌃':'⌄'):'↗'}</small></a>` +
        (expandedDetails?`<div class="subnav" aria-label="${esc(n.label)}">`+details.map(([url,label])=>
          `<a class="subnav-item${current===url?' active':''}" href="#${esc(url)}"${current===url?' aria-current="page"':''}><span>${esc(label)}</span></a>`).join('')+'</div>':'');
    }).join('')+'</div>':'');
  }).join('');
};
window.addEventListener('hashchange',()=>{selectedRoot='';});
api().then(data=>{navigation=data;window.rubberDashboardRender?.();}).catch(error=>console.error('目录配置读取失败',error));