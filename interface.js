(function () {
  "use strict";

  /************* CONFIG *************/
  var DEBUG = true;
  var NOTY_THROTTLE_MS = 800;
  var MIN_VERSION = 153;
  var APPLY_SOURCES = { tmdb:1, cub:1 };
  var APPLY_COMPONENTS = { category:1, main:1, feed:1 };
  /**********************************/

  var lastNoty = 0, logBuffer = [];
  function noty(s){ if(!DEBUG) return; var n=Date.now(); if(n-lastNoty<NOTY_THROTTLE_MS) return; lastNoty=n; try{Lampa.Noty.show("[new-interface] "+s);}catch(e){} }
  function dlog(){ var s=[].slice.call(arguments).join(" "); logBuffer.push(s); if(logBuffer.length>300) logBuffer.shift(); try{console.log("[new-interface]",s);}catch(e){} noty(s); }
  function dump(){ try{Lampa.Modal.open({title:"new-interface · debug",html:'<div style="white-space:pre-wrap;font-size:1em;line-height:1.45em;max-height:70vh;overflow:auto;padding:.5em;background:rgba(255,255,255,.06);border-radius:.5em;">'+logBuffer.join("\n")+"</div>",onBack:function(){Lampa.Modal.close();Lampa.Controller.toggle("content");}});}catch(e){noty("Modal error: "+(e&&e.message));} }
  function hotkey(){ try{Lampa.Controller.listener.follow("keydown",function(e){ if(!DEBUG) return; if(e.code==="KeyI"||e.keyCode===73||e.keyCode===457) dump(); }); }catch(e){} }
  function waitFor(pred,cb,ms,label){ var t0=Date.now(), id=setInterval(function(){ try{ if(pred()){clearInterval(id);cb(true);} else if(Date.now()-t0>(ms||15000)){clearInterval(id);dlog("waitFor timeout:",label||"?");cb(false);} }catch(e){clearInterval(id);dlog("waitFor error:",label||"?",e&&e.message);cb(false);} },100); return id; }

  // ---- Info panel ----
  function InfoBlock(object){
    var html, timer, network=new Lampa.Reguest(), loaded={};
    this.create=function(){ html=$('<div class="new-interface-info"><div class="new-interface-info__body"><div class="new-interface-info__head"></div><div class="new-interface-info__title"></div><div class="new-interface-info__details"></div><div class="new-interface-info__description"></div></div></div>'); };
    this.update=function(data){
      if(!html||!data) return;
      html.find(".new-interface-info__head,.new-interface-info__details").text("---");
      html.find(".new-interface-info__title").text(data.title||data.name||"");
      html.find(".new-interface-info__description").text(data.overview||Lampa.Lang.translate("full_notext"));
      if(data.backdrop_path) Lampa.Background.change(Lampa.Api.img(data.backdrop_path,"w200"));
      this.load(data);
    };
    this.draw=function(data){
      if(!html||!data) return;
      var year=((data.release_date||data.first_air_date||"0000")+"").slice(0,4);
      var vote=parseFloat((data.vote_average||0)+"").toFixed(1);
      var head=[], details=[];
      var tm= Lampa.Api.sources&&Lampa.Api.sources.tmdb;
      var countries= tm&&tm.parseCountries ? tm.parseCountries(data):[];
      var pg= tm&&tm.parsePG ? tm.parsePG(data):"";
      if(year!=="0000") head.push("<span>"+year+"</span>");
      if(countries.length) head.push(countries.join(", "));
      if(+vote>0) details.push('<div class="full-start__rate"><div>'+vote+"</div><div>TMDB</div></div>");
      if(data.genres&&data.genres.length) details.push(data.genres.map(function(i){return Lampa.Utils.capitalizeFirstLetter(i.name);}).join(" | "));
      if(data.runtime) details.push(Lampa.Utils.secondsToTime(data.runtime*60,true));
      if(pg) details.push('<span class="full-start__pg" style="font-size:.9em;">'+pg+"</span>");
      html.find(".new-interface-info__head").empty().append(head.join(", "));
      html.find(".new-interface-info__details").html(details.join('<span class="new-interface-info__split">&#9679;</span>'));
    };
    this.load=function(data){
      var _this=this; clearTimeout(timer);
      var lang=Lampa.Storage.get("language")||"ru-RU";
      var kind=data.name?"tv":"movie";
      var url=Lampa.TMDB.api(kind+"/"+data.id+"?api_key="+Lampa.TMDB.key()+"&append_to_response=content_ratings,release_dates&language="+lang);
      if(loaded[url]) return this.draw(loaded[url]);
      timer=setTimeout(function(){ network.clear(); network.timeout(5000); network.silent(url,function(movie){loaded[url]=movie;_this.draw(movie);},function(){dlog("InfoBlock.load fail",url);}); },300);
    };
    this.render=function(){return html;};
    this.empty=function(){};
    this.destroy=function(){ if(html) html.remove(); loaded={}; html=null; network.clear(); };
  }

  // ---- New list component ----
  function NewInterfaceComponent(object){
    var network=new Lampa.Reguest();
    var scroll=new Lampa.Scroll({mask:true,over:true,scroll_by_item:true});
    var items=[], html=$('<div class="new-interface"><img class="full-start__background" alt=""></div>');
    var active=0, info, lazy, newlampa=(Lampa.Manifest.app_digital||0)>=166;
    var viewall= Lampa.Storage.field("card_views_type")=="view" || Lampa.Storage.field("navigation_type")=="mouse";
    var bg=html.find(".full-start__background"), bg_last="", bg_timer;
    this.create=function(){};
    this.build=function(data){
      lazy=data; info=new InfoBlock(object); info.create();
      html.append(info.render()); html.append(scroll.render());
      (viewall?data:data.slice(0,2)).forEach(this.append.bind(this));
      if(newlampa){ Lampa.Layer.update(html); Lampa.Layer.visible(scroll.render(true)); scroll.onEnd=this.loadNext&&this.loadNext.bind(this); }
      this.activity.loader(false); this.activity.toggle();
    };
    this.append=function(el){
      if(el.ready) return; el.ready=true;
      var item=new Lampa.InteractionLine(el,{url:el.url,card_small:true,cardClass:el.cardClass,genres:object.genres,object:object,card_wide:true,nomore:el.nomore});
      item.create();
      var self=this;
      item.onFocus=function(e){ info.update(e); self._bg(e); };
      item.onHover=function(e){ info.update(e); self._bg(e); };
      item.onToggle=function(){ active=items.indexOf(item); };
      scroll.append(item.render()); items.push(item);
    };
    this._bg=function(elem){
      var nb= elem.backdrop_path ? Lampa.Api.img(elem.backdrop_path,"w1280") : "";
      clearTimeout(bg_timer); if(!nb||nb===bg_last) return;
      bg_timer=setTimeout(function(){ bg.removeClass("loaded"); bg[0].onload=function(){bg.addClass("loaded");}; bg[0].onerror=function(){bg.removeClass("loaded");}; bg_last=nb; setTimeout(function(){bg[0].src=bg_last;},300); },1000);
    };
    this.render=function(){return html;};
    this.destroy=function(){ network.clear(); Lampa.Arrays.destroy(items); scroll.destroy(); if(info) info.destroy(); html.remove(); };
  }

  // ---- styles ----
  function injectStyles(){
    Lampa.Template.add("new_interface_style",
      '<style>\
        .new-interface .card--small.card--wide{width:18.3em;}\
        .new-interface-info{position:relative;padding:1.5em;height:24em;}\
        .new-interface-info__body{width:80%;padding-top:1.1em;}\
        .new-interface-info__head{color:rgba(255,255,255,.6);margin-bottom:1em;font-size:1.3em;min-height:1em;}\
        .new-interface-info__head span{color:#fff;}\
        .new-interface-info__title{font-size:4em;font-weight:600;margin-bottom:.3em;overflow:hidden;display:-webkit-box;-webkit-line-clamp:1;line-clamp:1;-webkit-box-orient:vertical;margin-left:-.03em;line-height:1.3;}\
        .new-interface-info__details{margin-bottom:1.6em;display:flex;align-items:center;flex-wrap:wrap;min-height:1.9em;font-size:1.1em;}\
        .new-interface-info__split{margin:0 1em;font-size:.7em;}\
        .new-interface-info__description{font-size:1.2em;font-weight:300;line-height:1.5;overflow:hidden;display:-webkit-box;-webkit-line-clamp:4;line-clamp:4;-webkit-box-orient:vertical;width:70%;}\
        .new-interface .card-more__box{padding-bottom:95%;}\
        .new-interface .full-start__background{height:108%;top:-6em;position:absolute;left:0;right:0;width:100%;opacity:.25;object-fit:cover;transition:opacity .2s;}\
        .new-interface .full-start__background.loaded{opacity:.35;}\
        .new-interface .full-start__rate{font-size:1.3em;margin-right:0;}\
        .new-interface .card__promo{display:none;}\
        .new-interface .card.card--wide+.card-more .card-more__box{padding-bottom:95%;}\
        .new-interface .card.card--wide .card-watched{display:none !important;}\
      </style>'
    );
    $("body").append(Lampa.Template.get("new_interface_style",{},true));
    dlog("Styles injected");
  }

  // ---- multi-hook: подменяем первую реально используемую фабрику ----
  var Hook = {
    appliedTo: null,
    list: ["InteractionMain","InteractionCategory","Interaction","InteractionFactory"],
    apply: function(){
      for(var i=0;i<this.list.length;i++){
        var k=this.list[i];
        if(typeof Lampa[k]==="function"){
          this.wrap(k);
        }
      }
      dlog("Installed hooks on:", this.list.filter(function(k){return typeof Lampa[k]==="function";}).join(", ")||"none");
    },
    wrap: function(key){
      if(Lampa[key]._newiface_wrapped) return;
      var old=Lampa[key];
      var self=this;
      Lampa[key]=function(object){
        var src=object&&object.source, comp=object&&object.component, page=object&&object.page;
        var use = NewInterfaceComponent;
        var reasons=[];
        if(!(src && APPLY_SOURCES[src])){ use=old; reasons.push("source="+src); }
        if(window.innerWidth<767){ use=old; reasons.push("width="+window.innerWidth); }
        if((Lampa.Manifest.app_digital||0)<MIN_VERSION){ use=old; reasons.push("version="+Lampa.Manifest.app_digital); }
        if(comp && !APPLY_COMPONENTS[comp]){ use=old; reasons.push("component="+comp); }

        var tag = (use===old?"skip":"apply");
        dlog("Hook["+key+"]", tag, "| src:",src, "comp:",comp, "page:",page, "| reasons:", reasons.join(",")||"none");
        self.appliedTo = self.appliedTo || key;
        return new use(object);
      };
      Lampa[key]._newiface_wrapped=true;
    }
  };

  // ядро может переписать фабрики — сторожим
  function watchdog(){
    var sig = {};
    setInterval(function(){
      Hook.list.forEach(function(k){
        if(typeof Lampa[k]!=="function") return;
        var cur=Lampa[k] && Lampa[k].toString();
        if(sig[k] && sig[k]!==cur){
          dlog("Factory",k,"changed by core, re-hook");
          Lampa[k]._newiface_wrapped=false;
          Hook.wrap(k);
        }
        sig[k]=cur;
      });
    },1500);
  }

  // ---- старт ----
  function start(){
    dlog("Boot. app_digital:",Lampa.Manifest.app_digital,"version:",Lampa.Manifest.version,"width:",window.innerWidth);
    injectStyles(); hotkey(); Hook.apply(); watchdog();

    try{
      Lampa.Listener.follow("activity",function(e){
        if(!DEBUG) return;
        if(e.type==="start"){
          var a=e.object||{};
          dlog("Activity start:","name="+a.name,"source="+a.source,"component="+a.component,"url="+a.url);
        }
      });
    }catch(e){}

    noty("Готов. Откройте каталог TMDB/CUB и смотрите логи. I/Info — полный лог.");
  }

  function init(){
    if(window.appready){ dlog("appready=true"); start(); return; }
    if(Lampa.Listener&&Lampa.Listener.follow){
      Lampa.Listener.follow("app",function(e){ if(e.type==="ready"){ dlog("event app:ready"); start(); } });
      dlog("Subscribed app:ready");
      return;
    }
    dlog("Waiting app core…");
    waitFor(function(){ return !!(window.Lampa&&Lampa.Manifest); }, function(ok){ if(ok) start(); else dlog("Core wait timeout"); }, 15000, "Lampa core");
  }

  try{ init(); }catch(e){ noty("init error: "+(e&&e.message)); }
})();
