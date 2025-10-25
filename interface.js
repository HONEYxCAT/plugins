(function () {
  "use strict";

  /* ===== CONFIG ===== */
  var DEBUG = true;                    // логи + подсветка карточек
  var SOURCES = { tmdb:1, cub:1 };     // где включать оверлей
  var COMPONENTS = { category:1 };     // какие компоненты ловить
  var NOTY_COOLDOWN = 700;
  /* ================== */

  var lastNoty=0, logBuf=[];
  function noty(s){ if(!DEBUG) return; var t=Date.now(); if(t-lastNoty<NOTY_COOLDOWN) return; lastNoty=t; try{Lampa.Noty.show("[new-interface] "+s);}catch(e){} }
  function dlog(){ var s=[].slice.call(arguments).join(" "); logBuf.push(s); if(logBuf.length>400) logBuf.shift(); try{console.log("[new-interface]",s);}catch(e){} noty(s); }
  function dump(){ try{Lampa.Modal.open({title:"new-interface · debug",html:'<div style="white-space:pre-wrap;font-size:1em;line-height:1.45em;max-height:70vh;overflow:auto;padding:.5em;background:rgba(255,255,255,.06);border-radius:.5em;">'+logBuf.join("\n")+"</div>",onBack:function(){Lampa.Modal.close();Lampa.Controller.toggle("content");}});}catch(e){} }
  function hotkey(){ try{Lampa.Controller.listener.follow("keydown",function(e){ if(e.code==="KeyI"||e.keyCode===73||e.keyCode===457) dump(); }); }catch(e){} }

  /* ===== styles (видимый тест) ===== */
  function injectStyles(){
    var css = '\
    <style id="newiface-dom-style">\
      body.newiface-debug .card{outline:1px dashed rgba(80,255,80,.65)!important;outline-offset:1px}\
      .newiface-dom-overlay{position:fixed;left:0;right:0;top:0;z-index:999999;padding:14px 18px 10px;background:linear-gradient(180deg,rgba(0,0,0,.55),rgba(0,0,0,.15));pointer-events:none}\
      .newiface-dom-wrap{position:relative;max-width:85vw}\
      .newiface-title{font-size:34px;font-weight:700;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\
      .newiface-head{color:rgba(255,255,255,.75);font-size:15px;margin:.2em 0 .45em}\
      .newiface-details{opacity:.9;font-size:14px}\
      .newiface-desc{margin-top:.5em;max-height:3.6em;overflow:hidden;line-height:1.2}\
      .newiface-bg{position:fixed;inset:0;width:100vw;height:100vh;object-fit:cover;z-index:999998;opacity:.22;filter:blur(3px);pointer-events:none}\
      .newiface-hide{display:none!important}\
    </style>';
    if (!document.getElementById("newiface-dom-style")) $("head").append(css);
    if (DEBUG) document.body.classList.add("newiface-debug");
  }

  /* ===== overlay ===== */
  var overlay = null, overlayImg = null, overlayReady = false, lastPoster = "";
  function ensureOverlay(){
    if (overlayReady) return;
    var root = $('<div class="newiface-dom-overlay newiface-hide"><div class="newiface-dom-wrap"><div class="newiface-head"></div><div class="newiface-title"></div><div class="newiface-details"></div><div class="newiface-desc"></div></div></div>');
    var bg = $('<img class="newiface-bg newiface-hide" alt="">');
    $("body").append(bg).append(root);
    overlay = root;
    overlayImg = bg[0];
    overlayReady = true;
    dlog("DOM overlay injected");
  }

  function pickFromCard(el){
    var data = null;
    if (el.dataset && el.dataset.card){
      try { data = JSON.parse(el.dataset.card); } catch(e){}
    }
    if (!data){
      var title = el.getAttribute("data-title") || $(el).find(".card__title, .full-title, [data-title]").first().text() || "";
      var img = $(el).find("img").first().attr("src") || "";
      data = { title: title, name: title, backdrop_path: "", poster_path: "", overview: "" };
      if (img) data.backdrop_local = img;
    }
    return data;
  }

  function tmdbImage(path, size){ try{ return Lampa.Api.img(path, size||"w1280"); }catch(e){ return ""; } }

  var paintThrottle = 0;
  function paint(data){
    if (!overlayReady || !data) return;
    var now = Date.now(); if (now - paintThrottle < 120) return; paintThrottle = now;

    var year = ((data.release_date||data.first_air_date||"") + "").slice(0,4);
    var lang = data.original_language || "";
    var vote = data.vote_average != null ? parseFloat(data.vote_average).toFixed(1) : "";

    overlay.find(".newiface-head").text([year, lang.toUpperCase()].filter(Boolean).join(" • "));
    overlay.find(".newiface-title").text(data.title || data.name || "");
    var details=[];
    if (vote && +vote>0) details.push("TMDB " + vote);
    if (data.runtime) details.push(Lampa.Utils.secondsToTime(data.runtime*60, true));
    overlay.find(".newiface-details").text(details.join(" • "));
    overlay.find(".newiface-desc").text(data.overview || Lampa.Lang.translate("full_notext") || "");

    var bg = data.backdrop_local || (data.backdrop_path ? tmdbImage(data.backdrop_path,"w1280") : (data.poster_path?tmdbImage(data.poster_path,"w780"):""));
    if (bg && bg !== lastPoster){
      lastPoster = bg;
      overlayImg.src = bg;
      $(overlayImg).removeClass("newiface-hide");
    }
    overlay.removeClass("newiface-hide");
  }

  /* ===== наблюдатель карточек ===== */
  var wired = false;
  function wireCards(){
    if (wired) return; wired = true;
    ensureOverlay();

    // hover/focus на любые карточки
    document.addEventListener("mouseover", function(ev){
      var el = ev.target && ev.target.closest(".card"); if(!el) return;
      var data = pickFromCard(el); paint(data);
    }, { passive:true });

    document.addEventListener("focusin", function(ev){
      var el = ev.target && ev.target.closest(".card"); if(!el) return;
      var data = pickFromCard(el); paint(data);
    });

    // если карточки приходят позже — наблюдаем DOM
    var mo = new MutationObserver(function(){
      var anyCard = document.querySelector(".card");
      if (anyCard && !overlayReady) ensureOverlay();
    });
    mo.observe(document.body, { childList:true, subtree:true });

    dlog("Card wiring ready");
  }

  /* ===== включение только на нужных экранах ===== */
  function onActivityStart(a){
    var src = a && a.source, comp = a && a.component;
    dlog("Activity start:", "source="+src, "component="+comp, "url="+a.url);
    if (SOURCES[src] && COMPONENTS[comp]) wireCards();
  }

  /* ===== запуск ===== */
  function start(){
    injectStyles();
    hotkey();

    // В 3.0 достаточно ловить активности
    try{
      Lampa.Listener.follow("activity", function(e){
        if (e.type === "start") onActivityStart(e.object||{});
      });
    }catch(e){ dlog("Listener error:", e && e.message); }

    // Если уже открыта категория — активируем сразу
    try{
      var act = Lampa.Activity && Lampa.Activity.active && Lampa.Activity.active();
      if (act && SOURCES[act.source] && COMPONENTS[act.component]) wireCards();
    }catch(e){}

    noty("Готов. Наведите фокус на любую карточку. I/Info — логи.");
  }

  function init(){
    if (window.appready) { dlog("appready=true"); start(); return; }
    if (Lampa.Listener && Lampa.Listener.follow){
      Lampa.Listener.follow("app", function(e){ if (e.type==="ready"){ dlog("event app:ready"); start(); } });
      dlog("Subscribed app:ready");
      return;
    }
    var tm = setInterval(function(){
      if (window.Lampa && Lampa.Manifest){ clearInterval(tm); start(); }
    }, 100);
  }

  try{ init(); }catch(e){ noty("init error: "+(e&&e.message)); }
})();
