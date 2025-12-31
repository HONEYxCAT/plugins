(function () {
	"use strict";

	function injectStyles() {
		var style = document.createElement("style");
		style.textContent = ".simple-keyboard-mic{pointer-events:none!important}.simple-keyboard-mic.focus{background:transparent!important;color:#fff!important;box-shadow:none!important;outline:none!important}";
		document.head.appendChild(style);
	}

	function disableMic() {
		var mic = document.querySelector(".simple-keyboard-mic");
		if (mic) {
			mic.classList.remove("selector");
			mic.removeAttribute("tabindex");
		}
	}

	function focusInput() {
		var input = document.querySelector("#orsay-keyboard.simple-keyboard-input, .simple-keyboard-input");
		if (input && document.activeElement !== input) {
			input.focus();
		}
	}

	function handleSearch() {
		setTimeout(function () {
			focusInput();
			disableMic();
		}, 100);
	}

	function observeDom() {
		var observer = new MutationObserver(function (mutations) {
			for (var i = 0; i < mutations.length; i++) {
				var nodes = mutations[i].addedNodes;
				for (var j = 0; j < nodes.length; j++) {
					var node = nodes[j];
					if (node instanceof HTMLElement && node.querySelector && (node.querySelector(".simple-keyboard-input") || node.querySelector("#orsay-keyboard"))) {
						handleSearch();
						return;
					}
				}
			}
		});
		observer.observe(document.body, { childList: true, subtree: true });
	}

	function start() {
		injectStyles();
		observeDom();
	}

	if (window.appready) {
		start();
	} else if (typeof Lampa !== "undefined" && Lampa.Listener) {
		Lampa.Listener.follow("app", function (e) {
			if (e.type === "ready") start();
		});
	} else {
		setTimeout(start, 500);
	}
})();
