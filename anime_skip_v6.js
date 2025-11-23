(function () {
    'use strict';

    var CLIENT_ID = 'lampa-plugin-' + Math.floor(Math.random() * 1000000);
    var animeCache = {}; 

    // Запрос по ID
    var GQL_FIND_BY_ID = `
    query GetEpisodesById($service: Service!, $id: String!) {
      findAnime(service: $service, id: $id) {
        id
        episodes {
          number
          timestamps { type, at, end }
        }
      }
    }`;

    // Запрос по Названию (Новый метод)
    var GQL_SEARCH = `
    query SearchAnime($query: String!) {
      search(query: $query) {
        ... on Anime {
          id
          name
          episodes {
            number
            timestamps { type, at, end }
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
            log('Loaded v6 (Search Fallback). Client: ' + CLIENT_ID);
            notify('Плагин загружен (v6)');
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
                                    _this.tryFetchSequence(title, cache.malId, cache.kitsuId, episode, object);
                                } else {
                                    setTimeout(function() {
                                        _this.findIdsAndStart(title, uniqueKey, season, episode, object);
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

        findIdsAndStart: function(title, uniqueKey, season, episode, playerObject) {
            var _this = this;
            notify('Поиск пропусков...');
            
            var searchTitle = encodeURIComponent(title);
            var kitsuUrl = 'https://kitsu.io/api/edge/anime?filter[text]=' + searchTitle + '&include=mappings';

            this.request(kitsuUrl, function(response) {
                var malId = null;
                var kitsuId = null;

                if (response && response.data && response.data.length > 0) {
                    var animeData = response.data[0];
                    kitsuId = animeData.id;
                    
                    if (response.included) {
                        var malMapping = response.included.find(function(item) {
                            return item.type === 'mappings' && item.attributes.externalSite === 'myanimelist/anime';
                        });
                        if (malMapping) malId = malMapping.attributes.externalId;
                    }
                    log('IDs Found -> MAL: ' + malId + ' | Kitsu: ' + kitsuId);
                } else {
                    log('Kitsu lookup failed. Will try name search.');
                }

                animeCache[uniqueKey] = { malId: malId, kitsuId: kitsuId };
                _this.tryFetchSequence(title, malId, kitsuId, episode, playerObject);

            }, function() {
                log('Kitsu API Error. Will try name search.');
                _this.tryFetchSequence(title, null, null, episode, playerObject);
            });
        },

        tryFetchSequence: function(title, malId, kitsuId, episode, playerObject) {
            var _this = this;

            // Шаг 1: Пробуем MAL
            if (malId) {
                log('Attempt 1: MAL ID ' + malId);
                _this.fetchByService('mal', malId, episode, function(success) {
                    if (success) return;
                    _this.step2(title, kitsuId, episode, playerObject);
                }, playerObject);
            } else {
                _this.step2(title, kitsuId, episode, playerObject);
            }
        },

        step2: function(title, kitsuId, episode, playerObject) {
            var _this = this;
            // Шаг 2: Пробуем Kitsu
            if (kitsuId) {
                log('Attempt 2: Kitsu ID ' + kitsuId);
                _this.fetchByService('kitsu', kitsuId, episode, function(success) {
                    if (success) return;
                    _this.step3(title, episode, playerObject);
                }, playerObject);
            } else {
                _this.step3(title, episode, playerObject);
            }
        },

        step3: function(title, episode, playerObject) {
            var _this = this;
            // Шаг 3: Пробуем Поиск по названию
            log('Attempt 3: Search by Title "' + title + '"');
            _this.searchByTitle(title, episode, function(success) {
                if (!success) log('All methods failed for E' + episode);
            }, playerObject);
        },

        // Получение по сервису (MAL/Kitsu)
        fetchByService: function(service, id, targetEpisode, callback, playerObject) {
            var _this = this;
            this.gqlRequest(GQL_FIND_BY_ID, { service: service, id: "" + id }, function(response) {
                if (response.data && response.data.findAnime && response.data.findAnime.episodes) {
                    var found = _this.findAndInject(response.data.findAnime.episodes, targetEpisode, playerObject);
                    callback(found);
                } else {
                    callback(false);
                }
            });
        },

        // Поиск по названию
        searchByTitle: function(title, targetEpisode, callback, playerObject) {
            var _this = this;
            this.gqlRequest(GQL_SEARCH, { query: title }, function(response) {
                if (response.data && response.data.search && response.data.search.length > 0) {
                    // Берем первый результат поиска (обычно самый релевантный)
                    var anime = response.data.search[0];
                    log('Search found: ' + anime.name);
                    
                    if (anime.episodes) {
                        var found = _this.findAndInject(anime.episodes, targetEpisode, playerObject);
                        callback(found);
                    } else {
                        callback(false);
                    }
                } else {
                    callback(false);
                }
            });
        },

        findAndInject: function(episodesList, targetEpisode, playerObject) {
            var foundEp = episodesList.find(function(ep) {
                return ep.number == targetEpisode;
            });

            if (foundEp && foundEp.timestamps && foundEp.timestamps.length > 0) {
                this.inject(foundEp.timestamps, playerObject);
                return true;
            }
            return false;
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
            log('INJECTED SUCCESS', segments);
            
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
