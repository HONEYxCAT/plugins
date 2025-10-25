(function () {
  "use strict";

  if (window.__new_interface_plugin_installed__) return;
  window.__new_interface_plugin_installed__ = true;

  // ========== INFO VIEW ==========
  function InfoView() {
    var html;
    var timer;
    var network = new Lampa.Reguest();
    var loaded = {};

    this.create = function () {
      html = $(
        '<div class="new-interface-info">' +
          '<div class="new-interface-info__body">' +
            '<div class="new-interface-info__head"></div>' +
            '<div class="new-interface-info__title"></div>' +
            '<div class="new-interface-info__details"></div>' +
            '<div class="new-interface-info__description"></div>' +
          '</div>' +
        '</div>'
      );
    };

    this.update = function (data) {
      html.find(".new-interface-info__head,.new-interface-info__details").text("---");
      html.find(".new-interface-info__title").text(data.title || data.name || "");
      html.find(".new-interface-info__description").text(data.overview || Lampa.Lang.translate("full_notext"));
      Lampa.Background.change(Lampa.Api.img(data.backdrop_path, "w200"));
      this.load(data);
    };

    this.draw = function (data) {
      var year = ((data.release_date || data.first_air_date || "0000") + "").slice(0, 4);
      var vote = parseFloat((data.vote_average || 0) + "").toFixed(1);
      var head = [];
      var details = [];
      var countries = Lampa.Api.sources.tmdb.parseCountries(data);
      var pg = Lampa.Api.sources.tmdb.parsePG(data);

      if (year !== "0000") head.push("<span>" + year + "</span>");
      if (countries.length > 0) head.push(countries.join(", "));
      if (vote > 0) details.push('<div class="full-start__rate"><div>' + vote + "</div><div>TMDB</div></div>");
      if (data.genres && data.genres.length > 0) {
        details.push(data.genres.map(function (g) { return Lampa.Utils.capitalizeFirstLetter(g.name); }).join(" | "));
      }
      if (data.runtime) details.push(Lampa.Utils.secondsToTime(data.runtime * 60, true));
      if (pg) details.push('<span class="full-start__pg" style="font-size: 0.9em;">' + pg + "</span>");

      html.find(".new-interface-info__head").empty().append(head.join(", "));
      html.find(".new-interface-info__details").html(details.join('<span class="new-interface-info__split">&#9679;</span>'));
    };

    this.load = function (data) {
      var self = this;
      clearTimeout(timer);

      var url = Lampa.TMDB.api(
        (data.name ? "tv" : "movie") + "/" + data.id +
        "?api_key=" + Lampa.TMDB.key() +
        "&append_to_response=content_ratings,release_dates" +
        "&language=" + Lampa.Storage.get("language")
      );

      if (loaded[url]) return this.draw(loaded[url]);

      timer = setTimeout(function () {
        network.clear();
        network.timeout(5000);
        network.silent(url, function (movie) {
          loaded[url] = movie;
          self.draw(movie);
        });
      }, 300);
    };

    this.render = function () { return html; };
    this.empty = function () {};
    this.destroy = function () {
      html && html.remove();
      loaded = {};
      html = null;
    };
  }

  // ========== MAIN COMPONENT ==========
  function NewInterfaceComponent(object) {
    var network = new Lampa.Reguest();
    var scroll = new Lampa.Scroll({ mask: true, over: true, scroll_by_item: true });
    var items = [];
    var html = $('<div class="new-interface"><img class="full-start__background"></div>');
    var active = 0;
    var info;
    var sourceData;
    var viewAll = Lampa.Storage.field("card_views_type") == "view" || Lampa.Storage.field("navigation_type") == "mouse";
    var backgroundImg = html.find(".full-start__background");
    var backgroundLast = "";
    var backgroundTimer;

    this.create = function () {};

    this.empty = function () {
      var button;
      if (object.source == "tmdb") {
        button = $('<div class="empty__footer"><div class="simple-button selector">' + Lampa.Lang.translate("change_source_on_cub") + "</div></div>");
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
      var self = this;
      if (this.next && !this.next_wait && items.length) {
        this.next_wait = true;
        this.next(function (more) {
          self.next_wait = false;
          more.forEach(self.append.bind(self));
          Lampa.Layer.visible(items[active + 1].render(true));
        }, function () { self.next_wait = false; });
      }
    };

    this.push = function () {};

    this.build = function (data) {
      var self = this;
      sourceData = data;

      info = new InfoView();
      info.create();
      scroll.minus(info.render());

      data.slice(0, viewAll ? data.length : 2).forEach(this.append.bind(this));

      html.append(info.render());
      html.append(scroll.render());

      Lampa.Layer.update(html);
      Lampa.Layer.visible(scroll.render(true));

      scroll.onEnd = this.loadNext.bind(this);
      scroll.onWheel = function (step) {
        if (!Lampa.Controller.own(self)) self.start();
        if (step > 0) self.down();
        else if (active > 0) self.up();
      };

      this.activity.loader(false);
      this.activity.toggle();
    };

    this.background = function (elem) {
      var next = Lampa.Api.img(elem.backdrop_path, "w1280");
      clearTimeout(backgroundTimer);
      if (next == backgroundLast) return;

      backgroundTimer = setTimeout(function () {
        backgroundImg.removeClass("loaded");

        backgroundImg[0].onload = function () {
          backgroundImg.addClass("loaded");
        };
        backgroundImg[0].onerror = function () {
          backgroundImg.removeClass("loaded");
        };

        backgroundLast = next;
        setTimeout(function () {
          backgroundImg[0].src = backgroundLast;
        }, 300);
      }, 1000);
    };

    this.append = function (element) {
      var self = this;
      if (element.ready) return;
      element.ready = true;

      var item = new Lampa.InteractionLine(element, {
        url: element.url,
        card_small: true,
        cardClass: element.cardClass,
        genres: object.genres,
        object: object,
        card_wide: true,
        nomore: element.nomore,
      });

      item.create();
      item.onDown = this.down.bind(this);
      item.onUp = this.up.bind(this);
      item.onBack = this.back.bind(this);
      item.onToggle = function () { active = items.indexOf(item); };
      if (this.onMore) item.onMore = this.onMore.bind(this);

      item.onFocus = function (elem) { info.update(elem); self.background(elem); };
      item.onHover = function (elem) { info.update(elem); self.background(elem); };

      item.onFocusMore = info.empty.bind(info);

      scroll.append(item.render());
      items.push(item);
    };

    this.back = function () { Lampa.Activity.backward(); };

    this.down = function () {
      active = Math.min(active + 1, items.length - 1);
      if (!viewAll) sourceData.slice(0, active + 2).forEach(this.append.bind(this));
      items[active].toggle();
      scroll.update(items[active].render());
    };

    this.up = function () {
      active--;
      if (active < 0) {
        active = 0;
        Lampa.Controller.toggle("head");
      } else {
        items[active].toggle();
        scroll.update(items[active].render());
      }
    };

    this.start = function () {
      var self = this;
      Lampa.Controller.add("content", {
        link: this,
        toggle: function () {
          if (self.activity.canRefresh()) return false;
          if (items.length) items[active].toggle();
        },
        update: function () {},
        left: function () { if (Navigator.canmove("left")) Navigator.move("left"); else Lampa.Controller.toggle("menu"); },
        right: function () { Navigator.move("right"); },
        up: function () { if (Navigator.canmove("up")) Navigator.move("up"); else Lampa.Controller.toggle("head"); },
        down: function () { if (Navigator.canmove("down")) Navigator.move("down"); },
        back: self.back,
      });
      Lampa.Controller.toggle("content");
    };

    this.refresh = function () {
      this.activity.loader(true);
      this.activity.need_refresh = true;
    };

    this.pause = function () {};
    this.stop = function () {};
    this.render = function () { return html; };

    this.destroy = function () {
      network.clear();
      Lampa.Arrays.destroy(items);
      scroll.destroy();
      info && info.destroy();
      html.remove();
      items = null;
      network = null;
      sourceData = null;
    };
  }

  // ========== STYLE INJECTION ==========
  function injectStylesOnce() {
    if (document.getElementById("new_interface_style")) return;
    var style = document.createElement("style");
    style.id = "new_interface_style";
    style.textContent =
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

  // ========== APPLY OVERRIDE ==========
  function applyOverride() {
    injectStylesOnce();

    var OldFactory = Lampa.InteractionMain;
    Lampa.InteractionMain = function (object) {
      return new NewInterfaceComponent(object);
    };

    try {
      var act = Lampa.Activity.active && Lampa.Activity.active();
      if (act && act.component === "main" && typeof act.refresh === "function") {
        act.refresh();
      } else {
        Lampa.Activity.replace({ component: "main" });
      }
    } catch (_) {}
  }

  // ========== START PLUGIN ==========
  function startPlugin() {
    try {
      if (Lampa.Listener && typeof Lampa.Listener.follow === "function") {
        Lampa.Listener.follow("app", function (e) {
          if (e.type === "ready") applyOverride();
        });
      } else {
        var tries = 0;
        var t = setInterval(function () {
          tries++;
          if (Lampa.Activity && Lampa.InteractionMain) {
            clearInterval(t);
            applyOverride();
          }
          if (tries > 50) clearInterval(t);
        }, 100);
      }
    } catch (_) {}
  }

  try {
    if (Lampa && Lampa.Activity && Lampa.InteractionMain) startPlugin();
    else document.addEventListener("DOMContentLoaded", startPlugin);
  } catch (_) {}
})();
