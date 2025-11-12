(function () {
	"use strict";

	/**
	 * Плагин для Lampa:
	 * - Ставит фокус сразу в строку ввода при открытии поиска.
	 * - Отключает визуальное выделение иконки микрофона (.simple-keyboard-mic.focus),
	 *   не трогая сам класс и не ломая остальной фокус-навигации.
	 *
	 * Реализовано максимально безопасно:
	 * - Ожидает готовности приложения.
	 * - Подписывается на события активности и поиска.
	 * - Следит за DOM для динамически появляющегося поиска.
	 */

	var PLUGIN_ID = "search_focus_no_mic";
	var PLUGIN_NAME = "Search Focus (No Mic)";
	var INPUT_SELECTOR = "#orsay-keyboard.simple-keyboard-input.selector, #orsay-keyboard.simple-keyboard-input, .search__keypad input.simple-keyboard-input";

	/**
	 * Глобальный CSS-override для .simple-keyboard-mic.focus
	 * Оставляем кнопку, но полностью гасим её "активный" стиль.
	 */
	function injectMicFocusOverride() {
		try {
			var style = document.createElement("style");
			style.setAttribute("data-" + PLUGIN_ID + "-styles", "true");

			// Сбрасываем фон и цвет для состояния фокуса микрофона.
			// Используем !important, чтобы перебить штатные стили.
			style.textContent = ".simple-keyboard-mic.focus {" + "background: transparent !important;" + "color: inherit !important;" + "box-shadow: none !important;" + "outline: none !important;" + "}";

			document.head.appendChild(style);
		} catch (e) {
			console.error("[" + PLUGIN_ID + "] mic focus override error:", e);
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
				if (typeof input.focus === "function") {
					input.focus();
				}

				// Для интерфейса Lampa (навигация по "selector")
				if (typeof Lampa !== "undefined" && Lampa.Controller && typeof Lampa.Controller.toggle === "function") {
					try {
						if (typeof Lampa.Controller.own === "function" && !Lampa.Controller.own("search")) {
							if (Lampa.Controller.storage && Lampa.Controller.storage.search) {
								Lampa.Controller.toggle("search");
							}
						}
					} catch (e) {
						console.log("[" + PLUGIN_ID + "] controller focus warn:", e);
					}
				}

				return;
			}

			// Если конкретный input не найден, пробуем найти любой текстовый input в зоне поиска
			var searchRoot = document.querySelector(".search, .search__input, .search__keypad");
			if (searchRoot) {
				var textInput = searchRoot.querySelector("input[type='text'], input.simple-keyboard-input, input");
				if (textInput && typeof textInput.focus === "function") {
					textInput.focus();
				}
			}
		} catch (e) {
			console.error("[" + PLUGIN_ID + "] error focusSearchInput:", e);
		}
	}

	/**
	 * Обработка открытия поиска:
	 * - ставим фокус в строку ввода
	 */
	function handleSearchOpen() {
		// Немного задержки, чтобы DOM точно успел отрисоваться
		setTimeout(function () {
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
	 * - Если поиск отрисовался динамически, применяем автофокус.
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

						// Если появился блок поиска или клавиатура, реагируем
						if ((node.matches && (node.matches(".search__keypad") || node.matches(".search"))) || (node.querySelector && (node.querySelector(".search__keypad") || node.querySelector("#orsay-keyboard")))) {
							changed = true;
							break;
						}
					}

					if (changed) break;
				}

				if (changed) {
					setTimeout(function () {
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
	 * Без добавления компонента настроек, чтобы пункт меню не отображался.
	 */
	function registerPlugin() {
		try {
			if (typeof Lampa === "undefined") return;

			Lampa.Manifest = Lampa.Manifest || {};
			Lampa.Manifest.plugins = Lampa.Manifest.plugins || {};

			Lampa.Manifest.plugins[PLUGIN_ID] = {
				type: "other",
				name: PLUGIN_NAME,
				version: "1.0.1",
				description: "Отключает подсветку .simple-keyboard-mic.focus и фокусирует строку поиска при открытии.",
			};

			window["plugin_" + PLUGIN_ID + "_ready"] = true;
		} catch (e) {
			console.error("[" + PLUGIN_ID + "] register error:", e);
		}
	}

	/**
	 * Старт плагина:
	 * - Вставляем CSS-override.
	 * - Настраиваем автофокус.
	 * - Регистрируемся в Lampa.
	 */
	function start() {
		injectMicFocusOverride();
		focusSearchInput();
		observeSearchDom();
		bindLampaEvents();
		registerPlugin();

		console.log("[" + PLUGIN_ID + "] Plugin started: mic focus override + search auto-focus enabled");
	}

	(function init() {
		if (typeof Lampa !== "undefined") {
			if (window.appready) {
				start();
			} else if (Lampa.Listener && typeof Lampa.Listener.follow === "function") {
				Lampa.Listener.follow("app", function (e) {
					if (e.type === "ready") start();
				});
			} else {
				setTimeout(start, 500);
			}
		} else {
			var attempts = 0;
			var timer = setInterval(function () {
				attempts++;
				if (typeof Lampa !== "undefined") {
					clearInterval(timer);
					init();
				} else if (attempts > 40) {
					clearInterval(timer);
					injectMicFocusOverride();
					observeSearchDom();
					console.log("[" + PLUGIN_ID + "] Lampa not detected, DOM-only mode (mic focus override active)");
				}
			}, 250);
		}
	})();
})();
