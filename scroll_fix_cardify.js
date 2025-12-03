(function () {
    'use strict';

    var style = document.createElement('style');
    style.innerHTML = '.full-start__background.fix-opacity { opacity: 0.5 !important; }';
    document.head.appendChild(style);

    function start() {
        Lampa.Listener.follow('full', function (e) {
            if (e.type == 'complite') {
                var component = e.object.activity.component;
                var render = e.object.activity.render();
                var bg = render.find('.full-start__background');

                bg.addClass('fix-opacity');

                if (component && component.scroll) {
                    var originalOnScroll = component.scroll.onScroll;
                    component.scroll.onScroll = function (pos) {
                        if (originalOnScroll) originalOnScroll.apply(this, arguments);
                        if (Math.abs(pos) > 10) bg.removeClass('fix-opacity');
                    };
                }

                setTimeout(function () {
                    if (Lampa.Layer) Lampa.Layer.update();
                    try {
                        if (component && component.scroll && typeof component.scroll.wheel === 'function') {
                            var el = $(component.scroll.render(true)).find('.scroll__body');
                            if (el.length) {
                                var dom = el[0];
                                var old = dom.style.opacity;
                                dom.style.opacity = '0';
                                component.scroll.wheel(0);
                                dom.style.transform = 'translateZ(0)';
                                dom.style.willChange = 'opacity, transform';
                                requestAnimationFrame(function () {
                                    dom.style.opacity = '1';
                                    setTimeout(function () {
                                        dom.style.opacity = old;
                                        dom.style.willChange = '';
                                    }, 100);
                                });
                            }
                        }
                    } catch (e) {}
                }, 50);
            }
        });
    }

    if (window.appready) start();
    else Lampa.Listener.follow('app', function (e) {
        if (e.type == 'ready') start();
    });
})();