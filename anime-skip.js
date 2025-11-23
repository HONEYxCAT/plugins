(function () {
    'use strict';

    // --- Настройки API ---
    const API_URL = 'https://api.anime-skip.com/graphql';
    const CLIENT_ID = 'ZGfO0sMF3eCwLYf8yMSCJjlynwNGRXWE';

    // Типы, которые будем пропускать
    // Можно добавить 'Title Card', если нужно
    const SKIP_TYPES = ['Intro', 'New Intro', 'Outro', 'Credits', 'New Credits', 'Recap', 'Mixed Credits'];
    
    const cache = {}; // Кэш ID сериалов, чтобы не искать каждый раз

    // --- Утилиты ---
    
    function cleanTitle(title) {
        if (!title) return '';
        return title
            .replace(/\(\d{4}\)/g, '')    // (2023)
            .replace(/\(TV\)/gi, '')      // (TV)
            .replace(/Season \d+/gi, '')  // Season 1
            .replace(/[:\-]/g, ' ')       // Двоеточия и тире
            .replace(/\s+/g, ' ')         // Лишние пробелы
            .trim();
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

    // --- Основная логика ---

    async function getAnimeId(title) {
        if (cache[title]) return cache[title];

        const clean = cleanTitle(title);
        console.log('[AnimeSkip] Ищем ID для:', clean);
        
        const query = ` { searchShows(search: "${clean}", limit: 1) { id name } } `;
        
        try {
            const data = await apiRequest(query);
            if (data.data && data.data.searchShows && data.data.searchShows.length > 0) {
                const id = data.data.searchShows[0].id;
                const name = data.data.searchShows[0].name;
                console.log('[AnimeSkip] Найдено:', name, 'ID:', id);
                cache[title] = id;
                return id;
            }
        } catch (e) {
            console.error('[AnimeSkip] Ошибка поиска ID:', e);
        }
        return null;
    }

    async function getSegments(showId, episodeNum) {
        console.log('[AnimeSkip] Загружаем эпизоды для ID:', showId);

        // Запрашиваем все эпизоды с таймкодами
        const query1 = ` { findEpisodesByShowId(showId: "${showId}") { number timestamps { at type { name } } } } `;
        
        try {
            let data = await apiRequest(query1);

            // Fallback (если первый метод не сработал, как мы выяснили в тестах)
            if (data.errors) {
                console.warn('[AnimeSkip] Метод 1 не сработал, пробую fallback...');
                const query2 = ` { searchEpisodes(search: "", showId: "${showId}", limit: 1000) { number timestamps { at type { name } } } } `;
                data = await apiRequest(query2);
                
                if (data.errors) throw new Error(data.errors[0].message);
                data.data.findEpisodesByShowId = data.data.searchEpisodes;
            }

            const episodes = data.data.findEpisodesByShowId || [];
            
            // Ищем нужный эпизод
            const currentEp = episodes.find(ep => ep.number == episodeNum);
            
            if (!currentEp || !currentEp.timestamps) return [];

            // Сортируем точки по времени
            currentEp.timestamps.sort((a, b) => a.at - b.at);

            const segments = [];

            // Превращаем точки в интервалы
            for (let i = 0; i < currentEp.timestamps.length - 1; i++) {
                const curr = currentEp.timestamps[i];
                const next = currentEp.timestamps[i+1];
                const typeName = curr.type ? curr.type.name : '';

                // Если тип есть в списке пропускаемых
                if (SKIP_TYPES.includes(typeName)) {
                    segments.push({
                        start: curr.at,
                        end: next.at,
                        name: "Пропустить " + typeName // Например: "Пропустить Intro"
                    });
                }
            }

            console.log('[AnimeSkip] Сформированы сегменты:', segments);
            return segments;

        } catch (e) {
            console.error('[AnimeSkip] Ошибка получения эпизодов:', e);
        }
        return [];
    }

    // --- Интеграция в Lampa ---

    function injectSegments(videoObject, segments) {
        if (!videoObject || !segments || !segments.length) return;

        if (!videoObject.segments) videoObject.segments = {};
        if (!videoObject.segments.skip) videoObject.segments.skip = [];

        // Добавляем, избегая дублей
        segments.forEach(seg => {
            const exists = videoObject.segments.skip.some(s => s.start === seg.start);
            if (!exists) videoObject.segments.skip.push(seg);
        });
        
        // Добавляем маркеры на таймлайн (для красоты)
        if (!videoObject.markers) videoObject.markers = [];
        segments.forEach(seg => {
             videoObject.markers.push({
                 time: seg.start,
                 title: seg.name
             });
        });
    }

    async function processMedia(data) {
        // Работаем только с аниме или сериалами
        // Проверяем, есть ли original_title (часто он нужен для поиска)
        const title = data.original_title || data.title || data.name;
        
        // Номер серии (Lampa обычно хранит его в data.episode или data.s_number / data.e_number)
        // Для надежности пробуем достать отовсюду
        let epNum = data.episode || (data.translate_args ? data.translate_args.episode : 0) || 1;
        
        // Если это не сериал, возможно это фильм (episode 1)
        // Но Anime Skip в основном про сериалы.
        
        if (!title) return;

        // 1. Получаем ID
        const showId = await getAnimeId(title);
        if (!showId) return;

        // 2. Получаем сегменты
        const segments = await getSegments(showId, epNum);
        
        if (segments.length > 0) {
            injectSegments(data, segments);
            Lampa.Noty.show(`Anime Skip: Найдены таймкоды (${segments.length})`);
        }
    }

    function startPlugin() {
        if (window.lampa_anime_skip) return;
        window.lampa_anime_skip = true;

        console.log('AnimeSkip: Плагин запущен');

        // Перехват запуска плеера
        const originalPlay = Lampa.Player.play;
        
        Lampa.Player.play = function (data) {
            const result = originalPlay.apply(this, arguments);
            
            // Запускаем поиск асинхронно, чтобы не тормозить старт видео
            // Когда данные найдутся, они добавятся в объект 'data', который уже в плеере
            // Lampa реактивная, она должна подхватить изменения (или при смене серии)
            processMedia(data);
            
            // Если есть плейлист, можно попробовать предзагрузить для всех (но это может заспамить API)
            // Поэтому пока только для текущей
            
            return result;
        };
        
        // Также следим за переключением серий в плейлисте
        Lampa.Player.listener.follow('start', (e) => {
             // e.data содержит текущий файл
             if(e.data) processMedia(e.data);
        });
    }

    if (window.Lampa && window.Lampa.Player) {
        startPlugin();
    } else {
        window.document.addEventListener('app_ready', startPlugin);
    }

})();
