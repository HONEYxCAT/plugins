(function () {
	"use strict";

	/**
	 * Плагин для Lampa:
	 * - Прячет кнопку голосового поиска (микрофон) в поле поиска.
	 * - Ставит фокус сразу в строку ввода при открытии поиска.
	 *
	 * Реализовано максимально безопасно:
	 * - Ожидает готовности приложения.
	 * - Подписывается на события активности и поиска.
	 * - Не ломает работу, если структура DOM немного отличается.
	 */

	var PLUGIN_ID = "search_focus_no_mic";
	var PLUGIN_NAME = "Search Focus (No Mic)";
	var MIC_SELECTOR = ".simple-keyboard-mic, .search__keypad .simple-keyboard-mic, .search__keypad .selector.simple-keyboard-mic";
	var INPUT_SELECTOR = "#orsay-keyboard.simple-keyboard-input.selector, #orsay-keyboard.simple-keyboard-input, .search__keypad input.simple-keyboard-input";

	/**
	 * Скрыть кнопку микрофона, если она есть.
	 */
	function hideMicButton() {
		try {
			var micButtons = document.querySelectorAll(MIC_SELECTOR);
			if (!micButtons || !micButtons.length) return;

			micButtons.forEach(function (el) {
				// Используем !important для надежного скрытия
				el.style.setProperty("display", "none", "important");
				el.style.setProperty("visibility", "hidden", "important");
				el.style.setProperty("width", "0", "important");
				el.style.setProperty("margin", "0", "important");
				el.style.setProperty("padding", "0", "important");
			});
		} catch (e) {
			console.error("[" + PLUGIN_ID + "] error hideMicButton:", e);
		}
	}

	/**
	 * Установить фокус в поле ввода поиска.
	 * Поддерживает как нативный input, так и интерфейс Lampa.
	 */
	function focusSearchInput() {
		try {
			// Пытаемся найти input по ID/классам из примера
			var input = document.querySelector(INPUT_SELECTOR);

			if (input) {
				// Фокус для устройств с клавиатурой / мышью
				input.focus && input.focus();

				// Для интерфейса Lampa (навигация по "selector")
				if (typeof Lampa !== "undefined" && Lampa.Controller && Lampa.Controller.toggle) {
					try {
						// Попробуем отдать фокус контроллеру поиска, если он есть
						if (Lampa.Controller.own && !Lampa.Controller.own("search")) {
							// Если у Lampa есть отдельный контроллер поиска
							if (Lampa.Controller.storage && Lampa.Controller.storage.search) {
								Lampa.Controller.toggle("search");
							}
						}
					} catch (e) {
						// Тихо логируем, не ломаем поведение
						console.log("[" + PLUGIN_ID + "] controller focus warn:", e);
					}
				}

				return;
			}

			// Если конкретный input не найден, пробуем найти любой текстовый input в зоне поиска
			var searchRoot = document.querySelector(".search, .search__input, .search__keypad");
			if (searchRoot) {
				var textInput = searchRoot.querySelector("input[type='text'], input.simple-keyboard-input, input");
				if (textInput) {
					textInput.focus && textInput.focus();
				}
			}
		} catch (e) {
			console.error("[" + PLUGIN_ID + "] error focusSearchInput:", e);
		}
	}

	/**
	 * Обработка открытия поиска:
	 * - прячем микрофон
	 * - ставим фокус в строку ввода
	 */
	function handleSearchOpen() {
		// Немного задержки, чтобы DOM точно успел отрисоваться
		setTimeout(function () {
			// hideMicButton();
			focusSearchInput();
		}, 100);
	}

	/**
	 * Подписка на события Lampa, чтобы определить моменты открытия поиска.
	 */
	function bindLampaEvents() {
		if (typeof Lampa === "undefined" || !Lampa.Listener) return;

		// Общие события активности
		Lampa.Listener.follow("activity", function (e) {
			try {
				// Когда открывается компонент "search"
				if (e.type === "start" && (e.component === "search" || e.component === "search_results")) {
					handleSearchOpen();
				}
			} catch (err) {
				console.error("[" + PLUGIN_ID + "] activity listener error:", err);
			}
		});

		// Если есть отдельные события поиска, также реагируем
		Lampa.Listener.follow("search", function (e) {
			try {
				if (e.type === "open" || e.type === "start" || e.type === "visible") {
					handleSearchOpen();
				}
			} catch (err) {
				console.error("[" + PLUGIN_ID + "] search listener error:", err);
			}
		});
	}

	/**
	 * Наблюдатель за DOM:
	 * - Если поиск отрисовался динамически, применяем изменения.
	 */
	function observeSearchDom() {
		try {
			if (typeof MutationObserver === "undefined") return;

			var observer = new MutationObserver(function (mutations) {
				var changed = false;

				for (var i = 0; i < mutations.length; i++) {
					var m = mutations[i];

					if (!m.addedNodes || !m.addedNodes.length) continue;

					for (var j = 0; j < m.addedNodes.length; j++) {
						var node = m.addedNodes[j];
						if (!(node instanceof HTMLElement)) continue;

						// Если появился блок поиска или виртуальная клавиатура, реагируем
						if (node.matches && (node.matches(".search__keypad") || node.matches(".search") || node.querySelector(".search__keypad") || node.querySelector("#orsay-keyboard") || node.querySelector(".simple-keyboard-mic"))) {
							changed = true;
							break;
						}
					}

					if (changed) break;
				}

				if (changed) {
					// Чуть позже, чтобы элементы точно были на месте
					setTimeout(function () {
						// hideMicButton();
						focusSearchInput();
					}, 50);
				}
			});

			observer.observe(document.body, {
				childList: true,
				subtree: true,
			});
		} catch (e) {
			console.error("[" + PLUGIN_ID + "] observer error:", e);
		}
	}

	/**
	 * Регистрация плагина в Lampa (минимальная, чтобы считался валидным).
	 */
	function registerPlugin() {
		try {
			if (typeof Lampa === "undefined") return;

			Lampa.Manifest = Lampa.Manifest || {};
			Lampa.Manifest.plugins = Lampa.Manifest.plugins || {};

			// Информация о плагине
			Lampa.Manifest.plugins[PLUGIN_ID] = {
				type: "other",
				name: PLUGIN_NAME,
				version: "1.0.0",
				description: "Прячет кнопку голосового поиска и сразу фокусирует строку ввода поиска",
			};

			// Если доступен SettingsApi — добавим статический параметр (необязательно, но делает плагин «красивым»)
			if (Lampa.SettingsApi && typeof Lampa.SettingsApi.addComponent === "function") {
				Lampa.SettingsApi.addComponent({
					component: PLUGIN_ID,
					name: PLUGIN_NAME,
					icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" xmlns="http://www.w3.org/2000/svg">' + '<rect x="3" y="4" width="18" height="4" rx="1" fill="currentColor"/>' + '<rect x="3" y="10" width="14" height="2" rx="1" fill="currentColor"/>' + '<rect x="3" y="14" width="10" height="2" rx="1" fill="currentColor"/>' + "</svg>",
				});

				if (typeof Lampa.SettingsApi.addParam === "function") {
					Lampa.SettingsApi.addParam({
						component: PLUGIN_ID,
						param: {
							name: PLUGIN_ID + "_info",
							type: "static",
						},
						field: {
							name: PLUGIN_NAME,
							description: "Скрывает кнопку голосового поиска и устанавливает фокус в строку поиска при открытии.",
						},
					});
				}
			}

			window["plugin_" + PLUGIN_ID + "_ready"] = true;
		} catch (e) {
			console.error("[" + PLUGIN_ID + "] register error:", e);
		}
	}

	/**
	 * Старт плагина:
	 * - Дожидаемся готовности приложения (если Lampa есть).
	 * - Вешаем слушатели и наблюдатель DOM.
	 */
	function start() {
		// Мгновенно пытаемся применить (на случай, если поиск уже открыт)
		// hideMicButton();
		focusSearchInput();

		// Слежение за будущими изменениями DOM
		observeSearchDom();

		// Интеграция с событиями Lampa
		bindLampaEvents();

		// Регистрация в манифесте
		registerPlugin();

		console.log("[" + PLUGIN_ID + "] Plugin started: mic hidden, search auto-focus enabled");
	}

	// Ожидаем Lampa или запускаем сразу, если уже доступна
	(function init() {
		if (typeof Lampa !== "undefined") {
			if (window.appready) {
				start();
			} else if (Lampa.Listener && typeof Lampa.Listener.follow === "function") {
				Lampa.Listener.follow("app", function (e) {
					if (e.type === "ready") start();
				});
			} else {
				// Если нет Listener, просто пробуем с небольшой задержкой
				setTimeout(start, 500);
			}
		} else {
			// Если Lampa не обнаружена (например, окружение загружается нестандартно), пробуем позже
			var attempts = 0;
			var timer = setInterval(function () {
				attempts++;
				if (typeof Lampa !== "undefined") {
					clearInterval(timer);
					init();
				} else if (attempts > 40) {
					clearInterval(timer);
					// Запускаем базовую логику только для DOM (минимум, без событий Lampa)
					// hideMicButton();
					observeSearchDom();
					console.log("[" + PLUGIN_ID + "] Lampa not detected, DOM-only mode");
				}
			}, 250);
		}
	})();
})();
