import {readJson, writeJson, weekId} from './lib/utils.js';
import {dedupe, matchKey} from './lib/normalize.js';

const week=process.argv[2] || weekId();
const scraped=await readJson(`data/raw-${week}.json`);
const deals=dedupe(scraped.deals).sort((a,b)=>a.store.localeCompare(b.store)||a.category.localeCompare(b.category)||a.item.localeCompare(b.item));
const groups=new Map();
for(const d of deals){const k=matchKey(d);if(k.length<5)continue;const arr=groups.get(k)||[];arr.push(d);groups.set(k,arr)}
const comparisons=[];
for(const arr of groups.values()){
  const stores=new Set(arr.map(x=>x.store)); if(stores.size<2)continue;
  const best=[...arr].sort((a,b)=>a.price-b.price)[0];
  const row={item:best.item,category:best.category,match:'Likely exact',winner:best.store,note:'Automatically matched; verify package size before purchase.',weis:'',ht:'',giant:''};
  for(const d of arr){const val=`${d.display}${d.promo?` · ${d.promo}`:''}`;if(d.store==='Weis')row.weis=val;if(d.store==='Harris Teeter')row.ht=val;if(d.store==='Giant')row.giant=val}
  comparisons.push(row);
}
const config=await readJson('config.json');
const circulars=Object.values(config.stores).filter(x=>x.enabled).map(x=>({name:x.name,label:x.storeLabel||x.name,url:x.circularUrl||x.url,storeUrl:x.storeUrl||x.url}));
const output={meta:{source:"live-url",generatedAt:raw.generatedAt,week:`Week of ${week}`,weekId:week,zip:scraped.zip,stores:['Weis','Harris Teeter','Giant'],coverage:`Automated URL pull completed ${scraped.generatedAt}. Low-confidence matches require review.`,generatedAt:scraped.generatedAt,automated:true,dataSource:'Live retailer URLs',circulars,diagnostics:scraped.diagnostics},deals,comparisons};
await writeJson(`data/week-${week}.json`,output);
let manifest=await readJson('data/manifest.json');
manifest.weeks=manifest.weeks.filter(x=>x.id!==week);
manifest.weeks.unshift({id:week,label:`Week of ${week}`,file:`data/week-${week}.json`,status:'automated',dealCount:deals.length,comparisonCount:comparisons.length});
manifest.defaultWeek=week;
await writeJson('data/manifest.json',manifest);
console.log(`Built ${deals.length} deals and ${comparisons.length} comparisons for ${week}`);
