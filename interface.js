(function () {
  "use strict";

  // ====== настройки ======
  var DEBUG = true;
  var APPLY_SOURCES = { tmdb:1, cub:1 };
  var APPLY_COMPONENTS = { category:1 };
  var NOTY_COOLDOWN = 700;
  // =======================

  var lastNoty = 0, logBuf = [];
  function noty(s){ if(!DEBUG) return; var t=Date.now(); if(t-lastNoty<NOTY_COOLDOWN) return; lastNoty=t; try{Lampa.Noty.show("[new-interface] "+s);}catch(e){} }
  function dlog(){ var s=[].slice.call(arguments).join(" "); logBuf.push(s); if(logBuf.length>400) logBuf.shift(); try{console.log("[new-interface]",s);}catch(e){} noty(s); }
  function dump(){ try{Lampa.Modal.open({title:"new-interface · debug",html:'<div style="white-space:pre-wrap;font-size:1em;line-height:1.45em;max-height:70vh;overflow:auto;padding:.5em;background:rgba(255,255,255,.06);border-radius:.5em;">'+logBuf.join("\n")+"</div>",onBack:function(){Lampa.Modal.close();Lampa.Controller.toggle("content");}});}catch(e){} }
  function hotkey(){ try{Lampa.Controller.listener.follow("keydown",function(e){ if(e.code==="KeyI"||e.keyCode===73||e.keyCode===457) dump(); }); }catch(e){} }

  // ====== упрощённый info-блок + фон ======
  function mountOverlay(target, firstItem){
    if (!target || target.__newiface_applied) return;
    target.__newiface_applied = true;

    var html = $(
      '<div class="newiface-overlay">\
         <img class="newiface-bg" alt="">\
         <div class="newiface-info">\
           <div class="newiface-head"></div>\
           <div class="newiface-title"></div>\
           <div class="newiface-details"></div>\
           <div class="newiface-desc"></div>\
         </div>\
       </div>'
    );

    // стиль
    Lampa.Template.add("newiface_style", '\
      <style>\
        .newiface-overlay{position:relative;padding:1.2em 1.5em 0;height:22em;overflow:hidden}\
        .newiface-bg{position:absolute;inset:0;width:100%;height:120%;top:-10%;opacity:.28;object-fit:cover;filter:blur(2px)}\
        .newiface-info{position:relative;max-width:75%}\
        .newiface-head{color:rgba(255,255,255,.65);margin-bottom:.6em;font-size:1.1em}\
        .newiface-title{font-size:3.2em;font-weight:600;line-height:1.2;margin-bottom:.2em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\
        .newiface-details{display:flex;gap:.8em;align-items:center;margin:.6em 0 1.1em}\
        .newiface-desc{font-size:1.1em;line-height:1.45;max-height:4.5em;overflow:hidden}\
      </style>'
    );
    $("body").append(Lampa.Template.get("newiface_style",{},true));

    // вставка в начало контейнера категории
    $(target).prepend(html);

    function pickImage(obj){
      return obj && obj.backdrop_path ? Lampa.Api.img(obj.backdrop_path, "w1280") : "";
    }

    function paint(data){
      if(!data) return;
      var year=((data.release_date||data.first_air_date||"")+"").slice(0,4);
      var vote=(data.vote_average!=null?parseFloat(data.vote_average).toFixed(1):"");
      html.find(".newiface-head").text([year!=="NaN"&&year!=="0"&&year!=="NaN"&&year||"", data.original_language||""].filter(Boolean).join(" • "));
      html.find(".newiface-title").text(data.title||data.name||"");
      html.find(".newiface-desc").text(data.overview||Lampa.Lang.translate("full_notext"));
      var details=[];
      if(vote && +vote>0) details.push("TMDB "+vote);
      if (data.runtime) details.push(Lampa.Utils.secondsToTime(data.runtime*60,true));
      html.find(".newiface-details").text(details.join(" • "));
      var bg=pickImage(data); if(bg) html.find(".newiface-bg")[0].src = bg;
    }

    if (firstItem) paint(firstItem);

    dlog("Overlay mounted on category container");
    return { update: paint };
  }

  // ====== DOM наблюдатель: ищем контейнер категории и первую карточку ======
  function attachDomObserver(context){
    if (context.__newiface_dom_observer) return;
    var obs = new MutationObserver(function(muts){
      muts.forEach(function(m){
        var root = document.querySelector('.category, .content--category, [data-component="category"]');
        if (!root) return;
        // первая карточка
        var card = root.querySelector('.card, .card--small, .card--wide');
        var firstPayload = card && card.dataset && card.dataset.card ? (function(){ try{ return JSON.parse(card.dataset.card); }catch(e){ return null; } })() : null;

        var overlay = mountOverlay(root, firstPayload);

        // реакция на фокус карточек: пробуем доставать payload из data-card
        root.addEventListener('mouseover', function(ev){
          var el = ev.target.closest('.card');
          if(!el || !overlay) return;
          var data=null;
          if(el.dataset && el.dataset.card){
            try{ data = JSON.parse(el.dataset.card); }catch(e){}
          }
          if(data) overlay.update(data);
        }, { passive:true });

        // достаточно один раз смонтировать
        if (overlay) { obs.disconnect(); dlog("DOM observer: overlay ready"); }
      });
    });
    obs.observe(document.body, { childList:true, subtree:true });
    context.__newiface_dom_observer = obs;
  }

  // ====== широкая трассировка фабрик ======
  function installWideTracing(){
    var keys = Object.keys(Lampa||{});
    var rx = /^(Interaction|Component|Catalog|Category|Feed|Main)/i;

    var hooked = [];
    keys.forEach(function(k){
      var v = Lampa[k];
      if (typeof v === "function" && rx.test(k) && !v.__newiface_wrapped){
        var old = v;
        Lampa[k] = function(object){
          var src = object && object.source;
          var comp = object && object.component;
          var page = object && object.page;
          dlog("CALL", k, "| src:", src, "comp:", comp, "page:", page);
          try{
            // не меняем поведение, просто логируем
            return new old(object);
          }catch(e){
            // если это не конструктор, попробуем простой вызов
            try { return old(object); }
            catch(e2){
              dlog("WRAP ERR", k, e2 && e2.message);
              throw e2;
            }
          }
        };
        Lampa[k].__newiface_wrapped = true;
        hooked.push(k);
      }
    });

    dlog("Wide tracing on:", hooked.join(", ") || "none");
  }

  // ====== слежение за активити и включение DOM-оверлея ======
  function wireActivity(){
    try{
      Lampa.Listener.follow("activity", function(e){
        if (e.type !== "start") return;
        var a = e.object || {};
        dlog("Activity start:", "source="+a.source, "component="+a.component, "url="+a.url);
        if (APPLY_SOURCES[a.source] && APPLY_COMPONENTS[a.component]){
          attachDomObserver(window);
        }
      });
    }catch(e){}
  }

  // ====== старт ======
  function start(){
    dlog("Boot v3 tracer. app_digital:", Lampa.Manifest.app_digital, "width:", window.innerWidth);
    hotkey();
    installWideTracing();
    wireActivity();
    noty("Готов. Откройте каталог TMDB/CUB. I/Info — открыть логи.");
  }

  function init(){
    if (window.appready) { start(); return; }
    if (Lampa.Listener && Lampa.Listener.follow){
      Lampa.Listener.follow("app", function(e){ if (e.type==="ready") start(); });
      dlog("Subscribed app:ready");
      return;
    }
    var id = setInterval(function(){
      if (window.Lampa && Lampa.Manifest){ clearInterval(id); start(); }
    }, 100);
  }

  try{ init(); }catch(e){ noty("init error: "+(e&&e.message)); }
})();
