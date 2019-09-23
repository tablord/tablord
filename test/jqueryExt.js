// test for jQueryExt.js
//
/////////////////////////////////////////////////////////////////////////////////////////

'use strict';

require('should');
if (!window.ElementCompare) {
    require('../src/jqueryExt');
}

tb = {help:{update:function(){}}};  // dummy to satisfy help dependency

describe('jQueryExt', function () {
    it('check span',  function () {
        $('<div>toto</div>').span()
            .should.be.equal('');
    });
});