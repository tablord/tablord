var assert = require('assert');

const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const dom = new JSDOM('<!DOCTYPE html><p>Hello World</p>');
console.info(dom.window.document.querySelector("p").textContent); // "Hello world"

const { window } = dom;
console.info('dom created'+dom);
console.info('window created'+window);
global.$ = require('jquery')(window);


var kernel = require('../src/kernel.js');

var helper = require('../src/helper.js');




console.info('coucou');

describe('Array', function() {
  describe('#indexOf()', function() {
    it('should return -1 when the value is not present', function() {
      assert.equal([1, 2, 3].indexOf(4), -1); // should be ok
    });
  });
});

describe('helper', function() {
  describe('#tb.reduce.sum()', function() {
    it('should return the sum of two numbers', function() {
      assert.equal(tb.reduce.sum(2,3),5);
    });
  });
});