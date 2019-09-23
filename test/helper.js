// test for helpers.js
//
/////////////////////////////////////////////////////////////////////////////////////////
'use strict';

require('should');
require('../src/helper');

describe('helpers.js', function () {
    describe('Date extension',function(){
        it('.yyyymmdd return a string yyyymmdd',  function () {
            let d = new Date(2019,9,22).yyyymmdd(); // month:9 = october in js !!
            d.should.be.equal('2019-10-22');
        });
        it('.hhh_mm express a duration in hours min',  function () {
            let d1 = new Date(2019,8,29, 12,15);
            let d2 = new Date(2019,8,29, 13,30);
            (new Date(d2-d1)).hhh_mm().should.be.equal('1h 15m');

        });

    });

    describe('tb.getItems$', function() {
        let doc$ = $('<div><div id="i1" itemscope itemtype="t1">this itemscope is found.</div>'+
                          '<div id="i2" itemscope itemtype="t2">this itemscope is also found.'+
                               '<span id="i3" itemscope itemtype="t1">embeeded itemscope</span>'+
                          '</div>'+
                     '</div>');
        context('no url is specified', function() {
            it('finds all itemscope', function(){
                let res$ = tb.getItems$(undefined,doc$);
                res$.length.should.be.equal(2); // embeeded is not listed
                res$[0].id.should.be.equal('i1');
                res$[1].id.should.be.equal('i2');
            });
        });
        context('url is specified', function() {
            it('finds all itemscope having itemtype=url', function(){
                let res$ = tb.getItems$('t1',doc$);
                res$.length.should.be.equal(1); // embeeded is not listed
                res$[0].id.should.be.equal('i1');
                // i3 is not listed, since it is embeeded in i2
            });
        });
    });

    describe('tb.get', function(){
        it('walk into the sub object of an object for a given property and return undefined if any of the steps are undefined', function(){
            var obj = {get:tb.get,
                       toto:3,
                       tutu:{titi:4}};
            obj.get('toto').should.be.equal(3);
            obj.get('tutu','titi').should.be.equal(4);
            should.not.exist(obj.get('truc'));
            should.not.exist(obj.get('tutu','truc'));
        })
    });
    describe('tb.set', function(){
        it('set a property and create if necessary the intermediate objects', function(){
            var obj = {get:tb.get,
                       set:tb.set,
                       toto:3,
                       tutu:{titi:4}};
            obj.set(5,'toto');
            obj.get('toto').should.be.equal(5);
            obj.set(18,'tutu','truc','bidule');
            obj.get('tutu','truc').should.be.deepEqual({bidule:18});
        })
    });

    describe('tb.summary',function(){
        it('returns a 1 line summary for any object',function(){
            tb.summary({toto:5}).should.be.equal('[object Object]');
            tb.summary(null).should.be.equal('null');
            tb.summary(undefined).should.be.equal('undefined');
            tb.summary({toString:()=>'special toString'}).should.be.equal('special toString');
            tb.summary(1234).should.be.equal('1234');
        })
    });

    describe('tb.heir',function(){
        it('creates an heir of an object', function(){
            var ancestor= {toto:5,tutu:6};
            var child = tb.heir(ancestor);
            child.titi = 7;
            child.toto.should.be.equal(5);
        })
    });

    describe('tb.keys',function(){
        it('return all keys of an object',function(){
            tb.keys({toto:1,tutu:2,titi:3}).should.be.deepEqual(['toto','tutu','titi']);
        })
    });

    describe('tb.values',function(){
        it('return all values of an object',function(){
            tb.values({toto:1,tutu:2,titi:3}).should.be.deepEqual([1,2,3]);
        })
    });

    describe('tb.copy',function(){
        it('copy the first level of an object',function(){
            var a = {toto:1,tutu:2,titi:{x:3,y:4}};
            var b = tb.copy(a);
            b.should.be.deepEqual(a);
            b.toto = 10;
            a.toto.should.be.equal(1);
            a.titi.x = 30;
            b.titi.x.should.be.equal(30);
        })
    });

    describe('tb.objMatchCriteria',function(){
        it('return true if the object match the critera',function(){
            var a = {toto:1,tutu:2,titi:{x:3,y:4}};
            tb.objMatchCriteria(a,{toto:1}).should.be.true();
            tb.objMatchCriteria(a,{toto:2}).should.be.false();
            tb.objMatchCriteria(a,{toto:1,tutu:2}).should.be.true();
            tb.objMatchCriteria(a,{toto:1,tutu:3}).should.be.false();
        })
    });

    describe('tb.findInArrayOfObject',function(){
        it('return the object that correspond to the criteria',function(){
            var a = [
                {titi:5,tutu:0},
                {titi:4,tutu:0},
                {titi:4,tutu:1}];
            tb.findInArrayOfObject({tutu:0},a).should.be.deepEqual(0);
            tb.findInArrayOfObject({titi:4},a).should.be.deepEqual(1);
            tb.findInArrayOfObject({titi:4,tutu:1},a).should.be.deepEqual(2);
            tb.findInArrayOfObject({titi:8},a).should.be.deepEqual(-1);

        })
    });

    describe('tb.pad',function(){
        it('return a string representing a number padded with trailing 0 if needed',function(){
            tb.pad(7,3).should.be.equal('007');
            tb.pad(12345,3).should.be.equal('345');
        })
    });

    describe('tb.urlComponents',function(){
        it('decompose an url in all parts',function(){
            tb.urlComponents('http://marc:1234@www.tablord.com:8080/myService/toto.htm?param1=bidule&param2=truc')
            .should.be.deepEqual({
                 protocol: 'http',
                 user: 'marc',
                 password: '1234',
                 domain: 'www.tablord.com',
                 port: '8080',
                 drive: undefined,
                 path: '/myService/',
                 fullFileName: 'toto.htm',
                 search: 'param1=bidule&param2=truc',
                 tag: '',
                 fileName: 'toto',
                 ext: 'htm',
                 absolutePath: 'http://www.tablord.com/myService/',
                 arguments:{ param1: 'bidule', param2: 'truc' }
            })
        });
        it('decompose file name in all parts',function(){
            tb.urlComponents('c:\\user\\marc\\documents\\toto.txt')
            .should.be.deepEqual({
                 protocol: 'file',
                 user: undefined,
                 password: undefined,
                 domain: undefined,
                 port: undefined,
                 drive: 'c:',
                 path: '/user/marc/documents/',
                 fullFileName: 'toto.txt',
                 search: '',
                 tag: '',
                 fileName: 'toto',
                 ext: 'txt',
                 absolutePath: 'c:/user/marc/documents/',
                 arguments:{}
            })
        })
    });

    describe('tb.fileName',function(){
        it('return the filename of an url or path',function(){
            tb.fileName('c:/users/marc/documents/toto.txt').should.be.equal('toto.txt');
        })
    });

    describe('tb.absoluteFileName',function(){
        it('return the absolute filename of a path',function(){
            tb.absoluteFileName('toto.txt','c:/users/marc/documents/').should.be.equal('c:/users/marc/documents/toto.txt');
        })
    });

    describe('tb.limit',function(){
        it('bounds a value within 2 limits',function(){
            tb.limit(-1,0,10).should.be.equal(0);
            tb.limit(1,0,10).should.be.equal(1);
            tb.limit(11,0,10).should.be.equal(10);
        })
    });

    describe('tb.sign',function(){
        it('return -1,0 or 1 according to the sign of the argument',function(){
            tb.sign(-3.14).should.be.equal(-1);
            tb.sign(0).should.be.equal(0);
            tb.sign(3.14).should.be.equal(1);
        })
    });

    describe('tb.dist2',function(){
        it('return the square of the distance between two points',function(){
            var p1={x:0,y:0};
            var p2={x:3,y:4};
            tb.dist2(p1,p2).should.be.equal(25);
        })
    });

    describe('tb.dist',function(){
        it('return the distance between two points',function(){
            var p1={x:0,y:0};
            var p2={x:3,y:4};
            tb.dist(p1,p2).should.be.equal(5);
        })
    });

    describe('tb.htmlToText',function(){
        it('make sure that you can display in an HTML text as a string',function(){
            tb.htmlToText('<div>Hello World</div><br>I am here').should.be.equal('Hello World\nI am here')
        })
    });

    describe('tb.toHtml',function(){
        it('transforms a string into another html string',function(){
            tb.toHtml('<div>Hello World</div>').should.be.equal('<wbr>&lt;div&gt;Hello&nbsp;World<wbr>&lt;/div&gt;');
        })
    });

    describe('tb.isJSid',function(){
        it('say if a string can be a valid JavaScript Id',function(){
            tb.isJSid('toto').should.be.true();
            tb.isJSid('toto123').should.be.true();
            tb.isJSid('$toto').should.be.true();
            tb.isJSid('toto_123$').should.be.true();
            tb.isJSid('_toto_').should.be.true();
            tb.isJSid('!_toto_').should.be.false();
            tb.isJSid('123_toto_').should.be.false();
            tb.isJSid('titi-toto_').should.be.false();
        })
    });

    describe('tb.toJSCode',function(){
        it('converts any object to a string that can be represented by eval',function(){
            tb.toJSCode(123).should.be.equal('123');
            tb.toJSCode('toto').should.be.equal("'toto'");
            tb.toJSCode("l'été").should.be.equal("'l\\\'été'");
            tb.toJSCode("l'été",'"').should.be.equal('"l\'été"');
            tb.toJSCode(undefined).should.be.equal('undefined');
            tb.toJSCode(null).should.be.equal('null');
            tb.toJSCode(function truc(){return 'toto'}).should.be.equal('function truc(){return \'toto\'}');
            tb.toJSCode({toJSCode:()=>'myJSCode'}).should.be.equal('myJSCode');
            tb.toJSCode({toJSON:()=>'myJSON'}).should.be.equal('myJSON');
            tb.toJSCode({toto:1,titi:2}).should.be.equal('{toto:1,titi:2}');
            tb.toJSCode([1,2,3,4]).should.be.equal('[1,2,3,4]');
        })
    });

    describe('tb.trimHtml',function(){
        it('removes unecessary space in html',function(){
            tb.trimHtml('  <div>  Hello World\t</div>\n<div>    I am here</div>  ')
                .should.be.equal('<div>Hello World</div>\n<div>I am here</div>');
        });
    });

    describe('tb.signature',function(){
        it('return the name of a function',function(){
            tb.signature(function toto(a,b){return a+b}).should.be.equal('function toto(a,b)');
        })
    });
    describe('tb.functionName',function(){
        it('return the name of a function',function(){
            tb.functionName(function toto(a,b){return a+b}).should.be.equal('toto');
        })
    });

    describe('tb.isConstructorName',function(){
        it('return true if a constructor Name according to Tablord conventions',function(){
            tb.isConstructorName('tb').should.be.false();
            tb.isConstructorName('tb.Table').should.be.false();
            tb.isConstructorName('Table').should.be.true();
        })
    })
});