(function () {
    'use strict';

    var CLIENT_ID = 'ZGfO0sMF3eCwLYf8yMSCJjlynwNGRXWE';

    // КЭШ: ID фильма (TMDB) -> Объект с эпизодами { 1: [сегменты], 2: [сегменты] }
    var CACHE = {};
    var ACTIVE_REQUESTS = {}; // Чтобы не спамить запросами, если пользователь быстро кликает

    var GQL_SEARCH = `
    query Search($search: String!) {
      searchShows(search: $search, limit: 5) {
        id
        name
        episodes {
          number
          timestamps {
            at
            type { name }
          }
        }
      }
    }`;

    function log(msg, data) {
        var prefix = '[AnimeSkip] ';
        if (typeof data === 'object') console.log(prefix + msg, data);
        else console.log(prefix + msg, data || '');
    }

    function notify(msg) {
        if(Lampa.Noty) Lampa.Noty.show('[AnimeSkip] ' + msg);
    }

    var AnimeSkip = {
        init: function () {
            this.initListeners();
            this.rewritePlayer();
            log('Loaded v13 (Prefetch Mode).');
            notify('Плагин v13: Предзагрузка активна');
        },

        // 1. СЛУШАЕМ ОТКРЫТИЕ КАРТОЧКИ
        initListeners: function() {
            Lampa.Listener.follow('full', function(e) {
                if (e.type == 'complite') {
                    var card = e.data.movie;
                    if (AnimeSkip.isAnime(card)) {
                        log('Card opened: ' + card.title + '. Starting background prefetch...');
                        AnimeSkip.prefetch(card);
                    }
                }
            });
        },

        isAnime: function(card) {
            if (!card) return false;
            // Жанр 16 = Animation, источник Shikimori, или японский язык
            if (card.genres && card.genres.find(function(g){ return g.id === 16; })) return true;
            if (card.source === 'shikimori') return true;
            if (card.original_language === 'ja') return true;
            return false;
        },

        // 2. ПРЕДЗАГРУЗКА ДАННЫХ (ФОН)
        prefetch: function(card) {
            var tmdbId = card.id;
            if (CACHE[tmdbId] || ACTIVE_REQUESTS[tmdbId]) {
                log('Already cached or fetching: ' + tmdbId);
                return;
            }

            ACTIVE_REQUESTS[tmdbId] = true;
            var title = card.original_name || card.original_title || card.title;

            // Стратегия поиска названия (Kitsu -> AnimeSkip)
            this.resolveEnglishTitle(title, function(searchTitle) {
                AnimeSkip.fetchShowData(searchTitle, function(episodesMap) {
                    if (Object.keys(episodesMap).length > 0) {
                        CACHE[tmdbId] = episodesMap;
                        log('Prefetch DONE for ' + title + '. Episodes cached: ' + Object.keys(episodesMap).length);
                        // notify('Таймкоды загружены (' + Object.keys(episodesMap).length + ' эп.)'); 
                    } else {
                        log('Prefetch failed or no segments found for ' + title);
                    }
                    delete ACTIVE_REQUESTS[tmdbId];
                });
            });
        },

        // Поиск английского названия через Kitsu
        resolveEnglishTitle: function(jpTitle, callback) {
            var kitsuUrl = 'https://kitsu.io/api/edge/anime?filter[text]=' + encodeURIComponent(jpTitle);
            var network = new Lampa.Reguest();
            
            network.silent(kitsuUrl, function(res) {
                var finalTitle = jpTitle;
                if (res && res.data && res.data.length > 0) {
                    var attr = res.data[0].attributes;
                    if (attr.titles && attr.titles.en) finalTitle = attr.titles.en;
                    else if (attr.canonicalTitle) finalTitle = attr.canonicalTitle;
                }
                callback(finalTitle);
            }, function() {
                callback(jpTitle); // Если ошибка, ищем по оригиналу
            });
        },

        // Запрос к Anime-Skip и парсинг ВСЕХ эпизодов
        fetchShowData: function(title, callback) {
            this.gqlRequest(GQL_SEARCH, { search: title }, function(response) {
                var resultMap = {};

                if (response.data && response.data.searchShows && response.data.searchShows.length > 0) {
                    var show = response.data.searchShows[0]; // Берем первый результат
                    
                    if (show.episodes) {
                        show.episodes.forEach(function(ep) {
                            if (ep.timestamps && ep.timestamps.length > 0) {
                                var segments = [];
                                ep.timestamps.forEach(function(ts) {
                                    var typeName = (ts.type && ts.type.name) ? ts.type.name.toLowerCase() : 'unknown';
                                    var label = 'Пропустить ' + typeName;
                                    if (typeName.indexOf('intro') > -1) label = 'Пропустить заставку';
                                    else if (typeName.indexOf('outro') > -1) label = 'Пропустить титры';
                                    else if (typeName.indexOf('preview') > -1) label = 'Пропустить превью';

                                    segments.push({
                                        start: ts.at,
                                        end: ts.at + 85, // Фикс 85 сек, так как нет duration
                                        text: label
                                    });
                                });
                                resultMap[ep.number] = segments;
                            }
                        });
                    }
                }
                callback(resultMap);
            });
        },

        gqlRequest: function (query, variables, callback) {
            var url = 'https://api.anime-skip.com/graphql';
            var body = JSON.stringify({ query: query, variables: variables });

            if(typeof $ !== 'undefined' && $.ajax) {
                $.ajax({
                    url: url, type: 'POST', data: body,
                    contentType: 'application/json',
                    headers: { 'X-Client-ID': CLIENT_ID, 'Content-Type': 'application/json' },
                    success: function(response) { callback(response); },
                    error: function(xhr) { log('API Error', xhr.responseText); callback({}); }
                });
            }
        },

        // 3. ПЕРЕХВАТ ПЛЕЕРА
        rewritePlayer: function () {
            var _this = this;
            if (!Lampa.Player || !Lampa.Player.play) return;
            var originalPlay = Lampa.Player.play;

            Lampa.Player.play = function (object) {
                // Попытка получить данные карточки
                var card = object.movie || object.card || Lampa.Activity.active().card;
                
                if (card && CACHE[card.id]) {
                    var season = parseInt(object.season || (object.from_item ? object.from_item.season : 0) || 0);
                    var episode = parseInt(object.episode || (object.from_item ? object.from_item.episode : 0) || 0);
                    
                    // Фикс для фильмов (S1 E1)
                    if (season === 0) season = 1;
                    if (episode === 0) episode = 1;

                    var episodesMap = CACHE[card.id];
                    
                    // Ищем таймкоды для текущей серии
                    // Важно: ключи в карте могут быть строками или числами
                    var segments = episodesMap[episode] || episodesMap["" + episode];

                    if (segments) {
                        log('INSTANT INJECT for Ep ' + episode, segments);
                        object.segments = segments;
                        notify('Сегменты применены');
                    } else {
                        log('Cache hit, but no segments for Ep ' + episode);
                    }
                } else {
                    // Если кэша нет, можно попробовать запустить "медленный" поиск (как в v12)
                    // Но в v13 мы полагаемся на prefetch для стабильности
                    log('No cache for this video at start.');
                    if(_this.isAnime(card)) {
                        // Фолбэк: если открыли по прямой ссылке (не через карточку), пробуем загрузить сейчас
                        _this.prefetch(card);
                        // Но для текущего запуска уже поздно, сегменты появятся только при следующем нажатии
                        // Либо нужно делать update UI, как в v12. Добавим это для надежности:
                        setTimeout(function() { _this.lateInject(object, card, episode); }, 2000);
                    }
                }

                return originalPlay.apply(this, arguments);
            };
        },

        // Медленная инъекция (если кэш не успел)
        lateInject: function(playerObject, card, episode) {
            if (!card || !CACHE[card.id]) return;
            var episodeNum = parseInt(playerObject.episode || (playerObject.from_item ? playerObject.from_item.episode : 0) || 1);
            
            var episodesMap = CACHE[card.id];
            var segments = episodesMap[episodeNum];

            if (segments && !playerObject.segments) {
                playerObject.segments = segments;
                log('LATE INJECT', segments);
                notify('Сегменты подгрузились');
                if (Lampa.Player.panel) Lampa.Player.panel.update();
                if(Lampa.Player.video) {
                    try { var event = new Event('timeupdate'); Lampa.Player.video.dispatchEvent(event); } catch(e) {}
                }
            }
        }
    };

    function start() {
        if (window.anime_skip_v13) return;
        window.anime_skip_v13 = true;
        AnimeSkip.init();
    }

    if (typeof Lampa !== 'undefined' && Lampa.Player) start();
    else {
        var check = setInterval(function() {
            if (typeof Lampa !== 'undefined' && Lampa.Player) { clearInterval(check); start(); }
        }, 200);
    }
})();
