(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var renderer = require('../renderer');

window.addEventListener('load', function(){
    renderer();
});
},{"../renderer":9}],2:[function(require,module,exports){
function floor(scope, args){
    return Math.floor(args.next());
}

function random(scope, args){
    return Math.random();
}

module.exports = {
    floor: floor,
    random: random
};
},{}],3:[function(require,module,exports){
var Lang = require('lang-js'),
    Token = Lang.Token,
    global = require('./global'),
    createSpec = require('spec-js');

var createNestingParser = Lang.createNestingParser,
    Scope = Lang.Scope;

function Token(){
    this.init && this.init();
}
Token = createSpec(Token, Lang.Token);
Token.prototype.render = function(){
    return this.result;
};

function isIdentifier(substring){
    var valid = /^[$A-Z_][0-9A-Z_$]*/i,
        possibleIdentifier = substring.match(valid);

    if (possibleIdentifier && possibleIdentifier.index === 0) {
        return possibleIdentifier[0];
    }
}

function tokeniseIdentifier(substring){
    // searches for valid identifiers or operators
    //operators
    var operators = "!=<>/&|*%-^?+\\",
        index = 0;

    while (operators.indexOf(substring.charAt(index)||null) >= 0 && ++index) {}

    if (index > 0) {
        return substring.slice(0, index);
    }

    var identifier = isIdentifier(substring);

    if(identifier != null){
        return identifier;
    }
}

function createKeywordTokeniser(Constructor, keyword){
    return function(substring){
        substring = isIdentifier(substring);
        if (substring === keyword) {
            return new Constructor(substring, substring.length);
        }
    };
}

function createOpperatorTokeniser(Constructor, opperator) {
    return function(substring){
        if(substring.indexOf(opperator) === 0){
            return new Constructor(opperator, opperator.length);
        }
    };
}

function createOpperatorEvaluator(fn) {
    return function(scope){
        this.leftToken.evaluate(scope);
        this.rightToken.evaluate(scope);
        this.result = fn(this.leftToken.result, this.rightToken.result);
    };
}

function evaluateTokens(tokens, scope){
    for(var i = 0; i < tokens.length; i++){
        tokens[i].evaluate && tokens[i].evaluate(scope);
    }
}

function compileTokens(tokens, isSource){
    return tokens.reduce(function(result, token){
        return result += token.render(isSource);
    }, '');
}

function StringToken(){}
StringToken = createSpec(StringToken, Token);
StringToken.tokenPrecedence = 2;
StringToken.prototype.parsePrecedence = 2;
StringToken.prototype.name = 'StringToken';
StringToken.tokenise = function (substring) {
    var stringChars = '"\'';
        charIndex = stringChars.indexOf(substring.charAt(0)),
        stringType = stringChars.charAt(charIndex);

    if(stringType) {
        var index = 0,
        escapes = 0;

        while (substring.charAt(++index) !== stringType)
        {
           if(index >= substring.length){
                   throw "Unclosed " + this.name;
           }
           if (substring.charAt(index) === '\\' && substring.charAt(index+1) === stringType) {
                   substring = substring.slice(0, index) + substring.slice(index + 1);
                   escapes++;
           }
        }

        return new this(
            substring.slice(0, index+1),
            index + escapes + 1
        );
    }
};
StringToken.prototype.evaluate = function () {
    this.result = this.original;
};

function ParenthesesCloseToken(){}
ParenthesesCloseToken = createSpec(ParenthesesCloseToken, Token);
ParenthesesCloseToken.tokenPrecedence = 1;
ParenthesesCloseToken.prototype.parsePrecedence = 10;
ParenthesesCloseToken.prototype.name = 'ParenthesesCloseToken'
ParenthesesCloseToken.tokenise = function(substring) {
    if(substring.charAt(0) === ')'){
        return new ParenthesesCloseToken(substring.charAt(0), 1);
    }
}

function ParenthesesOpenToken(){}
ParenthesesOpenToken = createSpec(ParenthesesOpenToken, Token);
ParenthesesOpenToken.tokenPrecedence = 1;
ParenthesesOpenToken.prototype.parsePrecedence = 2;
ParenthesesOpenToken.prototype.name = 'ParenthesesOpenToken'
ParenthesesOpenToken.tokenise = function(substring) {
    if(substring.charAt(0) === '('){
        return new ParenthesesOpenToken(substring.charAt(0), 1);
    }
}
var parenthesisParser = createNestingParser(ParenthesesCloseToken);
ParenthesesOpenToken.prototype.parse = function(tokens, position, parse){
    parenthesisParser.apply(this, arguments);

    var leftIndex = 0,
        previousToken;

    while(previousToken = tokens[position - ++leftIndex],
        leftIndex < position &&
        previousToken &&
        previousToken.parsePrecedence > this.parsePrecedence
    ){}
    this.leftTokens = tokens.splice(position - leftIndex, leftIndex);
    this.leftToken = this.leftTokens[0];
};
ParenthesesOpenToken.prototype.evaluate = function(scope){
    for(var i = 0; i < this.childTokens.length; i++){
        this.childTokens[i].evaluate(scope);
    }

    if(this.leftToken && !(this.leftToken instanceof DelimiterToken)){
        this.leftToken.evaluate(scope);

        if(typeof this.leftToken.result !== 'function'){
            throw this.leftToken.original + " (" + this.leftToken.result + ")" + " is not a function";
        }

        this.result = scope.callWith(this.leftToken.result, this.childTokens, this);
    }else{
        this.result = this.childTokens.slice(-1)[0].result;
    }
}
ParenthesesOpenToken.prototype.render = function(){
    if(this.previousToken){
        return '';
    }else{
        return compileTokens(this.childTokens);
    }
};

function BraceCloseToken(){}
BraceCloseToken = createSpec(BraceCloseToken, Token);
BraceCloseToken.tokenPrecedence = 1;
BraceCloseToken.prototype.parsePrecedence = 10;
BraceCloseToken.prototype.name = 'BraceCloseToken'
BraceCloseToken.tokenise = function(substring) {
    if(substring.charAt(0) === '}'){
        return new BraceCloseToken(substring.charAt(0), 1);
    }
}

function BraceOpenToken(){}
BraceOpenToken = createSpec(BraceOpenToken, Token);
BraceOpenToken.tokenPrecedence = 1;
BraceOpenToken.prototype.parsePrecedence = 2;
BraceOpenToken.prototype.name = 'BraceOpenToken'
BraceOpenToken.tokenise = function(substring) {
    if(substring.charAt(0) === '{'){
        return new BraceOpenToken(substring.charAt(0), 1);
    }
}
var braceParser = createNestingParser(BraceCloseToken);
BraceOpenToken.prototype.parse = function(tokens, position, parse){
    braceParser.apply(this, arguments);

    var index = 0;

    while(tokens[position - ++index] && !(tokens[position - ++index] instanceof SemicolonToken)){}

    this.selectorTokens = parse(tokens.splice(position - index + 1, index - 1));
};
BraceOpenToken.prototype.evaluate = function(scope){
    for(var i = 0; i < this.selectorTokens.length; i++){
        if(!this.selectorTokens[i].evaluate){
            continue;
        }
        this.selectorTokens[i].evaluate(scope);
    }

    for(var i = 0; i < this.childTokens.length; i++){
        if(!this.childTokens[i].evaluate){
            continue;
        }
        this.childTokens[i].evaluate(scope);
    }

    this.result = undefined;
};
BraceOpenToken.prototype.render = function(){
    if(this.isFunction){
        return '/*' + compileTokens(this.selectorTokens) + '{' + compileTokens(this.childTokens) + '}' + '*/';
    }
    return compileTokens(this.selectorTokens) + '{' + compileTokens(this.childTokens) + '}';
};

function NumberToken(){}
NumberToken = createSpec(NumberToken, Token);
NumberToken.tokenPrecedence = 1;
NumberToken.prototype.parsePrecedence = 2;
NumberToken.prototype.name = 'NumberToken';
NumberToken.tokenise = function(substring) {
    var specials = {
        "NaN": Number.NaN,
        "-NaN": Number.NaN,
        "Infinity": Infinity,
        "-Infinity": -Infinity
    };
    for (var key in specials) {
        if (substring.slice(0, key.length) === key) {
            return new NumberToken(key, key.length);
        }
    }

    var valids = "0123456789-.Eex",
        index = 0;

    while (valids.indexOf(substring.charAt(index)||null) >= 0 && ++index) {}

    if (index > 0) {
        var result = substring.slice(0, index);
        if(isNaN(parseFloat(result))){
            return;
        }
        return new NumberToken(result, index);
    }

    return;
};
NumberToken.prototype.evaluate = function(scope){
    this.result = parseFloat(this.original);
};


function SemicolonToken(){}
SemicolonToken = createSpec(SemicolonToken, Token);
SemicolonToken.tokenPrecedence = 1;
SemicolonToken.prototype.parsePrecedence = 7;
SemicolonToken.prototype.name = 'SemicolonToken';
SemicolonToken.tokenise = function(substring) {
    if(substring.charAt(0) === ';'){
        return new SemicolonToken(substring.charAt(0), 1);
    }
};
SemicolonToken.prototype.parse = function(tokens, position){
    var index = position,
        previousToken = tokens[--index];

    while(previousToken && !(previousToken instanceof SemicolonToken)){
        previousToken = tokens[--index];
    }

    this.childTokens = tokens.splice(index+1, position - index - 1);
};
SemicolonToken.prototype.evaluate = function(scope){
    for(var i = 0; i < this.childTokens.length; i++){
        this.childTokens[i].evaluate(scope);
    }

    this.result = this.childTokens[this.childTokens.length - 1].result;
};
SemicolonToken.prototype.render = function(scope){
    var result = compileTokens(this.childTokens);
    if(!(this.childTokens[this.childTokens.length - 1] instanceof AssignemntToken)){
        result+= this.original;
    }
    return result
};

function UnitToken(){}
UnitToken = createSpec(UnitToken, Token);
UnitToken.tokenPrecedence = 1;
UnitToken.prototype.parsePrecedence = 1;
UnitToken.prototype.name = 'UnitToken';
UnitToken.units = ['px', '%','em','deg','rad'];
UnitToken.tokenise = function(substring) {
    for(var i = 0; i < UnitToken.units.length; i++){
        if(substring.indexOf(UnitToken.units[i]) === 0){
            return new UnitToken(UnitToken.units[i], UnitToken.units[i].length);
        }
    }
};
UnitToken.prototype.parse = function(tokens, position){
    var index = position,
        previousToken = tokens[--index];

    while(previousToken && !(previousToken instanceof DelimiterToken)){
        previousToken = tokens[--index];
    }

    this.childTokens = tokens.splice(index+1, position - index - 1);
};
UnitToken.prototype.evaluate = function(scope){
    for(var i = 0; i < this.childTokens.length; i++){
        this.childTokens[i].evaluate(scope);
    }

    this.result = this.childTokens[this.childTokens.length - 1].result + this.original;
};
UnitToken.prototype.render = function(scope){
    return compileTokens(this.childTokens) + this.original;
};

function NullToken(){}
NullToken = createSpec(NullToken, Token);
NullToken.prototype.name = 'NullToken';
NullToken.tokenPrecedence = 1;
NullToken.prototype.parsePrecedence = 2;
NullToken.tokenise = createKeywordTokeniser(NullToken, "null");
NullToken.prototype.parse = function(tokens, position){
};
NullToken.prototype.evaluate = function(scope){
    this.result = null;
};

function TrueToken(){}
TrueToken = createSpec(TrueToken, Token);
TrueToken.prototype.name = 'TrueToken';
TrueToken.tokenPrecedence = 1;
TrueToken.prototype.parsePrecedence = 2;
TrueToken.tokenise = createKeywordTokeniser(TrueToken, "true");
TrueToken.prototype.parse = function(tokens, position){
};
TrueToken.prototype.evaluate = function(scope){
    this.result = true;
};

function FalseToken(){}
FalseToken = createSpec(FalseToken, Token);
FalseToken.prototype.name = 'FalseToken';
FalseToken.tokenPrecedence = 1;
FalseToken.prototype.parsePrecedence = 2;
FalseToken.tokenise = createKeywordTokeniser(FalseToken, "false");
FalseToken.prototype.parse = function(tokens, position){
};
FalseToken.prototype.evaluate = function(scope){
    this.result = false;
};

function VariableToken(){}
VariableToken = createSpec(VariableToken, Token);
VariableToken.tokenPrecedence = 1;
VariableToken.prototype.parsePrecedence = 2;
VariableToken.prototype.name = 'VariableToken';
VariableToken.tokenise = createKeywordTokeniser(VariableToken, "var");
VariableToken.prototype.parse = function(tokens, position){
    var index = position,
        nextToken = tokens[++index];

    while(nextToken instanceof DelimiterToken){
        nextToken = tokens[++index];
    }

    this.childTokens = tokens.splice(position, index - position);

    this.identifierToken = this.childTokens[this.childTokens.length - 1];
};
VariableToken.prototype.evaluate = function(scope){
    scope.set(this.identifierToken.original, undefined);
    this.result = undefined;
};
VariableToken.prototype.render = function(scope){
    return this.original + compileTokens(this.childTokens);
};


function DelimiterToken(){}
DelimiterToken = createSpec(DelimiterToken, Token);
DelimiterToken.tokenPrecedence = 1;
DelimiterToken.prototype.parsePrecedence = 1;
DelimiterToken.prototype.name = 'DelimiterToken';
DelimiterToken.tokenise = function(substring) {
    var i = 0;
    while(i < substring.length && substring.charAt(i).trim() === "") {
        i++;
    }

    if(i){
        return new DelimiterToken(substring.slice(0, i), i);
    }
};
DelimiterToken.prototype.evaluate = function(){};
DelimiterToken.prototype.render = function(){
    return this.original;
}

function OpperatorToken(){}
OpperatorToken = createSpec(OpperatorToken, Token);
OpperatorToken.tokenPrecedence = 2;
OpperatorToken.prototype.parsePrecedence = 3;
OpperatorToken.prototype.name = 'OpperatorToken';
OpperatorToken.prototype.parse = function(tokens, position){

    var leftIndex = 0,
        previousToken;
    while(previousToken = tokens[position - ++leftIndex],
        leftIndex < position &&
        previousToken &&
        previousToken instanceof DelimiterToken
    ){}
    this.leftTokens = tokens.splice(position - leftIndex, leftIndex);
    this.leftToken = this.leftTokens[0];

    // Just spliced a few things before, need to reset position
    position -= leftIndex;

    var rightIndex = 0,
        nextToken;
    while(nextToken = tokens[++rightIndex + position],
        nextToken &&
        nextToken instanceof DelimiterToken
    ){}
    this.rightTokens = tokens.splice(position + 1, rightIndex);
    this.rightToken = this.rightTokens[this.rightTokens.length-1];
};
OpperatorToken.prototype.render = function(isSource){
    if(isSource){
        return compileTokens(this.leftTokens) + this.original + compileTokens(this.rightTokens);
    }

    return this.result;
};

function AssignemntToken(){}
AssignemntToken = createSpec(AssignemntToken, OpperatorToken);
AssignemntToken.prototype.parsePrecedence = 6;
AssignemntToken.prototype.name = 'AssignemntToken';
AssignemntToken.tokenise = createOpperatorTokeniser(AssignemntToken, '=');
AssignemntToken.prototype.evaluate = function(scope){
    this.rightToken.evaluate(scope);
    if(!(this.leftToken instanceof IdentifierToken)){
        throw "ReferenceError: Invalid left-hand side in assignment";
    }
    scope.set(this.leftToken.original, this.rightToken.result, true);
};
AssignemntToken.prototype.render = function(){
    return '/* ' + compileTokens(this.leftTokens, true) + this.original + compileTokens(this.rightTokens, true) + ' */';
};

function MultiplyToken(){}
MultiplyToken = createSpec(MultiplyToken, OpperatorToken);
MultiplyToken.prototype.name = 'MultiplyToken';
MultiplyToken.tokenise = createOpperatorTokeniser(MultiplyToken, '*');
MultiplyToken.prototype.evaluate = createOpperatorEvaluator(function(a,b){
    return a * b;
});

function DivideToken(){}
DivideToken = createSpec(DivideToken, OpperatorToken);
DivideToken.prototype.name = 'DivideToken';
DivideToken.tokenise = createOpperatorTokeniser(DivideToken, '/');
DivideToken.prototype.evaluate = createOpperatorEvaluator(function(a,b){
    return a / b;
});

function AddToken(){}
AddToken = createSpec(AddToken, OpperatorToken);
AddToken.prototype.name = 'AddToken';
AddToken.tokenise = createOpperatorTokeniser(AddToken, '+');
AddToken.prototype.evaluate = createOpperatorEvaluator(function(a,b){
    return a + b;
});

function SubtractToken(){}
SubtractToken = createSpec(SubtractToken, OpperatorToken);
SubtractToken.prototype.name = 'SubtractToken';
SubtractToken.tokenise = createOpperatorTokeniser(SubtractToken, '-');
SubtractToken.prototype.evaluate = createOpperatorEvaluator(function(a,b){
    return a - b;
});

function ModulusToken(){}
ModulusToken = createSpec(ModulusToken, OpperatorToken);
ModulusToken.prototype.name = 'ModulusToken';
ModulusToken.tokenise = createOpperatorTokeniser(ModulusToken, '%');
ModulusToken.prototype.evaluate = createOpperatorEvaluator(function(a,b){
    return a % b;
});

function LessThanOrEqualToken(){}
LessThanOrEqualToken = createSpec(LessThanOrEqualToken, OpperatorToken);
LessThanOrEqualToken.prototype.name = 'LessThanOrEqualToken';
LessThanOrEqualToken.tokenise = createOpperatorTokeniser(LessThanOrEqualToken, '<=');
LessThanOrEqualToken.prototype.evaluate = createOpperatorEvaluator(function(a,b){
    return a <= b;
});

function LessThanToken(){}
LessThanToken = createSpec(LessThanToken, OpperatorToken);
LessThanToken.prototype.name = 'LessThanToken';
LessThanToken.tokenise = createOpperatorTokeniser(LessThanToken, '<');
LessThanToken.prototype.evaluate = createOpperatorEvaluator(function(a,b){
    return a < b;
});

function GreaterThanOrEqualToken(){}
GreaterThanOrEqualToken = createSpec(GreaterThanOrEqualToken, OpperatorToken);
GreaterThanOrEqualToken.prototype.name = 'GreaterThanOrEqualToken';
GreaterThanOrEqualToken.tokenise = createOpperatorTokeniser(GreaterThanOrEqualToken, '>=');
GreaterThanOrEqualToken.prototype.evaluate = createOpperatorEvaluator(function(a,b){
    return a >= b;
});

function GreaterThanToken(){}
GreaterThanToken = createSpec(GreaterThanToken, OpperatorToken);
GreaterThanToken.prototype.name = 'GreaterThanToken';
GreaterThanToken.tokenise = createOpperatorTokeniser(GreaterThanToken, '>');
GreaterThanToken.prototype.evaluate = createOpperatorEvaluator(function(a,b){
    return a > b;
});

function AndToken(){}
AndToken = createSpec(AndToken, OpperatorToken);
AndToken.prototype.name = 'AndToken';
AndToken.tokenise = createOpperatorTokeniser(AndToken, '&&');
AndToken.prototype.evaluate = createOpperatorEvaluator(function(a,b){
    return a && b;
});

function OrToken(){}
OrToken = createSpec(OrToken, OpperatorToken);
OrToken.prototype.name = 'OrToken';
OrToken.tokenise = createOpperatorTokeniser(OrToken, '||');
OrToken.prototype.evaluate = createOpperatorEvaluator(function(a,b){
    return a || b;
});

function IdentifierToken(){}
IdentifierToken = createSpec(IdentifierToken, Token);
IdentifierToken.tokenPrecedence = 3;
IdentifierToken.prototype.parsePrecedence = 2;
IdentifierToken.prototype.name = 'IdentifierToken';
IdentifierToken.tokenise = function(substring){
    var result = tokeniseIdentifier(substring);

    if(result != null){
        return new IdentifierToken(result, result.length);
    }
};
IdentifierToken.prototype.evaluate = function(scope){
    this.result = scope.get(this.original);
};
IdentifierToken.prototype.render = function(scope){
    return this.result || this.original;
};

function PeriodToken(){}
PeriodToken = createSpec(PeriodToken, OpperatorToken);
PeriodToken.prototype.name = 'PeriodToken';
PeriodToken.tokenPrecedence = 2;
PeriodToken.prototype.parsePrecedence = 5;
PeriodToken.tokenise = createOpperatorTokeniser(PeriodToken, '.');
PeriodToken.prototype.evaluate = function(scope){
    if(
        (typeof this.leftToken.result === 'object' || typeof this.leftToken.result === 'function') &&
        this.leftToken.result.hasOwnProperty(this.rightToken.original)
    ){
        this.result = this.leftToken.result[this.rightToken.original];
    }
};
PeriodToken.prototype.render = function(scope){
    return compileTokens(this.leftTokens) + this.original + compileTokens(this.rightTokens);
};

function TupleToken(){}
TupleToken = createSpec(TupleToken, OpperatorToken);
TupleToken.prototype.name = 'TupleToken';
TupleToken.tokenPrecedence = 2;
TupleToken.prototype.parsePrecedence = 5;
TupleToken.tokenise = createOpperatorTokeniser(TupleToken, ':');
TupleToken.prototype.parse = function(tokens, position){

    var leftIndex = 0,
        previousToken;
    while(previousToken = tokens[position - ++leftIndex],
        leftIndex < position &&
        previousToken &&
        previousToken instanceof DelimiterToken
    ){}
    this.leftTokens = tokens.splice(position - leftIndex, leftIndex);
    this.leftToken = this.leftTokens[0];

    // Just spliced a few things before, need to reset position
    position -= leftIndex;

    var rightIndex = 0,
        nextToken;
    while(nextToken = tokens[++rightIndex + position],
        nextToken &&
        !(nextToken instanceof SemicolonToken)
    ){}
    this.rightTokens = tokens.splice(position + 1, rightIndex - 1);
    this.rightToken = this.rightTokens[this.rightTokens.length-1];
};
TupleToken.prototype.evaluate = function(scope){
    evaluateTokens(this.leftTokens, scope);
    evaluateTokens(this.rightTokens, scope);

    this.result = {};
    this.result[this.leftToken.result] = this.rightToken.result;
};
TupleToken.prototype.render = function(scope){
    return compileTokens(this.leftTokens) + ':' + compileTokens(this.rightTokens);
};

var tokenConverters = [
        StringToken,
        ParenthesesOpenToken,
        ParenthesesCloseToken,
        BraceOpenToken,
        BraceCloseToken,
        NumberToken,
        SemicolonToken,
        NullToken,
        TrueToken,
        FalseToken,
        VariableToken,
        DelimiterToken,
        AssignemntToken,
        MultiplyToken,
        DivideToken,
        AddToken,
        ModulusToken,
        LessThanOrEqualToken,
        LessThanToken,
        GreaterThanOrEqualToken,
        GreaterThanToken,
        AndToken,
        OrToken,
        IdentifierToken,
        PeriodToken,
        TupleToken,
        UnitToken
    ];

var Icss = function(expression){
    var icss = {},
        lang = new Lang();

    icss.Token = Token;

    icss.lang = lang;
    icss.tokenConverters = tokenConverters;
    icss.global = global;
    icss.tokenise = function(expression){
        return icss.lang.tokenise(expression, icss.tokenConverters);
    }
    icss.evaluate = function(expression, injectedScope){
        var scope = new Lang.Scope();

        scope.add(this.global).add(injectedScope);

        var tokens = lang.evaluate(expression, scope, tokenConverters, true);

        var result = '';

        if(injectedScope){
            result += '\n\/* ';
            result += 'Current scope: \n\n';
            result += JSON.stringify(injectedScope, null, '    ');
            result += '\n\n*\/\n\n';
        }

        result += compileTokens(tokens);

        return result;
    };
    icss.update = function(injectedScope){
        this.result = this.evaluate(expression, injectedScope);
        if(this.render){
            this.render(this.result);
        }
    };

    icss.update();

    return icss;
};

module.exports = Icss;
},{"./global":2,"lang-js":5,"spec-js":8}],4:[function(require,module,exports){
//Copyright (C) 2012 Kory Nunn

//Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

//The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

//THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

/*

    This code is not formatted for readability, but rather run-speed and to assist compilers.

    However, the code's intention should be transparent.

    *** IE SUPPORT ***

    If you require this library to work in IE7, add the following after declaring crel.

    var testDiv = document.createElement('div'),
        testLabel = document.createElement('label');

    testDiv.setAttribute('class', 'a');
    testDiv['className'] !== 'a' ? crel.attrMap['class'] = 'className':undefined;
    testDiv.setAttribute('name','a');
    testDiv['name'] !== 'a' ? crel.attrMap['name'] = function(element, value){
        element.id = value;
    }:undefined;


    testLabel.setAttribute('for', 'a');
    testLabel['htmlFor'] !== 'a' ? crel.attrMap['for'] = 'htmlFor':undefined;



*/

(function (root, factory) {
    if (typeof exports === 'object') {
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        define(factory);
    } else {
        root.crel = factory();
    }
}(this, function () {
    // based on http://stackoverflow.com/questions/384286/javascript-isdom-how-do-you-check-if-a-javascript-object-is-a-dom-object
    var isNode = typeof Node === 'function'
        ? function (object) { return object instanceof Node; }
        : function (object) {
            return object
                && typeof object === 'object'
                && typeof object.nodeType === 'number'
                && typeof object.nodeName === 'string';
        };
    var isArray = function(a){ return a instanceof Array; };
    var appendChild = function(element, child) {
      if(!isNode(child)){
          child = document.createTextNode(child);
      }
      element.appendChild(child);
    };


    function crel(){
        var document = window.document,
            args = arguments, //Note: assigned to a variable to assist compilers. Saves about 40 bytes in closure compiler. Has negligable effect on performance.
            element = args[0],
            child,
            settings = args[1],
            childIndex = 2,
            argumentsLength = args.length,
            attributeMap = crel.attrMap;

        element = isNode(element) ? element : document.createElement(element);
        // shortcut
        if(argumentsLength === 1){
            return element;
        }

        if(typeof settings !== 'object' || isNode(settings) || isArray(settings)) {
            --childIndex;
            settings = null;
        }

        // shortcut if there is only one child that is a string
        if((argumentsLength - childIndex) === 1 && typeof args[childIndex] === 'string' && element.textContent !== undefined){
            element.textContent = args[childIndex];
        }else{
            for(; childIndex < argumentsLength; ++childIndex){
                child = args[childIndex];

                if(child == null){
                    continue;
                }

                if (isArray(child)) {
                  for (var i=0; i < child.length; ++i) {
                    appendChild(element, child[i]);
                  }
                } else {
                  appendChild(element, child);
                }
            }
        }

        for(var key in settings){
            if(!attributeMap[key]){
                element.setAttribute(key, settings[key]);
            }else{
                var attr = crel.attrMap[key];
                if(typeof attr === 'function'){
                    attr(element, settings[key]);
                }else{
                    element.setAttribute(attr, settings[key]);
                }
            }
        }

        return element;
    }

    // Used for mapping one kind of attribute to the supported version of that in bad browsers.
    // String referenced so that compilers maintain the property name.
    crel['attrMap'] = {};

    // String referenced so that compilers maintain the property name.
    crel["isNode"] = isNode;

    return crel;
}));

},{}],5:[function(require,module,exports){
(function (process){
var Token = require('./token');

function fastEach(items, callback) {
    for (var i = 0; i < items.length; i++) {
        if (callback(items[i], i, items)) break;
    }
    return items;
}

var now;

if(typeof process !== 'undefined' && process.hrtime){
    now = function(){
        var time = process.hrtime();
        return time[0] + time[1] / 1000000;
    };
}else if(typeof performance !== 'undefined' && performance.now){
    now = function(){
        return performance.now();
    };
}else if(Date.now){
    now = function(){
        return Date.now();
    };
}else{
    now = function(){
        return new Date().getTime();
    };
}

function callWith(fn, fnArguments, calledToken){
    if(fn instanceof Token){
        fn.evaluate(scope);
        fn = fn.result;
    }
    var argIndex = 0,
        scope = this,
        args = {
            callee: calledToken,
            length: fnArguments.length,
            raw: function(evaluated){
                var rawArgs = fnArguments.slice();
                if(evaluated){
                    fastEach(rawArgs, function(arg){
                        if(arg instanceof Token){
                            arg.evaluate(scope);
                        }
                    });
                }
                return rawArgs;
            },
            getRaw: function(index, evaluated){
                var arg = fnArguments[index];

                if(evaluated){
                    if(arg instanceof Token){
                        arg.evaluate(scope);
                    }
                }
                return arg;
            },
            get: function(index){
                var arg = fnArguments[index];

                if(arg instanceof Token){
                    arg.evaluate(scope);
                    return arg.result;
                }
                return arg;
            },
            hasNext: function(){
                return argIndex < fnArguments.length;
            },
            next: function(){
                if(!this.hasNext()){
                    throw "Incorrect number of arguments";
                }
                if(fnArguments[argIndex] instanceof Token){
                    fnArguments[argIndex].evaluate(scope);
                    return fnArguments[argIndex++].result;
                }
                return fnArguments[argIndex++];
            },
            all: function(){
                var allArgs = [];
                while(this.hasNext()){
                    allArgs.push(this.next());
                }
                return allArgs;
            }
        };

    return fn(scope, args);
}

function Scope(oldScope){
    this.__scope__ = {};
    if(oldScope){
        this.__outerScope__ = oldScope instanceof Scope ? oldScope : {__scope__:oldScope};
    }
}
Scope.prototype.get = function(key){
    var scope = this;
    while(scope && !scope.__scope__.hasOwnProperty(key)){
        scope = scope.__outerScope__;
    }
    return scope && scope.__scope__[key];
};
Scope.prototype.set = function(key, value, bubble){
    if(bubble){
        var currentScope = this;
        while(currentScope && !(key in currentScope.__scope__)){
            currentScope = currentScope.__outerScope__;
        }

        if(currentScope){
            currentScope.set(key, value);
        }
    }
    this.__scope__[key] = value;
    return this;
};
Scope.prototype.add = function(obj){
    for(var key in obj){
        this.__scope__[key] = obj[key];
    }
    return this;
};
Scope.prototype.isDefined = function(key){
    if(key in this.__scope__){
        return true;
    }
    return this.__outerScope__ && this.__outerScope__.isDefined(key) || false;
};
Scope.prototype.callWith = callWith;

// Takes a start and end regex, returns an appropriate parse function
function createNestingParser(closeConstructor){
    return function(tokens, index, parse){
        var openConstructor = this.constructor,
            position = index,
            opens = 1;

        while(position++, position <= tokens.length && opens){
            if(!tokens[position]){
                throw "Invalid nesting. No closing token was found";
            }
            if(tokens[position] instanceof openConstructor){
                opens++;
            }
            if(tokens[position] instanceof closeConstructor){
                opens--;
            }
        }

        // remove all wrapped tokens from the token array, including nest end token.
        var childTokens = tokens.splice(index + 1, position - 1 - index);

        // Remove the nest end token.
        childTokens.pop();

        // parse them, then add them as child tokens.
        this.childTokens = parse(childTokens);
    };
}

function scanForToken(tokenisers, expression){
    for (var i = 0; i < tokenisers.length; i++) {
        var token = tokenisers[i].tokenise(expression);
        if (token) {
            return token;
        }
    }
}

function sortByPrecedence(items, key){
    return items.slice().sort(function(a,b){
        var precedenceDifference = a[key] - b[key];
        return precedenceDifference ? precedenceDifference : items.indexOf(a) - items.indexOf(b);
    });
}

function tokenise(expression, tokenConverters, memoisedTokens) {
    if(!expression){
        return [];
    }

    if(memoisedTokens && memoisedTokens[expression]){
        return memoisedTokens[expression].slice();
    }

    tokenConverters = sortByPrecedence(tokenConverters, 'tokenPrecedence');

    var originalExpression = expression,
        tokens = [],
        totalCharsProcessed = 0,
        previousLength,
        reservedKeywordToken;

    do {
        previousLength = expression.length;

        var token;

        token = scanForToken(tokenConverters, expression);

        if(token){
            expression = expression.slice(token.length);
            totalCharsProcessed += token.length;
            tokens.push(token);
            continue;
        }

        if(expression.length === previousLength){
            throw "Unable to determine next token in expression: " + expression;
        }

    } while (expression);

    memoisedTokens && (memoisedTokens[originalExpression] = tokens.slice());

    return tokens;
}

function parse(tokens){
    var parsedTokens = 0,
        tokensByPrecedence = sortByPrecedence(tokens, 'parsePrecedence'),
        currentToken = tokensByPrecedence[0],
        tokenNumber = 0;

    while(currentToken && currentToken.parsed == true){
        currentToken = tokensByPrecedence[tokenNumber++];
    }

    if(!currentToken){
        return tokens;
    }

    if(currentToken.parse){
        currentToken.parse(tokens, tokens.indexOf(currentToken), parse);
    }

    // Even if the token has no parse method, it is still concidered 'parsed' at this point.
    currentToken.parsed = true;

    return parse(tokens);
}

function evaluate(tokens, scope){
    scope = scope || new Scope();
    for(var i = 0; i < tokens.length; i++){
        var token = tokens[i];
        token.evaluate(scope);
    }

    return tokens;
}

function printTopExpressions(stats){
    var allStats = [];
    for(var key in stats){
        allStats.push({
            expression: key,
            time: stats[key].time,
            calls: stats[key].calls,
            averageTime: stats[key].averageTime
        });
    }

    allStats.sort(function(stat1, stat2){
        return stat2.time - stat1.time;
    }).slice(0, 10).forEach(function(stat){
        console.log([
            "Expression: ",
            stat.expression,
            '\n',
            'Average evaluation time: ',
            stat.averageTime,
            '\n',
            'Total time: ',
            stat.time,
            '\n',
            'Call count: ',
            stat.calls
        ].join(''));
    });
}

function Lang(){
    var lang = {},
        memoisedTokens = {},
        memoisedExpressions = {};


    var stats = {};

    lang.printTopExpressions = function(){
        printTopExpressions(stats);
    }

    function addStat(stat){
        var expStats = stats[stat.expression] = stats[stat.expression] || {time:0, calls:0};

        expStats.time += stat.time;
        expStats.calls++;
        expStats.averageTime = expStats.time / expStats.calls;
    }

    lang.parse = parse;
    lang.tokenise = function(expression, tokenConverters){
        return tokenise(expression, tokenConverters, memoisedTokens);
    };
    lang.evaluate = function(expression, scope, tokenConverters, returnAsTokens){
        var langInstance = this,
            memoiseKey = expression,
            expressionTree,
            evaluatedTokens,
            lastToken;

        if(!(scope instanceof Scope)){
            scope = new Scope(scope);
        }

        if(Array.isArray(expression)){
            return evaluate(expression , scope).slice(-1).pop();
        }

        if(memoisedExpressions[memoiseKey]){
            expressionTree = memoisedExpressions[memoiseKey].slice();
        } else{
            expressionTree = langInstance.parse(langInstance.tokenise(expression, tokenConverters, memoisedTokens));

            memoisedExpressions[memoiseKey] = expressionTree;
        }


        var startTime = now();
        evaluatedTokens = evaluate(expressionTree , scope);
        addStat({
            expression: expression,
            time: now() - startTime
        });

        if(returnAsTokens){
            return evaluatedTokens.slice();
        }

        lastToken = evaluatedTokens.slice(-1).pop();

        return lastToken && lastToken.result;
    };

    lang.callWith = callWith;
    return lang;
};

Lang.createNestingParser = createNestingParser;
Lang.Scope = Scope;
Lang.Token = Token;

module.exports = Lang;
}).call(this,require("/usr/lib/node_modules/watchify/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js"))
},{"./token":6,"/usr/lib/node_modules/watchify/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js":11}],6:[function(require,module,exports){
function Token(substring, length){
    this.original = substring;
    this.length = length;
}
Token.prototype.name = 'token';
Token.prototype.precedence = 0;
Token.prototype.valueOf = function(){
    return this.result;
}

module.exports = Token;
},{}],7:[function(require,module,exports){
var EventEmitter = require('events').EventEmitter;

function tryParseJson(data){
    try{
        return JSON.parse(data);
    }catch(error){
        return error;
    }
}

function parseQueryString(url){
    var urlParts = url.split('?'),
        result = {};

    if(urlParts.length>1){

        var queryStringData = urlParts.pop().split("&");

        for(var i = 0; i < queryStringData.length; i++) {
            var parts = queryStringData[i].split("="),
                key = window.unescape(parts[0]),
                value = window.unescape(parts[1]);

            result[key] = value;
        }
    }

    return result;
}

function toQueryString(data){
    var queryString = '';

    for(var key in data){
        if(data.hasOwnProperty(key) && data[key] !== undefined){
            queryString += (queryString.length ? '&' : '?') + key + '=' + data[key];
        }
    }

    return queryString;
}

function Ajax(settings){
    var queryStringData,
        ajax = this;

    if(typeof settings === 'string'){
        settings = {
            url: settings
        };
    }

    if(typeof settings !== 'object'){
        settings = {};
    }

    ajax.settings = settings;
    ajax.request = new window.XMLHttpRequest();
    ajax.settings.method = ajax.settings.method || "get";

    if(ajax.settings.cors){
        //http://www.html5rocks.com/en/tutorials/cors/
        if ("withCredentials" in ajax.request) {
            // all good.

        } else if (typeof XDomainRequest != "undefined") {
            // Otherwise, check if XDomainRequest.
            // XDomainRequest only exists in IE, and is IE's way of making CORS requests.
            ajax.request = new window.XDomainRequest();
        } else {
            // Otherwise, CORS is not supported by the browser.
            ajax.emit('error', new Error('Cors is not supported by this browser'));
        }
    }else{
        ajax.request = new window.XMLHttpRequest();
    }

    if(ajax.settings.cache === false){
        ajax.settings.data = ajax.settings.data || {};
        ajax.settings.data._ = new Date().getTime();
    }

    if(ajax.settings.method.toLowerCase() === 'get' && typeof ajax.settings.data === 'object'){
        queryStringData = parseQueryString(ajax.settings.url);
        for(var key in ajax.settings.data){
            if(ajax.settings.data.hasOwnProperty(key)){
                queryStringData[key] = ajax.settings.data[key];
            }
        }

        ajax.settings.url  = ajax.settings.url.split('?').shift() + toQueryString(queryStringData);
        ajax.settings.data = null;
    }

    ajax.request.addEventListener("progress", function(event){
        ajax.emit('progress', event);
    }, false);

    ajax.request.addEventListener("load", function(event){
        var data = event.target.responseText;

        if(ajax.settings.dataType && ajax.settings.dataType.toLowerCase() === 'json'){
            if(data === ''){
                data = undefined;
            }else{
                data = tryParseJson(data);
            }
        }

        if(event.target.status >= 400){
            ajax.emit('error', event, data);
        } else {
            ajax.emit('success', event, data);
        }

    }, false);

    ajax.request.addEventListener("error", function(event){
        ajax.emit('error', event);
    }, false);

    ajax.request.addEventListener("abort", function(event){
        ajax.emit('abort', event);
    }, false);

    ajax.request.addEventListener("loadend", function(event){
        ajax.emit('complete', event);
    }, false);

    ajax.request.open(ajax.settings.method || "get", ajax.settings.url, true);

    // Set default headers
    if(ajax.settings.contentType !== false){
        ajax.request.setRequestHeader('Content-Type', ajax.settings.contentType || 'application/json; charset=utf-8');
    }
    ajax.request.setRequestHeader('X-Requested-With', ajax.settings.requestedWith || 'XMLHttpRequest');
    if(ajax.settings.auth){
        ajax.request.setRequestHeader('Authorization', ajax.settings.auth);
    }

    // Set custom headers
    for(var headerKey in ajax.settings.headers){
        ajax.request.setRequestHeader(headerKey, ajax.settings.headers[headerKey]);
    }

    if(ajax.settings.processData !== false && ajax.settings.dataType === 'json'){
        ajax.settings.data = JSON.stringify(ajax.settings.data);
    }
}

Ajax.prototype = Object.create(EventEmitter.prototype);
Ajax.prototype.send = function(){
    this.request.send(this.settings.data && this.settings.data);
};

module.exports = Ajax;
},{"events":10}],8:[function(require,module,exports){
Object.create = Object.create || function (o) {
    if (arguments.length > 1) {
        throw new Error('Object.create implementation only accepts the first parameter.');
    }
    function F() {}
    F.prototype = o;
    return new F();
};

function createSpec(child, parent){
    var parentPrototype;

    if(!parent) {
        parent = Object;
    }

    if(!parent.prototype) {
        parent.prototype = {};
    }

    parentPrototype = parent.prototype;

    child.prototype = Object.create(parent.prototype);
    child.prototype.__super__ = parentPrototype;
    child.__super__ = parent;

    // Yes, This is 'bad'. However, it runs once per Spec creation.
    var spec = new Function("child", "return function " + child.name + "(){child.__super__.apply(this, arguments);return child.apply(this, arguments);}")(child);

    spec.prototype = child.prototype;
    spec.prototype.constructor = child.prototype.constructor = spec;
    spec.__super__ = parent;

    return spec;
}

module.exports = createSpec;
},{}],9:[function(require,module,exports){
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
},{"./":3,"crel":4,"simple-ajax":7}],10:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        throw TypeError('Uncaught, unspecified "error" event.');
      }
      return false;
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      console.trace();
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],11:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}]},{},[1])