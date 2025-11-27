(function () {
	"use strict";

	var PREFIX = "[EpisodeMarksPlugin]";

	// ------------------------------------------------------------------------
	// 1. СТИЛИ (DESIGN)
	// ------------------------------------------------------------------------
	function injectStyles() {
		if (document.getElementById("ep-design-css")) return;

		var css = `
            /* Скрываем родную полоску Лампы */
            .card .card-watched { display: none !important; }

            /* --- БАЗОВЫЙ КОНТЕЙНЕР (для Сериалов) --- */
            /* По умолчанию растягивается по ширине */
            .ep-watched-layer {
                position: absolute;
                left: 0.6em;
                right: 0.6em;
                bottom: 2.5em;
                z-index: 2;

                background-color: rgba(0, 0, 0, 0.9);
                border-radius: 0.8em;
                padding: 0.5em 0.8em 0.8em 0.8em;
                min-width: 13em;
                font-family: "SegoeUI", sans-serif;
                display: flex;
                flex-direction: column;
                pointer-events: none;
                overflow: hidden;

                opacity: 0;
                transition: opacity 0.2s ease;
            }

            /* --- МОДИФИКАТОР ДЛЯ ФИЛЬМОВ (Centred Pill) --- */
            /* Делает плашку "таблеткой" по центру, ширина зависит от текста, но не меньше минимума */
            .ep-watched-layer.layer--movie {
                left: 50%;
                right: auto;
                transform: translateX(-50%);

                width: max-content;   /* Сжимаем по контенту */
                max-width: 90%;       /* Но не шире карточки */

                padding: 0.5em 1em 1em;  /* Аккуратные отступы */
                align-items: center;       /* Центрируем содержимое */
                justify-content: center;   /* Центрируем содержимое по вертикали */
                text-align: left;        /* Центрируем текст */
            }

            /* Появление с задержкой */
            .card.focus .ep-watched-layer,
            .card:hover .ep-watched-layer {
                opacity: 1;
                transition-delay: 0.5s;
            }

            /* Внутренний контейнер */
            .ep-watched-body {
                font-size: 0.8em;
                display: flex;
                flex-direction: column;
                width: 100%;
            }

            /* Элемент списка */
            .ep-watched-item {
                margin-top: 0.3em;
                line-height: 1.5;
            }

            /* --- СТИЛИ ТЕКСТА --- */
            .ep-watched-item.is-active {
                margin-top: 0;
                color: #fff;
            }
            .ep-watched-item:nth-child(2) { color: #9f9f9f; }
            .ep-watched-item:nth-child(3) { color: #6c6c6c; }
            .ep-watched-item:nth-child(4) { color: #5e5e5e; }
            .ep-watched-item:nth-child(5) { color: #4c4c4c; }

            /* Спец. стиль текста для фильмов (крупнее) */
            .ep-watched-item.movie-variant {
                font-size: 1.1em;
                margin-top: 0;
                color: #fff;
                text-align: left;
                width: 100%; /* Растягиваем текст на всю ширину контейнера */
            }

            .ep-watched-item > span {
                display: block;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            /* --- ПРОГРЕСС БАР --- */
            .ep-time-line {
                margin-top: 0.5em;
                border-radius: 3em;
                background-color: rgba(255, 255, 255, 0.25); /* Полупрозрачный белый трек */
                height: 0.3em;
                width: 100%; /* Растягивается на всю ширину плашки */
                overflow: hidden;
            }

            .ep-time-line > div {
                height: 100%;
                border-radius: 3em;
                background-color: #fff; /* Белая заливка, как на скрине */
            }

            /* Номер серии */
            .ep-num {
                font-weight: 600;
            }
        `;

		var style = document.createElement("style");
		style.id = "ep-design-css";
		style.innerHTML = css;
		document.head.appendChild(style);
	}

	// ------------------------------------------------------------------------
	// 2. ЛОГИКА СЕРИАЛОВ
	// ------------------------------------------------------------------------

	function getSeriesProgress(card) {
		var Utils = Lampa.Utils;
		var Storage = Lampa.Storage;
		var Timeline = Lampa.Timeline;

		var keys = [card.original_title, card.original_name, card.name].filter(Boolean);
		var cache = Storage.get("online_watched_last", "{}");
		var found = null;

		keys.some(function (key) {
			var hash = Utils.hash(key);
			if (cache[hash]) {
				found = cache[hash];
				return true;
			}
		});

		if (found) return { season: found.season, episode: found.episode };

		if (keys[0]) {
			var hashS1E1 = Utils.hash([1, 1, keys[0]].join(""));
			var view = Timeline.view(hashS1E1);
			if (view && view.percent > 1) return { season: 1, episode: 1 };
		}

		return null;
	}

	function loadEpisodes(card, season, callback) {
		if (!Lampa.Api || !Lampa.Api.seasons) return callback([]);
		Lampa.Api.seasons(
			card,
			[season],
			function (data) {
				if (data && data[season] && data[season].episodes) {
					callback(data[season].episodes);
				} else {
					callback([]);
				}
			},
			function () {
				callback([]);
			},
		);
	}

	// ------------------------------------------------------------------------
	// 3. ОТРИСОВКА (RENDERER)
	// ------------------------------------------------------------------------
	function drawHTML(cardNode, items, isMovieMode) {
		var viewContainer = cardNode.querySelector(".card__view");
		if (!viewContainer) return;

		var old = cardNode.querySelector(".ep-watched-layer");
		if (old) old.remove();

		if (!items || !items.length) return;

		var layer = document.createElement("div");
		layer.className = "ep-watched-layer";

		// Если это фильм, добавляем спец. класс для центрирования и сжатия
		if (isMovieMode) {
			layer.classList.add("layer--movie");
		}

		var body = document.createElement("div");
		body.className = "ep-watched-body";

		items.forEach(function (data) {
			var item = document.createElement("div");
			item.className = "ep-watched-item" + (data.isMovie ? " movie-variant" : "");

			var spanText = document.createElement("span");
			spanText.innerHTML = data.title;
			item.appendChild(spanText);

			if (data.percent > 0) {
				var timeline = document.createElement("div");
				timeline.className = "ep-time-line";
				var bar = document.createElement("div");
				bar.style.width = data.percent + "%";
				timeline.appendChild(bar);
				item.appendChild(timeline);
			}

			body.appendChild(item);
		});

		layer.appendChild(body);
		viewContainer.appendChild(layer);
	}

	// ------------------------------------------------------------------------
	// 4. ОБРАБОТКА (PROCESSORS)
	// ------------------------------------------------------------------------

	function processSeries(cardNode, cardData) {
		var progress = getSeriesProgress(cardData);
		if (!progress) return;

		loadEpisodes(cardData, progress.season, function (episodes) {
			var currentIndex = episodes.findIndex(function (ep) {
				return ep.episode_number == progress.episode;
			});
			if (currentIndex === -1) return;

			var listToShow = episodes.slice(currentIndex, currentIndex + 5);

			var itemsToDraw = listToShow.map(function (ep, index) {
				var isCurrent = index === 0;
				var percent = 0;

				var epName = (ep.name || "").replace(new RegExp("^" + ep.episode_number + "([ .-]|$)"), "").trim();
				if (!epName || epName === Lampa.Lang.translate("noname")) epName = "";
				var titleHtml = '<span class="ep-num">' + ep.episode_number + " -</span> " + epName;

				if (isCurrent) {
					var titleKey = cardData.original_title || cardData.original_name || cardData.name;
					var hashStr = [ep.season_number, ep.season_number > 10 ? ":" : "", ep.episode_number, titleKey].join("");
					var viewData = Lampa.Timeline.view(Lampa.Utils.hash(hashStr));
					if (viewData) percent = viewData.percent;
				}

				return {
					title: titleHtml,
					percent: percent,
					isMovie: false,
				};
			});

			drawHTML(cardNode, itemsToDraw, false); // false = series mode (stretched)
		});
	}

	function processMovie(cardNode, cardData) {
		var Utils = Lampa.Utils;
		var Timeline = Lampa.Timeline;
		var Lang = Lampa.Lang;

		var key = cardData.original_title || cardData.title;
		if (!key) return;

		var viewData = Timeline.view(Utils.hash(key));

		if (!viewData || !viewData.percent) return;

		// Формируем текст: "Просмотрено 1 ч. 23 м."
		var statusText = Lang.translate("title_viewed");
		var timeText = "";

		if (viewData.time && viewData.time > 0) {
			timeText = Utils.secondsToTimeHuman(viewData.time);
		} else {
			timeText = viewData.percent + "%";
		}

		var itemsToDraw = [
			{
				title: statusText + " " + timeText,
				percent: viewData.percent,
				isMovie: true,
			},
		];

		// true = movie mode (centered pill)
		drawHTML(cardNode, itemsToDraw, true);
	}

	function renderCard(cardNode, cardData) {
		var isSeries = (typeof cardData.number_of_seasons !== "undefined" && cardData.number_of_seasons > 0) || cardData.original_name;

		if (isSeries) {
			processSeries(cardNode, cardData);
		} else {
			processMovie(cardNode, cardData);
		}
	}

	// ------------------------------------------------------------------------
	// 5. ЗАПУСК (INIT)
	// ------------------------------------------------------------------------

	function startPlugin() {
		injectStyles();

		var processNode = function (node) {
			if (node.dataset.epDesignProcessed) return;

			var data = node.data || (window.jQuery && window.jQuery(node).data("data")) || node.card_data;

			if (data) {
				node.dataset.epDesignProcessed = "true";
				renderCard(node, data);

				node.addEventListener("mouseenter", function () {
					renderCard(node, data);
				});
			}
		};

		var observer = new MutationObserver(function (mutations) {
			mutations.forEach(function (mutation) {
				mutation.addedNodes.forEach(function (node) {
					if (node.nodeType === 1) {
						if (node.classList.contains("card")) {
							processNode(node);
						} else {
							var cards = node.querySelectorAll(".card");
							cards.forEach(processNode);
						}
					}
				});
			});
		});

		observer.observe(document.body, { childList: true, subtree: true });

		var existingCards = document.querySelectorAll(".card");
		existingCards.forEach(processNode);

		console.log(PREFIX, "Started. Movies aligned like pill with min-width.");
	}

	if (window.appready) {
		startPlugin();
	} else {
		Lampa.Listener.follow("app", function (e) {
			if (e.type == "ready") startPlugin();
		});
	}
})();
