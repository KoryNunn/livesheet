var renderer = require('../renderer'),
    crel = require('crel');

renderer();

window.addEventListener('load', function(){
    var textarea,
        liveSheet = document.querySelector('style').liveSheet;

    crel(document.body,
        textarea = crel('textarea')
    );

    var startScope = {
        bar:'10px',
        primaryColor: '#F00'
    };

    textarea.value = JSON.stringify(startScope, null, '    ');
    liveSheet.scope(startScope);

    textarea.addEventListener('keyup', function(){
        var newScope;
        try{
            newScope = JSON.parse(textarea.value);
        }catch(e){
            textarea.classList.add('error');
            return;
        }
        textarea.classList.remove('error');
        document.querySelector('style').liveSheet.scope(newScope);
    });

    textarea.addEventListener('keydown', function(event){
        if(event.which === 9){
            var selectionStart = this.selectionStart,
                selectionEnd = this.selectionEnd;
            event.preventDefault();
            this.value =
                this.value.slice(0, selectionStart) +
                '    ' +
                this.value.slice(selectionEnd);

            this.setSelectionRange(selectionStart + 4, selectionStart + 4);
        }
    });
});