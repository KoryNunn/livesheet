# ~~ICSS~~

Probably gona change the name to:

# Livesheet.js

Live css with dynamic variables.

## Totally experimental, doesn't work.

Demo here: http://korynunn.github.io/icss/examples/

Uses ~~.icss~~

Probably going to change to .lcss

## Plans

Live evaluated variables (kinda working)
Actual functions
More javascript-like
node-like require('./thing')

## Performance

This is my biggest concern, any change will currently re-render the styles, causing ever effected element in the page to re-layout.

Concidering multiple textnodes, multiple style tags etc.. will address when needed.

Currently evaluation of the demo page takes around 0.6ms (plenty quick)
