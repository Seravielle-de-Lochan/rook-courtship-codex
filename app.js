(() => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const {intents, collections, handcrafted, rareOfferings, birdOfferings, proceduralBanks, loreRules} = window.ROOK_CODEX_DATA;
  function defaultState(){
    return {seen:0,correct:0,discovered:{},mode:"mixed",sound:false,birds:true,rareFound:0,dailyOpened:{},dailyAnswers:{},dailyCache:{},unlockedLore:{},history:[]};
  }

  let state;
  try { state = {...defaultState(), ...(JSON.parse(localStorage.getItem("rookCodexState") || "{}"))}; }
  catch { state = defaultState(); }
  state.discovered ||= {};
  state.dailyOpened ||= {};
  state.dailyAnswers ||= {};
  state.dailyCache ||= {};
  state.unlockedLore ||= {};
  state.history ||= [];
  state.birds = state.birds !== false;
  // Daily offerings used to be stored under a date-prefixed id, so the same object found
  // via the daily and via free play appeared twice. Merge them under the canonical id.
  for(const id of Object.keys(state.discovered)){
    const canon=canonicalId(id);
    if(canon!==id){ state.discovered[canon] ||= state.discovered[id]; delete state.discovered[id]; }
  }
  state.rareFound = Object.values(state.discovered).filter(x=>x.rare).length;

  let current = null;
  let answered = false;
  let lastIds = [];
  let codexFilter = "All";
  let currentWasDaily = false;

  function canonicalId(id){ return String(id).replace(/^daily-\d{4}-\d{2}-\d{2}-/,""); }
  function save(){ localStorage.setItem("rookCodexState", JSON.stringify(state)); }
  function pick(arr, rand=Math.random){ return arr[Math.floor(rand()*arr.length)]; }
  function slug(s){ return String(s).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,72); }
  function escapeHtml(s){ return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m])); }
  function localDateKey(d=new Date()){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
  function hashString(str){ let h=2166136261; for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);} return h>>>0; }
  function seeded(seed){ let x=seed>>>0; return ()=>{ x += 0x6D2B79F5; let t=x; t=Math.imul(t^(t>>>15),t|1); t^=t+Math.imul(t^(t>>>7),t|61); return ((t^(t>>>14))>>>0)/4294967296; }; }

  function intentForCollection(collection, rand=Math.random){
    const weighted = {
      "Tideglass Reach":["affection","affection","thought"],
      "Domestic Cryptid":["affection","thought","thought"],
      "Questionable Antiques":["dontask","dontask","thought"],
      "Things Rook Found Outside":["thought","thought","affection"],
      "Flirting With Hardware":["seduction","seduction","affection"]
    };
    return pick(weighted[collection],rand);
  }

  function proceduralRookLine(intent, collection, rand=Math.random){
    const lines = {
      affection:["“I wanted you to find a small piece of me thinking about you.”","“No grand speech. Just this. Just you.”","“It looked like something your hands should know.”"],
      thought:["“There was no deeper symbolism. My brain saw it and produced your name.”","“You have colonised several categories of object in my head. Congratulations.”","“I knew you would pick it up. That was enough reason.”"],
      seduction:["“Oh, moon-bloom. Please. That one was not subtle.”","“I was flirting with you using hardware. It seemed efficient.”","“Consider it an invitation disguised as an object.”"],
      dontask:["“It was not stolen. That is not the same thing as explaining where it came from.”","“You may have the object or the story. I am currently offering the object.”","“Look how lovely it is. Let us remain focused on that.”"]
    };
    if(collection === "Tideglass Reach" && intent === "affection") return pick(["“A little bit of our Reach, because I wanted you to have it here too.”","“Some places fit in the palm when you know what to look for.”"],rand);
    return pick(lines[intent],rand);
  }

  function generateProcedural(rand=Math.random){
    const collection = pick(collections,rand);
    const bank = proceduralBanks[collection];
    const [obj,glyph] = pick(bank.objects,rand);
    const place = pick(bank.places,rand);
    const touch = pick(bank.touches,rand);
    const intent = intentForCollection(collection,rand);
    const name = obj.charAt(0).toUpperCase()+obj.slice(1);
    const desc = `${name}, ${place}, ${touch}.`;
    const id = `p-${slug(collection)}-${intent}-${slug(obj)}-${slug(place)}-${slug(touch)}`;
    const why = intent === "affection" ? "A small prepared gesture meant to be found and handled."
      : intent === "thought" ? "The object triggered an immediate association with you."
      : intent === "seduction" ? "Its placement and presentation turn it into an invitation."
      : "The object is compelling. The acquisition story remains pointedly unavailable.";
    return {id,name,glyph,intent,collection,desc,why,rook:proceduralRookLine(intent,collection,rand),codex:`${name} — ${intents[intent].toLowerCase()}; ${place}.`,procedural:true};
  }

  function randomNormalOffering(){
    if(Math.random() < 0.01) return {...pick(rareOfferings), rare:true};
    if(state.birds && Math.random() < 0.14) return {...pick(birdOfferings), bird:true};
    if(state.mode === "handcrafted") return {...pick(handcrafted)};
    if(state.mode === "procedural") return generateProcedural();
    return Math.random() < 0.52 ? {...pick(handcrafted)} : generateProcedural();
  }

  function dailyOffering(dateKey){
    const rand = seeded(hashString(`rook-daily-v2-${dateKey}`));
    if(rand() < 0.01){
      const rare = {...pick(rareOfferings,rand), rare:true, daily:true};
      rare.id = `daily-${dateKey}-${rare.id}`;
      return rare;
    }
    if(state.birds && rand() < 0.16){
      const bird = {...pick(birdOfferings,rand), bird:true, daily:true};
      bird.id = `daily-${dateKey}-${bird.id}`;
      return bird;
    }
    const roll=rand();
    const base = roll < 0.56 ? {...pick(handcrafted,rand)} : generateProcedural(rand);
    base.daily=true;
    base.id=`daily-${dateKey}-${base.id}`;
    return base;
  }

  function setOffering(o,{daily=false}={}){
    current=o; answered=false; currentWasDaily=daily;
    $("#glyph").textContent=o.glyph;
    $("#offeringName").textContent=o.name;
    $("#offeringDesc").textContent=o.desc;
    $("#collectionLabel").textContent=o.collection || "Uncatalogued";
    $("#sourceLabel").textContent = daily ? "Today's courtship offering" : o.giver ? `Offering from ${o.giver}` : o.rare ? "Rare courtship offering" : o.procedural ? "Procedurally generated offering" : "Handcrafted offering";
    $("#giverLine").textContent=o.giver ? `Presented by ${o.giver}` : "";
    $("#giverLine").classList.toggle("hidden",!o.giver);
    $("#rareBadge").classList.toggle("hidden",!o.rare);
    $("#stage").classList.toggle("rare",!!o.rare);
    $("#statusBadge").textContent="Uninterpreted";
    $("#reveal").classList.add("hidden");
    $("#unlockBox").classList.add("hidden");
    $("#unlockBox").textContent="";
    $$(".choice").forEach(b=>{b.disabled=false;b.classList.remove("picked");});
    const prior = daily ? state.dailyAnswers[localDateKey()] : null;
    if(prior && prior.id===o.id) showReveal(prior.intent,{replay:true});
    showView("play");
    window.scrollTo({top:0,behavior:"smooth"});
  }

  function nextOffering(){
    let o=randomNormalOffering();
    let tries=0;
    while(lastIds.includes(o.id) && tries<10){ o=randomNormalOffering(); tries++; }
    lastIds.push(o.id); if(lastIds.length>8) lastIds.shift();
    setOffering(o);
  }

  function openDaily(){
    const key=localDateKey();
    if(!state.dailyCache[key]){ state.dailyCache[key]=dailyOffering(key); save(); }
    setOffering(state.dailyCache[key],{daily:true});
  }

  function updateDailyBanner(){
    const key=localDateKey();
    const opened=!!state.dailyOpened[key];
    $("#dailyTitle").textContent = opened ? "Today's offering has been opened." : "Something is waiting for you.";
    $("#dailySub").textContent = opened ? "You can revisit it whenever you like — tomorrow brings a new one." : "One deterministic offering is waiting for this calendar day.";
    $("#dailyBtn").textContent = opened ? "Revisit" : "Open it";
  }

  function tone(freq=520){
    if(!state.sound) return;
    try{
      const ctx = new (window.AudioContext||window.webkitAudioContext)();
      const o=ctx.createOscillator(),g=ctx.createGain();
      o.frequency.value=freq;g.gain.value=.025;o.connect(g);g.connect(ctx.destination);o.start();
      g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.08);o.stop(ctx.currentTime+.09);
    }catch{}
  }

  function discoveryRecord(o){
    return {name:o.name,intent:o.intent,collection:o.collection,codex:o.codex,procedural:!!o.procedural,rare:!!o.rare,giver:o.giver||null,glyph:o.glyph,firstSeen:localDateKey()};
  }

  function checkLoreUnlocks(){
    const entries=Object.entries(state.discovered);
    const ids=new Set(entries.map(([id])=>canonicalId(id)));
    const vals=entries.map(([,v])=>v);
    const newly=[];
    for(const rule of loreRules){
      if(state.unlockedLore[rule.id]) continue;
      let ok=false;
      if(rule.requiresIds) ok=rule.requiresIds.every(id=>ids.has(id));
      else if(rule.requiresGivers) ok=rule.requiresGivers.every(g=>vals.some(v=>v.giver===g));
      else if(rule.requiresIntentCount) ok=vals.filter(v=>v.intent===rule.requiresIntentCount.intent).length>=rule.requiresIntentCount.count;
      else if(rule.requiresCollectionCount) ok=vals.filter(v=>v.collection===rule.requiresCollectionCount.collection).length>=rule.requiresCollectionCount.count;
      else if(rule.requiresRareCount) ok=vals.filter(v=>v.rare).length>=rule.requiresRareCount;
      if(ok){ state.unlockedLore[rule.id]=true; newly.push(rule); }
    }
    if(newly.length){ save(); renderLore(); }
    return newly;
  }

  function choose(intent){
    if(answered || !current) return;
    answered=true; tone(current.rare?660:520);
    const hit=intent===current.intent;
    state.seen++;
    if(hit) state.correct++;
    const key=canonicalId(current.id);
    const already=!!state.discovered[key];
    state.discovered[key]=already ? {...discoveryRecord(current),firstSeen:state.discovered[key].firstSeen} : discoveryRecord(current);
    if(current.rare && !already) state.rareFound++;
    if(currentWasDaily){ state.dailyOpened[localDateKey()]=current.id; state.dailyAnswers[localDateKey()]={id:current.id,intent}; }
    state.history.push({id:current.id,date:new Date().toISOString(),hit});
    if(state.history.length>120) state.history=state.history.slice(-120);
    save();
    showReveal(intent);
    renderAll();
  }

  function showReveal(intent,{replay=false}={}){
    answered=true;
    const hit=intent===current.intent;
    $("#statusBadge").textContent=hit?"Read perfectly":"Unexpected cryptid logic";
    $("#verdict").textContent=hit?"You read me perfectly.":"Entirely reasonable. Unfortunately, I am stranger than that.";
    $("#explanation").textContent=`Actual intent: ${intents[current.intent]}. ${current.why}`;
    $("#rookLine").textContent=current.rook;
    $("#reveal").classList.remove("hidden");
    $$(".choice").forEach(b=>{b.disabled=true;b.classList.toggle("picked",b.dataset.intent===intent);});
    if(replay){ $("#verdict").textContent=`Already opened today. ${$("#verdict").textContent}`; return; }

    const unlocked=checkLoreUnlocks();
    if(current.rare || unlocked.length){
      const bits=[];
      if(current.rare) bits.push("✦ Rare find added to the Codex.");
      unlocked.forEach(l=>bits.push(`Secret lore unlocked: ${l.title}`));
      $("#unlockBox").innerHTML=bits.map(escapeHtml).join("<br>");
      $("#unlockBox").classList.remove("hidden");
    }
  }

  function normalizedEntries(){
    return Object.entries(state.discovered).map(([id,v])=>({id,...v}));
  }

  function renderStats(){
    $("#seenStat").textContent=state.seen||0;
    $("#correctStat").textContent=state.correct||0;
    $("#uniqueStat").textContent=Object.keys(state.discovered).length;
    $("#rareStat").textContent=state.rareFound||0;
  }

  function renderCollections(){
    const vals=Object.values(state.discovered);
    $("#collectionGrid").innerHTML=collections.map(c=>{
      const n=vals.filter(v=>v.collection===c).length;
      return `<div class="collection-card"><b>${escapeHtml(c)}</b><span>${n} discovered · procedural finds can continue indefinitely</span></div>`;
    }).join("");
    const filters=["All",...collections];
    $("#collectionFilters").innerHTML=filters.map(f=>`<button type="button" class="filter-chip ${codexFilter===f?"active":""}" data-filter="${escapeHtml(f)}">${escapeHtml(f)}</button>`).join("");
    $$("#collectionFilters .filter-chip").forEach(b=>b.addEventListener("click",()=>{codexFilter=b.dataset.filter;renderCodex();renderCollections();}));
  }

  function renderCodex(){
    let entries=normalizedEntries().reverse();
    if(codexFilter!=="All") entries=entries.filter(e=>e.collection===codexFilter);
    $("#codexCount").textContent=`${Object.keys(state.discovered).length} discovered`;
    if(!entries.length){ $("#codexList").innerHTML='<div class="small" style="margin-top:12px">Nothing catalogued in this collection yet.</div>'; return; }
    $("#codexList").innerHTML=entries.map(e=>`
      <div class="codex-entry">
        <div class="codex-title ${e.rare?"rare-text":""}">${e.rare?"✦ ":""}${escapeHtml(e.name)}</div>
        <div class="codex-meta">${escapeHtml(e.collection||"Uncatalogued")} · ${escapeHtml(intents[e.intent]||e.intent)}${e.giver?` · from ${escapeHtml(e.giver)}`:""}${e.procedural?" · procedural":""}</div>
        <div class="codex-text">${escapeHtml(e.codex||"")}</div>
      </div>`).join("");
  }

  function loreUnlocked(rule){ return !!state.unlockedLore[rule.id]; }
  function renderLore(){
    const unlockedCount=loreRules.filter(loreUnlocked).length;
    $("#loreCount").textContent=`${unlockedCount} / ${loreRules.length} unlocked`;
    $("#loreList").innerHTML=loreRules.map(rule=>{
      const unlocked=loreUnlocked(rule);
      return `<div class="lore-entry ${unlocked?"unlocked":"lore-lock"}">
        <div class="lore-title">${unlocked?"✦ ":"◇ "}${escapeHtml(unlocked?rule.title:"Locked entry")}</div>
        <div class="lore-condition">${escapeHtml(rule.hint)}</div>
        <div class="lore-body">${unlocked?escapeHtml(rule.body):"The rest of this entry remains hidden until the right finds gather together."}</div>
      </div>`;
    }).join("");
  }

  function renderClassified(){
    const entries=normalizedEntries().filter(e=>e.intent==="dontask").reverse();
    $("#classifiedCount").textContent=`${entries.length} objects on file`;
    if(!entries.length){ $("#classifiedList").innerHTML='<div class="small" style="margin-top:12px">No classified provenance yet. This is unlikely to remain true.</div>'; return; }
    $("#classifiedList").innerHTML=entries.map(e=>`
      <div class="codex-entry">
        <div class="codex-title ${e.rare?"rare-text":""}">${e.rare?"✦ ":""}${escapeHtml(e.name)}</div>
        <div class="codex-meta">${escapeHtml(e.collection||"Questionable Antiques")}${e.giver?` · submitted by ${escapeHtml(e.giver)}`:""}</div>
        <div class="codex-text">${escapeHtml(e.codex||"")}</div>
        <span class="classified-stamp">Provenance classified</span>
      </div>`).join("");
  }

  function renderAll(){ renderStats();renderCollections();renderCodex();renderLore();renderClassified();updateDailyBanner(); }

  function showView(name){
    const views=["play","codex","lore","classified","settings"];
    for(const v of views) $(`#${v}View`).classList.toggle("hidden",v!==name);
    $$(".tab").forEach(t=>{const on=t.dataset.view===name;t.classList.toggle("active",on);on?t.setAttribute("aria-current","page"):t.removeAttribute("aria-current");});
  }

  function toast(msg){
    const el=$("#toast");el.textContent=msg;el.classList.remove("hidden");
    clearTimeout(toast._t);toast._t=setTimeout(()=>el.classList.add("hidden"),2300);
  }

  $$(".choice").forEach(b=>b.addEventListener("click",()=>choose(b.dataset.intent)));
  $("#nextBtn").addEventListener("click",nextOffering);
  $("#newBtn").addEventListener("click",nextOffering);
  $("#dailyBtn").addEventListener("click",openDaily);
  $$(".tab").forEach(t=>t.addEventListener("click",()=>showView(t.dataset.view)));

  $("#modeSelect").value=state.mode;
  $("#soundToggle").checked=state.sound;
  $("#birdToggle").checked=state.birds;
  $("#modeSelect").addEventListener("change",e=>{state.mode=e.target.value;save();toast("Free-play offering mode updated.");});
  $("#soundToggle").addEventListener("change",e=>{state.sound=e.target.checked;save();toast(state.sound?"Soft click enabled.":"Sound disabled.");});
  $("#birdToggle").addEventListener("change",e=>{state.birds=e.target.checked;save();toast(state.birds?"Morrow, Ink and Pip may now interfere.":"Bird offerings paused.");updateDailyBanner();});

  $("#resetProgressBtn").addEventListener("click",()=>{
    if(confirm("Reset all discovered entries, rare finds, daily history and secret lore on this device?")){
      const keep={mode:state.mode,sound:state.sound,birds:state.birds};
      state={...defaultState(),...keep};save();renderAll();nextOffering();toast("Codex reset.");
    }
  });

  if("serviceWorker" in navigator){ window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{})); }

  checkLoreUnlocks();
  renderAll();
  const today=localDateKey();
  if(!state.dailyOpened[today]) openDaily(); else nextOffering();

})();
