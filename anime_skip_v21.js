(function () {
    'use strict';

    var CLIENT_ID = 'ZGfO0sMF3eCwLYf8yMSCJjlynwNGRXWE';
    var CACHE = {};
    var POLLER_ID = null;

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
            this.startPoller();
            log('Loaded v21 (Pure Injection).');
            notify('Плагин v21: Работает');
        },

        // === ГЛАВНЫЙ ЦИКЛ ===
        startPoller: function() {
            if (POLLER_ID) clearInterval(POLLER_ID);
            
            POLLER_ID = setInterval(function() {
                // 1. Проверка активности плеера
                if (!Lampa.Player.video || Lampa.Player.video.paused) return;

                // 2. Поиск объекта данных (где хранятся сезон/серия)
                var object = AnimeSkip.findPlayingObject();
                
                if (object && !object.animeSkipProcessed) {
                    // Если нашли объект и еще не обрабатывали
                    AnimeSkip.process(object);
                }
            }, 1500); // Проверяем каждые 1.5 сек
        },

        findPlayingObject: function() {
            // Пробуем разные места, где Lampa хранит данные
            if (Lampa.Player.playing()) return Lampa.Player.playing();
            
            // Для некоторых скинов/версий
            if (Lampa.Player.render && Lampa.Player.render().data) {
                 // Иногда данные привязаны к DOM элементу
                 var data = $(Lampa.Player.render()).data();
                 if (data && data.movie) return data;
            }
            
            // Если есть компонент
            if (Lampa.Player.component) {
                 var comp = Lampa.Player.component();
                 if (comp && comp.object) return comp.object;
            }

            return null;
        },

        process: function(object) {
            object.animeSkipProcessed = true; // Ставим флаг, чтобы не спамить

            // Пытаемся найти карточку фильма
            var card = object.movie || object.card || Lampa.Activity.active().card;
            
            if (!card || !AnimeSkip.isAnime(card)) return;

            var episode = parseInt(object.episode || (object.from_item ? object.from_item.episode : 0) || 0);
            if (episode === 0) episode = 1; 

            var title = card.original_name || card.original_title || card.title;
            log('Detected: ' + title + ' Ep ' + episode);

            // Проверка кэша
            if (CACHE[card.id] && CACHE[card.id][episode]) {
                AnimeSkip.inject(object, CACHE[card.id][episode]);
            } else {
                // Если кэша нет, запускаем поиск
                if (!object.animeSkipSearching) {
                    object.animeSkipSearching = true;
                    notify('Поиск пропусков...');
                    
                    AnimeSkip.resolveTitles(title, function(titles) {
                        AnimeSkip.cascadeFetch(titles, 0, function(episodesMap) {
                            if (Object.keys(episodesMap).length > 0) {
                                CACHE[card.id] = episodesMap;
                                var segments = episodesMap[episode] || episodesMap["" + episode];
                                if (segments) {
                                    AnimeSkip.inject(object, segments);
                                } else {
                                    notify('Для этой серии нет меток');
                                }
                            } else {
                                log('Search failed for ' + title);
                            }
                        });
                    });
                }
            }
        },

        inject: function(object, segments) {
            segments.forEach(function(s){ s.source = 'AnimeSkip'; });
            object.segments = segments;
            
            log('INJECTED!', segments);
            notify('Метки добавлены (' + segments.length + ')');

            // Принудительное обновление UI
            if (Lampa.Player.timeline) Lampa.Player.timeline.update(segments);
            if (Lampa.Player.panel) Lampa.Player.panel.update();
            
            if(Lampa.Player.video) {
                try { var event = new Event('timeupdate'); Lampa.Player.video.dispatchEvent(event); } catch(e) {}
            }
        },

        isAnime: function(card) {
            if (!card) return false;
            if (card.genres && card.genres.find(function(g){ return g.id === 16; })) return true;
            if (card.source === 'shikimori') return true;
            if (card.original_language === 'ja') return true;
            return false;
        },

        // --- SEARCH ---
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
                    error: function(xhr) { callback({}); }
                });
            }
        }
    };

    function start() {
        if (window.anime_skip_v21) return;
        window.anime_skip_v21 = true;
        AnimeSkip.init();
    }

    if (typeof Lampa !== 'undefined' && Lampa.Player) start();
    else {
        var check = setInterval(function() {
            if (typeof Lampa !== 'undefined' && Lampa.Player) { clearInterval(check); start(); }
        }, 200);
    }
})();
