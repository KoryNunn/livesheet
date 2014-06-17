var renderer = require('../renderer'),
    crel = require('crel');

window.addEventListener('load', function(){
    renderer();

    var textarea;

    crel(document.body,
        textarea = crel('textarea')
    );

    textarea.value = '{}';

    textarea.addEventListener('keyup', function(){
        var newScope;
        try{
            newScope = JSON.parse(textarea.value);
        }catch(e){
            textarea.classList.add('error');
            return;
        }
        textarea.classList.remove('error');
        document.querySelector('style').liveSheet.update(newScope);
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