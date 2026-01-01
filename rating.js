(function () {
	"use strict";

	var preloadQueue = [];
	var isPreloading = false;
	var preloadTimer = null;
	var preloadedIds = {};
	var pendingCards = {};

	function preloadRating(card, silent) {
		if (!card || !card.id) return;
		if (preloadedIds[card.id]) {
			console.log("[Rating Preload] Skip (already in preloadedIds):", card.id, card.title || card.name);
			if (!silent) Lampa.Noty.show("Preload Skip: " + (card.title || card.name));
			return;
		}

		var movieCache = _getCache(card.id);
		if (movieCache) {
			console.log("[Rating Preload] Skip (cache exists):", card.id, card.title || card.name, movieCache);
			if (!silent) Lampa.Noty.show("Cache Hit: " + (card.title || card.name));
			return;
		}

		preloadedIds[card.id] = true;
		preloadQueue.push(card);
		console.log("[Rating Preload] Added to queue:", card.id, card.title || card.name, "Queue size:", preloadQueue.length);
		if (!silent) Lampa.Noty.show("Added to queue: " + (card.title || card.name));

		if (!isPreloading) {
			processPreloadQueue();
		}
	}

	function processPreloadQueue() {
		if (preloadQueue.length === 0) {
			isPreloading = false;
			return;
		}

		isPreloading = true;
		var card = preloadQueue.shift();

		preloadRatingData(card, function () {
			setTimeout(processPreloadQueue, 100);
		});
	}

	function preloadRatingData(card, callback) {
		var network = new Lampa.Reguest();
		var clean_title = kpCleanTitle(card.title || card.name || "");
		var search_date = card.release_date || card.first_air_date || card.last_air_date || "0000";
		var search_year = parseInt((search_date + "").slice(0, 4));
		var orig = card.original_title || card.original_name;
		var kp_prox = "";
		var params = {
			id: card.id,
			url: kp_prox + "https://kinopoiskapiunofficial.tech/",
			rating_url: kp_prox + "https://rating.kinopoisk.ru/",
			headers: {
				"X-API-KEY": "2a4a0808-81a3-40ae-b0d3-e11335ede616",
			},
			cache_time: 60 * 60 * 24 * 1000,
		};

		var url = params.url;
		var url_by_title = Lampa.Utils.addUrlComponent(url + "api/v2.1/films/search-by-keyword", "keyword=" + encodeURIComponent(clean_title));
		if (card.imdb_id) url = Lampa.Utils.addUrlComponent(url + "api/v2.2/films", "imdbId=" + encodeURIComponent(card.imdb_id));
		else url = url_by_title;

		network.timeout(10000);
		network.silent(
			url,
			function (json) {
				var items = json.items || json.films || [];
				if (!items.length && url !== url_by_title) {
					network.clear();
					network.timeout(10000);
					network.silent(
						url_by_title,
						function (json2) {
							var items2 = json2.items || json2.films || [];
							processPreloadItems(items2, card, params, network, callback);
						},
						function () {
							if (callback) callback();
						},
						false,
						{ headers: params.headers },
					);
				} else {
					processPreloadItems(items, card, params, network, callback);
				}
			},
			function () {
				if (callback) callback();
			},
			false,
			{ headers: params.headers },
		);
	}

	function processPreloadItems(items, card, params, network, callback) {
		var search_date = card.release_date || card.first_air_date || card.last_air_date || "0000";
		var search_year = parseInt((search_date + "").slice(0, 4));
		var orig = card.original_title || card.original_name;
		var cardTitle = card.title || card.name || "Unknown";

		if (!items || !items.length) {
			setTimeout(function() { Lampa.Noty.show("No items found: " + cardTitle); }, 100);
			_setCache(params.id, { kp: 0, imdb: 0, timestamp: new Date().getTime() });
			if (callback) callback();
			return;
		}

		var is_sure = false;
		items.forEach(function (c) {
			var year = c.start_date || c.year || "0000";
			c.tmp_year = parseInt((year + "").slice(0, 4));
		});

		if (card.imdb_id) {
			var tmp = items.filter(function (elem) {
				return (elem.imdb_id || elem.imdbId) == card.imdb_id;
			});
			if (tmp.length) {
				items = tmp;
				is_sure = true;
			}
		}

		var cards = items;
		if (cards.length) {
			if (orig) {
				var _tmp = cards.filter(function (elem) {
					return containsTitle(elem.orig_title || elem.nameOriginal, orig) || containsTitle(elem.en_title || elem.nameEn, orig) || containsTitle(elem.title || elem.ru_title || elem.nameRu, orig);
				});
				if (_tmp.length) {
					cards = _tmp;
					is_sure = true;
				}
			}
			if (card.title || card.name) {
				var searchTitle = card.title || card.name;
				var _tmp2 = cards.filter(function (elem) {
					return containsTitle(elem.title || elem.ru_title || elem.nameRu, searchTitle) || containsTitle(elem.en_title || elem.nameEn, searchTitle) || containsTitle(elem.orig_title || elem.nameOriginal, searchTitle);
				});
				if (_tmp2.length) {
					cards = _tmp2;
					is_sure = true;
				}
			}
			if (cards.length > 1 && search_year) {
				var _tmp3 = cards.filter(function (c) {
					return c.tmp_year == search_year;
				});
				if (!_tmp3.length)
					_tmp3 = cards.filter(function (c) {
						return c.tmp_year && c.tmp_year > search_year - 2 && c.tmp_year < search_year + 2;
					});
				if (_tmp3.length) cards = _tmp3;
			}
		}

		if (cards.length == 1 && is_sure) {
			if (search_year && cards[0].tmp_year) {
				is_sure = cards[0].tmp_year > search_year - 2 && cards[0].tmp_year < search_year + 2;
			}
			if (is_sure) {
				is_sure = false;
				if (orig) {
					is_sure |= equalTitle(cards[0].orig_title || cards[0].nameOriginal, orig) || equalTitle(cards[0].en_title || cards[0].nameEn, orig) || equalTitle(cards[0].title || cards[0].ru_title || cards[0].nameRu, orig);
				}
				if (card.title || card.name) {
					var searchTitle = card.title || card.name;
					is_sure |= equalTitle(cards[0].title || cards[0].ru_title || cards[0].nameRu, searchTitle) || equalTitle(cards[0].en_title || cards[0].nameEn, searchTitle) || equalTitle(cards[0].orig_title || cards[0].nameOriginal, searchTitle);
				}
			}
		}

		if (cards.length == 1 && is_sure) {
			var id = cards[0].kp_id || cards[0].kinopoisk_id || cards[0].kinopoiskId || cards[0].filmId;
			setTimeout(function() { Lampa.Noty.show("Found KP ID: " + id + " for " + cardTitle); }, 100);

			network.clear();
			network.timeout(5000);
			network["native"](
				params.rating_url + id + ".xml",
				function (str) {
					if (str.indexOf("<rating>") >= 0) {
						try {
							var ratingKinopoisk = 0;
							var ratingImdb = 0;
							var xml = $($.parseXML(str));
							var kp_rating = xml.find("kp_rating");
							if (kp_rating.length) ratingKinopoisk = parseFloat(kp_rating.text());
							var imdb_rating = xml.find("imdb_rating");
							if (imdb_rating.length) ratingImdb = parseFloat(imdb_rating.text());
							_setCache(params.id, { kp: ratingKinopoisk, imdb: ratingImdb, timestamp: new Date().getTime() });
							if (callback) callback();
							return;
						} catch (ex) {}
					}

					network.clear();
					network.timeout(10000);
					network.silent(
						params.url + "api/v2.2/films/" + id,
						function (data) {
							_setCache(params.id, { kp: data.ratingKinopoisk, imdb: data.ratingImdb, timestamp: new Date().getTime() });
							if (callback) callback();
						},
						function () {
							_setCache(params.id, { kp: 0, imdb: 0, timestamp: new Date().getTime() });
							if (callback) callback();
						},
						false,
						{ headers: params.headers },
					);
				},
				function () {
					network.clear();
					network.timeout(10000);
					network.silent(
						params.url + "api/v2.2/films/" + id,
						function (data) {
							_setCache(params.id, { kp: data.ratingKinopoisk, imdb: data.ratingImdb, timestamp: new Date().getTime() });
							if (callback) callback();
						},
						function () {
							_setCache(params.id, { kp: 0, imdb: 0, timestamp: new Date().getTime() });
							if (callback) callback();
						},
						false,
						{ headers: params.headers },
					);
				},
				false,
				{ dataType: "text" },
			);
		} else {
			setTimeout(function() { Lampa.Noty.show("Not sure match: " + cardTitle + " cards:" + cards.length + " sure:" + is_sure); }, 100);
			_setCache(params.id, { kp: 0, imdb: 0, timestamp: new Date().getTime() });
			if (callback) callback();
		}
	}

	function findCardData(element) {
		if (!element) return null;
		var node = element.jquery ? element[0] : element;
		var originalNode = node;
		var steps = 0;
		while (node && !node.card_data && steps < 10) {
			node = node.parentNode;
			steps++;
		}
		
		if (node && node.card_data) {
			return node.card_data;
		} else {
			setTimeout(function() { 
				Lampa.Noty.show("No card_data found for element, steps: " + steps); 
			}, 300);
			return null;
		}
	}

	function preloadAllVisibleCards() {
		clearTimeout(preloadTimer);
		preloadTimer = setTimeout(function () {
			var layer = $(".layer--visible");
			if (!layer.length) layer = $("body");

			var cards = layer.find(".card");
			setTimeout(function() { Lampa.Noty.show("Found " + cards.length + " cards"); }, 50);
			
			var foundCards = 0;
			var addedCards = 0;
			
			cards.each(function () {
				var data = findCardData(this);
				if (data && data.id) {
					foundCards++;
					var title = data.title || data.name || "Unknown";
					if (!preloadedIds[data.id]) {
						addedCards++;
						setTimeout(function() { Lampa.Noty.show("Preload: " + title + " ID:" + data.id); }, 100 + addedCards * 50);
					}
					preloadRating(data, true);
				}
			});
			
			setTimeout(function() { Lampa.Noty.show("Cards with data: " + foundCards + ", Added: " + addedCards); }, 200);
		}, 500);
	}

	function setupPreloadObserver() {
		var observer = new MutationObserver(function (mutations) {
			var hasNewCards = false;
			for (var i = 0; i < mutations.length; i++) {
				var added = mutations[i].addedNodes;
				for (var j = 0; j < added.length; j++) {
					var node = added[j];
					if (node.nodeType === 1) {
						if (node.classList && (node.classList.contains("card") || (node.querySelector && node.querySelector(".card")))) {
							hasNewCards = true;
							break;
						}
					}
				}
				if (hasNewCards) break;
			}
			if (hasNewCards) {
				preloadAllVisibleCards();
			}
		});

		observer.observe(document.body, {
			childList: true,
			subtree: true,
		});
	}

	function _getCache(movie) {
		var timestamp = new Date().getTime();
		var cache = Lampa.Storage.cache("kp_rating", 500, {});
		if (cache[movie]) {
			var cache_time = 60 * 60 * 24 * 1000;
			if (timestamp - cache[movie].timestamp > cache_time) {
				console.log("[Rating Cache] Expired:", movie);
				delete cache[movie];
				Lampa.Storage.set("kp_rating", cache);
				return false;
			}
			console.log("[Rating Cache] Hit:", movie, cache[movie]);
			return cache[movie];
		}
		console.log("[Rating Cache] Miss:", movie);
		return false;
	}

	function _setCache(movie, data) {
		var timestamp = new Date().getTime();
		var cache = Lampa.Storage.cache("kp_rating", 500, {});
		var cache_time = 60 * 60 * 24 * 1000;
		if (!cache[movie]) {
			cache[movie] = data;
			Lampa.Storage.set("kp_rating", cache);
			console.log("[Rating Cache] Set new:", movie, data);
			setTimeout(function() { Lampa.Noty.show("Cache Set: " + movie + " KP:" + data.kp + " IMDB:" + data.imdb); }, 100);
		} else {
			if (timestamp - cache[movie].timestamp > cache_time) {
				data.timestamp = timestamp;
				cache[movie] = data;
				Lampa.Storage.set("kp_rating", cache);
				console.log("[Rating Cache] Updated (expired):", movie, data);
				setTimeout(function() { Lampa.Noty.show("Cache Updated: " + movie); }, 100);
			} else {
				data = cache[movie];
				console.log("[Rating Cache] Already exists, returning cached:", movie, data);
			}
		}
		
		if (pendingCards[movie]) {
			console.log("[Rating Cache] Found pending card, showing rating:", movie);
			setTimeout(function() { Lampa.Noty.show("Showing pending: " + movie); }, 200);
			_showRating(data, pendingCards[movie]);
			delete pendingCards[movie];
		}
		
		return data;
	}

	function cleanTitle(str) {
		return str.replace(/[\s.,:;''`!?]+/g, " ").trim();
	}

	function kpCleanTitle(str) {
		return cleanTitle(str)
			.replace(/^[ \/\\]+/, "")
			.replace(/[ \/\\]+$/, "")
			.replace(/\+( *[+\/\\])+/g, "+")
			.replace(/([+\/\\] *)+\+/g, "+")
			.replace(/( *[\/\\]+ *)+/g, "+");
	}

	function normalizeTitle(str) {
		return cleanTitle(
			str
				.toLowerCase()
				.replace(/[\-\u2010-\u2015\u2E3A\u2E3B\uFE58\uFE63\uFF0D]+/g, "-")
				.replace(/ё/g, "е"),
		);
	}

	function equalTitle(t1, t2) {
		return typeof t1 === "string" && typeof t2 === "string" && normalizeTitle(t1) === normalizeTitle(t2);
	}

	function containsTitle(str, title) {
		return typeof str === "string" && typeof title === "string" && normalizeTitle(str).indexOf(normalizeTitle(title)) !== -1;
	}

	function rating_kp_imdb(card) {
		var network = new Lampa.Reguest();
		var clean_title = kpCleanTitle(card.title);
		var search_date = card.release_date || card.first_air_date || card.last_air_date || "0000";
		var search_year = parseInt((search_date + "").slice(0, 4));
		var orig = card.original_title || card.original_name;
		var kp_prox = "";
		var params = {
			id: card.id,
			url: kp_prox + "https://kinopoiskapiunofficial.tech/",
			rating_url: kp_prox + "https://rating.kinopoisk.ru/",
			headers: {
				"X-API-KEY": "2a4a0808-81a3-40ae-b0d3-e11335ede616",
			},
			cache_time: 60 * 60 * 24 * 1000, //86400000 сек = 1день Время кэша в секундах
		};
		getRating();

		function getRating() {
			var movieRating = _getCache(params.id);
			if (movieRating) {
				return _showRatingLocal(movieRating);
			} else {
				searchFilm();
			}
		}

		function searchFilm() {
			var url = params.url;
			var url_by_title = Lampa.Utils.addUrlComponent(url + "api/v2.1/films/search-by-keyword", "keyword=" + encodeURIComponent(clean_title));
			if (card.imdb_id) url = Lampa.Utils.addUrlComponent(url + "api/v2.2/films", "imdbId=" + encodeURIComponent(card.imdb_id));
			else url = url_by_title;
			network.clear();
			network.timeout(15000);
			network.silent(
				url,
				function (json) {
					if (json.items && json.items.length) chooseFilm(json.items);
					else if (json.films && json.films.length) chooseFilm(json.films);
					else if (url !== url_by_title) {
						network.clear();
						network.timeout(15000);
						network.silent(
							url_by_title,
							function (json) {
								if (json.items && json.items.length) chooseFilm(json.items);
								else if (json.films && json.films.length) chooseFilm(json.films);
								else chooseFilm([]);
							},
							function (a, c) {
								showError(network.errorDecode(a, c));
							},
							false,
							{
								headers: params.headers,
							},
						);
					} else chooseFilm([]);
				},
				function (a, c) {
					showError(network.errorDecode(a, c));
				},
				false,
				{
					headers: params.headers,
				},
			);
		}

		function chooseFilm(items) {
			if (items && items.length) {
				var is_sure = false;
				var is_imdb = false;
				items.forEach(function (c) {
					var year = c.start_date || c.year || "0000";
					c.tmp_year = parseInt((year + "").slice(0, 4));
				});
				if (card.imdb_id) {
					var tmp = items.filter(function (elem) {
						return (elem.imdb_id || elem.imdbId) == card.imdb_id;
					});
					if (tmp.length) {
						items = tmp;
						is_sure = true;
						is_imdb = true;
					}
				}
				var cards = items;
				if (cards.length) {
					if (orig) {
						var _tmp = cards.filter(function (elem) {
							return containsTitle(elem.orig_title || elem.nameOriginal, orig) || containsTitle(elem.en_title || elem.nameEn, orig) || containsTitle(elem.title || elem.ru_title || elem.nameRu, orig);
						});
						if (_tmp.length) {
							cards = _tmp;
							is_sure = true;
						}
					}
					if (card.title) {
						var _tmp2 = cards.filter(function (elem) {
							return containsTitle(elem.title || elem.ru_title || elem.nameRu, card.title) || containsTitle(elem.en_title || elem.nameEn, card.title) || containsTitle(elem.orig_title || elem.nameOriginal, card.title);
						});
						if (_tmp2.length) {
							cards = _tmp2;
							is_sure = true;
						}
					}
					if (cards.length > 1 && search_year) {
						var _tmp3 = cards.filter(function (c) {
							return c.tmp_year == search_year;
						});
						if (!_tmp3.length)
							_tmp3 = cards.filter(function (c) {
								return c.tmp_year && c.tmp_year > search_year - 2 && c.tmp_year < search_year + 2;
							});
						if (_tmp3.length) cards = _tmp3;
					}
				}
				if (cards.length == 1 && is_sure && !is_imdb) {
					if (search_year && cards[0].tmp_year) {
						is_sure = cards[0].tmp_year > search_year - 2 && cards[0].tmp_year < search_year + 2;
					}
					if (is_sure) {
						is_sure = false;
						if (orig) {
							is_sure |= equalTitle(cards[0].orig_title || cards[0].nameOriginal, orig) || equalTitle(cards[0].en_title || cards[0].nameEn, orig) || equalTitle(cards[0].title || cards[0].ru_title || cards[0].nameRu, orig);
						}
						if (card.title) {
							is_sure |= equalTitle(cards[0].title || cards[0].ru_title || cards[0].nameRu, card.title) || equalTitle(cards[0].en_title || cards[0].nameEn, card.title) || equalTitle(cards[0].orig_title || cards[0].nameOriginal, card.title);
						}
					}
				}
				if (cards.length == 1 && is_sure) {
					var id = cards[0].kp_id || cards[0].kinopoisk_id || cards[0].kinopoiskId || cards[0].filmId;
					var base_search = function base_search() {
						network.clear();
						network.timeout(15000);
						network.silent(
							params.url + "api/v2.2/films/" + id,
							function (data) {
								var movieRating = _setCache(params.id, {
									kp: data.ratingKinopoisk,
									imdb: data.ratingImdb,
									timestamp: new Date().getTime(),
								});
								return _showRatingLocal(movieRating);
							},
							function (a, c) {
								showError(network.errorDecode(a, c));
							},
							false,
							{
								headers: params.headers,
							},
						);
					};
					network.clear();
					network.timeout(5000);
					network["native"](
						params.rating_url + id + ".xml",
						function (str) {
							if (str.indexOf("<rating>") >= 0) {
								try {
									var ratingKinopoisk = 0;
									var ratingImdb = 0;
									var xml = $($.parseXML(str));
									var kp_rating = xml.find("kp_rating");
									if (kp_rating.length) {
										ratingKinopoisk = parseFloat(kp_rating.text());
									}
									var imdb_rating = xml.find("imdb_rating");
									if (imdb_rating.length) {
										ratingImdb = parseFloat(imdb_rating.text());
									}
									var movieRating = _setCache(params.id, {
										kp: ratingKinopoisk,
										imdb: ratingImdb,
										timestamp: new Date().getTime(),
									});
									return _showRatingLocal(movieRating);
								} catch (ex) {}
							}
							base_search();
						},
						function (a, c) {
							base_search();
						},
						false,
						{
							dataType: "text",
						},
					);
				} else {
					var movieRating = _setCache(params.id, {
						kp: 0,
						imdb: 0,
						timestamp: new Date().getTime(),
					});
					return _showRatingLocal(movieRating);
				}
			} else {
				var _movieRating = _setCache(params.id, {
					kp: 0,
					imdb: 0,
					timestamp: new Date().getTime(),
				});
				return _showRatingLocal(_movieRating);
			}
		}

		function showError(error) {
			Lampa.Noty.show("Рейтинг KP: " + error);
		}

		function _showRatingLocal(data) {
			_showRating(data);
		}
	}

	function startPlugin() {
		window.rating_plugin = true;

		setupPreloadObserver();

		Lampa.Listener.follow("activity", function (e) {
			if (e.type === "active" || e.type === "start") {
				setTimeout(preloadAllVisibleCards, 800);
			}
		});

		Lampa.Listener.follow("full", function (e) {
			if (e.type == "complite") {
				var render = e.object.activity.render();
				var movieId = e.data.movie.id;
				var movieTitle = e.data.movie.title || e.data.movie.name;
				var $kpEl = $(".rate--kp", render);
				var kpHidden = $kpEl.hasClass("hide");
				var kpText = $kpEl.find("> div").eq(0).text();
				var hasWaitRating = $(".wait_rating", render).length > 0;
				
				var serverKp = e.data.movie.kp_rating;
				var serverImdb = e.data.movie.imdb_rating;
				console.log("[Rating Full] Card opened:", movieId, movieTitle);
				console.log("[Rating Full] Server ratings - KP:", serverKp, "IMDB:", serverImdb);
				console.log("[Rating Full] KP hidden:", kpHidden, "KP text:", kpText, "Wait rating:", hasWaitRating);
				
				setTimeout(function() { Lampa.Noty.show("Server KP:" + (serverKp || "none") + " IMDB:" + (serverImdb || "none")); }, 50);
				
				if (kpHidden && !hasWaitRating) {
					var movieCache = _getCache(movieId);
					if (movieCache) {
						console.log("[Rating Full] Using cached rating:", movieId, movieCache);
						setTimeout(function() { Lampa.Noty.show("Using cache: " + movieTitle); }, 150);
						_showRating(movieCache, render);
					} else if (preloadedIds[movieId]) {
						console.log("[Rating Full] Preload in progress, waiting:", movieId);
						setTimeout(function() { Lampa.Noty.show("Waiting preload: " + movieTitle); }, 150);
						pendingCards[movieId] = render;
					} else {
						console.log("[Rating Full] No cache, loading from API:", movieId);
						setTimeout(function() { Lampa.Noty.show("Loading API: " + movieTitle); }, 150);
						$(".info__rate", render).after('<div style="width:2em;margin-top:1em;margin-right:1em" class="wait_rating"><div class="broadcast__scan"><div></div></div><div>');
						rating_kp_imdb(e.data.movie);
					}
				} else {
					console.log("[Rating Full] Skipped - rating already visible or loading");
					setTimeout(function() { Lampa.Noty.show("Skipped: " + movieTitle); }, 150);
				}
			}
		});

		setTimeout(preloadAllVisibleCards, 1000);
	}

	function applyRatingColors(element, rating) {
		if (!element || !element.length) return;

		var isColoredRatingsEnabled = false;

		try {
			if (typeof Lampa !== "undefined" && Lampa.Storage) {
				isColoredRatingsEnabled = Lampa.Storage.get("colored_ratings", true);
			}

			if (!isColoredRatingsEnabled && typeof window !== "undefined") {
				var bodyClasses = document.body ? document.body.className : "";
				if (bodyClasses.indexOf("colored-ratings") !== -1) {
					isColoredRatingsEnabled = true;
				}
			}
		} catch (e) {}

		if (!isColoredRatingsEnabled || isNaN(rating) || rating <= 0) return;

		var color = "";

		if (rating >= 0 && rating <= 3) {
			color = "red";
		} else if (rating > 3 && rating < 6) {
			color = "orange";
		} else if (rating >= 6 && rating < 7) {
			color = "cornflowerblue";
		} else if (rating >= 7 && rating < 8) {
			color = "darkmagenta";
		} else if (rating >= 8 && rating <= 10) {
			color = "lawngreen";
		}

		if (color) {
			element.css("color", color);
		}
	}

	function _showRating(data, render) {
		if (!render) render = Lampa.Activity.active().activity.render();
		if (data) {
			$(".wait_rating", render).remove();

			var kp_rating_num = parseFloat(data.kp);
			var imdb_rating_num = parseFloat(data.imdb);

			var $kpElement = $(".rate--kp", render);
			var $imdbElement = $(".rate--imdb", render);

			if (!isNaN(kp_rating_num) && kp_rating_num > 0) {
				var kp_rating = kp_rating_num.toFixed(1);
				$kpElement.removeClass("hide").find("> div").eq(0).text(kp_rating);
				applyRatingColors($kpElement.find("> div").eq(0), kp_rating_num);
			} else {
				$kpElement.addClass("hide");
			}

			if (!isNaN(imdb_rating_num) && imdb_rating_num > 0) {
				var imdb_rating = imdb_rating_num.toFixed(1);
				$imdbElement.removeClass("hide").find("> div").eq(0).text(imdb_rating);
				applyRatingColors($imdbElement.find("> div").eq(0), imdb_rating_num);
			} else {
				$imdbElement.addClass("hide");
			}
		}
	}

	if (!window.rating_plugin) startPlugin();
})();
