import path from 'node:path';
import fs from 'node:fs/promises';
import {extractJsonPayload, extractDom} from '../lib/extract.js';
import {sleep, root} from '../lib/utils.js';

export async function scrapeStore(browser, key, cfg, zip){
  const context=await browser.newContext({
    locale:'en-US',
    timezoneId:'America/New_York',
    viewport:{width:1440,height:1200},
    userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36'
  });
  const page=await context.newPage();
  const network=[];
  const responseLog=[];

  page.on('response',async res=>{
    const u=res.url();
    if(!/weekly|flyer|circular|offer|deal|product|promotion|special|coupon/i.test(u)) return;
    const ct=res.headers()['content-type']||'';
    responseLog.push({url:u,status:res.status(),contentType:ct});
    if(!/json|javascript/.test(ct)) return;
    try{
      const text=await res.text();
      if(!text || text.length>15_000_000) return;
      const data=JSON.parse(text);
      network.push(...extractJsonPayload(data));
    }catch{}
  });

  let error='';
  let finalUrl=cfg.url;
  try{
    await page.goto(cfg.url,{waitUntil:'domcontentloaded',timeout:90000});
    await acceptCookies(page);
    await setLocation(page,zip);
    await openWeeklyAd(page,key);
    await progressiveScroll(page);
    await page.waitForTimeout(5000);
    finalUrl=page.url();
  }catch(e){ error=e.message; }

  const dom=await extractDom(page).catch(()=>[]);
  const embedded=await extractEmbeddedJson(page).catch(()=>[]);
  const diag=path.join(root,'diagnostics');
  await fs.mkdir(diag,{recursive:true});
  await page.screenshot({path:path.join(diag,`${key}.png`),fullPage:true}).catch(()=>{});
  await fs.writeFile(path.join(diag,`${key}.html`),await page.content().catch(()=>''));
  await fs.writeFile(path.join(diag,`${key}-responses.json`),JSON.stringify(responseLog.slice(-500),null,2));
  await context.close();

  const sourceUrl=cfg.circularUrl||finalUrl||cfg.url;
  return {
    raw:[...network,...embedded,...dom].map(x=>({...x,sourceUrl})),
    networkCount:network.length,
    embeddedCount:embedded.length,
    domCount:dom.length,
    finalUrl,
    error
  };
}

async function acceptCookies(page){
  for(const label of [/accept all/i,/accept/i,/agree/i,/allow all/i,/got it/i,/continue/i]){
    const b=page.getByRole('button',{name:label}).first();
    if(await b.isVisible({timeout:700}).catch(()=>false)){
      await b.click().catch(()=>{});
      await sleep(700);
      break;
    }
  }
}

async function setLocation(page,zip){
  const candidates=[
    'input[placeholder*="ZIP" i]','input[aria-label*="ZIP" i]','input[name*="zip" i]',
    'input[placeholder*="location" i]','input[aria-label*="location" i]',
    'input[placeholder*="city" i]'
  ];
  for(const sel of candidates){
    const input=page.locator(sel).first();
    if(await input.isVisible({timeout:800}).catch(()=>false)){
      await input.fill(zip);
      await input.press('Enter');
      await sleep(3000);
      return true;
    }
  }
  for(const name of [/select.*store/i,/change.*store/i,/store locator/i,/location/i,/pickup/i]){
    const b=page.getByRole('button',{name}).first();
    if(await b.isVisible({timeout:700}).catch(()=>false)){
      await b.click().catch(()=>{});
      await sleep(1000);
      for(const sel of candidates){
        const input=page.locator(sel).first();
        if(await input.isVisible({timeout:500}).catch(()=>false)){
          await input.fill(zip);
          await input.press('Enter');
          await sleep(3000);
          return true;
        }
      }
    }
  }
  return false;
}

async function openWeeklyAd(page,key){
  if(key==='giant'){
    const link=page.getByRole('link',{name:/view weekly ad|weekly ad/i}).first();
    if(await link.isVisible({timeout:1500}).catch(()=>false)){
      await Promise.allSettled([page.waitForLoadState('domcontentloaded',{timeout:30000}),link.click()]);
      await sleep(2500);
    }
  }
}

async function extractEmbeddedJson(page){
  const payloads=await page.evaluate(()=>{
    const out=[];
    for(const s of document.querySelectorAll('script[type="application/ld+json"],script[type="application/json"],script#__NEXT_DATA__')){
      const text=s.textContent||'';
      if(text.length>5 && text.length<8_000_000) out.push(text);
    }
    return out;
  });
  const extracted=[];
  for(const text of payloads){
    try{extracted.push(...extractJsonPayload(JSON.parse(text)))}catch{}
  }
  return extracted;
}

async function progressiveScroll(page){
  let lastHeight=0;
  for(let i=0;i<28;i++){
    const height=await page.evaluate(()=>document.body.scrollHeight).catch(()=>0);
    await page.evaluate(()=>window.scrollBy(0,Math.max(800,innerHeight*.85)));
    await sleep(450);
    const more=page.getByRole('button',{name:/load more|show more|view more|see more/i}).first();
    if(await more.isVisible({timeout:100}).catch(()=>false)) await more.click().catch(()=>{});
    if(height===lastHeight && i>8) break;
    lastHeight=height;
  }
  await page.evaluate(()=>window.scrollTo(0,0));
}
