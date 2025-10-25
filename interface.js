(function () {
  "use strict";

  /************* CONFIG *************/
  var DEBUG_STORAGE_KEY = "new_interface_debug";         // включить/выключить телеметрию через Lampa.Storage
  var DEBUG_DEFAULT = true;                              // включено по умолчанию
  var NOTY_THROTTLE_MS = 800;                            // антиспам Noty
  var MIN_VERSION = 153;                                 // минимальная версия ядра
  /**********************************/

  // ---- утилиты логирования ----
  var lastNoty = 0;
  var logBuffer = [];

  function getDebug() {
    var stored = Lampa.Storage.get(DEBUG_STORAGE_KEY);
    if (typeof stored === "boolean") return stored;
    Lampa.Storage.set(DEBUG_STORAGE_KEY, DEBUG_DEFAULT);
    return DEBUG_DEFAULT;
  }

  function noty(msg) {
    if (!getDebug()) return;
    var now = Date.now();
    if (now - lastNoty < NOTY_THROTTLE_MS) return;
    lastNoty = now;
    try {
      Lampa.Noty.show("[new-interface] " + msg);
    } catch (e) {
      // игнор
    }
  }

  function dlog() {
    var msg = Array.prototype.slice.call(arguments).join(" ");
    logBuffer.push(msg);
    if (logBuffer.length > 200) logBuffer.shift();
    try { console.log("[new-interface]", msg); } catch (e) {}
    noty(msg);
  }

  function dumpBufferModal() {
    try {
      Lampa.Modal.open({
        title: "new-interface · debug",
        html: '<div style="white-space:pre-wrap;font-size:1em;line-height:1.45em;max-height:70vh;overflow:auto;padding:.5em;background:rgba(255,255,255,.06);border-radius:.5em;">'
            + logBuffer.join("\n")
            + "</div>",
        onBack: function () {
          Lampa.Modal.close();
          Lampa.Controller.toggle("content");
        }
      });
    } catch (e) {
      noty("Modal error: " + (e && e.message));
    }
  }

  // горячая кнопка: удержание «Info»/«i» откроет модал с логами
  function bindDebugHotkey() {
    try {
      Lampa.Controller.listener.follow("keydown", function (e) {
        if (!getDebug()) return;
        // keyCode 73 = I, 457 = Info на некоторых пультах
        if (e.code === "KeyI" || e.keyCode === 73 || e.keyCode === 457) {
          dumpBufferModal();
        }
      });
    } catch (e) {}
  }

  // ожидание появления функции
  function waitFor(fn, cb, timeoutMs, label) {
    var t0 = Date.now();
    var id = setInterval(function () {
      try {
        if (fn()) {
          clearInterval(id);
          cb(true);
        } else if (Date.now() - t0 > (timeoutMs || 15000)) {
          clearInterval(id);
          dlog("waitFor timeout:", label || "unnamed");
          cb(false);
        }
      } catch (e) {
        clearInterval(id);
        dlog("waitFor error:", label || "unnamed", e && e.message);
        cb(false);
      }
    }, 100);
    return id;
  }

  // ---- info-блок ----
  function InfoBlock(object) {
    var html;
    var timer;
    var network = new Lampa.Reguest();
    var loaded = {};

    this.create = function () {
      html = $(
        '<div class="new-interface-info">\
          <div class="new-interface-info__body">\
            <div class="new-interface-info__head"></div>\
            <div class="new-interface-info__title"></div>\
            <div class="new-interface-info__details"></div>\
            <div class="new-interface-info__description"></div>\
          </div>\
        </div>'
      );
    };

    this.update = function (data) {
      if (!html) return;
      html.find(".new-interface-info__head,.new-interface-info__details").text("---");
      html.find(".new-interface-info__title").text(data.title || data.name || "");
      html.find(".new-interface-info__description").text(data.overview || Lampa.Lang.translate("full_notext"));
      if (data.backdrop_path) Lampa.Background.change(Lampa.Api.img(data.backdrop_path, "w200"));
      this.load(data);
    };

    this.draw = function (data) {
      if (!html) return;
      var year = ((data.release_date || data.first_air_date || "0000") + "").slice(0, 4);
      var vote = parseFloat((data.vote_average || 0) + "").toFixed(1);
      var head = [];
      var details = [];
      var countries = (Lampa.Api.sources && Lampa.Api.sources.tmdb && Lampa.Api.sources.tmdb.parseCountries)
        ? Lampa.Api.sources.tmdb.parseCountries(data) : [];
      var pg = (Lampa.Api.sources && Lampa.Api.sources.tmdb && Lampa.Api.sources.tmdb.parsePG)
        ? Lampa.Api.sources.tmdb.parsePG(data) : "";

      if (year !== "0000") head.push("<span>" + year + "</span>");
      if (countries.length > 0) head.push(countries.join(", "));
      if (+vote > 0) details.push('<div class="full-start__rate"><div>' + vote + "</div><div>TMDB</div></div>");
      if (data.genres && data.genres.length > 0) {
        details.push(data.genres.map(function (i) { return Lampa.Utils.capitalizeFirstLetter(i.name); }).join(" | "));
      }
      if (data.runtime) details.push(Lampa.Utils.secondsToTime(data.runtime * 60, true));
      if (pg) details.push('<span class="full-start__pg" style="font-size:0.9em;">' + pg + "</span>");

      html.find(".new-interface-info__head").empty().append(head.join(", "));
      html.find(".new-interface-info__details").html(details.join('<span class="new-interface-info__split">&#9679;</span>'));
    };

    this.load = function (data) {
      var _this = this;
      clearTimeout(timer);
      var lang = Lampa.Storage.get("language") || "ru-RU";
      var kind = data.name ? "tv" : "movie";
      var url = Lampa.TMDB.api(kind + "/" + data.id + "?api_key=" + Lampa.TMDB.key()
        + "&append_to_response=content_ratings,release_dates&language=" + lang);

      if (loaded[url]) return this.draw(loaded[url]);

      timer = setTimeout(function () {
        network.clear();
        network.timeout(5000);
        network.silent(url, function (movie) {
          loaded[url] = movie;
          _this.draw(movie);
        }, function () {
          dlog("InfoBlock.load fail", url);
        });
      }, 300);
    };

    this.render = function () { return html; };
    this.empty = function () {};
    this.destroy = function () {
      if (html) html.remove();
      loaded = {};
      html = null;
      network.clear();
    };
  }

  // ---- основной компонент ----
  function NewInterfaceComponent(object) {
    var network = new Lampa.Reguest();
    var scroll = new Lampa.Scroll({ mask: true, over: true, scroll_by_item: true });
    var items = [];
    var html = $('<div class="new-interface"><img class="full-start__background" alt=""></div>');
    var active = 0;
    var info;
    var lazyData;
    var newlampa = (Lampa.Manifest.app_digital || 0) >= 166;
    var viewall = Lampa.Storage.field("card_views_type") == "view" || Lampa.Storage.field("navigation_type") == "mouse";
    var background_img = html.find(".full-start__background");
    var background_last = "";
    var background_timer;

    this.create = function () {};
    this.empty = function () {
      var button;
      if (object.source == "tmdb") {
        button = $('<div class="empty__footer"><div class="simple-button selector">'
          + Lampa.Lang.translate("change_source_on_cub") + "</div></div>");
        button.find(".selector").on("hover:enter", function () {
          Lampa.Storage.set("source", "cub");
          Lampa.Activity.replace({ source: "cub" });
        });
      }
      var empty = new Lampa.Empty();
      html.append(empty.render(button));
      this.start = empty.start;
      this.activity.loader(false);
      this.activity.toggle();
    };

    this.loadNext = function () {
      var _this = this;
      if (this.next && !this.next_wait && items.length) {
        this.next_wait = true;
        this.next(function (new_data) {
          _this.next_wait = false;
          new_data.forEach(_this.append.bind(_this));
          if (items[active + 1]) Lampa.Layer.visible(items[active + 1].render(true));
        }, function () { _this.next_wait = false; });
      }
    };

    this.push = function () {};

    this.build = function (data) {
      var _this2 = this;
      lazyData = data;

      info = new InfoBlock(object);
      info.create();
      html.append(info.render());
      html.append(scroll.render());
      (viewall ? data : data.slice(0, 2)).forEach(this.append.bind(this));

      if (newlampa) {
        Lampa.Layer.update(html);
        Lampa.Layer.visible(scroll.render(true));
        scroll.onEnd = this.loadNext.bind(this);
        scroll.onWheel = function (step) {
          if (!Lampa.Controller.own(_this2)) _this2.start();
          if (step > 0) _this2.down();
          else if (active > 0) _this2.up();
        };
      }

      this.activity.loader(false);
      this.activity.toggle();
    };

    this.background = function (elem) {
      var new_background = elem.backdrop_path ? Lampa.Api.img(elem.backdrop_path, "w1280") : "";
      clearTimeout(background_timer);
      if (!new_background || new_background == background_last) return;
      background_timer = setTimeout(function () {
        background_img.removeClass("loaded");
        background_img[0].onload = function () { background_img.addClass("loaded"); };
        background_img[0].onerror = function () { background_img.removeClass("loaded"); };
        background_last = new_background;
        setTimeout(function () { background_img[0].src = background_last; }, 300);
      }, 1000);
    };

    this.append = function (element) {
      var _this3 = this;
      if (element.ready) return;
      element.ready = true;

      var item = new Lampa.InteractionLine(element, {
        url: element.url,
        card_small: true,
        cardClass: element.cardClass,
        genres: object.genres,
        object: object,
        card_wide: true,
        nomore: element.nomore
      });

      item.create();
      item.onDown = this.down.bind(this);
      item.onUp = this.up.bind(this);
      item.onBack = this.back.bind(this);
      item.onToggle = function () { active = items.indexOf(item); };
      if (this.onMore) item.onMore = this.onMore.bind(this);

      item.onFocus = function (elem) { info.update(elem); _this3.background(elem); };
      item.onHover = function (elem) { info.update(elem); _this3.background(elem); };
      item.onFocusMore = info.empty.bind(info);

      scroll.append(item.render());
      items.push(item);
    };

    this.back = function () { Lampa.Activity.backward(); };
    this.down = function () {
      active = Math.min(active + 1, items.length - 1);
      if (!viewall) lazyData.slice(0, active + 2).forEach(this.append.bind(this));
      items[active].toggle();
      scroll.update(items[active].render());
    };
    this.up = function () {
      active--;
      if (active < 0) { active = 0; Lampa.Controller.toggle("head"); }
      else { items[active].toggle(); scroll.update(items[active].render()); }
    };

    this.start = function () {
      var _this4 = this;
      Lampa.Controller.add("content", {
        link: this,
        toggle: function () {
          if (_this4.activity.canRefresh()) return false;
          if (items.length) items[active].toggle();
        },
        update: function () {},
        left: function () { if (Navigator.canmove("left")) Navigator.move("left"); else Lampa.Controller.toggle("menu"); },
        right: function () { Navigator.move("right"); },
        up: function () { if (Navigator.canmove("up")) Navigator.move("up"); else Lampa.Controller.toggle("head"); },
        down: function () { if (Navigator.canmove("down")) Navigator.move("down"); },
        back: this.back
      });
      Lampa.Controller.toggle("content");
    };

    this.refresh = function () { this.activity.loader(true); this.activity.need_refresh = true; };
    this.pause = function () {};
    this.stop  = function () {};
    this.render = function () { return html; };
    this.destroy = function () {
      network.clear();
      Lampa.Arrays.destroy(items);
      scroll.destroy();
      if (info) info.destroy();
      html.remove();
    };
  }

  // ---- подмена с телеметрией ----
  function hookInteractionMain() {
    if (hookInteractionMain._applied) return;
    if (typeof Lampa.InteractionMain !== "function") {
      dlog("InteractionMain missing, cannot hook");
      return;
    }
    hookInteractionMain._applied = true;

    var old_interface = Lampa.InteractionMain;
    var new_interface = NewInterfaceComponent;

    Lampa.InteractionMain = function (object) {
      var use = new_interface;
      var reasons = [];

      var src = object && object.source;
      var comp = object && object.component;
      var page = object && object.page;

      if (!(src === "tmdb" || src === "cub")) { use = old_interface; reasons.push("source=" + src); }
      if (window.innerWidth < 767)            { use = old_interface; reasons.push("width=" + window.innerWidth); }
      if ((Lampa.Manifest.app_digital || 0) < MIN_VERSION) { use = old_interface; reasons.push("version=" + Lampa.Manifest.app_digital); }

      var tag = "apply";
      if (use === old_interface) tag = "skip";
      dlog("InteractionMain", tag, "| src:", src, "comp:", comp, "page:", page, "| reasons:", reasons.join(",") || "none");

      return new use(object);
    };

    dlog("Hooked InteractionMain");
  }

  // некоторые сборки могут перезаписать подмену позже — переустановим хук
  function watchdogHook() {
    var lastRef = Lampa.InteractionMain && Lampa.InteractionMain.toString();
    setInterval(function () {
      try {
        var cur = Lampa.InteractionMain && Lampa.InteractionMain.toString();
        if (lastRef !== cur) {
          lastRef = cur;
          hookInteractionMain._applied = false;
          dlog("InteractionMain changed by core, re-hook");
          hookInteractionMain();
        }
      } catch (e) {}
    }, 1500);
  }

  // ---- стили ----
  function injectStyles() {
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
    $("body").append(Lampa.Template.get("new_interface_style", {}, true));
    dlog("Styles injected");
  }

  // ---- старт по готовности приложения ----
  function startWhenReady() {
    // общий репорт об окружении
    dlog("Boot. app_digital:", Lampa.Manifest.app_digital, "version:", Lampa.Manifest.version,
         "is_tv:", Lampa.App && Lampa.App.isTv ? Lampa.App.isTv() : "?", "width:", window.innerWidth);

    injectStyles();
    bindDebugHotkey();

    waitFor(function () { return typeof Lampa.InteractionMain === "function"; },
      function () {
        hookInteractionMain();
        watchdogHook();
        // доп. сигнал при смене активити
        try {
          Lampa.Listener.follow("activity", function (e) {
            if (!getDebug()) return;
            if (e.type === "start") {
              var a = e.object || {};
              dlog("Activity start:", "name="+a.name, "source="+a.source, "component="+a.component, "url="+a.url);
            }
          });
        } catch (e) {}

        noty("Готов. Откройте каталог TMDB/CUB. Долгое нажатие I/Info — логи.");
      }, 12000, "InteractionMain"
    );
  }

  // ---- внешняя инициализация ----
  function init() {
    // ждём app:ready
    if (window.appready) {
      dlog("appready=true");
      startWhenReady();
      return;
    }
    if (Lampa.Listener && Lampa.Listener.follow) {
      Lampa.Listener.follow("app", function (e) {
        if (e.type === "ready") {
          dlog("event app:ready");
          startWhenReady();
        }
      });
      dlog("Subscribed app:ready");
      return;
    }
    // фолбэк
    dlog("Waiting app core...");
    waitFor(function () { return !!(window.Lampa && Lampa.Manifest); }, function (ok) {
      if (ok) startWhenReady();
      else dlog("Core wait timeout");
    }, 15000, "Lampa core");
  }

  // запуск
  try { init(); } catch (e) { noty("init error: " + (e && e.message)); }
})();
