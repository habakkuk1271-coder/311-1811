(function(){
  const C=window.APP_CONFIG||{};
  const K='3111811_v2_public_cache';
  const API_URL=String(C.API_URL||'').replace(/[/]$/,'');
  function items(o){
    if(!o||typeof o!=='object') return [];
    if(Array.isArray(o.items)) return o.items.filter(Boolean).map(String);
    return Object.keys(o).filter(k=>/^item[0-9]+$/i.test(k)).sort((a,b)=>Number(a.slice(4))-Number(b.slice(4))).map(k=>o[k]).filter(Boolean).map(String);
  }
  function normalize(data){
    const d=data&&typeof data==='object'?data:{};
    const events=Array.isArray(d.events)?d.events:[];
    return {...d,notice:{...(d.notice||{}),items:items(d.notice)},practice:{...(d.practice||{}),items:items(d.practice)},event:d.event||events.find(e=>String(e.lifecycle||'').toLowerCase()==='current')||null,events,archive:Array.isArray(d.archive)?d.archive:[],templates:Array.isArray(d.templates)?d.templates:[]};
  }
  async function getPublic(){
    try{
      if(!API_URL) throw new Error('API URL is not configured');
      const controller=new AbortController();
      const timeout=setTimeout(()=>controller.abort(),8000);
      let r;
      try{r=await fetch(API_URL+'?action=public&t='+Date.now(),{cache:'no-store',signal:controller.signal});}
      finally{clearTimeout(timeout);}
      if(!r.ok) throw new Error('HTTP '+r.status);
      const j=await r.json();
      if(!j.ok) throw new Error(j.error||'API error');
      const data=normalize(j.data);
      localStorage.setItem(K,JSON.stringify({at:Date.now(),data}));
      return {data,cached:false};
    }catch(e){
      try{const raw=localStorage.getItem(K);if(raw){const c=JSON.parse(raw);return {data:normalize(c.data),cached:true,cachedAt:c.at,error:String(e)}}}catch(_){/* ignore malformed cache */}
      throw e;
    }
  }
  window.SiteAPI={getPublic,normalize};
})();
