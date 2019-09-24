// helper.js
//
// general purpose functions
//
// (CC-BY-SA 2019)Marc Nicole  according to https://creativecommons.org/
///////////////////////////////////////////////////////////////////////////////////////////////////////////////
  if (!process.browser) {
    var tb = require('./kernel');
    console.info('imported kernel');
  }

  tb.getScrollOffsets = function(w) {
    // return the scroll offset for the window w. if w is not specified, window is used
    w = w||window;
    if(w.pageXOffset != null) return {left:w.pageXOffset, top:w.pageYOffset};

    //for IE
    var d = w.document;
    if (window.document.compatMode === "CSS1Compat")
      return {left:d.documentElement.scrollLeft, top:d.documentElement.scrollTop};

    // for browser in quirks mode
    return {left:d.body.scrollLeft, top: d.body.scrollTop };
  };

  tb.getViewPortSize = function(w){
    // return {width,height} of the window w. if w is undefined, window is used
    w = w||window;
    if (w.innerWidth != null) return {width:w.innerWidth,Height:w.innerHeight};

    var d = w.document;
    if (window.document.compatMode === "CSS1Compat")
      return {width:d.documentElement.clientWidth, height:d.documentElement.clientHeight};

    return {width:d.body.clientWidth, height:d.body.clientHeight};
  };



  // some new Date methods
