(function () {
    function initLampaHook() {
        if (window.Lampa && Lampa.Player && Lampa.Player.play) {
            var originalPlay = Lampa.Player.play;
            Lampa.Player.play = function (object) {
                object.iptv = true;

                if (object.vast_url) delete object.vast_url;
                if (object.vast_msg) delete object.vast_msg;
                
                return originalPlay.apply(this, arguments);
            };
        } else {
            setTimeout(initLampaHook, 500);
        }
    }

    initLampaHook();

    // if (typeof document !== 'undefined') {
    //     document.createElement = new Proxy(document.createElement, {
    //         apply(target, thisArg, args) {
    //             if (args[0] === "video") {
                    
    //                 let fakeVideo = target.apply(thisArg, args);

    //                 let originalVideoPlay = fakeVideo.play;
    //                 fakeVideo.play = function () {
    //                     setTimeout(() => {
    //                         Object.defineProperty(fakeVideo, 'ended', { get: () => true });
    //                         fakeVideo.dispatchEvent(new Event("ended"));
    //                     }, 100);

    //                     return Promise.resolve(); 
    //                 };

    //                 return fakeVideo;
    //             }
    //             return target.apply(thisArg, args);
    //         }
    //     });
    // }
})();
