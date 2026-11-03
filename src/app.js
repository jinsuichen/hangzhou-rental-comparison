import { sortCommunities } from '/commute-sort.js';
import { matchesFilters } from '/listing-filters.js';
const dimensionValues=()=>Object.fromEntries(new FormData(document.getElementById('dimensionFilters')));
async function loadData() {
  const response = await fetch('/data/listings.json');
  if (!response.ok) throw new Error('房源数据加载失败，请刷新页面重试。');
  return response.json();
}
window.addEventListener('unhandledrejection', () => {
  document.getElementById('saveStatus').textContent = '页面加载失败，请检查网络后刷新重试。';
});

const data=await loadData(),houses=data.房源,routes=data.通勤,$=id=>document.getElementById(id);
const mobileQuery=window.matchMedia('(max-width:800px)');
$('filters').open=!mobileQuery.matches;
mobileQuery.addEventListener('change',e=>{$('filters').open=!e.matches});
const names=[...new Set(houses.map(h=>h.小区名称))];let mode='community',selected='全部小区';
let commuteSort={destination:'',mode:'打车',direction:'asc'};
const sortModes=[['打车','打车'],['地铁','地铁'],['自行车','骑行'],['步行','步行']];
const destinations=[['爱力中心','到爱力中心'],['阿里巴巴西溪A区3号门','到阿里西溪 A 区3号门']];
const key='rental-review-2026-11-03-excluded';let excluded=new Set();try{let a=JSON.parse(localStorage.getItem(key)||'[]');if(Array.isArray(a))excluded=new Set(a)}catch(e){$('saveStatus').textContent='浏览器存储不可用，排除标记仅本次有效。'}
const esc=s=>String(s??'不详').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function line(k,v){return `<div class="line"><span class="key">${esc(k)}</span><span class="${String(v??'不详').startsWith('不详')?'unknown':''}">${esc(v)}</span></div>`}
function details(title,keys,h){return `<details class="cell-details"><summary>${esc(title)}</summary>${keys.map(k=>line(k,h[k])).join('')}</details>`}
function sourceDetails(h){return `<details class="cell-details"><summary>来源与图片说明</summary>${line('来源',h.小程序来源)}<div class="line"><span class="key">来源链接</span><a class="source-url" href="${esc(h.来源链接)}" target="_blank" rel="noopener noreferrer">${esc(h.来源链接)}</a></div>${h.来源链接类型==='小区搜索'?'<div class="note">小区房源搜索；原房源链接不详。</div>':''}${line('图片说明',h.图片说明)}${line('状态',h.状态)}</details>`}
function showHouses(){mode='houses';render();$('housePanel').scrollIntoView({block:'start'});}
function filtered(){const q=$('search').value.toLowerCase(), dimensions=dimensionValues();return houses.filter(h=>matchesFilters(h,routes,dimensions)&&(!$('hideOff').checked||!h.状态.includes('已下架'))&&(!$('hideExcluded').checked||!excluded.has(h.编号))&&(!$('onlyNew').checked||h.编号.startsWith('N'))&&Object.entries(h).some(([k,v])=>k!=='image'&&String(v).toLowerCase().includes(q)))}
function sortDescription() {
  if (!commuteSort.destination) return '默认顺序';
  const label = sortModes.find(([key]) => key === commuteSort.mode)[1];
  return destinations.find(([key]) => key === commuteSort.destination)[1] + ' · ' + label + ' · ' + (commuteSort.direction === 'asc' ? '耗时从短到长' : '耗时从长到短');
}
function commuteHeader(destination, title) {
  const active = commuteSort.destination === destination;
  return `<th aria-sort="${active ? commuteSort.direction === 'asc' ? 'ascending' : 'descending' : 'none'}"><span>${esc(title)}</span><div class="sort-buttons" aria-label="${esc(title)}排序">` + sortModes.map(([key, label]) => {
    const pressed = active && commuteSort.mode === key;
    return `<button type="button" data-sort-destination="${esc(destination)}" data-sort-mode="${key}" aria-label="按${esc(title)}的${label}时间排序" aria-pressed="${pressed}">${label}${pressed ? commuteSort.direction === 'asc' ? ' ↑' : ' ↓' : ''}</button>`;
  }).join('') + '</div><small class="sort-hint">按耗时排序 · 再点反向</small></th>';
}
function mobileSortControls() {
  return `<details class="mobile-sort" ${commuteSort.destination ? 'open' : ''}><summary>通勤排序<span>${esc(sortDescription())}</span></summary><div class="mobile-sort-fields"><label>目的地<select id="sortDestination" aria-label="排序目的地"><option value="">默认顺序</option>` + destinations.map(([key, label]) => `<option value="${esc(key)}" ${commuteSort.destination === key ? 'selected' : ''}>${esc(label)}</option>`).join('') + `</select></label><label>出行方式<select id="sortMode" aria-label="排序出行方式">` + sortModes.map(([key, label]) => `<option value="${key}" ${commuteSort.mode === key ? 'selected' : ''}>${label}</option>`).join('') + `</select></label><button type="button" data-sort-direction ${commuteSort.destination ? '' : 'disabled'}>${commuteSort.direction === 'asc' ? '耗时从短到长 ↑' : '耗时从长到短 ↓'} · 点击反向</button></div></details>`;
}
function travel(name, dest) {
  const r = routes.find(r => r.小区名称 === name && r.目的地 === dest);
  if (!r) return '<span class="unknown">不详</span>';
  const metro = r.方式.地铁 || {};
  const bus = r.方式.公交参考;
  let html = '<div class="travel-grid">';
  for (const m of ['打车', '地铁', '自行车', '步行']) {
    const p = r.方式[m] || {};
    const noMetro = m === '地铁' && p.状态 === '综合规划未推荐地铁';
    const min = noMetro ? '不推荐' : p.时间秒 == null ? '不详' : (p.时间秒 / 60).toFixed(1) + '分钟';
    const km = noMetro ? '地铁距离、时间不详' : p.距离米 == null ? '距离不详' : (p.距离米 / 1000).toFixed(3) + ' km';
    html += `<div class="travel"><span class="mode">${m === '自行车' ? '骑行' : m}</span><div><b>${min}</b><small>${km}</small></div></div>`;
  }
  html += '</div>';
  if (bus) {
    html += `<div class="bus-reference"><span class="badge">公交参考${bus.含高峰线路 ? ' · 含高峰线路' : ''}</span><strong>${(bus.时间秒 / 60).toFixed(1)}分钟 · ${(bus.距离米 / 1000).toFixed(3)} km</strong><small>含接驳步行 ${(bus.步行接驳米 / 1000).toFixed(3)} km · 非地铁方案</small><small>高德复查 ${esc(bus.复查日期)}</small></div>`;
  }
  html += `<details class="cell-details"><summary>路线与定位依据</summary>${line('地铁', metro.路线 || metro.备注 || '不详')}`;
  if (bus) html += line('公交路线', bus.路线) + line('公交说明', bus.备注) + line('公交距离依据', bus.距离依据);
  if (metro.步行接驳米 != null) html += line('地铁接驳步行', metro.步行接驳米 + 'm');
  return html + line('小区起点', r.起点坐标) + line('目的地', r.终点坐标) + '</details>';
}
function houseTable(list){return `<div class="table-wrap"><table class="house-table"><thead><tr><th>房源 / 实景</th><th>户型与楼层</th><th>租金与费用</th><th>居住与设施</th><th>备注与更多信息</th></tr></thead><tbody>`+list.map(h=>`<tr class="${excluded.has(h.编号)?'excluded':''}"><td class="picture"><span class="house-id">${esc(h.编号)}</span><span class="source">${h.编号.startsWith('N')?'官网新增':'原群聊房源'}</span><label class="exclude"><input type="checkbox" data-exclude="${esc(h.编号)}" aria-label="排除${esc(h.编号)}" ${excluded.has(h.编号)?'checked':''}>排除这套</label><button class="photo-btn" data-photo="${esc(h.编号)}" aria-label="查看${esc(h.编号)}实景图"><img class="thumb" src="${h.image}" alt="${esc(h.编号)}原始截图" loading="lazy"></button>${`<a class="source" href="${esc(h.来源链接)}" target="_blank" rel="noopener noreferrer">${h.来源链接类型==='小区搜索'?'小区房源搜索 ↗':'房源原页 ↗'}</a>`}${h.来源链接类型==='小区搜索'?'<span class="note">原房源链接不详</span>':''}<span class="badge ${h.状态.includes('已下架')?'bad':''}">${h.状态.includes('已下架')?'已下架 / 成交':'采集时可打开'}</span></td><td data-label="户型与楼层"><strong>${esc(h.户型)}</strong><div class="note">${esc(h.厨卫)} · ${esc(h.出租方式)}</div>${line('面积',h['群卡或海报面积㎡']+'㎡')}${line('朝向',h.朝向)}${line('楼层',h.楼层)}${line('电梯',h.电梯)}${details('面积与楼层细节',['详情面积㎡','具体楼层'],h)}</td><td data-label="租金与费用"><div class="price">${esc(h.月租元)}<small> 元/月</small></div>${line('付款',h.付款方式)}${line('押金',h.押金元)}${line('物业',h.物业费)}${line('服务费',h.服务费)}${line('中介费',h.中介费)}${details('历史价格与其他费用',['群卡或海报月租元','其他固定费用'],h)}</td><td data-label="居住与设施">${line('入住',h.入住时间)}${line('租期',h.租期)}${line('宠物',h.允许养宠物)}${line('外卖上楼',h.外卖能否送上楼)}${line('浴霸',h.浴霸)}<div class="house-note">${esc(h.配套设施)}</div>${details('水电、采暖及看房',['水电类型','采暖','看房','燃气','网络','未配备设施'],h)}</td><td data-label="备注与更多信息"><div class="house-note">${esc(h.备注)}</div>${details('其他条件',['装修标准','退租转租条款','噪声隔音','采光','房源详细地址与楼栋'],h)}${sourceDetails(h)}</td></tr>`).join('')+'</tbody></table></div>'}
function render(){const dimensions=dimensionValues();const applied=Object.entries(dimensions).filter(([k,v])=>v!==''&&!k.endsWith('Mode')&&k!=='commuteLogic').length;$('dimensionCount').textContent=applied?'（'+applied+'项）':'';$('rangeError').textContent=dimensions.rentMin!==''&&dimensions.rentMax!==''&&Number(dimensions.rentMin)>Number(dimensions.rentMax)?'最低月租不能高于最高月租。':dimensions.areaMin!==''&&dimensions.areaMax!==''&&Number(dimensions.areaMin)>Number(dimensions.areaMax)?'最小面积不能大于最大面积。':'';const activeFilters=['hideOff','hideExcluded','onlyNew'].filter(id=>$(id).checked).length;$('filterSummary').textContent='筛选条件'+(activeFilters?'（'+activeFilters+'项）':'');const list=filtered(),shown=sortCommunities(names.filter(n=>list.some(h=>h.小区名称===n)),routes,commuteSort);$('communityCount').textContent=names.length;$('houseCount').textContent=houses.length;$('newCount').textContent=houses.filter(h=>h.编号.startsWith('N')).length;$('count').textContent=`${shown.length}个小区 · ${list.length}/${houses.length}套 · 已排除${excluded.size}套`;
$('communityPanel').hidden=mode!=='community';$('housePanel').hidden=mode!=='houses';$('communityTab').classList.toggle('active',mode==='community');$('houseTab').classList.toggle('active',mode==='houses');$('viewHelp').textContent=mode==='community'?'按小区比较通勤，通勤信息只在这里展示。点“查看房源”进入该小区，比较具体房子的价格与条件。':'房源按小区聚合，通勤请切换到“小区维度”。排除标记针对具体房源，可随时取消。';
$('communityPanel').innerHTML=mobileSortControls()+(!shown.length?'<div class="empty">没有匹配的小区</div>':`<div class="table-wrap"><table id="communities"><thead><tr><th>小区</th><th>房源数量</th><th>月租范围</th>${commuteHeader('爱力中心','到爱力中心')}${commuteHeader('阿里巴巴西溪A区3号门','到阿里西溪 A 区3号门')}<th>具体房源</th></tr></thead><tbody>`+shown.map(n=>{let hs=list.filter(h=>h.小区名称===n),rents=hs.map(h=>h.月租元),fresh=hs.filter(h=>h.编号.startsWith('N')).length;return `<tr><td><span class="community-name">${esc(n)}</span><div class="community-description">${esc(data.高德小区POI[n]?.[2]||'小区位置不详')}</div></td><td><b>${hs.length}</b> 套${fresh?`<span class="badge">官网新增 ${fresh}</span>`:''}<div class="note">${hs.filter(h=>h.状态.includes('已下架')).length}套已下架/成交</div></td><td><span class="price">${Math.min(...rents)}–${Math.max(...rents)}</span><div class="note">元/月 · 匹配房源</div></td><td data-label="到爱力中心">${travel(n,'爱力中心')}</td><td data-label="到阿里西溪 A 区3号门">${travel(n,'阿里巴巴西溪A区3号门')}</td><td class="actions"><button data-community="${esc(n)}">查看房源 →</button></td></tr>`}).join('')+'</tbody></table></div>');
const active=selected==='全部小区'?shown:shown.filter(n=>n===selected);$('housePanel').innerHTML=`<label class="community-picker">选择小区<select id="communitySelect" aria-label="选择小区">`+['全部小区',...shown].map(n=>`<option value="${esc(n)}" ${n===selected?'selected':''}>${esc(n)}（${n==='全部小区'?list.length:list.filter(h=>h.小区名称===n).length}套）</option>`).join('')+`</select></label><div class="house-view"><div>`+(active.length?active.map(n=>{let hs=list.filter(h=>h.小区名称===n);return `<section class="house-group"><div class="group-title"><h2>${esc(n)} <small class="muted">${hs.length}套</small></h2><button data-return>比较小区通勤</button></div>${houseTable(hs)}</section>`}).join(''):'<div class="empty">该小区没有匹配的房源</div>')+'</div></div>';
}
$('communityTab').onclick=()=>{mode='community';render()};$('houseTab').onclick=()=>{mode='houses';render()};for(const id of ['search','hideOff','hideExcluded','onlyNew'])$(id).addEventListener(id==='search'?'input':'change',render);
$('dimensionFilters').onsubmit=e=>e.preventDefault();
$('dimensionFilters').addEventListener('input',render);
$('clearDimensions').onclick=()=>{$('dimensionFilters').reset();render()};
$('reset').onclick=()=>{$('dimensionFilters').reset();$('search').value='';for(const id of ['hideOff','hideExcluded','onlyNew'])$(id).checked=false;selected='全部小区';commuteSort={destination:'',mode:'打车',direction:'asc'};render()};
document.addEventListener('click',e=>{const sortButton=e.target.closest('[data-sort-mode]');if(sortButton){const destination=sortButton.dataset.sortDestination,sortMode=sortButton.dataset.sortMode;commuteSort={destination,mode:sortMode,direction:commuteSort.destination===destination&&commuteSort.mode===sortMode&&commuteSort.direction==='asc'?'desc':'asc'};render();return}if(e.target.closest('[data-sort-direction]')){commuteSort.direction=commuteSort.direction==='asc'?'desc':'asc';render();return}const b=e.target.closest('[data-community]');if(b){selected=b.dataset.community;showHouses();return}if(e.target.closest('[data-return]')){mode='community';render();return}const photo=e.target.closest('[data-photo]');if(photo){const h=houses.find(h=>h.编号===photo.dataset.photo);$('phototitle').textContent=h.编号+' · '+h.小区名称+' · '+h.月租元+'元/月';$('fullimg').src=h.image;$('photo').showModal()}});
document.addEventListener('change',e=>{if(e.target.id==='sortDestination'){commuteSort.destination=e.target.value;commuteSort.direction='asc';render();return}if(e.target.id==='sortMode'){commuteSort.mode=e.target.value;if(!commuteSort.destination)commuteSort.destination='爱力中心';commuteSort.direction='asc';render();return}if(e.target.id==='communitySelect'){selected=e.target.value;showHouses();return}const id=e.target.dataset.exclude;if(!id)return;e.target.checked?excluded.add(id):excluded.delete(id);try{localStorage.setItem(key,JSON.stringify([...excluded]));$('saveStatus').textContent=''}catch(e){$('saveStatus').textContent='保存失败，标记仅本次有效。'}render()});
$('closephoto').onclick=()=>$('photo').close();$('photo').onclick=e=>{if(e.target===$('photo'))$('photo').close()};render();
