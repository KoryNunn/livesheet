var LiveSheet = require('./'),
    crel = require('crel'),
    Ajax = require('simple-ajax');

function initSheet(linkTag){
    var ajax = new Ajax(linkTag.getAttribute('href')),
        liveSheet = new LiveSheet();

    liveSheet.element = crel('style');
    liveSheet.element.liveSheet = liveSheet;
    liveSheet.render = function(data){
        this.element.textContent = '\n' + data + '\n';
    }
    crel(document.head, liveSheet.element);

    function frame(){
        liveSheet.update();
        requestAnimationFrame(frame);
    }

    ajax.on('success', function(event) {
        liveSheet.source(event.target.response);
        liveSheet.update();
        frame();
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