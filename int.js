(function () {
	"use strict";
	Lampa.Platform.tv();

	if (typeof Lampa === "undefined") return;

	if (!Lampa.Maker || !Lampa.Maker.map || !Lampa.Utils) return;
	if (window.plugin_interface_ready_v3) return;

	window.plugin_interface_ready_v3 = true;

	addStyles();
	initializeSettings();

	var mainMaker = Lampa.Maker.map("Main");
	if (!mainMaker || !mainMaker.Items || !mainMaker.Create) return;

	wrapMethod(mainMaker.Items, "onInit", function (originalMethod, args) {
		if (originalMethod) originalMethod.apply(this, args);
		this.__newInterfaceEnabled = shouldEnableInterface(this && this.object);
	});

	wrapMethod(mainMaker.Create, "onCreate", function (originalMethod, args) {
		if (originalMethod) originalMethod.apply(this, args);
		if (!this.__newInterfaceEnabled) return;

		var state = getOrCreateState(this);
		state.attach();
	});

	wrapMethod(mainMaker.Create, "onCreateAndAppend", function (originalMethod, args) {
		var data = args && args[0];
		if (this.__newInterfaceEnabled && data) {
			extendResultsWithStyle(data);
		}
		return originalMethod ? originalMethod.apply(this, args) : undefined;
	});

	wrapMethod(mainMaker.Items, "onAppend", function (originalMethod, args) {
		if (originalMethod) originalMethod.apply(this, args);
		if (!this.__newInterfaceEnabled) return;

		var element = args && args[0];
		var data = args && args[1];
		if (element && data) {
			handleLineAppend(this, element, data);
		}
	});

	wrapMethod(mainMaker.Items, "onDestroy", function (originalMethod, args) {
		if (this.__newInterfaceState) {
			this.__newInterfaceState.destroy();
			delete this.__newInterfaceState;
		}
		delete this.__newInterfaceEnabled;
		if (originalMethod) originalMethod.apply(this, args);
	});

	function shouldEnableInterface(object) {
		if (!object) return false;
		if (window.innerWidth < 767) return false;
		if (Lampa.Platform.screen("mobile")) return false;
		if (object.title === "Избранное") return false;
		return true;
	}

	function getOrCreateState(createInstance) {
		if (createInstance.__newInterfaceState) {
			return createInstance.__newInterfaceState;
		}
		var state = createState(createInstance);
		createInstance.__newInterfaceState = state;
		return state;
	}

	function createState(mainInstance) {
		var infoPanel = new InfoPanel();
		infoPanel.create();

		var backgroundImage = document.createElement("img");
		backgroundImage.className = "full-start__background";

		var state = {
			main: mainInstance,
			info: infoPanel,
			background: backgroundImage,
			infoElement: null,
			backgroundTimer: null,
			backgroundLast: "",
			attached: false,

			attach: function () {
				if (this.attached) return;

				var container = mainInstance.render(true);
				if (!container) return;

				container.classList.add("new-interface");

				if (!backgroundImage.parentElement) {
					container.insertBefore(backgroundImage, container.firstChild || null);
				}

				var infoElement = infoPanel.render(true);
				this.infoElement = infoElement;

				if (infoElement && infoElement.parentNode !== container) {
					if (backgroundImage.parentElement === container) {
						container.insertBefore(infoElement, backgroundImage.nextSibling);
					} else {
						container.insertBefore(infoElement, container.firstChild || null);
					}
				}

				mainInstance.scroll.minus(infoElement);
				this.attached = true;
			},

			update: function (data) {
				if (!data) return;
				infoPanel.update(data);
				this.updateBackground(data);
			},

			updateBackground: function (data) {
				var backdropUrl = data && data.backdrop_path ? Lampa.Api.img(data.backdrop_path, "w1280") : "";

				if (!backdropUrl || backdropUrl === this.backgroundLast) return;

				clearTimeout(this.backgroundTimer);
				var self = this;

				this.backgroundTimer = setTimeout(function () {
					backgroundImage.classList.remove("loaded");

					backgroundImage.onload = function () {
						backgroundImage.classList.add("loaded");
					};

					backgroundImage.onerror = function () {
						backgroundImage.classList.remove("loaded");
					};

					self.backgroundLast = backdropUrl;

					setTimeout(function () {
						backgroundImage.src = self.backgroundLast;
					}, 50);
				}, 100);
			},

			reset: function () {
				infoPanel.empty();
			},

			destroy: function () {
				clearTimeout(this.backgroundTimer);
				infoPanel.destroy();

				var container = mainInstance.render(true);
				if (container) {
					container.classList.remove("new-interface");
				}

				if (this.infoElement && this.infoElement.parentNode) {
					this.infoElement.parentNode.removeChild(this.infoElement);
				}

				if (backgroundImage && backgroundImage.parentNode) {
					backgroundImage.parentNode.removeChild(backgroundImage);
				}

				this.attached = false;
			},
		};

		return state;
	}

	function extendResultsWithStyle(data) {
		if (!data) return;

		if (Array.isArray(data.results)) {
			Lampa.Utils.extendItemsParams(data.results, {
				style: {
					name: Lampa.Storage.get("wide_post") !== false ? "wide" : "small",
				},
			});
		}
	}

	function handleCard(state, card) {
		if (!card || card.__newInterfaceCard) return;
		if (typeof card.use !== "function" || !card.data) return;

		card.__newInterfaceCard = true;
		card.params = card.params || {};
		card.params.style = card.params.style || {};

		var targetStyle = Lampa.Storage.get("wide_post") !== false ? "wide" : "small";
		card.params.style.name = targetStyle;

		if (card.render && typeof card.render === "function") {
			var element = card.render(true);
			if (element) {
				var node = element.jquery ? element[0] : element;
				if (node && node.classList) {
					if (targetStyle === "wide") {
						node.classList.add("card--wide");
						node.classList.remove("card--small");
					} else {
						node.classList.add("card--small");
						node.classList.remove("card--wide");
					}
				}
			}
		}

		card.use({
			onFocus: function () {
				state.update(card.data);
			},
			onHover: function () {
				state.update(card.data);
			},
			onTouch: function () {
				state.update(card.data);
			},
			onDestroy: function () {
				delete card.__newInterfaceCard;
			},
		});
	}

	function getCardData(card, results, index) {
		index = index || 0;

		if (card && card.data) return card.data;
		if (results && Array.isArray(results.results)) {
			return results.results[index] || results.results[0];
		}

		return null;
	}

	function findCardData(element) {
		if (!element) return null;

		var node = element && element.jquery ? element[0] : element;

		while (node && !node.card_data) {
			node = node.parentNode;
		}

		return node && node.card_data ? node.card_data : null;
	}

	function getFocusedCard(items) {
		var container = items && typeof items.render === "function" ? items.render(true) : null;
		if (!container || !container.querySelector) return null;

		var focusedElement = container.querySelector(".selector.focus") || container.querySelector(".focus");
		return findCardData(focusedElement);
	}

	function handleLineAppend(items, line, data) {
		if (line.__newInterfaceLine) return;
		line.__newInterfaceLine = true;

		var state = getOrCreateState(items);

		var processCard = function (card) {
			handleCard(state, card);
		};

		line.use({
			onInstance: function (instance) {
				processCard(instance);
			},
			onActive: function (card, results) {
				var cardData = getCardData(card, results);
				if (cardData) state.update(cardData);
			},
			onToggle: function () {
				setTimeout(function () {
					var focusedCard = getFocusedCard(line);
					if (focusedCard) state.update(focusedCard);
				}, 32);
			},
			onMore: function () {
				state.reset();
			},
			onDestroy: function () {
				state.reset();
				delete line.__newInterfaceLine;
			},
		});

		if (Array.isArray(line.items) && line.items.length) {
			line.items.forEach(processCard);
		}

		if (line.last) {
			var lastCardData = findCardData(line.last);
			if (lastCardData) state.update(lastCardData);
		}
	}

	function wrapMethod(object, methodName, wrapper) {
		if (!object) return;

		var originalMethod = typeof object[methodName] === "function" ? object[methodName] : null;

		object[methodName] = function () {
			var args = Array.prototype.slice.call(arguments);
			return wrapper.call(this, originalMethod, args);
		};
	}

	function addStyles() {
		if (addStyles.added) return;
		addStyles.added = true;

		var styles = Lampa.Storage.get("wide_post") !== false ? getWideStyles() : getSmallStyles();

		Lampa.Template.add("new_interface_style_v3", styles);
		$("body").append(Lampa.Template.get("new_interface_style_v3", {}, true));
	}

	function getWideStyles() {
		return `<style>
				.new-interface-info__head, .new-interface-info__details{ opacity: 0; transition: opacity 0.5s ease; min-height: 2.2em !important;}
				.new-interface-info__head.visible, .new-interface-info__details.visible{ opacity: 1; }
				.new-interface .card.card--wide {
					width: 18.3em;
				}
				.new-interface .card.card--small {
					width: 18.3em;
				}
				.new-interface-info {
					position: relative;
					padding: 1.5em;
					height: 26em;
				}
				.new-interface-info__body {
					width: 80%;
					padding-top: 1.1em;
				}
				.new-interface-info__head {
					color: rgba(255, 255, 255, 0.6);
					font-size: 1.3em;
					min-height: 1em;
				}
				.new-interface-info__head span {
					color: #fff;
				}
				.new-interface-info__title {
					font-size: 4em;
					font-weight: 600;
					margin-bottom: 0.3em;
					overflow: hidden;
					-o-text-overflow: '.';
					text-overflow: '.';
					display: -webkit-box;
					-webkit-line-clamp: 1;
					line-clamp: 1;
					-webkit-box-orient: vertical;
					margin-left: -0.03em;
					line-height: 1.3;
				}
				.new-interface-info__details {
					margin-bottom: 1.6em;
					display: flex;
					align-items: center;
					flex-wrap: wrap;
					min-height: 1.9em;
					font-size: 1.3em;
				}
				.new-interface-info__split {
					margin: 0 1em;
					font-size: 0.7em;
				}
				.new-interface-info__description {
					font-size: 1.4em;
					font-weight: 310;
					line-height: 1.3;
					overflow: hidden;
					-o-text-overflow: '.';
					text-overflow: '.';
					display: -webkit-box;
					-webkit-line-clamp: 3;
					line-clamp: 3;
					-webkit-box-orient: vertical;
					width: 65%;
				}
				.new-interface .card-more__box {
					padding-bottom: 95%;
				}
				.new-interface .full-start__background {
					height: 108%;
					top: -5em;
				}
				.new-interface .full-start__rate {
					font-size: 1.3em;
					margin-right: 0;
				}
				.new-interface .card__promo {
					display: none;
				}
				.new-interface .card.card--wide + .card-more .card-more__box {
					padding-bottom: 95%;
				}
				.new-interface .card.card--wide .card-watched {
					display: none !important;
				}
				body.light--version .new-interface-info__body {
					width: 69%;
					padding-top: 1.5em;
				}
				body.light--version .new-interface-info {
					height: 25.3em;
				}
				body.advanced--animation:not(.no--animation) .new-interface .card.card--wide.focus .card__view {
					animation: animation-card-focus 0.2s;
				}
				body.advanced--animation:not(.no--animation) .new-interface .card.card--wide.animate-trigger-enter .card__view {
					animation: animation-trigger-enter 0.2s forwards;
				}
				body.advanced--animation:not(.no--animation) .new-interface .card.card--small.focus .card__view {
					animation: animation-card-focus 0.2s;
				}
				body.advanced--animation:not(.no--animation) .new-interface .card.card--small.animate-trigger-enter .card__view {
					animation: animation-trigger-enter 0.2s forwards;
				}
				.logo-moved-head { transition: opacity 0.4s ease; }
				.logo-moved-separator { transition: opacity 0.4s ease; }
			</style>`;
	}

	function getSmallStyles() {
		return `<style>
					.new-interface-info__head, .new-interface-info__details, .new-interface-info__description{ opacity: 0; transition: opacity 0.5s ease; }
					.new-interface-info__head.visible, .new-interface-info__details.visible, .new-interface-info__description.visible{ opacity: 1; }
					.new-interface .card.card--wide {
						width: 18.3em;
					}
					.new-interface .card.card--small {
						width: 18.3em;
					}
					.card .card__age,
					.card .card__title {
						display: none !important;
					}
					.new-interface-info {
						position: relative;
						padding: 1.5em;
						height: 17.4em;
					}
					.new-interface-info__body {
						width: 80%;
						padding-top: 0.2em;
					}
					.new-interface-info__head {
						color: rgba(255, 255, 255, 0.6);
						margin-bottom: 0.3em;
						font-size: 1.2em;
						min-height: 1em;
					}
					.new-interface-info__head span {
						color: #fff;
					}
					.new-interface-info__title {
						font-size: 3em;
						font-weight: 600;
						margin-bottom: 0.2em;
						overflow: hidden;
						-o-text-overflow: '.';
						text-overflow: '.';
						display: -webkit-box;
						-webkit-line-clamp: 1;
						line-clamp: 1;
						-webkit-box-orient: vertical;
						margin-left: -0.03em;
						line-height: 1.3;
					}
					.new-interface-info__details {
						margin-bottom: 1.6em;
						display: flex;
						align-items: center;
						flex-wrap: wrap;
						min-height: 1.9em;
						font-size: 1.2em;
					}
					.new-interface-info__split {
						margin: 0 1em;
						font-size: 0.7em;
					}
					.new-interface-info__description {
						font-size: 1.3em;
						font-weight: 310;
						line-height: 1.3;
						overflow: hidden;
						-o-text-overflow: '.';
						text-overflow: '.';
						display: -webkit-box;
						-webkit-line-clamp: 2;
						line-clamp: 2;
						-webkit-box-orient: vertical;
						width: 70%;
					}
					.new-interface .card-more__box {
						padding-bottom: 150%;
					}
					.new-interface .full-start__background {
						height: 108%;
						top: -5em;
					}
					.new-interface .full-start__rate {
						font-size: 1.2em;
						margin-right: 0;
					}
					.new-interface .card__promo {
						display: none;
					}
					.new-interface .card.card--wide + .card-more .card-more__box {
						padding-bottom: 95%;
					}
					.new-interface .card.card--wide .card-watched {
						display: none !important;
					}
					body.light--version .new-interface-info__body {
						width: 69%;
						padding-top: 1.5em;
					}
					body.light--version .new-interface-info {
						height: 25.3em;
					}
					body.advanced--animation:not(.no--animation) .new-interface .card.card--wide.focus .card__view {
						animation: animation-card-focus 0.2s;
					}
					body.advanced--animation:not(.no--animation) .new-interface .card.card--wide.animate-trigger-enter .card__view {
						animation: animation-trigger-enter 0.2s forwards;
					}
					body.advanced--animation:not(.no--animation) .new-interface .card.card--small.focus .card__view {
						animation: animation-card-focus 0.2s;
					}
					body.advanced--animation:not(.no--animation) .new-interface .card.card--small.animate-trigger-enter .card__view {
						animation: animation-trigger-enter 0.2s forwards;
					}
					.logo-moved-head { transition: opacity 0.4s ease; }
					.logo-moved-separator { transition: opacity 0.4s ease; }
					</style>`;
	}

	function InfoPanel() {
		this.html = null;
		this.timer = null;
		this.fadeTimer = null;
		this.network = new Lampa.Reguest();
		this.loaded = {};
		this.currentUrl = null;
	}

	InfoPanel.prototype.create = function () {
		this.html = $(`<div class="new-interface-info">
							<div class="new-interface-info__body">
								<div class="new-interface-info__head"></div>
								<div class="new-interface-info__title"></div>
								<div class="new-interface-info__details"></div>
								<div class="new-interface-info__description"></div>
							</div>
						</div>`);
	};

	InfoPanel.prototype.render = function (asElement) {
		if (!this.html) this.create();
		return asElement ? this.html[0] : this.html;
	};

	InfoPanel.prototype.update = function (data) {
		if (!data || !this.html) return;

		this.lastRenderId = Date.now();
		var currentRenderId = this.lastRenderId;

		this.html.find(".new-interface-info__head,.new-interface-info__details").removeClass("visible");

		var title = this.html.find(".new-interface-info__title");
		var desc = this.html.find(".new-interface-info__description");

		if (Lampa.Storage.get("desc") !== false) {
			desc.text(data.overview || Lampa.Lang.translate("full_notext"));
		}

		clearTimeout(this.fadeTimer);

		Lampa.Background.change(Lampa.Api.img(data.backdrop_path, "w200"));

		this.load(data);

		if (Lampa.Storage.get("logo_show", true)) {
			var check_type = data.name ? "tv" : "movie";
			var check_lang = Lampa.Storage.get("language");
			var check_key = "logo_cache_v2_" + check_type + "_" + data.id + "_" + check_lang;
			var check_cached = Lampa.Storage.get(check_key);

			if (check_cached && check_cached !== "none") {
				title.text(data.title || data.name || "");
				title.css({ opacity: 0 });
				this.showLogo(data, currentRenderId);
			} else {
				title.text(data.title || data.name || "");
				title.css({ opacity: 1 });
				this.showLogo(data, currentRenderId);
			}
		} else {
			title.text(data.title || data.name || "");
			title.css({ opacity: 1 });
		}
	};

	InfoPanel.prototype.showLogo = function (data, renderId) {
		var _this = this;

		var FADE_OUT_TEXT = 300;
		var MORPH_HEIGHT = 400;
		var FADE_IN_IMG = 400;
		var TARGET_WIDTH = "7em";
		var PADDING_TOP_EM = 0;
		var PADDING_BOTTOM_EM = 0.2;

		var title_elem = this.html.find(".new-interface-info__title");
		var head_elem = this.html.find(".new-interface-info__head");
		var details_elem = this.html.find(".new-interface-info__details");
		var dom_title = title_elem[0];

		function animateHeight(element, start, end, duration, callback) {
			var startTime = null;
			function step(timestamp) {
				if (!startTime) startTime = timestamp;
				var progress = timestamp - startTime;
				var percent = Math.min(progress / duration, 1);
				var ease = 1 - Math.pow(1 - percent, 3);
				element.style.height = start + (end - start) * ease + "px";
				if (progress < duration) {
					requestAnimationFrame(step);
				} else {
					if (callback) callback();
				}
			}
			requestAnimationFrame(step);
		}

		function animateOpacity(element, start, end, duration, callback) {
			var startTime = null;
			function step(timestamp) {
				if (!startTime) startTime = timestamp;
				var progress = timestamp - startTime;
				var percent = Math.min(progress / duration, 1);
				var ease = 1 - Math.pow(1 - percent, 3);
				element.style.opacity = start + (end - start) * ease;
				if (progress < duration) {
					requestAnimationFrame(step);
				} else {
					if (callback) callback();
				}
			}
			requestAnimationFrame(step);
		}

		function applyFinalStyles(img, text_height) {
			img.style.marginTop = "0";
			img.style.marginLeft = "0";
			img.style.paddingTop = PADDING_TOP_EM + "em";
			img.style.paddingBottom = PADDING_BOTTOM_EM + "em";

			img.style.imageRendering = "-webkit-optimize-contrast";

			if (text_height) {
				img.style.height = text_height + "px";
				img.style.width = "auto";
				img.style.maxWidth = "100%";
				img.style.maxHeight = "none";
			} else if (window.innerWidth < 768) {
				img.style.width = "100%";
				img.style.height = "auto";
				img.style.maxWidth = "100%";
				img.style.maxHeight = "none";
			} else {
				img.style.width = TARGET_WIDTH;
				img.style.height = "auto";
				img.style.maxHeight = "none";
				img.style.maxWidth = "100%";
			}

			img.style.boxSizing = "border-box";
			img.style.display = "block";
			img.style.objectFit = "contain";
			img.style.objectPosition = "left bottom";
			img.style.transition = "none";
		}

		function moveHeadToDetails(animate) {
			if (!head_elem.length || !details_elem.length) return;
			if (details_elem.find(".logo-moved-head").length > 0) return;

			var content = head_elem.html();
			if (!content || content.trim() === "") return;

			var new_item = $('<span class="logo-moved-head">' + content + "</span>");
			var separator = $('<span class="new-interface-info__split logo-moved-separator">●</span>');

			if (animate) {
				new_item.css({ opacity: 0, transition: "none" });
				separator.css({ opacity: 0, transition: "none" });
			}

			if (details_elem.children().length > 0) details_elem.append(separator);
			details_elem.append(new_item);

			if (animate) {
				head_elem.css({
					transition: "opacity " + FADE_OUT_TEXT / 1000 + "s ease",
					opacity: "0",
				});

				setTimeout(function () {
					new_item.css({ transition: "opacity " + FADE_IN_IMG / 1000 + "s ease", opacity: "1" });
					separator.css({ transition: "opacity " + FADE_IN_IMG / 1000 + "s ease", opacity: "1" });
				}, FADE_OUT_TEXT);
			} else {
				head_elem.css({ opacity: "0", transition: "none" });
			}
		}

		function startLogoAnimation(img_url, fromCache) {
			if (renderId && renderId !== _this.lastRenderId) return;

			var img = new Image();
			img.src = img_url;

			var start_text_height = 0;
			if (dom_title) start_text_height = dom_title.getBoundingClientRect().height;

			if (fromCache) {
				img.onload = function () {
					if (renderId && renderId !== _this.lastRenderId) return;

					if (dom_title) start_text_height = dom_title.getBoundingClientRect().height;

					moveHeadToDetails(false);
					applyFinalStyles(img, start_text_height);

					title_elem.empty().append(img);
					title_elem.css({ opacity: "1", transition: "none" });

					if (dom_title) {
						dom_title.style.display = "block";
						dom_title.style.height = "";
						dom_title.style.transition = "none";
					}
					img.style.opacity = "1";
				};
				if (img.complete) img.onload();
				return;
			}

			applyFinalStyles(img, start_text_height);
			img.style.opacity = "0";

			img.onload = function () {
				if (renderId && renderId !== _this.lastRenderId) return;

				setTimeout(function () {
					if (renderId && renderId !== _this.lastRenderId) return;

					if (dom_title) start_text_height = dom_title.getBoundingClientRect().height;

					moveHeadToDetails(true);

					title_elem.css({
						transition: "opacity " + FADE_OUT_TEXT / 1000 + "s ease",
						opacity: "0",
					});

					setTimeout(function () {
						if (renderId && renderId !== _this.lastRenderId) return;

						title_elem.empty();
						title_elem.append(img);
						title_elem.css({ opacity: "1", transition: "none" });

						var target_container_height = dom_title.getBoundingClientRect().height;

						dom_title.style.height = start_text_height + "px";
						dom_title.style.display = "block";
						dom_title.style.overflow = "hidden";
						dom_title.style.boxSizing = "border-box";

						void dom_title.offsetHeight;

						dom_title.style.transition = "height " + MORPH_HEIGHT / 1000 + "s cubic-bezier(0.4, 0, 0.2, 1)";

						requestAnimationFrame(function () {
							if (renderId && renderId !== _this.lastRenderId) return;
							dom_title.style.height = target_container_height + "px";

							setTimeout(
								function () {
									if (renderId && renderId !== _this.lastRenderId) return;
									img.style.transition = "opacity " + FADE_IN_IMG / 1000 + "s ease";
									img.style.opacity = "1";
								},
								Math.max(0, MORPH_HEIGHT - 100),
							);

							setTimeout(
								function () {
									if (renderId && renderId !== _this.lastRenderId) return;
									applyFinalStyles(img, start_text_height);
									dom_title.style.height = "";
								},
								MORPH_HEIGHT + FADE_IN_IMG + 50,
							);
						});
					}, FADE_OUT_TEXT);
				}, 200);
			};

			img.onerror = function () {
				title_elem.css({ opacity: "1", transition: "none" });
			};
		}

		if (data.id) {
			var type = data.name ? "tv" : "movie";
			var language = Lampa.Storage.get("language");
			var cache_key = "logo_cache_v2_" + type + "_" + data.id + "_" + language;
			var cached_url = Lampa.Storage.get(cache_key);

			if (cached_url && cached_url !== "none") {
				startLogoAnimation(cached_url, true);
			} else {
				var url = Lampa.TMDB.api(type + "/" + data.id + "/images?api_key=" + Lampa.TMDB.key() + "&include_image_language=" + language + ",en,null");

				$.get(url, function (data_api) {
					if (renderId && renderId !== _this.lastRenderId) return;

					var final_logo = null;
					if (data_api.logos && data_api.logos.length > 0) {
						for (var i = 0; i < data_api.logos.length; i++) {
							if (data_api.logos[i].iso_639_1 == language) {
								final_logo = data_api.logos[i].file_path;
								break;
							}
						}
						if (!final_logo) {
							for (var j = 0; j < data_api.logos.length; j++) {
								if (data_api.logos[j].iso_639_1 == "en") {
									final_logo = data_api.logos[j].file_path;
									break;
								}
							}
						}
						if (!final_logo) final_logo = data_api.logos[0].file_path;
					}

					if (final_logo) {
						var img_url = Lampa.TMDB.image("/t/p/original" + final_logo.replace(".svg", ".png"));
						Lampa.Storage.set(cache_key, img_url);
						startLogoAnimation(img_url, false);
					} else {
						Lampa.Storage.set(cache_key, "none");
					}
				}).fail(function () {});
			}
		}
	};

	InfoPanel.prototype.load = function (data) {
		if (!data || !data.id) return;

		var source = data.source || "tmdb";
		if (source !== "tmdb" && source !== "cub") return;

		if (!Lampa.TMDB || typeof Lampa.TMDB.api !== "function" || typeof Lampa.TMDB.key !== "function") return;

		var mediaType = data.media_type === "tv" || data.name ? "tv" : "movie";
		var language = Lampa.Storage.get("language");
		var apiUrl = Lampa.TMDB.api(mediaType + "/" + data.id + "?api_key=" + Lampa.TMDB.key() + "&append_to_response=content_ratings,release_dates&language=" + language);

		this.currentUrl = apiUrl;

		if (this.loaded[apiUrl]) {
			this.draw(this.loaded[apiUrl]);
			return;
		}

		clearTimeout(this.timer);
		var self = this;

		this.timer = setTimeout(function () {
			self.network.clear();
			self.network.timeout(5000);
			self.network.silent(apiUrl, function (response) {
				self.loaded[apiUrl] = response;
				if (self.currentUrl === apiUrl) {
					self.draw(response);
				}
			});
		}, 300);
	};

	InfoPanel.prototype.draw = function (data) {
		if (!data || !this.html) return;

		var year = ((data.release_date || data.first_air_date || "0000") + "").slice(0, 4);

		var rating = parseFloat((data.vote_average || 0) + "").toFixed(1);

		var headInfo = [];
		var detailsInfo = [];

		var countries = Lampa.Api.sources.tmdb.parseCountries(data);
		if (countries.length > 2) countries = countries.slice(0, 2);

		var ageRating = Lampa.Api.sources.tmdb.parsePG(data);

		var show_logo = Lampa.Storage.get("logo_show", true);

		if (!show_logo) {
			if (year !== "0000") {
				headInfo.push("<span>" + year + "</span>");
			}

			if (countries.length > 0) {
				headInfo.push(countries.join(", "));
			}
		}

		if (Lampa.Storage.get("rat") !== false) {
			if (rating > 0) {
				detailsInfo.push('<div class="full-start__rate"><div>' + rating + "</div><div>TMDB</div></div>");
			}
		}

		if (Lampa.Storage.get("ganr") !== false) {
			if (data.genres && data.genres.length > 0) {
				detailsInfo.push(
					data.genres
						.slice(0, 2)
						.map(function (genre) {
							return Lampa.Utils.capitalizeFirstLetter(genre.name);
						})
						.join(" | "),
				);
			}
		}

		if (Lampa.Storage.get("vremya") !== false) {
			if (data.runtime) {
				detailsInfo.push(Lampa.Utils.secondsToTime(data.runtime * 60, true));
			}
		}

		if (Lampa.Storage.get("seas") !== false && data.number_of_seasons) {
			detailsInfo.push('<span class="full-start__pg" style="font-size: 0.9em;">Сезонов ' + data.number_of_seasons + "</span>");
		}

		if (Lampa.Storage.get("eps") !== false && data.number_of_episodes) {
			detailsInfo.push('<span class="full-start__pg" style="font-size: 0.9em;">Эпизодов ' + data.number_of_episodes + "</span>");
		}

		if (Lampa.Storage.get("year_ogr") !== false) {
			if (ageRating) {
				detailsInfo.push('<span class="full-start__pg" style="font-size: 0.9em;">' + ageRating + "</span>");
			}
		}

		if (Lampa.Storage.get("status") !== false) {
			var statusText = "";

			if (data.status) {
				switch (data.status.toLowerCase()) {
					case "released":
						statusText = "Выпущенный";
						break;
					case "ended":
						statusText = "Закончен";
						break;
					case "returning series":
						statusText = "Онгоинг";
						break;
					case "canceled":
						statusText = "Отменено";
						break;
					case "post production":
						statusText = "Скоро";
						break;
					case "planned":
						statusText = "Запланировано";
						break;
					case "in production":
						statusText = "В производстве";
						break;
					default:
						statusText = data.status;
						break;
				}
			}

			if (statusText) {
				detailsInfo.push('<span class="full-start__status" style="font-size: 0.9em;">' + statusText + "</span>");
			}
		}

		if (show_logo) {
			var yc = [];
			if (year !== "0000") yc.push("<span>" + year + "</span>");
			if (countries.length > 0) yc.push(countries.join(", "));

			if (yc.length > 0) {
				detailsInfo.push(yc.join(", "));
			}
		}

		this.html.find(".new-interface-info__head").empty().append(headInfo.join(", ")).addClass("visible");
		this.html.find(".new-interface-info__details").html(detailsInfo.join('<span class="new-interface-info__split">&#9679;</span>')).addClass("visible");
	};

	InfoPanel.prototype.empty = function () {
		if (!this.html) return;
		this.html.find(".new-interface-info__head,.new-interface-info__details").text("").removeClass("visible");
	};

	InfoPanel.prototype.destroy = function () {
		clearTimeout(this.fadeTimer);
		clearTimeout(this.timer);
		this.network.clear();
		this.loaded = {};
		this.currentUrl = null;

		if (this.html) {
			this.html.remove();
			this.html = null;
		}
	};

	function initializeSettings() {
		Lampa.Settings.listener.follow("open", function (event) {
			if (event.name == "main") {
				if (Lampa.Settings.main().render().find('[data-component="style_interface"]').length == 0) {
					Lampa.SettingsApi.addComponent({
						component: "style_interface",
						name: "Стильный интерфейс",
					});
				}

				Lampa.Settings.main().update();
				Lampa.Settings.main().render().find('[data-component="style_interface"]').addClass("hide");
			}
		});

		Lampa.SettingsApi.addParam({
			component: "interface",
			param: {
				name: "style_interface",
				type: "static",
				default: true,
			},
			field: {
				name: "Стильный интерфейс",
				description: "Настройки элементов",
			},
			onRender: function (item) {
				setTimeout(function () {
					$('.settings-param > div:contains("Стильный интерфейс")').parent().insertAfter($('div[data-name="interface_size"]'));
				}, 20);

				item.on("hover:enter", function () {
					Lampa.Settings.create("style_interface");
					Lampa.Controller.enabled().controller.back = function () {
						Lampa.Settings.create("interface");
					};
				});
			},
		});

		Lampa.SettingsApi.addParam({
			component: "style_interface",
			param: { name: "wide_post", type: "trigger", default: true },
			field: { name: "Широкие постеры" },
		});

		Lampa.SettingsApi.addParam({
			component: "style_interface",
			param: { name: "desc", type: "trigger", default: true },
			field: { name: "Показывать описание" },
		});

		Lampa.SettingsApi.addParam({
			component: "style_interface",
			param: { name: "logo_show", type: "trigger", default: true },
			field: { name: "Показывать логотип вместо названия" },
		});

		Lampa.SettingsApi.addParam({
			component: "style_interface",
			param: { name: "status", type: "trigger", default: true },
			field: { name: "Показывать статус фильма/сериала" },
		});

		Lampa.SettingsApi.addParam({
			component: "style_interface",
			param: { name: "seas", type: "trigger", default: false },
			field: { name: "Показывать количество сезонов" },
		});

		Lampa.SettingsApi.addParam({
			component: "style_interface",
			param: { name: "eps", type: "trigger", default: false },
			field: { name: "Показывать количество эпизодов" },
		});

		Lampa.SettingsApi.addParam({
			component: "style_interface",
			param: { name: "year_ogr", type: "trigger", default: true },
			field: { name: "Показывать возрастное ограничение" },
		});

		Lampa.SettingsApi.addParam({
			component: "style_interface",
			param: { name: "vremya", type: "trigger", default: true },
			field: { name: "Показывать время фильма" },
		});

		Lampa.SettingsApi.addParam({
			component: "style_interface",
			param: { name: "ganr", type: "trigger", default: true },
			field: { name: "Показывать жанр фильма" },
		});

		Lampa.SettingsApi.addParam({
			component: "style_interface",
			param: { name: "rat", type: "trigger", default: true },
			field: { name: "Показывать рейтинг фильма" },
		});

		var initInterval = setInterval(function () {
			if (typeof Lampa !== "undefined") {
				clearInterval(initInterval);
				if (!Lampa.Storage.get("int_plug", "false")) {
					setDefaultSettings();
				}
			}
		}, 200);

		function setDefaultSettings() {
			Lampa.Storage.set("int_plug", "true");
			Lampa.Storage.set("wide_post", "true");

			Lampa.Storage.set("desc", "true");
			Lampa.Storage.set("logo_show", "true");
			Lampa.Storage.set("status", "true");
			Lampa.Storage.set("seas", "false");
			Lampa.Storage.set("eps", "false");
			Lampa.Storage.set("year_ogr", "true");
			Lampa.Storage.set("vremya", "true");
			Lampa.Storage.set("ganr", "true");
			Lampa.Storage.set("rat", "true");
		}
	}
})();