/*TODO Scrap this if no side effect
  Date.prototype.nextMonth = function nextMonth(n) {
    // return a date that is one month ahead than date
    var d = new Date(this);
    d.setMonth(d.getMonth()+(n||1));
    return d;
  };

  Date.prototype.nextYear = function nextYear(n) {
    // return a date that is one month ahead than date
    var d = new Date(this);
    d.setFullYear(d.getFullYear()+(n||1));
    return d;
  };

  Date.prototype.adjustDay = function AdjustDay(day) {
    // return a date that is the same month but different day if day is not undefined
    var d = new Date(this);
    d.setDate(day);
    return d;
  };
*/
  Date.prototype.yyyymmdd = function () {
    // return the date in yyyy-mm-dd format
    return this.getFullYear()+'-'+tb.pad(this.getMonth()+1,2)+'-'+tb.pad(this.getDate(),2);
  };

  Date.prototype.hhh_mm = function () {
    // return a duration in a number of hours and minutes
    // even if the duration is month, it will be expressed as hours
    var t = this.valueOf();
    var ms = t % 1000;
    t = (t - ms) / 1000;
    var s = t % 60;
    t = (t -s) / 60;
    var min = t % 60;
    var hhh = (t - min) / 60;
    return hhh.toString()+'h '+tb.pad(min,2)+'m';
  };


  tb.getItems$ = function(url,content$) {
    // returns a jQuery of all itemscope in the document having the itemtype=url
    // if url is undefined, gets all itemscope
    // if url ends with # select any url that match any version
    //   ex: http://www.tablord.com/templates/product#
    //     matches
    //       http://www.tablord.com/templates/product#1line
    //       http://www.tablord.com/templates/product
    //       http://www.tablord.com/templates/product#2
    //
    // content$ (optional) limit the search to children of content$
    //          if not specified, search in tb.tbContent$ i.e the document

    content$ = content$ || tb.tbContent$;
    var items$;
    if (url === undefined) {
      items$ = $('[itemscope=""]',content$);
    }
    else if (url.slice(-1) === '#') {
      items$ = $('[itemtype^="'+url.slice(0,-1)+'"]',content$);
    }
    else {
      items$ = $('[itemtype="'+url+'"]',content$);
    }
    return items$.filter(function(){return $(this).parent().closest('[itemscope=""]').length === 0});
  };


  tb.get = function(/*path*/) {
    // applied as a method (either declare MyClass.prototype.get = tb.get or tb.get.call(obj,path)
    // returns this.path1.path2.path3 or undefined if at any stage it becomes undefined
    // and search also in this.parent is case of undefined property
    // enables a cascad search of a property
    var o = this;
    while (o) {
      var subO = o;
      for (var i=0;i<arguments.length;i++){
        subO = subO[arguments[i]];
        if (subO === undefined) break;
      }
      if (subO !== undefined) return subO;

      o = o.parent;
    }
    return undefined;
  };

  tb.set = function(value /*,path*/) {
    // set the value of the property of this.path1.path2... and creates, if needed the intermediate objects
    var o = this;
    for (var i=1;i<arguments.length-1;i++) {
      var p = o[arguments[i]];
      if (p === undefined) {
        o = o[arguments[i]] = {};
      }
      else {
        o = p;
      }
    }
    o[arguments[i]] = value;
    return this;
  };

  // functions for reduce /////////////////////////////////////////////
  // those function also work on moment and duration
  tb.reduce = {};
  tb.reduce.sum = function(a,b) {
    // make the sum of all values != undefined
    if (b === undefined) return a;
    if (moment.isMoment(a) || moment.isDuration(a)) return a.add(b);
    return a+b;
  };
  tb.reduce.min = Math.min;
  tb.reduce.max = Math.max;
  tb.reduce.sumCount = function(sc,b) {sc.count++;sc.sum+=b;return sc};

  // color functions //////////////////////////////////////////////////
  // todo find replacement for those
  tb.hue = function(h) {
    // return {r:,g:,b:} for a given h hue
    h = h % 360;
    if (h<0) h+=360;

    if (h <  60) return {r:255,g:h/60*255,b:0};
    if (h < 120) return {r:255-(h-60)/60*255,g:255,b:0};
    if (h < 180) return {r:0,g:255,b:(h-120)/60*255};
    if (h < 240) return {r:0,g:255-(h-180)/60*255,b:255};
    if (h < 300) return {r:(h-240)/60*255,g:0,b:255};
    return {r:255,g:0,b:255-(h-300)/60*255};
  };

  tb.hsl = function(h,s,l) {
    // return a string 'rgb(...)' for h:hue s:saturation l:luminosity
    var color = tb.hue(h); //TODO integrate s,l
    return 'rgb('+color.r+','+color.g+','+color.b+')';
  };


  tb.summary = function(obj) {
    // return a 1 line summary of obj
    var l;
    if ($.isFunction(obj)) {
      l = tb.signature(obj);
    }
    else if (obj === null) {
      l = 'null';
    }
    else if (obj === undefined) {
      l = 'undefined';
    }
    else if (obj.toString) {
      l = obj.toString();
    }
    else {
      l = '['+typeof obj+']';
    }
    return l;
  };


  tb.heir = function (p) {
    // return an heir of p
    if (p==null) throw TypeError();
    if (Object.create) return Object.create(p);
    var t=typeof p;
    if (t !== "object" && t !== "function") throw TypeError();
    function F() {
    }
    F.prototype = p;
    return new F();
  };

  tb.makeInheritFrom = function(newClass,ancestorClass) {
    // make a newClass inherit from another ancestorClass
    // workaround for the lack of Object.create() in IE7
    // TODO: in IE7 brings an issue since the "constructor" property of ".prototype" becomes enumerable
    //       for newClass. be carefull not to create infinite recursive loop by scanning all properties
    //       that will include "constructor", a reference to itself!
    // return this
    if (typeof newClass !== 'function') throw new Error("makeInheritFrom: newClass is not a function");
    if (typeof ancestorClass !== 'function') throw new Error("makeInheritFrom: ancestorClass is not a function");
    newClass.prototype = tb.heir(ancestorClass.prototype);
    newClass.prototype.constructor = newClass;
    return newClass;
  };

  tb.keys = function(obj) {
    // returns an Array with all keys (=non inherited properties) of an object
    // replacement for ECMA5
    var res = [];
    for (var k in obj) {
      if (obj.hasOwnProperty(k)) res.push(k);
    }
    return res;
  };

  tb.values = function(obj) {
    // returns an Array with all values of all non inherited properties of an object
    var res = [];
    for (var k in obj) {
      if (obj.hasOwnProperty(k)) res.push(obj[k]);
    }
    return res;
  };

  tb.copy = function(obj) {
    // makes a copy of obj this version only copies the first level
    // does not copy any inheritance (result is an Object instance)
    var o = {};
    for (var k in obj) {
      o[k] = obj[k]
    }
    return o;
  };

  tb.objMatchCriteria = function(obj,criteria) {
    // return true if obj is matching criteria
    // - criteria: an object specifying the values of some properties {prop1:value1,....}
    criteria = criteria || {};
    for (var k in criteria) {
      if (obj[k] !== criteria[k]) return false;
    }
    return true;
  };

  tb.findInArrayOfObject = function(criteria,a) {
    // find the first object in the array (or array like) of object a that has all criteria true
    // example tb.findInArrayOfObject({toto:5},[{toto:1,tutu:5},{toto:5}])
    // will return 1
    for (var i=0; i<a.length; i++) {
      if (tb.objMatchCriteria(a[i],criteria)) return i;
    }
    return -1;
  };

  tb.pad = function(integer,numberOfDigits){
    // return a string representing the integer, by filling with 0 in order to return a constant numberOfDigits
    return ('00000000000000000'+integer).slice(-numberOfDigits);
  };


  tb.urlComponents = function(urlOrFileName) {
    // return an object with all components of an url
    // - protocol
    // - user
    // - password
    // - domain
    // - port
    // - path
    // - fullFileName
    // - fileName
    // - ext
    // - tag
    // - search
    // - arguments (object param=values of search)
    // if url is an ordinary file name it is first transformed to an url with file:///
    var url = urlOrFileName.replace(/\\/g,'/');
    if (/file:|http[s]?:|mailto:|ftp:/i.test(url)==false) url='file:///'+url;
    // you can test this regex at https://regex101.com/r/8f4HUA/1/
    var urlSplitRegExp = /(\w+):((\/\/((\w+):(\w+)@)?([\w\.]+)(:(\w+))?)|(\/\/\/(\w:)?))?(\/.+\/)?([^\?\#]+)?(\?([^\#]+))?(\#(\w+))?/;
    var comp = url.match(urlSplitRegExp);
    if (comp == null) throw new Error(url+" doesn't look like an URL");
    var res = {};
    res.protocol = comp[1];
    res.user     = comp[5];
    res.password = comp[6];
    res.domain   = comp[7];
    res.port     = comp[9];
    res.drive    = comp[11];
    res.path     = comp[12] || '';
    res.fullFileName = comp[13] || '';
    res.search   = comp[15] || '';
    res.tag      = comp[17] || '';
    var m = res.fullFileName.match(/((.*)\.(\w+$))|(.*)/);
    res.fileName = m[2] || m[4] || '';
    res.ext      = m[3] || '';
    if (res.drive) {
      res.absolutePath = res.drive+res.path;
    }
    else {
      res.absolutePath = res.protocol+'://'+res.domain+res.path;
    }
    var args = {};
    var pairs = res.search.split("&");
    for (var i=0;i< pairs.length;i++) {
      var pos = pairs[i].indexOf("=");
      if (pos == -1) {
        var name = pairs[i];
        if (name == '') continue;
        var value = true;
      }
      else {
        var name = pairs[i].substring(0,pos);
        var value= decodeURIComponent(pairs[i].substring(pos+1));
      }
      args[name] = value;
    }
    res.arguments = args;
    return res;
  };

  tb.fileName = function(url) {
    // return the fileName.ext of url (or os file)
    var comp = tb.urlComponents(url);
    return comp.fullFileName;
  };

  tb.absoluteFileName = function (relativeFileName,path) {
    // return a absolute path+filename combining the absolute path and the relative fileName
    // TODO implement all .\ : yet works only if relativeFileName has no path
    var comp = tb.urlComponents(relativeFileName);
    if (comp.path === '') {
      return path+comp.fileName+'.'+comp.ext;
    }
    return relativeFileName;
  };


  // Math helpers /////////////////

  tb.limit = function (value,min,max) {
    // return value bounded by min and max
    if (value < min) return min;
    if (value > max) return max;
    return value;
  };

  tb.sign = function(value){
    // returns 0 if value==0
    //         1 if value > 0
    //        -1 if value < 0
    return value===0?0:(value>0?1:-1);
  };

  tb.dist2 = function(p1,p2) {
    // return dist^2 between 2 points p1 and p2 {x,y}
    return Math.pow(p1.x-p2.x,2)+Math.pow(p1.y-p2.y,2);
  };

  tb.dist = function(p1,p2) {
    // return the distance between 2 points p1 and p2 {x,y}
    return Math.sqrt(tb.dist2(p1,p2));
  };

  // helpers specific to Tablord ////////////////////////////////////////////////////////////////////

//TODO check if this is still needed with the current jQuery
  tb.purgeJQueryAttr = function(html) {
    // supress all jqueryxxx="yy" attributes in html, since they are meaningless for the user and also compromise the testability
    // since they depend on the context

    var reg = /(.*?)(<.+?>)/g;
    var res,lastIndex=0;
    var result = '';
    while ((res = reg.exec(html)) != null) {
      result += res[1]+res[2].replace(/\s*?jQuery\d+="\d"/g,'');
      lastIndex = res.lastIndex;
    }
    return result;
  };

  tb.htmlToText = function(html) {
    // transform the html content (from innerHTML) to a string as if this content is a text editor
    // removes any tags other than <BR> and <P>
    var res = html
              .replace(/<BR>/ig,'\n')
              .replace(/<P>/ig,'\n\n')
              .replace(/<.+?>/g,"")
              .replace(/&nbsp;/g," ")
              .replace(/&lt;/g,"<")
              .replace(/&gt;/g,">")
              .replace(/&amp;/g,"&");
    return res;
  };

  tb.toHtml = function(code) {
    // transform code in such a manner that the code can be visualised in a <pre>...
    return String(code)
             .replace(/&/g,"&amp;")
             .replace(/>/g,"&gt;")
             .replace(/</g,"<wbr>&lt;")  //indicate that < is a good point to wrap line if necessary
             .replace(/ /g,"&nbsp;")
             .replace(/\r/g,'')
             .replace(/\n/g,"<br>");
  };

  tb.isJSid = function (id) {
    // return true if id is a javaScript id
    return id.match(/^[a-zA-Z$_][\w\$]*$/) !== null;
  };

  tb.toJSCode = function(obj,stringQuote) {
    // return a string representing obj that can be interpreted by eval
    let sa;
// stringQuote is by default ' but can be set to "
    stringQuote = stringQuote || "'";
    if (typeof obj == 'number') {
      return obj.toString();
    }
    else if (typeof obj == 'string') {
      if (stringQuote === '"') {
        return '"'+obj.replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/\n/g,"\\n")+'"';
      }
      else {
        return "'"+obj.replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\n/g,"\\n")+"'";
      }
    }
    else if (obj === undefined) {
      return 'undefined';
    }
    else if (obj === null) {
      return 'null';
    }
    else if (typeof obj === 'function') {
      return obj.toString();
    }
    else if (obj.toJSCode) {
      return obj.toJSCode();
    }
    else if (obj.toJSON) {
      return obj.toJSON();
    }
    else if ($.isArray(obj)) {
      sa = [];
      $.each(obj, function(i,value) {sa.push(tb.toJSCode(value,stringQuote))});
      return '['+sa.join(',')+']';
    }
    else {
      sa = [];
      $.each(obj, function(name,value) {
        if (!tb.isJSid(name)) name = tb.toJSCode(name,stringQuote);
        sa.push(name+':'+tb.toJSCode(value,stringQuote))
      });
      return '{'+sa.join(',')+'}';
    }
  };

  //TODO should be deprecated
  tb.htmlAttribute = function(attr,value) {
    // return a string as found in html tag for the attribute attr assigning a value
    var h = ' '+attr+'='+(typeof value == 'number'?value:'"'+tb.toHtml(value).replace(/"/g,'&quote;')+'"');
    return h;
  };

  tb.trimHtml = function(html) {
  // suppress all unsignificant blanks of html and non visible char but keeps \n
    return html.replace(/[ \t\r]+/g,' ').replace(/> /g,'>').replace(/ </g,'<');
  };

  tb.textContent = function(html) {
  // return the text of html like textcontent that doesn't exist in IE7
  // first remove all tags having HIDDEN in class and then keeps the text only
  // TODO******** not ok for nested tags !!!! ********************************
  // PREFER [[$.text]]
    return html.replace(/\<.*?style\="DISPLAY\: none".*?\<\/.*?\>/g,'').replace(/\<.*?\>/g,'');
  };

  // helpers for functions /////////////////////////////////////////

  tb.signature = function(func) {
    // returns only the signature of the function
    var m = func.toString().match(/(function.*?\))/);
    if (m) return m[0];
    return func.toString();
  };

  tb.functionName = function (func) {
    // returns the name of the function or '' if an anonymous function
    // TODO: decide if replace by func.name (doesn't work in IE)
    return func.toString().match(/function *([a-zA-Z0-9_$]*)/)[1];
  };

  tb.isConstructorName = function(name) {
  // returns if name is a constructor name for a function
  // the last identified starting with a capital character
  // 'tb' --> false
  // 'Table' --> true
  // 'tb.Table' --> false
    if (typeof name !== 'string') return false;
    return (name.search(/[A-Z]/) === 0);
  };

if (!process.browser) {
  module.exports = tb;
}