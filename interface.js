(function () {
  "use strict";

  /* ------------ CONFIG ------------ */
  var ENABLE_ON_SOURCE = { tmdb: 1, cub: 1 };
  var ENABLE_ON_COMPONENT = { category: 1 };
  var MIN_WIDTH = 767;
  var NOTY = false; // включи true, если нужны всплывающие логи
  /* -------------------------------- */

  var lastNoty = 0;
  function noty(s){
    if(!NOTY) return;
    var t=Date.now(); if(t-lastNoty<700) return; lastNoty=t;
    try{ Lampa.Noty.show("[new-interface] "+s); }catch(e){}
  }

  // ---------- Шаблон инфо-блока ----------
  function InfoBlock(){
    var html, timer, network = new Lampa.Reguest(), cache = {};
    var bgImg, bgLast = "", bgTimer;

    this.create = function(){
      html = $('<div class="new-interface">\
        <img class="full-start__background" alt="">\
        <div class="new-interface-info">\
          <div class="new-interface-info__body">\
            <div class="new-interface-info__head"></div>\
            <div class="new-interface-info__title"></div>\
            <div class="new-interface-info__details"></div>\
            <div class="new-interface-info__description"></div>\
          </div>\
        </div>\
      </div>');
      bgImg = html.find(".full-start__background");
    };

    this.render = function(){ return html; };

    this.update = function(cardLite){
      if(!cardLite) return;
      html.find(".new-interface-info__head,.new-interface-info__details").text("---");
      html.find(".new-interface-info__title").text(cardLite.title || cardLite.name || "");
      html.find(".new-interface-info__description").text(cardLite.overview || Lampa.Lang.translate("full_notext") || "");

      // фон по lite данным сразу
      this._bg(cardLite.backdrop_path || cardLite.poster_path, "w200");

      // дотягиваем детали с TMDB
      this.load(cardLite);
    };

    this.draw = function(full){
      var year = ((full.release_date || full.first_air_date || "0000")+"").slice(0,4);
      var vote = parseFloat((full.vote_average || 0)+"").toFixed(1);
      var head = [];
      var details = [];

      var tmdb = Lampa.Api.sources && Lampa.Api.sources.tmdb;
      var countries = tmdb && tmdb.parseCountries ? tmdb.parseCountries(full) : [];
      var pg = tmdb && tmdb.parsePG ? tmdb.parsePG(full) : "";

      if (year !== "0000") head.push("<span>"+year+"</span>");
      if (countries.length) head.push(countries.join(", "));

      if (+vote > 0) details.push('<div class="full-start__rate"><div>'+vote+'</div><div>TMDB</div></div>');
      if (full.genres && full.genres.length){
        details.push(full.genres.map(function(it){ return Lampa.Utils.capitalizeFirstLetter(it.name); }).join(" | "));
      }
      if (full.runtime) details.push(Lampa.Utils.secondsToTime(full.runtime * 60, true));
      if (pg) details.push('<span class="full-start__pg" style="font-size:0.9em;">'+pg+'</span>');

      html.find(".new-interface-info__head").empty().append(head.join(", "));
      html.find(".new-interface-info__details").html(details.join('<span class="new-interface-info__split">&#9679;</span>'));

      // фон по хорошей картинке
      this._bg(full.backdrop_path || full.poster_path, "w1280");
    };

    this._bg = function(path, size){
      if(!path) return;
      var src = Lampa.Api.img(path, size || "w1280");
      clearTimeout(bgTimer);
      if (src === bgLast) return;
      bgTimer = setTimeout(function(){
        bgImg.removeClass("loaded");
        bgImg[0].onload  = function(){ bgImg.addClass("loaded"); };
        bgImg[0].onerror = function(){ bgImg.removeClass("loaded"); };
        bgLast = src;
        setTimeout(function(){ bgImg[0].src = bgLast; }, 200);
      }, 250);
    };

    this.load = function(lite){
      var _this = this;
      if(!lite || !lite.id) return;

      clearTimeout(timer);
      var lang = Lampa.Storage.get("language") || "ru-RU";
      var kind = lite.name ? "tv" : "movie";
      var url = Lampa.TMDB.api(kind + "/" + lite.id
        + "?api_key=" + Lampa.TMDB.key()
        + "&append_to_response=content_ratings,release_dates&language=" + lang);

      if (cache[url]) return this.draw(cache[url]);

      timer = setTimeout(function(){
        network.clear();
        network.timeout(5000);
        network.silent(url, function(res){
          cache[url] = res;
          _this.draw(res);
        }, function(){
          noty("TMDB request fail");
        });
      }, 250);
    };

    this.destroy = function(){
      if (html) html.remove();
      cache = {};
      network.clear();
    };
  }

  // ---------- Вставка в DOM категории ----------
  var mounted = null, info = null;

  function mountInCategory(root, firstCardData){
    if (mounted) return mounted;

    info = new InfoBlock();
    info.create();

    // вставляем в начало контейнера категории
    $(root).prepend(info.render());

    // первичное заполнение
    if (firstCardData) info.update(firstCardData);

    noty("UI applied");
    mounted = { root: root, info: info };
    return mounted;
  }

  // ---------- Сбор данных из карточки ----------
  function getCardDataFromElement(el){
    if (!el) return null;
    var data = null;

    if (el.dataset && el.dataset.card){
      try { data = JSON.parse(el.dataset.card); } catch(e){ data = null; }
    }

    // запасной вариант
    if (!data){
      var title = el.getAttribute("data-title") || $(el).find(".card__title,[data-title]").first().text() || "";
      var img = $(el).find("img").first().attr("src") || "";
      data = { title: title, name: title, overview: "", id: +(el.getAttribute("data-id")||0) };
      if (img) data.backdrop_path = ""; // чтобы не сломать Lampa.Api.img
    }

    return data;
  }

  // ---------- Подписки на карточки ----------
  function wireCardEvents(root){
    // обновление хедера по hover/focus карточек
    function handleTarget(t){
      var card = t && t.closest && t.closest(".card");
      if (!card || !info) return;
      var lite = getCardDataFromElement(card);
      if (lite) info.update(lite);
    }

    root.addEventListener("mouseover", function(ev){ handleTarget(ev.target); }, { passive:true });
    root.addEventListener("focusin",  function(ev){ handleTarget(ev.target); });
  }

  // ---------- Поиск контейнера категории ----------
  function findCategoryRoot(){
    return document.querySelector(".category, .content--category, [data-component='category'], .content__body");
  }

  // ---------- Стили (как в исходном дизайне) ----------
  function injectStyles(){
    Lampa.Template.add("new_interface_style_dom",
      '\
      <style>\
        .new-interface{position:relative}\
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
        .new-interface .full-start__background{position:absolute;left:0;right:0;width:100%;height:108%;top:-6em;object-fit:cover;opacity:0;transition:opacity .25s;}\
        .new-interface .full-start__background.loaded{opacity:.35;}\
        .new-interface .full-start__rate{font-size:1.3em;margin-right:0;}\
        .new-interface .card__promo{display:none;}\
        .new-interface .card.card--wide+.card-more .card-more__box{padding-bottom:95%;}\
        .new-interface .card.card--wide .card-watched{display:none!important;}\
        body.light--version .new-interface-info__body{width:69%;padding-top:1.5em;}\
        body.light--version .new-interface-info{height:25.3em;}\
        body.advanced--animation:not(.no--animation) .new-interface .card--small.card--wide.focus .card__view{animation:animation-card-focus .2s}\
        body.advanced--animation:not(.no--animation) .new-interface .card--small.card--wide.animate-trigger-enter .card__view{animation:animation-trigger-enter .2s forwards}\
      </style>');
    $("body").append(Lampa.Template.get("new_interface_style_dom", {}, true));
  }

  // ---------- Жизненный цикл ----------
  function onActivityStart(a){
    if (!a) return;
    var src = a.source, comp = a.component;
    if (window.innerWidth < MIN_WIDTH) return;
    if (!ENABLE_ON_SOURCE[src]) return;
    if (!ENABLE_ON_COMPONENT[comp]) return;

    // пытаемся найти контейнер и смонтироваться
    var tries = 0;
    var id = setInterval(function(){
      var root = findCategoryRoot();
      if (root){
        clearInterval(id);
        // первая карточка
        var firstCard = root.querySelector(".card");
        var firstData = firstCard ? getCardDataFromElement(firstCard) : null;

        var mount = mountInCategory(root, firstData);
        wireCardEvents(root);
        noty("Mounted in category");
      } else if (++tries > 80){
        clearInterval(id);
        noty("Category root not found");
      }
    }, 100);
  }

  function start(){
    injectStyles();
    try{
      Lampa.Listener.follow("activity", function(e){
        if (e.type === "start") onActivityStart(e.object || {});
      });
    }catch(e){}
    // если уже на категории
    try{
      var act = Lampa.Activity && Lampa.Activity.active && Lampa.Activity.active();
      if (act) onActivityStart(act);
    }catch(e){}
  }

  function init(){
    if (window.appready){ start(); return; }
    if (Lampa.Listener && Lampa.Listener.follow){
      Lampa.Listener.follow("app", function(e){ if (e.type==="ready") start(); });
      return;
    }
    var t = setInterval(function(){
      if (window.Lampa && Lampa.Manifest){ clearInterval(t); start(); }
    }, 100);
  }

  try{ init(); }catch(e){ noty("init error"); }
})();
