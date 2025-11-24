// Rutube Player API
var RT = {
	PlayerState: {
		ENDED: 'stopped',
		PLAYING: 'playing',
		PAUSED: 'paused',
		BUFFERING: 3,
		CUED: 5,
		AD_PLAYING: 'adStart',
		AD_ENDED: 'adEnd',
		UNSTARTED: -1
	},
	Player: function (containerId, options) {
		this.container = document.getElementById(containerId);
		this.options = options;
		this.eventHandlers = options.events || {};
		this.iframe = null;
		this.ready = false;

		// Состояния плеера
		this.currentTime = 0;
		this.duration = 0;
		this.playbackQuality = 0;
		this.playerState = RT.PlayerState.UNSTARTED;
		this.qualityList = [];

		this.initPlayer();
	}
};

RT.Player.prototype = {
	initPlayer: function () {
		this.createIframe();
		this.bindEvents();
		this.setupQualityTracking();
	},

	createIframe: function () {
		var iframe = document.createElement('iframe');
		var src = 'https://rutube.ru/play/embed/' + this.options.videoId;
		var params = [];

		// Параметры из playerVars
		var pv = this.options.playerVars || {};

		// Маппинг параметров YouTube -> Rutube
		// if (pv.autoplay) params.push('autoplay=1');
		if (pv.start) params.push('t=' + pv.start);
		if (pv.end) params.push('stopTime=' + pv.end);
		if (pv.skinColor) params.push('skinColor=' + pv.skinColor);

		// Качество видео
		if (pv.suggestedQuality) {
			this.playbackQuality = pv.suggestedQuality;
			params.push('q=' + pv.suggestedQuality);
		}

		// Добавляем приватный ключ если есть
		if (this.options.privateKey) {
			src += '/?p=' + encodeURIComponent(this.options.privateKey);
		}

		if (params.length) src += (src.includes('?') ? '&' : '?') + params.join('&');

		iframe.setAttribute('src', src);
		iframe.setAttribute('width', this.options.width || '100%');
		iframe.setAttribute('height', this.options.height || '100%');
		iframe.setAttribute('frameborder', '0');
		iframe.setAttribute('webkitAllowFullScreen', '');
		iframe.setAttribute('mozallowfullscreen', '');
		iframe.setAttribute('allowfullscreen', '');
		iframe.setAttribute('allow', 'autoplay; encrypted-media; fullscreen; picture-in-picture; clipboard-write');

		this.container.appendChild(iframe);
		this.iframe = iframe;
	},

	bindEvents: function () {
		var self = this;

		window.addEventListener('message', function (e) {
			if (!self.iframe || e.source !== self.iframe.contentWindow || typeof e.data !== 'string') return;

			try {
				var example, message = JSON.parse(e.data), sendEventToLog = true;
				switch (message.type) {
					case 'player:init': // use 'player:ready'
						example = {
							"type": "player:init",
							"data": {
								"clientId": "768f9a3c38cd4952aaa61bc6ec4030af",
								"videoId": "69c010a4337fe31aecba804c452d2825",
								"playerId": "video_frame"
							}
						};
						break;
					case 'player:ready':
						example = {
							"type": "player:init",
							"data": {
								"clientId": "768f9a3c38cd4952aaa61bc6ec4030af",
								"videoId": "69c010a4337fe31aecba804c452d2825",
								"playerId": "video_frame"
							}
						};
						self.handleReady(message);
						break;
					case 'player:playOptionsLoaded':
						example = {
							"type": "player:playOptionsLoaded",
							"data": {
								"videoId": "69c010a4337fe31aecba804c452d2825",
								"playOptions": {},
								"playerId": "video_frame"
							}
						};
						message.data && message.data.playOptions && self.triggerEvent("playOptions", message.data.playOptions);
						break;
					case 'player:playStart':
						example = {
							"type": "player:playStart",
							"data": {
								"currentTime": 0,
								"duration": 130.00400000000005,
								"video_id": "8bd0d0fe6ad695686c5ae4ed6c656fc0",
								"qa": false,
								"sm": "default",
								"yclid": "174129602888112967",
								"viewid": "870241eb96e055769c83cc6289ff0f0d",
								"user": "",
								"cid": "768f9a3c38cd4952aaa61bc6ec4030af",
								"pid": "1d134faf-467e-4bc0-9ba2-22b73ca87161",
								"referer": "",
								"v": 1,
								"q_w": 848,
								"q_h": 480,
								"tr": "Hls",
								"playerId": "video_frame"
							}
						}
						if (message.data) {
							if (message.data.q_h) {
								self.handleQualityChange({
									"quality": {
										"height": parseInt(message.data.q_h + '', 10),
										"quality": message.data.q_h + '',
										"isAutoQuality": message.data.qa
									},
									"playerId": "video_frame"
								});
							}
							self.triggerEvent('onPlayStart', message.data);
						}
						break;
					case 'player:adRequest':
						example = {
							"type": "player:adRequest",
							"data": {
								"aformat": "preroll",
								"did": "461ea48dd14377d11a13ca69b4f0b6a3",
								"videoId": "fe1b5db5248fab9b904823cf1f46bbfd",
								"e": "a_request",
								"axurl": "https://rutube.ru/adfoxsdk?ownerId=277740&p1=cnvca&p2=gdol&dl={{hdom}}&puid8=3&puid9=0&puid5=4&puid3=1:2:3:4&puid4=ead54bd1&puid50={{puid50}}&eid1=55490306",
								"playerId": "video_frame"
							}
						};
						break;
					case 'player:rollState':
						example = {
							"type": "player:rollState",
							"data": {
								"type": "preroll",
								"state": "play", // play, complete
								"playerId": "video_frame"
							}
						};
						break;
					case 'player:adStart':
						example = {
							"type": "player:adStart",
							"data": {
								"aformat": "preroll",
								"did": "461ea48dd14377d11a13ca69b4f0b6a3",
								"videoId": "fe1b5db5248fab9b904823cf1f46bbfd",
								"e": "a_start",
								"axurl": "https://rutube.ru/adfoxsdk?ownerId=277740&p1=cnvca&p2=gdol&dl={{hdom}}&puid8=3&puid9=0&puid5=4&puid3=1:2:3:4&puid4=ead54bd1&puid50={{puid50}}&eid1=55490306",
								"playerId": "video_frame"
							}
						};
						// self.playerState = RT.PlayerState.AD_PLAYING;
						self.triggerEvent('onStateChange', { data: RT.PlayerState.AD_PLAYING });
						break;
					case 'player:adEnd':
						example = {
							"type": "player:adEnd",
							"data": {
								"aformat": "preroll",
								"did": "461ea48dd14377d11a13ca69b4f0b6a3",
								"videoId": "fe1b5db5248fab9b904823cf1f46bbfd",
								"e": "a_end",
								"axurl": "https://rutube.ru/adfoxsdk?ownerId=277740&p1=cnvca&p2=gdol&dl={{hdom}}&puid8=3&puid9=0&puid5=4&puid3=1:2:3:4&puid4=ead54bd1&puid50={{puid50}}&eid1=55490306",
								"playerId": "video_frame"
							}
						}
						// self.playerState = RT.PlayerState.AD_ENDED;
						self.triggerEvent('onStateChange', { data: RT.PlayerState.AD_ENDED });
						if (self.playerState === RT.PlayerState.ENDED)
							self.triggerEvent('onStateChange', { data: RT.PlayerState.ENDED });
						break;
					case 'player:volumeChange':
						example = {
							"type": "player:volumeChange",
							"data": {
								"volume": "100.00",
								"muted": false,
								"playerId": "video_frame"
							}
						};
						break;
					case 'player:changeState':
						example = {
							"type": "player:changeState",
							"data": {
								"state": "playing",
								"isLicensed": false,
								"playerId": "video_frame"
							}
						};
						self.handleStateChange(message.data);
						break;
					case 'player:playComplete':
						example = {
							"type": "player:playComplete",
							"data": {
								"playerId": "video_frame"
							}
						};
						self.triggerEvent('onStateChange', { data: RT.PlayerState.ENDED });
						break;
					case 'player:currentTime':
						example = {
							"type": "player:currentTime",
							"data": {
								"time": 47.280669,
								"playerId": "video_frame"
							}
						};
						self.currentTime = message.data.time;
						self.triggerEvent('onTimeUpdate', message.data);
						sendEventToLog = false;
						break;
					case 'player:durationChange':
						example = {
							"type": "player:durationChange",
							"data": {
								"duration": 201.09199999999998,
								"playerId": "video_frame"
							}
						};
						self.duration = message.data.duration;
						self.triggerEvent('onDurationChange', message.data);
						break;
					case 'player:currentQuality':
						example = {
							"type": "player:currentQuality",
							"data": {
								"quality": {
									"height": 720,
									"quality": "720",
									"isAutoQuality": true
								},
								"playerId": "video_frame"
							}
						};
						self.handleQualityChange(message.data);
						break;

					case 'player:qualityList':
						example = {
							"type": "player:qualityList",
							"data": {
								"list": [
									144,
									240,
									360,
									480,
									720
								],
								"playerId": "video_frame"
							}
						};
						self.qualityList = message.data.list;
						self.triggerEvent('onQualityList', message.data.list);
						break;

					case 'player:error':
						self.triggerEvent('onError', message.data);
						break;
				}
				sendEventToLog && console.log('RT event', message);
			} catch (err) {
				console.error('Error parsing message:', err);
			}
		});
	},

	handleReady: function (message) {
		this.ready = true;
		this.triggerEvent('onReady');

		// Запрос списка доступных качеств
		this.sendCommand({
			type: 'player:getQualityList',
			data: {}
		});
	},

	handleStateChange: function (data) {
		var stateMap = {
			playing: RT.PlayerState.PLAYING,
			pause: RT.PlayerState.PAUSED,
			paused: RT.PlayerState.PAUSED,
			stopped: RT.PlayerState.ENDED,
			lockScreenOn: RT.PlayerState.BUFFERING,
			lockScreenOff: RT.PlayerState.PLAYING
		};

		if (stateMap[data.state]) {
			this.playerState = stateMap[data.state];
			this.triggerEvent('onStateChange', { data: this.playerState });
		} else {
			console.log('TAG', data.state, data);
		}

	},

	handleQualityChange: function (data) {
		var newQuality = data.quality.height;
		if (newQuality !== this.playbackQuality) {
			this.playbackQuality = newQuality;
			this.triggerEvent('onPlaybackQualityChange', { data: newQuality });
		}
	},

	setupQualityTracking: function () {
		// Эмуляция события timeupdate
		setInterval(function () {
			if (this.playerState === RT.PlayerState.PLAYING) {
				this.triggerEvent('onTimeUpdate');
			}
		}, 250);
	},

	mapQuality: function (height) {
		var qualityMap = {
			144: 'tiny',
			240: 'small',
			360: 'medium',
			480: 'large',
			720: 'hd720',
			1080: 'hd1080',
			1440: 'hd1440',
			2160: 'hd2160'
		};
		return qualityMap[height] || 'unknown';
	},

	// Новые методы
	setPlaybackQuality: function (quality) {
		var heightMap = {
			'tiny': 144,
			'small': 240,
			'medium': 360,
			'large': 480,
			'hd720': 720,
			'hd1080': 1080,
			'hd1440': 1440,
			'hd2160': 2160
		};

		if (this.qualityList.length && (heightMap[quality] || Number.isInteger(quality))) {
			var h = heightMap[quality] || quality;
			var setQuality = this.qualityList.sort(function (a, b) { return Math.abs(a - h) - Math.abs(b - h) })[0];
			this.sendCommand({
				type: 'player:changeQuality',
				data: { quality: setQuality }
			});
		}
	},

	getAvailableQualityLevels: function () {
		return this.qualityList.map(function (h) { return this.mapQuality(h) });
	},

	sendCommand: function (command) {
		if (!this.ready) return;
		this.iframe.contentWindow.postMessage(JSON.stringify(command), '*');
	},

	getCurrentTime: function () {
		return this.currentTime;
	},

	getDuration: function () {
		return this.duration;
	},

	getPlayerState: function () {
		return this.playerState;
	},

	getPlaybackQuality: function () {
		return this.playbackQuality;
	},

	playVideo: function () {
		this.sendCommand({ type: 'player:play', data: {} });
	},

	pauseVideo: function () {
		this.sendCommand({ type: 'player:pause', data: {} });
	},

	stopVideo: function () {
		this.sendCommand({ type: 'player:stop', data: {} });
	},

	seekTo: function (seconds) {
		this.sendCommand({ type: 'player:setCurrentTime', data: { time: seconds } });
	},

	setVolume: function (volume) {
		this.sendCommand({ type: 'player:setVolume', data: { volume: volume } });
	},

	// Подписка на события
	addEventListener: function (event, handler) {
		this.eventHandlers[event] = handler;
	},

	triggerEvent: function (event, data) {
		if (this.eventHandlers[event]) {
			if (!data) data = {};
			data.target = this;
			this.eventHandlers[event](data);
		}
	}
};
(function () {
	var Subscribe = Lampa.Subscribe;
	var Platform = Lampa.Platform;
	var Lang = Lampa.Lang;
	var Panel = Lampa.PlayerPanel;
	var isHidePanel = false;
	var isAdStart = false;
	var TAG = 'RuTube';

	function RuTube(call_video) {
		var stream_url, loaded;

		var needclick = true;//Platform.screen('mobile') || navigator.userAgent.toLowerCase().indexOf("android") >= 0;

		var object = $('<div class="player-video__youtube" id="rutube-container"><div class="player-video__youtube-player" id="rutube-player"></div><div class="player-video__youtube-line-top"></div><div class="player-video__youtube-line-bottom"></div><div class="player-video__youtube-noplayed hide">' + Lang.translate('player_youtube_no_played') + '</div><style>#rutube-player iframe{top:0}#rutube-container.ended{background-size:cover;background-position:center;background-repeat:no-repeat;}</style></div>');
		var video = object[0];
		var listener = Subscribe();
		var volume = 1;
		var rutube;
		var timeupdate;
		var timetapplay;
		var screen_size = 1;
		var levels = [];
		var current_level = 'AUTO';

		function videoSize() {
			var size = {
				width: 0,
				height: 0
			};

			if (rutube) {
				try {
					size.height = rutube.getPlaybackQuality();
					size.width = Math.round(size.height * 16 / 9);
				}
				catch (e) { }
			}

			return size;
		}

		/**
		 * Установить урл
		 */
		Object.defineProperty(video, "src", {
			set: function (url) {
				if (url) {
					stream_url = url;
				}
			},
			get: function () { }
		});

		/**
		 * Позиция
		 */
		Object.defineProperty(video, "currentTime", {
			set: function (t) {
				try {
					rutube.seekTo(t);
				}
				catch (e) { }
			},
			get: function () {
				try {
					return rutube.getCurrentTime();
				}
				catch (e) {
					return 0
				}
			}
		});

		/**
		 * Длительность
		 */
		Object.defineProperty(video, "duration", {
			set: function () {

			},
			get: function () {
				try {
					return rutube.getDuration();
				}
				catch (e) {
					return 0
				}
			}
		});

		/**
		 * Пауза
		 */
		Object.defineProperty(video, "paused", {
			set: function () {

			},
			get: function () {
				if (needclick) return true;

				try {
					return rutube.getPlayerState() === RT.PlayerState.PAUSED;
				}
				catch (e) {
					return true;
				}
			}
		});

		/**
		 * Аудиодорожки
		 */
		Object.defineProperty(video, "audioTracks", {
			set: function () {

			},
			get: function () {
				return [];
			}
		});

		/**
		 * Субтитры
		 */
		Object.defineProperty(video, "textTracks", {
			set: function () {

			},
			get: function () {
				return [];
			}
		});

		/**
		 * Ширина видео
		 */
		Object.defineProperty(video, "videoWidth", {
			set: function () {

			},
			get: function () {
				return videoSize().width;
			}
		});

		/**
		 * Высота видео
		 */
		Object.defineProperty(video, "videoHeight", {
			set: function () {

			},
			get: function () {
				return videoSize().height;
			}
		});

		Object.defineProperty(video, "volume", {
			set: function (num) {
				volume = num;

				if (rutube) rutube.setVolume(volume);
			},
			get: function () {

			}
		});


		/**
		 * Всегда говорим да, мы можем играть
		 */
		video.canPlayType = function () {
			return true;
		}

		video.resize = function () {
			object.find('.player-video__youtube-player').width(window.innerWidth);
			object.find('.player-video__youtube-player').height((window.innerHeight) * screen_size);
			object.find('.player-video__youtube-player').addClass('minimize');//.css({transform: 'scale(0.5)'});
		}

		/**
		 * Вешаем кастомные события
		 */
		video.addEventListener = listener.follow.bind(listener);

		/**
		 * Загрузить
		 */
		video.load = function () {
			if (stream_url && !rutube) {
				var id, privateKey, m;
				if (!!(m = stream_url.match(/^https?:\/\/(www\.)?rutube\.ru\/(play\/embed|video\/private|video|shorts)\/([\da-f]{32,})\/?(\?p=([^&]+))?/i))) {
					id = m[3];
					privateKey = m[5];
				}

				video.resize();

				var nosuport = function () {
					object.append('<div class="player-video__youtube-needclick"><img src="https://rutube.ru/api/video/' + id + '/thumbnail/?redirect=1" /><div>' + Lang.translate('torrent_error_connect') + '</div></div>');
				};

				if (typeof RT == 'undefined' || typeof RT.Player == 'undefined' || !id) return nosuport();

				if (needclick) {
					object.append('<div class="player-video__youtube-needclick"><img src="https://rutube.ru/api/video/' + id + '/thumbnail/?redirect=1" /><div></div></div>');

					timetapplay = setTimeout(function () {
						object.find('.player-video__youtube-needclick div').text(Lang.translate('player_youtube_start_play'));

						Panel.update('pause');
					}, 10000);
				}

				console.log(TAG, 'create');

				rutube = new RT.Player('rutube-player', {
					videoId: id,
					privateKey: privateKey,
					// height: (window.innerHeight) * screen_size,
					// width: window.innerWidth,
					playerVars: {
						'controls': 1,
						'showinfo': 0,
						'autohide': 1,
						'modestbranding': 1,
						'autoplay': 1,
						'disablekb': 1,
						'fs': 0,
						'enablejsapi': 1,
						'playsinline': 1,
						'rel': 0,
						'suggestedQuality': Lampa.Storage.field('video_quality_default'),
						'setPlaybackQuality': 'hd1080'
					},
					events: {
						playOptions: function (options) {
							object.css(
								'background-image',
								options.thumbnail_url ? 'url("' + options.thumbnail_url + '")' : ''
							);
						},
						onReady: function (event) {
							loaded = true;

							rutube.setVolume(volume);
							rutube.sendCommand({ type: 'player:hideControls', data: {} });
							window.rutube = rutube;
							rutube.iframe.blur();
							// Lampa.Controller.toggle('player_panel');
							window.focus();
						},
						onDurationChange: function () {
							listener.send('canplay');
							listener.send('loadeddata');
							clearTimeout(timetapplay);

							if (needclick) {
								object.find('.player-video__youtube-needclick div').text(Lang.translate('loading') + '...');
							}
							if (needclick) {
								rutube.playVideo()
							}

							if (needclick) {
								needclick = false;

								setTimeout(function () {
									// var screen = $('<div style="position:fixed;top:0;left:0;right:0;bottom:0"></div>');
									object.find('.player-video__youtube-needclick').remove();
									// object.find('#rutube-player').append(screen);
									// screen.focus();
									// Lampa.Controller.toggle('player_panel');
									// rutube.iframe.blur();
									// window.focus();
								}, 500);
							}
						},
						onTimeUpdate: function (event) {
							listener.send('timeupdate');
						},
						onStateChange: function (state) {
							console.log('RT event', 'onStateChange', state.data);
							if (state.data === RT.PlayerState.AD_PLAYING) {
								Panel.hide();
								object.removeClass('ended');
								isHidePanel = true;
								isAdStart = true;
							}

							if (state.data === RT.PlayerState.AD_ENDED) {
								if (isHidePanel) {
									Panel.show();
									isHidePanel = false;
								}
								isAdStart = false;
								object.removeClass('ended');
								// Lampa.Controller.toggle('player_panel');
								rutube.iframe.blur();
								Panel.render().focus();
							}

							if (state.data === RT.PlayerState.PLAYING/* || state.data === RT.PlayerState.AD_PLAYING*/) {
								object.removeClass('ended');
								listener.send('playing');
								listener.send('play', {});
								if (isHidePanel) {
									Panel.show();
									isHidePanel = false;
									rutube.iframe.blur();
									Panel.render().focus();
									// Lampa.Controller.toggle('player');
								}
								isAdStart = false;
							}

							if (state.data === RT.PlayerState.PAUSED) {
								listener.send('pause', {});
								isAdStart || object.addClass('ended');
							}

							if (state.data === RT.PlayerState.ENDED) {
								object.addClass('ended');
								listener.send('ended');
								listener.send('stop');
								if (isHidePanel) {
									Panel.show();
									isHidePanel = false;
								}
							}

							if (state.data === RT.PlayerState.BUFFERING) {
								listener.send('waiting');
								state.target.setPlaybackQuality('hd1080');
							}
						},
						onQualityList: function (list) {
							levels = [];

							list.forEach(function (qa) {
								var qualityStr = qa + 'p';
								var level = {
									quality: qualityStr,
									title: qualityStr,
									selected: current_level === qualityStr,
									call: false
								};

								Object.defineProperty(level, "enabled", {
									set: function (v) {
										if (v) {
											current_level = qualityStr;
											rutube.setPlaybackQuality(qa);
											levels.map(function (e) { e.selected = false });
											level.selected = true
										}
									},
									get: function () { }
								});

								levels.push(level);
							});

							Lampa.PlayerVideo.listener.send('levels', { levels: levels, current: current_level });
						},
						onPlaybackQualityChange: function (state) {
							var qualityStr = rutube.getPlaybackQuality() + 'p';
							Lampa.PlayerVideo.listener.send('levels', { levels: levels, current: qualityStr });
							console.log(TAG, 'quality', rutube.getPlaybackQuality(), rutube.qualityList);
						},
						onError: function (e) {
							object.find('.player-video__youtube-noplayed').removeClass('hide');

							object.addClass('ended');

							if (needclick) object.find('.player-video__youtube-needclick').remove();

							clearTimeout(timetapplay);
						}
					}
				});
			}
		}

		/**
		 * Играть
		 */
		video.play = function () {
			try {
				rutube.playVideo();
			}
			catch (e) { }
		};

		/**
		 * Пауза
		 */
		video.pause = function () {
			try {
				rutube.pauseVideo();
			}
			catch (e) { }
		};

		/**
		 * Установить масштаб
		 */
		video.size = function (type) { };

		/**
		 * Установить скорость
		 */
		video.speed = function (speed) { };

		/**
		 * Уничтожить
		 */
		video.destroy = function () {
			if (loaded) {
				clearInterval(timeupdate);

				try {
					rutube.destroy();
				}
				catch (e) { }
			}

			object.remove();

			clearTimeout(timetapplay);

			listener.destroy();
		};

		call_video(video);

		return object;
	}
	Lampa.PlayerVideo.registerTube({
		name: 'RuTube',
		verify: function (src) {
			return /^https?:\/\/(www\.)?rutube\.ru\/(play\/embed|video\/private|video|shorts)\/([\da-f]{32,})\/?(\?p=([^&]+))?/i.test(src);
		},
		create: RuTube
	});
})();
(function () {
	'use strict';

	var proxy = ''; // Если понадобится, то будет взят из Lampa.Storage.get('rutube_search_proxy', '')
	var rootuTrailerApi = Lampa.Utils.protocol() + 'trailer.rootu.top/search/';

	function cleanString(str) {
		return str.replace(/[^a-zA-Z\dа-яА-ЯёЁ]+/g, ' ').trim().toLowerCase();
	}

	function cacheRequest(movie, isTv, success, fail) {
		var context = this;
		var year = (movie.release_date || movie.first_air_date || '').toString()
			.replace(/\D+/g, '')
			.substring(0, 4)
			.replace(/^([03-9]\d|1[0-8]|2[1-9]|20[3-9])\d+$/, '')
			;
		var search = movie.title || movie.name || movie.original_title || movie.original_name || '';
		var cleanSearch = cleanString(search);
		if (cleanSearch.length < 2) {
			return fail();
		}
		var searchOrig = movie.original_title || movie.original_name || '';
		var query = cleanString([search, year, 'русский трейлер', isTv ? 'сезон 1' : ''].join(' '));
		var rutubeApiUrl = 'https://rutube.ru/api/search/video/' +
			'?query=' + encodeURIComponent(query) +
			'&format=json'
			;
		var tmdbId = movie.id ? ('000000' + movie.id) : ''; // Используем movie.id как tmdbId
		if (tmdbId.length > 7) tmdbId = tmdbId.slice(-Math.max(7, (movie.id + '').length));
		var type = isTv ? 'tv' : 'movie';
		var rootuTrailersUrl = rootuTrailerApi + type + '/' + tmdbId + '.json';

		var id = type + (tmdbId || (Lampa.Utils.hash(search) * 1).toString(36)); // Используем tmdbId для ключа, если есть
		var key = 'RUTUBE_trailer_' + id;
		var data = sessionStorage.getItem(key);

		if (data) {
			data = JSON.parse(data);
			if (data[0]) typeof success === 'function' && success.apply(context, [data[1]]);
			else typeof fail === 'function' && fail.apply(context, [data[1]]);
			return; // Выходим, если данные найдены в локальном кэше
		}

		function fetchFromRutubeApi() {
			var si = Math.floor((new Date().getTime()) / 1000).toString(36);
			var network = new Lampa.Reguest();
			network.native(
				proxy + rutubeApiUrl,
				function (data) {
					var results = []
					if (!!data && !!data.results && !!data.results[0]) {
						var queryWord = query.split(' ');
						if (searchOrig !== '' && search !== searchOrig)
							queryWord.push.apply(queryWord, cleanString(searchOrig).split(' '));
						si += '=' + (Lampa.Utils.hash(si + id) * 1).toString(36);
						queryWord.push(isTv ? 'сериал' : 'фильм', 'русском', 'финальный', '4k', 'fullhd', 'ultrahd', 'ultra', 'hd', '1080p');
						var getRate = function (r) {
							if (r._rate === -1) {
								r._rate = 0;
								var si = r._title.indexOf(cleanSearch);
								var rw = r._title.split(' ');
								if (si >= 0) {
									r._rate += 300;
									if (year) {
										var ow = r._title.substring(si + cleanSearch.length).trim().split(' ');
										if (ow.length && ow[0] !== year && /^(\d+|[ivx]+)$/.test(ow[0])) r._rate = -1000
										ow = rw.filter(function (w) { return w.length === 4 && /^([03-9]\d|1[0-8]|2[1-9]|20[3-9])\d+$/.test(w); });
										if (ow.indexOf(year) >= 0) r._rate += 100;
										else for (si in ow) if (cleanSearch.indexOf(ow[si]) < 0) r._rate = -1000;
									}
								} else {
									r._rate = -2000;
								}
								var rf = rw.filter(function (w) { return queryWord.indexOf(w) >= 0 });
								var wordDiff = rw.length - rf.length;
								r._rate += rf.length * 100;
								r._rate -= wordDiff * 200;
								r._rate += r.duration > 120 ? 50 : -50; // Для тайзеров (обычно меньше 2 минут) рейтинг меньше
							}
							return r._rate;
						}
						results = data.results.filter(function (r) {
							r._title = cleanString(r.title);
							r._rate = -1;
							var isTrailer = r._title.indexOf('трейлер') >= 0 || r._title.indexOf('trailer') >= 0 || r._title.indexOf('тайзер') >= 0;
							var durationOk = r.duration && r.duration < 300; // Меньше 5 минут
							return !!r.embed_url && isTrailer && durationOk
								&& !r.is_hidden && !r.is_deleted && !r.is_locked && !r.is_audio && !r.is_paid && !r.is_livestream && !r.is_adult
								&& getRate(r) > 400
								;
						}).sort(function (a, b) {
							return getRate(b) - getRate(a);
						});
					}

					if (results.length) {
						sessionStorage.setItem(key, JSON.stringify([true, results, search]));
						typeof success === 'function' && success.apply(context, [results]);

						if (tmdbId && /^\d+$/.test(tmdbId)) { // Отправляем только если есть tmdbId
							var simplifiedResults = results.map(function (r) {
								return {
									title: r.title,
									url: r.video_url || r.embed_url,
									thumbnail_url: r.thumbnail_url,
									duration: r.duration,
									author: r.author
								};
							});
							var postNetwork = new Lampa.Reguest();
							postNetwork.quiet(
								rootuTrailersUrl + '?' + si,
								function () {
									postNetwork.clear();
								},
								function () {
									postNetwork.clear();
								},
								JSON.stringify(simplifiedResults)
							);
						}
					} else {
						sessionStorage.setItem(key, JSON.stringify([false, {}, search]));
						typeof fail === 'function' && fail.apply(context, [{}]);
					}
					network.clear();
					network = null;
				},
				function (data) {
					if (!proxy
						&& !window.AndroidJS
						&& !!data && 'status' in data
						&& 'readyState' in data
						&& data.status === 0
						&& data.readyState === 0
					) {
						proxy = Lampa.Storage.get('rutube_search_proxy', '') || 'https://rutube-search.root-1a7.workers.dev/';
						if (proxy.substr(-1) !== '/') proxy += '/';
						if (proxy === '/') {
							sessionStorage.setItem(key, JSON.stringify([false, {}, search]));
							typeof fail === 'function' && fail.apply(context, [{}]);
						} else {
							// Повторяем запрос с прокси
							fetchFromRutubeApi(); // Вызываем функцию повторно
						}
					} else {
						sessionStorage.setItem(key, JSON.stringify([false, data, search]));
						typeof fail === 'function' && fail.apply(context, [data]);
					}
					network.clear();
					network = null;
				}
			);
		}

		// Если tmdbId отсутствует, сразу переходим к Rutube API
		if (!tmdbId || /\D/.test(tmdbId)) {
			fetchFromRutubeApi();
			return;
		}

		// Сначала пытаемся получить данные из trailer.rootu.top
		var rootuTopNetwork = new Lampa.Reguest();
		rootuTopNetwork.timeout(2000);
		rootuTopNetwork.native(
			rootuTrailersUrl,
			function (rootuTrailerData) {
				if (rootuTrailerData && rootuTrailerData.length) {
					sessionStorage.setItem(key, JSON.stringify([true, rootuTrailerData, search]));
					typeof success === 'function' && success.apply(context, [rootuTrailerData]);
				} else {
					// Данные не найдены или пустые, переходим к Rutube API
					fetchFromRutubeApi();
				}
				rootuTopNetwork.clear();
				rootuTopNetwork = null;
			},
			function (xhr) {
				fetchFromRutubeApi(); // Переходим к Rutube API
				rootuTopNetwork.clear();
				rootuTopNetwork = null;
			}
		);
	}

	function loadTrailers(event, success, fail) {
		if (!event.object || !event.object.source || !event.data || !event.data.movie) return;
		var movie = event.data.movie;
		var isTv = !!event.object && !!event.object.method && event.object.method === 'tv';
		var title = movie.title || movie.name || movie.original_title || movie.original_name || '';
		if (title === '') return;
		var searchOk = function (data) {
			if (!!data[0]) {
				success(data);
			} else {
				fail();
			}
		};
		cacheRequest(movie, isTv, searchOk, fail);
	}

	Lampa.Lang.add({
		"rutube_trailer_trailer": {
			"be": "Трэйлер",
			"bg": "Трейлър",
			"cs": "Trailer",
			"en": "Trailer",
			"he": "טריילר",
			"pt": "Trailer",
			"ru": "Трейлер",
			"uk": "Трейлер",
			"zh": "预告片"
		},
		"rutube_trailer_trailers": {
			"be": "Трэйлеры",
			"bg": "Трейлъри",
			"cs": "Trailery",
			"en": "Trailers",
			"he": "טריילרים",
			"pt": "Trailers",
			"ru": "Трейлеры",
			"uk": "Трейлери",
			"zh": "预告片"
		},
		"rutube_trailer_preview": {
			"be": "Перадпрагляд",
			"bg": "Преглед",
			"cs": "Náhled",
			"en": "Preview",
			"he": "תצוגה מקדימה",
			"pt": "Pré-visualização",
			"ru": "Превью",
			"uk": "Попередній перегляд",
			"zh": "预览"
		},
		"rutube_trailer_rutube": {
			"be": "Знойдзена на RUTUBE",
			"bg": "Намерено в RUTUBE",
			"cs": "Nalezeno na RUTUBE",
			"en": "Found on RUTUBE",
			"he": "נמצא ב-RUTUBE",
			"pt": "Encontrado no RUTUBE",
			"ru": "Найдено на RUTUBE",
			"uk": "Знайдено на RUTUBE",
			"zh": "在 RUTUBE 上找到"
		},
		"rutube_trailers_title": {
			"be": "RUTUBE: трэйлеры",
			"bg": "RUTUBE: трейлъри",
			"cs": "RUTUBE: trailery",
			"en": "RUTUBE: trailers",
			"he": "RUTUBE: טריילרים",
			"pt": "RUTUBE: trailers",
			"ru": "RUTUBE: трейлеры",
			"uk": "RUTUBE: трейлери",
			"zh": "RUTUBE：预告片"
		},
		"rutube_trailer_404": {
			"be": "Трэйлер не знойдзены.",
			"bg": "Трейлърът не е намерен.",
			"cs": "Trailer nebyl nalezen.",
			"en": "Trailer not found.",
			"he": "הטריילר לא נמצא.",
			"pt": "Trailer não encontrado.",
			"ru": "Трейлер не найден.",
			"uk": "Трейлер не знайдено.",
			"zh": "未找到预告片。"
		},
		"rutube_trailer_wait": {
			"be": "Пачакайце, яшчэ шукаем трэйлер...",
			"bg": "Изчакайте, все още търсим трейлър...",
			"cs": "Počkejte, stále hledáme trailer...",
			"en": "Please wait, still looking for a trailer...",
			"he": "אנא המתן, עדיין מחפשים טריילר...",
			"pt": "Aguarde, ainda estamos procurando um trailer...",
			"ru": "Подождите, ещё ищем трейлер...",
			"uk": "Зачекайте, ще шукаємо трейлер...",
			"zh": "请稍候，仍在寻找预告片……"
		}
	});

	function startPlugin() {
		window.rutube_trailer_plugin = true;

		Lampa.SettingsApi.addParam({
			component: 'more',
			param: {
				name: 'rutube_trailers',
				type: 'trigger',
				default: true
			},
			field: {
				name: Lampa.Lang.translate('rutube_trailers_title')
			}
		});
		var button = '<div class="full-start__button selector view--rutube_trailer" data-subtitle="#{rutube_trailer_rutube}">' +
			'<svg width="134" height="134" viewBox="0 0 134 134" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M81.5361 62.9865H42.5386V47.5547H81.5361C83.814 47.5547 85.3979 47.9518 86.1928 48.6451C86.9877 49.3385 87.4801 50.6245 87.4801 52.5031V58.0441C87.4801 60.0234 86.9877 61.3094 86.1928 62.0028C85.3979 62.6961 83.814 62.9925 81.5361 62.9925V62.9865ZM84.2115 33.0059H26V99H42.5386V77.5294H73.0177L87.4801 99H106L90.0546 77.4287C95.9333 76.5575 98.573 74.7559 100.75 71.7869C102.927 68.8179 104.019 64.071 104.019 57.7359V52.7876C104.019 49.0303 103.621 46.0613 102.927 43.7857C102.233 41.51 101.047 39.5307 99.362 37.7528C97.5824 36.0698 95.6011 34.8845 93.2223 34.0904C90.8435 33.3971 87.8716 33 84.2115 33V33.0059Z" fill="currentColor"/><path d="M198 3.05176e-05C198 36.4508 168.451 66.0001 132 66.0001C124.589 66.0001 117.464 64.7786 110.814 62.5261C110.956 60.9577 111.019 59.3541 111.019 57.7359V52.7876C111.019 48.586 110.58 44.8824 109.623 41.7436C108.59 38.3588 106.82 35.4458 104.443 32.938L104.311 32.7988L104.172 32.667C101.64 30.2721 98.7694 28.5625 95.4389 27.4506L95.3108 27.4079L95.1812 27.3701C92.0109 26.446 88.3508 26 84.2115 26H77.2115V26.0059H71.3211C67.8964 18.0257 66 9.23434 66 3.05176e-05C66 -36.4508 95.5492 -66 132 -66C168.451 -66 198 -36.4508 198 3.05176e-05Z" fill="currentColor"/><rect x="1" y="1" width="130" height="130" stroke="currentColor" stroke-width="2"/></svg>' +
			'<span>#{rutube_trailer_trailers}</span>' +
			'</div>';

		Lampa.Listener.follow('full', function (event) {
			if (event.type === 'complite' && Lampa.Storage.field('rutube_trailers')) {
				var render = event.object.activity.render();
				var trailerBtn = render.find('.view--trailer');
				var btn = $(Lampa.Lang.translate(button));
				if (trailerBtn.length) {
					trailerBtn.before(btn);
					trailerBtn.toggleClass('hide', !window.YT); // Если плеер ютуба недоступен - скрываем.
				} else {
					render.find('.full-start__button:last').after(btn);
				}
				var onEnter = function () {
					Lampa.Noty.show(Lampa.Lang.translate('rutube_trailer_wait'));
				};
				btn.on('hover:enter', function () { onEnter() });
				loadTrailers(
					event,
					function (data) {
						var playlist = [];
						data.forEach(function (res) {
							playlist.push({
								title: Lampa.Utils.shortText(res.title, 50),
								subtitle: Lampa.Utils.shortText(res.author.name, 30),
								url: res.video_url || res.embed_url || res.url,
								iptv: true,
								icon: '<img class="size-youtube" src="' + res.thumbnail_url + '" />',
								template: 'selectbox_icon'
							});
						});
						onEnter = function () {
							RT.eventContext = this;

							Lampa.Select.show({
								title: Lampa.Lang.translate('rutube_trailers_title'),
								items: playlist,
								onSelect: function (a) {
									Lampa.Player.play(a);
									Lampa.Player.playlist(playlist);
								},
								onBack: function () {
									Lampa.Controller.toggle('full_start');
								}
							});
						};
						btn.removeClass('hide');
					},
					function () {
						btn.addClass('hide');
						onEnter = function () {
							Lampa.Noty.show(Lampa.Lang.translate('rutube_trailer_404'));
						};
					}
				);
			}
		});
	}
	if (!window.rutube_trailer_plugin) startPlugin();
})();
