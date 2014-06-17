var Icss = require('./'),
    crel = require('crel'),
    Ajax = require('simple-ajax');

function initSheet(linkTag){
    var ajax = new Ajax(linkTag.getAttribute('href')),
        liveSheet = new Icss();

    liveSheet.element = crel('style');
    liveSheet.element.liveSheet = liveSheet;
    liveSheet.render = function(data){
        this.element.textContent = '\n' + data + '\n';
    }
    crel(document.head, liveSheet.element);

    ajax.on('success', function(event) {
        liveSheet.source(event.target.response);
        liveSheet.update();
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