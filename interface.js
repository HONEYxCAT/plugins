(function(){
  "use strict";

  var SOURCES={tmdb:1,cub:1}, COMPONENTS={category:1}, MIN_WIDTH=767;

  // ===== UI: заметная диагностика =====
  function injectDiag(){
    if(document.getElementById("ni-diag-style")) return;
    document.head.insertAdjacentHTML("beforeend", `
      <style id="ni-diag-style">
        .ni-diag{position:fixed;z-index:9999999;left:0;right:0;top:0;padding:6px 10px;background:#b00020;color:#fff;font:14px/1.2 system-ui,Segoe UI,Roboto}
        .ni-diag b{font-weight:700}
        .ni-hide{display:none!important}
      </style>
    `);
    var bar=document.createElement("div"); bar.className="ni-diag ni-hide"; bar.id="ni-bar";
    bar.innerHTML='new-interface: <b id="ni-cards">0</b> cards · mount: <b id="ni-mount">none</b>';
    document.body.appendChild(bar);
  }
  function diagShow(){ var el=document.getElementById("ni-bar"); if(el) el.classList.remove("ni-hide"); }
  function diagSet(cards,where){ var b=document.getElementById("ni-bar"); if(!b) return; b.querySelector("#ni-cards").textContent=cards; b.querySelector("#ni-mount").textContent=where; }

  // ===== стиль макета из исходника =====
  function injectStyles(){
    if(document.getElementById("new_interface_style_dom")) return;
    document.head.insertAdjacentHTML("beforeend", `
    <style id="new_interface_style_dom">
      .new-interface{position:relative}
      .new-interface .card--small.card--wide{width:18.3em;}
      .new-interface-info{position:relative;padding:1.5em;height:24em;}
      .new-interface-info__body{width:80%;padding-top:1.1em;}
      .new-interface-info__head{color:rgba(255,255,255,.6);margin-bottom:1em;font-size:1.3em;min-height:1em;}
      .new-interface-info__head span{color:#fff;}
      .new-interface-info__title{font-size:4em;font-weight:600;margin-bottom:.3em;overflow:hidden;display:-webkit-box;-webkit-line-clamp:1;line-clamp:1;-webkit-box-orient:vertical;margin-left:-.03em;line-height:1.3;}
      .new-interface-info__details{margin-bottom:1.6em;display:flex;align-items:center;flex-wrap:wrap;min-height:1.9em;font-size:1.1em;}
      .new-interface-info__split{margin:0 1em;font-size:.7em;}
      .new-interface-info__description{font-size:1.2em;font-weight:300;line-height:1.5;overflow:hidden;display:-webkit-box;-webkit-line-clamp:4;line-clamp:4;-webkit-box-orient:vertical;width:70%;}
      .new-interface .card-more__box{padding-bottom:95%;}
      .new-interface .full-start__background{position:absolute;left:0;right:0;width:100%;height:108%;top:-6em;object-fit:cover;opacity:0;transition:opacity .25s;}
      .new-interface .full-start__background.loaded{opacity:.35;}
      .new-interface .full-start__rate{font-size:1.3em;margin-right:0;}
      .new-interface .card__promo{display:none;}
      .new-interface .card.card--wide+.card-more .card-more__box{padding-bottom:95%;}
      .new-interface .card.card--wide .card-watched{display:none!important;}
      body.light--version .new-interface-info__body{width:69%;padding-top:1.5em;}
      body.light--version .new-interface-info{height:25.3em;}
      body.advanced--animation:not(.no--animation) .new-interface .card--small.card--wide.focus .card__view{animation:animation-card-focus .2s}
      body.advanced--animation:not(.no--animation) .new-interface .card--small.card--wide.animate-trigger-enter .card__view{animation:animation-trigger-enter .2s forwards}
    </style>`);
  }

  // ===== Info-панель + фон =====
  function InfoBlock(){
    var html, timer, req=new Lampa.Reguest(), cache={}, bgImg, bgLast="", bgTimer;
    this.create=function(){
      html = document.createElement("div");
      html.className="new-interface";
      html.innerHTML = `
        <img class="full-start__background" alt="">
        <div class="new-interface-info">
          <div class="new-interface-info__body">
            <div class="new-interface-info__head"></div>
            <div class="new-interface-info__title"></div>
            <div class="new-interface-info__details"></div>
            <div class="new-interface-info__description"></div>
          </div>
        </div>`;
      bgImg = html.querySelector(".full-start__background");
    };
    this.render=function(){ return html; };
    this.update=function(d){
      if(!d) return;
      html.querySelector(".new-interface-info__head").textContent="---";
      html.querySelector(".new-interface-info__details").textContent="---";
      html.querySelector(".new-interface-info__title").textContent=d.title||d.name||"";
      html.querySelector(".new-interface-info__description").textContent=d.overview||Lampa.Lang.translate("full_notext")||"";
      this._bg(d.backdrop_path||d.poster_path,"w200");
      this.load(d);
    };
    this.draw=function(full){
      var year=((full.release_date||full.first_air_date||"0000")+"").slice(0,4);
      var vote=parseFloat((full.vote_average||0)+"").toFixed(1);
      var tm=Lampa.Api.sources&&Lampa.Api.sources.tmdb;
      var countries=tm&&tm.parseCountries?tm.parseCountries(full):[];
      var pg=tm&&tm.parsePG?tm.parsePG(full):"";
      var head=[], details=[];
      if(year!=="0000") head.push("<span>"+year+"</span>");
      if(countries.length) head.push(countries.join(", "));
      if(+vote>0) details.push('<div class="full-start__rate"><div>'+vote+'</div><div>TMDB</div></div>');
      if(full.genres&&full.genres.length) details.push(full.genres.map(function(i){return Lampa.Utils.capitalizeFirstLetter(i.name);}).join(" | "));
      if(full.runtime) details.push(Lampa.Utils.secondsToTime(full.runtime*60,true));
      if(pg) details.push('<span class="full-start__pg" style="font-size:0.9em;">'+pg+'</span>');
      html.querySelector(".new-interface-info__head").innerHTML=head.join(", ");
      html.querySelector(".new-interface-info__details").innerHTML=details.join('<span class="new-interface-info__split">&#9679;</span>');
      this._bg(full.backdrop_path||full.poster_path,"w1280");
    };
    this._bg=function(path,size){
      if(!path) return;
      var src=Lampa.Api.img(path,size||"w1280");
      clearTimeout(bgTimer);
      if(src===bgLast) return;
      bgTimer=setTimeout(function(){
        bgImg.classList.remove("loaded");
        bgImg.onload=function(){bgImg.classList.add("loaded");};
        bgImg.onerror=function(){bgImg.classList.remove("loaded");};
        bgLast=src; setTimeout(function(){ bgImg.src=bgLast; },200);
      },200);
    };
    this.load=function(lite){
      if(!lite||!lite.id) return;
      clearTimeout(timer);
      var lang=Lampa.Storage.get("language")||"ru-RU";
      var kind=lite.name?"tv":"movie";
      var url=Lampa.TMDB.api(kind+"/"+lite.id+"?api_key="+Lampa.TMDB.key()+"&append_to_response=content_ratings,release_dates&language="+lang);
      if(cache[url]) return this.draw(cache[url]);
      var self=this;
      timer=setTimeout(function(){
        req.clear(); req.timeout(5000);
        req.silent(url,function(m){ cache[url]=m; self.draw(m); });
      },250);
    };
  }

  // ===== поиск карточек и контейнера, включая shadowRoot =====
  function queryAllDeep(selector, root){
    var out=[];
    function walk(node){
      try{
        if(node.querySelectorAll){
          out.push.apply(out, node.querySelectorAll(selector));
        }
        if(node.shadowRoot){
          walk(node.shadowRoot);
        }
        node.childNodes&&node.childNodes.forEach(function(n){
          if(n.nodeType===1) walk(n);
        });
      }catch(e){}
    }
    walk(root||document);
    return out;
  }
  function findCategoryRootDeep(){
    var sels=[".category",".content--category","[data-component='category']",".content__body",".content"];
    for(var i=0;i<sels.length;i++){
      var list=queryAllDeep(sels[i], document);
      if(list.length) return list[0];
    }
    return null;
  }

  // ===== крепление макета =====
  var mounted=false, info=null, mountWhere="none";
  function mount(){
    injectStyles(); injectDiag(); diagShow();

    var root=findCategoryRootDeep();
    if(!root){ // жёсткий фолбэк
      root=document.body;
    }
    if(mounted) return;
    info=new InfoBlock(); info.create();
    // в начало контейнера
    (root.firstElementChild?root.insertBefore(info.render(),root.firstElementChild):root.appendChild(info.render()));
    mounted=true; mountWhere = (root===document.body?"body-top":(root.className||root.tagName));
    diagSet(document.querySelectorAll(".card").length, mountWhere);
    wire(root);
  }

  // ===== события карточек =====
  function getCardData(el){
    var d=null;
    if(el&&el.dataset&&el.dataset.card){ try{ d=JSON.parse(el.dataset.card); }catch(e){} }
    if(!d){
      var t=el.getAttribute("data-title")||(el.querySelector(".card__title,[data-title]")||{}).textContent||"";
      var id=+(el.getAttribute("data-id")||0);
      d={title:t,name:t,id:id,overview:""};
    }
    return d;
  }
  function wire(root){
    function handle(target){
      var card=target&&target.closest&&target.closest(".card");
      if(!card||!info) return;
      info.update(getCardData(card));
      diagSet(queryAllDeep(".card",document).length, mountWhere);
    }
    root.addEventListener("mouseover", function(e){ handle(e.target); }, {passive:true});
    root.addEventListener("focusin", function(e){ handle(e.target); });
    // наблюдаем появление карточек
    var mo=new MutationObserver(function(){ diagSet(queryAllDeep(".card",document).length, mountWhere); });
    mo.observe(document.body,{childList:true,subtree:true});
  }

  // ===== запуск по активити =====
  function onActivityStart(a){
    if(!a) return;
    if(window.innerWidth<MIN_WIDTH) return;
    if(!SOURCES[a.source]) return;
    if(!COMPONENTS[a.component]) return;
    // ждём DOM категории
    var tries=0, id=setInterval(function(){
      var cards=queryAllDeep(".card",document).length;
      if(cards>0 || ++tries>50){ clearInterval(id); mount(); }
    },120);
  }

  function start(){
    try{
      Lampa.Listener.follow("activity", function(e){
        if(e.type==="start") onActivityStart(e.object||{});
      });
      // если уже открыта категория
      var act=Lampa.Activity&&Lampa.Activity.active&&Lampa.Activity.active();
      if(act) onActivityStart(act);
    }catch(e){ mount(); }
  }

  if(window.appready) start();
  else if(Lampa.Listener&&Lampa.Listener.follow){
    Lampa.Listener.follow("app", function(e){ if(e.type==="ready") start(); });
  } else {
    var t=setInterval(function(){ if(window.Lampa&&Lampa.Manifest){ clearInterval(t); start(); } },100);
  }
})();
