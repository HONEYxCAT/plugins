(function () {
	// Конфигурация CSS-стилей для элементов торрентов
	const STYLES = {
		".torrent-item__seeds span.high-seeds": {
			color: "#00b300",
			"font-weight": "bold",
		},
		".torrent-item__bitrate span.high-bitrate": {
			color: "#b30000",
			"font-weight": "bold",
		},
	};

	// Вставляем CSS-стили в документ
	let style = document.createElement("style");
	style.innerHTML = Object.entries(STYLES)
		.map(([selector, props]) => {
			return `${selector} { ${Object.entries(props)
				.map(([prop, val]) => `${prop}: ${val} !important`)
				.join("; ")} }`;
		})
		.join("\n");
	document.head.appendChild(style);

	// Обновление стилей элементов торрентов
	function updateTorrentStyles() {
		// Подсветка "Seeds" если значение > 19
		document.querySelectorAll(".torrent-item__seeds span").forEach((span) => {
			span.classList.toggle("high-seeds", (parseInt(span.textContent) || 0) > 19);
		});

		// Подсветка "Битрейт" если значение > 40
		document.querySelectorAll(".torrent-item__bitrate span").forEach((span) => {
			span.classList.toggle("high-bitrate", (parseFloat(span.textContent) || 0) > 40);
		});
	}

	function updateAll() {
		updateTorrentStyles();
	}

	// Наблюдатель за изменениями DOM для повторного применения стилей при подгрузке
	const observer = new MutationObserver((mutations) => {
		if (mutations.some((m) => m.addedNodes.length)) {
			updateAll();
		}
	});

	// Инициализация наблюдателя и первичное применение стилей
	observer.observe(document.body, { childList: true, subtree: true });
	updateAll();
})();

Lampa.Platform.tv();
