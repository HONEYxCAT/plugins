(function () {
    'use strict';

    var CLIENT_ID = 'ZGfO0sMF3eCwLYf8yMSCJjlynwNGRXWE';
    var GQL_SEARCH = `query Search($search: String!) { searchShows(search: $search, limit: 5) { id name episodes { number timestamps { at type { name } } } } }`;
    var ORIGINAL_PLAY = null;

    function log(msg, data) {
        console.log('[AnimeSkip] ' + msg, data || '');
    }

    function notify(msg) {
        if(Lampa.Noty) Lampa.Noty.show('[AnimeSkip] ' + msg);
    }

    var AnimeSkip = {
        init: function() {
            // Ждем 5 секунд, чтобы дать другим плагинам загрузиться
            setTimeout(function() {
                AnimeSkip.applyHook();
                log('v24 Hook Applied (Late).');
                notify('Плагин v24: Активен');
            }, 5000);
        },

        applyHook: function() {
            if (ORIGINAL_PLAY) return; // Уже применили

            ORIGINAL_PLAY = Lampa.Player.play;

            Lampa.Player.play = function(object) {
                // Если это "наш" вызов (флаг), просто передаем в оригинал
                if (object && object.animeSkipHandled) {
                    return ORIGINAL_PLAY.apply(this, arguments);
                }

                // 1. Проверка на Аниме
                var card = object.movie || object.card || Lampa.Activity.active().card;
                var isAnime = false;
                
                if (card) {
                    if (card.genres && card.genres.find(function(g){ return g.id === 16; })) isAnime = true;
                    if (card.source === 'shikimori') isAnime = true;
                    if (card.original_language === 'ja') isAnime = true;
                }

                if (isAnime && !object.segments) {
                    log('Anime detected. Pausing start...');
                    notify('Поиск пропусков...');
                    
                    var title = card.original_name || card.original_title || card.title;
                    var episode = parseInt(object.episode || (object.from_item ? object.from_item.episode : 0) || 1);

                    // Асинхронный поиск
                    AnimeSkip.search(title, episode, function(segments) {
                        if (segments && segments.length > 0) {
                            segments.forEach(function(s){ s.source = 'AnimeSkip'; });
                            object.segments = segments;
                            log('Segments injected!', segments);
                            notify('Найдено: ' + segments.length);
                        } else {
                            log('No segments found.');
                        }
                        
                        // Помечаем объект и запускаем оригинал
                        object.animeSkipHandled = true;
                        ORIGINAL_PLAY.apply(Lampa.Player, [object]);
                    });

                    // ПРЕРЫВАЕМ ТЕКУЩИЙ ЗАПУСК
                    return;
                }

                // Если не аниме или уже есть сегменты
                return ORIGINAL_PLAY.apply(this, arguments);
            };
        },

        search: function(title, episode, callback) {
            // 1. Kitsu Resolve
            var kitsuUrl = 'https://kitsu.io/api/edge/anime?filter[text]=' + encodeURIComponent(title);
            var network = new Lampa.Reguest();
            
            network.silent(kitsuUrl, function(res) {
                var searchTitle = title;
                if (res && res.data && res.data.length > 0) {
                    var attr = res.data[0].attributes;
                    if (attr.titles && attr.titles.en) searchTitle = attr.titles.en;
                    else if (attr.canonicalTitle) searchTitle = attr.canonicalTitle;
                    searchTitle = searchTitle.replace(/[^a-zA-Z0-9 ]/g, " ");
                }
                
                log('Search Title: ' + searchTitle);
                AnimeSkip.gql(searchTitle, function(data) {
                    callback(AnimeSkip.parse(data, episode));
                });
            }, function() {
                AnimeSkip.gql(title, function(data) {
                    callback(AnimeSkip.parse(data, episode));
                });
            });
        },

        gql: function(search, callback) {
             var url = 'https://api.anime-skip.com/graphql';
             var body = JSON.stringify({ query: GQL_SEARCH, variables: { search: search } });

             if(typeof $ !== 'undefined' && $.ajax) {
                $.ajax({
                    url: url, type: 'POST', data: body,
                    contentType: 'application/json',
                    headers: { 'X-Client-ID': CLIENT_ID },
                    success: function(res) { callback(res); },
                    error: function() { callback(null); }
                });
             } else callback(null);
        },

        parse: function(response, targetEp) {
            if (!response || !response.data || !response.data.searchShows) return [];
            var shows = response.data.searchShows;
            
            for(var i=0; i<shows.length; i++) {
                var show = shows[i];
                if (show.episodes) {
                    var ep = show.episodes.find(function(e){ return e.number == targetEp; });
                    if (ep && ep.timestamps) {
                        var segs = [];
                        ep.timestamps.forEach(function(ts) {
                            var type = (ts.type && ts.type.name) ? ts.type.name.toLowerCase() : 'skip';
                            var label = 'Пропустить ' + type;
                            if (type.indexOf('intro') > -1) label = 'Пропустить заставку';
                            else if (type.indexOf('outro') > -1) label = 'Пропустить титры';

                            segs.push({
                                start: ts.at,
                                end: ts.at + 85, // Fallback duration
                                text: label
                            });
                        });
                        return segs;
                    }
                }
            }
            return [];
        }
    };

    if (window.appready) AnimeSkip.init();
    else Lampa.Listener.follow('app', function(e){ if(e.type=='ready') AnimeSkip.init(); });
})();
