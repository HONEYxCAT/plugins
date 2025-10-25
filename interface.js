(function () {
  "use strict";

  if (window.__new_interface_plugin_installed__) return;
  window.__new_interface_plugin_installed__ = true;

  // ---------- CSS ----------
  function injectStylesOnce() {
    if (document.getElementById("new_interface_style")) return;
    var style = document.createElement("style");
    style.id = "new_interface_style";
    style.textContent =
      ".new-interface{position:relative}" +
      ".new-interface .card--small.card--wide{width:18.3em}" +
      ".new-interface-info{position:relative;padding:1.5em;height:24em}" +
      ".new-interface-info__body{width:80%;padding-top:1.1em}" +
      ".new-interface-info__head{color:rgba(255,255,255,.6);margin-bottom:1em;font-size:1.3em;min-height:1em}" +
      ".new-interface-info__head span{color:#fff}" +
      ".new-interface-info__title{font-size:4em;font-weight:600;margin-bottom:.3em;overflow:hidden;text-overflow:\".\";display:-webkit-box;-webkit-line-clamp:1;line-clamp:1;-webkit-box-orient:vertical;margin-left:-.03em;line-height:1.3}" +
      ".new-interface-info__details{margin-bottom:1.6em;display:flex;align-items:center;flex-wrap:wrap;min-height:1.9em;font-size:1.1em}" +
      ".new-interface-info__split{margin:0 1em;font-size:.7em}" +
      ".new-interface-info__description{font-size:1.2em;font-weight:300;line-height:1.5;overflow:hidden;text-overflow:\".\";display:-webkit-box;-webkit-line-clamp:4;line-clamp:4;-webkit-box-orient:vertical;width:70%}" +
      ".new-interface .card-more__box{padding-bottom:95%}" +
      ".new-interface .full-start__background{height:108%;top:-6em}" +
      ".new-interface .full-start__rate{font-size:1.3em;margin-right:0}" +
      ".new-interface .card__promo{display:none}" +
      ".new-interface .card.card--wide+.card-more .card-more__box{padding-bottom:95%}" +
      ".new-interface .card.card--wide .card-watched{display:none!important}" +
      "body.light--version .new-interface-info__body{width:69%;padding-top:1.5em}" +
      "body.light--version .new-interface-info{height:25.3em}" +
      "body.advanced--animation:not(.no--animation) .new-interface .card--small.card--wide.focus .card__view{animation:animation-card-focus .2s}" +
      "body.advanced--animation:not(.no--animation) .new-interface .card--small.card--wide.animate-trigger-enter .card__view{animation:animation-trigger-enter .2s forwards}";
    (document.head || document.body).appendChild(style);
  }

  // ---------- Инфо-блок ----------
  function buildInfoBlock() {
    var $root = $(
      '<div class="new-interface-info">'+
        '<div class="new-interface-info__body">'+
          '<div class="new-interface-info__head"></div>'+
          '<div class="new-interface-info__title"></div>'+
          '<div class="new-interface-info__details"></div>'+
          '<div class="new-interface-info__description"></div>'+
        '</div>'+
      '</div>'
    );

    function draw(movie) {
      var year = ((movie.release_date || movie.first_air_date || "0000")+"").slice(0,4);
      var vote = parseFloat((movie.vote_average || 0)+"").toFixed(1);
      var head = [];
      var details = [];
      var countries = Lampa.Api.sources.tmdb.parseCountries(movie);
      var pg = Lampa.Api.sources.tmdb.parsePG(movie);

      if (year !== "0000") head.push("<span>"+year+"</span>");
      if (countries.length) head.push(countries.join(", "));
      if (vote > 0) details.push('<div class="full-start__rate"><div>'+vote+'</div><div>TMDB</div></div>');
      if (movie.genres && movie.genres.length) details.push(movie.genres.map(function(g){return Lampa.Utils.capitalizeFirstLetter(g.name);}).join(" | "));
      if (movie.runtime) details.push(Lampa.Utils.secondsToTime(movie.runtime*60,true));
      if (pg) details.push('<span class="full-start__pg" style="font-size:.9em">'+pg+'</span>');

      $root.find(".new-interface-info__head").html(head.join(", "));
      $root.find(".new-interface-info__details").html(details.join('<span class="new-interface-info__split">&#9679;</span>'));
    }

    function updateBase(data) {
      $root.find(".new-interface-info__head,.new-interface-info__details").text("---");
      $root.find(".new-interface-info__title").text(data.title || data.name || "");
      $root.find(".new-interface-info__description").text(data.overview || Lampa.Lang.translate("full_notext"));
      Lampa.Background.change(Lampa.Api.img(data.backdrop_path,"w200"));
    }

    function loadAndDraw(data) {
      updateBase(data);
      var url = Lampa.TMDB.api((data.name?"tv":"movie")+"/"+data.id+"?api_key="+Lampa.TMDB.key()+"&append_to_response=content_ratings,release_dates&language="+Lampa.Storage.get("language"));
      var net = new Lampa.Reguest();
      net.timeout(5000);
      net.silent(url, function(movie){ draw(movie); });
    }

    return { root:$root, update:loadAndDraw };
  }

  // ---------- Хук на готовый экран ----------
  function onFullComplite(e) {
    // e.object.activity — текущая активность FULL
    var $activity = e.object.activity.render();
    var $body = $activity.find(".activity__body");
    if (!$body.length) return;

    // оборачиваем экран, чтобы классы сработали
    if (!$activity.hasClass("new-interface")) $activity.addClass("new-interface");

    // добавляем инфоблок один раз вверху
    if (!$activity.data("new-interface-installed")) {
      injectStylesOnce();
      var info = buildInfoBlock();
      // вставляем перед скроллом карточек, но внутри activity__body
      $body.prepend(info.root);
      $activity.data("new-interface-installed", info);

      // подписываемся на фокус карточек на этом экране
      // ловим делегированно: любые карты внутри activity
      $activity.on("hover:focus hover:enter", ".card", function(){
        var data = $(this).data("card");
        if (data && data.id) info.update(data);
      });

      // первичная инициализация от активной карточки если есть
      var first = $activity.find(".card").first().data("card");
      if (first && first.id) info.update(first);
    }
  }

  // ---------- Старт ----------
  function start() {
    // ждём полноэкранный экран "full" и реагируем на его complite
    try {
      Lampa.Listener.follow("full", function(ev){
        if (ev.type === "complite") onFullComplite(ev);
      });
    } catch(_) {}
  }

  // подписка как у рабочего плагина: только после готовности приложения
  function onReadyWire() {
    try {
      if (Lampa.Listener && typeof Lampa.Listener.follow === "function") {
        Lampa.Listener.follow("app", function(ev){
          if (ev.type === "ready") start();
        });
      } else {
        // фолбэк
        var n=0, t=setInterval(function(){
          n++;
          if (window.Lampa && Lampa.Listener) { clearInterval(t); start(); }
          if (n>50) clearInterval(t);
        },100);
      }
    } catch(_) {}
  }

  // init
  if (window.Lampa) onReadyWire();
  else document.addEventListener("DOMContentLoaded", onReadyWire);
})();
