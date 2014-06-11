var test = require('grape'),
    fs = require('fs'),
    Icss = require('../');

var icss = new Icss();


test("normal css", function (t) {
  console.log(icss.evaluate(".things{border: solid 1px red;}"));
});

test("variables", function (t) {
  console.log(icss.evaluate("var foo = 'bar'; foo"));
});

test("variables in css", function (t) {
  console.log(icss.evaluate("var foo = 'bar'; .things{border: solid foo red;}"));
});

test("formatting", function (t) {

  var sheet = fs.readFileSync('test.icss').toString();
  console.log(icss.evaluate(sheet));
});