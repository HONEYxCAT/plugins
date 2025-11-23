(function () {
    'use strict';

    // Официальный Client ID из документации
    var CLIENT_ID = 'ZGfO0sMF3eCwLYf8yMSCJjlynwNGRXWE';
    
    // Новый запрос согласно документации
    // Мы ищем шоу, и сразу просим вернуть эпизоды с таймкодами
    var GQL_SEARCH = `
    query Search($search: String!) {
      searchShows(search: $search, limit: 5) {
        id
        name
        originalName
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
            log('Loaded v7 (Official API). Client: ' + CLIENT_ID);
            notify('Плагин загружен (v7)');
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
                        log('API Error', xhr.responseText); 
                        // Если ошибка CORS, можно попробовать через прокси, но для POST это сложно
                    }
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
                            
                            // Используем original_name (обычно японское) для поиска, это надежнее для базы AnimeSkip
                            var title = card.original_name || card.original_title || card.title;

                            if (season === 0) season = 1;
                            if (episode === 0) episode = 1;

                            if (season > 0 && episode > 0) {
                                log('Search Target: "' + title + '" Episode: ' + episode);
                                
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
            notify('Поиск пропусков...');

            this.gqlRequest(GQL_SEARCH, { search: title }, function(response) {
                if (response.data && response.data.searchShows) {
                    var shows = response.data.searchShows;
                    log('API found ' + shows.length + ' potential shows');

                    if (shows.length > 0) {
                        // Берем первый результат (обычно самый релевантный)
                        // Можно добавить логику сравнения имен, но обычно поиск точный
                        var show = shows[0];
                        log('Selected Show: ' + show.name + ' (' + show.id + ')');

                        if (show.episodes) {
                            var foundEp = show.episodes.find(function(ep) {
                                return ep.number == targetEpisode;
                            });

                            if (foundEp && foundEp.timestamps && foundEp.timestamps.length > 0) {
                                _this.inject(foundEp.timestamps, playerObject);
                            } else {
                                log('Episode ' + targetEpisode + ' found, but has NO timestamps.');
                                // Попробуем найти следующий результат в поиске, вдруг это другой сезон?
                                if (shows.length > 1) {
                                    log('Trying next search result...');
                                    var show2 = shows[1];
                                    if (show2.episodes) {
                                        var foundEp2 = show2.episodes.find(function(ep) { return ep.number == targetEpisode; });
                                        if (foundEp2 && foundEp2.timestamps && foundEp2.timestamps.length > 0) {
                                            log('Found in second search result!');
                                            _this.inject(foundEp2.timestamps, playerObject);
                                        }
                                    }
                                }
                            }
                        } else {
                            log('Show found but no episodes list returned.');
                        }
                    } else {
                        log('No shows found for query: ' + title);
                    }
                } else {
                    log('Invalid API response', response);
                }
            });
        },

        inject: function(timestamps, playerObject) {
            var segments = [];

            timestamps.forEach(function(ts) {
                var label = 'Пропустить';
                // Маппинг типов Anime-Skip на русский
                if (ts.type === 'intro' || ts.type === 'mixed-intro') label = 'Пропустить заставку';
                else if (ts.type === 'outro' || ts.type === 'mixed-outro') label = 'Пропустить титры';
                else if (ts.type === 'recap') label = 'Пропустить пересказ';
                else if (ts.type === 'preview') label = 'Пропустить превью';
                else label = 'Пропустить ' + ts.type;

                segments.push({
                    start: ts.at,
                    end: ts.end,
                    text: label
                });
            });

            playerObject.segments = segments;
            
            notify('Загружено ' + segments.length + ' меток');
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
