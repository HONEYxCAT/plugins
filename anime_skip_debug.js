(function () {
    'use strict';

    // Конфигурация API
    const API_URL = 'https://api.anime-skip.com/graphql';
    const CLIENT_ID = 'ZGfO0sMF3eCwLYf8yMSCJjlynwNGRXWE';

    // Типы сегментов, которые мы хотим пропускать
    const SKIP_TYPES = ['Intro', 'New Intro', 'Op', 'Opening', 'Recap', 'Credits', 'New Credits', 'Ed', 'Ending', 'Preview'];

    // Логгер для удобства отладки
    const log = (msg, data = '') => {
        console.log(`%c[AnimeSkip] ${msg}`, 'color: #a3fd39; font-weight: bold;', data);
    };

    const error = (msg, data = '') => {
        console.error(`%c[AnimeSkip] ERROR: ${msg}`, 'color: #ff6b6b; font-weight: bold;', data);
        Lampa.Noty.show(`AnimeSkip: ${msg}`);
    };

    // --- Хелперы ---

    // Очистка названия для лучшего поиска (удаляет скобки, сезоны и т.д.)
    function cleanTitle(title) {
        if (!title) return '';
        return title
            .replace(/\(\d{4}\)/g, '') // Удалить год (2023)
            .replace(/\(TV\)/gi, '')
            .replace(/Season \d+/gi, '')
            .replace(/[:\-]/g, ' ')    // Заменить двоеточия и тире на пробелы
            .replace(/\s+/g, ' ')      // Убрать двойные пробелы
            .trim();
    }

    // Формирование запроса к API
    async function apiRequest(query) {
        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Client-ID': CLIENT_ID
                },
                body: JSON.stringify({ query })
            });
            const json = await res.json();
            if (json.errors) throw new Error(json.errors[0].message);
            return json.data;
        } catch (e) {
            throw e;
        }
    }

    // --- Логика поиска ---

    // 1. Поиск сериала по списку названий
    async function findShowId(card) {
        // Собираем все возможные варианты названий из карточки Lampa
        let titlesToTry = [];
        
        // Приоритет 1: Оригинальное название (обычно ромадзи)
        if (card.original_title) titlesToTry.push(card.original_title);
        if (card.original_name) titlesToTry.push(card.original_name);
        
        // Приоритет 2: Английское название (если есть в переводах)
        // Lampa часто хранит названия в card.title, card.name
        if (card.title) titlesToTry.push(card.title);
        if (card.name) titlesToTry.push(card.name);

        // Приоритет 3: Очищенные версии
        if (card.original_title) titlesToTry.push(cleanTitle(card.original_title));

        // Удаляем дубликаты и пустые строки
        titlesToTry = [...new Set(titlesToTry)].filter(t => t);

        log('Будем искать по названиям:', titlesToTry);

        for (const query of titlesToTry) {
            log(`Пробуем поиск: "${query}"...`);
            try {
                const q = `{ searchShows(search: "${query}", limit: 1) { id name } }`;
                const data = await apiRequest(q);
                
                if (data.searchShows && data.searchShows.length > 0) {
                    const show = data.searchShows[0];
                    log(`✅ Найдено совпадение! ID: ${show.id}, Name: ${show.name}`);
                    return show.id;
                } else {
                    log(`❌ По запросу "${query}" ничего не найдено.`);
                }
            } catch (e) {
                log(`Ошибка запроса при поиске "${query}":`, e);
            }
        }
        return null;
    }

    // 2. Получение эпизодов и таймстемпов
    async function getEpisodeData(showId, episodeNumber) {
        log(`Запрашиваем эпизоды для ShowID: ${showId}`);
        
        // Запрашиваем эпизоды. AnimeSkip иногда использует сквозную нумерацию (Absolute), иногда по сезонам.
        // Для начала пробуем найти конкретный номер.
        
        // NOTE: Lampa обычно отдает episodeNumber относительно сезона.
        // AnimeSkip часто использует абсолютную нумерацию. Это главная проблема интеграции.
        // В этом тесте мы просто ищем по номеру, который дала Lampa.
        
        const q = `{ 
            findEpisodesByShowId(showId: "${showId}") { 
                number 
                timestamps { 
                    at 
                    type { name } 
                } 
            } 
        }`;

        try {
            const data = await apiRequest(q);
            const episodes = data.findEpisodesByShowId || [];
            
            log(`Получено эпизодов от API: ${episodes.length}`);

            // Ищем нужный эпизод
            // Превращаем в int для сравнения "01" и 1
            const targetEp = episodes.find(e => parseInt(e.number) === parseInt(episodeNumber));

            if (!targetEp) {
                log(`❌ Эпизод номер ${episodeNumber} не найден в ответе API.`);
                // Для отладки выведем какие есть
                const available = episodes.map(e => e.number).join(', ');
                log(`Доступные номера эпизодов: ${available}`);
                return null;
            }

            log(`✅ Эпизод ${episodeNumber} найден. Маркеров: ${targetEp.timestamps.length}`);
            return targetEp.timestamps;
        } catch (e) {
            log('Ошибка получения эпизодов:', e);
            return null;
        }
    }

    // 3. Конвертация формата AnimeSkip -> Lampa
    function processTimestamps(timestamps) {
        if (!timestamps || !timestamps.length) return [];

        // Сортируем по времени
        timestamps.sort((a, b) => a.at - b.at);

        let segments = [];

        for (let i = 0; i < timestamps.length; i++) {
            const curr = timestamps[i];
            const next = timestamps[i + 1];
            const typeName = curr.type ? curr.type.name : 'Unknown';

            // Проверяем, входит ли тип в список пропускаемых
            // AnimeSkip дает ТОЧКУ начала. Конец сегмента - это начало следующего маркера (обычно 'Canon').
            if (SKIP_TYPES.some(t => typeName.includes(t))) {
                
                // Если есть следующий маркер, считаем интервал до него
                // Если это последний маркер, игнорируем (или можно поставить arbitrary end)
                if (next) {
                    const segment = {
                        start: curr.at,
                        end: next.at,
                        name: typeName
                    };
                    segments.push(segment);
                    log(`Добавлен сегмент: ${typeName} (${segment.start}с - ${segment.end}с)`);
                }
            }
        }
        return segments;
    }

    // --- Основная функция запуска ---
    async function runAnimeSkip(data) {
        // data - объект, который приходит в Lampa.Player.play
        // Обычно там есть data.movie (инфа о фильме) и data.episode (номер серии)
        
        const card = data.movie || data.card;
        // Номер эпизода. Если это фильм, ставим 1? Или не ищем вообще?
        // AnimeSkip в основном для сериалов.
        const episodeNum = data.episode || (data.movie.number_of_seasons ? 1 : null);

        if (!card) {
            log('Нет данных о карточке (movie/card). Пропуск.');
            return;
        }

        log('--- НАЧАЛО ПОИСКА ---');
        log('Данные от Lampa:', { 
            title: card.title, 
            original_title: card.original_title, 
            episode: episodeNum,
            id_tmdb: card.id 
        });

        if (!episodeNum) {
            log('Это не сериал или нет номера эпизода. Пропуск.');
            return;
        }

        Lampa.Noty.show('AnimeSkip: Поиск пропусков...');

        // 1. Ищем ID шоу
        const showId = await findShowId(card);
        if (!showId) {
            Lampa.Noty.show('AnimeSkip: Аниме не найдено');
            return;
        }

        // 2. Ищем таймстемпы эпизода
        const timestamps = await getEpisodeData(showId, episodeNum);
        if (!timestamps) {
            Lampa.Noty.show(`AnimeSkip: Нет данных для ${episodeNum} серии`);
            return;
        }

        // 3. Формируем сегменты
        const skipSegments = processTimestamps(timestamps);

        if (skipSegments.length > 0) {
            log('Внедряем сегменты в плеер Lampa:', skipSegments);
            
            // ВАЖНО: Lampa.Segments.set обновляет данные в плеере
            // Формат: { skip: [ {start, end, name}, ... ] }
            
            // Получаем текущие сегменты (вдруг там реклама)
            let currentSegments = Lampa.Segments.all() || {};
            
            // Добавляем наши
            currentSegments.skip = skipSegments;
            
            // Применяем
            Lampa.Segments.set(currentSegments);
            
            Lampa.Noty.show(`AnimeSkip: Найдено ${skipSegments.length} сегментов`);
        } else {
            log('Сегменты найдены, но они не подходят под фильтр (только Canon?).');
        }
    }

    // --- Хук в Lampa ---
    function startPlugin() {
        if (window.lampa_animeskip_debug_loaded) return;
        window.lampa_animeskip_debug_loaded = true;

        console.log('AnimeSkip: Debug Plugin Loaded v1.0');

        // Перехват события воспроизведения
        // Мы не блокируем воспроизведение, а запускаем поиск параллельно.
        // Когда найдем данные - обновим таймлайн "на лету".
        const originalPlay = Lampa.Player.play;
        
        Lampa.Player.play = function (data) {
            const result = originalPlay.apply(this, arguments);
            
            // Запускаем асинхронно поиск
            runAnimeSkip(data);
            
            return result;
        };
    }

    if (window.Lampa && window.Lampa.Player) {
        startPlugin();
    } else {
        window.document.addEventListener('app_ready', startPlugin);
    }

})();
