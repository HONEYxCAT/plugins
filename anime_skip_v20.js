(function () {
    'use strict';

    var CLIENT_ID = 'ZGfO0sMF3eCwLYf8yMSCJjlynwNGRXWE';
    var CACHE = {};
    var TIMER = null;

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
            this.addMenuOption();
            log('Loaded v20 (Bruteforce).');
            notify('Плагин v20: Готов');
        },

        // 1. Добавляем пункт в меню плеера (Шестеренка)
        addMenuOption: function() {
            Lampa.Player.listener.follow('ready', function(e) {
                var video = e.object;
                
                // Расширяем меню
                var originalMenu = Lampa.Player.panel.settings; // Или другой метод доступа к меню
                // В Lampa нет простого API для добавления кнопки в плеер, 
                // но мы можем перехватить вызов настроек.
                
                // Простой вариант: добавляем глобальный метод, который можно вызвать из консоли
                window.AnimeSkipManual = function() {
                    AnimeSkip.startProcess(Lampa.Player.playing());
                };
                log('Manual trigger available: window.AnimeSkipManual()');
            });
        },

        // 2. Поиск активного видео (Bruteforce)
        startPoller: function() {
            if (TIMER) clearInterval(TIMER);
            TIMER = setInterval(function() {
                var playerActive = Lampa.Player.video && !Lampa.Player.video.paused;
                if (!playerActive) return;

                // Пытаемся найти объект данных
                var object = Lampa.Player.playing(); // Стандартный метод
                
                // Если стандартный не вернул, ищем в кишках
                if (!object && Lampa.Player.data) object = Lampa.Player.data;
                
                if (object && !object.animeSkipChecked) {
                    AnimeSkip.startProcess(object);
                }
            }, 2000); // Раз в 2 секунды
        },

        startProcess: function(object) {
            if (!object) return;
            object.animeSkipChecked = true; // Помечаем, чтобы не спамить

            var card = object.movie || object.card || Lampa.Activity.active().card;
            if (!card) {
                log('No card info found in player object.');
                return;
            }

            if (!AnimeSkip.isAnime(card)) return;

            var season = parseInt(object.season || (object.from_item ? object.from_item.season : 0) || 0);
            var episode = parseInt(object.episode || (object.from_item ? object.from_item.episode : 0) || 0);
            
            if (season === 0) season = 1;
            if (episode === 0) episode = 1;

            var title = card.original_name || card.original_title || card.title;
            log('Processing: ' + title + ' Ep ' + episode);
            notify('Ищу пропуски...');

            // Ищем
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
                        notify('Пропуски не найдены');
                    }
                });
            });
        },

        inject: function(object, segments) {
            // Добавляем метку
            segments.forEach(function(s){ s.source = 'AnimeSkip'; });
            object.segments = segments;
            
            log('INJECTED!', segments);
            notify('Добавлено меток: ' + segments.length);

            // Обновляем UI
            if (Lampa.Player.timeline) Lampa.Player.timeline.update(segments);
            if (Lampa.Player.panel) Lampa.Player.panel.update();
            
            // Триггер для перерисовки
            if(Lampa.Player.video) {
                try { 
                    var event = new Event('timeupdate'); 
                    Lampa.Player.video.dispatchEvent(event); 
                } catch(e) {}
            }
        },

        // --- Helpers ---

        isAnime: function(card) {
            if (!card) return false;
            if (card.genres && card.genres.find(function(g){ return g.id === 16; })) return true;
            if (card.source === 'shikimori') return true;
            if (card.original_language === 'ja') return true;
            return false;
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
                            end: ts.at + 85, // Fallback
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
        if (window.anime_skip_v20) return;
        window.anime_skip_v20 = true;
        AnimeSkip.init();
    }

    if (typeof Lampa !== 'undefined' && Lampa.Player) start();
    else {
        var check = setInterval(function() {
            if (typeof Lampa !== 'undefined' && Lampa.Player) { clearInterval(check); start(); }
        }, 200);
    }
})();
