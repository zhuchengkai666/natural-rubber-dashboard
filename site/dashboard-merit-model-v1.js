// Independent interaction state; no dashboard data/configuration DB is used.
export const OUTBOX_LIMIT=5000;
export const BATCH_SIZE=20;
export function acknowledgedTotal(previous,incoming) {
  return Number.isSafeInteger(incoming)&&incoming>=0 ? Math.max(previous??0,incoming) : previous;
}
export function displayTotal(total,pending) {
  return total===null?'—':(total+pending).toLocaleString('zh-CN');
}
export function retryDelay(attempt,retryAfter=0) {
  return Math.min(3600000,Math.max(retryAfter*1000,Math.min(60000,2000*2**Math.min(attempt,5))));
}
export class MeritOutbox {
  constructor(indexedDB=globalThis.indexedDB) {this.idb=indexedDB;this.promise=null;}
  open() {
    if(!this.promise)this.promise=new Promise((resolve,reject)=>{
      if(!this.idb){reject(Error('浏览器不支持离线暂存'));return;}
      const request=this.idb.open('rubber-merit-outbox-v1',1);
      request.onupgradeneeded=()=>request.result.createObjectStore('events',{keyPath:'id'});
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });
    return this.promise;
  }
  async read() {
    const db=await this.open();return new Promise((resolve,reject)=>{
      const request=db.transaction('events').objectStore('events').getAll();
      request.onsuccess=()=>resolve(request.result.sort((a,b)=>a.createdAt-b.createdAt));
      request.onerror=()=>reject(request.error);
    });
  }
  async add(event) {
    const db=await this.open();return new Promise((resolve,reject)=>{
      const tx=db.transaction('events','readwrite'),store=tx.objectStore('events');
      const count=store.count();let full=false;
      count.onsuccess=()=>{if(count.result>=OUTBOX_LIMIT){full=true;tx.abort();}else store.add(event);};
      tx.oncomplete=()=>resolve();tx.onerror=tx.onabort=()=>reject(Error(full?'待同步点击已达上限，请先恢复联网':'点击暂存失败，请检查浏览器存储空间'));
    });
  }
  async remove(ids) {
    const db=await this.open();return new Promise((resolve,reject)=>{
      const tx=db.transaction('events','readwrite');
      for(const id of ids)tx.objectStore('events').delete(id);
      tx.oncomplete=resolve;tx.onerror=tx.onabort=()=>reject(tx.error);
    });
  }
}
