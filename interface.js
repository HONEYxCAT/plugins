(function () {
  "use strict";

  /* ===== CONFIG ===== */
  var ENABLE_ON_SOURCE = { tmdb:1, cub:1 };
  var ENABLE_ON_COMPONENT = { category:1 };
  var MIN_WIDTH = 767;
  var SHOW_DIAG = false;   // true — показать красную плашку
  /* ================== */

  var diagEl = null;
  function diag(msg){
    if(!SHOW_DIAG) return;
    if(!diagEl){
      var css = '<style>#ni-diag{position:fixed;z-index:9999999;left:0;right:0;top:0;padding:6px 10px;background:#b00020;color:#fff;font:14px/1.2 system-ui}</style>';
      document.head.insertAdjacentHTML("beforeend", css);
      diagEl = document.createElement("div");
      diagEl.id = "ni-diag";
      document.body.appendChild(diagEl);
    }
    diagEl.textContent = msg;
  }

  function tmdbImg(path,size){ try{ return Lampa.Api.img(path,size||"w1280"); }catch(e){ return ""; } }

  /* ===== Info-панель ===== */
  function InfoBlock(){
    var html, timer, req = new Lampa.Reguest(), cache = {};
    var bgImg, bgLast = "", bgTimer;

    this.create = function(){
      html = document.createElement("div");
      html.className = "new-interface";
      html.innerHTML = '\
        <img class="full-start__background" alt="">\
        <div class="new-interface-info">\
          <div class="new-interface-info__body">\
            <div class="new-interface-info__head"></div>\
            <div class="new-interface-info__title"></div>\
            <div class="new-interface-info__details"></div>\
            <div class="new-interface-info__description"></div>\
          </div>\
        </div>';
      bgImg = html.querySelector(".full-start__background");
    };

    this.render = function(){ return html; };

    this.update = function(lite){
      if(!lite) return;
      html.querySelector(".new-interface-info__head").textContent = "---";
      html.querySelector(".new-interface-info__details").textContent = "---";
      html.querySelector(".new-interface-info__title").textContent = lite.title || lite.name || "";
      html.querySelector(".new-interface-info__description").textContent = lite.overview || Lampa.Lang.translate("full_notext") || "";

      if (lite.backdrop_path || lite.poster_path) setBg(lite.backdrop_path || lite.poster_path, "w200");
      loadFull(lite);
    };

    function setBg(path,size){
      var src = tmdbImg(path,size||"w1280");
      if(!src || src===bgLast) return;
      clearTimeout(bgTimer);
      bgTimer = setTimeout(function(){
        bgImg.classList.remove("loaded");
        bgImg.onload = function(){ bgImg.classList.add("loaded"); };
        bgImg.onerror = function(){ bgImg.classList.remove("loaded"); };
        bgLast = src;
        bgImg.src = bgLast;
      }, 150);
    }

    function draw(full){
      var year = ((full.release_date || full.first_air_date || "0000")+"").slice(0,4);
      var vote = parseFloat((full.vote_average || 0)+"").toFixed(1);
      var tm = Lampa.Api.sources && Lampa.Api.sources.tmdb;
      var countries = tm && tm.parseCountries ? tm.parseCountries(full) : [];
      var pg = tm && tm.parsePG ? tm.parsePG(full) : "";

      var head = [];
      if (year!=="0000") head.push("<span>"+year+"</span>");
      if (countries.length) head.push(countries.join(", "));
      html.querySelector(".new-interface-info__head").innerHTML = head.join(", ");

      var details = [];
      if (+vote>0) details.push('<div class="full-start__rate"><div>'+vote+'</div><div>TMDB</div></div>');
      if (full.genres && full.genres.length) details.push(full.genres.map(function(i){return Lampa.Utils.capitalizeFirstLetter(i.name);}).join(" | "));
      if (full.runtime) details.push(Lampa.Utils.secondsToTime(full.runtime*60, true));
      if (pg) details.push('<span class="full-start__pg" style="font-size:0.9em;">'+pg+'</span>');
      html.querySelector(".new-interface-info__details").innerHTML = details.join('<span class="new-interface-info__split">&#9679;</span>');

      if (full.backdrop_path || full.poster_path) setBg(full.backdrop_path || full.poster_path, "w1280");
    }

    function loadFull(lite){
      if(!lite || !lite.id) return;
      clearTimeout(timer);
      var lang = Lampa.Storage.get("language") || "ru-RU";
      var kind = lite.name ? "tv" : "movie";
      var url = Lampa.TMDB.api(kind+"/"+lite.id+"?api_key="+Lampa.TMDB.key()+"&append_to_response=content_ratings,release_dates&language="+lang);
      if (cache[url]) return draw(cache[url]);
      timer = setTimeout(function(){
        req.clear(); req.timeout(5000);
        req.silent(url, function(m){ cache[url]=m; draw(m); });
      }, 200);
    }
  }

  /* ===== стили как в макете ===== */
  function injectStyles(){
    if(document.getElementById("new_interface_style_dom")) return;
    document.head.insertAdjacentHTML("beforeend", '\
      <style id="new_interface_style_dom">\
        .new-interface{position:relative}\
        .new-interface-info{position:relative;padding:1.5em;height:24em;}\
        .new-interface-info__body{width:80%;padding-top:1.1em;}\
        .new-interface-info__head{color:rgba(255,255,255,.6);margin-bottom:1em;font-size:1.3em;min-height:1em;}\
        .new-interface-info__head span{color:#fff;}\
        .new-interface-info__title{font-size:4em;font-weight:600;margin-bottom:.3em;overflow:hidden;display:-webkit-box;-webkit-line-clamp:1;line-clamp:1;-webkit-box-orient:vertical;margin-left:-.03em;line-height:1.3;}\
        .new-interface-info__details{margin-bottom:1.6em;display:flex;align-items:center;flex-wrap:wrap;min-height:1.9em;font-size:1.1em;}\
        .new-interface-info__split{margin:0 1em;font-size:.7em;}\
        .new-interface-info__description{font-size:1.2em;font-weight:300;line-height:1.5;overflow:hidden;display:-webkit-box;-webkit-line-clamp:4;line-clamp:4;-webkit-box-orient:vertical;width:70%;}\
        .new-interface .full-start__background{position:absolute;left:0;right:0;width:100%;height:108%;top:-6em;object-fit:cover;opacity:0;transition:opacity .25s;}\
        .new-interface .full-start__background.loaded{opacity:.35;}\
      </style>');
  }

  /* ===== helpers ===== */
  function getCardData(el){
    if(!el) return null;
    var d=null;
    if(el.dataset && el.dataset.card){
      try{ d = JSON.parse(el.dataset.card); }catch(e){ d = null; }
    }
    if(!d){
      var t = el.getAttribute("data-title") || (el.querySelector(".card__title,[data-title]")||{}).textContent || "";
      var id = +(el.getAttribute("data-id")||0);
      d = { title:t, name:t, id:id, overview:"" };
    }
    return d;
  }

  function findCategoryRoot(){
    return document.querySelector(".content--category, .category, [data-component='category']");
  }

  /* ===== основная логика, без тяжёлых наблюдателей ===== */
  var mounted = false, info = null, rootEl = null;

  function mountOnce(){
    if(mounted) return false;
    rootEl = findCategoryRoot();
    if(!rootEl) return false;

    injectStyles();
    info = new InfoBlock(); info.create();

    // вставить строго первым элементом контейнера категории
    if (rootEl.firstElementChild) rootEl.insertBefore(info.render(), rootEl.firstElementChild);
    else rootEl.appendChild(info.render());

    // первичное заполнение
    var firstCard = rootEl.querySelector(".card");
    if(firstCard) info.update(getCardData(firstCard));

    // делегирование на контейнер
    rootEl.addEventListener("mouseover", onOver, { passive:true });
    rootEl.addEventListener("focusin", onOver);

    mounted = true;
    diag("new-interface: mounted in category");
    return true;
  }

  var lastUpdateTs = 0;
  function onOver(e){
    var now = Date.now();
    if (now - lastUpdateTs < 80) return; // лёгкий троттлинг
    lastUpdateTs = now;

    var el = e.target && e.target.closest(".card");
    if(!el) return;
    if(!info) return;
    info.update(getCardData(el));
  }

  function onActivityStart(a){
    if(!a) return;
    if(window.innerWidth < MIN_WIDTH) return;
    if(!ENABLE_ON_SOURCE[a.source]) return;
    if(!ENABLE_ON_COMPONENT[a.component]) return;

    // ждём, пока контейнер категории появится, но не более ~3 сек
    var tries = 0;
    var id = setInterval(function(){
      if (mountOnce()){ clearInterval(id); }
      else if(++tries > 30){ clearInterval(id); diag("new-interface: no category root"); }
    }, 100);
  }

  function start(){
    diag("new-interface: ready");
    try{
      Lampa.Listener.follow("activity", function(e){
        if(e.type === "start") onActivityStart(e.object || {});
      });
      var act = Lampa.Activity && Lampa.Activity.active && Lampa.Activity.active();
      if (act) onActivityStart(act);
    }catch(e){}
  }

  if (window.appready) start();
  else if (Lampa.Listener && Lampa.Listener.follow){
    Lampa.Listener.follow("app", function(e){ if(e.type==="ready") start(); });
  } else {
    var t = setInterval(function(){ if(window.Lampa && Lampa.Manifest){ clearInterval(t); start(); } }, 100);
  }
})();
