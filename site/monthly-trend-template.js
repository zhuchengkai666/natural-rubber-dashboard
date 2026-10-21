// Continuous calendar-month template. The data client still owns scalar caching.
export const TREND_TEMPLATE = 'monthly-trend';
const colors = ['#92989e', '#438bc4', '#c57934'];
const valid = v => v !== null && v !== undefined && Number.isFinite(v);
export const monthIndex = value => {const [y,m]=String(value).slice(0,7).split('-').map(Number); return y*12+m-1;};
const monthLabel = i => `${Math.floor(i/12)}-${String(i%12+1).padStart(2,'0')}`;
// Public chart data uses percentage points (50 means 50%).  Keep the
// legacy decimal-ratio spellings here only so an old saved chart can still
// be opened once and converted at the display boundary.
const legacyRatioUnits = new Set(['比值','比例','小数比值']);
const normalizedUnit = unit => (unit === '％' || legacyRatioUnits.has(unit)) ? '%' : unit;

export function trendQueries(chart) {
  const entries=Object.entries(chart.bindings || {});
  if (!entries.length || entries.length>3) throw Error('非季节性图请选择 1–3 个指标');
  for(const a of chart.annotations||[]) {
    if(a.type==='horizontal') {if(a.value===''||a.value==null||!Number.isFinite(Number(a.value)))throw Error('水平虚线请填写有效数值');}
    else {
      if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(a.start||''))throw Error('标注请选择开始月份');
      if(['shade','box'].includes(a.type)&&(!/^\d{4}-(0[1-9]|1[0-2])$/.test(a.end||'')||a.end<a.start))throw Error('标注结束月份无效或早于开始月份');
    }
  }
  return entries.map(([alias,id])=>({bindings:{[alias]:id},bindingFilters:{[alias]:chart.bindingFilters?.[alias]||{}},expression:alias,unit:'',startDate:chart.startDate,endDate:chart.endDate,template:'monthly'}));
}

export function combineTrend(chart, results) {
  const axes={}, bindings={};
  Object.keys(chart.bindings).forEach((alias,index)=>{
    const unit=normalizedUnit(results[index].unit||''),axis=chart.lineOptions?.[alias]?.axis||'left';
    if(!unit)return;
    if(axes[axis] && axes[axis]!==unit && !(axes[axis]==='%'&&unit==='%'))throw Error('同一坐标轴单位必须一致，请为不同单位选择第二坐标轴');
    axes[axis]=axes[axis]==='%'||unit==='%'?'%':unit;
  });
  const lines=Object.keys(chart.bindings).map((alias,index)=>{
    const result=results[index], opt=chart.lineOptions?.[alias]||{};
    if(result.frequency && result.frequency!=='monthly') throw Error('非季节性图只支持月度指标');
    const rawSourceUnit=result.unit||'', sourceUnit=normalizedUnit(rawSourceUnit), axis=opt.axis||'left',unit=axes[axis]||sourceUnit;
    const factor=legacyRatioUnits.has(rawSourceUnit)&&unit==='%'?100:1;
    if(opt.transform==='complement' && sourceUnit && sourceUnit!=='%') throw Error('互补变换仅适用于占比指标');
    const meta=result.bindings?.[alias]||{};
    const label=opt.label||meta.label||alias;
    bindings[alias]={...meta,label,unit};
    return {...opt,alias,label,axis,unit,sourceUnit,factor,color:colors[index],result,points:(result.points||[]).map(p=>{
      if(!valid(p.value))return {...p};
      const value=p.value*factor;
      return {...p,value:opt.transform==='complement'?100-value:value};
    })};
  });
  const byDate=new Map();
  lines.forEach(line=>line.points.forEach(p=>{if(!byDate.has(p.date)||!valid(byDate.get(p.date).value))byDate.set(p.date,p);}));
  const points=[...byDate.values()].sort((a,b)=>a.date.localeCompare(b.date));
  for(const a of chart.annotations||[])if(a.type==='horizontal'&&!lines.some(l=>l.axis===(a.axis||'left')))throw Error('水平虚线所属坐标轴没有指标');
  const states=results.map(r=>r.cache?.state||'ready');
  const state=['failed','pending','updating'].find(s=>states.includes(s))||'ready';
  return {ok:true,frequency:'monthly',template:TREND_TEMPLATE,lines,points,bindings,unit:Object.entries(axes).map(([a,u])=>(a==='right'?'右轴 ':'左轴 ')+u).join(' / '),
    startDate:points[0]?.date,endDate:points.at(-1)?.date,expression:'各指标独立绘制（不相加）',
    annotations:chart.annotations||[],_query:JSON.parse(JSON.stringify(chart)),
    cache:{state,key:results.map(r=>r.cache?.key||'').join('|'),computedAt:results.map(r=>r.cache?.computedAt||'').join(' / '),
      sourceVersion:results.map(r=>r.cache?.sourceVersion||'').join('|'),error:results.map(r=>r.cache?.error).filter(Boolean).join('；')}};
}

