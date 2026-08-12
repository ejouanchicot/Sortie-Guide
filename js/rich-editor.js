/* ============================================================
   rich-editor.js — EDITEUR DE TEXTE ENRICHI (contenteditable)
   ------------------------------------------------------------
   Extrait de tools/map-studio.js : ces fonctions ne touchent ni a
   Konva ni a l'etat de l'editeur de carte. C'est du DOM pur, pilote
   par ses parametres : une zone contenteditable, une barre d'outils,
   la casse et les listes appliquees a la SELECTION ou a la ligne du
   curseur, et la serialisation vers le HTML inline restreint du
   projet (<b> <i> <u> <s> + <span style=color>).

   Depend de window.SORTIE (parseInline / runsToHtml / stripRuns /
   escAttr). Expose window.RICH. Charge AVANT map-studio.js.
   ============================================================ */
(function(global){
  "use strict";
  var S=global.SORTIE, esc=S.escAttr;

  /* ============================================================
     ÉDITEUR DE TEXTE ENRICHI (contenteditable) — partagé texte + labels
     Styles inline (gras/ital/soul/barré/couleur) sur la SÉLECTION.
     ============================================================ */
  function _hx(c){if(!c)return null;c=String(c).trim();if(c[0]==='#')return c;var n=c.match(/[\d.]+/g);if(!n||n.length<3)return c;return '#'+n.slice(0,3).map(function(v){v=Math.max(0,Math.min(255,Math.round(parseFloat(v))));var h=v.toString(16);return h.length<2?'0'+h:h;}).join('');}
  function _styleOf(el){var st={b:false,i:false,u:false,s:false,c:null},tag=el.tagName.toLowerCase();
    if(tag==='b'||tag==='strong')st.b=true;if(tag==='i'||tag==='em')st.i=true;if(tag==='u')st.u=true;if(tag==='s'||tag==='strike'||tag==='del')st.s=true;
    if(tag==='font'&&el.getAttribute('color'))st.c=el.getAttribute('color');
    var cs=el.style;if(cs){var fw=cs.fontWeight||'';if(fw==='bold'||fw==='bolder'||(/^\d+$/.test(fw)&&+fw>=600))st.b=true;if((cs.fontStyle||'')==='italic')st.i=true;
      var td=(cs.textDecorationLine||cs.textDecoration||'');if(td.indexOf('underline')>=0)st.u=true;if(td.indexOf('line-through')>=0)st.s=true;if(cs.color)st.c=cs.color;}
    return st;}
  // sérialise le contenu INLINE d'un nœud → HTML restreint (\n pour <br>/blocs imbriqués)
  function _inlineHtml(node){var s='';node.childNodes.forEach(function(ch){
    if(ch.nodeType===3){s+=esc(ch.nodeValue);}
    else if(ch.nodeType===1){var tag=ch.tagName.toLowerCase();
      if(tag==='br'){s+='\n';return;}
      if(tag==='div'||tag==='p'||tag==='li'){if(s&&s[s.length-1]!=='\n')s+='\n';s+=_inlineHtml(ch);s+='\n';return;}
      var st=_styleOf(ch),pre='',post='';
      if(st.b){pre+='<b>';post='</b>'+post;}if(st.i){pre+='<i>';post='</i>'+post;}
      if(st.u){pre+='<u>';post='</u>'+post;}if(st.s){pre+='<s>';post='</s>'+post;}
      if(st.c){var hx=_hx(st.c);if(hx){pre+='<span style="color:'+hx+'">';post='</span>'+post;}}
      s+=pre+_inlineHtml(ch)+post;}});
    return s;}
  function _alignMark(el){var a=((el.style&&el.style.textAlign)||(el.getAttribute&&el.getAttribute('align'))||'').toLowerCase();
    if(a.indexOf('center')>=0)return '<c>';if(a.indexOf('right')>=0)return '<r>';if(a.indexOf('left')>=0)return '<l>';return '';}
  function normalizeRich(root){var lines=[],cur='',curSet=false;function flush(){lines.push(cur);cur='';curSet=false;}root.childNodes.forEach(function(ch){if(ch.nodeType===3){cur+=esc(ch.nodeValue);curSet=true;}else if(ch.nodeType===1){var tag=ch.tagName.toLowerCase();if(tag==='br'){flush();}else if(tag==='div'||tag==='p'){if(curSet)flush();var mk=_alignMark(ch);_inlineHtml(ch).split('\n').forEach(function(pt){lines.push(mk+pt);});}else{var st=_styleOf(ch),pre='',post='';if(st.b){pre+='<b>';post='</b>'+post;}if(st.i){pre+='<i>';post='</i>'+post;}if(st.u){pre+='<u>';post='</u>'+post;}if(st.s){pre+='<s>';post='</s>'+post;}if(st.c){var hx=_hx(st.c);if(hx){pre+='<span style="color:'+hx+'">';post='</span>'+post;}}cur+=pre+_inlineHtml(ch)+post;curSet=true;}}});if(curSet||!lines.length)flush();return lines.join('\n').replace(/[ ]/g,' ').replace(/\n{3,}/g,'\n\n').replace(/^\n+/,'').replace(/\n+$/,'');}
  function richToEditableHtml(t){return String(t==null?'':t).split('\n').map(function(l){
    var mk='',m;if(m=l.match(/^<([clr])>/)){mk=m[1];l=l.slice(m[0].length);}
    var stl=mk==='c'?' style="text-align:center"':(mk==='r'?' style="text-align:right"':(mk==='l'?' style="text-align:left"':''));
    return '<div'+stl+'>'+(l===''?'<br>':l)+'</div>';}).join('');}
  function richToolbarHtml(p){var al={l:'<path d="M4 6h16M4 12h10M4 18h13"/>',c:'<path d="M4 6h16M7 12h10M6 18h12"/>',r:'<path d="M4 6h16M10 12h10M7 18h13"/>'};
    var asvg=function(x){return '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">'+x+'</svg>';};
    return '<div class="rtb" id="'+p+'_tb">'+
    '<button data-cmd="bold" title="Gras (Ctrl+B)" style="font-weight:800">G</button>'+
    '<button data-cmd="italic" title="Italique (Ctrl+I)" style="font-style:italic;font-family:Georgia,serif">I</button>'+
    '<button data-cmd="underline" title="Souligné (Ctrl+U)" style="text-decoration:underline">U</button>'+
    '<button data-cmd="strikeThrough" title="Barré" style="text-decoration:line-through">S</button>'+
    '<span class="rsep"></span>'+
    '<button data-just="justifyLeft" title="Aligner à gauche">'+asvg(al.l)+'</button>'+
    '<button data-just="justifyCenter" title="Centrer la ligne">'+asvg(al.c)+'</button>'+
    '<button data-just="justifyRight" title="Aligner à droite">'+asvg(al.r)+'</button>'+
    '<span class="rsep"></span>'+
    '<button data-case="up" title="TOUT EN MAJUSCULES">AA</button>'+
    '<button data-case="low" title="tout en minuscules">aa</button>'+
    '<button data-case="cap" title="Capitaliser (Majuscule à chaque mot)">Aa</button>'+
    '<span class="rsep"></span>'+
    '<input type="color" id="'+p+'_col" title="Couleur du texte sélectionné" value="#ffffff">'+
    ['#ffffff','#ffd76a','#5bd6ef','#ff8f6a','#8affc0','#c58bff','#ff6f9c'].map(function(c){return '<span class="rsw" data-col="'+c+'" style="background:'+c+'" title="'+c+'"></span>';}).join('')+
    '</div>';}
  function richEditorHtml(p,ph){return '<div class="reditor" id="'+p+'" contenteditable="true" spellcheck="false" data-ph="'+esc(ph||'')+'"></div>';}
  function wireRich(p,obj,field,onChange){const ed=document.getElementById(p);if(!ed)return null;
    ed.innerHTML=richToEditableHtml(obj[field]||'');
    const tb=document.getElementById(p+'_tb');let raf=null;
    function updateStates(){if(!tb)return;
      tb.querySelectorAll('button[data-cmd]').forEach(b=>{try{b.classList.toggle('on',document.queryCommandState(b.dataset.cmd));}catch(e){}});
      tb.querySelectorAll('button[data-just]').forEach(b=>{try{b.classList.toggle('on',document.queryCommandState(b.dataset.just));}catch(e){}});}
    function sync(){obj[field]=normalizeRich(ed);if(onChange)onChange();updateStates();}
    ed.addEventListener('input',()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(sync);});
    ed.addEventListener('blur',sync);ed.addEventListener('keyup',updateStates);ed.addEventListener('mouseup',updateStates);
    if(tb){tb.querySelectorAll('button[data-cmd]').forEach(b=>{b.addEventListener('mousedown',e=>e.preventDefault());
        b.addEventListener('click',()=>{ed.focus();document.execCommand(b.dataset.cmd,false,null);sync();});});
      tb.querySelectorAll('button[data-just]').forEach(b=>{b.addEventListener('mousedown',e=>e.preventDefault());
        b.addEventListener('click',()=>{ed.focus();try{document.execCommand('styleWithCSS',false,true);}catch(e){}document.execCommand(b.dataset.just,false,null);sync();});});
      const applyColor=hex=>{ed.focus();try{document.execCommand('styleWithCSS',false,true);}catch(e){}document.execCommand('foreColor',false,hex);sync();};
      const col=document.getElementById(p+'_col');if(col){col.addEventListener('mousedown',()=>ed.focus());col.addEventListener('input',()=>applyColor(col.value));}
      tb.querySelectorAll('.rsw').forEach(sw=>sw.addEventListener('mousedown',e=>{e.preventDefault();applyColor(sw.dataset.col);}));
      // MAJUSCULES / minuscules / Capitaliser sur la sélection (préserve les styles inline)
      const CASE={up:s=>s.toLocaleUpperCase(),low:s=>s.toLocaleLowerCase(),cap:s=>s.toLocaleLowerCase().replace(/(^|[^\p{L}\p{N}])(\p{L})/gu,(m,a,b)=>a+b.toLocaleUpperCase())};
      tb.querySelectorAll('button[data-case]').forEach(b=>{b.addEventListener('mousedown',e=>e.preventDefault());
        b.addEventListener('click',()=>{if(transformCase(ed,CASE[b.dataset.case]))sync();});});}
    ed._sync=sync;return ed;}
  // transforme la casse du TEXTE sélectionné sans toucher aux balises de style
  function transformCase(ed,fn){const sel=window.getSelection();if(!sel||!sel.rangeCount)return false;
    const range=sel.getRangeAt(0);if(range.collapsed||!ed.contains(range.commonAncestorContainer))return false;
    const walk=document.createTreeWalker(ed,NodeFilter.SHOW_TEXT,null),nodes=[];let n;
    while(n=walk.nextNode()){try{if(range.intersectsNode(n))nodes.push(n);}catch(e){}}
    nodes.forEach(node=>{let s=0,e=node.nodeValue.length;
      if(node===range.startContainer)s=range.startOffset;
      if(node===range.endContainer)e=range.endOffset;
      if(e>s)node.nodeValue=node.nodeValue.slice(0,s)+fn(node.nodeValue.slice(s,e))+node.nodeValue.slice(e);});
    return nodes.length>0;}
  function _caretLineIndex(ed){var sel=window.getSelection();if(!sel.rangeCount)return 0;var r=sel.getRangeAt(0);
    var pre=document.createRange();pre.selectNodeContents(ed);try{pre.setEnd(r.startContainer,r.startOffset);}catch(e){return 0;}
    var tmp=document.createElement('div');tmp.appendChild(pre.cloneContents());return (_inlineHtml(tmp).replace(/\n+$/,'').match(/\n/g)||[]).length;}
  function _setCaretLine(ed,idx){var kids=ed.children,n=kids[Math.min(idx,kids.length-1)];if(!n)return;var r=document.createRange();r.selectNodeContents(n);r.collapse(true);var s=window.getSelection();s.removeAllRanges();s.addRange(r);}


  // repère la ligne du curseur en insérant un marqueur (robuste : Shift+Enter/<br>, styles, lignes vides)
  function _caretLineByMark(ed){var sel=window.getSelection();if(!sel||!sel.rangeCount||!ed.contains(sel.anchorNode))return 0;
    var r=sel.getRangeAt(0).cloneRange();r.collapse(true);var mk=document.createElement('span');mk.textContent='';
    try{r.insertNode(mk);}catch(e){return 0;}
    var wm=normalizeRich(ed).split('\n');if(mk.parentNode)mk.parentNode.removeChild(mk);
    for(var i=0;i<wm.length;i++){if(wm[i].indexOf('')>=0)return i;}return 0;}
  // liste par ligne : agit sur la LIGNE DU CURSEUR ; le marqueur reste HORS des balises de style
  function applyListRich(o,kind,edId,field,onDone){edId=edId||'f_tt';field=field||'t';const ed=document.getElementById(edId);if(!ed)return;
    const idx=_caretLineByMark(ed);
    let lines=normalizeRich(ed).split('\n');
    if(idx>=0&&idx<lines.length){
      const runs=S.parseInline(lines[idx]),plain=runs.map(r=>r.t).join('');
      let mlen=0,m;if(m=plain.match(/^\s*([-*•][ \t]+|\d+\.[ \t]+)/))mlen=m[0].length;
      const body=S.runsToHtml(mlen?S.stripRuns(runs,mlen):runs);
      lines[idx]=(kind==='b'?'- ':kind==='n'?'1. ':'')+body;}
    o[field]=lines.join('\n');ed.innerHTML=richToEditableHtml(o[field]);if(onDone)onDone();ed.focus();_setCaretLine(ed,idx);}

  global.RICH={
    toolbarHtml:richToolbarHtml, editorHtml:richEditorHtml, toEditableHtml:richToEditableHtml,
    normalize:normalizeRich, wire:wireRich, transformCase:transformCase,
    applyList:applyListRich, caretLine:_caretLineIndex, setCaretLine:_setCaretLine
  };
})(typeof window!=="undefined"?window:this);
