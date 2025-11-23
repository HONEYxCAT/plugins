(function () {
    'use strict';

    var CLIENT_ID = 'ZGfO0sMF3eCwLYf8yMSCJjlynwNGRXWE';
    var CACHE = {};
    var ACTIVE_REQUESTS = {};

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
            log('Loaded v14 (Prefetch + Cascade).');
            notify('Плагин v14: Готов');
        },

        initListeners: function() {
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

            // 1. Собираем варианты названий
            this.resolveTitles(originalTitle, function(titles) {
                // 2. Запускаем каскадный поиск
                AnimeSkip.cascadeFetch(titles, 0, function(episodesMap) {
                    if (Object.keys(episodesMap).length > 0) {
                        CACHE[tmdbId] = episodesMap;
                        log('Prefetch SUCCESS for ' + originalTitle + '. Episodes: ' + Object.keys(episodesMap).length);
                        // notify('Пропуски готовы');
                    } else {
                        log('Prefetch FAILED for ' + originalTitle);
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
                        var firstWord = clean.split(' ')[0];
                        if(firstWord.length > 3) titlesToTry.push(firstWord);
                    }
                }
                // Unique
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
                    var show = response.data.searchShows[0]; // Берем первый
                    if (show.episodes && show.episodes.length > 0) {
                        var map = _this.parseEpisodes(show.episodes);
                        if (Object.keys(map).length > 0) {
                            log('Match found: ' + show.name);
                            callback(map);
                            return;
                        }
                    }
                }
                // Если не нашли или пусто - пробуем следующий
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
                            end: ts.at + 85, // Fallback duration
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
        },

        rewritePlayer: function () {
            var _this = this;
            if (!Lampa.Player || !Lampa.Player.play) return;
            var originalPlay = Lampa.Player.play;

            Lampa.Player.play = function (object) {
                var card = object.movie || object.card || Lampa.Activity.active().card;
                
                // 1. Проверяем кэш (Быстрый старт)
                if (card && CACHE[card.id]) {
                    var episode = parseInt(object.episode || (object.from_item ? object.from_item.episode : 0) || 0);
                    if (object.season === 0) episode = 1; // Фильмы

                    var episodesMap = CACHE[card.id];
                    var segments = episodesMap[episode] || episodesMap["" + episode];

                    if (segments) {
                        log('INSTANT CACHE HIT Ep ' + episode, segments);
                        object.segments = segments;
                        notify('Сегменты загружены');
                    }
                } 
                // 2. Если кэша нет - запускаем поиск (для опоздавших)
                else if (card && _this.isAnime(card)) {
                    log('No cache. Starting late fetch...');
                    _this.prefetch(card);
                    // Данные придут позже, обновляем UI через 3 сек
                    setTimeout(function() { _this.lateInject(object, card); }, 3000);
                }

                return originalPlay.apply(this, arguments);
            };
        },

        lateInject: function(playerObject, card) {
            if (!CACHE[card.id]) return;
            var episode = parseInt(playerObject.episode || (playerObject.from_item ? playerObject.from_item.episode : 0) || 1);
            var segments = CACHE[card.id][episode];

            if (segments && !playerObject.segments) {
                playerObject.segments = segments;
                log('LATE INJECT SUCCESS', segments);
                notify('Сегменты найдены');
                if (Lampa.Player.panel) Lampa.Player.panel.update();
                if(Lampa.Player.video) {
                    try { var event = new Event('timeupdate'); Lampa.Player.video.dispatchEvent(event); } catch(e) {}
                }
            }
        }
    };

    function start() {
        if (window.anime_skip_v14) return;
        window.anime_skip_v14 = true;
        AnimeSkip.init();
    }

    if (typeof Lampa !== 'undefined' && Lampa.Player) start();
    else {
        var check = setInterval(function() {
            if (typeof Lampa !== 'undefined' && Lampa.Player) { clearInterval(check); start(); }
        }, 200);
    }
})();
