(function () {
    'use strict';

    var CLIENT_ID = 'ZGfO0sMF3eCwLYf8yMSCJjlynwNGRXWE';

    // Запрос без duration/end, так как их нет в схеме
    var GQL_SEARCH = `
    query Search($search: String!) {
      searchShows(search: $search, limit: 10) {
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
            log('Loaded v11 (Cascade Search).');
            notify('Плагин загружен (v11)');
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
                                log('Start: "' + title + '" E' + episode);
                                setTimeout(function() {
                                    _this.resolveTitlesAndSearch(title, episode, object);
                                }, 200);
                            }
                        }
                    }
                } catch(e) { console.error(e); }
                return result;
            };
        },

        resolveTitlesAndSearch: function(originalTitle, episode, playerObject) {
            var _this = this;
            var titlesToTry = [originalTitle];

            // 1. Запрос к Kitsu для получения вариантов названий
            var kitsuUrl = 'https://kitsu.io/api/edge/anime?filter[text]=' + encodeURIComponent(originalTitle);
            
            this.request(kitsuUrl, function(res) {
                if (res && res.data && res.data.length > 0) {
                    var anime = res.data[0];
                    var attrs = anime.attributes;
                    
                    // Добавляем английское название (если есть)
                    if (attrs.titles && attrs.titles.en) titlesToTry.unshift(attrs.titles.en);
                    // Добавляем каноничное название
                    if (attrs.canonicalTitle) titlesToTry.push(attrs.canonicalTitle);
                    // Добавляем упрощенное (без спецсимволов)
                    if (attrs.titles && attrs.titles.en) {
                        var clean = attrs.titles.en.replace(/[^a-zA-Z0-9 ]/g, " ");
                        titlesToTry.push(clean);
                        // Добавляем первое слово (для грубого поиска)
                        var firstWord = clean.split(' ')[0];
                        if(firstWord.length > 3) titlesToTry.push(firstWord);
                    }
                }
                
                // Удаляем дубликаты
                titlesToTry = titlesToTry.filter(function(item, pos) {
                    return titlesToTry.indexOf(item) == pos && item;
                });

                log('Search Queries List:', titlesToTry);
                _this.recursiveSearch(titlesToTry, 0, episode, playerObject);

            }, function() {
                // Если Kitsu упал, ищем просто по оригиналу
                _this.recursiveSearch([originalTitle], 0, episode, playerObject);
            });
        },

        recursiveSearch: function(titlesList, index, targetEpisode, playerObject) {
            var _this = this;
            if (index >= titlesList.length) {
                log('All search queries failed.');
                return;
            }

            var currentQuery = titlesList[index];
            notify('Поиск: ' + currentQuery);
            log('Trying query [' + (index+1) + '/' + titlesList.length + ']: ' + currentQuery);

            this.gqlRequest(GQL_SEARCH, { search: currentQuery }, function(response) {
                var found = false;

                if (response.data && response.data.searchShows) {
                    var shows = response.data.searchShows;
                    
                    // Проходимся по всем найденным шоу
                    for (var i = 0; i < shows.length; i++) {
                        var show = shows[i];
                        if (show.episodes) {
                            // Ищем эпизод
                            var foundEp = show.episodes.find(function(ep) { return ep.number == targetEpisode; });
                            
                            if (foundEp && foundEp.timestamps && foundEp.timestamps.length > 0) {
                                log('MATCH FOUND in show: ' + show.name);
                                _this.inject(foundEp.timestamps, playerObject);
                                found = true;
                                break; // Нашли - выходим
                            }
                        }
                    }
                }

                if (found) {
                    // Успех
                } else {
                    // Не нашли, пробуем следующий вариант названия
                    _this.recursiveSearch(titlesList, index + 1, targetEpisode, playerObject);
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
                else if (typeName.indexOf('preview') > -1) label = 'Пропустить превью';

                // Фиксированная длительность 85 сек, так как API не отдает end/duration
                var startTime = ts.at;
                var endTime = ts.at + 85; 

                segments.push({
                    start: startTime,
                    end: endTime,
                    text: label
                });
            });

            playerObject.segments = segments;
            notify('Метки добавлены (' + segments.length + ')');
            log('INJECTED SUCCESS', segments);
            
            if (Lampa.Player.panel) Lampa.Player.panel.update();
            if(Lampa.Player.video) {
                try { var event = new Event('timeupdate'); Lampa.Player.video.dispatchEvent(event); } catch(e) {}
            }
        }
    };

    function start() {
        if (window.anime_skip_v11) return;
        window.anime_skip_v11 = true;
        AnimeSkip.init();
    }

    if (typeof Lampa !== 'undefined' && Lampa.Player) start();
    else {
        var check = setInterval(function() {
            if (typeof Lampa !== 'undefined' && Lampa.Player) { clearInterval(check); start(); }
        }, 200);
    }
})();
