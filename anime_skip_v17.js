(function () {
    'use strict';

    var CLIENT_ID = 'ZGfO0sMF3eCwLYf8yMSCJjlynwNGRXWE';
    var CACHE = {};

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
            this.initPlayerListener();
            log('Loaded v17 (Activity Based).');
            notify('Плагин v17: Готов');
        },

        // Главная точка входа
        initPlayerListener: function() {
            // Подписываемся на старт плеера
            Lampa.Player.listener.follow('start', function() {
                // Небольшая задержка, чтобы все объекты инициализировались
                setTimeout(function() {
                    AnimeSkip.checkAndInject();
                }, 500);
            });
            
            // Подписываемся на смену серии (для плейлистов)
            Lampa.Player.listener.follow('new', function() {
                setTimeout(function() {
                    AnimeSkip.checkAndInject();
                }, 500);
            });
        },

        checkAndInject: function() {
            // 1. Берем карточку из Активности (это страница описания, с которой запустили плеер)
            var active = Lampa.Activity.active();
            if (!active || !active.card) return; // Не откуда брать инфу
            
            var card = active.card;

            // 2. Проверяем, аниме ли это
            if (!AnimeSkip.isAnime(card)) return;

            // 3. Берем данные о текущем файле из Плеера
            var playing = Lampa.Player.playing();
            if (!playing) return;

            // Определяем сезон и эпизод
            var season = parseInt(playing.season || (playing.from_item ? playing.from_item.season : 0) || 0);
            var episode = parseInt(playing.episode || (playing.from_item ? playing.from_item.episode : 0) || 0);
            
            // Фикс для фильмов
            if (season === 0) season = 1;
            if (episode === 0) episode = 1;

            var title = card.original_name || card.original_title || card.title;
            var uniqueId = card.id;

            log('Detected in Player: ' + title + ' S' + season + ' E' + episode);

            // 4. Проверяем кэш или ищем
            if (CACHE[uniqueId]) {
                AnimeSkip.injectFromCache(uniqueId, episode, playing);
            } else {
                log('No cache. Starting Search...');
                notify('Поиск пропусков...');
                
                AnimeSkip.resolveTitlesAndSearch(title, function(episodesMap) {
                    if (Object.keys(episodesMap).length > 0) {
                        CACHE[uniqueId] = episodesMap;
                        AnimeSkip.injectFromCache(uniqueId, episode, playing);
                    } else {
                        log('Search failed for ' + title);
                        // notify('Пропуски не найдены');
                    }
                });
            }
        },

        injectFromCache: function(id, episode, playerObject) {
            var episodesMap = CACHE[id];
            // Ключ может быть строкой или числом
            var segments = episodesMap[episode] || episodesMap["" + episode];

            if (segments) {
                // Внедрение
                playerObject.segments = segments;
                
                // Обновление UI Lampa
                if (Lampa.Player.timeline) Lampa.Player.timeline.update(segments);
                if (Lampa.Player.panel) Lampa.Player.panel.update();
                
                log('INJECTED SUCCESS', segments);
                notify('Пропуски добавлены');
            } else {
                log('No segments for Episode ' + episode);
            }
        },

        isAnime: function(card) {
            if (!card) return false;
            if (card.genres && card.genres.find(function(g){ return g.id === 16; })) return true;
            if (card.source === 'shikimori') return true;
            if (card.original_language === 'ja') return true;
            return false;
        },

        // --- ПОИСК ---
        resolveTitlesAndSearch: function(originalTitle, callback) {
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
                
                AnimeSkip.cascadeFetch(titlesToTry, 0, callback);
            }, function() {
                AnimeSkip.cascadeFetch(titlesToTry, 0, callback);
            });
        },

        cascadeFetch: function(titlesList, index, callback) {
            var _this = this;
            if (index >= titlesList.length) {
                callback({});
                return;
            }

            var currentQuery = titlesList[index];
            log('Searching: ' + currentQuery);

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
                    error: function(xhr) { log('API Error', xhr.responseText); callback({}); }
                });
            }
        }
    };

    function start() {
        if (window.anime_skip_v17) return;
        window.anime_skip_v17 = true;
        AnimeSkip.init();
    }

    if (typeof Lampa !== 'undefined' && Lampa.Player) start();
    else {
        var check = setInterval(function() {
            if (typeof Lampa !== 'undefined' && Lampa.Player) { clearInterval(check); start(); }
        }, 200);
    }
})();
