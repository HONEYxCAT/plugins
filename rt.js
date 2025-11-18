(function () {
    'use strict';

    // -------------------------------------------------------------------------
    // ЧАСТЬ 1: РЕГИСТРАЦИЯ ПЛЕЕРА RUTUBE
    // Упрощенная версия без ожидания сложных postMessage событий
    // -------------------------------------------------------------------------
    (function () {
        var Subscribe = Lampa.Subscribe;
        var Lang = Lampa.Lang;

        function RuTube(call_video) {
            var object = $('<div class="player-video__youtube" id="rutube-container"><div class="player-video__youtube-player" id="rutube-player"></div></div>');
            var video = object[0];
            var listener = Subscribe();
            var iframe = null;
            var timer_start = null;

            // Заглушки для свойств, чтобы Lampa не ругалась
            Object.defineProperty(video, "currentTime", { get: function () { return 0; }, set: function () {} });
            Object.defineProperty(video, "duration", { get: function () { return 0; }, set: function () {} });
            Object.defineProperty(video, "paused", { get: function () { return false; }, set: function () {} });
            Object.defineProperty(video, "volume", { get: function () { return 1; }, set: function () {} });
            
            video.addEventListener = listener.follow.bind(listener);
            
            video.destroy = function () {
                clearTimeout(timer_start);
                object.remove();
                listener.destroy();
            };

            video.play = function () {};
            video.pause = function () {};
            video.load = function () {
                object.find('.player-video__youtube-player').width('100%').height('100%');
            };

            video.size = function () {};

            // Основная логика запуска
            Object.defineProperty(video, "src", {
                set: function (url) {
                    if (url) {
                        var id, m;
                        // Парсинг ID из разных типов ссылок
                        if (!!(m = url.match(/^https?:\/\/(www\.)?rutube\.ru\/(play\/embed|video\/private|video|shorts)\/([\da-f]{32,})/i))) {
                            id = m[3];
                        }

                        if (id) {
                            var container = object.find('#rutube-player');
                            
                            // Формируем URL для embed
                            var src = 'https://rutube.ru/play/embed/' + id + '?autoplay=1&playsinline=1';

                            iframe = document.createElement('iframe');
                            iframe.setAttribute('src', src);
                            iframe.setAttribute('allow', 'autoplay; encrypted-media; fullscreen; picture-in-picture; clipboard-write');
                            iframe.setAttribute('allowfullscreen', 'true');
                            iframe.setAttribute('webkitallowfullscreen', 'true');
                            iframe.setAttribute('mozallowfullscreen', 'true');
                            iframe.style.width = '100%';
                            iframe.style.height = '100%';
                            iframe.style.border = 'none';
                            iframe.style.position = 'absolute';
                            iframe.style.top = '0';
                            iframe.style.left = '0';
                            
                            container.html(iframe);

                            // ГЛАВНОЕ ИСПРАВЛЕНИЕ:
                            // Не ждем событий от плеера (они могут не прийти из-за CORS).
                            // Принудительно говорим Lampa, что видео готово и играет.
                            timer_start = setTimeout(function() {
                                listener.send('canplay');
                                listener.send('loadeddata');
                                listener.send('playing');
                                listener.send('play', {});
                                
                                // Скрываем интерфейс Lampa, чтобы не перекрывал Iframe
                                if(Lampa.Controller.enabled().name === 'player'){
                                    // Попытка скрыть панель плеера, оставляя фокус на плеере
                                     $('.player-panel').addClass('hide');
                                     $('.player-video__youtube-line-top').addClass('hide');
                                     $('.player-video__youtube-line-bottom').addClass('hide');
                                }
                            }, 800); // Небольшая задержка для инициализации фрейма
                        } else {
                            Lampa.Noty.show('Ошибка ID видео Rutube');
                        }
                    }
                }
            });

            call_video(video);
            return object;
        }

        // Регистрируем провайдер
        Lampa.PlayerVideo.registerTube({
            name: 'RuTube',
            verify: function (src) {
                return /^https?:\/\/(www\.)?rutube\.ru\/(play\/embed|video\/private|video|shorts)\/([\da-f]{32,})/i.test(src);
            },
            create: RuTube
        });
    })();


    // -------------------------------------------------------------------------
    // ЧАСТЬ 2: ПОИСК ТРЕЙЛЕРОВ И ИНТЕРФЕЙС (Ваш оригинальный код с правками)
    // -------------------------------------------------------------------------
    
    var proxy = ''; 
    var rootuTrailerApi = Lampa.Utils.protocol() + 'trailer.rootu.top/search/';

    function cleanString(str) {
        return str.replace(/[^a-zA-Z\dа-яА-ЯёЁ]+/g, ' ').trim().toLowerCase();
    }

    function cacheRequest(movie, isTv, success, fail) {
        var context = this;
        var year = (movie.release_date || movie.first_air_date || '').toString().replace(/\D+/g, '').substring(0, 4);
        var search = movie.title || movie.name || movie.original_title || movie.original_name || '';
        var cleanSearch = cleanString(search);
        
        if (cleanSearch.length < 2) return fail();

        var searchOrig = movie.original_title || movie.original_name || '';
        var query = cleanString([search, year, 'русский трейлер', isTv ? 'сезон 1' : ''].join(' '));
        
        var rutubeApiUrl = 'https://rutube.ru/api/search/video/?query=' + encodeURIComponent(query) + '&format=json';
        var tmdbId = movie.id ? ('000000' + movie.id) : '';
        var type = isTv ? 'tv' : 'movie';

        // Используем прокси для обхода CORS в браузере/WebOS
        // Если Lampa.Storage.get('rutube_search_proxy') пуст, используем публичный
        var userProxy = Lampa.Storage.get('rutube_search_proxy', ''); 
        if(!userProxy) userProxy = 'https://api.allorigins.win/raw?url=';

        function fetchRutubeDirectly() {
             var network = new Lampa.Reguest();
             // Пробуем через прокси, так как прямой запрос к Rutube API из браузера заблочит CORS
             var url = userProxy + encodeURIComponent(rutubeApiUrl);
             
             network.native(url, function(data){
                 // Обработка ответа (AllOrigins возвращает сразу JSON если raw, или текст)
                 if(typeof data === 'string') {
                     try { data = JSON.parse(data); } catch(e){}
                 }

                 if (data && data.results && data.results.length) {
                     // Простая фильтрация
                     var results = data.results.filter(function(item){
                         return item.video_url || item.embed_url;
                     });
                     
                     if(results.length) success(results);
                     else fail();
                 } else {
                     fail();
                 }
             }, function(){
                 fail();
             });
        }
        
        // Запуск поиска
        fetchRutubeDirectly();
    }

    function loadTrailers(event, success, fail) {
        if (!event.object || !event.data || !event.data.movie) return;
        var movie = event.data.movie;
        var isTv = event.object.method === 'tv';
        cacheRequest(movie, isTv, success, fail);
    }

    // Локализация
    Lampa.Lang.add({
        "rutube_trailers_title": {
            "ru": "RUTUBE: трейлеры",
            "uk": "RUTUBE: трейлери",
            "en": "RUTUBE: trailers"
        },
        "rutube_trailer_wait": {
            "ru": "Поиск на Rutube...",
            "en": "Searching on Rutube..."
        },
        "rutube_trailer_404": {
            "ru": "Трейлеры не найдены",
            "en": "Trailers not found"
        }
    });

    function startPlugin() {
        window.rutube_trailer_plugin = true;

        // Добавляем настройку (необязательно, но полезно)
        Lampa.SettingsApi.addParam({
            component: 'more',
            param: {
                name: 'rutube_trailers_btn',
                type: 'trigger',
                default: true
            },
            field: {
                name: Lampa.Lang.translate('rutube_trailers_title')
            }
        });

        // SVG иконка
        var btn_icon = '<svg width="134" height="134" viewBox="0 0 134 134" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="130" height="130" rx="20" stroke="currentColor" stroke-width="5"/><path d="M45 35L100 67L45 99V35Z" fill="currentColor"/></svg>';
        
        var button_html = '<div class="full-start__button selector view--rutube_trailer">' +
            btn_icon +
            '<span>RUTUBE</span>' +
            '</div>';

        Lampa.Listener.follow('full', function (event) {
            if (event.type === 'complite' && Lampa.Storage.field('rutube_trailers_btn')) {
                var render = event.object.activity.render();
                var trailerBtn = render.find('.view--trailer');
                var btn = $(button_html);

                // Вставляем кнопку
                if (trailerBtn.length) {
                    trailerBtn.after(btn);
                } else {
                    // Если нет кнопки YouTube, ищем последнюю кнопку в ряду
                    var bar = render.find('.full-start__buttons');
                    if(bar.length) bar.append(btn);
                }

                btn.on('hover:enter', function () {
                    Lampa.Noty.show(Lampa.Lang.translate('rutube_trailer_wait'));
                    
                    loadTrailers(event, function (data) {
                        var items = [];
                        data.forEach(function (res) {
                            items.push({
                                title: res.title,
                                subtitle: res.author ? res.author.name : 'Rutube',
                                url: res.video_url || res.embed_url,
                                thumbnail: res.thumbnail_url,
                                time: res.duration,
                                quality: true // Флаг качества (формальный)
                            });
                        });

                        Lampa.Select.show({
                            title: 'RUTUBE',
                            items: items,
                            onSelect: function (a) {
                                // Запуск через наш упрощенный PlayerVideo
                                Lampa.Player.play(a);
                                
                                // Костыль для playlist, чтобы он не был пустым
                                Lampa.Player.playlist([a]);
                            },
                            onBack: function () {
                                Lampa.Controller.toggle('full_start');
                            }
                        });
                    }, function () {
                        Lampa.Noty.show(Lampa.Lang.translate('rutube_trailer_404'));
                    });
                });
            }
        });
    }

    if (!window.rutube_trailer_plugin) startPlugin();

})();
