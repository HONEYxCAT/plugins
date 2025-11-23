(function () {
    'use strict';

    // === НАСТРОЙКИ ===
    var CLIENT_ID = 'lampa-plugin-' + Math.floor(Math.random() * 1000000);
    
    // Кэш для хранения ID аниме (чтобы не искать каждый раз при переключении серии)
    var animeCache = {}; 

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
            this.rewritePlayer();
            log('Loaded v3. Client: ' + CLIENT_ID);
            notify('Плагин загружен (v3)');
        },

        // Обычный GET запрос
        request: function (url, callback, errorCallback) {
            var network = new Lampa.Reguest();
            network.silent(url, callback, errorCallback);
        },

        // GraphQL запрос к Anime-Skip
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
                    // Если сегментов еще нет
                    if (!object.segments) {
                        var card = _this.findCardInfo(object);
                        
                        // Проверка: Аниме ли это?
                        var isAnime = false;
                        if (card) {
                            if (card.genres && card.genres.find(function(g){ return g.id === 16; })) isAnime = true;
                            if (card.source === 'shikimori') isAnime = true;
                            // Дополнительная проверка по оригинальному названию (иероглифы)
                            if (card.original_language === 'ja') isAnime = true;
                        }

                        if (isAnime) {
                            var season = parseInt(object.season || (object.from_item ? object.from_item.season : 0) || 0);
                            var episode = parseInt(object.episode || (object.from_item ? object.from_item.episode : 0) || 0);
                            var title = card.original_name || card.original_title || card.title;
                            var uniqueKey = title + '_' + (card.year || 0); // Ключ для кэша

                            // Для фильмов часто season=0 episode=0. Считаем их как S1E1
                            if (season === 0) season = 1;
                            if (episode === 0) episode = 1;

                            if (season > 0 && episode > 0) {
                                log('Detected: ' + title + ' E' + episode);
                                
                                // Если ID уже в кэше - используем сразу
                                if (animeCache[uniqueKey]) {
                                    log('Using Cached ID: ' + animeCache[uniqueKey].id + ' (' + animeCache[uniqueKey].service + ')');
                                    _this.fetchTimestamps(animeCache[uniqueKey].service, animeCache[uniqueKey].id, episode, object);
                                } else {
                                    // Иначе ищем с нуля
                                    setTimeout(function() {
                                        _this.findAnimeId(title, uniqueKey, season, episode, object);
                                    }, 100); // Минимальная задержка
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

        // Этап 1: Поиск ID (Kitsu -> Mappings -> MAL)
        findAnimeId: function(title, uniqueKey, season, episode, playerObject) {
            var _this = this;
            notify('Поиск пропусков...');
            
            var searchTitle = encodeURIComponent(title);
            // Запрашиваем сразу с маппингами (связями)
            var kitsuUrl = 'https://kitsu.io/api/edge/anime?filter[text]=' + searchTitle + '&include=mappings';

            this.request(kitsuUrl, function(response) {
                if (response && response.data && response.data.length > 0) {
                    var animeData = response.data[0];
                    var kitsuId = animeData.id;
                    
                    // Пытаемся найти MAL ID в маппингах (это надежнее)
                    var malId = null;
                    if (response.included) {
                        var malMapping = response.included.find(function(item) {
                            return item.type === 'mappings' && item.attributes.externalSite === 'myanimelist/anime';
                        });
                        if (malMapping) malId = malMapping.attributes.externalId;
                    }

                    var service = 'kitsu';
                    var targetId = kitsuId;

                    if (malId) {
                        service = 'mal';
                        targetId = malId;
                        log('Found MAL ID: ' + malId + ' via Kitsu');
                    } else {
                        log('Found Kitsu ID: ' + kitsuId + ' (No MAL link)');
                    }

                    // Сохраняем в кэш
                    animeCache[uniqueKey] = { service: service, id: targetId };

                    _this.fetchTimestamps(service, targetId, episode, playerObject);
                    
                } else {
                    log('Kitsu not found');
                    notify('Аниме не найдено в базе');
                }
            }, function() {
                log('Kitsu API Error');
            });
        },

        // Этап 2: Запрос таймкодов
        fetchTimestamps: function(service, id, episode, playerObject) {
            var _this = this;
            var variables = {
                service: service,
                id: "" + id,
                episode: episode
            };

            this.gqlRequest(variables, function(response) {
                if (response.data && response.data.findEpisode && response.data.findEpisode.timestamps) {
                    var times = response.data.findEpisode.timestamps;
                    if (times.length > 0) {
                        _this.inject(times, playerObject);
                    } else {
                        log('No timestamps found for this episode.');
                        // Если не нашли по MAL, пробуем по Kitsu как запасной вариант (если искали по MAL)
                        if (service === 'mal') {
                            log('Retrying with Kitsu ID fallback...');
                            // Тут сложнее, надо доставать Kitsu ID снова, но для простоты просто логируем
                        }
                    }
                } else {
                    log('Episode not found in Anime-Skip DB.');
                }
            });
        },

        // Этап 3: Внедрение и обновление UI
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

            // 1. Внедряем в объект
            playerObject.segments = segments;
            
            notify('Найдено меток: ' + segments.length);
            log('INJECTED:', segments);
            
            // 2. ПРИНУДИТЕЛЬНОЕ ОБНОВЛЕНИЕ ПЛЕЕРА
            // Это заставит плеер увидеть новые сегменты "прямо сейчас"
            
            if (Lampa.Player.panel) {
                // Обновляем панель таймлайна
                Lampa.Player.panel.update();
            }
            
            // Хак: Триггерим событие timeupdate, чтобы логика показа кнопки сработала мгновенно
            if(Lampa.Player.video) {
                // Если мы уже находимся в зоне пропуска (например, заставка с 0:00),
                // кнопка должна появиться сразу.
                try {
                    var event = new Event('timeupdate');
                    Lampa.Player.video.dispatchEvent(event);
                } catch(e) {}
            }
        }
    };

    // Агрессивный старт
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
