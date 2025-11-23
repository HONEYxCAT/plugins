(function () {
    'use strict';

    var CLIENT_ID = 'ZGfO0sMF3eCwLYf8yMSCJjlynwNGRXWE';
    var CACHE = {};
    var ACTIVE_REQUESTS = {};
    var POLLING_INTERVAL = null; // Таймер проверки

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
            this.startPolling(); // Запускаем вечный цикл проверки
            log('Loaded v19 (Polling Mode).');
            notify('Плагин v19: Активен');
        },

        // 1. ПРЕДЗАГРУЗКА (при открытии описания)
        initPrefetchListener: function() {
            Lampa.Listener.follow('full', function(e) {
                if (e.type == 'complite') {
                    var card = e.data.movie;
                    if (AnimeSkip.isAnime(card)) {
                        // log('Card opened: ' + card.title);
                        AnimeSkip.prefetch(card);
                    }
                }
            });
        },

        // 2. ГЛАВНЫЙ ЦИКЛ (Проверяет плеер каждую секунду)
        startPolling: function() {
            if (POLLING_INTERVAL) clearInterval(POLLING_INTERVAL);
            
            POLLING_INTERVAL = setInterval(function() {
                // Проверяем, активен ли плеер
                if (Lampa.Player.video && !Lampa.Player.video.paused) {
                    var object = Lampa.Player.playing();
                    
                    // Если видео играет, но сегментов нет (или они не наши)
                    if (object && (!object.segments || (object.segments.length > 0 && object.segments[0].source !== 'AnimeSkip'))) {
                        AnimeSkip.tryInject(object);
                    }
                }
            }, 1000); // Проверка раз в секунду
        },

        tryInject: function(object) {
            // Если мы уже пытаемся загрузить для этого объекта - не спамим
            if (object.animeSkipLoading) return;

            // Пытаемся достать карточку
            var card = object.movie || object.card || Lampa.Activity.active().card;
            
            if (!card || !AnimeSkip.isAnime(card)) return;

            object.animeSkipLoading = true; // Флаг, что мы в процессе

            var season = parseInt(object.season || (object.from_item ? object.from_item.season : 0) || 0);
            var episode = parseInt(object.episode || (object.from_item ? object.from_item.episode : 0) || 0);
            if (season === 0) season = 1;
            if (episode === 0) episode = 1;

            var uniqueId = card.id;

            // 1. Ищем в кэше
            if (CACHE[uniqueId]) {
                var map = CACHE[uniqueId];
                var segments = map[episode] || map["" + episode];
                
                if (segments) {
                    AnimeSkip.applySegments(object, segments);
                } else {
                    // В кэше есть аниме, но нет эпизода
                    log('No segments in cache for Ep ' + episode);
                    object.animeSkipLoading = false; // Сбрасываем, чтобы попробовать позже (вдруг кэш обновится)
                }
            } 
            // 2. Если кэша нет - запускаем поиск
            else {
                if (!ACTIVE_REQUESTS[uniqueId]) {
                    log('No cache. Starting fetch for ' + card.title);
                    AnimeSkip.prefetch(card);
                }
                // Флаг загрузки снимаем через 5 сек, чтобы попробовать снова
                setTimeout(function() { object.animeSkipLoading = false; }, 5000);
            }
        },

        applySegments: function(object, segments) {
            // Добавляем метку источника
            segments.forEach(function(s){ s.source = 'AnimeSkip'; });
            
            object.segments = segments;
            
            log('INJECTED via Polling', segments);
            notify('Пропуски добавлены (' + segments.length + ')');

            // Обновляем UI
            if (Lampa.Player.timeline) Lampa.Player.timeline.update(segments);
            if (Lampa.Player.panel) Lampa.Player.panel.update();
            
            // Помечаем объект как обработанный, но так, чтобы startPolling это понял
            // (проверка object.segments[0].source === 'AnimeSkip' это гарантирует)
        },

        isAnime: function(card) {
            if (!card) return false;
            if (card.genres && card.genres.find(function(g){ return g.id === 16; })) return true;
            if (card.source === 'shikimori') return true;
            if (card.original_language === 'ja') return true;
            return false;
        },

        // --- ЛОГИКА ПОИСКА (старая добрая) ---
        prefetch: function(card) {
            var tmdbId = card.id;
            if (CACHE[tmdbId] || ACTIVE_REQUESTS[tmdbId]) return;

            ACTIVE_REQUESTS[tmdbId] = true;
            var originalTitle = card.original_name || card.original_title || card.title;

            this.resolveTitles(originalTitle, function(titles) {
                AnimeSkip.cascadeFetch(titles, 0, function(episodesMap) {
                    if (Object.keys(episodesMap).length > 0) {
                        CACHE[tmdbId] = episodesMap;
                        log('Fetched: ' + Object.keys(episodesMap).length + ' eps');
                    }
                    delete ACTIVE_REQUESTS[tmdbId];
                });
            });
        },

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
            // log('Searching: ' + currentQuery);

            this.gqlRequest(GQL_SEARCH, { search: currentQuery }, function(response) {
                if (response.data && response.data.searchShows && response.data.searchShows.length > 0) {
                    for(var i=0; i < response.data.searchShows.length; i++) {
                        var show = response.data.searchShows[i];
                        if (show.episodes && show.episodes.length > 0) {
                            var map = _this.parseEpisodes(show.episodes);
                            if (Object.keys(map).length > 0) {
                                log('Match: ' + show.name);
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
                            end: ts.at + 85,
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
                    error: function(xhr) { callback({}); }
                });
            }
        }
    };

    function start() {
        if (window.anime_skip_v19) return;
        window.anime_skip_v19 = true;
        AnimeSkip.init();
    }

    if (typeof Lampa !== 'undefined' && Lampa.Player) start();
    else {
        var check = setInterval(function() {
            if (typeof Lampa !== 'undefined' && Lampa.Player) { clearInterval(check); start(); }
        }, 200);
    }
})();
