import {MeritOutbox,BATCH_SIZE,acknowledgedTotal,displayTotal,retryDelay} from './dashboard-merit-model-v1.js?v=20261026a';

const app=document.querySelector('#app');
const imageURL=new URL('./assets/merit-card.jpg',import.meta.url).href;
const configURL=new URL('./assets/merit-counter-config.json',import.meta.url).href;
const outbox=new MeritOutbox();
let config=null,total=null,pending=0,message='正在连接共享计数…',busy=false,reading=false;
let timer=null,retryTimer=null,attempt=0,notBefore=0,knownSidebar=null,knownNav=null;
const channel='BroadcastChannel' in window?new BroadcastChannel('rubber-merit-v1'):null;

function paint() {
  const widget=document.querySelector('.merit-widget');if(!widget)return;
  widget.querySelector('[data-merit-total]').textContent=displayTotal(total,pending);
  widget.dataset.pending=String(pending);
  widget.querySelector('[data-merit-click]').setAttribute('aria-label',`点击增加功德，已确认总数${total??'未读取'}，待同步${pending}次。${message}`);
}
async function refreshPending() {pending=(await outbox.read()).length;paint();}
async function request(path,options={}) {
  if(!config?.endpoint)throw Error('共享计数服务尚未配置');
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
  try {
    const response=await fetch(config.endpoint+path,{...options,cache:'no-store',credentials:'omit',signal:controller.signal});
    const result=await response.json();
    if(!response.ok||!result.ok){const error=Error(result.error==='rate_limit'?'点击较快，稍后自动同步':result.error==='daily_limit'?'今日计数额度已满，点击已暂存':'共享服务暂不可用，点击已暂存');error.retryAfter=Number(response.headers.get('Retry-After'))||0;throw error;}
    if(!Number.isSafeInteger(result.total)||result.total<0)throw Error('共享计数返回异常');
    return result;
  } finally {clearTimeout(timeout);}
}
async function syncTotal() {
  if(reading||busy||document.hidden||!navigator.onLine||!config?.endpoint)return;
  reading=true;
  try {const result=await request('/v1/count');total=acknowledgedTotal(total,result.total);await refreshPending();message=pending?`${pending}次待同步`:'所有用户共同累计';paint();}
  catch {message='暂未连接，点击将保存在本机';paint();}
  finally {reading=false;}
}
function scheduleRetry(error) {
  const delay=retryDelay(attempt++,error.retryAfter);
  notBefore=Date.now()+delay;
  clearTimeout(retryTimer);retryTimer=setTimeout(flush,delay);
}
async function flushUnlocked() {
  if(busy||document.hidden||!navigator.onLine||!config?.endpoint||Date.now()<notBefore)return;
  busy=true;
  try {
    while(!document.hidden&&navigator.onLine) {
      const batch=(await outbox.read()).slice(0,BATCH_SIZE);if(!batch.length)break;
      const ids=batch.map(item=>item.id);
      const result=await request('/v1/increment',{method:'POST',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify({events:ids})});
      if(!Array.isArray(result.ack)||result.ack.length!==ids.length||!ids.every(id=>result.ack.includes(id)))throw Error('确认信息异常，保留待同步点击');
      await outbox.remove(ids);
      total=acknowledgedTotal(total,result.total);attempt=0;notBefore=0;
      await refreshPending();message=pending?`${pending}次待同步`:'所有用户共同累计';paint();
      channel?.postMessage({type:'confirmed',total});
    }
  } catch(error){message=error.message||'暂未同步，点击已保存在本机';await refreshPending().catch(()=>{});paint();scheduleRetry(error);}
  finally {busy=false;}
}
async function flush() {
  if(navigator.locks)return navigator.locks.request('rubber-merit-flush-v1',{ifAvailable:true},lock=>lock?flushUnlocked():undefined);
  return flushUnlocked(); // server UUID dedup also protects older browsers/tabs
}
function animate(button) {
  button.classList.remove('merit-tap');void button.offsetWidth;button.classList.add('merit-tap');
  const plus=document.createElement('span');plus.className='merit-plus';plus.textContent='+1';plus.setAttribute('aria-hidden','true');
  button.append(plus);plus.addEventListener('animationend',()=>plus.remove(),{once:true});setTimeout(()=>plus.remove(),1300);
}
async function clicked(event) {
  const button=event.target.closest('[data-merit-click]');if(!button)return;
  try {
    await outbox.add({id:crypto.randomUUID(),createdAt:Date.now()});
    animate(button);await refreshPending();
    message=navigator.onLine?`${pending}次待同步`:`离线，${pending}次点击已暂存`;paint();
    channel?.postMessage({type:'pending'});
    // Coalesce rapid clicks into small idempotent batches; every UUID is +1.
    clearTimeout(timer);timer=setTimeout(()=>{flush();startPolling();},180);
  } catch(error){message=error.message;paint();}
}
function fit() {
  // Size follows the viewport, never the expanded menu. CSS reserves a fixed
  // bottom slot and lets only the navigation scroll above it.
  document.body.classList.add('has-merit-widget');
}
const resize=typeof ResizeObserver==='function'?new ResizeObserver(fit):null;
function mount() {
  const sidebar=app?.querySelector('.sidebar');if(!sidebar)return;
  sidebar.querySelector('.sidebar-bottom')?.remove(); // older published shells
  let widget=document.querySelector('.merit-widget');
  if(!widget){
    widget=document.createElement('section');widget.className='merit-widget';widget.setAttribute('aria-label','共享功德计数');
    widget.innerHTML='<p class="merit-heading">点击增加功德：<strong data-merit-total>—</strong></p><button class="merit-image-button" data-merit-click type="button"><img alt="点击增加功德" draggable="false"></button>';
    widget.querySelector('img').src=imageURL;document.body.append(widget);
  }
  if(sidebar!==knownSidebar){
    if(knownNav)resize?.unobserve(knownNav);if(knownSidebar)resize?.unobserve(knownSidebar);
    knownSidebar=sidebar;knownNav=sidebar.querySelector('.main-nav');
    resize?.observe(sidebar);if(knownNav)resize?.observe(knownNav);
    paint();
  }
  fit();
}
function startPolling() {
  clearTimeout(timer);timer=null;if(document.hidden)return;
  timer=setTimeout(async()=>{await flush();await syncTotal();startPolling();},config?.pollMs||30000);
}
document.addEventListener('click',clicked);
if(app)new MutationObserver(mount).observe(app,{childList:true});
window.addEventListener('resize',fit);
window.addEventListener('online',()=>{notBefore=0;flush();syncTotal();startPolling();});
document.addEventListener('visibilitychange',()=>{
  clearTimeout(timer);clearTimeout(retryTimer);
  if(!document.hidden){refreshPending().catch(()=>{});flush();syncTotal();startPolling();}
});
channel?.addEventListener('message',event=>{
  if(event.data?.type==='confirmed')total=acknowledgedTotal(total,event.data.total);
  refreshPending().catch(()=>{});
});
mount();
Promise.all([fetch(configURL,{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('配置读取失败');return r.json();}),refreshPending()]).then(async([value])=>{
  if(typeof value.endpoint!=='string'||(value.endpoint&&!/^https:\/\/[a-z0-9.-]+\.workers\.dev$/.test(value.endpoint)))throw Error('计数服务地址无效');
  config={endpoint:value.endpoint,pollMs:Math.max(30000,Number(value.pollMs)||30000)};
  if(!config.endpoint){message='共享计数服务尚未配置';paint();return;}
  await flush();await syncTotal();startPolling();
}).catch(error=>{message=error.message||'共享计数暂不可用';paint();});
