import test from 'node:test';
import assert from 'node:assert/strict';
import { matchesFilters } from '../src/listing-filters.js';

const house = {小区名称:'测试小区', 月租元:5000, '群卡或海报面积㎡':'90.00', 户型:'3室2厅'};
const routes = ['爱力中心','阿里巴巴西溪A区3号门'].map(目的地=>({小区名称:'测试小区',目的地,方式:{打车:{时间秒:600},地铁:{时间秒:1800},自行车:{时间秒:1200},步行:{时间秒:3600}}}));
test('ranges include boundaries, combine on one listing, and reject unknown values only when constrained',()=>{
  const f={rentMin:'5000',rentMax:'6000',areaMin:'80',areaMax:'90',rooms:'3'};
  assert.equal(matchesFilters(house,routes,f),true);
  assert.equal(matchesFilters({...house,月租元:4999},routes,f),false);
  assert.equal(matchesFilters({...house,'群卡或海报面积㎡':'不详'},routes,f),false);
  assert.equal(matchesFilters({...house,'群卡或海报面积㎡':'不详'},routes,{}),true);
  assert.equal(matchesFilters(house,routes,{rentMin:'6000',rentMax:'5000'}),false);
  assert.equal(matchesFilters({...house,户型:'4室2厅'},routes,{rooms:'4+'}),true);
});
test('both offices and all four modes enforce minute limits; unknown/unrecommended routes never pass',()=>{
  for(const mode of ['打车','地铁','自行车','步行']) {
    const minutes=routes[0].方式[mode].时间秒/60;
    const f={ailiMode:mode,ailiMax:String(minutes),aliMode:mode,aliMax:String(minutes)};
    assert.equal(matchesFilters(house,routes,f),true);
    assert.equal(matchesFilters(house,routes,{...f,aliMax:String(minutes-1)}),false);
    assert.equal(matchesFilters(house,routes.slice(0,1),f),false);
    assert.equal(matchesFilters(house,[{...routes[0],方式:{[mode]:{状态:'综合规划未推荐地铁'}}},routes[1]],f),false);
  }
  assert.equal(matchesFilters(house,[],{ailiMode:'地铁',ailiMax:''}),true);
});
