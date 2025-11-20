(function () {
    'use strict';

    // -------------------------------------------------------------------------
    // 1. Rutube API Wrapper (Local Scope)
    // Реализация API плеера Rutube внутри плагина, чтобы не зависеть от внешних скриптов
    // -------------------------------------------------------------------------
    var RutubeAPI = {
        PlayerState: {
            ENDED: 'stopped',
            PLAYING: 'playing',
            PAUSED: 'paused',
            BUFFERING: 'buffering',
            CUED: 'cued',
            AD_PLAYING: 'adStart',
            AD_ENDED: 'adEnd',
            UNSTARTED: -1
        },
        Player: function (containerId, options) {
            this.container = document.getElementById(containerId);
            this.options = options || {};
            this.eventHandlers = options.events || {};
            this.iframe = null;
            this.ready = false;
            this.playerState = RutubeAPI.PlayerState.UNSTARTED;
            this.currentTime = 0;
            this.duration = 0;
            this.qualityList = [];
            this.currentQuality = null;

            this.init();
        }
    };

    RutubeAPI.Player.prototype = {
        init: function () {
            this.createIframe();
            this.bindEvents();
        },

        createIframe: function () {
            var iframe = document.createElement('iframe');
            var src = 'https://rutube.ru/play/embed/' + this.options.videoId;
            var params = [];

            // Обязательные параметры для работы в Lampa и на TV
            params.push('autoplay=1');      // Пытаемся автозапустить
            params.push('playsinline=1');   // Важно для мобилок и webview
            params.push('enablejsapi=1');   // Включаем API
            params.push('p_hosting=lampa'); // Идентификатор (необязательно, но полезно)

            // Дополнительные параметры
            var pv = this.options.playerVars || {};
            if (pv.start) params.push('t=' + pv.start);
            
            // Если есть приватный ключ
            if (this.options.privateKey) {
                src += '/?p=' + encodeURIComponent(this.options.privateKey);
            }

            if (params.length) {
                src += (src.includes('?') ? '&' : '?') + params.join('&');
            }

            iframe.setAttribute('src', src);
            iframe.setAttribute('width', '100%');
            iframe.setAttribute('height', '100%');
            iframe.setAttribute('frameborder', '0');
            iframe.setAttribute('allowfullscreen', '');
            iframe.setAttribute('webkitallowfullscreen', '');
            iframe.setAttribute('mozallowfullscreen', '');
            // Полный набор прав для современных браузеров
            iframe.setAttribute('allow', 'autoplay; encrypted-media; fullscreen; picture-in-picture; screen-wake-lock; clipboard-write; accelerometer; gyroscope');
            
            // Очистка контейнера и вставка
            this.container.innerHTML = '';
            this.container.appendChild(iframe);
            this.iframe = iframe;
        },

        bindEvents: function () {
            var _this = this;
            this.boundOnMessage = function (e) {
                _this.onMessage(e);
            };
            window.addEventListener('message', this.boundOnMessage);
        },

        onMessage: function (e) {
            if (!this.iframe || e.source !== this.iframe.contentWindow) return;

            var message = e.data;
            
            // Rutube может слать как строку, так и объект
            if (typeof message === 'string') {
                try {
                    message = JSON.parse(message);
                } catch (err) {
                    return;
                }
            }

            if (!message || !message.type) return;

            switch (message.type) {
                case 'player:ready':
                case 'player:init':
                    this.ready = true;
                    this.triggerEvent('onReady');
                    break;

                case 'player:changeState':
                    this.handleStateChange(message.data.state);
                    break;

                case 'player:currentTime':
                    this.currentTime = message.data.time;
                    this.triggerEvent('onTimeUpdate', { currentTime: this.currentTime });
                    break;

                case 'player:durationChange':
                    this.duration = message.data.duration;
                    this.triggerEvent('onDurationChange', { duration: this.duration });
                    break;

                case 'player:qualityList': // Список качеств
                    this.qualityList = message.data.list || [];
                    this.triggerEvent('onQualityList', this.qualityList);
                    break;
                
                case 'player:currentQuality': // Текущее качество
                     // message.data.quality может быть объектом {height: 720, ...} или строкой
                    var q = message.data.quality;
                    var h = (typeof q === 'object') ? q.height : q;
                    this.currentQuality = h;
                    this.triggerEvent('onPlaybackQualityChange', h);
                    break;

                case 'player:error':
                    this.triggerEvent('onError', message.data);
                    break;
            }
        },

        handleStateChange: function (stateStr) {
            // Маппинг строковых состояний Rutube в константы
            var stateMap = {
                'playing': RutubeAPI.PlayerState.PLAYING,
                'paused': RutubeAPI.PlayerState.PAUSED,
                'stopped': RutubeAPI.PlayerState.ENDED,
                'buffering': RutubeAPI.PlayerState.BUFFERING,
                'adStart': RutubeAPI.PlayerState.AD_PLAYING,
                'adEnd': RutubeAPI.PlayerState.AD_ENDED
            };

            var newState = stateMap[stateStr];
            if (newState !== undefined) {
                this.playerState = newState;
                this.triggerEvent('onStateChange', { data: newState });
            }
        },

        sendCommand: function (type, data) {
            if (this.iframe && this.iframe.contentWindow) {
                try {
                    this.iframe.contentWindow.postMessage(JSON.stringify({
                        type: type,
                        data: data || {}
                    }), '*');
                } catch (e) {}
            }
        },

        // Публичные методы управления
        playVideo: function () { this.sendCommand('player:play'); },
        pauseVideo: function () { this.sendCommand('player:pause'); },
        stopVideo: function () { this.sendCommand('player:stop'); },
        seekTo: function (seconds) { this.sendCommand('player:setCurrentTime', { time: seconds }); },
        setVolume: function (vol) { this.sendCommand('player:setVolume', { volume: vol }); },
        setPlaybackQuality: function (quality) { 
            // Rutube принимает качество как число (например 1080) или как объект. 
            // Надежнее слать наиболее близкое доступное.
            this.sendCommand('player:changeQuality', { quality: quality }); 
        },

        destroy: function () {
            window.removeEventListener('message', this.boundOnMessage);
            if (this.container) this.container.innerHTML = '';
        },

        triggerEvent: function (eventName, data) {
            if (this.eventHandlers[eventName]) {
                this.eventHandlers[eventName](data);
            }
        }
    };

    // -------------------------------------------------------------------------
    // 2. Lampa Player Integration
    // Интеграция плеера в интерфейс Lampa
    // -------------------------------------------------------------------------
    var RutubePlugin = function (call_video) {
        var Subscribe = Lampa.Subscribe;
        var Lang = Lampa.Lang;
        var Panel = Lampa.PlayerPanel;
        
        var stream_url;
        var rutube_player = null;
        var listener = Subscribe();
        var timeupdate_interval;
        
        // HTML Структура плеера
        var html = '<div class="player-video__rutube" id="rutube-container" style="width:100%; height:100%; position:absolute; top:0; left:0; background:#000;">' +
                   '   <div id="rutube-player-embed" style="width:100%; height:100%;"></div>' +
                   '   <div class="rutube-need-click hide" style="position:absolute;top:0;left:0;width:100%;height:100%;z-index:5;display:flex;justify-content:center;align-items:center;background:rgba(0,0,0,0.7);cursor:pointer;">' +
                   '       <div style="text-align:center;">' +
                   '           <div style="font-size: 2em; margin-bottom: 20px;">▶</div>' +
                   '           <div>' + Lang.translate('player_youtube_start_play') + '</div>' +
                   '       </div>' +
                   '   </div>' +
                   '</div>';
        
        var object = $(html);
        var video = object[0]; // DOM элемент, который Lampa считает за <video>
        var need_click_layer = object.find('.rutube-need-click');

        var levels = [];
        var current_level = 'AUTO';

        // --- Getters/Setters для совместимости с Lampa ---

        Object.defineProperty(video, "currentTime", {
            get: function () { return rutube_player ? rutube_player.currentTime : 0; },
            set: function (t) { if (rutube_player) rutube_player.seekTo(t); }
        });

        Object.defineProperty(video, "duration", {
            get: function () { return rutube_player ? rutube_player.duration : 0; }
        });

        Object.defineProperty(video, "paused", {
            get: function () { 
                return rutube_player ? rutube_player.playerState === RutubeAPI.PlayerState.PAUSED : true; 
            }
        });

        Object.defineProperty(video, "volume", {
            set: function (v) { if (rutube_player) rutube_player.setVolume(v); }
        });

        // Заглушки
        video.audioTracks = [];
        video.textTracks = [];
        video.videoWidth = 1920;
        video.videoHeight = 1080;

        video.canPlayType = function () { return true; };
        video.load = function () { startPlayer(); };
        
        video.play = function () { 
            if (rutube_player) rutube_player.playVideo(); 
            hideClickLayer();
        };
        
        video.pause = function () { 
            if (rutube_player) rutube_player.pauseVideo(); 
        };

        video.destroy = function () {
            clearInterval(timeupdate_interval);
            if (rutube_player) rutube_player.destroy();
            rutube_player = null;
            listener.destroy();
            object.remove();
        };

        video.addEventListener = listener.follow.bind(listener);

        // --- Внутренняя логика ---

        // Установка URL источника
        Object.defineProperty(video, "src", {
            set: function (url) { stream_url = url; }
        });

        function showClickLayer() {
            need_click_layer.removeClass('hide');
            // При клике на слой вызываем play
            need_click_layer.off('click').on('click', function() {
                if (rutube_player) rutube_player.playVideo();
                hideClickLayer();
            });
            // Если это TV (управление пультом), нужно обновить фокус
            Lampa.Controller.enable('player');
        }

        function hideClickLayer() {
            need_click_layer.addClass('hide');
        }

        function startPlayer() {
            if (!stream_url) return;

            var id_match = stream_url.match(/^https?:\/\/(www\.)?rutube\.ru\/(play\/embed|video\/private|video|shorts)\/([\da-f]{32,})\/?(\?p=([^&]+))?/i);
            if (!id_match) {
                listener.send('error', { message: 'Invalid Rutube URL' });
                return;
            }

            var videoId = id_match[3];
            var privateKey = id_match[5];

            rutube_player = new RutubeAPI.Player('rutube-player-embed', {
                videoId: videoId,
                privateKey: privateKey,
                playerVars: {
                    suggestedQuality: Lampa.Storage.field('video_quality_default')
                },
                events: {
                    onReady: function () {
                        // Плеер загрузился. 
                        // Lampa ожидает события загрузки метаданных
                        listener.send('canplay');
                        listener.send('loadeddata');
                        
                        // Устанавливаем начальную громкость
                        rutube_player.setVolume(1);
                        
                        // Запускаем таймер для обновления времени (Rutube не всегда шлет timeupdate часто)
                        timeupdate_interval = setInterval(function(){
                            if(rutube_player && rutube_player.playerState === RutubeAPI.PlayerState.PLAYING) {
                                listener.send('timeupdate');
                            }
                        }, 1000);

                        // Фокус на плеер для TV
                        // rutube_player.iframe.focus();
                    },
                    onStateChange: function (event) {
                        var state = event.data;
                        
                        // Если реклама началась - скрываем интерфейс Lampa
                        if (state === RutubeAPI.PlayerState.AD_PLAYING) {
                            Panel.hide();
                        } 
                        // Если реклама закончилась
                        else if (state === RutubeAPI.PlayerState.AD_ENDED) {
                            Panel.show();
                        }
                        
                        if (state === RutubeAPI.PlayerState.PLAYING) {
                            hideClickLayer();
                            listener.send('playing');
                            listener.send('play');
                            // Убираем значок загрузки
                            Lampa.Player.load_params.callback(true);
                        } 
                        else if (state === RutubeAPI.PlayerState.PAUSED) {
                            listener.send('pause');
                            // Если плеер встал на паузу в самом начале (0 сек) - значит автоплей заблочен браузером
                            if (rutube_player.currentTime < 0.5) {
                                showClickLayer();
                            }
                        } 
                        else if (state === RutubeAPI.PlayerState.ENDED) {
                            listener.send('ended');
                        }
                        else if (state === RutubeAPI.PlayerState.BUFFERING) {
                            listener.send('waiting');
                        }
                    },
                    onTimeUpdate: function (data) {
                        listener.send('timeupdate');
                    },
                    onDurationChange: function (data) {
                        listener.send('durationchange');
                    },
                    onError: function (data) {
                        console.log('Rutube Error:', data);
                        listener.send('error', { message: 'Rutube error: ' + JSON.stringify(data) });
                    },
                    onQualityList: function (list) {
                        updateQualityLevels(list);
                    },
                    onPlaybackQualityChange: function (h) {
                        // Обновляем активное качество в интерфейсе Lampa
                        if(levels.length) {
                            var q_str = h + 'p';
                            levels.forEach(function(l) { l.selected = false; });
                            var active = levels.find(function(l){ return l.quality == q_str }) || levels[0];
                            if(active) active.selected = true;
                            Lampa.PlayerVideo.listener.send('levels', { levels: levels, current: active ? active.quality : 'Auto' });
                        }
                    }
                }
            });
        }

        function updateQualityLevels(list) {
            levels = [];
            // Rutube возвращает [144, 240, ...]
            list.forEach(function(h) {
                var q_str = h + 'p';
                levels.push({
                    quality: q_str,
                    title: q_str,
                    selected: false, // Будет установлено в onPlaybackQualityChange
                    enabled: function(state) {
                        if(state) {
                            rutube_player.setPlaybackQuality(h);
                        }
                    }
                });
            });
            // Сортируем от большего к меньшему
            levels.sort(function(a,b){ return parseInt(b.quality) - parseInt(a.quality) });
            
            Lampa.PlayerVideo.listener.send('levels', { levels: levels, current: 'Auto' });
        }

        call_video(video);
        return object;
    };

    // Регистрируем провайдер видео
    Lampa.PlayerVideo.registerTube({
        name: 'RuTube',
        verify: function (src) {
            return /^https?:\/\/(www\.)?rutube\.ru\/(play\/embed|video\/private|video|shorts)\/([\da-f]{32,})\/?(\?p=([^&]+))?/i.test(src);
        },
        create: RutubePlugin
    });

})();

