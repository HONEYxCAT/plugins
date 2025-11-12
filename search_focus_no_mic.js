(function () {
	"use strict";

	/**
	 * Плагин для Lampa:
	 * - Ставит фокус сразу в строку ввода при открытии поиска.
	 * - Отключает визуальное выделение и выбор иконки микрофона:
	 *   делает её визуальной заглушкой, которую нельзя выбрать пультом.
	 *
	 * Реализовано максимально безопасно:
	 * - Ожидает готовности приложения.
	 * - Подписывается на события активности и поиска.
	 * - Следит за DOM для динамически появляющегося поиска.
	 */

	var PLUGIN_ID = "search_focus_no_mic";
	var PLUGIN_NAME = "Search Focus (No Mic)";
	var INPUT_SELECTOR = "#orsay-keyboard.simple-keyboard-input.selector, " + "#orsay-keyboard.simple-keyboard-input, " + ".search__keypad input.simple-keyboard-input";

	/**
	 * Глобальный CSS-override:
	 * - Гасим "активный" стиль микрофона.
	 * - Делаем кнопку микрофона заглушкой: видна, но не получает события и фокус.
	 */
	function injectMicFocusOverride() {
		try {
			var style = document.createElement("style");
			style.setAttribute("data-" + PLUGIN_ID + "-styles", "true");

			style.textContent =
				// Убираем любую визуальную подсветку при фокусе на микрофоне
				".simple-keyboard-mic.focus {" +
				"background: transparent !important;" +
				"color: inherit !important;" +
				"box-shadow: none !important;" +
				"outline: none !important;" +
				"}" +
				// Делаем микрофон заглушкой:
				// - не кликается
				// - не реагирует на hover/focus
				// Визуально остаётся, но как статичная иконка.
				".simple-keyboard-mic {" +
				"pointer-events: none !important;" +
				"}";

			document.head.appendChild(style);
		} catch (e) {
			console.error("[" + PLUGIN_ID + "] mic focus override error:", e);
		}
	}

	/**
	 * Убираем иконку микрофона из логики навигации Lampa:
	 * - не должна быть элементом, который выбирается пультом.
	 * - оставляем в DOM, только выкидываем из controller/selectors.
	 */
	function disableMicSelection() {
		try {
			var mics = document.querySelectorAll(".simple-keyboard-mic");
			if (!mics || !mics.length) return;

			mics.forEach(function (mic) {
				if (!mic || !(mic instanceof HTMLElement)) return;

				// Если помечен как элемент навигации (например, .selector) — снимаем
				if (mic.classList && mic.classList.contains("selector")) {
					mic.classList.remove("selector");
				}

				// На всякий случай убираем tabindex, если присутствует
				if (mic.hasAttribute("tabindex")) {
					mic.removeAttribute("tabindex");
				}

				// Убираем типичные data-атрибуты, по которым Lampa может вешать контроллер
				if (mic.dataset) {
					if (mic.dataset.controller) delete mic.dataset.controller;
					if (mic.dataset.action) delete mic.dataset.action;
					if (mic.dataset.type) delete mic.dataset.type;
				}
			});
		} catch (e) {
			console.error("[" + PLUGIN_ID + "] disableMicSelection error:", e);
		}
	}

	/**
	 * Установить фокус в поле ввода поиска.
	 * Поддерживает как нативный input, так и интерфейс Lampa.
	 */
	function focusSearchInput() {
		try {
			var input = document.querySelector(INPUT_SELECTOR);

			if (input) {
				if (typeof input.focus === "function") {
					input.focus();
				}

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
	 * - блокируем выбор иконки микрофона
	 */
	function handleSearchOpen() {
		setTimeout(function () {
			focusSearchInput();
			disableMicSelection();
		}, 100);
	}

	/**
	 * Подписка на события Lampa, чтобы определить моменты открытия поиска.
	 */
	function bindLampaEvents() {
		if (typeof Lampa === "undefined" || !Lampa.Listener) return;

		Lampa.Listener.follow("activity", function (e) {
			try {
				if (e.type === "start" && (e.component === "search" || e.component === "search_results")) {
					handleSearchOpen();
				}
			} catch (err) {
				console.error("[" + PLUGIN_ID + "] activity listener error:", err);
			}
		});

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
	 * - Если поиск/клавиатура отрисованы динамически, ставим фокус и отключаем микрофон.
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
						disableMicSelection();
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
	 * Регистрация плагина в Lampa (минимальная, без настроек).
	 */
	function registerPlugin() {
		try {
			if (typeof Lampa === "undefined") return;

			Lampa.Manifest = Lampa.Manifest || {};
			Lampa.Manifest.plugins = Lampa.Manifest.plugins || {};

			Lampa.Manifest.plugins[PLUGIN_ID] = {
				type: "other",
				name: PLUGIN_NAME,
				version: "1.1.0",
				description: "Фокусирует строку поиска при открытии и делает иконку микрофона недоступной для выбора (заглушка).",
			};

			window["plugin_" + PLUGIN_ID + "_ready"] = true;
		} catch (e) {
			console.error("[" + PLUGIN_ID + "] register error:", e);
		}
	}

	/**
	 * Старт плагина:
	 * - Вставляем CSS-override.
	 * - Ставим автофокус.
	 * - Отключаем выбор микрофона.
	 * - Включаем наблюдатель и события.
	 * - Регистрируем плагин.
	 */
	function start() {
		injectMicFocusOverride();
		focusSearchInput();
		disableMicSelection();
		observeSearchDom();
		bindLampaEvents();
		registerPlugin();

		console.log("[" + PLUGIN_ID + "] Plugin started: search auto-focus + mic visual-only (no selection)");
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
					console.log("[" + PLUGIN_ID + "] Lampa not detected, DOM-only mode (mic visual-only, focus tweak active)");
				}
			}, 250);
		}
	})();
})();
