(() => {
  const STORAGE_KEY = 'rookJewelleryLayout';
  const app = document.querySelector('#app');
  const frame = document.querySelector('#offeringCard');
  const openButton = document.querySelector('#openLayoutEditor');
  if (!app || !frame || !openButton) return;

  const assets = globalThis.TIDEGLASS_EDITOR_ASSETS || [];
  const byKey = Object.fromEntries(assets.map(asset => [asset.key, asset]));
  const emptyState = () => ({version:1,visible:true,items:[]});
  let state = load();
  let selectedId = null;
  let editing = false;

  function load(){
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return parsed && Array.isArray(parsed.items) ? {...emptyState(),...parsed} : emptyState();
    } catch { return emptyState(); }
  }
  function save(){ localStorage.setItem(STORAGE_KEY,JSON.stringify(state)); }
  function uid(){ return `jewel-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`; }
  function selected(){ return state.items.find(item => item.id === selectedId); }
  function clamp(value,min,max){ return Math.min(max,Math.max(min,value)); }

  const pageLayer = document.createElement('div');
  pageLayer.className = 'jewellery-layer jewellery-layer-page';
  pageLayer.dataset.anchor = 'page';
  const frameLayer = document.createElement('div');
  frameLayer.className = 'jewellery-layer jewellery-layer-frame';
  frameLayer.dataset.anchor = 'frame';
  app.append(pageLayer);
  frame.append(frameLayer);

  const editor = document.createElement('aside');
  editor.className = 'layout-editor';
  editor.hidden = true;
  editor.setAttribute('role','dialog');
  editor.setAttribute('aria-label','Jewellery placement editor');
  editor.innerHTML = `
    <div class="layout-editor__head"><strong>Arrange jewellery</strong><div class="layout-editor__head-actions"><button type="button" data-action="collapse" aria-expanded="true">Minimise</button><button type="button" data-action="done">Done</button></div></div>
    <p class="layout-editor__hint">Drag a piece from this tray, or tap to add it. Drag placed pieces; use arrow keys for fine nudges.</p>
    <div class="layout-editor__filters"><select data-role="asset-category" aria-label="Asset category"><option value="all">All ${assets.length} elements</option><option value="new-chains">New chains</option><option value="ornaments">Ornaments</option><option value="frames">Frames & panels</option><option value="dividers">Dividers</option><option value="buttons">Buttons</option><option value="controls">Progress & toggles</option><option value="indicators">Dots & badges</option><option value="icons">Icons</option></select><input data-role="asset-search" type="search" placeholder="Find an element" aria-label="Find an element"></div>
    <div class="layout-editor__assets" aria-live="polite"></div>
    <div class="layout-editor__placed" aria-label="Placed elements"></div>
    <div class="layout-editor__controls">
      <label>Attach to<select data-control="anchor"><option value="page">Whole page</option><option value="frame">Offering frame</option></select></label>
      <label>Opacity<input data-control="opacity" type="range" min="10" max="100" value="100"></label>
      <label class="wide">Size<input data-control="width" type="range" min="20" max="520" value="90"></label>
      <label class="wide">Rotation<input data-control="rotation" type="range" min="-180" max="180" value="0"></label>
    </div>
    <div class="layout-editor__actions">
      <button type="button" data-action="flip">Flip</button><button type="button" data-action="duplicate">Duplicate</button><button type="button" data-action="delete">Delete</button>
      <button type="button" data-action="back">Send back</button><button type="button" data-action="front">Bring front</button><button type="button" data-action="clear" class="layout-editor__danger">Clear all</button>
      <button type="button" data-action="copy" class="wide">Copy layout for Codex</button><button type="button" data-action="visibility">Hide pieces</button>
    </div>
    <div class="layout-editor__status" aria-live="polite">Choose a piece to begin.</div>`;
  document.body.append(editor);

  const controls = Object.fromEntries([...editor.querySelectorAll('[data-control]')].map(el=>[el.dataset.control,el]));
  const status = editor.querySelector('.layout-editor__status');
  const visibilityButton = editor.querySelector('[data-action="visibility"]');
  const assetTray = editor.querySelector('.layout-editor__assets');
  const placedTray = editor.querySelector('.layout-editor__placed');
  const categorySelect = editor.querySelector('[data-role="asset-category"]');
  const assetSearch = editor.querySelector('[data-role="asset-search"]');
  const collapseButton = editor.querySelector('[data-action="collapse"]');

  function setCollapsed(collapsed){
    editor.classList.toggle('is-collapsed',collapsed);
    collapseButton.textContent=collapsed?'Open tray':'Minimise';
    collapseButton.setAttribute('aria-expanded',String(!collapsed));
  }

  function renderAssetTray(){
    const category=categorySelect.value;const query=assetSearch.value.trim().toLowerCase();
    const visible=assets.filter(asset=>(category==='all'||asset.category===category)&&(!query||asset.label.toLowerCase().includes(query)||asset.key.includes(query)));
    assetTray.innerHTML=visible.map(asset=>`<button class="layout-asset" type="button" draggable="true" data-asset="${asset.key}" title="${asset.label}"><img src="${asset.file}" alt=""><span>${asset.label}</span></button>`).join('');
    assetTray.dataset.count=String(visible.length);
  }
  categorySelect.addEventListener('change',renderAssetTray);
  assetSearch.addEventListener('input',renderAssetTray);
  renderAssetTray();

  function layerFor(anchor){ return anchor === 'frame' ? frameLayer : pageLayer; }
  function renderPlaced(){
    placedTray.replaceChildren();
    if(!state.items.length){placedTray.textContent='No elements placed yet.';return;}
    state.items.forEach((item,index)=>{
      const button=document.createElement('button');button.type='button';button.dataset.select=item.id;
      button.setAttribute('aria-pressed',String(item.id===selectedId));
      button.textContent=`${index+1}. ${byKey[item.asset]?.label||'Unknown element'} · ${item.anchor==='frame'?'offering frame':'whole page'}`;
      placedTray.append(button);
    });
  }
  function render(){
    pageLayer.replaceChildren();frameLayer.replaceChildren();
    for(const item of state.items){
      const asset = byKey[item.asset]; if(!asset) continue;
      const image = document.createElement('img');
      image.className = `jewellery-piece${item.id===selectedId?' is-selected':''}`;
      image.dataset.id = item.id;image.src = asset.file;image.alt = '';
      image.style.cssText = `left:${item.x}%;top:${item.y}%;width:${item.width}px;opacity:${state.visible?item.opacity:0};z-index:${item.z};transform:translate(-50%,-10%) rotate(${item.rotation}deg) scaleX(${item.flip?-1:1})`;
      image.tabIndex = editing ? 0 : -1;
      layerFor(item.anchor).append(image);
    }
    pageLayer.classList.toggle('has-selection',editing&&selected()?.anchor==='page');
    visibilityButton.textContent = state.visible ? 'Hide pieces' : 'Show pieces';
    renderPlaced();
    syncControls();
  }
  function syncControls(){
    const item=selected(); const disabled=!item;
    Object.values(controls).forEach(control=>control.disabled=disabled);
    editor.querySelectorAll('[data-action="flip"],[data-action="duplicate"],[data-action="delete"],[data-action="back"],[data-action="front"]').forEach(button=>button.disabled=disabled);
    if(!item) return;
    controls.anchor.value=item.anchor;controls.opacity.value=Math.round(item.opacity*100);controls.width.value=item.width;controls.rotation.value=item.rotation;
  }
  function announce(message){ status.textContent=message; }
  function add(assetKey,anchorOverride,point){
    const asset=byKey[assetKey];if(!asset)return;
    const anchor=anchorOverride||asset.anchor;const target=anchor==='frame'?frame:app;const rect=target.getBoundingClientRect();
    const x=point?clamp((point.clientX-rect.left)/rect.width*100,0,100):50;
    const y=point?clamp((point.clientY-rect.top)/rect.height*100,0,100):(anchor==='frame'?42:24);
    const maxZ=Math.max(0,...state.items.map(item=>item.z||0));
    const item={id:uid(),asset:assetKey,anchor,x:+x.toFixed(3),y:+y.toFixed(3),width:asset.width,rotation:0,flip:false,opacity:1,z:maxZ+1};
    state.items.push(item);selectedId=item.id;state.visible=true;save();render();announce(`${asset.label} added. Drag it into place.`);
  }
  function select(id,rerender=true){
    selectedId=id;
    if(rerender){render();return;}
    document.querySelectorAll('.jewellery-piece').forEach(piece=>piece.classList.toggle('is-selected',piece.dataset.id===id));
    pageLayer.classList.toggle('has-selection',editing&&selected()?.anchor==='page');
    placedTray.querySelectorAll('[data-select]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.select===id)));
    syncControls();
  }
  function open(){
    document.querySelector('.tab[data-view="play"]')?.click();
    editing=true;editor.hidden=false;setCollapsed(false);document.body.classList.add('layout-editing');render();
    setTimeout(()=>editor.querySelector('[data-action="done"]').focus(),0);
  }
  function close(){ editing=false;editor.hidden=true;setCollapsed(false);document.body.classList.remove('layout-editing');selectedId=null;save();render();openButton.focus(); }

  openButton.addEventListener('click',open);
  editor.addEventListener('click',event=>{
    const placedButton=event.target.closest('[data-select]');if(placedButton){select(placedButton.dataset.select);if(matchMedia('(max-width:1100px)').matches)setCollapsed(true);return;}
    const assetButton=event.target.closest('[data-asset]');if(assetButton){add(assetButton.dataset.asset);if(matchMedia('(max-width:1100px)').matches)setCollapsed(true);return;}
    const action=event.target.closest('[data-action]')?.dataset.action;if(!action)return;
    const item=selected();
    if(action==='done'){close();return;}
    if(action==='collapse'){setCollapsed(!editor.classList.contains('is-collapsed'));return;}
    if(action==='flip'&&item)item.flip=!item.flip;
    if(action==='duplicate'&&item){const copy={...item,id:uid(),x:clamp(item.x+3,0,100),y:clamp(item.y+3,0,100),z:item.z+1};state.items.push(copy);selectedId=copy.id;}
    if(action==='delete'&&item){state.items=state.items.filter(entry=>entry.id!==item.id);selectedId=null;}
    if(action==='back'&&item)item.z=Math.max(0,item.z-1);
    if(action==='front'&&item)item.z=Math.max(0,...state.items.map(entry=>entry.z))+1;
    if(action==='clear'&&confirm('Remove every placed jewellery piece?')){state=emptyState();selectedId=null;}
    if(action==='visibility')state.visible=!state.visible;
    if(action==='copy')copyLayout();
    save();render();
  });
  editor.addEventListener('input',event=>{
    const item=selected();const control=event.target.dataset.control;if(!item||!control)return;
    if(control==='anchor'){ moveAnchor(item,event.target.value);return; }
    if(control==='opacity')item.opacity=Number(event.target.value)/100;
    if(control==='width')item.width=Number(event.target.value);
    if(control==='rotation')item.rotation=Number(event.target.value);
    save();render();
  });
  editor.addEventListener('dragstart',event=>{const button=event.target.closest('[data-asset]');if(button)event.dataTransfer.setData('text/x-rook-asset',button.dataset.asset);});
  app.addEventListener('dragover',event=>{if(editing&&event.dataTransfer?.types.includes('text/x-rook-asset'))event.preventDefault();});
  app.addEventListener('drop',event=>{
    if(!editing)return;const key=event.dataTransfer?.getData('text/x-rook-asset');if(!key)return;
    event.preventDefault();event.stopPropagation();const rect=frame.getBoundingClientRect();
    const anchor=event.clientX>=rect.left&&event.clientX<=rect.right&&event.clientY>=rect.top&&event.clientY<=rect.bottom?'frame':'page';
    add(key,anchor,event);if(matchMedia('(max-width:1100px)').matches)setCollapsed(true);
  });
  [pageLayer,frameLayer].forEach(layer=>{
    layer.addEventListener('pointerdown',startDrag);
    layer.addEventListener('click',event=>{if(event.target===layer)select(null);});
  });
  function startDrag(event){
    const image=event.target.closest('.jewellery-piece');if(!image)return;
    event.preventDefault();event.stopPropagation();select(image.dataset.id,false);
    const item=selected();const target=item.anchor==='frame'?frame:app;const rect=target.getBoundingClientRect();
    const originX=rect.left+item.x/100*rect.width;const originY=rect.top+item.y/100*rect.height;
    const offsetX=event.clientX-originX;const offsetY=event.clientY-originY;
    image.setPointerCapture?.(event.pointerId);
    const move=moveEvent=>{item.x=+clamp((moveEvent.clientX-offsetX-rect.left)/rect.width*100,0,100).toFixed(3);item.y=+clamp((moveEvent.clientY-offsetY-rect.top)/rect.height*100,0,100).toFixed(3);const live=layerFor(item.anchor).querySelector(`[data-id="${item.id}"]`);if(live){live.style.left=`${item.x}%`;live.style.top=`${item.y}%`;}};
    const end=()=>{document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',end);document.removeEventListener('pointercancel',end);save();announce('Position saved.');};
    document.addEventListener('pointermove',move);document.addEventListener('pointerup',end,{once:true});document.addEventListener('pointercancel',end,{once:true});
  }
  function moveAnchor(item,nextAnchor){
    if(item.anchor===nextAnchor)return;
    const image=layerFor(item.anchor).querySelector(`[data-id="${item.id}"]`);const center=image?.getBoundingClientRect();const target=nextAnchor==='frame'?frame:app;const rect=target.getBoundingClientRect();
    item.x=+clamp(((center?.left||rect.left)+(center?.width||0)/2-rect.left)/rect.width*100,0,100).toFixed(3);
    item.y=+clamp(((center?.top||rect.top)+(center?.height||0)/2-rect.top)/rect.height*100,0,100).toFixed(3);item.anchor=nextAnchor;save();render();
  }
  document.addEventListener('keydown',event=>{
    if(!editing)return;const item=selected();
    if(event.key==='Escape'){close();return;}
    if(!item||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;
    event.preventDefault();const step=event.shiftKey?1:.2;
    if(event.key==='ArrowLeft')item.x-=step;if(event.key==='ArrowRight')item.x+=step;if(event.key==='ArrowUp')item.y-=step;if(event.key==='ArrowDown')item.y+=step;
    item.x=+clamp(item.x,0,100).toFixed(3);item.y=+clamp(item.y,0,100).toFixed(3);save();render();
  });
  async function copyLayout(){
    const text=JSON.stringify(state,null,2);
    try{await navigator.clipboard.writeText(text);announce('Layout copied — paste it into our Codex chat.');}
    catch{const area=document.createElement('textarea');area.value=text;document.body.append(area);area.select();document.execCommand('copy');area.remove();announce('Layout copied — paste it into our Codex chat.');}
  }
  render();
})();
