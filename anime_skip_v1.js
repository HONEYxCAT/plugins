(function () {
    'use strict';

    // === НАСТРОЙКИ ===
    var CLIENT_ID = 'lampa-plugin-client-' + Math.floor(Math.random() * 1000000); // Генерируем случайный ID клиента
    var PROXY_URL = 'https://api.allorigins.win/raw?url='; // Прокси для CORS
    
    // GraphQL запрос к Anime-Skip
    // Мы ищем по externalId (Kitsu)
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
        Lampa.Noty.show('[AnimeSkip] ' + msg);
    }

    var AnimeSkip = {
        init: function () {
            this.rewritePlayer();
            log('Initialized. Client ID: ' + CLIENT_ID);
            notify('Ready');
        },

        // Простая функция запроса (GET)
        request: function (url, callback, errorCallback) {
            var network = new Lampa.Reguest();
            network.silent(url, callback, errorCallback);
        },

        // GraphQL запрос (POST)
        gqlRequest: function (variables, callback) {
            var url = 'https://api.anime-skip.com/graphql';
            var body = JSON.stringify({
                query: GQL_QUERY,
                variables: variables
            });

            // Используем jQuery.ajax, так как Lampa.Reguest не всегда удобен для POST JSON с заголовками
            $.ajax({
                url: url,
                type: 'POST',
                data: body,
                contentType: 'application/json',
                headers: {
                    'X-Client-ID': CLIENT_ID
                },
                success: function(response) {
                    callback(response);
                },
                error: function(xhr, status, error) {
                    // Если ошибка CORS, пробуем через прокси (хотя для POST это сложно с allorigins)
                    // Anime-Skip обычно разрешает CORS, если передан Client-ID
                    log('GQL Error', error);
                }
            });
        },

        // Хук плеера
        rewritePlayer: function () {
            var _this = this;
            if (!Lampa.Player || !Lampa.Player.play) return;

            var originalPlay = Lampa.Player.play;

            Lampa.Player.play = function (object) {
                var result = originalPlay.apply(this, arguments);

                // Проверяем, что это не фильм (обычно у аниме есть сезон/серия)
                // Или если в жанрах есть "Animation" / "Anime" (в Lampa жанр id 16 - Animation)
                var card = object.movie || Lampa.Activity.active().card;
                var isAnime = false;

                if (card) {
                    // Проверка по жанрам TMDB (16 = Animation)
                    if (card.genres && card.genres.find(function(g){ return g.id === 16; })) isAnime = true;
                    // Проверка по источнику (Shikimori, etc)
                    if (card.source === 'shikimori') isAnime = true;
                }

                if (!object.segments && isAnime) {
                    var season = parseInt(object.season || (object.from_item ? object.from_item.season : 0) || 0);
                    var episode = parseInt(object.episode || (object.from_item ? object.from_item.episode : 0) || 0);
                    var title = card.original_name || card.original_title || card.title;

                    // Если это сериал
                    if (season > 0 && episode > 0) {
                        log('Detected Anime: ' + title + ' S' + season + ' E' + episode);
                        
                        // Ждем немного, чтобы убедиться, что плеер стартанул
                        setTimeout(function() {
                            _this.process(title, season, episode, object);
                        }, 1000);
                    }
                }
                return result;
            };
        },

        // Основной процесс
        process: function(title, season, episode, playerObject) {
            var _this = this;
            
            // 1. Ищем ID на Kitsu (самый простой способ найти аниме)
            notify('Ищу ' + title + ' на Kitsu...');
            
            var searchTitle = encodeURIComponent(title);
            var kitsuUrl = 'https://kitsu.io/api/edge/anime?filter[text]=' + searchTitle;

            this.request(kitsuUrl, function(response) {
                if (response && response.data && response.data.length > 0) {
                    // Берем первый результат
                    var animeData = response.data[0];
                    var kitsuId = animeData.id;
                    var foundTitle = animeData.attributes.canonicalTitle;
                    
                    log('Found Kitsu ID: ' + kitsuId + ' (' + foundTitle + ')');
                    
                    // Тут нюанс: Kitsu часто нумерует серии сквозняком (Absoute numbering).
                    // Но Anime-Skip часто умеет работать с сезонами, либо нам нужно надеяться на удачу.
                    // Попробуем передать номер эпизода как есть.
                    
                    // *Улучшение*: Anime-Skip API принимает `service: "kitsu"`
                    
                    _this.fetchTimestamps('kitsu', kitsuId, episode, playerObject);
                    
                } else {
                    log('Kitsu search returned nothing');
                }
            }, function() {
                log('Kitsu API failed');
            });
        },

        fetchTimestamps: function(service, id, episode, playerObject) {
            var _this = this;
            
            var variables = {
                service: service,
                id: "" + id, // Строка
                episode: episode // Число
            };

            log('Querying Anime-Skip...', variables);

            this.gqlRequest(variables, function(response) {
                if (response.data && response.data.findEpisode && response.data.findEpisode.timestamps) {
                    var times = response.data.findEpisode.timestamps;
                    
                    if (times.length > 0) {
                        _this.inject(times, playerObject);
                    } else {
                        log('Anime-Skip found the episode, but NO timestamps.');
                    }
                } else {
                    log('Anime-Skip returned no data for this episode.');
                }
            });
        },

        inject: function(timestamps, playerObject) {
            var segments = [];

            timestamps.forEach(function(ts) {
                // Конвертируем типы Anime-Skip в типы Lampa
                // Anime-Skip types: 'intro', 'outro', 'recap', 'mixed-intro', 'mixed-outro'
                // Lampa хочет текст для кнопки
                
                var label = 'Пропустить';
                if (ts.type === 'intro' || ts.type === 'mixed-intro') label = 'Пропустить заставку';
                else if (ts.type === 'outro' || ts.type === 'mixed-outro') label = 'Пропустить титры';
                else if (ts.type === 'recap') label = 'Пропустить пересказ';
                else label = 'Пропустить ' + ts.type;

                segments.push({
                    start: ts.at,
                    end: ts.end,
                    text: label
                    // Lampa сама обрабатывает field 'text'
                });
            });

            playerObject.segments = segments;
            
            notify('Найдено ' + segments.length + ' меток (Anime-Skip)');
            log('Injected:', segments);
            
            // Обновляем UI
            if (Lampa.Player.panel) Lampa.Player.panel.update();
        }
    };

    // Start
    if (window.appready) AnimeSkip.init();
    else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type == 'ready') AnimeSkip.init();
        });
    }
})();
