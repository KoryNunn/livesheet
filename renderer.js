var Icss = require('./'),
    crel = require('crel'),
    Ajax = require('simple-ajax');

function initSheet(linkTag){
    var ajax = new Ajax(linkTag.getAttribute('href'));

    ajax.on('success', function(event) {
        var liveSheet = new Icss(event.target.response);
        liveSheet.element = crel('style');

        liveSheet.render = function(data){
            this.element.textContent = '\n' + data + '\n';
        }

        crel(document.head, liveSheet.element);

        liveSheet.update();

        liveSheet.element.liveSheet = liveSheet;
    });

    ajax.send();
}

module.exports = function(){
    var links = document.querySelectorAll('link');
    [].forEach.call(links, function(linkTag){
        if(linkTag.getAttribute('rel') === 'livesheet'){
            initSheet(linkTag);
        }
    });
};