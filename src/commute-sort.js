export function sortCommunities(names, routes, { destination, mode, direction = 'asc' }) {
  if (!destination) return [...names];
  const duration = name => {
    const value = routes.find(r => r.小区名称 === name && r.目的地 === destination)?.方式?.[mode]?.时间秒;
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
  };
  return names.map((name, index) => ({ name, index, seconds: duration(name) }))
    .sort((a, b) => {
      if (a.seconds === null && b.seconds === null) return a.index - b.index;
      if (a.seconds === null) return 1;
      if (b.seconds === null) return -1;
      return (a.seconds - b.seconds) * (direction === 'desc' ? -1 : 1) || a.index - b.index;
    }).map(item => item.name);
}
