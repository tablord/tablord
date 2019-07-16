var assert = require('assert');
var helper = require('../src/helper.js');

describe('Array', function() {
  describe('#indexOf()', function() {
    it('should return -1 when the value is not present', function() {
      assert.equal([1, 2, 3].indexOf(4), -1); // should be ok
    });
  });
});

describe('helper', function() {
  describe('#tb.reduce.sum()', function() {
    if('should return the sum of two numbers', function() {
      assert.equal(tb.reduce.sum(2,3),5);
    })
  })
});