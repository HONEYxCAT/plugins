(function () {
    'use strict';

    var CLIENT_ID = 'lampa-plugin-' + Math.floor(Math.random() * 1000000);
    var animeCache = {}; 

    // Запрос ВСЕХ эпизодов для аниме (так надежнее)
    var GQL_QUERY_ALL = `
    query GetEpisodes($service: Service!, $id: String!) {
      findAnime(service: $service, id: $id) {
        id
        episodes {
          number
          timestamps {
            type
            at
            end
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
            log('Loaded v5. Client: ' + CLIENT_ID);
            notify('Плагин загружен (v5)');
        },

        request: function (url, callback, errorCallback) {
            var network = new Lampa.Reguest();
            network.silent(url, callback, errorCallback);
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
                    headers: { 'X-Client-ID': CLIENT_ID },
                    success: function(response) { callback(response); },
                    error: function(xhr, status, error) { log('GQL Error', xhr.responseText); }
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
                            var uniqueKey = title + '_' + (card.year || 0);

                            if (season === 0) season = 1;
                            if (episode === 0) episode = 1;

                            if (season > 0 && episode > 0) {
                                log('Detected: ' + title + ' E' + episode);
                                
                                if (animeCache[uniqueKey]) {
                                    var cache = animeCache[uniqueKey];
                                    _this.startFetchSequence(cache.malId, cache.kitsuId, episode, object);
                                } else {
                                    setTimeout(function() {
                                        _this.findAnimeId(title, uniqueKey, season, episode, object);
                                    }, 100);
                                }
                            }
                        }
                    }
                } catch(e) {
                    console.error('[AnimeSkip] Hook error:', e);
                }
                return result;
            };
        },

        findAnimeId: function(title, uniqueKey, season, episode, playerObject) {
            var _this = this;
            notify('Поиск пропусков...');
            
            var searchTitle = encodeURIComponent(title);
            var kitsuUrl = 'https://kitsu.io/api/edge/anime?filter[text]=' + searchTitle + '&include=mappings';

            this.request(kitsuUrl, function(response) {
                if (response && response.data && response.data.length > 0) {
                    var animeData = response.data[0];
                    var kitsuId = animeData.id;
                    var malId = null;
                    if (response.included) {
                        var malMapping = response.included.find(function(item) {
                            return item.type === 'mappings' && item.attributes.externalSite === 'myanimelist/anime';
                        });
                        if (malMapping) malId = malMapping.attributes.externalId;
                    }

                    log('IDs Found -> MAL: ' + malId + ' | Kitsu: ' + kitsuId);
                    animeCache[uniqueKey] = { malId: malId, kitsuId: kitsuId };
                    _this.startFetchSequence(malId, kitsuId, episode, playerObject);
                    
                } else {
                    log('Kitsu not found');
                    notify('Аниме не найдено');
                }
            }, function() {
                log('Kitsu API Error');
            });
        },

        startFetchSequence: function(malId, kitsuId, episode, playerObject) {
            var _this = this;
            if (malId) {
                log('Trying MAL source...');
                _this.fetchEpisodes('mal', malId, episode, function(success) {
                    if (success) return;
                    log('MAL failed. Trying Kitsu source...');
                    _this.fetchEpisodes('kitsu', kitsuId, episode, function(success) {
                        if (!success) log('All sources failed.');
                    }, playerObject);
                }, playerObject);
            } else {
                log('No MAL ID. Trying Kitsu source...');
                _this.fetchEpisodes('kitsu', kitsuId, episode, function(){}, playerObject);
            }
        },

        // Новая логика: Запрашиваем ВСЕ эпизоды и ищем нужный в массиве
        fetchEpisodes: function(service, id, targetEpisode, callback, playerObject) {
            var _this = this;
            var variables = {
                service: service,
                id: "" + id
            };

            this.gqlRequest(GQL_QUERY_ALL, variables, function(response) {
                // Лог сырого ответа для дебага
                // console.log('[AnimeSkip] Raw GQL:', response);

                if (response.data && response.data.findAnime && response.data.findAnime.episodes) {
                    var allEpisodes = response.data.findAnime.episodes;
                    
                    // Ищем эпизод вручную в массиве
                    var foundEp = allEpisodes.find(function(ep) {
                        // Сравнение с нестрогим равенством (на случай строк/чисел)
                        return ep.number == targetEpisode;
                    });

                    if (foundEp && foundEp.timestamps && foundEp.timestamps.length > 0) {
                        _this.inject(foundEp.timestamps, playerObject);
                        callback(true);
                    } else {
                        log('Episode ' + targetEpisode +' found in list, but no timestamps or episode missing.');
                        callback(false);
                    }
                } else {
                    log('Anime not found in Anime-Skip DB (or no episodes list).');
                    callback(false);
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
            
            notify('Найдено меток: ' + segments.length);
            log('INJECTED:', segments);
            
            if (Lampa.Player.panel) Lampa.Player.panel.update();
            
            if(Lampa.Player.video) {
                try {
                    var event = new Event('timeupdate');
                    Lampa.Player.video.dispatchEvent(event);
                } catch(e) {}
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
