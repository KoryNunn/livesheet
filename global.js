var arrayProto = [];

function max(){
    return Math.max.apply(Math, arrayProto.map.call(arguments, parseFloat));
}

function min(){
    return Math.min.apply(Math, arrayProto.map.call(arguments, parseFloat));
}

function px(value){
    return value + 'px';
}

module.exports = {
    floor: Math.floor,
    random: Math.random,
    max: max,
    min: min,
    px: px
};