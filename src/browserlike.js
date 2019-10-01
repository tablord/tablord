//
// browserlike.js
//
// for node, make as if code is running in a browser, for test purposes only
/////////////////////////////////////////////////////////////////////////////

const jsdom = require("jsdom");
const {JSDOM} = jsdom;
const dom = new JSDOM(`<!DOCTYPE html><body><p>Hello world</p></body>`);
global.$ = require('jquery')(dom.window);
console.info('uses browserlike to have a fake dom and jQuery');
