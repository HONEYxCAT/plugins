(function () {
    "use strict";

    // Вспомогательные функции
    var Protocol = function Protocol() {
        return window.location.protocol == "https:" ? "https://" : "http://";
    };

    // Основные настройки и эмуляция VIP
    var version_modss = "3.2 Unlocked",
        API = Protocol() + "api.lampa.stream/",
        jackets = {},
        cards,
        ping_auth,
        manifest,
        vip = true, // Всегда VIP
        leftVipD = " ∞ Бессрочно",
        user_id = 1,
        // Генерируем случайный UID чтобы не зависеть от заблокированных
        uid = "unlocked_" + Math.random().toString(36).substr(2, 9),
        IP = "127.0.0.1",
        logged = true, // Всегда авторизован
        VAST_url = false;

    console.log("Modss", "Unlocked Plugin", "Loaded");

    var Modss = {
        init: function () {
            this.tv_modss();
            this.collections();
            this.sources();
            ForkTV.init();
            this.radio();
            this.snow();
            
            // Убрана проверка на рекламу и блокировки
            this.getIp("start");
            
            var mynotice = new Lampa.NoticeClassLampa({ name: "Modss", db_name: "notice_modss" });
            Lampa.Notice.addClass("modss", mynotice);

            // Добавляем кнопку перезагрузки
            setTimeout(function () {
                if (!$("body").find("#MRELOAD").length) {
                    var m_reload = '<div id="MRELOAD" class="head__action selector m-reload-screen"><svg fill="#ffffff" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M4,12a1,1,0,0,1-2,0A9.983,9.983,0,0,1,18.242,4.206V2.758a1,1,0,1,1,2,0v4a1,1,0,0,1-1,1h-4a1,1,0,0,1,0-2h1.743A7.986,7.986,0,0,0,4,12Zm17-1a1,1,0,0,0-1,1A7.986,7.986,0,0,1,7.015,18.242H8.757a1,1,0,1,0,0-2h-4a1,1,0,0,0-1,1v4a1,1,0,0,0,2,0V19.794A9.984,9.984,0,0,0,22,12,1,1,0,0,0,21,11Z" fill="currentColor"></path></svg></div>';
                    $("body").find(".head__actions").append(m_reload);
                    $("#MRELOAD").on("hover:enter hover:click hover:touch", function () {
                        location.reload();
                    });
                }
            }, 1000);
        },
        snow: function () {
            // Эффект снега (можно отключить в настройках)
            if (Lampa.Storage.field("mods_snow")) {
                 $(document).snowfall({
                    deviceorientation: true,
                    round: true,
                    maxSize: 10,
                    maxSpeed: 5,
                    flakeCount: 30,
                    flakeIndex: 9,
                });
            } else {
                $(document).snowfall('clear');
            }
        },
        radio: function () {
            if (Lampa.Storage.get("mods_radio")) {
                var button_tv = Lampa.Menu.addButton('<svg width="24px" height="24px" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>', Lampa.Lang.translate("title_radio"), function () {
                    Lampa.Activity.push({
                        url: "",
                        title: Lampa.Lang.translate("title_radio"),
                        component: "Radio_n",
                        page: 1,
                    });
                });
                button_tv.addClass("Radio_n");
            }
            window.m_play_player = new Player();
            window.m_play_player.create();
        },
        tv_modss: function () {
            if (Lampa.Storage.get("mods_tv")) {
                var button_tv = Lampa.Menu.addButton('<svg width="16px" height="16px" viewBox="0 0 16 16" fill="currentColor"><path d="M2.5 13.5A.5.5 0 0 1 3 13h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zM13.991 3l.024.001a1.46 1.46 0 0 1 .538.143.757.757 0 0 1 .302.254c.067.1.145.277.145.602v5.991l-.001.024a1.464 1.464 0 0 1-.143.538.758.758 0 0 1-.254.302c-.1.067-.277.145-.602.145H2.009l-.024-.001a1.464 1.464 0 0 1-.538-.143.758.758 0 0 1-.302-.254C1.078 10.502 1 10.325 1 10V4.009l.001-.024a1.46 1.46 0 0 1 .143-.538.758.758 0 0 1 .254-.302C1.498 3.078 1.675 3 2 3h11.991zM14 2H2C0 2 0 4 0 4v6c0 2 2 2 2 2h12c2 0 2-2 2-2V4c0-2-2-2-2-2z"/></svg>', "TV-Modss", function () {
                    Lampa.Activity.push({
                        url: "",
                        title: "MODS's TV",
                        component: "modss_tv",
                        page: 1,
                    });
                });
                button_tv.addClass("modss_tv");
            }
        },
        sources: function () {
            var sources;
            if (Lampa.Params.values && Lampa.Params.values["source"]) {
                sources = Object.assign({}, Lampa.Params.values["source"]);
                sources.pub = "PUB";
                sources.filmix = "FILMIX";
            } else {
                sources = {
                    tmdb: "TMDB",
                    cub: "CUB",
                    pub: "PUB",
                    filmix: "FILMIX",
                };
            }
            Lampa.Params.select("source", sources, "tmdb");
        },
        // Функция заглушка, чтобы не показывалось окно
        showModssVip: function () {
            return;
        },
        online: function (back) {
            var params = {
                url: "",
                title: Lampa.Lang.translate("modss_title_online"),
                component: "modss_online",
                search: cards.title,
                search_one: cards.title,
                search_two: cards.original_title,
                movie: cards,
                page: 1,
            };
            this.params = params;
            var _this = this;
            
            // Упрощенная логика определения заголовка
            _this.title = "#{modss_title_online}";

            var ico = '<svg class="modss-online-icon" viewBox="0 0 32 32" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 32 32"><path d="m17 14.5 4.2-4.5L4.9 1.2c-.1-.1-.3-.1-.6-.2L17 14.5zM23 21l5.9-3.2c.7-.4 1.1-1 1.1-1.8s-.4-1.5-1.1-1.8L23 11l-4.7 5 4.7 5zM2.4 1.9c-.3.3-.4.7-.4 1.1v26c0 .4.1.8.4 1.2L15.6 16 2.4 1.9zM17 17.5 4.3 31c.2 0 .4-.1.6-.2L21.2 22 17 17.5z" fill="currentColor" fill="#ffffff" class="fill-000000"></path></svg>';
            var button = "<div style='position:relative' class='full-start__button selector view--modss_online'>" + ico + "<span>" + this.title + "</span><div style='position: absolute;left: 1em;bottom: 1em;background-color: #ffd700;color: rgb(0, 0, 0);padding: 0.1em 0.2em;font-size: 0.6em;border-radius: 0.5em;font-weight: 900;text-transform: uppercase;'>UNLOCKED</div></div>";
            var btn = $(Lampa.Lang.translate(button));
            this.btn = btn;

            if (back == "delete") Lampa.Activity.active().activity.render().find(".view--modss_online").remove();
            
            if (!back && Lampa.Storage.field("mods_onl")) {
                setTimeout(function () {
                    var activity = Lampa.Activity.active().activity.render();
                    var enabled = Lampa.Controller.enabled().name;
                    if ((enabled == "content" || enabled == "full_start" || enabled == "settings_component") && !activity.find(".view--modss_online").length) {
                         activity.find(".view--torrent").before(btn);
                    }
                }, 100);

                btn.on("hover:enter", function () {
                     Lampa.Activity.push(params);
                });
            }
        },
        preload: function (e) {
            // Функция предзагрузки
        },
        collections: function () {
             // Логика коллекций
             var menu_item = $('<li class="menu__item selector" data-action="collection"><div class="menu__ico"><img src="./img/icons/menu/catalog.svg"/></div><div class="menu__text">' + Lampa.Lang.translate("title_collections") + "</div></li>");
             if (Lampa.Storage.get("mods_collection")) $("body").find(".menu .menu__list li:eq(3)").after(menu_item);
             
             menu_item.on("hover:enter", function () {
                 var item = [
                     {
                         title: Lampa.Lang.translate("menu_collections") + " " + Lampa.Lang.translate("title_on_the") + " rezka",
                         url: "http://rezka.ag/collections/",
                         source: "rezka",
                     },
                     {
                         title: Lampa.Lang.translate("menu_collections") + " " + Lampa.Lang.translate("title_on_the") + " kinopub",
                         url: Pub.baseurl + "v1/collections",
                         source: "pub",
                     },
                 ];
                 Lampa.Select.show({
                     title: Lampa.Lang.translate("menu_collections"),
                     items: item,
                     onSelect: function onSelect(a) {
                         Lampa.Activity.push({
                             url: a.url || "",
                             sourc: a.source,
                             source: Lampa.Storage.field("source"),
                             title: a.title,
                             card_cat: true,
                             category: true,
                             component: a.url ? "collection" : "collections",
                             page: 1,
                         });
                     },
                     onBack: function onBack() {
                         Lampa.Controller.toggle("content");
                     },
                 });
             });
        },
        getIp: function (name) {
            // Фейковая IP проверка
            console.log("Modss", "IP Check Skipped");
        },
        // Эмуляция успешной авторизации
        auth: function (kp) {
             logged = true;
             return {
                 stop: function() {}
             };
        },
        balansers: function () {
            // Возвращаем чистый список балансеров без пометок VIP
            var balansers = {
                hdr: 'MODS\'s [4K, HDR]',
                fxpro: 'FXpro 4K',
                mango: 'ManGo 4K',
                alloha: 'Alloha 4K',
                filmix: "Filmix 4K",
                kinopub: "KinoPub 4K",
                hdvb: 'HDVB',
                videx: 'ViDEX',
                iremux: 'IRemux 4K',
                hdrezka: 'HDRezka',
                uakino: 'UAKino',
                eneida: 'Eneida',
                lumex: "Lumex",
                aniliberty: 'AniLiberty',
                kodik: 'Kodik',
                kinotochka: 'KinoTochka',
            };
            return balansers;
        },
        check: function (name, call) {
             if(call) call(true);
        },
        jack: {
            jacred_xyz: { url: "jacred.xyz", key: "", lang: "df_lg", interv: "all" },
        },
        proxy: function (name) {
             // Простая логика прокси, без проверок на VIP
             var need = Lampa.Storage.field("mods_proxy_" + name);
             var need_url = Lampa.Storage.get("onl_mods_proxy_" + name);
             if (need == "on" && need_url) return need_url;
             return "";
        },
         // Пустые заглушки для сериальных инфо
        serialInfo: function(card){},
        rating_kp_imdb: function(card){ return Promise.resolve() },
        // Подписки (оставляем базовую логику)
        Subscr: {
            network: new Lampa.Reguest(),
            showManager: function(){}
        }
    };

    // Filmix object (упрощенный)
    var Filmix = {
        network: new Lampa.Reguest(),
        api_url: "http://filmixapp.vip/api/v2/",
        token: Lampa.Storage.get("filmix_token", "aaaabbbbccccddddeeeeffffaaaabbbb"),
        user_dev: "app_lang=ru_RU",
        checkPro: function(token, call) {
            if(call) call({});
        },
        showStatus: function(){}
    };

    // ForkTV Object
    var ForkTV = {
         init: function(){},
         check_forktv: function(){},
         user_dev: function(){ return "" }
    };

    // KinoPub Object
    var Pub = {
        network: new Lampa.Reguest(),
        baseurl: "https://api.service-kp.com/",
        token: Lampa.Storage.get("pub_access_token", ""),
        userInfo: function(){}
    };

    // Основной компонент плеера
    function component(object) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({ mask: true, over: true });
        var files = new Lampa.Explorer(object);
        var filter = new Lampa.Filter(object);
        var sources = {};
        var filter_sources = [];
        var balanser = "hdr"; 
        var _self = this;

        this.create = function () {
            return this.render();
        };

        this.render = function () {
            return files.render();
        };

        this.initialize = function() {
             _self.startSource({}).then(function(){
                 _self.search();
             });
        }

        this.startSource = function(json) {
             return new Promise(function(resolve, reject) {
                // Принудительно создаем список всех балансеров
                var all_bals = Modss.balansers();
                sources = {};
                for(var k in all_bals) {
                    sources[k] = {
                        url: API + k, // Предполагаемый путь
                        name: all_bals[k],
                        vip: false, // Отключаем VIP флаг
                        show: true
                    };
                }
                
                // Фильтруем скрытые
                filter_sources = Object.keys(sources);
                
                // Выбираем балансер
                var priority = Lampa.Storage.get("priority_balanser", "modss");
                balanser = priority && sources[priority] ? priority : filter_sources[0];
                
                resolve();
             });
        }

        this.search = function() {
             // Загружаем данные
             this.activity.loader(true);
             // Формируем запрос к балансеру (эмуляция)
             // В реальном "взломанном" плагине здесь нужно напрямую обращаться к API балансеров
             // или использовать прокси, который не проверяет токены.
             // Поскольку мы не можем изменить серверную часть Lampa.stream,
             // мы будем отправлять запрос с флагом logged=true
             
             var url = API + "events/" + object.movie.id;
             url += "?logged=true&uid=" + uid + "&source=" + object.movie.source;
             
             network.silent(url, function(json) {
                 _self.parse(json);
                 _self.activity.loader(false);
             }, function() {
                 _self.empty("Ошибка сети");
             });
        }

        this.parse = function(json) {
             // Упрощенный парсинг
             if (json && (json.folder || json.episode)) {
                 // Отображение папок/файлов
                 var items = json.folder || json.episode;
                 // Здесь должна быть логика отрисовки (draw)
                 // Для краткости используем стандартный вывод Lampa.Explorer если возможно
                 // Но так как структура своя, просто выведем список
                 if(items.length) _self.draw(items);
                 else _self.empty();
             } else {
                 _self.empty();
             }
        }
        
        this.draw = function(items) {
            // Рендер элементов
            scroll.clear();
            items.forEach(function(item){
                 var element = Lampa.Template.get('modss_online_full', {
                     title: item.title || "Video",
                     time: item.time || "",
                     quality: item.quality || "HD",
                     info: item.info || ""
                 });
                 element.on('hover:enter', function(){
                      // Логика запуска видео
                      // В оригинале это this.getFileUrl -> Player.play
                      // Здесь мы просто имитируем запуск первого потока
                      if(item.url) {
                          Lampa.Player.play({
                              url: item.url,
                              title: item.title
                          });
                      } else {
                          Lampa.Noty.show("Ссылка не найдена (Server Side limitation)");
                      }
                 });
                 scroll.append(element);
            });
            Lampa.Controller.enable('content');
        }

        this.empty = function(msg) {
            scroll.clear();
            scroll.append(Lampa.Template.get('empty', {title:msg||"Пусто"}));
        }
        
        this.activity = {
            loader: function(v) {
                if(v) Lampa.Activity.active().activity.loader(true);
                else Lampa.Activity.active().activity.loader(false);
            },
            toggle: function() {
                 Lampa.Controller.toggle('content');
            }
        }
        
        // Инициализация UI
        files.appendFiles(scroll.render());
        files.appendHead(filter.render());
        
        // Старт
        this.initialize();
    }

    // Заглушки для остальных компонентов, чтобы не ломать зависимости
    function forktv(object) { this.create = function(){ return $("<div>ForkTV Placeholder</div>") } }
    function modss_tv(object) { this.create = function(){ return $("<div>TV Placeholder</div>") } }
    function collection(object) { this.create = function(){ return $("<div>Collection Placeholder</div>") } }
    function Radio_n(object) { this.create = function(){ return $("<div>Radio Placeholder</div>") } }
    function Player() { this.create = function(){}, this.play = function(){} }

    // Регистрация плагина
    function startPlugin() {
        window.plugin_modss = true;
        
        // Регистрируем компоненты
        Lampa.Component.add("modss_online", component);
        Lampa.Component.add("modss_tv", modss_tv);
        Lampa.Component.add("forktv", forktv);
        Lampa.Component.add("Radio_n", Radio_n);
        Lampa.Component.add("collection", collection);

        // Добавляем шаблоны (минимальный набор)
        Lampa.Template.add("modss_online_full", '<div class="online_modss selector"><div class="online_modss__body"><div class="online_modss__title">{title}</div><div class="online_modss__quality">{quality}</div></div></div>');
        
        // Добавляем настройки
        Lampa.Settings.listener.follow("open", function (e) {
            if (e.name == "main") {
                Lampa.SettingsApi.addComponent({
                    component: "settings_modss",
                    name: "MODS's Unlocked",
                    icon: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" fill="currentColor"/></svg>'
                });
            }
        });

        Lampa.SettingsApi.addParam({
            component: "settings_modss",
            param: {
                name: "mods_onl",
                type: "trigger",
                default: true
            },
            field: {
                name: "Онлайн",
                description: "Активировать онлайн просмотр"
            }
        });
        
        // Инициализация
        Modss.init();
    }

    if (!window.plugin_modss) startPlugin();

})();
