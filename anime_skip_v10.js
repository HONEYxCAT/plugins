(function () {
    'use strict';

    var CLIENT_ID = 'ZGfO0sMF3eCwLYf8yMSCJjlynwNGRXWE';

    // 1. Запрос для "шпионажа" за структурой базы
    var GQL_INTROSPECTION = `
    {
      __type(name: "Timestamp") {
        fields {
          name
        }
      }
    }`;

    // 2. Поиск (Запрашиваем только 'at', чтобы не ломалось из-за неверного поля конца)
    var GQL_SEARCH = `
    query Search($search: String!) {
      searchShows(search: $search, limit: 1) {
        id
        name
        episodes {
          number
          timestamps {
            at
            type {
              name
            }
          }
        }
      }
    }`;

    function log(msg, data) {
        if (typeof data === 'object') {
            console.log('[AnimeSkip] ' + msg, JSON.stringify(data));
        } else {
            console.log('[AnimeSkip] ' + msg, data || '');
        }
    }

    function notify(msg) {
        if(Lampa.Noty) Lampa.Noty.show('[AnimeSkip] ' + msg);
    }

    var AnimeSkip = {
        init: function () {
            this.rewritePlayer();
            log('Loaded v10 (Kitsu Bridge).');
            notify('Плагин v10 загружен');
            this.checkSchema();
        },

        // Узнаем правильные поля
        checkSchema: function() {
            this.gqlRequest(GQL_INTROSPECTION, {}, function(res) {
                if(res.data && res.data.__type && res.data.__type.fields) {
                    var fields = res.data.__type.fields.map(function(f){ return f.name; });
                    // ВАЖНО: Этот лог покажет нам правильное поле для длительности!
                    log('SCHEMA FIELDS LIST: ' + fields.join(', '));
                }
            });
        },

        request: function (url, callback, errorCallback) {
            var network = new Lampa.Reguest();
            network.silent(url, callback, errorCallback);
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
                    error: function(xhr) { log('API Error', xhr.responseText); }
                });
            }
        },

        findCardInfo: function(playerObject) {
            if (playerObject.movie) return playerObject.movie;
            if (playerObject.card) return playerObject.card;
            var active = Lampa.Activity.active();
            if (active) {
                if (active.card) return active.card;
                if (active.movie) return active.movie;
                if (active.component) {
                    if (active.component.card) return active.component.card;
                    if (active.component.movie) return active.component.movie;
                }
            }
            return null;
        },

        rewritePlayer: function () {
            var _this = this;
            if (!Lampa.Player || !Lampa.Player.play) return;
            var originalPlay = Lampa.Player.play;

            Lampa.Player.play = function (object) {
                var result = originalPlay.apply(this, arguments);
                try {
                    if (!object.segments) {
                        var card = _this.findCardInfo(object);
                        var isAnime = false;
                        if (card) {
                            if (card.genres && card.genres.find(function(g){ return g.id === 16; })) isAnime = true;
                            if (card.source === 'shikimori') isAnime = true;
                            if (card.original_language === 'ja') isAnime = true;
                        }

                        if (isAnime) {
                            var season = parseInt(object.season || (object.from_item ? object.from_item.season : 0) || 0);
                            var episode = parseInt(object.episode || (object.from_item ? object.from_item.episode : 0) || 0);
                            var title = card.original_name || card.original_title || card.title;

                            if (season === 0) season = 1;
                            if (episode === 0) episode = 1;

                            if (season > 0 && episode > 0) {
                                log('Target Original: "' + title + '" E' + episode);
                                setTimeout(function() {
                                    _this.resolveEnglishTitle(title, episode, object);
                                }, 200);
                            }
                        }
                    }
                } catch(e) { console.error(e); }
                return result;
            };
        },

        // Шаг 1: Ищем английское название через Kitsu
        resolveEnglishTitle: function(jpTitle, episode, playerObject) {
            var _this = this;
            notify('Уточняю название...');
            
            var kitsuUrl = 'https://kitsu.io/api/edge/anime?filter[text]=' + encodeURIComponent(jpTitle);
            
            this.request(kitsuUrl, function(res) {
                var searchTitle = jpTitle; // По дефолту ищем по оригиналу
                
                if (res && res.data && res.data.length > 0) {
                    var anime = res.data[0];
                    var attributes = anime.attributes;
                    
                    // Пытаемся найти английское название
                    if (attributes.titles && attributes.titles.en) {
                        searchTitle = attributes.titles.en;
                        log('Found EN Title: ' + searchTitle);
                    } else if (attributes.canonicalTitle) {
                        searchTitle = attributes.canonicalTitle;
                        log('Found Canonical Title: ' + searchTitle);
                    }
                } else {
                    log('Kitsu resolve failed, using original title');
                }
                
                _this.searchAnimeSkip(searchTitle, episode, playerObject);
            }, function() {
                log('Kitsu API Error, using original title');
                _this.searchAnimeSkip(jpTitle, episode, playerObject);
            });
        },

        // Шаг 2: Ищем в AnimeSkip
        searchAnimeSkip: function(title, targetEpisode, playerObject) {
            var _this = this;
            notify('Поиск пропусков (' + title + ')...');

            this.gqlRequest(GQL_SEARCH, { search: title }, function(response) {
                if (response.data && response.data.searchShows && response.data.searchShows.length > 0) {
                    var show = response.data.searchShows[0];
                    log('AnimeSkip Found: ' + show.name);

                    if (show.episodes) {
                        // Нестрогое сравнение (==) важно
                        var foundEp = show.episodes.find(function(ep) { return ep.number == targetEpisode; });

                        if (foundEp && foundEp.timestamps && foundEp.timestamps.length > 0) {
                            _this.inject(foundEp.timestamps, playerObject);
                        } else {
                            log('Episode ' + targetEpisode + ' found but no segments.');
                        }
                    }
                } else {
                    log('AnimeSkip: No results for "' + title + '"');
                }
            });
        },

        inject: function(timestamps, playerObject) {
            var segments = [];

            timestamps.forEach(function(ts) {
                var typeName = (ts.type && ts.type.name) ? ts.type.name.toLowerCase() : 'unknown';
                var label = 'Пропустить ' + typeName;
                
                if (typeName.indexOf('intro') > -1) label = 'Пропустить заставку';
                else if (typeName.indexOf('outro') > -1) label = 'Пропустить титры';

                // ВРЕМЕННОЕ РЕШЕНИЕ: Конец = Начало + 89 сек
                // Как только ты пришлешь лог SCHEMA FIELDS LIST, я заменю это на правильное поле
                var startTime = ts.at;
                var endTime = ts.at + 89; 

                segments.push({
                    start: startTime,
                    end: endTime,
                    text: label
                });
            });

            playerObject.segments = segments;
            notify('Успех! Метки добавлены.');
            log('INJECTED', segments);
            
            if (Lampa.Player.panel) Lampa.Player.panel.update();
            if(Lampa.Player.video) {
                try { var event = new Event('timeupdate'); Lampa.Player.video.dispatchEvent(event); } catch(e) {}
            }
        }
    };

    function start() {
        if (window.anime_skip_v10) return;
        window.anime_skip_v10 = true;
        AnimeSkip.init();
    }

    if (typeof Lampa !== 'undefined' && Lampa.Player) start();
    else {
        var check = setInterval(function() {
            if (typeof Lampa !== 'undefined' && Lampa.Player) { clearInterval(check); start(); }
        }, 200);
    }
})();
