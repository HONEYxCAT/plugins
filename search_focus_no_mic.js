(function () {
	"use strict";

	var PLUGIN_ID = "search_focus_no_mic";
	var PLUGIN_NAME = "Search Focus (No Mic)";
	var INPUT_SELECTOR = "#orsay-keyboard.simple-keyboard-input.selector, " + "#orsay-keyboard.simple-keyboard-input, " + ".search__keypad input.simple-keyboard-input";

	function injectMicFocusOverride() {
		try {
			var style = document.createElement("style");
			style.setAttribute("data-" + PLUGIN_ID + "-styles", "true");

			style.textContent = ".simple-keyboard-mic.focus {" + "background: transparent !important;" + "color: inherit !important;" + "box-shadow: none !important;" + "outline: none !important;" + "}" + ".simple-keyboard-mic {" + "pointer-events: none !important;" + "}";

			document.head.appendChild(style);
		} catch (e) {
			console.error("[" + PLUGIN_ID + "] mic focus override error:", e);
		}
	}

	function disableMicSelection() {
		try {
			var mics = document.querySelectorAll(".simple-keyboard-mic");
			if (!mics || !mics.length) return;

			mics.forEach(function (mic) {
				if (!mic || !(mic instanceof HTMLElement)) return;

				if (mic.classList && mic.classList.contains("selector")) {
					mic.classList.remove("selector");
				}

				if (mic.hasAttribute("tabindex")) {
					mic.removeAttribute("tabindex");
				}

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

	function focusSearchInput() {
		try {
			var input = document.querySelector(INPUT_SELECTOR);

			if (input && document.activeElement === input) {
				return;
			}

			if (input) {
				if (typeof input.focus === "function") {
					input.focus();
				}

				return;
			}

			var searchRoot = document.querySelector(".search, .search__input, .search__keypad");
			if (searchRoot) {
				var textInput = searchRoot.querySelector("input[type='text'], input.simple-keyboard-input, input");
				if (textInput && typeof textInput.focus === "function" && document.activeElement !== textInput) {
					textInput.focus();
				}
			}
		} catch (e) {
			console.error("[" + PLUGIN_ID + "] error focusSearchInput:", e);
		}
	}

	function handleSearchOpen() {
		setTimeout(function () {
			focusSearchInput();
			disableMicSelection();
		}, 100);
	}

	function bindLampaEvents() {
		if (typeof Lampa === "undefined" || !Lampa.Listener) return;

		Lampa.Listener.follow("activity", function (e) {
			try {
				if (e.type === "start" && (e.component === "search" || e.component === "search_results")) {
					if (e.object && e.object.activity && e.object.activity.component) {
						var activityComponent = e.object.activity.component;
						if (activityComponent === "iptv" || activityComponent === "settings") {
							return;
						}
					}
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

	var observerActive = false;

	function observeSearchDom() {
		try {
			if (typeof MutationObserver === "undefined") return;

			var observer = new MutationObserver(function (mutations) {
				if (observerActive) return;

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
					observerActive = true;
					setTimeout(function () {
						focusSearchInput();
						disableMicSelection();
						observerActive = false;
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
