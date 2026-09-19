(function (global) {
    function mountChrome(options) {
        const root = (options && options.root) || '../';
        if (global.SeriesChrome) {
            global.SeriesChrome.mount({
                root: root,
                active: 'rl',
                seriesLabel: '强化学习'
            });
            return;
        }
        const script = document.createElement('script');
        script.src = root + 'js/site-chrome.js';
        script.onload = function () {
            global.SeriesChrome.mount({
                root: root,
                active: 'rl',
                seriesLabel: '强化学习'
            });
        };
        document.body.appendChild(script);
    }

    global.RLChrome = { mountChrome };
})(window);
