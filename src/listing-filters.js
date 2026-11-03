const number = value => value === '' || value == null ? null : Number(value);

function inRange(value, min, max) {
  const lower = number(min), upper = number(max);
  if (lower === null && upper === null) return true;
  const actual = number(value);
  return actual !== null && Number.isFinite(actual) &&
    (lower === null || actual >= lower) && (upper === null || actual <= upper);
}

// Housing conditions must match the same listing; commute conditions match its community.
export function matchesFilters(house, routes, filters) {
  if (!inRange(house.月租元, filters.rentMin, filters.rentMax) ||
      !inRange(house['群卡或海报面积㎡'], filters.areaMin, filters.areaMax)) return false;
  if (filters.rooms) {
    const rooms = Number(String(house.户型).match(/^(\d+)室/)?.[1]);
    if (!Number.isFinite(rooms) || (filters.rooms === '4+' ? rooms < 4 : rooms !== Number(filters.rooms))) return false;
  }
  const commuteMatches = [];
  for (const [prefix, destination] of [['aili', '爱力中心'], ['ali', '阿里巴巴西溪A区3号门']]) {
    const max = number(filters[prefix + 'Max']);
    if (max === null) continue;
    const route = routes.find(r => r.小区名称 === house.小区名称 && r.目的地 === destination);
    const seconds = route?.方式?.[filters[prefix + 'Mode'] || '打车']?.时间秒;
    commuteMatches.push(typeof seconds === 'number' && Number.isFinite(seconds) && seconds >= 0 && seconds <= max * 60);
  }
  if (!commuteMatches.length) return true;
  return filters.commuteLogic === 'or' ? commuteMatches.some(Boolean) : commuteMatches.every(Boolean);
}
