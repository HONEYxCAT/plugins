(function () {
    'use strict';

    var CLIENT_ID = 'ZGfO0sMF3eCwLYf8yMSCJjlynwNGRXWE';

    // 1. Запрос СХЕМЫ (чтобы узнать правильные поля)
    var GQL_INTROSPECTION = `
    {
      __type(name: "Timestamp") {
        name
        fields {
          name
          description
          type {
            name
            kind
          }
        }
      }
    }`;

    // 2. Временный запрос (БЕЗ end/duration, чтобы не было ошибки)
    var GQL_SAFE_SEARCH = `
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
        console.log('[AnimeSkip] ' + msg, data || '');
    }

    function notify(msg) {
        if(Lampa.Noty) Lampa.Noty.show('[AnimeSkip] ' + msg);
    }

    var AnimeSkip = {
        init: function () {
            this.rewritePlayer();
            log('Loaded v9 (Diagnostic).');
            notify('Плагин загружен (v9)');
            
            // Сразу запускаем диагностику схемы
            this.runDiagnostics();
        },

        gqlRequest: function (query, variables, callback) {
            var url = 'https://api.anime-skip.com/graphql';
            var body = JSON.stringify({
                query: query,
                variables: variables
            });

            if(typeof $ !== 'undefined' && $.ajax) {
                $.ajax({
                    url: url,
                    type: 'POST',
                    data: body,
                    contentType: 'application/json',
                    headers: { 
                        'X-Client-ID': CLIENT_ID,
                        'Content-Type': 'application/json'
                    },
                    success: function(response) { callback(response); },
                    error: function(xhr, status, error) { 
                        log('Network Error', xhr.responseText); 
                    }
                });
            }
        },

        runDiagnostics: function() {
            var _this = this;
            log('Running Schema Introspection...');
            this.gqlRequest(GQL_INTROSPECTION, {}, function(response) {
                if (response.data && response.data.__type && response.data.__type.fields) {
                    var fields = response.data.__type.fields.map(function(f) { return f.name; });
                    log('>>> API SCHEMA FIELDS FOUND: <<<', fields);
                    notify('Схема получена (см. консоль)');
                } else {
                    log('Schema Introspection Failed', response);
                }
            });
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
                                log('Target: "' + title + '" E' + episode);
                                setTimeout(function() {
                                    _this.searchAndInject(title, episode, object);
                                }, 500);
                            }
                        }
                    }
                } catch(e) {
                    console.error('[AnimeSkip] Hook error:', e);
                }
                return result;
            };
        },

        searchAndInject: function(title, targetEpisode, playerObject) {
            var _this = this;
            notify('Поиск (Safe Mode)...');

            // Используем безопасный запрос без end/duration
            this.gqlRequest(GQL_SAFE_SEARCH, { search: title }, function(response) {
                if (response.data && response.data.searchShows) {
                    var shows = response.data.searchShows;
                    
                    if (shows.length > 0) {
                        var show = shows[0];
                        log('Found Show: ' + show.name);

                        if (show.episodes) {
                            var foundEp = show.episodes.find(function(ep) {
                                return ep.number == targetEpisode;
                            });

                            if (foundEp && foundEp.timestamps && foundEp.timestamps.length > 0) {
                                _this.inject(foundEp.timestamps, playerObject);
                            } else {
                                log('Episode found, no timestamps.');
                            }
                        }
                    } else {
                        log('No shows found.');
                    }
                } else {
                    log('API Error', response);
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

                // ФОЛЛБЭК: Так как мы не знаем имя поля длительности,
                // мы ставим фиксированную длину 90 секунд (стандарт аниме опенинга 1:30)
                var startTime = ts.at;
                var endTime = ts.at + 90; 

                segments.push({
                    start: startTime,
                    end: endTime,
                    text: label
                });
            });

            playerObject.segments = segments;
            
            notify('Внедрено (Fixed 90s): ' + segments.length);
            log('INJECTED (Fallback Mode):', segments);
            
            if (Lampa.Player.panel) Lampa.Player.panel.update();
            if(Lampa.Player.video) {
                try { var event = new Event('timeupdate'); Lampa.Player.video.dispatchEvent(event); } catch(e) {}
            }
        }
    };

    function startPlugin() {
        if (window.anime_skip_loaded) return;
        window.anime_skip_loaded = true;
        AnimeSkip.init();
    }

    if (typeof Lampa !== 'undefined' && Lampa.Player) {
        startPlugin();
    } else {
        var check = setInterval(function() {
            if (typeof Lampa !== 'undefined' && Lampa.Player) {
                clearInterval(check);
                startPlugin();
            }
        }, 200);
    }

})();
