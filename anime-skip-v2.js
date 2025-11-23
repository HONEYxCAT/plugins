(function () {
    'use strict';

    const API_URL = 'https://api.anime-skip.com/graphql';
    const CLIENT_ID = 'ZGfO0sMF3eCwLYf8yMSCJjlynwNGRXWE';
    const SKIP_TYPES = ['Intro', 'New Intro', 'Outro', 'Credits', 'New Credits', 'Recap', 'Mixed Credits'];
    const cache = {};

    function cleanTitle(title) {
        if (!title) return '';
        return title
            .replace(/\(\d{4}\)/g, '')
            .replace(/\(TV\)/gi, '')
            .replace(/Season \d+/gi, '')
            .replace(/[:\-]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    // Проверка, содержит ли строка кириллицу (русские буквы)
    function hasCyrillic(text) {
        return /[а-яА-ЯёЁ]/.test(text);
    }

    async function apiRequest(query) {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'X-Client-ID': CLIENT_ID 
            },
            body: JSON.stringify({ query })
        });
        return await res.json();
    }

    async function getAnimeId(title) {
        if (cache[title]) return cache[title];

        const clean = cleanTitle(title);
        console.log('[AnimeSkip] Ищем ID для:', clean);
        
        const query = ` { searchShows(search: "${clean}", limit: 1) { id name } } `;
        
        try {
            const data = await apiRequest(query);
            if (data.data && data.data.searchShows && data.data.searchShows.length > 0) {
                const id = data.data.searchShows[0].id;
                console.log('[AnimeSkip] Найдено:', data.data.searchShows[0].name, 'ID:', id);
                cache[title] = id;
                return id;
            }
        } catch (e) {
            console.error('[AnimeSkip] Ошибка поиска ID:', e);
        }
        return null;
    }

    async function getSegments(showId, episodeNum) {
        const query1 = ` { findEpisodesByShowId(showId: "${showId}") { number timestamps { at type { name } } } } `;
        
        try {
            let data = await apiRequest(query1);

            if (data.errors) {
                const query2 = ` { searchEpisodes(search: "", showId: "${showId}", limit: 1000) { number timestamps { at type { name } } } } `;
                data = await apiRequest(query2);
                if (data.errors) return [];
                data.data.findEpisodesByShowId = data.data.searchEpisodes;
            }

            const episodes = data.data.findEpisodesByShowId || [];
            const currentEp = episodes.find(ep => ep.number == episodeNum);
            
            if (!currentEp || !currentEp.timestamps) return [];

            currentEp.timestamps.sort((a, b) => a.at - b.at);

            const segments = [];
            for (let i = 0; i < currentEp.timestamps.length - 1; i++) {
                const curr = currentEp.timestamps[i];
                const next = currentEp.timestamps[i+1];
                const typeName = curr.type ? curr.type.name : '';

                if (SKIP_TYPES.includes(typeName)) {
                    segments.push({
                        start: curr.at,
                        end: next.at,
                        name: "Пропустить " + typeName
                    });
                }
            }
            return segments;

        } catch (e) {
            console.error('[AnimeSkip] Ошибка получения эпизодов:', e);
        }
        return [];
    }

    function injectSegments(videoObject, segments) {
        if (!videoObject || !segments.length) return;
        if (!videoObject.segments) videoObject.segments = {};
        if (!videoObject.segments.skip) videoObject.segments.skip = [];

        segments.forEach(seg => {
            const exists = videoObject.segments.skip.some(s => s.start === seg.start);
            if (!exists) videoObject.segments.skip.push(seg);
        });
    }

    // Функция для получения нормального английского названия
    async function getOriginalTitle(data) {
        // 1. Проверяем поля в самом видео
        let title = data.original_title || data.original_name;
        
        // 2. Если пусто или по-русски, лезем в привязанную карточку (card)
        if (!title || hasCyrillic(title)) {
            if (data.movie) title = data.movie.original_title || data.movie.original_name;
            if (data.card) title = data.card.original_title || data.card.original_name;
        }

        // 3. Если все еще русское, но есть ID TMDB, делаем запрос к TMDB
        if ((!title || hasCyrillic(title)) && (data.id || (data.movie && data.movie.id))) {
            const id = data.id || data.movie.id;
            const type = (data.name || (data.movie && data.movie.name)) ? 'tv' : 'movie'; // Пытаемся угадать тип (сериал/фильм)
            
            console.log('[AnimeSkip] Название на русском, запрашиваю оригинал у TMDB для ID:', id);
            
            return new Promise((resolve) => {
                // Используем встроенный API Лампы для запроса
                Lampa.TMDB.get(`${type}/${id}`, { language: 'en-US' }, (json) => {
                    const orig = json.original_name || json.original_title || json.name || json.title;
                    console.log('[AnimeSkip] TMDB вернул:', orig);
                    resolve(orig);
                }, () => {
                    resolve(title); // Если ошибка, возвращаем то что было
                });
            });
        }

        return title;
    }

    async function processMedia(data) {
        // Получаем правильное название
        const title = await getOriginalTitle(data);
        
        let epNum = data.episode || (data.translate_args ? data.translate_args.episode : 0) || 1;
        
        if (!title || hasCyrillic(title)) {
            console.log('[AnimeSkip] Не удалось найти английское название. Поиск отменен:', title);
            return;
        }

        const showId = await getAnimeId(title);
        if (!showId) return;

        const segments = await getSegments(showId, epNum);
        
        if (segments.length > 0) {
            injectSegments(data, segments);
            Lampa.Noty.show(`Anime Skip: Таймкоды загружены (${segments.length})`);
        }
    }

    function startPlugin() {
        if (window.lampa_anime_skip) return;
        window.lampa_anime_skip = true;

        console.log('AnimeSkip: Плагин запущен (v2 Smart Search)');

        const originalPlay = Lampa.Player.play;
        
        Lampa.Player.play = function (data) {
            const result = originalPlay.apply(this, arguments);
            processMedia(data);
            return result;
        };
        
        Lampa.Player.listener.follow('start', (e) => {
             if(e.data) processMedia(e.data);
        });
    }

    if (window.Lampa && window.Lampa.Player) {
        startPlugin();
    } else {
        window.document.addEventListener('app_ready', startPlugin);
    }

})();
