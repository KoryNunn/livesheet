var renderer = require('../renderer'),
    crel = require('crel');

renderer();

window.addEventListener('load', function(){
    var textarea,
        liveSheet = document.querySelector('style').liveSheet;

    crel(document.body,
        textarea = crel('textarea')
    );

    /*
        EXTREMELY DODGY DEMO STUFF BELOW
    */

    var startScopeSource = "{\n" +
        "    bar:'10px',\n" +
        "    primaryColor: '#3AF',\n" +
        "    whatsits: '0px',\n" +
        "    Bar: function(){\n" +
        "        return window.innerWidth / 3 + 'px';\n" +
        "    }\n" +
        "}",
        startScope;

    eval('startScope =' + startScopeSource);

    textarea.value = startScopeSource;
    liveSheet.scope(startScope);

    textarea.addEventListener('keyup', function(){
        var newScope;
        try{
            newScope = eval('newScope =' + textarea.value);
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