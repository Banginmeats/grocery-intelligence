import {clean, slug, money} from './utils.js';

const PRICE_PATTERNS = [
  /\$\s*(\d+(?:\.\d{1,2})?)/i,
  /(\d+)\s*\/\s*\$\s*(\d+(?:\.\d{1,2})?)/i,
  /(\d+(?:\.\d{1,2})?)\s*(?:¢|cents?)/i
];
export function parsePrice(text='') {
  const t=clean(text);
  const multi=t.match(PRICE_PATTERNS[1]);
  if(multi) return Number(multi[2])/Number(multi[1]);
  const cents=t.match(PRICE_PATTERNS[2]);
  if(cents) return Number(cents[1])/100;
  const dollar=t.match(PRICE_PATTERNS[0]);
  return dollar ? Number(dollar[1]) : null;
}
export function inferPromo(text='') {
  const t=clean(text).toLowerCase();
  if(/buy\s*one|get\s*one|bogo/.test(t)) return 'BOGO';
  if(/buy\s*\d+\s*get\s*\d+/.test(t)) return 'Multi-buy free';
  if(/digital|e-?vic|coupon/.test(t)) return 'Digital coupon';
  if(/\d+\s*\/\s*\$/.test(t)) return 'Multi-buy';
  return '';
}
export function inferCategory(text='') {
  const t=text.toLowerCase();
  const groups=[
    ['Meat & Seafood',/chicken|beef|steak|pork|turkey|shrimp|salmon|fish|bacon|sausage|crab/],
    ['Produce',/apple|banana|berry|berries|orange|lemon|lime|avocado|tomato|lettuce|potato|onion|corn|peach|melon|grape|cherry/],
    ['Dairy & Eggs',/milk|cheese|yogurt|egg|butter|cream/],
    ['Beverages',/coke|pepsi|soda|water|juice|tea|coffee|gatorade|drink/],
    ['Frozen',/frozen|ice cream|pizza/],
    ['Pantry',/pasta|sauce|cereal|rice|bread|chips|cracker|cookie|soup|beans|oil/],
    ['Household',/paper towel|toilet|detergent|cleaner|trash bag|foil/]
  ];
  return groups.find(([,re])=>re.test(t))?.[0] || 'Other';
}
export function normalizeRaw(raw, store, week) {
  const item=clean(raw.item || raw.title || raw.name || raw.description || '');
  const blob=clean([item,raw.priceText,raw.promo,raw.size,raw.text].filter(Boolean).join(' '));
  const price=Number.isFinite(raw.price) ? raw.price : parsePrice(raw.priceText || raw.text || blob);
  if(!item || item.length<3 || !price || price<=0 || price>999) return null;
  const promo=clean(raw.promo || inferPromo(blob));
  const size=clean(raw.size || '');
  return {
    id: slug(`${week}-${store}-${item}-${size}-${price}`).slice(0,120),
    store,
    item,
    brand: clean(raw.brand || ''),
    category: clean(raw.category || inferCategory(blob)),
    size,
    price,
    display: clean(raw.display || money(price)),
    promo,
    rating: 3,
    sourceUrl: raw.sourceUrl || '',
    confidence: raw.confidence || 'auto',
    rawText: clean(raw.text || blob).slice(0,500)
  };
}
export function dedupe(items) {
  const map=new Map();
  for(const x of items){
    const key=slug(`${x.store}-${x.item}-${x.size}-${x.price}`);
    const old=map.get(key);
    if(!old || (x.rawText?.length||0)>(old.rawText?.length||0)) map.set(key,x);
  }
  return [...map.values()];
}
export function matchKey(item) {
  const stop=/\b(the|and|or|select|assorted|varieties|sizes|family|pack|fresh|store|brand)\b/g;
  return slug(`${item.brand} ${item.item}`.toLowerCase().replace(stop,' ')).split('-').filter(x=>x.length>2).slice(0,7).sort().join('-');
}
