import path from 'node:path';
import fs from 'node:fs/promises';
import {extractJsonPayload, extractDom} from '../lib/extract.js';
import {sleep, root} from '../lib/utils.js';

export async function scrapeStore(browser, key, cfg, zip){
  const context=await browser.newContext({locale:'en-US',timezoneId:'America/New_York',viewport:{width:1440,height:1200}});
  const page=await context.newPage();
  const network=[];
  page.on('response',async res=>{
    const u=res.url();
    if(!/weekly|flyer|circular|offer|deal|product|promotion/i.test(u)) return;
    const ct=res.headers()['content-type']||'';
    if(!ct.includes('json')) return;
    try{ const data=await res.json(); network.push(...extractJsonPayload(data)); }catch{}
  });
  let error='';
  try{
    await page.goto(cfg.url,{waitUntil:'domcontentloaded',timeout:90000});
    await acceptCookies(page);
    await setLocation(page,zip);
    await progressiveScroll(page);
    await page.waitForTimeout(5000);
  }catch(e){ error=e.message; }
  const dom=await extractDom(page).catch(()=>[]);
  const diag=path.join(root,'diagnostics'); await fs.mkdir(diag,{recursive:true});
  await page.screenshot({path:path.join(diag,`${key}.png`),fullPage:true}).catch(()=>{});
  await fs.writeFile(path.join(diag,`${key}.html`),await page.content().catch(()=>''));
  await context.close();
  return {raw:[...network,...dom].map(x=>({...x,sourceUrl:cfg.url})),networkCount:network.length,domCount:dom.length,error};
}
async function acceptCookies(page){
  for(const label of [/accept/i,/agree/i,/allow all/i,/got it/i]){
    const b=page.getByRole('button',{name:label}).first();
    if(await b.isVisible({timeout:700}).catch(()=>false)){await b.click().catch(()=>{});break;}
  }
}
async function setLocation(page,zip){
  const candidates=[
    'input[placeholder*="ZIP" i]','input[aria-label*="ZIP" i]','input[name*="zip" i]',
    'input[placeholder*="location" i]','input[aria-label*="location" i]'
  ];
  for(const sel of candidates){
    const input=page.locator(sel).first();
    if(await input.isVisible({timeout:800}).catch(()=>false)){
      await input.fill(zip); await input.press('Enter'); await sleep(2500); return true;
    }
  }
  for(const name of [/store/i,/location/i,/pickup/i]){
    const b=page.getByRole('button',{name}).first();
    if(await b.isVisible({timeout:700}).catch(()=>false)){
      await b.click().catch(()=>{}); await sleep(1000);
      for(const sel of candidates){const input=page.locator(sel).first(); if(await input.isVisible({timeout:500}).catch(()=>false)){await input.fill(zip);await input.press('Enter');await sleep(2500);return true;}}
    }
  }
  return false;
}
async function progressiveScroll(page){
  for(let i=0;i<20;i++){
    await page.evaluate(()=>window.scrollBy(0,Math.max(700,innerHeight*.8)));
    await sleep(500);
    const more=page.getByRole('button',{name:/load more|show more|view more/i}).first();
    if(await more.isVisible({timeout:100}).catch(()=>false)) await more.click().catch(()=>{});
  }
  await page.evaluate(()=>window.scrollTo(0,0));
}
