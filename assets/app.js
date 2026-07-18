(function(){
  var DAY = window.BANTIN_DAY || 'unknown';
  var CFG = window.BANTIN_CONFIG || {};
  var SHEET_URL = CFG.SHEET_URL || '';
  var QUOTES = window.QUOTES || [{q:'—',a:''}];

  // ---- Quote rotation ----
  var qText=document.getElementById('qText'), qAuthor=document.getElementById('qAuthor');
  var qi = Math.floor(Math.abs(new Date(DAY).getTime()/86400000)) % QUOTES.length;
  if(isNaN(qi)) qi=0;
  function paintQuote(){
    if(!qText) return;
    qText.style.opacity=0; qAuthor.style.opacity=0;
    setTimeout(function(){ qText.textContent=QUOTES[qi].q; qAuthor.textContent=QUOTES[qi].a; qText.style.opacity=1; qAuthor.style.opacity=1; },260);
  }
  paintQuote();
  var qTimer=setInterval(function(){ qi=(qi+1)%QUOTES.length; paintQuote(); },14000);
  var qBox=document.getElementById('quoteBox');
  if(qBox) qBox.addEventListener('click', function(){ qi=(qi+1)%QUOTES.length; paintQuote(); clearInterval(qTimer); qTimer=setInterval(function(){qi=(qi+1)%QUOTES.length;paintQuote();},14000); });

  // ---- Read / Like state ----
  var STORE='bantin-'+DAY, state={};
  try{ state=JSON.parse(localStorage.getItem(STORE)||'{}'); }catch(e){ state={}; }
  function save(){ try{ localStorage.setItem(STORE, JSON.stringify(state)); }catch(e){} }
  var items=Array.prototype.slice.call(document.querySelectorAll('.item'));
  var total=items.length;
  function progress(){
    var r=items.filter(function(el){ var s=state[el.dataset.id]; return s&&s.read; }).length;
    var f=document.getElementById('progFill'); if(f) f.style.width=(r/total*100)+'%';
    var l=document.getElementById('progLabel'); if(l) l.textContent=r+'/'+total;
  }

  // ---- Toast ----
  var toast=document.getElementById('toast'), tt;
  function showToast(m){ if(!toast) return; toast.textContent=m; toast.classList.add('show'); clearTimeout(tt); tt=setTimeout(function(){toast.classList.remove('show');},2200); }
  function copy(text, msg){
    if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(text).then(function(){showToast(msg);},function(){window.prompt('Sao chép:',text);}); }
    else window.prompt('Sao chép:',text);
  }

  // ---- Sheet logging (fire-and-forget) ----
  function logToSheet(payload){
    if(!SHEET_URL) return;
    try{ fetch(SHEET_URL,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload)}); }catch(e){}
  }

  // ---- Reader overlay ----
  var ovl=document.getElementById('ovl'), ovlBody=document.getElementById('ovlBody'),
      ovlTitle=document.getElementById('ovlTitle'), ovlMeta=document.getElementById('ovlMeta'),
      ovlSrc=document.getElementById('ovlSrc'), ovlCopy=document.getElementById('ovlCopy');
  var curUrl='';
  function openReader(el){
    var slug=el.dataset.slug, url=el.dataset.url, src=el.dataset.source||'', title=el.querySelector('h3').textContent;
    curUrl=url;
    ovlTitle.textContent=title; ovlMeta.textContent=src; ovlSrc.href=url;
    ovlBody.innerHTML='<div class="ovl-note">Đang tải bản sạch…</div>';
    ovl.classList.add('show'); document.body.style.overflow='hidden';
    fetch('read/'+DAY+'/'+slug+'.html',{cache:'no-store'}).then(function(r){ if(!r.ok) throw 0; return r.text(); })
      .then(function(html){ ovlBody.innerHTML=html; })
      .catch(function(){ ovlBody.innerHTML='<div class="ovl-note">Bản sạch cho tin này chưa có (sẽ tự tạo từ số kế tiếp). Tạm thời mở bài gốc bằng nút phía trên.</div><p>'+(el.querySelector('p')?el.querySelector('p').textContent:'')+'</p>'; });
  }
  function closeReader(){ ovl.classList.remove('show'); document.body.style.overflow=''; }
  if(ovl){
    document.getElementById('ovlClose').addEventListener('click', closeReader);
    ovl.addEventListener('click', function(e){ if(e.target===ovl) closeReader(); });
    document.addEventListener('keydown', function(e){ if(e.key==='Escape') closeReader(); });
    if(ovlCopy) ovlCopy.addEventListener('click', function(){ copy(curUrl,'Đã copy link bài gốc'); });
  }

  // ---- Build per-item controls ----
  items.forEach(function(el){
    var id=el.dataset.id, url=el.dataset.url;
    var st=state[id]||{read:false,like:false}; state[id]=st;
    st.channel=el.closest('.ch').querySelector('h2').textContent.trim();
    st.title=el.querySelector('h3').textContent.trim();
    var acts=document.createElement('div'); acts.className='actions';
    var bRead=document.createElement('span'); bRead.className='act'; bRead.innerHTML='✓ Đã đọc';
    var bLike=document.createElement('span'); bLike.className='act'; bLike.innerHTML='♥ Thích';
    var bRead2=document.createElement('span'); bRead2.className='act'; bRead2.innerHTML='▤ Bản sạch';
    var bCopy=document.createElement('span'); bCopy.className='act'; bCopy.innerHTML='⧉ Copy link';
    acts.appendChild(bRead); acts.appendChild(bLike); acts.appendChild(bRead2); acts.appendChild(bCopy);
    el.appendChild(acts);
    function paint(){
      if(st.read){el.classList.add('read');bRead.classList.add('on-read');}else{el.classList.remove('read');bRead.classList.remove('on-read');}
      if(st.like){bLike.classList.add('on-like');}else{bLike.classList.remove('on-like');}
    }
    bRead.addEventListener('click', function(){ st.read=!st.read; if(!st.read)st.like=false; paint(); save(); progress(); });
    bLike.addEventListener('click', function(){
      st.like=!st.like; if(st.like)st.read=true; paint(); save(); progress();
      logToSheet({day:DAY,id:id,channel:st.channel,title:st.title,url:url,action:st.like?'like':'unlike',ts:new Date().toISOString()});
    });
    bRead2.addEventListener('click', function(){ openReader(el); });
    bCopy.addEventListener('click', function(){ copy(url,'Đã copy link'); });
    paint();
  });
  progress(); save();

  // ---- Copy review log ----
  var copyBtn=document.getElementById('copyBtn');
  if(copyBtn) copyBtn.addEventListener('click', function(){
    var liked=[],read=[],skipped=[];
    items.forEach(function(el){ var s=state[el.dataset.id]; var line='- ['+s.channel+'] '+s.title; if(s.like)liked.push(line); else if(s.read)read.push(line); else skipped.push(line); });
    var out='Cập nhật reading-preferences.md từ nhật ký đọc Bản tin sáng '+DAY+'.\n';
    out+='Áp quy ước điểm: THÍCH +2, ĐỌC (không thích) +1, BỎ QUA -1 cho chủ đề & nguồn; ghi 1 dòng xu hướng và nhật ký review.\n\n';
    out+='THÍCH ('+liked.length+'):\n'+(liked.join('\n')||'- (không có)')+'\n\n';
    out+='ĐỌC ('+read.length+'):\n'+(read.join('\n')||'- (không có)')+'\n\n';
    out+='BỎ QUA ('+skipped.length+'):\n'+(skipped.join('\n')||'- (không có)')+'\n';
    copy(out,'Đã sao chép nhật ký — Dispatch vào Cowork');
  });
})();
