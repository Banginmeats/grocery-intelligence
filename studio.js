
import * as pdfjsLib from "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs";
pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";

const state={files:[],deals:[],worker:null};
const $=s=>document.querySelector(s);
const clean=v=>String(v??"").replace(/\s+/g," ").trim();
const moneyRx=/(?:\b\d+\s*(?:for|\/)\s*\$?\s*\d+(?:\.\d{1,2})?|\$\s*\d+(?:\.\d{1,2})?|\b\d{1,3}\s*¢|\bbuy\s*\d+\s*(?:get|,)\s*\d+\s*free\b|\bbogo\b|\bfree\b)/i;
const junkRx=/^(prices? (?:valid|good)|we reserve|not responsible|products may|scan|recipe|serving|ingredients|directions|copyright|page \d+|weekly ad|discovery)$/i;
const categories=[
  ["Meat",/chicken|beef|steak|pork|turkey|sausage|bacon|ham|ribs|ground meat/i],
  ["Seafood",/shrimp|salmon|fish|scallop|crab|lobster|seafood/i],
  ["Produce",/apple|orange|berry|berries|watermelon|melon|peach|tomato|corn|lettuce|onion|potato|banana|grape|cherry|cucumber|squash|produce/i],
  ["Dairy",/milk|cheese|yogurt|egg|cream|butter/i],
  ["Bakery",/bread|roll|cake|cookie|brownie|bakery|bagel/i],
  ["Frozen",/frozen|ice cream|pizza|waffle/i],
  ["Beverages",/soda|water|juice|tea|coffee|drink|beverage|energy/i],
  ["Snacks",/chips|cracker|popcorn|pretzel|candy|gum|snack/i],
  ["Pantry",/pasta|sauce|seasoning|cereal|rice|bean|soup|ketchup|mustard|mayonnaise|flour|sugar/i],
  ["Household",/tissue|paper towel|detergent|cleaner|bag|foil|plate|cup|soap|spray/i],
  ["Health & Beauty",/toothpaste|deodorant|shampoo|vitamin|pads|body wash|beauty/i],
  ["Pet",/dog|cat|pet|litter/i]
];

function weekDefault(){
  const d=new Date(),start=new Date(d);start.setDate(d.getDate()-d.getDay());
  const end=new Date(start);end.setDate(start.getDate()+6);
  return `${start.toLocaleDateString("en-US",{month:"long",day:"numeric"})}–${end.toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}`;
}
$("#weekName").value=weekDefault();

$("#addFiles").onclick=()=>$("#filePicker").click();
$("#filePicker").onchange=e=>{addFiles([...e.target.files]);e.target.value=""};
$("#loadExampleNames").onclick=()=>{state.files.forEach(x=>x.store=guessStore(x.file.name));renderFiles()};
$("#clearAll").onclick=()=>{if(confirm("Clear all selected PDFs and extracted deals?")){state.files=[];state.deals=[];renderFiles();$("#reviewSection").classList.add("hidden")}};
$("#processButton").onclick=processAll;
$("#reviewSearch").oninput=renderReview;
$("#reviewStore").onchange=renderReview;
$("#addManualDeal").onclick=()=>{state.deals.unshift(blankDeal());renderReview()};
$("#publishButton").onclick=publish;
$("#exportRaw").onclick=()=>downloadJson({files:state.files.map(x=>({store:x.store,name:x.file.name,pages:x.pages})),deals:state.deals},`grocery-extraction-${Date.now()}.json`);

