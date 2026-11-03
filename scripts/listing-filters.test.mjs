import test from 'node:test';
import assert from 'node:assert/strict';
import {matchesFilters,evaluateCommute,roomCounts,countFilters,filterError} from '../src/listing-filters.js';
const house={小区名称:'测试小区',月租元:5000,'群卡或海报面积㎡':'90.00',户型:'3室2厅',厨卫:'1厨2卫'};
const routes=['爱力中心','阿里巴巴西溪A区3号门'].map(目的地=>({小区名称:'测试小区',目的地,方式:{打车:{时间秒:600,距离米:4000},地铁:{时间秒:1800,距离米:7000},自行车:{时间秒:1200,距离米:3000},步行:{时间秒:3600,距离米:2800}}}));
const rule=(destination='爱力中心',mode='打车',max='10',metric='time',min='')=>({type:'rule',destination,mode,max,metric,min});
const group=(operator,...children)=>({type:'group',operator,children});
test('room counts preserve known zero and never infer an undisclosed kitchen',()=>{
 assert.deepEqual(roomCounts(house),{rooms:3,halls:2,kitchens:1,baths:2});
 assert.deepEqual(roomCounts({...house,户型:'1室0厅',厨卫:'1卫；厨房数量不详'}),{rooms:1,halls:0,kitchens:null,baths:1});
 assert.equal(matchesFilters({...house,厨卫:'1卫；厨房数量不详'},routes,{kitchensMin:'1'}),false);
 assert.equal(matchesFilters({...house,户型:'1室0厅'},routes,{hallsMax:'0'}),true);
});
test('all six ranges combine with AND on the same listing and include both bounds',()=>{
 const f={rentMin:'5000',rentMax:'6000',areaMin:'80',areaMax:'90',roomsMin:'2',roomsMax:'3',hallsMin:'2',hallsMax:'2',kitchensMin:'1',kitchensMax:'1',bathsMin:'2',bathsMax:'2'};
 assert.equal(matchesFilters(house,routes,f),true);
 for(const key of ['rent','area','rooms','halls','kitchens','baths'])assert.equal(matchesFilters(house,routes,{...f,[key+'Min']:'9999'}),false);
 assert.equal(matchesFilters({...house,'群卡或海报面积㎡':'不详'},routes,{areaMin:'0'}),false);
 assert.equal(matchesFilters({...house,'群卡或海报面积㎡':'不详'},routes,{}),true);
 assert.match(filterError({roomsMin:'4',roomsMax:'2'}),/下限/);
});
test('every mode at both destinations supports time and kilometre bounds, excluding unknown routes',()=>{
 for(const r of routes)for(const [mode,data] of Object.entries(r.方式))for(const metric of ['time','distance']){
  const value=metric==='time'?data.时间秒/60:data.距离米/1000;
  const node=rule(r.目的地,mode,String(value),metric,String(value));
  assert.equal(evaluateCommute(node,house.小区名称,routes),true);
  assert.equal(evaluateCommute({...node,max:String(value-.1)},house.小区名称,routes),false);
  assert.equal(evaluateCommute(node,house.小区名称,[]),false);
 }
});
test('nested groups implement parentheses, ignore inactive rules, and do not bypass housing bounds',()=>{
 const yes=rule(),no=rule('爱力中心','打车','5'),blank=rule('爱力中心','打车','');
 for(const left of [yes,no])for(const right of [yes,no]){
  assert.equal(evaluateCommute(group('or',left,right),house.小区名称,routes),left===yes||right===yes);
  assert.equal(evaluateCommute(group('and',left,right),house.小区名称,routes),left===yes&&right===yes);
 }
 const node=group('and',group('or',no,yes,blank),group('or',group('and',yes,no),yes));
 assert.equal(matchesFilters(house,routes,{commuteTree:node}),true);
 assert.equal(matchesFilters(house,routes,{commuteTree:node,rentMax:'4000'}),false);
 assert.equal(evaluateCommute(group('or',no,blank,group('and')),house.小区名称,routes),false);
 assert.equal(evaluateCommute(group('or',blank,group('and')),house.小区名称,routes),null);
 assert.equal(matchesFilters(house,routes,{commuteTree:group('or')}),true);
 assert.equal(countFilters({roomsMin:'2',roomsMax:'4',commuteTree:group('or',blank,yes)}),2);
 assert.match(filterError({commuteTree:rule('爱力中心','打车','5','time','10')}),/下限/);
});
