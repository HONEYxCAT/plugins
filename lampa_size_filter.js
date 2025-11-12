(function() {
    'use strict';

    var plugin_name = 'Фильтр по размеру';
    var manifest = {
        type: 'other',
        version: '1.0.0',
        name: plugin_name,
        description: 'Добавляет фильтрацию торрентов по размеру файла',
        component: 'torrent_size_filter'
    };

    // Инициализация плагина
    Lampa.Manifest.plugins = manifest;

    // Переменные для хранения состояния фильтра
    var sizeFilter = {
        enabled: false,
        minSize: 0,        // в GB
        maxSize: 100       // в GB
    };

    // Функция для конвертации размера в GB
    function convertToGB(sizeStr) {
        if (!sizeStr) return 0;
        
        var size = parseFloat(sizeStr);
        var unit = sizeStr.toUpperCase();
        
        if (unit.indexOf('TB') >= 0 || unit.indexOf('ТБ') >= 0) {
            return size * 1024;
        } else if (unit.indexOf('GB') >= 0 || unit.indexOf('ГБ') >= 0) {
            return size;
        } else if (unit.indexOf('MB') >= 0 || unit.indexOf('МБ') >= 0) {
            return size / 1024;
        } else if (unit.indexOf('KB') >= 0 || unit.indexOf('КБ') >= 0) {
            return size / (1024 * 1024);
        }
        
        return size;
    }

    // Функция для фильтрации торрентов
    function filterTorrentsBySize(torrents) {
        if (!sizeFilter.enabled) return torrents;
        
        return torrents.filter(function(torrent) {
            var sizeInGB = convertToGB(torrent.size || '0 GB');
            return sizeInGB >= sizeFilter.minSize && sizeInGB <= sizeFilter.maxSize;
        });
    }

    // Добавляем пункт в меню фильтров
    Lampa.Listener.follow('full', function(e) {
        if (e.type == 'complite') {
            var filter_items = Lampa.Select.get('filter');
            
            if (filter_items) {
                // Добавляем опцию включения/выключения фильтра по размеру
                var enabledItem = {
                    title: 'Фильтр по размеру',
                    subtitle: sizeFilter.enabled ? 'Включен' : 'Выключен',
                    value: sizeFilter.enabled,
                    selected: sizeFilter.enabled
                };
                
                // Добавляем опцию минимального размера
                var minSizeItem = {
                    title: 'Минимальный размер (GB)',
                    subtitle: sizeFilter.minSize + ' GB',
                    value: sizeFilter.minSize
                };
                
                // Добавляем опцию максимального размера
                var maxSizeItem = {
                    title: 'Максимальный размер (GB)',
                    subtitle: sizeFilter.maxSize + ' GB',
                    value: sizeFilter.maxSize
                };
            }
        }
    });

    // Создаем UI для фильтра
    function createFilterUI() {
        var filter_item = Lampa.Template.get('filter_item', {
            title: 'Размер файла'
        });
        
        var sizes = [
            { title: 'Любой', value: null },
            { title: 'Менее 1 GB', min: 0, max: 1 },
            { title: '1-5 GB', min: 1, max: 5 },
            { title: '5-10 GB', min: 5, max: 10 },
            { title: '10-20 GB', min: 10, max: 20 },
            { title: '20-50 GB', min: 20, max: 50 },
            { title: 'Более 50 GB', min: 50, max: 1000 }
        ];
        
        filter_item.on('hover:enter', function() {
            var select = [];
            
            sizes.forEach(function(size) {
                select.push({
                    title: size.title,
                    selected: sizeFilter.enabled && 
                             sizeFilter.minSize === size.min && 
                             sizeFilter.maxSize === size.max,
                    value: size
                });
            });
            
            Lampa.Select.show({
                title: 'Размер файла',
                items: select,
                onSelect: function(item) {
                    if (item.value.value === null) {
                        sizeFilter.enabled = false;
                    } else {
                        sizeFilter.enabled = true;
                        sizeFilter.minSize = item.value.min;
                        sizeFilter.maxSize = item.value.max;
                    }
                    
                    // Сохраняем настройки
                    Lampa.Storage.set('torrent_size_filter', sizeFilter);
                    
                    // Обновляем список торрентов
                    Lampa.Activity.active().activity.component.reset();
                    
                    Lampa.Select.hide();
                },
                onBack: function() {
                    Lampa.Select.hide();
                }
            });
        });
        
        return filter_item;
    }

    // Перехватываем отображение торрентов
    Lampa.Listener.follow('torrent', function(e) {
        if (e.type == 'start' || e.type == 'reset') {
            // Загружаем сохраненные настройки
            var saved = Lampa.Storage.get('torrent_size_filter');
            if (saved) {
                sizeFilter = saved;
            }
        }
        
        if (e.type == 'complite' && e.object) {
            // Фильтруем торренты по размеру
            if (e.object.torrents && sizeFilter.enabled) {
                e.object.torrents = filterTorrentsBySize(e.object.torrents);
            }
        }
    });

    // Добавляем кнопку фильтра в интерфейс
    Lampa.Listener.follow('activity', function(e) {
        if (e.type == 'start' && e.component == 'full') {
            setTimeout(function() {
                var filter = $('.filter', e.object.activity.render());
                
                if (filter.length > 0) {
                    var sizeFilterBtn = createFilterUI();
                    filter.find('.filter--sort').before(sizeFilterBtn);
                }
            }, 100);
        }
    });

    // Модификация существующего фильтра
    var original_filter_render = null;
    
    Lampa.Listener.follow('filter', function(e) {
        if (e.type == 'init') {
            // Сохраняем оригинальный метод рендеринга
            if (!original_filter_render && e.object && e.object.render) {
                original_filter_render = e.object.render;
                
                // Переопределяем метод рендеринга
                e.object.render = function() {
                    var result = original_filter_render.apply(this, arguments);
                    
                    // Добавляем наш фильтр по размеру
                    var sizeFilter = createFilterUI();
                    result.find('.filter--quality').after(sizeFilter);
                    
                    return result;
                };
            }
        }
    });

    console.log('[' + plugin_name + '] Плагин успешно загружен v' + manifest.version);

})();