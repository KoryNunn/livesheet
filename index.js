var Lang = require('lang-js'),
    Token = Lang.Token,
    global = require('./global'),
    createSpec = require('spec-js');

var createNestingParser = Lang.createNestingParser,
    Token = Lang.Token,
    Scope = Lang.Scope;

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

function compileTokens(tokens){
    return tokens.reduce(function(result, token){
        return result += token.result;
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
}
StringToken.prototype.evaluate = function () {
    this.result = this.original;
}

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

    var previousToken = tokens[position-1];

    if(!previousToken || previousToken instanceof SemicolonToken || previousToken instanceof OpperatorToken){
        return;
    }

    tokens.splice(position-1, 1);

    this.previousToken = previousToken;
};
ParenthesesOpenToken.prototype.evaluate = function(scope){
    for(var i = 0; i < this.childTokens.length; i++){
        this.childTokens[i].evaluate(scope);
    }

    if(this.previousToken){
        this.previousToken.evaluate(scope);

        if(typeof this.previousToken.result !== 'function'){
            throw this.previousToken.original + " (" + this.previousToken.result + ")" + " is not a function";
        }

        this.result = scope.callWith(this.previousToken.result, this.childTokens, this);
    }else{
        this.result = this.childTokens.slice(-1)[0].result;
    }
}

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
var parenthesisParser = createNestingParser(BraceCloseToken);
BraceOpenToken.prototype.parse = function(tokens, position, parse){
    parenthesisParser.apply(this, arguments);

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

    this.result = compileTokens(this.selectorTokens) + '{' + compileTokens(this.childTokens) + '}';
}

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
SemicolonToken.prototype.parsePrecedence = 6;
SemicolonToken.prototype.name = 'SemicolonToken';
SemicolonToken.tokenise = function(substring) {
    if(substring.charAt(0) === ';'){
        return new SemicolonToken(substring.charAt(0), 1);
    }
};
SemicolonToken.prototype.parse = function(tokens, position){
    var lastPosition = 0;

    for(var i = tokens.length - 1 - position; i >=0; i--){
        if(tokens[i] instanceof SemicolonToken){
            lastPosition = i;
            break;
        }
    }

    this.childTokens = tokens.splice(lastPosition, position - lastPosition);
};
SemicolonToken.prototype.evaluate = function(scope){
    for(var i = 0; i < this.childTokens.length; i++){
        this.childTokens[i].evaluate(scope);
    }

    var lastChild = this.childTokens.slice(-1)[0];

    this.result = (lastChild ? lastChild.result : undefined) + this.original;
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
    this.identifierKey = tokens[position + 1].original;
};
VariableToken.prototype.evaluate = function(scope){
    scope.set(this.identifierKey, undefined);
    this.result = undefined;
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
DelimiterToken.prototype.evaluate = function(){
    this.result = this.original;
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
        previousToken && 
        previousToken instanceof DelimiterToken
    ){}
    this.leftTokens = tokens.splice(position - leftIndex, leftIndex);
    this.leftToken = this.leftTokens.shift();

    // Just spliced a few things before, need to reset position
    position -= leftIndex;

    var rightIndex = 0,
        nextToken;
    while(nextToken = tokens[++rightIndex + position], 
        nextToken && 
        nextToken instanceof DelimiterToken
    ){}
    this.rightTokens = tokens.splice(position + 1, rightIndex);
    this.rightToken = this.rightTokens.pop();
};

function AssignemntToken(){}
AssignemntToken = createSpec(AssignemntToken, OpperatorToken);
AssignemntToken.prototype.name = 'AssignemntToken';
AssignemntToken.tokenise = createOpperatorTokeniser(AssignemntToken, '=');
AssignemntToken.prototype.evaluate = function(scope){
    this.rightToken.evaluate(scope);
    if(!(this.leftToken instanceof IdentifierToken)){
        throw "ReferenceError: Invalid left-hand side in assignment";
    }
    scope.set(this.leftToken.original, this.rightToken.result, true);
    this.result = '/* ' + this.leftToken.original + this.original + this.rightToken.original + ' */';
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
    this.result = scope.get(this.original) || this.original;
};

function PeriodToken(){}
PeriodToken = createSpec(PeriodToken, Token);
PeriodToken.prototype.name = 'PeriodToken';
PeriodToken.tokenPrecedence = 2;
PeriodToken.prototype.parsePrecedence = 5;
PeriodToken.tokenise = function(substring){
    var periodConst = ".";
    return (substring.charAt(0) === periodConst) ? new PeriodToken(periodConst, 1) : undefined;
};
PeriodToken.prototype.parse = function(tokens, position){
    if(position !== 0){
        this.targetToken = tokens.splice(position-1,1)[0];
        this.identifierToken = tokens.splice(position,1)[0];
    }else{
        this.identifierToken = tokens.splice(position + 1,1)[0];
    }
};
PeriodToken.prototype.evaluate = function(scope){
    if(!this.targetToken){
        this.identifierToken.evaluate(scope);
        this.result = '.' + this.identifierToken.result;
        return;
    }

    this.targetToken.evaluate(scope);

    if(
        this.targetToken.result &&
        (typeof this.targetToken.result === 'object' || typeof this.targetToken.result === 'function')
        && this.targetToken.result.hasOwnProperty(this.identifierToken.original)
    ){
        this.result = this.targetToken.result[this.identifierToken.original];
    }else{
        this.identifierToken.evaluate(scope);
        this.result = this.targetToken.result + '.' + this.identifierToken.result;
    }
};

function TupleToken(){}
TupleToken = createSpec(TupleToken, Token);
TupleToken.prototype.name = 'TupleToken';
TupleToken.tokenPrecedence = 2;
TupleToken.prototype.parsePrecedence = 5;
TupleToken.tokenise = function(substring){
    var tupleConst = ":";
    return (substring.charAt(0) === tupleConst) ? new TupleToken(tupleConst, 1) : undefined;
};
TupleToken.prototype.parse = function(tokens, position){
    this.propertyToken = tokens.splice(position-1,1)[0];

    var index = 0;

    while(!(tokens[++index + position] instanceof SemicolonToken)){}

    this.valueTokens = tokens.splice(position, index);
};
TupleToken.prototype.evaluate = function(scope){
    this.propertyToken.evaluate(scope);

    for(var i = 0; i < this.valueTokens.length; i++){
        this.valueTokens[i].evaluate(scope);
    }

    this.result = this.propertyToken.result + ':' + compileTokens(this.valueTokens);
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
        IdentifierToken,
        PeriodToken,
        TupleToken
    ];

var Icss = function(){
    var icss = {},
        lang = new Lang();

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

        return compileTokens(tokens);
    };

    return icss;
};

module.exports = Icss;