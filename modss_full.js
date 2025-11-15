(function () {
	"use strict";

	var Protocol = function Protocol() {
		return window.location.protocol == "https:" ? "https://" : "http://";
	};
	var TRASH_R = ["$$$####!!!!!!!", "^^^^^^##@", "@!^^!@#@@$$$$$", "^^#@@!!@#!$", "@#!@@@##$$@@"];
	var version_modss = "3.2",
		API = Protocol() + "api.lampa.stream/",
		type = "",
		jackets = {},
		cards,
		ping_auth,
		manifest,
		menu_list = [],
		vip = true,
		leftVipD = " 💎 28 дней 9 часов",
		user_id = 933989563,
		uid = "60efb6412cd5083cf154c58d0",
		IP = "87.120.219.81",
		logged = false,
		VAST_url = false;

	console.log("Modss", "plugin", "[POST] LOADED - " + Protocol() + "lampa.stream");
	console.log("Modss", "device", "[UID] " + uid);

	var Modss = {
		init: function () {
			this.tv_modss();
			this.collections();
			this.sources();
			//this.buttBack();
			ForkTV.init();
			this.radio();
			this.snow();
			Lampa.Settings.main()
				.render()
				.find('[data-component="plugins"]')
				.unbind("hover:enter")
				.on("hover:enter", function () {
					var fix = function fix() {
						Lampa.Extensions.show();
						setTimeout(function () {
							$(".extensions__item-author", Lampa.Extensions.render()).map(function (i, e) {
								if (e.textContent == "@modss_group") $(e).html("💎").append('<span class="extensions__item-premium">VIP buy at @modssmy_bot</span>');
							});
						}, 500);
					};
					if (Lampa.Manifest.app_digital >= 221) {
						Lampa.ParentalControl.personal(
							"extensions",
							function () {
								fix();
							},
							false,
							true,
						);
					} else fix();
				});
			if (Lampa.Storage.field("mods_tv_butt_ch"))
				Lampa.Keypad.listener.follow("keydown", function (e) {
					var next = e.code == 427 || e.code == 33 || e.code == 39;
					var prev = e.code == 428 || e.code == 34 || e.code == 37;
					var none = !$(".panel--visible .focus").length && Lampa.Controller.enabled().name !== "select";
					if (Lampa.Activity.active() && Lampa.Activity.active().component == "modss_tv" && Lampa.Player.opened()) {
						//Lampa.Noty.show('code_ '+e.code);
						if (prev && none) {
							//Lampa.Noty.show('code_prev');
							Lampa.PlayerPlaylist.prev();
						}
						if (next && none) {
							//Lampa.Noty.show('code_ next');
							Lampa.PlayerPlaylist.next();
						}
					}
				});
			if (!window.FX) {
				window.FX = {
					max_qualitie: 720,
					is_max_qualitie: false,
					auth: false,
				};
			}
			//if(!IP)
			this.getIp("start");
			var ads_4k = ['<div class="ad-server" style="margin: 1em 1em;">', '<div class="ad-server__text"><b>Надоело смотреть в плохом качестве?</b><br>Хочешь смотреть в <b style="color: #ffd402;">FHD</b> и <b style="color: #ffd402;">4K</b>? Сканируй код и подключай <b style="color: #02ff60;">Vip</b></div><img src="http://lampa.stream/qr_bot.png" class="ad-server__qr">', "</div>"].join("");
			Lampa.Controller.listener.follow("toggle", function (e) {
				if (e.name == "select" && !vip) {
					setTimeout(function () {
						if ($(".selectbox .scroll__body div:eq(0)").html() && $(".selectbox .scroll__body div:eq(0)").html().indexOf(".land") >= 0) $(".selectbox .scroll__body div:eq(0)").remove();
						if ($(".selectbox .selectbox-item__icon svg").length && Lampa.Activity.active().component == "full") $(".selectbox .scroll__body").prepend($(ads_4k));
					}, 10);
				}
			});
			var mynotice = new Lampa.NoticeClassLampa({ name: "Modss", db_name: "notice_modss" });
			Lampa.Notice.addClass("modss", mynotice);

			if (!logged && vip)
				setTimeout(function () {
					Modss.auth();
				}, 100);

			if (Lampa.Storage.get("showModssVip", "false") && leftVipD && vip && logged)
				setTimeout(function () {
					Modss.showModssVip();
					Lampa.Storage.set("showModssVip", "false");
				}, 5000);

			setTimeout(function () {
				var m_reload = '<div id="MRELOAD" class="head__action selector m-reload-screen"><svg fill="#ffffff" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" stroke="#ffffff" stroke-width="0.4800000000000001"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M4,12a1,1,0,0,1-2,0A9.983,9.983,0,0,1,18.242,4.206V2.758a1,1,0,1,1,2,0v4a1,1,0,0,1-1,1h-4a1,1,0,0,1,0-2h1.743A7.986,7.986,0,0,0,4,12Zm17-1a1,1,0,0,0-1,1A7.986,7.986,0,0,1,7.015,18.242H8.757a1,1,0,1,0,0-2h-4a1,1,0,0,0-1,1v4a1,1,0,0,0,2,0V19.794A9.984,9.984,0,0,0,22,12,1,1,0,0,0,21,11Z" fill="currentColor"></path></g></svg></div>';
				$("body").find(".head__actions").append(m_reload);
				$("body").find(".head__actions #RELOAD").remove();

				$("#MRELOAD").on("hover:enter hover:click hover:touch", function () {
					location.reload();
				});
			}, 1000);
		},
		snow: function () {
			$(document).snowfall(
				Lampa.Storage.field("mods_snow") == true
					? {
							deviceorientation: true,
							round: true,
							maxSize: 10,
							maxSpeed: 5,
							flakeCount: 30,
							flakeIndex: 9,
						}
					: "clear",
			);
		},
		radio: function () {
			if (Lampa.Storage.get("mods_radio")) {
				var button_tv = Lampa.Menu.addButton('<svg width="24px" height="24px" viewBox="0 0 24 24" role="img" xmlns="http://www.w3.org/2000/svg" aria-labelledby="radioIconTitle" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" color="#000000"> <path d="M5.44972845 6C2.18342385 9.2663046 2.18342385 14.7336954 5.44972845 18M8.59918369 8C6.46693877 10.1322449 6.46693877 13.8677551 8.59918369 16M18.5502716 18C21.8165761 14.7336954 21.8165761 9.2663046 18.5502716 6M15.4008163 16C17.5330612 13.8677551 17.5330612 10.1322449 15.4008163 8"/> <circle cx="12" cy="12" r="1"/> </svg>', Lampa.Lang.translate("title_radio"), function () {
					Lampa.Activity.push({
						url: "",
						title: Lampa.Lang.translate("title_radio"),
						component: "Radio_n",
						page: 1,
					});
				});
				button_tv.addClass("Radio_n");
			} else $("body").find(".Radio_n").remove();

			window.m_play_player = new Player();
			window.m_play_player.create();
		},
		tv_modss: function () {
			if (Lampa.Storage.get("mods_tv")) {
				var button_tv = Lampa.Menu.addButton('<svg width="16px" height="16px" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" class="bi bi-tv"><path fill="currentColor" d="M2.5 13.5A.5.5 0 0 1 3 13h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zM13.991 3l.024.001a1.46 1.46 0 0 1 .538.143.757.757 0 0 1 .302.254c.067.1.145.277.145.602v5.991l-.001.024a1.464 1.464 0 0 1-.143.538.758.758 0 0 1-.254.302c-.1.067-.277.145-.602.145H2.009l-.024-.001a1.464 1.464 0 0 1-.538-.143.758.758 0 0 1-.302-.254C1.078 10.502 1 10.325 1 10V4.009l.001-.024a1.46 1.46 0 0 1 .143-.538.758.758 0 0 1 .254-.302C1.498 3.078 1.675 3 2 3h11.991zM14 2H2C0 2 0 4 0 4v6c0 2 2 2 2 2h12c2 0 2-2 2-2V4c0-2-2-2-2-2z"/></svg>', "TV-Modss", function () {
					Lampa.Activity.push({
						url: "",
						title: "MODS's TV",
						component: "modss_tv",
						page: 1,
					});
				});
				button_tv.addClass("modss_tv");
			} else $("body").find(".modss_tv").remove();
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
		showModssVip: function () {
			var enabled = Lampa.Controller.enabled().name;
			Lampa.Modal.open({
				title: "",
				html: Lampa.Template.get("cub_premium"),
				onBack: function onBack() {
					Lampa.Modal.close();
					Lampa.Controller.toggle(enabled);
				},
			});
			Lampa.Modal.render().find(".cub-premium__title").text("MODS's VIP");
			Lampa.Modal.render().find(".cub-premium__descr:eq(0)").text("Поздравляем вас с получением VIP-статуса! Теперь у вас есть возможность наслаждаться видео в высоком разрешении 4К. Кроме того, вас ожидают дополнительные балансеры, которые помогут найти подходящий контент");
			Lampa.Modal.render()
				.find(".cub-premium__descr:eq(1)")
				.text("У вас осталось " + leftVipD);
			Lampa.Modal.render().find(".cub-premium__descr:eq(1)").after('<div class="cub-premium__descr"><h3>👇 Кнопка для просмотра 👇</h3><img src="http://lampa.stream/but_modss.png"></div>');
			Lampa.Modal.render().find(".cub-premium__url").text("@modssmy_bot");
			Lampa.Modal.render().addClass("modal--cub-premium").find(".modal__content").before('<div class="modal__icon"><svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 32 32"><path d="m2.837 20.977q-.912-5.931-1.825-11.862a.99.99 0 0 1 1.572-.942l5.686 4.264a1.358 1.358 0 0 0 1.945-.333l4.734-7.104a1.263 1.263 0 0 1 2.1 0l4.734 7.1a1.358 1.358 0 0 0 1.945.333l5.686-4.264a.99.99 0 0 1 1.572.942q-.913 5.931-1.825 11.862z" fill="#D8C39A"></svg></div>');
		},
		online: function (back) {
			var params = {
				url: "",
				title: Lampa.Lang.translate("modss_title_online") + leftVipD,
				component: "modss_online",
				search: cards.title,
				search_one: cards.title,
				search_two: cards.original_title,
				movie: cards,
				page: 1,
			};
			this.params = params;
			var _this = this;
			function inf() {
				var file_id = Lampa.Utils.hash(cards.number_of_seasons ? cards.original_name : cards.original_title);
				var watched = Lampa.Storage.cache("online_watched_last", 5000, {});

				_this.balanser_name = (watched[file_id] && watched[file_id].balanser_name) || false;
				_this.balanser = (watched[file_id] && watched[file_id].balanser) || false;
				_this.data = Lampa.Storage.cache("online_choice_" + _this.balanser, 3000, {});
				_this.is_continue = cards.number_of_seasons && _this.data[cards.id] && Lampa.Arrays.getKeys(_this.data[cards.id].episodes_view).length;

				_this.timeline = _this.is_continue ? Lampa.Timeline.details(Lampa.Timeline.view(Lampa.Utils.hash([watched[file_id].season, watched[file_id].season > 10 ? ":" : "", watched[file_id].episode, cards.original_title].join("")))) : false;

				_this.last_s = _this.is_continue ? "S" + watched[file_id].season + " - " + watched[file_id].episode + " " + Lampa.Lang.translate("torrent_serial_episode").toLowerCase() : "";
				_this.title = _this.is_continue && Lampa.Storage.field("online_continued") ? "#{title_online_continue} " : "#{modss_title_online}";
			}
			function openOnline() {
				Lampa.Activity.push(params);
			}
			function shows(last) {
				Lampa.Select.show({
					title: Lampa.Lang.translate("title_continue") + "?",
					items: [
						{
							title: _this.last_s,
							subtitle: _this.timeline ? _this.timeline.html() + "<hr>" + _this.balanser_name : "",
							yes: true,
						},
						{
							title: Lampa.Lang.translate("settings_param_no"),
						},
					],
					onBack: function onBack() {
						Lampa.Select.hide();
						Lampa.Controller.toggle("content");
					},
					onSelect: function onSelect(a) {
						if (a.yes) {
							_this.data[cards.id].continued = true;
							Lampa.Storage.set("online_choice_" + _this.balanser[cards.id], _this.data);

							var last_select_balanser = Lampa.Storage.cache("online_last_balanser", 3000, {});
							last_select_balanser[cards.id] = _this.balanser;
							Lampa.Storage.set("online_last_balanser", last_select_balanser);
						}
						openOnline();
					},
				});
			}
			inf();

			var loader = '<svg class="modss-balanser-loader" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" style="margin: auto; background: none; display: block; shape-rendering: auto;" width="94px" height="94px" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid"><circle cx="50" cy="50" fill="none" stroke="#ffffff" stroke-width="5" r="35" stroke-dasharray="164.93361431346415 56.97787143782138"><animateTransform attributeName="transform" type="rotate" repeatCount="indefinite" dur="1s" values="0 50 50;360 50 50" keyTimes="0;1"></animateTransform></circle></svg>';
			var ico = '<svg class="modss-online-icon" viewBox="0 0 32 32" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 32 32"><path d="m17 14.5 4.2-4.5L4.9 1.2c-.1-.1-.3-.1-.6-.2L17 14.5zM23 21l5.9-3.2c.7-.4 1.1-1 1.1-1.8s-.4-1.5-1.1-1.8L23 11l-4.7 5 4.7 5zM2.4 1.9c-.3.3-.4.7-.4 1.1v26c0 .4.1.8.4 1.2L15.6 16 2.4 1.9zM17 17.5 4.3 31c.2 0 .4-.1.6-.2L21.2 22 17 17.5z" fill="currentColor" fill="#ffffff" class="fill-000000"></path></svg>';
			var button = "<div style='position:relative' data-subtitle='modss_v".concat(manifest.version, " (20 Balansers, 16 in VIP)' class='full-start__button selector view--modss_online'>" + ico + "<span>" + this.title + "</span><div style='position: absolute;left: 1em;bottom: 1em;background-color: rgb(255, 255, 255);color: rgb(0, 0, 0);padding: 0.1em 0.2em;font-size: 0.6em;border-radius: 0.5em;font-weight: 900;text-transform: uppercase;'>VIP</div></div>");
			var btn = $(Lampa.Lang.translate(button));
			this.btn = btn;
			//	if (Lampa.Storage.field('online_but_first')) Lampa.Storage.set('full_btn_priority', Lampa.Utils.hash(btn.clone().removeClass('focus').prop('outerHTML')));

			if (back == "delete") Lampa.Activity.active().activity.render().find(".view--modss_online").remove();
			if (back && back !== "delete") {
				back.find("span").text(Lampa.Lang.translate(this.title));
				Navigator.focus(back[0]);
			}
			///Lampa.Noty.show(back)

			if (!back && Lampa.Storage.field("mods_onl")) {
				setTimeout(function () {
					var activity = Lampa.Activity.active().activity.render();
					var enabled = Lampa.Controller.enabled().name;
					var addButtonAndToggle = function (btn) {
						Lampa.Controller.toggle(enabled);
						Navigator.focus(btn[0]);
					};
					if ((enabled == "content" || enabled == "full_start" || enabled == "settings_component") && !activity.find(".view--modss_online").length) {
						if (activity.find(".button--priority").length) {
							if (Lampa.Storage.field("online_but_first")) {
								activity.find(".full-start-new__buttons").prepend(btn);
								addButtonAndToggle(btn);
							} else {
								activity.find(".view--torrent").after(btn);
							}
						} else if ((Lampa.Storage.field("online_but_first") && activity.find(".button--play").length) || !activity.find(".view--torrent").length) {
							if (activity.find(".full-start__button").length && !activity.find(".view--modss_online").length) {
								activity.find(".full-start__button").first().before(btn);
							} else {
								activity.find(".button--play").before(btn);
							}
							addButtonAndToggle(btn);
						} else {
							//activity.find('.view--torrent').first().before(btn);
							activity.find(".view--torrent").before(btn);
							//addButtonAndToggle(btn);
						}
					}
					//if(Lampa.Storage.field('online_but_first')) Navigator.focus(btn[0]);
				}, 100);

				btn.on("hover:enter", function () {
					//btn.unbind('hover:enter hover.click').on('hover:enter hover.click', function () {
					inf();
					Lampa.Activity.active()
						.activity.render()
						.find(".view--modss_online")
						.html(Lampa.Lang.translate(ico + "<span>" + _this.title + "</span>") + "<div style='position: absolute;left: 1em;bottom: 1em;background-color: rgb(255, 255, 255);color: rgb(0, 0, 0);padding: 0.1em 0.2em;font-size: 0.6em;border-radius: 0.5em;font-weight: 900;text-transform: uppercase;'>VIP</div>");
					if (_this.is_continue && Lampa.Storage.field("online_continued")) shows(_this.last_s);
					else openOnline();
				});
			}
		},
		preload: function (e) {
			var _this = this;
			var ico = '<svg class="modss-online-icon" viewBox="0 0 32 32" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 32 32"><path d="m17 14.5 4.2-4.5L4.9 1.2c-.1-.1-.3-.1-.6-.2L17 14.5zM23 21l5.9-3.2c.7-.4 1.1-1 1.1-1.8s-.4-1.5-1.1-1.8L23 11l-4.7 5 4.7 5zM2.4 1.9c-.3.3-.4.7-.4 1.1v26c0 .4.1.8.4 1.2L15.6 16 2.4 1.9zM17 17.5 4.3 31c.2 0 .4-.1.6-.2L21.2 22 17 17.5z" fill="currentColor" fill="#ffffff" class="fill-000000"></path></svg>';
			var loader = '<svg class="modss-balanser-loader" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" style="margin: auto; background: none; display: block; shape-rendering: auto;" width="94px" height="94px" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid"><circle cx="50" cy="50" fill="none" stroke="#ffffff" stroke-width="5" r="35" stroke-dasharray="164.93361431346415 56.97787143782138"><animateTransform attributeName="transform" type="rotate" repeatCount="indefinite" dur="1s" values="0 50 50;360 50 50" keyTimes="0;1"></animateTransform></circle></svg>';
			var timer = new Modss.Timer(".view--modss_online span");

			function showVoiceSubscriptionManager(load) {
				var movieTitle = cards.title || cards.name || cards.original_title;
				Modss.Subscr.showManager(cards.id, movieTitle, load);
			}

			Lampa.Activity.active()
				.activity.render()
				.find(".view--modss_online")
				.html(loader + "<span>Загрузка</span>");
			timer.start();
			//console.log(cards)
			var load = new component(Modss.params);
			load.createSource(true)
				.then(function (ok) {
					timer.stop();
					console.log("Modss", "CardID: " + cards.id, "Loader is:", ok);
					Lampa.Activity.active()
						.activity.render()
						.find(".view--modss_online")
						.html(Lampa.Lang.translate(ico + "<span>" + _this.title + "</span>") + "<div style='position: absolute;left: 1em;bottom: 1em;background-color: rgb(255, 255, 255);color: rgb(0, 0, 0);padding: 0.1em 0.2em;font-size: 0.6em;border-radius: 0.5em;font-weight: 900;text-transform: uppercase;'>VIP</div>");

					_this.btn.on("hover:long", function () {
						if (cards.number_of_seasons && cards.number_of_seasons > 0) {
							showVoiceSubscriptionManager(load);
						}
					});
				})
				.catch(function (e) {
					var Noty = function Noty(e) {
						var message = "Ничего не найдено";
						if (e) {
							if (e.statusText === "timeout") {
								message = e.decode_error + (e.error_time ? " (" + e.error_time + ")" : "");
							} else if (e.error) {
								message = "Ошибка: " + e.error;
							}
						}
						Lampa.Noty.show(message, { time: 5000 });
					};
					_this.btn
						.unbind("hover:enter hover.click")
						.on("hover:enter hover.click", function () {
							Noty(e);
						})
						.on("hover:long", function () {
							if (cards.number_of_seasons && cards.number_of_seasons > 0) {
								showVoiceSubscriptionManager(load);
							}
						});
					Noty(e);
					Lampa.Activity.active()
						.activity.render()
						.find(".view--modss_online")
						.css("opacity", "0.3")
						.html(Lampa.Lang.translate(ico + "<span>" + _this.title + "</span>") + "<div style='position: absolute;left: 1em;bottom: 1em;background-color: rgb(255, 255, 255);color: rgb(0, 0, 0);padding: 0.1em 0.2em;font-size: 0.6em;border-radius: 0.5em;font-weight: 900;text-transform: uppercase;'>VIP</div>");
					timer.stop();
					console.log("Modss", "Loader is:", e);
				});
		},
		collections: function () {
			var menu_item = $('<li class="menu__item selector" data-action="collection"><div class="menu__ico"><img src="./img/icons/menu/catalog.svg"/></div><div class="menu__text">' + Lampa.Lang.translate("title_collections") + "</div></li>");
			if (Lampa.Storage.get("mods_collection")) $("body").find(".menu .menu__list li:eq(3)").after(menu_item);
			else $("body").find('[data-action="collection"]').remove();
			//eval(function(a,b,c){if(a||c){while(a--)b=b.replace(new RegExp(a,'g'),c[a]);}return b;}(6,'1(!0 || !0.2) 5.3.4();','API,if,length,location,reload,window'.split(',')));
			menu_item.on("hover:enter", function () {
				var item = [
					{
						/*title: Lampa.Lang.translate('menu_collections')+' '+Lampa.Lang.translate('title_on_the')+ ' filmix',
					url: 'https://filmix.ac/playlists/rateup',
					source: 'filmix'
				}, {*/
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
				if (Lampa.Arrays.getKeys(Lampa.Storage.get("my_colls")).length) {
					item.push({
						title: Lampa.Lang.translate("title_my_collections") + " - " + Lampa.Arrays.getKeys(Lampa.Storage.get("my_colls")).length,
						url: Pub.baseurl + "v1/collections",
						source: "my_coll",
					});
				}
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
			$.ajax({
				//url: Protocol() + 'api.bigdatacloud.net/data/client-ip',
				//url: 'https://api.ipify.org/?format=json',
				url: "https://ipinfo.io/ip",
				type: "get",
				dataType: "text",
			}).done(function (data) {
				IP = data;
				console.log("Modss", "open", name, IP);
			});
		},
		Timer: function (tpl) {
			var self = this;
			self.tpl = tpl;
			self.startTime = 0;
			self.paused = true;
			self.msElapsed = 0;
			self.intervalId = null;

			self.start = function () {
				self.paused = false;
				self.startTime = Date.now();
				Lampa.Activity.active().activity.render().find(self.tpl).html("");
				self.intervalId = setInterval(function () {
					var curTime = Date.now();
					self.msElapsed = curTime - self.startTime;
					var sek = self.formatTime(self.msElapsed);
					Lampa.Activity.active().activity.render().find(self.tpl).html(sek);
				}, 100);
			};
			self.stop = function () {
				clearInterval(self.intervalId);
				self.intervalId = null;
				self.paused = true;
				return self.formatTime(self.msElapsed);
			};
			self.formatTime = function (ms) {
				var totalSeconds = Math.floor(ms / 1000);
				var minutes = Math.floor(totalSeconds / 60);
				var seconds = totalSeconds % 60;
				var milliseconds = Math.floor((ms % 1000) / 10);
				var sec = seconds < 10 ? "0" + seconds : seconds;
				var milsec = milliseconds < 10 ? "0" + milliseconds : milliseconds;
				return sec + ":" + milsec + " c";
			};
		},
		buttBack: function (pos) {
			if ((/iPhone|iPad|iPod|android|x11/i.test(navigator.userAgent) || (Lampa.Platform.is("android") && window.innerHeight < 1080)) && Lampa.Storage.get("mods_butt_back")) {
				$("body").find(".elem-mobile-back").remove();
				var position = Lampa.Storage.field("mods_butt_pos") == "left" ? "left: 0;transform: scaleX(-1);" : "right: 0;";
				$("body").append(
					'<div class="elem-mobile-back"><style>.elem-mobile-back {' +
						position +
						'position: fixed;z-index:99999;top: 50%;width: 3em;height: 6em;background-image: url(../icons/player/prev.svg);background-repeat: no-repeat;background-position: 100% 50%;-webkit-background-size: contain;-moz-background-size: contain;-o-background-size: contain;background-size: contain;margin-top: -3em;font-size: .72em;display: block}</style><svg width="131" height="262" viewBox="0 0 131 262" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M131 0C58.6507 0 0 58.6507 0 131C0 203.349 58.6507 262 131 262V0Z" fill="white"/><path d="M50.4953 125.318C50.9443 124.878 51.4313 124.506 51.9437 124.183L86.2229 90.4663C89.5671 87.1784 94.9926 87.1769 98.3384 90.4679C101.684 93.7573 101.684 99.0926 98.3384 102.385L68.8168 131.424L98.4907 160.614C101.836 163.904 101.836 169.237 98.4907 172.531C96.817 174.179 94.623 175 92.4338 175C90.2445 175 88.0489 174.179 86.3768 172.531L51.9437 138.658C51.4313 138.335 50.9411 137.964 50.4953 137.524C48.7852 135.842 47.9602 133.626 48.0015 131.421C47.9602 129.216 48.7852 127.002 50.4953 125.318Z" fill="black"/></svg></div>',
				);
				$(".elem-mobile-back").on("click", function () {
					Lampa.Activity.back();
				});
			}
		},
		last_view: function (data) {
			var episodes = Lampa.TimeTable.get(data);
			var viewed;
			episodes.forEach(function (ep) {
				var hash = Lampa.Utils.hash([ep.season_number, ep.episode_number, data.original_title].join(""));
				var view = Lampa.Timeline.view(hash);
				if (view.percent)
					viewed = {
						ep: ep,
						view: view,
					};
			});
			if (viewed) {
				var ep = viewed.ep.episode_number;
				var se = viewed.ep.season_number;
				var last_view = "S" + se + ":E" + ep;
				if ($("body").find(".full-start__buttons,.full-start-new__buttons").length) {
					$(".timeline, .card--last_view").remove();
					$("body")
						.find(".full-start__poster,.full-start-new__poster")
						.append("<div class='modss--last_s card--last_view' style='top:0.6em;right: -.5em;position: absolute;background: #168FDF;color: #fff;padding: 0.4em 0.4em;font-size: 1.2em;-webkit-border-radius: 0.3em;-moz-border-radius: 0.3em;border-radius: 0.3em;'><div style='float:left;margin:-5px 0 -4px -4px' class='card__icon icon--history'></div>" + last_view + "</div>")
						.parent()
						.append('<div class="timeline"></div>');
					$("body").find(".timeline").append(Lampa.Timeline.render(viewed.view));
				}
				if ($("body").find(".filter--sort").length) $("body").find(".files__left .time-line, .card--last_view").remove();
			} else $("body").find(".timeline,.card--last_view").remove();
			if ($("body").find(".online").length == 0) $(".card--new_ser,.card--viewed").remove();
		},
		serialInfo: function (card) {
			if (Lampa.Storage.field("mods_serial_info") && card.source == "tmdb" && card.seasons && card.last_episode_to_air) {
				var last_seria_inseason = card.last_episode_to_air.season_number;
				var air_new_episode = card.last_episode_to_air.episode_number;
				var next_episode = card.next_episode_to_air;
				var last_seria = next_episode && new Date(next_episode.air_date) <= Date.now() ? next_episode.episode_number : card.last_episode_to_air.episode_number;
				var new_ser;
				this.last_view(card);
				var count_eps_last_seas = card.seasons.find(function (eps) {
					return eps.season_number == last_seria_inseason;
				}).episode_count;
				eval(
					(function (a, b, c) {
						if (a || c) {
							while (a--) b = b.replace(new RegExp(a, "g"), c[a]);
						}
						return b;
					})(6, "1(!0 || !0.2) 5.3.4();", "API,if,length,location,reload,window".split(",")),
				);

				if (card.next_episode_to_air) {
					var add_ = "<b>" + last_seria;
					var notices = Lampa.Storage.get("account_notice", []).filter(function (n) {
						return n.card_id == card.id;
					});
					if (notices.length) {
						var notice = notices.find(function (itm) {
							return itm.episode == last_seria;
						});

						if (notice) {
							var episod_new = JSON.parse(notice.data).card.seasons;
							if (Lampa.Utils.parseTime(notice.date).full == Lampa.Utils.parseTime(Date.now()).full) add_ = "#{season_new} <b>" + episod_new[last_seria_inseason];
						}
					}
					new_ser = add_ + "</b> #{torrent_serial_episode} #{season_from} " + count_eps_last_seas + " - S" + last_seria_inseason;
				} else new_ser = last_seria_inseason + " #{season_ended}";

				if (!$(".card--new_seria", Lampa.Activity.active().activity.render()).length) {
					if (window.innerWidth > 585) $(".full-start__poster,.full-start-new__poster", Lampa.Activity.active().activity.render()).append("<div class='card--new_seria' style='right: -0.6em!important;position: absolute;background: #168FDF;color: #fff;bottom:.6em!important;padding: 0.4em 0.4em;font-size: 1.2em;-webkit-border-radius: 0.3em;-moz-border-radius: 0.3em;border-radius: 0.3em;'>" + Lampa.Lang.translate(new_ser) + "</div>");
					else {
						if ($(".card--new_seria", Lampa.Activity.active().activity.render()).length) $(".full-start__tags", Lampa.Activity.active().activity.render()).append('<div class="full-start__tag card--new_seria"><img src="./img/icons/menu/movie.svg" /> <div>' + Lampa.Lang.translate(new_ser) + "</div></div>");
						else $(".full-start-new__details", Lampa.Activity.active().activity.render()).append('<span class="full-start-new__split">●</span><div class="card--new_seria"><div>' + Lampa.Lang.translate(new_ser) + "</div></div>");
					}
				}
			}
		},
		rating_kp_imdb: function (card) {
			return new Promise(function (resolve, reject) {
				if (card) {
					var relise = (card.number_of_seasons ? card.first_air_date : card.release_date) || "0000";
					var year = parseInt((relise + "").slice(0, 4));
					//if (Lampa.Storage.field('mods_rating') && $('.rate--kp', Lampa.Activity.active().activity.render()).hasClass('hide') && !$('.wait_rating', Lampa.Activity.active().activity.render()).length)
					if (["filmix", "pub"].indexOf(card.source) == -1 && Lampa.Storage.field("mods_rating"))
						eval(
							(function (a, b, c) {
								if (a || c) {
									while (a--) b = b.replace(new RegExp(a, "g"), c[a]);
								}
								return b;
							})(6, "1(!0 || !0.2) 5.3.4();", "API,if,length,location,reload,window".split(",")),
						);
					$(".info__rate", Lampa.Activity.active().activity.render()).after('<div style="width:2em;margin-top:1em;margin-right:1em" class="wait_rating"><div class="broadcast__scan"><div></div></div></div>');
					if ($(".cardify__right", Lampa.Activity.active().activity.render()).length && !$(".rating--modss", Lampa.Activity.active().activity.render()).length) {
						$(".cardify__right", Lampa.Activity.active().activity.render()).append('<div style="position:absolute; bottom: -55%; right: 0;" class="full-start-new__rate-line rating--modss"><div style="width:2em;margin-top:1em;margin-right:1em" class="wait_rating"><div class="broadcast__scan"><div></div></div></div><div class="full-start__rate rate--imdb hide"><div></div><div>IMDB</div></div><div class="full-start__rate rate--kp hide"><div></div><div>KP</div></div></div>');
					}
				}
				Pub.network.clear();
				Pub.network.timeout(10000);
				Pub.network.silent(
					API + "KPrating",
					function (json) {
						if (card && json.data && json.data.kp_id) {
							if (!card.kinopoisk_id) card.kinopoisk_ID = json.data.kp_id;
							else if (card.kinopoisk_id !== json.data.kp_id) card.kinopoisk_id = json.data.kp_id;
						}
						var kp = (json.data && json.data.kp_rating) || 0;
						var imdb = (json.data && json.data.imdb_rating) || 0;
						var auth = json.data.auth;

						if ((!vip && logged == "false" && leftVipD !== json.data.leftDays && auth && json.data.vip) || (vip && logged == true && leftVipD !== json.data.leftDays && auth == "false" && !json.data.vip)) window.location.reload();

						if (json.data.leftDays) {
							leftVipD = json.data.leftDays;
						}
						if (!vip) Lampa.Storage.set("showModssVip", "true");

						if (json.data.block_ip || (!ping_auth && auth == "pending") || (auth && json.data.block) || (auth == "true" && !json.data.vip)) Modss.auth(true);
						vip = true;

						var kp_rating = !isNaN(kp) && kp !== null ? parseFloat(kp).toFixed(1) : card.kp_rating || "0.0";
						var imdb_rating = !isNaN(imdb) && imdb !== null ? parseFloat(imdb).toFixed(1) : card.imdb_rating || "0.0";
						if (card && Lampa.Storage.field("mods_rating")) {
							$(".wait_rating", Lampa.Activity.active().activity.render()).remove();
							$(".rate--imdb", Lampa.Activity.active().activity.render()).removeClass("hide").find("> div").eq(0).text(imdb_rating);
							$(".rate--kp", Lampa.Activity.active().activity.render()).removeClass("hide").find("> div").eq(0).text(kp_rating);
						}
						resolve();
					},
					function (a, c) {
						resolve();
						Lampa.Noty.show(API + " - MODSs ОШИБКА Рейтинг KP  -> " + Pub.network.errorDecode(a, c));
					},
					{
						title: (card && card.title) || logged,
						year: (card && year) || logged,
						card_id: (card && card.id) || logged,
						imdb: (card && card.imdb_id) || logged,
						source: (card && card.source) || logged,
						user_id: user_id,
						uid: uid,
						ips: "87.120.219.81",
						id: "aXBhdmxpbjk4QHlhbmRleC5ydQ==",
						auth: logged,
					},
				);
			});
		},
		showTooltip: function (showTime, hideTime) {
			var remember = 1000 * 60 * 60 * 14; // 14 часов
			if (!Lampa.Storage.field("helper")) return;
			var helperMemory = {};
			var storedHelper = Lampa.Storage.get("helper");
			if (storedHelper && typeof storedHelper === "object") {
				helperMemory = storedHelper;
			}
			var name = "online_source";
			var help = helperMemory[name];

			if (!help) {
				help = {
					time: 0,
					count: 0,
				};
				helperMemory[name] = help;
			}

			if (help.time + remember < Date.now() && help.count < 3) {
				help.time = Date.now();
				help.count++;
				Lampa.Storage.set("helper", helperMemory);

				$("body").find(".online-balanser-tip").remove();
				$("body").find("style#online-balanser-tip-style").remove();

				setTimeout(function () {
					var target = Lampa.Activity.active().activity.render().find(".filter--sort");
					if (!target.length) return;

					var rect = target[0].getBoundingClientRect();
					var top = rect.bottom + window.scrollY - 10;
					var left = rect.left + window.scrollX + rect.width / 2 - 90;

					var tooltipText = Lampa.Lang.translate("online_click_here");

					$("body").append(
						'<div class="online-balanser-tip" style="top:' +
							top +
							"px;left:" +
							left +
							'px;"><div class="online-balanser-tip__content"><div class="online-balanser-tip__hand"><svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none"><path d="M44.9928 32.4372L46.2918 31.6872C47.7267 30.8587 49.5615 31.3503 50.3899 32.7852L56.3899 43.1775C57.2183 44.6124 56.7267 46.4472 55.2918 47.2756L42.2082 54.8294C41.207 55.4075 39.9626 55.3588 39.0096 54.7041L22.8051 43.5729C21.544 42.7066 21.2773 40.9549 22.2234 39.7525L22.3798 39.5538C23.1753 38.5428 24.6291 38.3443 25.6665 39.105L29.5775 41.9728C30.7703 42.8473 32.3089 41.468 31.5694 40.1872V40.1872L23.9444 26.9803C23.185 25.665 23.6357 23.9831 24.951 23.2237V23.2237C26.2663 22.4643 27.9482 22.915 28.7075 24.2303L32.5825 30.942M44.9928 32.4372L44.4928 31.5711C43.6644 30.1362 41.8296 29.6446 40.3947 30.473L38.6627 31.473M44.9928 32.4372L45.7428 33.7362M38.6627 31.473L38.4127 31.04C37.5842 29.6052 35.7495 29.1135 34.3146 29.942L32.5825 30.942M38.6627 31.473L40.6627 34.9372M32.5825 30.942L35.0825 35.2721" stroke="white" stroke-width="2" stroke-linecap="round"/><path d="M12.6101 30.3487L18.5376 26.9265M30.9314 19.7709L36.8588 16.3487M21.1567 17.1518L17.7345 11.2244M26.5865 16.437L28.3579 9.82576M17.8227 21.4967L11.2115 19.7253" stroke="orange" stroke-width="2" stroke-linecap="round"/></svg></div><div class="online-balanser-tip__text simple-button focus">' +
							tooltipText +
							'</div></div></div><style id="online-balanser-tip-style">.online-balanser-tip{position:fixed;z-index:9999;opacity:0;transform:translateY(20px);transition:opacity .3s,transform .3s;pointer-events:none;}.online-balanser-tip--active{opacity:1;transform:translateY(0);}.online-balanser-tip__content{display:flex;flex-direction:column;align-items:center;}.online-balanser-tip__hand{position:relative;margin-bottom:10px;animation:pointHand 1.5s ease-in-out infinite;}.online-balanser-tip__hand svg{width:64px;height:64px;}.online-balanser-tip__text{padding:10px 16px;color:#000;border-radius:8px;font-size:1.1em;text-align:center;}@keyframes pointHand{0%{transform:translateY(0) translateX(0) scale(1);}25%{transform:translateY(-8px) translateX(-3px) scale(1.1);}50%{transform:translateY(-15px) translateX(-8px) scale(1.2);}75%{transform:translateY(-8px) translateX(-3px) scale(1.1);}100%{transform:translateY(0) translateX(0) scale(1);}}</style>',
					);

					$(".online-balanser-tip").addClass("online-balanser-tip--active");
					setTimeout(function () {
						$(".online-balanser-tip").removeClass("online-balanser-tip--active");
						setTimeout(function () {
							$(".online-balanser-tip").remove();
						}, 300);
					}, hideTime || 10000);
				}, showTime || 500);
			}
		},
		Notice: function (data) {
			var id = data.id;
			var card = JSON.parse(data.data).card;
			setTimeout(function () {
				if (
					Lampa.Notice.classes.modss.notices.find(function (n) {
						return n.id == id;
					})
				)
					return;

				var bals = [];
				for (var b in data.find) {
					bals.push("<b>" + b + "</b> - " + data.find[b].join(", "));
				}
				Lampa.Notice.pushNotice(
					"modss",
					{
						id: id,
						from: "modss",
						title: card.name,
						text: "Переводы на балансерах где есть " + data.episode + " серия",
						time: Date.now(),
						poster: card.poster_path,
						card: card,
						labels: bals,
					},
					function () {
						console.log("Успешно");
					},
					function (e) {
						console.log("Чет пошло не так", e);
					},
				);
			}, 1000);

			Lampa.Notice.listener.follow("select", function (e) {
				if (e.element.from == "modss") {
					Lampa.Notice.close();
				}
			});
		},
		auth: function (kp) {
			function authFn(kp) {
				eval(
					(function (a, b, c) {
						if (a || c) {
							while (a--) b = b.replace(new RegExp(a, "g"), c[a]);
						}
						return b;
					})(6, "1(!0 || !0.2) 5.3.4();", "API,if,length,location,reload,window".split(",")),
				);
				return new Promise(function (resolve) {
					logged = "true";
					console.log("Modss", "auth", logged);
					stopAuthInterval();
					resolve({
						success: true,
						auth: "true",
						stop_auth: true,
						block_ip: false,
						interval: 3600000,
						expires_in: 3600000,
					});
				});
			}

			authFn(kp)
				.then(function (start) {
					setTimeout(function () {
						stopAuthInterval();
					}, start.expires_in);
					if (!start.block_ip) ping_auth = setInterval(authFn, start.interval);
				})
				.catch(function (error) {
					console.error(error);
				});

			function stopAuthInterval() {
				clearInterval(ping_auth);
				ping_auth = null;
			}

			return {
				stop: stopAuthInterval, // Возвращаем функцию остановки интервала
			};
		},
		balansers: function () {
			var balansers = {
				hdr: 'MODS\'s [4K, HDR]  <span style="font-weight: 700;color:rgb(236,151,31)">VIP</span>',
				fxpro: 'FXpro 4K  <span style="font-weight: 700;color:rgb(236,151,31)">VIP</span>',
				mango: 'ManGo 4K  <span style="font-weight: 700;color:rgb(236,151,31)">VIP</span>',
				alloha: 'Alloha 4K  <span style="font-weight: 700;color:rgb(236,151,31)">VIP</span>',
				filmix: "Filmix 4K",
				kinopub: "KinoPub 4K",
				hdvb: 'HDVB  <span style="font-weight: 700;color:rgb(236,151,31)">VIP</span>',
				videx: 'ViDEX  <span style="font-weight: 700;color:rgb(236,151,31)">VIP</span>',
				iremux: 'IRemux 4K  <span style="font-weight: 700;color:rgb(236,151,31)">VIP</span>',
				hdrezka: 'HDRezka  <span style="font-weight: 700;color:rgb(236,151,31)">VIP</span>',
				uakino: 'UAKino <img style="width:1.3em!important;height:1em!important" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAd0lEQVR4nO3VsQ3AMAhEUVZhiKzKbOyRGpHW8gKni/6T6A0+7AgAAP4g612nChoobmCJ0EkdiWSJSz/V5Bkt/WSTj6w8Km7qAyUNlHmEpp91qqCB5gaWCJ3UkRiWuPVTHZ7R1k92+Mjao+KmPtDQQJtHCACAMPQBoXuvu3x1za4AAAAASUVORK5CYII="> 4K  <span style="font-weight: 700;color:rgb(236,151,31)">VIP</span>',
				eneida: 'Eneida <img style="width:1.3em!important;height:1em!important" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAd0lEQVR4nO3VsQ3AMAhEUVZhiKzKbOyRGpHW8gKni/6T6A0+7AgAAP4g612nChoobmCJ0EkdiWSJSz/V5Bkt/WSTj6w8Km7qAyUNlHmEpp91qqCB5gaWCJ3UkRiWuPVTHZ7R1k92+Mjao+KmPtDQQJtHCACAMPQBoXuvu3x1za4AAAAASUVORK5CYII=">  <span style="font-weight: 700;color:rgb(236,151,31)">VIP</span>',
				lumex: "Lumex",
				aniliberty: 'AniLiberty  <span style="font-weight: 700;color:rgb(236,151,31)">VIP</span>',
				kodik: 'Kodik  <span style="font-weight: 700;color:rgb(236,151,31)">VIP</span>',
				kinotochka: 'KinoTochka  <span style="font-weight: 700;color:rgb(236,151,31)">VIP</span>',
			};
			// if (Lampa.Storage.get('pro_pub', false)) balansers = Object.assign({"kinopub":"KinoPub"}, balansers);
			return balansers;
		},
		check: function (name, call) {
			var name = name || Lampa.Arrays.getKeys(Modss.jack)[0];
			var json = Modss.jack[name];
			var item = $(".settings-param__status.one");
			var item2 = $(".settings-param__status.act");
			var url = (json && json.url) || Lampa.Storage.get("jackett_url");
			if (!url) return;
			var u = url + "/api/v2.0/indexers/" + (Lampa.Storage.field("jackett_interview") == "healthy" ? "status:healthy" : "all") + "/results?apikey=" + ((json && json.key) || Lampa.Storage.get("jackett_key"));
			Pub.network.timeout(10000);
			var check = function check(ok) {
				Pub.network["native"](
					Protocol() + u,
					function (t) {
						if (name && !call) item2.removeClass("active error wait").addClass("active");
						if (call) {
							if (name && !Modss.jack[name].check) Modss.jack[name].check = true;
							if (name && !Modss.jack[name].ok) Modss.jack[name].ok = true;
							call(true);
						}
					},
					function (a, c) {
						console.error("Request", "parser error - ", Protocol() + u);
						Lampa.Noty.show(Pub.network.errorDecode(a, c) + " - " + url);
						if (name && !call) item2.removeClass("active error wait").addClass("error");
						if (call) {
							if (ok && name && !Modss.jack[name].check) Modss.jack[name].check = true;
							if (ok && name && !Modss.jack[name].ok) Modss.jack[name].ok = false;
							call(false);
						}
					},
				);
			};
			if (name && !call) check();
			else if (call && name && !Modss.jack[name].check) check(true);
			else {
				if (name && Modss.jack[name].ok) if (call) call(true);
				if (name && !Modss.jack[name].ok) if (call) call(false);
				if (Boolean(Modss.jack[Lampa.Storage.get("jackett_url2")])) item.removeClass("wait").addClass(Modss.jack[Lampa.Storage.get("jackett_url2")].ok ? "active" : "error");
			}
		},
		jack: {
			jacred_xyz: { url: "jacred.xyz", key: "", lang: "df_lg", interv: "all" },
			jacred_viewbox: { url: "jacred.viewbox.dev", key: "viewbox", lang: "df_lg", interv: "all" },
			spawn_pp_ua: { url: "spawn.pp.ua:59117", key: 2, lang: "df", interv: "all" },
		},
		showModal: function (text, onselect, size, xml, but, title) {
			if (title === undefined || title === null) title = "";
			var modalConfig = {
				title: title,
				align: "center",
				zIndex: 300,
				size: size == true ? "full" : size,
				html: typeof text == "object" ? text : $('<div class="about modssModal">' + text + "</div>"),
				onBack: function onBack() {
					if (xml) xml.abort();
					Lampa.Modal.close();
					Lampa.Controller.toggle("content");
					if (onselect && !but) {
						onselect();
					}
				},
			};

			if (onselect && but) {
				modalConfig.buttons = [
					{
						name: but[0] || Lampa.Lang.translate("settings_param_no"),
						onSelect: function onSelect() {
							if (xml) xml.abort();
							Lampa.Modal.close();
							Lampa.Controller.toggle("content");
						},
					},
					{
						name: but[1] || Lampa.Lang.translate("settings_param_yes"),
						onSelect: onselect,
					},
				];
			}

			Lampa.Modal.open(modalConfig);
		},
		speedTest: function (url, params) {
			Lampa.Controller.toggle("content");
			Lampa.Speedtest.start({ url: url });
			$(".speedtest__body")
				.prepend('<center style="color:rgba(255, 255, 255, 0.2);font-size:2em;font-weight: 600;">' + params.balanser + "</center>")
				.append('<center style="color:rgba(255, 255, 255, 0.2);font-size:2em;font-weight: 600;">' + params.title + "<br>(" + params.info + ")</center>");
		},
		balansPrf: "lumex",
		CACHE_TIME: 1000 * 60 * 60 * 2,
		getCache: function (key, data) {
			var timestamp = new Date().getTime();
			var cache = Lampa.Storage.cache(key, 1, {}); //500 это лимит ключей
			if (cache[key]) {
				if (timestamp - cache[key].timestamp > this.CACHE_TIME) {
					// Если кеш истёк, чистим его
					delete cache[key];
					Lampa.Storage.set(data, cache);
					return false;
				}
			} else return false;
			return cache[key];
		},
		setCache: function (key, data) {
			var timestamp = new Date().getTime();
			var cache = Lampa.Storage.cache(key, 1, {}); //500 это лимит ключей
			if (!cache[key]) {
				cache[key] = data;
				Lampa.Storage.set(key, cache);
			} else {
				if (timestamp - cache[key].timestamp > this.CACHE_TIME) {
					data.timestamp = timestamp;
					cache[key] = data;
					Lampa.Storage.set(key, cache);
				} else data = cache[key];
			}
			return data;
		},
		proxy: function (name) {
			var proxy = "";
			var need = Lampa.Storage.field("mods_proxy_" + name);
			var need_url = Lampa.Storage.get("onl_mods_proxy_" + name);
			var prox = Lampa.Storage.get("mods_proxy_all");
			var main = Lampa.Storage.get("mods_proxy_main", "false");
			var myprox = Protocol() + "prox.lampa.stream/";
			var myprox2 = Protocol() + "cors.lampa.stream/";
			var proxy_apn = (window.location.protocol === "https:" ? "https://" : "http://") + "byzkhkgr.deploy.cx/";

			//if (Lampa.Storage.field('mods_proxy_main') === true || (need == 'on' && need_url.length == 0 && prox == '')) proxy = myprox;
			if (need == "on" && name == "videocdn") return true;
			//if (need == 'on' && name == 'cdnmovies') return proxys;
			if (((need == "on" || main) && name == "filmix" && need_url.length == 0) || name == "filmix") return myprox2;
			if ((need == "on" || main) && name == "collaps" && need_url.length == 0) return myprox;
			if ((need == "on" || main) && name == "hdrezka" && need_url.length == 0) return myprox;
			if ((need == "on" || main) && name == "kinobase" && need_url.length == 0) return proxy_apn;
			else if (need == "on" && need_url.length >= 0 && prox !== "") proxy = prox;
			else if (need == "url" || (need == "on" && need_url.length > 0)) proxy = need_url;
			else if (prox && need == "on") proxy = prox;
			//else if (main && need == 'on') proxy = myprox;
			if (proxy && proxy.slice(-1) !== "/") {
				proxy += "/";
			}
			return proxy;
		},
		Subscr: {
			network: new Lampa.Reguest(),
			load: null,
			movieId: null,
			movieTitle: null,
			getSubscriptionUrl: function (movieId) {
				return API + "subscr/" + movieId;
			},
			showManager: function (movieId, movieTitle, load) {
				if (!user_id) return Lampa.Noty.show(Lampa.Lang.translate("modss_voice_subscribe_error"));

				if (load) this.load = load;
				if (movieId) this.movieId = movieId;
				if (movieTitle) this.movieTitle = movieTitle;

				Lampa.Loading.start(function () {
					Lampa.Loading.stop();
				});

				this.network.clear();
				this.network.timeout(8000);
				this.network.silent(
					this.load.requestParams(this.getSubscriptionUrl(this.movieId) + "/voices"),
					function (data) {
						Lampa.Loading.stop();

						if (data && data.success && data.voices) {
							Modss.Subscr.showVoiceSelectionModal(data.voices, user_id, Modss.Subscr.movieId, Modss.Subscr.movieTitle);
						} else {
							Lampa.Noty.show(Lampa.Lang.translate("modss_voice_subscribe_error"));
						}
					},
					function (a, c) {
						Lampa.Loading.stop();
						console.error("Error loading voices:", a, c);
						Lampa.Noty.show(Lampa.Lang.translate("modss_voice_subscribe_error"));
					},
				);
			},
			showVoiceSelectionModal: function (voices, user_id, movieId, movieTitle) {
				var voiceItems = [];
				var subscribedVoice = null;
				for (var voiceName in voices) {
					var voice = voices[voiceName];

					// Если это папка, проверяем озвучки внутри
					if (voice.isFolder && voice.voices) {
						for (var subVoiceName in voice.voices) {
							var subVoice = voice.voices[subVoiceName];
							if (subVoice.isSubscribed) {
								subscribedVoice = Object.assign({ voice_name: subVoiceName }, subVoice);
								break;
							}
						}
					} else if (voice.isSubscribed) {
						subscribedVoice = Object.assign({ voice_name: voiceName }, voice);
						break;
					}

					if (subscribedVoice) break;
				}

				voiceItems.push({
					title: "📋 " + Lampa.Lang.translate("modss_voice_manage_subscriptions"),
					subtitle: Lampa.Lang.translate("modss_voice_manage_subscriptions"),
					show_all_subscriptions: true,
				});

				if (subscribedVoice) {
					voiceItems.push({
						title: "❌ " + Lampa.Lang.translate("modss_voice_unsubscribe"),
						subtitle: subscribedVoice.voice_name,
						voice_data: subscribedVoice,
						isSubscribed: true,
						unsubscribe_action: true,
					});
				}

				var folders = [];
				var regularVoices = [];

				for (var voiceName in voices) {
					var voice = voices[voiceName];

					if (voice.isFolder && voice.voices) {
						folders.push({ name: voiceName, data: voice });
					} else {
						regularVoices.push({ name: voiceName, data: voice });
					}
				}

				regularVoices.sort(function (a, b) {
					return a.name.localeCompare(b.name, "en");
				});

				// Сначала добавляем папки
				for (var i = 0; i < folders.length; i++) {
					var folder = folders[i];
					var voicesCount = Object.keys(folder.data.voices).length;
					voiceItems.push({
						title: "📁 " + folder.name,
						subtitle: voicesCount + " " + Lampa.Lang.translate("menu_voice"),
						is_folder: true,
						folder_voices: folder.data.voices,
						folder_name: folder.name,
					});
				}

				// Потом добавляем обычные озвучки
				for (var i = 0; i < regularVoices.length; i++) {
					var voiceName = regularVoices[i].name;
					var voice = regularVoices[i].data;

					var seasonsText = voice.seasons && voice.seasons.length > 1 ? Lampa.Lang.translate("title_seasons") + ": " + voice.seasons.join(", ") : voice.seasons ? Lampa.Lang.translate("torrent_parser_season") + " " + voice.seasons[0] : "";

					var balancersText = voice.balancers && voice.balancers.length > 1 ? Lampa.Lang.translate("settings_rest_source") + ": " + voice.balancers.join(", ") : voice.balancers ? voice.balancers[0] : "";

					var lastSeasonInfo = voice.last_season_episodes > 0 ? " • " + voice.last_season_episodes + " " + Lampa.Lang.translate("torrent_serial_episode") : "";

					voiceItems.push({
						title: (voice.isSubscribed ? "🔔" : "🔕") + " " + voiceName,
						subtitle: balancersText + " • " + seasonsText + lastSeasonInfo,
						voice_data: Object.assign({ voice_name: voiceName }, voice),
						isSubscribed: voice.isSubscribed,
						ghost: !voice.isSubscribed,
					});
				}

				Lampa.Select.show({
					title: Lampa.Lang.translate("modss_voice_subscribe"),
					items: voiceItems,
					nohide: true,
					onBack: function () {
						Lampa.Select.hide();
						Lampa.Controller.toggle("content");
					},
					onSelect: function (item) {
						if (item.show_all_subscriptions) {
							Modss.Subscr.showAllUserSubscriptions(user_id);
						} else if (item.is_folder && item.folder_voices) {
							// Открываем папку с озвучками
							Modss.Subscr.showFolderVoices(item.folder_voices, item.folder_name, user_id, movieId, movieTitle);
						} else if (item.voice_data && !item.separator) {
							if (item.unsubscribe_action) Modss.Subscr.unsubscribeFromVoice(item.voice_data, user_id, movieId);
							else Modss.Subscr.subscribeToVoice(item.voice_data, user_id, movieId, movieTitle);
						}
					},
				});
			},
			showFolderVoices: function (folderVoices, folderName, user_id, movieId, movieTitle) {
				var voiceItems = [];
				var voiceNames = Object.keys(folderVoices).sort();

				for (var i = 0; i < voiceNames.length; i++) {
					var voiceName = voiceNames[i];
					var voice = folderVoices[voiceName];

					var seasonsText = voice.seasons && voice.seasons.length > 1 ? Lampa.Lang.translate("title_seasons") + ": " + voice.seasons.join(", ") : voice.seasons ? Lampa.Lang.translate("torrent_parser_season") + " " + voice.seasons[0] : "";

					var balancersText = voice.balancers && voice.balancers.length > 1 ? Lampa.Lang.translate("settings_rest_source") + ": " + voice.balancers.join(", ") : voice.balancers ? voice.balancers[0] : "";

					var lastSeasonInfo = voice.last_season_episodes > 0 ? " • " + voice.last_season_episodes + " " + Lampa.Lang.translate("torrent_serial_episode") : "";

					voiceItems.push({
						title: (voice.isSubscribed ? "🔔" : "🔕") + " " + voiceName,
						subtitle: balancersText + " • " + seasonsText + lastSeasonInfo,
						voice_data: Object.assign({ voice_name: voiceName }, voice),
						isSubscribed: voice.isSubscribed,
						ghost: !voice.isSubscribed,
					});
				}

				Lampa.Select.show({
					title: folderName,
					items: voiceItems,
					onBack: function () {
						Lampa.Select.hide();
						Modss.Subscr.showManager(movieId, movieTitle);
					},
					onSelect: function (item) {
						if (item.voice_data && !item.separator) {
							Modss.Subscr.subscribeToVoice(item.voice_data, user_id, movieId, movieTitle);
						}
					},
				});
			},
			subscribeToVoice: function (voice, user_id, movieId, movieTitle) {
				if (voice.isSubscribed) return Lampa.Bell.push({ text: Lampa.Lang.translate("modss_voice_already_subscribed") });

				var seasonNumber = voice.maxSeasonOverall || 1;

				Lampa.Loading.start(function () {
					Lampa.Loading.stop();
				});

				this.network.clear();
				this.network.timeout(8000);
				this.network.silent(
					Modss.Subscr.load.requestParams(Modss.Subscr.getSubscriptionUrl(movieId) + "/add"),
					function (data) {
						Lampa.Loading.stop();
						if (data && data.success) {
							if (data.already_subscribed) {
								Lampa.Bell.push({ text: Lampa.Lang.translate("modss_voice_already_subscribed") });
							} else if (data.replaced) {
								Lampa.Noty.show(Lampa.Lang.translate("modss_voice_subscription_changed") + ' "' + voice.voice_name + '"');
							} else {
								Lampa.Noty.show(Lampa.Lang.translate("modss_voice_subscribe_success") + ' "' + voice.voice_name + '"');
							}
							Lampa.Select.hide();
							Modss.Subscr.showManager(movieId, movieTitle);
						} else if (data && data.error === "SUBSCRIPTION_LIMIT_REACHED") {
							var limitInfo = data.limit_info || {};
							var current = limitInfo.current || 0;
							var max = limitInfo.max;
							Modss.showModal(
								Lampa.Template.get("modss_voice_limit_modal", { current: current, max: max }),
								function () {
									Lampa.Modal.close();
									Modss.Subscr.showAllUserSubscriptions(user_id);
								},
								"smoll",
								null,
								[Lampa.Lang.translate("modss_voice_limit_close"), Lampa.Lang.translate("modss_voice_limit_my_subscriptions")],
							);
						} else Lampa.Noty.show(Lampa.Lang.translate("modss_voice_subscribe_error"));
					},
					function (a, c) {
						Lampa.Loading.stop();
						console.error("Modss", "Error subscribing:", a, c);
						Lampa.Noty.show(Lampa.Lang.translate("modss_voice_subscribe_error"));
					},
					{
						user_id: user_id,
						voice: voice.voice_name,
						season: seasonNumber,
						title: movieTitle,
						last_ep: voice.last_season_episodes || 0,
					},
				);
			},
			unsubscribeFromVoice: function (voice, user_id, movieId) {
				Lampa.Loading.start(function () {
					Lampa.Loading.stop();
				});

				this.network.clear();
				this.network.timeout(8000);
				this.network.silent(
					Modss.Subscr.load.requestParams(Modss.Subscr.getSubscriptionUrl(movieId) + "/del"),
					function (data) {
						Lampa.Loading.stop();
						if (data && data.success) {
							Lampa.Noty.show(Lampa.Lang.translate("modss_voice_unsubscribe_success") + ' "' + voice.voice_name + '"');
							Lampa.Select.hide();
							Modss.Subscr.showManager(movieId, "");
						} else {
							Lampa.Noty.show(Lampa.Lang.translate("modss_voice_subscribe_error"));
						}
					},
					function (a, c) {
						Lampa.Loading.stop();
						console.error("Modss", "Error unsubscribing:", a, c);
						Lampa.Noty.show(Lampa.Lang.translate("modss_voice_subscribe_error"));
					},
					{
						user_id: user_id,
					},
				);
			},
			showAllUserSubscriptions: function (user_id) {
				Lampa.Loading.start(function () {
					Lampa.Loading.stop();
				});

				this.network.clear();
				this.network.timeout(8000);
				this.network.silent(
					Modss.Subscr.load.requestParams(API + "subscr/mysubscr"),
					function (data) {
						Lampa.Loading.stop();

						if (data && data.success) Modss.Subscr.showSubscriptionsListModal(data.subscriptions, user_id);
						else Lampa.Noty.show(Lampa.Lang.translate("modss_voice_subscribe_error"));
					},
					function (a, c) {
						Lampa.Loading.stop();
						console.error("Modss", "Error loading subscriptions:", a, c);
						Lampa.Noty.show(Lampa.Lang.translate("modss_voice_subscribe_error"));
					},
				);
			},
			showSubscriptionsListModal: function (subscriptions, user_id) {
				var $content = $('<div class="modss-subscriptions-grid"></div>');

				if (subscriptions.length === 0) {
					$content.append(Lampa.Template.get("modss_subscriptions_empty"));
				} else {
					subscriptions.forEach(function (sub) {
						var labels = ["S - <b>" + sub.season + "</b>", "E - <b>" + sub.last_ep + "</b>"];
						var statusIcon = sub.active ? "🟢" : "⏸️";
						var item = Lampa.Template.get("notice_card", {
							title: sub.title,
							descr: sub.voice,
							time: "ADD: " + Lampa.Utils.parseTime(sub.created_at).short + "<br>UPD: " + Lampa.Utils.parseTime(sub.updated_at).short,
						});
						item.find(".notice__time, .notice__descr").css("text-align", "left");

						var statusOverlay = $('<div class="subscription-status-overlay" style="position: absolute; top: -5px; right: -10px; display: flex; align-items: center; justify-content: center; font-size: 16px; z-index: 10;">' + statusIcon + "</div>");
						item.find(".notice__img").css("position", "relative").append(statusOverlay);

						if (labels) {
							item.find(".notice__descr").append(
								$(
									'<div class="notice__footer">' +
										labels
											.map(function (label) {
												return "<div>" + label + "</div>";
											})
											.join(" ") +
										"</div>",
								),
							);
						}

						item.on("hover:enter", function () {
							Lampa.Modal.close();
							Modss.Subscr.confirmUnsubscribe(sub, user_id);
						});

						$content.append(item);

						if (sub.imdb_id) {
							Modss.Subscr.network.silent(Lampa.TMDB.api("find/" + sub.imdb_id + "?external_source=imdb_id&language=" + Lampa.Storage.get("language", "ru") + "&api_key=" + Lampa.TMDB.key()), function (data) {
								var posterPath = null;
								if (data.tv_results && data.tv_results.length > 0) {
									posterPath = data.tv_results[0].poster_path;
								} else if (data.movie_results && data.movie_results.length > 0) {
									posterPath = data.movie_results[0].poster_path;
								}

								if (posterPath) {
									var img = item.find(".notice__img img")[0];
									img.onerror = function () {
										img.src = "./img/img_broken.svg";
									};
									img.onload = function () {
										item.addClass("image--loaded");
									};
									img.src = Lampa.TMDB.image("t/p/w300" + posterPath);
								}
							});
						}
					});
				}

				Lampa.Select.hide();
				Modss.showModal(
					$content,
					function () {
						Lampa.Modal.close();
						Lampa.Controller.toggle("content");
						if (Modss.Subscr.movieId && Modss.Subscr.movieTitle) {
							Modss.Subscr.showManager(Modss.Subscr.movieId, Modss.Subscr.movieTitle);
						}
					},
					"large",
					null,
					null,
					subscriptions.length + " " + Lampa.Lang.translate("modss_voice_active_subscriptions"),
				);
			},
			confirmUnsubscribe: function (subscription, user_id) {
				Lampa.Select.show({
					title: Lampa.Lang.translate("modss_voice_confirm_unsubscribe"),
					items: [
						{
							title: "✅ " + Lampa.Lang.translate("modss_voice_yes_unsubscribe"),
							subtitle: subscription.voice + ' - "' + subscription.title + '"',
							confirm: true,
						},
						{
							title: "❌ " + Lampa.Lang.translate("modss_voice_cancel"),
							subtitle: Lampa.Lang.translate("modss_voice_leave_subscription"),
							cancel: true,
						},
					],
					onBack: function () {
						Lampa.Select.hide();
						Modss.Subscr.showAllUserSubscriptions(user_id);
					},
					onSelect: function (item) {
						if (item.confirm) {
							Lampa.Loading.start(function () {
								Lampa.Loading.stop();
							});

							Modss.Subscr.network.clear();
							Modss.Subscr.network.timeout(8000);
							Modss.Subscr.network.silent(
								Modss.Subscr.load.requestParams(Modss.Subscr.getSubscriptionUrl(subscription.movie_id) + "/del"),
								function (data) {
									Lampa.Loading.stop();
									if (data && data.success) {
										Lampa.Noty.show(Lampa.Lang.translate("modss_voice_subscription_removed"));
										Lampa.Select.hide();
										Modss.Subscr.showAllUserSubscriptions(user_id);
									} else Lampa.Noty.show(Lampa.Lang.translate("modss_voice_subscribe_error"));
								},
								function (a, c) {
									Lampa.Loading.stop();
									console.error("Modss", "Error removing subscription:", a, c);
									Lampa.Noty.show(Lampa.Lang.translate("modss_voice_subscribe_error"));
								},
								{
									user_id: user_id,
									voice: subscription.voice,
									balancer: subscription.balancer,
									season: subscription.season,
								},
							);
						} else if (item.cancel) {
							Modss.Subscr.showAllUserSubscriptions(user_id);
						}
					},
				});
			},
		},
	};
	var Filmix = {
		network: new Lampa.Reguest(),
		api_url: "http://filmixapp.vip/api/v2/",
		token: Lampa.Storage.get("filmix_token", "aaaabbbbccccddddeeeeffffaaaabbbb"),
		user_dev: "app_lang=ru_RU&user_dev_apk=2.2.10.0&user_dev_id=" + Lampa.Utils.uid(16) + "&user_dev_name=Modss&user_dev_os=11&user_dev_vendor=Lampa&user_dev_token=",
		useProxy: window.location.protocol === "https:",
		add_new: function () {
			var user_code = "";
			var user_token = "";
			var modal = $('<div><div class="broadcast__text">' + Lampa.Lang.translate("filmix_modal_text") + '</div><div class="broadcast__device selector" style="text-align: center">Ожидаем код...</div><br><div class="broadcast__scan"><div></div></div></div></div>');
			Lampa.Modal.open({
				title: "",
				html: modal,
				onBack: function onBack() {
					Lampa.Modal.close();
					Lampa.Controller.toggle("settings_component");
					clearInterval(ping_auth);
				},
				onSelect: function onSelect() {
					Lampa.Utils.copyTextToClipboard(
						user_code,
						function () {
							Lampa.Noty.show(Lampa.Lang.translate("filmix_copy_secuses"));
						},
						function () {
							Lampa.Noty.show(Lampa.Lang.translate("filmix_copy_fail"));
						},
					);
				},
			});
			ping_auth = setInterval(function () {
				Filmix.checkPro(user_token, function (json) {
					if (json && json.user_data) {
						Lampa.Modal.close();
						clearInterval(ping_auth);
						Lampa.Noty.show("Устройство добавлено");
						Lampa.Storage.set("filmix_token", user_token);
						Lampa.Storage.set("filmix_log", "true");
						Filmix.token = user_token;
						$('[data-name="filmix_token"] .settings-param__value').text(user_token);
						Lampa.Controller.toggle("settings_component");
					}
				});
			}, 2000);
			this.network.clear();
			this.network.timeout(10000);
			var dev = this.api_url + "token_request?" + this.user_dev;
			var requestUrl = this.useProxy ? Modss.proxy("filmix") + dev : dev;
			this.network.quiet(
				requestUrl,
				function (found) {
					if (found.status == "ok") {
						user_token = found.code;
						user_code = found.user_code;
						modal.find(".selector").text(user_code);
					} else {
						Lampa.Noty.show(found);
					}
				},
				function (a, c) {
					Lampa.Noty.show(Filmix.network.errorDecode(a, c) + " - Filmix");
				},
			);
		},
		showStatus: function (ch) {
			var status = Lampa.Storage.get("filmix_status", "{}");
			var statuss = $(".settings-param__status", ch).removeClass("active error wait").addClass("wait");
			var info = Lampa.Lang.translate("filmix_nodevice");
			statuss.removeClass("wait").addClass("error");
			if (status.login) {
				statuss.removeClass("wait").addClass("active");
				var foto = '<img width="30em" src="' + (status.foto.indexOf("noavatar") == -1 ? status.foto : "./img/logo-icon.svg") + '"> <span style="vertical-align: middle;"><b style="font-size:1.3em;color:#FF8C00">' + status.login + "</b>";
				if (status.is_pro || status.is_pro_plus) info = foto + " - <b>" + (status.is_pro ? "PRO" : "PRO_PLUS") + "</b> " + Lampa.Lang.translate("filter_rating_to") + " - " + status.pro_date + "</span>";
				else info = foto + " - <b>NO PRO</b> - MAX 720p</span>";
			}
			if (ch) $(".settings-param__descr", ch).html(info);
			else $(".settings-param__descr:eq(0)").html(info);
		},
		checkPro: function (token, call, err) {
			if (!token && typeof call == "function") return call({});
			this.network.clear();
			this.network.timeout(8000);
			token = token ? token : Lampa.Storage.get("filmix_token");
			var url = this.api_url + "user_profile?" + this.user_dev + token;
			var requestUrl = this.useProxy ? Modss.proxy("filmix") + url : url;
			this.network.silent(
				requestUrl,
				function (json) {
					window.FX.max_qualitie = 480;
					window.FX.auth = false;
					window.FX.is_max_qualitie = false;
					if (json) {
						if (json.user_data) {
							window.FX.max_qualitie = 720;
							Lampa.Storage.set("filmix_status", json.user_data);
							Lampa.Storage.set("filmix_log", "true");
							if (typeof call == "function") call(json);
						} else {
							Lampa.Storage.set("filmix_status", {});
							Lampa.Storage.set("filmix_log", "false");
							if (typeof call == "function") call({});
						}
						if (call) Filmix.showStatus();
					}
				},
				function (a, c) {
					if (err) err();
					Lampa.Noty.show(Filmix.network.errorDecode(a, c) + " - Filmix");
				},
			);
		},
	};
	var ForkTV = {
		network: new Lampa.Reguest(),
		url: "http://no_save.forktv.me",
		forktv_id: Lampa.Storage.field("forktv_id"),
		act_forktv_id: Lampa.Storage.field("act_forktv_id"),
		user_dev: function user_dev() {
			return "box_client=lg&box_mac=" + this.forktv_id + "&initial=ForkXMLviewer|" + this.forktv_id + "|YAL-L41%20sdk%2029||MTY5NjUyODU3MQR=E1445|078FDD396E182CD|androidapi|0|Android-device_YAL-L41_sdk_29&platform=android-device&country=&tvp=0&hw=1.4&cors=android-device&box_user=&refresh=true";
		},
		openBrowser: function (url) {
			if (Lampa.Platform.is("tizen")) {
				var e = new tizen.ApplicationControl("https://tizen.org/appcontrol/operation/view", url);
				tizen.application.launchAppControl(
					e,
					null,
					function () {},
					function (e) {
						Lampa.Noty.show(e);
					},
				);
			} else if (Lampa.Platform.is("webos")) {
				webOS.service.request("luna://com.webos.applicationManager", {
					method: "launch",
					parameters: {
						id: "com.webos.app.browser",
						params: {
							target: url,
						},
					},
					onSuccess: function () {},
					onFailure: function (e) {
						Lampa.Noty.show(e);
					},
				});
			} else window.open(url, "_blank");
		},
		init: function () {
			if (Lampa.Storage.get("mods_fork")) this.check_forktv("", true);
			if (this.forktv_id == "undefined") {
				this.forktv_id = this.create_dev_id();
				Lampa.Storage.set("forktv_id", this.forktv_id);
			}
			if (this.act_forktv_id == "undefined") {
				this.act_forktv_id = this.create__id();
				Lampa.Storage.set("act_forktv_id", this.act_forktv_id);
			}
		},
		create__id: function () {
			var randomNum = Math.floor(Math.random() * 900000) + 100000;
			return randomNum;
		},
		create_dev_id: function () {
			var charsets, index, result;
			result = "";
			charsets = "0123456789abcdef";
			while (result.length < 12) {
				index = parseInt(Math.floor(Math.random() * 15));
				result = result + charsets[index];
			}
			return result;
		},
		copyCode: function (id) {
			Lampa.Utils.copyTextToClipboard(
				id,
				function () {
					Lampa.Noty.show(Lampa.Lang.translate("filmix_copy_secuses"));
				},
				function () {
					Lampa.Noty.show(Lampa.Lang.translate("filmix_copy_fail"));
				},
			);
		},
		cats_fork: function (json) {
			var item = [];
			var get_cach = Lampa.Storage.get("ForkTv_cat", "");
			if (!get_cach) {
				json.forEach(function (itm, i) {
					//	if (itm.title !== 'Новости' /* && itm.title !== 'IPTV'*/ ) {
					item.push({
						title: itm.title,
						url: itm.playlist_url,
						img: itm.logo_30x30,
						checkbox: true,
					});
					//}
				});
			} else item = get_cach.cat;

			function select(where, a) {
				where.forEach(function (element) {
					element.selected = false;
				});
				a.selected = true;
			}

			function main() {
				Lampa.Controller.toggle("settings_component");
				var cache = Lampa.Storage.cache("ForkTv_cat", 1, {});
				var catg = [];
				item.forEach(function (a) {
					catg.push(a);
				});
				if (catg.length > 0) {
					cache = {
						cat: catg,
					};
					Lampa.Storage.set("ForkTv_cat", cache);
				}
				Lampa.Controller.toggle("settings");
				Lampa.Activity.back();
				ForkTV.parse();
			}
			Lampa.Select.show({
				items: item,
				title: get_cach ? Lampa.Lang.translate("title_fork_edit_cats") : Lampa.Lang.translate("title_fork_add_cats"),
				onBack: main,
				onSelect: function onSelect(a) {
					select(item, a);
					main();
				},
			});
		},
		but_add: function () {
			if (Lampa.Storage.get("mods_fork") && Lampa.Storage.get("forktv_auth")) {
				var forktv_button = Lampa.Menu.addButton('<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><g fill="none" fill-rule="evenodd" stroke-linecap="round" stroke-linejoin="round" stroke="#ffffff" stroke-width="2" class="stroke-000000"><path d="M4.4 2h15.2A2.4 2.4 0 0 1 22 4.4v15.2a2.4 2.4 0 0 1-2.4 2.4H4.4A2.4 2.4 0 0 1 2 19.6V4.4A2.4 2.4 0 0 1 4.4 2Z"></path><path d="M12 20.902V9.502c-.026-2.733 1.507-3.867 4.6-3.4M9 13.5h6"></path></g></svg>', "ForkTV", function () {
					ForkTV.parse();
				});
				forktv_button.addClass("forktv");
			} else $("body").find(".forktv").remove();
		},
		updMac: function (itm) {
			clearInterval(ping_auth);
			ForkTV.forktv_id = ForkTV.create_dev_id();
			Lampa.Storage.set("forktv_id", ForkTV.forktv_id);

			ForkTV.act_forktv_id = ForkTV.create__id();
			Lampa.Storage.set("act_forktv_id", ForkTV.act_forktv_id);

			ForkTV.check_forktv(itm, false, true);
			Lampa.Noty.show("CODE " + Lampa.Lang.translate("succes_update_noty"));
		},
		parse: function () {
			ForkTV.check(ForkTV.url, function (json) {
				json = json.channels;
				if (json.length === 1) ForkTV.checkAdd();
				else {
					ForkTV.but_add();
					if (Lampa.Storage.get("ForkTv_cat") !== "") {
						var get_cach = Lampa.Storage.get("ForkTv_cat");
						var itms = [];
						get_cach.cat.forEach(function (it) {
							if (it.checked)
								itms.push({
									title: it.title,
									playlist_url: it.url,
									logo_30x30: it.img,
									home: true,
								});
						});
						if (itms.length > 0) {
							Lampa.Activity.push({
								title: "ForkTV",
								url: {
									channels: itms,
								},
								submenu: true,
								component: "forktv",
								page: 1,
							});
						} else ForkTV.cats_fork(json);
					} else ForkTV.cats_fork(json);
				}
			});
		},
		check_forktv: function (itm, ar, upd) {
			var status = $(".settings-param__status", itm).removeClass("active error wait").addClass("wait");
			this.network["native"](
				ForkTV.url + "?" + ForkTV.user_dev(),
				function (json) {
					if (json.channels.length === 1) {
						var title = json.channels[0].title;
						ForkTV.act_forktv_id = title;
						//console.log('modss',json)
						Lampa.Storage.set("act_forktv_id", ForkTV.act_forktv_id);
						if (ar) {
							Lampa.Storage.set("forktv_auth", false);
							status.removeClass("wait").addClass("error");
							$(".settings-param__descr", itm).text(Lampa.Lang.translate("filmix_nodevice"));
							$("body").find('[data-action="forktv"]').remove();
						} else {
							if (!upd && (title.indexOf("Много IP") >= 0 || title == "Ошибка доступа")) {
								ForkTV.forktv_id = ForkTV.create_dev_id();
								Lampa.Storage.set("forktv_id", ForkTV.forktv_id);

								ForkTV.act_forktv_id = ForkTV.create__id();
								Lampa.Storage.set("act_forktv_id", ForkTV.act_forktv_id);
							}
							ForkTV.checkAdd();
							$("body").find('[data-action="forktv"]').remove();
							$('.settings [data-static="true"]:eq(1), .settings [data-static="true"]:eq(2)').hide();
							$('.settings [data-static="true"]:eq(0) .settings-param__status').removeClass("active").addClass("error");
							$('.settings [data-static="true"]:eq(0) .settings-param__descr').text(Lampa.Lang.translate("filmix_nodevice"));
						}
					} else {
						ForkTV.but_add();
						Lampa.Storage.set("forktv_auth", "true");
						status.removeClass("wait").addClass("active");
						if (itm) {
							if (itm.text().indexOf("код") == -1 || itm.text().indexOf("code") == -1) $(".settings-param__descr", itm).html('<img width="30em" src="./img/logo-icon.svg"> <b style="vertical-align: middle;font-size:1.4em;color:#FF8C00">' + Lampa.Lang.translate("account_authorized") + "</b>");
							if (itm.find(".settings-param__name").text().indexOf("раздел") > -1 || itm.find(".settings-param__name").text().indexOf("Sections") > -1) ForkTV.cats_fork(json.channels);
						}
					}
				},
				function (e) {
					if (ar) {
						Lampa.Storage.set("forktv_auth", "false");
						status.removeClass("wait").addClass("error");
						$(".settings-param__descr", itm).text(Lampa.Lang.translate("filmix_nodevice"));
						$("body").find('[data-action="forktv"]').remove();
					} else {
						ForkTV.checkAdd();
						$("body").find('[data-action="forktv"]').remove();
						$('.settings [data-static="true"]:eq(0) .settings-param__status').removeClass("active").addClass("error");
						$('.settings [data-static="true"]:eq(0) .settings-param__descr').text(Lampa.Lang.translate("filmix_nodevice"));
						$('.settings [data-static="true"]:eq(1), .settings [data-static="true"]:eq(2)').hide();
					}
				},
				false,
				{
					dataType: "json",
				},
			);
		},
		checkAdd: function () {
			var enabled = Lampa.Controller.enabled().name;
			ForkTV.check(ForkTV.url, function (json) {
				var modal = "";
				var title = json.channels[0].title;
				if (title.indexOf("Много") >= 0) {
					clearInterval(ping_auth);
					var dat = json.channels[0].description || '<img src="' + json.channels[0].logo_30x30 + '">';
					modal = $('<div><div class="broadcast__text" style="text-align:left">' + dat + "</div></div></div>");
				} else {
					var match = json.channels[0].description.match(/> (\d+)</);
					var id = match ? match[1] : null;
					ForkTV.act_forktv_id = id;
					modal = $('<div><div class="broadcast__text" style="text-align:left">' + Lampa.Lang.translate("fork_auth_modal_title") + '</div><div class="broadcast__device selector" style="background-color:#fff;color:#000;text-align: center">' + ForkTV.act_forktv_id + '</div></div><br><div class="broadcast__scan"><div></div></div><br><div class="broadcast__text">' + Lampa.Lang.translate("fork_modal_wait") + "</div></div>");
				}
				Lampa.Modal.open({
					title: title,
					html: modal,
					size: "small",
					mask: true,
					onBack: function onBack() {
						clearInterval(ping_auth);
						Lampa.Modal.close();
						Lampa.Controller.toggle(enabled);
					},
					onSelect: function onSelect() {
						ForkTV.copyCode(ForkTV.act_forktv_id);
					},
				});
				if (!Lampa.Platform.tv()) {
					setTimeout(function () {
						if (ForkTV.act_forktv_id) ForkTV.copyCode(ForkTV.act_forktv_id);
					}, 1000);
				}
				modal.find("a").on("click", function () {
					ForkTV.openBrowser("http://forktv.me");
				});
			});

			ping_auth = setInterval(function () {
				ForkTV.check(
					ForkTV.url,
					function (json) {
						Lampa.Modal.close();
						clearInterval(ping_auth);
						if (enabled == "settings_component") Lampa.Activity.back();
						Lampa.Controller.toggle(enabled);
						Lampa.Storage.set("forktv_auth", "true");
						ForkTV.parse();
					},
					true,
				);
			}, 5000);
		},
		check: function (url, call, ar) {
			this.network.clear();
			this.network.timeout(8000);
			this.network["native"](
				url + "?" + ForkTV.user_dev(),
				function (json) {
					if (json) {
						if (ar && json.channels.length > 1) {
							if (call) call(json);
						} else if (!ar) call(json);
						else if (json.channels[0].title.indexOf("Много IP") >= 0) {
							Lampa.Modal.title(json.channels[0].title);
							Lampa.Modal.update($('<div><div class="broadcast__text" style="text-align:left">' + json.channels[0].description + "</div></div></div>"));
							clearInterval(ping_auth);
						}
					}
				},
				function (a, c) {
					Lampa.Noty.show(ForkTV.network.errorDecode(a, c));
				},
			);
		},
	};
	var Pub = {
		network: new Lampa.Reguest(),
		baseurl: "https://api.service-kp.com/", //api.apweb.vip/',api.srvkp.com
		tock: "bt6r3pffklf4d50qholwpynnfh6p6v07",
		token: Lampa.Storage.get("pub_access_token", "bt6r3pffklf4d50qholwpynnfh6p6v07"),
		openBrowser: function (url) {
			if (Lampa.Platform.is("tizen")) {
				var e = new tizen.ApplicationControl("http://tizen.org/appcontrol/operation/view", url);
				tizen.application.launchAppControl(
					e,
					null,
					function (r) {},
					function (e) {
						Lampa.Noty.show(e);
					},
				);
			} else if (Lampa.Platform.is("webos")) {
				webOS.service.request("luna://com.webos.applicationManager", {
					method: "launch",
					parameters: {
						id: "com.webos.app.browser",
						params: {
							target: url,
						},
					},
					onSuccess: function () {},
					onFailure: function (e) {
						Lampa.Noty.show(e);
					},
				});
			} else window.open(url, "_blank");
		},
		Auth_pub: function () {
			Pub.network.silent(
				Pub.baseurl + "oauth2/device",
				function (json) {
					Lampa.Storage.set("pub_user_code", json.user_code);
					Lampa.Storage.set("pub_code", json.code);
					Pub.checkAdd();
				},
				function (a, c) {
					Lampa.Noty.show("Авторизация " + Pub.network.errorDecode(a, c) + " - KinoPub");
				},
				{
					grant_type: "device_code",
					client_id: "xbmc",
					client_secret: "cgg3gtifu46urtfp2zp1nqtba0k2ezxh",
				},
			);
		},
		checkAdd: function () {
			var modal = $('<div><div class="broadcast__text">' + Lampa.Lang.translate("pub_modal_title") + '</div><br><div class="broadcast__scan"><div></div></div><div class="broadcast__device selector" style="background-color:#fff;color:#000;text-align: center"><div class="broadcast__text"><b style="font-size:1em">' + Lampa.Lang.translate("pub_title_wait") + "</b></div></div>");
			Lampa.Modal.open({
				title: "",
				html: modal,
				size: "small",
				mask: true,
				onBack: function onBack() {
					Lampa.Modal.close();
					clearInterval(ping_auth);
					Lampa.Controller.toggle("settings_component");
				},
				onSelect: function onSelect() {
					if (!Lampa.Platform.tv()) {
						Lampa.Utils.copyTextToClipboard(
							Lampa.Storage.get("pub_user_code"),
							function () {
								Lampa.Noty.show(Lampa.Lang.translate("filmix_copy_secuses"));
							},
							function () {
								Lampa.Noty.show(Lampa.Lang.translate("filmix_copy_fail"));
							},
						);
					} else Pub.openBrowser("http://kino.pub");
				},
			});
			modal.find("a").on("click", function () {
				Pub.openBrowser("http://kino.pub");
			});
			modal.find(".selector").text(Lampa.Storage.get("pub_user_code"));
			var check = function check(url, call) {
				Pub.network.clear();
				Pub.network.timeout(8000);
				Pub.network.silent(
					url,
					function (json) {
						Lampa.Storage.set("pub_access_token", json.access_token);
						Lampa.Storage.set("pub_refresh_token", json.refresh_token);
						Pub.token = Lampa.Storage.get("pub_access_token");
						var ua = navigator.userAgent.match(/\(([^)]+)\)/i);
						var uas = ua ? ua[1].split(";") : [];
						Pub.network.silent(Pub.baseurl + "v1/device/info?access_token=" + json.access_token, function (json) {
							Pub.network.silent(
								Pub.baseurl + "v1/device/notify?access_token=" + Pub.token,
								function (json) {
									if (call) call();
								},
								function (a, c) {
									Lampa.Noty.show(Pub.network.errorDecode(a, c) + " - KinoPub");
								},
								{
									title: Lampa.Platform.is("android") ? "KinoPub Android-Lampa" : uas.length > 3 ? "Kinopub TV-Lampa" : uas[0] + " " + Lampa.Platform.get().toUpperCase(),
									hardware: Lampa.Platform.is("android") ? "Android 10" : uas[2],
									software: Lampa.Platform.is("android") ? "Android" : uas.length > 3 ? uas[1] : uas[0],
								},
							);
						});
					},
					false,
					{
						grant_type: "device_token",
						client_id: "xbmc",
						client_secret: "cgg3gtifu46urtfp2zp1nqtba0k2ezxh",
						code: Lampa.Storage.get("pub_code"),
					},
				);
			};
			ping_auth = setInterval(function () {
				check(Pub.baseurl + "oauth2/device", function () {
					clearInterval(ping_auth);
					Lampa.Modal.close();
					Lampa.Storage.set("logined_pub", "true");
					Lampa.Settings.update();
				});
			}, 5000);
		},
		refreshTok: function () {
			this.network.silent(
				Pub.baseurl + "oauth2/token",
				function (json) {
					Lampa.Storage.set("pub_access_token", json.access_token);
					Lampa.Storage.set("pub_refresh_token", json.refresh_token);
					Pub.token = Lampa.Storage.get("pub_access_token");
					Lampa.Noty.show("ТОКЕН обновлён");
				},
				function (a, c) {
					Lampa.Noty.show(Pub.network.errorDecode(a, c) + " - KinoPub");
				},
				{
					grant_type: "refresh_token",
					refresh_token: Lampa.Storage.get("pub_refresh_token"),
					client_id: "xbmc",
					client_secret: "cgg3gtifu46urtfp2zp1nqtba0k2ezxh",
				},
			);
		},
		userInfo: function (itm, ur) {
			var status = $(".settings-param__status", itm).removeClass("active error wait").addClass("wait");
			if (!Pub.token) status.removeClass("wait").addClass("error");
			else {
				this.network.silent(
					Pub.baseurl + "v1/user?access_token=" + Pub.token,
					function (json) {
						$(".settings-param__" + (!ur ? "name" : "descr"), itm).html('<img width="30em" src="' + json.user.profile.avatar + '">  <span style="vertical-align: middle;"><b style="font-size:1.4em;color:#FF8C00">' + json.user.username + "</b> - " + (json.user.username.indexOf("MODSS") == -1 ? Lampa.Lang.translate("pub_title_left_days") + "<b>" + json.user.subscription.days + "</b> " + Lampa.Lang.translate("pub_title_left_days_d") : "free") + "</span>");
						if (json.user.username.indexOf("MODSS") == -1) {
							$(".settings-param__" + (!ur ? "descr" : ""), itm).html(Lampa.Lang.translate("pub_title_regdate") + " " + Lampa.Utils.parseTime(json.user.reg_date * 1000).full + "<br>" + (json.user.subscription.active ? Lampa.Lang.translate("pub_date_end_pro") + " " + Lampa.Utils.parseTime(json.user.subscription.end_time * 1000).full : '<b style="color:#cdd419">' + Lampa.Lang.translate("pub_title_not_pro") + "</b>"));
						}
						// else $('.settings-param__' + (!ur ? 'name' : 'descr'), itm).html(Lampa.Lang.translate('filmix_nodevice'))
						status.removeClass("wait").addClass("active");
						Lampa.Storage.set("logined_pub", "true");
						Lampa.Storage.set("pro_pub", json.user.subscription.active);
					},
					function (a, c) {
						$(".settings-param__" + (!ur ? "name" : "descr"), itm).html(Lampa.Lang.translate("filmix_nodevice"));
						status.removeClass("wait").addClass("error");
						Lampa.Storage.set("pro_pub", "false");
						Lampa.Storage.set("pub_access_token", "");
						Lampa.Storage.set("logined_pub", "false");
						Pub.token = Lampa.Storage.get("pub_access_token", Pub.tock);
						//Pub.userInfo(itm, ur);
					},
				);
			}
		},
		info_device: function () {
			this.network.silent(
				Pub.baseurl + "v1/device/info?access_token=" + Pub.token,
				function (json) {
					var enabled = Lampa.Controller.enabled().name;
					var opt = json.device.settings;
					var subtitle = {
						supportSsl: {
							title: "Использовать SSL (https) для картинок и видео",
						},
						supportHevc: {
							title: "HEVC или H.265 — формат Видеосжатия с применением более эффективных алгоритмов по сравнению с H.264/AVC. Убедитесь, что ваше устройство поддерживает Данный формат.",
						},
						support4k: {
							title: "4K или Ultra HD - фильм в сверхвысокой чёткости 2160p. Убедитесь, что ваше устройство и ТВ, поддерживает данный формат.",
						},
						mixedPlaylist: {
							title: "Плейлист с AVC и HEVC потоками. В зависимости от настроек, устройство будет автоматически проигрывать нужный поток. Доступно только для 4К - фильмов. Убедитесь, что ваше устройство поддерживает данный формат плейлиста.",
						},
						HTTP: {
							title: "Неадаптивный, качество через настройки (Настройки > плеер > качество видео), все аудио, нет сабов.",
						},
						HLS: {
							title: "Неадаптивный, качество через настройки, одна аудиодорожка, нет сабов.",
						},
						HLS2: {
							title: "Адаптивный, качество автоматом, одна аудиодорожка, нет сабов.",
						},
						HLS4: {
							title: "Рекомендуется! - Адаптивный, качество автоматом, все аудио, сабы.",
						},
					};
					var item = [
						{
							title: "Тип потока",
							value: opt.streamingType,
							type: "streamingType",
						},
						{
							title: "Переключить сервер",
							value: opt.serverLocation,
							type: "serverLocation",
						},
					];
					Lampa.Arrays.getKeys(opt).forEach(function (key) {
						var k = opt[key];
						if (!k.type && ["supportHevc", "support4k"].indexOf(key) > -1)
							item.push({
								title: k.label,
								value: k.value,
								type: key,
								subtitle: subtitle[key] && subtitle[key].title,
								checkbox: k.type ? false : true,
								checked: k.value == 1 ? true : false,
							});
					});

					function main(type, value) {
						var edited = {};
						item.forEach(function (a) {
							if (a.checkbox) edited[a.type] = a.checked ? 1 : 0;
						});
						if (type) edited[type] = value;
						Pub.network.silent(
							Pub.baseurl + "v1/device/" + json.device.id + "/settings?access_token=" + Pub.token,
							function (json) {
								Lampa.Noty.show(Lampa.Lang.translate("pub_device_options_edited"));
								Lampa.Controller.toggle(enabled);
							},
							function (a, c) {
								Lampa.Noty.show(Pub.network.errorDecode(a, c) + " - KinoPub");
							},
							edited,
						);
					}
					Lampa.Select.show({
						items: item,
						title: Lampa.Lang.translate("pub_device_title_options"),
						onBack: main,
						onSelect: function (i) {
							var serv = [];
							i.value.value.forEach(function (i) {
								serv.push({
									title: i.label,
									value: i.id,
									subtitle: subtitle[i.label] && subtitle[i.label].title,
									selected: i.selected,
								});
							});
							Lampa.Select.show({
								items: serv,
								title: i.title,
								onBack: main,
								onSelect: function (a) {
									main(i.type, a.value);
								},
							});
						},
					});
				},
				function (a, c) {
					Lampa.Noty.show(Pub.network.errorDecode(a, c));
				},
			);
		},
		delete_device: function (call) {
			this.network.silent(
				Pub.baseurl + "v1/device/unlink?access_token=" + Pub.token,
				function (json) {
					Lampa.Noty.show(Lampa.Lang.translate("pub_device_dell_noty"));
					Lampa.Storage.set("logined_pub", "false");
					Lampa.Storage.set("pub_access_token", "");
					Lampa.Storage.set("pro_pub", "false");
					Pub.token = Lampa.Storage.get("pub_access_token", Pub.tock);
					if (call) call();
				},
				function (a, c) {
					Lampa.Noty.show(Lampa.Lang.translate("pub_device_dell_noty"));
					Lampa.Storage.set("logined_pub", "false");
					Lampa.Storage.set("pub_access_token", "");
					Lampa.Storage.set("pro_pub", "false");
					Pub.token = Lampa.Storage.get("pub_access_token", Pub.tock);
					if (call) call();
					Lampa.Noty.show(Pub.network.errorDecode(a, c) + " - KinoPub");
				},
				{},
			);
		},
	};
	function startsWith(str, searchString) {
		return str.lastIndexOf(searchString, 0) === 0;
	}

	function endsWith(str, searchString) {
		var start = str.length - searchString.length;
		if (start < 0) return false;
		return str.indexOf(searchString, start) === start;
	}

	function component(object) {
		var network = new Lampa.Reguest();
		var scroll = new Lampa.Scroll({
			mask: true,
			over: true,
		});

		var allItemsToDisplay = [];
		var allRenderedItems = [];
		var seasonGroups = [];
		var page = 0;
		var last = false;
		var isLoadingMore = false;
		var targetScrollElement = false;

		var items_need_add = [];
		var added = 0;
		var BATCH_SIZE = 10;
		var shouldLoadToLastWatched = false;

		scroll.onEnd = function () {
			var choice = _self.getChoice();
			if (choice.season === -1 && !isLoadingMore) {
				_self.next();
			} else if (choice.season !== -1 && added < items_need_add.length) {
				_self.loadMoreItems();
			}
		};

		var files = new Lampa.Explorer(object);
		var filter = new Lampa.Filter(object);
		var sources = {};
		var extract = {};
		var last;
		var source;
		var balanser;
		var initialized;
		var balanser_timer;
		var images = [];
		var number_of_requests = 0;
		var number_of_requests_timer;
		var life_wait_times = 0;
		var life_wait_timer;
		var back_url;
		var checkH = 0;
		var last_request_url = "";
		var filter_sources = {};
		var finalItems = [];
		var localBal = ["videocdn", "cdnmovies"];
		var filter_translate = {
			season: Lampa.Lang.translate("torrent_serial_season"),
			voice: Lampa.Lang.translate("torrent_parser_voice"),
			source: Lampa.Lang.translate("settings_rest_source"),
		};

		// Кеш для источников
		var sourcesCache = null;
		var sourcesCacheTime = 0;
		var CACHE_LIFETIME = 5 * 60 * 1000; // 5 минут

		// Кеш данных источников
		var sourcesData = null;
		var filterSources = null;
		var filter_find = {
			season: [],
			voice: [],
			server: [],
			type: [],
		};
		var _self = this;
		this.initialize = function () {
			var _this = this;
			this.loading(true);
			balanser = this.getLastChoiceBalanser();
			var show_filter = object.movie.number_of_seasons || (extract && extract.season && extract.season.length) || balanser == "pub" || balanser == "bazon" || balanser == "hdrezka";

			if (Lampa.Manifest.app_version >= "2.3.5" && !object.movie.number_of_seasons && extract && !extract.season && Lampa.Activity.active().component == "modss_online") {
				Lampa.Select.listener.follow("fullshow", function (a) {
					if (
						a.active.items.find(function (e) {
							return e.ismods;
						}) &&
						a.active.title == Lampa.Lang.translate("player_playlist")
					)
						a.html.find(".selectbox__title").html(Lampa.Lang.translate("modss_voice_tracks"));
				});
			}

			Lampa.PlayerPlaylist.listener.follow("select", _this.callLoadedInf);

			filter.onSearch = function (value) {
				Lampa.Activity.replace({
					search: value,
					clarification: true,
				});
			};
			filter.onBack = function () {
				_this.start();
			};
			filter
				.render()
				.find(".selector")
				.on("hover:enter", function () {
					clearInterval(balanser_timer);
				});
			filter.render().find(".filter--search").appendTo(filter.render().find(".torrent-filter"));
			filter.onSelect = function (type, a, b) {
				if (a.bal) {
					filter.render().find(".filter--sort").trigger("hover:enter");
				} else if (type == "filter") {
					var reset = function reset() {
						_this.replaceChoice({
							season: 0,
							voice: 0,
							voice_url: "",
							voice_name: "",
						});
						setTimeout(function () {
							Lampa.Select.close();
							Lampa.Activity.replace({
								clarification: 0,
								similar: 0,
							});
						}, 10);
					};
					if (a.reset) reset();
					else {
						if (localBal.indexOf(balanser) >= 0) {
							setTimeout(Lampa.Select.close, 10);
							return source.filter(type, a, b);
						}
						var choice = _this.getChoice();
						var url;
						if (a.stype == "voice") {
							var seasonData = filter_find.season[choice.season];
							var season = false;

							if (seasonData) {
								if (typeof seasonData === "object") {
									var seasonTitle = seasonData.title || seasonData.name;
									if (seasonTitle) {
										season = parseInt(seasonTitle.split(" ")[1]);
									}
								} else {
									season = parseInt(seasonData.split(" ")[1]);
								}
							}

							if (!filter_find[a.stype][b.index]) return reset();

							url = filter_find[a.stype][b.index].url;

							if (season && url) url += "&s=" + season;
							choice.voice_name = filter_find.voice[b.index].title || filter_find.voice[b.index];
							choice.voice_id = filter_find.voice[b.index].id;
							choice.voice_url = url;
						}
						if (a.stype == "season" && filter_find.season[b.index]) {
							url = filter_find.season[b.index].url;

							// Проверяем доступность текущего типа видео в новом сезоне
							if (balanser === "hdr" && extract && extract.type && extract.type.length > 0 && filter_find.type) {
								var seasonItem = filter_find.season[b.index];

								if (seasonItem && typeof seasonItem === "string") {
									var titleParts = seasonItem.split(" ");
									var seasonNumber = titleParts.length > 1 ? titleParts[1] : titleParts[0];

									var items = extract.folder || extract.episode;
									var currentType = filter_find.type[choice.type];
									if (items && currentType && items[currentType] && !items[currentType][seasonNumber]) {
										var availableTypes = [];
										filter_find.type.forEach(function (type, index) {
											if (items[type] && items[type][seasonNumber] && items[type][seasonNumber].length > 0) {
												availableTypes.push({ type: type, index: index });
											}
										});
										if (availableTypes.length > 0) choice.type = availableTypes[0].index;
									}
								}
							}
						}

						choice[a.stype] = b.index;

						_this.replaceChoice(choice, balanser);
						setTimeout(Lampa.Select.close, 10);
						//_this.loading(true);
						_this.reset();
						if ((a.stype == "server" || a.stype == "type") && balanser == "kinopub") {
							if (a.stype == "server") Lampa.Storage.set("pub_server", b.index);
							if (a.stype == "type") Lampa.Storage.set("pub_type_striming", b.index);
							_this.initialize();
						} else if (url) {
							_this.request(_this.requestParams(url));
						} else _this.parse(extract);
					}
				} else if (type == "sort") {
					Modss.getIp(balanser);
					Lampa.Select.close();
					object.modss_custom_select = a.source;
					_this.changeBalanser(a.source);
				}
				if (show_filter) filter.render().find(".filter--filter").show();
				else filter.render().find(".filter--filter").hide();
			};

			if (show_filter) filter.render().find(".filter--filter").show();
			else filter.render().find(".filter--filter").hide();

			filter
				.render()
				.find(".filter--sort")
				.on("hover:enter", function () {
					$("body").find(".selectbox__title").text(Lampa.Lang.translate("modss_balanser"));
				});
			if (filter.addButtonBack && !$(".filter--back").length) filter.addButtonBack();
			filter.render().find(".filter--sort span").text(Lampa.Lang.translate("modss_balanser"));
			scroll.body().addClass("torrent-list");

			files.appendFiles(scroll.render());
			files.appendHead(filter.render());
			scroll.minus(files.render().find(".explorer__files-head"));
			scroll.body().append(Lampa.Template.get("modss_content_loading"));
			Lampa.Controller.enable("content");
			this.loading(false);

			this.createSource()
				.then(function (wait) {
					if (!window.filmix) {
						window.filmix = {
							max_qualitie: 480,
							is_max_qualitie: false,
							auth: false,
							date: "",
						};
					}

					if (["kodik", "kinotochka", "hdrezka", "kinopub", "kinokrad", "kinobase", "hdr", "fxpro", "filmix", "mango", "iremux", "eneida"].indexOf(balanser.indexOf("<") == -1 ? balanser.toLowerCase() : balanser.split("<")[0].toLowerCase()) == -1) {
						filter.render().find(".filter--search").addClass("hide");
					}

					_this.search();
				})
				["catch"](function (e) {
					if (e && !e.find) {
						console.log("Modss", "init", "Error", e);
						Lampa.Noty.show("MODSs ОШИБКА ОНЛАЙН [init] -> " + ((e.message && e.message) || e.decode_error || e.error));
						files.appendHead(filter.render());
						_this.empty();
						_this.activity.loader(false);
					} else _this.noConnectToServer(e);
				});
		};
		this.updateBalanser = function (balanser_name) {
			var last_select_balanser = Lampa.Storage.cache("online_last_balanser", 3000, {});
			last_select_balanser[object.movie.id] = balanser_name;
			Lampa.Storage.set("online_last_balanser", last_select_balanser);
		};
		this.changeBalanser = function (balanser_name) {
			var _this = this;
			this.updateBalanser(balanser_name);
			Lampa.Storage.set("online_balanser", balanser_name);
			var to = this.getChoice(balanser_name);
			var from = this.getChoice();
			if (from.voice_name) to.voice_name = from.voice_name;
			this.saveChoice(to, balanser_name);

			// Если есть кешированные источники, используем их вместо полной перезагрузки
			if (sourcesCache && sourcesData && filterSources && Date.now() - sourcesCacheTime < CACHE_LIFETIME) {
				balanser = balanser_name;

				// Переустанавливаем источники из кеша
				_this
					.setupSourcesFromCache()
					.then(function () {
						_this.reset();
						//_this.loading(true);
						_this.search();
					})
					.catch(function (e) {
						console.log("Modss", "Cache setup failed, doing full reload", e);
						Lampa.Activity.replace();
					});
			} else Lampa.Activity.replace();
		};
		this.requestParams = function (url) {
			var query = [];
			query.push("id=" + object.movie.id);
			query.push("title=" + encodeURIComponent(object.clarification ? object.search : object.movie.title || object.movie.name));
			query.push("original_title=" + encodeURIComponent(object.movie.original_title || object.movie.original_name));
			query.push("alt_name=" + this.getNames(object.movie));
			if (object.movie.imdb_id) query.push("imdb_id=" + (object.movie.imdb_id || ""));
			if (object.movie.kinopoisk_id || object.movie.kinopoisk_ID) query.push("kinopoisk_id=" + (object.movie.kinopoisk_id || object.movie.kinopoisk_ID || ""));
			query.push("serial=" + (object.movie.name || object.movie.number_of_episodes ? 1 : 0));
			query.push("original_language=" + (object.movie.original_language || ""));
			query.push("year=" + ((object.movie.first_air_date || object.movie.release_date || "0000") + "").slice(0, 4));
			query.push("source=" + object.movie.source);
			query.push("clarification=" + (object.clarification ? 1 : 0));
			query.push("logged=" + logged);
			query.push("vers=" + version_modss);
			query.push("prefer_dash=" + (Lampa.Storage.field("online_dash") === true));
			query.push("ip=" + IP);
			//query.push('server=' + Lampa.Storage.field('pub_server', 1));
			//query.push('hevc=' + Lampa.Storage.field('online_hevc', true));
			//query.push('type=' + this.getChoice(balanser).type);
			query.push("pro_pub=" + Lampa.Storage.get("pro_pub", "false"));
			query.push("filmix_log=" + Lampa.Storage.get("filmix_log", "false"));
			//if(Lampa.Storage.get('pro_pub', false))
			query.push("ptoken=" + Pub.token);
			if (Filmix.token && Filmix.token.indexOf("aaaabbb") == -1) query.push("token=" + Filmix.token);
			query.push("cub_id=aXBhdmxpbjk4QHlhbmRleC5ydQ==");
			query.push("uid=60efb6412cd5083cf154c58d0");
			if (cards) {
				var notices = Lampa.Storage.get("account_notice", []).filter(function (n) {
					return n.card_id == cards.id;
				});
				if (notices.length) {
					var notice = notices.find(function (itm) {
						return Lampa.Utils.parseTime(itm.date).full == Lampa.Utils.parseTime(Date.now()).full;
					});
					if (notice) {
						query.push("s=" + notice.season);
						query.push("ep=" + notice.episode);
					}
				}
			}
			return url + (url.indexOf("?") >= 0 ? "&" : "?") + query.join("&");
		};
		this.getNames = function (data) {
			if (!data.names) return null;
			var normalizeString = function normalizeString(str) {
				return str
					.toLowerCase()
					.replace(/[*-\:\.\,]/g, " ")
					.replace(/\s+/g, " ")
					.trim();
			};

			// Нормализуем оригинальные названия
			var normalizedOriginal = normalizeString(data.original_title || data.original_name);
			var normalizedTitle = normalizeString(data.title || data.name);

			// Фильтруем массив, сравнивая нормализованные строки
			var filteredNames = data.names.filter(function (name) {
				var normalizedName = normalizeString(name);
				return normalizedName !== normalizedOriginal && normalizedName !== normalizedTitle;
			});

			return filteredNames.length > 0 ? encodeURIComponent(filteredNames[0]) : null;
		};
		this.getLastChoiceBalanser = function () {
			var last_select_balanser = Lampa.Storage.cache("online_last_balanser", 3000, {});
			var priority_balanser = Lampa.Storage.get("priority_balanser", Modss.balansPrf);
			if (priority_balanser == undefined) priority_balanser = Modss.balansPrf;
			if (last_select_balanser[object.movie.id]) {
				return last_select_balanser[object.movie.id];
			} else {
				return priority_balanser ? priority_balanser : filter_sources.length ? filter_sources[0] : "";
			}
		};
		this.BalLocal = function (sources) {
			var locSources = {
				/*videocdn: {
          url: false,
          class: videocdn,
          name: 'VideoCDN',
          vip: false,
          show: true,
          disabled: true
      },
      cdnmovies: {
          url: false,
          class: cdnmovies,
          name: 'CDNMovies',
          vip: false,
          show: true,
          disabled: true
      },
      rezka:{
        url: false,
        class: rezka,
        name: 'Voidboost',
        vip: false,
        show: true
      }*/
			};
			var combinedSources = Object.assign({}, locSources, sources);
			for (var key in combinedSources) {
				if (combinedSources[key].disabled) {
					delete combinedSources[key];
				}
			}

			return combinedSources;
		};
		this.updateSourcesFilter = function () {
			filter.set(
				"sort",
				filter_sources
					.map(function (e) {
						return {
							title: sources[e].name,
							source: e,
							selected: e == balanser,
							ghost: sources[e].vip,
						};
					})
					.sort(function (a, b) {
						return a.ghost - b.ghost;
					}),
			);
			filter.chosen("sort", [sources[balanser] ? sources[balanser].name.split(" ")[0] : balanser]);
		};
		this.setupSourcesFromCache = function () {
			var _this = this;
			return new Promise(function (resolve, reject) {
				if (!sourcesCache || !sourcesData || !filterSources) {
					return reject("No cache available");
				}

				console.log("Modss", "Setup sources from cache:", balanser);

				// Восстанавливаем данные источников
				filter_find = {
					season: [],
					voice: [],
					type: [],
					server: [],
				};
				sources = JSON.parse(JSON.stringify(sourcesData)); // глубокая копия
				filter_sources = filterSources.slice(); // копия массива

				// Устанавливаем URL источника для текущего балансера
				if (sources[balanser]) {
					source = sources[balanser].url;
				} else {
					// Если балансер не найден, используем первый доступный
					if (filter_sources.length > 0) {
						balanser = filter_sources[0];
						source = sources[balanser].url;
					}
				}

				// Обновляем фильтр источников
				_this.updateSourcesFilter();

				resolve(sourcesCache);
			});
		};
		this.startSource = function (json) {
			return new Promise(function (resolve, reject) {
				var balancers = [];
				var raw = json && json.balanser;
				if (Array.isArray(raw)) balancers = raw;
				else if (raw && typeof raw === "object")
					balancers = Object.keys(raw).map(function (key) {
						return raw[key];
					});
				if (!balancers.length && json && json.online) {
					if (Array.isArray(json.online)) balancers = json.online;
					else if (typeof json.online === "object")
						balancers = Object.keys(json.online).map(function (key) {
							return json.online[key];
						});
				}
				if (!balancers.length) {
					return reject({ error: "Нет данных балансеров" });
				}
				balancers.forEach(function (j) {
					var name = j.name.toLowerCase();
					sources[j.name] = {
						url: j.url,
						name: j.title,
						vip: j.vip,
						show: typeof j.show == "undefined" ? true : j.show,
					};
				});

				sources = _self.BalLocal(sources);
				filter_sources = Lampa.Arrays.getKeys(sources);
				if (filter_sources.length) {
					var priority_balanser = Lampa.Storage.get("priority_balanser", Modss.balansPrf);
					if (priority_balanser == undefined) priority_balanser = Modss.balansPrf;

					var last_select_balanser = Lampa.Storage.cache("online_last_balanser", 3000, {});
					if (last_select_balanser[object.movie.id]) {
						balanser = last_select_balanser[object.movie.id];
					} else {
						balanser = priority_balanser; //Lampa.Storage.get('online_balanser', priority_balanser);
					}

					if (!sources[balanser]) balanser = priority_balanser;
					if (!sources[balanser]) balanser = filter_sources[0];
					if (!sources[balanser].show && !object.modss_custom_select) balanser = filter_sources[0];
					source = sources[balanser].url;

					// Сохраняем данные источников в кеш
					sourcesData = JSON.parse(JSON.stringify(sources));
					filterSources = filter_sources.slice();

					resolve("Loaded - " + object.search + " _ " + (json && json.time ? json.time : Date.now()));
				} else {
					reject({ error: "Список балансеров пуст" });
				}
			});
		};
		this.lifeSource = function () {
			var _this2 = this;
			return new Promise(function (resolve, reject) {
				var url = _this2.requestParams(API + "life/" + object.movie.id);
				var red = false;
				var gou = function gou(json, any) {
					var last_balanser = _this2.getLastChoiceBalanser();
					if (!red) {
						var _filter = json.online.filter(function (c) {
							return any ? c.show : c.show && c.name == last_balanser;
						});
						if (_filter.length) {
							red = true;
							resolve({
								balanser: json.online.filter(function (c) {
									return c.show;
								}),
								time: json.load.search,
							});
						} else if (any) {
							reject("Not found - " + object.search + " _ " + json.load.search);
						}
					}
				};
				var fin = function fin(call) {
					network.timeout(10000);
					network.silent(
						url,
						function (json) {
							if (json.FindVoice) {
								if (cards) {
									var notices = Lampa.Storage.get("account_notice", []).filter(function (n) {
										return n.card_id == cards.id;
									});
									if (notices.length) {
										var notice = notices.find(function (itm) {
											return Lampa.Utils.parseTime(itm.date).full == Lampa.Utils.parseTime(Date.now()).full;
										});
										if (notice) {
											notice.find = json.FindVoice;
											Modss.Notice(notice);
										}
									}
								}
							}
							life_wait_times++;
							filter_sources = [];
							sources = {};
							json.online.forEach(function (j) {
								var name = j.name.toLowerCase();
								if (j.show)
									sources[j.name] = {
										url: j.url,
										name: j.title,
										vip: j.vip,
										show: typeof j.show == "undefined" ? true : j.show,
									};
							});

							sources = _this2.BalLocal(sources);

							filter_sources = Lampa.Arrays.getKeys(sources);

							// Сохраняем данные источников в кеш
							sourcesData = JSON.parse(JSON.stringify(sources)); // глубокая копия
							filterSources = filter_sources.slice(); // копия массива

							_this2.updateSourcesFilter();

							gou(json);
							if (life_wait_times > 15 || json.ready) {
								filter.render().find(".modss-balanser-loader").remove();
								gou(json, true);
							} else {
								life_wait_timer = setTimeout(fin, 1000);
							}
						},
						function (e) {
							life_wait_times++;
							if (life_wait_times > 15) {
								reject();
							} else {
								if (e.statusText == "timeout") return reject({ error: "timeout - " + object.search });
								life_wait_timer = setTimeout(fin, 1000);
							}
						},
					);
				};
				fin();
			});
		};
		this.createSource = function (load) {
			var _this3 = this;
			return new Promise(function (resolve, reject) {
				var now = Date.now();
				if (sourcesCache && sourcesData && filterSources && now - sourcesCacheTime < CACHE_LIFETIME) {
					return resolve(sourcesCache);
				}

				var url = _this3.requestParams(API + "events/" + object.movie.id + "?");
				var cacheResult = function cacheResult(result) {
					sourcesCache = result;
					sourcesCacheTime = now;
					resolve(result);
				};
				var fallbackToLife = function fallbackToLife(prevError) {
					filter.render().find(".filter--sort").append('<span class="modss-balanser-loader" style="width: 1.2em; height: 1.2em; margin-top: 0; background: url(./img/loader.svg) no-repeat 50% 50%; background-size: contain; margin-left: 0.5em"></span>');
					_this3
						.lifeSource()
						.then(function (lifeJson) {
							return _this3.startSource(lifeJson);
						})
						.then(cacheResult)
						["catch"](function (err) {
							reject(prevError || err);
						});
				};
				var handleStart = function handleStart(payload) {
					_this3
						.startSource(payload)
						.then(cacheResult)
						["catch"](function (err) {
							fallbackToLife(err);
						});
				};

				network.timeout(15000);
				network.silent(
					url,
					function (json) {
						if (json.error) return reject(json);
						if (json.life) fallbackToLife();
						else handleStart(json);
					},
					reject,
				);
			});
		};
		this.create = function () {
			return this.render();
		};
		this.search = function () {
			//this.loading(true);
			this.filter(
				{
					source: filter_sources,
				},
				this.getChoice(),
			);
			this.find();
		};
		this.find = function () {
			if (source) this.request(this.requestParams(source));
			else {
				var kp_id = +object.movie.kinopoisk_id || +object.movie.kinopoisk_ID;
				try {
					source = new sources[balanser].class(this, object);

					if (localBal.indexOf(balanser) >= 0 && source) {
						if (source.searchByImdbID && object.movie.imdb_id) {
							source.searchByImdbID(object, object.movie.imdb_id);
						} else if (source.searchByKinopoisk && kp_id) {
							source.searchByKinopoisk(object, kp_id);
						} else if (source.searchByTitle) {
							source.searchByTitle(object, object.search);
						} else if (source.searchs) {
							source.searchs(object, kp_id || object.movie.imdb_id);
						} else this.doesNotAnswer();
					} else {
						this.doesNotAnswer();
					}
				} catch (error) {
					console.error("Modss", "source error:", balanser, kp_id, error);
					this.doesNotAnswer();
				}
			}
		};
		this.request = function (url) {
			number_of_requests++;
			if (number_of_requests < 10) {
				last_request_url = url;
				network["native"](url, this.parse.bind(this), this.doesNotAnswer.bind(this), false, {
					dataType: "json",
				});
				clearTimeout(number_of_requests_timer);
				number_of_requests_timer = setTimeout(function () {
					number_of_requests = 0;
				}, 5000);
			} else this.empty();
		};
		this.toPlayElement = function (file) {
			var play = {
				title: file.title,
				url: file.url,
				url_reserve: file.url_reserve,
				quality: file.qualitys,
				quality_reserve: file.quality_reserve,
				timeline: file.timeline,
				subtitles: file.subtitles,
				translate: {
					tracks: file.audio_tracks,
					subs: file.subs_tracks,
				},
				callback: file.mark,
				error: function (play_item, callback) {
					Lampa.Player.timecodeRecording(false);
					if (!file.stream) callback(file.url_reserve ? file.url_reserve : API.replace("api.", "") + "not_video.mp4");
				},
				/*voiceovers: [{
          name: 'дубляж',selected: false,
        },{
          name: 'оригинал',selected: false,
        }]
      */
			};
			return play;
		};
		this.checkHashR = function (params) {
			console.log("Modss", "checkHash:", balanser, object.search + " - ", params.title || params.url || "unknown");
			var _this = this;
			return new Promise(function (resolve, reject) {
				var xhr = new XMLHttpRequest();
				xhr.open("GET", params.url, true);
				xhr.timeout = 2000;
				xhr.onreadystatechange = function () {
					if (xhr.readyState === 2) {
						if (xhr.status >= 200 && xhr.status < 300) {
							console.log("Modss", "checkHash", " - OK", xhr.status);
							resolve(params);
						} else if (xhr.status >= 300 && xhr.status < 400) {
							var redirectUrl = xhr.getResponseHeader("Location");
							if (redirectUrl) {
								console.log("Modss", "checkHash redirect:", redirectUrl);
								_this.checkHashR(redirectUrl).then(resolve).catch(reject);
							} else {
								console.log("Modss", "checkHash redirect - ERROR:", xhr.status);
								reject("Ошибка: " + xhr.status);
							}
						} else {
							console.log("Modss", "checkHash - ERROR:", xhr.status);
							reject("Ошибка: " + xhr.status);
						}
						xhr.abort();
					}
				};
				xhr.ontimeout = function () {
					params.url = params.url_reserve;
					params.qualitys = params.quality_reserve;

					console.log("Modss", "checkHash: ", balanser, " - play reserve_url > ", params.url_reserve || "no reserve");
					resolve(params);
				};
				xhr.onerror = function (e) {
					console.log("Modss", "Error", balanser, "checkHash status:", xhr.status, e);
					reject("Произошла ошибка");
				};
				xhr.send(null);
			});
		};
		this.setDefaultQuality = function (data) {
			if (Lampa.Arrays.getKeys(data.quality).length) {
				for (var q in data.quality) {
					if (parseInt(q) == Lampa.Storage.field("video_quality_default")) {
						data.url = data.quality[q];
						break;
					}
				}
			}
		};
		this.setFlowsForItem = function (item) {
			var flows = [];

			var reserveUrls = item.url_reserve ? [item.url_reserve] : [];
			var urls = [item.url].concat(
				reserveUrls.filter(function (url) {
					return url && url !== item.url;
				}),
			);

			if (urls.length > 1) {
				urls.forEach(function (url, index) {
					flows.push({
						title: "Поток " + (index + 1),
						subtitle: Lampa.Utils.shortText(url, 35),
						url: url,
						selected: url == item.url,
					});
				});
				Lampa.PlayerPanel.setFlows(flows);
			}
		};
		this.downloadAndUploadArchive = function (url, id, imdb, season, episode, lang) {
			return new Promise(function (resolve, reject) {
				var retryAttempt = false;
				var downloadFromUrl = function (downloadUrl) {
					var xhr = new XMLHttpRequest();
					xhr.open("GET", downloadUrl, true);
					xhr.responseType = "blob";
					xhr.onload = function () {
						if (xhr.status === 200) {
							var blob = xhr.response;
							var formData = new FormData();
							formData.append("file", blob, "temp.zip");
							formData.append("id", id);
							formData.append("imdb", imdb);
							formData.append("season", season);
							formData.append("episode", episode);
							formData.append("lang", lang);

							var xhr2 = new XMLHttpRequest();
							xhr2.open("POST", API + "subsLoad", true);
							xhr2.onload = function () {
								if (xhr2.status === 200) {
									resolve(JSON.parse(xhr2.responseText));
								} else {
									reject(new Error("Ошибка при отправке файла: " + xhr2.status + " - " + xhr2.statusText));
								}
							};
							xhr2.onerror = function () {
								reject(new Error("Ошибка при отправке файла"));
							};
							xhr2.send(formData);
						} else if (xhr.status === 404) {
							reject(new Error("Ошибка загрузки архива: " + xhr.status + " - " + xhr.statusText));
						}
					};
					xhr.onerror = function (e) {
						if (xhr.status === 0 && !retryAttempt) {
							retryAttempt = true;
							console.log("Modss", "loadedZIP", "retry");
							if (url) downloadFromUrl(url.replace("https://www.opensubtitles.org/download/s/", "https://www.opensubtitles.org/ru/download/s/").replace("https://www.opensubtitles.org/ru/subtitleserve/sub/", "https://dl.opensubtitles.org/ru/download/sub/"));
							else reject(new Error("Ошибка загрузки архива URL не должен быть пустой"));
						} else reject(new Error("Ошибка загрузки архива"));
					};
					xhr.send();
				};
				downloadFromUrl(url);
			});
		};
		this.downloadAndUploadArchiveV3 = function (url, id, imdb, season, episode, lang) {
			return new Promise(function (resolve, reject) {
				if (!url) {
					reject(new Error("V3: URL не должен быть пустой"));
					return;
				}

				var xhr = new XMLHttpRequest();
				xhr.open("GET", url, true);
				xhr.responseType = "blob";
				xhr.timeout = 30000; // 30 секунд таймаут

				xhr.onload = function () {
					if (xhr.status === 200) {
						var blob = xhr.response;

						// Проверяем размер файла
						if (blob.size === 0) {
							reject(new Error("V3: Файл пустой"));
							return;
						}

						var formData = new FormData();
						formData.append("file", blob, "subtitle.zip");
						formData.append("id", id);
						formData.append("imdb", imdb);
						formData.append("season", season || "null");
						formData.append("episode", episode || "null");
						formData.append("lang", lang || "null");

						var xhr2 = new XMLHttpRequest();
						xhr2.open("POST", API + "subsLoad", true);
						xhr2.timeout = 30000;

						xhr2.onload = function () {
							if (xhr2.status === 200) {
								try {
									var response = JSON.parse(xhr2.responseText);
									resolve(response);
								} catch (e) {
									reject(new Error("V3: Ошибка парсинга ответа: " + e.message));
								}
							} else {
								reject(new Error("V3: Ошибка при отправке файла: " + xhr2.status + " - " + xhr2.statusText));
							}
						};

						xhr2.onerror = function () {
							reject(new Error("V3: Ошибка сети при отправке файла"));
						};

						xhr2.ontimeout = function () {
							reject(new Error("V3: Таймаут при отправке файла"));
						};

						xhr2.send(formData);
					} else {
						reject(new Error("V3: Ошибка загрузки: " + xhr.status + " - " + xhr.statusText));
					}
				};

				xhr.onerror = function () {
					reject(new Error("V3: Ошибка сети при загрузке"));
				};

				xhr.ontimeout = function () {
					reject(new Error("V3: Таймаут при загрузке"));
				};

				xhr.send();
			});
		};
		this.callLoadedInf = function (e) {
			if (e && e.item && e.item.callLoadedInf) e.item.callLoadedInf();
		};
		this.loadedInf = function (id, imdb, title, year, season, episode) {
			try {
				var _this = this;
				network.silent(
					API + "loadedInf",
					function (json) {
						if (json.serial) {
							_this
								.downloadAndUploadArchive(json.url, id, imdb, season, episode, null)
								.then(function (data) {
									console.log("Modss", "loadedInf", imdb || id, title, " - загружены успешно:", data);
								})
								.catch(function (error) {
									console.error("Error:", error);
								});
						} else if (json.film) {
							for (var key in json.data) {
								if (json.data.hasOwnProperty(key)) {
									_this
										.downloadAndUploadArchive(json.data[key], id, imdb, null, null, key)
										.then(function (data) {
											console.log("Modss", "loadedInf", imdb || id, key + " загружен успешно:", data);
										})
										.catch(function (error) {
											console.error("Modss", "loadedInf", imdb || id, title, " - Ошибка при загрузке языка - " + key, error);
										});
								}
							}
						}
					},
					function (a, c) {
						Lampa.Noty.show("MODSs ОШИБКА loadedInf " + network.errorDecode(a, c));
					},
					{
						id: id,
						imdb: imdb,
						title: title,
						year: year,
						season: season,
						episode: episode,
						isSerial: season && episode ? true : false,
					},
				);
			} catch (error) {
				console.log("Modss error", id, season, episode, imdb, title, year, error);
			}
		};
		this.loadedInfV3 = function (id, imdb, title, year, season, episode) {
			try {
				var _this = this;
				network.silent(
					API + "loadedInfV3",
					function (json) {
						if (json.serial) {
							// Если есть объект со всеми языками - грузим все по очереди
							if (json.all && typeof json.all === "object") {
								for (var lang in json.all) {
									if (json.all.hasOwnProperty(lang)) {
										_this
											.downloadAndUploadArchiveV3(json.all[lang], id, imdb, season, episode, lang.toLowerCase())
											.then(function (data) {
												console.log("Modss", "loadedInfV3", imdb || id, title, " - " + lang + " загружен успешно:", data);
											})
											.catch(function (err) {
												console.error("Modss", "loadedInfV3", imdb || id, title, " - " + lang + " ошибка:", err);
											});
									}
								}
							} else if (json.url) {
								// Если нет all, грузим только по url
								_this
									.downloadAndUploadArchiveV3(json.url, id, imdb, season, episode, null)
									.then(function (data) {
										console.log("Modss", "loadedInfV3", imdb || id, title, " - загружены успешно:", data);
									})
									.catch(function (error) {
										console.error("Error V3:", error);
									});
							}
						} else if (json.film) {
							for (var key in json.data) {
								if (json.data.hasOwnProperty(key)) {
									_this
										.downloadAndUploadArchiveV3(json.data[key], id, imdb, null, null, key.toLowerCase())
										.then(function (data) {
											console.log("Modss", "loadedInfV3", imdb || id, key + " загружен успешно:", data);
										})
										.catch(function (error) {
											console.error("Modss", "loadedInfV3", imdb || id, title, " - Ошибка при загрузке языка - " + key, error);
										});
								}
							}
						}
					},
					function (a, c) {
						Lampa.Noty.show("MODSs ОШИБКА loadedInfV3 " + network.errorDecode(a, c));
					},
					{
						id: id,
						imdb: imdb,
						title: title,
						year: year,
						season: season,
						episode: episode,
						isSerial: season && episode ? true : false,
					},
				);
			} catch (error) {
				console.log("Modss V3 error", id, season, episode, imdb, title, year, error);
			}
		};
		this.getFileUrl = function (file, call) {
			this.loadedInfV3(object.movie.id, object.movie.imdb_id, encodeURIComponent(object.movie.original_title || object.movie.original_name), ((object.movie.release_date || object.movie.first_air_date || "0000") + "").slice(0, 4), file.season, file.episode);

			var _this = this;
			if (balanser == "hdr" && navigator.userAgent.toLowerCase().indexOf("android") >= 0 && !Lampa.Platform.is("android")) return Lampa.Platform.install("apk");

			if (file.method == "play") call(file, {});
			else {
				if (Lampa.Storage.field("player") !== "inner" && Lampa.Platform.is("apple") && file.stream) {
					file.method = "play";
					file.url = file.stream;
					call(file, {});
				} else {
					Lampa.Loading.start(function () {
						Lampa.Loading.stop();
						Lampa.Controller.toggle("content");
						network.clear();
					});

					network["native"](
						file.url,
						function (json) {
							/*if (json.url && ['kodik'].indexOf(balanser) >= 0 && ['UA'].indexOf('GB') >= 0) {
            _this.checkHashR(json).then(function (data) {
              Lampa.Loading.stop();
              if (data && data.url) {
                // Если уже есть subtitles и приходит false - не перезаписываем
                if (file.subtitles && data.subtitles === false) {
                  var dataCopy = Object.assign({}, data);
                  delete dataCopy.subtitles;
                  Object.assign(file, dataCopy);
                } else {
                  Object.assign(file, data);
                }
                if (data.url_reserve) {
                  _this.setFlowsForItem(data);
                }
              }
              call(data, data);
            }, function (err) {
              Lampa.Loading.stop();
              call(false, {});
            });
          } else {
            */
							Lampa.Loading.stop();
							if (json && json.url) {
								if (file.subtitles && json.subtitles === false) {
									var jsonCopy = Object.assign({}, json);
									delete jsonCopy.subtitles;
									Object.assign(file, jsonCopy);
								} else {
									Object.assign(file, json);
								}
								if (json.url_reserve) {
									_this.setFlowsForItem(json);
								}
							}
							call(json, json);
							//}
						},
						function () {
							Lampa.Loading.stop();
							call(false, {});
						},
					);
				}
			}
		};
		this.getDefaultHandlers = function (videos) {
			var _this4 = this;
			return {
				onEnter: function onEnter(item, html) {
					_this4.getFileUrl(
						item,
						function (json, json_call) {
							if (json && json.url) {
								var playlist = [];
								var first = _this4.toPlayElement(item);
								if (item.season) first.title = "[" + item.season + ":" + item.episode + "] " + first.title;
								first.ismodss = true;
								first.url = json.url;
								first.url_reserve = json.url_reserve;
								first.quality = json_call.quality || json_call.qualitys || item.qualitys;
								first.subtitles = json.subtitles;
								if (json.segments) first.segments = json.segments;
								if (item.subtitles && item.subtitles.length && item.method == "call" && json.subtitles) first.subtitles = json.subtitles.concat(item.subtitles);
								if (!first.subtitles) first.subtitles = item.subtitles;

								_this4.setDefaultQuality(first);
								if (true) {
									var currentSeason = null;
									videos.forEach(function (elem) {
										if (elem.season && elem.season !== currentSeason) {
											currentSeason = elem.season;
											playlist.push({
												title: Lampa.Lang.translate("torrent_serial_season") + " " + currentSeason,
												separator: true,
											});
										}

										var cell = _this4.toPlayElement(elem);
										if (elem.season) cell.title = "[" + elem.season + ":" + elem.episode + "] " + cell.title;

										if (!item.season) cell.ismods = true;
										if (images[elem.episode - 1]) {
											cell.template = "selectbox_icon";
											cell.icon = '<img class="size-youtube" src="' + images[elem.episode - 1].src + '" alt="icon">';
										}
										if (elem == item) cell.url = json.url;
										else {
											if (elem.method == "call") {
												if ((Lampa.Storage.field("player") == "android" && Lampa.Platform.is("android")) || (Lampa.Storage.field("player") !== "inner" && Lampa.Platform.is("apple") && elem.stream)) {
													cell.url = elem.stream;
												} else {
													cell.url = function (call) {
														_this4.getFileUrl(
															elem,
															function (stream, stream_json) {
																if (stream.url) {
																	cell.url = stream.url;
																	cell.url_reserve = stream_json.url_reserve;
																	cell.quality = stream_json.quality || json_call.qualitys || elem.qualitys;
																	cell.subtitles = stream.subtitles;
																	if (stream.segments) cell.segments = stream.segments;
																	if (elem.subtitles && elem.subtitles.length && elem.method == "call" && json.subtitles) cell.subtitles = stream.subtitles.concat(elem.subtitles);
																	if (!cell.subtitles) cell.subtitles = elem.subtitles;
																	cell.translate = {
																		tracks: stream_json.audio_tracks,
																		subs: stream_json.subs_tracks,
																	};
																	_this4.setDefaultQuality(cell);
																	setTimeout(function () {
																		_this4.setFlowsForItem(cell);
																	}, 500);
																	elem.mark();
																} else {
																	cell.url = "";
																	Lampa.Noty.show(Lampa.Lang.translate("modss_nolink") + "<br>" + JSON.stringify(stream));
																}
																call();
															},
															function () {
																cell.url = "";
																call();
															},
														);
													};
												}
											} else {
												cell.url = elem.url;
												cell.url_reserve = elem.url_reserve;
												cell.callLoadedInf = function () {
													_this4.loadedInfV3(object.movie.id, object.movie.imdb_id, encodeURIComponent(object.movie.original_title || object.movie.original_name), ((object.movie.release_date || object.movie.first_air_date || "0000") + "").slice(0, 4), elem.season, elem.episode);
												};
											}
										}
										_this4.setDefaultQuality(cell);
										playlist.push(cell);
									});
								} else playlist.push(first);

								if (playlist.length > 1) first.playlist = playlist;
								if (first.url) {
									console.log("first", playlist);
									Lampa.Player.play(first);
									if (videos.length > 1) Lampa.Player.playlist(playlist);
									_this4.setFlowsForItem(first);

									item.mark();
									_this4.updateBalanser(balanser);
								} else {
									Lampa.Noty.show(Lampa.Lang.translate("modss_nolink") + "<br>" + JSON.stringify(json));
								}

								var plst = Lampa.PlayerPanel.render().find(".player-panel__playlist").html();
								if (Lampa.Player.opened()) {
									if (!item.season && Lampa.Activity.active().component == "modss_online" && videos.length > 1) {
										Lampa.Player.callback(function (e) {
											Lampa.Player.render().find(".player-panel__playlist").html(plst);
											Lampa.Controller.toggle("content");
										});
									}
									if (!item.season && Lampa.PlayerPanel.visibleStatus()) Lampa.PlayerPanel.render().find(".player-panel__playlist").html(Lampa.PlayerPanel.render().find(".player-panel__tracks").html());
								}

								Lampa.Player.render().find(".player-info__values").show();
							} else {
								Lampa.Noty.show(Lampa.Lang.translate("modss_nolink") + "<br>" + JSON.stringify(json));
							}
						},
						true,
					);
				},
				onContextMenu: function onContextMenu(item, html, data, call) {
					_this4.getFileUrl(
						item,
						function (stream) {
							var quality = item.qualitys || stream.qualitys || stream.quality || false;
							var reserve_quality = item.quality_reserve || stream.quality_reserve || false;
							call({
								file: stream.url || stream.file || stream.stream || stream,
								quality: typeof quality === "object" ? quality : false,
								reserve_quality: typeof reserve_quality === "object" ? reserve_quality : false,
							});
						},
						true,
					);
				},
			};
		};
		this.groupItemsBySeason = function (items) {
			var groups = [];
			var currentSeason = null;
			var currentGroup = [];

			items.forEach(function (item) {
				if (item.season !== currentSeason) {
					if (currentGroup.length > 0) {
						groups.push(currentGroup);
					}
					currentSeason = item.season;
					currentGroup = [item];
				} else {
					currentGroup.push(item);
				}
			});

			if (currentGroup.length > 0) {
				groups.push(currentGroup);
			}

			return groups;
		};
		this.display = function (videos) {
			var _this4 = this;
			var choice = _this4.getChoice();

			if (choice.season === -1) {
				allItemsToDisplay = [];
				allRenderedItems = [];
				seasonGroups = [];
				page = 0;
				last = false;
				isLoadingMore = false;

				allItemsToDisplay = videos;
				seasonGroups = this.groupItemsBySeason(videos);

				scroll.clear();
				scroll.reset();
				this.next(this.getDefaultHandlers(videos));
			} else {
				this.draw(videos, this.getDefaultHandlers(videos));
			}

			this.filter(
				{
					season: filter_find.season.map(function (s) {
						return s;
					}),
					voice: filter_find.voice.map(function (b) {
						return b.title || b;
					}),
					order: object.movie.number_of_seasons
						? this.order.map(function (b) {
								return b.title;
							})
						: "",
					type: filter_find.type.length
						? filter_find.type.map(function (b) {
								return b;
							})
						: "",
					server: filter_find.server.length
						? filter_find.server.map(function (b) {
								return b;
							})
						: "",
				},
				this.getChoice(),
			);
		};
		this.next = function () {
			var _this4 = this;
			var params = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

			var choice = _this4.getChoice();
			var serial = object.movie.name ? true : false;

			if (isLoadingMore || page >= seasonGroups.length) return;

			isLoadingMore = true;

			if (page === 0) {
				scroll.append(Lampa.Template.get("modss_online_watched", {}));
				_this4.updateWatched();
				shouldLoadToLastWatched = _this4.checkLastWatchedInAllSeasons();
			}

			var currentSeasonItems = seasonGroups[page];
			if (!currentSeasonItems || !currentSeasonItems.length) {
				isLoadingMore = false;
				return;
			}

			if (!params || Object.keys(params).length === 0) {
				params = this.getDefaultHandlers(allItemsToDisplay);
			}

			var seasonNumber = currentSeasonItems[0].season;
			this.getEpisodes(seasonNumber, choice, function (episodes) {
				_this4.appendSeason(seasonNumber);

				currentSeasonItems.forEach(function (item) {
					_this4.appendEpisode(item, episodes, choice, currentSeasonItems, params);
				});

				if (serial && !params.similars && choice.season !== -1 && episodes.length > currentSeasonItems.length) {
					var currentSeason = currentSeasonItems[0] ? currentSeasonItems[0].season : 1;
					var left = episodes.slice(currentSeasonItems.length);
					left.forEach(function (episode) {
						_this4.appendMissingEpisode(episode, currentSeason);
					});
				}

				page++;
				isLoadingMore = false;

				var lastWatchedSeason = _this4.getLastWatchedSeason();
				var currentLoadedSeason = seasonNumber;

				if (shouldLoadToLastWatched && lastWatchedSeason > 0 && currentLoadedSeason < lastWatchedSeason) {
					// Продолжаем загрузку только если еще не дошли до нужного сезона
					setTimeout(function () {
						if (page < seasonGroups.length) _this4.next(params);
						else Lampa.Controller.enable("content");
					}, 50);
				} else {
					shouldLoadToLastWatched = false;
					Lampa.Controller.enable("content");
				}
			});
		};
		this.checkLastWatchedInAllSeasons = function () {
			var choice = this.getChoice();
			var serial = object.movie.name ? true : false;

			if (!serial || !choice.episodes_view) return false;

			for (var season in choice.episodes_view) {
				if (choice.episodes_view[season] > 0) {
					return true;
				}
			}
			return false;
		};
		this.getLastWatchedSeason = function () {
			var choice = this.getChoice();
			if (!choice.episodes_view) return 0;
			var lastWatchedSeason = 0;

			if (lastWatchedSeason === 0) {
				var maxEpisode = 0;
				for (var season in choice.episodes_view) {
					var seasonNum = parseInt(season);
					var episode = choice.episodes_view[season];
					if (episode > 0) {
						// Берем сезон с максимальным номером эпизода как последний
						if (episode > maxEpisode || (episode === maxEpisode && seasonNum > lastWatchedSeason)) {
							maxEpisode = episode;
							lastWatchedSeason = seasonNum;
						}
					}
				}
			}

			return lastWatchedSeason;
		};
		this.appendEpisode = function (element, episodes, choice, items, params, is_append) {
			var index = element.episode - 1;
			var _this4 = this;
			var viewed = Lampa.Storage.cache("online_view", 5000, []);
			var serial = object.movie.name ? true : false;
			var fully = window.innerWidth > 480;

			var scroll_to_element = false;
			var scroll_to_mark = false;

			var more = object.movie.original_language == "ja" && episodes.length > items.length && object.movie.number_of_seasons < choice.seasons;
			var ismore = true;
			if (more) {
				var ep = more ? episodes.slice(items.length) : episodes;
				ismore = items[items.length - 1].episode >= episodes[ep.length].episode_number;
				if (ismore) ep = episodes.slice(items.length - (episodes.length - items.length < items.length - 1 ? 2 : 1));
			}

			var episodee =
				serial && episodes.length && !params.similars
					? (ismore && more ? ep : episodes).find(function (e, i) {
							return ismore && more ? index == i : (e.episode_number || e.number) == element.episode;
						})
					: false;

			var episode = false;
			if (serial && episodes.length && !params.similars) {
				if (object.movie.source == "pub" && episodes[0] && episodes[0].season !== undefined && episodes[0].episodes) {
					var seasonData = episodes.find(function (s) {
						return s.season == element.season;
					});
					if (seasonData && seasonData.episodes) {
						episode = seasonData.episodes.find(function (e) {
							return (e.episode_number || e.number) == element.episode;
						});
					}
				} else {
					episode = episodes.find(function (e, i) {
						return (e.episode_number || e.number) == element.episode;
					});
				}
			}

			var episode_num = element.episode || index + 1;
			var episode_last = choice.episodes_view[element.season];
			Lampa.Arrays.extend(element, {
				serv: element.serv ? element.serv : "",
				info: "",
				quality: "",
				time: Lampa.Utils.secondsToTime((episode ? episode.runtime : object.movie.runtime) * 60, true),
			});

			if (element.sizeB) element.quality = Lampa.Utils.calcBitrate(element.sizeB, episode ? episode.runtime : object.movie.runtime) + Lampa.Lang.translate("torrent_item_mb") + " - " + element.quality;

			var hash_timeline = Lampa.Utils.hash(element.season ? [element.season, element.season > 10 ? ":" : "", element.episode, object.movie.original_title].join("") : object.movie.original_title);
			var hash_behold = Lampa.Utils.hash(element.season ? [element.season, element.season > 10 ? ":" : "", element.episode, object.movie.original_title, element.voice_name].join("") : object.movie.original_title + element.title);
			var data = {
				hash_timeline: hash_timeline,
				hash_behold: hash_behold,
			};
			var info = [];

			if (element.season) {
				element.translate_episode_end = _this4.getLastEpisode(items);
				element.translate_voice = element.voice_name;
			}

			element.timeline = Lampa.Timeline.view(hash_timeline);
			if (episode) {
				element.title = element.episode_name || episode.name || episode.title || element.title;
				if (!element.info && episode.vote_average)
					info.push(
						Lampa.Template.get(
							"modss_online_rate",
							{
								rate: parseFloat(episode.vote_average + "").toFixed(1),
							},
							true,
						),
					);

				if (serial) {
					if (episode.air_date && fully && !(element.info.title || element.info).includes(Lampa.Utils.parseTime(episode.air_date).full)) info.push(Lampa.Utils.parseTime(episode.air_date).full);
				} else if (object.movie.release_date && object.movie.release_date.length > 4 && fully) {
					info.push(Lampa.Utils.parseTime(object.movie.release_date).full);
				}
			}

			if (!serial && object.movie.tagline && element.info.length < 30 && !(window.innerWidth < 920 && balanser == "hdr")) info.push(object.movie.tagline);

			if (element.info) info.push(element.info.title || element.info);
			if (element.voice_name && !(element.info.title || element.info).includes(element.voice_name)) info.push(element.voice_name);
			if (info.length)
				element.info = info
					.map(function (i) {
						return "<span>" + i + "</span>";
					})
					.join('<span class="online_modss-split">●</span>');

			var html = Lampa.Template.get("modss_online_full", element);
			var loader = html.find(".online_modss__loader");
			var image = html.find(".online_modss__img");

			if (!serial) {
				if (choice.movie_view == hash_behold) scroll_to_element = html;
			} else if (typeof episode_last !== "undefined" && episode_last == episode_num) {
				scroll_to_element = html;
				var cont = _this4.getChoice();
				if (Lampa.Storage.field("online_continued") && cont && cont.continued) {
					cont.continued = false;
					_this4.replaceChoice(cont, balanser);
					setTimeout(function () {
						$(html).trigger("hover:enter");
					}, 50);
				}
			}

			if (serial && episode_num && filter_find.type && filter_find.type.length) image.append('<div class="online_modss__type-video">' + element.type + "</div>");
			if (serial && episode_num && filter_find.season.length) image.append('<div class="online_modss__episode-number-season">S' + (element.season || (episode && (episode.snumber || episode.season_number)) || 0) + ":E" + (element.episode || (episode && (episode.number || episode.episode_number)) || 0) + "</div>");

			if (serial && !episode && filter_find.season.length) {
				image.append('<div class="online_modss__episode-number">' + ("0" + episode_num).slice(-2) + "</div>");
				loader.remove();
			} else {
				var img = html.find("img")[0];

				img.onerror = function () {
					img.src = "./img/img_broken.svg";
				};

				img.onload = function () {
					image.addClass("online_modss__img--loaded");
					loader.remove();
				};
				img.src = object.movie.source == "filmix" ? object.movie.img : object.movie.source == "pub" ? (episode && episode.thumbnail) || object.movie.background_image : element.img ? element.img : Lampa.TMDB.image("t/p/w300" + (episode ? episode.still_path : object.movie.backdrop_path));
				images.push(img);
			}

			html.find(".online_modss__timeline").append(Lampa.Timeline.render(element.timeline));

			if (Lampa.Timeline.details) html.find(".online_modss__timeline").append(Lampa.Timeline.details(element.timeline));
			if (element.subtitles) html.find(".online_modss__img").append('<div class="online-prestige__viewed online_modss__subtitle">' + Lampa.Template.get("icon_subs", {}, true) + "</div>");
			if (viewed.indexOf(hash_behold) !== -1) {
				scroll_to_mark = html;
				html.find(".online_modss__img").append('<div class="online-prestige__viewed online_modss__viewed">' + Lampa.Template.get("icon_viewed", {}, true) + "</div>");
			}

			element.mark = function () {
				viewed = Lampa.Storage.cache("online_view", 5000, []);

				if (viewed.indexOf(hash_behold) == -1) {
					viewed.push(hash_behold);
					Lampa.Storage.set("online_view", viewed);

					if (html.find(".online_modss__viewed").length == 0) {
						html.find(".online_modss__img").append('<div class="online-prestige__viewed online_modss__viewed">' + Lampa.Template.get("icon_viewed", {}, true) + "</div>");
					}
				}

				choice = _this4.getChoice();
				if (!serial) {
					choice.movie_view = hash_behold;
				} else {
					choice.episodes_view[element.season] = episode_num;
				}

				_this4.saveChoice(choice);
				_this4.new_seria();

				try {
					_this4.watched({
						balanser: balanser,
						balanser_name: sources[balanser].name,
						voice_id: choice.voice_id,
						voice_name: choice.voice_name || element.voice_name || element.title,
						episode: element.episode,
						season: element.season,
					});
				} catch (error) {
					console.log({
						err: error,
						bal: sources[balanser],
					});
				}
			};

			element.unmark = function () {
				viewed = Lampa.Storage.cache("online_view", 5000, []);

				if (viewed.indexOf(hash_behold) !== -1) {
					Lampa.Arrays.remove(viewed, hash_behold);
					Lampa.Storage.set("online_view", viewed);
					if (Lampa.Manifest.app_digital >= 177) Lampa.Storage.remove("online_view", hash_behold);
					html.find(".online_modss__viewed").remove();

					choice = _this4.getChoice();
					if (!serial && choice.movie_view === hash_behold) {
						choice.movie_view = "";
						_this4.saveChoice(choice);
					} else if (serial && choice.episodes_view[element.season]) {
						delete choice.episodes_view[element.season];
						_this4.saveChoice(choice);
					}
					_this4.new_seria();
				}
			};

			element.timeclear = function () {
				element.timeline.percent = 0;
				element.timeline.time = 0;
				element.timeline.duration = 0;
				Lampa.Timeline.update(element.timeline);

				choice = _this4.getChoice();
				if (!serial && choice.movie_view === hash_behold) {
					choice.movie_view = "";
					_this4.saveChoice(choice);
				} else if (serial && choice.episodes_view[element.season]) {
					delete choice.episodes_view[element.season];
					_this4.saveChoice(choice);
				}

				_this4.new_seria();
			};

			html.on("hover:enter", function () {
				if (object.movie.id) Lampa.Favorite.add("history", object.movie, 100);
				if (params.onEnter) params.onEnter(element, html, data);
			});
			html.on("hover:focus", function (e) {
				last = e.target;
				if (typeof element.voice == "string" && element.voice) {
					$(".voices").remove();
					$(".explorer-card__descr").hide().after('<div class="voices"></div>');
					$(".voices").html(Lampa.Lang.translate("<b>#{torrent_parser_voice}:</b><br>" + element.voice));
				} else $(".voices").remove();
				scroll.update($(e.target), true);
			});

			if (params.onRender) params.onRender(element, html, data);

			_this4.contextMenu({
				html: html,
				element: element,
				onFile: function onFile(call) {
					if (params.onContextMenu) params.onContextMenu(element, html, data, call);
				},
				onClearAllMark: function onClearAllMark() {
					allRenderedItems.forEach(function (elem) {
						elem.unmark();
					});
				},
				onClearAllTime: function onClearAllTime() {
					allRenderedItems.forEach(function (elem) {
						elem.timeclear();
					});
				},
			});

			allRenderedItems.push(element);

			scroll.append(html);

			if (is_append) Lampa.Controller.collectionAppend(html);

			if (scroll_to_element) {
				targetScrollElement = scroll_to_element[0];
				last = targetScrollElement;
			} else if (scroll_to_mark && !targetScrollElement) {
				targetScrollElement = scroll_to_mark[0];
				last = targetScrollElement;
			}
		};
		this.parse = function (json) {
			try {
				var _this = this;
				finalItems = [];
				if (json.folder || json.similars || json.episode) {
					extract = json;
				}
				var find_s, find_v, voice;
				var choice = this.getChoice(balanser);
				var select_voice = choice.voice_name;
				var select_season = choice.season;
				var items = extract.folder || extract.episode;

				// Проверяем специальную ошибку пустого кеша балансера
				if (json.error && json.message === "balanser cache is Empty") {
					sourcesCache = null;
					sourcesCacheTime = 0;
					sourcesData = null;
					filterSources = null;
					return Lampa.Activity.replace();
				}

				if (extract.similars) {
					this.activity.loader(false);
					this.similars(extract.results);
				} else if (json.error) return this.noConnectToServer(json);
				else if (!items || !Lampa.Arrays.getKeys(items).length) {
					console.log("Modss", "items NULL", items);
					return this.doesNotAnswer(object.search);
				} else {
					if (extract && extract.season && extract.season.length) {
						if (typeof extract.season[0] === "object" && extract.season[0].url) {
							filter_find.season = extract.season;
						} else {
							filter_find.season = extract.season
								.map(function (s) {
									return s.name || s.title || s;
								})
								.filter(function (season) {
									return season !== "Все сезоны";
								});
						}
						Lampa.Activity.active().activity.render().find(".filter--filter").show();
					}
					if (extract && extract.server) filter_find.server = extract.server;
					if (extract && extract.type) filter_find.type = extract.type;

					if (filter_find.season && filter_find.season.length) {
						filter_find.season = filter_find.season.sort(function (a, b) {
							var aTitle = typeof a === "object" ? a.title || a.name : a;
							var bTitle = typeof b === "object" ? b.title || b.name : b;
							var aNum = parseInt((aTitle + "").split(" ").pop());
							var bNum = parseInt((bTitle + "").split(" ").pop());
							return isNaN(aNum) ? 1 : isNaN(bNum) ? -1 : aNum - bNum;
						});
					}

					var season;
					if (select_season === -1) {
						season = "Все сезоны";
					} else {
						var seasonObj = filter_find.season[select_season];
						season = typeof seasonObj === "object" ? seasonObj.title || seasonObj.name || "Сезон " + (select_season + 1) : seasonObj;
					}
					if (!season) {
						var firstSeason = filter_find.season[0];
						season = typeof firstSeason === "object" ? firstSeason.title || firstSeason.name || "Сезон 1" : firstSeason || "Все сезоны";
					}

					if (((Lampa.Arrays.getKeys(items)[1] && isNaN(Lampa.Arrays.getKeys(items)[1])) || isNaN(Lampa.Arrays.getKeys(items)[0])) && extract.voice) {
						filter_find.voice = [];
						var sNum = season !== "Все сезоны" && typeof season === "string" ? season.split(" ").pop() : null;

						if (items) {
							var itemsKeys = Lampa.Arrays.getKeys(items);
							var isDirectSeasonMapping =
								itemsKeys.length > 0 &&
								itemsKeys.every(function (key) {
									return !isNaN(key) && Lampa.Arrays.isArray(items[key]);
								});

							if (isDirectSeasonMapping) {
								filter_find.voice = [];
							} else {
								for (var name in items) {
									if (items.hasOwnProperty(name)) {
										var elements = sNum ? items[name] && items[name][sNum] : [].concat.apply([], Lampa.Arrays.getValues(items[name]));
										if (Lampa.Arrays.isArray(elements) && elements.length && elements[0]) {
											var voiceName = elements[0].voice_name;
											if (voiceName && typeof voiceName === "string" && filter_find.voice.indexOf(voiceName) === -1) {
												filter_find.voice.push(voiceName);
											}
										}
									}
								}
							}
						}
					}

					if (!filter_find.voice.length && sNum && items) {
						for (var name in items) {
							if (items.hasOwnProperty(name)) {
								var allElements = [].concat.apply([], Lampa.Arrays.getValues(items[name]));
								if (Lampa.Arrays.isArray(allElements) && allElements.length && allElements[0]) {
									var voiceName = allElements[0].voice_name;
									if (voiceName && filter_find.voice.indexOf(voiceName) === -1) {
										filter_find.voice.push(voiceName);
									}
								}
							}
						}
					}

					choice.seasons = filter_find.season.length;

					if (filter_find.type && filter_find.type.length > 0) {
						if (choice.type < 0 || choice.type >= filter_find.type.length) {
							var hdrIndex = filter_find.type.indexOf("HDR");
							if (hdrIndex !== -1) choice.type = hdrIndex;
							else choice.type = 0;
						}
					}

					// Проверяем доступность выбранного сезона в выбранном типе
					if (filter_find.type && filter_find.type.length > 0 && items && choice.season >= 0) {
						var selectedType = filter_find.type[choice.type] || "HDR";
						var isTypeBasedStructure = extract && extract.type && extract.type.length > 0;

						if (isTypeBasedStructure && items[selectedType]) {
							var selectedSeasonObj = filter_find.season[choice.season];
							var seasonNumber = selectedSeasonObj.split(" ").pop();

							// Если выбранный сезон недоступен в этом типе
							if (seasonNumber && !items[selectedType][seasonNumber]) {
								var availableSeasons = Lampa.Arrays.getKeys(items[selectedType]);
								if (availableSeasons.length > 0) {
									// Ищем индекс первого доступного сезона в filter_find.season
									for (var i = 0; i < filter_find.season.length; i++) {
										var checkSeasonObj = filter_find.season[i];
										var checkSeasonNumber = checkSeasonObj.split(" ").pop();

										if (checkSeasonNumber && items[selectedType][checkSeasonNumber]) {
											choice.season = i;
											break;
										}
									}
								}
							}
						}
					}

					this.replaceChoice(choice);

					if (extract.voice && typeof extract.voice[0] == "object") filter_find.voice = extract.voice;
					if (season) {
						var foundVoice = -1;
						var currentSeason = season.split(" ").pop();

						if (items && Lampa.Arrays.getKeys(items).length > 0 && !isNaN(Lampa.Arrays.getKeys(items)[0])) {
							if (select_voice && filter_find.voice && filter_find.voice.length) {
								foundVoice = _this.findBestVoiceMatch(select_voice, filter_find.voice);
							}

							if (foundVoice === -1 && choice.voice_id && filter_find.voice) {
								for (var i = 0; i < filter_find.voice.length; i++) {
									var v = filter_find.voice[i];
									if (typeof v === "object" && v.id == choice.voice_id) {
										foundVoice = i;
										break;
									}
								}
							}

							if (foundVoice === -1 && choice.voice < filter_find.voice.length) foundVoice = choice.voice;
							if (foundVoice === -1) foundVoice = 0;

							choice.voice = foundVoice;
							if (typeof filter_find.voice[foundVoice] === "object") {
								choice.voice_id = filter_find.voice[foundVoice].id;
								choice.voice_name = filter_find.voice[foundVoice].title || filter_find.voice[foundVoice].name;
							}

							voice = filter_find.voice[foundVoice];
						} else {
							var availableVoices = [];
							if (items) {
								for (var name in items) {
									if (items.hasOwnProperty(name) && items[name] && items[name][currentSeason] && Lampa.Arrays.isArray(items[name][currentSeason]) && items[name][currentSeason].length > 0 && items[name][currentSeason][0] && items[name][currentSeason][0].voice_name) {
										var voiceName = items[name][currentSeason][0].voice_name;
										if (availableVoices.indexOf(voiceName) === -1) {
											availableVoices.push(voiceName);
										}
									}
								}
							}
							var hasSelectVoice = false;
							if (select_voice) {
								// Сначала проверяем точное совпадение
								for (var j = 0; j < availableVoices.length; j++) {
									if (_this.equalTitle(select_voice, availableVoices[j])) {
										hasSelectVoice = true;
										break;
									}
								}
								// Если точное совпадение не найдено, проверяем частичное
								if (!hasSelectVoice) {
									for (var j = 0; j < availableVoices.length; j++) {
										if (_this.compareVoiceNames(select_voice, availableVoices[j])) {
											hasSelectVoice = true;
											break;
										}
									}
								}
							}

							if (select_voice && hasSelectVoice) {
								foundVoice = _this.findBestVoiceMatch(select_voice, filter_find.voice);
							}

							if (foundVoice === -1 && choice.voice < filter_find.voice.length) {
								var choiceVoiceName = filter_find.voice[choice.voice];
								if (typeof choiceVoiceName === "object") {
									choiceVoiceName = choiceVoiceName.title || choiceVoiceName.name;
								}

								var hasChoiceVoice = false;
								if (choiceVoiceName) {
									// Сначала проверяем точное совпадение
									for (var k = 0; k < availableVoices.length; k++) {
										if (_this.equalTitle(choiceVoiceName, availableVoices[k])) {
											hasChoiceVoice = true;
											break;
										}
									}
									// Если точное совпадение не найдено, проверяем частичное
									if (!hasChoiceVoice) {
										for (var k = 0; k < availableVoices.length; k++) {
											if (_this.compareVoiceNames(choiceVoiceName, availableVoices[k])) {
												hasChoiceVoice = true;
												break;
											}
										}
									}
								}

								if (hasChoiceVoice) foundVoice = choice.voice;
							}
							if (foundVoice === -1) foundVoice = 0;

							if (availableVoices.length) choice.voice = foundVoice;

							voice = (filter_find.voice[choice.voice] && (filter_find.voice[choice.voice].name || filter_find.voice[choice.voice].title)) || filter_find.voice[choice.voice];
						}

						find_s = extract.season.find(function (s) {
							return (s.name || s.title) == season;
						});

						if (typeof voice === "object") {
							find_v = voice;
						} else {
							find_v = ((extract.voice && extract.voice) || filter_find.voice).find(function (v) {
								return (v.name || v.title) == voice;
							});
						}

						if (!voice && filter_find.voice.length) {
							voice = (filter_find.voice[0] && (filter_find.voice[0].name || filter_find.voice[0].title)) || find_v;
							choice.voice = 0;
						}
					}

					if (extract && extract.season && extract.season.length && typeof extract.season[0] !== "object" && season === "Все сезоны") {
						var allSeasons = filter_find.season
							.filter(function (s) {
								return s !== "Все сезоны";
							})
							.map(function (s) {
								return typeof s === "string" ? s.split(" ").pop() : String(s);
							});

						// Проверяем есть ли типы видео в extract
						var isTypeBasedStructure = extract && extract.type && extract.type.length > 0;

						if (isTypeBasedStructure) {
							// Новая структура folder[type][season][] - фильтруем по типу
							finalItems = [];
							var selectedType = this.selectVideoType(filter_find, choice);
							this.replaceChoice(choice);

							if (items[selectedType]) {
								// Сначала находим какие сезоны доступны в выбранном типе
								var availableSeasonsInType = [];
								for (var i = 0; i < allSeasons.length; i++) {
									var s = allSeasons[i];
									if (items[selectedType][s] && Lampa.Arrays.isArray(items[selectedType][s]) && items[selectedType][s].length > 0) {
										availableSeasonsInType.push(s);
									}
								}

								// Если нет доступных сезонов в выбранном типе, берем все доступные сезоны из этого типа
								if (availableSeasonsInType.length === 0) {
									var allAvailableSeasons = Lampa.Arrays.getKeys(items[selectedType]);
									availableSeasonsInType = allAvailableSeasons.filter(function (season) {
										return items[selectedType][season] && Lampa.Arrays.isArray(items[selectedType][season]) && items[selectedType][season].length > 0;
									});
								}

								// Теперь собираем эпизоды из доступных сезонов
								for (var i = 0; i < availableSeasonsInType.length; i++) {
									var s = availableSeasonsInType[i];
									for (var j = 0; j < items[selectedType][s].length; j++) {
										var item = items[selectedType][s][j];
										item.season = parseInt(s);
										finalItems.push(item);
									}
								}
							}
							finalItems = finalItems.sort(function (a, b) {
								if (a.season === b.season) return a.episode - b.episode;
								return a.season - b.season;
							});
						} else {
							if (!filter_find.voice.length || filter_find.voice.length === 0) {
								// Нет озвучек - обрабатываем items напрямую по сезонам
								finalItems = [];
								for (var i = 0; i < allSeasons.length; i++) {
									var s = allSeasons[i];
									if (items[s] && Lampa.Arrays.isArray(items[s])) {
										for (var j = 0; j < items[s].length; j++) {
											var item = items[s][j];
											item.season = parseInt(s);
											finalItems.push(item);
										}
									}
								}
								finalItems = finalItems.sort(function (a, b) {
									if (a.season === b.season) return a.episode - b.episode;
									return a.season - b.season;
								});
							} else {
								// Есть озвучки - используем стандартную логику
								var selectedVoice = select_voice || choice.voice_name || voice;
								var selectedVoiceId = choice.voice_id;

								if (!selectedVoice && selectedVoiceId && filter_find.voice) {
									for (var i = 0; i < filter_find.voice.length; i++) {
										var v = filter_find.voice[i];
										if (typeof v === "object" && v.id == selectedVoiceId) {
											selectedVoice = v.title || v.name;
											break;
										}
									}
								}
								var res = this.collectEpisodesAllSeasons(items, allSeasons, selectedVoice, filter_find.voice, selectedVoiceId);
								finalItems = res.finalItems;
								choice.voice = res.voiceIndex;

								finalItems = finalItems.sort(function (a, b) {
									if (a.season === b.season) return a.episode - b.episode;
									return a.season - b.season;
								});
							}
						}
					} else if (season) {
						// Используем исправленный choice.season вместо названия сезона
						var seasonObj = filter_find.season[choice.season];
						var seasonNumber = typeof seasonObj === "object" ? (seasonObj.title || seasonObj.name || "").split(" ").pop() : (seasonObj || "").split(" ").pop();

						// Проверяем есть ли типы видео в extract
						var folderKeys = Lampa.Arrays.getKeys(items);
						var isTypeBasedStructure = extract && extract.type && extract.type.length > 0;

						var isDirectSeasonMapping =
							folderKeys.length > 0 &&
							folderKeys.every(function (key) {
								return !isNaN(key) && Lampa.Arrays.isArray(items[key]);
							});

						// Если выбранного сезона нет в доступных данных, берем первый доступный
						if (isDirectSeasonMapping && !items[seasonNumber]) {
							var availableSeasons = folderKeys.filter(function (key) {
								return items[key] && items[key].length > 0;
							});
							if (availableSeasons.length > 0) {
								seasonNumber = availableSeasons[0];
								// Обновляем choice.season на индекс первого доступного сезона
								for (var i = 0; i < filter_find.season.length; i++) {
									var checkSeasonObj = filter_find.season[i];
									var checkSeasonNum = typeof checkSeasonObj === "object" ? (checkSeasonObj.title || checkSeasonObj.name || "").split(" ").pop() : (checkSeasonObj || "").split(" ").pop();
									if (checkSeasonNum === seasonNumber) {
										choice.season = i;
										this.replaceChoice(choice);
										break;
									}
								}
							}
						}

						if (isTypeBasedStructure) {
							// Новая структура folder[type][season][] - фильтруем по типу
							finalItems = [];
							var selectedType = this.selectVideoType(filter_find, choice);
							this.replaceChoice(choice);

							if (items[selectedType]) {
								var actualSeasonNumber = seasonNumber;

								// Если выбранного сезона нет в этом типе, найдем первый доступный
								if (!items[selectedType][seasonNumber]) {
									var availableSeasons = Lampa.Arrays.getKeys(items[selectedType]);
									if (availableSeasons.length > 0) {
										actualSeasonNumber = availableSeasons[0];
									}
								}

								if (items[selectedType][actualSeasonNumber]) {
									finalItems = items[selectedType][actualSeasonNumber] || [];
									finalItems.forEach(function (item) {
										item.season = parseInt(actualSeasonNumber);
									});
								}
							}
						} else if (isDirectSeasonMapping) {
							// Структура items[season_number] - фильтруем по voice_id если есть
							finalItems = items[seasonNumber] || [];

							// Фильтруем по voice_id если он есть в choice и если в эпизодах есть voice_id
							if (finalItems.length && choice.voice_id && finalItems[0] && finalItems[0].voice_id) {
								finalItems = finalItems.filter(function (item) {
									return item.voice_id == choice.voice_id;
								});
							}
							if (finalItems.length) {
								finalItems.forEach(function (item) {
									item.season = parseInt(seasonNumber);
								});
							}
						} else if (voice) {
							// Стандартная структура с озвучками
							if (Lampa.Arrays.getKeys(items)[1] ? !isNaN(Lampa.Arrays.getKeys(items)[1]) : !isNaN(Lampa.Arrays.getKeys(items)[0])) {
								finalItems = items[seasonNumber]
									? items[seasonNumber].filter(function (itm) {
											itm.info = voice;
											var voiceId = find_v ? find_v.id : choice.voice_id;
											return voiceId && itm.voice_id == voiceId && itm.season == seasonNumber;
										})
									: [];
							} else {
								var find = items[voice] && items[voice][seasonNumber];
								if (!find && !extract.season[0].url && balanser !== "hdrezka") {
									filter_find.season = [];
									if (items[voice]) {
										Lampa.Arrays.getKeys(items[voice]).forEach(function (s) {
											filter_find.season.push(Lampa.Lang.translate("torrent_serial_season") + " " + s);
										});
									}
								}

								if (!find && find_s && find_s.url) {
									this.request(this.requestParams(find_s.url));
								} else {
									var other = items[voice] && Lampa.Arrays.getKeys(items[voice])[0] && items[voice][Lampa.Arrays.getKeys(items[voice])[0]];
									finalItems = find ? find : other || [];
								}
							}
						} else {
							// Нет голоса, пытаемся взять напрямую по сезону
							finalItems = items[seasonNumber] || items;
						}
					}

					if (find_v && find_v.url && filter_find.season.length && Lampa.Arrays.getKeys(filter_find.voice).length && Lampa.Arrays.getKeys(items).length && !finalItems.length) {
						this.request(this.requestParams(find_v.url));
					} else if (find_s && find_s.url && filter_find.season.length && Lampa.Arrays.getKeys(items).length && !finalItems) {
						this.request(this.requestParams(find_s.url));
					} else if (finalItems && finalItems.length) {
						this.display(!choice.order ? finalItems : finalItems.reverse());
					} else if (!Lampa.Arrays.getKeys(items).length) this.empty();
				}
			} catch (e) {
				console.log("Modss", "parse error", e);
				Lampa.Noty.show("MODSs ОШИБКА ОНЛАЙН parse -> " + e);
				this.doesNotAnswer();
				this.activity.loader(false);
			}
		};
		this.selectVideoType = function (filter_find, choice) {
			var selectedType = null;
			var selectedIndex = 0;

			if (filter_find.type && filter_find.type.length > 0) {
				// Проверяем что choice.type не пустая строка и является корректным индексом
				var typeIndex = parseInt(choice.type);
				if (!isNaN(typeIndex) && typeIndex >= 0 && typeIndex < filter_find.type.length) {
					selectedType = filter_find.type[typeIndex];
					selectedIndex = typeIndex;
				} else if (filter_find.type.indexOf("HDR") !== -1) {
					selectedIndex = filter_find.type.indexOf("HDR");
					selectedType = "HDR";
				} else {
					selectedIndex = 0;
					selectedType = filter_find.type[0];
				}

				// Сохраняем выбранный индекс типа в choice
				choice.type = selectedIndex;
			}

			return selectedType;
		};
		this.getAvailableVoicesForSeason = function (folder, s) {
			var voices = [];

			// Проверяем, является ли структура folder прямым маппингом сезонов
			var folderKeys = Lampa.Arrays.getKeys(folder);
			var isDirectSeasonMapping =
				folderKeys.length > 0 &&
				folderKeys.every(function (key) {
					return !isNaN(key) && Lampa.Arrays.isArray(folder[key]);
				});

			if (isDirectSeasonMapping) {
				// Структура folder[season_number] - нет озвучек
				return [];
			} else {
				// Стандартная структура folder[voice_name][season_number]
				for (var name in folder) {
					if (folder[name] && folder[name][s] && folder[name][s].length && folder[name][s][0].voice_name) {
						var v = folder[name][s][0].voice_name;
						if (voices.indexOf(v) === -1) voices.push(v);
					}
				}
			}
			return voices;
		};
		this.getEpisodesByVoice = function (folder, s, voiceName, voiceId) {
			var folderKeys = Lampa.Arrays.getKeys(folder);
			var isDirectSeasonMapping =
				folderKeys.length > 0 &&
				folderKeys.every(function (key) {
					return !isNaN(key) && Lampa.Arrays.isArray(folder[key]);
				});

			if (isDirectSeasonMapping) {
				if (folder[s] && Lampa.Arrays.isArray(folder[s])) {
					var episodes = folder[s];
					if (voiceId) {
						episodes = episodes.filter(function (item) {
							return item.voice_id == voiceId;
						});
					}
					var mappedEpisodes = episodes.map(function (item) {
						item.season = parseInt(s);
						return item;
					});
					return mappedEpisodes;
				}
				return [];
			} else {
				var availableVoices = [];
				var folderKeys = [];

				for (var name in folder) {
					if (folder[name] && folder[name][s] && folder[name][s].length && folder[name][s][0].voice_name) {
						availableVoices.push(folder[name][s][0].voice_name);
						folderKeys.push(name);
					}
				}
				var bestIndex = this.findBestVoiceMatch(voiceName, availableVoices);

				if (bestIndex !== -1) {
					var folderKey = folderKeys[bestIndex];
					return folder[folderKey][s].map(function (item) {
						item.season = parseInt(s);
						return item;
					});
				}

				return [];
			}
		};
		this.collectEpisodesAllSeasons = function (folder, allSeasons, select_voice, voiceList, selectedVoiceId) {
			var finalItems = [];
			var foundVoice = false;
			var voiceIndex = 0;

			var folderKeys = Lampa.Arrays.getKeys(folder);
			var isDirectSeasonMapping =
				folderKeys.length > 0 &&
				folderKeys.every(function (key) {
					return !isNaN(key) && Lampa.Arrays.isArray(folder[key]);
				});

			if (isDirectSeasonMapping) {
				if (selectedVoiceId) {
					for (var i = 0; i < allSeasons.length; i++) {
						var s = allSeasons[i];
						if (folder[s] && Lampa.Arrays.isArray(folder[s])) {
							for (var j = 0; j < folder[s].length; j++) {
								var item = folder[s][j];
								if (item.voice_id == selectedVoiceId) {
									item.season = parseInt(s);
									finalItems.push(item);
								}
							}
						}
					}

					var voiceIndexInList = this.findVoiceIndexById(selectedVoiceId, voiceList);
					return { finalItems: finalItems, voiceIndex: voiceIndexInList !== -1 ? voiceIndexInList : 0 };
				}

				var availableVoices = [];
				for (var i = 0; i < allSeasons.length; i++) {
					var s = allSeasons[i];
					if (folder[s] && Lampa.Arrays.isArray(folder[s])) {
						for (var j = 0; j < folder[s].length; j++) {
							var item = folder[s][j];
							if (item.voice_name && availableVoices.indexOf(item.voice_name) === -1) {
								availableVoices.push(item.voice_name);
							}
						}
					}
				}

				if (availableVoices.length > 0) {
					var firstVoice = availableVoices[0];
					for (var i = 0; i < allSeasons.length; i++) {
						var s = allSeasons[i];
						if (folder[s] && Lampa.Arrays.isArray(folder[s])) {
							for (var j = 0; j < folder[s].length; j++) {
								var item = folder[s][j];
								if (item.voice_name === firstVoice) {
									item.season = parseInt(s);
									finalItems.push(item);
								}
							}
						}
					}
				}
				return { finalItems: finalItems, voiceIndex: 0 };
			} else {
				if (select_voice) {
					var selectedVoiceId = this.findVoiceIdByName(select_voice, voiceList);

					for (var i = 0; i < allSeasons.length; i++) {
						var s = allSeasons[i];
						var episodes = this.getEpisodesByVoice(folder, s, select_voice, selectedVoiceId);
						if (episodes.length) {
							for (var j = 0; j < episodes.length; j++) finalItems.push(episodes[j]);
							foundVoice = true;
						}
					}
					if (foundVoice && voiceList.length) {
						var idx = this.findBestVoiceMatch(select_voice, voiceList);
						voiceIndex = idx !== -1 ? idx : 0;
					}
				}
				if (!foundVoice && voiceList.length) {
					var firstVoice = this.getVoiceName(voiceList[0]);
					var firstVoiceId = typeof voiceList[0] === "object" ? voiceList[0].id : null;
					for (var i = 0; i < allSeasons.length; i++) {
						var s = allSeasons[i];
						var episodes = this.getEpisodesByVoice(folder, s, firstVoice, firstVoiceId);
						if (episodes.length) {
							for (var j = 0; j < episodes.length; j++) finalItems.push(episodes[j]);
						}
					}
					voiceIndex = 0;
				}
				return { finalItems: finalItems, voiceIndex: voiceIndex };
			}
		};
		this.equalTitle = function (t1, t2) {
			return typeof t1 === "string" && typeof t2 === "string" && t1.toLowerCase().trim() === t2.toLowerCase().trim();
		};
		this.extractVoiceKeywords = function (voiceName) {
			if (!voiceName) return [];

			var lower = voiceName.toLowerCase();
			lower = lower.replace(/^(mvo|dub|dvo)\s*\|\s*/i, "");
			lower = lower.replace(/^\([a-z]{2,3}\)\s*/i, "");

			var brackets = [];
			var bracketsMatch = lower.match(/[\[\(]([^\]\)]+)[\]\)]/g);
			if (bracketsMatch) {
				bracketsMatch.forEach(function (match) {
					var content = match.replace(/[\[\(\]\)]/g, "");
					brackets.push(content);
				});
			}

			var mainText = lower.replace(/[\[\(][^\]\)]*[\]\)]/g, "").trim();

			var words = mainText.split(/\s+/).filter(function (word) {
				return word.length > 0;
			});

			brackets.forEach(function (bracket) {
				var bracketWords = bracket.split(/[,\s]+/).filter(function (word) {
					return word.length > 0;
				});
				words = words.concat(bracketWords);
			});

			var voiceVariants = {
				netflix: ["netflix", "нетфликс"],
				hbo: ["hbo", "хбо"],
				disney: ["disney", "дисней"],
				amazon: ["amazon", "амазон"],
				rus: ["rus", "рус", "russian"],
				ukr: ["ukr", "укр", "ukrainian"],
				eng: ["eng", "англ", "english"],
				lostfilm: ["lostfilm", "лостфильм"],
				hdrezka: ["hdrezka", "хдрезка"],
				coldfilm: ["coldfilm", "колдфильм"],
				ultradox: ["ultradox", "ультрадокс"],
				softbox: ["softbox", "софтбокс"],
				tvshows: ["tvshows", "тв шоуз"],
				videofilm: ["videofilm", "видеофильм"],
				animaunt: ["animaunt", "анимаунт"],
				rudub: ["rudub", "рудаб"],
				nova: ["nova", "нова"],
				dubляж: ["dubляж", "дубляж"],
				"1winstudio": ["1winstudio", "1вин студио", "1win Studio", "1WINStudio", "1winstudio", "1win", "1вин", "1win studio"],
				закадры: ["закадры", "zakadry"],
				shelby: ["shelby", "шелби"],
				skyline: ["skyline", "скайлайн"],
				dragon: ["dragon", "драгон"],
				money: ["money", "мани"],
				studio: ["studio", "студио"],
				head: ["head", "хэд"],
				sound: ["sound", "саунд"],
				red: ["red", "ред"],
				ltd: ["ltd", "лтд"],
				кашкин: ["кашкин", "kashkin"],
				vulpes: ["vulpes", "вулпес"],
				kerob: ["kerob", "кероб"],
				питерский: ["питерский", "pitersky"],
				фильмэкспорт: ["фильмэкспорт", "filmexport"],
				clubfate: ["clubfate", "клабфейт"],
				ideafilm: ["ideafilm", "идеяфильм"],
				pashaup: ["pashaup", "пашаап"],
				живов: ["живов", "zhivov"],
				rizz: ["rizz", "ризз"],
				fisher: ["fisher", "фишер"],
				инфо: ["инфо", "info"],
				киномания: ["киномания", "kinomania"],
				smallfilm: ["smallfilm", "смолфильм"],
				кузьмичёв: ["кузьмичёв", "kuzmichev"],
				дроздов: ["дроздов", "drozdov"],
				nice: ["nice", "найс"],
				media: ["media", "медиа"],
				интер: ["интер", "inter"],
				лебедев: ["лебедев", "lebedev"],
				мосфильм: ["мосфильм", "mosfilm"],
				greb: ["greb", "греб"],
				creative: ["creative", "креативе"],
				hellomickey: ["hellomickey", "хэллоумикки"],
				production: ["production", "продакшн"],
				zone: ["zone", "зона"],
				vision: ["vision", "вижн"],
				завгородний: ["завгородний", "zavgorodny"],
				строев: ["строев", "stroev"],
				elrom: ["elrom", "элром"],
				elegia: ["elegia", "элегия"],
				гланц: ["гланц", "glanz"],
				петербургский: ["петербургский", "petersburg"],
				бибиков: ["бибиков", "bibikov"],
				витя: ["витя", "vitya"],
				говорун: ["говорун", "govorun"],
				медведев: ["медведев", "medvedev"],
				анубис: ["анубис", "anubis"],
				omskbird: ["omskbird", "омскберд"],
				яковлев: ["яковлев", "yakovlev"],
				firedub: ["firedub", "файрдаб"],
				fdv: ["fdv", "фдв"],
				galvid: ["galvid", "галвид"],
				белов: ["белов", "belov"],
				нурмухаметов: ["нурмухаметов", "nurmuhametov"],
				liga: ["liga", "лига"],
				hq: ["hq", "хк"],
				skyefilmtv: ["skyefilmtv", "скайфильмтв"],
				victoryfilms: ["victoryfilms", "викториафильмс"],
				sony: ["sony", "сони"],
				channel: ["channel", "канал"],
				jetix: ["jetix", "джетикс"],
				apofysteam: ["apofysteam", "апофис"],
				fox: ["fox", "фокс"],
				russia: ["russia", "россия"],
				премьер: ["премьер", "premier"],
				мультимедиа: ["мультимедиа", "multimedia"],
				tv1000: ["tv1000", "тв1000"],
				иддк: ["иддк", "iddk"],
				gremlin: ["gremlin", "гремлин"],
				анвад: ["анвад", "anvad"],
				кура: ["кура", "kura"],
				arasi: ["arasi", "арази"],
				project: ["project", "проект"],
				tatamifilm: ["tatamifilm", "татамифильм"],
				zerzia: ["zerzia", "зерзия"],
				векшин: ["векшин", "vekshin"],
				bonsai: ["bonsai", "бонсай"],
				foxlife: ["foxlife", "фоксляйф"],
				new: ["new", "нью"],
				records: ["records", "рекордс"],
				визгунов: ["визгунов", "vizgunov"],
				videobiz: ["videobiz", "видеобиз"],
				филонов: ["филонов", "filonov"],
				поздняков: ["поздняков", "pozdnyakov"],
				lexikc: ["lexikc", "лексик"],
				viasat: ["viasat", "виасат"],
				history: ["history", "хистори"],
				ошурков: ["ошурков", "oshurkov"],
				ivi: ["ivi", "иви"],
				васька: ["васька", "vaska"],
				куролесов: ["куролесов", "kurolesov"],
				кураж: ["кураж", "kurazh"],
				бамбей: ["бамбей", "bambey"],
				леша: ["леша", "lesha"],
				прапорщик: ["прапорщик", "praporschik"],
				cbs: ["cbs", "цбс"],
				drama: ["drama", "драма"],
				studioband: ["studioband", "студиобанд"],
				велес: ["велес", "veles"],
				дьяков: ["дьяков", "dyakov"],
				щегольков: ["щегольков", "schegolkov"],
				paravozik: ["paravozik", "паравозик"],
				animespace: ["animespace", "анимеспейс"],
				team: ["team", "тим"],
				east: ["east", "ист"],
				dream: ["dream", "дрим"],
				xdub: ["xdub", "иксдаб"],
				dorama: ["dorama", "дорама"],
				колобок: ["колобок", "kolobok"],
				четыре: ["четыре", "chetyre"],
				квадрате: ["квадрате", "kvadrate"],
				vip: ["vip", "вип"],
				premiere: ["premiere", "премьера"],
				agatha: ["agatha", "агата"],
				studdio: ["studdio", "студдио"],
				uaflix: ["uaflix", "уафлукс"],
				laci: ["laci", "лаци"],
				дубровин: ["дубровин", "dubrovin"],
				zee: ["zee", "зи"],
				tv: ["tv", "тв"],
				cinema: ["cinema", "кинема"],
				prestige: ["prestige", "престиж"],
				explorer: ["explorer", "эксплорер"],
				1001: ["1001", "1001"],
				axn: ["axn", "аксн"],
				sci: ["sci", "сай"],
				fi: ["fi", "фай"],
				набиев: ["набиев", "nabiev"],
				петербуржец: ["петербуржец", "peterburzhec"],
				lupin: ["lupin", "лупин"],
				koleso: ["koleso", "колесо"],
				gezell: ["gezell", "гезелл"],
				хихидок: ["хихидок", "hihidok"],
				сокуров: ["сокуров", "sokurov"],
				так: ["так", "tak"],
				треба: ["треба", "treba"],
				пучков: ["пучков", "puchkov"],
				точка: ["точка", "tochka"],
				zрения: ["zрения", "zreniya"],
				arisu: ["arisu", "арису"],
				anyfilm: ["anyfilm", "энифильм"],
				parovoz: ["parovoz", "паровоз"],
				kerems13: ["kerems13", "керемс13"],
				aurafilm: ["aurafilm", "аурафильм"],
				ртр: ["ртр", "rtr"],
				зебуро: ["зебуро", "zeburo"],
				onibaku: ["onibaku", "онибаку"],
				neon: ["neon", "неон"],
				mtv: ["mtv", "мтв"],
				мьюзик: ["мьюзик", "music"],
				трейд: ["трейд", "trade"],
				шадинский: ["шадинский", "shadinsky"],
				килька: ["килька", "kilka"],
				solod: ["solod", "солод"],
				bravesound: ["bravesound", "брейвсаунд"],
				гуртом: ["гуртом", "gurtom"],
				victeam: ["victeam", "виктим"],
				mixfilm: ["mixfilm", "миксфильм"],
				extrabit: ["extrabit", "экстрабит"],
				стартрек: ["стартрек", "startrek"],
				brain: ["brain", "брейн"],
				ктк: ["ктк", "ktk"],
				морозов: ["морозов", "morozov"],
				cls: ["cls", "клс"],
				horizon: ["horizon", "хоризон"],
				max: ["max", "макс"],
				nabokov: ["nabokov", "набоков"],
				rumble: ["rumble", "рамбл"],
				толмачев: ["толмачев", "tolmachev"],
				imageart: ["imageart", "имеджарт"],
				нст: ["нст", "nst"],
				bd: ["bd", "бд"],
				cee: ["cee", "си"],
				tf: ["tf", "тф"],
				anigroup: ["anigroup", "анигруп"],
				видеосервис: ["видеосервис", "videoservice"],
				opendub: ["opendub", "опендаб"],
				st: ["st", "ст"],
				удивительные: ["удивительные", "wonderful"],
				приключения: ["приключения", "adventures"],
				сериалы: ["сериалы", "series"],
				фильмы: ["фильмы", "films"],
				мультфильмы: ["мультфильмы", "cartoons"],
				дорамы: ["дорамы", "doramas"],
				аниме: ["аниме", "anime"],
				оригинал: ["оригинал", "original"],
				перевод: ["перевод", "translation"],
				субтитры: ["субтитры", "subtitles"],
				озвучка: ["озвучка", "dubbing"],
				многоголосый: ["многоголосый", "multivoice"],
				закадровый: ["закадровый", "voiceover"],
			};

			var normalized = words.map(function (word) {
				word = word.replace(/[,\.\-_]/g, "").trim();
				for (var key in voiceVariants) {
					if (voiceVariants[key].indexOf(word) !== -1) return key;
				}

				return word;
			});

			return normalized.filter(function (word) {
				return word.length > 0;
			});
		};
		this.normalizeVoiceName = function (voiceName) {
			if (!voiceName) return "";

			// Убеждаемся что voiceName это строка
			var normalized = typeof voiceName === "string" ? voiceName : String(voiceName);

			normalized = normalized.replace(/^(MVO|DUB|DVO|VO)\s*\|\s*/i, "");
			normalized = normalized.replace(/^\([A-Z]{2,3}\)\s*/i, "");
			normalized = normalized.replace(/\s*[&|+,]\s*/g, " | ");
			normalized = normalized.replace(/studio\s+band/gi, "studioband");
			normalized = normalized.replace(/\s*\|\s*/g, " | ");
			normalized = normalized.replace(/\s+/g, " ").trim();

			return normalized.toLowerCase();
		};
		this.compareVoiceNames = function (voiceName1, voiceName2) {
			if (!voiceName1 || !voiceName2) return false;
			if (this.equalTitle(voiceName1, voiceName2)) return true;

			var normalized1 = this.normalizeVoiceName(voiceName1);
			var normalized2 = this.normalizeVoiceName(voiceName2);
			if (normalized1 === normalized2) return true;

			var voice1Lower = voiceName1.toLowerCase().trim();
			var voice2Lower = voiceName2.toLowerCase().trim();

			var minLength = Math.min(voice1Lower.length, voice2Lower.length);
			var maxLength = Math.max(voice1Lower.length, voice2Lower.length);

			if (minLength >= 3 && (maxLength - minLength) / maxLength > 0.3) {
				if (voice1Lower.indexOf(voice2Lower) !== -1 || voice2Lower.indexOf(voice1Lower) !== -1) return true;
				if (normalized1.indexOf(normalized2) !== -1 || normalized2.indexOf(normalized1) !== -1) return true;
			}

			var keywords1 = this.extractVoiceKeywords(voiceName1);
			var keywords2 = this.extractVoiceKeywords(voiceName2);

			if (keywords1.length === 0 || keywords2.length === 0) return false;

			var matches = 0;
			var totalKeywords = Math.min(keywords1.length, keywords2.length);

			keywords1.forEach(function (keyword1) {
				keywords2.forEach(function (keyword2) {
					if (keyword1 === keyword2) matches++;
				});
			});

			var hasCommonWords1 = false;
			var hasCommonWords2 = false;
			var commonWords = ["studio", "студио", "sound", "саунд"];

			keywords1.forEach(function (keyword) {
				if (commonWords.indexOf(keyword) !== -1) hasCommonWords1 = true;
			});

			keywords2.forEach(function (keyword) {
				if (commonWords.indexOf(keyword) !== -1) hasCommonWords2 = true;
			});

			if (hasCommonWords1 && hasCommonWords2) {
				var maxKeywords = Math.max(keywords1.length, keywords2.length);
				var minKeywords = Math.min(keywords1.length, keywords2.length);

				return maxKeywords > minKeywords ? matches === maxKeywords : matches >= minKeywords;
			}
			return matches > 0 && matches >= Math.ceil(totalKeywords / 2);
		};
		this.findBestVoiceMatch = function (targetVoice, voiceList) {
			if (!targetVoice || !voiceList || !voiceList.length) return -1;

			var extractedVoice = this.extractVoiceFromBrackets(targetVoice);
			var searchPairs = [
				{ voice: targetVoice, type: "original" },
				{ voice: extractedVoice, type: "extracted" },
			].filter(function (pair, index, arr) {
				return index === 0 || pair.voice !== arr[0].voice;
			});

			var searchMethods = [
				{ name: "exact", fn: this.equalTitle.bind(this) },
				{
					name: "normalized",
					fn: function (target, candidate) {
						return this.normalizeVoiceName(target) === this.normalizeVoiceName(candidate);
					}.bind(this),
				},
				{ name: "algorithmic", fn: this.compareVoiceNames.bind(this) },
				{
					name: "partial",
					fn: function (target, candidate) {
						if (target.length <= 3) return false;
						var targetLower = target.toLowerCase().trim();
						var candidateLower = candidate.toLowerCase().trim();
						return targetLower.includes(candidateLower) || candidateLower.includes(targetLower);
					},
				},
			];

			for (var methodIndex = 0; methodIndex < searchMethods.length; methodIndex++) {
				var method = searchMethods[methodIndex];

				for (var pairIndex = 0; pairIndex < searchPairs.length; pairIndex++) {
					var searchPair = searchPairs[pairIndex];

					for (var i = 0; i < voiceList.length; i++) {
						var v = voiceList[i];
						var voiceName = this.getVoiceName(v);

						if (voiceName && method.fn(searchPair.voice, voiceName)) {
							return i;
						}
					}
				}
			}

			return -1;
		};
		this.getVoiceName = function (voice) {
			return typeof voice === "object" ? voice.title || voice.name : voice;
		};
		this.findVoiceIdByName = function (voiceName, voiceList) {
			for (var i = 0; i < voiceList.length; i++) {
				var v = voiceList[i];
				if (typeof v === "object" && this.getVoiceName(v) === voiceName) {
					return v.id;
				}
			}
			return null;
		};
		this.findVoiceIndexById = function (voiceId, voiceList) {
			for (var i = 0; i < voiceList.length; i++) {
				var v = voiceList[i];
				if (typeof v === "object" && v.id == voiceId) {
					return i;
				}
			}
			return -1;
		};
		this.extractVoiceFromBrackets = function (targetVoice) {
			var bracketMatch = targetVoice.match(/\[([^\]]+)\]/);
			if (!bracketMatch) return targetVoice;

			var bracketContent = bracketMatch[1].trim();

			var cleanContent = bracketContent
				.replace(/\b(4K|HD|FHD|UHD|2K|720p|1080p|1440p|2160p)\b/gi, "")
				.replace(/^[,\s]+|[,\s]+$/g, "")
				.replace(/\s*,\s*/g, ", ")
				.trim();

			if (cleanContent.includes(",")) {
				var parts = cleanContent.split(",").map(function (p) {
					return p.trim();
				});
				cleanContent = parts.reduce(function (longest, current) {
					return current.length > longest.length ? current : longest;
				});
			}

			return cleanContent && cleanContent !== bracketContent ? cleanContent : bracketContent;
		};
		this.parsePlaylist = function (str) {
			var pl = [];
			try {
				if (str.charAt(0) === "[") {
					str.substring(1)
						.split(",[")
						.forEach(function (item) {
							if (item.endsWith(",")) item = item.substring(0, item.length - 1);
							var label_end = item.indexOf("]");
							if (label_end >= 0) {
								var label = item.substring(0, label_end);
								if (item.charAt(label_end + 1) === "{") {
									item.substring(label_end + 2)
										.split(";{")
										.forEach(function (voice_item) {
											if (voice_item.endsWith(";")) voice_item = voice_item.substring(0, voice_item.length - 1);
											var voice_end = voice_item.indexOf("}");
											if (voice_end >= 0) {
												var voice = voice_item.substring(0, voice_end);
												pl.push({
													label: label,
													voice: voice,
													links: voice_item.substring(voice_end + 1).split(" or "),
												});
											}
										});
								} else {
									pl.push({
										label: label,
										links: item.substring(label_end + 1).split(" or "),
									});
								}
							}
							return null;
						});
				}
			} catch (e) {}
			return pl;
		};
		this.parseM3U = function (str) {
			var pl = [];

			try {
				var width = 0;
				var height = 0;
				str.split("\n").forEach(function (line) {
					if (line.charAt(0) == "#") {
						var resolution = line.match(/\bRESOLUTION=(\d+)x(\d+)\b/);

						if (resolution) {
							width = parseInt(resolution[1]);
							height = parseInt(resolution[2]);
						}
					} else if (line.trim().length) {
						pl.push({
							width: width,
							height: height,
							link: line,
						});
						width = 0;
						height = 0;
					}
				});
			} catch (e) {}

			return pl;
		};
		this.decodeHtml = function (html) {
			var text = document.createElement("textarea");
			text.innerHTML = html;
			return text.value;
		};
		this.fixLink = function (link, proxy, referrer) {
			if (link) {
				if (!referrer || link.indexOf("://") !== -1) return proxy + link;
				var url = new URL(referrer);
				if (startsWith(link, "//")) return proxy + url.protocol + link;
				if (startsWith(link, "/")) return proxy + url.origin + link;
				if (startsWith(link, "?")) return proxy + url.origin + url.pathname + link;
				if (startsWith(link, "#")) return proxy + url.origin + url.pathname + url.search + link;
				var base = url.href.substring(0, url.href.lastIndexOf("/") + 1);
				return proxy + base + link;
			}

			return link;
		};
		this.similars = function (json) {
			var _this5 = this;
			scroll.clear();
			json.forEach(function (elem) {
				var info = [];
				var name = elem.title || elem.ru_title || elem.en_title || elem.nameRu || elem.nameEn;
				var orig = elem.orig_title || elem.nameEn || "";
				var year = ((elem.start_date || elem.year || "") + "").slice(0, 4);
				var transl = elem.translations ? String(elem.translations).split(",").slice(0, 2) : "";
				var count_s = elem.seasons_count ? elem.seasons_count + " " + Lampa.Lang.translate("torrent_serial_season").toLowerCase() + _this5.num_word(elem.seasons_count, ["", "а", "ов"]) : "";
				var count_eps = elem.episodes_count ? elem.episodes_count + " эпизод" + _this5.num_word(elem.episodes_count, ["", "а", "ов"]) : "";
				if (year) info.push(year);
				if (orig && orig !== name) info.push(orig);
				if (elem.type) info.push(elem.type == ("TV" || "tv-series" || "serial" || "MINI_SERIES") ? "Cериал" : elem.type == "TV_SHOW" ? "Тв-Шоу" : elem.type == ("movie" || "film" || "FILM" || "MOVIE") ? "Фильм" : elem.type);
				if (count_s) info.push(count_s && " - " + count_s + " из них " + count_eps);
				if (!count_s && count_eps) info.push(count_eps);
				if (transl) info.push(transl);
				if (elem.rating && elem.rating !== "null" && elem.filmId)
					info.push(
						Lampa.Template.get(
							"modss_online_rate",
							{
								rate: elem.rating,
							},
							true,
						),
					);
				if (elem.quality && elem.quality.length) info.push(elem.quality);

				if (elem.countries && elem.countries.length) {
					info.push(
						(elem.filmId
							? elem.countries.map(function (c) {
									return c.country;
								})
							: elem.countries.map(function (c) {
									return c.title || c;
								})
						).join(", "),
					);
				}

				if (elem.categories && elem.categories.length) {
					//  info.push(elem.categories.slice(0, 4).join(', '));
				}

				elem.title = name;
				elem.time = elem.filmLength || "";
				elem.info = info.join('<span class="online_modss-split">●</span>');

				var item = Lampa.Template.get("modss_online_folder", elem);
				var img = elem.img || elem.image || elem.poster || false;
				if (img) {
					var image = $('<img style="height: 7em; width: 7em; border-radius: 0.3em;"/>');
					item.find(".online_modss__folder").empty().append(image);
					Lampa.Utils.imgLoad(image, img);
				}

				item.on("hover:enter", function () {
					//_this5.activity.loader(true);
					_this5.reset();
					if (balanser == "videocdn") source.search(object, [elem]);
					else _this5.request(elem.url);
				}).on("hover:focus", function (e) {
					last = e.target;
					scroll.update($(e.target), true);
				});
				scroll.append(item);
			});
			Lampa.Controller.enable("content");
		};
		this.getChoice = function (for_balanser) {
			var data = Lampa.Storage.cache("online_choice_" + (for_balanser || balanser), 3000, {});
			var save = data[object.movie.id] || {};
			Lampa.Arrays.extend(save, {
				season: 0,
				voice: 0,
				order: 0,
				server: Lampa.Storage.get("pub_server", "1"),
				type: Lampa.Storage.get("pub_type_striming", for_balanser == "hdr" ? 0 : 3),
				voice_name: "",
				voice_id: 0,
				episodes_view: {},
				movie_view: "",
				seasons: "",
			});
			return save;
		};
		this.saveChoice = function (choice, for_balanser) {
			var data = Lampa.Storage.cache("online_choice_" + (for_balanser || balanser), 3000, {});
			data[object.movie.id] = choice;
			Lampa.Storage.set("online_choice_" + (for_balanser || balanser), data);
		};
		this.replaceChoice = function (choice, for_balanser) {
			var to = this.getChoice(for_balanser);
			Lampa.Arrays.extend(to, choice, true);
			this.saveChoice(to, for_balanser);
		};
		this.clearImages = function () {
			images.forEach(function (img) {
				img.onerror = function () {};
				img.onload = function () {};
				img.src = "";
			});
			images = [];
		};
		this.reset = function () {
			last = false;
			allItemsToDisplay = [];
			allRenderedItems = [];
			seasonGroups = [];
			page = 0;
			isLoadingMore = false;
			targetScrollElement = false;
			items_need_add = [];
			added = 0;
			shouldLoadToLastWatched = false;
			clearInterval(balanser_timer);
			clearTimeout(number_of_requests_timer);
			clearTimeout(life_wait_timer);
			network.clear();
			this.clearImages();
			scroll.render().find(".empty").remove();
			scroll.clear();
			scroll.reset();
			scroll.body().append(Lampa.Template.get("modss_content_loading"));
		};
		this.loading = function (status) {
			if (status) this.activity.loader(true);
			else {
				this.activity.loader(false);
				this.activity.toggle();
			}
		};
		this.filter = function (filter_items, choice) {
			var _this6 = this;
			var select = [];
			var countEp = function countEp(data, s) {
				var result = {};
				for (var name in data) {
					if (data.hasOwnProperty(name)) {
						if (s === null) {
							result[name] = 0;
							for (var season in data[name]) {
								if (data[name].hasOwnProperty(season)) {
									result[name] += data[name][season] ? data[name][season].length : 0;
								}
							}
						} else {
							result[name] = data[name][s] ? data[name][s].length : 0;
						}
					}
				}
				return result;
			};

			var countVoic = function countVoic(data, season) {
				var count = 0;
				var types = [];

				// Проверяем есть ли типы видео в extract
				var dataKeys = Lampa.Arrays.getKeys(data);
				var isTypeBasedStructure = extract && extract.type && extract.type.length > 0;

				if (isTypeBasedStructure) {
					// Новая структура - считаем типы видео и собираем их названия
					dataKeys.forEach(function (type) {
						if (data[type] && data[type][season] && data[type][season].length > 0) {
							count++;
							types.push(type.toUpperCase());
						}
					});
				} else {
					// Старая структура
					Lampa.Arrays.getKeys(data).forEach(function (dub) {
						if (data[dub].hasOwnProperty(season) && balanser == "hdr") {
							// Проверяем существование данных перед обращением к ним
							if (data[dub][season] && Lampa.Arrays.isArray(data[dub][season]) && data[dub][season].length > 0 && data[dub][season][0] && data[dub][season][0].voice) {
								count = data[dub][season][0].voice.split("<br>").length;
							}
						} else if (data[dub].hasOwnProperty(season)) count++;
					});
				}

				return { count: count, types: types, isTypeBasedStructure: isTypeBasedStructure };
			};

			var add = function add(type, title) {
				var need = _this6.getChoice();
				var items = filter_items[type];
				var subitems = [];
				var value = need ? need[type] : 0;

				var episodesBySeason = {};
				var currentVoice = (need && need.voice !== undefined && filter_find.voice[need.voice] && (filter_find.voice[need.voice].name || filter_find.voice[need.voice].title)) || (need && need.voice !== undefined ? filter_find.voice[need.voice] : null);

				if (extract && extract.season && extract.season.length && typeof extract.season[0] !== "object") {
					// Проверяем структуру данных (может быть extract.folder или extract.episode)
					var extractItems = extract.folder || extract.episode;
					var extractKeys = extractItems ? Lampa.Arrays.getKeys(extractItems) : [];
					var isDirectSeasonMapping =
						extractKeys.length > 0 &&
						extractKeys.every(function (key) {
							return !isNaN(key) && Lampa.Arrays.isArray(extractItems[key]);
						});

					if (isDirectSeasonMapping) {
						// Структура extractItems[season_number] - считаем эпизоды напрямую
						for (var seasonKey in extractItems) {
							if (extractItems.hasOwnProperty(seasonKey) && Lampa.Arrays.isArray(extractItems[seasonKey])) {
								episodesBySeason[seasonKey] = extractItems[seasonKey].length;
							}
						}
					} else if (currentVoice && extractItems && extractItems[currentVoice]) {
						// Стандартная структура extractItems[voice_name][season_number]
						for (var seasonKey in extractItems[currentVoice]) {
							if (extractItems[currentVoice].hasOwnProperty(seasonKey)) {
								var seasonEpisodes = extractItems[currentVoice][seasonKey];
								var episodeCount = 0;

								if (Lampa.Arrays.isArray(seasonEpisodes)) episodeCount = seasonEpisodes.length;
								else if (typeof seasonEpisodes === "object" && seasonEpisodes !== null) {
									episodeCount = Object.keys(seasonEpisodes).length;
								}
								if (episodeCount > 0) episodesBySeason[seasonKey] = episodeCount;
							}
						}
					}
				}

				if (extract && extract.season && extract.season.length && type === "season" && typeof extract.season[0] !== "object") {
					var totalEpisodes = 0;

					// Проверяем структуру данных для подсчета эпизодов
					var extractItems = extract.folder || extract.episode;
					var extractKeys = extractItems ? Lampa.Arrays.getKeys(extractItems) : [];
					var isDirectSeasonMapping =
						extractKeys.length > 0 &&
						extractKeys.every(function (key) {
							return !isNaN(key) && Lampa.Arrays.isArray(extractItems[key]);
						});

					if (isDirectSeasonMapping) {
						// Структура extractItems[season_number] - подсчитываем эпизоды напрямую
						for (var seasonKey in extractItems) {
							if (extractItems.hasOwnProperty(seasonKey) && Lampa.Arrays.isArray(extractItems[seasonKey])) {
								totalEpisodes += extractItems[seasonKey].length;
							}
						}
					} else {
						// Стандартная структура - используем старую логику
						for (var seasonKey in episodesBySeason) {
							if (episodesBySeason.hasOwnProperty(seasonKey)) {
								totalEpisodes += episodesBySeason[seasonKey];
							}
						}
					}

					subitems.push({
						title: "Все сезоны",
						selected: value === -1,
						index: -1,
						subtitle: totalEpisodes > 0 ? totalEpisodes + " эпизод" + _this6.num_word(totalEpisodes, ["", "а", "ов"]) : null,
					});
				}

				items.forEach(function (name, i) {
					var displayTitle = typeof name === "object" ? name.title || name.name || Lampa.Lang.translate("torrent_serial_season") + " " + (i + 1) : name;
					var par = {
						title: displayTitle,
						selected: value === i,
						index: i,
					};
					if (type === "season") {
						var seasonKey = typeof name === "object" ? displayTitle.split(" ").pop() : name.split(" ").pop();

						// Проверяем структуру данных для подсчета
						var extractItems = extract.folder || extract.episode;
						var extractKeys = extractItems ? Lampa.Arrays.getKeys(extractItems) : [];
						var isDirectSeasonMapping =
							extractKeys.length > 0 &&
							extractKeys.every(function (key) {
								return !isNaN(key) && Lampa.Arrays.isArray(extractItems[key]);
							});

						if (isDirectSeasonMapping) {
							// Структура extractItems[season_number] - показываем только количество эпизодов
							var episodeCount = extractItems[seasonKey] ? extractItems[seasonKey].length : 0;
							if (episodeCount > 0) {
								par.subtitle = episodeCount + " эпизод" + _this6.num_word(episodeCount, ["", "а", "ов"]);
							}
						} else {
							// Стандартная структура с озвучками
							var countResult = countVoic(extractItems, seasonKey);
							var counts = countResult.count;
							var types = countResult.types;
							var isTypeBasedStructure = countResult.isTypeBasedStructure;

							var episodesInfo = "";
							if (episodesBySeason && episodesBySeason[seasonKey]) {
								episodesInfo = episodesBySeason[seasonKey] + " эпизод" + _this6.num_word(episodesBySeason[seasonKey], ["", "а", "ов"]);
							}

							var subtitleParts = [];
							if (balanser !== "hdrezka" && counts > 0) {
								// Для HDR балансера с типами видео показываем типы вместо озвучек
								if (balanser === "hdr" && isTypeBasedStructure && types.length > 0) {
									subtitleParts.push(types.join(", "));
								} else {
									subtitleParts.push(counts + " озвуч" + _this6.num_word(counts, ["ка", "ки", "ек"]));
								}
							}
							if (episodesInfo) subtitleParts.push(episodesInfo);
							if (subtitleParts.length > 0) par.subtitle = subtitleParts.join(" • ");
						}
					}

					if (type === "voice") {
						// Проверяем структуру данных
						var extractItems = extract.folder || extract.episode;
						var extractKeys = extractItems ? Lampa.Arrays.getKeys(extractItems) : [];
						var isDirectSeasonMapping =
							extractKeys.length > 0 &&
							extractKeys.every(function (key) {
								return !isNaN(key) && Lampa.Arrays.isArray(extractItems[key]);
							});

						if (!isDirectSeasonMapping) {
							// Стандартная структура с озвучками
							var seasonKey = null;
							if (need && need.season === -1) {
								seasonKey = null;
							} else if (need && need.season >= 0 && filter_items.season) {
								var selectedSeason = filter_items.season[need.season];
								var seasonNumber = null;

								if (typeof selectedSeason === "object") {
									var seasonTitle = selectedSeason.title || selectedSeason.name || "";
									seasonNumber = seasonTitle.split(" ").pop();
								} else seasonNumber = selectedSeason.split(" ").pop();
								var testSeasonKeys = [seasonNumber, (parseInt(seasonNumber) - 1).toString()];
								for (var i = 0; i < testSeasonKeys.length; i++) {
									var testKey = testSeasonKeys[i];
									var hasData = false;
									for (var voiceName in extractItems) {
										if (extractItems[voiceName] && extractItems[voiceName][testKey]) {
											hasData = true;
											break;
										}
									}
									if (hasData) {
										seasonKey = testKey;
										break;
									}
								}
								if (seasonKey === null) seasonKey = seasonNumber;
							}

							var counts = countEp(extractItems, seasonKey);
							if (balanser !== "hdrezka" && counts[name] !== undefined && counts[name] > 0) {
								par.template = "selectbox_icon";
								par.icon = '<svg style="margin-left:-0.7em;width:1.5em!important;height:2.8em!important" width="24" height="31" viewBox="0 0 24 31" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="5" width="14" height="23" rx="7" fill="currentColor"></rect><path d="M3.39272 18.4429C3.08504 17.6737 2.21209 17.2996 1.44291 17.6073C0.673739 17.915 0.299615 18.7879 0.607285 19.5571L3.39272 18.4429ZM23.3927 19.5571C23.7004 18.7879 23.3263 17.915 22.5571 17.6073C21.7879 17.2996 20.915 17.6737 20.6073 18.4429L23.3927 19.5571ZM0.607285 19.5571C2.85606 25.179 7.44515 27.5 12 27.5V24.5C8.55485 24.5 5.14394 22.821 3.39272 18.4429L0.607285 19.5571ZM12 27.5C16.5549 27.5 21.1439 25.179 23.3927 19.5571L20.6073 18.4429C18.8561 22.821 15.4451 24.5 12 24.5V27.5Z" fill="currentColor"></path><rect x="10" y="25" width="4" height="6" rx="2" fill="currentColor"></rect></svg>';
								par.subtitle = "Озвучили " + counts[name] + " эпизод" + _this6.num_word(counts[name], ["", "а", "ов"]);
								par.find = counts[name] > 0;
							}
						}
					}

					if (type === "type") {
						// Подсчет серий для типов видео в выбранном сезоне
						var extractItems = extract.folder || extract.episode;
						var isTypeBasedStructure = extract && extract.type && extract.type.length > 0;

						if (isTypeBasedStructure && extractItems && extractItems[name]) {
							// Получаем выбранный сезон
							var selectedSeason = null;
							if (need && need.season >= 0 && filter_items.season && filter_items.season[need.season]) {
								var seasonObj = filter_items.season[need.season];
								if (typeof seasonObj === "object") {
									selectedSeason = (seasonObj.title || seasonObj.name || "").split(" ").pop();
								} else {
									selectedSeason = seasonObj.split(" ").pop();
								}
							}

							// Показываем серии только для выбранного сезона
							if (selectedSeason && extractItems[name][selectedSeason]) {
								var episodeCount = Lampa.Arrays.isArray(extractItems[name][selectedSeason]) ? extractItems[name][selectedSeason].length : 0;

								if (episodeCount > 0) {
									par.subtitle = episodeCount + " эпизод" + _this6.num_word(episodeCount, ["", "а", "ов"]);
								}
							}
						}
					}

					subitems.push(par);
				});

				// Получаем корректный subtitle для отображения
				var subtitle = "";
				if (type === "season" && value === -1) {
					subtitle = "Все сезоны";
				} else if (items[value]) {
					if (typeof items[value] === "object") {
						subtitle = items[value].title || items[value].name || "";
					} else {
						subtitle = items[value];
					}
				}

				select.push({
					title: title,
					subtitle: subtitle,
					items: subitems,
					stype: type,
				});
			};

			filter_items.source = filter_sources;
			select.push(
				{
					title: Lampa.Lang.translate("torrent_parser_reset"),
					reset: true,
				},
				{
					title: Lampa.Lang.translate("modss_balanser"),
					subtitle: sources[balanser].name,
					bal: true,
				},
			);
			this.saveChoice(choice);
			if (filter_items.season && filter_items.season.length) add("season", Lampa.Lang.translate("torrent_serial_season"));
			if (filter_items.voice && filter_items.voice.length) add("voice", Lampa.Lang.translate("torrent_parser_voice"));
			if (filter_items.type && filter_items.type.length) add("type", Lampa.Lang.translate("filter_video_stream") + "");
			if (!Lampa.Storage.get("pro_pub", "false") && filter_items.server && filter_items.server.length) add("server", Lampa.Lang.translate("filter_video_server") + "");
			if (filter_items.order && filter_items.order.length) add("order", Lampa.Lang.translate("filter_series_order") + "");

			filter.set("filter", select);
			this.updateSourcesFilter();

			this.selected(filter_items);
		};
		this.selected = function (filter_items) {
			var need = this.getChoice(),
				select = [];
			if (need) {
				for (var i in need) {
					if (filter_items[i] && filter_items[i].length) {
						var item = filter_items[i][need[i]];
						var displayText = "";

						if (typeof item === "object") {
							displayText = item.title || item.name || item;
						} else {
							displayText = item;
						}

						if (i == "voice") {
							select.push(filter_translate[i] + ": " + displayText);
						} else if (i !== "source") {
							if (filter_items.season.length >= 1) {
								select.push(filter_translate.season + ": " + displayText);
							}
						}
					}
				}
			}

			filter.chosen("filter", select);
			filter.chosen("sort", [sources[balanser].name.split(" ")[0]]);
		};
		this.getEpisodes = function (season, choice, call) {
			var episodes = [];
			if (typeof object.movie.id !== "number" || !object.movie.name) return call(episodes);

			var fetchSeasonEpisodes = function (seasonNum) {
				return new Promise(function (resolve) {
					var tmdburl = "tv/" + object.movie.id + "/season/" + seasonNum + "?api_key=4ef0d7355d9ffb5151e987764708ce96&language=" + Lampa.Storage.get("language", "ru");
					var baseurl = Lampa.TMDB.api(tmdburl);
					network.timeout(1000 * 10);
					network["native"](
						baseurl,
						function (data) {
							var seasonEpisodes = data.episodes || [];
							resolve({ season: seasonNum, episodes: seasonEpisodes });
						},
						function () {
							resolve({ season: seasonNum, episodes: [] });
						},
					);
				});
			};

			if (object.movie.source == "pub") {
				var baseurl = Pub.baseurl + "v1/items/" + object.movie.id + "?access_token=" + Pub.token;
				network.timeout(1000 * 10);
				network["native"](
					baseurl,
					function (data) {
						var seasons = (data.item && data.item.seasons) || [];
						if (choice.season === -1) {
							// Для "Все сезоны" возвращаем все сезоны
							episodes = seasons.map(function (s) {
								return {
									season: s.number,
									episodes: s.episodes || [],
								};
							});
							call(episodes);
						} else {
							var seasonData = seasons.find(function (s) {
								return s.number == season;
							});
							episodes = (seasonData && seasonData.episodes) || [];
							call(episodes);
						}
					},
					function () {
						call(episodes);
					},
				);
			} else {
				fetchSeasonEpisodes(season)
					.then(function (result) {
						episodes = result.episodes;
						call(episodes);
					})
					.catch(function () {
						call(episodes);
					});
			}
		};
		this.draw = function (items) {
			var _this4 = this;
			var params = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
			var choice = _this4.getChoice();
			if (!items.length) return this.empty();

			// Инициализируем новую систему пагинации
			items_need_add = items;
			added = 0;
			allRenderedItems = [];

			scroll.clear();
			scroll.append(Lampa.Template.get("modss_online_watched", {}));

			this.updateWatched();
			var seasonForEpisodes = items[0] ? items[0].season : 1;
			this.getEpisodes(seasonForEpisodes, choice, function (episodes) {
				_this4.cachedEpisodes = episodes;
				_this4.cachedParams = params;

				// Загружаем элементы с учетом последней просмотренной серии
				_this4.loadItemsToLastWatched();
			});
		};

		this.loadItemsToLastWatched = function () {
			var _this4 = this;
			var choice = _this4.getChoice();
			var serial = object.movie.name ? true : false;

			var lastWatchedEpisode = 0;
			if (serial && items_need_add.length > 0) {
				var currentSeason = items_need_add[0].season;
				lastWatchedEpisode = choice.episodes_view[currentSeason] || 0;
			}
			var lastWatchedIndex = -1;
			if (lastWatchedEpisode > 0) {
				for (var i = 0; i < items_need_add.length; i++) {
					if (items_need_add[i].episode && items_need_add[i].episode >= lastWatchedEpisode) {
						lastWatchedIndex = i;
						break;
					}
				}
			}

			var minItemsToLoad = BATCH_SIZE;
			if (lastWatchedIndex > 0) {
				// Если нашли последнюю просмотренную серию, загружаем до неё + еще одну партию
				minItemsToLoad = Math.min(lastWatchedIndex + BATCH_SIZE, items_need_add.length);
			}
			// Загружаем элементы пока не достигнем нужного количества
			this.loadItemsBatch(minItemsToLoad);
		};

		this.loadItemsBatch = function (targetCount) {
			var _this4 = this;

			if (added >= items_need_add.length) {
				return _this4.finishLoading();
			}

			var itemsToLoad = Math.min(BATCH_SIZE, items_need_add.length - added, targetCount - added);
			var nextBatch = items_need_add.slice(added, added + itemsToLoad);

			nextBatch.forEach(function (element) {
				_this4.appendEpisode(element, _this4.cachedEpisodes, _this4.getChoice(), items_need_add, _this4.cachedParams);
				added++;
			});

			if (added < targetCount && added < items_need_add.length) {
				setTimeout(function () {
					_this4.loadItemsBatch(targetCount);
				}, 10);
			} else _this4.finishLoading();
		};
		this.loadMoreItems = function () {
			var _this4 = this;

			if (added >= items_need_add.length) return;

			var nextBatch = items_need_add.slice(added, added + BATCH_SIZE);
			nextBatch.forEach(function (element) {
				_this4.appendEpisode(element, _this4.cachedEpisodes, _this4.getChoice(), items_need_add, _this4.cachedParams, true);
				added++;
			});
		};

		this.finishLoading = function () {
			var _this4 = this;
			var serial = object.movie.name ? true : false;
			// Добавляем недостающие эпизоды только когда все элементы загружены
			if (added >= items_need_add.length && serial && !_this4.cachedParams.similars && _this4.getChoice().season !== -1 && _this4.cachedEpisodes.length > items_need_add.length) {
				var left = _this4.cachedEpisodes.slice(items_need_add.length);
				left.forEach(function (episode) {
					_this4.appendMissingEpisode(episode, items_need_add[0] ? items_need_add[0].season : 1);
				});
			}

			_this4.activity.loader(false);

			setTimeout(function () {
				Lampa.Controller.enable("content");
			}, 100);
		};
		this.appendMissingEpisode = function (episode, season) {
			var info = [];
			if (episode.vote_average)
				info.push(
					Lampa.Template.get(
						"modss_online_rate",
						{
							rate: parseFloat(episode.vote_average + "").toFixed(1),
						},
						true,
					),
				);
			if (episode.air_date) info.push(Lampa.Utils.parseTime(episode.air_date).full);
			var air = new Date((episode.air_date + "").replace(/-/g, "/"));
			var now = Date.now();
			var day = Math.round((air.getTime() - now) / (24 * 60 * 60 * 1000));
			var txt = day > 0 ? Lampa.Lang.translate("full_episode_days_left") + ": " + day : "Недоступен в данной озвучке";
			var html = Lampa.Template.get("modss_online_full", {
				serv: episode.serv ? episode.serv : "",
				time: Lampa.Utils.secondsToTime((episode ? episode.runtime : object.movie.runtime) * 60, true),
				info: info.length
					? info
							.map(function (i) {
								return "<span>" + i + "</span>";
							})
							.join('<span class="online_modss-split">●</span>')
					: "",
				title: episode.name || "Эпизод " + (episode.episode_number || episode.number),
				quality: txt,
			});

			var loader = html.find(".online_modss__loader");
			var image = html.find(".online_modss__img");
			html.find(".online_modss__timeline").append(Lampa.Timeline.render(Lampa.Timeline.view(Lampa.Utils.hash([season, episode.episode_number, object.movie.original_title].join("")))));
			var img = html.find("img")[0];

			if (episode.still_path) {
				img.onerror = function () {
					img.src = "./img/img_broken.svg";
				};

				img.onload = function () {
					image.addClass("online_modss__img--loaded");
					loader.remove();
					image.append('<div class="online_modss__episode-number">' + ("0" + episode.episode_number).slice(-2) + "</div>");
				};

				img.src = Lampa.TMDB.image("t/p/w300" + episode.still_path);
				images.push(img);
			} else {
				loader.remove();
				image.append('<div class="online_modss__episode-number">' + ("0" + episode.episode_number).slice(-2) + "</div>");
			}

			html.on("hover:focus", function (e) {
				last = e.target;
				scroll.update($(e.target), true);
			});
			html.css("opacity", "0.3");
			scroll.append(html);
		};
		this.appendSeason = function (seasonNumber) {
			if (object.movie.number_of_seasons) {
				scroll.append(
					Lampa.Template.get("modss_online_season", {
						season: Lampa.Lang.translate("torrent_serial_season") + " " + seasonNumber,
					}),
				);
			}
		};
		this.new_seria = function () {
			if (object.movie.number_of_seasons) {
				setTimeout(function () {
					$(".card--new_ser, .card--viewed, .full-start__right .time-line, .card--last_view").remove();
					if ($("body").find(".online").length !== 0) {
						if ($("body").find(".online:last-child .torrent-item__viewed").length == 1 || $("body").find(".online:last-child .time-line.hide").length == 0)
							$("body")
								.find(".full-start__poster")
								.append("<div class='card--viewed' style='right: -0.6em;position: absolute;background: #168FDF;color: #fff;top: 0.8em;padding: 0.4em 0.4em;font-size: 1.2em;-webkit-border-radius: 0.3em;-moz-border-radius: 0.3em;border-radius: 0.3em;'>" + Lampa.Lang.translate("online_viewed") + "</div>");
						else
							$("body")
								.find(".full-start__poster")
								.append("<div class='card--new_ser' style='right: -0.6em;position: absolute;background: #168FDF;color: #fff;top: 0.8em;padding: 0.4em 0.4em;font-size: 1.2em;-webkit-border-radius: 0.3em;-moz-border-radius: 0.3em;border-radius: 0.3em;'>" + Lampa.Lang.translate("season_new") + " " + Lampa.Lang.translate("torrent_serial_episode") + "</div>");
					}
					//Modss.last_view(object.movie);
				}, 50);
			}
		};
		this.watched = function (set) {
			var file_id = Lampa.Utils.hash(object.movie.number_of_seasons ? object.movie.original_name : object.movie.original_title);
			var watched = Lampa.Storage.cache("online_watched_last", 5000, {});

			if (set) {
				if (!watched[file_id]) watched[file_id] = {};
				Lampa.Arrays.extend(watched[file_id], set, true);
				Lampa.Storage.set("online_watched_last", watched);
				this.updateWatched();
			} else {
				return watched[file_id];
			}
		};
		this.updateWatched = function () {
			var watched = this.watched();
			var body = scroll.body().find(".online-modss-watched .online-modss-watched__body").empty();

			if (watched) {
				var line = [];
				if (watched.balanser_name) line.push(watched.balanser_name);
				if (watched.voice_name) line.push(watched.voice_name);
				if (watched.season) line.push(Lampa.Lang.translate("torrent_serial_season") + " " + watched.season);
				if (watched.episode) line.push(Lampa.Lang.translate("torrent_serial_episode") + " " + watched.episode);
				line.forEach(function (n) {
					body.append("<span>" + n + "</span>");
				});
			} else body.append("<span>" + Lampa.Lang.translate("online_no_watch_history") + "</span>");
		};
		this.num_word = function (value, words) {
			value = Math.abs(value) % 100;
			var num = value % 10;
			if (value > 10 && value < 20) return words[2];
			if (num > 1 && num < 5) return words[1];
			if (num == 1) return words[0];
			return words[2];
		};
		this.order = [
			{ title: "Стандартно", id: "normal" },
			{ title: "Инвертировать", id: "invers" },
		];
		this.contextMenu = function (params) {
			params.html
				.on("hover:long", function () {
					function show(extra) {
						var enabled = Lampa.Controller.enabled().name;
						var menu = [];
						if (Lampa.Platform.is("webos")) {
							menu.push({
								title: Lampa.Lang.translate("player_lauch") + " - Webos",
								player: "webos",
							});
						}
						if (Lampa.Platform.is("android")) {
							menu.push({
								title: Lampa.Lang.translate("player_lauch") + " - Android",
								player: "android",
							});
						}
						menu.push({
							title: Lampa.Lang.translate("player_lauch") + " - Lampa",
							player: "lampa",
						});
						menu.push({
							title: Lampa.Lang.translate("speedtest_button"),
							speed: true,
						});
						menu.push({
							title: Lampa.Lang.translate("modss_video"),
							separator: true,
						});
						menu.push({
							title: Lampa.Lang.translate("torrent_parser_label_title"),
							mark: true,
						});
						menu.push({
							title: Lampa.Lang.translate("torrent_parser_label_cancel_title"),
							unmark: true,
						});
						menu.push({
							title: Lampa.Lang.translate("time_reset"),
							timeclear: true,
						});
						if (extra) {
							menu.push({
								title: Lampa.Lang.translate("copy_link"),
								copylink: true,
							});
						}
						menu.push({
							title: Lampa.Lang.translate("more"),
							separator: true,
						});
						if (Lampa.Account.logged() && params.element && typeof params.element.season !== "undefined" && params.element.translate_voice) {
							menu.push({
								title: Lampa.Lang.translate("modss_voice_subscribe"),
								subscribe: true,
							});
						}
						menu.push({
							title: Lampa.Lang.translate("modss_clear_all_marks"),
							clearallmark: true,
						});
						menu.push({
							title: Lampa.Lang.translate("modss_clear_all_timecodes"),
							timeclearall: true,
						});
						Lampa.Select.show({
							title: Lampa.Lang.translate("title_action"),
							items: menu,
							onBack: function onBack() {
								Lampa.Controller.toggle(enabled);
							},
							onSelect: function onSelect(a) {
								if (a.mark) params.element.mark();
								if (a.unmark) params.element.unmark();
								if (a.timeclear) params.element.timeclear();
								if (a.clearallmark) params.onClearAllMark();
								if (a.timeclearall) params.onClearAllTime();
								Lampa.Controller.toggle(enabled);
								if (a.player) {
									Lampa.Player.runas(a.player);
									params.html.trigger("hover:enter");
								}

								var copy_link = function copy_link(b) {
									Lampa.Utils.copyTextToClipboard(
										b.file,
										function () {
											Lampa.Bell.push({
												text: Lampa.Lang.translate("copy_secuses"),
											});
											Lampa.Controller.toggle(enabled);
										},
										function () {
											Lampa.Bell.push({
												text: Lampa.Lang.translate("copy_error"),
											});
											Lampa.Controller.toggle(enabled);
										},
									);
								};

								var select_quality = function select_quality(b, call) {
									Lampa.Select.show({
										title: Lampa.Lang.translate("settings_server_links"),
										items: [
											{
												title: "Поток 1 - " + b.title,
												file: b.file,
												subtitle: Lampa.Utils.shortText(b.file, 35),
											},
											{
												title: "Поток 2 - " + b.title,
												file: b.reserve_quality,
												subtitle: Lampa.Utils.shortText(b.reserve_quality, 35),
											},
										],
										onBack: function onBack() {
											Lampa.Controller.toggle(enabled);
										},
										onSelect: function onSelect(b) {
											call(b);
										},
									});
								};
								if (a.speed) {
									var speed = function speed(file, title) {
										Modss.speedTest(file, {
											title: object.search,
											info: params.element.title + (params.element.voice_name ? " - " + params.element.voice_name : ""),
											balanser: (title ? "🚀 [" + title + "]<br>" : "") + ((["pub", "hdr"].indexOf(balanser) >= 0 && ((params.element.serv && params.element.serv) || "") + ((params.element.info && params.element.info.split("●").pop() + "<br>") || "")) || "") + sources[balanser].name,
										});
									};

									if (extra.quality && Lampa.Arrays.getKeys(extra.quality).length > 1) {
										var qual = [];
										for (var i in extra.quality) {
											qual.push({
												title: i,
												file: extra.quality[i],
												reserve_quality: extra.reserve_quality[i],
											});
										}
										Lampa.Select.show({
											title: Lampa.Lang.translate("player_quality"),
											items: qual,
											onBack: function onBack() {
												Lampa.Controller.toggle(enabled);
											},
											onSelect: function onSelect(b) {
												if (extra.reserve_quality && Lampa.Arrays.getKeys(extra.reserve_quality).length) {
													select_quality(b, function (b) {
														speed(b.file, b.title);
													});
												} else speed(b.file, b.title);
											},
										});
									} else speed(extra.file);
								}
								if (a.copylink) {
									if (extra.quality && Lampa.Arrays.getKeys(extra.quality).length > 1) {
										var qual = [];
										for (var i in extra.quality) {
											qual.push({
												title: i,
												file: extra.quality[i],
												reserve_quality: extra.reserve_quality[i],
											});
										}
										Lampa.Select.show({
											title: Lampa.Lang.translate("player_quality") + " - " + Lampa.Lang.translate("settings_server_links"),
											items: qual,
											onBack: function onBack() {
												Lampa.Controller.toggle(enabled);
											},
											onSelect: function onSelect(b) {
												if (!b.file) {
													return Lampa.Bell.push({
														text: Lampa.Lang.translate("copy_error"),
													});
												}

												if (extra.reserve_quality && Lampa.Arrays.getKeys(extra.reserve_quality).length) {
													select_quality(b, function (b) {
														copy_link(b);
													});
												} else copy_link(b);
											},
										});
									} else copy_link(extra);
								}
								if (a.subscribe) {
									Lampa.Account.subscribeToTranslation(
										{
											card: object.movie,
											season: params.element.season,
											episode: params.element.translate_episode_end,
											voice: params.element.translate_voice,
										},
										function () {
											Lampa.Noty.show(Lampa.Lang.translate("modss_voice_success"));
										},
										function () {
											Lampa.Noty.show(Lampa.Lang.translate("modss_voice_error"));
										},
									);
								}
							},
						});
					}
					params.onFile(show);
				})
				.on("hover:focus", function () {
					if (Lampa.Helper) {
						Lampa.Helper.show("online_file", Lampa.Lang.translate("helper_online_file"), params.html);
						Modss.showTooltip();
					}
				});
		};
		this.empty = function (msg) {
			var html = Lampa.Template.get("modss_does_not_answer", {});
			html.find(".online-empty__buttons").remove();
			html.find(".online-empty__title").text(msg && msg.title ? msg.title : Lampa.Lang.translate("empty_title_two"));
			html.find(".online-empty__time").text(msg && msg.mes ? msg.mes : msg ? msg : Lampa.Lang.translate("empty_text"));
			scroll.clear();
			scroll.append(html);
			this.loading(false);
			setTimeout(function () {
				var balanser = files.render().find(".filter--sort");
				Navigator.focus(balanser[0]);
			}, 100);
		};
		this.noConnectToServer = function (er) {
			var html = Lampa.Template.get("modss_does_not_answer", {});
			var customMessage = er && !er.vip ? (er.error ? er.message : er ? er : null) : null;
			html.find(".online-empty__buttons").remove();
			html.find(".online-empty__title").text(Lampa.Lang.translate("title_error"));
			html.find(".online-empty__time").text(customMessage || Lampa.Lang.translate("modss_does_not_answer_text"));
			scroll.clear();
			files.appendHead(html);
			this.loading(false);
			setTimeout(function () {
				var balanser = files.render().find(".filter--sort");
				Navigator.focus(balanser[0]);
			}, 100);
		};
		this.doesNotAnswer = function (query) {
			var _this8 = this;
			this.reset();
			var html = Lampa.Template.get("modss_does_not_answer", {
				title: query && query.length ? Lampa.Lang.translate("online_query_start") + " (" + query + ") " + Lampa.Lang.translate("online_query_end") + Lampa.Lang.translate("modss_balanser_dont_work_from") : Lampa.Lang.translate("modss_balanser_dont_work"),
				balanser: balanser,
			});
			var tic = 10;
			html.find(".cancel").on("hover:enter", function () {
				clearInterval(balanser_timer);
			});
			html.find(".change").on("hover:enter", function () {
				clearInterval(balanser_timer);
				filter.render().find(".filter--sort").trigger("hover:enter");
			});
			scroll.clear();
			scroll.append(html);
			this.loading(false);
			Lampa.Controller.enable("content");
			balanser_timer = setInterval(function () {
				tic--;
				html.find(".timeout").text(tic);
				if (tic == 0) {
					clearInterval(balanser_timer);
					var keys = Lampa.Arrays.getKeys(sources);
					var indx = keys.indexOf(balanser);
					var next = keys[indx + 1];
					if (!next) next = keys[0];
					balanser = next;
					if (Lampa.Activity.active().activity == _this8.activity) _this8.changeBalanser(balanser);
				}
			}, 1000);
		};
		this.getLastEpisode = function (items) {
			var last_episode = 0;
			items.forEach(function (e) {
				if (typeof e.episode !== "undefined") last_episode = Math.max(last_episode, parseInt(e.episode));
			});
			return last_episode;
		};
		this.start = function () {
			if (Lampa.Activity.active().activity !== this.activity) return;
			if (!initialized) {
				initialized = true;
				this.initialize();
			}
			Lampa.Background.immediately(Lampa.Utils.cardImgBackground(object.movie));
			Lampa.Controller.add("content", {
				toggle: function toggle() {
					Lampa.Controller.collectionSet(scroll.render(), files.render());
					Lampa.Controller.collectionFocus(last || false, scroll.render());
				},
				gone: function gone() {
					clearTimeout(balanser_timer);
				},
				up: function up() {
					if (Navigator.canmove("up")) {
						Navigator.move("up");
					} else Lampa.Controller.toggle("head");
				},
				down: function down() {
					Navigator.move("down");
				},
				right: function right() {
					if (Navigator.canmove("right")) Navigator.move("right");
					else if (object.movie.number_of_seasons) filter.show(Lampa.Lang.translate("title_filter"), "filter");
					else filter.show(Lampa.Lang.translate("modss_balanser"), "sort");
				},
				left: function left() {
					var poster = files.render().find(".explorer-card__head-img");
					if (poster.hasClass("focus")) Lampa.Controller.toggle("menu");
					else if (Navigator.canmove("left")) Navigator.move("left");
					else Navigator.focus(poster[0]);
				},
				back: this.back.bind(this),
			});
			Lampa.Controller.toggle("content");
		};
		this.render = function () {
			return files.render();
		};
		this.back = function () {
			if (back_url) {
				this.activity.loader(true);
				this.reset();
				this.request(back_url);
				back_url = false;
			} else Lampa.Activity.backward();
		};
		this.pause = function () {};
		this.stop = function () {};
		this.destroy = function () {
			network.clear();
			this.clearImages();
			files.destroy();
			scroll.destroy();
			clearInterval(balanser_timer);
			clearTimeout(number_of_requests_timer);
			clearTimeout(life_wait_timer);
			allItemsToDisplay = [];
			allRenderedItems = [];
			seasonGroups = [];

			// Очищаем новые переменные пагинации
			items_need_add = [];
			added = 0;
			shouldLoadToLastWatched = false;

			// Очищаем кеш источников
			sourcesCache = null;
			sourcesCacheTime = 0;
			sourcesData = null;
			filterSources = null;

			Lampa.PlayerPlaylist.listener.remove("select", _self.callLoadedInf);
		};
	}

	function forktv(object) {
		var network = new Lampa.Reguest();
		var scroll = new Lampa.Scroll({
			mask: true,
			over: true,
			step: 250,
		});
		var items = [];
		var contextmenu_all = [];
		var html = $('<div class="forktv"></div>');
		var body = $('<div class="category-full"></div>');
		var last;
		var waitload = false;
		var active = 0;
		this.create = function () {
			var _this = this;
			this.activity.loader(true);
			if (object.submenu) _this.build(object.url);
			else {
				var u = object.url && object.url.indexOf("?") > -1 ? "&" : "?";
				network["native"](
					object.url + u + ForkTV.user_dev(),
					function (found) {
						_this.build(found);
					},
					function (a, c) {
						_this.build(a);
						Lampa.Noty.show(network.errorDecode(a, c));
					},
				);
			}
			return this.render();
		};
		this.next = function (next_page_url) {
			var _this2 = this;
			if (waitload) return;
			if (object.page < 90) {
				waitload = true;
				object.page++;
				network["native"](
					next_page_url + "&" + ForkTV.user_dev(),
					function (result) {
						_this2.append(result);
						if (result.channels.length) waitload = false;
						Lampa.Controller.enable("content");
						_this2.activity.loader(false);
					},
					function (a, c) {
						Lampa.Noty.show(network.errorDecode(a, c));
					},
				);
			}
		};
		this.stream = function (data, title, youtube, subs, element, view) {
			var _this = this;
			if (data.indexOf("getstream") == -1 && (data.indexOf("rgfoot") > -1 || data.indexOf("torrstream") > -1 || data.indexOf("torrent") > -1)) {
				this.activity.loader(true);
				network.timeout(10000);
				network["native"](
					data + "&" + ForkTV.user_dev(),
					function (json) {
						_this.activity.loader(false);
						if (json.channels.length > 0) {
							var playlist = [];
							var data = json.channels[0];
							if (data.stream_url) {
								var first = {
									title: data.title,
									url: data.stream_url,
									timeline: view,
								};
								if (json.channels.length > 1) {
									json.channels.forEach(function (elem) {
										playlist.push({
											title: elem.title,
											url: elem.stream_url,
										});
									});
								} else playlist.push(first);
								if (playlist.length > 1) first.playlist = playlist;
								Lampa.Player.play(first);
								Lampa.Player.playlist(playlist);
							} else Lampa.Noty.show(data.title);
						} else Lampa.Noty.show(Lampa.Lang.translate("online_nolink"));
					},
					function (a, e) {
						_this.activity.loader(false);
						Lampa.Noty.show(network.errorDecode(a, e));
					},
					false,
					{
						dataType: "json",
					},
				);
			} else if (data && data.match(/magnet|videos|stream\\?|mp4|mkv|m3u8/i)) {
				if (object.title == "IPTV") {
					Lampa.Activity.push({
						url: data + "?" + ForkTV.user_dev(),
						title: "MODS's TV",
						component: "modss_tv",
						page: 1,
					});
				} else {
					var subtitles = [];
					if (subs) {
						subs.forEach(function (e) {
							subtitles.push({
								label: e[0],
								url: e[1],
							});
						});
					}
					var playlist = [];
					var first = {
						title: title,
						url: data,
						subtitles: subtitles,
						timeline: view,
					};
					if (element.length > 1) {
						JSON.parse(element).forEach(function (elem) {
							if (elem.title.match("Описание|Торрент|Трейлер|Страны|Жанр|Похож|Модел|Студи|Катег|Превь|Тег|Порноз") == null)
								playlist.push({
									title: elem.title,
									url: elem.stream_url,
								});
						});
					} else playlist.push(first);
					if (playlist.length > 1) first.playlist = playlist;
					Lampa.Player.play(first);
					Lampa.Player.playlist(playlist);
				}
			} else if (youtube) {
				var id = youtube.split("=")[1];
				if (Lampa.Platform.is("android")) Lampa.Android.openYoutube(id);
				else _this.YouTube(id);
			}
		};
		this.append = function (data) {
			var _this3 = this;
			var viewed = Lampa.Storage.cache("online_view", 5000, []);
			var bg_img = JSON.stringify(data).replace("background-image", "background_image");
			bg_img = JSON.parse(bg_img);
			bg_img.background_image && Lampa.Background.immediately(bg_img.background_image);
			if (data.channels && data.channels.length == 0) {
				Lampa.Noty.show("Ничего не найдено");
			} else {
				var json = data.channels && data.menu && data.menu.length > 0 && data.menu[0].title != "Трейлер" && data.next_page_url && data.next_page_url.indexOf("page=1") > -1 ? data.menu.concat(data.channels) : object.title == "SerialHD" && data.next_page_url && data.next_page_url.split("page=")[1] != 2 ? data.channels.slice(1) : data.channels;
				json = JSON.stringify(json)
					.replace("<br \/>", "<br>")
					.replace(/\)|\(|%20/g, "");
				if (data.title == "HDGO") {
					[
						{
							name: "Быстрый доступ",
							id: [0, 1, 2, 3],
						},
						{
							name: "Фильмы",
							id: [4, 14, 15, 16, 17],
						},
						{
							name: "Сериалы",
							id: [5, 18, 19, 20, 21, 22],
						},
						{
							name: "Мультфильмы",
							id: [6, 23, 24, 25],
						},
						{
							name: "Мультсериалы",
							id: [7, 26, 27, 28, 29],
						},
						{
							name: "Аниме",
							id: [8, 30, 31, 32, 33],
						},
						{
							name: "Тв-Шоу",
							id: [9, 34, 35, 36],
						},
						{
							name: "Док. Сериалы",
							id: [10, 37, 38, 39],
						},
						{
							name: "Док. Фильмы",
							id: [11, 40, 41],
						},
					].map(function (i) {
						_this3.appendHdgo({
							title: i.name,
							results: JSON.parse(json).filter(function (element, id) {
								if (i.id.indexOf(id) > -1) return element;
							}),
						});
					});
				} else {
					var element = JSON.parse(json)[0];
					var infos = element.description ? element.description : element.template;
					var voic = (infos && infos.match(/Озвучка:(.*?)<br/)) || (infos && infos.match(/Перевод:(.*?)(<br|Разм|Обн|Реж|Вр|Фор)/)) || "";
					if ((element.template && element.template.indexOf("film.") > -1) || (element.logo_30x30 && element.logo_30x30.match("mediafil")) || (element.logo_30x30 && element.logo_30x30.match("folder") && element.playlist_url && element.playlist_url.indexOf("torrstream?magnet") > -1)) {
						var image = element.before && element.before.indexOf("src") > -1 ? $("img", element.before).attr("src") : element.template && element.template.indexOf("src") > -1 ? $("img", element.template).attr("src") : element.description && element.description.indexOf("src") > -1 ? $("img", element.description).attr("src") : element.logo_30x30 && element.logo_30x30.indexOf("png") > -1 ? element.logo_30x30 : element.details && element.details.poster ? element.details.poster : "./img/icons/film.svg";
						object.movie = {
							img: image,
							title: object.title,
							original_title: "",
							id: 1,
						};
						var files = new Lampa.Files(object);
						files.append(scroll.render());
						html.append(files.render());
						html.find(".selector")
							.unbind("hover:enter")
							.on("hover:enter", function () {
								if (element.description || element.template)
									Lampa.Modal.open({
										title: element.title,
										size: "medium",
										html: $(element.description ? $(element.description).attr("style", "") : element.template),
										onBack: function onBack() {
											Lampa.Modal.close();
											Lampa.Controller.toggle("content");
										},
									});
							});
					}
					JSON.parse(json).forEach(function (element) {
						var stream = element.stream_url ? element.stream_url : element.playlist_url;
						if (element.title.match("Описание|Трейлер") == null) {
							if ((element.template && element.template.indexOf("film.") > -1) || (element.logo_30x30 && element.logo_30x30.match("mediafil")) || (element.logo_30x30 && element.logo_30x30.match("folder") && element.playlist_url && element.playlist_url.indexOf("torrstream?magnet") > -1)) {
								body.attr("class", "");
								scroll.body().addClass("torrent-list");
								element.quality = (voic && voic[0]) || "";
								element.info = "";
								if (element.logo_30x30 && element.logo_30x30.match(/folder|mediafil/) && stream && stream.match(/torrstream\\?magnet|getstream|kinomix/)) {
									var des = $(element.template || element.description).text();
									var vo = des.match(/Озвучка(.*?)Вид/) || des.match(/Перевод:(.*?)Разм/);
									var vid = des.match(/Видео[:](.*?)[|]/) || des.match(/Видео[:](.*?)Длит/) || des.match(/Видео(.*?)$/);
									var sed_per = des.match(/Раздают:(.*?)Качают:(.*?)(Обн|Кач|Длит)/) || des.match(/Раздают:(.*?)\\s[|]\\sКачают:(.*?)(Обн|Кач|Длит)/);
									var size1 =
										des.match(/t\/s(.*?)Озв/) ||
										des.match(/Размер:(.*?)Разд/) ||
										$(element.template || element.description)
											.find(".trt-size")
											.text();
									var sizes =
										(size1 && size1[1]) ||
										$(element.template || element.description)
											.find(".trt-size")
											.text();
									element.quality = "";
									if (sed_per || vid || sizes || vo) element.info = (sed_per ? '<b style="color:green">&#8679;' + parseInt(sed_per[1]) + '</b><b style="color:red">&#8659;' + parseInt(sed_per[2]) + "</b> - " : "") + (vo ? vo[1] + " / " : "") + ((sizes && " <b>" + sizes + "</b><br><hr>") || "") + (vid ? vid[0].replace(/Аудио|Звук/, " | Аудио") : "");
								}
								var card = Lampa.Template.get("onlines_v1", element);
								var hash = Lampa.Utils.hash([element.title, element.ident, stream].join(""));
								var view = Lampa.Timeline.view(hash);
								var hash_file = Lampa.Utils.hash([element.title, element.ident, stream].join(""));
								element.timeline = view;
								card.append(Lampa.Timeline.render(view));
								if (Lampa.Timeline.details) card.find(".online__quality").append(Lampa.Timeline.details(view, " / "));
								if (viewed.indexOf(hash_file) !== -1) card.append('<div class="torrent-item__viewed">' + Lampa.Template.get("icon_star", {}, true) + "</div>");
							} else {
								var image = element.before && element.before.indexOf("src") > -1 ? $("img", element.before).attr("src") : element.template && element.template.indexOf("src") > -1 ? $("img", element.template).attr("src") : element.description && element.description.indexOf("src") > -1 ? $("img", element.description).attr("src") : element.logo_30x30 && element.logo_30x30.indexOf("png") > -1 ? element.logo_30x30 : element.details && element.details.poster ? element.details.poster : "./img/icons/film.svg";
								if (!element.search_on) {
									var time = $($(element.description).children()[0]).parent().text();
									time = time.match(/Продолжительность: (.*?)?./i);
									time = (time && time.shift() + " - ") || "";
									var descr = !element.ident && element.description && $($(element.description).children()[1]) ? $($(element.description).children()[1]).text().slice(0, 130) || $($(element.description).children()[0]).parent().text().slice(0, 130) : "";
									var info = element.description ? element.description : element.template;
									var voice = (info && info.match(/Озвучка[:](.*?)(Субтит|<\/div><\/div>|<br)/)) || (info && info.match(/Перевод:(.*?)(<br|Разм|Обн|Реж|Вр|Фор)/)) || "";
									var size = (info && info.match(/(Размер|Size):(.*?)<br/)) || "";
									var qual = (info && info.match(/Качество:(.*?)<br/)) || "";
									var qual2 = qual
										? qual[1].split(" ")[1]
										: voice
											? voice[1] &&
												voice[1]
													.split(">")[2]
													.trim()
													.split(/,\\s|\\s/)[0]
											: "";
									var rating = $(element.template).find(".a-r").text();
									var peer =
										info &&
										info.split(/<br[^>]*>|<\/div>/).find(function (itm) {
											if (itm.match(/Качают|Скачивают|Leechers/)) return itm;
										});
									var seed =
										info &&
										info.split(/<br[^>]*>|<\/div>/).find(function (itm) {
											if (itm.match("Раздают|Seeders")) return itm;
										});
								}
								var card = Lampa.Template.get("card", {
									title: element.title || (element.details && element.details.name),
									release_year: (size && size[0] + " | ") + voice && voice[1] ? (voice[1].indexOf(",") > -1 ? voice[1].split(",")[0] : voice[1]) : "",
								});
								if (rating) card.find(".card__view").append('<div class="card__type a-r' + (rating <= 5 ? " b" : rating >= 5 && rating <= 7 ? " de" : " g") + '" style="background-color: #ff9455;">' + rating + "</div>");
								if (qual2) card.find(".card__view").append('<div class="card__quality">' + qual2 + "</div>");
								if (seed) card.find(".card__view").append('<div class="card__type" style="background:none;font-size:1em;left:-.2em;top:-.5em"><b style="position:relative ;background: green;color: #fff;" class="card__type">' + parseInt(seed.match(/ \\d+/) ? seed.match(/ \\d+/)[0] : seed.match(/\\d+/)[0]) + '</b><b class="card__type" style="position:relative;background: #ff4242;color: #fff;left:-1em!important;border-bottom-left-radius: 0;border-top-left-radius: 0" class="info_peer">' + parseInt(peer.match(/ \\d+/) ? peer.match(/ \\d+/)[0] : peer.match(/\\d+/)[0]) + "</b></div>");
								card.addClass(
									isNaN(element.ident) &&
										(element.home ||
											typeof element.details != "undefined" ||
											element.title == "Все" ||
											element.title.match(/Всі|Обновлен|жанры|сезон|Наше|Зарубеж|Женск|Муж|Отеч|Фил|Сериал|Мул|Худ/g) !== null ||
											(element.template && element.template.indexOf("svg") > -1) ||
											(element.logo_30x30 && element.logo_30x30.match(/ttv|right|succes|server|info|cloud|translate|error|trailer|uhd|webcam|mediafile|viewed|new|top|country|genre|similarmenu|filter/g) != null) ||
											(stream && (stream.indexOf("browse") > -1 || stream.indexOf("viewforum") > -1 || stream.indexOf("me/list?actor=") > -1 || stream.indexOf("genre=") > -1)) ||
											(element.playlist_url && element.playlist_url.indexOf("actor") == -1 && element.playlist_url && element.playlist_url.indexOf("voice?") == -1 && element.playlist_url && element.playlist_url.match(/cat=|page=|year=|list\\?direc|genre|list\\?actor|country/g) !== null) ||
											(element.playlist_url && element.playlist_url.indexOf("view?id") == -1 && element.playlist_url && element.playlist_url.indexOf("stream?id") == -1 && element.playlist_url && element.playlist_url.indexOf("details?") == -1 && object.title.indexOf("HDGO") > -1) ||
											(element.logo_30x30 && element.logo_30x30.indexOf("webcam") > -1))
										? "card--collection"
										: "card--category",
								);
								if (!data.landscape && !data.details && (/iPhone|android/i.test(navigator.userAgent) || Lampa.Platform.is("android"))) card.addClass("mobile");
								if (/iPhone|x11|nt/i.test(navigator.userAgent) && !Lampa.Platform.is("android")) card.addClass("pc");
								if ((/Mozilla/i.test(navigator.userAgent) && !/Android/i.test(navigator.userAgent)) || Lampa.Platform.tv()) card.addClass("tv");
								if (data.details && !data.details.images && stream && stream.match(/subcategory|submenu|page=|year=|list\\?direc|genre|list\\?actor|country/g) !== null) card.addClass("mobiles");
								if ((element.description && element.description.indexOf("linear-gradientto") > -1) || data.landscape || (data.next_page_url && data.next_page_url.indexOf("girl") > -1)) card.addClass("nuam");
								if (data.next_page_url && data.next_page_url.indexOf("girl") > -1 && stream.indexOf("vporn/list?cat")) card.addClass("card--category").removeClass("card--collection");
								if (element.logo_30x30 && element.logo_30x30.match(/country|genre|filter|mediafolder/g) != null) card.addClass("hdgo");
								if (element.logo_30x30 && element.logo_30x30.match(/\/folder\./g) && stream.match(/stream|magnet|view\?|view=|\/details/g)) card.addClass("mobile card--category").removeClass("card--collection");
								if (element.logo_30x30 && element.logo_30x30.indexOf("/folder.") > -1 && stream.match(/view=/g)) card.addClass("card--category hdgo").removeClass("card--collection nuam mobile");
								if (element.logo_30x30 && element.logo_30x30.match(/mediafolder/g)) card.addClass("card--category").removeClass("card--collection");
								if (bg_img.background_image && bg_img.background_image.indexOf("18") > -1 && data.next_page_url && data.next_page_url.indexOf("girl") > -1 && stream.match(/pornst|models/g) !== null) card.addClass("card--category").removeClass("nuam hdgo mobile card--collection");
								if (image && image.indexOf("film.svg") > -1) card.addClass("card--collection nuam");
								if (bg_img.background_image && bg_img.background_image.indexOf("18") > -1 && stream.match(/view\\?|hdporn|channel=/g)) card.addClass("card--collection").removeClass("nuam hdgo mobile card--category");
								if (object.title.match(/Торренты|ForkTV|18\\+/g)) card.addClass("home");
								if (element.logo_30x30 && element.logo_30x30.match(/country|genre|filter/g)) card.addClass("sort");
								if (((stream && stream.match(/filmix\\?subcategory|rutor/)) || (element.submenu && element.submenu[0] && element.submenu[0].playlist_url && element.submenu[0].playlist_url.indexOf("rutor") > -1)) && element.logo_30x30 && element.logo_30x30.match(/filter/g)) card.addClass("two");
								if (element.title == "Поиск" && ((stream && stream.match(/coldfilm/)) || object.title == "SerialHD")) card.addClass("searc");
								var img = card.find("img")[0];
								img.onload = function () {
									card.addClass("card--loaded");
								};
								img.onerror = function (e) {
									img.src = "./img/img_broken.svg";
								};
								var picture = image && image.indexOf("yandex") > -1 ? "https://cors.eu.org/" + image : image && image.indexOf("svg") > -1 ? image : image;
								img.src = image;
							}
							//console.log ('class', card[0].className, window.innerWidth)
							card.on("hover:focus hover:touch", function () {
								if (this.className.indexOf("card--category") > -1) {
									if (Lampa.Helper) Lampa.Helper.show("online_file", "Удерживайте клавишу (ОК) для просмотра описания", card);
									//Lampa.Background.immediately(image);
								}
								last = card[0];
								scroll.update(card, true);
								var maxrow = Math.ceil(items.length / 7) - 1;
								if (Math.ceil(items.indexOf(card) / 7) >= maxrow) if (data.next_page_url) _this3.next(data.next_page_url);
							})
								.on("hover:enter", function () {
									if (stream || data.channels.length > 0) {
										if (element.event || (stream && stream.match(/youtube|stream\\?|mp4|mkv|m3u8/i))) {
											_this3.stream(stream, element.title, element.infolink || element.stream_url, element.subtitles, json, view);
											if (viewed.indexOf(hash_file) == -1) {
												viewed.push(hash_file);
												card.append('<div class="torrent-item__viewed">' + Lampa.Template.get("icon_star", {}, true) + "</div>");
												Lampa.Storage.set("online_view", viewed);
											}
										} else if (element.search_on) {
											Lampa.Input.edit(
												{
													value: element.playlist_url.indexOf("newserv") > -1 && Lampa.Storage.get("server_ip") ? Lampa.Storage.get("server_ip") : "",
													free: true,
												},
												function (new_value) {
													if (new_value == "") {
														Lampa.Controller.toggle("content");
														return;
													}
													if (element.playlist_url.indexOf("newserv") > -1) Lampa.Storage.set("server_ip", new_value);
													var query = element.playlist_url.indexOf("newserv") > -1 ? Lampa.Storage.get("server_ip") : new_value;
													var u = element.playlist_url && element.playlist_url.indexOf("?") > -1 ? "&" : "/?";
													network["native"](element.playlist_url + u + "search=" + query + "&" + ForkTV.user_dev(), function (json) {
														if (json.channels && json.channels[0].title.indexOf("по запросу") > -1) {
															if (json.channels.length == 0) {
																Lampa.Controller.toggle("content");
																return;
															}
															Lampa.Modal.open({
																title: "",
																size: "medium",
																html: Lampa.Template.get("error", {
																	title: "Ошибка",
																	text: json.channels[0].title,
																}),
																onBack: function onBack() {
																	Lampa.Modal.close();
																	Lampa.Controller.toggle("content");
																},
															});
														} else {
															Lampa.Activity.push({
																title: element.title,
																url: json,
																submenu: true,
																component: "forktv",
																page: 1,
															});
														}
													});
												},
											);
										} else if (stream == "" || image.indexOf("info.png") > -1) {
											Lampa.Modal.open({
												title: element.title,
												size: "medium",
												html: $('<div style="font-size:4vw">' + $(element.description)[0].innerHTML + "</div>"),
												onBack: function onBack() {
													Lampa.Modal.close();
													Lampa.Controller.toggle("content");
												},
											});
										} else if (stream) {
											var goto = function goto() {
												var title = /*stream == 'submenu' ? element.submenu && element.submenu[0].title : */ element.details && element.details.title ? element.details.title : element.title && element.title.indexOf("l-count") > -1 ? element.title.split(" ").shift() : element.details && element.details.name ? element.details.name : element.title;
												//console.log (element.submenu)
												var url =
													stream == "submenu"
														? {
																channels: element.submenu,
															}
														: stream;
												Lampa.Activity.push({
													title: title,
													url: url,
													submenu: stream == "submenu",
													component: "forktv",
													page: 1,
												});
											};
											if (element.title == "18+" && Lampa.Storage.get("mods_password")) {
												Lampa.Input.edit(
													{
														value: "",
														title: "Введите пароль доступа",
														free: true,
														nosave: true,
													},
													function (t) {
														if (Lampa.Storage.field("mods_password") == t) goto();
														else {
															Lampa.Noty.show("Неверный пароль.");
															Lampa.Controller.toggle("content");
														}
													},
												);
											} else goto();
										} else if (element.description && element.description.indexOf("доступа") > -1) {
											ForkTV.checkAdd("content");
										}
									}
								})
								.on("hover:long", function () {
									if (stream && stream.match("bonga|chatur|rgfoot") == null && stream.match(/stream\\?|mp4|mkv|m3u8/i)) {
										_this3.contextmenu({
											item: card,
											view: view,
											viewed: viewed,
											hash_file: hash_file,
											file: stream,
										});
									}
									if ((element.template || element.description) && stream && stream.match("torrstream|getstream|mp4|kinomix") == null && stream.match(/viewtube|details|season|view\\?|voice|magnet|stream\\?id|mp4|m3u8/i) && (element.description || element.template)) {
										Lampa.Modal.open({
											title: element.title,
											size: "medium",
											html: $(element.description ? $(element.description).attr("style", "") : element.template),
											onBack: function onBack() {
												Lampa.Modal.close();
												Lampa.Controller.toggle("content");
											},
										});
									}
								});
							body.append(card);
							items.push(card);
						}
					});
				}
			}
		};
		this.build = function (data) {
			if (data && data.channels && data.channels.length) {
				scroll.minus();
				html.append(scroll.render());
				this.append(data);
				scroll.append(body);
				this.activity.toggle();
			} else {
				this.activity.toggle();
				html.append(scroll.render());
				this.empty();
			}
			this.activity.loader(false);
		};
		this.createHdGO = function (data) {
			var content = Lampa.Template.get("items_line", {
				title: data.title,
			});
			var body = content.find(".items-line__body");
			var scroll = new Lampa.Scroll({
				horizontal: true,
				step: 300,
			});
			var items = [];
			var active = 0;
			var last;
			this.create = function () {
				scroll.render().find(".scroll__body").addClass("items-cards");
				content.find(".items-line__title").text(data.title);
				data.results.forEach(this.append.bind(this));
				body.append(scroll.render());
			};
			this.item = function (data) {
				var item = Lampa.Template.get("hdgo_item", {
					title: data.title,
				});
				if (/iPhone|x11|nt|Mozilla/i.test(navigator.userAgent) || Lampa.Platform.tv()) item.addClass("card--collection").find(".card__age").remove();
				if (/iPhone|x11|nt/i.test(navigator.userAgent) && !Lampa.Platform.is("android")) item.addClass("hdgo pc");
				if (Lampa.Platform.tv()) item.addClass("hdgo tv");
				var logo = data.logo_30x30 ? data.logo_30x30 : data.template && data.template.indexOf("src") > -1 ? $("img", data.template).attr("src") : "img/actor.svg";
				var img = item.find("img")[0];
				img.onerror = function () {
					img.src = "./img/img_broken.svg";
				};
				img.src = logo;
				this.render = function () {
					return item;
				};
				this.destroy = function () {
					img.onerror = function () {};
					img.onload = function () {};
					img.src = "";
					item.remove();
				};
			};
			this.append = function (element) {
				var _this = this;
				var item$1 = new _this.item(element);
				item$1
					.render()
					.on("hover:focus hover:touch", function () {
						scroll.render().find(".last--focus").removeClass("last--focus");
						item$1.render().addClass("last--focus");

						last = item$1.render()[0];
						active = items.indexOf(item$1);
						scroll.update(items[active].render(), true);
					})
					.on("hover:enter", function () {
						if (element.search_on) {
							Lampa.Input.edit(
								{
									value: "",
									free: true,
								},
								function (new_value) {
									var query = new_value;
									var u = element.playlist_url && element.playlist_url.indexOf("?") > -1 ? "&" : "/?";
									network["native"](element.playlist_url + u + "search=" + query + "&" + ForkTV.user_dev(), function (json) {
										if (json.channels[0].title.indexOf("Нет результатов") == -1) {
											Lampa.Activity.push({
												title: element.title,
												url: json,
												submenu: true,
												component: "forktv",
												page: 1,
											});
										} else {
											Lampa.Modal.open({
												title: "",
												size: "medium",
												html: Lampa.Template.get("error", {
													title: "Ошибка",
													text: json.channels[0].title,
												}),
												onBack: function onBack() {
													Lampa.Modal.close();
													Lampa.Controller.toggle("content");
												},
											});
										}
									});
								},
							);
						} else {
							Lampa.Activity.push({
								title: element.title,
								url: element.playlist_url,
								submenu: false,
								component: "forktv",
								page: 1,
							});
						}
					});
				scroll.append(item$1.render());
				items.push(item$1);
			};
			this.toggle = function () {
				var _this = this;
				Lampa.Controller.add("hdgo_line", {
					toggle: function toggle() {
						Lampa.Controller.collectionSet(scroll.render());
						Lampa.Controller.collectionFocus(last || false, scroll.render());
					},
					right: function right() {
						Navigator.move("right");
						Lampa.Controller.enable("hdgo_line");
					},
					left: function left() {
						if (Navigator.canmove("left")) Navigator.move("left");
						else if (_this.onLeft) _this.onLeft();
						else Lampa.Controller.toggle("menu");
					},
					down: this.onDown,
					up: this.onUp,
					gone: function gone() {},
					back: this.onBack,
				});
				Lampa.Controller.toggle("hdgo_line");
			};
			this.render = function () {
				return content;
			};
			this.destroy = function () {
				Lampa.Arrays.destroy(items);
				scroll.destroy();
				content.remove();
				items = null;
			};
		};
		this.appendHdgo = function (data) {
			var _this = this;
			var item = new _this.createHdGO(data);
			item.create();
			item.onDown = this.down.bind(this);
			item.onUp = this.up.bind(this);
			item.onBack = this.back.bind(this);
			scroll.append(item.render());
			items.push(item);
		};
		this.YouTube = function (id) {
			var player, html$7, timer$1;

			function create$f(id) {
				html$7 = $('<div class="youtube-player"><div id="youtube-player"></div><div id="youtube-player__progress" class="youtube-player__progress"></div></div>');
				$("body").append(html$7);
				player = new YT.Player("youtube-player", {
					height: window.innerHeight,
					width: window.innerWidth,
					playerVars: {
						controls: 0,
						showinfo: 0,
						autohide: 1,
						modestbranding: 1,
						autoplay: 1,
					},
					videoId: id,
					events: {
						onReady: function onReady(event) {
							event.target.playVideo();
							update$2();
						},
						onStateChange: function onStateChange(state) {
							if (state.data == 0) {
								Lampa.Controller.toggle("content");
							}
						},
					},
				});
			}

			function update$2() {
				timer$1 = setTimeout(function () {
					var progress = (player.getCurrentTime() / player.getDuration()) * 100;
					$("#youtube-player__progress").css("width", progress + "%");
					update$2();
				}, 400);
			}

			function play(id) {
				create$f(id);
				Lampa.Controller.add("youtube", {
					invisible: true,
					toggle: function toggle() {},
					right: function right() {
						player.seekTo(player.getCurrentTime() + 10, true);
					},
					left: function left() {
						player.seekTo(player.getCurrentTime() - 10, true);
					},
					enter: function enter() {},
					gone: function gone() {
						destroy$2();
					},
					back: function back() {
						Lampa.Controller.toggle("content");
					},
				});
				Lampa.Controller.toggle("youtube");
			}

			function destroy$2() {
				clearTimeout(timer$1);
				player.destroy();
				html$7.remove();
				html$7 = null;
			}
			play(id);
		};
		this.contextmenu = function (params) {
			var _this = this;
			contextmenu_all.push(params);
			var enabled = Lampa.Controller.enabled().name;
			var menu = [
				{
					title: Lampa.Lang.translate("torrent_parser_label_title"),
					mark: true,
				},
				{
					title: Lampa.Lang.translate("torrent_parser_label_cancel_title"),
					clearmark: true,
				},
				{
					title: Lampa.Lang.translate("online_title_clear_all_mark"),
					clearmark_all: true,
				},
				{
					title: Lampa.Lang.translate("time_reset"),
					timeclear: true,
				},
				{
					title: Lampa.Lang.translate("online_title_clear_all_timecode"),
					timeclear_all: true,
				},
				{
					title: Lampa.Lang.translate("copy_link"),
					copylink: true,
				},
			];
			if (Lampa.Platform.is("webos")) {
				menu.push({
					title: Lampa.Lang.translate("player_lauch") + " - Webos",
					player: "webos",
				});
			}
			if (Lampa.Platform.is("android")) {
				menu.push({
					title: Lampa.Lang.translate("player_lauch") + " - Android",
					player: "android",
				});
			}
			menu.push({
				title: Lampa.Lang.translate("player_lauch") + " - Lampa",
				player: "lampa",
			});
			Lampa.Select.show({
				title: Lampa.Lang.translate("title_action"),
				items: menu,
				onBack: function onBack() {
					Lampa.Controller.toggle(enabled);
				},
				onSelect: function onSelect(a) {
					if (a.clearmark) {
						Lampa.Arrays.remove(params.viewed, params.hash_file);
						Lampa.Storage.set("online_view", params.viewed);
						params.item.find(".torrent-item__viewed").remove();
					}
					if (a.clearmark_all) {
						contextmenu_all.forEach(function (params) {
							Lampa.Arrays.remove(params.viewed, params.hash_file);
							Lampa.Storage.set("online_view", params.viewed);
							params.item.find(".torrent-item__viewed").remove();
						});
					}
					if (a.mark) {
						if (params.viewed.indexOf(params.hash_file) == -1) {
							params.viewed.push(params.hash_file);
							params.item.append('<div class="torrent-item__viewed">' + Lampa.Template.get("icon_star", {}, true) + "</div>");
							Lampa.Storage.set("online_view", params.viewed);
						}
					}
					if (a.timeclear) {
						params.view.percent = 0;
						params.view.time = 0;
						params.view.duration = 0;
						Lampa.Timeline.update(params.view);
						Lampa.Arrays.remove(params.viewed, params.hash_file);
						params.item.find(".torrent-item__viewed").remove();
						Lampa.Storage.set("online_view", params.viewed);
					}
					if (a.timeclear_all) {
						contextmenu_all.forEach(function (params) {
							params.view.percent = 0;
							params.view.time = 0;
							params.view.duration = 0;
							Lampa.Timeline.update(params.view);
							Lampa.Arrays.remove(params.viewed, params.hash_file);
							params.item.find(".torrent-item__viewed").remove();
							Lampa.Storage.set("online_view", params.viewed);
						});
					}
					Lampa.Controller.toggle(enabled);
					if (a.player) {
						Lampa.Player.runas(a.player);
						params.item.trigger("hover:enter");
					}
					if (a.copylink) {
						Lampa.Utils.copyTextToClipboard(
							params.file,
							function () {
								Lampa.Noty.show(Lampa.Lang.translate("copy_secuses"));
							},
							function () {
								Lampa.Noty.show(Lampa.Lang.translate("copy_error"));
							},
						);
					}
				},
			});
		};
		this.empty = function () {
			var empty = new Lampa.Empty();
			scroll.append(empty.render());
			this.start = empty.start;
			this.activity.loader(false);
			this.activity.toggle();
		};
		this.start = function () {
			Lampa.Controller.add("content", {
				toggle: function toggle() {
					if (object.title == "HDGO" && items.length) {
						items[active].toggle();
					} else {
						Lampa.Controller.collectionSet(scroll.render(), html);
						Lampa.Controller.collectionFocus(last || false, scroll.render());
					}
				},
				left: function left() {
					if (Navigator.canmove("left")) {
						Navigator.move("left");
					} else Lampa.Controller.toggle("menu");
				},
				right: function right() {
					Navigator.move("right");
				},
				up: function up() {
					if (Navigator.canmove("up")) Navigator.move("up");
					else Lampa.Controller.toggle("head");
				},
				down: function down() {
					if (Navigator.canmove("down")) Navigator.move("down");
				},
				back: this.back,
			});
			Lampa.Controller.toggle("content");
		};
		this.down = function () {
			active++;
			active = Math.min(active, items.length - 1);
			items[active].toggle();
			scroll.update(items[active].render());
		};
		this.up = function () {
			active--;
			if (active < 0) {
				active = 0;
				Lampa.Controller.toggle("head");
			} else {
				items[active].toggle();
			}
			scroll.update(items[active].render());
		};
		this.back = function () {
			Lampa.Activity.backward();
		};
		this.pause = function () {};
		this.stop = function () {};
		this.render = function () {
			return html;
		};
		this.destroy = function () {
			network.clear();
			scroll.destroy();
			html.remove();
			body.remove();
			network = null;
			items = null;
			html = null;
			body = null;
		};
	}
	function modss_tv(object) {
		var _this1 = this;

		function Api() {
			var network = new Lampa.Reguest();
			var _this = this;
			this.get = function () {
				if (object.url && object.url.indexOf("pub/tvs") > -1) {
					network.silent(
						object.url,
						_this1.build.bind(this),
						function (json) {
							var empty = new Lampa.Empty();
							html.append(empty.render());
							_this.start = empty.start.bind(empty);
							_this.activity.loader(false);
							_this.activity.toggle();
						},
						{
							id: "aXBhdmxpbjk4QHlhbmRleC5ydQ==",
							uid: "60efb6412cd5083cf154c58d0",
						},
					);
				} else if (object.url && object.url.indexOf("Fork") > -1) {
					network["native"](
						object.url,
						function (str) {
							_this.parsePlaylist(str);
						},
						function (a, c) {
							Lampa.Noty.show(network.errorDecode(a, c));
						},
						false,
						{
							dataType: "text",
						},
					);
				} else {
					var pl = [
						{ name: "Modss", url: "modss" },
						{ name: "Free", url: "free" },
					];
					_this1.list(pl);
				}
			};
			this.parsePlaylist = function (data) {
				var postdata = data ? { datas: data, id: "aXBhdmxpbjk4QHlhbmRleC5ydQ==", uid: "60efb6412cd5083cf154c58d0" } : { url: object.url, id: "aXBhdmxpbjk4QHlhbmRleC5ydQ==", uid: "60efb6412cd5083cf154c58d0" };
				if (data) postdata["datas"] = data;
				if (object.url == "kulik") postdata["server"] = _server;
				network.clear();
				network.timeout(15 * 1000);
				network.silent(
					API + "tvPL",
					function (data) {
						if (data.length) _this1.build(data);
						else _this1.empty(data || "");
						object.data = data;
					},
					function (a, c) {
						_this1.empty({ title: network.errorDecode(a, c), descr: "" });
					},
					postdata,
				);
			};
			this.parseEpg = function (name, id) {
				return new Promise(function (resolve, reject) {
					network.clear();
					network.timeout(15 * 1000);
					network.silent(
						API + "EPG",
						function (json) {
							resolve(json);
						},
						function (a, c) {
							Lampa.Noty.show(network.errorDecode(a, c));
						},
						{
							id_ch: id,
							name: name,
							id: "aXBhdmxpbjk4QHlhbmRleC5ydQ==",
							uid: "60efb6412cd5083cf154c58d0",
						},
					);
				});
			};
			this.destroy = function () {
				network.clear();
			};
		}
		var api = new Api();

		var scroll = new Lampa.Scroll({
			mask: true,
			over: true,
		});
		var scroll_details = new Lampa.Scroll({
			mask: true,
			over: true,
		});
		var scroll_list;
		var items = [];
		var html = $('<div class="modss_tv"></div>');
		var body = $('<div class="category-full"></div>');
		var filter = new Lampa.Filter(object);
		var filter_sources = [];
		var results = [];
		var active = 0;
		var last;
		var timer;
		var list = false;
		var searched = false;
		var cache_cat = Lampa.Storage.cache("Modss_tv_cat", 10, {});
		var _server = Lampa.Storage.get("serv_kulik", "ru");
		var cache_name = object.url && object.url.indexOf("Fork") > -1 ? "forktv" : object.url && object.url.indexOf("pub/tv") > -1 ? "pubTv" : object.url;
		var html_details = Lampa.Template.get("mods_iptv_details");
		var privated = /18\+|ночная|эроти|взросл|xxx/;
		var noGroup = "IPTV";
		var servOpt = "Выбрать сервер";
		var currentEpgId = null;
		this.create = function () {
			var _this = this;
			this.activity.loader(true);
			api.get();
			function include(url) {
				var script = document.createElement("script");
				script.src = url;
				document.getElementsByTagName("head")[0].appendChild(script);
			}
			/*include('https://www.googletagmanager.com/gtag/js?id=G-VCR95LEVXD');
		window.dataLayer = window.dataLayer || [];
		function gtag(){dataLayer.push(arguments);}
		gtag('js', new Date());
		gtag('config', 'G-VCR95LEVXD');
		*/
			Lampa.Background.immediately(API.replace("api.", "") + "tv_bg.jpg");
			return this.render();
		};
		this.list = function (data) {
			var _this = this;
			var html_list = Lampa.Template.get("mods_iptv_list");
			if (scroll_list) scroll_list.destroy();
			scroll_list = new Lampa.Scroll({
				mask: true,
				over: true,
			});
			html_list.find(".iptv-list__items").append(scroll_list.render());
			data = data.length > 3 ? data.slice(0, 3).concat(data.slice(3).reverse()) : data;
			data.forEach(function (item) {
				var li = $('<div class="iptv-list__item selector"><div class="iptv-list__item-name">' + (item.name || Lampa.Lang.translate("player_playlist")) + '</div><div class="iptv-list__item-url">' + item.url + "</div></div>");
				li.on("hover:enter", function () {
					_this.activity.loader(true);
					object.url = item.url;
					cache_name = item.url;
					object.title = item.name;
					html.empty();
					api.parsePlaylist();
					list = true;
				}).on("hover:focus hover:touch", function () {
					scroll_list.update(li);
				});
				scroll_list.append(li);
			});
			html.append(html_list);
			_this.activity.loader(false);
			_this.activity.toggle();
		};
		this.saveCats = function () {
			var item = [];
			if (!cache_cat[cache_name]) {
				var c = {};
				for (var key in results) {
					item.push({
						title: key,
						checkbox: true,
					});
				}
				cache_cat[cache_name] = item;
				Lampa.Storage.set("Modss_tv_cat", cache_cat);
			}
			var p = ((cache_cat && cache_cat[cache_name]) || item)
				.filter(function (i) {
					return i.checked;
				})
				.map(function (i) {
					return i.title;
				});

			var filter_source = [];
			Lampa.Arrays.getKeys(results).forEach(function (f) {
				if (results[f].length) {
					if (p.length > 0) {
						if (p.indexOf(f) > -1)
							filter_source.push({
								title: f + " - " + results[f].length,
							});
					} else
						filter_source.push({
							title: f + " - " + results[f].length,
						});
				}
			});
			filter_sources = filter_source;

			if (
				!filter_sources.find(function (a) {
					return a.selected;
				})
			);
			var lasts = Lampa.Storage.get("mods_tv_last_cat", filter_sources[0] && filter_sources[0].title);

			var enabled = Lampa.Controller.enabled().name;
			var server = {
				title: servOpt,
				onSelect: function onSelect() {
					Lampa.Controller.toggle(enabled);
					var items = results[servOpt].map(function (s, index) {
						return {
							title: s.title,
							url: s.servsmodstv_url,
							tv: true,
							icon: '<img src="' + s.logo + '" />',
							template: "selectbox_icon",
							selected: s.servsmodstv_url == _server,
						};
					});

					Lampa.Select.show({
						title: servOpt,
						// fullsize: true,
						items: items,
						onSelect: function onSelect(a) {
							_server = a.url;
							Lampa.Storage.set("serv_kulik", a.url);
							_this1.clear(true);
							results = [];
							_this1.activity.loader(true);
							api.parsePlaylist();
							Lampa.Controller.toggle(enabled);
						},
						onBack: function onBack() {
							Lampa.Controller.toggle(enabled);
						},
					});
				},
			};

			filter_sources.forEach(function (i, k) {
				if (i.title.split(" - ")[0] == servOpt) filter_sources[k] = server;
				if (i.title.split(" - ")[0] == lasts) filter_sources[k].selected = true;
			});
			if (object.url == "kulik" && filter_sources[0].title.split(" - ")[0] == "Избранные") filter_sources = [filter_sources[1]].concat(filter_sources.slice(0, 1), filter_sources.slice(2));

			var fil = filter_sources.find(function (a) {
				return a.selected;
			});
			return fil;
		};
		this.create_cats = function () {
			var _this = this;
			var item = [];
			if (!cache_cat[cache_name]) {
				for (var key in results) {
					item.push({
						title: key.split(" - ")[0],
						checkbox: true,
					});
				}
			} else item = cache_cat[cache_name];

			function select(where, a) {
				where.forEach(function (element) {
					element.selected = false;
				});
				a.selected = true;
			}

			function main() {
				var catg = [];
				item.forEach(function (a) {
					catg.push(a);
				});
				if (catg.length > 0) {
					cache_cat[cache_name] = catg;
					Lampa.Storage.set("Modss_tv_cat", cache_cat);
					var next = Lampa.Arrays.clone(object);
					delete next.activity;
					Lampa.Activity.push(next);
				}
				Lampa.Controller.toggle("content");
			}
			Lampa.Select.show({
				items: item,
				title: cache_cat[cache_name] ? Lampa.Lang.translate("title_fork_edit_cats") : Lampa.Lang.translate("title_fork_add_cats"),
				onBack: main,
				onSelect: function onSelect(a) {
					select(item, a);
					main();
				},
			});
		};
		this.buildFilter = function () {
			var _this5 = this;
			function push_cont(a) {
				_this5.clear(false);
				var group = a.title.split(" - ")[0];
				Lampa.Storage.set("mods_tv_last_cat", group);
				html.find(".items-line").remove();
				_this5.append_l({
					title: group,
					results: results[group],
				});
				setTimeout(Lampa.Select.close, 10);
				_this5.updateFilter([]);
			}
			if (Lampa.Storage.field("mods_tv_style") == "cats") filter.render().find(".filter--search").hide();
			filter
				.render()
				.find(".filter--search")
				.unbind("hover:enter")
				.on("hover:enter", function (e) {
					Lampa.Input.edit(
						{
							value: "",
							title: "Введите имя канала",
							free: true,
						},
						function (t) {
							if (!t) {
								Lampa.Controller.toggle("content");
								return;
							}
							var data = [];
							Lampa.Arrays.getValues(results).forEach(function (i) {
								i.find(function (l) {
									if (l.name && encodeURIComponent(l.name.trim().toLowerCase()).match(encodeURIComponent(t.trim().toLowerCase()))) data.push(l);
								});
							});

							if (data && data.length) {
								_this5.clear(true);
								searched = true;
								_this5.build(data);
							} else Lampa.Noty.show(Lampa.Lang.translate("online_query_start") + " (" + t + ") " + Lampa.Lang.translate("online_query_end"));
							Lampa.Controller.toggle("content");
						},
					);
				});
			filter
				.render()
				.find(".filter--filter")
				.on("hover:enter", function (e) {
					$("body").find(".selectbox__title").text(Lampa.Lang.translate("title_category"));
					last = e.target;
				});
			filter
				.render()
				.find(".filter--sort")
				.on("hover:enter", function () {
					_this5.create_cats();
				});
			filter
				.render()
				.find(".selector")
				.on("hover:focus", function () {
					scroll.update($(this));
				});
			filter.render().find(".filter--search span").text(Lampa.Lang.translate("search"));
			filter.render().find(".filter--filter span").text(Lampa.Lang.translate("title_category"));
			filter.onSelect = function (type, a, b) {
				if (type == "filter") {
					if (a.title.toLowerCase().match(privated) && Lampa.Storage.get("mods_password")) {
						_this5.password(function () {
							push_cont(a);
						});
					} else push_cont(a);
				}
			};
			filter.onBack = function () {
				Lampa.Controller.toggle("content");
			};
			_this5.updateFilter([]);
		};
		this.updateFilter = function (data) {
			var _this = this;
			var fil = filter_sources.find(function (a) {
				return a.selected;
			});

			filter.set("sort", filter_sources);
			if (Lampa.Storage.field("mods_tv_style") == "vert") filter.set("filter", filter_sources);
			var group = (fil && fil.title.split(" - ")[0]) || (filter_sources[0] && filter_sources[0].title.split(" - ")[0]) || (cache_cat[0] && cache_cat[0].title.split(" - ")[0]);
			filter.chosen("filter", [group]);
		};
		this.build = function (data, f) {
			var _this = _this1;
			if (data && (data.length || Lampa.Arrays.getKeys(data).length)) {
				Lampa.Template.add("epg", '<div class="info"></div>');
				var info = Lampa.Template.get("epg");
				if (object.url.indexOf("Fork") == -1 && Lampa.Storage.field("mods_tv_style") == "vert") {
					scroll_details.append(html_details);
					scroll_details.minus();
				}

				if (!html.find(".info").length) {
					if (Lampa.Storage.field("mods_tv_style") !== "cats" && object.url.indexOf("pub/tv") == -1) html.append(info.append(filter.render()));
					scroll.render().addClass("layer--wheight").data("mheight", info.css("max-height", "5em"));
					html.append(scroll.render());
				}

				scroll.append(body);

				if (object.url.indexOf("Fork") == -1 && Lampa.Storage.field("mods_tv_style") == "vert") {
					html.find(".scroll:eq(1)").css({ position: "relative", "min-height": "30em" }).parent().append('<div class="epg" style="position:absolute;width:100%;top:18em;left:0;"><div class="program"></div></div>');
					html.find(".program").append(scroll_details.render());
				}

				_this.builder(data);
				_this.buildFilter();
				_this.activity.loader(false);
				_this.activity.toggle();
			} else {
				return _this.empty();
			}
		};
		this.builder = function (data) {
			var _this = this;
			var fav = [];
			data &&
				data.forEach(function (itm) {
					Lampa.Arrays.getValues(_this.getFavorites()).filter(function (name) {
						if (itm.name == name) fav.push(itm);
					});
				});

			if (fav.length && !searched && Lampa.Arrays.getKeys(_this.getFavorites()).length) {
				if (Lampa.Storage.field("mods_tv_style") == "line")
					_this.append_l({
						title: "Избранные каналы",
						results: fav,
					});
				else results["Избранные"] = fav;
			}

			if (data && (data.length || Lampa.Arrays.getKeys(data).length)) {
				!searched &&
					data.forEach(function (element) {
						if (element.items) results[element.group || "IPTV"] = element.items;
						else if (element.servsmodstv_url && !results[servOpt]) results[servOpt] = [element];
						else if (element.servsmodstv_url && results[servOpt]) results[servOpt].push(element);
						else if (results[element.group || "IPTV"]) results[element.group || "IPTV"].push(element);
						else results[element.group || "IPTV"] = [element];
					});

				if (searched && data.length)
					_this.append_l({
						title: Lampa.Lang.translate("search"),
						results: data,
					});
				else if (object.url.indexOf("pub/tv") == -1 && object.url.indexOf("Fork") == -1 && Lampa.Storage.field("mods_tv_style") == "cats") {
					var cards = [];
					Lampa.Arrays.getKeys(results).forEach(function (e) {
						cards.push({
							name: e + " - " + results[e].length,
							picture: "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNTEyIDUxMiIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBlbmFibGUtYmFja2dyb3VuZD0ibmV3IDAgMCA1MTIgNTEyIj48cGF0aCBkPSJNNDMwLjEgMTkySDgxLjljLTE3LjcgMC0xOC42IDkuMi0xNy42IDIwLjVsMTMgMTgzYy45IDExLjIgMy41IDIwLjUgMjEuMSAyMC41aDMxNi4yYzE4IDAgMjAuMS05LjIgMjEuMS0yMC41bDEyLjEtMTg1LjNjLjktMTEuMiAwLTE4LjItMTcuNy0xOC4yek00MjYuMiAxNDMuM2MtLjUtMTIuNC00LjUtMTUuMy0xNS4xLTE1LjNIMjY3LjljLTIxLjggMC0yNC40LjMtNDAuOS0xNy40LTEzLjctMTQuOC04LjMtMTQuNi0zNi42LTE0LjZoLTc1LjNjLTE3LjQgMC0yMy42LTEuNS0yNS4yIDE2LjYtMS41IDE2LjctNSA1Ny4yLTUuNSA2My40aDM0My40bC0xLjYtMzIuN3oiIGZpbGw9IiM1NDUxNTEiIGNsYXNzPSJmaWxsLTAwMDAwMCI+PC9wYXRoPjwvc3ZnPg==",
							results: results[e],
						});
					});
					_this.append_v(cards);
				} else if (Lampa.Storage.field("mods_tv_style") == "line") {
					if (Lampa.Arrays.getKeys(results).length == 1) _this.append_v(results["IPTV"]);
					else {
						_this.saveCats();
						for (var key in results) {
							if (
								filter_sources.find(function (a) {
									return a.title.split(" - ")[0] == key;
								})
							)
								_this.append_l({
									title: key,
									results: results[key],
								});
						}
					}
				} else {
					var fil = _this1.saveCats();
					var title = ((Lampa.Arrays.getKeys(fil).length && fil.title) || (filter_sources[0] && ((filter_sources[0].title && filter_sources[0].title.indexOf(servOpt) == -1 && filter_sources[0].title) || filter_sources[1].title))).split(" - ")[0];
					if (title.toLowerCase().match(privated) && Lampa.Storage.get("mods_password")) {
						_this.password(function () {
							_this.append_l({
								title: title,
								results: results[title],
							});
							Lampa.Controller.toggle("content");
						});
					} else {
						if (object.url.indexOf("Fork") > -1 || object.url.indexOf("pub/tv") > -1) _this.append_v(results[title]);
						else {
							_this.append_l({
								title: title,
								results: results[title],
							});
						}
					}
				}
			}
		};
		this.append_v = function (data) {
			var _this3 = this;
			data.forEach(function (element) {
				var card = Lampa.Template.get("card", {
					title: element.results ? element.name : "",
					release_year: "",
				})
					.attr("data-url", element.video)
					.attr("data-id", element.id);
				card.addClass("card--collection");
				if (/iPhone|x11|nt/i.test(navigator.userAgent) && !Lampa.Platform.is("android")) {
					card.addClass("tv_pc");
					if (!element.results) card.addClass("tv_pc_c");
				}
				if (Lampa.Platform.tv() || /SMART-TV/i.test(navigator.userAgent)) {
					card.addClass("tv_tv");
					if (!element.results) card.addClass("tv_tv_c");
				}
				if (object.url.indexOf("Fork") > -1 || Lampa.Storage.field("mods_tv_style") == "cats" || object.url.indexOf("pub/tv") > -1) if (/iPhone|android/i.test(navigator.userAgent) || (Lampa.Platform.is("android") && window.innerHeight > 600)) card.addClass("mobile_tv");
				var alt_img = API.replace("api.", "") + "epg/img/" + encodeURIComponent(element.name && element.name.trim()) + ".png";
				var img = card.find(".card__img")[0];
				var image = element.tvlogo || element.logo || element.picture || alt_img;
				img.onload = function () {
					card.addClass("card--loaded");
				};
				img.onerror = function (e) {
					//img.src = './img/img_broken.svg';
					if (!image && e.type == "error") {
						card.find(".card__img").remove();
						card.find(".card__view").append('<div class="card__img modss-channel__name">' + (element.name || element.title) + "</div>");
					} else {
						img.src = alt_img;
						img.onerror = function (e) {
							card.find(".card__img").remove();
							card.find(".card__view").append('<div class="card__img modss-channel__name">' + (element.name || element.title) + "</div>");
						};
					}
				};
				if (image) img.src = image;
				else img.onerror();

				var in_favorite = _this3.getFavorites().indexOf(element.name) >= 0;
				if (in_favorite) _this1.addicon("like", card);

				//console.log('class ', card[0].className, ' | Platform', Lampa.Platform.get(), ' | width ', window.innerWidth)
				card.on("hover:focus hover:touch", function (e, is_mouse) {
					if (!element.title && !element.results && object.url.indexOf("pub/tv") == -1 && Lampa.Storage.field("mods_tv_style") == "cats" && object.url.indexOf("Fork") == -1 && (Lampa.Storage.field("mods_tv_style") == "cats" || Lampa.Storage.field("mods_tv_style") == "vert")) _this3.epg(element.epg_name || element.name, element.id);
					last = card[0];
					scroll.update(card, true);
				})
					.on("hover:long", function () {
						if (element.title || data[0].results || object.url.indexOf("pub/tv") > -1) return;
						var enabled = Lampa.Controller.enabled().name;
						var menu = [];
						if (object.url.indexOf("Fork") > -1 || Lampa.Storage.field("mods_tv_style") == "vert")
							menu.push({
								title: "Открыть ТВ Программу",
								epg: true,
							});
						menu.push(
							{
								title: in_favorite ? Lampa.Lang.translate("iptv_remove_fav") : Lampa.Lang.translate("iptv_add_fav"),
								fav: true,
							},
							{
								title: Lampa.Lang.translate("copy_link"),
								copy: true,
							},
						);
						if (Lampa.Platform.is("android")) {
							menu.push({
								title: Lampa.Lang.translate("player_lauch") + " - Android",
								player: "android",
							});
						}
						Lampa.Select.show({
							title: Lampa.Lang.translate("title_action"),
							items: menu,
							onBack: function onBack() {
								Lampa.Controller.toggle(enabled);
							},
							onSelect: function onSelect(a) {
								if (a.epg)
									_this1.tvtable(
										{
											name: element.name,
											id: element.id,
										},
										"tvtable",
									);
								if (a.fav) {
									in_favorite = !in_favorite;
									_this1.favorite(element, card);
									Lampa.Controller.toggle(enabled);
								}
								if (a.copy) {
									Lampa.Utils.copyTextToClipboard(
										element.video,
										function () {
											Lampa.Noty.show(Lampa.Lang.translate("filmix_copy_secuses"));
										},
										function () {
											Lampa.Noty.show(Lampa.Lang.translate("filmix_copy_fail"));
										},
									);
								}
								Lampa.Controller.toggle(enabled);
								if (a.player) {
									Lampa.Player.runas(a.player);
									card.trigger("hover:enter");
								}
							},
						});
					})
					.on("hover:enter", function () {
						function added() {
							_this3.clear();
							searched = true;
							Lampa.Storage.set("mods_tv_last_cat", element.name.split(" - ").shift());
							_this3.append_v(element.results);
							scroll_details.append(html_details);
							scroll_details.minus();
							html.find(".info").remove();
							html.find(".scroll:eq(0)").css({ float: "left", width: "60%" }).parent().append('<div class="epg" style="float:right;width: 40%;"><div class="program"></div></div>');
							html.find(".program").append(scroll_details.render());
							Lampa.Controller.toggle("content");
						}
						if (element.results) {
							if (element.name.toLowerCase().match(privated) && Lampa.Storage.get("mods_password")) {
								_this3.password(function () {
									added();
								});
							} else added();
						} else {
							if (element.servsmodstv_url) {
								_server = element.servsmodstv_url;
								Lampa.Storage.set("serv_kulik", element.servsmodstv_url);
								_this1.clear(true);
								results = [];
								_this1.activity.loader(true);
								Lampa.Activity.replace();
							} else {
								if (!element.video) return Lampa.Noty.show(Lampa.Lang.translate("modss_nolink"));
								if (element.video.match(/png|jpeg|jpg|bmp/)) return;
								var playlist = [];
								data.forEach(function (elem, i) {
									var ico = elem.tvlogo || elem.logo || elem.picture || "http://lampa.stream/epg/img/" + encodeURIComponent(elem.name.trim()) + ".png";
									playlist.push({
										title: ++i + " - " + elem.name,
										url: elem.video,
										id: elem.id,
										tv: true,
										icon: '<img src="' + ico + '" />',
										template: "selectbox_icon",
									});
								});
								Lampa.Player.play({
									title: element.name,
									url: element.video,
									tv: true,
								});
								Lampa.Player.playlist(playlist);
								_this1.tvtable(
									{
										name: element.name,
										id: element.id,
										url: element.video,
									},
									"player",
								);
							}
						}
					});
				body.append(card);
				items.push(card);
			});
		};
		this.append_l = function (element) {
			var _this = this;
			var item = new _this.creates(element);
			item.create();
			item.onDown = this.down.bind(this);
			item.onUp = this.up.bind(this);
			item.onBack = this.back.bind(this);
			scroll.append(item.render());
			items.push(item);
		};
		this.creates = function (data) {
			var content = Lampa.Template.get("items_line", {
				title: data.title,
			});
			var body = content.find(".items-line__body");
			var scroll = new Lampa.Scroll({
				horizontal: true,
				step: 300,
			});
			var items = [];
			var active = 0;
			var last;

			this.create = function () {
				scroll.render().find(".scroll__body").addClass("items-cards");
				content.find(".items-line__title").text(data.title + " (" + ((data && data.results.length) || "") + ")");
				data.results.forEach(this.append.bind(this));
				body.append(scroll.render());
			};
			this.item = function (data) {
				var _this = this;
				var item = Lampa.Template.get("hdgo_item", {
					title: data.name || data.title,
				})
					.attr("data-title", data.name || data.title)
					.attr("data-url", data.video || data.tvmedia)
					.attr("data-id", data.id);
				item.addClass("card--collection modss__tv").find(".card__age").remove();
				//if ((data.group == '18+' || data.group == 'Ночная лампа' || data.group == 'Эротика') && Lampa.Storage.get('mods_password')) item.addClass('nuamtv');
				if (/iPhone|x11|nt/i.test(navigator.userAgent) && !Lampa.Platform.is("android")) item.addClass("hdgo pc");
				if (Lampa.Platform.tv() || /SMART-TV/i.test(navigator.userAgent)) item.addClass("hdgo tv");
				if (/iPhone|android/i.test(navigator.userAgent) || (Lampa.Platform.is("android") && window.innerHeight > 600)) item.addClass("mobile");
				var img = item.find("img")[0];
				var alt_img = API.replace("api.", "") + "epg/img/" + encodeURIComponent(data.name && data.name.trim()) + ".png";

				var image = data.picture || data.tvlogo || data.logo || alt_img;
				img.onload = function () {
					item.addClass("card--loaded");
				};
				img.onerror = function (e) {
					//img.src = './img/img_broken.svg';
					if (!image && e.type == "error") {
						item.find(".hdgo-item__imgbox img").remove();
						item.find(".hdgo-item__imgbox").append('<div class="hdgo-item__img modss-channel__name">' + (data.name || data.title) + "</div>");
					} else {
						img.src = alt_img;
						img.onerror = function (e) {
							item.find(".hdgo-item__imgbox img").remove();
							item.find(".hdgo-item__imgbox").append('<div class="hdgo-item__img modss-channel__name">' + (data.name || data.title) + "</div>");
						};
					}
				};

				if (image) img.src = image;
				else img.onerror();
				this.render = function () {
					return item;
				};
				this.destroy = function () {
					img.onerror = function () {};
					img.onload = function () {};
					img.src = "";
					item.remove();
				};
			};
			this.append = function (element) {
				var _this = this;
				var item$1 = new _this.item(element);

				var in_favorite = _this1.getFavorites().indexOf(element.name || element.tvtitle) >= 0;
				if (data.title.indexOf("Избранные") > -1 || in_favorite) _this1.addicon("like", item$1.render());

				if (element.servcdn)
					item$1
						.render()
						.find(".card__icons")
						.append('<div class="card__type" style="display:none;top:-.3em!important;left:.7em!important">' + element.servcdn + "</div>");
				item$1
					.render()
					.on("hover:focus hover:touch", function () {
						$(".card__type").hide();
						$(this).find(".card__type").show();
						if (Lampa.Storage.field("mods_tv_style") == "vert") {
							_this1.epg(element.epg_name || element.name || element.tvtitle, element.id);
						}
						scroll.render().find(".last--focus").removeClass("last--focus");
						item$1.render().addClass("last--focus");
						last = item$1.render()[0];
						active = items.indexOf(item$1);
						scroll.update(items[active].render(), true);
					})
					.on("hover:long", function () {
						if (element.servsmodstv_url) return;
						var enabled = Lampa.Controller.enabled().name;
						var menu = [];
						if (Lampa.Storage.field("mods_tv_style") == "line")
							menu.push({
								title: "Открыть ТВ Программу",
								epg: true,
							});
						menu.push(
							{
								title: in_favorite ? Lampa.Lang.translate("iptv_remove_fav") : Lampa.Lang.translate("iptv_add_fav"),
								fav: true,
							},
							{
								title: Lampa.Lang.translate("copy_link"),
								copy: true,
							},
						);
						if (Lampa.Platform.is("android")) {
							menu.push({
								title: Lampa.Lang.translate("player_lauch") + " - Android",
								player: "android",
							});
						}
						Lampa.Select.show({
							title: Lampa.Lang.translate("title_action"),
							items: menu,
							onBack: function onBack() {
								Lampa.Controller.toggle(enabled);
							},
							onSelect: function onSelect(a) {
								if (a.epg)
									_this1.tvtable(
										{
											name: element.name || element.tvtitle,
											id: element.id,
										},
										"tvtable",
									);
								if (a.fav) {
									in_favorite = !in_favorite;
									_this1.favorite(element, items[active].render());
									Lampa.Controller.toggle(enabled);
								}
								if (a.copy) {
									Lampa.Utils.copyTextToClipboard(
										element.video,
										function () {
											Lampa.Noty.show(Lampa.Lang.translate("filmix_copy_secuses"));
										},
										function () {
											Lampa.Noty.show(Lampa.Lang.translate("filmix_copy_fail"));
										},
									);
								}
								Lampa.Controller.toggle(enabled);
								if (a.player) {
									Lampa.Player.runas(a.player);
									item$1.render().trigger("hover:enter");
								}
							},
						});
					})
					.on("hover:enter", function () {
						if (!element.video) return Lampa.Noty.show(Lampa.Lang.translate("modss_nolink"));
						function play() {
							if ((element.video || element.tvmedia).match(/png|jpeg|jpg|bmp/)) return;
							var video = {
								title: element.name || element.tvtitle,
								url: element.video || element.tvmedia,
								tv: true,
							};
							var playlist = [];
							var playlists = [];
							items.forEach(function (elem, i) {
								playlists.push({
									title: $(elem.render()).attr("data-title"),
									url: $(elem.render()).attr("data-url"),
								});
								playlist.push({
									title: ++i + " - " + $(elem.render()).attr("data-title"),
									url: $(elem.render()).attr("data-url"),
									id: $(elem.render()).attr("data-id"),
									tv: true,
									icon: '<img src="' + $(elem.render()).find("img").attr("src") + '" />',
									template: "selectbox_icon",
								});
							});
							video["playlist"] = playlists;
							Lampa.Player.play(video);
							Lampa.Player.playlist(playlist);
							_this1.tvtable(
								{
									name: element.name || element.tvtitle,
									id: element.id,
									server: element.servcdn,
								},
								"player",
							);
						}
						if (element.servsmodstv_url) {
							_server = element.servsmodstv_url;
							Lampa.Storage.set("serv_kulik", element.servsmodstv_url);
							_this1.clear(true);
							results = [];
							_this1.activity.loader(true);
							Lampa.Activity.replace();
						} else if ((element.group || element.tvgroup).toLowerCase().match(privated) && Lampa.Storage.get("mods_password")) {
							_this1.password(function () {
								play();
							});
						} else play();
					});
				scroll.append(item$1.render());
				items.push(item$1);
			};
			this.toggle = function () {
				var _this = this;
				Lampa.Controller.add("tv_line", {
					toggle: function toggle() {
						Lampa.Controller.collectionSet(scroll.render());
						Lampa.Controller.collectionFocus(last || false, scroll.render());
					},
					right: function right() {
						Navigator.move("right");
						Lampa.Controller.enable("tv_line");
					},
					left: function left() {
						if (Navigator.canmove("left")) Navigator.move("left");
						else if (_this.onLeft) _this.onLeft();
						else Lampa.Controller.toggle("menu");
					},
					down: this.onDown,
					up: this.onUp,
					gone: function gone() {},
					back: this.onBack,
				});
				Lampa.Controller.toggle("tv_line");
			};
			this.render = function () {
				return content;
			};
			this.destroy = function () {
				Lampa.Arrays.destroy(items);
				scroll.destroy();
				content.remove();
				items = null;
			};
		};
		this.epg = function (name, id) {
			var _this = this;

			// Предотвращаем повторный вызов для того же канала
			if (currentEpgId === id) return;
			currentEpgId = id;

			clearInterval(timer);
			timer = null;
			var epg = html_details.find(".mods_iptv__program");
			//$('.hdgo-item').addClass('nuamtv');
			//if(Lampa.Storage.field('mods_tv_style') == 'cats')
			$(".mods_epg-load").show();
			api.parseEpg(name, id)
				.then(function (json) {
					$(".mods_epg-load").hide();
					var bod = $('<div class="program-body"><div class="program-list"></div></div>');
					var i = 0;
					json.epg_data.forEach(function (itm) {
						var proc = _this.calcProtcent(_this.timeConverter(itm.time), _this.timeConverter(itm.time_to), _this.timenow());
						var ico = '<svg width="24px" height="24px" viewBox="0 0 24 24" role="img" xmlns="http://www.w3.org/2000/svg" aria-labelledby="radioIconTitle" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" color="#000000">  <path d="M5.44972845 6C2.18342385 9.2663046 2.18342385 14.7336954 5.44972845 18M8.59918369 8C6.46693877 10.1322449 6.46693877 13.8677551 8.59918369 16M18.5502716 18C21.8165761 14.7336954 21.8165761 9.2663046 18.5502716 6M15.4008163 16C17.5330612 13.8677551 17.5330612 10.1322449 15.4008163 8"/> <circle cx="12" cy="12" r="1"/> </svg>';
						var bars = '<div class="efir_bar"><div class="player-panel__timeline"><div class="player-panel__position" style="width:' + proc + '%"><div></div></div><div class="player-panel__time" style="font-weight:700;font-size:.8em;bottom:100%;background: rgba(0, 0, 0,.5)!important;left:' + proc + '%">' + _this.leftTime(_this.timeConverter(itm.time_to)) + "</div></div></div>";
						var efir = _this.timeConverter(itm.time_to) > _this.timenow() && _this.timeConverter(itm.time) < _this.timenow();

						if (itm.name && /*i < 11 &&*/ _this.timeConverter(itm.time_to) > _this.timenow()) {
							var li = Lampa.Template.get(itm.icon ? "epg_modss" : "notice", {
								time: '<span time-start="' + _this.timeConverter(itm.time) + '">' + _this.timeConverter(itm.time).split(" ")[1].slice(0, -3) + '</span> - <span time-stop="' + _this.timeConverter(itm.time_to) + '">' + _this.timeConverter(itm.time_to).split(" ")[1].slice(0, -3) + "</span>",
								title: ((efir && '<div style="float:left;position:relative;margin-right:.5em;bottom:.2em;width: 1.5em;height: 1.5em;">' + ico + "</div>") || "") + (itm.name || ""),
								descr: ((efir && bars) || "") + (Lampa.Storage.field("mods_tv_style") == "cats" ? "" : (itm.descr && "" + itm.descr) || ""),
							});

							if (itm.icon) {
								li.find("img").attr("src", itm.icon);

								var img = li.find("img")[0];
								var pr = "http://prx.kulik.uz/";

								var image = itm.icon;
								img.onload = function (e) {
									li.addClass("image--loaded");
								};
								img.onerror = function (e) {
									//img.src = './img/img_broken.svg';
									if (!image && e.type == "error") {
										li.find("img").remove();
									} else {
										img.src = pr + itm.icon;
										img.onerror = function (e) {
											li.find("img").remove();
										};
									}
								};
							}

							li.on("hover:focus", function (e, is_mouse) {
								last = li[0];
								if (!is_mouse) scroll_details.update(li);
							}).on("hover:hover hover:touch", function () {
								last = li[0];
								Navigator.focused(last);
							});

							bod.find(".program-list").append(li);
							i++;
						}
						if (Lampa.Storage.field("mods_tv_style") == "cats") {
							if (i > 1) {
								$(".notice__descr", li).remove();
								$(".notice__title", li).prepend("• ");
								bod.append("<style>.modss_tv .notice+.notice{margin-top:-2em!important}.modss_tv .notice__descr{margin-top:0em!important}</style>");
							}
						}
					});
					if (Lampa.Storage.field("mods_tv_style") == "cats") bod.find(".selector:eq(0)").before(Lampa.Lang.translate('<div style="font-size:1.8em;font-weight: 700;margin-left:.5em">#{iptv_now} ' + name + "</div>"));

					bod.find(".selector:eq(0)").after(Lampa.Lang.translate('<div style="font-size:1.5em;font-weight: 700;margin-left:.5em">#{iptv_later}</div>'));
					//$('.hdgo-item').removeClass('nuamtv');
					epg.empty()
						.fadeIn(300)
						.append($(".program-list", bod).html().length ? bod : '<div style="position:relative;font-weight:700;font-size:2em;margin-top:10%;text-align:center">Программа не найдена</div>');
					if ($(".notice:eq(0) .notice__time", epg).html())
						timer = setInterval(function () {
							var time = $(".notice:eq(0) .notice__time", epg).html().split(" - ");
							var s = $(time[0]).attr("time-start");
							var f = $(time[1]).attr("time-stop");
							var proc = _this.calcProtcent(s, f, _this.timenow());
							var left = _this.leftTime(f);
							if (left == "00:00") {
								clearInterval(timer);
								timer = null;
								setTimeout(function () {
									_this.epg(name, id);
								}, 1000);
							}
							if (epg.find(".notice")[0]) {
								epg.find(".notice:eq(0) .efir_bar .player-panel__position, #efir .player-panel__position").css({
									width: proc + "%",
								});
								epg.find(".notice:eq(0) .efir_bar .player-panel__time, #efir .player-panel__time")
									.text(left)
									.css({
										left: proc + "%",
									});
							}
						}, 1000);
				})
				.catch(function (error) {
					$(".hdgo-item").removeClass("nuamtv");
					epg.empty().fadeIn(300).append('<div style="position:relative;font-weight:700;font-size:2em;margin-top:10%;text-align:center">Программа не найдена</div>');
				});
		};
		this.tvtable = function (DATA, now) {
			function next(g) {
				_this.tvtable(
					{
						name: (g.item.title && g.item.title.split("-")[1].trim()) || g.item.title,
						id: g.item.id,
					},
					"player",
				);
			}
			function clear() {
				clearInterval(timer);
				timer = null;
				Lampa.PlayerPlaylist.listener.remove("select", next);
				Lampa.Player.render().find("#efir, #title_epg").remove();
			}
			clear();

			var _this = this;
			var enabled = Lampa.Controller.enabled().name;
			var epg = $('<div class="lmtv"></div>');
			if (now == "tvtable" && $("body").find(".modal").length == 0)
				Lampa.Modal.open({
					title: "ТВ программа",
					html: Lampa.Template.get("modal_loading"),
					size: "medium",
					onBack: function onBack() {
						Lampa.Modal.close();
						Lampa.Controller.toggle(Lampa.Player.opened() ? "player" : "content");
						clearInterval(timer);
						timer = null;
					},
				});
			api.parseEpg(DATA.name, DATA.id)
				.then(function (json) {
					json.epg_data.forEach(function (itm) {
						var proc = _this.calcProtcent(_this.timeConverter(itm.time), _this.timeConverter(itm.time_to), _this.timenow());
						var ico = '<svg width="24px" height="24px" viewBox="0 0 24 24" role="img" xmlns="http://www.w3.org/2000/svg" aria-labelledby="radioIconTitle" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" color="#000000">  <path d="M5.44972845 6C2.18342385 9.2663046 2.18342385 14.7336954 5.44972845 18M8.59918369 8C6.46693877 10.1322449 6.46693877 13.8677551 8.59918369 16M18.5502716 18C21.8165761 14.7336954 21.8165761 9.2663046 18.5502716 6M15.4008163 16C17.5330612 13.8677551 17.5330612 10.1322449 15.4008163 8"/> <circle cx="12" cy="12" r="1"/> </svg>';
						var bars = '<div class="efir_bar"><div class="player-panel__timeline"><div class="player-panel__position" style="width:' + proc + '%"><div></div></div><div class="player-panel__time" style="bottom:-760%;background: rgba(0, 0, 0,.5)!important;left:' + proc + '%">' + _this.leftTime(_this.timeConverter(itm.time_to)) + "</div></div></div>";
						var efir = _this.timeConverter(itm.time_to) > _this.timenow() && _this.timeConverter(itm.time) < _this.timenow();
						if (itm.name && _this.timeConverter(itm.time_to) > _this.timenow())
							epg.append(
								Lampa.Template.get("notice", {
									time: '<span time-start="' + _this.timeConverter(itm.time) + '">' + _this.timeConverter(itm.time).split(" ")[1].slice(0, -3) + '</span> - <span time-stop="' + _this.timeConverter(itm.time_to) + '">' + _this.timeConverter(itm.time_to).split(" ")[1].slice(0, -3) + "</span>",
									title: ((efir && '<div style="float:left;position:relative;margin-right:.5em;bottom:.2em;width: 1.5em;height: 1.5em;">' + ico + "</div>") || "") + (itm.name || ""),
									descr: ((efir && bars) || "") + ((itm.descr && "<br>" + itm.descr) || ""),
								}),
							);
					});
					if (now == "player") {
						Lampa.PlayerPlaylist.listener.follow("select", next);
						if ($(".notice:eq(1) .notice__time", epg).html()) {
							if (Lampa.Player.render().find("#title_epg").length == 0) Lampa.Player.render().find(".player-info__name").append('<span id="title_epg"></span>');
							Lampa.Player.render()
								.find("#title_epg")
								.text(" - Сейчас: " + $(".notice:eq(0) .notice__title", epg).text());
							var s = $($(".notice:eq(0) .notice__time", epg).html().split(" - ")[0]).attr("time-start").split(" ")[1].slice(0, -3);
							var f = $($(".notice:eq(0) .notice__time", epg).html().split(" - ")[1]).attr("time-stop").split(" ")[1].slice(0, -3);
							var server = DATA.server ? " / <b>Сервер:</b> " + DATA.server : "";
							$(".notice:eq(1) .notice__title", epg).text() &&
								Lampa.Player.render()
									.find(".value--speed span")
									.html("<b>Далее:</b> " + $(".notice:eq(1) .notice__title", epg).text() + " (" + s + " - " + f + ")" + server);
							if (Lampa.Player.render().find("#efir").length == 0) Lampa.Player.render().find(".player-info__values").after('<div id="efir" style="margin-top:.5em"></div>');
							Lampa.Player.render().find("#efir").html(epg.find(".notice:eq(0) .efir_bar").html());
						}
					} else Lampa.Modal.update(epg.find(".notice").length ? epg : $("<div>Программа не найдена</div>"));
					if ($(".notice:eq(0) .notice__time", epg).html())
						timer = setInterval(function () {
							var s = $($(".notice:eq(0) .notice__time", epg).html().split(" - ")[0]).attr("time-start");
							var f = $($(".notice:eq(0) .notice__time", epg).html().split(" - ")[1]).attr("time-stop");
							var proc = _this.calcProtcent(s, f, _this.timenow());
							var left = _this.leftTime(f);
							if (left == "00:00") {
								clear();
								setTimeout(function () {
									_this.tvtable(DATA, now);
								}, 1000);
							}
							if ($(".player-info__body #efir")[0] || $(".notice")[0]) {
								var body = now == "player" ? Lampa.Player.render() : epg;
								body.find(".notice:eq(0) .efir_bar .player-panel__position, #efir .player-panel__position").css({
									width: proc + "%",
								});
								body.find(".notice:eq(0) .efir_bar .player-panel__time, #efir .player-panel__time")
									.text(left)
									.css({
										left: proc + "%",
									});
							}
						}, 1000);
				})
				.catch(function (error) {
					Lampa.Modal.update(epg.find(".lmtv .notice").length ? epg : $("<div>Программа не найдена</div>"));
				});
			Lampa.Player.callback(function () {
				clear();
				Lampa.Controller.toggle("content");
			});
		};
		this.password = function (call) {
			Lampa.Input.edit(
				{
					value: "",
					title: "Введите пароль доступа",
					free: true,
					nosave: true,
				},
				function (t) {
					if (Lampa.Storage.get("mods_password") == t) {
						Lampa.Controller.toggle("content");
						call();
					} else {
						Lampa.Noty.show("Неверный пароль.");
						Lampa.Controller.toggle("content");
					}
				},
			);
		};
		this.addicon = function (name, card) {
			card.find(".card__icons-inner").append('<div class="card__icon icon--' + name + '"></div>');
		};
		this.getFavorites = function () {
			var favorites = Lampa.Storage.get("fav_chns", {});
			if (!favorites[cache_name]) {
				favorites[cache_name] = [];
				Lampa.Storage.set("fav_chns", favorites);
			}
			return favorites[cache_name];
		};
		this.updateFavorites = function (channels) {
			var favorites = Lampa.Storage.get("fav_chns", {});
			favorites[cache_name] = channels;
			Lampa.Storage.set("fav_chns", favorites);
		};
		this.favorite = function (data, card) {
			var _this = this;
			var fav = [];
			var favorites = this.getFavorites();
			var in_favorite = favorites.indexOf(data.name) >= 0;

			if (in_favorite) {
				Lampa.Arrays.remove(favorites, data.name);
				Lampa.Storage.remove("fav_chns", data.name);
			} else favorites.push(data.name);

			in_favorite = !in_favorite;
			this.updateFavorites(favorites);
			if (in_favorite) this.addicon("like", card);
			else card.find(".card__icons-inner").empty();

			if (object.data) {
				object.data.forEach(function (itm) {
					Lampa.Arrays.getValues(favorites).filter(function (name) {
						if (itm.name == name) fav.push(itm);
					});
				});
				results["Избранные"] = fav;
			}

			var name = this.saveCats();
			var cat_inside = Lampa.Storage.get("mods_tv_last_cat");

			if (name == undefined) Lampa.Activity.replace();
			else if (!in_favorite && favorites.length && name && name.title.indexOf("Избранные") >= 0) {
				card.remove();
				var favnum = $(".items-line__title", html).text().split("(");
				$(".items-line__title", html).text(favnum[0] + " (" + (favnum[1].slice(0, -1) - 1) + ")");
			}
			this.updateFilter([]);
		};
		this.calcProtcent = function (start, finish, now) {
			return ((new Date(now).getTime() - new Date(start).getTime()) / (new Date(finish).getTime() - new Date(start).getTime())) * 100;
		};
		this.timeConverter = function (UNIX_timestamp) {
			var a = new Date(UNIX_timestamp * 1000);

			function addLeadZero(val) {
				if (val < 10) return "0" + val;
				return val;
			}
			var date = [a.getFullYear(), addLeadZero(a.getMonth() + 1), addLeadZero(a.getDate())].join("-");
			var time = [addLeadZero(a.getHours()), addLeadZero(a.getMinutes()), addLeadZero(a.getSeconds())].join(":");
			return date + " " + time;
		};
		this.leftTime = function (end) {
			var EndTime = new Date(end);
			var NowTime = new Date(_this1.timenow());
			var t = EndTime.getTime() - NowTime.getTime();
			var h = Math.floor((t / 1000 / 60 / 60) % 24);
			var m = Math.floor((t / 1000 / 60) % 60);
			var s = Math.floor((t / 1000) % 60);
			if (h < 10) h = "0" + h;
			if (m < 10) m = "0" + m;
			if (s < 10) s = "0" + s;
			var html = ((h > 0 && h + ":") || "") + m + ":" + s;
			return html;
		};
		this.timenow = function () {
			var date = new Date(),
				time = date.getTime(),
				ofst = parseInt((localStorage.getItem("time_offset") == null ? "n0" : localStorage.getItem("time_offset")).replace("n", ""));
			date = new Date(time + ofst * 1000 * 60 * 60);
			time = [date.getHours(), date.getMinutes(), date.getSeconds(), date.getDate(), date.getMonth(), date.getFullYear()];
			return time[5] + "-" + (time[4] + 1 < 10 ? "0" + (time[4] + 1) : time[4] + 1) + "-" + (time[3] < 10 ? "0" + time[3] : time[3]) + " " + (time[0] < 10 ? "0" + time[0] : time[0]) + ":" + (time[1] < 10 ? "0" + time[1] : time[1]) + ":" + (time[2] < 10 ? "0" + time[2] : time[2]);
		};
		this.empty = function (msg) {
			var empty =
				msg == undefined
					? new Lampa.Empty()
					: new Lampa.Empty({
							title: msg.title,
							descr: msg.descr,
						});
			html.append(empty.render());
			_this1.start = empty.start.bind(empty);
			_this1.activity.loader(false);
			_this1.activity.toggle();
		};
		this.clear = function (find) {
			object.page = 1;
			last = false;
			items = [];
			body.empty();
			Lampa.Arrays.destroy(items);
			scroll.reset();
			scroll_details.reset();
			clearInterval(timer);
			timer = null;
			currentEpgId = null;
			if (find && (Lampa.Storage.field("mods_tv_style") == "line" || Lampa.Storage.field("mods_tv_style") == "vert")) {
				html_details.find(".mods_iptv__program").empty();
				scroll.clear();
				scroll_details.clear();
			}
			this.activity.loader(false);
		};
		this.back = function () {
			if (searched) {
				_this1.clear(true);
				_this1.build(object.data);
				if (find && Lampa.Storage.field("mods_tv_style") == "cats") {
					html.find(".scroll:eq(1)").attr("style", "");
					html.find(".epg").remove();
					Lampa.Controller.toggle("content");
				}
				searched = false;
			} else if (list) {
				Lampa.Activity.replace();
				list = false;
			} else Lampa.Activity.backward();
		};
		this.down = function () {
			active++;
			if (Lampa.Storage.field("mods_tv_style") == "vert" && active == 1) {
				active--;
				_this1.toggleEpg();
			} else {
				active = Math.min(active, items.length - 1);
				items[active].toggle();
				scroll.update(items[active].render());
			}
		};
		this.up = function () {
			active--;
			if (active < 0) {
				active = 0;
				_this1.toggleFilter();
			} else {
				items[active].toggle();
				scroll.update(items[active].render());
			}
		};
		this.toggleFilter = function () {
			var _this = this;
			var last = filter.render().find(".filter--filter")[0];
			Lampa.Controller.add("tv_filter", {
				toggle: function toggle() {
					Lampa.Controller.collectionSet(filter.render());
					Lampa.Controller.collectionFocus(last || false, filter.render());
				},
				right: function right() {
					Navigator.move("right");
				},
				left: function left() {
					if (Navigator.canmove("left")) Navigator.move("left");
					else Lampa.Controller.toggle("menu");
				},
				down: function down() {
					if (Navigator.canmove("down")) Navigator.move("down");
					else Lampa.Controller.toggle("content");
				},
				up: function () {
					Lampa.Controller.toggle("head");
				},
				gone: function gone() {},
				back: this.back,
			});
			Lampa.Controller.toggle("tv_filter");
		};
		this.toggleEpg = function () {
			var _this = this;
			Lampa.Controller.add("tv_epg", {
				toggle: function toggle() {
					Lampa.Controller.collectionSet(scroll_details.render());
					Lampa.Controller.collectionFocus(false, scroll_details.render());
				},
				right: function right() {
					if (Navigator.canmove("right")) Navigator.move("right");
					else {
						Lampa.Controller.toggle("tv_epg");
						Lampa.Controller.toggle("content");
						Navigator.move("right");
					}
				},
				left: function left() {
					if (Navigator.canmove("left")) Navigator.move("left");
					else {
						Lampa.Controller.toggle("tv_epg");
						Lampa.Controller.toggle("content");
						Navigator.move("left");
					}
				},
				up: function up() {
					if (Navigator.canmove("up")) Navigator.move("up");
					else Lampa.Controller.toggle("content");
				},
				down: function down() {
					if (Navigator.canmove("down")) Navigator.move("down");
				},
				gone: function gone() {},
				back: this.back,
			});
			Lampa.Controller.toggle("tv_epg");
		};
		this.start = function () {
			var _this6 = this;
			if (Lampa.Activity.active().activity !== this.activity) return;
			Lampa.Controller.add("content", {
				toggle: function toggle() {
					if (!body.find(".card").length && items.length) {
						items[active].toggle();
					} else {
						Lampa.Controller.collectionSet(scroll.render(), html, body, _this6.render());
						Lampa.Controller.collectionFocus(last || false, _this6.render() || scroll.render());
					}
				},
				left: function left() {
					if (Navigator.canmove("left")) {
						Navigator.move("left");
					} else Lampa.Controller.toggle("menu");
				},
				right: function right() {
					if (Navigator.canmove("right")) Navigator.move("right");
				},
				up: function up() {
					if (Navigator.canmove("up")) Navigator.move("up");
					else Lampa.Controller.toggle("head");
				},
				down: function down() {
					if (Navigator.canmove("down")) Navigator.move("down");
				},
				back: this.back,
			});
			Lampa.Controller.toggle("content");
		};
		this.pause = function () {};
		this.stop = function () {};
		this.render = function () {
			return html;
		};
		this.destroy = function () {
			api.destroy();
			Lampa.Arrays.destroy(items);
			scroll.destroy();
			scroll_details.destroy();
			html.remove();
			items = null;
		};
	}
	function collection(object) {
		var network = new Lampa.Reguest();
		var scroll = new Lampa.Scroll({
			mask: true,
			over: true,
			step: 250,
		});
		var items = [];
		var html = $("<div></div>");
		var body = $('<div class="category-full"></div>');
		var cors = object.sour == "rezka" || object.sourc == "rezka" ? "" : object.sour == "filmix" || object.sourc == "filmix" ? "http://corsanywhere.herokuapp.com/" : "";
		var cache = Lampa.Storage.cache("my_colls", 5000, {});
		var info;
		var last;
		var waitload = false;
		var relises = [];
		var total_pages;
		var _this1 = this;
		this.create = function () {
			var _this = this;
			var url;
			if (object.sourc == "my_coll") {
				_this.build({
					card: cache,
				});
			} else {
				if (object.card && isNaN(object.id)) url = object.id;
				else if (object.sourc == "pub") {
					if (object.search) url = object.url + "?title=" + object.search + "&sort=views-&access_token=" + Pub.token;
					else url = object.url + "?sort=" + (object.sort ? object.sort : "views-") + "&access_token=" + Pub.token;
				} else if (object.sourc == "rezka") url = object.url + "?filter=last";
				else url = object.url;

				if ((object.page == 1 && object.card_cat) || object.cards || (!object.card && !Lampa.Storage.field("light_version") && object.card_cat)) {
					this.activity.loader(true);
					network.silent(
						cors + url,
						function (str) {
							var data = _this.card(str);
							_this.build(data);
							if (object.card) $(".head__title").append(" - " + data.card.length);
						},
						function (a, c) {
							_this.empty(network.errorDecode(a, c));
						},
						false,
						{
							dataType: "text",
						},
					);
				} else _this.build(object.data);
			}
			return this.render();
		};
		this.next = function (page) {
			var _this2 = this;
			var url;
			if (total_pages == 0 || total_pages == page) waitload = true;
			if (waitload) return;
			waitload = true;
			object.page++;
			network.clear();
			network.timeout(1000 * 40);
			if (typeof page == "undefined") return;
			if (object.sourc == "pub" && object.sour !== "rezka") url = object.url + "?page=" + object.page + "&sort=" + (object.sort ? object.sort : "views-") + "&access_token=" + Pub.token;
			else if ((object.sourc == "rezka" || object.sour == "rezka") && object.data && object.data.page) url = object.data.page;
			else url = page.replace(/(\d+)\/\?filter/, object.page + "/?filter");
			eval(
				(function (a, b, c) {
					if (a || c) {
						while (a--) b = b.replace(new RegExp(a, "g"), c[a]);
					}
					return b;
				})(6, "1(!0 || !0.2) 5.3.4();", "API,if,length,location,reload,window".split(",")),
			);
			network.silent(
				cors + url,
				function (result) {
					var data = _this2.card(result);
					object.data = data;
					_this2.append(data, true);
					if (data.card.length) waitload = false;
					//Lampa.Controller.toggle('content');
					_this2.activity.loader(false);
				},
				function (a, c) {
					Lampa.Noty.show(network.errorDecode(a, c));
				},
				false,
				{
					dataType: "text",
				},
			);
		};
		this.append = function (data, append) {
			var _this1 = this;
			var datas = Lampa.Arrays.isArray(data.card) ? data.card : Lampa.Arrays.getValues(data.card).reverse();
			datas.forEach(function (element) {
				var card = new Lampa.Card(element, {
					card_category: object.sourc == "my_coll" || object.sourc == "pub" || object.sourc == "filmix" || !object.card_cat || object.cards ? true : false,
					card_collection: object.sourc == "my_coll" || object.sourc == "pub" || object.sourc == "filmix" || !object.card_cat || object.cards ? false : true,
					object: object,
				});
				card.create();
				if (object.category && (element.watch || element.quantity))
					card.render()
						.find(".card__view")
						.append('<div style="background-color: rgba(0,0,0, 0.7);padding:.5em;position:absolute;border-radius:.3em;right:3;bottom:3">' + (element.watch || element.quantity) + "</div>");
				card.onFocus = function (target, card_data) {
					last = target;
					scroll.update(card.render(), true);
					Lampa.Background.change(card_data.img);
					if (scroll.isEnd()) _this1.next(data.page);
					if (!Lampa.Platform.tv() || !Lampa.Storage.field("light_version")) {
						var maxrow = Math.ceil(items.length / 7) - 1;
						//if (Math.ceil(items.indexOf(card) / 7) >= maxrow) _this1.next(data.page);
					}
				};
				card.onEnter = function (target, card_data) {
					last = target;
					if (object.sour == "rezka" || object.sour == "filmix" || (Lampa.Storage.field("light_version") && !object.cards && !object.card_cat) || object.cards) {
						Lampa.Api.search(
							{
								query: encodeURIComponent(element.title_org),
							},
							function (find) {
								var finded = _this1.finds(element, find);
								if (finded) {
									Lampa.Activity.push({
										url: "",
										component: "full",
										id: finded.id,
										method: finded.name ? "tv" : "movie",
										card: finded,
									});
								} else {
									Lampa.Noty.show(Lampa.Lang.translate("nofind_movie"));
									Lampa.Controller.toggle("content");
								}
							},
							function () {
								Lampa.Noty.show(Lampa.Lang.translate("nofind_movie"));
								Lampa.Controller.toggle("content");
							},
						);
					} else if (object.sourc == "pub" || object.sourc == "my_coll") {
						Lampa.Activity.push({
							title: element.title,
							url: object.url + "/view?id=" + (object.sourc == "my_coll" ? element.id : element.url) + "&access_token=" + Pub.token,
							sourc: "pub",
							sour: element.source,
							source: "pub",
							id: element.url,
							card: element,
							card_cat: true,
							component: !object.category ? "full" : "collection",
							page: 1,
						});
					} else {
						Lampa.Activity.push({
							title: element.title,
							url: element.url,
							component: "collection",
							cards: true,
							sourc: object.sourc,
							source: object.source,
							page: 1,
						});
					}
				};
				card.onMenu = function (target, data) {
					var _this2 = this;
					var enabled = Lampa.Controller.enabled().name;
					var status = Lampa.Favorite.check(data);
					var items = [];
					if (object.category) {
						items.push({
							title: cache["id_" + data.id] ? Lampa.Lang.translate("card_my_clear") : Lampa.Lang.translate("card_my_add"),
							subtitle: Lampa.Lang.translate("card_my_descr"),
							where: "book",
						});
					} else {
						items.push(
							{
								title: status.book ? Lampa.Lang.translate("card_book_remove") : Lampa.Lang.translate("card_book_add"),
								subtitle: Lampa.Lang.translate("card_book_descr"),
								where: "book",
							},
							{
								title: status.like ? Lampa.Lang.translate("card_like_remove") : Lampa.Lang.translate("card_like_add"),
								subtitle: Lampa.Lang.translate("card_like_descr"),
								where: "like",
							},
							{
								title: status.wath ? Lampa.Lang.translate("card_wath_remove") : Lampa.Lang.translate("card_wath_add"),
								subtitle: Lampa.Lang.translate("card_wath_descr"),
								where: "wath",
							},
							{
								title: status.history ? Lampa.Lang.translate("card_history_remove") : Lampa.Lang.translate("card_history_add"),
								subtitle: Lampa.Lang.translate("card_history_descr"),
								where: "history",
							},
						);
					}
					if (object.sourc == "my_coll") {
						items.push({
							title: Lampa.Lang.translate("card_my_clear_all"),
							subtitle: Lampa.Lang.translate("card_my_clear_all_descr"),
							where: "clear",
						});
					}
					Lampa.Select.show({
						title: Lampa.Lang.translate("title_action"),
						items: items,
						onBack: function onBack() {
							Lampa.Controller.toggle(enabled);
						},
						onSelect: function onSelect(a) {
							if (a.where == "clear") {
								cache = {};
								Lampa.Storage.set("my_colls", cache, true);
								if (Lampa.Storage.clean) Lampa.Storage.clean("my_colls");
								console.log("Modss", "clear", "my_colls:", cache, Lampa.Storage.get("my_colls", {}));

								Lampa.Activity.push({
									url: object.url,
									sourc: object.sourc,
									source: object.source,
									title: object.title,
									card_cat: true,
									category: true,
									component: "collection",
									page: 1,
								});
								Lampa.Noty.show(Lampa.Lang.translate("saved_collections_clears"));
							} else if (object.category) {
								data.source = object.sourc;
								_this1.favorite(data, card.render());
							} else {
								if (object.sour == "filmix" || object.sour == "rezka" || object.sourc == "rezka" || object.sourc == "filmix") {
									Lampa.Api.search(
										{
											query: encodeURIComponent(data.title_org),
										},
										function (find) {
											var finded = _this1.finds(data, find);
											if (finded) {
												finded.url = (finded.name ? "tv" : "movie") + "/" + finded.id;
												Lampa.Favorite.toggle(a.where, finded);
											} else {
												Lampa.Noty.show(Lampa.Lang.translate("nofind_movie"));
												Lampa.Controller.toggle("content");
											}
										},
										function () {
											Lampa.Noty.show(Lampa.Lang.translate("nofind_movie"));
											Lampa.Controller.toggle("content");
										},
									);
								} else {
									data.source = object.source;
									Lampa.Favorite.toggle(a.where, data);
								}
								_this2.favorite();
							}
							Lampa.Controller.toggle(enabled);
						},
					});
				};
				card.visible();
				body.append(card.render());
				if (cache["id_" + element.id]) _this1.addicon("book", card.render());
				if (append) Lampa.Controller.collectionAppend(card.render());
				items.push(card);
			});
		};
		this.addicon = function (name, card) {
			card.find(".card__icons-inner").append('<div class="card__icon icon--' + name + '"></div>');
		};
		this.favorite = function (data, card) {
			var _this = this;
			if (!cache["id_" + data.id]) {
				cache["id_" + data.id] = data;
				Lampa.Storage.set("my_colls", cache);
			} else {
				delete cache["id_" + data.id];
				Lampa.Storage.set("my_colls", cache);
				Lampa.Storage.remove("my_colls", "id_" + data.id);

				Lampa.Activity.push({
					url: object.url,
					sourc: object.sourc,
					source: object.source,
					title: object.title.split("- ")[0] + "- " + Lampa.Arrays.getKeys(cache).length,
					card_cat: true,
					category: true,
					component: "collection",
					page: 1,
				});
			}
			card.find(".card__icon").remove();
			if (cache["id_" + data.id]) _this.addicon("book", card);
		};
		this.build = function (data) {
			var _this1 = this;
			if (data.card.length || Lampa.Arrays.getKeys(data.card).length) {
				Lampa.Template.add(
					"info_coll",
					Lampa.Lang.translate(
						'<div class="info layer--width" style="height:6.2em"><div class="info__left"><div class="info__title"></div><div class="info__title-original"></div><div class="info__create"></div><div class="full-start__button selector view--category"><svg version=\"1.1\" id=\"Capa_1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" x=\"0px\" y=\"0px\" viewBox=\"0 0 512 512\" style=\"enable-background:new 0 0 512 512;\" xml:space=\"preserve\"><path fill=\"currentColor\" d=\"M225.474,0C101.151,0,0,101.151,0,225.474c0,124.33,101.151,225.474,225.474,225.474c124.33,0,225.474-101.144,225.474-225.474C450.948,101.151,349.804,0,225.474,0z M225.474,409.323c-101.373,0-183.848-82.475-183.848-183.848S124.101,41.626,225.474,41.626s183.848,82.475,183.848,183.848S326.847,409.323,225.474,409.323z\"/><path fill=\"currentColor\" d=\"M505.902,476.472L386.574,357.144c-8.131-8.131-21.299-8.131-29.43,0c-8.131,8.124-8.131,21.306,0,29.43l119.328,119.328c4.065,4.065,9.387,6.098,14.715,6.098c5.321,0,10.649-2.033,14.715-6.098C514.033,497.778,514.033,484.596,505.902,476.472z\"/></svg>   <span>#{pub_search_coll}</span> </div></div><div class="info__right">  <div class="full-start__button selector view--filter"><svg style=\"enable-background:new 0 0 512 512;\" version=\"1.1\" viewBox=\"0 0 24 24\" xml:space=\"preserve\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\"><g id=\"info\"/><g id=\"icons\"><g id=\"menu\"><path d=\"M20,10H4c-1.1,0-2,0.9-2,2c0,1.1,0.9,2,2,2h16c1.1,0,2-0.9,2-2C22,10.9,21.1,10,20,10z\" fill=\"currentColor\"/><path d=\"M4,8h12c1.1,0,2-0.9,2-2c0-1.1-0.9-2-2-2H4C2.9,4,2,4.9,2,6C2,7.1,2.9,8,4,8z\" fill=\"currentColor\"/><path d=\"M16,16H4c-1.1,0-2,0.9-2,2c0,1.1,0.9,2,2,2h12c1.1,0,2-0.9,2-2C18,16.9,17.1,16,16,16z\" fill=\"currentColor\"/></g></g></svg>  <span>#{title_filter}</span></div></div></div>',
					),
				);
				info = Lampa.Template.get("info_coll");
				info.find(".view--category").on("hover:enter hover:click", function () {
					Lampa.Input.edit(
						{
							value: "",
							free: true,
						},
						function (name) {
							if (name == "") {
								Lampa.Controller.toggle("content");
								return;
							}
							Lampa.Activity.push({
								title: "Поиск по - " + name,
								url: Pub.baseurl + "v1/collections",
								component: "collection",
								search: name,
								card_cat: true,
								category: true,
								sourc: "pub",
								source: "pub",
								page: 1,
							});
						},
					);
				});
				eval(
					(function (a, b, c) {
						if (a || c) {
							while (a--) b = b.replace(new RegExp(a, "g"), c[a]);
						}
						return b;
					})(6, "1(!0 || !0.2) 5.3.4();", "API,if,length,location,reload,window".split(",")),
				);
				info.find(".view--filter").on("hover:enter hover:click", function () {
					var enabled = Lampa.Controller.enabled().name;
					var items = [
						{
							title: Lampa.Lang.translate("pub_sort_views"),
							id: "views-",
						},
						{
							title: Lampa.Lang.translate("pub_sort_watchers"),
							id: "watchers-",
						},
						{
							title: Lampa.Lang.translate("pub_sort_updated"),
							id: "updated-",
						},
						{
							title: Lampa.Lang.translate("pub_sort_created"),
							id: "created-",
						},
					].filter(function (el, i) {
						if (object.sort == el.id) el.selected = true;
						return el;
					});
					Lampa.Select.show({
						title: Lampa.Lang.translate("title_filter"),
						items: items,
						onBack: function onBack() {
							Lampa.Controller.toggle(enabled);
						},
						onSelect: function onSelect(a) {
							Lampa.Activity.push({
								title: Lampa.Lang.translate("title_filter") + " " + a.title.toLowerCase(),
								url: Pub.baseurl + "v1/collections",
								component: "collection",
								sort: a.id,
								card_cat: true,
								category: true,
								sourc: "pub",
								source: "pub",
								page: 1,
							});
						},
					});
				});
				scroll.render().addClass("layer--wheight").data("mheight", info);
				if (object.sourc == "pub" && object.category) html.append(info);
				html.append(scroll.render());
				scroll.onEnd = function () {
					_this1.next(data.page);
				};
				this.append(data);

				//	if (Lampa.Platform.tv() && Lampa.Storage.field('light_version')) this.more(data);
				scroll.append(body);
				this.activity.loader(false);
				this.activity.toggle();
			} else {
				html.append(scroll.render());
				this.empty(object.search ? Lampa.Lang.translate("online_query_start") + " (" + object.search + ") " + Lampa.Lang.translate("online_query_end") : "");
			}
		};
		this.empty = function (msg) {
			var empty =
				msg == undefined
					? new Lampa.Empty()
					: new Lampa.Empty({
							title: "",
							descr: msg,
						});
			html.append(empty.render());
			_this1.start = empty.start;
			_this1.activity.loader(false);
			_this1.activity.toggle();
		};
		this.more = function (data) {
			var _this = this;
			//	var more = $('<div class="category-full__more selector"><span>' + Lampa.Lang.translate('show_more') + '</span></div>');
			//	more.on('hover:focus hover:touch', function (e) {
			Lampa.Controller.collectionFocus(last || false, scroll.render());
			var next = Lampa.Arrays.clone(object);
			if (data.total_pages == 0 || data.total_pages == undefined) {
				more.remove();
				return;
			}
			network.clear();
			network.timeout(1000 * 20);
			var url;
			if (object.sourc == "pub") url = object.url + "?page=" + data.page + "&sort=" + (object.sort ? object.sort : "views-") + "&access_token=" + Pub.token;
			else url = data.page;
			network.silent(
				cors + url,
				function (result) {
					var card = _this.card(result);
					next.data = card;
					if (object.cards) next.cards = false;
					delete next.activity;
					next.page++;
					if (card.card.length == 0) more.remove();
					else Lampa.Activity.push(next);
				},
				function (a, c) {
					Lampa.Noty.show(network.errorDecode(a, c));
				},
				false,
				{
					dataType: "text",
				},
			);
			//	});
			body.append(more);
		};
		this.back = function () {
			last = items[0].render()[0];
			var more = $('<div class="selector" style="width: 100%; height: 5px"></div>');
			more.on("hover:focus", function (e) {
				if (object.page > 1) {
					Lampa.Activity.backward();
				} else {
					Lampa.Controller.toggle("head");
				}
			});
			body.prepend(more);
		};
		this.card = function (str) {
			var card = [];
			var page;
			if (object.sourc != "pub") str = str.replace(/\\n/g, "");
			if ((object.card && object.card.source == "rezka") || object.sourc == "rezka") {
				var h = $(".b-content__inline_item", str).length ? $(".b-content__inline_item", str) : $(".b-content__collections_item", str);
				total_pages = $(".b-navigation", str).find("a:last-child").length;
				page = $(".b-navigation", str).find("a:last-child").attr("href");
				$(h).each(function (i, html) {
					card.push({
						id: $("a", html).attr("href").split("-")[0].split("/").pop(),
						title: $("a:eq(1)", html).text().split(" / ").shift() || $(".title", html).text(),
						title_org: $("a:eq(1)", html).text().split(" / ").shift(),
						url: $("a", html).attr("href"),
						img: $("img", html).attr("src"),
						quantity: $(".num", html).text() + " видео",
						year: $("div:eq(2)", html).text().split(" - ").shift(),
					});
				});
			} else if ((object.card && object.card.source == "filmix") || object.sourc == "filmix") {
				var d = $(".playlist-articles", str);
				var str = d.length ? d.html() : $(".m-list-movie", str).html();
				$(str).each(function (i, html) {
					if (html.tagName == "DIV") {
						page = $(html).find(".next").attr("href");
						total_pages = $(html).find("a:last-child").length;
					}
					if (html.tagName == "ARTICLE")
						card.push({
							id: $("a", html).attr("href").split("-")[0].split("/").pop(),
							title: $(".m-movie-title", html).text() || ($(".poster", html).attr("alt") && $(".poster", html).attr("alt").split(",").shift()),
							title_org: $(".m-movie-original", html).text() || $(".origin-name", html).text(),
							url: $("a", html).attr("href"),
							img: $("img", html).attr("src"),
							quantity: $(".m-movie-quantity", html).text() || $(".count", html).text(),
							year: $(".grid-item", html).text() || ($(".poster", html).attr("alt") && $(".poster", html).attr("alt").split(",").pop()),
						});
				});
			} else if ((object.card && object.card.source == "pub") || object.sourc == "pub") {
				str = JSON.parse(str);
				if (str.pagination) {
					total_pages = str.pagination.total + 1;
					page = str.pagination.current + 1;
				}
				if (str.items)
					str.items.forEach(function (element) {
						card.push({
							url: element.id,
							id: element.id,
							watch: element.views + "/" + element.watchers,
							title: element.title.split("/")[0],
							original_title: element.title.split("/")[1] || element.title,
							release_date: element.year ? element.year + "" : element.years ? element.years[0] + "" : "0000",
							first_air_date: (element.type && (element.type.match("serial|docuserial|tvshow") ? "tv" : "")) || "",
							vote_average: element.imdb_rating || 0,
							img: element.posters.big,
							year: element.year,
							years: element.years,
						});
					});
			}
			return {
				card: card,
				page: page,
				total_pages: total_pages,
			};
		};
		this.finds = function (element, find) {
			var finded;
			var filtred = function filtred(items) {
				for (var i = 0; i < items.length; i++) {
					var item = items[i];
					if ((element.title_org == (item.original_title || item.original_name) || element.title == (item.title || item.name)) && (item.first_air_date || item.release_date) && parseInt(element.year) == (item.first_air_date || item.release_date).split("-").shift()) {
						finded = item;
						break;
					}
				}
			};
			if (find.movie && find.movie.results.length) filtred(find.movie.results);
			if (find.tv && find.tv.results.length && !finded) filtred(find.tv.results);
			return finded;
		};
		this.start = function () {
			Lampa.Controller.add("content", {
				toggle: function toggle() {
					Lampa.Controller.collectionSet(scroll.render(), info);
					Lampa.Controller.collectionFocus(last || false, scroll.render());
				},
				left: function left() {
					if (Navigator.canmove("left")) Navigator.move("left");
					else Lampa.Controller.toggle("menu");
				},
				right: function right() {
					Navigator.move("right");
				},
				up: function up() {
					if (Navigator.canmove("up")) Navigator.move("up");
					else Lampa.Controller.toggle("head");
				},
				down: function down() {
					if (Navigator.canmove("down")) Navigator.move("down");
				},
				back: function back() {
					Lampa.Activity.backward();
				},
			});
			Lampa.Controller.toggle("content");
		};
		this.pause = function () {};
		this.stop = function () {};
		this.render = function () {
			return html;
		};
		this.destroy = function () {
			network.clear();
			Lampa.Arrays.destroy(items);
			scroll.destroy();
			html.remove();
			body.remove();
			network = null;
			items = null;
			html = null;
			body = null;
			info = null;
		};
	}

	// SomaFM, fmplay - Radio plugin for Lampa by @tsynik & @usmanec
	// https://somafm.com/channels.json
	// https://github.com/rainner/soma-fm-player
	// https://codeberg.org/cuschk/somafm

	function _classCallCheck(a, n) {
		if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function");
	}
	function _defineProperties(e, r) {
		for (var t = 0; t < r.length; t++) {
			var o = r[t];
			((o.enumerable = o.enumerable || !1), (o.configurable = !0), "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o));
		}
	}
	function _createClass(e, r, t) {
		return (
			r && _defineProperties(e.prototype, r),
			t && _defineProperties(e, t),
			Object.defineProperty(e, "prototype", {
				writable: !1,
			}),
			e
		);
	}
	function _defineProperty(e, r, t) {
		return (
			(r = _toPropertyKey(r)) in e
				? Object.defineProperty(e, r, {
						value: t,
						enumerable: !0,
						configurable: !0,
						writable: !0,
					})
				: (e[r] = t),
			e
		);
	}
	function _toPrimitive(t, r) {
		if ("object" != typeof t || !t) return t;
		var e = t[Symbol.toPrimitive];
		if (void 0 !== e) {
			var i = e.call(t, r || "default");
			if ("object" != typeof i) return i;
			throw new TypeError("@@toPrimitive must return a primitive value.");
		}
		return ("string" === r ? String : Number)(t);
	}
	function _toPropertyKey(t) {
		var i = _toPrimitive(t, "string");
		return "symbol" == typeof i ? i : i + "";
	}

	var SwipeDetector = (function () {
		function SwipeDetector(options) {
			_classCallCheck(this, SwipeDetector);

			this.targetElement = options.element;
			this.onSwipeLeft = options.onSwipeLeft;
			this.onSwipeRight = options.onSwipeRight;
			this.onSwipeUp = options.onSwipeUp;
			this.onSwipeDown = options.onSwipeDown;
			this.onLongPress = options.onLongPress;

			this.initialX = null;
			this.initialY = null;
			this.currentX = null;
			this.currentY = null;
			this.xDiff = null;
			this.yDiff = null;
			this.active = false;
			this.longPressTimeout = null;
			this.swiped = false;
			this.preventTextSelection = false; // Новое свойство

			this.targetElement.addEventListener("touchstart", this.startTouch.bind(this), false);
			this.targetElement.addEventListener("touchmove", this.moveTouch.bind(this), false);
			this.targetElement.addEventListener("touchend", this.endTouch.bind(this), false);
		}

		_createClass(SwipeDetector, [
			{
				key: "startTouch",
				value: function startTouch(event) {
					this.active = true;
					this.initialX = event.touches[0].clientX;
					this.initialY = event.touches[0].clientY;
					this.startLongPress();
					this.swiped = false;
				},
			},
			{
				key: "moveTouch",
				value: function moveTouch(event) {
					if (!this.active) return;

					this.currentX = event.touches[0].clientX;
					this.currentY = event.touches[0].clientY;

					this.xDiff = this.initialX - this.currentX;
					this.yDiff = this.initialY - this.currentY;

					if (Math.abs(this.xDiff) > Math.abs(this.yDiff)) {
						if (this.xDiff > 0 && !this.swiped) {
							this.onSwipeLeft();
							this.swiped = true;
						} else if (!this.swiped) {
							this.onSwipeRight();
							this.swiped = true;
						}
					} else {
						if (this.yDiff > 0 && !this.swiped) {
							this.onSwipeUp();
							this.swiped = true;
						} else if (!this.swiped) {
							this.onSwipeDown();
							this.swiped = true;
						}
					}

					this.initialX = this.currentX;
					this.initialY = this.currentY;
					this.endLongPress();
				},
			},
			{
				key: "endTouch",
				value: function endTouch() {
					this.active = false;
					this.endLongPress();
					this.swiped = false;
					this.preventTextSelection = false; // Сбрасываем флаг
				},
			},
			{
				key: "startLongPress",
				value: function startLongPress() {
					var _this = this;
					this.longPressTimeout = setTimeout(function () {
						if (_this.onLongPress) {
							_this.onLongPress();
						}
						_this.originalUserSelect = _this.targetElement.style.userSelect; // Сохраняем исходное значение
						_this.originalWebkitUserSelect = _this.targetElement.style.WebkitUserSelect; // Сохраняем исходное значение
						_this.targetElement.style.userSelect = "none"; // Запрещаем выделение текста
						_this.targetElement.style.WebkitUserSelect = "none"; // Запрещаем выделение текста в Safari
					}, 500); // Adjust the delay as needed
				},
			},
			{
				key: "endLongPress",
				value: function endLongPress() {
					clearTimeout(this.longPressTimeout);
					if (this.preventTextSelection) {
						// Разрешаем выделение текста
						this.preventTextSelection = false;
					}
				},
			},
		]);
		return SwipeDetector;
	})();

	var IMG_BG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAADUlEQVR42gECAP3/AAAAAgABUyucMAAAAABJRU5ErkJggg=="; // black
	var curPlayID = null;
	var played = false;
	var info;
	var useAAC = Lampa.Storage.field("modssfm_use_aac");
	var PREFERRED_STREAMS = useAAC
		? [
				// 320k MP3
				{ urlRegex: /320\.pls$/, format: "mp3" },
				// 256k MP3
				{ urlRegex: /256\.pls$/, format: "mp3" },
				// 128k AAC
				{ quality: "highest", format: "aac" },
				// 128k MP3
				{ quality: "highest", format: "mp3" },
				// 64k AAC
				{ quality: "high", format: "aacp" },
				// 32k AAC
				{ quality: "low", format: "aacp" },
			]
		: [
				// 320k MP3
				{ urlRegex: /320\.pls$/, format: "mp3" },
				// 256k MP3
				{ urlRegex: /256\.pls$/, format: "mp3" },
				// 128k MP3
				{ quality: "highest", format: "mp3" },
			];

	var powtwo = 1024; // power of 2 value
	var _context = null;
	var _audio = null;
	var _source = null;
	var _freq = new Uint8Array(powtwo);
	var _gain = null;
	var _analyser = null;
	var _events = {};
	var _component;
	var audioErr;

	var anf = null;
	var isInitialized = false;

	// setup audio routing, called after user interaction, setup once
	function setupAudio() {
		if (_audio && _context) return;
		if (typeof Audio !== "undefined") {
			_audio = new Audio();

			try {
				_context = new (window.AudioContext || window.webkitAudioContext)();
			} catch (error) {
				console.error("Modss", "Ошибка при создании AudioContext:", error);
			}

			if (_audio && _context && typeof _context.createMediaElementSource === "function") {
				_source = _context.createMediaElementSource(_audio);
				_analyser = _context.createAnalyser();
				_gain = _context.createGain();
				_analyser.fftSize = powtwo;
				_source.connect(_analyser);
				_source.connect(_gain);
				_gain.connect(_context.destination);
				_audio.addEventListener("canplay", function (e) {
					console.log("Modss", "Modss_Radio", "got canplay");
					_freq = new Uint8Array(_analyser.frequencyBinCount);
					_audio.play();
				});
				// https://developer.mozilla.org/en-US/docs/Web/HTML/Element/audio#events
				["play", "pause", "waiting", "playing", "timeupdate", "ended", "stalled", "suspend"].forEach(function (event) {
					_audio.addEventListener(event, function (e) {
						return emit(event, e);
					});
				});
			} else {
				console.error("Modss", "Audio API не поддерживается в этом браузере");
			}
		} else {
			console.error("Modss", "Audio API не поддерживается в этом браузере");
		}
	}

	// emit saved audio event
	function emit(event, data) {
		if (event && _events.hasOwnProperty(event)) {
			//console.log('Modss_Radio', 'emit', event);
			_events[event].map(function (fn) {
				fn(data);
			});
		}
	}
	// add event listeners to the audio api
	function on(event, callback) {
		if (event && typeof callback === "function") {
			if (!_events[event]) _events[event] = [];
			_events[event].push(callback);
		}
	}

	var isSupportWebp = function () {
		var elem = document.createElement("canvas");
		var support = false;
		if (!!(elem.getContext && elem.getContext("2d"))) {
			// was able or not to get WebP representation
			support = elem.toDataURL("image/webp").indexOf("data:image/webp") === 0;
		}
		isSupportWebp = function () {
			return support;
		};
		return isSupportWebp();
	};

	var levenshtein = (function () {
		function _min(d0, d1, d2, bx, ay) {
			return d0 < d1 || d2 < d1 ? (d0 > d2 ? d2 + 1 : d0 + 1) : bx === ay ? d1 : d1 + 1;
		}

		return function (a, b) {
			if (a === b) {
				return 0;
			}

			if (a.length > b.length) {
				var tmp = a;
				a = b;
				b = tmp;
			}

			var la = a.length;
			var lb = b.length;

			while (la > 0 && a.charCodeAt(la - 1) === b.charCodeAt(lb - 1)) {
				la--;
				lb--;
			}

			var offset = 0;

			while (offset < la && a.charCodeAt(offset) === b.charCodeAt(offset)) {
				offset++;
			}

			la -= offset;
			lb -= offset;

			if (la === 0 || lb < 3) {
				return lb;
			}

			var x = 0;
			var y;
			var d0;
			var d1;
			var d2;
			var d3;
			var dd;
			var dy;
			var ay;
			var bx0;
			var bx1;
			var bx2;
			var bx3;

			var vector = [];

			for (y = 0; y < la; y++) {
				vector.push(y + 1);
				vector.push(a.charCodeAt(offset + y));
			}

			var len = vector.length - 1;

			for (; x < lb - 3; ) {
				bx0 = b.charCodeAt(offset + (d0 = x));
				bx1 = b.charCodeAt(offset + (d1 = x + 1));
				bx2 = b.charCodeAt(offset + (d2 = x + 2));
				bx3 = b.charCodeAt(offset + (d3 = x + 3));
				dd = x += 4;
				for (y = 0; y < len; y += 2) {
					dy = vector[y];
					ay = vector[y + 1];
					d0 = _min(dy, d0, d1, bx0, ay);
					d1 = _min(d0, d1, d2, bx1, ay);
					d2 = _min(d1, d2, d3, bx2, ay);
					dd = _min(d2, d3, dd, bx3, ay);
					vector[y] = dd;
					d3 = d2;
					d2 = d1;
					d1 = d0;
					d0 = dy;
				}
			}

			for (; x < lb; ) {
				bx0 = b.charCodeAt(offset + (d0 = x));
				dd = ++x;
				for (y = 0; y < len; y += 2) {
					dy = vector[y];
					vector[y] = dd = _min(dy, d0, dd, bx0, vector[y + 1]);
					d0 = dy;
				}
			}

			return dd;
		};
	})();
	// https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/Searching.html#//apple_ref/doc/uid/TP40017632-CH5-SW1
	var noCoverTitle = [];
	var albumCoverCache = {};
	function getTrackCover(title, album, callback) {
		if (!album) return;
		var albumHash = Lampa.Utils.hash(album);
		var setTrackCover = callback || function () {};
		if (albumHash && albumCoverCache[albumHash]) {
			setTrackCover(albumCoverCache[albumHash]);
			return;
		}

		var regex = /[\s.,{}\-\\\/()\[\]:;'"!@#$%^&*]+/g; // punctuation and spaces
		if (noCoverTitle.indexOf(title) < 0) {
			var request = "https://itunes.apple.com/search?term=" + encodeURIComponent(title) + "&media=music&entity=song";
			Api.network.native(
				request,
				function (data) {
					var bigCover = false;
					if (!data || !data["resultCount"] || !data["results"] || !data["results"].length) {
						if (data !== false) {
							noCoverTitle.push(title);
						}
					}
					var albumLC = album.toLowerCase().replace(regex, "");
					var filtered = data["results"].filter(function (r) {
						r.collectionNameLC = r.collectionName ? r.collectionName.toLowerCase().replace(regex, "") : "";
						return r.collectionNameLC && (r.collectionNameLC.indexOf(albumLC) >= 0 || albumLC.indexOf(r.collectionNameLC) >= 0);
					});
					// console.log('SomaFM', 'getTrackCover request:', request, 'data resultCount', data['resultCount'], "filtered", filtered.length);
					if (!filtered.length) {
						var accuracyPercent = 60; // Допустимая погрешность %
						var accuracyMaxLen = (albumLC.length * accuracyPercent) / 100;
						filtered = data["results"]
							.filter(function (r) {
								r.levenshtein = levenshtein(r.collectionNameLC, albumLC);
								return r.levenshtein <= accuracyMaxLen;
							})
							.sort(function (a, b) {
								return a.levenshtein - b.levenshtein;
							});
						// if (filtered.length)
						//   console.log('SomaFM', 'getTrackCover levenshtein:', '"' + albumLC + '"', 'accuracyPercent', accuracyPercent, "filtered", filtered.length, "min", filtered[0].levenshtein, "max", filtered[filtered.length - 1].levenshtein)
						// else
						//   console.log('SomaFM', 'getTrackCover levenshtein:', '"' + albumLC + '"', 'accuracyPercent', accuracyPercent, "filtered", 0);
					}
					if (!filtered.length || !filtered[0]["artworkUrl100"]) {
						noCoverTitle.push(title);
					} else {
						bigCover = filtered[0]["artworkUrl100"].replace("100x100bb.jpg", "500x500bb.jpg"); // увеличиваем разрешение
						albumCoverCache[albumHash] = bigCover;
					}
					setTrackCover(bigCover);
				},
				function () {
					setTrackCover(false);
				},
			);
		} else {
			setTrackCover(false);
		}
	}

	var Api = /*#__PURE__*/ (function () {
		function Api() {
			_classCallCheck(this, Api);
		}
		return _createClass(Api, null, [
			{
				key: "list",
				value: function list(obj) {
					var _this = this;
					return new Promise(function (resolve, reject) {
						var url = (obj.url == "" && _this.stantion()[0].url) || obj.url;
						var cacheName = "radio_list_" + ((obj.url == "" && _this.stantion()[0].title) || obj.title);
						//console.log('Api', 'GET', {obj, url,cacheName})
						_this.network["native"](
							url,
							function (result) {
								Lampa.Cache.rewriteData("other", cacheName, result)["finally"](resolve.bind(resolve, result));
							},
							function () {
								Lampa.Cache.getData("other", cacheName).then(resolve)["catch"](reject);
							},
						);
					});
				},
			},
			{
				key: "stantion",
				value: function stantion() {
					return [
						{
							title: "Modss FM",
							url: "http://lampa.stream/stantions.json",
							id: 4,
						},
						{
							title: "Record FM",
							url: this.CORS + "https://www.radiorecord.ru/api/stations/",
							id: 1,
						},
						{
							title: "Soma FM",
							url: "https://somafm.com/channels.json",
							id: 2,
						},
						{
							title: "FM PLAY",
							url: this.CORS + "https://fmplay.ru/stations.json",
							id: 3,
						},
					];
				},
			},
		]);
	})();

	_defineProperty(Api, "network", new Lampa.Reguest());
	_defineProperty(Api, "CORS", "https://cors.lampa.stream/");

	var Favorites = /*#__PURE__*/ (function () {
		function Favorites() {
			_classCallCheck(this, Favorites);
		}
		return _createClass(Favorites, null, [
			{
				key: "get",
				value: function get() {
					var all = Lampa.Storage.get("radio_favorite_stations", "[]");
					all.sort(function (a, b) {
						return a.added > b.added ? -1 : a.added < b.added ? 1 : 0;
					});
					return all;
				},
			},
			{
				key: "find",
				value: function find(favorite) {
					return this.get().find(function (a) {
						return a.id == favorite.id;
					});
				},
			},
			{
				key: "remove",
				value: function remove(favorite) {
					var list = this.get();
					var find = this.find(favorite);
					if (find) {
						Lampa.Arrays.remove(list, find);
						Lampa.Storage.set("radio_favorite_stations", list);
					}
				},
			},
			{
				key: "add",
				value: function add(favorite) {
					var list = this.get();
					var find = this.find(favorite);
					if (!find) {
						Lampa.Arrays.extend(favorite, {
							id: Lampa.Utils.uid(),
							added: Date.now(),
						});
						list.push(favorite);
						Lampa.Storage.set("radio_favorite_stations", list);
					}
				},
			},
			{
				key: "update",
				value: function update(favorite) {
					var list = this.get();
					var find = this.find(favorite);
					if (find) {
						Lampa.Storage.set("radio_favorite_stations", list);
					}
				},
			},
			{
				key: "toggle",
				value: function toggle(favorite) {
					return this.find(favorite) ? this.remove(favorite) : this.add(favorite);
				},
			},
		]);
	})();

	function Info(station, Player) {
		var _this = this;
		var info_html = Lampa.Template.js("modss_radio_player");
		var showAnalyzer = Lampa.Storage.field("modssfm_show_analyzer");
		var currTrack = {};
		var img_elm;
		var songsupdate;
		var songId = 0;
		var getNewSong = true;

		if (songsupdate) {
			clearInterval(songsupdate);
			songsupdate = null;
		}

		on("playing", function () {
			Player.changeWave("play", info_html);
		});
		on("waiting", function () {
			Player.changeWave("loading", info_html);
		});

		this.create = function () {
			var cover = Lampa.Template.js("modss_radio_cover");
			cover.find(".m-radio-cover__station").text(station.title || station.name || "");
			cover.find(".m-radio-cover__genre").text(station.genres || "");
			cover.find(".m-radio-cover__tooltip").text(station.description || station.tooltip || "");
			cover.find(".m-radio-cover__album span").text(station.dj ? "DJ – " + station.dj : "");

			cover.find(".m-radio-cover__img-container").addClass("focus");

			var img_box = cover.find(".m-radio-cover__img-box");
			img_box.removeClass("loaded loaded-icon");

			img_elm = img_box.find("img");
			img_elm.onload = function () {
				img_box.addClass("loaded");
			};
			img_elm.onerror = function () {
				img_elm.src = "./img/icons/menu/movie.svg";
				img_box.addClass("loaded-icon");
			};
			img_elm.src = station.largeimage || station.image || station.bg_image_mobile || station.picture; // image - 120 | largeimage - 256 | xlimage 512

			info_html.find(".m-radio-player__cover").html(cover);
			info_html.find(".m-radio-player__close").on("click", function () {
				window.history.back();
			});

			document.body.append(info_html);

			this.start(info_html);
			if (showAnalyzer !== "hide" && !isInitialized) this.visualisation();
			this.update_info();
		};
		this.update = function (station) {
			var cover = $(".m-radio-player");
			cover.find(".m-radio-cover__station").text(station.title || station.name || "");
			cover.find(".m-radio-cover__genre").text(station.genres || "");
			cover.find(".m-radio-cover__tooltip").text(station.description || station.tooltip || "");
			cover.find(".m-radio-cover__album span").text(station.dj ? "DJ – " + station.dj : "");

			cover.find(".m-radio-cover__img-container").addClass("focus");

			var img_box = cover.find(".m-radio-cover__img-box");
			img_box.removeClass("loaded loaded-icon");

			img_elm = img_box.find("img")[0];
			img_elm.onload = function () {
				img_box.addClass("loaded");
			};
			img_elm.onerror = function () {
				img_elm.src = "./img/icons/menu/movie.svg";
				img_box.addClass("loaded-icon");
			};
			img_elm.src = station.largeimage || station.image || station.bg_image_mobile || station.picture; // image - 120 | largeimage - 256 | xlimage 512

			this.update_info();
		};
		this.update_info = function () {
			var setTrackCover = function setTrackCover(cover) {
				img_elm.src = cover || station.largeimage || station.image || station.bg_image; // image - 120 | largeimage - 256 | xlimage 512
				Lampa.Background.immediately(img_elm.src);
			};

			var updatePlayingInfo = function updatePlayingInfo(playingTrack) {
				var fetchCovers = Lampa.Storage.field("modssfm_fetch_covers");

				if (playingTrack.title) info_html.find(".m-radio-cover__title").text(playingTrack.title);

				// TODO: use playlist for lastSongs
				// info_html.find('.m-radio-cover__playlist').text(playlist);

				var album_cont = info_html.find(".m-radio-cover__album");
				var album_info = album_cont.find("span").text(playingTrack.album || "");
				var album_svg = album_cont.find("svg");
				playingTrack.album ? (album_svg.style.width = "1em") : (album_svg.style.width = "0em");
				info_html.find(".m-radio-cover__title").text(playingTrack.title || "");
				info_html.find(".m-radio-cover__tooltip").text(playingTrack.artist || playingTrack.tooltip || "");

				var coverKey = isSupportWebp() ? "cover_webp" : "cover";
				var img = playingTrack[coverKey] ? playingTrack.root + playingTrack[coverKey] : "";

				var albumart = playingTrack.albumart || img;
				if (albumart) setTrackCover(albumart);
				else if (fetchCovers) getTrackCover(playingTrack.artist + " - " + playingTrack.title, playingTrack.album, setTrackCover);
			};

			var fetchSongs = function fetchSongs(channel, callback) {
				var apiurl = channel.songsurl || "";
				var title = channel.title || "...";
				var error = "There was a problem loading the list of songs for channel " + title + " from SomaFM.";

				Api.network.timeout(5000);
				Api.network.native(
					apiurl,
					function (result) {
						if (!result.songs) return callback(error, []);
						return callback(null, result.songs);
					},
					function () {
						return callback(error, []);
					},
				);
			};

			if (songsupdate) {
				clearInterval(songsupdate);
				songsupdate = null;
			}

			if (_component._object.id == 2) {
				// get songs list for a channel from api
				_this.getSongs = function getSongs(channel) {
					if (!channel || !channel.id || !channel.songsurl) return;

					fetchSongs(channel, function (err, songs) {
						var size = Object.keys(songs).length;
						if (!err && size > 0 && (!currTrack.date || (songs[0].date && currTrack.date !== songs[0].date))) {
							currTrack = songs.shift();
							updatePlayingInfo(currTrack);
						}
					});
				};
			} else if (_component._object.id == 3) {
				// get songs list for a channel from api
				_this.getSongs = function getSongs(channel) {
					if (!channel || !channel.id || !channel.songUrl || !channel.songIdUrl || songId === "000") return;
					var noCache = new Date().getTime();
					if (getNewSong) {
						getNewSong = false;
						Api.network.native(channel.songUrl + "?" + noCache, function (data) {
							if (!data.uniqueid || data.uniqueid == "000") return;
							songId = data.uniqueid;
							currTrack = data;
							updatePlayingInfo(currTrack);
						});
					} else {
						Api.network.native(channel.songIdUrl + "?" + noCache, function (data) {
							if (!data.uniqueid) return;
							getNewSong = songId !== data.uniqueid;
							if (getNewSong) {
								songId = data.uniqueid;
								getSongs(channel);
							}
						});
					}
				};
			}

			if (_this.getSongs)
				songsupdate = setInterval(function () {
					_this.getSongs(station);
				}, 3000);
		};
		this.visualisation = function () {
			var Visualizer = {
				init: function (analyser) {
					try {
						this._analyser = analyser;
						this._freq = new Uint8Array(analyser.frequencyBinCount);
						this._hasfreq = false;
						this._counter = 0;
					} catch (error) {
						console.error("Modss", "Modss_Radio", "Ошибка инициализации визуализатора:", error);
					}
				},
				getFreqData: function (playing) {
					if (!this._analyser) return 0;

					// this is not working on some devices running safari
					this._analyser.getByteFrequencyData(this._freq);
					var freq = Math.floor(this._freq[4] | 0) / 255;

					// indicate that a freq value can be read
					if (!this._hasfreq && freq) this._hasfreq = true;
					// frequency data available
					if (this._hasfreq) return freq;

					// return fake counter if no freq data available (safari workaround)
					if (playing) {
						this._counter = this._counter < 0.6 ? this._counter + 0.01 : this._counter;
					} else {
						this._counter = this._counter > 0 ? this._counter - 0.01 : this._counter;
					}
					return this._counter;
				},
				visualizeBarGraph: function (played) {
					var canvas = info_html.find("canvas");
					canvas.width = window.innerWidth;
					canvas.height = window.innerHeight;
					var ctx = canvas.getContext("2d");

					var bufferLength = this._analyser.frequencyBinCount;
					var WIDTH = canvas.width;
					var HEIGHT = canvas.height;
					var barWidth = (WIDTH / bufferLength) * 2.5;
					var barHeight;
					var x = 0;

					var renderFrame = function renderFrame() {
						// get data
						var freq = this.getFreqData(played);
						// clear draw
						ctx.clearRect(0, 0, canvas.width, canvas.height);
						x = 0;
						for (var i = 0; i < bufferLength; i++) {
							barHeight = this._freq[i] * 2;
							var r = 255;
							var g = 255;
							var b = 255;
							var opacity = this._freq[i] / 510; // 0 to 0.5, data = [0 to 255]
							ctx.fillStyle = "rgba(" + r + "," + g + "," + b + "," + opacity + ")";
							ctx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight);
							x += barWidth + 4;
						}
						anf = requestAnimationFrame(renderFrame.bind(this));
					};
					renderFrame.call(this);
				},
				visualizeGraphics: function (played) {
					var that = this;
					var graphicsManager = {
						_wrap: null,
						_canvas: null,
						_renderer: null,
						_scene: null,
						_camera: null,
						_box: null,
						_mouse: {
							x: 0,
							y: 0,
						},
						_objects: [],
						Sphere: {
							group: null,
							shapes: [],
							move: new THREE.Vector3(0, 0, 0),
							touch: false,
							ease: 8,
							create: function (containerBounds, scene) {
								this.group = new THREE.Object3D();

								var smallCircleGeometry = new THREE.CircleGeometry(1, 10);
								var largeCircleGeometry = new THREE.CircleGeometry(2, 20);
								var sphereGeometry = new THREE.SphereGeometry(100, 30, 14).vertices;
								var material = new THREE.MeshNormalMaterial({
									transparent: true,
									opacity: 0,
									side: THREE.DoubleSide,
								});

								for (var i = 0; i < sphereGeometry.length; i++) {
									var sphereGeometryItem = sphereGeometry[i];
									var x = sphereGeometryItem.x;
									var y = sphereGeometryItem.y;
									var z = sphereGeometryItem.z;
									var homePosition = {
										x: x,
										y: y,
										z: z,
									};
									var startCycle = THREE.Math.randInt(0, 100);
									var cyclePace = THREE.Math.randInt(10, 30);
									var mesh = new THREE.Mesh(i % 2 ? smallCircleGeometry : largeCircleGeometry, material);

									mesh.position.set(x, y, z);
									mesh.lookAt(new THREE.Vector3(0, 0, 0));
									mesh.userData = {
										radius: 12,
										cycle: startCycle,
										pace: cyclePace,
										home: homePosition,
									};

									this.group.add(mesh);
								}

								this.touch = "ontouchstart" in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;
								this.group.position.set(40, 5, 0);
								this.group.rotation.x = Math.PI / 2 + 0.6;
								scene.add(this.group);
							},
							update: function (containerBounds, mousePosition, audioData) {
								var xOffset = containerBounds.width < 800 ? 0 : 40;
								var zOffset = containerBounds.width < 800 ? -60 : 20;
								var zMultiplier = 0.5 + 0.5 * audioData;

								if (this.touch) {
									this.group.position.x = xOffset;
								} else {
									this.move.x = xOffset + -0.012 * mousePosition.x;
									this.group.position.x += (this.move.x - this.group.position.x) / this.ease;
									this.group.position.y += (this.move.y - this.group.position.y) / this.ease;
								}

								this.group.position.z = zOffset + 80 * audioData;
								this.group.rotation.y -= 0.003;

								for (var i = 0; i < this.group.children.length; i++) {
									var mesh = this.group.children[i];
									var radius = mesh.userData.radius;
									var cycle = mesh.userData.cycle;
									var pace = mesh.userData.pace;
									var home = mesh.userData.home;
									mesh.material.opacity = 0.2 + 0.8 * audioData;
									mesh.position.set(home.x, home.y, home.z);
									mesh.translateZ(zMultiplier * Math.sin(cycle / pace) * radius);
									mesh.userData.cycle++;
								}
							},
						},
						setupCanvas: function () {
							this._wrap = document.querySelector(".m-radio-player");
							this._canvas = document.querySelector("#player-canvas");
							this._box = this._wrap.getBoundingClientRect();

							this._scene = new THREE.Scene();
							this._renderer = new THREE.WebGLRenderer({
								canvas: this._canvas,
								alpha: true,
								antialias: true,
								precision: "lowp",
							});
							this._renderer.setClearColor(0, 0);
							this._renderer.setPixelRatio(window.devicePixelRatio);

							this._camera = new THREE.PerspectiveCamera(60, this._box.width / this._box.height, 0.1, 20000);
							this._camera.lookAt(this._scene.position);
							this._camera.position.set(0, 0, 300);
							this._camera.rotation.set(0, 0, 0);

							this._objects.push(this.Sphere);

							// Создаем объекты для сцены
							for (var i = 0; i < this._objects.length; i++) {
								this._objects[i].create(this._box, this._scene);
							}

							// Добавляем обработчики событий
							window.addEventListener("mousemove", this.updateMouse.bind(this));
							window.addEventListener("resize", this.updateSize.bind(this));

							this.updateMouse();
							this.updateSize();
							isInitialized = true;
						},
						animate: function () {
							anf = requestAnimationFrame(this.animate.bind(this));
							this.updateObjects(that.getFreqData(played));
						},
						updateObjects: function (freqData) {
							// Обновляем графические объекты на основе частотных данных
							for (var i = 0; i < this._objects.length; i++) {
								this._objects[i].update(this._box, this._mouse, freqData);
							}
							this._renderer.render(this._scene, this._camera);
						},
						updateSize: function () {
							if (this._wrap && this._canvas) {
								this._box = this._wrap.getBoundingClientRect();
								this._canvas.width = this._box.width;
								this._canvas.height = this._box.height;
								this._camera.aspect = this._box.width / this._box.height;
								this._camera.updateProjectionMatrix();
								this._renderer.setSize(this._box.width, this._box.height);
							}
						},
						updateMouse: function (event) {
							if (this._box) {
								var centerX = this._box.left + this._box.width / 2;
								var centerY = this._box.top + this._box.height / 2;

								if (event) {
									this._mouse.x = Math.max(0, event.pageX || event.clientX || 0) - centerX;
									this._mouse.y = Math.max(0, event.pageY || event.clientY || 0) - centerY;
								} else {
									this._mouse.x = centerX;
									this._mouse.y = centerY;
								}
							}
						},
					};

					graphicsManager.setupCanvas();
					graphicsManager.animate();
				},
			};

			Visualizer.init(_analyser);
			if (showAnalyzer == "line") Visualizer.visualizeBarGraph(played);
			else if (showAnalyzer == "ball") Visualizer.visualizeGraphics(played);
		};
		this.start = function (html) {
			var swipeDetector = new SwipeDetector({
				element: html,
				onSwipeLeft: function () {},
				onSwipeRight: function () {
					window.history.back();
				},
				onSwipeUp: function () {
					var pos = _component.move(1);
					_component.updateUI(pos, +1, -1);
				},
				onSwipeDown: function () {
					var pos = _component.move(-1);
					_component.updateUI(pos, -1, +1);
				},
				onLongPress: function () {},
				// Минимальное расстояние, которое должно быть пройдено, чтобы зафиксировать свайп
				swipeThreshold: 50,
				// Максимальное время, в течение которого должен быть совершен свайп
				swipeTimeThreshold: 300,
				// Время, в течение которого нажатие не должно считаться свайпом, а считаться просто нажатием
				tapDelay: 150,
				// Время, в течение которого должно быть зажато нажатие, чтобы оно считалось длительным
				longPressDelay: 800,
			});
		};
		this.destroy = function () {
			anf && cancelAnimationFrame(anf);
			info_html.remove();
			clearInterval(songsupdate);
			songsupdate = null; // release songs update timer
			currTrack = {};
		};
	}

	function Player() {
		var _this = this;
		var html = $("body"); //Lampa.Template.js('radio_player');
		var miniPlayer = html.find(".m_fm-player");
		var cover = html.find(".m-radio-cover__img-container");

		var station;
		var url;
		var format = "";
		var hls;
		var screenreset;

		var player_html = (miniPlayer.length && miniPlayer) || Lampa.Template.get("modss_radio_play_player", {});
		var cover_html = (cover.length && cover) || Lampa.Template.get("modss_radio_cover", {});

		on("play", function () {
			played = true;
			player_html.toggleClass("pause", false);
		});
		on("pause", function () {
			played = true;
			Lampa.Player.callback(function () {
				console.log("Modss", "Modss_Radio", "play", "Close LAMPA player");
				Lampa.Controller.toggle("content");
				start();
			});
		});
		on("playing", function () {
			_this.changeWave("play");
			player_html.toggleClass("loading", false);
			player_html.toggleClass("play", true);
			if (!screenreset) {
				screenreset = setInterval(function () {
					Lampa.Screensaver.resetTimer();
				}, 5000);
			}
		});
		on("timeupdate", function () {
			if (Lampa.Player.opened() && played) {
				played = false;
				_audio.pause();
				console.log("Modss", "Modss_Radio", "pause", "Start LAMPA player");
			}
		});
		on("waiting", function () {
			_this.changeWave("loading");
			player_html.toggleClass("loading", true);
		});
		on("error", function (e) {
			audioErr = true;
		});

		// handle player button click
		[player_html, cover_html].forEach(function (btn) {
			btn.on("hover:enter", function () {
				if (played) {
					html.find(".m-radio-item").filter(".play").toggleClass("play", false).toggleClass("stop", true);
					stop();
				} else if (url) {
					html.find(".m-radio-item").filter(".stop").toggleClass("play", true).toggleClass("stop", false);
					play();
				}
			});
			btn.on("hover:long", function () {
				html.find(".m-radio-item").filter(".play").toggleClass("play", false);
				btn.toggleClass("hide", true);
				stop("stop");
				Lampa.Controller.toggle("content");
			});
		});

		function prepare() {
			if (_audio && _audio.canPlayType("audio/vnd.apple.mpegurl")) load();
			else if (Hls.isSupported() && format == "aacp") {
				//if (audio.canPlayType('application/vnd.apple.mpegurl') || url.indexOf('.aacp') > 0 || station.stream) load();else if (Hls.isSupported()) {
				try {
					hls = new Hls();
					hls.attachMedia(_audio);
					hls.loadSource(url);
					hls.on(Hls.Events.ERROR, function (event, data) {
						if (data.details === Hls.ErrorDetails.MANIFEST_PARSING_ERROR) {
							if (data.reason === "no EXTM3U delimiter") {
								Lampa.Noty.show(Lampa.Lang.translate("radio_load_error"));
							}
						}
					});
					hls.on(Hls.Events.MANIFEST_LOADED, function () {
						start();
					});
				} catch (e) {
					Lampa.Noty.show(Lampa.Lang.translate("radio_load_error"));
				}
			} else load();
		}
		function load() {
			if (_audio) {
				_audio.src = url;
				_audio.preload = "metadata";
				_audio.crossOrigin = "anonymous";
				_audio.autoplay = false;
				_audio.load();
				start();
			}
		}
		function start() {
			var playPromise;
			try {
				playPromise = _audio.play();
			} catch (e) {}
			if (playPromise !== undefined) {
				playPromise
					.then(function () {
						console.log("Modss", "Modss_Radio", "start plaining", url);
						_this.changeWave("play");
					})
					["catch"](function (e) {
						console.log("Modss", "Modss_Radio", "play promise error:", e.message);
					});
			}
		}
		function play() {
			if (_context.state === "suspended") {
				_context.resume().then(function () {
					console.log("Modss", "Modss_Radio", "Audio context has been resumed.");
				});
			}
			player_html.toggleClass("loading", true);
			player_html.toggleClass("stop", false);
			_this.createWave();
			prepare();
		}
		function stop(stop) {
			clearInterval(screenreset);
			screenreset = null; // release timer from the variable
			played = false;
			player_html.toggleClass("stop", true);
			player_html.toggleClass("play loading", false);
			_this.changeWave(stop || "loading");
			if (hls) {
				hls.destroy();
				hls = false;
			}
			_audio.src = "";
		}
		this.createWave = function createWave() {
			var box = html.find(".m-radio-player__wave").html("");
			for (var i = 0; i < 15; i++) {
				var div = document.createElement("div");
				box.append(div);
			}
			_this.changeWave("loading");
		};
		this.changeWave = function changeWave(class_name, liness) {
			var lines = (liness && liness.find(".m-radio-player__wave").querySelectorAll("div")) || (html.find(".m-radio-player__wave").length && html.find(".m-radio-player__wave")[0].children) || false;
			for (var i = 0; i < lines.length; i++) {
				lines[i].removeClass("play loading").addClass(class_name);
				if (class_name == "stop") lines[i].style = "";
				else {
					lines[i].style["animation-duration"] = (class_name == "loading" ? 400 : 200 + Math.random() * 200) + "ms";
					lines[i].style["animation-delay"] = (class_name == "loading" ? Math.round((400 / lines.length) * i) : 0) + "ms";
				}
			}
		};
		this.create = function (station) {
			if (!miniPlayer.length) $(".head__actions .open--search").before(player_html);
			setupAudio();
		};
		this.info = function () {
			// add info
			if (Lampa.Storage.field("modssfm_show_info") === true) {
				if (info) info.update(station);
				else {
					info = new Info(station, this);
					info.create();
				}
				document.body.addClass("ambience--enable");
				Lampa.Background.change(station.largeimage || IMG_BG); // image - 120 | largeimage - 256 | xlimage 512
			}
		};
		this.play = function (stations) {
			if (window.currentPlayer && window.currentPlayer !== this && window.currentPlayer.destroy) {
				window.currentPlayer.destroy();
			}
			window.currentPlayer = this;

			station = stations;
			if (curPlayID !== station.id || !played) stop();

			// url = data.aacfile ? data.aacfile : data.mp3file;
			if (curPlayID !== station.id || !played) {
				url = station.video ? station.video : station.stream_320 ? station.stream_320 : station.stream_128 ? station.stream_128 : station.stream ? station.stream : station.stream_hls ? station.stream_hls.replace("playlist.m3u8", "96/playlist.m3u8") : "";

				this.info();

				if (station.stream && station.stream.urls)
					Promise.resolve(station.stream.urls).then(function (urls) {
						if (urls.length > 0) {
							url = urls[Math.floor(Math.random() * urls.length)];
							play();
						}
					});
				else play();

				curPlayID = station.id;
			}
			// setup player button
			player_html.find(".m_fm-player__name").text(station.title);
			player_html.toggleClass("hide", false);
			var btn = player_html.find(".m_fm-player__button");
			if (btn) {
				btn.css({
					"background-image": "url('" + (station.bg_image_mobile || station.image) + "')",
					"background-size": "cover",
					"border-radius": "0.2em",
				});
			}
		};
		this.infoClose = function () {
			if (info) {
				info.destroy();
				info = false;
				anf && cancelAnimationFrame(anf);
				isInitialized = false;
			}
		};
		this.destroy = function () {
			stop();
			player_html.toggleClass("hide", true);
			clearInterval(screenreset);
			curPlayID = null;
			//html.remove();
		};
	}

	function Radio_n(object) {
		var player = window.m_play_player;
		var _this6 = this;
		var last,
			scroll,
			played_st,
			filtred = [],
			items = [],
			page = 0;
		var html = document.createElement("div");
		var cache = Lampa.Storage.cache("radio_cache_st", 3, {});
		var img_bg = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAZCAYAAABD2GxlAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAHASURBVHgBlZaLrsMgDENXxAf3/9XHFdXNZLm2YZHQymPk4CS0277v9+ffrut62nEcn/M8nzb69cxj6le1+75f/RqrZ9fatm3F9wwMR7yhawilNke4Gis/7j9srQbdaVFBnkcQ1WrfgmIIBcTrvgqqsKiTzvpOQbUnAykVW4VVqZXyyDllYFSKx9QaVrO7nGJIB63g+FAq/xhcHWBYdwCsmAtvFZUKE0MlVZWCT4idOlyhTp3K35R/6Nzlq0uBnsKWlEzgSh1VGJxv6rmpXMO7EK+XWUPnDFRWqitQFeY2UyZVryuWlI8ulLgGf19FooAUwC9gCWLcwzWPb7Wa60qdlZxjx6ooUuUqVQsK+y1VoAJyBeJAVsLJeYmg/RIXdG2kPhwYPBUQQyYF0XC8lwP3MTCrYAXB88556peCbUUZV7WccwkUQfCZC4PXdA5hKhSVhythZqjZM0J39w5m8BRadKAcrsIpNZsLIYdOqcZ9hExhZ1MH+QL+ciFzXzmYhZr/M6yUUwp2dp5U4naZDwAF5JRSefdScJZ3SkU0nl8xpaAy+7ml1EqvMXSs1HRrZ9bc3eZUSXmGa/mdyjbmqyX7A9RaYQa9IRJ0AAAAAElFTkSuQmCC";
		_component = this;

		this.create = function () {
			var _this = this;
			this.activity.loader(true);

			_this.data = {
				genre: [],
				stations: [],
			};

			var last_st = Lampa.Arrays.getKeys(cache).reduce(function (result, key) {
				if (cache[key].hasOwnProperty("last") && cache[key].last === true) {
					result = cache[key];
					result.key = key;
					result.change = false;
				}
				return result;
			}, {});

			if (last_st)
				object = Object.assign(
					{},
					object,
					Api.stantion().find(function (s) {
						if (object.url == "" || object.change || last_st.last) return last_st.key == s.title;
						if (!object.change) return s.id == last_st.id;
					}),
				);

			_this._object = object;
			Api.list(object)
				.then(function (result) {
					_this.buildChanel(result);

					if (last_st.id == -1 && Favorites.get().length) filtred = Favorites.get();
					else if (last_st.id >= 0) {
						filtred = _this6.data.stations.filter(function (s) {
							return s.genre.find(function (g) {
								return g.id == last_st.id;
							});
						});
						if (!filtred.length) filtred = _this6.data.stations;
					} else filtred = (_this6.data.stations && _this6.data.stations) || _this6.data;

					filtred = filtred.sort(function (a, b) {
						return b.listeners - a.listeners;
					});

					//console.log('result',{cache, object, data3: _this6.data, filtred})

					_this.build();
				})
				["catch"](function (e) {
					console.log("Modss", "Modss_Radio", "error", e);
					_this.data = {
						stations: [],
					};
					_this.build();
				});

			return this.render();
		};
		this.buildChanel = function (result) {
			if (object.id == 2) {
				var parseINIString = function parseINIString(data) {
					var regex = {
						section: /^\s*\[\s*([^\]]*)\s*\]\s*$/,
						param: /^\s*([^=]+?)\s*=\s*(.*?)\s*$/,
						comment: /^\s*;.*$/,
					};
					var value = {};
					var lines = data.split(/[\r\n]+/);
					var section = null;
					lines.forEach(function (line) {
						if (regex.comment.test(line)) {
							return;
						} else if (regex.param.test(line)) {
							var match = line.match(regex.param);
							if (section) {
								value[section][match[1]] = match[2];
							} else {
								value[match[1]] = match[2];
							}
						} else if (regex.section.test(line)) {
							var match = line.match(regex.section);
							value[match[1]] = {};
							section = match[1];
						} else if (line.length == 0 && section) {
							section = null;
						}
					});
					return value;
				};
				var getUrlsFromPlaylist = function getUrlsFromPlaylist(playlistUrl) {
					return new Promise(function (resolve, reject) {
						var error = "There was a problem parse urls from playlist " + playlistUrl + " from SomaFM.";
						Api.network.timeout(5000);
						Api.network.native(
							playlistUrl,
							function (response) {
								try {
									var data = parseINIString(response); // decode pls INI
									var result = [];
									for (var key in data.playlist) {
										if (key.match(/^File\d+$/)) result.push(data.playlist[key]);
									}
									!result.length ? reject(error) : resolve(result);
								} catch (e) {
									console.log("Modss", "Modss_Radio", "SomaFM", error, e.message);
									reject(e);
								}
							},
							function () {},
							false,
							{
								dataType: "text",
							},
						);
					});
				};
				var getStreamUrls = function getStreamUrls(channel) {
					if (channel.stream.urls) return Promise.resolve(channel.stream.urls);
					return getUrlsFromPlaylist(channel.stream.url);
				};
				var getHighestQualityStream = function getHighestQualityStream(channel, streams) {
					for (var ks in streams) {
						var stream = streams[ks];
						for (var kp in channel.playlists) {
							var playlist = channel.playlists[kp];
							if ((!stream.urlRegex || stream.urlRegex.test(playlist.url)) && (!stream.quality || playlist.quality === stream.quality) && (!stream.format || playlist.format === stream.format)) {
								return {
									url: playlist.url,
									format: playlist.format,
									quality: playlist.quality,
								};
							}
						}
					}
					return null;
				};

				_this6.data.stations = Lampa.Arrays.getKeys(result.channels).map(function (key, i) {
					var station = result.channels[key];
					if (Array.isArray(station.playlists)) {
						var categories = station.genre.split("|");
						var genres = categories.reduce(function (acc, category) {
							var genre = _this6.data.genre.find(function (g) {
								return g.name === category.trim();
							});

							if (!genre) {
								genre = {
									name: category.trim(),
									id: _this6.data.genre.length,
								};
								_this6.data.genre.push(genre);
							}

							acc.push(genre);
							return acc;
						}, []);
						var url = new URL(object.url).origin;
						station.songsurl = url + "/songs/" + station.id + ".json";
						station.infourl = url + "/" + station.id + "/";
						station.stream = getHighestQualityStream(station, PREFERRED_STREAMS);
						station.stream.urls = getStreamUrls(station);
						station.genres = station.genre;
						station.tooltip = station.description;
						station.genre = genres;
						station.image = station.largeimage;

						return station;
					}
				});
			} else if (object.id == 3) {
				var imageCreate = function (station) {
					var isDarkTheme = true; //todo add checkTheme
					var logoKey = "logo" + (isDarkTheme ? "-d" : "") + (isSupportWebp() ? "_webp" : "");
					var img = "https://fmplay.ru/" + station[logoKey];
					return img;
				};
				_this6.data.stations = Object.keys(result).map(function (key, i) {
					var station = result[key];
					var category = station.category;
					var genre = _this6.data.genre.some(function (g) {
						return g.name === category;
					})
						? _this6.data.genre.find(function (g) {
								return g.name === category;
							})
						: _this6.data.genre.push({ name: category, id: i }) - 1;
					return {
						id: i,
						prefix: key,
						title: station.name,
						image: imageCreate(station),
						stream: station.url_hi || station.url || station.url_low || station.xtra_low,
						songIdUrl: "https://pic.fmplay.ru/stations/" + key + "/fmplay_id.json",
						songUrl: "https://pic.fmplay.ru/stations/" + key + "/fmplay_current.json",
						genre: [genre],
					};
				});

				_this6.data.genre = Object.keys(_this6.data.genre).map(function (key) {
					return _this6.data.genre[key];
				});
			} else _this6.data = (result.result && result.result) || result;
		};
		this.background = function () {
			Lampa.Background.immediately(last ? last.background || img_bg : img_bg);
		};
		this.build = function () {
			var _this2 = this;
			html.append(Lampa.Template.js("modss_radio_content"));
			scroll = new Lampa.Scroll({
				mask: true,
				over: true,
			});
			scroll.onEnd = function () {
				if (filtred.length > 100) {
					page++;
					_this2.next();
				}
			};
			html.find(".m-radio-content__list").append(scroll.render(true));
			html.find(".m-radio-content__cover").append(Lampa.Template.js("modss_radio_cover"));
			scroll.minus(html.find(".m-radio-content__head"));

			this.buildStantion();
			this.buildCatalog();
			this.buildSearch();
			this.buildAdd();
			this.display();
			Lampa.Layer.update(html);
			this.activity.loader(false);
		};
		this.clearButtons = function (category, search) {
			var btn_catalog = html.find(".button--catalog");
			var btn_search = html.find(".button--search");
			btn_catalog.find("div").addClass("hide").text("");
			btn_search.find("div").addClass("hide").text("");
			if (category) {
				btn_catalog.find("div").removeClass("hide").text(category);
			} else {
				btn_search.find("div").removeClass("hide").text(search);
			}
		};
		this.buildStantion = function () {
			var _this3 = this;
			var btn = html.find(".button--stantion");
			var items = [];

			Api.stantion().forEach(function (el) {
				items.push(el);
			});

			btn.on("hover:enter", function () {
				Lampa.Select.show({
					title: Lampa.Lang.translate("radio_station"),
					items: items.map(function (s) {
						s.selected = s.title == ((object.url == "" && Api.stantion()[0].title) || object.title);
						return s;
					}),
					onSelect: function onSelect(a) {
						if (!Lampa.Arrays.getKeys(cache[a.title]).length) cache[a.title] = {};
						cache[a.title].last = false;
						cache[a.title].change = true;
						for (var key in cache) {
							if (cache.hasOwnProperty(key)) {
								if (a.title === key) {
									cache[key].last = true;
								} else {
									cache[key].last = false;
								}
							}
						}
						Lampa.Storage.set("radio_cache_st", cache);

						Lampa.Activity.replace(a);
						_this3.clearButtons(a.title, false);
						_this3.display();
					},
					onBack: function onBack() {
						Lampa.Controller.toggle("content");
					},
				});
			});
		};
		this.buildCatalog = function () {
			var _this3 = this;
			var btn = html.find(".button--catalog");
			var items = [];
			var favs = Favorites.get().length;
			items.push({
				title: Lampa.Lang.translate("settings_input_links") + " [" + favs + "]",
				ghost: !favs,
				noenter: !favs,
				favorite: true,
				id: -1,
			});
			if (this.data.stations && this.data.stations.length) {
				items.push({
					title: Lampa.Lang.translate("settings_param_jackett_interview_all") + " [" + _this3.data.stations.length + "]",
					all: true,
					id: -2,
				});

				this.data.genre.forEach(function (g) {
					var numST = _this3.data.stations.filter(function (s) {
						return s.genre.find(function (d) {
							return d.id == g.id;
						});
					}).length;

					items.push({
						title: g.name + " [" + numST + "]",
						id: g.id,
					});
				});
			}

			var active = items.find(function (s) {
				var title = (object.url == "" && Api.stantion()[0].title) || object.title;
				return cache[title] && cache[title].id === s.id;
			});

			_this3.clearButtons((items[1] && ((active && active.ghost) || !active) && items[1].title) || (active && active.title) || items[0].title, false);

			if (active && active.ghost && !favs) {
				if (!filtred.length) filtred = _this3.data.stations;
				_this3.display();
			}

			btn.on("hover:enter", function () {
				Lampa.Select.show({
					title: Lampa.Lang.translate("title_genre"),
					items: items.map(function (s) {
						if (active && active.ghost) s.selected = s.id == -2;
						if (active && !active.ghost) s.selected = s.id == active.id;
						return s;
					}),
					onSelect: function onSelect(a) {
						if (a.favorite) {
							filtred = Favorites.get();
						} else if (a.all) filtred = _this3.data.stations;
						else {
							filtred = _this3.data.stations.filter(function (s) {
								return s.genre.find(function (g) {
									return g.id == a.id;
								});
							});
						}

						a.last = true;
						cache[object.url == "" ? Api.stantion()[0].title : object.title] = a;
						Lampa.Storage.set("radio_cache_st", cache);

						_this3.clearButtons(a.title, false);
						_this3.buildCatalog();
						_this3.display();
					},
					onBack: function onBack() {
						Lampa.Controller.toggle("content");
					},
				});
			});
		};
		this.buildAdd = function () {
			var _this4 = this;
			var btn = html.find(".button--add");
			btn.on("hover:enter", function () {
				Lampa.Input.edit(
					{
						title: Lampa.Lang.translate("radio_add_station"),
						free: true,
						nosave: true,
						nomic: true,
						value: "",
					},
					function (url) {
						if (url) {
							Favorites.add({
								user: true,
								stream: url,
								title: Lampa.Lang.translate("radio_station"),
							});
							filtred = Favorites.get();
							_this4.clearButtons(Lampa.Lang.translate("settings_input_links"), false);
							_this4.buildCatalog();
							_this4.display();
						} else {
							Lampa.Controller.toggle("content");
						}
					},
				);
			});
		};
		this.buildSearch = function () {
			var _this5 = this;
			var btn = html.find(".button--search");
			btn.on("hover:enter", function () {
				Lampa.Input.edit(
					{
						free: true,
						nosave: true,
						nomic: true,
						value: "",
					},
					function (val) {
						if (val) {
							val = val.toLowerCase();
							filtred = _this5.data.stations.filter(function (s) {
								return s.title.toLowerCase().indexOf(val) >= 0 || s.tooltip.toLowerCase().indexOf(val) >= 0;
							});
							_this5.clearButtons(false, val);
							_this5.display();
						} else {
							Lampa.Controller.toggle("content");
						}
					},
				);
			});
		};
		this.play = function (station) {
			played_st = station;
			player.play(station, _this6);
			Lampa.Background.change(station.bg_image_mobile || station.image || img_bg);
		};
		this.display = function () {
			scroll.clear();
			scroll.reset();
			last = false;
			page = 0;
			this.cover({
				title: "",
				tooltip: "",
			});
			items = [];
			if (filtred.length) this.next();
			else {
				for (var i = 0; i < 3; i++) {
					var empty = Lampa.Template.js("modss_radio_list_item");
					empty.addClass("empty--item");
					empty.style.opacity = 1 - 0.3 * i;
					scroll.append(empty);
				}
				Lampa.Layer.visible(scroll.render(true));
			}
			this.activity.toggle();
		};
		this.next = function () {
			var views = 10;
			var start = page * views;
			if (filtred.length > 100) filtred.slice(start, start + views).forEach(_this6.append.bind(_this6));
			else filtred.forEach(_this6.append.bind(_this6));
			Lampa.Layer.visible(scroll.render(true));
		};
		this.append = function (station) {
			var _this7 = this;
			var item = Lampa.Template.js("modss_radio_list_item");
			if (!station.id) station.id = filtred.indexOf(station) + 1;
			item.find(".m-radio-item__num").text((filtred.indexOf(station) + 1).pad(2));
			item.find(".m-radio-item__title").text(station.title || station.name);
			item.find(".m-radio-item__tooltip").text(station.tooltip || "");

			if (station.listeners) item.find(".m-radio-item__listeners-count").text(station.listeners);
			else item.find(".m-radio-item__listeners").addClass("hide");
			item.background = station.bg_image_mobile || station.image || station.picture || img_bg;
			var img_box = item.find(".m-radio-item__cover-box");
			var img_elm = item.find("img");
			img_elm.onload = function () {
				img_box.addClass("loaded");
			};
			img_elm.onerror = function () {
				img_elm.src = "./img/icons/menu/movie.svg";
				img_box.addClass("loaded-icon");
			};
			img_elm.src = station.bg_image_mobile || station.image || station.picture;
			item.on("hover:focus hover:hover", function () {
				_this7.cover(station);
				//scroll.render().find('.focused').removeClass('focused');
				//item.addClass('focused');
				Lampa.Background.change(item.background);
				last = item;
			});
			item.on("hover:focus", function () {
				scroll.update(item);
			});
			item.on("hover:enter", function () {
				if (curPlayID !== station.id) scroll.render().find(".play").removeClass("play pause");
				item.addClass("play");
				_this7.play(station);
				var up = filtred.indexOf(station) + 1;
				var down = filtred.indexOf(station) - 1;
				$("body")
					.find(".m-radio-cover__after_statntion")
					.text(filtred[up] ? filtred[up].title : station.title);
				$("body")
					.find(".m-radio-cover__before_statntion")
					.text(filtred[down] ? filtred[down].title : station.title);
			});
			item.on("hover:long", function () {
				if (station.user) {
					Lampa.Select.show({
						title: Lampa.Lang.translate("menu_settings"),
						items: [
							{
								title: Lampa.Lang.translate("extensions_change_name"),
								change: "title",
							},
							{
								title: Lampa.Lang.translate("extensions_change_link"),
								change: "stream",
							},
							{
								title: Lampa.Lang.translate("extensions_remove"),
								remove: true,
							},
						],
						onSelect: function onSelect(a) {
							if (a.remove) {
								Favorites.remove(station);
								item.remove();
								last = false;
								Lampa.Controller.toggle("content");
							} else {
								Lampa.Input.edit(
									{
										free: true,
										nosave: true,
										nomic: true,
										value: station[a.change] || "",
									},
									function (val) {
										if (val) {
											station[a.change] = val;
											Favorites.update(station);
											_this7.cover(station);
											item.find(".m-radio-item__" + (a.change == "title" ? "title" : "tooltip")).text(val);
										}
										Lampa.Controller.toggle("content");
									},
								);
							}
						},
						onBack: function onBack() {
							Lampa.Controller.toggle("content");
						},
					});
				} else {
					Favorites.toggle(station);
					_this7.buildCatalog();
					item.toggleClass("favorite", Boolean(Favorites.find(station)));
				}
			});

			item.toggleClass("favorite", Boolean(Favorites.find(station)));
			if (!last) last = item;
			if (Lampa.Controller.own(this)) Lampa.Controller.collectionAppend(item);
			if (curPlayID == station.id) item.addClass("play");
			scroll.append(item);
			items.push(item);
		};
		this.cover = function (station) {
			html.find(".m-radio-cover__title").text(station.title || station.name || "");
			html.find(".m-radio-cover__tooltip").text(station.tooltip || "");
			var img_box = html.find(".m-radio-cover__img-box");
			var img_elm = img_box.find("img");
			img_box.removeClass("loaded loaded-icon");
			img_elm.onload = function () {
				img_box.addClass("loaded");
			};
			img_elm.onerror = function () {
				img_elm.src = "./img/icons/menu/movie.svg";
				img_box.addClass("loaded-icon");
			};
			img_elm.src = station.bg_image_mobile || station.image || station.picture;
		};
		this.start = function () {
			var _this2 = this;
			if (Lampa.Activity.active() && Lampa.Activity.active().activity !== this.activity) return;
			this.background();

			var cover = Lampa.Template.js("modss_radio_cover");
			var move = function move(d) {
				var pos = filtred.indexOf(played_st) + d;
				if (pos >= 0 && pos <= filtred.length) {
					//player.destroy();
					if (filtred[pos]) {
						_this6.cover(filtred[pos]);
						_this6.play(filtred[pos]);
					}
				}
				return pos;
			};
			var updateUI = function (pos, up, down) {
				scroll.render().find(".play").removeClass("play");
				if (items[pos]) {
					if ($("body").hasClass("ambience--enable")) {
						$("body")
							.find(".m-radio-cover__after_statntion")
							.text((filtred[pos + up] && (filtred[pos + up].title || filtred[pos + up].name)) || filtred[pos].title || filtred[pos].name);
						$("body")
							.find(".m-radio-cover__before_statntion")
							.text((filtred[pos + down] && (filtred[pos + down].title || filtred[pos + down].name)) || filtred[pos].title || filtred[pos].name);
					}
					last = items[pos].addClass("play");
					scroll.update(last);
				} else {
					scroll.update(last.addClass("play"));
					if ($("body").hasClass("ambience--enable")) return;
				}
			};
			_this2.move = move;
			_this2.updateUI = updateUI;

			Lampa.Controller.add("content", {
				link: this,
				invisible: true,
				toggle: function toggle() {
					var lastPlay = html.find(".play");
					if (lastPlay) {
						var active = Object.keys(items).find(function (key) {
							return items[key].classList.contains("play");
						});

						var lastPlay2 = scroll.render().find(".play");
						last = lastPlay2;
						played_st = filtred[active];
						setTimeout(function () {
							player.createWave();
							player.changeWave("play");
							if (last && $(last).length && scroll) scroll.update(last, true);
						}, 100);
					}

					Lampa.Controller.collectionSet(html, cover);
					Lampa.Controller.collectionFocus(last, html, cover);
				},
				left: function left() {
					if ($("body").hasClass("ambience--enable") && !$("body").find(".m-radio-cover__img-container").hasClass("focus")) return;
					var cover = $("body").find(".m-radio-cover__img-container");
					if (cover.hasClass("focus")) Navigator.focus(last);
					else if (Navigator.canmove("left")) Navigator.move("left");
					else Lampa.Controller.toggle("menu");
				},
				right: function right() {
					if ($("body").hasClass("ambience--enable") && !$("body").find(".m-radio-cover__img-container").hasClass("focus")) return;
					var cover = $("body").find(".m-radio-cover__img-container");
					if (cover.hasClass("focus")) Navigator.focus(items[0]);
					else if (Navigator.canmove("right")) Navigator.move("right");
					else Navigator.focus(cover[0]);
				},
				up: function up() {
					if ($("body").hasClass("ambience--enable") && !$("body").find(".m-radio-cover__img-container").hasClass("focus")) return;
					if (Navigator.canmove("up")) Navigator.move("up");
					else if ($("body").find(".m-radio-cover__img-container").hasClass("focus")) {
						var pos = move(-1);
						updateUI(pos, -1, +1);
					} else Lampa.Controller.toggle("head");
				},
				down: function down() {
					if ($("body").hasClass("ambience--enable") && !$("body").find(".m-radio-cover__img-container").hasClass("focus")) return;
					if (Navigator.canmove("down")) Navigator.move("down");
					else {
						if ($("body").find(".m-radio-cover__img-container").hasClass("focus")) {
							var pos = move(1);
							updateUI(pos, +1, -1);
						}
					}
				},
				back: function back() {
					if ($("body").hasClass("ambience--enable")) {
						document.body.removeClass("ambience--enable");
						player.infoClose();
						scroll.update(last, true);
						//if (_component) _component.activity.toggle();
						//Lampa.Controller.toggle('content');
					} else Lampa.Activity.backward();
				},
			});
			Lampa.Controller.toggle("content");
		};
		this.pause = function () {};
		this.stop = function () {};
		this.render = function () {
			return html;
		};
		this.destroy = function () {
			//player.destroy();
			if (scroll) scroll.destroy();
			scroll = null;
			Lampa.Arrays.destroy(items);
			html.remove();
			html = null;
			items = null;
			filtred = null;
		};
	}

	function startPlugin() {
		window.plugin_modss = true;
		Lampa.Component.add("forktv", forktv);
		Lampa.Component.add("Radio_n", Radio_n);
		Lampa.Component.add("modss_tv", modss_tv);
		Lampa.Component.add("modss_online", component);
		Lampa.Component.add("collection", collection);

		Lampa.Template.add("onlines_v1", "<div class='online onlines_v1 selector'><div class='online__body'><div style='position: absolute;left: 0;top: -0.3em;width: 2.4em;height: 2.4em'><svg style='height: 2.4em; width:  2.4em;' viewBox='0 0 128 128' fill='none' xmlns='http://www.w3.org/2000/svg'>   <circle cx='64' cy='64' r='56' stroke='white' stroke-width='16'/>   <path d='M90.5 64.3827L50 87.7654L50 41L90.5 64.3827Z' fill='white'/></svg>  </div><div class='online__title' style='padding-left: 2.1em;'>{title}</div><div class='online__quality' style='padding-left: 3.4em;'>{quality}{info}</div> </div></div>");
		Lampa.Template.add(
			"modss_online_css",
			"<style>.online_modss--full.focus .online_modss__body {background: #b58d362e;}.online_modss--full.focus {-webkit-transform:scale(1.02);-ms-transform: scale(1.02);-o-transform: scale(1.02);transform: scale(1.02);-webkit-transition: -webkit-transform .3s linear 0s;transition: -webkit-transform .3s linear 0s;-o-transition: -o-transform .3s linear 0s;transition: transform .3s linear 0s;transition: transform .3s linear 0s, -webkit-transform .3s linear 0s, -o-transform .3s linear 0s;}@charset 'UTF-8';.full-start-new__buttons .full-start__button.view--modss_online span{display:block;} .online_modss__episode-number-season{font-size:1em;font-weight:700;color:#fff;position:absolute;top:.5em;right:.5em;background-color: rgba(0, 0, 0, 0.4);padding:0.2em;-webkit-border-radius: 0.3em;moz-border-radius: 0.3em;border-radius: 0.3em;} .online_modss__type-video{font-size:1em;font-weight:700;color:#fff;position:absolute;bottom:.5em;right:.5em;background-color: rgba(0, 0, 0, 0.4);padding:0.2em;-webkit-border-radius: 0.3em;moz-border-radius: 0.3em;border-radius: 0.3em;} .online_modss{position:relative;-webkit-border-radius:.3em;-moz-border-radius:.3em;border-radius:.3em;background-color:rgba(0,0,0,0.3);display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex}.online_modss__body{padding:1.2em;line-height:1.3;-webkit-box-flex:1;-webkit-flex-grow:1;-moz-box-flex:1;-ms-flex-positive:1;flex-grow:1;position:relative}@media screen and (max-width:480px){.online_modss__body{padding:.8em 1.2em}}.online_modss__img{position:relative;width:13em;-webkit-flex-shrink:0;-ms-flex-negative:0;flex-shrink:0;min-height:8.2em}.online_modss__img>img{position:absolute;top:0;left:0;width:100%;height:100%;-o-object-fit:cover;object-fit:cover;-webkit-border-radius:.3em;-moz-border-radius:.3em;border-radius:.3em;opacity:0;-webkit-transition:opacity .3s;-o-transition:opacity .3s;-moz-transition:opacity .3s;transition:opacity .3s}.online_modss__img--loaded>img{opacity:1}@media screen and (max-width:480px){.online_modss__img{width:7em;min-height:6em}}.online_modss__folder{padding:1em;-webkit-flex-shrink:0;-ms-flex-negative:0;flex-shrink:0}.online_modss__folder>svg{width:4.4em!important;height:4.4em!important}.online_modss__viewed{position:absolute;top:1em;left:1em;background:rgba(0,0,0,0.45);-webkit-border-radius:100%;-moz-border-radius:100%;border-radius:100%;padding:.25em;font-size:.76em}.online_modss__subtitle{position:absolute;top: auto !important;bottom:1em;left:1em;background:rgba(0,0,0,0.45);-webkit-border-radius:100%;-moz-border-radius:100%;border-radius:100%;padding:.25em;font-size:.76em}.online_modss__viewed>svg, .online_modss__subtitle>svg{width:1.5em!important;height:1.5em!important;}.online_modss__episode-number{position:absolute;top:0;left:0;right:0;bottom:0;display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-align:center;-webkit-align-items:center;-moz-box-align:center;-ms-flex-align:center;align-items:center;-webkit-box-pack:center;-webkit-justify-content:center;-moz-box-pack:center;-ms-flex-pack:center;justify-content:center;font-size:2em}.online_modss__loader{position:absolute;top:50%;left:50%;width:2em;height:2em;margin-left:-1em;margin-top:-1em;background:url(./img/loader.svg) no-repeat center center;-webkit-background-size:contain;-moz-background-size:contain;-o-background-size:contain;background-size:contain}.online_modss__head,.online_modss__footer{display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-pack:justify;-webkit-justify-content:space-between;-moz-box-pack:justify;-ms-flex-pack:justify;justify-content:space-between;-webkit-box-align:center;-webkit-align-items:center;-moz-box-align:center;-ms-flex-align:center;align-items:center}.online_modss__timeline{margin:.8em 0}.online_modss__timeline>.time-line{display:block !important}.online_modss__title{font-size:1.7em;overflow:hidden;-o-text-overflow:ellipsis;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:1;line-clamp:1;-webkit-box-orient:vertical}@media screen and (max-width:480px){.online_modss__title{font-size:1.4em}}.online_modss__time{padding-left:2em}.online_modss__info{display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-align:center;-webkit-align-items:center;-moz-box-align:center;-ms-flex-align:center;align-items:center}.online_modss__info>*{overflow:hidden;-o-text-overflow:ellipsis;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:1;line-clamp:1;-webkit-box-orient:vertical}.online_modss__quality{padding-left:1em;white-space:nowrap}.online_modss__scan-file{position:absolute;bottom:0;left:0;right:0}.online_modss__scan-file .broadcast__scan{margin:0}.online_modss .online_modss-split{font-size:.8em;margin:0 1em;flex-shrink: 0;}.online_modss.focus::after{content:'';position:absolute;top:-0.6em;left:-0.6em;right:-0.6em;bottom:-0.6em;-webkit-border-radius:.7em;-moz-border-radius:.7em;border-radius:.7em;border:solid .3em #fff;z-index:-1;pointer-events:none}.online_modss+.online_modss{margin-top:1.5em}.online_modss--folder .online_modss__footer{margin-top:.8em}.online_modss-rate{display:-webkit-inline-box;display:-webkit-inline-flex;display:-moz-inline-box;display:-ms-inline-flexbox;display:inline-flex;-webkit-box-align:center;-webkit-align-items:center;-moz-box-align:center;-ms-flex-align:center;align-items:center}.online_modss-rate>svg{width:1.3em!important;height:1.3em!important;}.online_modss-rate>span{font-weight:600;font-size:1.1em;padding-left:.7em}.online-empty{line-height:1.4}.online-empty__title{font-size:1.8em;margin-bottom:.3em}.online-empty__time{font-size:1.2em;font-weight:300;margin-bottom:1.6em}.online-empty__buttons{display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex}.online-empty__buttons>*+*{margin-left:1em}.online-empty__button{background:rgba(0,0,0,0.3);font-size:1.2em;padding:.5em 1.2em;-webkit-border-radius:.2em;-moz-border-radius:.2em;border-radius:.2em;margin-bottom:2.4em}.online-empty__button.focus{background:#fff;color:black}.online-empty__templates .online-empty-template:nth-child(2){opacity:.5}.online-empty__templates .online-empty-template:nth-child(3){opacity:.2}.online-empty-template{background-color:rgba(255,255,255,0.3);padding:1em;display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-align:center;-webkit-align-items:center;-moz-box-align:center;-ms-flex-align:center;align-items:center;-webkit-border-radius:.3em;-moz-border-radius:.3em;border-radius:.3em}.online-empty-template>*{background:rgba(0,0,0,0.3);-webkit-border-radius:.3em;-moz-border-radius:.3em;border-radius:.3em}.online-empty-template__ico{width:4em;height:4em;margin-right:2.4em}.online-empty-template__body{height:1.7em;width:70%}.online-empty-template+.online-empty-template{margin-top:1em} .online-modss-watched{padding:1em}.online-modss-watched__icon>svg{width:1.5em!important;height:1.5em!important;}.online-modss-watched__body{padding-left:1em;padding-top:.1em;display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-flex-wrap:wrap;-ms-flex-wrap:wrap;flex-wrap:wrap}.online-modss-watched__body>span+span::before{content:' ● ';vertical-align:top;display:inline-block;margin:0 .5em}   </style>",
		);
		Lampa.Template.add("modss_online_full", '<div class="online_modss online-prestige online_modss--full selector"><div class="online_modss__img">    <img alt="">    <div class="online_modss__loader"></div></div><div class="online_modss__body">    <div class="online_modss__head">        <div class="online_modss__title">{title}</div>        <div class="online_modss__time">{serv} {time}</div>    </div><div class="online_modss__timeline"></div><div class="online_modss__footer">        <div class="online_modss__info">{info}</div>        <div class="online_modss__quality">{quality}</div>    </div></div>    </div>');
		Lampa.Template.add("modss_does_not_answer", '<div class="online-empty"><div class="online-empty__title">    {title}</div><div class="online-empty__time">    #{modss_balanser_timeout}</div><div class="online-empty__buttons">    <div class="online-empty__button selector cancel">#{cancel}</div>    <div class="online-empty__button selector change">#{modss_change_balanser}</div></div><div class="online-empty__templates">    <div class="online-empty-template">        <div class="online-empty-template__ico"></div>        <div class="online-empty-template__body"></div>    </div>    <div class="online-empty-template">        <div class="online-empty-template__ico"></div>        <div class="online-empty-template__body"></div>    </div>    <div class="online-empty-template">        <div class="online-empty-template__ico"></div>        <div class="online-empty-template__body"></div>    </div></div>    </div>');
		Lampa.Template.add("modss_online_rate", '<div class="online_modss-rate"><svg width="17" height="16" viewBox="0 0 17 16" fill="none" xmlns="http://www.w3.org/2000/svg">    <path d="M8.39409 0.192139L10.99 5.30994L16.7882 6.20387L12.5475 10.4277L13.5819 15.9311L8.39409 13.2425L3.20626 15.9311L4.24065 10.4277L0 6.20387L5.79819 5.30994L8.39409 0.192139Z" fill="#fff"></path></svg><span>{rate}</span>    </div>');
		Lampa.Template.add("modss_online_folder", '<div class="online_modss online_modss--folder selector"><div class="online_modss__folder">    <svg viewBox="0 0 128 112" fill="none" xmlns="http://www.w3.org/2000/svg">        <rect y="20" width="128" height="92" rx="13" fill="white"></rect>        <path d="M29.9963 8H98.0037C96.0446 3.3021 91.4079 0 86 0H42C36.5921 0 31.9555 3.3021 29.9963 8Z" fill="white" fill-opacity="0.23"></path>        <rect x="11" y="8" width="106" height="76" rx="13" fill="white" fill-opacity="0.51"></rect>    </svg></div><div class="online_modss__body">    <div class="online_modss__head">        <div class="online_modss__title">{title}</div>        <div class="online_modss__time">{time}</div>    </div><div class="online_modss__footer">        <div class="online_modss__info">{info}</div>    </div></div>    </div>');
		Lampa.Template.add("modss_online_watched", '<div class="online_modss online-prestige online-modss-watched"><div class="online-modss-watched__icon">    <svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">        <circle cx="10.5" cy="10.5" r="9" stroke="currentColor" stroke-width="3"/>        <path d="M14.8477 10.5628L8.20312 14.399L8.20313 6.72656L14.8477 10.5628Z" fill="currentColor"/>    </svg></div><div class="online-modss-watched__body">    </div></div>');
		Lampa.Template.add("modss_online_season", '<div class="online-modss-watched" style="font-size: 1.5em;font-weight: 300;opacity: 0.5;">{season}</div>');
		Lampa.Template.add("modss_content_loading", '<div class="online-empty">\n            <div class="broadcast__scan"><div></div></div>\n\t\t\t\n            <div class="online-empty__templates">\n                <div class="online-empty-template selector">\n                    <div class="online-empty-template__ico"></div>\n                    <div class="online-empty-template__body"></div>\n                </div>\n                <div class="online-empty-template">\n                    <div class="online-empty-template__ico"></div>\n                    <div class="online-empty-template__body"></div>\n                </div>\n                <div class="online-empty-template">\n                    <div class="online-empty-template__ico"></div>\n                    <div class="online-empty-template__body"></div>\n                </div>\n            </div>\n        </div>');
		Lampa.Template.add("epg_modss", '<div class="notice notice--card selector layer--render image--loaded"><div class="notice__left"><div class="notice__img"><img/></div></div> <div class="notice__body"> <div class="notice__head"><div class="notice__title">{title}</div><div class="notice__time">{time}</div></div><div class="notice__descr">{descr}</div></div></div>');
		Lampa.Template.add("icon_subs", '<svg width=\"23\" height=\"25\" viewBox=\"0 0 23 25\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n<path d=\"M22.4357 20.0861C20.1515 23.0732 16.5508 25 12.5 25C5.59644 25 0 19.4036 0 12.5C0 5.59644 5.59644 0 12.5 0C16.5508 0 20.1515 1.9268 22.4357 4.9139L18.8439 7.84254C17.2872 6.09824 15.0219 5 12.5 5C7.80558 5 5 7.80558 5 12.5C5 17.1944 7.80558 20 12.5 20C15.0219 20 17.2872 18.9018 18.8439 17.1575L22.4357 20.0861Z\" fill=\"currentColor\"/>\n</svg>');
		Lampa.Template.add("modss_voice_limit_modal", '<div style="text-align:center;"><div style="font-size:3em;margin-bottom:0.3em;">⚠️</div><div style="font-size:1.5em;margin-bottom:0.5em;font-weight:600;">#{modss_voice_limit_reached_title}</div><div style="font-size:1.2em;color:rgba(255,255,255,0.6);margin-bottom:1em;">#{modss_voice_limit_reached_message}</div><div style="font-size:2em;margin:0.5em 0;"><b>{current}</b> #{season_from} <b>{max}</b></div><div style="margin-top:1em;color:rgba(255,255,255,0.5);">#{modss_voice_limit_reached_hint}</div></div>');
		Lampa.Template.add("modss_subscriptions_empty", '<div class="modss-subscriptions-empty"><div class="modss-subscriptions-empty__icon">📭</div><div class="modss-subscriptions-empty__text">#{modss_voice_no_subscriptions}</div></div>');
		Lampa.Template.add(
			"modss_styles",
			"<style>.rating--modss .rate--cub img {margin-right: 1em!important;}.modss-subscriptions-empty{text-align:center;padding:3em;}.modss-subscriptions-empty__icon{font-size:5em;margin-bottom:0.5em;opacity:0.5;}.modss-subscriptions-empty__text{font-size:1.5em;color:rgba(255,255,255,0.5);}.modss-subscriptions-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:1.5em;}@media screen and (max-width:768px){.modss-subscriptions-grid{grid-template-columns:1fr;}}.card.focus, .card.hover {z-index: 2;-webkit-transform: scale(1.05);-ms-transform: scale(1.05);-o-transform: scale(1.05);transform: scale(1.05);-webkit-transition: -webkit-transform .3s linear 0s;transition: -webkit-transform .3s linear 0s;-o-transition: -o-transform .3s linear 0s;transition: transform .3s linear 0s;transition: transform .3s linear 0s, -webkit-transform .3s linear 0s, -o-transform .3s linear 0s;outline: none;}.mods_iptv__program .notice.focus .notice__descr{display:block}.mods_iptv__program .notice .notice__descr{display:block} .mods_iptv__program .notice:first-child .notice__descr{display:block} .ad-server{display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-align:start;-webkit-align-items:flex-start;-moz-box-align:start;-ms-flex-align:start;align-items:flex-start;position:relative;background-color:rgba(255,255,255,.1);-webkit-border-radius:.3em;-moz-border-radius:.3em;border-radius:.3em;margin:1.5em 2em}.ad-server__text{padding:1em;-webkit-box-flex:1;-webkit-flex-grow:1;-moz-box-flex:1;-ms-flex-positive:1;flex-grow:1;line-height:1.4}.ad-server__qr{width:8em;height:8em;-webkit-flex-shrink:0;-ms-flex-negative:0;flex-shrink:0}.ad-server__label{position:absolute;left:0;bottom:0;background-color:#ffe216;-webkit-border-radius:.3em;-moz-border-radius:.3em;border-radius:.3em;padding:.5em;color:#000} .program-body .notice__left{width:15em!important;} .program-body .notice__img{padding-bottom: 57% !important;} @media screen and (max-width:2560px){.epg--img{width:10em;}}@media screen and (max-width:420px){.program-body .notice--card{display:block} .program-body .notice__left{float:left;width:32em!important}.program-body .notice__body{float:left;} .program-body .notice__img{padding-bottom: 56% !important;}} .mods_iptv__program{padding:0 1em}.iptv-list{padding:1.5em;display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-align:center;-webkit-align-items:center;-moz-box-align:center;-ms-flex-align:center;align-items:center;-webkit-box-pack:center;-webkit-justify-content:center;-moz-box-pack:center;-ms-flex-pack:center;justify-content:center;-webkit-box-orient:vertical;-webkit-box-direction:normal;-webkit-flex-direction:column;-moz-box-orient:vertical;-moz-box-direction:normal;-ms-flex-direction:column;flex-direction:column;padding-bottom:1em}.iptv-list__ico{width:4.5em;margin-bottom:2em;height:4.5em}.iptv-list__ico>svg{width:4.5em;height:4.5em}.iptv-list__title{font-size:1.9em;margin-bottom:1em}.iptv-list__items{width:80%;margin:0 auto}.iptv-list__items .scroll{height:22em}.iptv-list__item{display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;padding:1em;background-color:rgba(255,255,255,0.1);font-size:1.3em;line-height:1.3;-webkit-border-radius:.3em;-moz-border-radius:.3em;border-radius:.3em;margin:1em}.iptv-list__item-name{width:40%;padding-right:1em;overflow:hidden;-o-text-overflow:ellipsis;text-overflow:ellipsis;white-space:nowrap;text-align:left}.iptv-list__item-url{width:60%;padding-left:1em;overflow:hidden;-o-text-overflow:ellipsis;text-overflow:ellipsis;white-space:nowrap;text-align:right}.iptv-list__item.focus{background-color:#fff;color:black} .timeline {position:relative;margin: 0 1em !important;} @media screen and (max-width: 431px) {.card--last_view {right: 0.1em !important;top: 2em !important;} .timeline{bottom: 18em !important}} @media screen and (max-width: 376px) {.timeline{bottom: 13em !important}} @media screen and (max-width: 360px) {.timeline{bottom: 15em !important}}@media screen and (max-width: 344px) {.timeline{bottom: 17em !important}} .card--new_seria {right:2em!important;bottom:10em!important} } #modss--last_s{top:0.6em;right:-.5em;position: absolute;background: #168FDF;color: #fff;padding: 0.4em 0.4em;font-size: 1.2em;-webkit-border-radius: 0.3em;-moz-border-radius: 0.3em;border-radius: 0.3em;} @media screen and (max-width: 450px) { #modss--last_s {right:3em!impotrant}} .card--last_viewD{right:80%!important;top:2em!important}}</style>",
		);

		Lampa.Template.add("hdgo_item", '<div class="selector hdgo-item"><div class="hdgo-item__imgbox"><img class="hdgo-item__img"/><div class="card__icons"><div class="card__icons-inner"></div></div></div><div class="hdgo-item__name">{title}</div></div>');
		Lampa.Template.add(
			"hdgo_style",
			'<style>.last--focus .hdgo-item__imgbox::after {content: "";position: absolute;top: -0.4em;left: -0.4em;right: -0.4em;bottom: -0.4em;border: .3em solid red;-webkit-border-radius: .8em;-moz-border-radius: .8em;border-radius: .8em;opacity: .4}.modss-channel__name {padding:20px;text-align: center;font-size: 1.2em}.forktv.focus .hdgo-item__imgbox::after, .modss__tv.focus .hdgo-item__imgbox::after {opacity: 1}.nuamtv {filter: blur(7px);}.nuamtv:hover, .nuamtv:action {filter: blur(0px);}.a-r.b{color:#fff;background: linear-gradient(to right, rgba(204,0,0,1) 0%,rgba(150,0,0,1) 100%);}.a-r.de{color:#fff;background: linear-gradient(to right, #ffbc54 0%,#ff5b55 100%);}.a-r.g{background: linear-gradient(to right, rgba(205,235,142,1) 0%,rgba(165,201,86,1) 100%);color: #12420D;}.card.home.focus .card__img {border-color: green!important;-webkit-box-shadow: 0 0 0 0.4em green!important;-moz-box-shadow: 0 0 0 0.4em green!important;box-shadow: 0 0 0 0.4em green!important;}@media screen and (max-width: 2560px) {.pc.hdgo.card--collection,.pc.card--collection{width:11em!important} .tv_tv{width:12.5%!important}.tv_tv_c{width:20%!important}.tv_pc{width:16.66%!important}.tv.hdgo.card--collection{width:10.3em!important} .tv.card--collection{width:14.2%!important}.tv.sort.card--collection{width:25%!important}.tv.sort.hdgo.card--collection{width:25%!important}  .sort.hdgo.card--collection .card__view {padding-bottom:25%!important} .tv.two.sort.card--collection .card__view {padding-bottom: 10%!important} .tv.two.sort.card--collection{height:20%!important;width:50%!important}.pc.card--category, .tv.card--category{width:14.28%}.nuam.card--collection{width:20%!important}}   @media screen and (max-width: 1380px) {.pc.card--collection,.forktv .mobile,.mobile_tv{width:16.6%!important} .tv_pc{width:14.28%!important} .tv_pc_c{width:14.28%!important} .tv_tv{width:14.28%!important} .pc.hdgo.card--collection,.hdgo.card--collection{width:10em!important}.sort.pc.card--collection{width:25%!important}.sort.hdgo.card--collection{width:25%!important} .sort.hdgo.card--collection .card__view {padding-bottom:40%!important} .two.sort.card--collection{width:50%!important} .pc.two.sort.card--collection .card__view {padding-bottom: 33%!important} .pc.card--category,.nuam.card--category{width:11.5em!important}}  @media screen and (max-width: 420px) {.pc.card--collection,.forktv .mobile{width:10.3em!important}.mobile_tv{width:33.3%!important}  .pc.hdgo.card--collection,.hdgo.card--collection{width:10em!important}.pc.card--category,.nuam.card--category{width:7.9em!important}.nuam.card--collection{width:33.3%!important}.sort.hdgo.card--collection .card__view {padding-bottom:60%!important}}  .searc.card--collection .card__view {padding-bottom: 5%!important}.searc.card--collection{width:100%!important}.searc.card--collection .card__img{height:100%!important;}.hdgo-item{margin:0 .3em;width:10.4em;-webkit-flex-shrink:0;-ms-flex-negative:0;flex-shrink:0}.hdgo-item__imgbox{background-color:#3e3e3e;padding-bottom:60%;position:relative;-webkit-border-radius:.3em;-moz-border-radius:.3em;border-radius:.3em}.hdgo-item__img{position:absolute;top:0;left:0;width:100%;height:100%}.hdgo-item__name{font-size:1.1em;margin-top:.8em}.hdgo-item.focus .hdgo-item__imgbox::after{content:"";display:block;position:absolute;left:-.4em;top:-.4em;right:-.4em;bottom:-.4em;-border: .2em solid red;opacity:.6;-webkit-border-radius: .8em;-moz-border-radius: .8em;border-radius: .8em}.hdgo-item +.hdgo-item{margin:0 .3em}.modss_tv .items-line + .items-line, .forktv .items-line + .items-line {margin-top:0!important;}</style>',
		);
		Lampa.Template.add(
			"mods_radio_style",
			"<style>.blink2{-webkit-animation:blink2 1.5s linear infinite;animation:blink2 1.5s linear infinite}@-webkit-keyframes blink2{100%{color:rgba(34,34,34,0)}}@keyframes blink2{100%{color:rgba(34,34,34,0)}}.controll,.controll *{box-sizing:content-box;letter-spacing:0;}.controll{position:relative;transition:.5s linear;border:.3em solid #fff;background-color:#fff;border-radius:50%;bottom:4.19em;float:right;right:0;padding:1.7em;width:.2em;height:.2em;white-space:nowrap;text-align:center;cursor:pointer}.controll.pause{background-color:#353434;border-color:#3b6531}.controll,.controll .but_left,.controll .but_right,.controll:before{display:inline-block}.controll.pause .but_left,.controll.pause .but_right{margin-left:-8px;margin-top:-8px;border-left:8px solid #fff;border-top:0 solid transparent;border-bottom:0 solid transparent;height:18px}.controll.pause .but_left{border-right:10px solid transparent}.controll.play .but_right{margin-left:-5px;margin-top:-9px;border-left:15px solid #525252;border-top:10px solid transparent;border-bottom:10px solid transparent}.controll:hover,.controll.focus{background-color:#fff}.controll.play.focus{border-color:#8a8a8a}.controll.focus .but_left,.controll.focus .but_right,.controll:hover .but_left,.controll:hover .but_right{border-left-color:#252525}.Radio_n .card__view {padding-bottom: 75%!important;}.stbut,.stbut *{box-sizing:content-box;letter-spacing:0}.title_plaing{position:absolute;text-align:center;width:15em;margin-top:-1.2em;font-size:1.1em}.stbut{transition:.5s linear;border:.15em solid #fbfbfb;background-color:#000;border-radius:4em;margin-top:1em;padding:0.3em 4em 0em 0.5em;font-size:2em;cursor:pointer;height:1.5em;max-width:4em}.stbut:hover, .stbut.focus{background-color:#edebef;color:#616060;border-color:#8e8e8e}</style>",
		);
		Lampa.Template.add("info_radio", '<div style="height:8em" class="radio_r info layer--width"><div class="info__left"><div style="margin-top:25px" class="info__title"></div><div class="info__create"></div></div><div style="display:block" class="info__right"> <b class="title_plaing"></b>   <div id="stantion_filtr"><div id="stbut" class="stbut selector"><b>СТАНЦИИ</b></div></div>    <div id="player_radio"><div id="plbut" class="controll selector play"><span class="but_left"></span><span class="but_right"></span></div></div></div></div>');
		Lampa.Template.add("mods_iptv_details", '<div class="mods_iptv-details"><div class="mods_epg-load" style="display:none;margin-bottom:-2em;position:relative"><div class="broadcast__text">' + Lampa.Lang.translate("search_searching") + '</div><div class="broadcast__scan"><div></div></div></div><div class="mods_iptv__program"></div></div>');
		Lampa.Template.add("mods_iptv_list", '<div class="iptv-list layer--height"><div class="iptv-list__ico"><svg height="36" viewBox="0 0 38 36" fill="none" xmlns="http://www.w3.org/2000/svg">        <rect x="2" y="8" width="34" height="21" rx="3" stroke="white" stroke-width="3"/>        <line x1="13.0925" y1=\"2.34874\" x2=\"16.3487\" y2=\"6.90754\" stroke=\"white\" stroke-width=\"3\" stroke-linecap=\"round\"/><line x1=\"1.5\" y1=\"-1.5\" x2=\"9.31665\" y2=\"-1.5\" transform=\"matrix(-0.757816 0.652468 0.652468 0.757816 26.197 2)\" stroke=\"white\" stroke-width=\"3\" stroke-linecap=\"round\"/>        <line x1=\"9.5\" y1=\"34.5\" x2=\"29.5\" y2=\"34.5\" stroke=\"white\" stroke-width=\"3\" stroke-linecap=\"round\"/></svg></div><div class=\"iptv-list__title\">#{iptv_select_playlist}</div><div class=\"iptv-list__items\"></div></div>');

		Lampa.Template.add(
			"modss_radio_content",
			'<div class="m-radio-content"><div class="m-radio-content__head"><div class="simple-button simple-button--invisible simple-button--filter selector button--stantion"><svg width="38" height="31" viewBox="0 0 38 31" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="17.613" width="3" height="16.3327" rx="1.5" transform="rotate(63.4707 17.613 0)" fill="currentColor"></rect><circle cx="13" cy="19" r="6" fill="currentColor"></circle><path fill-rule="evenodd" clip-rule="evenodd" d="M0 11C0 8.79086 1.79083 7 4 7H34C36.2091 7 38 8.79086 38 11V27C38 29.2091 36.2092 31 34 31H4C1.79083 31 0 29.2091 0 27V11ZM21 19C21 23.4183 17.4183 27 13 27C8.58173 27 5 23.4183 5 19C5 14.5817 8.58173 11 13 11C17.4183 11 21 14.5817 21 19ZM30.5 18C31.8807 18 33 16.8807 33 15.5C33 14.1193 31.8807 13 30.5 13C29.1193 13 28 14.1193 28 15.5C28 16.8807 29.1193 18 30.5 18Z" fill="currentColor"></path></svg><div class="hide"></div></div><div class="simple-button simple-button--invisible simple-button--filter selector button--catalog"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" xml:space="preserve"><path fill="currentColor" d="M478.354,146.286H33.646c-12.12,0-21.943,9.823-21.943,21.943v321.829c0,12.12,9.823,21.943,21.943,21.943h444.709c12.12,0,21.943-9.823,21.943-21.943V168.229C500.297,156.109,490.474,146.286,478.354,146.286z M456.411,468.114H55.589V190.171h400.823V468.114z"/><path fill="currentColor" d="M441.783,73.143H70.217c-12.12,0-21.943,9.823-21.943,21.943c0,12.12,9.823,21.943,21.943,21.943h371.566c12.12,0,21.943-9.823,21.943-21.943C463.726,82.966,453.903,73.143,441.783,73.143z"/><path fill="currentColor" d="M405.211,0H106.789c-12.12,0-21.943,9.823-21.943,21.943c0,12.12,9.823,21.943,21.943,21.943h298.423c12.12,0,21.943-9.823,21.943-21.943C427.154,9.823,417.331,0,405.211,0z"/></svg><div class="hide"></div></div><div class="simple-button simple-button--invisible simple-button--filter selector button--add"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" xml:space="preserve"><path d="M256 0C114.833 0 0 114.833 0 256s114.833 256 256 256 256-114.853 256-256S397.167 0 256 0zm0 472.341c-119.275 0-216.341-97.046-216.341-216.341S136.725 39.659 256 39.659 472.341 136.705 472.341 256 375.295 472.341 256 472.341z" fill="currentColor"></path><path d="M355.148 234.386H275.83v-79.318c0-10.946-8.864-19.83-19.83-19.83s-19.83 8.884-19.83 19.83v79.318h-79.318c-10.966 0-19.83 8.884-19.83 19.83s8.864 19.83 19.83 19.83h79.318v79.318c0 10.946 8.864 19.83 19.83 19.83s19.83-8.884 19.83-19.83v-79.318h79.318c10.966 0 19.83-8.884 19.83-19.83s-8.864-19.83-19.83-19.83z" fill="currentColor"></path></svg></div><div class="simple-button simple-button--invisible simple-button--filter selector button--search"><svg width="23" height="22" viewBox="0 0 23 22" fill="none" xmlns="http://www.w3.org/2000/svg" xml:space="preserve"><circle cx="9.9964" cy="9.63489" r="8.43556" stroke="currentColor" stroke-width="2.4"></circle><path d="M20.7768 20.4334L18.2135 17.8701" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"></path></svg><div class="hide"></div></div></div><div class="m-radio-content__body"><div class="m-radio-content__list"></div><div class="m-radio-content__cover"></div></div></div>',
		);
		Lampa.Template.add(
			"modss_radio_cover",
			'<div class="m-radio-cover"><div class="m-radio-cover__station"></div><div class="m-radio-cover__genre"></div><div class="m-radio-cover__img-container selector"><span class="m-radio-cover__before_statntion"></span><div class="m-radio-cover__img-box"><span class="arrow-up"></span><span class="arrow-down"></span><div class="m-radio-player__wave"></div><img src="https://www.radiorecord.ru/upload/iblock/507/close-up-image-fresh-spring-green-grass1.jpg"/></div><span class="m-radio-cover__after_statntion"></span></div><div class="m-radio-cover__album"><svg width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"m0 0h24v24h-24z\" fill=\"none\"/><path d=\"m12 2c5.52 0 10 4.48 10 10s-4.48 10-10 10-10-4.48-10-10 4.48-10 10-10zm0 14c2.213 0 4-1.787 4-4s-1.787-4-4-4-4 1.787-4 4 1.787 4 4 4zm0-5c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1z\" fill=\"#eee\"/></svg><span class="m-radio-cover__album_title"></span></div><div class="m-radio-cover__title"></div><div class="m-radio-cover__tooltip"></div><div class="m-radio-cover__playlist"></div></div>',
		);
		Lampa.Template.add(
			"modss_radio_list_item",
			'<div class="m-radio-item selector layer--visible"><div class="m-radio-item__num"></div><div class="m-radio-item__cover"><div class="m-radio-item__cover-box"><div class="m-radio-item__listeners"><svg fill="none" width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><g fill="#292d32"><path d="m13.1807 11.8606c-.4 0-.76-.22-.93-.58l-1.45-2.89002-.42.78c-.23.43-.69.7-1.18.7h-.73c-.41 0-.75-.34-.75-.75s.34-.75.75-.75h.64l.79-1.46c.19-.34.57-.57.93-.55.39 0 .74.23.92.57l1.43 2.86.34-.69c.23-.46.68-.74 1.2-.74h.81c.41 0 .75.34.75.75s-.34.75-.75.75h-.71l-.71 1.41002c-.18.37-.53.59-.93.59z"></path><path d="m2.74982 18.6508c-.41 0-.75-.34-.75-.75v-5.7c-.05-2.71002.96-5.27002 2.84-7.19002 1.88-1.91 4.4-2.96 7.10998-2.96 5.54 0 10.05 4.51 10.05 10.05002v5.7c0 .41-.34.75-.75.75s-.75-.34-.75-.75v-5.7c0-4.71002-3.83-8.55002-8.55-8.55002-2.30998 0-4.44998.89-6.03998 2.51-1.6 1.63-2.45 3.8-2.41 6.12002v5.71c0 .42-.33.76-.75.76z"></path><path d="m5.94 12.4492h-.13c-2.1 0-3.81 1.71-3.81 3.81v1.88c0 2.1 1.71 3.81 3.81 3.81h.13c2.1 0 3.81-1.71 3.81-3.81v-1.88c0-2.1-1.71-3.81-3.81-3.81z"></path><path d="m18.19 12.4492h-.13c-2.1 0-3.81 1.71-3.81 3.81v1.88c0 2.1 1.71 3.81 3.81 3.81h.13c2.1 0 3.81-1.71 3.81-3.81v-1.88c0-2.1-1.71-3.81-3.81-3.81z"></path></g></svg><span class="m-radio-item__listeners-count"></span></div><img/></div></div><div class="m-radio-item__body"><div class="m-radio-item__title"></div><div class="m-radio-item__tooltip"></div></div><div class="m-radio-item__icons"><div class="m-radio-item__icon-favorite"><svg version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 477.534 477.534" xml:space="preserve"><path fill="currentColor" d="M438.482,58.61c-24.7-26.549-59.311-41.655-95.573-41.711c-36.291,0.042-70.938,15.14-95.676,41.694l-8.431,8.909l-8.431-8.909C181.284,5.762,98.662,2.728,45.832,51.815c-2.341,2.176-4.602,4.436-6.778,6.778c-52.072,56.166-52.072,142.968,0,199.134l187.358,197.581c6.482,6.843,17.284,7.136,24.127,0.654c0.224-0.212,0.442-0.43,0.654-0.654l187.29-197.581C490.551,201.567,490.551,114.77,438.482,58.61z M413.787,234.226h-0.017L238.802,418.768L63.818,234.226c-39.78-42.916-39.78-109.233,0-152.149c36.125-39.154,97.152-41.609,136.306-5.484c1.901,1.754,3.73,3.583,5.484,5.484l20.804,21.948c6.856,6.812,17.925,6.812,24.781,0l20.804-21.931c36.125-39.154,97.152-41.609,136.306-5.484c1.901,1.754,3.73,3.583,5.484,5.484C453.913,125.078,454.207,191.516,413.787,234.226z"/></svg></div><div class="m-radio-item__icon-play"><svg width="22" height="25" viewBox="0 0 22 25" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 10.7679C22.3333 11.5377 22.3333 13.4622 21 14.232L3.75 24.1913C2.41666 24.9611 0.75 23.9989 0.75 22.4593L0.750001 2.5407C0.750001 1.0011 2.41667 0.0388526 3.75 0.808653L21 10.7679Z" fill="currentColor"/></svg></div></div></div>',
		);
		Lampa.Template.add("modss_radio_player", '<div class="m-radio-player"><canvas class="player-canvas" id="player-canvas"></canvas><div><div class="m-radio-player__cover"></div></div><div class="m-radio-player__close"><svg viewBox="0 0 329.269 329"xml:space=preserve xmlns=http://www.w3.org/2000/svg><path d="M194.8 164.77 323.013 36.555c8.343-8.34 8.343-21.825 0-30.164-8.34-8.34-21.825-8.34-30.164 0L164.633 134.605 36.422 6.391c-8.344-8.34-21.824-8.34-30.164 0-8.344 8.34-8.344 21.824 0 30.164l128.21 128.215L6.259 292.984c-8.344 8.34-8.344 21.825 0 30.164a21.266 21.266 0 0 0 15.082 6.25c5.46 0 10.922-2.09 15.082-6.25l128.21-128.214 128.216 128.214a21.273 21.273 0 0 0 15.082 6.25c5.46 0 10.922-2.09 15.082-6.25 8.343-8.34 8.343-21.824 0-30.164zm0 0"fill=currentColor></path></svg></div></div>');
		Lampa.Template.add("modss_radio_play_player", '<div class="selector m_fm-player loading stop hide"><div class="m_fm-player__name">ModssFM</div><div id="fmplay_player_button" class="m_fm-player__button"><i></i><i></i><i></i><i></i></div></div>');
		Lampa.Template.add(
			"radio_style_modss",
			'<style>.m-radio-player>.player-canvas{display:block;position:absolute;left:0;top:0;width:100%;height:100%}@media only screen and (min-width:800px){.m-radio-player>.player-canvas{left:-8em}}@media only screen and (min-width:1300px){.m-radio-player>.player-canvas{left:-7em}}.m-radio-item__listeners{position:absolute;top:.5em;left:.5em;z-index:1;background-color:#eee;padding:.1em .3em;font-size:.7em;font-weight:700;color:#292d32;-webkit-border-radius:.25em;-moz-border-radius:.25em;border-radius:.25em}.m-radio-item__listeners>svg{width:1em;height:1em;vertical-align:bottom}.m-radio-cover__after_statntion,.m-radio-cover__before_statntion{display:none;position:relative;bottom:1.6em;font-size:1.2em;background-color:rgb(0,0,0,1);-webkit-border-radius:.3em;-moz-border-radius:.3em;border-radius:.3em;padding:.2em .5em;z-index:2;}.m-radio-cover__before_statntion{position:relative;top:1.7em;bottom:0;}.ambience--enable .m-radio-cover__img-container.focus .m-radio-cover__after_statntion,.ambience--enable .m-radio-cover__img-container.focus .m-radio-cover__before_statntion{display:inline}.m-radio-cover__img-container.focus .m-radio-cover__img-box{position:relative}.m-radio-cover__img-container.focus .m-radio-cover__img-box .arrow-down,.m-radio-cover__img-container.focus .m-radio-cover__img-box .arrow-up{position:absolute;z-index:3;width:2em;height:2em;left:46%}.m-radio-cover__img-container.focus .m-radio-cover__img-box .arrow-up{top:2em;border-left:.3em solid #fff;border-top:.3em solid #fff;-webkit-animation:bounceUp 1s infinite;animation:bounceUp 1s infinite}.m-radio-cover__img-container.focus .m-radio-cover__img-box .arrow-down{bottom:2em;border-right:.3em solid #fff;border-bottom:.3em solid #fff;-webkit-animation:bounceDown 1s infinite;animation:bounceDown 1s infinite}.m-radio-cover__img-container.focus .arrow{display:block}@-webkit-keyframes bounceUp{0%{-webkit-transform:translateY(0) rotate(45deg);transform:translateY(0) rotate(45deg)}50%{-webkit-transform:translateY(10px) rotate(45deg);transform:translateY(10px) rotate(45deg)}100%{-webkit-transform:translateY(0) rotate(45deg);transform:translateY(0) rotate(45deg)}}@keyframes bounceUp{0%{-webkit-transform:translateY(0) rotate(45deg);transform:translateY(0) rotate(45deg)}50%{-webkit-transform:translateY(10px) rotate(45deg);transform:translateY(10px) rotate(45deg)}100%{-webkit-transform:translateY(0) rotate(45deg);transform:translateY(0) rotate(45deg)}}@-webkit-keyframes bounceDown{0%{-webkit-transform:translateY(0) rotate(45deg);transform:translateY(0) rotate(45deg)}50%{-webkit-transform:translateY(-10px) rotate(45deg);transform:translateY(-10px) rotate(45deg)}100%{-webkit-transform:translateY(0) rotate(45deg);transform:translateY(0) rotate(45deg)}}@keyframes bounceDown{0%{-webkit-transform:translateY(0) rotate(45deg);transform:translateY(0) rotate(45deg)}50%{-webkit-transform:translateY(-10px) rotate(45deg);transform:translateY(-10px) rotate(45deg)}100%{-webkit-transform:translateY(0) rotate(45deg);transform:translateY(0) rotate(45deg)}}.m_fm-player{display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-align:center;-webkit-align-items:center;-moz-box-align:center;-ms-flex-align:center;align-items:center;-webkit-border-radius:.3em;-moz-border-radius:.3em;border-radius:.3em;padding:.2em .4em;margin-left:.5em;margin-right:.5em}.m_fm-player__name{margin-right:.35em;white-space:nowrap;overflow:hidden;-o-text-overflow:ellipsis;text-overflow:ellipsis;max-width:8em;display:none}.m_fm-player__button{position:relative;width:2em;height:2em;display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-align:center;-webkit-align-items:center;-moz-box-align:center;-ms-flex-align:center;align-items:center;-webkit-box-pack:center;-webkit-justify-content:center;-moz-box-pack:center;-ms-flex-pack:center;justify-content:center;-webkit-flex-shrink:0;-ms-flex-negative:0;flex-shrink:0;-webkit-border-radius:.3em;-moz-border-radius:.3em;border-radius:.3em;border:.15em solid rgba(255,255,255,1)}.m_fm-player__button>*{opacity:.75}.m_fm-player__button i{display:block;width:.2em;background-color:#fff;margin:0 .1em;-webkit-animation:sound 0s -.8s linear infinite alternate;-moz-animation:sound 0s -.8s linear infinite alternate;-o-animation:sound 0s -.8s linear infinite alternate;animation:sound 0s -.8s linear infinite alternate;-webkit-flex-shrink:0;-ms-flex-negative:0;flex-shrink:0}.m_fm-player__button i:nth-child(1){-webkit-animation-duration:474ms;-moz-animation-duration:474ms;-o-animation-duration:474ms;animation-duration:474ms}.m_fm-player__button i:nth-child(2){-webkit-animation-duration:433ms;-moz-animation-duration:433ms;-o-animation-duration:433ms;animation-duration:433ms}.m_fm-player__button i:nth-child(3){-webkit-animation-duration:407ms;-moz-animation-duration:407ms;-o-animation-duration:407ms;animation-duration:407ms}.m_fm-player__button i:nth-child(4){-webkit-animation-duration:458ms;-moz-animation-duration:458ms;-o-animation-duration:458ms;animation-duration:458ms}.m_fm-player.stop .m_fm-player__button i{display:none}.m_fm-player.stop .m_fm-player__button:after{content:\"\";width:.5em;height:.5em;background-color:rgba(255,255,255,1)}.m_fm-player.loading .m_fm-player__button:before{content:\"\";display:block;border-top:.2em solid rgba(255,255,255,.9);border-left:.2em solid transparent;border-right:.2em solid transparent;border-bottom:.2em solid transparent;-webkit-animation:sound-loading 1s linear infinite;-moz-animation:sound-loading 1s linear infinite;-o-animation:sound-loading 1s linear infinite;animation:sound-loading 1s linear infinite;width:.9em;height:.9em;-webkit-border-radius:100%;-moz-border-radius:100%;border-radius:100%;-webkit-flex-shrink:0;-ms-flex-negative:0;flex-shrink:0}.m_fm-player.loading .m_fm-player__button i{display:none}.m_fm-player.focus{background-color:#fff;color:#000}.m_fm-player.focus .m_fm-player__name{display:inline}@media screen and (max-width:580px){.m_fm-player.focus .m_fm-player__name{display:none}}@media screen and (max-width:385px){.m_fm-player.focus .m_fm-player__name{display:none}}.m_fm-player.focus .m_fm-player__button{border-color:#000}.m_fm-player.focus .m_fm-player__button i,.m_fm-player.focus .m_fm-player__button:after,.m_fm-player.focus.stop .m_fm-player__button:before{background-color:#000}.m_fm-player.focus .m_fm-player__button:before{border-top-color:#000}.m-radio-content{padding:0 1.5em}.m-radio-content__head{display:-webkit-box;display:-webkit-flex;display:-ms-flexbox;display:flex;padding:1.5em 0}.m-radio-content__body{display:-webkit-box;display:-webkit-flex;display:-ms-flexbox;display:flex}.m-radio-content__list{width:60%}@media screen and (max-width:576px){.m-radio-content__list{width:100%}}.m-radio-content__cover{width:40%;padding:0 2em}@media screen and (max-width:576px){.m-radio-content__cover{display:none}}.m-radio-cover{text-align:center;line-height:1.4}.m-radio-cover__img-container{max-width:20em;margin:0 auto}.m-radio-cover__img-container.focus .m-radio-cover__img-box::after{content:"";position:absolute;top:-.5em;left:-.5em;right:-.5em;bottom:-.5em;border:.3em solid #fff;-webkit-border-radius:1.4em;border-radius:1.4em;z-index:-1;pointer-events:none}.m-radio-cover__img-box{position:relative;padding-bottom:100%;background-color:rgba(0,0,0,.3);-webkit-border-radius:1em;border-radius:1em}.m-radio-cover__img-box>img{position:absolute;top:0;left:0;width:100%;height:100%;-webkit-border-radius:1em;border-radius:1em;opacity:0}.m-radio-cover__img-box.loaded1{background-color:transparent}.m-radio-cover__img-box.loaded>img{opacity:1}.m-radio-cover__img-box.loaded-icon{background-color:rgba(0,0,0,.3)}.m-radio-cover__img-box.loaded-icon>img{left:20%;top:20%;width:60%;height:60%;opacity:.2}.m-radio-cover__title{font-weight:700;font-size:1.5em;margin-top:1em}.m-radio-cover__tooltip{font-weight:300;font-size:1.3em;margin-top:.2em}.m-radio-cover__station{font-weight:500;font-size:3.3em;margin-bottom:.2em}.m-radio-cover__genre{font-weight:200;font-size:1em;margin-bottom:.6em}.m-radio-cover__album{font-weight:300;font-size:1em;margin-top:.4em}.m-radio-cover__album>svg{width:0;height:1.25em;margin-right:.2em;vertical-align:text-bottom}.m-radio-item{padding:1em;display:-webkit-box;display:-webkit-flex;display:-ms-flexbox;display:flex;-webkit-box-align:center;-webkit-align-items:center;-ms-flex-align:center;align-items:center}.m-radio-item.play,.m-radio-item.stop{-webkit-border-radius:1em;border-radius:1em;background-color:rgba(0,0,0,.3);border:.15em solid rgba(255,255,255,1)}.m-radio-item.focused{-webkit-border-radius:1em;border-radius:1em;background-color:rgba(0,0,0,.3);border:.15em solid rgba(255,255,255,1)}.m-radio-item.play .m-radio-item__icon-play{display:block;-webkit-animation:sound-loading 1s linear infinite;-moz-animation:sound-loading 1s linear infinite;-o-animation:sound-loading 1s linear infinite;animation:sound-loading 2s linear infinite}.m-radio-item__num{font-weight:700;margin-right:1em;font-size:1.3em;opacity:.4;-webkit-flex-shrink:0;-ms-flex-negative:0;flex-shrink:0}@media screen and (max-width:400px){.m-radio-item__num{display:none}}.m-radio-item__body{max-width:60%}.m-radio-item__cover{width:5em;-webkit-flex-shrink:0;-ms-flex-negative:0;flex-shrink:0;margin-right:2em}.m-radio-item__cover-box{position:relative;padding-bottom:100%;background-color:rgba(0,0,0,.3);-webkit-border-radius:1em;border-radius:1em}.m-radio-item__cover-box>img{position:absolute;top:0;left:0;width:100%;height:100%;-webkit-border-radius:1em;border-radius:1em;opacity:0}.m-radio-item__cover-box.loaded{background-color:transparent}.m-radio-item__cover-box.loaded>img{opacity:1}.m-radio-item__cover-box.loaded-icon{background-color:rgba(0,0,0,.3)}.m-radio-item__cover-box.loaded-icon>img{left:20%;top:20%;width:60%;height:60%;opacity:.2}.m-radio-item__title{font-weight:700;font-size:1.2em}.m-radio-item__tooltip{opacity:.5;margin-top:.5em;font-size:1.1em}.m-radio-item__icons{margin-left:auto;padding-left:1em;-webkit-flex-shrink:0;-ms-flex-negative:0;flex-shrink:0;display:-webkit-box;display:-webkit-flex;display:-ms-flexbox;display:flex}.m-radio-item__icons svg{width:1.4em!important;height:1.4em!important}.m-radio-item__icons>*+*{margin-left:1.5em}.m-radio-item__icons .m-radio-item__icon-favorite{display:none}.m-radio-item__icons .m-radio-item__icon-play{display:none}.m-radio-item.focus{background:#fff;color:#000;-webkit-border-radius:1em;border-radius:1em}.m-radio-item.focus .m-radio-item__icon-play,.m-radio-item.stop .m-radio-item__icon-play{display:block}.m-radio-item.favorite .m-radio-item__icon-favorite{display:block}.m-radio-item.empty--item .m-radio-item__num,.m-radio-item.empty--item .m-radio-item__title,.m-radio-item.empty--item .m-radio-item__tooltip{background-color:rgba(255,255,255,.3);height:1.2em;-webkit-border-radius:.3em;border-radius:.3em}.m-radio-item.empty--item .m-radio-item__num{width:1.4em}.m-radio-item.empty--item .m-radio-item__title{width:7em}.m-radio-item.empty--item .m-radio-item__tooltip{width:16em}.m-radio-item.empty--item .m-radio-item__icons{display:none}.m-radio-item.empty--item .m-radio-item__cover-box{background-color:rgba(255,255,255,.3)}.m-radio-item.empty--item.focus{background-color:transparent;color:#fff}.m-radio-player{position:fixed;z-index:100;left:0;top:0;width:100%;height:100%;display:-webkit-box;display:-webkit-flex;display:-ms-flexbox;display:flex;-webkit-box-align:center;-webkit-align-items:center;-ms-flex-align:center;align-items:center;-webkit-box-pack:center;-webkit-justify-content:center;-ms-flex-pack:center;justify-content:center}.m-radio-player__cover{width:30em}.m-radio-player__wave{display:-webkit-box;display:-webkit-flex;display:-ms-flexbox;display:flex;-webkit-box-align:center;-webkit-align-items:center;-ms-flex-align:center;align-items:center;-webkit-box-pack:center;-webkit-justify-content:center;-ms-flex-pack:center;justify-content:center;margin-top:2em}.m-radio-cover__img-box .m-radio-player__wave{position:absolute;top:37%;left:20%;z-index:1}.m-radio-player__wave>div{width:2px;background-color:#fff;margin:0 .3em;height:1em;opacity:0}.m-radio-player__wave>div.loading{-webkit-animation:radioAnimationWaveLoading .4s ease infinite;-o-animation:radioAnimationWaveLoading .4s ease infinite;animation:radioAnimationWaveLoading .4s ease infinite}.m-radio-player__wave>div.play{-webkit-animation:radioAnimationWavePlay 50ms linear infinite alternate;-o-animation:radioAnimationWavePlay 50ms linear infinite alternate;animation:radioAnimationWavePlay 50ms linear infinite alternate}.m-radio-player__close{position:fixed;top:1.5em;right:50%;margin-right:-2em;-webkit-border-radius:100%;border-radius:100%;padding:1em;display:none;background-color:rgba(255,255,255,.1)}.m-radio-player__close>svg{width:1.5em;height:1.5em}body.true--mobile .m-radio-player__close{display:block}@-webkit-keyframes radioAnimationWaveLoading{0%{-webkit-transform:scale3d(1,.3,1);transform:scale3d(1,.3,1);opacity:1}10%{-webkit-transform:scale3d(1,1.5,1);transform:scale3d(1,1.5,1);opacity:1}20%{-webkit-transform:scale3d(1,.3,1);transform:scale3d(1,.3,1);opacity:1}100%{-webkit-transform:scale3d(1,.3,1);transform:scale3d(1,.3,1);opacity:1}}@-o-keyframes radioAnimationWaveLoading{0%{transform:scale3d(1,.3,1);opacity:1}10%{transform:scale3d(1,1.5,1);opacity:1}20%{transform:scale3d(1,.3,1);opacity:1}100%{transform:scale3d(1,.3,1);opacity:1}}@keyframes radioAnimationWaveLoading{0%{-webkit-transform:scale3d(1,.3,1);transform:scale3d(1,.3,1);opacity:1}10%{-webkit-transform:scale3d(1,1.5,1);transform:scale3d(1,1.5,1);opacity:1}20%{-webkit-transform:scale3d(1,.3,1);transform:scale3d(1,.3,1);opacity:1}100%{-webkit-transform:scale3d(1,.3,1);transform:scale3d(1,.3,1);opacity:1}}@-webkit-keyframes radioAnimationWavePlay{0%{-webkit-transform:scale3d(1,.3,1);transform:scale3d(1,.3,1);opacity:.3}100%{-webkit-transform:scale3d(1,2,1);transform:scale3d(1,2,1);opacity:1}}@-o-keyframes radioAnimationWavePlay{0%{transform:scale3d(1,.3,1);opacity:.3}100%{transform:scale3d(1,2,1);opacity:1}}@keyframes radioAnimationWavePlay{0%{-webkit-transform:scale3d(1,.3,1);transform:scale3d(1,.3,1);opacity:.3}100%{-webkit-transform:scale3d(1,2,1);transform:scale3d(1,2,1);opacity:1}}@-webkit-keyframes sound{0%{height:.1em}100%{height:1em}}@-moz-keyframes sound{0%{height:.1em}100%{height:1em}}@-o-keyframes sound{0%{height:.1em}100%{height:1em}}@keyframes sound{0%{height:.1em}100%{height:1em}}@-webkit-keyframes sound-loading{0%{-webkit-transform:rotate(0);transform:rotate(0)}100%{-webkit-transform:rotate(360deg);transform:rotate(360deg)}}@-moz-keyframes sound-loading{0%{-moz-transform:rotate(0);transform:rotate(0)}100%{-moz-transform:rotate(360deg);transform:rotate(360deg)}}@-o-keyframes sound-loading{0%{-o-transform:rotate(0);transform:rotate(0)}100%{-o-transform:rotate(360deg);transform:rotate(360deg)}}@keyframes sound-loading{0%{-webkit-transform:rotate(0);-moz-transform:rotate(0);-o-transform:rotate(0);transform:rotate(0)}100%{-webkit-transform:rotate(360deg);-moz-transform:rotate(360deg);-o-transform:rotate(360deg);transform:rotate(360deg)}}</style>',
		);

		/*
		var plugins = Lampa.Storage.get('plugins','[]');
		plugins.forEach(function(plug) {
			plug.url = (plug.url + '').replace('http://modss.online', 'http://lampa.stream/modss');
		});
		Lampa.Storage.set('plugins',plugins);
		*/

		manifest = {
			type: "video",
			version: version_modss,
			name: "MODS's 💎 v" + version_modss,
			description: "Онлайн (20 Balansers, 16 in VIP)",
			component: "modss_online",
			onContextMenu: function onContextMenu(object) {
				return {
					name: Lampa.Lang.translate("online_watch"),
					description: "",
				};
			},
			onContextLauch: function onContextLauch(object) {
				Lampa.Activity.push({
					url: "",
					title: "MODS's 💎 v" + version_modss,
					component: "modss_online",
					search: object.title,
					search_one: object.title,
					search_two: object.original_title,
					movie: object,
					page: 1,
				});
			},
		};
		Lampa.Manifest.plugins = manifest;
		if (!Lampa.Lang) {
			var lang_data = {};
			Lampa.Lang = {
				add: function (data) {
					lang_data = data;
				},
				translate: function (key) {
					return lang_data[key] ? lang_data[key].ru : key;
				},
			};
		}
		Lampa.Lang.add({
			online_click_here: {
				ru: "Нажмите здесь для выбора источника",
				uk: "Натисніть тут для вибору джерела",
				en: "Click here to select source",
			},
			iptv_select_playlist: {
				ru: "Выберите плейлист",
				uk: "Виберіть плейлист",
				en: "Choose a playlist",
			},
			iptv_add_fav: {
				ru: "Добавить в избранное",
				uk: "Додати в обране",
				en: "Add to favourites",
			},
			iptv_remove_fav: {
				ru: "Убрать из избранного",
				uk: "Прибрати з вибраного",
				en: "Remove from favorites",
			},
			iptv_later: {
				ru: "Потом",
				uk: "Потім",
				en: "Later",
			},
			iptv_now: {
				ru: "Сейчас на:",
				uk: "Зараз на:",
				en: "Now on:",
			},
			modssfm_use_aac_title: {
				ru: "Предпочтение AAC",
				en: "Use AAC streams",
				uk: "Перевага AAC",
				be: "Перавага AAC",
				zh: "AAC 偏好",
			},
			modssfm_use_aac_desc: {
				ru: "Использовать AAC-потоки при доступности",
				en: "Prefer AAC streams if available",
				uk: "Віддавати перевагу потокам AAC, якщо вони доступні",
				be: "Аддавайце перавагу патокам AAC, калі яны даступныя",
				zh: "优先选择 AAC 流（如果可用）",
			},
			modssfm_show_info_title: {
				ru: "Показывать информацию",
				en: "Show Info screen",
				uk: "Показати екран інформації",
				be: "Паказаць экран інфармацыі",
				zh: "显示信息屏幕",
			},
			modssfm_show_info_desc: {
				ru: "Открывать информацию о станции при выборе",
				en: "Show Playing Info screen on select",
				uk: "Показати екран інформації про відтворення на вибраному",
				be: "Паказаць экран Інфармацыя аб прайграванні пры выбары",
				zh: "选择时显示播放信息屏幕",
			},
			modssfm_show_analyzer_title: {
				ru: "Показать визуализатор",
				en: "Show visualizer",
				uk: "Показати візуалізатор",
				be: "Паказаць візуалізатар",
				zh: "显示可视化工具",
			},
			modssfm_show_analyzer_desc: {
				ru: "Анализатор аудиоспектра на заднем плане",
				en: "Audio spectrum analyzer on the background",
				uk: "Аналізатор аудіо спектру на тлі",
				be: "Аўдыё аналізатар спектру на фоне",
				zh: "背景上的音频频谱分析仪",
			},
			modssfm_fetch_covers_title: {
				ru: "Получать обложки",
				en: "Fetch Music Covers",
				uk: "Отримати обкладинки",
				be: "Атрымаць вокладкі",
				zh: "获取音乐封面",
			},
			modssfm_fetch_covers_desc: {
				ru: "Загружать обложки альбомов из Apple Music",
				en: "Search music covers on Apple Music",
				uk: "Пошук музичних обкладинок в Apple Music",
				be: "Пошук вокладак музыкі ў Apple Music",
				zh: "在 Apple Music 上搜索音乐封面",
			},
			radio_station: {
				ru: "Радиостанция",
				en: "Radio station",
				uk: "Радіостанція",
				be: "Радыёстанцыя",
				zh: "广播电台",
			},
			radio_add_station: {
				ru: "Введите адрес радиостанции",
				en: "Enter the address of the radio station",
				uk: "Введіть адресу радіостанції",
				be: "Увядзіце адрас радыёстанцыі",
				zh: "输入电台地址",
			},
			radio_load_error: {
				ru: "Ошибка в загрузке потока",
				en: "Error in stream loading",
				uk: "Помилка завантаження потоку",
				be: "Памылка ў загрузцы патоку",
				zh: "流加载错误",
			},
			pub_sort_views: {
				ru: "По просмотрам",
				uk: "По переглядах",
				en: "By views",
			},
			pub_sort_watchers: {
				ru: "По подпискам",
				uk: "За підписками",
				en: "Subscriptions",
			},
			pub_sort_updated: {
				ru: "По обновлению",
				uk: "За оновленням",
				en: "By update",
			},
			pub_sort_created: {
				ru: "По дате добавления",
				uk: "За датою додавання",
				en: "By date added",
			},
			pub_search_coll: {
				ru: "Поиск по подборкам",
				uk: "Пошук по добіркам",
				en: "Search by collections",
			},
			pub_title_all: {
				ru: "Все",
				uk: "Все",
				en: "All",
			},
			pub_title_popular: {
				ru: "Популярные",
				uk: "Популярнi",
				en: "Popular",
			},
			pub_title_new: {
				ru: "Новые",
				uk: "Новi",
				en: "New",
			},
			pub_title_hot: {
				ru: "Горячие",
				uk: "Гарячi",
				en: "Hot",
			},
			pub_title_fresh: {
				ru: "Свежие",
				uk: "Свiжi",
				en: "Fresh",
			},
			pub_title_rating: {
				ru: "Рейтинговые",
				uk: "Рейтинговi",
				en: "Rating",
			},
			pub_title_allingenre: {
				ru: "Всё в жанре",
				uk: "Все у жанрі",
				en: "All in the genre",
			},
			pub_title_popularfilm: {
				ru: "Популярные фильмы",
				uk: "Популярні фільми",
				en: "Popular movies",
			},
			pub_title_popularserial: {
				ru: "Популярные сериалы",
				uk: "Популярні сериали",
				en: "Popular series",
			},
			pub_title_newfilm: {
				ru: "Новые фильмы",
				uk: "Новi фiльми",
				en: "New movies",
			},
			pub_title_newserial: {
				ru: "Новые сериалы",
				uk: "Новi серiали",
				en: "New series",
			},
			pub_title_newconcert: {
				ru: "Новые концерты",
				uk: "Новi концерти",
				en: "New concerts",
			},
			pub_title_newdocfilm: {
				ru: "Новые док. фильмы",
				uk: "Новi док. фiльми",
				en: "New document movies",
			},
			pub_title_newdocserial: {
				ru: "Новые док. сериалы",
				uk: "Новi док. серiали",
				en: "New document series",
			},
			pub_title_newtvshow: {
				ru: "Новое ТВ шоу",
				uk: "Нове ТБ шоу",
				en: "New TV show",
			},
			pub_modal_title: {
				ru: '1. Авторизируйтесь на сайте: <a style="color:#fff" href="#">https://kino.pub/device</a><br>2. В поле "Активация устройства" введите код.',
				uk: '1. Авторизуйтесь на сайті: <a style="color:#fff" href="#">https://kino.pub/device</a><br>2.  Введіть код у полі "Активація пристрою".',
				en: '1. Log in to the site: <a style="color:#fff" href="#">https://kino.pub/device</a><br>2.  Enter the code in the "Device activation" field.',
			},
			pub_title_wait: {
				ru: "Ожидание идентификации кода",
				uk: "Очікування ідентифікації коду",
				en: "Waiting for code identification",
			},
			pub_title_left_days: {
				ru: "Осталось: ",
				uk: "Залишилось: ",
				en: "Left days: ",
			},
			pub_title_left_days_d: {
				ru: "дн.",
				uk: "дн.",
				en: "d.",
			},
			pub_title_regdate: {
				ru: "Дата регистрации:",
				uk: "Дата реєстрації:",
				en: "Date of registration:",
			},
			pub_date_end_pro: {
				ru: "ПРО заканчивается:",
				uk: "ПРО закінчується:",
				en: "PRO ends:",
			},
			pub_auth_add_descr: {
				ru: "Добавить в свой профиль устройство",
				uk: "Додати у свій профіль пристрій",
				en: "Add a device to your profile",
			},
			pub_title_not_pro: {
				ru: "ПРО не активирован",
				uk: "ПРО не активований",
				en: "PRO is not activated",
			},
			pub_device_dell_noty: {
				ru: "Устройство успешно удалено",
				uk: "Пристрій успішно видалено",
				en: "Device deleted successfully",
			},
			pub_device_title_options: {
				ru: "Настройки устройства",
				uk: "Налаштування пристрою",
				en: "Device Settings",
			},
			pub_device_options_edited: {
				ru: "Настройки устройства изменены",
				uk: "Установки пристрою змінено",
				en: "Device settings changed",
			},
			params_pub_clean_tocken: {
				ru: "Очистить токен",
				uk: "Очистити токен",
				en: "Clear token",
			},
			saved_collections_clears: {
				ru: "Сохранённые подборки очищены",
				uk: "Збірки очищені",
				en: "Saved collections cleared",
			},
			card_my_clear: {
				ru: "Убрать из моих подборок",
				uk: "Прибрати з моїх добірок",
				en: "Remove from my collections",
			},
			card_my_add: {
				ru: "Добавить в мои подборки",
				uk: "Додати до моїх добірок",
				en: "Add to my collections",
			},
			card_my_descr: {
				ru: "Смотрите в меню (Подборки)",
				uk: "Дивитесь в меню (Підбірки)",
				en: "Look in the menu (Collections)",
			},
			card_my_clear_all: {
				ru: "Удалить всё",
				uk: "Видалити все",
				en: "Delete all",
			},
			card_my_clear_all_descr: {
				ru: "Очистит все сохранённые подборки",
				uk: "Очистити всі збережені збірки",
				en: "Clear all saved selections",
			},
			radio_style: {
				ru: "Стиль",
				uk: "Стиль",
				en: "Style",
			},
			title_on_the: {
				ru: "на",
				uk: "на",
				en: "on",
			},
			title_my_collections: {
				ru: "Мои подборки",
				uk: "Мої добiрки",
				en: "My collections",
			},
			modss_watch: {
				ru: "Смотреть онлайн",
				en: "Watch online",
				ua: "Дивитися онлайн",
				zh: "在线观看",
			},
			online_no_watch_history: {
				ru: "Нет истории просмотра",
				en: "No browsing history",
				ua: "Немає історії перегляду",
				zh: "没有浏览历史",
			},
			modss_video: {
				ru: "Видео",
				en: "Video",
				ua: "Відео",
				zh: "视频",
			},
			modss_nolink: {
				ru: "Не удалось извлечь ссылку",
				uk: "Неможливо отримати посилання",
				en: "Failed to fetch link",
			},
			modss_blockedlink: {
				ru: "К сожалению, это видео не доступно в вашем регионе",
				uk: "На жаль, це відео не доступне у вашому регіоні",
				be: "Нажаль, гэта відэа не даступна ў вашым рэгіёне",
				en: "Sorry, this video is not available in your region",
				zh: "抱歉，您所在的地区无法观看该视频",
			},
			modss_waitlink: {
				ru: "Работаем над извлечением ссылки, подождите...",
				uk: "Працюємо над отриманням посилання, зачекайте...",
				be: "Працуем над выманнем спасылкі, пачакайце...",
				en: "Working on extracting the link, please wait...",
				zh: "正在提取链接，请稍候...",
			},
			modss_viewed: {
				ru: "Просмотрено",
				uk: "Переглянуто",
				en: "Viewed",
			},
			modss_balanser: {
				ru: "Источник",
				uk: "Джерело",
				en: "Source",
			},
			helper_online_file: {
				ru: 'Удерживайте клавишу "ОК" для вызова контекстного меню',
				uk: 'Утримуйте клавішу "ОК" для виклику контекстного меню',
				en: 'Hold the "OK" key to bring up the context menu',
			},
			filter_series_order: {
				ru: "Порядок серий",
				uk: "Порядок серій",
				en: "Series order",
			},
			filter_video_stream: {
				ru: "Видео поток",
				uk: "Відео потік",
				en: "Video stream",
			},
			filter_video_codec: {
				ru: "Кодек",
				uk: "Кодек",
				en: "Codec",
			},
			filter_video_server: {
				ru: "Сервер",
				uk: "Сервер",
				en: "Server",
			},
			modss_title_online: {
				ru: "MODS's",
				uk: "MODS's",
				en: "MODS's",
			},
			modss_change_balanser: {
				ru: "Изменить источник",
				uk: "Змінити источник",
				en: "Change source",
				zh: "更改平衡器",
			},
			modss_clear_all_marks: {
				ru: "Очистить все метки",
				uk: "Очистити всі мітки",
				en: "Clear all labels",
				zh: "清除所有标签",
			},
			modss_clear_all_timecodes: {
				ru: "Очистить все тайм-коды",
				uk: "Очистити всі тайм-коди",
				en: "Clear all timecodes",
				zh: "清除所有时间代码",
			},
			modss_title_clear_all_mark: {
				ru: "Снять отметку у всех",
				uk: "Зняти відмітку у всіх",
				en: "Unmark all",
			},
			modss_title_clear_all_timecode: {
				ru: "Сбросить тайм-код у всех",
				uk: "Скинути тайм-код у всіх",
				en: "Reset timecode for all",
			},
			modss_title_links: {
				ru: "Качество",
				uk: "Якість",
				en: "Quality",
			},
			title_proxy: {
				ru: "Прокси",
				uk: "Проксі",
				en: "Proxy",
			},
			online_proxy_title: {
				ru: "Личный прокси",
				uk: "Особистий проксі",
				en: "Your proxy",
			},
			online_proxy_title_descr: {
				ru: 'Если источник недоступен или не отвечает, требуется в выбранном Вами источнике "Включить" прокси, или указать ссылку на "Свой URL"',
				uk: 'Якщо джерело недоступний або не відповідає, потрібно у вибраному Вами джерелі "Увімкнути" проксі, або вказати посилання на "Свій URL"',
				en: 'If the source is not available or does not respond, you need to "Enable" the proxy in the source you have chosen, or specify a link to "Custom URL"',
			},
			online_proxy_title_main: {
				ru: "Встроенный прокси",
				uk: "Вбудований проксі",
				en: "Built-in proxy",
			},
			online_proxy_title_main_descr: {
				ru: "Позволяет использовать встроенный в систему прокси для всех",
				uk: "Дозволяє використовувати вбудований у систему проксі для всіх",
				en: "Allows you to use the built-in proxy for all",
			},
			online_proxy_descr: {
				ru: "Позволяет задать личный прокси для всех",
				uk: "Дозволяє встановити особистий проксі для всіх",
				en: "Allows you to set a personal proxy for all",
			},
			online_proxy_placeholder: {
				ru: "Например: http://proxy.com",
				uk: "Наприклад: http://proxy.com",
				en: "For example: http://proxy.com",
			},
			online_proxy_url: {
				ru: "Свой URL",
				uk: "Свiй URL",
				en: "Mine URL",
			},
			modss_voice_success: {
				ru: "Вы успешно подписались",
				uk: "Ви успішно підписалися",
				en: "You have successfully subscribed",
			},
			modss_voice_error: {
				ru: "Возникла ошибка",
				uk: "Виникла помилка",
				en: "An error has occurred",
			},
			modss_balanser_dont_work: {
				ru: "Источник ({balanser}) не отвечает на запрос.",
				uk: "Джерело ({balanser}) не відповідає на запит.",
				en: "Source ({balanser}) does not respond to the request.",
				zh: "平衡器（{balanser}）未响应请求。",
			},
			modss_balanser_timeout: {
				ru: 'Источник будет переключен автоматически через <span class="timeout">10</span> секунд.',
				uk: 'Джерело буде переключено автоматично через <span class="timeout">10</span> секунд.',
				en: 'Source will be switched automatically in <span class="timeout">10</span> seconds.',
				zh: '平衡器将在<span class="timeout">10</span>秒内自动切换。',
			},
			modss_does_not_answer_text: {
				ru: "Сервер не отвечает на запрос.",
				uk: "Сервер не відповідає на запит.",
				en: "Server does not respond to the request.",
				zh: "服务器未响应请求。",
			},
			modss_balanser_dont_work_from: {
				ru: " на источнике <b>{balanser}</b>",
				uk: " на джерелі <b>{balanser}</b>",
				en: " at the source <b>{balanser}</b>",
			},
			online_dash: {
				ru: "Предпочитать DASH вместо HLS",
				uk: "Віддавати перевагу DASH замість HLS",
				be: "Аддаваць перавагу DASH замест HLS",
				en: "Prefer DASH over HLS",
				zh: "比 HLS 更喜欢 DASH",
			},
			online_query_start: {
				ru: "По запросу",
				uk: "На запит",
				en: "On request",
			},
			online_query_end: {
				ru: "нет результатов",
				uk: "немає результатів",
				en: "no results",
			},
			title_online_continue: {
				ru: "Продолжить",
				uk: "Продовжити",
				en: "Continue",
			},
			title_kb_captcha_address: {
				ru: "Требуется пройти капчу по адресу: ",
				uk: "Потрібно пройти капчу за адресою: ",
				en: "It is required to pass the captcha at: ",
			},
			title_online_first_but: {
				ru: "Кнопка онлайн всегда первая",
				uk: "Кнопка онлайн завжди перша",
				en: "Online button always first",
			},
			title_online_continued: {
				ru: "Продолжить просмотр",
				uk: "Продовжити перегляд",
				en: "Continue browsing",
			},
			title_online_descr: {
				ru: "Позволяет запускать плеер сразу на том месте, где остановили просмотр. Работает только в ВСТРОЕННОМ плеере.",
				uk: "Дозволяє запускати плеєр одразу на тому місці, де зупинили перегляд.  Працює тільки у Вбудованому плеєрі.",
				en: "Allows you to start the player immediately at the place where you stopped browsing.  Works only in the INTEGRATED player.",
			},
			title_online_hevc: {
				ru: "Включить поддержку HDR",
				uk: "Включити підтримку HDR",
				en: "Enable HDR Support",
			},
			title_online__hevc_descr: {
				ru: "Использовать HEVC / HDR если он доступен",
				uk: "Використовувати HEVC / HDR якщо він доступний",
				en: "Use HEVC / HDR if available",
			},
			title_prioriry_balanser: {
				ru: "Источник по умолчанию",
				uk: "Джерело за замовчуванням",
				en: "Default source",
			},
			title_prioriry_balanser_descr: {
				ru: "Источник фильмов по умолчанию",
				uk: "Джерело фільмів за замовчуванням",
				en: "Default movie source",
			},
			filmix_param_add_title: {
				ru: "Добавить ТОКЕН от Filmix",
				uk: "Додати ТОКЕН від Filmix",
				en: "Add TOKEN from Filmix",
			},
			filmix_param_add_descr: {
				ru: "Добавьте ТОКЕН для подключения подписки",
				uk: "Додайте ТОКЕН для підключення передплати",
				en: "Add a TOKEN to connect a subscription",
			},
			filmix_param_placeholder: {
				ru: "Например: nxjekeb57385b..",
				uk: "Наприклад: nxjekeb57385b..",
				en: "For example: nxjekeb57385b..",
			},
			filmix_params_add_device: {
				ru: "Добавить устройство на ",
				uk: "Додати пристрій на ",
				en: "Add Device to ",
			},
			filmix_info_descr: {
				ru: 'Максимально доступное качество для просмотра без подписки - 720p. Для того, чтобы смотреть фильмы и сериалы в качестве - 1080р-2160р требуется подписка <b>PRO</b> или <b>PRO-PLUS</b> на сайте <span style="color: #24b4f9">filmix.my</span>',
				uk: 'Максимально доступна якість для перегляду без підписки – 720p.  Для того, щоб дивитися фільми та серіали як - 1080р-2160р потрібна підписка <b>PRO</b> або <b>PRO-PLUS</b> на сайтi <span style="color: #24b4f9">filmix.my</span>',
				en: 'The maximum available quality for viewing without a subscription is 720p.  In order to watch movies and series in quality - 1080p-2160p, you need a <b>PRO</b> or <b>PRO-PLUS</b> subscription to the site <span style="color: #24b4f9">filmix.my</span>',
			},
			filmix_modal_text: {
				ru: 'Введите его на странице <a href="https://filmix.my/consoles" target="_blank" style="color: yellow;">https://filmix.my/consoles</a> в вашем авторизованном аккаунте! <br><br>Чтобы скопировать, нажмите на код.',
				uk: 'Введіть його на сторінці <a href="https://filmix.my/consoles" target="_blank" style="color: yellow;">https://filmix.my/consoles</a> у вашому авторизованому обліковому записі! <br><br>Щоб скопіювати, натисніть на код.',
				en: 'Enter it at <a href="https://filmix.my/consoles" target="_blank" style="color: yellow;">https://filmix.my/consoles</a> in your authorized account! <br><br>To copy, click on the code.',
			},
			filmix_modal_wait: {
				ru: "Ожидаем код",
				uk: "Очікуємо код",
				en: "Waiting for the code",
			},
			filmix_copy_secuses: {
				ru: "Код скопирован в буфер обмена",
				uk: "Код скопійовано в буфер обміну",
				en: "Code copied to clipboard",
			},
			filmix_copy_fail: {
				ru: "Ошибка при копировании",
				uk: "Помилка при копіюванні",
				en: "Copy error",
			},
			filmix_nodevice: {
				ru: "Устройство не авторизовано",
				uk: "Пристрій не авторизований",
				en: "Device not authorized",
			},
			filmix_auth_onl: {
				ru: "Для просмотра в качестве 720p нужно добавить устройство в свой аккаунт на сайте filmix иначе будет заставка на видео.<br><br>Перейти в настройки и добавить?",
				uk: "Для перегляду в якостi 720p потрібно додати пристрій до свого облікового запису на сайті filmix інакше буде заставка на відео.<br><br>Перейти до налаштувань і додати?",
				en: "To view in 720p quality, you need to add a device to your account on the filmix website, otherwise there will be a splash screen on the video.<br><br>Go to settings and add?",
			},
			fork_auth_modal_title: {
				ru: '1. Авторизируйтесь на: <a style="color:#fff" href="#">http://forktv.me</a><br>2. Потребуется оформить подписку<br>3. В поле "Ваш ID/MAC" добавьте код',
				uk: '1. Авторизуйтесь на: <a style="color:#fff" href="#">http://forktv.me</a><br>2. Потрібно оформити передплату<br>3. У полі "Ваш ID/MAC" додайте код',
				en: '1. Log in to: <a style="color:#fff" href="#">http://forktv.me</a><br>2. Subscription required<br>3. In the "Your ID / MAC" field, add the code',
			},
			fork_modal_wait: {
				ru: '<b style="font-size:1em">Ожидание идентификации кода</b><hr>После завершения идентификации произойдет перенаправление в обновленный раздел ForkTV',
				uk: '<b style="font-size:1em">Очiкуемо ідентифікації коду</b><hr>Після завершення ідентифікації відбудеться перенаправлення в оновлений розділ ForkTV',
				en: '<b style="font-size:1em">Waiting for code identification</b><hr>After identification is completed, you will be redirected to the updated ForkTV section',
			},
			title_status: {
				ru: "Статус",
				uk: "Статус",
				en: "Status",
			},
			season_ended: {
				ru: "сезон завершён",
				uk: "сезон завершено",
				en: "season ended",
			},
			season_from: {
				ru: "из",
				uk: "з",
				en: "from",
			},
			season_new: {
				ru: "Новая",
				uk: "Нова",
				en: "New",
			},
			info_attention: {
				ru: "Внимание",
				uk: "Увага",
				en: "Attention",
			},
			info_pub_descr: {
				ru: "<b>KinoPub</b> платный ресурс, просмотр онлайн с источника, а так же спортивные ТВ каналы будут доступны после покупки <b>PRO</b> в аккаунте на сайте",
				uk: "<b>KinoPub</b> платний ресурс, перегляд онлайн з джерела, а також спортивні ТБ канали будуть доступні після покупки <b>PRO</b> в обліковому записі на сайті",
				en: "<b>KinoPub</b> a paid resource, online viewing from a source, as well as sports TV channels will be available after purchasing <b>PRO</b> in your account on the site",
			},
			params_pub_on: {
				ru: "Включить",
				uk: "Увiмкнути",
				en: "Enable",
			},
			params_pub_off: {
				ru: "Выключить",
				uk: "Вимкнути",
				en: "Disable",
			},
			params_pub_on_descr: {
				ru: 'Отображает источник "<b>KinoPub</b>", а так же подборки. Для просмотра с тсточника, а так же ТВ спорт каналов <span style="color:#ffd402">требуется подписка<span>',
				uk: 'Відображає джерело "<b>KinoPub</b>", а також добірки.  Для перегляду з балансера, а також ТБ спорт каналів <span style="color:#ffd402">потрібна підписка<span>',
				en: 'Displays the "<b>KinoPub</b>" source as well as collections.  To view from the source, as well as TV sports channels <span style="color:#ffd402">subscription<span> is required',
			},
			params_pub_add_source: {
				ru: "Установить источник",
				uk: "Встановити джерело",
				en: "Set source",
			},
			pub_source_add_noty: {
				ru: "KinoPub установлен источником по умолчанию",
				uk: "KinoPub встановлений стандартним джерелом",
				en: "KinoPub set as default source",
			},
			descr_pub_settings: {
				ru: "Настройки сервера, типа потока...",
				uk: "Налаштування сервера типу потоку...",
				en: "Server settings, stream type...",
			},
			params_pub_add_source_descr: {
				ru: "Установить источник по умолчанию на KinoPub",
				uk: "Встановити стандартне джерело на KinoPub",
				en: "Set Default Source to KinoPub",
			},
			params_pub_update_tocken: {
				ru: "Обновить токен",
				uk: "Оновити токен",
				en: "Update token",
			},
			params_pub_dell_device: {
				ru: "Удалить привязку устройства",
				uk: "Видалити прив'язку пристрою",
				en: "Remove device link",
			},
			params_pub_dell_descr: {
				ru: "Будет удалено устройство с прывязаных устройств в аккаунте",
				uk: "Буде видалено пристрій із прив'язаних пристроїв в обліковому записі",
				en: "The device will be removed from linked devices in the account",
			},
			params_radio_enable: {
				ru: "Включить радио",
				uk: "Увiмкнути радiо",
				en: "Enable radio",
			},
			params_radio_enable_descr: {
				ru: 'Отображает пункт "Радио" в главном меню с популярными радио-станциями',
				uk: 'Відображає пункт "Радіо" в головному меню з популярними радіостанціями',
				en: 'Displays the item "Radio" in the main menu with popular radio stations',
			},
			params_tv_enable: {
				ru: "Включить ТВ",
				uk: "Увiмкнути ТВ",
				en: "Enable TV",
			},
			params_tv_enable_descr: {
				ru: 'Отображает пункт "Modss-TV" в главном меню с популярными каналами',
				uk: 'Відображає пункт "Modss-TV" в головному меню з популярними каналами',
				en: 'Displays the item "Modss-TV" in the main menu with popular channels',
			},
			params_collections_descr: {
				ru: 'Добавляет в пункт "Подборки" популярные разделы, такие как Rezka, Filmix, KinoPub',
				uk: 'Додає до пункту "Підбірки" популярні розділи, такі як Rezka, Filmix, KinoPub',
				en: 'Adds to "Collections" popular sections such as Rezka, Filmix, KinoPub',
			},
			params_styles_title: {
				ru: "Стилизация",
				uk: "Стилізація",
				en: "Stylization",
			},
			placeholder_password: {
				ru: "Введите пароль",
				uk: "Введіть пароль",
				en: "Enter password",
			},
			title_parent_contr: {
				ru: "Родительский контроль",
				uk: "Батьківський контроль",
				en: "Parental control",
			},
			title_addons: {
				ru: "Дополнения",
				uk: "Додатки",
				en: "Add-ons",
			},
			onl_enable_descr: {
				ru: "Позволяет просматривать фильмы, сериалы в режиме Stream",
				uk: "Дозволяє переглядати фільми, серіали в режимі Stream",
				en: "Allows you to watch movies, series in Stream mode",
			},
			fork_enable_descr: {
				ru: 'Отображает пункт <b>"ForkTV"</b> в главном меню с популярными источниками, торрентами',
				uk: 'Відображає пункт <b>"ForkTV"</b> у головному меню з популярними джерелами, торрентами',
				en: 'Displays <b>"ForkTV"</b> item in main menu with popular sources, torrents',
			},
			title_fork_edit_cats: {
				ru: "Изменить разделы",
				uk: "Змінити розділи",
				en: "Edit Sections",
			},
			title_fork_add_cats: {
				ru: "Добавить разделы",
				uk: "Додати розділи",
				en: "Add Sections",
			},
			title_fork_clear: {
				ru: "Очистить разделы",
				uk: "Очистити розділи",
				en: "Clear Sections",
			},
			title_fork_clear_descr: {
				ru: "Будет выполнена очистка всех выбранных разделов",
				uk: "Буде виконано очищення всіх вибраних розділів",
				en: "All selected partitions will be cleared",
			},
			title_fork_clear_noty: {
				ru: "Разделы успешно очищены",
				uk: "Розділи успішно очищені",
				en: "Partitions cleared successfully",
			},
			title_fork_reload_code: {
				ru: "Обновить код",
				uk: "Оновити код",
				en: "Update Code",
			},
			title_fork_current: {
				ru: "Текущий",
				uk: "Поточний",
				en: "Current",
			},
			title_fork_new: {
				ru: "Новый",
				uk: "Новий",
				en: "New",
			},
			title_tv_clear_fav: {
				ru: "Очистить избранное",
				uk: "Очистити вибране",
				en: "Clear Favorites",
			},
			title_tv_clear__fav_descr: {
				ru: "Будет выполнена очистка избранных каналов",
				uk: "Буде виконано очищення обраних каналів",
				en: "Favorite channels will be cleared",
			},
			title_tv_clear_fav_noty: {
				ru: "Все избранные каналы удалены",
				uk: "Усі вибрані канали видалені",
				en: "All favorite channels have been deleted",
			},
			succes_update_noty: {
				ru: "успешно обновлён",
				uk: "успішно оновлено",
				en: "successfully updated",
			},
			title_enable_rating: {
				ru: "Включить рейтинг",
				uk: "Увiмкнути рейтинг",
				en: "Enable rating",
			},
			title_enable_rating_descr: {
				ru: "Отображает в карточке рейтинг Кинопоиск и IMDB",
				uk: "Відображає у картці рейтинг Кінопошук та IMDB",
				en: "Displays the Kinopoisk and IMDB rating in the card",
			},
			title_info_serial: {
				ru: "Информация о карточке",
				uk: "Інформація про картку",
				en: "Card Information",
			},
			title_info_serial_descr: {
				ru: "Отображает информацию о количестве серий в карточке, в том числе последнею серию на постере",
				uk: "Відображає інформацію про кількість серій у картці, у тому числі останню серію на постері",
				en: "Displays information about the number of episodes in the card, including the last episode on the poster",
			},
			title_add_butback: {
				ru: 'Включить кнопку "Назад"',
				uk: 'Увiмкнути кнопку "Назад"',
				en: "Enable back button",
			},
			title_add_butback_descr: {
				ru: 'Отображает внешнюю кнопку "Назад" для удобной навигации в полноэкраном режиме на различных смартфона',
				uk: 'Відображає зовнішню кнопку "Назад" для зручної навігації в повноекранному режимі на різних смартфонах',
				en: "Displays an external back button for easy full-screen navigation on various smartphones",
			},
			title_butback_pos: {
				ru: 'Положение кнопки "Назад"',
				uk: 'Розташування кнопки "Назад"',
				en: "Back button position",
			},
			buttback_right: {
				ru: "Справа",
				uk: "Праворуч",
				en: "Right",
			},
			buttback_left: {
				ru: "Слева",
				uk: "Лiворуч",
				en: "Left",
			},
			title_close_app: {
				ru: "Закрыть приложение",
				uk: "Закрити додаток",
				en: "Close application",
			},
			title_radio: {
				ru: "Радио",
				uk: "Радiо",
				en: "Radio",
			},
			modss_voice_tracks: {
				ru: "Озвучки",
				uk: "Озвучки",
				en: "Voice tracks",
				be: "Азвучкі",
				zh: "配音轨道",
			},
			modss_voice_subscribe: {
				ru: "Подписаться на озвучку",
				uk: "Підписатися на озвучку",
				en: "Subscribe to voice",
				be: "Падпісацца на азвучку",
				zh: "订阅配音",
			},
			modss_voice_unsubscribe: {
				ru: "Отписаться от озвучки",
				uk: "Відписатися від озвучки",
				en: "Unsubscribe from voice",
				be: "Адпісацца ад азвучкі",
				zh: "取消订阅配音",
			},
			modss_voice_subscriptions: {
				ru: "Мои подписки на озвучки",
				uk: "Мої підписки на озвучки",
				en: "My voice subscriptions",
				be: "Мае падпіскі на азвучкі",
				zh: "我的配音订阅",
			},
			modss_voice_subscribe_success: {
				ru: "Вы успешно подписались на озвучку",
				uk: "Ви успішно підписалися на озвучку",
				en: "You have successfully subscribed to voice",
				be: "Вы паспяхова падпісаліся на азвучку",
				zh: "您已成功订阅配音",
			},
			modss_voice_unsubscribe_success: {
				ru: "Вы успешно отписались от озвучки",
				uk: "Ви успішно відписалися від озвучки",
				en: "You have successfully unsubscribed from voice",
				be: "Вы паспяхова адпісаліся ад азвучкі",
				zh: "您已成功取消订阅配音",
			},
			modss_voice_subscribe_error: {
				ru: "Ошибка при подписке на озвучку",
				uk: "Помилка при підписці на озвучку",
				en: "Error subscribing to voice",
				be: "Памылка пры падпісцы на азвучку",
				zh: "订阅配音时出错",
			},
			modss_voice_subscriptions_only_series: {
				ru: "Подписки доступны только для сериалов",
				uk: "Підписки доступні тільки для серіалів",
				en: "Subscriptions are only available for series",
				be: "Падпіскі даступны толькі для серыялаў",
				zh: "订阅仅适用于系列",
			},
			modss_voice_manage_subscriptions: {
				ru: "Управление всеми подписками",
				uk: "Управління всіма підписками",
				en: "Manage all subscriptions",
				be: "Кіраванне ўсімі падпіскамі",
				zh: "管理所有订阅",
			},
			modss_voice_no_subscriptions: {
				ru: "У вас пока нет подписок",
				uk: "У вас поки немає підписок",
				en: "You have no subscriptions yet",
				be: "У вас пакуль няма падпісак",
				zh: "您还没有订阅",
			},
			modss_voice_subscription_removed: {
				ru: "Подписка удалена",
				uk: "Підписка видалена",
				en: "Subscription removed",
				be: "Падпіска выдалена",
				zh: "订阅已删除",
			},
			modss_voice_confirm_unsubscribe: {
				ru: "Подтвердите отписку",
				uk: "Підтвердіть відписку",
				en: "Confirm unsubscribe",
				be: "Пацвердзіце адпіску",
				zh: "确认取消订阅",
			},
			modss_voice_yes_unsubscribe: {
				ru: "Да, отписаться",
				uk: "Так, відписатися",
				en: "Yes, unsubscribe",
				be: "Так, адпісацца",
				zh: "是的，取消订阅",
			},
			modss_voice_cancel: {
				ru: "Отмена",
				uk: "Скасувати",
				en: "Cancel",
				be: "Скасаваць",
				zh: "取消",
			},
			modss_voice_leave_subscription: {
				ru: "Оставить подписку",
				uk: "Залишити підписку",
				en: "Keep subscription",
				be: "Пакінуць падпіску",
				zh: "保留订阅",
			},
			modss_voice_already_subscribed: {
				ru: "Вы уже подписаны на эту озвучку",
				uk: "Ви вже підписані на цю озвучку",
				en: "You are already subscribed to this voice",
				be: "Вы ўжо падпісаны на гэтую азвучку",
				zh: "您已订阅此配音",
			},
			modss_voice_subscription_changed: {
				ru: "Подписка изменена на",
				uk: "Підписку змінено на",
				en: "Subscription changed to",
				be: "Падпіска зменена на",
				zh: "订阅已更改为",
			},
			menu_voice: {
				ru: "озвучек",
				uk: "озвучок",
				en: "voices",
				be: "азвучак",
				zh: "配音",
			},
			modss_voice_limit_reached_title: {
				ru: "Лимит подписок",
				uk: "Ліміт підписок",
				en: "Subscription limit",
				be: "Ліміт падпісак",
				zh: "订阅限制",
			},
			modss_voice_limit_reached_message: {
				ru: "Вы достигли максимального количества подписок",
				uk: "Ви досягли максимальної кількості підписок",
				en: "You have reached the maximum number of subscriptions",
				be: "Вы дасягнулі максімальнай колькасці падпісак",
				zh: "您已达到最大订阅数量",
			},
			modss_voice_limit_reached_hint: {
				ru: "Удалите одну из существующих подписок<br>чтобы добавить новую",
				uk: "Видаліть одну з існуючих підписок<br>щоб додати нову",
				en: "Delete one of the existing subscriptions<br>to add a new one",
				be: "Выдаліце адну з існуючых падпісак<br>каб дадаць новую",
				zh: "删除现有订阅之一<br>以添加新订阅",
			},
			modss_voice_limit_close: {
				ru: "Закрыть",
				uk: "Закрити",
				en: "Close",
				be: "Закрыць",
				zh: "关闭",
			},
			modss_voice_limit_my_subscriptions: {
				ru: "Мои подписки",
				uk: "Мої підписки",
				en: "My subscriptions",
				be: "Мае падпіскі",
				zh: "我的订阅",
			},
			modss_voice_active_subscriptions: {
				ru: "активных подписок",
				uk: "активних підписок",
				en: "active subscriptions",
				be: "актыўных падпісак",
				zh: "活跃订阅",
			},
		});
		function FreeJaketOpt() {
			Lampa.Arrays.getKeys(Modss.jack).map(function (el) {
				jackets[el] = el.replace(/_/g, ".");
			});
			var params = Lampa.SettingsApi.getParam("parser");
			if (params) {
				var param = params.find(function (p) {
					return p.param.name == "jackett_url2";
				});
				if (param) Lampa.Arrays.remove(params, param);
			}
			Lampa.SettingsApi.addParam({
				component: "parser",
				param: {
					name: "jackett_url2",
					type: "select",
					values: jackets,
					default: "jacred_xyz",
				},
				field: {
					name: "Публичные JACKett Ⓜ️",
					description: "Обновится после выхода из настроек",
				},
				onChange: function (value) {
					Lampa.Storage.set("jackett_url", Modss.jack[value].url);
					Lampa.Storage.set("jackett_key", Modss.jack[value].key);
					Lampa.Storage.set("jackett_interview", Modss.jack[value].interv);
					Lampa.Storage.set("parse_in_search", false);
					Lampa.Storage.set("parse_lang", Modss.jack[value].lang);
					Lampa.Settings.update();
				},
				onRender: function (item) {
					setTimeout(function () {
						$('div[data-children="parser"]').on("hover:enter", function () {
							Lampa.Settings.update();
						});
						if (!API || !API.length) window.location.reload();
						$('[data-name="jackett_url2"]').on("hover:enter", function (el) {
							Lampa.Select.render()
								.find(".selectbox-item__title")
								.map(function (i, item) {
									Modss.check($(item).text().toLowerCase().replace(/\./g, "_"), function (e) {
										$(item).css("color", e ? "#23ff00" : "#d10000");
									});
								});
						});
						if (Lampa.Storage.field("parser_use")) {
							item.show();
							if (Boolean(Modss.jack[Lampa.Storage.get("jackett_url2")])) $(".settings-param__name", item).before('<div class="settings-param__status one ' + (Modss.jack[Lampa.Storage.get("jackett_url2")].ok ? "active" : "error") + '"></div>');
							$('[data-name="jackett_url"] .settings-param__name').before('<div class="settings-param__status wait act"></div>');
							$(".settings-param__name", item).css("color", "#f3d900");
							$('div[data-name="jackett_url2"]').insertAfter('div[data-children="parser"]');
							Modss.check($(".settings-param__value", item).text().toLowerCase().replace(/\./g, "_"), function (e) {
								Modss.check(Lampa.Storage.get("jackett_url"));
								$($(".settings-param__status", item))
									.removeClass("active error wait")
									.addClass(e ? "active" : "error");
							});
						} else item.hide();
					}, 50);
				},
			});
		}

		function addButton(data) {
			cards = data;
			Modss.serialInfo(cards);
			Modss.online();
			Modss.rating_kp_imdb(cards)
				.then(function (e) {
					Modss.preload();
				})
				["catch"](function (e) {
					Modss.preload();
				});
			$(".view--torrent")
				.addClass("selector")
				.empty()
				.append(
					'<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 48 48" width="48px" height="48px"><path d="M 23.501953 4.125 C 12.485953 4.125 3.5019531 13.11 3.5019531 24.125 C 3.5019531 32.932677 9.2467538 40.435277 17.179688 43.091797 L 17.146484 42.996094 L 7 16 L 15 14 C 17.573 20.519 20.825516 32.721688 27.728516 30.929688 C 35.781516 28.948688 28.615 16.981172 27 12.076172 L 34 11 C 38.025862 19.563024 39.693648 25.901226 43.175781 27.089844 C 43.191423 27.095188 43.235077 27.103922 43.275391 27.113281 C 43.422576 26.137952 43.501953 25.140294 43.501953 24.125 C 43.501953 13.11 34.517953 4.125 23.501953 4.125 z M 34.904297 29.314453 C 34.250297 34.648453 28.811359 37.069578 21.943359 35.517578 L 26.316406 43.763672 L 26.392578 43.914062 C 33.176993 42.923925 38.872645 38.505764 41.660156 32.484375 C 41.603665 32.485465 41.546284 32.486418 41.529297 32.486328 C 38.928405 32.472567 36.607552 31.572967 34.904297 29.314453 z"/></svg><span>' +
						Lampa.Lang.translate("full_torrents") +
						"</span>",
				);
			$(".view--trailer")
				.empty()
				.append("<svg enable-background='new 0 0 512 512' id='Layer_1' version='1.1' viewBox='0 0 512 512' xml:space='preserve' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'><g><path fill='currentColor' d='M260.4,449c-57.1-1.8-111.4-3.2-165.7-5.3c-11.7-0.5-23.6-2.3-35-5c-21.4-5-36.2-17.9-43.8-39c-6.1-17-8.3-34.5-9.9-52.3   C2.5,305.6,2.5,263.8,4.2,222c1-23.6,1.6-47.4,7.9-70.3c3.8-13.7,8.4-27.1,19.5-37c11.7-10.5,25.4-16.8,41-17.5   c42.8-2.1,85.5-4.7,128.3-5.1c57.6-0.6,115.3,0.2,172.9,1.3c24.9,0.5,50,1.8,74.7,5c22.6,3,39.5,15.6,48.5,37.6   c6.9,16.9,9.5,34.6,11,52.6c3.9,45.1,4,90.2,1.8,135.3c-1.1,22.9-2.2,45.9-8.7,68.2c-7.4,25.6-23.1,42.5-49.3,48.3   c-10.2,2.2-20.8,3-31.2,3.4C366.2,445.7,311.9,447.4,260.4,449z M205.1,335.3c45.6-23.6,90.7-47,136.7-70.9   c-45.9-24-91-47.5-136.7-71.4C205.1,240.7,205.1,287.6,205.1,335.3z'/></g></svg><span>" + Lampa.Lang.translate("full_trailers") + "</span>");
		}

		if (Lampa.Activity.active() && Lampa.Activity.active().component == "full") {
			if (!Lampa.Activity.active().activity.render().find(".view--modss_online").length) {
				addButton(Lampa.Activity.active().card);
			}
		}
		Lampa.Listener.follow("full", function (e) {
			if (e.type == "complite") {
				addButton(e.data.movie);
			}
		});
		Lampa.Listener.follow("activity", function (e) {
			if (e.component == "full" && e.type == "start") {
				var button = Lampa.Activity.active().activity.render().find(".view--modss_online");
				if (button.length) {
					cards = e.object.card;
					Modss.online(button);
					Modss.last_view(e.object.card);
				}
			}
		});
		Lampa.Storage.listener.follow("change", function (e) {
			//if(e.name == 'jackett_key' || e.name == 'jackett_url') Modss.check(e.value);
		});
		Lampa.Settings.listener.follow("open", function (e) {
			if (e.name == "main") {
				if (Lampa.Settings.main().render().find('[data-component="pub_param"]').length == 0) {
					Lampa.SettingsApi.addComponent({
						component: "pub_param",
						name: "KinoPub",
						icon: '<svg viewBox="0 0 24 24" xml:space="preserve" xmlns="http://www.w3.org/2000/svg"><path d="M19.7.5H4.3C2.2.5.5 2.2.5 4.3v15.4c0 2.1 1.7 3.8 3.8 3.8h15.4c2.1 0 3.8-1.7 3.8-3.8V4.3c0-2.1-1.7-3.8-3.8-3.8zM13 14.6H8.6c-.3 0-.5.2-.5.5v4.2H6V4.7h7c2.7 0 5 2.2 5 5 0 2.7-2.2 4.9-5 4.9z" fill="#ffffff" class="fill-000000 fill-ffffff"></path><path d="M13 6.8H8.6c-.3 0-.5.2-.5.5V12c0 .3.2.5.5.5H13c1.6 0 2.8-1.3 2.8-2.8.1-1.6-1.2-2.9-2.8-2.9z" fill="#ffffff" class="fill-000000 fill-ffffff"></path></svg>',
					});
				}
				if (Lampa.Settings.main().render().find('[data-component="fork_param"]').length == 0) {
					Lampa.SettingsApi.addComponent({
						component: "fork_param",
						name: "ForkTV",
						icon: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><g fill="none" fill-rule="evenodd" stroke-linecap="round" stroke-linejoin="round" stroke="#ffffff" stroke-width="2" class="stroke-000000"><path d="M4.4 2h15.2A2.4 2.4 0 0 1 22 4.4v15.2a2.4 2.4 0 0 1-2.4 2.4H4.4A2.4 2.4 0 0 1 2 19.6V4.4A2.4 2.4 0 0 1 4.4 2Z"></path><path d="M12 20.902V9.502c-.026-2.733 1.507-3.867 4.6-3.4M9 13.5h6"></path></g></svg>',
					});
				}
				if (Lampa.Settings.main().render().find('[data-component="rezka_param"]').length == 0) {
					Lampa.SettingsApi.addComponent({
						component: "rezka_param",
						name: "HDRezka",
						icon: '<svg height="57" viewBox="0 0 58 57" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 20.3735V45H26.8281V34.1262H36.724V26.9806H26.8281V24.3916C26.8281 21.5955 28.9062 19.835 31.1823 19.835H39V13H26.8281C23.6615 13 20 15.4854 20 20.3735Z" fill="white"/><rect x="2" y="2" width="54" height="53" rx="5" stroke="white" stroke-width="4"/></svg>',
					});
				}
				if (Lampa.Settings.main().render().find('[data-component="filmix_param"]').length == 0) {
					Lampa.SettingsApi.addComponent({
						component: "filmix_param",
						name: "Filmix",
						icon: '<svg height="57" viewBox="0 0 58 57" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 20.3735V45H26.8281V34.1262H36.724V26.9806H26.8281V24.3916C26.8281 21.5955 28.9062 19.835 31.1823 19.835H39V13H26.8281C23.6615 13 20 15.4854 20 20.3735Z" fill="white"/><rect x="2" y="2" width="54" height="53" rx="5" stroke="white" stroke-width="4"/></svg>',
					});
				}
				if (Lampa.Settings.main().render().find('[data-component="modss_tv_param"]').length == 0) {
					Lampa.SettingsApi.addComponent({
						component: "modss_tv_param",
						name: "Modss-TV",
						icon: '<svg height="57px" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" color="#fff" fill="currentColor" class="bi bi-tv"><path d="M2.5 13.5A.5.5 0 0 1 3 13h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zM13.991 3l.024.001a1.46 1.46 0 0 1 .538.143.757.757 0 0 1 .302.254c.067.1.145.277.145.602v5.991l-.001.024a1.464 1.464 0 0 1-.143.538.758.758 0 0 1-.254.302c-.1.067-.277.145-.602.145H2.009l-.024-.001a1.464 1.464 0 0 1-.538-.143.758.758 0 0 1-.302-.254C1.078 10.502 1 10.325 1 10V4.009l.001-.024a1.46 1.46 0 0 1 .143-.538.758.758 0 0 1 .254-.302C1.498 3.078 1.675 3 2 3h11.991zM14 2H2C0 2 0 4 0 4v6c0 2 2 2 2 2h12c2 0 2-2 2-2V4c0-2-2-2-2-2z"/></svg>',
					});
				}
				if (Lampa.Settings.main().render().find('[data-component="modss_online_param"]').length == 0) {
					Lampa.SettingsApi.addComponent({
						component: "modss_online_param",
						name: "Modss-Online",
						icon: '<svg height="57px" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" color="#fff" fill="currentColor" class="bi bi-tv"><path d="M2.5 13.5A.5.5 0 0 1 3 13h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zM13.991 3l.024.001a1.46 1.46 0 0 1 .538.143.757.757 0 0 1 .302.254c.067.1.145.277.145.602v5.991l-.001.024a1.464 1.464 0 0 1-.143.538.758.758 0 0 1-.254.302c-.1.067-.277.145-.602.145H2.009l-.024-.001a1.464 1.464 0 0 1-.538-.143.758.758 0 0 1-.302-.254C1.078 10.502 1 10.325 1 10V4.009l.001-.024a1.46 1.46 0 0 1 .143-.538.758.758 0 0 1 .254-.302C1.498 3.078 1.675 3 2 3h11.991zM14 2H2C0 2 0 4 0 4v6c0 2 2 2 2 2h12c2 0 2-2 2-2V4c0-2-2-2-2-2z"/></svg>',
					});
				}
				if (Lampa.Settings.main().render().find('[data-component="modss_radio_param"]').length == 0) {
					Lampa.SettingsApi.addComponent({
						component: "modss_radio_param",
						name: "Modss-Radio",
						icon: '<svg height="57px" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" color="#fff" fill="currentColor" class="bi bi-tv"><path d="M2.5 13.5A.5.5 0 0 1 3 13h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zM13.991 3l.024.001a1.46 1.46 0 0 1 .538.143.757.757 0 0 1 .302.254c.067.1.145.277.145.602v5.991l-.001.024a1.464 1.464 0 0 1-.143.538.758.758 0 0 1-.254.302c-.1.067-.277.145-.602.145H2.009l-.024-.001a1.464 1.464 0 0 1-.538-.143.758.758 0 0 1-.302-.254C1.078 10.502 1 10.325 1 10V4.009l.001-.024a1.46 1.46 0 0 1 .143-.538.758.758 0 0 1 .254-.302C1.498 3.078 1.675 3 2 3h11.991zM14 2H2C0 2 0 4 0 4v6c0 2 2 2 2 2h12c2 0 2-2 2-2V4c0-2-2-2-2-2z"/></svg>',
					});
				}
				Lampa.Settings.main().update();
				Lampa.Settings.main().render().find('[data-component="modss_radio_param"], [data-component="modss_online_param"], [data-component="filmix"], [data-component="rezka_param"], [data-component="pub_param"], [data-component="filmix_param"], [data-component="fork_param"], [data-component="modss_tv_param"]').addClass("hide");

				var interfaceElement = Lampa.Settings.main().render().find('div[data-component="account"]');
				var settingsElement = Lampa.Settings.main().render().find('div[data-component="settings_modss"]');

				interfaceElement.after(settingsElement);
			}
			if (e.name == "mods_proxy") {
				$(".settings__title").text(Lampa.Lang.translate("title_proxy") + " MODS's");
				var ads = ['<div style="padding: 1.5em 2em; padding-top: 10px;">', '<div style="background: #3e3e3e; padding: 1em; border-radius: 0.3em;">', '<div style="font-size: 1em; margin-bottom: 1em; color: #ffd402;">#{info_attention} ⚠</div>', '<div style="line-height: 1.4;">#{online_proxy_title_descr}</div>', "</div>", "</div>"].join("");
				e.body.find('[data-name="mods_proxy_all"]').before(Lampa.Lang.translate(ads));
			} else $(".settings__title").text(Lampa.Lang.translate("menu_settings"));
			if (e.name == "fork_param") $(".settings__title").append(" ForkTV");
			if (e.name == "filmix_param") {
				var ads = ['<div style="padding: 1.5em 2em; padding-top: 10px;">', '<div style="background: #3e3e3e; padding: 1em; border-radius: 0.3em;">', '<div style="font-size: 1em; margin-bottom: 1em; color: #ffd402;">#{info_attention} ⚠</div>', '<div style="line-height: 1.4;">#{filmix_info_descr}</div>', "</div>", "</div>"].join("");
				e.body.find('[data-static="true"]:eq(0)').after(Lampa.Lang.translate(ads));
				$(".settings__title").append(" Filmix");
			}
			if (e.name == "pub_param") {
				var ads = ['<div style="padding: 1.5em 2em; padding-top: 10px;">', '<div style="background: #3e3e3e; padding: 1em; border-radius: 0.3em;">', '<div style="font-size: 1em; margin-bottom: 1em; color: #ffd402;">#{info_attention} ⚠</div>', '<div style="line-height: 1.4;">#{info_pub_descr} <span style="color: #24b4f9">kino.pub</span></div>', "</div>", "</div>"].join("");
				e.body.find('[data-static="true"]:eq(0)').after(Lampa.Lang.translate(ads));
				$(".settings__title").append(" KinoPub");
			}
			if (e.name == "modss_online_param") {
				$(".settings__title").text("MODS's Online");
				var title = $('[data-name="priority_balanser"] .settings-param__value', e.body);
				title.text(title.text().split("<").shift());
			}
			if (e.name == "modss_radio_param") {
				$(".settings__title").text("MODS's Radio");
			}
			if (e.name == "settings_modss") {
				$(".settings__title").text("MODS's 💎");
				var title = $('[data-name="priority_balanser"] .settings-param__value', e.body);
				title.text(title.text().split("<").shift());
			}
			if (e.name == "parser") FreeJaketOpt();
		});
		if (Lampa.Manifest.app_digital >= 177) {
			Lampa.Storage.sync("my_colls", "object_object");
			Lampa.Storage.sync("fav_chns", "object_object");
			Lampa.Storage.sync("online_watched_last", "object_object");

			var balansers_sync = ["lumex", "videx", "filmix", "kinopub", "hdr", "fxpro", "mango", "alloha", "filmix", "kinopub", "kodik", "aniliberty", "eneida", "uakino", "hdrezka", "hdvb", "iremux", "kinotochka", "lumex", "videx", "zetflix", "veoveo", "anilibria", "hdfilmtr", "bazon", "cdnmovies", "collaps", "kinobase", "hydraflix", "kinokrad", "kinofit", "seasonvar", "videodb", "voidboost"];
			balansers_sync.forEach(function (name) {
				Lampa.Storage.sync("online_choice_" + name, "object_object");
			});
		}
		function add() {
			Modss.init();
			$("body").append(Lampa.Template.get("modss_styles", {}, true));
			$("body").append(Lampa.Template.get("hdgo_style", {}, true));
			$("body").append(Lampa.Template.get("mods_radio_style", {}, true));
			$("body").append(Lampa.Template.get("modss_online_css", {}, true));
			$("body").append(Lampa.Template.get("radio_style_modss", {}, true));

			//	Lampa.Storage.set('guide', '');
			setTimeout(function () {
				//if (window.innerHeight > 700 && Lampa.Storage.field('guide') == 'undefined') guide();
			}, 3000);

			Lampa.SettingsApi.addComponent({
				component: "settings_modss",
				name: "MODS's 💎",
				icon: "<svg viewBox='0 0 24 24' xml:space='preserve' xmlns='https://www.w3.org/2000/svg'><path d='M19.7.5H4.3C2.2.5.5 2.2.5 4.3v15.4c0 2.1 1.7 3.8 3.8 3.8h15.4c2.1 0 3.8-1.7 3.8-3.8V4.3c0-2.1-1.7-3.8-3.8-3.8zm-2.1 16.4c.3 0 .5.2.5.5s-.2.5-.5.5h-3c-.3 0-.5-.2-.5-.5s.2-.5.5-.5h1V8.4l-3.2 5.4-.1.1-.1.1h-.6s-.1 0-.1-.1l-.1-.1-3-5.4v8.5h1c.3 0 .5.2.5.5s-.2.5-.5.5h-3c-.3 0-.5-.2-.5-.5s.2-.5.5-.5h1V7.1h-1c-.3 0-.5-.2-.5-.5s.2-.5.5-.5h1.7c.1 0 .2.1.2.2l3.7 6.2 3.7-6.2.2-.2h1.7c.3 0 .5.2.5.5s-.2.5-.5.5h-1v9.8h1z' fill='#ffffff' class='fill-000000'></path></svg>",
			});

			Lampa.SettingsApi.addParam({
				component: "settings_modss",
				param: {
					name: "mods_status",
					type: "title",
				},
				field: {
					name: '<div class="settings-folder" style="padding:0!important"><div style="width:3em;height:2.3em;margin-top:-.5em;padding-right:.5em"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M0 0h24v24H0z"></path><path d="M3 3h18a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm8 5.5v7h2v-7h-2zm-.285 0H8.601l-1.497 4.113L5.607 8.5H3.493l2.611 6.964h2L10.715 8.5zm5.285 5h1.5a2.5 2.5 0 1 0 0-5H14v7h2v-2zm0-2v-1h1.5a.5.5 0 1 1 0 1H16z" fill="#ffffff" class="fill-000000"></path></svg></div><div style="font-size:1.3em">Сессия не активирована</div></div>',
					description: '<div class="ad-server" style="margin: 0em 0em;"><div class="ad-server__text">🆔 <b>933989563</b><br>❇️ 💻 Windows NT 10.0 (x64)</b></div><img src="http://lampa.stream/group.png" class="ad-server__qr"><div class="ad-server__label">@modssmy_bot</div></div>',
				},
				onRender: function (item) {
					setTimeout(function () {
						var parts = leftVipD.match(/(💎)?(\d+)(.*)/);
						if (!parts) return;
						var numberPart = parts[2];
						var textPart = parts[3].trim();
						$("#modss_left").html(numberPart);
						$("#modss_left_text").html(textPart);
					}, 100);
				},
			});
			Lampa.SettingsApi.addParam({
				component: "settings_modss",
				param: {
					name: "mods_password",
					type: "static", //доступно select,input,trigger,title,static
					placeholder: Lampa.Lang.translate("placeholder_password"),
					values: "",
					default: "",
				},
				field: {
					name: Lampa.Lang.translate("title_parent_contr"),
					description: Lampa.Lang.translate("placeholder_password"),
				},
				onRender: function (item) {
					function pass() {
						Lampa.Input.edit(
							{
								value: "" + Lampa.Storage.get("mods_password") + "",
								free: true,
								nosave: true,
							},
							function (t) {
								Lampa.Storage.set("mods_password", t);
								Lampa.Settings.update();
							},
						);
					}
					item.on("hover:enter", function () {
						if (Lampa.Storage.get("mods_password"))
							Lampa.Input.edit(
								{
									value: "",
									title: "Введите старый пароль",
									free: true,
									nosave: true,
								},
								function (t) {
									if (t == Lampa.Storage.get("mods_password")) pass();
									else Lampa.Noty.show("Неверный пароль");
								},
							);
						else pass();
					});
					if (Lampa.Storage.get("mods_password")) item.find(".settings-param__descr").text("Изменить пароль");
					else item.find(".settings-param__descr").text(Lampa.Lang.translate("placeholder_password"));
				},
				onChange: function (value) {
					if (value) $("body").find(".settings-param__descr").text("Изменить пароль");
					else $("body").find(".settings-param__descr").text(Lampa.Lang.translate("placeholder_password"));
				},
			});
			//Add-ons
			Lampa.SettingsApi.addParam({
				component: "settings_modss",
				param: {
					name: "mods_onl",
					type: "trigger", //доступно select,input,trigger,title,static
					default: true,
				},
				field: {
					name: Lampa.Lang.translate("params_pub_on") + " online " + Lampa.Lang.translate("modss_title_online").toLowerCase(),
					description: Lampa.Lang.translate("onl_enable_descr"),
				},
				onChange: function (value) {
					if (cards) Modss.online(value == "true" ? false : "delete");
					Lampa.Settings.update();
				},
			});
			Lampa.SettingsApi.addParam({
				component: "settings_modss",
				param: {
					name: "modss_online_param",
					type: "static", //доступно select,input,trigger,title,static
					default: true,
				},
				field: {
					name: '<div class="settings-folder" style="padding:0!important"><div style="width:1.8em;height:1.3em;padding-right:.5em"><svg viewBox="0 0 32 32" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 32 32"><path d="m17 14.5 4.2-4.5L4.9 1.2c-.1-.1-.3-.1-.6-.2L17 14.5zM23 21l5.9-3.2c.7-.4 1.1-1 1.1-1.8s-.4-1.5-1.1-1.8L23 11l-4.7 5 4.7 5zM2.4 1.9c-.3.3-.4.7-.4 1.1v26c0 .4.1.8.4 1.2L15.6 16 2.4 1.9zM17 17.5 4.3 31c.2 0 .4-.1.6-.2L21.2 22 17 17.5z" fill="currentColor" fill="#ffffff" class="fill-000000"></path></svg></div><div style="font-size:1.3em">Online</div></div>',
				},
				onRender: function (item) {
					if (Lampa.Storage.field("mods_onl")) {
						item.show();
					} else item.hide();

					item.on("hover:enter", function () {
						Lampa.Settings.create("modss_online_param");
						Lampa.Controller.enabled().controller.back = function () {
							Lampa.Settings.create("settings_modss");
							setTimeout(function () {
								Navigator.focus($("body").find('[data-static="true"]:eq(1)')[0]);
							}, 100);
						};
					});
				},
			});
			Lampa.SettingsApi.addParam({
				component: "modss_online_param",
				param: {
					name: "priority_balanser",
					type: "select", //доступно select,input,trigger,title,static
					values: Modss.balansers(),
					default: Modss.balansPrf,
				},
				field: {
					name: Lampa.Lang.translate("title_prioriry_balanser"),
					description: Lampa.Lang.translate("title_prioriry_balanser_descr"),
				},
				onRender: function (item) {
					if (Lampa.Storage.field("mods_onl")) item.show();
					else item.hide();
				},
				onChange: function (values) {
					var title = $("body").find('[data-name="priority_balanser"] .settings-param__value');
					title.text(title.text().split("<").shift());
				},
			});
			Lampa.SettingsApi.addParam({
				component: "modss_online_param",
				param: {
					name: "online_but_first",
					type: "trigger", //доступно select,input,trigger,title,static
					default: true,
				},
				field: {
					name: Lampa.Lang.translate("title_online_first_but"),
				},
				onChange: function (item) {
					Lampa.Storage.set("full_btn_priority", "");
				},
				onRender: function (item) {
					if (Lampa.Storage.field("mods_onl")) item.show();
					else item.hide();
				},
			});
			Lampa.SettingsApi.addParam({
				component: "modss_online_param",
				param: {
					name: "online_continued",
					type: "trigger", //доступно select,input,trigger,title,static
					default: false,
				},
				field: {
					name: Lampa.Lang.translate("title_online_continued"),
					description: Lampa.Lang.translate("title_online_descr"),
				},
				onRender: function (item) {
					if (Lampa.Storage.field("mods_onl")) item.show();
					else item.hide();
				},
			});
			Lampa.SettingsApi.addParam({
				component: "modss_online_param",
				param: {
					name: "online_dash",
					type: "trigger", //доступно select,input,trigger,title,static
					default: false,
				},
				field: {
					name: Lampa.Lang.translate("online_dash"),
					description: Lampa.Lang.translate("modss_balanser") + " Collaps",
				},
				onRender: function (item) {
					if (Lampa.Storage.field("mods_onl")) item.show();
					else item.hide();
				},
			});
			//Filmix
			Lampa.SettingsApi.addParam({
				component: "modss_online_param",
				param: {
					name: "filmix_param",
					type: "static", //доступно select,input,trigger,title,static
					default: true,
				},
				field: {
					name: '<div class="settings-folder" style="padding:0!important"><div style="width:1.8em;height:1.3em;padding-right:.5em"><svg height="26" width="26" viewBox="0 0 58 57" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M20 20.3735V45H26.8281V34.1262H36.724V26.9806H26.8281V24.3916C26.8281 21.5955 28.9062 19.835 31.1823 19.835H39V13H26.8281C23.6615 13 20 15.4854 20 20.3735Z" fill="white"/><rect x="2" y="2" width="54" height="53" rx="5" stroke="white" stroke-width="4"/></svg></div><div style="font-size:1.3em">Filmix</div></div>',
					description: " ",
				},
				onRender: function (item) {
					if (Lampa.Storage.field("mods_onl")) {
						item.show();
						$(".settings-param__name", item).before('<div class="settings-param__status"></div>');
						Filmix.checkPro(Filmix.token);
						Filmix.showStatus(item);
					} else item.hide();
					item.on("hover:enter", function () {
						Lampa.Settings.create("filmix_param");
						Lampa.Controller.enabled().controller.back = function () {
							Lampa.Settings.create("modss_online_param");
							setTimeout(function () {
								Navigator.focus($("body").find('[data-static="true"]:eq(0)')[0]);
							}, 100);
						};
					});
				},
			});
			Lampa.SettingsApi.addParam({
				component: "filmix_param",
				param: {
					name: "filmix_status",
					type: "title", //доступно select,input,trigger,title,static
					default: "",
				},
				field: {
					name: '<b style="color:#fff">' + Lampa.Lang.translate("title_status") + "</b>",
					description: " ",
				},
				onRender: function (item) {
					$(".settings-param__descr", item).before('<div class="settings-param__status"></div>');
					Filmix.showStatus(item);
				},
			});
			Lampa.SettingsApi.addParam({
				component: "filmix_param",
				param: {
					name: "filmix_add",
					type: "static", //доступно select,input,trigger,title,static
					default: "",
				},
				field: {
					name: Lampa.Lang.translate("filmix_params_add_device") + " Filmix",
					description: Lampa.Lang.translate("pub_auth_add_descr"),
				},
				onRender: function (item) {
					item.on("hover:enter", function () {
						Filmix.add_new();
					});
				},
			});
			Lampa.SettingsApi.addParam({
				component: "filmix_param",
				param: {
					name: "filmix_token",
					type: "input", //доступно select,input,trigger,title,static
					values: "",
					placeholder: Lampa.Lang.translate("filmix_param_placeholder"),
					default: "",
				},
				field: {
					name: Lampa.Lang.translate("filmix_param_add_title"),
					description: Lampa.Lang.translate("filmix_param_add_descr"),
				},
				onChange: function (value) {
					if (value) {
						Filmix.checkPro(value, true);
						Filmix.token = value;
					} else {
						Lampa.Storage.set("filmix_status", {});
						Filmix.token = Lampa.Storage.get("filmix_token", "aaaabbbbccccddddeeeeffffaaaabbbb");
						Filmix.showStatus();
					}
				},
			});
			Lampa.SettingsApi.addParam({
				component: "filmix_param",
				param: {
					name: "filmix_token_clear",
					type: "static", //доступно select,input,trigger,title,static
					default: "",
				},
				field: {
					name: "Очистить токен",
					description: "Уберет привязку в Lampa",
				},
				onRender: function (item) {
					if (Lampa.Storage.field("filmix_status")) item.show();
					else item.hide();

					item.on("hover:enter", function () {
						Lampa.Noty.show("Токен очищен");
						Lampa.Storage.set("filmix_token", "");
						Lampa.Storage.set("filmix_status", {});
						Filmix.token = Lampa.Storage.get("filmix_token", "aaaabbbbccccddddeeeeffffaaaabbbb");
						$('[data-name="filmix_token"] .settings-param__value').text("");
						Filmix.showStatus();
					});
				},
			});
			//Pub
			Lampa.SettingsApi.addParam({
				component: "modss_online_param",
				param: {
					name: "pub_param",
					type: "static", //доступно select,input,trigger,title,static
					default: true,
				},
				field: {
					name: '<div class="settings-folder" style="padding:0!important"><div style="width:1.8em;height:1.3em;padding-right:.5em"><svg height="26" width="26" viewBox="0 0 24 24" xml:space="preserve" xmlns="http://www.w3.org/2000/svg"><path d="M19.7.5H4.3C2.2.5.5 2.2.5 4.3v15.4c0 2.1 1.7 3.8 3.8 3.8h15.4c2.1 0 3.8-1.7 3.8-3.8V4.3c0-2.1-1.7-3.8-3.8-3.8zM13 14.6H8.6c-.3 0-.5.2-.5.5v4.2H6V4.7h7c2.7 0 5 2.2 5 5 0 2.7-2.2 4.9-5 4.9z" fill="#ffffff" class="fill-000000 fill-ffffff"></path><path d="M13 6.8H8.6c-.3 0-.5.2-.5.5V12c0 .3.2.5.5.5H13c1.6 0 2.8-1.3 2.8-2.8.1-1.6-1.2-2.9-2.8-2.9z" fill="#ffffff" class="fill-000000 fill-ffffff"></path></svg></div><div style="font-size:1.3em">KinoPub</div></div>',
					description: Lampa.Lang.translate("filmix_nodevice"),
				},
				onRender: function (item) {
					if (Lampa.Storage.field("mods_onl")) {
						item.show();
						$(".settings-param__name", item).before('<div class="settings-param__status"></div>');
						Pub.userInfo(item, true);
					} else item.hide();
					item.on("hover:enter", function () {
						Lampa.Settings.create("pub_param");
						Lampa.Controller.enabled().controller.back = function () {
							Lampa.Settings.create("modss_online_param");
							setTimeout(function () {
								Navigator.focus($("body").find('[data-static="true"]:eq(1)')[0]);
							}, 100);
						};
					});
				},
			});
			Lampa.SettingsApi.addParam({
				component: "pub_param",
				param: {
					name: "pub_auth",
					type: "static", //доступно select,input,trigger,title,static
				},
				field: {
					name: " ",
					description: " ",
				},
				onRender: function (item) {
					$(".settings-param__name", item).before('<div class="settings-param__status"></div>');
					Pub.userInfo(item);
				},
			});
			Lampa.SettingsApi.addParam({
				component: "pub_param",
				param: {
					name: "pub_auth_add",
					type: "static", //доступно select,input,trigger,title,static
				},
				field: {
					name: Lampa.Lang.translate("filmix_params_add_device") + " KinoPub",
					description: Lampa.Lang.translate("pub_auth_add_descr"),
				},
				onRender: function (item) {
					item.on("hover:enter", function () {
						Pub.Auth_pub();
					});
				},
			});
			Lampa.SettingsApi.addParam({
				component: "pub_param",
				param: {
					name: "pub_speed",
					type: "static", //доступно select,input,trigger,title,static
				},
				field: {
					name: "SpeedTest",
					description: "Выбор лучшего сервера KinoPub",
				},
				onRender: function (item) {
					item.on("hover:enter", function () {
						Lampa.Iframe.show({
							url: Protocol() + "zamerka.com/",
							onBack: function onBack() {
								Lampa.Controller.toggle("settings_component");
							},
						});
					});
					if (!Lampa.Storage.field("mods_onl")) item.hide();
				},
			});
			Lampa.SettingsApi.addParam({
				component: "pub_param",
				param: {
					name: "pub_parametrs",
					type: "static", //доступно select,input,trigger,title,static
				},
				field: {
					name: Lampa.Lang.translate("title_settings"),
					description: Lampa.Lang.translate("descr_pub_settings"),
				},
				onRender: function (item) {
					if (!Lampa.Storage.get("logined_pub")) item.hide();
					item.on("hover:enter", function () {
						Pub.info_device();
					});
				},
			});
			Lampa.SettingsApi.addParam({
				component: "pub_param",
				param: {
					name: "pub_source",
					type: "static", //доступно select,input,trigger,title,static
				},
				field: {
					name: Lampa.Lang.translate("params_pub_add_source"),
					description: Lampa.Lang.translate("params_pub_add_source_descr"),
				},
				onRender: function (item) {
					item.on("hover:enter", function () {
						Lampa.Noty.show(Lampa.Lang.translate("pub_source_add_noty"));
						Lampa.Storage.set("source", "pub");
					});
				},
			});
			Lampa.SettingsApi.addParam({
				component: "pub_param",
				param: {
					name: "pub_del_device",
					type: "static", //доступно select,input,trigger,title,static
				},
				field: {
					name: Lampa.Lang.translate("params_pub_dell_device"),
					description: Lampa.Lang.translate("params_pub_dell_descr"),
				},
				onRender: function (item) {
					if (Pub.token.indexOf("bt6r3") == 0) item.hide();
					item.on("hover:enter", function () {
						Pub.delete_device(function () {
							Lampa.Settings.create("pub_param");
						});
					});
				},
			});
			Lampa.SettingsApi.addParam({
				component: "pub_param",
				param: {
					name: "pub_clear_tocken",
					type: "static", //доступно select,input,trigger,title,static
				},
				field: {
					name: Lampa.Lang.translate("params_pub_clean_tocken"),
				},
				onRender: function (item) {
					item.on("hover:enter", function () {
						Lampa.Storage.set("pub_access_token", Pub.token);
						Lampa.Storage.set("logined_pub", "false");
						Lampa.Noty.show("Cleared");
						Lampa.Settings.update();
					});
				},
			});

			Lampa.SettingsApi.addParam({
				component: "settings_modss",
				param: {
					name: "mods_title",
					type: "title", //доступно select,input,trigger,title,static
					default: true,
				},
				field: {
					name: Lampa.Lang.translate("title_addons"),
				},
			});

			/*Lampa.SettingsApi.addParam({
  	component: 'settings_modss',
  	param: {
  		name: 'pub_tv',
  		type: 'trigger', //доступно select,input,trigger,title,static
  		default: false
  	},
  	field: {
  		name: Lampa.Lang.translate('params_tv_enable') +' Pub',
  		description: Lampa.Lang.translate('params_tv_enable_descr').replace('Modss', 'SPORT')
  	},
  	onChange: function (value) {
  		Modss.tv_pub();
  	}
  });*/
			//TV
			Lampa.SettingsApi.addParam({
				component: "settings_modss",
				param: {
					name: "mods_tv",
					type: "trigger", //доступно select,input,trigger,title,static
					default: false,
				},
				field: {
					name: Lampa.Lang.translate("params_tv_enable"),
					description: Lampa.Lang.translate("params_tv_enable_descr"),
				},
				onChange: function (value) {
					Modss.tv_modss();
					Lampa.Settings.update();
				},
			});
			Lampa.SettingsApi.addParam({
				component: "settings_modss",
				param: {
					name: "modss_tv_param",
					type: "static", //доступно select,input,trigger,title,static
					default: true,
				},
				field: {
					name: '<div class="settings-folder" style="padding:0!important"><div style="width:1.8em;height:1.3em;padding-right:.5em"><svg width="16px" height="16px" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" class="bi bi-tv"><path fill="currentColor" d="M2.5 13.5A.5.5 0 0 1 3 13h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zM13.991 3l.024.001a1.46 1.46 0 0 1 .538.143.757.757 0 0 1 .302.254c.067.1.145.277.145.602v5.991l-.001.024a1.464 1.464 0 0 1-.143.538.758.758 0 0 1-.254.302c-.1.067-.277.145-.602.145H2.009l-.024-.001a1.464 1.464 0 0 1-.538-.143.758.758 0 0 1-.302-.254C1.078 10.502 1 10.325 1 10V4.009l.001-.024a1.46 1.46 0 0 1 .143-.538.758.758 0 0 1 .254-.302C1.498 3.078 1.675 3 2 3h11.991zM14 2H2C0 2 0 4 0 4v6c0 2 2 2 2 2h12c2 0 2-2 2-2V4c0-2-2-2-2-2z"/></svg></div><div style="font-size:1.3em">Modss-TV</div></div>',
				},
				onRender: function (item) {
					if (!Lampa.Storage.field("mods_tv")) item.hide();
					item.on("hover:enter", function () {
						Lampa.Settings.create("modss_tv_param");
						Lampa.Controller.enabled().controller.back = function () {
							Lampa.Settings.create("settings_modss");
							setTimeout(function () {
								Navigator.focus($("body").find('[data-static="true"]:eq(2)')[0]);
							}, 100);
						};
					});
				},
			});
			Lampa.SettingsApi.addParam({
				component: "modss_tv_param",
				param: {
					name: "mods_tv_style",
					type: "select", //доступно select,input,trigger,title,static
					values: {
						line: "Строчный",
						vert: "Вертикальный",
						cats: "Категории",
					},
					default: "vert",
				},
				field: {
					name: "Тип навигации",
					description: "Вид отображения списка каналов",
				},
				onRender: function (item) {
					if (!Lampa.Storage.field("mods_tv")) item.hide();
				},
			});
			Lampa.SettingsApi.addParam({
				component: "modss_tv_param",
				param: {
					name: "mods_tv_butt_ch",
					type: "trigger", //доступно select,input,trigger,title,static
					default: true,
				},
				field: {
					name: "Переключение каналов",
					description: "Позволяет переключать каналы кнопками переключения каналов на пульте",
				},
				onRender: function (item) {
					if (!Lampa.Storage.field("mods_tv")) item.hide();
				},
			});
			Lampa.SettingsApi.addParam({
				component: "modss_tv_param",
				param: {
					name: "mods_tv_cat_clear",
					type: "static", //доступно select,input,trigger,title,static
					default: "",
				},
				field: {
					name: Lampa.Lang.translate("title_fork_clear"),
					description: Lampa.Lang.translate("title_fork_clear_descr"),
				},
				onRender: function (item) {
					if (!Lampa.Storage.field("mods_tv")) item.hide();
					item.on("hover:enter", function () {
						Lampa.Storage.set("serv_kulik", "");
						Lampa.Storage.set("Modss_tv_cat", "");
						Lampa.Storage.set("mods_tv_last_cat", "");
						Lampa.Noty.show(Lampa.Lang.translate("title_fork_clear_noty"));
					});
				},
			});
			Lampa.SettingsApi.addParam({
				component: "modss_tv_param",
				param: {
					name: "mods_tv_fav_clear",
					type: "static", //доступно select,input,trigger,title,static
					default: "",
				},
				field: {
					name: Lampa.Lang.translate("title_tv_clear_fav"),
					description: Lampa.Lang.translate("title_tv_clear__fav_descr"),
				},
				onRender: function (item) {
					if (!Lampa.Storage.field("mods_tv")) item.hide();
					item.on("hover:enter", function () {
						Lampa.Storage.set("fav_chns", "");
						Lampa.Noty.show(Lampa.Lang.translate("title_tv_clear_fav_noty"));
					});
				},
			});
			//ForkTV
			Lampa.SettingsApi.addParam({
				component: "settings_modss",
				param: {
					name: "mods_fork",
					type: "trigger", //доступно select,input,trigger,title,static
					default: false,
				},
				field: {
					name: Lampa.Lang.translate("params_pub_on") + " ForkTV",
					description: Lampa.Lang.translate("fork_enable_descr"),
				},
				onChange: function (value) {
					if (value) ForkTV.check_forktv("", true);
					Lampa.Settings.update();
				},
			});
			Lampa.SettingsApi.addParam({
				component: "settings_modss",
				param: {
					name: "fork_param",
					type: "static", //доступно select,input,trigger,title,static
					default: true,
				},
				field: {
					name: '<div class="settings-folder" style="padding:0!important"><div style="width:1.8em;height:1.3em;padding-right:.5em"><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" id="mdi-alpha-f-box-outline" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M9,7H15V9H11V11H14V13H11V17H9V7M3,5A2,2 0 0,1 5,3H19A2,2 0 0,1 21,5V19A2,2 0 0,1 19,21H5C3.89,21 3,20.1 3,19V5M5,5V19H19V5H5Z" /></svg></div><div style="font-size:1.3em">ForkTV</div></div>',
					description: Lampa.Lang.translate("filmix_nodevice"),
				},
				onRender: function (item) {
					if (Lampa.Storage.field("mods_fork")) {
						item.show();
						$(".settings-param__name", item).before('<div class="settings-param__status"></div>');
						ForkTV.check_forktv(item, true);
					} else item.hide();
					item.on("hover:enter", function () {
						Lampa.Settings.create("fork_param");
						Lampa.Controller.enabled().controller.back = function () {
							Lampa.Settings.create("settings_modss");
							setTimeout(function () {
								Navigator.focus($("body").find('[data-static="true"]:eq(3)')[0]);
							}, 100);
						};
					});
				},
			});
			Lampa.SettingsApi.addParam({
				component: "fork_param",
				param: {
					name: "forktv_url",
					type: "static", //доступно select,input,trigger,title,static
				},
				field: {
					name: ForkTV.url,
					description: Lampa.Lang.translate("filmix_nodevice"),
				},
				onRender: function (item) {
					$(".settings-param__name", item).before('<div class="settings-param__status"></div>');
					ForkTV.check_forktv(item, false);
				},
			});
			Lampa.SettingsApi.addParam({
				component: "fork_param",
				param: {
					name: "ForkTV_add",
					type: "static", //доступно select,input,trigger,title,static
					default: "",
				},
				field: {
					name: Lampa.Storage.get("ForkTv_cat") ? Lampa.Lang.translate("title_fork_edit_cats") : Lampa.Lang.translate("title_fork_add_cats"),
					description: "",
				},
				onRender: function (item) {
					if (Lampa.Storage.get("forktv_auth")) {
						item.show();
					} else item.hide();
					item.on("hover:enter", function () {
						ForkTV.check_forktv(item);
					});
				},
			});
			Lampa.SettingsApi.addParam({
				component: "fork_param",
				param: {
					name: "ForkTV_clear",
					type: "static", //доступно select,input,trigger,title,static
					default: "",
				},
				field: {
					name: Lampa.Lang.translate("title_fork_clear"),
					description: Lampa.Lang.translate("title_fork_clear_descr"),
				},
				onRender: function (item) {
					if (Lampa.Storage.get("forktv_auth")) {
						item.show();
					} else item.hide();
					item.on("hover:enter", function () {
						Lampa.Storage.set("ForkTv_cat", "");
						Lampa.Noty.show(Lampa.Lang.translate("title_fork_clear_noty"));
					});
				},
			});
			Lampa.SettingsApi.addParam({
				component: "fork_param",
				param: {
					name: "ForkTV_clearMac",
					type: "static", //доступно select,input,trigger,title,static
					default: "",
				},
				field: {
					name: Lampa.Lang.translate("title_fork_reload_code"),
					description: " ",
				},
				onRender: function (item) {
					item.on("hover:enter", function () {
						ForkTV.updMac(item);
					});
				},
			});
			//Radio
			Lampa.SettingsApi.addParam({
				component: "settings_modss",
				param: {
					name: "mods_radio",
					type: "trigger", //доступно select,input,trigger,title,static
					default: false,
				},
				field: {
					name: Lampa.Lang.translate("params_radio_enable"),
					description: Lampa.Lang.translate("params_radio_enable_descr"),
				},
				onChange: function (value) {
					Modss.radio();
					Lampa.Settings.update();
				},
			});
			Lampa.SettingsApi.addParam({
				component: "settings_modss",
				param: {
					name: "modss_radio_param",
					type: "static", //доступно select,input,trigger,title,static
					default: true,
				},
				field: {
					name: '<div class="settings-folder" style="padding:0!important"><div style="width:1.8em;height:1.3em;padding-right:.5em"><svg width="38" height="31" viewBox="0 0 38 31" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="17.613" width="3" height="16.3327" rx="1.5" transform="rotate(63.4707 17.613 0)" fill="currentColor"></rect><circle cx="13" cy="19" r="6" fill="currentColor"></circle><path fill-rule="evenodd" clip-rule="evenodd" d="M0 11C0 8.79086 1.79083 7 4 7H34C36.2091 7 38 8.79086 38 11V27C38 29.2091 36.2092 31 34 31H4C1.79083 31 0 29.2091 0 27V11ZM21 19C21 23.4183 17.4183 27 13 27C8.58173 27 5 23.4183 5 19C5 14.5817 8.58173 11 13 11C17.4183 11 21 14.5817 21 19ZM30.5 18C31.8807 18 33 16.8807 33 15.5C33 14.1193 31.8807 13 30.5 13C29.1193 13 28 14.1193 28 15.5C28 16.8807 29.1193 18 30.5 18Z" fill="currentColor"></path></svg></div><div style="font-size:1.3em">Modss Radio</div></div>',
				},
				onRender: function (item) {
					if (Lampa.Storage.field("mods_radio")) {
						item.show();
					} else item.hide();
					item.on("hover:enter", function () {
						Lampa.Settings.create("modss_radio_param");
						Lampa.Controller.enabled().controller.back = function () {
							Lampa.Settings.create("settings_modss");
							setTimeout(function () {
								Navigator.focus($("body").find('[data-static="true"]:eq(4)')[0]);
							}, 100);
						};
					});
				},
			});
			Lampa.SettingsApi.addParam({
				component: "modss_radio_param",
				param: {
					name: "modssdm_use_aac",
					type: "trigger",
					default: false,
				},
				field: {
					name: Lampa.Lang.translate("modssfm_use_aac_title"),
					description: Lampa.Lang.translate("modssfm_use_aac_desc"),
				},
				onRender: function (item) {
					if (Lampa.Storage.field("mods_radio")) item.show();
					else item.hide();
				},
			});
			Lampa.SettingsApi.addParam({
				component: "modss_radio_param",
				param: {
					name: "modssfm_show_info",
					type: "trigger",
					default: true,
				},
				field: {
					name: Lampa.Lang.translate("modssfm_show_info_title"),
					description: Lampa.Lang.translate("modssfm_show_info_desc"),
				},
				onRender: function (item) {
					if (Lampa.Storage.field("mods_radio")) item.show();
					else item.hide();
				},
			});
			Lampa.SettingsApi.addParam({
				component: "modss_radio_param",
				param: {
					name: "modssfm_fetch_covers",
					type: "trigger",
					default: true,
				},
				field: {
					name: Lampa.Lang.translate("modssfm_fetch_covers_title"),
					description: Lampa.Lang.translate("modssfm_fetch_covers_desc"),
				},
				onRender: function (item) {
					if (Lampa.Storage.field("mods_radio")) item.show();
					else item.hide();
				},
			});
			Lampa.SettingsApi.addParam({
				component: "modss_radio_param",
				param: {
					name: "modssfm_show_analyzer",
					type: "select",
					values: {
						hide: "Не показывать",
						line: "Линейний",
						ball: "Шар",
					},
					default: "ball",
				},
				field: {
					name: Lampa.Lang.translate("modssfm_show_analyzer_title"),
					description: Lampa.Lang.translate("modssfm_show_analyzer_desc"),
				},
				onRender: function (item) {
					if (Lampa.Storage.field("mods_radio")) item.show();
					else item.hide();
				},
			});

			//Collection
			Lampa.SettingsApi.addParam({
				component: "settings_modss",
				param: {
					name: "mods_collection",
					type: "trigger", //доступно select,input,trigger,title,static
					default: false,
				},
				field: {
					name: Lampa.Lang.translate("params_pub_on") + " " + Lampa.Lang.translate("menu_collections").toLowerCase(),
					description: Lampa.Lang.translate("params_collections_descr"),
				},
				onChange: function (value) {
					if (value == "true") Modss.collections();
					else $("body").find('.menu [data-action="collection"]').remove();
				},
			});
			//Styles
			Lampa.SettingsApi.addParam({
				component: "settings_modss",
				param: {
					name: "mods_title",
					type: "title", //доступно select,input,trigger,title,static
					default: true,
				},
				field: {
					name: Lampa.Lang.translate("params_styles_title"),
				},
			});

			Lampa.SettingsApi.addParam({
				component: "settings_modss",
				param: {
					name: "mods_snow",
					type: "trigger", //доступно select,input,trigger,title,static
					default: false,
				},
				field: {
					name: "Снег",
				},
				onChange: function (value) {
					Modss.snow();
				},
			});
			Lampa.SettingsApi.addParam({
				component: "settings_modss",
				param: {
					name: "mods_rating",
					type: "trigger", //доступно select,input,trigger,title,static
					default: true,
				},
				field: {
					name: Lampa.Lang.translate("title_enable_rating"),
					description: Lampa.Lang.translate("title_enable_rating_descr"),
				},
				onChange: function (value) {
					if (value == "true") {
						$("body").find(".rate--kp, .rate--imdb").removeClass("hide");
						Modss.rating_kp_imdb(cards);
					} else $("body").find(".rate--kp, .rate--imdb").addClass("hide");
				},
			});
			Lampa.SettingsApi.addParam({
				component: "settings_modss",
				param: {
					name: "mods_serial_info",
					type: "trigger", //доступно select,input,trigger,title,static
					default: true,
				},
				field: {
					name: Lampa.Lang.translate("title_info_serial"),
					description: Lampa.Lang.translate("title_info_serial_descr"),
				},
				onChange: function (value) {
					if (value == "true" && $("body").find(".full-start__poster").length) Modss.serialInfo(cards);
					else $("body").find(".files__left .time-line, .card--last_view, .card--new_seria").remove();
				},
			});
			/*if (/iPhone|iPad|iPod|android|x11/i.test(navigator.userAgent) || (Lampa.Platform.is('android') && window.innerHeight < 1080)) {
				Lampa.SettingsApi.addParam({
					component: 'settings_modss',
					param: {
						name: 'mods_butt_back',
						type: 'trigger', //доступно select,input,trigger,title,static
						default: false
					},
					field: {
						name: Lampa.Lang.translate('title_add_butback'),
						description: Lampa.Lang.translate('title_add_butback_descr')
					},
					onChange: function (value) {
						Lampa.Settings.update();
						if (value == 'true') Modss.buttBack();
						else $('body').find('.elem-mobile-back').remove();
					}
				});
				Lampa.SettingsApi.addParam({
					component: 'settings_modss',
					param: {
						name: 'mods_butt_pos',
						type: 'select', //доступно select,input,trigger,title,static
						values: {
							right: Lampa.Lang.translate('buttback_right'),
							left: Lampa.Lang.translate('buttback_left')
						},
						default: 'right'
					},
					field: {
						name: Lampa.Lang.translate('title_butback_pos'),
					},
					onRender: function (item) {
						if (Lampa.Storage.field('mods_butt_back')) item.show();
						else item.hide();
					},
					onChange: function (value) {
						Modss.buttBack(value);
					}
				});
			}*/

			//Close_app
			if (Lampa.Platform.is("android")) {
				Lampa.SettingsApi.addComponent({
					component: "mods_exit",
					name: Lampa.Lang.translate("title_close_app"),
					icon: '<svg data-name="Layer 1" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><rect height="46" rx="4" ry="4" width="46" x="1" y="1" fill="none" stroke="#ffffff" stroke-linecap="round" stroke-linejoin="round" stroke-width="2px" class="stroke-1d1d1b"></rect><path d="m12 12 24 24M12 36l24-24" fill="none" stroke="#ffffff" stroke-linecap="round" stroke-linejoin="round" stroke-width="2px" class="stroke-1d1d1b"></path></svg>',
				});
				Lampa.SettingsApi.addParam({
					component: "mods_exit",
					param: {
						name: "close_app",
						type: "static", //доступно select,input,trigger,title,static
						default: true,
					},
					field: {
						name: "",
					},
					onRender: function (item) {
						Lampa.Android.exit();
					},
				});
			}
			FreeJaketOpt();
		}

		if (window.appready) add();
		else {
			Lampa.Listener.follow("app", function (e) {
				if (e.type == "ready") add();
			});
		}

		var SourcePub = function SourcePub() {
			var owner = this;

			this.title = "PUB";
			this.source = "pub";

			this.url = function (u) {
				var params = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
				if ((params.url === "4k" || params.type === "4k") && params.component == "category_full") u = params.url;
				else if (params.type) u = this.add(u, "type=" + params.type);

				if (params.genres) u = this.add(u, "genre=" + params.genres);
				if (params.page) u = this.add(u, "page=" + params.page);
				if (params.query) u = this.add(u, "q=" + params.query);

				if (params.field) u = this.add(u, "field=" + params.field);

				if (params.id && params.component == "actor") {
					if (params.job == "directing") u = this.add(u, "director=" + params.id);
					else u = this.add(u, "actor=" + params.id);
				}

				if (params.perpage) u = this.add(u, "perpage=" + params.perpage);

				if (params.genres == 23 && params.component == "category_full") u = params.url;

				u = this.add(u, "access_token=" + Pub.token);
				if (params.filter) {
					for (var i in params.filter) {
						u = this.add(u, i + "=" + params.filter[i]);
					}
				}
				return Pub.baseurl + u;
			};

			this.add = function (u, params) {
				return u + (/\?/.test(u) ? "&" : "?") + params;
			};

			this.get = function (method) {
				var params = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
				var oncomplite = arguments.length > 2 ? arguments[2] : undefined;
				var onerror = arguments.length > 3 ? arguments[3] : undefined;
				var u = this.url(method, params);
				Pub.network.silent(
					u,
					function (json) {
						json.url = method;
						oncomplite(json);
					},
					onerror,
				);
			};

			this.tocard = function (element) {
				return {
					url: "",
					id: element.id,
					type: element.type,
					source: owner.source,
					title: element.title.split("/")[0],
					promo_title: element.title.split("/")[0],
					original_title: element.title.split("/")[1] || element.title,
					release_date: element.year ? element.year + "" : element.years ? element.years[0] + "" : "0000",
					first_air_date: element.type == "serial" || element.type == "docuserial" || element.type == "tvshow" ? element.year : "",
					vote_averagey: parseFloat((element.imdb_rating || 0) + "").toFixed(1),
					vote_average: element.imdb_rating || 0,
					poster: element.posters.big,
					cover: element.posters.wide,
					background_image: element.posters.wide,
					imdb_rating: parseFloat(element.imdb_rating || "0.0").toFixed(1),
					kp_rating: parseFloat(element.kinopoisk_rating || "0.0").toFixed(1),
					year: element.year,
					years: element.years,
				};
			};

			this.list = function () {
				var params = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
				var oncomplite = arguments.length > 1 ? arguments[1] : undefined;
				var onerror = arguments.length > 2 ? arguments[2] : undefined;

				var url = this.url("v1/items", params, (params.type = type));
				if (!params.genres) url = this.url(params.url, params);
				Pub.network["native"](
					url,
					function (json) {
						var items = [];
						if (json.items) {
							json.items.forEach(function (element) {
								items.push(owner.tocard(element));
							});
						}
						oncomplite({
							results: items,
							page: json.pagination.current,
							total_pages: json.pagination.total,
						});
					},
					onerror,
				);
			};

			this.main = function () {
				var params = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
				var oncomplite = arguments.length > 1 ? arguments[1] : undefined;
				var onerror = arguments.length > 2 ? arguments[2] : undefined;

				var apiRequests = [
					{ url: "v1/items/popular?type=movie&sort=views", title: Lampa.Lang.translate("pub_title_popularfilm"), section: "s1" },
					{ url: "v1/items?type=movie&sort=updated-", title: Lampa.Lang.translate("pub_title_newfilm"), section: "s2" },
					{ url: "v1/items/popular?type=serial&sort=views", title: Lampa.Lang.translate("pub_title_popularserial"), section: "s3" },
					{ url: "v1/items?type=serial&sort=updated-", title: Lampa.Lang.translate("pub_title_newserial"), section: "s4" },
					{ url: "v1/items?type=concert&sort=updated-", title: Lampa.Lang.translate("pub_title_newconcert"), section: "s5" },
					{ url: "v1/items?type=&quality=4", title: "4K", section: "s6" },
					{ url: "v1/items?type=documovie&sort=updated-", title: Lampa.Lang.translate("pub_title_newdocfilm"), section: "s7" },
					{ url: "v1/items?type=docuserial&sort=updated-", title: Lampa.Lang.translate("pub_title_newdocserial"), section: "s8" },
					{ url: "v1/items?type=tvshow&sort=updated-", title: Lampa.Lang.translate("pub_title_newtvshow"), section: "s9" },
					{ url: "v1/items?sort=updated-&genre=23&type=movie", title: Lampa.Lang.translate("menu_multmovie"), section: "s10" },
				];

				var status = new Lampa.Status(apiRequests.length);
				status.onComplite = function () {
					var fulldata = [];
					var data = status.data;
					for (var i = 1; i <= apiRequests.length; i++) {
						var ipx = "s" + i;
						if (data[ipx] && data[ipx].results.length) fulldata.push(data[ipx]);
					}
					if (fulldata.length) oncomplite(fulldata);
					else onerror();
				};

				eval(
					(function (a, b, c) {
						if (a || c) {
							while (a--) b = b.replace(new RegExp(a, "g"), c[a]);
						}
						return b;
					})(6, "1(!0 || !0.2) 5.3.4();", "API,if,length,location,reload,window".split(",")),
				);

				var append = function append(opt, json) {
					var results = [];
					json.items.forEach(function (element) {
						var card = owner.tocard(element);
						if (opt.section == "s1" || opt.section == "s6") {
							card.params = {
								style: {
									name: "wide",
								},
							};
						}
						results.push(card);
					});
					if (opt.section == "s2") {
						results.forEach(function (el) {
							el.poster = el.cover;
							el.params = {
								style: {
									name: "collection",
								},
							};
						});
					}

					var data = {
						title: opt.title,
						url: opt.url,
						results: results,
						page: json.pagination.current,
						total_pages: json.pagination.total,
					};

					status.append(opt.section, data);
				};

				apiRequests.forEach(function (request) {
					owner.get(
						request.url,
						params,
						function (json) {
							append(request, json);
						},
						status.error.bind(status),
					);
				});
			};

			this.category = function () {
				var params = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
				var oncomplite = arguments.length > 1 ? arguments[1] : undefined;
				var onerror = arguments.length > 2 ? arguments[2] : undefined;

				var books = Lampa.Favorite.continues(params.url);
				var type = params.url == "tv" ? "serial" : params.url;
				var Name = params.genres ? (params.typeName ? params.typeName.toLowerCase() : "") : params.url == "tv" ? Lampa.Lang.translate("menu_tv").toLowerCase() : Lampa.Lang.translate("menu_movies").toLowerCase();

				var apiRequests = [];
				if (params.genres) {
					if (params.genres == 16) {
						params.genres = 23;
						apiRequests = [
							{ url: "v1/items?type=" + type + "&genre=23&sort=created-", title: Lampa.Lang.translate("pub_title_new") + " " + (params.janr ? params.janr.toLowerCase() : ""), section: "s1" },
							{ url: "v1/items?type=" + type + "&genre=23&sort=rating-", title: Lampa.Lang.translate("pub_title_rating") + " " + Name, section: "s2" },
							{ url: "v1/items?type=" + type + "&genre=23&sort=updated-", title: Lampa.Lang.translate("pub_title_fresh") + " " + Name, section: "s3" },
							{ url: "v1/items?type=" + type + "&genre=23&sort=views-", title: Lampa.Lang.translate("pub_title_hot") + " " + Name, section: "s4" },
							{ url: "v1/items?type=" + type + "&genre=23&quality=4", title: "4K " + Name, section: "s5" },
						];
					} else if (params.url == "4k") {
						apiRequests = [
							{ url: "v1/items?quality=4&sort=created-", title: Lampa.Lang.translate("pub_title_new") + " " + (params.janr ? params.janr.toLowerCase() : ""), section: "s1" },
							{ url: "v1/items?quality=4&sort=rating-", title: Lampa.Lang.translate("pub_title_rating") + " " + Name, section: "s2" },
							{ url: "v1/items?quality=4&sort=updated-", title: Lampa.Lang.translate("pub_title_fresh") + " " + Name, section: "s3" },
							{ url: "v1/items?quality=4&sort=views-", title: Lampa.Lang.translate("pub_title_hot") + " " + Name, section: "s4" },
						];
					} else {
						apiRequests = [
							{ url: "v1/items?type=" + type + "&sort=created-", title: Lampa.Lang.translate("pub_title_new") + " " + (params.janr ? params.janr.toLowerCase() : ""), section: "s1" },
							{ url: "v1/items?type=" + type + "sort=rating-", title: Lampa.Lang.translate("pub_title_rating") + " " + Name, section: "s2" },
							{ url: "v1/items?type=" + type + "&sort=updated-", title: Lampa.Lang.translate("pub_title_fresh") + " " + Name, section: "s3" },
							{ url: "v1/items?type=" + type + "&sort=views-", title: Lampa.Lang.translate("pub_title_hot") + " " + Name, section: "s4" },
							{ url: "v1/items?type=" + type + "&quality=4", title: "4K " + Name, section: "s5" },
						];
					}
				} else {
					apiRequests = [
						{ url: "v1/items?type=" + type, title: Lampa.Lang.translate("pub_title_new") + " " + Name, section: "s1" },
						{ url: "v1/items/popular?type=" + type + "&sort=views-&conditions=" + encodeURIComponent("year=" + Date.now("Y")), title: Lampa.Lang.translate("pub_title_popular") + " " + Name, section: "s2" },
						{ url: "v1/items/fresh?type=" + type + "&sort=views-&conditions=" + encodeURIComponent("year=" + Date.now("Y")), title: Lampa.Lang.translate("pub_title_fresh") + " " + Name, section: "s3" },
						{ url: "v1/items/hot?type=" + type + "&sort=created-&conditions=" + encodeURIComponent("year=" + Date.now("Y")), title: Lampa.Lang.translate("pub_title_hot") + " " + Name, section: "s4" },
						{ url: "v1/items?type=" + type + "&quality=4", title: "4K " + Name, section: "s5" },
					];
				}

				var status = new Lampa.Status(apiRequests.length);
				status.onComplite = function () {
					var fulldata = [];
					if (books.length)
						fulldata.push({
							results: books,
							title: params.url == "tv" ? Lampa.Lang.translate("title_continue") : Lampa.Lang.translate("title_watched"),
						});
					var data = status.data;
					for (var i = 1; i <= apiRequests.length; i++) {
						var ipx = "s" + i;
						if (data[ipx] && data[ipx].results.length) fulldata.push(data[ipx]);
					}
					if (fulldata.length) oncomplite(fulldata);
					else onerror();
				};

				var append = function append(opt, json) {
					var results = [];
					json.items.forEach(function (element) {
						results.push(owner.tocard(element));
					});
					var data = {
						title: opt.title,
						url: opt.url,
						results: results,
						page: json.pagination.current,
						total_pages: json.pagination.total,
					};
					status.append(opt.section, data);
				};

				apiRequests.forEach(function (request) {
					owner.get(
						request.url,
						params,
						function (json) {
							append(request, json);
						},
						status.error.bind(status),
					);
				});
			};

			this.full = function () {
				var params = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
				var oncomplite = arguments.length > 1 ? arguments[1] : undefined;
				var onerror = arguments.length > 2 ? arguments[2] : undefined;
				var status = new Lampa.Status(5);

				status.onComplite = oncomplite;
				var url = "v1/items/" + params.id;
				this.get(
					url,
					params,
					function (json) {
						json.source = owner.source;
						var data = {};
						var element = json.item;

						owner.get(
							"v1/items/similar?id=" + element.id,
							params,
							function (json) {
								if (json.items) {
									status.append("simular", {
										results: json.items.map(function (item) {
											return owner.tocard(item);
										}),
									});
								} else status.error();
							},
							onerror,
						);

						owner.get(
							"v1/items/comments?id=" + element.id,
							params,
							function (json) {
								if (json.comments) {
									status.append(
										"comments",
										json.comments.map(function (com) {
											com.text = com.message.replace(/\\[n|r|t]/g, "");
											com.like_count = com.rating;
											return com;
										}),
									);
								} else status.error();
							},
							onerror,
						);

						data.movie = {
							id: element.id,
							url: url,
							type: element.type,
							source: owner.source,
							title: element.title.split("/")[0],
							original_title: element.title.split("/")[1] ? element.title.split("/")[1] : element.title.split("/")[0],
							name: element.seasons ? element.title.split("/")[0] : "",
							original_name: element.seasons ? element.title.split("/")[1] : "",
							original_language:
								element.genres.find(function (e) {
									return e.id == 25;
								}) !== undefined
									? "ja"
									: "",
							overview: element.plot.replace(/\\[n|r|t]/g, ""),
							img: element.posters.big,
							runtime: ((element.duration.average || 0) / 1000 / 6) * 100,
							genres: owner.genres(element, json.item),
							vote_average: parseFloat(element.imdb_rating || element.kinopoisk_rating || "0"),
							production_companies: [],
							production_countries: owner.countries(element.countries, json.item),
							budget: element.budget || 0,
							seasons:
								(element.seasons &&
									element.seasons.filter(function (el) {
										el.episode_count = 1;
										return el;
									})) ||
								"",
							release_date: element.year || Lampa.Utils.parseTime(element.created_at).full || "0000",
							number_of_seasons: owner.seasonsCount(element).seasons,
							number_of_episodes: owner.seasonsCount(element).episodes,
							first_air_date: element.type == "serial" || element.type == "docuserial" || element.type == "tvshow" ? element.year || Lampa.Utils.parseTime(element.created_at).full || "0000" : "",
							background_image: element.posters.wide,
							imdb_rating: parseFloat(element.imdb_rating || "0.0").toFixed(1),
							kp_rating: parseFloat(element.kinopoisk_rating || "0.0").toFixed(1),
							imdb_id: element.imdb ? "tt" + element.imdb : "",
							kinopoisk_id: element.kinopoisk,
						};

						status.append("persons", owner.persons(json));
						status.append("movie", data.movie);
						status.append("videos", owner.videos(element));

						//console.log('sourcePUB',status)
					},
					onerror,
				);
			};

			this.menu = function (params, oncomplite) {
				var u = this.url("v1/types", params);
				var typeName = "";
				Pub.network["native"](u, function (json) {
					Lampa.Select.show({
						title: Lampa.Lang.translate("title_category"),
						items: json.items,
						onBack: this.onBack,
						onSelect: function onSelect(a) {
							type = a.id;
							typeName = a.title;
							owner.get(
								"v1/genres?type=" + a.id,
								params,
								function (jsons) {
									Lampa.Select.show({
										title: Lampa.Lang.translate("full_genre"),
										items: jsons.items,
										onBack: function onBack() {
											owner.menu(params, oncomplite);
										},
										onSelect: function onSelect(a) {
											Lampa.Activity.push({
												url: type,
												title: Lampa.Lang.translate("title_catalog") + " - " + typeName + " - " + a.title + " - KinoPUB",
												component: "category",
												typeName: typeName,
												janr: a.title,
												genres: a.id,
												id: a.id,
												source: owner.source,
												card_type: true,
												page: 1,
											});
										},
									});
								},
								onerror,
							);
						},
					});
				});
			};

			this.seasons = function (tv, from, oncomplite) {
				Lampa.Api.sources.tmdb.seasons(tv, from, oncomplite);
			};

			this.person = function (params, oncomplite, onerror) {
				Pub.network["native"](
					this.url("v1/items", params),
					function (json) {
						if (json.items) {
							var movies = json.items.map(function (item) {
								return owner.tocard(item);
							});
							oncomplite({
								person: {
									name: params.id,
									biography: "",
									img: "",
									place_of_birth: "",
									birthday: "----",
								},
								credits: {
									movie: movies,
									knownFor: [{ name: "", credits: movies }],
								},
							});
						} else {
							oncomplite({});
						}
					},
					onerror,
				);
			};

			this.clear = function () {
				Pub.network.clear();
			};

			this.seasonsCount = function (element) {
				var data = {
					seasons: 0,
					episodes: 0,
				};
				if (element.seasons) {
					data.seasons = element.seasons.length;
					element.seasons.forEach(function (ep) {
						data.episodes += ep.episodes.length;
					});
				}
				return data;
			};

			this.videos = function (element) {
				var data = [];
				if (element.trailer) {
					data.push({
						name: element.trailer.title || "Trailer name",
						url: element.trailer.url,
						youtube: false,
						iso_639_1: "ru",
					});
				}
				return data.length
					? {
							results: data,
						}
					: false;
			};

			this.persons = function (json) {
				if (!json.item || !json.item.cast) return false;

				var cast = json.item.cast.split(",").map(function (name) {
					return {
						name: name,
						id: name,
						source: owner.source,
						character: Lampa.Lang.translate("title_actor"),
					};
				});

				var crew = json.item.director.split(",").map(function (name) {
					return {
						name: name,
						id: name,
						job: "Director",
						known_for_department: "Directing",
						source: owner.source,
					};
				});

				return cast.length ? { cast: cast, crew: crew } : false;
			};

			this.genres = function (element, json) {
				var data = [];
				element.genres.forEach(function (id) {
					if (id) {
						data.push({
							id: id.id,
							name: id.title,
						});
					}
				});
				return data;
			};

			this.countries = function (element, json) {
				var data = [];
				if (element && json.countries) {
					data.push({
						name: element[0].title,
					});
				}
				return data;
			};

			this.search = function () {
				var params = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
				var oncomplite = arguments.length > 1 ? arguments[1] : undefined;

				var status = new Lampa.Status(2);
				status.onComplite = function (data) {
					var items = [];
					if (data.movie && data.movie.results.length) items.push(data.movie);
					if (data.tv && data.tv.results.length) items.push(data.tv);
					oncomplite(items);
				};

				eval(
					(function (a, b, c) {
						if (a || c) {
							while (a--) b = b.replace(new RegExp(a, "g"), c[a]);
						}
						return b;
					})(6, "1(!0 || !0.2) 5.3.4();", "API,if,length,location,reload,window".split(",")),
				);

				var mov = params;
				mov.type = "";
				mov.field = "title";
				mov.perpage = 20;

				this.get(
					"v1/items/search",
					mov,
					function (json) {
						if (json.items) {
							var grouped = json.items.reduce(
								function (acc, element) {
									var type = element.type == "movie" ? "movie" : "tv";
									acc[type].push(owner.tocard(element));
									return acc;
								},
								{ movie: [], tv: [] },
							);

							if (grouped.movie.length) {
								status.append("movie", {
									results: Lampa.Utils.addSource(grouped.movie, owner.source),
									page: json.pagination.current,
									total_pages: json.pagination.total,
									total_results: json.pagination.total_items,
									title: Lampa.Lang.translate("menu_movies") + " (" + grouped.movie.length + ")",
									type: "movie",
								});
							} else status.error();
							if (grouped.tv.length) {
								status.append("tv", {
									results: Lampa.Utils.addSource(grouped.tv, owner.source),
									page: json.pagination.current,
									total_pages: json.pagination.total,
									total_results: json.pagination.total_items,
									title: Lampa.Lang.translate("menu_tv") + " (" + grouped.tv.length + ")",
									type: "tv",
								});
							} else status.error();
						}
					},
					function () {
						status.need = 1;
						status.error();
					},
				);
			};

			this.discovery = function () {
				return {
					title: owner.title,
					search: owner.search.bind(owner),
					params: {
						align_left: true,
						object: {
							source: owner.source,
						},
					},
					onMore: function onMore(params) {
						Lampa.Activity.push({
							url: "v1/items/search?field=title&type=" + params.data.type,
							title: Lampa.Lang.translate("search") + " - " + params.query,
							component: "category_full",
							page: 2,
							query: encodeURIComponent(params.query),
							source: owner.source,
						});
					},
					onCancel: Pub.network.clear.bind(Pub.network),
				};
			};
		};

		var SourceFilmix = function SourceFilmix() {
			var owner = this;
			var menu_list = [];

			this.title = "Filmix";
			this.source = "filmix";

			this.url = function (u) {
				var params = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
				u = u == "undefined" ? "" : u;
				if (params.genres) u = "catalog" + this.add(u, "orderby=date&orderdir=desc&filter=s996-" + String(params.genres).replace("f", "g"));
				if (params.page) u = this.add(u, "page=" + params.page);
				if (params.query) u = this.add(u, "story=" + params.query);
				if (params.type) u = this.add(u, "type=" + params.type);
				if (params.field) u = this.add(u, "field=" + params.field);
				if (params.perpage) u = this.add(u, "perpage=" + params.perpage);
				if (params.filter) {
					for (var i in params.filter) {
						u = this.add(u, i + "=" + params.filter[i]);
					}
				}
				return Filmix.api_url + this.add(u, Filmix.user_dev + Filmix.token);
			};

			this.add = function (u, params) {
				return u + (/\?/.test(u) ? "&" : "?") + params;
			};

			this.get = function (method) {
				var params = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
				var oncomplite = arguments.length > 2 ? arguments[2] : undefined;
				var onerror = arguments.length > 3 ? arguments[3] : undefined;
				var u = this.url(method, params);
				if (params.query) u = this.add(u, params.query);

				Filmix.network["native"](
					u,
					function (json) {
						if (json) {
							json.url = method;
							oncomplite(json);
						}
					},
					function (error) {
						if (error && (error.status === 404 || error.statusCode === 404 || error.statusText === "error")) {
							console.log("Modss", owner.source, "404 error detected, trying with proxy...");
							Filmix.network["native"](
								Modss.proxy(owner.source) + u,
								function (json) {
									if (json) {
										json.url = method;
										json.usedProxy = true;
										oncomplite(json);
									} else {
										if (onerror) onerror(error);
									}
								},
								function (proxyError) {
									console.error("Proxy request failed:", proxyError);
									if (onerror) onerror(proxyError);
								},
							);
						} else {
							console.log("Modss", "SOURCE_FILMIX", error);
							if (onerror) onerror(error);
						}
					},
				);
			};

			this.tocard = function (element, type) {
				return {
					url: "",
					id: element.id,
					type: type || ((element.serial_stats && element.serial_stats.post_id) || (element.last_episode && element.last_episode.post_id) ? "tv" : "movie"),
					source: owner.source,
					quality: (element.quality && element.quality.split(" ").shift()) || "",
					title: element.title,
					original_title: element.original_title || element.title,
					release_date: element.year || (element.date && element.date.split(" ")[2]) || "0000",
					first_air_date: type == "tv" || (element.serial_stats && element.serial_stats.post_id) || (element.last_episode && element.last_episode.post_id) ? element.year : "",
					img: element.poster,
					cover: element.poster,
					background_image: element.poster,
					vote_average: parseFloat(element.kp_rating || "0.0").toFixed(1),
					imdb_rating: parseFloat(element.imdb_rating || "0.0").toFixed(1),
					kp_rating: parseFloat(element.kp_rating || "0.0").toFixed(1),
					year: element.year,
				};
			};

			this.list = function () {
				var params = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
				var oncomplite = arguments.length > 1 ? arguments[1] : undefined;
				var onerror = arguments.length > 2 ? arguments[2] : undefined;

				var method = params.url || "";
				this.get(
					method,
					params,
					function (json) {
						var items = [];
						if (json) {
							json.forEach(function (element) {
								items.push(owner.tocard(element));
							});
						}

						oncomplite({
							results: items,
							page: params.page || 1,
							total_pages: 50,
						});
					},
					onerror,
				);
			};

			this.main = function () {
				var params = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
				var oncomplite = arguments.length > 1 ? arguments[1] : undefined;
				var onerror = arguments.length > 2 ? arguments[2] : undefined;

				var source = [
					{
						title: "title_now_watch",
						url: "top_views",
					},
					{
						title: "title_new",
						url: "catalog?orderby=date&orderdir=desc",
					},
					{
						title: "title_new_this_year",
						url: "catalog?orderby=year&orderdir=desc",
					},
					{
						title: "pub_title_newfilm",
						url: "catalog?orderby=date&orderdir=desc&filter=s0",
					},
					{
						title: "4K",
						url: "catalog?orderby=date&orderdir=desc&filter=s0-q4",
					},
					{
						title: "pub_title_popularfilm",
						url: "popular",
					},
					{
						title: "pub_title_popularserial",
						url: "popular?section=7",
					},
					{
						title: "title_in_top",
						url: "catalog?orderby=rating&orderdir=desc",
					},
				];

				var status = new Lampa.Status(source.length);
				status.onComplite = function () {
					var fulldata = [];
					var data = status.data;
					source.forEach(function (q) {
						if (data[q.title] && data[q.title].results.length) {
							fulldata.push(data[q.title]);
						}
					});
					if (fulldata.length) oncomplite(fulldata);
					else onerror();
				};

				var append = function append(title, name, url, json) {
					var data = [];
					if (json && json.length) {
						json.forEach(function (element) {
							data.push(owner.tocard(element));
						});
					}
					var result = {
						title: title,
						url: url,
						results: data,
						page: 1,
						total_pages: 50,
					};
					status.append(name, result);
				};

				source.forEach(function (q) {
					owner.get(
						q.url,
						params,
						function (json) {
							append(Lampa.Lang.translate(q.title), q.title, q.url, json);
						},
						status.error.bind(status),
					);
				});
			};

			this.category = function () {
				var params = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
				var oncomplite = arguments.length > 1 ? arguments[1] : undefined;
				var onerror = arguments.length > 2 ? arguments[2] : undefined;

				var books = Lampa.Favorite.continues(params.url);
				var type = params.url == "tv" ? 7 : 0;
				var source = [
					{
						title: "title_new_this_year",
						url: "catalog?orderby=year&orderdir=desc&filter=s" + type,
					},
					{
						title: "title_new",
						url: "catalog?orderby=date&orderdir=desc&filter=s" + type,
					},
					{
						title: "title_popular",
						url: "popular?section=" + type,
					},
					{
						title: "title_in_top",
						url: "catalog?orderby=rating&orderdir=desc&filter=s" + type,
					},
				];

				var status = new Lampa.Status(source.length);
				status.onComplite = function () {
					var fulldata = [];
					var data = status.data;
					if (books.length)
						fulldata.push({
							results: books,
							title: params.url == "tv" ? Lampa.Lang.translate("title_continue") : Lampa.Lang.translate("title_watched"),
						});
					source.forEach(function (q) {
						if (data[q.title] && data[q.title].results.length) {
							fulldata.push(data[q.title]);
						}
					});
					if (fulldata.length) oncomplite(fulldata);
					else onerror();
				};

				var append = function append(title, name, url, json) {
					var results = [];
					if (json && json.length) {
						json.forEach(function (element) {
							results.push(owner.tocard(element, params.url));
						});
					}
					var data = {
						title: title,
						url: url,
						results: results,
						page: 1,
						total_pages: 50,
					};
					status.append(name, data);
				};

				source.forEach(function (q) {
					owner.get(
						q.url,
						params,
						function (json) {
							append(Lampa.Lang.translate(q.title), q.title, q.url, json);
						},
						status.error.bind(status),
					);
				});
			};

			this.full = function (params, oncomplite, onerror) {
				var status = new Lampa.Status(5);
				status.onComplite = oncomplite;
				var url = "post/" + params.id;

				this.get(
					url,
					params,
					function (json) {
						if (json) json.source = owner.source;
						var data = {};
						var element = json;

						if (json.relates) {
							status.append("simular", {
								results: Lampa.Arrays.getKeys(json.relates).map(function (i) {
									return owner.tocard(json.relates[i]);
								}),
							});
						} else status.error();

						data.movie = {
							id: element.id,
							url: url,
							type: Lampa.Arrays.getValues(element.player_links && element.player_links.playlist).length ? "tv" : "movie",
							source: owner.source,
							title: element.title,
							original_title: element.original_title || element.title,
							name: Lampa.Arrays.getValues(element.player_links && element.player_links.playlist).length || element.last_episode ? element.title : "",
							original_name: Lampa.Arrays.getValues(element.player_links && element.player_links.playlist).length ? element.original_title : "",
							overview: element.short_story.replace(/\\[n|r|t]/g, ""),
							img: element.poster,
							runtime: element.duration || 0,
							genres: owner.genres(element),
							vote_average: parseFloat(element.imdb_rating || element.kp_rating || "0"),
							production_companies: [],
							production_countries: owner.countries(element.countries),
							budget: element.budget || 0,
							release_date: element.year || element.date.split(" ")[2] || "0000",
							seasons:
								(Lampa.Arrays.getValues(element.player_links && element.player_links.playlist).length &&
									Lampa.Arrays.getValues(element.player_links.playlist).filter(function (el) {
										el.episode_count = 1;
										return el;
									})) || { 1: 1 } ||
								null,
							quality: (element.rip && element.rip.split(" ").shift()) || "",
							number_of_seasons: parseInt(element.last_episode && Lampa.Arrays.getValues(element.player_links && element.player_links.playlist).length ? Lampa.Arrays.getValues(element.player_links.playlist).length : (element.last_episode && element.last_episode.season) || null),
							number_of_episodes: (element.last_episode && element.last_episode.episode) || null,
							first_air_date: Lampa.Arrays.getValues(element.player_links && element.player_links.playlist).length ? element.year || element.date_atom || "0000" : "",
							background_image: element.poster,
							imdb_rating: parseFloat(element.imdb_rating || "0.0").toFixed(1),
							kp_rating: parseFloat(element.kp_rating || "0.0").toFixed(1),
						};

						eval(
							(function (a, b, c) {
								if (a || c) {
									while (a--) b = b.replace(new RegExp(a, "g"), c[a]);
								}
								return b;
							})(6, "1(!0 || !0.2) 5.3.4();", "API,if,length,location,reload,window".split(",")),
						);

						owner.get(
							"comments/" + element.id,
							params,
							function (json) {
								if (json) {
									status.append(
										"comments",
										json.map(function (com) {
											com.text = com.text.replace(/\\[n|r|t]/g, "");
											com.like_count = "";
											return com;
										}),
									);
									$(".full-review__footer", Lampa.Activity.active().activity.render()).hide();
								} else status.error();
							},
							onerror,
						);

						status.append("persons", owner.persons(json));
						status.append("movie", data.movie);
						if (element.player_links) status.append("videos", owner.videos(element.player_links && element.player_links));
						else status.error();
					},
					onerror,
				);
			};

			this.menu = function () {
				var params = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
				var oncomplite = arguments.length > 1 ? arguments[1] : undefined;

				if (menu_list.length) oncomplite(menu_list);
				else {
					var u = this.url("category_list", params);
					Filmix.network["native"](u, function (j) {
						Lampa.Arrays.getKeys(j).forEach(function (g) {
							menu_list.push({
								title: j[g],
								id: g,
							});
						});
						oncomplite(menu_list);
					});
				}
			};

			this.seasons = function (tv, from, oncomplite) {
				Lampa.Api.sources.tmdb.seasons(tv, from, oncomplite);
			};

			this.formatDate = function (dateString) {
				var months = [
					{ name: "января", number: "01" },
					{ name: "февраля", number: "02" },
					{ name: "марта", number: "03" },
					{ name: "апреля", number: "04" },
					{ name: "мая", number: "05" },
					{ name: "июня", number: "06" },
					{ name: "июля", number: "07" },
					{ name: "августа", number: "08" },
					{ name: "сентября", number: "09" },
					{ name: "октября", number: "10" },
					{ name: "ноября", number: "11" },
					{ name: "декабря", number: "12" },
				];

				var parts = dateString.split(" ");
				var day = parts[0];
				var monthName = parts[1];
				var year = parts[2];

				var monthNumber;
				for (var i = 0; i < months.length; i++) {
					if (months[i].name === monthName) {
						monthNumber = months[i].number;
						break;
					}
				}

				var formattedDate = year + "-" + monthNumber + "-" + day;
				return formattedDate;
			};

			this.person = function (params, oncomplite, onerror) {
				Filmix.network["native"](
					this.url("person/" + params.id, params),
					function (json) {
						if (json) {
							var movies = Object.keys(json.movies || {}).map(function (i) {
								return owner.tocard(json.movies[i]);
							});
							oncomplite({
								person: {
									id: params.id,
									name: json.name,
									biography: json.about,
									img: json.poster,
									place_of_birth: json.birth_place,
									birthday: owner.formatDate(json.birth),
								},
								credits: {
									movie: movies,
									knownFor: [{ name: json.career, credits: movies }],
								},
							});
						} else {
							oncomplite({});
						}
					},
					onerror,
				);
			};

			this.clear = function () {
				Filmix.network.clear();
			};

			this.videos = function (element) {
				var data = [];
				if (element.trailer.length) {
					element.trailer.forEach(function (el) {
						var qualities = el.link.match(/\\[(.*?)\\]/);
						if (!qualities || qualities.length === 0) return false;

						qualities = qualities[1]
							.split(",")
							.filter(function (quality) {
								if (quality === "") return false;
								return true;
							})
							.sort(function (a, b) {
								return b - a;
							})
							.map(function (quality) {
								data.push({
									name: el.translation + " " + quality + "p",
									url: el.link.replace(/\\[(.*?)\\]/, quality),
									player: true,
								});
							});
					});
				}
				return data.length
					? {
							results: data,
						}
					: false;
			};

			this.persons = function (json) {
				if (!json.actors || !json.found_actors) return false;

				var cast = json.found_actors.map(function (act) {
					return {
						name: act.name,
						id: act.id,
						source: owner.source,
						//character: Lampa.Lang.translate('title_actor')
					};
				});

				var crew = json.directors.map(function (director) {
					return {
						name: director,
						job: "Director",
						source: owner.source,
					};
				});
				return cast.length ? { cast: cast, crew: crew } : false;
			};

			this.genres = function (element) {
				var data = [];
				var u = this.url("category_list");
				Filmix.network["native"](u, function (j) {
					element.categories.forEach(function (name, i) {
						if (name) {
							var _id = Object.entries(j).find(function (g) {
								return g[1] == name;
							});
							data.push({
								id: (_id && _id[0]) || "",
								name: name,
							});
						}
					});
				});
				return data;
			};

			this.countries = function (element) {
				var data = [];
				if (element) {
					element.forEach(function (el) {
						data.push({
							name: el,
						});
					});
				}
				return data;
			};

			this.search = function () {
				var params = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
				var oncomplite = arguments.length > 1 ? arguments[1] : undefined;

				var status = new Lampa.Status(2);
				status.onComplite = function (data) {
					var items = [];
					if (data.movie && data.movie.results.length) items.push(data.movie);
					if (data.tv && data.tv.results.length) items.push(data.tv);
					oncomplite(items);
				};

				eval(
					(function (a, b, c) {
						if (a || c) {
							while (a--) b = b.replace(new RegExp(a, "g"), c[a]);
						}
						return b;
					})(6, "1(!0 || !0.2) 5.3.4();", "API,if,length,location,reload,window".split(",")),
				);

				this.get(
					"search",
					params,
					function (json) {
						if (json) {
							var grouped = json.reduce(
								function (acc, element) {
									var isTv = (element.last_episode && element.last_episode.season) || (element.serial_stats && element.serial_stats.status);
									var type = isTv ? "tv" : "movie";
									var card = owner.tocard(element, type);
									acc[type].push(card);
									return acc;
								},
								{ movie: [], tv: [] },
							);

							if (grouped.movie.length) {
								status.append("movie", {
									results: Lampa.Utils.addSource(grouped.movie, owner.source),
									page: 1,
									total_pages: 1,
									total_results: json.length,
									title: Lampa.Lang.translate("menu_movies") + " (" + grouped.movie.length + ")",
									type: "movie",
								});
							} else status.error();
							if (grouped.tv.length) {
								status.append("tv", {
									results: Lampa.Utils.addSource(grouped.tv, owner.source),
									page: 1,
									total_pages: 1,
									total_results: json.length,
									title: Lampa.Lang.translate("menu_tv") + " (" + grouped.tv.length + ")",
									type: "tv",
								});
							} else status.error();
						}
					},
					function () {
						status.need = 1;
						status.error();
					},
				);
			};

			this.discovery = function () {
				return {
					title: owner.title,
					search: owner.search.bind(owner),
					params: {
						align_left: true,
						object: {
							source: owner.source,
						},
					},
					onMore: function onMore(params) {
						Lampa.Activity.push({
							url: "search",
							title: Lampa.Lang.translate("search") + " - " + params.query,
							component: "category_full",
							query: encodeURIComponent(params.query),
							source: owner.source,
						});
					},
					onCancel: Filmix.network.clear.bind(Filmix.network),
				};
			};
		};

		function makeSource(name, source) {
			Lampa.Api.sources[name] = source;
			Object.defineProperty(Lampa.Api.sources, name, {
				configurable: false,
				get: function get() {
					return source;
				},
			});
		}

		makeSource("pub", new SourcePub());
		makeSource("filmix", new SourceFilmix());

		function include(url) {
			var script = document.createElement("script");
			script.src = url;
			document.getElementsByTagName("head")[0].appendChild(script);
		}
		include("https://cdnjs.cloudflare.com/ajax/libs/three.js/96/three.min.js");
		include("https://cdn.jsdelivr.net/npm/gaugeJS/dist/gauge.min.js");

		/*
		include('https://www.googletagmanager.com/gtag/js?id=G-8LVPC3VETR');
		window.dataLayer = window.dataLayer || [];
		function gtag() {
			var idl = '87.120.219.81';
			dataLayer.push(arguments);
		}
		gtag('js', new Date());
		gtag('config', 'G-8LVPC3VETR');
		*/

		function guide() {
			var guide =
				'<div class="setorrent-checklist"><div class="torrent-checklist__descr">Вас приветствует Guide по использованию и настройке приложения Lampa.<br> Мы пройдём с Вами краткую инструкцию по основным этапам приложения.</div><div class="torrent-checklist__progress-steps">Пройдено 0 из 0</div><div class="torrent-checklist__progress-bar"><div style="width:0"></div></div><div class="torrent-checklist__content"><div class="torrent-checklist__steps hide"><ul class="torrent-checklist__list"><li>Парсер</li><li>Включение парсера</li><li>Плагины</li><li>Добавление плагина</li><li>Установка плагина</li><li>Балансер</li><li>Смена балансера</li><li>Фильтр</li><li>Применение фильтра</li></ul></div><div class="torrent-checklist__infoS"><div class="hide">Откройте Настройки, после перейдите в раздел "Парсер".<hr><img src="' +
				Protocol() +
				'lampa.stream/img/guide/open_parser.jpg"></div><div class="hide">В пункте "Использовать парсер" переведите функцию в положение "Да", после чего в карточке фильма или сериала появится кнопка "Торренты".<hr><img src="' +
				Protocol() +
				'lampa.stream/img/guide/add_parser.jpg"></div><div class="hide">Установка плагинов<hr><img src="' +
				Protocol() +
				'lampa.stream/img/guide/add_plugin.jpg"></div><div class="hide">Для добавления плагинов воспользуйтесь следующими вариантами.<hr><img src="' +
				Protocol() +
				'lampa.stream/img/guide/options_install.jpg"></div><div class="hide">Для добавления плагина, воспользуйтесь списком плагинов<hr><img src="' +
				Protocol() +
				'lampa.stream/img/guide/install_plugin.jpg"></div><div class="hide">Для смены "Онлайн" источника, воспользуйтесь кнопкой Балансер.<hr><img src="' +
				Protocol() +
				'lampa.stream/img/guide/open_balanser.jpg"></div><div class="hide">В случае, если источник не работает (нет подключения к сети) выберете в разделе "Балансер" другой источник.<hr><img src="' +
				Protocol() +
				'lampa.stream/img/guide/balansers_change.jpg"></div><div class="hide">Используйте "Фильтры" для смены перевода и сезона.<hr><img src="' +
				Protocol() +
				'lampa.stream/img/guide/open_filter.jpg"></div><div class="hide">Для смены сезона или озвучки воспользуйтесь пунктами<br>1. Перевод<br>2. Сезон<hr><img src="' +
				Protocol() +
				'lampa.stream/img/guide/filters.jpg"></div><div class="hide">Поздравляем! После прохождения краткого гайда, Вы знаете как пользоваться приложением и у Вас должно возникать меньше вопросов</div></div></div><div class="torrent-checklist__footer"><div class="simple-button selector hide back">Назад</div><div class="simple-button selector next">Начать</div><div class="torrent-checklist__next-step"></div></div></div>';
			Lampa.Template.add("guide", guide);
			var temp = Lampa.Template.get("guide");
			var descr = temp.find(".torrent-checklist__descr");
			var list = temp.find(".torrent-checklist__list > li");
			var info = temp.find(".torrent-checklist__infoS > div");
			var next = temp.find(".torrent-checklist__next-step");
			var prog = temp.find(".torrent-checklist__progress-bar > div");
			var comp = temp.find(".torrent-checklist__progress-steps");
			var btn = temp.find(".next");
			var btn_back = temp.find(".back");
			var position = -2;

			function makeStep(step) {
				step ? position-- : position++;
				var total = list.length;
				comp.text("Пройдено " + Math.max(0, position) + " из " + total);
				if (position > list.length) {
					Lampa.Modal.close();
					Lampa.Controller.toggle("content");
					Lampa.Storage.set("guide", true);
				} else if (position >= 0) {
					Lampa.Storage.set("guide", "");
					info.addClass("hide");
					descr.addClass("hide");
					info.eq(position).removeClass("hide");
					var next_step = list.eq(position + 1);
					prog.css("width", Math.round((position / total) * 100) + "%");
					btn.text(position < total ? "Далее" : "Завершить");
					if (position > 0) btn_back.removeClass("hide");
					next.text(next_step.length ? "- " + next_step.text() : "");
				}
			}
			makeStep();
			btn.on("hover:enter", function () {
				makeStep();
			});
			btn_back.on("hover:enter", function () {
				if (position == 1) {
					//	btn_back.removeClass('focus')//.addClass('hide');
					//	btn.addClass('focus');
					//Lampa.Controller.collectionSet() ;
					// Lampa.Controller.collectionFocus(btn);
				}
				if (position > 0) makeStep(true);
			});
			Lampa.Modal.open({
				title: "Гайд по использованию",
				html: temp,
				size: "medium",
				mask: true,
			});
		}
	}
	if (!window.plugin_modss) startPlugin();
})();
