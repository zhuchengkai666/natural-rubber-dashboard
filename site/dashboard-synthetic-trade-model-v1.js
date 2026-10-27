// Pure monthly table calculations. Missing observations are never interpreted as zero.
export function cnkrStats(series, cutoff) {
  const values = new Map((series?.values || []).map(p=>[p.month,p.value]));
  const at = month => Number.isFinite(values.get(month)) ? values.get(month) : null;
  const [year,month] = cutoff.split('-').map(Number);
  const prev = new Date(Date.UTC(year,month-2,1));
  const sum = y => {
    let total = 0;
    for(let m=1;m<=month;m++) {
      const value = at(`${y}-${String(m).padStart(2,'0')}`);
      if(value === null) return null;
      total += value;
    }
    return total;
  };
  const current=at(cutoff),prior=at(`${year-1}-${String(month).padStart(2,'0')}`);
  const previous=at(`${prev.getUTCFullYear()}-${String(prev.getUTCMonth()+1).padStart(2,'0')}`);
  const ytd=sum(year),priorYtd=sum(year-1);
  const rate=(a,b)=>a===null||b===null||b===0?null:a/b-1;
  return {current,prior,previous,ytd,priorYtd,yoy:rate(current,prior),ytdYoy:rate(ytd,priorYtd),mom:rate(current,previous)};
}

export function cnkrHeaders(cutoff) {
  const [year,month]=cutoff.split('-').map(Number);
  const prev=new Date(Date.UTC(year,month-2,1));
  return ['项目',`${year}/${month}`,`${year-1}/${month}`,`${prev.getUTCFullYear()}/${prev.getUTCMonth()+1}`,
    `${year}累计`,`${year-1}同期累计`,'同比','累计同比','环比'];
}
