const numeric = value => value === '' || value == null ? null : Number(value);
export const rangeFields = [['rent','月租'],['area','面积'],['rooms','室'],['halls','厅'],['kitchens','厨'],['baths','卫']];
export function inRange(value, min, max) {
  const lower = numeric(min), upper = numeric(max);
  if (lower === null && upper === null) return true;
  const actual = numeric(value);
  return actual !== null && Number.isFinite(actual) && actual >= 0 &&
    (lower === null || actual >= lower) && (upper === null || actual <= upper);
}
export function roomCounts(house) {
  const text = `${house.户型 || ''} ${house.厨卫 || ''}`;
  return Object.fromEntries([['rooms','室'],['halls','厅'],['kitchens','厨'],['baths','卫']].map(([key,unit])=>{
    const match = text.match(new RegExp('(\\d+)'+unit));
    return [key,match ? Number(match[1]) : null];
  }));
}
// null means inactive. Empty groups and blank rules do not weaken an OR expression.
export function evaluateCommute(node, community, routes) {
  if (!node) return null;
  if (node.type === 'group') {
    const results = node.children.map(child=>evaluateCommute(child,community,routes)).filter(value=>value!==null);
    if (!results.length) return null;
    return node.operator === 'or' ? results.some(Boolean) : results.every(Boolean);
  }
  if (numeric(node.min) === null && numeric(node.max) === null) return null;
  const route = routes.find(r=>r.小区名称===community && r.目的地===node.destination);
  const mode = route?.方式?.[node.mode];
  const value = node.metric === 'distance' ? mode?.距离米 : mode?.时间秒;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return false;
  return inRange(value / (node.metric === 'distance' ? 1000 : 60),node.min,node.max);
}
export function countCommuteRules(node) {
  if (!node) return 0;
  return node.type==='group' ? node.children.reduce((n,child)=>n+countCommuteRules(child),0) : Number(numeric(node.min)!==null || numeric(node.max)!==null);
}
export function countFilters(filters) {
  return rangeFields.filter(([key])=>numeric(filters[key+'Min'])!==null || numeric(filters[key+'Max'])!==null).length + countCommuteRules(filters.commuteTree);
}
export function filterError(filters) {
  for (const [key,label] of rangeFields) {
    const min=numeric(filters[key+'Min']), max=numeric(filters[key+'Max']);
    if (min!==null && min<0 || max!==null && max<0) return `${label}范围不能为负数。`;
    if (min!==null && max!==null && min>max) return `${label}的下限不能大于上限。`;
  }
  const check=node=>{
    if (!node) return '';
    if (node.type==='group') return node.children.map(check).find(Boolean)||'';
    const min=numeric(node.min),max=numeric(node.max);
    if (min!==null&&min<0 || max!==null&&max<0) return '通勤范围不能为负数。';
    return min!==null&&max!==null&&min>max ? '通勤条件的下限不能大于上限。' : '';
  };
  return check(filters.commuteTree);
}
export function matchesFilters(house, routes, filters) {
  if (!inRange(house.月租元,filters.rentMin,filters.rentMax) || !inRange(house['群卡或海报面积㎡'],filters.areaMin,filters.areaMax)) return false;
  for (const [key,value] of Object.entries(roomCounts(house))) {
    if (!inRange(value,filters[key+'Min'],filters[key+'Max'])) return false;
  }
  return evaluateCommute(filters.commuteTree,house.小区名称,routes) !== false;
}