// -------------------------------------------------------------------------
// 3. Trailer Search Plugin (More Section)
// Плагин для поиска трейлеров в карточке фильма
// -------------------------------------------------------------------------
(function () {
    'use strict';

    var proxy = ''; // Если нужно проксирование API
    var rootuTrailerApi = Lampa.Utils.protocol() + 'trailer.rootu.top/search/';

    function cleanString(str) {
        return str.replace(/[^a-zA-Z\dа-яА-ЯёЁ]+/g, ' ').trim().toLowerCase();
    }

    function cacheRequest(movie, isTv, success, fail) {
        var year = (movie.release_date || movie.first_air_date || '').toString().substring(0, 4);
        var title = movie.title || movie.name || movie.original_title || '';
        var cleanTitle = cleanString(title);

        if (cleanTitle.length < 2) return fail();

        // Формируем запрос
        var queryParts = [title, year, 'русский трейлер'];
        if (isTv) queryParts.push('сезон 1');
        
        var query = cleanString(queryParts.join(' '));
        var rutubeApiUrl = 'https://rutube.ru/api/search/video/?query=' + encodeURIComponent(query) + '&format=json';
        
        var tmdbId = movie.id;
        var storageKey = 'RUTUBE_trailer_' + (isTv ? 'tv_' : 'mv_') + tmdbId;
        
        // Проверка кэша сессии
        var cached = sessionStorage.getItem(storageKey);
        if (cached) {
            var data = JSON.parse(cached);
            if (data && data.length) return success(data);
            else return fail();
        }

        var network = new Lampa.Reguest();
        
        // Функция обработки результатов от API Rutube
        var processRutubeResults = function(data) {
            var results = [];
            if (data && data.results && data.results.length) {
                // Фильтрация
                results = data.results.filter(function(r) {
                    var t = cleanString(r.title);
                    var isTrailer = t.includes('трейлер') || t.includes('trailer') || t.includes('teaser') || t.includes('тизер');
                    var durationOk = r.duration && r.duration < 400; // < 6.5 мин
                    var notDeleted = !r.is_deleted && !r.is_hidden;
                    
                    return isTrailer && durationOk && notDeleted && (r.video_url || r.embed_url);
                }).map(function(r) {
                    return {
                        title: r.title,
                        url: r.video_url || r.embed_url,
                        thumbnail_url: r.thumbnail_url,
                        duration: r.duration,
                        author: r.author || { name: 'Rutube' }
                    };
                });
            }
            return results;
        };

        // Запрос к API
        network.native(rutubeApiUrl, function(response) {
            var finalResults = processRutubeResults(response);
            
            if (finalResults.length) {
                sessionStorage.setItem(storageKey, JSON.stringify(finalResults));
                success(finalResults);
            } else {
                sessionStorage.setItem(storageKey, JSON.stringify([]));
                fail();
            }
        }, function(err) {
            // Если ошибка CORS или сети - пробуем через прокси Lampa (если настроен) или просто фейлим
             fail();
        });
    }

    function loadTrailers(event, success, fail) {
        if (!event.data || !event.data.movie) return;
        var movie = event.data.movie;
        var isTv = (event.data.method === 'tv' || (event.object && event.object.method === 'tv'));
        
        cacheRequest(movie, isTv, success, fail);
    }

    // Локализация
    Lampa.Lang.add({
        "rutube_trailers_title": {
            "ru": "RUTUBE: Трейлеры",
            "uk": "RUTUBE: Трейлери",
            "en": "RUTUBE: Trailers"
        },
        "rutube_trailer_wait": {
            "ru": "Поиск трейлера на Rutube...",
            "en": "Searching trailer on Rutube..."
        },
        "rutube_trailer_404": {
            "ru": "Трейлеры не найдены",
            "en": "Trailers not found"
        }
    });

    function startPlugin() {
        window.rutube_trailer_plugin = true;

        Lampa.SettingsApi.addParam({
            component: 'more',
            param: {
                name: 'rutube_trailers',
                type: 'trigger',
                default: true
            },
            field: {
                name: Lampa.Lang.translate('rutube_trailers_title')
            }
        });

        // Иконка и кнопка для карточки фильма
        var buttonHtml = '<div class="full-start__button selector view--rutube_trailer">' +
            '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 2em; height: 2em;">' +
            '<rect x="2" y="4" width="20" height="16" rx="3" stroke="currentColor" stroke-width="2"/>' +
            '<path d="M10 8L16 12L10 16V8Z" fill="currentColor"/>' +
            '</svg>' +
            '<span>Rutube</span>' +
            '</div>';

        Lampa.Listener.follow('full', function (event) {
            if (event.type === 'complite' && Lampa.Storage.field('rutube_trailers')) {
                var render = event.object.activity.render();
                var buttonsContainer = render.find('.full-start__buttons');
                
                if (buttonsContainer.length) {
                    var btn = $(buttonHtml);
                    
                    // Вставляем кнопку после последней
                    buttonsContainer.append(btn);

                    btn.on('hover:enter', function () {
                        Lampa.Noty.show(Lampa.Lang.translate('rutube_trailer_wait'));
                        
                        loadTrailers(event, function(items) {
                            Lampa.Select.show({
                                title: 'Rutube',
                                items: items.map(function(i) {
                                    return {
                                        title: i.title,
                                        subtitle: i.author.name,
                                        url: i.url,
                                        icon: i.thumbnail_url,
                                        template: 'selectbox_icon'
                                    };
                                }),
                                onSelect: function(a) {
                                    Lampa.Player.play(a);
                                    Lampa.Player.playlist(items.map(function(i){
                                        return {
                                            url: i.url,
                                            title: i.title
                                        }
                                    }));
                                },
                                onBack: function() {
                                    Lampa.Controller.toggle('full_start');
                                }
                            });
                        }, function() {
                            Lampa.Noty.show(Lampa.Lang.translate('rutube_trailer_404'));
                        });
                    });
                }
            }
        });
    }

    if (!window.rutube_trailer_plugin) startPlugin();
})();
