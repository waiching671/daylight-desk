/* Additive daylight workspace. Existing life records and Chambers are untouched. */
function ensureDeskArchives(){
  if(!state.deskArchives || typeof state.deskArchives!=='object' || Array.isArray(state.deskArchives)) state.deskArchives={version:1,work:[],study:[]};
  for(const area of ['work','study']) if(!Array.isArray(state.deskArchives[area])) state.deskArchives[area]=[];
  return state.deskArchives;
}
function deskRecords(area){return ensureDeskArchives()[area];}
function deskSafeUrl(value){
  try{const url=new URL(value);return ['https:','http:'].includes(url.protocol)?url.href:'';}catch{return '';}
}
function persistDeskArchives(){
  try{localStorage.setItem(KEY,JSON.stringify(state));return true;}
  catch{showToast('未能儲存，裝置儲存空間可能不足。請先匯出資料。');return false;}
}
function renderWorkspace(){
  const areas=[
    ['🏠','個人','留意今天，也為自己留下記錄。',[['今日','today'],['財務','finance'],['日記','journal'],['復盤','review'],['生活節奏','time']]],
    ['💼','工作','把要處理的事、工作筆記和參考資料放在一起。',[['進入工作','workdesk']]],
    ['📖','學習','為感興趣的主題，慢慢累積理解與筆記。',[['進入學習','studydesk']]],
    ['🌿','健康','記下身體的變化，照顧日常的自己。',[['身體・飲食・運動','weightloss']]],
    ['🎞️','娛樂','收藏喜歡的作品、想去的地方和感興趣的消息。',[['書影音','media'],['旅遊','travel'],['新聞','news']]]
  ];
  const root=document.querySelector('#sec-workspace');
  root.innerHTML=`<header class="workspace-intro"><div class="workspace-date">${esc(new Date().toLocaleDateString('zh-Hant',{year:'numeric',month:'long',day:'numeric',weekday:'long'}))}</div><h1>我的工作台</h1><p>生活的不同部分，都在這裡。</p></header><div class="workspace-areas">${areas.map(([icon,title,desc,links])=>`<section class="workspace-area"><h2><span>${icon}</span>${title}</h2><p>${desc}</p><div class="workspace-area-links">${links.map(([label,target])=>`<button data-desk-go="${target}">${label} <span aria-hidden="true">↗</span></button>`).join('')}</div></section>`).join('')}</div>`;
  root.querySelectorAll('[data-desk-go]').forEach(b=>b.onclick=()=>go(b.dataset.deskGo));
}
function renderDeskArchive(area){
  const work=area==='work', root=document.querySelector(work?'#sec-workdesk':'#sec-studydesk');
  const kinds={item:work?'工作事項':'學習主題',note:work?'工作筆記':'學習筆記',resource:'資料收藏'};
  let filter='all',editingId='';
  root.innerHTML=`<div class="page-header"><h1>${work?'工作':'學習'}</h1><button class="btn" data-new>新增記錄</button></div>
    <div class="desk-toolbar"><div class="desk-tabs" role="tablist" aria-label="記錄種類">${[['all','全部'],...Object.entries(kinds)].map(([key,label])=>`<button role="tab" data-kind="${key}" aria-selected="${key==='all'}">${label}</button>`).join('')}</div><input class="desk-search" type="search" aria-label="搜尋記錄" placeholder="搜尋標題、主題或內容…"></div>
    <form class="desk-editor" hidden><div class="desk-editor-grid">
    <label>種類<select name="kind">${Object.entries(kinds).map(([key,label])=>`<option value="${key}">${label}</option>`).join('')}</select></label>
    <label>日期<input type="date" name="date" required></label>
    <label class="desk-wide">標題<input name="title" required maxlength="200" placeholder="${work?'想處理或記下的事':'想了解的主題'}"></label>
    <label>相關${work?'事項':'主題'}（選填）<input name="topic" placeholder="用相同名稱整理相關記錄"></label>
    <label>連結（選填）<input type="url" name="url" placeholder="https://"></label>
    <label class="desk-wide">內容<textarea name="body" placeholder="慢慢記下內容、想法或重點…"></textarea></label>
    <label data-status-label>狀態<select name="status"><option value="open">${work?'待處理':'探索中'}</option><option value="done">${work?'已處理':'告一段落'}</option></select></label>
    </div><div class="desk-editor-actions"><button type="button" data-cancel>取消</button><button type="submit" class="btn">儲存記錄</button></div></form><div class="desk-records"></div>`;
  const form=root.querySelector('form'),field=name=>form.elements.namedItem(name),list=root.querySelector('.desk-records');
  function updateStatus(){form.querySelector('[data-status-label]').hidden=field('kind').value!=='item';}
  function edit(record){
    editingId=record?.id||'';form.reset();
    for(const key of ['kind','date','title','topic','url','body','status']) field(key).value=record?.[key]||({kind:filter==='all'?'item':filter,date:today(),status:'open'}[key]||'');
    updateStatus();form.hidden=false;field('title').focus();
  }
  function draw(){
    const q=root.querySelector('.desk-search').value.trim().toLowerCase();
    const rows=deskRecords(area).filter(x=>(filter==='all'||x.kind===filter)&&[x.title,x.topic,x.body,x.date,x.url].join(' ').toLowerCase().includes(q)).slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
    list.innerHTML=rows.length?rows.map(x=>`<article class="desk-record" data-record="${esc(x.id)}"><div class="desk-record-meta"><span>${esc(kinds[x.kind]||'記錄')}</span><time>${esc(x.date||'')}</time>${x.topic?`<span>${esc(x.topic)}</span>`:''}${x.kind==='item'?`<span>${x.status==='done'?(work?'已處理':'告一段落'):(work?'待處理':'探索中')}</span>`:''}</div><h2>${esc(x.title)}</h2>${x.body?`<div class="desk-record-body">${esc(x.body)}</div>`:''}<div class="desk-record-actions">${deskSafeUrl(x.url)?`<a href="${esc(deskSafeUrl(x.url))}" target="_blank" rel="noopener noreferrer">開啟資料 ↗</a>`:''}<button data-edit>編輯</button><button class="desk-delete" data-delete>刪除</button></div></article>`).join(''):`<p class="desk-empty">${q?'沒有符合的記錄。':'這裡還沒有記錄。從一則'+(work?'事項或筆記':'主題或筆記')+'開始吧。'}</p>`;
    list.querySelectorAll('[data-record]').forEach(el=>{
      const id=el.dataset.record;
      el.querySelector('[data-edit]').onclick=()=>edit(deskRecords(area).find(x=>x.id===id));
      el.querySelector('[data-delete]').onclick=()=>{
        if(!confirm('確定刪除這則記錄？刪除後只能從你先前匯出的資料包還原。'))return;
        const previous=deskRecords(area);state.deskArchives[area]=previous.filter(x=>x.id!==id);
        if(!persistDeskArchives()){state.deskArchives[area]=previous;return;}
        if(editingId===id){form.hidden=true;editingId='';}draw();showToast('已刪除記錄');
      };
    });
  }
  root.querySelector('[data-new]').onclick=()=>edit();
  root.querySelector('[data-cancel]').onclick=()=>{form.hidden=true;editingId='';};
  field('kind').onchange=updateStatus;
  root.querySelector('.desk-search').oninput=draw;
  root.querySelectorAll('[data-kind]').forEach(b=>b.onclick=()=>{filter=b.dataset.kind;root.querySelectorAll('[data-kind]').forEach(t=>t.setAttribute('aria-selected',String(t===b)));draw();});
  form.onsubmit=e=>{
    e.preventDefault();const title=field('title').value.trim(),url=field('url').value.trim();
    if(!title){field('title').focus();return;}
    if(url&&!deskSafeUrl(url)){showToast('連結請使用 http:// 或 https://');return;}
    const previous=deskRecords(area),old=previous.find(x=>x.id===editingId),now=new Date().toISOString();
    const entry={...old,id:old?.id||uid(),createdAt:old?.createdAt||now,updatedAt:now};
    for(const key of ['kind','date','topic','body','status'])entry[key]=field(key).value;
    entry.title=title;entry.url=url;
    state.deskArchives[area]=old?previous.map(x=>x.id===old.id?entry:x):[...previous,entry];
    if(!persistDeskArchives()){state.deskArchives[area]=previous;return;}
    form.hidden=true;editingId='';draw();showToast('已儲存記錄');
  };
  draw();
}
