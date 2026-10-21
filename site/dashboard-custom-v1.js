const directEdit = null, editorPage = null;
import { installChartTemplateStyles, renderDailySeasonalChart, renderSeasonalChart } from "./三分之一尺寸折线图-同比模板/chart-core.js?v=20261019a";

installChartTemplateStyles();

import { requestChartSeries, chartTemplateOptions, chartTooltipModel } from "./dashboard-chart-data-v1.js?v=20260920c";

import { renderMonthlyTrend } from "./monthly-trend-template.js?v=20260920c";

import { orderedGroups } from "./dashboard-section-order-v1.js?v=20260916a";

let customPages = [];

let customMetrics = [];

let customCatalog = {};

let pageExtensions = [];

let renderToken = 0;

const previewCache = new Map();

const CUSTOM_CHART_SIZES = Object.freeze({
  third: "三分之一",
  "four-fifths": "五分之四",
  full: "整行",
});

function customChartSize(value, fallback = "third") {
  return Object.hasOwn(CUSTOM_CHART_SIZES, value) ? value : fallback;
}

function customEscape(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function customCanonicalUnit(unit) {
  return unit === "千吨" || unit === "kt" ? "万吨" : unit;
}

function customCanonicalizeSavedCharts(config) {
  const normalize = (chart) => {
    if (chart) chart.unit = customCanonicalUnit(chart.unit || "");
  };
  (config.sections || []).forEach((section) => (section.charts || []).forEach(normalize));
  (config.sectionOverrides || []).forEach((section) => (section.charts || []).forEach(normalize));
  (config.chartOverrides || []).forEach((item) => normalize(item.chart));
  return config;
}

function customRoute() {
  const parts = window.location.hash.replace(/^#/, "").split("/");
  const routeKey = parts.filter(Boolean).slice(0, 2).join("/") || "overview";
  return { active: parts[0] === "custom_analysis", pageId: parts[1] || "", routeKey };
}

async function customJson(url) {
    const response = await fetch(url, { cache: 'no-store' });
    const payload = await response.json();
    if (!response.ok || !payload?.ok) throw new Error(payload?.error || '快照读取失败');
    return payload;
  }

function customMetricById(metricId) {
  return customMetrics.find((metric) => metric.id === metricId) || null;
}

async function customReloadPages({ refreshShell = true } = {}) {
  const payload = await customJson("/api/custom-pages");
  customPages = (payload.pages || []).map(customCanonicalizeSavedCharts);
  window.customDashboardPages = customPages;
  await window.customNavigationRefresh?.();
  if (refreshShell && typeof window.rubberDashboardRender === "function") {
    window.rubberDashboardRender();
  }
  customScheduleRender();
}

async function customReloadExtensions() {
  const payload = await customJson("/api/page-extensions");
  pageExtensions = (payload.extensions || []).map(customCanonicalizeSavedCharts);
  customScheduleRender();
}

window.customDashboardReloadPages = () => customReloadPages();

function customToolbarMarkup() { return ''; }

function customLandingMarkup() {
  const activePages = customPages.filter((page) => !page.isDeleted);
  const metricCount = Number(customCatalog.metricCount || customMetrics.length || 0);
  const relationCount = Number(customCatalog.relationCount || 0);
  return '<section class="custom-analysis-page" data-custom-rendered="landing">' +
    customToolbarMarkup(null) +
    '<div class="custom-welcome"><div><p class="module-kicker">CUSTOM PAGE BUILDER</p><h2>组合你自己的 DuckDB 指标页面</h2><p>创建页面和分区，搜索指标，用 A 至 T 编写简单公式（每张图最多 20 个指标）。保存的页面会固定显示在左侧栏目中，并随数据库更新读取最新数据。</p></div>' +
      '<div class="custom-welcome-count"><strong>' + metricCount.toLocaleString("zh-CN") + '</strong><span>可选时间序列指标</span><small>' + relationCount + ' 个数据库关系已扫描</small></div></div>' +
    '<div class="custom-catalog-audit"><span><b>' + Number(customCatalog.numericColumnCount || 0).toLocaleString("zh-CN") + '</b>数值字段</span><span><b>' + Number(customCatalog.plottableRelationCount || 0).toLocaleString("zh-CN") + '</b>可画关系</span><span><b>' + Number(customCatalog.autoMetricCount || 0).toLocaleString("zh-CN") + '</b>自动指标</span><span><b>' + Number(customCatalog.curatedMetricCount || 0).toLocaleString("zh-CN") + '</b>业务指标</span><span><b>' + Number(customCatalog.skippedNoTimeRelationCount || 0).toLocaleString("zh-CN") + '</b>无时间轴关系</span></div>' +
    (activePages.length ? '<div class="custom-page-directory">' + activePages.map((page) =>
      '<a href="#custom_analysis/' + page.id + '"><span>自定义页面</span><strong>' + customEscape(page.title) + '</strong><small>' + (page.sections || []).length + ' 个分区 ↗</small></a>'
    ).join("") + '</div>' : '<div class="custom-empty"><strong>还没有自定义页面</strong><p>点击“新建页面”，添加标题、分区和第一张折线图。</p></div>') +
    customArchiveMarkup() +
    customEditorMarkup() +
  '</section>';
}

function customArchiveMarkup() { return ''; }

function customChartCardMarkup(chart, sectionId, index, editor = false, direct = false) {
  const cacheKey = `${sectionId}/${chart.id}`;
  const payload = previewCache.get(cacheKey);
  const unit = payload?.unit || chart.unit || "自动";
  const size = customChartSize(chart.size);
  const cardClass = "custom-chart-card country-chart";
  const hasYoyAxis = chart.template !== "monthly-trend" && chart.template !== "daily" && chart.template !== "futures-spread";
  return '<article class="' + cardClass + '" data-custom-chart-id="' + customEscape(chart.id) + '" data-section-id="' + customEscape(sectionId) + '" data-chart-index="' + index + '" data-chart-size="' + size + '">' +
    '<header class="country-chart-header custom-chart-header" tabindex="0" aria-label="' + customEscape(chart.title || '未命名折线图') + '，查看图表口径" data-chart-expression="' + customEscape(chart.expression || '') + '"><div><h2' + ('') + '>' + customEscape(chart.title || "未命名折线图") + '</h2></div>' +
      '<div class="country-chart-meta"><span class="custom-chart-unit">单位 / ' + customEscape(unit) + '</span><span class="custom-chart-yoy"' + (hasYoyAxis ? '' : ' hidden') + '>同比 / %</span></div></header>' +
    '<div class="country-chart-legend"></div>' +
    '<div class="chart-stage"><svg class="seasonal-chart" role="img" aria-label="' + customEscape(chart.title || "自定义折线图") + '"></svg><div class="chart-tooltip"></div>' +
      (!payload ? '<div class="custom-chart-loading">' + ("正在查询 DuckDB 指标") + '</div>' : '') +
    '</div></article>';
}

function customMethodologyMarkup(page) {
  const rows = (page.sections || []).flatMap((section) => (section.charts || []).map((chart) => {
    const bindings = Object.entries(chart.bindings || {}).map(([alias, id]) => {
      const metric = customMetricById(id);
      return alias + "＝" + (metric?.label || id);
    }).join("；");
    return '<li><strong>' + customEscape(chart.title) + '</strong><span>' + customEscape(chart.expression) + (bindings ? '；' + bindings : '') + '</span></li>';
  }));
  return '<section class="custom-methodology"><p class="module-kicker">METHODOLOGY</p><h2>自定义口径</h2><p>图表读取已保存的计算结果，业务数据变化后后台更新；数据版本及缺失说明见标题浮窗。公式按各指标共同存在的日期计算，缺失值不补零，除数为零时保留为缺失。加减运算要求单位一致，日度与月度指标不能混算。</p>' +
    (rows.length ? '<ol>' + rows.join("") + '</ol>' : '') + '</section>';
}

function customPageMarkup(page, editing = false) {
  const sections = page.sections || [];
  return '<section class="custom-analysis-page" data-custom-rendered="' + page.id + '">' +
    customToolbarMarkup(page) +
    (sections.length ? sections.map((section, sectionIndex) => '<section class="custom-chart-section"><div class="custom-section-heading"><div><p class="module-kicker">CUSTOM SERIES / ' + String(sectionIndex + 1).padStart(2, "0") + '</p><h2' + ('') + '>' + customEscape(section.title) + '</h2></div><span>固定三列布局</span></div>' +
      '<div class="custom-chart-grid custom-managed-chart-grid">' + (section.charts || []).map((chart, chartIndex) => {
        const active = false;
        return customChartCardMarkup(chart, section.id, chartIndex, false, false) + (active ? customChartEditorMarkup(section, chart, chartIndex, "inserted") : "");
      }).join("") + ('') + '</div></section>').join("") : '<div class="custom-empty"><strong>这个页面还没有折线图分组</strong></div>') +
    ('') +
    customMethodologyMarkup(page) +
    customArchiveMarkup() +
  '</section>';
}

function customExtensionSectionsMarkup(extension, editing = false, controls = true) {
  const sections = extension?.sections || [];
  return '<div class="custom-extension-content">' + sections.map((section, sectionIndex) => {
    const charts = section.charts || [];
    return '<section class="custom-chart-section"><div class="custom-section-heading"><div><p class="module-kicker">CUSTOM INSERT / ' + String(sectionIndex + 1).padStart(2, "0") + '</p><h2' + ('') + '>' + customEscape(section.title) + '</h2></div><span>固定三列 / 右键修改</span></div>' +
      '<div class="custom-chart-grid">' + charts.map((chart, chartIndex) => {
        const active = false;
        return customChartCardMarkup(chart, section.id, chartIndex, false, false) + (active ? customChartEditorMarkup(section, chart, chartIndex, "inserted") : "");
      }).join("") +
      ('') + '</div></section>';
  }).join("") +
    ('') +
    (sections.length && controls ? '<p class="custom-extension-note"><strong>自定义追加口径：</strong>公式按共同日期计算，缺失值不补零；新增图表默认一行三张。</p>' : '') + '</div>';
}

function customEnsurePageEditButton() {}

function customExtensionInsertionPoint() {
  const scope = document.querySelector(".thailand-scope-note");
  if (scope) return { parent: scope.parentElement, before: scope };
  const notes = [...document.querySelectorAll(".position-rank-note")];
  if (notes.length) {
    const note = notes[notes.length - 1];
    return { parent: note.parentElement, before: note };
  }
  const content = document.querySelector(".content-wrap");
  return content ? { parent: content, before: null } : null;
}

const CUSTOM_BUILTIN_CHART_SELECTOR = [
  ".country-chart",
  ".overview-chart-card",
  ".tire-chart-card",
  ".thailand-chart-card",
  ".producer-country-chart",
  ".futures-large-chart-card",
  ".futures-small-chart-card",
  ".futures-position-rank-chart-card",
].join(", ");

function customBuiltInCharts() {
  return [...document.querySelectorAll(CUSTOM_BUILTIN_CHART_SELECTOR)].filter((card) => !card.classList.contains("custom-chart-card") && !card.dataset.customInserted && !card.closest(".custom-page-extension-host") && !card.closest(".custom-analysis-page"));
}

function customChartKey(card, index) {
  const source = card.dataset.seriesId
    || card.dataset.overviewChart
    || [card.dataset.countryKey, card.dataset.metricKey].filter(Boolean).join(":")
    || card.dataset.chartId
    || card.dataset.productCode
    || (card.dataset.productTotal ? "product-total" : "")
    || (card.dataset.countryId ? `country:${card.dataset.countryId}` : "");
  return source ? `series:${source}` : `index:${index}`;
}

function customApplyPageTitle(route, extension, editing) {
  const title = document.querySelector(".page-intro h1, .producer-page-intro h1");
  if (!title) return;
  const wanted = extension?.title;
  if (wanted && title.textContent.trim() !== wanted) title.textContent = wanted;
  title.contentEditable = "false";
  title.spellcheck = false;
  title.toggleAttribute("data-direct-page-title", false);
  title.classList.toggle("is-direct-editable", false);
}

async function customRenderBuiltInOverride(card, override, index, editing) {
  let layer = card.querySelector(":scope > .custom-chart-override-layer");
  const base=window.dashboardEditableChartDefinitionV2?.(card)?.chart;
  const same=base && override?.chart && ['bindings','bindingFilters','expression','unit','startDate','endDate','template'].every(k=>JSON.stringify(base[k]||'')===JSON.stringify(override.chart[k]||''));
  const hasReplacement = !same && Boolean(Object.keys(override?.chart?.bindings || {}).length && String(override?.chart?.expression || "").trim());
  if (!hasReplacement) {
    layer?.remove();
    card.classList.remove("has-custom-chart-override");
    return;
  }
  const version = JSON.stringify(override.chart);
  if (!layer) {
    layer = document.createElement("div");
    layer.className = "custom-chart-override-layer";
    card.appendChild(layer);
  }
  card.classList.add("has-custom-chart-override");
  if (layer.dataset.renderKey === version && (layer.dataset.loading === "true" || layer.querySelector("[data-ready='true']"))) return;
  layer.dataset.renderKey = version;
  layer.dataset.loading = "true";
  layer.innerHTML = customChartCardMarkup(override.chart, "__builtin__", index, false, false).replace('custom-chart-card country-chart', 'custom-chart-card custom-override-render-card');
  try {
    const payload = await customPreview(override.chart);
    previewCache.set(`__builtin__/${override.chart.id}`, payload);
    customRenderChart(layer.querySelector(".custom-chart-card"), payload);
    layer.dataset.loading = "false";
  } catch (error) {
    const loading = layer.querySelector(".custom-chart-loading");
    if (loading) loading.textContent = error.message;
    layer.classList.add("has-error");
    layer.dataset.loading = "false";
  }
}

function customApplyBuiltInCharts(route, extension, editing) {
  const overrides = extension?.chartOverrides || [];
  customBuiltInCharts().forEach((card, index) => {
    const key = card.dataset.customEditKey || customChartKey(card, index);
    card.dataset.customEditKey = key;
    card.dataset.customTargetIndex = String(index);
    card.classList.toggle("is-direct-editable", false);
    const title = card.querySelector(":scope > header h2, :scope > .country-chart-header h2, :scope > .chart-header h2") || card.querySelector("h2");
    const override = overrides.find((item) => item.key === key) || null;
    if (!card.dataset.customOriginalSize) card.dataset.customOriginalSize = customChartSize(card.dataset.chartSize);
    card.dataset.chartSize = customChartSize(override?.size || override?.chart?.size, card.dataset.customOriginalSize);
    if (title) {
      if (!card.dataset.customOriginalTitle) card.dataset.customOriginalTitle = title.textContent.trim();
      const wanted = override?.title || card.dataset.customOriginalTitle;
      if (wanted && title.textContent.trim() !== wanted) title.textContent = wanted;
      title.contentEditable = "false";
      title.spellcheck = false;
      title.toggleAttribute("data-direct-builtin-title", false);
      
      title.classList.toggle("is-direct-editable", false);
    }
    customRenderBuiltInOverride(card, override, index, false);
    
  });
  
}

const CUSTOM_EDITABLE_GRID_SELECTOR = [
  ".thailand-chart-grid",
  ".overview-charts",
  ".tire-chart-grid",
  ".country-charts",
  ".futures-small-chart-grid",
  ".custom-runtime-chart-grid",
].join(", ");

function customEnsureStandaloneChartGrids() {
  [
    [".futures-spread-section > .futures-large-chart-card", "futures-main-spread", "月差"],
    [".futures-position-section > .futures-large-chart-card", "futures-main-position", "持仓"],
    [".position-rank-layout > .futures-position-rank-chart-card", "futures-position-rank", "持仓历史折线图"],
  ].forEach(([selector, source, title]) => {
    document.querySelectorAll(selector).forEach((card) => {
      const grid = document.createElement("div");
      grid.className = "custom-runtime-chart-grid";
      grid.dataset.sectionSource = source;
      if (source === "futures-position-rank") {
        const heading = document.createElement("header");
        heading.className = "custom-generated-section-heading";
        heading.innerHTML = `<h2>${customEscape(title)}</h2><span>LINE CHART</span>`;
        grid.appendChild(heading);
      }
      card.insertAdjacentElement("beforebegin", grid);
      grid.appendChild(card);
    });
  });
}

function customEditableGrids() {
  customEnsureStandaloneChartGrids();
  return [...document.querySelectorAll(CUSTOM_EDITABLE_GRID_SELECTOR)].filter((grid) => !grid.closest(".custom-page-extension-host") && !grid.closest(".custom-analysis-page"));
}

function customSectionTitleNode(grid) {
  if (grid.matches(".custom-runtime-chart-grid") && grid.querySelector(":scope > .custom-generated-section-heading")) {
    return grid.querySelector(":scope > .custom-generated-section-heading h2");
  }
  const host = grid.matches(".country-charts")
    ? grid
    : grid.closest(".thailand-chart-section, .overview-country-group, .overview-chart-section, .tire-chart-section, .futures-product-group") || grid.parentElement;
  let heading = host?.querySelector(":scope > .thailand-section-heading, :scope > .overview-section-heading, :scope > .overview-country-group-header, :scope > .futures-section-heading, :scope > .futures-product-group-header, :scope > .custom-generated-section-heading");
  if (!heading && grid.matches(".country-charts")) {
    heading = document.createElement("header");
    heading.className = "custom-generated-section-heading";
    heading.dataset.exportUi = "false";
    heading.innerHTML = "<h2>折线图</h2><span>SEASONAL LINE / YOY BAR</span>";
    grid.prepend(heading);
  }
  return heading?.querySelector("h2, h3") || null;
}

function customSectionKey(grid, index) {
  if (grid.dataset.customSectionKey) return grid.dataset.customSectionKey;
  const host = grid.matches(".country-charts") ? grid : grid.parentElement;
  const source = grid.dataset.sectionSource || host?.dataset.sectionId || host?.dataset.countryKey || host?.getAttribute("aria-label") || "";
  return source ? `section:${source}` : `section:group-${index}`;
}

function customSectionOverride(extension, key) {
    return extension?.sectionOverrides?.find(section => section.key === key) || null;
  }

function customCreateInsertedCard(chart, sectionKey, index, editing) {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = customChartCardMarkup(chart, sectionKey, index, false, false);
  const card = wrapper.firstElementChild;
  card.dataset.customInserted = "true";
  card.dataset.customEditKey = `custom:${chart.id}`;
  card.classList.toggle("is-direct-editable", false);
  return card;
}

async function customRenderInsertedCard(card, chart, sectionKey) {
  const version = JSON.stringify(chart);
  if (card.dataset.definitionKey === version && (card.dataset.ready === "true" || card.dataset.loading === "true")) return;
  card.dataset.definitionKey = version;
  if (!Object.keys(chart.bindings || {}).length || !String(chart.expression || "").trim()) return;
  card.dataset.loading = "true";
  try {
    const payload = await customPreview(chart);
    previewCache.set(`${sectionKey}/${chart.id}`, payload);
    customRenderChart(card, payload);
  } catch (error) {
    const loading = card.querySelector(".custom-chart-loading");
    if (loading) loading.textContent = error.message;
    card.classList.add("has-error");
  } finally {
    card.dataset.loading = "false";
  }
}

function customApplyEditableSections(route, extension, editing) {
  const grids = customEditableGrids();
  grids.forEach((grid, sectionIndex) => {
    const key = customSectionKey(grid, sectionIndex);
    grid.dataset.customSectionKey = key;
    grid.classList.add("custom-managed-chart-grid");
    const titleNode = customSectionTitleNode(grid);
    const originalTitle = titleNode?.dataset.customOriginalTitle || titleNode?.textContent?.trim() || `折线图 ${sectionIndex + 1}`;
    if (titleNode && !titleNode.dataset.customOriginalTitle) titleNode.dataset.customOriginalTitle = originalTitle;
    const section = customSectionOverride(extension, key, sectionIndex, originalTitle, false);
    if (titleNode) {
      const wanted = section?.title || originalTitle;
      if (titleNode.textContent.trim() !== wanted) titleNode.textContent = wanted;
      titleNode.contentEditable = "false";
      titleNode.spellcheck = false;
      titleNode.toggleAttribute("data-direct-section-title", false);
      
      titleNode.classList.toggle("is-direct-editable", false);
      const heading = titleNode.parentElement;
      heading.querySelector('.custom-section-move')?.remove();
    }

    const configuredCharts = section?.charts || [];
    grid.querySelectorAll(":scope > [data-custom-inserted='true']").forEach((card) => {
      if (!configuredCharts.some((chart) => chart.id === card.dataset.customChartId)) card.remove();
    });
    configuredCharts.forEach((chart, chartIndex) => {
      let card = grid.querySelector(`:scope > [data-custom-inserted='true'][data-custom-chart-id="${CSS.escape(chart.id)}"]`);
      if (!card) {
        card = customCreateInsertedCard(chart, key, chartIndex, false);
        grid.appendChild(card);
      }
      card.classList.toggle("overview-chart-card", grid.matches(".overview-charts"));
      card.classList.toggle("is-direct-editable", false);
      const chartTitle = card.querySelector("h2");
      if (chartTitle) {
        chartTitle.contentEditable = "false";
        chartTitle.toggleAttribute("data-direct-chart-title", false);
      }
      customRenderInsertedCard(card, chart, key);
    });

    const cards = [...grid.children].filter((card) => (card.matches?.(CUSTOM_BUILTIN_CHART_SELECTOR) || card.dataset.customInserted) && !card.classList.contains("custom-override-render-card"));
    cards.forEach((card, index) => {
      if (!card.dataset.customEditKey) card.dataset.customEditKey = card.dataset.customInserted ? `custom:${card.dataset.customChartId}` : customChartKey(card, index);
      card.dataset.customSectionKey = key;
      if (!card.dataset.customInserted) window.dashboardEditableChartSetSectionV2?.(card, key);
    });
    const requested = section?.chartOrder || [];
    const byKey = new Map(cards.map((card) => [card.dataset.customEditKey, card]));
    const orderedKeys = [...requested, ...cards.map((card) => card.dataset.customEditKey)].filter((item, index, list) => list.indexOf(item) === index && byKey.has(item));
    const currentKeys = cards.map((card) => card.dataset.customEditKey);
    if (orderedKeys.some((item, index) => item !== currentKeys[index])) {
      orderedKeys.forEach((chartKey) => grid.appendChild(byKey.get(chartKey)));
    }

    
    
    

    let add = grid.querySelector(":scope > .custom-add-chart-card");
    {
      add?.remove();
    }
  });
}

function customRenderExtension(route) {
  if(route.routeKey==='futures_position_rank')return;
  customEnsurePageEditButton(route.routeKey);
  const stored = pageExtensions.find((item) => item.route === route.routeKey) || null;
  const editing = void 0 === route.routeKey;
  const extension = stored;
  customApplyPageTitle(route, extension, false);
  customApplyEditableSections(route, extension, false);
  customApplyBuiltInCharts(route, extension, false);
  const sections=extension?.sections || [];
  document.querySelectorAll('.custom-page-extension-host').forEach(host=>{
    if (!sections.some(section=>section.id===host.dataset.extensionSectionId)) host.remove();
  });
  const insertion=customExtensionInsertionPoint();
  const natives=customBuiltinSectionGroups();
  // Additional sections belong to the final chart zone, not to a separate
  // append-only list. Non-chart business modules keep their existing slots.
  const parent=natives.at(-1)?.host.parentElement || insertion?.parent;
  const token=renderToken;
  sections.forEach(section=>{
    let host=[...document.querySelectorAll('.custom-page-extension-host')].find(node=>node.dataset.extensionSectionId===section.id);
    if (!host && parent) {
      host=document.createElement('div');
      host.className='custom-page-extension-host';
      host.dataset.extensionSectionId=section.id;
      parent.insertBefore(host,parent===insertion?.parent?insertion.before:null);
    }
    if (!host) return;
    const key=customExtraRenderKey(section,false);
    if (host.dataset.renderKey!==key) {
      host.dataset.renderKey=key;
      host.innerHTML=customExtensionSectionsMarkup({sections:[section]},false,false);
      customLoadPageCharts(host,{sections:[section]},token,{allowBlank:false});
    }
    
  });
  let controls=document.querySelector('.custom-extension-controls');
  controls?.remove();
  customApplySectionOrder(extension);
}

function customExtraRenderKey(section) { return JSON.stringify(section); }

function customBuiltinSectionGroups() {
  return customEditableGrids().map((grid, index) => {
    const key = customSectionKey(grid, index);
    grid.dataset.customSectionKey = key;
    const host = grid.matches('.country-charts, .custom-runtime-chart-grid') ? grid :
      grid.closest('.thailand-chart-section, .overview-country-group, .overview-chart-section, .tire-chart-section, .futures-product-group');
    if (host && !host.dataset.customOriginalGroupIndex) host.dataset.customOriginalGroupIndex = String(index + 1);
    return {key, host, defaultIndex:Number(host?.dataset.customOriginalGroupIndex || index+1)};
  }).filter(item => item.host);
}

function customApplySectionOrder(extension) {
  const groups = customAllSectionGroups(extension);
  const parents = new Set(groups.map(item => item.host.parentElement));
  parents.forEach(parent => {
    const siblings = groups.filter(item => item.host.parentElement === parent);
    customPlaceGroupNodes(siblings,orderedGroups(siblings,extension?.sectionOrder || []));
  });
  customUpdateGroupButtons(groups);
}

function customAllSectionGroups(extension=null) {
  const groups=customBuiltinSectionGroups();
  document.querySelectorAll('.custom-page-extension-host[data-extension-section-id]').forEach(host=>{
    const key=host.dataset.extensionSectionId;
    groups.push({key,host,defaultIndex:10000+(extension?.sections || []).findIndex(section=>section.id===key)});
  });
  return groups.sort((a,b)=>a.host.compareDocumentPosition(b.host)&Node.DOCUMENT_POSITION_FOLLOWING?-1:1);
}

function customPlaceGroupNodes(current,ordered) {
  if (ordered.every((group,index)=>group===current[index])) return;
  const slots=current.map(group=>{const slot=document.createComment('chart-section-slot');group.host.before(slot);return slot;});
  ordered.forEach((group,index)=>slots[index].replaceWith(group.host));
}

function customUpdateGroupButtons() {}

function customPreviewSummary(payload) {
  if (payload.cache?.state === 'pending') return '首次计算中，完成后自动显示';
  if (payload.cache?.state === 'updating') return '更新中，暂时显示上一成功结果';
  if (payload.cache?.state === 'failed') return '更新失败：' + (payload.cache.error || '请稍后重新计算');
  const points = payload.points || [];
  const valid = points.filter(point => point.value !== null && Number.isFinite(point.value)).length;
  const period = payload.frequency === "monthly" ? "个月" : "个日期";
  if (valid) return `校验通过，${valid} ${period}有有效数值` + (points.length > valid ? `；${points.length - valid} ${period}缺失，保留断点` : "");
  const empty = Object.entries(payload.bindings || {}).filter(([, metric]) => metric.validCount === 0 || (points.length && metric.missingCommonCount === points.length));
  if (empty.length) return "无法绘制：" + empty.map(([alias, metric]) => `${alias}（${metric.label}）`).join("、") + "在所选范围或共同月份内没有有效数值；缺失不补零。";
  return points.length ? "无法绘制：公式结果全部为空，请检查缺失值或除数是否为零。" : "无法绘制：所选指标在该时间范围内没有共同数据，请调整时间范围或指标。";
}

function customChartEditorMarkup() { return ''; }

function customEditorMarkup() { return ''; }

const customChartDetails = new WeakMap();

let customDetailAnchor = null;

let customDetailPopup = null;

let customDetailHideTimer = null;

function customHideChartDetails() {
  clearTimeout(customDetailHideTimer);
  customDetailAnchor?.removeAttribute('aria-describedby');
  customDetailAnchor = null;
  if (customDetailPopup) customDetailPopup.hidden = true;
}

function customShowChartDetails(header) {
  if (!header) return;
  clearTimeout(customDetailHideTimer);
  const card = header.closest('.custom-chart-card');
  const payload = customChartDetails.get(card);
  if (!customDetailPopup) {
    customDetailPopup = document.createElement('div');
    customDetailPopup.id = 'custom-chart-details-popup';
    customDetailPopup.className = 'custom-chart-details-popup';
    customDetailPopup.setAttribute('role', 'tooltip');
    customDetailPopup.dataset.exportUi = 'true';
    document.body.appendChild(customDetailPopup);
  }
  customDetailAnchor?.removeAttribute('aria-describedby');
  customDetailAnchor = header;
  header.setAttribute('aria-describedby', customDetailPopup.id);
  const title = header.querySelector('h2')?.textContent?.trim() || '未命名折线图';
  const model = chartTooltipModel(payload || {}, title, header.dataset.chartExpression || '');
  if(payload?.template==='monthly-trend') {
    model.formula.text='连续月份，各条折线独立展示；不按年份叠加、不计算合计或同比柱。';
    model.formula.raw=payload.lines.map(l=>l.label+'：'+(l.transform==='complement'?(l.unit==='比值'?'1−原指标':'100−显示值'):'原指标')+'，'+(l.axis==='right'?'右轴':'左轴')).join('；');
    model.notes=payload.lines.flatMap(l=>[
      ...(l.note?[l.label+'：'+l.note]:[]),
      ...(l.factor===100?[l.label+'：历史小数占比已转换为百分数点（0.5＝50%），不改变原指标。']:[]),
      ...(l.mean?[l.label+'：虚线为当前所选范围内有效月份的算术均值；缺失月不补零。']:[]),
      ...Object.values(l.result.bindings||{}).flatMap(m=>[...(!l.note?[m.description]:[]),...(m.coverage||[]).map(c=>`${c.startMonth} 至 ${c.endMonth}：${c.note}`)]).filter(Boolean).map(n=>l.label+'：'+n)
    ]);
    if(payload.annotations.length)model.notes.push('区间阴影与虚线框为手动标注，不代表系统自动识别的阶段。');
  }
  const metricItems = model.metrics.length
    ? model.metrics.map(metric => '<li><span class="custom-tooltip-alias">' + customEscape(metric.alias) + '</span><span><strong>' + customEscape(metric.label) + '</strong>' + (metric.unit ? '<small>' + customEscape(metric.unit) + '</small>' : '') + '</span></li>').join('')
    : '<li class="custom-tooltip-muted">尚未绑定指标</li>';
  const policyNotes = model.notes.filter(note => !/^\d{4}-\d{2}/.test(note));
  const coverageNotes = model.notes.filter(note => /^\d{4}-\d{2}/.test(note));
  const noteSection = (heading, notes) => notes.length
    ? '<section class="custom-tooltip-section"><h3>' + heading + '</h3><ul class="custom-tooltip-notes">' + notes.map(note => '<li>' + customEscape(note) + '</li>').join('') + '</ul></section>'
    : '';
  const noteItems = noteSection('主要口径', policyNotes) + noteSection('缺失范围', coverageNotes);
  const technicalRows = [
    ['原始公式', model.formula.raw || '未设置'],
    ['频率', model.frequency || '未识别'],
    ['计算时间', model.technical.computedAt || '尚未完成'],
    ['源版本', model.technical.sourceVersion ? model.technical.sourceVersion.slice(0, 16) : '待校验'],
    ...(model.technical.cacheKey ? [['缓存键', model.technical.cacheKey]] : []),
    ...(model.technical.missingPolicy ? [['缺失处理', model.technical.missingPolicy]] : []),
    ...(model.technical.error ? [['更新提示', model.technical.error]] : []),
    ...model.metrics.map(metric => {
      const description = String(payload?.bindings?.[metric.alias]?.description || '').trim();
      return description ? [metric.alias + ' 原始说明', description] : null;
    }).filter(Boolean),
    ...(payload?.sharedDefinitions || []).map(metric => ['派生指标 ' + (metric.revision ? 'v' + metric.revision : ''), (metric.label || '未命名') + (metric.expression ? '：' + metric.expression : '')]),
  ];
  customDetailPopup.innerHTML = '<div class="custom-tooltip-heading"><strong>图表口径</strong><span class="custom-tooltip-status">' + customEscape(model.status) + '</span></div>' +
    '<p class="custom-tooltip-title">' + customEscape(model.title) + '</p>' +
    '<section class="custom-tooltip-section"><h3>指标</h3><ul class="custom-tooltip-metrics">' + metricItems + '</ul></section>' +
    '<section class="custom-tooltip-section"><h3>计算口径</h3><p class="custom-tooltip-formula">' + customEscape(model.formula.text) + '</p></section>' +
    '<dl class="custom-tooltip-summary"><div><dt>数据范围</dt><dd>' + customEscape(model.range + (model.frequency ? '（' + model.frequency + '）' : '')) + '</dd></div></dl>' +
    noteItems +
    '<details class="custom-tooltip-technical"><summary>完整计算信息</summary><dl>' + technicalRows.map(([label, value]) => '<div><dt>' + customEscape(label) + '</dt><dd>' + customEscape(value) + '</dd></div>').join('') + '</dl></details>';
  customDetailPopup.hidden = false;
  const rect = header.getBoundingClientRect();
  const width = customDetailPopup.offsetWidth, height = customDetailPopup.offsetHeight;
  customDetailPopup.style.left = Math.max(12, Math.min(rect.left, innerWidth - width - 12)) + 'px';
  customDetailPopup.style.top = Math.max(12, Math.min(rect.bottom, innerHeight - height - 12)) + 'px';
}

document.addEventListener('pointerover', event => {
  if (event.target.closest?.('.custom-chart-details-popup')) { clearTimeout(customDetailHideTimer); return; }
  const header = event.target.closest?.('.custom-chart-header');
  if (header && header !== customDetailAnchor) customShowChartDetails(header);
  else if (header) clearTimeout(customDetailHideTimer);
});

document.addEventListener('pointerout', event => {
  if (!event.target.closest?.('.custom-chart-header, .custom-chart-details-popup')) return;
  if (event.relatedTarget?.closest?.('.custom-chart-header, .custom-chart-details-popup')) return;
  customDetailHideTimer = setTimeout(customHideChartDetails, 150);
});

document.addEventListener('focusin', event => customShowChartDetails(event.target.closest?.('.custom-chart-header')));

document.addEventListener('focusout', event => {
  if (event.target.closest?.('.custom-chart-header') && !event.relatedTarget?.closest?.('.custom-chart-header')) customHideChartDetails();
});

document.addEventListener('pointerdown', event => {
  if (!event.target.closest?.('.custom-chart-header, .custom-chart-details-popup')) customHideChartDetails();
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') customHideChartDetails();
  else if (event.key === 'Enter') customShowChartDetails(event.target.closest?.('.custom-chart-header'));
});

document.addEventListener('scroll', event => {
  if (event.target.closest?.('.custom-chart-details-popup')) return;
  if (customDetailAnchor && document.activeElement === customDetailAnchor) customShowChartDetails(customDetailAnchor);
  else customHideChartDetails();
}, true);

window.addEventListener('resize', customHideChartDetails);

window.addEventListener('hashchange', customHideChartDetails);

function customRenderChart(card, payload) {
  if (!card || !payload) return;
  const previous = customChartDetails.get(card);
  if (previous?.cache?.computedAt && previous.cache.computedAt===payload.cache?.computedAt && previous.cache.key===payload.cache?.key && previous.cache.state===payload.cache?.state && previous.cache.sourceVersion===payload.cache?.sourceVersion && previous.cache.error===payload.cache?.error && JSON.stringify(previous._query)===JSON.stringify(payload._query)) return;
  if (!payload.points?.length && ['pending','updating','failed'].includes(payload.cache?.state) && previous?.points?.length && previous.cache?.key === payload.cache?.key) {
    payload = {...previous,_query:payload._query,cache:{...previous.cache,...payload.cache,sourceVersion:previous.cache?.sourceVersion,computedAt:previous.cache?.computedAt,state:payload.cache.state==='failed'?'failed':'updating'}};
  }
  customChartDetails.set(card, payload);
  
  
  if (payload.expression) card.querySelector('.custom-chart-header').dataset.chartExpression = payload.expression;
  card.dataset.seriesState = payload.cache?.state || 'ready';
  let badge = card.querySelector('.custom-series-state');
  if (!badge) {
    badge = document.createElement('span');
    badge.className = 'custom-series-state';
    badge.dataset.exportUi = 'true';
    card.querySelector('.country-chart-meta').appendChild(badge);
  }
  badge.textContent = ({pending:'计算中',updating:'更新中',failed:'更新失败'})[payload.cache?.state] || '';
  badge.title = payload.cache?.error || '悬停标题查看数据版本';
  if (!payload.points?.length && ['pending','updating'].includes(payload.cache?.state)) {
    card.querySelector("svg")?.replaceChildren();
    card.querySelector(".country-chart-legend")?.replaceChildren();
    let loading = card.querySelector('.custom-chart-loading');
    if (!loading) { loading = document.createElement('div'); loading.className = 'custom-chart-loading'; card.querySelector('.chart-stage').appendChild(loading); }
    loading.textContent = '首次计算中，完成后自动显示';
    return;
  }
  card.querySelector(".custom-chart-loading")?.remove();
  card.classList.remove('has-error');
  const unitNode = card.querySelector(".custom-chart-unit");
  if (unitNode) unitNode.textContent = `单位 / ${payload.unit || "—"}`;
  const yoyNode = card.querySelector(".custom-chart-yoy");
  if (yoyNode) yoyNode.hidden = payload.template === "monthly-trend" || payload.frequency === "daily";
  customChartDetails.set(card, payload);
  if (customDetailAnchor?.closest('.custom-chart-card') === card) customShowChartDetails(customDetailAnchor);
  card.querySelector(".custom-chart-empty")?.remove();
  const hasValues = (payload.points || []).some(point => point.value !== null && Number.isFinite(point.value));
  card.querySelector("svg").style.display = hasValues ? "" : "none";
  if (!hasValues) {
    card.querySelector(".country-chart-legend").replaceChildren();
    const empty = document.createElement("p");
    empty.className = "custom-chart-empty";
    empty.textContent = customPreviewSummary(payload);
    card.querySelector(".chart-stage").appendChild(empty);
    card.dataset.ready = "true";
    customMarkChartsReady(card);
    return;
  }
  const common = {
    svg: card.querySelector("svg"),
    stage: card.querySelector(".chart-stage"),
    tooltip: card.querySelector(".chart-tooltip"),
    legend: card.querySelector(".country-chart-legend"),
    series: payload.points || [],
    comparisonSeries: payload.comparisonPoints || [],
    tooltipUnit: payload.unit || "",
  };
  if (payload.template === 'monthly-trend') {
    renderMonthlyTrend({...common,payload});
  } else if (payload.frequency === "daily") {
    const size = customChartSize(card.dataset.chartSize);
    renderDailySeasonalChart({ ...common, ...chartTemplateOptions(payload,size) });
  } else {
    renderSeasonalChart(common);
  }
  card.dataset.ready = "true";
  customMarkChartsReady(card);
}

function customMarkChartsReady(card) {
  const host = card.closest('.custom-analysis-page-host, .custom-page-extension-host');
  if (host) {
    host.dataset.customReady = String([...host.querySelectorAll('.custom-chart-card')].every(c=>c.dataset.ready==='true'));
    if (host.dataset.customReady==='true' && host.dataset.seriesLoadStarted && !host.dataset.seriesLoadMs) host.dataset.seriesLoadMs = (performance.now()-Number(host.dataset.seriesLoadStarted)).toFixed(1);
  }
}

async function customPreview(chart, force = false) {
  return requestChartSeries(chart,force);
}

async function customLoadPageCharts(host, page, token, { allowBlank = false } = {}) {
  host.dataset.seriesLoadStarted = String(performance.now());
  delete host.dataset.seriesLoadMs;
  const tasks = (page.sections || []).flatMap((section) => (section.charts || []).map(async (chart) => {
    const key = `${section.id}/${chart.id}`;
    const existing = previewCache.get(key);
    const existingCard = host.querySelector(`[data-section-id="${CSS.escape(section.id)}"][data-custom-chart-id="${CSS.escape(chart.id)}"]`);
    if (existing?.points?.length && existingCard && !['千吨','kt'].includes(existing.unit) && existing._query?.unit === chart.unit) customRenderChart(existingCard,{...existing,_query:chart,cache:{...existing.cache,state:'updating'}});
    if (!Object.keys(chart.bindings || {}).length || !String(chart.expression || "").trim()) {
      const card = host.querySelector(`[data-section-id="${CSS.escape(section.id)}"][data-custom-chart-id="${CSS.escape(chart.id)}"]`);
      if (card && allowBlank) card.querySelector(".custom-chart-loading").textContent = "右键图表或使用下方编辑器选择指标";
      return;
    }
    try {
      const payload = await customPreview(chart);
      if (token !== renderToken) return;
      previewCache.set(key, payload);
      customRenderChart(host.querySelector(`[data-section-id="${CSS.escape(section.id)}"][data-custom-chart-id="${CSS.escape(chart.id)}"]`), payload);
    } catch (error) {
      if (token !== renderToken) return;
      const card = host.querySelector(`[data-section-id="${CSS.escape(section.id)}"][data-custom-chart-id="${CSS.escape(chart.id)}"]`);
      if (card) {
        let message=card.querySelector('.custom-chart-loading');
        if(!message){message=document.createElement('div');message.className='custom-chart-loading';card.querySelector('.chart-stage').appendChild(message);}
        message.textContent = error.message;
        card.classList.add("has-error");
      }
    }
  }));
  await Promise.all(tasks);
  if (token === renderToken) host.dataset.customReady = String([...host.querySelectorAll('.custom-chart-card')].every(c=>c.dataset.ready==='true'));
}

function customUpdatePageIntro(page) {
  const title = document.querySelector(".page-intro h1");
  const description = document.querySelector(".page-intro .page-description");
  if (title) title.textContent = page?.title || "自定义分析";
  const editing = false;
  if (title) {
    title.contentEditable = "false";
    title.spellcheck = false;
    title.toggleAttribute("data-direct-custom-page-title", false);
    title.classList.toggle("is-direct-editable", false);
  }
  if (description) description.textContent = page ? "直接读取已保存的指标计算结果，源数据变化后自动更新。" : "创建、组合并保存自己的 DuckDB 指标分析页面。";
}

function customEnsureCustomPageSavebar() {}

function customRender() {
  const route = customRoute();
  if (!route.active) {
    customRenderExtension(route);
    return;
  }
  const host = document.querySelector(".custom-analysis-page-host");
  if (!host) return;
  const storedPage = customPages.find((item) => item.id === route.pageId && !item.isDeleted) || null;
  const editing = false;
  const page = storedPage;
  // Structural edits explicitly invalidate the host. Typing must not cause the
  // mutation observer to recreate all inputs when search/preview updates the DOM.
  const renderKey = `${page?.id || route.pageId || "landing"}|${false}|${false}|${customPages.length}|${page?.updatedAt || ""}|${""}`;
  if (host.dataset.renderKey === renderKey) return;
  host.dataset.renderKey = renderKey;
  customUpdatePageIntro(page);
  host.innerHTML = page ? customPageMarkup(page, false) : customLandingMarkup();
  
  
  customEnsureCustomPageSavebar(false);
  const token = ++renderToken;
  if (page) customLoadPageCharts(host, page, token, { allowBlank: false });
}

let customRenderFrame=0;

function customScheduleRender() {
  if(customRenderFrame)return;
  customRenderFrame=window.requestAnimationFrame(()=>{customRenderFrame=0;customRender();});
}

window.addEventListener("hashchange", customScheduleRender);

window.addEventListener("resize", () => {
  document.querySelectorAll(".custom-chart-card[data-ready='true']").forEach((card) => {
    const sectionId = card.dataset.sectionId;
    const chartId = card.dataset.customChartId;
    const payload = previewCache.get(`${sectionId}/${chartId}`);
    if (payload) customRenderChart(card, payload);
  });
});

const customObserver = new MutationObserver(() => customScheduleRender());

customObserver.observe(document.querySelector("#app"), { childList: true, subtree: true });

async function customHydrateSavedBindings() {
  const ids=new Set();
  for (const p of [...customPages,...pageExtensions]) {
    const charts=[...(p.sections || []).flatMap(s=>s.charts || []),...(p.sectionOverrides || []).flatMap(s=>s.charts || []),...(p.chartOverrides || []).map(o=>o.chart).filter(Boolean)];
    charts.forEach(c=>Object.values(c.bindings || {}).forEach(id=>ids.add(id)));
  }
  const pending=[...ids].filter(id=>!customMetricById(id));
  for (let i=0;i<pending.length;i+=200) {
    const data=await customJson('/api/custom-metrics?ids='+encodeURIComponent(pending.slice(i,i+200).join(',')));
    customMetrics.push(...data.metrics);
  }
}

Promise.all([customReloadPages({ refreshShell: false }), customReloadExtensions()])
  .then(async () => {
    await customHydrateSavedBindings();
    if (typeof window.rubberDashboardRender === "function") window.rubberDashboardRender();
    customScheduleRender();
  })
  .catch((error) => {
    console.error(error);
    const host = document.querySelector(".custom-analysis-page-host");
    if (host) host.innerHTML = '<div class="data-error"><h2>自定义分析加载失败</h2><p>' + customEscape(error.message) + '</p></div>';
  });
