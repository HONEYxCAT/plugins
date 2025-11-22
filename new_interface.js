(function () {
    "use strict";

    // --- КОМПОНЕНТ: ИНФОРМАЦИОННАЯ ПАНЕЛЬ (ВЕРХНЯЯ ЧАСТЬ) ---
    function InfoPanel() {
        var html;
        var timer;
        var network = new Lampa.Reguest();
        var loaded_cache = {};
        var last_id;

        this.create = function () {
            // Используем классы Lampa для корректного отображения
            html = $('<div class="new-interface-infoLayer"></div>');
            var content = $(
                '<div class="new-interface-info">\n' +
                '    <div class="new-interface-info__body">\n' +
                '        <div class="new-interface-info__head"></div>\n' +
                '        <div class="new-interface-info__title"></div>\n' +
                '        <div class="new-interface-info__meta"></div>\n' +
                '        <div class="new-interface-info__description"></div>\n' +
                '    </div>\n' +
                '</div>'
            );
            html.append(content);
        };

        this.update = function (data) {
            if (last_id === data.id) return;
            last_id = data.id;

            // Очищаем старые данные
            html.find(".new-interface-info__head").empty();
            html.find(".new-interface-info__meta").empty();
            
            // Заголовок
            html.find(".new-interface-info__title").text(data.title || data.name);
            
            // Описание (с фолбеком)
            var desc = data.overview || Lampa.Lang.translate("full_notext");
            html.find(".new-interface-info__description").text(desc);

            this.fetchDetails(data);
        };

        this.renderDetails = function (data) {
            var head = [];
            var meta = [];

            // Дата выхода
            var year = (data.release_date || data.first_air_date || "0000").slice(0, 4);
            if (year !== "0000") head.push('<span class="tag-year">' + year + '</span>');

            // Страны
            var countries = data.production_countries || [];
            if (countries.length) {
                head.push(countries.slice(0, 2).map(function(c) { return c.name; }).join(", "));
            }

            // Рейтинг
            var vote = parseFloat((data.vote_average || 0)).toFixed(1);
            if (vote > 0) {
                meta.push('<div class="rate-badge">TMDB ' + vote + '</div>');
            }

            // Жанры
            if (data.genres && data.genres.length) {
                var genres_str = data.genres.slice(0, 3).map(function(g) {
                    return Lampa.Utils.capitalizeFirstLetter(g.name);
                }).join(" • ");
                meta.push('<div class="genres-text">' + genres_str + '</div>');
            }

            // Продолжительность
            if (data.runtime) {
                meta.push('<div>' + Lampa.Utils.secondsToTime(data.runtime * 60, true) + '</div>');
            } else if (data.episode_run_time && data.episode_run_time.length) {
                meta.push('<div>' + Lampa.Utils.secondsToTime(data.episode_run_time[0] * 60, true) + '</div>');
            }

            html.find(".new-interface-info__head").html(head.join('<span class="split">●</span>'));
            html.find(".new-interface-info__meta").html(meta.join('<span class="split"></span>'));
        };

        this.fetchDetails = function (data) {
            var _this = this;
            clearTimeout(timer);

            // Сразу рисуем то, что есть в карточке
            this.renderDetails(data);

            var type = data.name ? "tv" : "movie";
            // Формируем URL для TMDB через метод ядра Lampa 3.0+
            var url = Lampa.TMDB.url(
                type + "/" + data.id, 
                "append_to_response=content_ratings,release_dates,external_ids&language=" + Lampa.Storage.get("language")
            );

            if (loaded_cache[url]) {
                this.renderDetails(loaded_cache[url]);
                return;
            }

            timer = setTimeout(function () {
                network.clear();
                network.silent(url, function (result) {
                    loaded_cache[url] = result;
                    _this.renderDetails(result);
                });
            }, 200); // Небольшая задержка, чтобы не спамить запросами при быстром скролле
        };

        this.render = function () {
            return html;
        };

        this.destroy = function () {
            network.clear();
            html.remove();
            loaded_cache = {};
        };
    }

    // --- ОСНОВНОЙ КОМПОНЕНТ ИНТЕРФЕЙСА ---
    function InterfaceComponent(object) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({
            mask: true,
            over: true,
            scroll_by_item: true
        });
        
        var items = [];
        var html = $('<div class="new-interface"></div>');
        var bg_layer = $('<div class="new-interface__background"></div>');
        var bg_image = $('<img class="bg-img" />');
        
        var info = new InfoPanel();
        var active_index = 0;
        var last_bg_src = "";
        var bg_timer;

        this.create = function () {
            html.append(bg_layer);
            bg_layer.append(bg_image);
            
            // Создаем инфо-панель
            info.create();
        };

        this.background = function (element) {
            var src = Lampa.Api.img(element.backdrop_path || element.poster_path, "original");
            
            if (last_bg_src === src) return;
            last_bg_src = src;

            clearTimeout(bg_timer);
            bg_timer = setTimeout(function () {
                var img = new Image();
                img.onload = function () {
                    bg_image.addClass('fade-out');
                    setTimeout(function(){
                         bg_image.attr('src', src);
                         bg_image.removeClass('fade-out');
                    }, 200);
                };
                img.src = src;
            }, 500);
        };

        this.build = function (data) {
            var _this = this;

            // Добавляем инфо-панель в скролл, но как фиксированный элемент визуально
            html.append(info.render());

            // Рендерим карточки
            data.forEach(function(item) {
                _this.append(item);
            });

            html.append(scroll.render());

            // Важно для Lampa 3.0: обновить слои
            Lampa.Layer.update(html);
            
            // Логика подгрузки следующей страницы
            scroll.onEnd = function () {
                _this.loadNext();
            };

            // Обработка колеса мыши
            scroll.onWheel = function (step) {
                if (step > 0) _this.down();
                else _this.up();
            };

            this.activity.loader(false);
            this.activity.toggle();
        };

        this.append = function (element) {
            var _this = this;
            
            // Используем InteractionLine для создания стандартной строки Lampa, но адаптируем её
            var line = new Lampa.InteractionLine(element, {
                url: element.url,
                card_small: true,
                card_wide: true, // Широкие карточки
                object: object,
                genres: object.genres
            });

            line.create();

            // Перехватываем события строки
            line.onDown = function() { _this.down(); };
            line.onUp = function() { _this.up(); };
            line.onBack = function() { Lampa.Activity.backward(); };
            
            // Когда элемент строки получает фокус (наведение)
            line.onFocus = function (focused_item) {
                info.update(focused_item);
                _this.background(focused_item);
            };

            // Обработка клика (Enter)
            line.onEnter = function(target, item_data) {
                // Стандартное действие Lampa при клике на карточку
                Lampa.Activity.push({
                    url: item_data.url,
                    component: 'full',
                    id: item_data.id,
                    method: item_data.name ? 'tv' : 'movie',
                    card: item_data
                });
            };

            // Добавляем строку в массив и в скролл
            items.push(line);
            scroll.append(line.render());
        };

        this.loadNext = function() {
            var _this = this;
            if (this.next && !this.next_wait) {
                this.next_wait = true;
                this.next(function(new_items) {
                    _this.next_wait = false;
                    new_items.forEach(function(item) {
                        _this.append(item);
                    });
                    // Обновляем контроллер, чтобы он увидел новые элементы
                    if(Lampa.Controller.own(_this)) {
                        Lampa.Controller.collectionSet(scroll.render());
                    }
                }, function() {
                    _this.next_wait = false;
                });
            }
        };

        this.down = function () {
            if (active_index < items.length - 1) {
                active_index++;
                // Переключаем "активность" на следующую строку
                // В данном интерфейсе мы просто скроллим к ней и даем фокус
                Lampa.Controller.collectionFocus(items[active_index].render().find('.card').first()[0], scroll.render());
            }
        };

        this.up = function () {
            if (active_index > 0) {
                active_index--;
                Lampa.Controller.collectionFocus(items[active_index].render().find('.card').first()[0], scroll.render());
            } else {
                // Если мы на самом верху, отдаем управление в Head (меню)
                Lampa.Controller.toggle('head');
            }
        };

        this.start = function () {
            var _this = this;
            Lampa.Controller.add('content', {
                toggle: function () {
                    // Строим матрицу навигации для контроллера
                    Lampa.Controller.collectionSet(scroll.render());
                    Lampa.Controller.collectionFocus(items[active_index] ? false : items[0], scroll.render());
                },
                left: function () {
                    if (Navigator.canmove('left')) Navigator.move('left');
                    else Lampa.Controller.toggle('menu');
                },
                right: function () {
                    Navigator.move('right');
                },
                up: function () {
                    if (Navigator.canmove('up')) Navigator.move('up');
                    else _this.up();
                },
                down: function () {
                    if (Navigator.canmove('down')) {
                        Navigator.move('down');
                    } else {
                        // Если внутри строки вниз двигаться некуда, переходим к след. строке
                        _this.down(); 
                    }
                },
                back: function () {
                    Lampa.Activity.backward();
                }
            });
            Lampa.Controller.toggle('content');
        };

        this.pause = function () {};
        this.stop = function () {};

        this.render = function () {
            return html;
        };

        this.destroy = function () {
            network.clear();
            scroll.destroy();
            info.destroy();
            html.remove();
            items = [];
        };
    }

    // --- ЗАПУСК ПЛАГИНА ---
    function startPlugin() {
        window.plugin_interface_ready = true;
        
        // Сохраняем старый интерфейс
        var old_interface = Lampa.InteractionMain;

        // Переопределяем InteractionMain
        Lampa.InteractionMain = function (object) {
            // Применяем новый интерфейс только для TMDB и CUB источников, и только для списка фильмов/сериалов
            var is_compatible = (object.source === 'tmdb' || object.source === 'cub');
            // Не ломаем на мобильных
            var is_desktop = window.innerWidth > 767;

            if (is_compatible && is_desktop) {
                return new InterfaceComponent(object);
            } else {
                return new old_interface(object);
            }
        };

        // --- CSS СТИЛИ ---
        var css = `
            .new-interface {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                overflow: hidden;
            }
            .new-interface__background {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 1;
            }
            .new-interface__background::after {
                content: '';
                position: absolute;
                top: 0; left: 0; right: 0; bottom: 0;
                background: linear-gradient(90deg, #000 0%, rgba(0,0,0,0.8) 40%, rgba(0,0,0,0.4) 100%);
            }
            .new-interface .bg-img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                transition: opacity 0.3s ease-in-out;
            }
            .new-interface .bg-img.fade-out {
                opacity: 0;
            }
            
            /* Инфо панель */
            .new-interface-infoLayer {
                position: absolute;
                top: 0;
                left: 0;
                width: 40%;
                height: 100%;
                z-index: 3;
                pointer-events: none; /* Пропускаем клики сквозь инфо */
                padding: 3em;
                display: flex;
                align-items: center;
            }
            .new-interface-info__body {
                color: #fff;
            }
            .new-interface-info__title {
                font-size: 3.5em;
                font-weight: 700;
                line-height: 1.1;
                margin-bottom: 0.5em;
                text-shadow: 0 2px 4px rgba(0,0,0,0.5);
            }
            .new-interface-info__head {
                font-size: 1.2em;
                margin-bottom: 0.5em;
                opacity: 0.8;
            }
            .new-interface-info__meta {
                display: flex;
                align-items: center;
                gap: 1em;
                margin-bottom: 1.5em;
                font-size: 1.1em;
            }
            .new-interface-info__description {
                font-size: 1.1em;
                line-height: 1.6;
                opacity: 0.7;
                max-height: 10em;
                overflow: hidden;
                display: -webkit-box;
                -webkit-line-clamp: 5;
                -webkit-box-orient: vertical;
            }
            
            /* Элементы меты */
            .rate-badge {
                background: #fff;
                color: #000;
                padding: 0.2em 0.5em;
                border-radius: 0.3em;
                font-weight: 700;
            }
            .split {
                margin: 0 0.5em;
                opacity: 0.5;
            }
            
            /* Скролл и карточки */
            .new-interface .scroll {
                position: absolute;
                top: 0;
                right: 0;
                width: 55%; /* Карточки справа */
                height: 100%;
                z-index: 4;
                padding-top: 5em; /* Отступ сверху */
            }
            
            /* Адаптация карточек внутри этого плагина */
            .new-interface .card--wide {
                width: 17em !important; 
                margin-bottom: 2em;
            }
            
            /* Скрываем лишнее в карточках для чистоты */
            .new-interface .card__promo, 
            .new-interface .card-watched {
                display: none !important;
            }
            
            /* Анимация фокуса */
            .new-interface .card.focus {
                transform: scale(1.05);
                z-index: 5;
                box-shadow: 0 0 20px rgba(0,0,0,0.5);
            }
        `;
        
        Lampa.Template.add('new_interface_css', '<style>' + css + '</style>');
        $('body').append(Lampa.Template.get('new_interface_css', {}, true));
    }

    // Безопасная инициализация
    if (!window.plugin_interface_ready) {
        if (window.Lampa) {
            startPlugin();
        } else {
            // Если скрипт загрузился раньше Лампы
            var checkLampa = setInterval(function () {
                if (window.Lampa) {
                    clearInterval(checkLampa);
                    startPlugin();
                }
            }, 200);
        }
    }
})();
