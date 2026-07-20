import {chromium} from 'playwright';
import {readJson, writeJson, weekId} from './lib/utils.js';
import {normalizeRaw, dedupe} from './lib/normalize.js';
import {scrapeStore} from './adapters/common.js';
import {spawnSync} from 'node:child_process';

const config=await readJson('config.json');
const only=process.argv.includes('--store') ? process.argv[process.argv.indexOf('--store')+1] : null;
const browser=await chromium.launch({headless:true});
const week=weekId(); const diagnostics={}; let all=[];
try{
  for(const [key,cfg] of Object.entries(config.stores)){
    if(!cfg.enabled || (only && only!==key)) continue;
    console.log(`Scraping ${cfg.name}…`);
    const result=await scrapeStore(browser,key,cfg,config.zip);
    const normalized=result.raw.map(x=>normalizeRaw(x,cfg.name,week)).filter(Boolean);
    diagnostics[key]={raw:result.raw.length,normalized:normalized.length,network:result.networkCount,embedded:result.embeddedCount,dom:result.domCount,finalUrl:result.finalUrl,error:result.error};
    all.push(...normalized);
    console.log(`${cfg.name}: ${normalized.length} normalized offers`);
  }
} finally {await browser.close();}
all=dedupe(all);
if(all.length < config.minimumTotalDeals){
  await writeJson(`diagnostics/failed-${week}.json`,{generatedAt:new Date().toISOString(),zip:config.zip,dealCount:all.length,diagnostics,deals:all});
  throw new Error(`Safety stop: only ${all.length} deals found; existing live data was not replaced. Review diagnostics and selectors.`);
}
await writeJson(`data/raw-${week}.json`,{generatedAt:new Date().toISOString(),zip:config.zip,diagnostics,deals:all});
const run=spawnSync(process.execPath,['scripts/rebuild.js',week],{stdio:'inherit'});
if(run.status!==0) process.exit(run.status||1);
