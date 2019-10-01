// test for kernel.js
//
/////////////////////////////////////////////////////////////////////////////////////////
'use strict';

if(!process.browser) {
    require('should');
    var tb = require('../src/kernel');
}


describe('kernel.js', function () {
    it('has noting to test',  function () {
        console.info(JSON.stringify(tb.credits))
    });
});