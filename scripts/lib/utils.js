import fs from 'node:fs/promises';
import path from 'node:path';

export const root = path.resolve(new URL('../..', import.meta.url).pathname);
export const readJson = async p => JSON.parse(await fs.readFile(path.join(root, p), 'utf8'));
export const writeJson = async (p, value) => {
  const full = path.join(root, p);
  await fs.mkdir(path.dirname(full), {recursive:true});
  await fs.writeFile(full, JSON.stringify(value, null, 2) + '\n');
};
export const sleep = ms => new Promise(r => setTimeout(r, ms));
export const slug = s => String(s||'').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
export const clean = s => String(s??'').replace(/\s+/g,' ').trim();
export const money = n => Number.isFinite(n) ? `$${n.toFixed(2).replace(/\.00$/,'')}` : '';
export function weekId(date = new Date()) {
  const d = new Date(date.toLocaleString('en-US',{timeZone:'America/New_York'}));
  const day = d.getDay();
  d.setDate(d.getDate() - ((day + 4) % 7)); // most recent Wednesday
  return d.toISOString().slice(0,10);
}
