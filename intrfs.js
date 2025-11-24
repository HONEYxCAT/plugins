(function () {
    'use strict';

    // --- НАСТРОЙКИ ---
    if (window.Lampa && Lampa.SettingsApi) {
        Lampa.SettingsApi.addParam({
            component: 'interface',
            param: {
                name: 'logo_glav',
                type: 'select',
                values: {
                    1: 'Скрыть',
                    0: 'Отображать',
                },
                default: '0',
            },
            field: {
                name: 'Логотипы вместо названий',
                description: 'Отображает логотипы на главном экране вместо текста',
            }
        });
    }

    // --- ЦВЕТНЫЕ РЕЙТИНГИ ---
    function getRatingColor(vote) {
        if (vote >= 0 && vote <= 3) return "red";
        if (vote > 3 && vote < 6) return "orange";
        if (vote >= 6 && vote < 7) return "cornflowerblue";
        if (vote >= 7 && vote < 8) return "darkmagenta";
        if (vote >= 8 && vote <= 10) return "lawngreen";
        return "#fff";
    }

    function colorizeRatings(container) {
        var $container = $(container);
        var selectors = [
            ".card__vote", 
            ".full-start__rate > div:first-child", 
            ".full-start-new__rate > div:first-child",
            ".info__rate", 
            ".card__imdb-rate", 
            ".card__kinopoisk-rate"
        ];

        $container.find(selectors.join(',')).addBack(selectors.join(',')).each(function () {
            var $el = $(this);
            if ($el.attr('style') && $el.attr('style').indexOf('color') !== -1) return;

            var text = $el.text().trim();
            if (/^\d+(\.\d+)?K$/.test(text)) return;

            var match = text.match(/(\d+(\.\d+)?)/);
            if (match) {
                var vote = parseFloat(match[0]);
                if (!isNaN(vote)) {
                    $el.css("color", getRatingColor(vote));
                }
            }
        });
    }

    function setupGlobalColorObserver() {
        var observer = new MutationObserver(function (mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.addedNodes.length > 0) {
                    for (var i = 0; i < mutation.addedNodes.length; i++) {
                        var node = mutation.addedNodes[i];
                        if(node.nodeType === 1) colorizeRatings(node);
                    }
                }
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });
        colorizeRatings(document.body);
    }


    // --- КОМПОНЕНТЫ ИНТЕРФЕЙСА ---

    function InfoBlock() {
        var html;
        var timer;
        var timer_logo;
        var network = new Lampa.Reguest();
        var network_logo = new Lampa.Reguest();
        var loaded = {};
        var loaded_logos = {}; 

        this.create = function () {
            html = $('<div class="new-interface-info">\n            <div class="new-interface-info__body">\n                <div class="new-interface-info__head info-anim"></div>\n                <div class="new-interface-info__title info-anim"></div>\n                <div class="new-interface-info__details info-anim"></div>\n                <div class="new-interface-info__description info-anim"></div>\n            </div>\n        </div>');
        };

        this.update = function (data) {
            var _this = this;
            clearTimeout(timer);
            clearTimeout(timer_logo); 
            network.clear();
            network_logo.clear();

            var method = data.name ? "tv" : "movie";
            var url = Lampa.TMDB.api(method + "/" + data.id + "?api_key=" + Lampa.TMDB.key() + "&append_to_response=content_ratings,release_dates&language=" + Lampa.Storage.get("language"));

            var isCached = !!loaded[url];
            
            var bg = data.backdrop_path || data.poster_path || data.img;
            if(bg) Lampa.Background.change(Lampa.Api.img(bg, "w1280"));

            if (isCached) {
                html.find(".new-interface-info__head, .new-interface-info__details, .new-interface-info__title, .new-interface-info__description").removeClass('loading');
                this.draw(loaded[url], false);
            } else {
                html.find(".new-interface-info__head, .new-interface-info__details, .new-interface-info__title, .new-interface-info__description").addClass('loading');
                this.load(url, data);
            }
        };

        this.reveal = function() {
            requestAnimationFrame(function() {
                html.find(".new-interface-info__head, .new-interface-info__details, .new-interface-info__title, .new-interface-info__description").removeClass('loading');
            });
        };

        this.draw = function (data, animate) {
            html.find(".new-interface-info__description").text(data.overview || Lampa.Lang.translate("full_notext"));

            var clean_title = data.title || data.name;
            var create = ((data.release_date || data.first_air_date || "0000") + "").slice(0, 4);
            var vote = parseFloat((data.vote_average || 0) + "").toFixed(1);
            var head = [];
            var details = [];
            
            var countries = Lampa.Api.sources.tmdb.parseCountries(data);
            var pg = Lampa.Api.sources.tmdb.parsePG(data);

            if (create !== "0000") head.push("<span>" + create + "</span>");
            if (countries.length > 0) head.push(countries.slice(0, 3).join(", "));
            
            if (vote > 0) {
                var color = getRatingColor(vote);
                details.push('<div class="full-start__rate"><div style="color: '+color+'">' + vote + "</div><div>TMDB</div></div>");
            }
            
            if (data.genres && data.genres.length > 0) {
                details.push(data.genres.slice(0, 3).map(function (item) { return Lampa.Utils.capitalizeFirstLetter(item.name); }).join(" | "));
            }
            
            if (data.runtime) details.push(Lampa.Utils.secondsToTime(data.runtime * 60, true));
            if (pg) details.push('<span class="full-start__pg" style="font-size: 0.9em;">' + pg + "</span>");
            
            html.find(".new-interface-info__head").empty().append(head.join('<span class="new-interface-info__split">●</span>'));
            html.find(".new-interface-info__details").html(details.join('<span class="new-interface-info__split">●</span>'));

            if (Lampa.Storage.get('logo_glav') == '1') {
                this.showTitleText(clean_title, animate);
            } else {
                this.loadLogo(data, animate, clean_title);
            }
        };

        this.showTitleText = function(text, animate) {
            var title_el = html.find(".new-interface-info__title");
            title_el.text(text);
            
            if(animate) this.reveal();
            else title_el.removeClass('loading');
        };

        this.loadLogo = function(data, animate, clean_title) {
            var _this = this;
            clearTimeout(timer_logo);

            var method = data.name ? "tv" : "movie";
            var lang = Lampa.Storage.get('language', 'ru');
            var url = Lampa.TMDB.api(method + '/' + data.id + '/images?api_key=' + Lampa.TMDB.key() + '&include_image_language=' + lang + ',en,null');

            if(loaded_logos[url]) {
                this.drawLogo(loaded_logos[url], clean_title, animate);
                return;
            }

            var delay = animate ? 100 : 0;

            timer_logo = setTimeout(function() {
                network_logo.clear();
                network_logo.timeout(5000);
                network_logo.silent(url, function(images) {
                    var logo = null;
                    if (images.logos && images.logos.length > 0) {
                        var nativeLogo = images.logos.find(function(l) { return l.iso_639_1 === lang; });
                        if (nativeLogo) {
                            logo = nativeLogo.file_path;
                        } else {
                            var enLogo = images.logos.find(function(l) { return l.iso_639_1 === 'en'; });
                            logo = enLogo ? enLogo.file_path : images.logos[0].file_path;
                        }
                    }
                    loaded_logos[url] = logo || 'no_logo';
                    _this.drawLogo(logo, clean_title, animate);
                }, function() {
                    _this.drawLogo(null, clean_title, animate);
                });
            }, delay);
        };

        this.drawLogo = function(logo_path, title_text, animate) {
            var _this = this;
            if (Lampa.Storage.get('logo_glav') == '1') {
                this.showTitleText(title_text, animate);
                return;
            }

            var title_el = html.find(".new-interface-info__title");
            
            if (logo_path && logo_path !== 'no_logo') {
                var img_url = Lampa.TMDB.image('/t/p/w500' + logo_path.replace('.svg', '.png'));
                var img = new Image();
                
                img.onload = function() {
                    title_el.empty().append('<img class="logo-img" src="' + img_url + '" />');
                    if(animate) _this.reveal();
                    else title_el.removeClass('loading');
                };
                
                img.onerror = function() {
                    _this.showTitleText(title_text, animate);
                };
                
                img.src = img_url;
            } else {
                this.showTitleText(title_text, animate);
            }
        };

        this.load = function (url, data) {
            var _this = this;
            
            timer = setTimeout(function () {
                network.clear();
                network.timeout(5000);
                network.silent(url, function (movie) {
                    loaded[url] = movie;
                    _this.draw(movie, true);
                });
            }, 150);
        };

        this.render = function () {
            return html;
        };

        this.destroy = function () {
            network.clear();
            network_logo.clear();
            clearTimeout(timer);
            clearTimeout(timer_logo);
            html.remove();
            loaded = {};
            loaded_logos = {};
            html = null;
        };
    }

    // Основной компонент интерфейса
    function NewInterface(object) {
        var comp = new Lampa.InteractionMain(object);
        var scroll  = new Lampa.Scroll({ mask: true, over: true, scroll_by_item: true });
        var items   = [];
        var html    = $('<div class="new-interface"><div class="new-interface__background-layer"></div></div>');
        var active  = 0;
        var info;
        var lezydata;
        var viewall = Lampa.Storage.field("card_views_type") == "view" || Lampa.Storage.field("navigation_type") == "mouse";

        this.create = function () {
            this.activity.loader(true);
            Lampa.Api.main(object, this.build.bind(this), this.empty.bind(this));
            return this.render();
        };

        this.empty = function () {
            var empty = new Lampa.Empty();
            html.append(empty.render());
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
                    }
                );
            }
        };

        this.build = function (data) {
            var _this2 = this;
            lezydata = data;

            info = new InfoBlock();
            info.create();
            
            html.append(info.render());
            scroll.minus(info.render());
            html.append(scroll.render());

            data.slice(0, viewall ? data.length : 3).forEach(this.append.bind(this));

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
            colorizeRatings(item.render());

            item.onDown = this.down.bind(this);
            item.onUp   = this.up.bind(this);
            item.onBack = this.back.bind(this);

            item.onToggle = function () {
                active = items.indexOf(item);
            };

            if (this.onMore) item.onMore = this.onMore.bind(this);

            item.onFocus = function (elem) {
                info.update(elem);
            };
            
            item.onHover = function (elem) {
                info.update(elem);
            };

            scroll.append(item.render());
            items.push(item);
        };

        this.back = function () {
            Lampa.Activity.backward();
        };

        this.down = function () {
            active++;
            active = Math.min(active, items.length - 1);
            if (!viewall && lezydata && items.length < lezydata.length && active >= items.length - 2) {
                 lezydata.slice(items.length, items.length + 2).forEach(this.append.bind(this));
            }
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
            var _this4 = this;
            Lampa.Controller.add("content", {
                link: this,
                toggle: function toggle() {
                    if (_this4.activity.canRefresh && _this4.activity.canRefresh()) return false;
                    if (items.length) items[active].toggle();
                },
                left: function left() {
                    if (Lampa.Navigator.canmove("left")) Lampa.Navigator.move("left");
                    else Lampa.Controller.toggle("menu");
                },
                right: function right() {
                    Lampa.Navigator.move("right");
                },
                up: function up() {
                    if (Lampa.Navigator.canmove("up")) Lampa.Navigator.move("up");
                    else Lampa.Controller.toggle("head");
                },
                down: function down() {
                    if (Lampa.Navigator.canmove("down")) Lampa.Navigator.move("down");
                },
                back: this.back
            });
            Lampa.Controller.toggle("content");
        };

        this.refresh = function () {
            this.activity.loader(true);
            this.destroy();
            this.create();
        };

        this.pause = function () {};
        this.stop = function () {};

        this.render = function () {
            return html;
        };

        this.destroy = function () {
            Lampa.Arrays.destroy(items);
            scroll.destroy();
            if (info) info.destroy();
            html.empty();
            items = [];
            lezydata = null;
        };
    }

    function startPlugin() {
        window.plugin_interface_ready = true;
        setupGlobalColorObserver();
        var OriginalMain = Lampa.Component.get('main');

        Lampa.Component.add('main', function(object) {
            if ((object.source == "tmdb" || object.source == "cub") && window.innerWidth >= 767) {
                return new NewInterface(object);
            } else {
                return new OriginalMain(object);
            }
        });

        Lampa.Template.add(
            "new_interface_style",
            `<style>
            .new-interface {
                position: relative;
                height: 100%;
                overflow: hidden;
            }
            .new-interface .card--small.card--wide {
                width: 18.3em;
            }
            
            /* --- ИСПРАВЛЕНИЕ: Отступы и позиционирование --- */
            .new-interface-info {
                position: relative;
                padding: 1.5em;
                /* Увеличили нижний отступ, чтобы текст не прилипал к скроллу */
                padding-bottom: 3.5em; 
                height: 24em;
                z-index: 10;
                /* Градиенты убраны полностью */
            }
            
            .new-interface-info__body {
                width: 80%;
                padding-top: 1.1em;
                text-shadow: 1px 1px 2px black;
            }
            
            .new-interface .card-line__title {
                padding-left: 1.5em !important; 
            }

            .new-interface .scroll__content {
                padding-bottom: 5em !important;
            }
            
            /* Скролл без масок и градиентов */
            .new-interface .scroll {
                transform: translate3d(0,0,0);
            }

            .info-anim {
                transition: opacity 0.4s ease-in-out;
                opacity: 1;
            }
            .info-anim.loading {
                opacity: 0;
            }

            .logo-img {
                margin-top: 0.2em;
                max-height: 125px;
                max-width: 100%;
                display: block;
            }

            .new-interface-info__head {
                color: rgba(255, 255, 255, 0.8);
                margin-bottom: 1em;
                font-size: 1.3em;
                min-height: 1.5em;
            }
            .new-interface-info__head span {
                color: #fff;
            }
            .new-interface-info__title {
                font-size: 4em;
                font-weight: 600;
                margin-bottom: 0.3em;
                overflow: hidden;
                display: -webkit-box;
                -webkit-line-clamp: 1;
                line-clamp: 1;
                -webkit-box-orient: vertical;
                margin-left: -0.03em;
                line-height: 1.3;
                min-height: 1.3em; 
                display: flex;
                align-items: center;
            }
            .new-interface-info__details {
                margin-bottom: 1.6em;
                display: flex;
                align-items: center;
                flex-wrap: wrap;
                min-height: 2.5em;
                font-size: 1.1em;
            }
            .new-interface-info__split {
                margin: 0 1em;
                font-size: 0.7em;
                opacity: 0.7;
            }
            
            /* Добавили явный отступ снизу самому тексту для надежности */
            .new-interface-info__description {
                font-size: 1.2em;
                font-weight: 300;
                line-height: 1.5;
                overflow: hidden;
                display: -webkit-box;
                -webkit-line-clamp: 4;
                line-clamp: 4;
                -webkit-box-orient: vertical;
                width: 70%;
                margin-bottom: 1em;
            }
            .new-interface .card-more__box {
                padding-bottom: 95%;
            }
            .new-interface .card__promo {
                display: none;
            }
            .new-interface .card.card--wide + .card-more .card-more__box {
                padding-bottom: 95%;
            }
            .new-interface .card.card--wide .card-watched {
                display: none !important;
            }
            
            body.light--version .new-interface-info__body {
                width: 69%;
                padding-top: 1.5em;
            }
            body.light--version .new-interface-info {
                height: 25.3em;
            }

            body.advanced--animation:not(.no--animation) .new-interface .card--small.card--wide.focus .card__view {
                animation: animation-card-focus 0.2s
            }
            </style>`
        );
        $("body").append(Lampa.Template.get("new_interface_style", {}, true));
    }

    if (!window.plugin_interface_ready) startPlugin();
})();
