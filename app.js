
const state={manifest:null,data:null,category:"All",view:"compare",favorites:new Set(JSON.parse(localStorage.getItem("groceryFavorites")||"[]"))};
const $=s=>document.querySelector(s);
const esc=v=>String(v??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));

async function boot(){
  state.manifest=await fetch("data/manifest.json").then(r=>r.json());
  $("#weekSelect").innerHTML=state.manifest.weeks.map(w=>`<option value="${esc(w.id)}">${esc(w.label)}</option>`).join("");
  $("#weekSelect").value=state.manifest.defaultWeek;
  await loadWeek(state.manifest.defaultWeek);
  wire();
}
async function loadWeek(id){
  const item=state.manifest.weeks.find(w=>w.id===id);
  state.data=await fetch(item.file).then(r=>r.json());
  state.category="All";
  render();
}
function wire(){
  $("#weekSelect").addEventListener("change",e=>loadWeek(e.target.value));
  ["searchInput","storeFilter","matchFilter"].forEach(id=>$("#"+id).addEventListener(id==="searchInput"?"input":"change",render));
  $("#resetButton").onclick=()=>{$("#searchInput").value="";$("#storeFilter").value="all";$("#matchFilter").value="all";state.category="All";render()};
  document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{state.view=b.dataset.view;renderViews()});
  $("#themeButton").onclick=()=>{document.body.classList.toggle("dark");localStorage.setItem("groceryTheme",document.body.classList.contains("dark")?"dark":"light")};
  if(localStorage.getItem("groceryTheme")==="dark")document.body.classList.add("dark");
}
function filters(){
  return {q:$("#searchInput").value.trim().toLowerCase(),store:$("#storeFilter").value,match:$("#matchFilter").value};
}
function render(){
  const d=state.data, f=filters();
  $("#weekLabel").textContent=d.meta.week;
  $("#coverageText").textContent=d.meta.coverage||`ZIP ${d.meta.zip}`;
  const circulars=d.meta.circulars||[];
  $("#circularLinks").innerHTML=circulars.map(c=>`<a class="circular-link" href="${esc(c.url)}" target="_blank" rel="noopener noreferrer"><span><b>${esc(c.name)}</b><small>${esc(c.label||"Weekly ad")}</small></span><span aria-hidden="true">↗</span></a>`).join("")||`<span class="empty">Circular links are unavailable for this week.</span>`;
  const cats=["All",...new Set(d.deals.map(x=>x.category))];
  $("#categoryRow").innerHTML=cats.map(c=>`<button data-cat="${esc(c)}" class="${c===state.category?"active":""}">${esc(c)}</button>`).join("");
  $("#categoryRow").querySelectorAll("button").forEach(b=>b.onclick=()=>{state.category=b.dataset.cat;render()});

  const validWinners=d.comparisons.map(x=>x.winner).filter(x=>["Weis","Harris Teeter","Giant"].includes(x));
  const wins=validWinners.reduce((a,x)=>(a[x]=(a[x]||0)+1,a),{});
  const winner=Object.entries(wins).sort((a,b)=>b[1]-a[1])[0]?.[0]||"No clear winner";
  $("#overallWinner").textContent=winner;
  $("#winnerReason").textContent=winner==="No clear winner"?"More exact matches are needed.":`${wins[winner]} current comparison wins.`;

  const exact=d.comparisons.filter(x=>x.match==="Exact").length;
  const strong=d.deals.filter(x=>x.rating>=4).length;
  $("#statGrid").innerHTML=[
    ["Captured deals",d.deals.length,"Current JSON week"],
    ["Comparisons",d.comparisons.length,`${exact} confirmed exact`],
    ["Strong buys",strong,"Rated four or five stars"],
    ["Stores",d.meta.stores.length,"All within a few miles"]
  ].map(x=>`<article class="stat"><span>${x[0]}</span><strong>${x[1]}</strong><small>${x[2]}</small></article>`).join("");

  const comps=d.comparisons.filter(x=>
    (state.category==="All"||x.category===state.category)&&
    (f.match==="all"||x.match===f.match)&&
    (`${x.item} ${x.category} ${x.note} ${x.winner}`.toLowerCase().includes(f.q))&&
    (f.store==="all"||(f.store==="Weis"&&x.weis)||(f.store==="Harris Teeter"&&x.ht)||(f.store==="Giant"&&x.giant))
  );
  $("#comparisonCount").textContent=`${comps.length} shown`;
  $("#comparisonList").innerHTML=comps.map(x=>`<article class="comparison">
    <div class="comparison-top"><div><h4>${esc(x.item)}</h4><span class="match ${x.match==="Comparable"?"comparable":""}">${esc(x.match)}</span></div><span class="winner-chip">${esc(x.winner)}</span></div>
    <div class="prices">
      <div class="store-price"><span>WEIS</span><strong>${esc(x.weis||"—")}</strong></div>
      <div class="store-price"><span>HARRIS TEETER</span><strong>${esc(x.ht||"—")}</strong></div>
      <div class="store-price"><span>GIANT</span><strong>${esc(x.giant||"—")}</strong></div>
    </div><p class="note">${esc(x.note||"")}</p></article>`).join("")||`<p class="empty">No comparisons match those filters.</p>`;

  const deals=d.deals.filter(x=>
    (state.category==="All"||x.category===state.category)&&
    (f.store==="all"||x.store===f.store)&&
    (`${x.item} ${x.brand} ${x.category} ${x.promo}`.toLowerCase().includes(f.q))
  );
  $("#dealCount").textContent=`${deals.length} shown`;
  $("#dealGrid").innerHTML=deals.map(dealCard).join("")||`<p class="empty">No deals match those filters.</p>`;
  $("#dealGrid").querySelectorAll(".heart").forEach(b=>b.onclick=()=>toggleFavorite(Number(b.dataset.id)));

  const strongDeals=d.deals.filter(x=>x.rating>=4);
  $("#planGrid").innerHTML=d.meta.stores.map(store=>{
    const items=strongDeals.filter(x=>x.store===store).sort((a,b)=>b.rating-a.rating).slice(0,8);
    return `<article class="store-plan"><h4><span>${esc(store)}</span><span>${items.length} buys</span></h4>${items.length?`<ul>${items.map(x=>`<li>${esc(x.item)} — <b>${esc(x.display)}</b></li>`).join("")}</ul>`:"<p>No strong loaded deals.</p>"}</article>`;
  }).join("");

  renderFavorites();renderViews();
}
function dealCard(x){
  const saved=state.favorites.has(x.id);
  return `<article class="deal"><div class="deal-head"><span class="store-pill">${esc(x.store)}</span><button class="heart ${saved?"saved":""}" data-id="${x.id}" aria-label="Favorite">${saved?"♥":"♡"}</button></div>
  <h4>${esc(x.item)}</h4><small>${esc(x.brand)} · ${esc(x.size)}</small><div class="promo">${esc(x.promo)}</div><div class="price">${esc(x.display)}</div><div class="stars">${"★".repeat(x.rating)}${"☆".repeat(5-x.rating)}</div></article>`;
}
function toggleFavorite(id){
  state.favorites.has(id)?state.favorites.delete(id):state.favorites.add(id);
  localStorage.setItem("groceryFavorites",JSON.stringify([...state.favorites]));render();
}
function renderFavorites(){
  const list=state.data.deals.filter(x=>state.favorites.has(x.id));
  $("#favoriteGrid").innerHTML=list.map(dealCard).join("");
  $("#favoriteGrid").querySelectorAll(".heart").forEach(b=>b.onclick=()=>toggleFavorite(Number(b.dataset.id)));
  $("#favoriteEmpty").classList.toggle("hidden",list.length>0);
}
function renderViews(){
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
  document.querySelectorAll(".tab").forEach(t=>t.classList.toggle("active",t.dataset.view===state.view));
  $("#"+state.view+"View").classList.add("active");
}
boot().catch(err=>{document.body.innerHTML=`<main><h2>Dashboard could not load</h2><p>${esc(err.message)}</p><p>Open it through GitHub Pages or a local web server rather than directly as a file.</p></main>`});
