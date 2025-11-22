(function () {
	"use strict";

	// Класс, отвечающий за отображение информации о фильме (верхняя часть)
	function createInfo(object) {
		var html;
		var timer;
		var network = new Lampa.Reguest();
		var loaded = {};
		var last_id;

		this.create = function () {
			html = $('<div class="new-interface-info layer--height">\n <div class="new-interface-info__body">\n <div class="new-interface-info__head"></div>\n <div class="new-interface-info__title"></div>\n <div class="new-interface-info__details"></div>\n <div class="new-interface-info__description"></div>\n </div>\n </div>');
		};

		this.update = function (data) {
			if (last_id === data.id) return;
			last_id = data.id;

			html.find(".new-interface-info__head,.new-interface-info__details").text("");
			html.find(".new-interface-info__title").text(data.title || data.name);
			html.find(".new-interface-info__description").text(data.overview || Lampa.Lang.translate("full_notext"));

			// Используем безопасную смену фона
			var backdrop = data.backdrop_path || data.poster_path;
			if (backdrop) Lampa.Background.change(Lampa.Api.img(backdrop));

			this.load(data);
		};

		this.draw = function (data) {
			var create = ((data.release_date || data.first_air_date || "0000") + "").slice(0, 4);
			var vote = parseFloat((data.vote_average || 0) + "").toFixed(1);
			var head = [];
			var details = [];

			// Безопасное получение стран и PG
			var countries = data.production_countries
				? data.production_countries.map(function (c) {
						return c.name;
					})
				: [];
			if (Lampa.Api.sources.tmdb && Lampa.Api.sources.tmdb.parseCountries) countries = Lampa.Api.sources.tmdb.parseCountries(data);

			var pg = null;
			if (Lampa.Api.sources.tmdb && Lampa.Api.sources.tmdb.parsePG) pg = Lampa.Api.sources.tmdb.parsePG(data);

			if (create !== "0000") head.push("<span>" + create + "</span>");
			if (countries.length > 0) head.push(countries.slice(0, 3).join(", "));

			if (vote > 0) details.push('<div class="full-start__rate"><div>' + vote + "</div><div>TMDB</div></div>");

			if (data.genres && data.genres.length > 0)
				details.push(
					data.genres
						.slice(0, 3) // Ограничим кол-во жанров
						.map(function (item) {
							return Lampa.Utils.capitalizeFirstLetter(item.name);
						})
						.join(" | "),
				);

			if (data.runtime) details.push(Lampa.Utils.secondsToTime(data.runtime * 60, true));
			if (data.episode_run_time && data.episode_run_time[0]) details.push(Lampa.Utils.secondsToTime(data.episode_run_time[0] * 60, true));

			if (pg) details.push('<span class="full-start__pg" style="font-size: 0.9em;">' + pg + "</span>");

			html.find(".new-interface-info__head").empty().append(head.join('<span class="new-interface-info__split">&#9679;</span>'));
			html.find(".new-interface-info__details").html(details.join('<span class="new-interface-info__split">&#9679;</span>'));
		};

		this.load = function (data) {
			var _this = this;
			clearTimeout(timer);

			// АДАПТАЦИЯ: Правильное построение URL для новых версий Lampa
			var type = data.name ? "tv" : "movie";
			var params = "append_to_response=content_ratings,release_dates,external_ids&language=" + Lampa.Storage.get("language");
			var url = Lampa.TMDB.url(type + "/" + data.id, params);

			if (loaded[url]) return this.draw(loaded[url]);

			timer = setTimeout(function () {
				network.clear();
				network.timeout(5000);
				network.silent(url, function (movie) {
					loaded[url] = movie;
					_this.draw(movie);
				});
			}, 300);
		};

		this.render = function () {
			return html;
		};

		this.empty = function () {
			last_id = null;
		};

		this.destroy = function () {
			clearTimeout(timer);
			network.clear();
			html.remove();
			loaded = {};
			html = null;
		};
	}

	// Основной компонент интерфейса
	function component(object) {
		var network = new Lampa.Reguest();
		var scroll = new Lampa.Scroll({
			mask: true,
			over: true,
			scroll_by_item: true,
		});
		var items = [];
		var html = $('<div class="new-interface"><div class="new-interface__bg"></div></div>');
		var active = 0;
		var info;
		var lezydata;
		// Принудительно включаем режим просмотра, так как плагин заточен под него
		var viewall = true;
		var background_img = $('<img class="full-start__background">');
		var background_last = "";
		var background_timer;

		this.create = function () {
			// Инициализация DOM
			html.find(".new-interface__bg").append(background_img);
		};

		this.empty = function () {
			var button;

			if (object.source == "tmdb") {
				button = $('<div class="empty__footer"><div class="simple-button selector">' + Lampa.Lang.translate("change_source_on_cub") + "</div></div>");
				button.find(".selector").on("hover:enter", function () {
					Lampa.Storage.set("source", "cub");
					Lampa.Activity.replace({
						source: "cub",
					});
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
				this.next(
					function (new_data) {
						_this.next_wait = false;
						new_data.forEach(_this.append.bind(_this));
						Lampa.Layer.visible(items[active + 1].render(true));
					},
					function () {
						_this.next_wait = false;
					},
				);
			}
		};

		this.build = function (data) {
			var _this2 = this;
			lezydata = data;

			info = new createInfo(object);
			info.create();

			scroll.minus(info.render());

			// Рендерим данные
			data.forEach(this.append.bind(this));

			html.append(info.render());
			html.append(scroll.render());

			Lampa.Layer.update(html);
			Lampa.Layer.visible(scroll.render(true));

			scroll.onEnd = this.loadNext.bind(this);

			scroll.onWheel = function (step) {
				if (!Lampa.Controller.own(_this2)) _this2.start();
				if (step > 0) _this2.down();
				else if (active > 0) _this2.up();
			};

			this.activity.loader(false);
			this.activity.toggle();
		};

		this.background = function (elem) {
			var new_background = Lampa.Api.img(elem.backdrop_path || elem.poster_path, "w1280");

			clearTimeout(background_timer);
			if (new_background == background_last) return;

			background_timer = setTimeout(function () {
				background_img.removeClass("loaded");

				// Предзагрузка изображения
				var img_preloader = new Image();
				img_preloader.onload = function () {
					background_img.attr("src", new_background);
					background_img.addClass("loaded");
				};
				img_preloader.onerror = function () {
					background_img.removeClass("loaded");
				};
				img_preloader.src = new_background;

				background_last = new_background;
			}, 500);
		};

		this.append = function (element) {
			var _this3 = this;
			if (element.ready) return;
			element.ready = true;

			var item = new Lampa.InteractionLine(element, {
				url: element.url,
				card_small: true,
				cardClass: "card--small card--wide", // Явно задаем классы
				genres: object.genres,
				object: object,
				card_wide: true,
				nomore: element.nomore,
			});

			item.create();

			item.onDown = this.down.bind(this);
			item.onUp = this.up.bind(this);
			item.onBack = this.back.bind(this);

			item.onToggle = function () {
				active = items.indexOf(item);
			};

			if (this.onMore) item.onMore = this.onMore.bind(this);

			item.onFocus = function (elem) {
				info.update(elem);
				_this3.background(elem);
			};

			item.onHover = function (elem) {
				info.update(elem);
				_this3.background(elem);
			};

			item.onFocusMore = info.empty.bind(info);

			scroll.append(item.render());
			items.push(item);
		};

		this.back = function () {
			Lampa.Activity.backward();
		};

		this.down = function () {
			if (active + 1 < items.length) {
				active++;
				items[active].toggle();
				scroll.update(items[active].render());
			}
		};

		this.up = function () {
			if (active > 0) {
				active--;
				items[active].toggle();
				scroll.update(items[active].render());
			} else {
				Lampa.Controller.toggle("head");
			}
		};

		this.start = function () {
			var _this4 = this;
			Lampa.Controller.add("content", {
				toggle: function () {
					Lampa.Controller.collectionSet(scroll.render());
					Lampa.Controller.collectionFocus(items[active] ? false : items[0], scroll.render());
				},
				left: function () {
					if (Navigator.canmove("left")) Navigator.move("left");
					else Lampa.Controller.toggle("menu");
				},
				right: function () {
					if (Navigator.canmove("right")) Navigator.move("right");
				},
				up: function () {
					if (Navigator.canmove("up")) Navigator.move("up");
					else _this4.up();
				},
				down: function () {
					if (Navigator.canmove("down")) Navigator.move("down");
					else _this4.down();
				},
				back: this.back,
			});
			Lampa.Controller.toggle("content");
		};

		this.pause = function () {};
		this.stop = function () {};

		this.render = function () {
			return html;
		};

		this.destroy = function () {
			network.clear();
			items.forEach(function (item) {
				if (item.destroy) item.destroy();
			});
			Lampa.Arrays.destroy(items);
			scroll.destroy();
			if (info) info.destroy();
			html.remove();
			items = null;
			network = null;
			lezydata = null;
		};
	}

	function startPlugin() {
		window.plugin_interface_ready = true;
		var old_interface = Lampa.InteractionMain;
		var new_interface = component;

		// Переопределяем InteractionMain
		Lampa.InteractionMain = function (object) {
			// Проверяем, нужно ли использовать новый интерфейс
			var use = new_interface;

			// Условия отката к стандартному интерфейсу
			if (!(object.source == "tmdb" || object.source == "cub")) use = old_interface;
			if (window.innerWidth < 767) use = old_interface; // На мобильных старый лучше

			return new use(object);
		};

		// Добавляем CSS стили
		var css = `
            .new-interface .card--small.card--wide {
                width: 18.3em;
            }
            .new-interface-info {
                position: relative;
                padding: 2em;
                height: 28em;
                z-index: 2;
            }
            .new-interface-info__body {
                width: 80%;
                padding-top: 1.5em;
            }
            .new-interface-info__head {
                color: rgba(255, 255, 255, 0.6);
                margin-bottom: 1em;
                font-size: 1.3em;
                min-height: 1em;
            }
            .new-interface-info__head span {
                color: #fff;
            }
            .new-interface-info__title {
                font-size: 3.5em;
                font-weight: 600;
                margin-bottom: 0.3em;
                overflow: hidden;
                white-space: nowrap;
                text-overflow: ellipsis;
                line-height: 1.3;
            }
            .new-interface-info__details {
                margin-bottom: 1.6em;
                display: flex;
                align-items: center;
                flex-wrap: wrap;
                min-height: 1.9em;
                font-size: 1.1em;
            }
            .new-interface-info__split {
                margin: 0 1em;
                font-size: 0.7em;
                opacity: 0.5;
            }
            .new-interface-info__description {
                font-size: 1.2em;
                font-weight: 300;
                line-height: 1.5;
                overflow: hidden;
                display: -webkit-box;
                -webkit-line-clamp: 4;
                -webkit-box-orient: vertical;
                width: 70%;
                text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
            }
            .new-interface .card-more__box {
                padding-bottom: 95%;
            }
            .new-interface .full-start__background {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                object-fit: cover;
                z-index: -1;
                opacity: 0;
                transition: opacity 0.5s ease;
            }
            .new-interface .full-start__background.loaded {
                opacity: 0.3;
            }
            .new-interface .card__promo {
                display: none;
            }
            .new-interface .card.card--wide .card-watched {
                display: none !important;
            }

            /* Анимации */
            body.advanced--animation:not(.no--animation) .new-interface .card--small.card--wide.focus .card__view {
                transform: scale(1.05);
                transition: transform 0.2s;
            }
        `;

		Lampa.Template.add("new_interface_style", "<style>" + css + "</style>");
		$("body").append(Lampa.Template.get("new_interface_style", {}, true));
	}

	if (!window.plugin_interface_ready) {
		// Проверяем загрузилась ли Lampa
		if (window.Lampa) startPlugin();
		else {
			// Если скрипт запущен до Lampa, ждем
			var waitLampa = setInterval(function () {
				if (window.Lampa) {
					clearInterval(waitLampa);
					startPlugin();
				}
			}, 100);
		}
	}
})();
