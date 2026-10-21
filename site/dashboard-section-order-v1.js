// Pure ordering rules, shared by UI adapters and regression tests.
export function orderedGroups(groups, requested = []) {
  const ranks = new Map(requested.map((key, index) => [key, index]));
  return [...groups].sort((a,b) => (ranks.get(a.key) ?? requested.length+a.defaultIndex) - (ranks.get(b.key) ?? requested.length+b.defaultIndex));
}

export function moveGroupKeys(keys, key, direction) {
  const result=[...keys], index=result.indexOf(key);
  if (index<0) return result;
  const target=direction==='top'?0:direction==='bottom'?result.length-1:index+(direction==='up'?-1:1);
  if (target<0 || target>=result.length || target===index) return result;
  result.splice(target,0,result.splice(index,1)[0]);
  return result;
}
