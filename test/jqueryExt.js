// test for jQueryExt.js
//
/////////////////////////////////////////////////////////////////////////////////////////

'use strict';


if (!process.browser) {
    require('should');
    require('../src/jqueryExt');
}

describe('jQueryExt', function () {
    describe('.span',function() {
        it('return an html object',  function () {
            $('<div>toto</div>').span().htmlCode
                .should.be.equal('JQuery of 1 elements<br><ol start=0><br><li class="INSPECTHTML"><wbr>&lt;div&gt;toto<wbr>&lt;/div&gt;<br></ol>');
        });
    });


    describe('.toString', function () {
        it('return a simple string',  function () {
            $('<div>toto</div>').toString()
                .should.be.equal('[object JQuery] length:1');
        });
    });

    describe('.inspectString', function () {
        it('return a inspection for normal string like console...',  function () {
            $('<div>toto</div>').inspectString()
                .should.be.equal('[object JQuery] length:1\n0) <div>toto</div>\n');
        });
    });

    describe('.node$', function (){
        it('return an object with a node$ function that return the jQuery',function(){
            let a$ = $('<div>Hello World</div>');
            a$.asNode().node$().should.be.equal(a$);
        })
    });

    describe('.frozenCopy',function(){
        it('return a copy of the query, removing id= func= and FUNC CODE or ELEMENT', function(){
            $('<div id=toto class="CODE ELEMENT yellow">Hello<span id="truc" data-code="mycode" class="FUNC">truc</span></div>')
                .frozenCopy().node$().inspectString().should.be.equal('[object JQuery] length:1\n0) <div class="yellow">Hello<span class="">truc</span></div>\n')
        })
    });

    describe('.itemscopeOrThis$',function(){
        it('return the parent itemscope when inside an itemscope',function(){
            let a$ = $('<div id="A" itemscope><div id="B">toto</div></div>');
            $('#B',a$).itemscopeOrThis$()[0].id='A';
        });
        it('return this when not inside an itemscope',function(){
            let a$ = $('<div id="A"><div id="B">toto</div></div>');
            $('#B',a$).itemscopeOrThis$()[0].id='B';
        })
    });

    describe('$.elementsByIds$',function(){
        it('return the parameter if the parameter is a jquery',function(){
            let a$ = $('<div id="A"></div><div id="B"></div><div id="C" itemtype="TC"></div><div id="D"></div>');
            $('body').append(a$);
            $.elementsByIds$($('#A')).inspectString().should.be.equal('[object JQuery] length:1\n0) <div id="A"></div>\n')
        })
    });

    describe('.getItems',function(){
        it('find all itemtype of a given url inside the jquery',function(){
            let a$=$('<div><div id="e1" itemscope itemtype="T1"><div id="e2" itemscope itemtype="T2"></div></div></div>');
            a$.getItems('T1').attr('id').should.be.equal('e1');
            a$.getItems('T2').attr('id').should.be.equal('e2');
        })
    });

    describe('$.getItems',function(){
        it('find all itemtype of a given url inside the document',function(){
            // reuse the html code appended in $.elementByIds
            $.getItems('TC').attr('id').should.be.equal('C');
        })
    })

    describe('.getItempropValue',function(){
        context('follows microdata specification',function(){
            it('in the general case just return the html of the itemprop',function(){
                $('<div itemprop="v1">value1</div>').getItempropValue().should.be.equal('value1');
                $('<div itemprop="v2">value2</div>').getItempropValue().should.be.equal('value2');
            });
            it('in case of META return the content',function(){
                $('<meta itemprop="v1" content="content1">value1</meta>').getItempropValue().should.be.equal('content1');
            });
            it("in case of  'AUDIO','EMBED','IFRAME','IMG','SOURCE','TRACK','VIDEO' return the src",function(){
                $('<img itemprop="v1" src="/static/images/tablord.png">value1</img>').getItempropValue().should.be.equal('/static/images/tablord.png');
            });
            it("in case of  'A','AREA','LINK' return the href",function(){
                $('<a itemprop="v1" href="url1">value1</a>').getItempropValue().should.be.equal('url1');
            });
            it("in case of  'OBJECT' return the data",function(){
                $('<object itemprop="v1" data="data1">value1</object>').getItempropValue().should.be.equal('data1');
            });
            it("in case of  'TIME' return the datetime or the html",function(){
                $('<time itemprop="v1" datetime="2019-09-24">24 septembre 2019</time>').getItempropValue()
                    .format('YYYY-MM-DD').should.be.equal('2019-09-24');
                $('<time itemprop="v1">2019-09-24</time>').getItempropValue()
                    .format('YYYY-MM-DD').should.be.equal('2019-09-24');
            });
            it("in case of  'DATA','METER','SELECT','INPUT' return the value",function(){
                $('<input itemprop="v1" value="value1">').getItempropValue().should.be.equal('value1');
            });
            it("in case of  'DATA','METER','SELECT','INPUT' return the value",function(){
                $('<input itemprop="v1" value="value1">').getItempropValue().should.be.equal('value1');
            });
        });
        context('adds some feature dedicated for Tablord',function(){
            it('converts to number if class="number"',function(){
                $('<div itemprop="v1" class="number">123</div>').getItempropValue().should.be.equal(123);
            });
            it('converts to duration if class="duration" ',function(){
                $('<div itemprop="v1" class="duration" >24 hours</div>').getItempropValue()
                .format().should.be.equal('1 day');
            });
            it('converts to moment if class="date" and format="..."',function(){
                $('<div itemprop="v1" class="date" format="DD-MM-YYYY">24-09-2019</div>').getItempropValue()
                .format('YYYY-MM-DD').should.be.equal('2019-09-24');
            });

        })

    });

    describe('.getItemscopeData',function(){
        context('simple usage without remapping',function() {
            it('finds simple record out of itemscope', function () {
                let a$ = $(
                    '<div itemscope>' +
                    '<div itemprop="first">Marc</div>' +
                    '<div itemprop="last">Nicole</div>' +
                    '</div>');
                a$.getItemscopeData().should.be.deepEqual({first: 'Marc', last: 'Nicole'});
            });
        });
        context('can remap fields',function(){
            it('finds simple record out of itemscope and remap',function(){
                let a$ = $(
                    '<div itemscope>'+
                        '<div itemprop="first">Marc</div>'+
                        '<div itemprop="last">Nicole</div>'+
                    '</div>');
                a$.getItemscopeData(e => e.first+' '+e.last).should.be.deepEqual('Marc Nicole');
            });
        });
    });
    describe('.getMicrodata',function() {
        it('finds any microdata out of itemscope', function () {
            let a$ = $(
                '<div itemscope itemtype="name">' +
                '<div itemprop="first">Marc</div>' +
                '<div itemprop="first">Olivier</div>' +
                '<div itemprop="last">Nicole</div>' +
                '</div>');
            a$.getMicrodata().should.be.deepEqual(
                 {items:
                         [
                             {
                                 id: undefined,
                                 type: 'name',
                                 properties: {first: ['Marc','Olivier'], last: ['Nicole']}
                             }
                         ]
                 });
        });
    });
    describe('.setMicrodata',function() {
        it('set itemscope wit microdata', function () {
            let a$ = $(
                '<div id="me" itemscope itemtype="name">' +
                '<div itemprop="first"></div>' +
                '<div itemprop="first"></div>' +
                '<div itemprop="last"></div>' +
                '</div>');
            let microdata=
                 {items:
                         [
                             {
                                 id: 'me',
                                 type: 'name',
                                 properties: {first: ['Marc','Olivier'], last: ['Nicole']}
                             }
                         ]
                 };
            a$.setMicrodata(microdata).html().should.be.equal('<div itemprop="first">Marc</div><div itemprop="first">Olivier</div><div itemprop="last">Nicole</div>');
        });
    });
    describe('.filterFromToId',function(){
        it('return a subset of jquery starting with the element having first id and ending with another id',function(){
            let a$ = $('<div id="A"></div><div id="B"></div><div id="C"></div>');
            a$.filterFromToId('A','B').inspectString().should.be.equal('[object JQuery] length:2\n0) <div id="A"></div>\n1) <div id="B"></div>\n');
        });
    });

    describe('.replaceText',function(){
        context('simple usage is similar to string.replace', function(){
            it('replace text on text element only',function(){
                $('<div>Hello <span>world.</span><br><p>it is a beautiful wOrld</p></div>')
                    .replaceText(/world/i,'World').text().should.be.equal('Hello World.it is a beautiful World');
            });

        });
        context('it can also specify where to modify', function(){
            it('replace text on text element only on accepted element',function(){
                $('<div>Hello <span>world.</span><br><p>it is a beautiful wOrld</p></div>')
                    .replaceText(/world/i,'World',e => (e.tagName === 'SPAN')?true:undefined)
                    .text().should.be.equal('Hello World.it is a beautiful wOrld');
            });
        });
    });

    describe('.neighbour$',function(){
        it('find the neighbour where to insert after',function(){
            let doc$=$('<div><div id="i1" itemscope><div id="a"></div><div id="b"></div></div><div id="i2" itemscope><div id="c"></div><div id="d"></div></div>');
            let a$ = $('#b',doc$);
            a$.neighbour$('before').attr('id').should.be.equal('b');
            a$.neighbour$('beforeItemscope').attr('id').should.be.equal('i1');
            a$.neighbour$('after').attr('id').should.be.equal('b');
            a$.neighbour$('afterItemscope').attr('id').should.be.equal('i1');
        })
    })
});
