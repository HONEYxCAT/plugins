(function () {
    'use strict';

    var CLIENT_ID = 'ZGfO0sMF3eCwLYf8yMSCJjlynwNGRXWE';
    var CACHE = {};
    var ACTIVE_REQUESTS = {};

    // GraphQL запрос
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
            this.initPrefetchListener();
            this.initPlayerListener();
            log('Loaded v15 (Event Listener Mode).');
            notify('Плагин v15: Готов');
        },

        // --- 1. ЛОГИКА ПРЕДЗАГРУЗКИ (При открытии карточки) ---
        initPrefetchListener: function() {
            Lampa.Listener.follow('full', function(e) {
                if (e.type == 'complite') {
                    var card = e.data.movie;
                    if (AnimeSkip.isAnime(card)) {
                        log('Card opened: ' + card.title);
                        AnimeSkip.prefetch(card);
                    }
                }
            });
        },

        isAnime: function(card) {
            if (!card) return false;
            if (card.genres && card.genres.find(function(g){ return g.id === 16; })) return true;
            if (card.source === 'shikimori') return true;
            if (card.original_language === 'ja') return true;
            return false;
        },

        prefetch: function(card) {
            var tmdbId = card.id;
            if (CACHE[tmdbId] || ACTIVE_REQUESTS[tmdbId]) return;

            ACTIVE_REQUESTS[tmdbId] = true;
            var originalTitle = card.original_name || card.original_title || card.title;

            // Собираем названия и ищем
            this.resolveTitles(originalTitle, function(titles) {
                AnimeSkip.cascadeFetch(titles, 0, function(episodesMap) {
                    if (Object.keys(episodesMap).length > 0) {
                        CACHE[tmdbId] = episodesMap;
                        log('Prefetch SUCCESS for ' + originalTitle + '. Episodes cached: ' + Object.keys(episodesMap).length);
                    } else {
                        log('Prefetch FAILED for ' + originalTitle);
                    }
                    delete ACTIVE_REQUESTS[tmdbId];
                });
            });
        },

        // --- 2. ЛОГИКА ВНЕДРЕНИЯ (При старте плеера) ---
        initPlayerListener: function() {
            // Подписываемся на событие 'start' самого плеера
            // Это работает, даже если другие плагины переписали функцию play()
            Lampa.Player.listener.follow('start', function(data) {
                try {
                    var object = data.object; // Объект видео
                    var card = object.movie || object.card || Lampa.Activity.active().card;

                    if (!card) return;

                    // Проверяем, есть ли данные в кэше для этого ID
                    if (CACHE[card.id]) {
                        var season = parseInt(object.season || (object.from_item ? object.from_item.season : 0) || 0);
                        var episode = parseInt(object.episode || (object.from_item ? object.from_item.episode : 0) || 0);
                        
                        // Фикс для фильмов и специфичных балансеров
                        if (season === 0) season = 1;
                        if (episode === 0) episode = 1;

                        log('Player Started -> Checking Cache for Ep ' + episode);

                        var episodesMap = CACHE[card.id];
                        // Пробуем найти эпизод (ключ может быть строкой или числом)
                        var segments = episodesMap[episode] || episodesMap["" + episode];

                        if (segments) {
                            // ВНЕДРЕНИЕ
                            object.segments = segments;
                            
                            // Принудительное обновление таймлайна
                            if (Lampa.Player.timeline) {
                                Lampa.Player.timeline.update(segments);
                            }
                            if (Lampa.Player.panel) {
                                Lampa.Player.panel.update();
                            }
                            
                            log('INJECTED via Event Listener!', segments);
                            notify('Пропуски добавлены');
                        } else {
                            log('Cache hit, but no segments for Ep ' + episode);
                        }
                    } else {
                        // Если кэша нет, но это аниме - пробуем быструю загрузку "вдогонку"
                        if (AnimeSkip.isAnime(card)) {
                            log('No cache. Trying late fetch...');
                            AnimeSkip.prefetch(card);
                            // Попробуем проверить через 4 секунды, вдруг успеет скачаться
                            setTimeout(function() {
                                if (CACHE[card.id]) {
                                    var lateSegs = CACHE[card.id][episode];
                                    if(lateSegs) {
                                        object.segments = lateSegs;
                                        if (Lampa.Player.timeline) Lampa.Player.timeline.update(lateSegs);
                                        notify('Пропуски подгружены');
                                    }
                                }
                            }, 4000);
                        }
                    }
                } catch (e) {
                    console.error('[AnimeSkip] Listener Error:', e);
                }
            });
        },

        // --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---

        resolveTitles: function(originalTitle, callback) {
            var titlesToTry = [originalTitle];
            var kitsuUrl = 'https://kitsu.io/api/edge/anime?filter[text]=' + encodeURIComponent(originalTitle);
            
            var network = new Lampa.Reguest();
            network.silent(kitsuUrl, function(res) {
                if (res && res.data && res.data.length > 0) {
                    var anime = res.data[0];
                    var attrs = anime.attributes;
                    if (attrs.titles && attrs.titles.en) titlesToTry.unshift(attrs.titles.en);
                    if (attrs.canonicalTitle) titlesToTry.push(attrs.canonicalTitle);
                    // Очистка названия от спецсимволов для лучшего поиска
                    if (attrs.titles && attrs.titles.en) {
                        var clean = attrs.titles.en.replace(/[^a-zA-Z0-9 ]/g, " ");
                        titlesToTry.push(clean);
                    }
                }
                titlesToTry = titlesToTry.filter(function(item, pos) { return titlesToTry.indexOf(item) == pos && item; });
                callback(titlesToTry);
            }, function() {
                callback(titlesToTry);
            });
        },

        cascadeFetch: function(titlesList, index, callback) {
            var _this = this;
            if (index >= titlesList.length) {
                callback({});
                return;
            }

            var currentQuery = titlesList[index];
            log('Prefetching query [' + (index+1) + ']: ' + currentQuery);

            this.gqlRequest(GQL_SEARCH, { search: currentQuery }, function(response) {
                if (response.data && response.data.searchShows && response.data.searchShows.length > 0) {
                    // Проверяем результаты
                    for(var i=0; i < response.data.searchShows.length; i++) {
                        var show = response.data.searchShows[i];
                        if (show.episodes && show.episodes.length > 0) {
                            var map = _this.parseEpisodes(show.episodes);
                            if (Object.keys(map).length > 0) {
                                log('Match found: ' + show.name);
                                callback(map);
                                return;
                            }
                        }
                    }
                }
                _this.cascadeFetch(titlesList, index + 1, callback);
            });
        },

        parseEpisodes: function(episodesList) {
            var resultMap = {};
            episodesList.forEach(function(ep) {
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
                            end: ts.at + 85, // Фикс 85 сек, так как API не отдает длительность
                            text: label
                        });
                    });
                    resultMap[ep.number] = segments;
                }
            });
            return resultMap;
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
        }
    };

    function start() {
        if (window.anime_skip_v15) return;
        window.anime_skip_v15 = true;
        AnimeSkip.init();
    }

    if (typeof Lampa !== 'undefined' && Lampa.Player) start();
    else {
        var check = setInterval(function() {
            if (typeof Lampa !== 'undefined' && Lampa.Player) { clearInterval(check); start(); }
        }, 200);
    }
})();