function addFiles(files){
  for(const file of files){
    if(file.type!=="application/pdf"&&!file.name.toLowerCase().endsWith(".pdf"))continue;
    state.files.push({id:crypto.randomUUID(),file,store:guessStore(file.name),pages:null,status:"Ready"});
  }
  renderFiles();
}
function guessStore(name){
  const n=name.replace(/\.pdf$/i,"").replace(/[_-]+/g," ").replace(/\s+/g," ").trim();
  if(/harris/i.test(n))return"Harris Teeter";
  if(/weis/i.test(n)||/flyer \(1\)/i.test(name))return"Weis";
  if(/giant/i.test(n)||/^flyer$/i.test(n))return"Giant";
  return n||"New Store";
}
function renderFiles(){
  $("#fileCount").textContent=`${state.files.length} file${state.files.length===1?"":"s"}`;
  $("#processButton").disabled=!state.files.length;
  $("#fileList").innerHTML=state.files.length?state.files.map(x=>`<div class="file-row" data-id="${x.id}">
    <div><strong>${escapeHtml(x.file.name)}</strong><div class="file-meta">${(x.file.size/1048576).toFixed(1)} MB ${x.pages?`· ${x.pages} pages`:""}</div></div>
    <label><span class="file-meta">Store name</span><input class="store-name" value="${escapeAttr(x.store)}"></label>
    <div><span class="file-meta">Status</span><strong class="file-status">${escapeHtml(x.status)}</strong></div>
    <button class="remove-file">Remove</button>
  </div>`).join(""):`<p class="empty">Add the circular PDFs you want to compare.</p>`;
  document.querySelectorAll(".file-row").forEach(row=>{
    const item=state.files.find(x=>x.id===row.dataset.id);
    row.querySelector(".store-name").oninput=e=>item.store=e.target.value.trim();
    row.querySelector(".remove-file").onclick=()=>{state.files=state.files.filter(x=>x.id!==item.id);renderFiles()};
  });
}
async function ensureWorker(){
  if(state.worker)return state.worker;
  setProgress(1,"Loading OCR engine","This happens once per browser session.");
  state.worker=await Tesseract.createWorker("eng",1,{logger:m=>{
    if(m.status==="recognizing text")$("#progressDetail").textContent=`OCR ${(m.progress*100).toFixed(0)}%`;
  }});
  return state.worker;
}
async function processAll(){
  $("#processButton").disabled=true;
  $("#progressShell").classList.remove("hidden");
  state.deals=[];
  try{
    const worker=await ensureWorker();
    let totalPages=0,processed=0;
    for(const item of state.files){
      item.status="Opening…";renderFiles();
      const bytes=new Uint8Array(await item.file.arrayBuffer());
      item.pdf=await pdfjsLib.getDocument({data:bytes}).promise;
      item.pages=item.pdf.numPages;totalPages+=item.pages;item.status=`${item.pages} pages`;renderFiles();
    }
    for(const item of state.files){
      item.status="Processing…";renderFiles();
      for(let p=1;p<=item.pages;p++){
        setProgress((processed/Math.max(totalPages,1))*100,`${item.store} · page ${p} of ${item.pages}`,`Rendering and reading ${item.file.name}`);
        const page=await item.pdf.getPage(p);
        const viewport=page.getViewport({scale:Number($("#ocrScale").value)});
        const canvas=document.createElement("canvas"),ctx=canvas.getContext("2d",{willReadFrequently:true});
        canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
        await page.render({canvasContext:ctx,viewport}).promise;
        const result=await worker.recognize(canvas);
        const pageDeals=parsePage(result.data.text,item.store,p,item.file.name);
        state.deals.push(...pageDeals);
        processed++;
      }
      item.status=`Done · ${state.deals.filter(x=>x.store===item.store).length} candidates`;renderFiles();
    }
    state.deals=dedupe(state.deals);
    setProgress(100,"Extraction complete",`${state.deals.length} candidate deals require review.`);
    setupReview();
  }catch(err){
    console.error(err);setProgress(0,"Processing failed",err.message);alert(`PDF processing failed: ${err.message}`);
  }finally{$("#processButton").disabled=false}
}
function parsePage(text,store,page,fileName){
  const rawLines=text.split(/\n+/).map(clean).filter(Boolean);
  const lines=[];
  for(const line of rawLines){
    if(line.length>180){
      lines.push(...line.split(/\s{2,}|(?<=\d)\s+(?=[A-Z][a-z])/).map(clean).filter(Boolean));
    }else lines.push(line);
  }
  const deals=[];
  for(let i=0;i<lines.length;i++){
    const line=lines[i];
    if(!moneyRx.test(line))continue;
    const offer=extractOffer(line,lines[i+1]||"");
    const context=lines.slice(Math.max(0,i-4),i+2).filter(x=>!junkRx.test(x));
    let product=context.filter(x=>!moneyRx.test(x)&&/[A-Za-z]{3}/.test(x)&&x.length<100).slice(-2).join(" ");
    if(!product){
      product=clean(line.replace(moneyRx,""));
    }
    product=product.replace(/^(selected varieties|select varieties|digital coupon|with card)\s*/i,"").trim();
    if(product.length<3||junkRx.test(product))continue;
    const size=extractSize(context.join(" ")+" "+line);
    const promo=extractPromo(context.join(" ")+" "+line);
    deals.push({
      id:crypto.randomUUID(),use:true,store,item:smartTitle(product),brand:"",size,
      display:offer,price:parsePrice(offer),promo,category:categorize(product),
      rating:rateDeal(offer,promo),page,fileName,raw:context.join(" | "),confidence:"OCR draft"
    });
  }
  return deals;
}
function extractOffer(line,next){
  const t=`${line} ${next}`;
  const patterns=[
    /\bbuy\s*\d+\s*(?:,|and)?\s*get\s*\d+\s*free\b/i,/\bbuy\s*\d+\s*get\s*\d+\s*free\b/i,/\bbogo\b/i,
    /\d+\s*(?:for|\/)\s*\$\s*\d+(?:\.\d{1,2})?/i,/\$\s*\d+(?:\.\d{1,2})?(?:\s*\/\s*lb|\s*lb|\s*each)?/i,
    /\b\d{1,3}\s*¢(?:\s*each)?/i,/\bfree\b/i
  ];
  for(const rx of patterns){const m=t.match(rx);if(m)return clean(m[0])}
  return clean(line);
}
function parsePrice(t){
  let m=t.match(/(\d+)\s*(?:for|\/)\s*\$\s*(\d+(?:\.\d{1,2})?)/i);if(m)return Number(m[2])/Number(m[1]);
  m=t.match(/\$\s*(\d+(?:\.\d{1,2})?)/);if(m)return Number(m[1]);
  m=t.match(/(\d{1,3})\s*¢/);if(m)return Number(m[1])/100;
  return null;
}
function extractSize(t){return clean((t.match(/\b\d+(?:\.\d+)?\s*(?:fl\s*oz|oz|lb|lbs|ct|count|pk|pack|liter|litre|ml|gal|gallon|dozen)\b/i)||[])[0]||"")}
function extractPromo(t){
  const bits=[];
  if(/digital coupon|ecoupon/i.test(t))bits.push("Digital coupon");
  if(/with card|bonus card|rewards/i.test(t))bits.push("Loyalty required");
  if(/limit(?:ed)?\s*\d+/i.test(t))bits.push((t.match(/limit(?:ed)?\s*\d+/i)||[])[0]);
  if(/buy\s*\d+.*free|bogo/i.test(t))bits.push("BOGO terms");
  return bits.join(" · ");
}
function categorize(t){for(const [name,rx] of categories)if(rx.test(t))return name;return"Other"}
function rateDeal(offer,promo){
  if(/free|bogo/i.test(offer))return 5;
  if(promo&&/coupon|required/i.test(promo))return 3;
  return 4;
}
function smartTitle(t){return clean(t).toLowerCase().replace(/\b\w/g,c=>c.toUpperCase()).replace(/\bOz\b/g,"oz").replace(/\bLb\b/g,"lb")}
function dedupe(items){
  const map=new Map();
  for(const x of items){
    const key=`${x.store}|${normalizeName(x.item)}|${x.display}|${x.page}`;
    if(!map.has(key))map.set(key,x);
  }
  return [...map.values()];
}
function normalizeName(t){return clean(t).toLowerCase().replace(/\b(selected|select|varieties|variety|all|or|and|the)\b/g,"").replace(/[^a-z0-9]+/g," ").trim()}
function blankDeal(){return{id:crypto.randomUUID(),use:true,store:state.files[0]?.store||"New Store",item:"",brand:"",size:"",display:"",price:null,promo:"",category:"Other",rating:3,page:"Manual",fileName:"Manual",raw:"",confidence:"Manual"}}
function setupReview(){
  $("#reviewSection").classList.remove("hidden");
  $("#reviewStore").innerHTML=`<option value="all">All stores</option>${[...new Set(state.deals.map(x=>x.store))].map(x=>`<option>${escapeHtml(x)}</option>`).join("")}`;
  renderReview();$("#reviewSection").scrollIntoView({behavior:"smooth"});
}
function renderReview(){
  const q=$("#reviewSearch").value.toLowerCase(),store=$("#reviewStore").value;
  const list=state.deals.filter(x=>(store==="all"||x.store===store)&&(`${x.item} ${x.display} ${x.category}`.toLowerCase().includes(q)));
  $("#reviewCount").textContent=`${list.length} shown`;
  $("#reviewBody").innerHTML=list.map(x=>`<tr data-id="${x.id}">
    <td><input class="use-check" type="checkbox" ${x.use?"checked":""}></td>
    <td><input class="store-input" value="${escapeAttr(x.store)}"></td>
    <td><input class="product-input" value="${escapeAttr(x.item)}"></td>
    <td><input class="size-input" value="${escapeAttr(x.size||"")}"></td>
    <td><input class="offer-input" value="${escapeAttr(x.display||"")}"></td>
    <td><select class="category-input">${["Meat","Seafood","Produce","Dairy","Bakery","Frozen","Beverages","Snacks","Pantry","Household","Health & Beauty","Pet","Other"].map(c=>`<option ${c===x.category?"selected":""}>${c}</option>`).join("")}</select></td>
    <td><span class="page-chip">${x.page}</span></td><td><button class="delete-row">Delete</button></td>
  </tr>`).join("");
  document.querySelectorAll("#reviewBody tr").forEach(row=>{
    const x=state.deals.find(d=>d.id===row.dataset.id);
    row.querySelector(".use-check").onchange=e=>{x.use=e.target.checked;updateSelected()};
    row.querySelector(".store-input").oninput=e=>x.store=e.target.value;
    row.querySelector(".product-input").oninput=e=>x.item=e.target.value;
    row.querySelector(".size-input").oninput=e=>x.size=e.target.value;
    row.querySelector(".offer-input").oninput=e=>{x.display=e.target.value;x.price=parsePrice(x.display)};
    row.querySelector(".category-input").onchange=e=>x.category=e.target.value;
    row.querySelector(".delete-row").onclick=()=>{state.deals=state.deals.filter(d=>d.id!==x.id);renderReview()};
  });
  updateSelected();
}
function updateSelected(){
  const selected=state.deals.filter(x=>x.use&&x.item&&x.display);
  $("#selectedSummary").textContent=`${selected.length} selected across ${new Set(selected.map(x=>x.store)).size} stores`;
}
function publish(){
  const deals=state.deals.filter(x=>x.use&&clean(x.item)&&clean(x.display)).map((x,i)=>({...x,id:`pdf-${i+1}`,price:parsePrice(x.display),source:"pdf-upload"}));
  if(!deals.length)return alert("Select at least one valid deal.");
  const stores=[...new Set(deals.map(x=>clean(x.store)).filter(Boolean))];
  const comparisons=buildComparisons(deals,stores);
  const data={
    meta:{
      week:clean($("#weekName").value)||weekDefault(),zip:clean($("#marketName").value),
      stores,source:"pdf-upload",generatedAt:new Date().toISOString(),
      coverage:`${deals.length} reviewed deals extracted from ${state.files.length} uploaded PDF circular${state.files.length===1?"":"s"}.`,
      circulars:state.files.map(x=>({name:x.store,label:`${x.file.name} · ${x.pages||"?"} pages`}))
    },deals,comparisons
  };
  localStorage.setItem("groceryUploadedWeek",JSON.stringify(data));
  downloadJson(data,`grocery-week-${new Date().toISOString().slice(0,10)}.json`);
  if(confirm(`Published ${deals.length} deals from ${stores.length} stores to this browser.\n\nOpen the dashboard now?`))location.href="index.html";
}
function buildComparisons(deals,stores){
  const groups=new Map();
  for(const d of deals){
    if(!Number.isFinite(d.price))continue;
    const key=matchKey(d);
    if(key.length<4)continue;
    if(!groups.has(key))groups.set(key,[]);
    groups.get(key).push(d);
  }
  const rows=[];
  for(const group of groups.values()){
    if(new Set(group.map(x=>x.store)).size<2)continue;
    const sorted=[...group].sort((a,b)=>a.price-b.price),best=sorted[0],prices={};
    for(const d of group)prices[d.store]=d.display;
    rows.push({item:best.item,category:best.category,match:sizeAgreement(group)?"Likely exact":"Comparable",winner:best.store,prices,note:sizeAgreement(group)?"OCR-matched product; verify package wording.":"Similar product wording; compare size and variety."});
  }
  return rows.sort((a,b)=>a.item.localeCompare(b.item));
}
function matchKey(d){
  let name=normalizeName(d.item).replace(/\b\d+(?:\.\d+)?\b/g,"");
  const words=name.split(" ").filter(x=>x.length>2).slice(0,5);
  return `${words.join(" ")}|${(d.size||"").toLowerCase()}`;
}
function sizeAgreement(group){const sizes=new Set(group.map(x=>clean(x.size).toLowerCase()).filter(Boolean));return sizes.size===1}
function downloadJson(value,name){
  const blob=new Blob([JSON.stringify(value,null,2)],{type:"application/json"}),a=document.createElement("a");
  a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
function setProgress(p,title,detail){$("#progressBar").style.width=`${Math.max(0,Math.min(100,p))}%`;$("#progressTitle").textContent=title;$("#progressDetail").textContent=detail}
function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function escapeAttr(v){return escapeHtml(v)}
renderFiles();
