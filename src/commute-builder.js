const destinations=['爱力中心','阿里巴巴西溪A区3号门'];
const labels=['爱力中心','阿里西溪 A 区3号门'];
const modes=[['打车','打车'],['地铁','地铁'],['自行车','骑行'],['步行','步行']];
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function createCommuteBuilder(container,onChange) {
  let serial=0,root;
  const rule=(destination=destinations[0],mode='打车',max='')=>({id:'rule'+(++serial),type:'rule',destination,mode,metric:'time',min:'',max});
  const group=(children=[],operator='and')=>({id:'group'+(++serial),type:'group',operator,children});
  const initial=()=>group([rule(),rule(destinations[1])]);
  root=initial();
  const find=(id,node=root)=>node.id===id?node:node.type==='group'?node.children.map(child=>find(id,child)).find(Boolean):null;
  const remove=(id,node=root)=>{if(node.type==='group'){node.children=node.children.filter(child=>child.id!==id);node.children.forEach(child=>remove(id,child));}};
  const option=(value,label,current)=>`<option value="${esc(value)}" ${value===current?'selected':''}>${esc(label)}</option>`;
  const draw=node=>{
    if(node.type==='group') return `<div class="logic-group" data-group="${node.id}"><div class="logic-group-head"><span class="group-mark">${node===root?'通勤规则':'条件组'}</span><select data-node="${node.id}" data-field="operator" aria-label="${node===root?'最外层':'子组'+node.id}组合逻辑">${option('and','AND · 全部满足',node.operator)}${option('or','OR · 任一满足',node.operator)}</select><div class="group-actions"><button type="button" data-builder-action="addRule" data-node="${node.id}">＋ 条件</button><button type="button" data-builder-action="addGroup" data-node="${node.id}">＋ 条件组</button>${node!==root?`<button type="button" class="remove-rule" data-builder-action="remove" data-node="${node.id}" aria-label="删除条件组">×</button>`:''}</div></div><div class="logic-children">${node.children.map(draw).join('')||'<p class="builder-empty">添加一个条件，开始比较通勤。</p>'}</div></div>`;
    const unit=node.metric==='distance'?'km':'分钟';
    return `<div class="commute-rule"><div class="rule-selects"><select data-node="${node.id}" data-field="destination" aria-label="${node.id}目的地">${destinations.map((d,i)=>option(d,labels[i],node.destination)).join('')}</select><select data-node="${node.id}" data-field="mode" aria-label="${node.id}出行方式">${modes.map(([m,l])=>option(m,l,node.mode)).join('')}</select><select data-node="${node.id}" data-field="metric" aria-label="${node.id}筛选指标">${option('time','耗时',node.metric)}${option('distance','距离',node.metric)}</select><button type="button" class="remove-rule" data-builder-action="remove" data-node="${node.id}" aria-label="删除通勤条件">×</button></div><div class="rule-range"><span>范围</span><input type="number" min="0" step="any" data-node="${node.id}" data-field="min" value="${esc(node.min)}" placeholder="不限下限" aria-label="${node.id}下限"><span>至</span><input type="number" min="0" step="any" data-node="${node.id}" data-field="max" value="${esc(node.max)}" placeholder="不限上限" aria-label="${node.id}上限"><span>${unit}</span></div></div>`;
  };
  const render=()=>{container.innerHTML=draw(root);};
  container.addEventListener('input',event=>{
    const {node:id,field}=event.target.dataset;
    if(!id||!field)return;
    find(id)[field]=event.target.value;
    if(field==='metric')render();
    onChange();
  });
  container.addEventListener('click',event=>{
    const button=event.target.closest('[data-builder-action]');if(!button)return;
    const {builderAction:action,node:id}=button.dataset;
    if(action==='remove')remove(id);
    else if(action==='addRule')find(id).children.push(rule());
    else if(action==='addGroup')find(id).children.push(group([rule()], 'or'));
    render();onChange();
  });
  const describe=node=>{
    if(node.type==='group'){
      const children=node.children.map(describe).filter(Boolean);
      return children.length>1?'('+children.join(node.operator==='or'?' OR ':' AND ')+')':children[0]||'';
    }
    if(node.min===''&&node.max==='')return '';
    const bounds=node.min!==''&&node.max!==''?`${node.min}–${node.max}`:node.min!==''?`≥${node.min}`:`≤${node.max}`;
    return `${labels[destinations.indexOf(node.destination)]} · ${modes.find(([m])=>m===node.mode)[1]} ${bounds}${node.metric==='distance'?'km':'分钟'}`;
  };
  render();
  return {get value(){return root;},get description(){return describe(root)||'尚未限制通勤；空白条件不参与判断。';},reset(){root=initial();render();},example(){root=group([group([rule(destinations[0],'打车','15'),rule(destinations[0],'自行车','20')],'or'),rule(destinations[1],'地铁','35')]);render();onChange();}};
}
