(function () {
    'use strict';

    const PLUGIN_NAME = 'AnimeAbsoluteFix';
    const LOG_PREFIX = `[${PLUGIN_NAME}]`;
    const COLOR_LOG = 'color: #bada55';
    const COLOR_WARN = 'color: #ffcc00';
    const COLOR_INFO = 'color: #00ccff';

    // Функция безопасного логирования
    const log = (msg, ...params) => console.log(`%c${LOG_PREFIX} ${msg}`, COLOR_LOG, ...params);
    const info = (msg, ...params) => console.log(`%c${LOG_PREFIX} [INFO] ${msg}`, COLOR_INFO, ...params);
    const debug = (msg, ...params) => console.debug(`%c${LOG_PREFIX} [DEBUG] ${msg}`, 'color: #888', ...params);
    
    // Главная функция инициализации
    function init() {
        // Проверка: Загрузилась ли Лампа?
        if (!window.Lampa || !window.Lampa.EpisodeParser) {
            console.log(`${LOG_PREFIX} Lampa еще не готова, ждем 500мс...`);
            setTimeout(init, 500);
            return;
        }

        if (window.lampa_absolute_fix_inited) {
            log('Плагин уже инициализирован.');
            return;
        }
        window.lampa_absolute_fix_inited = true;

        log('>>> ПЛАГИН ЗАПУЩЕН <<<');

        // Сохраняем оригинальный метод, чтобы вызывать его внутри
        const originalParse = Lampa.EpisodeParser.parse;

        // Переопределяем метод парсинга
        Lampa.EpisodeParser.parse = function (data) {
            // 1. Сначала даем отработать стандартному парсеру
            let result = originalParse(data);

            // Получаем текущую открытую карточку
            const activity = Lampa.Activity.active();
            const card = activity.card || (activity.object ? activity.object.movie : null) || (activity.component === 'full' ? activity.movie : null);
            
            // Имя файла для анализа
            const filename = data.path ? data.path.split('/').pop() : (data.filename || '');

            // Если мы не в карточке или нет данных о сезонах - выходим
            if (!card || !card.seasons) {
                return result;
            }

            // === НАЧАЛО ДЕБАГА ===
            console.groupCollapsed(`${LOG_PREFIX} Обработка: ${filename}`);
            info('Оригинальный результат Lampa:', JSON.stringify(result));
            
            // Пытаемся найти число в названии файла (Абсолютный номер)
            // Ищем число, которое стоит отдельно или в скобках, исключая года (19xx-20xx) и качество (720/1080)
            let absoluteEpisode = null;
            
            // Регулярка ищет число от 1 до 4 знаков
            const match = filename.match(/(?:^|\s|[\[\(-_])(\d{1,4})(?:$|\s|[\]\)-_)(\.])/);
            
            if (match) {
                const num = parseInt(match[1], 10);
                // Фильтрация мусора (год, качество)
                if (num > 1900 && num < 2100) {
                    debug(`Найдено число ${num}, но это похоже на год. Игнорируем.`);
                } else if ([264, 265, 720, 1080, 2160, 4000].includes(num)) {
                    debug(`Найдено число ${num}, но это качество/кодек. Игнорируем.`);
                } else {
                    absoluteEpisode = num;
                    info(`-> Кандидат на абсолютный номер: ${absoluteEpisode}`);
                }
            }

            // Если нашли абсолютный номер и он больше 1 (или если парсер вообще не нашел серию)
            if (absoluteEpisode !== null) {
                // Получаем структуру сезонов из TMDB
                // Lampa хранит сезоны часто как массив или объект. Приводим к массиву.
                let seasons = [];
                if (Array.isArray(card.seasons)) {
                    seasons = card.seasons;
                } else {
                    // Если это объект
                    seasons = Object.keys(card.seasons).map(k => card.seasons[k]);
                }

                // Сортируем сезоны по возрастанию и убираем "Спецматериалы" (сезон 0)
                seasons = seasons
                    .filter(s => s.season_number > 0)
                    .sort((a, b) => a.season_number - b.season_number);

                debug('Структура сезонов из TMDB:', seasons.map(s => `S${s.season_number}: ${s.episode_count} серий`));

                // === МАТЕМАТИКА ВЫЧИСЛЕНИЯ ===
                let tempEpisode = absoluteEpisode;
                let targetSeason = 1;
                let found = false;

                for (let i = 0; i < seasons.length; i++) {
                    const s = seasons[i];
                    const count = s.episode_count;

                    debug(`Проверка Сезона ${s.season_number}. В нем ${count} серий. Ищем серию ${tempEpisode}.`);

                    if (tempEpisode <= count) {
                        // Номер попадает в этот сезон
                        targetSeason = s.season_number;
                        found = true;
                        info(`-> Совпадение! Это Сезон ${targetSeason}, Серия ${tempEpisode}`);
                        break;
                    } else {
                        // Номер больше чем серий в сезоне, вычитаем и идем к следующему
                        tempEpisode -= count;
                        debug(`-> Серия не в этом сезоне. Остаток: ${tempEpisode}. Переход к следующему сезону.`);
                    }
                }

                // Если мы нашли, что это НЕ первый сезон (или если парсер ошибся и показал S1E13)
                if (found) {
                    // Проверяем, нужно ли исправлять.
                    // Исправляем, если вычисленный сезон больше того, что нашла Лампа (обычно она находит S1 по умолчанию)
                    // ИЛИ если Лампа нашла сезон, но номер серии там запредельный (S1 E13 при всего 12 сериях)
                    
                    const lampaSeason = result.season || 1;
                    const currentSeasonInfo = seasons.find(s => s.season_number === lampaSeason);
                    const maxEpisodesInCurrentSeason = currentSeasonInfo ? currentSeasonInfo.episode_count : 999;

                    // Условие фикса:
                    // 1. Вычисленный сезон отличается от найденного
                    // 2. ИЛИ найденная серия больше, чем есть в этом сезоне
                    if (targetSeason !== lampaSeason || result.episode > maxEpisodesInCurrentSeason) {
                        
                        console.log(`%c[FIX] ПРИМЕНЯЕМ ИСПРАВЛЕНИЕ!`, 'color: red; font-weight: bold; font-size: 12px');
                        console.log(`Было: S${result.season} E${result.episode}`);
                        console.log(`Стало: S${targetSeason} E${tempEpisode}`);

                        result.season = targetSeason;
                        result.episode = tempEpisode;
                        
                        // Исправляем hash_string для корректной работы отметок о просмотре
                        if (card.original_title || card.original_name) {
                            const orig = card.original_title || card.original_name;
                            // Формат хеша лампы: season:episodeoriginal_title (без пробелов иногда) или сложнее
                            // Обычно Lampa сама пересчитает хеш при использовании result, но для надежности:
                            // result.hash_string = `${targetSeason}${targetSeason > 9 ? ':' : ''}${tempEpisode}${orig}`;
                        }
                    } else {
                        debug('Исправление не требуется (данные совпадают с обычным парсером).');
                    }
                } else {
                    debug('Не удалось сопоставить номер серии ни с одним сезоном (возможно, серий вышло больше, чем указано в TMDB).');
                }
            }

            console.groupEnd();
            return result;
        };

        Lampa.Noty.show('AnimeFix: Плагин успешно загружен');
    }

    // Запуск
    init();

})();
