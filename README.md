# Livesheet.js

Live css with dynamic variables, real functions, and other cool stuff.

## Totally experimental, mostly doesn't work.

Demo here: http://korynunn.github.io/icss/examples/

Uses .lcss files

## Plans

Live evaluated variables (mostly working)
Actual functions (kinda working)
More javascript-like
node-like require('./thing')

## Performance

This is my biggest concern, any change will currently re-render the styles, causing ever effected element in the page to re-layout.

Concidering multiple textnodes, multiple style tags etc.. will address when needed.

Currently evaluation of the demo page takes around 0.6ms (plenty quick)