export function trendDomain(values) {
  const data=values.filter(valid);
  if(!data.length) return [0,1];
  const low=Math.min(...data), high=Math.max(...data), pad=(high-low||Math.abs(high)||1)*0.09;
  const rough=(high-low+pad*2)/5, magnitude=10**Math.floor(Math.log10(rough));
  const step=([1,2,5,10].find(n=>n*magnitude>=rough)||10)*magnitude;
  return [Math.floor((low-pad)/step)*step,Math.ceil((high+pad)/step)*step];
}

export function renderMonthlyTrend({svg,stage,tooltip,legend,payload}) {
  const W=1100,H=400,L=70,R=1030,T=27,B=343;
  svg.replaceChildren();legend.replaceChildren();
  svg.setAttribute('viewBox',`0 0 ${W} ${H}`);svg.setAttribute('role','img');
  svg.setAttribute('aria-label','连续月份折线图，支持左右坐标轴');
  // Use the same typography as SVG axis labels, without inherited 16px body text.
  legend.style.font='12px Arial, "Microsoft YaHei", sans-serif';
  legend.style.color='#637080';
  const add=(tag,attrs={},text='',parent=svg)=>{const n=document.createElementNS('http://www.w3.org/2000/svg',tag);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));if(text)n.textContent=text;parent.appendChild(n);return n;};
  const label=(x,y,text,anchor='middle',fill='#637080')=>add('text',{x,y,'text-anchor':anchor,fill,'font-size':12,'font-family':'Arial, Microsoft YaHei, sans-serif'},text);
  const lines=payload.lines, dates=payload.points.map(p=>monthIndex(p.date)).filter(Number.isFinite);
  if(!dates.length) return;
  const start=Math.min(...dates),end=Math.max(...dates),span=Math.max(1,end-start),step=(R-L)/span;
  const x=m=>L+(m-start)/span*(R-L);
  const domains={};
  for(const axis of ['left','right']) {
    const assigned=lines.filter(l=>l.axis===axis);if(!assigned.length)continue;
    const values=assigned.flatMap(l=>l.points.map(p=>p.value));
    values.push(...payload.annotations.filter(a=>a.type==='horizontal'&&a.axis===axis).map(a=>Number(a.value)));
    domains[axis]=trendDomain(values);
  }
  const y=(value,axis)=>{const [lo,hi]=domains[axis]||[0,1];return B-(value-lo)/(hi-lo)*(B-T);};
  const defs=add('defs'), clip=add('clipPath',{id:'trend-clip-'+(svg.dataset.clipId ||= Math.random().toString(36).slice(2))},'',defs);
  add('rect',{x:L,y:T,width:R-L,height:B-T},'',clip);
  const plot=add('g',{'clip-path':`url(#${clip.id})`});
  for(const a of payload.annotations.filter(a=>['shade','box'].includes(a.type))) {
    const left=x(monthIndex(a.start))-step/2,right=x(monthIndex(a.end))+step/2;
    add('rect',{x:left,y:T+2,width:Math.max(0,right-left),height:B-T-4,fill:a.type==='shade'?'#91a8bb':'none','fill-opacity':0.18,stroke:a.type==='box'?'#d9534f':'none','stroke-width':2,'stroke-dasharray':'8 5'},'',plot);
    if(a.label && right>=L && left<=R)label(Math.max(L+6,left+6),T+17,a.label,'start');
  }
  for(let i=0;i<=5;i++){
    const yy=T+(B-T)*i/5;
    add('line',{x1:L,x2:R,y1:yy,y2:yy,stroke:'#e7ebee'});
    for(const [axis,[lo,hi]] of Object.entries(domains)) {
      const unit=lines.find(l=>l.axis===axis)?.unit;
      label(axis==='left'?L-9:R+9,yy+4,(hi-(hi-lo)*i/5).toLocaleString('zh-CN',{maximumFractionDigits:2})+(unit==='%'?'%':''),axis==='left'?'end':'start');
    }
  }
  for(const axis of Object.keys(domains))label(axis==='left'?L:R,14,(axis==='left'?'左轴 ':'右轴 ')+(lines.find(l=>l.axis===axis)?.unit||''),axis==='left'?'start':'end');
  const tickStep=Math.max(1,Math.ceil((span+1)/24));
  for(let m=start;m<=end;m++){
    if((m-start)%tickStep===0)label(x(m),B+21,String(m%12+1));
    if(m%12===0 || m===start){add('line',{x1:x(m),x2:x(m),y1:T,y2:B,stroke:'#d4dce3','stroke-dasharray':'3 4'});label(x(m)+4,B+43,String(Math.floor(m/12)),'start');}
  }
  lines.forEach(line=>{
    let path='',last=null;
    for(const p of line.points){const m=monthIndex(p.date);if(!valid(p.value)){last=null;continue;}path+=(last!==null&&m===last+1?'L':'M')+x(m)+','+y(p.value,line.axis);last=m;}
    add('path',{d:path,fill:'none',stroke:line.color,'stroke-width':2.5,'stroke-dasharray':line.dashed?'7 4':''},'',plot);
    // Isolated observations must remain visible even when all neighbours are missing.
    for(const p of line.points.filter(p=>valid(p.value)))add('circle',{cx:x(monthIndex(p.date)),cy:y(p.value,line.axis),r:2,fill:line.color},'',plot);
    const values=line.points.map(p=>p.value).filter(valid);
    if(line.mean&&values.length){const mean=values.reduce((a,b)=>a+b,0)/values.length;add('line',{x1:L,x2:R,y1:y(mean,line.axis),y2:y(mean,line.axis),stroke:line.color,'stroke-width':1.7,'stroke-dasharray':'8 5'},'',plot);}
    const item=document.createElement('span');item.style.cssText='display:inline-flex;align-items:center;gap:5px;margin-right:18px;';
    const swatch=document.createElement('i');swatch.style.cssText=`width:24px;border-top:2px ${line.dashed?'dashed':'solid'} ${line.color}`;
    item.append(swatch,document.createTextNode(line.label+(line.axis==='right'?'（右轴）':'')+(line.mean?' · 虚线为区间均值':'')));legend.append(item);
  });
  for(const a of payload.annotations){
    if(a.type==='horizontal'){const yy=y(Number(a.value),a.axis||'left');add('line',{x1:L,x2:R,y1:yy,y2:yy,stroke:'#a35c47','stroke-dasharray':'7 5'},'',plot);if(a.label)label(R-5,yy-5,a.label,'end');}
    if(a.type==='vertical'){const xx=x(monthIndex(a.start));add('line',{x1:xx,x2:xx,y1:T,y2:B,stroke:'#a35c47','stroke-dasharray':'7 5'},'',plot);if(a.label&&xx>=L&&xx<=R)label(xx+5,T+17,a.label,'start');}
  }
  const cursor=add('line',{x1:L,x2:L,y1:T,y2:B,stroke:'#697786','stroke-dasharray':'3 3',visibility:'hidden'});
  add('rect',{x:L,y:T,width:R-L,height:B-T,fill:'transparent','pointer-events':'all'});
  tooltip.hidden=true;tooltip.style.display='none';
  svg.onpointermove=event=>{
    const point=svg.createSVGPoint();point.x=event.clientX;point.y=event.clientY;
    const local=point.matrixTransform(svg.getScreenCTM().inverse());
    if(local.x<L||local.x>R||local.y<T||local.y>B){svg.onpointerleave();return;}
    const month=Math.round(start+(local.x-L)/(R-L)*span), key=monthLabel(month);
    cursor.setAttribute('x1',x(month));cursor.setAttribute('x2',x(month));cursor.setAttribute('visibility','visible');
    tooltip.replaceChildren();const heading=document.createElement('strong');heading.textContent=key;tooltip.append(heading);
    lines.forEach(line=>{const p=line.points.find(p=>p.date.slice(0,7)===key);const row=document.createElement('div');row.textContent=`${line.label}：${valid(p?.value)?p.value.toLocaleString('zh-CN',{maximumFractionDigits:3})+' '+line.unit:'—（缺失）'}${line.axis==='right'?'（右轴）':''}`;tooltip.append(row);});
    tooltip.hidden=false;tooltip.style.display='block';const rect=stage.getBoundingClientRect();
    tooltip.style.left=Math.max(0,Math.min(event.clientX-rect.left+12,rect.width-tooltip.offsetWidth))+'px';tooltip.style.top=Math.max(0,event.clientY-rect.top-tooltip.offsetHeight-12)+'px';
  };
  svg.onpointerleave=()=>{cursor.setAttribute('visibility','hidden');tooltip.hidden=true;tooltip.style.display='none';};
}
