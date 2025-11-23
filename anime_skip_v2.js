(function () {
    'use strict';

    var CLIENT_ID = 'lampa-plugin-client-' + Math.floor(Math.random() * 1000000);
    var PROXY_URL = 'https://api.allorigins.win/raw?url=';
    
    var GQL_QUERY = `
    query GetSkipTimes($service: Service!, $id: String!, $episode: Float!) {
      findEpisode(service: $service, id: $id, number: $episode) {
        id
        timestamps {
          type
          at
          end
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
            try {
                this.rewritePlayer();
                log('Initialized. Client ID: ' + CLIENT_ID);
                notify('Плагин загружен');
            } catch(e) {
                console.error('[AnimeSkip] Init error:', e);
            }
        },

        request: function (url, callback, errorCallback) {
            var network = new Lampa.Reguest();
            network.silent(url, callback, errorCallback);
        },

        gqlRequest: function (variables, callback) {
            var url = 'https://api.anime-skip.com/graphql';
            var body = JSON.stringify({
                query: GQL_QUERY,
                variables: variables
            });

            if(typeof $ !== 'undefined' && $.ajax) {
                $.ajax({
                    url: url,
                    type: 'POST',
                    data: body,
                    contentType: 'application/json',
                    headers: { 'X-Client-ID': CLIENT_ID },
                    success: function(response) { callback(response); },
                    error: function(xhr, status, error) { log('GQL Error', error); }
                });
            } else {
                log('jQuery is missing!');
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
                        // Пытаемся найти карточку сразу
                        var card = _this.findCardInfo(object);
                        
                        // Проверка на аниме (жанр 16 или источник shikimori)
                        var isAnime = false;
                        if (card) {
                            if (card.genres && card.genres.find(function(g){ return g.id === 16; })) isAnime = true;
                            if (card.source === 'shikimori') isAnime = true;
                        }

                        if (isAnime) {
                            // Получаем сезон и эпизод
                            var season = parseInt(object.season || (object.from_item ? object.from_item.season : 0) || 0);
                            var episode = parseInt(object.episode || (object.from_item ? object.from_item.episode : 0) || 0);
                            var title = card.original_name || card.original_title || card.title;

                            // Если это фильм, пробуем считать его как S1 E1 (часто работает для мувиков)
                            if (season === 0) season = 1;
                            if (episode === 0) episode = 1;

                            if (season > 0 && episode > 0) {
                                log('Detected Anime: ' + title + ' S' + season + ' E' + episode);
                                
                                setTimeout(function() {
                                    _this.process(title, season, episode, object);
                                }, 1000);
                            }
                        }
                    }
                } catch(e) {
                    console.error('[AnimeSkip] Hook error:', e);
                }
                return result;
            };
        },

        process: function(title, season, episode, playerObject) {
            var _this = this;
            notify('Ищу ' + title + ' на Kitsu...');
            
            var searchTitle = encodeURIComponent(title);
            var kitsuUrl = 'https://kitsu.io/api/edge/anime?filter[text]=' + searchTitle;

            this.request(kitsuUrl, function(response) {
                if (response && response.data && response.data.length > 0) {
                    var animeData = response.data[0];
                    var kitsuId = animeData.id;
                    var foundTitle = animeData.attributes.canonicalTitle;
                    
                    log('Found Kitsu ID: ' + kitsuId + ' (' + foundTitle + ')');
                    
                    // Для Kitsu эпизоды часто идут сквозной нумерацией.
                    // Пока пробуем передать episode как есть.
                    _this.fetchTimestamps('kitsu', kitsuId, episode, playerObject);
                    
                } else {
                    log('Kitsu search returned nothing');
                    notify('Аниме не найдено на Kitsu');
                }
            }, function() {
                log('Kitsu API failed');
            });
        },

        fetchTimestamps: function(service, id, episode, playerObject) {
            var _this = this;
            var variables = {
                service: service,
                id: "" + id,
                episode: episode
            };

            log('Querying Anime-Skip...', variables);

            this.gqlRequest(variables, function(response) {
                if (response.data && response.data.findEpisode && response.data.findEpisode.timestamps) {
                    var times = response.data.findEpisode.timestamps;
                    if (times.length > 0) {
                        _this.inject(times, playerObject);
                    } else {
                        log('Anime-Skip found episode, but NO timestamps.');
                        // notify('Нет пропусков для этой серии'); // Можно раскомментировать, если хотите видеть
                    }
                } else {
                    log('Anime-Skip returned no data.');
                }
            });
        },

        inject: function(timestamps, playerObject) {
            var segments = [];

            timestamps.forEach(function(ts) {
                var label = 'Пропустить';
                if (ts.type === 'intro' || ts.type === 'mixed-intro') label = 'Пропустить заставку';
                else if (ts.type === 'outro' || ts.type === 'mixed-outro') label = 'Пропустить титры';
                else if (ts.type === 'recap') label = 'Пропустить пересказ';
                else label = 'Пропустить ' + ts.type;

                segments.push({
                    start: ts.at,
                    end: ts.end,
                    text: label
                });
            });

            playerObject.segments = segments;
            notify('Найдено ' + segments.length + ' меток!');
            log('Injected:', segments);
            
            if (Lampa.Player.panel) Lampa.Player.panel.update();
        }
    };

    // Надежный старт
    function startPlugin() {
        if (window.anime_skip_loaded) return;
        window.anime_skip_loaded = true;
        AnimeSkip.init();
    }

    if (typeof Lampa !== 'undefined' && Lampa.Player) {
        startPlugin();
    } else {
        // Ждем загрузки ядра
        var checkLampa = setInterval(function() {
            if (typeof Lampa !== 'undefined' && Lampa.Player) {
                clearInterval(checkLampa);
                startPlugin();
            }
        }, 200);
    }

})();
