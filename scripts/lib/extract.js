import {clean} from './utils.js';

const objectCandidates=[];
function walk(value, depth=0){
  if(depth>9 || value==null) return;
  if(Array.isArray(value)){ for(const v of value) walk(v,depth+1); return; }
  if(typeof value!=='object') return;
  const keys=Object.keys(value).map(k=>k.toLowerCase());
  const hasName=keys.some(k=>/name|title|description|product/.test(k));
  const hasPrice=keys.some(k=>/price|amount|sale|offer/.test(k));
  if(hasName && hasPrice) objectCandidates.push(value);
  for(const v of Object.values(value)) walk(v,depth+1);
}
function first(obj, patterns){
  for(const [k,v] of Object.entries(obj||{})) if(patterns.some(p=>p.test(k)) && ['string','number'].includes(typeof v)) return v;
  return '';
}
export function extractJsonPayload(payload){
  objectCandidates.length=0; walk(payload);
  return objectCandidates.map(o=>({
    item:first(o,[/product.?name/i,/^name$/i,/title/i,/description/i]),
    brand:first(o,[/brand/i]), size:first(o,[/size/i,/package/i]),
    price:first(o,[/^price$/i,/sale.?price/i,/amount/i]),
    priceText:first(o,[/price.?text/i,/display.?price/i]),
    promo:first(o,[/promotion/i,/offer/i,/deal/i]),
    text:clean(JSON.stringify(o)).slice(0,500), confidence:'network'
  }));
}
export async function extractDom(page){
  return page.evaluate(()=>{
    const price=/\$\s*\d+(?:\.\d{1,2})?|\d+\s*\/\s*\$\s*\d+(?:\.\d{1,2})?/;
    const selectors=['[data-testid*="product"]','[data-testid*="offer"]','[class*="product-card"]','[class*="ProductCard"]','[class*="offer-card"]','[class*="deal-card"]','article','li'];
    const seen=new Set(), out=[];
    for(const sel of selectors){
      for(const el of document.querySelectorAll(sel)){
        const text=(el.innerText||'').replace(/\s+/g,' ').trim();
        if(text.length<10 || text.length>700 || !price.test(text)) continue;
        const key=text.slice(0,250); if(seen.has(key)) continue; seen.add(key);
        const lines=(el.innerText||'').split('\n').map(x=>x.trim()).filter(Boolean);
        const priceLine=lines.find(x=>price.test(x))||'';
        const title=lines.find(x=>x!==priceLine && x.length>2 && !/^add|shop|view|save$/i.test(x))||lines[0]||'';
        out.push({item:title,priceText:priceLine,text,confidence:'dom'});
      }
    }
    return out;
  });
}
