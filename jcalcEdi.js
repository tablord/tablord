// jcalcEdi.js
//
// This is the core of jcalc both defining the jc namespace that holds all global variables and functions
// and where all EDI behaviour is coded
// 
// it needs the jcalc.js library and jquery (for now 1.5.1)
//
// (CC-BY-SA 2018) according to https://creativecommons.org/
///////////////////////////////////////////////////////////////////////////////////////////////////////////////




  // global variables /////////////////////////////////////////////////

  var jc = {name:'JCalc',
            version:'0.1',
            authors:['Marc Nicole'],
            rights:'CC-BY-SA 2018',
            selectedElement:undefined,
            output: undefined,
                        //a new Output is created for each code. 
                        //it hold both the code and output Elements as well as the htlm
                        //at init an empty object so _codeElement and _outputElement are undefined
                        //jc.output is only defined during user code execution in order to catch errors
                        //from user code in association with the right output.
                        //please note that jc.output == undefined during finalization code, but the finalization code
                        //defined by the user can still access output due to the closure mechanism of JavaScript

            traces:[],
            tracesMaxLength:100,
            htmlIndent:1,
            simulation:undefined, // will be set in jc.execAll()
            blockNumber:0,
            finalizations:[],     // a stack of output to be finalized

            intervalTimers:[],    // a list of intervalTimer handle in order to kill them (clearInterval) at the next run
            inAnimation:false,    // true when execution take place through jc.animate()
            modified:false,       // file is modified

            templates:{},         // all native, locally defined and imported templates

            vars:{},              // where all user variables are stored

            autoRun:true,
            url:{},               // the url of the sheet decomposed in protocol {host user password domain path fileName ext tag search arguments}
            results:{},           // if != {}, when the sheet is closed a file with the same name .jres will be written and its content is JSON.stringify(jc.results)

            defaults:{
              format:{            // default formating methods  this can be redefined in some JCalc objects like v table... in options.
                undef:function(){return '<SPAN style=color:red;>undefined</SPAN>'},
                nullObj:function(){return '<SPAN style=color:red;>null</SPAN>'},
                emptStr:function(){return '<SPAN style=color:red;>empty string</SPAN>'},
                func:function(f){return jc.help(f)},
                array:function(a){return a.toString()},              
                domElement:function(element){return 'DOM Element<SPAN class="INSPECTHTML">'+jc.toHtml(jc.trimHtml(jc.purgeJQueryAttr(element.outerHTML)))+'</SPAN>'},
                obj:function(obj){return jc.inspect(obj).span()},
                date:function(date){return date.yyyymmdd()},
                number:function(n){return n.toString()}
              }
            },

            errorHandler:function(message,url,line) {
              var out  = jc.output.outputElement;
              if (out) {
                if (url) {
                  out.innerHTML = message+'<br>'+url+' line:'+line+'<br>'+trace.span();
                }
                else {
                  var code = jc.errorHandler.code || '';
                  var faults = message.match(/« (.+?) »/);
                  if (faults != null) {
                    var fault = faults[1];
                    code = jc.output.codeElement.innerHTML
                             .replace(/ /g,'&nbsp;')
                             .replace(new RegExp(fault,'g'),'<SPAN class="WRONG">'+fault+'</SPAN>');
                    jc.output.codeElement.innerHTML = code
                    jc.selectElement(jc.output.codeElement);
                  }
                  out.innerHTML = trace.span()+message;
                }
                $(out).removeClass('SUCCESS').addClass('ERROR');
                out.scrollIntoView();
                return true;
              }
              return false;
            }
           };


  jc.credits = {name:jc.name,version:jc.version,authors:jc.authors,rights:jc.rights};
  jc.helps = {'jc.credits':jc.credits};

  // classical formating functions ////////////////////////////////////////////
/*
  jc.fixed = function(decimals) {
    // returns a fomating function(obj) that formats the number with fixed decimals
    var f = function (n) {return n.toFixed(decimals)};
    f.toString = function() {return 'display precision of '+decimals+' decimals'};
    return f;
  }
  jc.percent = function(decimals) {
    // returns a fomating function(obj) that formats the number with fixed decimals
    var f = function (n) {return Number(100*n).toFixed(decimals)+'%'};
    f.toString = function() {return 'display number as percent with a precision of '+decimals+' decimals'};
    return f;
  }
*/
    
  jc.getScrollOffsets = function(w) {
    w = w||window;
    if(w.pageXOffset != null) return {left:w.pageXOffset, top:w.pageYOffset};

    //for IE
    var d = w.document;
    if (window.document.compatMode == "CSS1Compat")
      return {left:d.documentElement.scrollLeft, top:d.documentElement.scrollTop};

    // for browser in quirks mode
    return {left:d.body.scrollLeft, top: d.body.scrollTop };
  }

  jc.getViewPortSize = function(w){
    w = w||window;
    if (w.innerWidth != null) return {width:w.innerWidth,Height:w.innerHeight};
  
    var d = w.document;
    if (window.document.compatMode == "CSS1Compat")
      return {width:d.documentElement.clientWidth, height:d.documentElement.clientHeight};

    return {width:d.body.clientWidth, height:d.body.clientHeight};
  }

  String.prototype.calc = function(decimal) {
    var s=this.replace(/[^0-9\.\+\*\\\-]+/g,'');
    var n = eval(s);
    return Number(n).toFixed(decimal);
  }


  //JQuery extentions /////////////////////////////////////////////////
  $.fn.span = function() {
    var s = ['<ol start=0>'];
    for (var i=0; i < this.length; i++) {
      s.push('<li class="INSPECTHTML">'+jc.toHtml(jc.trimHtml(jc.purgeJQueryAttr(this[i].outerHTML)))+'</li>');
    }
    s.push('</ol>');
    return new jc.HTML('JQuery of '+this.length+' elements<br>'+s.join('<br>'));
  }  

  $.fn.toString = function(){
    return '[object JQuery] length:'+ this.length;
  }

  $.fn.inspectString = function(){
    var r = this.toString()+'\n';
    for (var i = 0;i<this.length;i++) {
      r += i+') '+this[i].outerHTML+'\n';
    }
    return r;
  }

  $.fn.asNode = function() {
    var query = this;
    return {node$:function() {return query}}
  }

  $.fn.getItems = function(url) {
    // get the matching itemtypes that are descendent of the jquery
    // please note that if an itemtype is embeeded in another instance of itemtype, both will be part of the result
    return this.find('[itemtype~="'+url+'"]');
  }
  
  $.getItems = function(url) {
    // get all itemtype = url of the document.
    return $('[itemtype~="'+url+'"]');
  }

  $.fn.getItemProp = function(itemprop) {
    // get the first matching itemprop of the first elements of the jquery
    // all elements should be itemscope
    var e = this[0];
    return this.find('[itemprop='+itemprop+']').filter(function(){return $(this).closest('[itemscope=""]')[0] == e}).first().html();
  }

  $.fn.setItemProp = function(itemprop,html) {
    // set the itemprop of the elements of the jquery
    // all elements should be itemscope
    this.each(function(i,e) {
      $(e).find('[itemprop='+itemprop+']').filter(function(){return $(this).closest('[itemscope=""]')[0] == e}).html(html);
    });
    return this;
  }

  $.fn.getItemscopeMicrodata = function() {
    // this must be a single itemscope element jQuery
    // return the microdata under the scope as an object
    // {type:url,
    //  properties: {...},
    //  id:...}   //In addition to microdata specification
   
    if (! this.is('[itemscope=""]')) throw new Error('getItemscopeMicrodata must be called on a jquery having a itemscope');
    var result={id:this.attr('id') || undefined,
                type:this.attr('itemtype') || '',
                properties:this.children().getMicrodata()}
    return result;
  }

  $.fn.getItemValue = function(){
    // return the value of an element handling all specifications of microdata of the getter of itemValue
    var e = this[0];
    if (e.itemprop === undefined) return null;
    if (e.itemscope) return e;
    if (e.tagName === 'META') return e.content;
    if ($.inArray(e.tagName,['AUDIO','EMBED','IFRAME','IMG','SOURCE','TRACK','VIDEO'])!=-1) return e.src;
    if ($.inArray(e.tagName,['A','AREA','LINK'])!=-1) return e.href;
    if (e.tagName === 'OBJECT') return e.data;
    if ($.inArray(e.tagName,['DATA','METER','SELECT'])!=-1) return this.val();
    if (e.tagName === 'TIME') return e.datetime?e.datetime:this.text();
    return this.text();
  }

  $.fn.setItemValue = function(value){
    // set the value of an element handling all specifications of microdata of the getter of itemValue
    var e = this[0];
    if (e.itemprop === undefined) throw new Error("can't set the itemprop value of an element that is not an itemprop\n"+e.outerHTML);
    else if (e.tagName === 'META') e.content = value;
    else if ($.inArray(e.tagName,['AUDIO','EMBED','IFRAME','IMG','SOURCE','TRACK','VIDEO'])!=-1) e.src=value;
    else if ($.inArray(e.tagName,['A','AREA','LINK'])!=-1) e.href=value;
    else if (e.tagName === 'OBJECT') e.data=value;
    else if ($.inArray(e.tagName,['DATA','METER','SELECT'])!=-1) this.val(value);
    else if (e.tagName === 'TIME') {
      if (e.datetime) {
        e.datetime=value;
      }
      else {
        this.text(value);
      }
    }
    else this.text(value);
    return this;
  }




  $.fn.getItemscopeData = function() {
    // jquery must be a single itemscope element
    var data = {};

    function set(itemprop,value) {
      if (itemprop.slice(-2) == '[]') {
        data[itemprop] = data[itemprop] || [];
        data[itemprop].push(value);
      }
      else {
        data[itemprop] = value;
      } 
    }
    
    if (this[0].id) data._id = this[0].id;
    this.children().each(function(i,element) {
      var itemprop = element.itemprop;
      if (itemprop !== undefined) {
        if (element.itemscope !== undefined) {
          set(itemprop,$(element).getItemscopeData()); 
        }
        else {
          set(itemprop,$(element).getItemValue());
        }
      }
      else {  // this node is not an itemprop, look if its children have data
        $.extend(true,data,$(element).getItemscopeData()); 
      }
      
    });
    return data;
  }

  $.fn.getData = function(criteria,fields) {
    // return data object for the jQuery, very similarly as a mongoDB .find
    // the object is NOT compatible with microdata, but much easier to use
    // even if not as flexible as microdata
    // it assumes that propertie's name that are arrays end with []
    // and all other properties have 0 or 1 value
    // this function assume that all jQuery elements are itemscope
    // So it is possible to get data from nested nodes
    // and is the responsibility of the caller to know what to do
    // the parameter result is only intended for recusivity purpose and should be undefined
    // the structure also set "_id" if id is defined at the itemscope element
    result = [];
    this.each(function(i,element){
      var data = $(element).getItemscopeData();
      if (jc.objMatchCriteria(data,criteria)) {
        if (fields == undefined){
          result.push(data);
        }
        else {
          var ro = {};
          for (var f in fields) {
            if (fields[f] == 1) ro[f] = data[f];
          }
          result.push(ro);
        }
      }
    });
    return result;
  }

  $.fn.getMicrodata = function(result) {
    // return microdata object for the jQuery.
    // the object is JSON compatible with the HTML Microdata specification
    // the only difference with the specifications is that the JQuery's element are
    // not checked for beeing top level microdata item. So it is possible to get microdata from nested nodes
    // and is the responsibility of the caller to know what to do
    // the parameter result is only intended for recusivity purpose and should be undefined
    // in addition to the microdata specifications, the structure also set "id" if id is defined at the itemscope element
    var result = result || {};
    this.each(function(i,e){
      var e$ = $(e);
      if (e.itemprop) {
        if (result[e.itemprop] == undefined) result[e.itemprop] = [];
        if (e.itemscope !== undefined) {
          result[e.itemprop].push(e$.getItemscopeMicrodata());
        }
        else {
          result[e.itemprop].push(e$.getItemValue());
        }
      }
      else if (e.itemscope !== undefined) {
        if (result.items === undefined) result.items = [];
        result.items.push(e$.getItemscopeMicrodata());
      }
      else { // just an intermediate node
        e$.children().getMicrodata(result);
      }
    });
    return result;
  }   

  $.fn.setMicrodata = function(data) {
    // set the itemprop elements under all elements of the jQuery
    // all nodes of the jquery should be itemscope
    // if a node doesn't have an itemprop, "items" is assumed
    // PLEASE NOTE that data will be modified.
    // data is structured as JSON microdata specifies.
    // as all itemprop are arrays (since it is legal to have multiple itemprops having the same name)
    // every itemprop will "consume" the first element of the array
    this.each(function(i,e){
      if (e.itemscope !== undefined)  {
        var itemprop = e.itemprop?e.itemprop:'items';
        var subData = data && data[itemprop] && data[itemprop].shift();
        if (subData !== undefined) {
          $(e).children().setMicrodata(subData.properties);
        }
      }
      else {
        if (e.itemprop) {
          var subData = data && data[e.itemprop] && data[e.itemprop].shift();
          if (subData) {
            $(e).setItemValue(subData);
          }
        }
        else { //an intermedate node look if anything to set in its children
          $(e).children().setMicrodata(data);
        }
      }
    });
    return this;
  }          


  jc.getItems$ = function(url) {
    // returns a jQuery of all itemscope in the document having the itemtype=url
    // if url is undefined, gets all itemscope
    // if url ends with # select any url that match any version
    //   ex: http://www.tablord.com/templates/product#      
    //     matches
    //       http://www.tablord.com/templates/product#1line
    //       http://www.tablord.com/templates/product
    //       http://www.tablord.com/templates/product#2
    //     
    if (url === undefined) {
      var items$ = $('[itemscope=""]');
    }
    else if (url.slice(-1) === '#') {
      var items$ = $('[itemtype^="'+url.slice(0,-1)+'"]');
    }
    else {
      var items$ = $('[itemtype="'+url+'"]');
    }
    return items$.filter(function(){return $(this).parent().closest('[itemscope=""]').length === 0});
  }

  

  // edi related functions ////////////////////////////////////////////
  var geval = eval;

  jc.securedEval = function(code) {
  // NRT0001
  // a bit more secured: since IE<9 executes localy, it was possible do destroy local variable by defining functions or var
  // with this trick, one can still create global variables by just assigning (eg: jc.vars='toto' destroys the global variable jc.vars)
  // to be checked what could be done to improve
    code.replace(/^\s*\{(.*)\}\s*$/,'({$1})');

    jc.errorHandler.code = code;
    code = 'var output = jc.output; with (jc.vars) {\n'+code+'\n};';   //output becomes a closure, so finalize function can use it during finalizations
    return geval(code)
  }

  // JSON ///////////////////////////////////////////////////////////
  //
  // a replacement for ECMA5+ 

  try {
    var test = JSON == undefined; // in ECMA3 JSON doesn't exist and will make this statement crash
  }
  catch (e) {
    JSON = {};
    JSON.stringify = function(obj){
      if (typeof obj == 'number') {
        return obj.toString();
      }
      else if (typeof obj == 'string') {
        return '"'+obj.replace(/\\/g,'\\\\').replace(/"/g,"\\\"").replace(/\n/g,"\\n")+'"';
      }
      else if ($.isPlainObject(obj)) {
        var sa=[]
        $.each(obj, function(name,value) {sa.push(JSON.stringify(name)+':'+JSON.stringify(value))});
        return '{'+sa.join(',\n')+'}';
      }
      else if ($.isArray(obj)) {
        var sa=[];
        $.each(obj, function(i,value) {sa.push(JSON.stringify(value))});
        return '['+sa.join(',\n')+']';
      }
      else if (obj === undefined) {
        return 'undefined';
      }
      else if (obj.toJSON) {
        return obj.toJSON();  // if ECMA 5, will also work for dates
      }
      else if (obj.toUTCString) {  // fallback for IE7 that neither has toJSON nor toISOString
        return '"'+obj.toUTCString()+'"';
      }
      throw new Error("INTERNAL ERROR: can't stringify "+jc.inspect(obj));
    };
    JSON.parse = function(json){
      var r;
      return eval('r='+json);   // unsecure quick and dirty before having a true JSON
    }
    
  }    

  // debug //////////////////////////////////////////////////////////



  function a(/*objects*/) {
    var message = '';
    for (var i=0; i<arguments.length; i++){
      message += jc.inspect(arguments[i]).toString()+'\n';
    }
    window.alert(message);
  }


  function trace(/*objects*/) {
    if (trace._on) { 
      var message = '';
      for (var i=0; i<arguments.length; i++){
        message += jc.inspect(arguments[i]).span();
      }
      trace.messages.push(message);
      if (trace.messages.length > jc.tracesMaxLength) {
        trace.messages.pop();
        trace.messages[0]='...';
      }
    }
    return trace;
  }

  trace._on = false;
  trace.stack = [];
  trace.messages = [];
  trace.on = function() {
    // enable the capture of trace
    // return trace for method chaining
    trace._on = true;
    return trace
  };
  trace.off = function() {
    // disable the capture of trace
    // return trace for method chaining
    trace._on = false;
    return trace
  };
  trace.push = function() {
    // push the current trace state on a stack
    // return trace for method chaining
    trace.stack.push(trace._on);
    return trace
  };
  trace.pop = function() {
    // restore the previously pushed trace state from the stack
    // return trace for method chaining
    trace._on = trace.stack.pop();
    return trace
  };
  trace.span = function () {
    if (trace.messages.length > 0){
      var h = '<DIV class=TRACE>'+trace.messages.length+' traces:<table class=DEBUG><tr><td class=TRACE>'+trace.messages.join('</td></tr><tr><td class=TRACE>')+'</td></tr></table></DIV>';
      trace.messages = [];
      return new jc.HTML(h);
    }
    return '';
  }

  

  // Inspector ////////////////////////////////////////////////////////
  jc.Inspector = function Inspector(obj,depth,name) {
    this.obj = obj;
    this.name = name || '';
    this.depth = depth || 1;
  }
  
  jc.Inspector.prototype.legend = function() {
    // returns the legend for a given object
    var l;
    if ($.isPlainObject(this.obj)) {
      l = '{}';
    }
    else if ($.isArray(this.obj)) {
      l = '[]';
    }
    else if ($.isFunction(this.obj)) {
      l = jc.signature(this.obj);
    }
    else if (this.obj === null) {
      l = 'null';
    }
    else if (this.obj === undefined) {
      l = 'undefined';
    }
    else {
      l = this.obj.toString();
    } 
    return l;
  }

    
  jc.Inspector.prototype.toString = function (){
    // display the object hold by the inspector as a string

    // BE CARFULL IN DEBUGGING THAT FUNCTION: DO NOT CALL a(....), 
    // since it will create an inspector recursivelly
    // use window.alert instead !!
    if (this.obj === undefined) {
      return 'undefined';
    }
    if (this.obj === null) {
      return 'null';
    }
    if (this.obj.inspectString) {  // obj knows how to inspect itself
      return this.obj.inspectString()
    }
    if (typeof this.obj === 'number') {
      return this.obj.toString();
    }
    if (this.obj === '') {
      return 'empty string';
    }
    if (typeof this.obj === 'string') {
      return JSON.stringify(this.obj);
    }
    if (this.obj.toGMTString !== undefined) {
      return this.obj.toGMTString()+' (ms:'+this.obj.valueOf()+')';
    }
    var r = this.legend()+' '+this.name+'\n';
    for (var k in this.obj) {
      r += k+':  '+jc.summary(this.obj[k])+'\n' 
    };
    return r;
  }

  jc.Inspector.prototype.span = function (depth){
    depth = depth || this.depth;
    if (this.obj === undefined) {
      return '<SPAN class="INSPECT META">undefined</SPAN>';
    }
    if (this.obj === null) {
      return '<SPAN class="INSPECT META">null</SPAN>';
    }
    if (typeof this.obj === 'number') {
      return this.obj.toString();
    }
    if (this.obj === '') {
      return '<SPAN class="INSPECT META">empty string</SPAN>';
    }
    if (typeof this.obj === 'string') {
      return '<SPAN class=INSPECT>'+jc.toHtml(JSON.stringify(this.obj))+'</SPAN>';
    }
    if (this.obj.toGMTString !== undefined) {
      return '<SPAN class="INSPECT META">'+this.obj.toString()+' (ms:'+this.obj.valueOf()+')</SPAN>';
    }
    var r = '<DIV class=INSPECT><fieldset><legend>'+this.legend()+' '+this.name+'</legend>';
    r += '<table>';
    for (var k in this.obj) {
      if (k==='constructor') continue;
      r += '<tr><th valign="top">'+k+'</th><td valign="top" style="text-align:left;">'+
           (  (typeof this.obj[k] == 'function')?jc.help(this.obj[k]):
                 ((depth == 1)?jc.toHtml(this.obj[k]):jc.inspect(this.obj[k]).span(depth-1))
           )
          +'</td></tr>'; 
    };
    return new jc.HTML(r+'</table></fieldset></DIV>');
  }

  // general purpose helpers ////////////////////////////////////////////

  jc.summary = function(obj) {
    // return a 1 line summary of obj
    var l;
    if ($.isFunction(obj)) {
      l = jc.signature(obj);
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
  }


  jc.inspect = function(obj,depth,name){
    return new jc.Inspector(obj,depth,name);
  }

  jc.heir = function (p) {
    // return an heir of p
    if (p==null) throw TypeError();
    if (Object.create) return Object.create(p);
    var t=typeof p;
    if (t !== "object" && t !== "function") throw TypeError();
    function F(){};
    F.prototype = p;
    return new F();
  }

  jc.makeInheritFrom = function(newClass,ancestorClass) {
    // make a newClass inherit from another ancestorClass
    // workaround for the lack of Object.create() in IE7
    // TODO: in IE7 brings an issue since the "constructor" property of ".prototype" becomes enumerable
    //       for newClass. be carefull not to create infinite recursive loop by scanning all properties
    //       that will include "constructor", a reference to itself!
    // return this
    if (typeof newClass !== 'function') throw new Error("makeInheritFrom: newClass is not a function");
    if (typeof ancestorClass !== 'function') throw new Error("makeInheritFrom: ancestorClass is not a function");
    newClass.prototype = jc.heir(ancestorClass.prototype);
    newClass.prototype.constructor = newClass;
    return newClass;
  }

  jc.keys = function(obj) {
    // returns an Array with all keys (=non inherited properties) of an object
    // replacement for ECMA5 
    var res = [];
    for (var k in obj) {
      if (obj.hasOwnProperty(k)) res.push(k);
    }
    return res;
  }

  jc.values = function(obj) {
    // returns an Array with all values of all non inherited properties of an object
    var res = [];
    for (var k in obj) {
      if (obj.hasOwnProperty(k)) res.push(obj[k]);
    }
    return res;
  }

  jc.copy = function(obj) {
    // makes a copy of obj this version only copies the first level
    // does not copy any inheritance (result is an Object instance)
    var o = {};
    for (var k in obj) {
      o[k] = obj[k]
    }
    return o;
  }

  jc.objMatchCriteria = function(obj,criteria) {
    criteria = criteria || {};
    for (var k in criteria) {
      if (obj[k] !== criteria[k]) return false;
    }
    return true;
  }

  jc.findInArrayOfObject = function(criteria,a) {
    // find the first object in the array (or array like) of object a that has all criteria true
    // example jc.findInArrayOfObject({toto:5},[{toto:1,tutu:5},{toto:5}])
    // will return 1
    for (var i=0; i<a.length; i++) {
      if (jc.objMatchCriteria(a[i],criteria)) return i;
    }
    return -1;
  }

  jc.pad = function(integer,numberOfDigits){
    return ('00000000000000000'+integer).slice(-numberOfDigits);
  }


  jc.urlComponents = function(url) {
    // return an object with all components of an url
    // - protocol
    // - user
    // - password
    // - domain
    // - port
    // - path
    // - fileName
    // - ext
    // - tag
    // - search  
    //   - arguments (object param=values of search)
    // if url is an ordinary file name it is first transformed to an url with file:///
    url = url.replace(/\\/g,'/');
    if (/file:|http[s]?:|mailto:|ftp:/i.test(url)==false) url='file:///'+url;
    var urlSplitRegExp = /(\w+):((\/\/((\w+):(\w+)@)?([\w\.]+)(:(\w+))?)|(\/\/\/(\w:)?))?(\/.+\/)?(\w+).(\w+)(\#(\w+))?(\?(.+))?/;
    var comp = url.match(urlSplitRegExp);
    if (comp == null) throw new Error(url+" doesn't look like an URL");
    var res = {};
    res.protocol = comp[1];
    res.user     = comp[5];
    res.password = comp[6];
    res.domain   = comp[7];
    res.port     = comp[9];
    res.drive    = comp[11];
    res.path     = comp[12];
    res.fileName = comp[13];
    res.ext      = comp[14];
    res.tag      = comp[16];
    res.search   = comp[18];
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
  }

  // Math helpers /////////////////

  jc.limit = function (value,min,max) {
    // return value bounded by min and max
    if (value < min) return min;
    if (value > max) return max;
    return value;
  }

  jc.sign = function(value){
    // returns 0 if value==0
    //         1 if value > 0
    //        -1 if value < 0
    return value===0?0:(value>0?1:-1);
  }

  jc.dist2 = function(p1,p2) {
  // return dist^2 between 2 points {x,y}
    return Math.pow(p1.x-p2.x,2)+Math.pow(p1.y-p2.y,2);
  }

  jc.dist = function(p1,p2) {
  // return the distance between 2 points {x,y}
    return Math.sqrt(jc.dist2(p1,p2));
  }

  // helpers specific to jcalc ////////////////////////////////////////////////////////////////////


  jc.purgeJQueryAttr = function(html) {
    // supress all jqueryxxx="yy" attributes, since they are meaningless for the user and also compromise the testability
    // since they depend on the context

    var reg = /(.*?)(<.+?>)/g;
    var res,lastIndex=0;
    var result = '';
    while ((res = reg.exec(html)) != null) {
      result += res[1]+res[2].replace(/\s*?jQuery\d+="\d"/g,'');
      lastIndex = res.lastIndex;
    };
    return result;
  }

  jc.toString = function(html) {
    // transform the content (from innerHTML) to a string as if this content is a text editor
    // removes any tags other than <BR> and <P>
    var res = html
              .replace(/<BR>/g,'\n')
              .replace(/<P>/g,'\n\n')
              .replace(/<.+?>/g,"")
              .replace(/&nbsp;/g," ")
              .replace(/&lt;/g,"<")
              .replace(/&gt;/g,">")
              .replace(/&amp;/g,"&");
    return res;
  }

  jc.toHtml = function(code) {
    // transform htmlCode in such a manner that the code can be visualised in a <pre>...
    return String(code)
             .replace(/&/g,"&amp;")
             .replace(/>/g,"&gt;")
             .replace(/</g,"<wbr>&lt;")  //indicate that < is a good point to wrap line if necessary
             .replace(/ /g,"&nbsp;")
             .replace(/\r/g,'')
             .replace(/\n/g,"<br>");
  }

  jc.isJSid = function (id) {
    // return true id id is a javaScript id 
    return id.match(/^[\w$]+\w*$/) !== null;
  }

  jc.toJSCode = function(obj,stringQuote) {
    // return a string representing obj that can be interpreted by eval
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
    else if ($.isPlainObject(obj)) {
      var sa=[];
      $.each(obj, function(name,value) {
        if (!jc.isJSid(name)) name = jc.toJSCode(name,stringQuote);
        sa.push(name+':'+jc.toJSCode(value,stringQuote))
      });
      return '{'+sa.join(',')+'}';
    }
    else if ($.isArray(obj)) {
      var sa=[];
      $.each(obj, function(i,value) {sa.push(jc.toJSCode(value,stringQuote))});
      return '['+sa.join(',')+']';
    }
    else if (obj === undefined) {
      return 'undefined';
    }
    else if (typeof obj === 'function') {
      return obj.toString();
    }
    return obj.toJSON();
  }

  jc.htmlAttribute = function(attr,value) {
    // write an attribute according to its type
    var h = ' '+attr+'='+(typeof value == 'number'?value:'"'+jc.toHtml(value).replace(/"/g,'&quote;')+'"');
    return h;
  }

  jc.codeExample = function(example) {
    return jc.html('<span class=CODEEXAMPLE>'+example+'</span>');
  }

  jc.trimHtml = function(html) {
  // suppress all unsignificant blanks and non visible char
    return html.replace(/[ \t\r\n]+/g,' ').replace(/> /g,'>').replace(/ </g,'<');
  }

  jc.textContent = function(html) {
  // return the text like textcontent that doesn't exist in IE7
  // first remove all tags having HIDDEN in class and then keeps the text only
  // TODO******** not ok for nested tags !!!! ********************************
    return html.replace(/\<.*?style\="DISPLAY\: none".*?\<\/.*?\>/g,'').replace(/\<.*?\>/g,'');
  }

  // helpers for functions ///////////////////////////////////////// 
    
  jc.signature = function(func) {
    // returns only the signature of the function
    var m = func.toString().match(/(function.*?\))/);
    if (m) return m[0];
    return func.toString();
  }

  jc.functionName = function (func) {
    // returns the name of the function or '' if an anonymous function
    return func.toString().match(/function *([a-zA-Z0-9_$]*)/)[1];
  }
    
  jc.constructorName = function(name) {
  // returns if name is a constructor name for a function 
  // the last identified starting with a capital character
  // 'jc' --> false
  // 'Table' --> true
  // 'jc.Table' --> true
    if (typeof name !== 'string') return false;
    return (name.search(/[A-Z]/) === 0);
  }

  jc.help = function(func) {
  // returns the signature of the function and the first comment in a pretty html 
  // - func: the function to be inspected
  // if func is undefined returns all helps of all installed modules
  // if func starts with a UpperCase it is considered as a constructor
    if (func == undefined) {
      var h = '';
      for (var module in jc.helps) {
        h += jc.inspect(jc.helps[module],module).span();
      }
      return new jc.HTML(h);
    }
    var source = func.toString().split('\n');
    var comments = []
    var m = source[0].match(/(function *([a-zA-Z0-9_$]*).*?\))/);
    var signature = m?m[0]:func.toString();  // if a jcFunc, the function keyword will not be found
    var name = m && m[2];
    var constructor = jc.constructorName(name)
    if(constructor) comments.push('constructor for '+name+' objects');

    for (var i=1; i<source.length; i++) {
      var comment = source[i].match(/^\s*\/\/(.*)$/);
      if (comment && (comment.length ==2)) {
        comments.push(jc.toHtml(comment[1]));
      }
      else break;
    }
    return new jc.HTML('<SPAN class=HELP><b>'+signature+'</b><br/>'+comments.join('<br/>')+(constructor?jc.inspect(func.prototype,'methods').span():'')+'</SPAN>');
  }


  // navigation within document ////////////////////////////////////////////////////////
  jc.sectionBeingExecuted$ = function() {
    // returns a jQuery containing the deepest section that contains the code currently in execution
    return $(jc.currentElementBeingExecuted).closest('.SECTION');
  }

  jc.testStatus = function() {
    // set a finalize function that will write to the current output the number of test Failure
    // in the section that includes the code that executes this function
    // mostly used in a small code inside the title of a section to summerize the tests below
    var output = jc.output; // closure on jc.output
    output.finalize(function(){
      var section = $(output.codeElement).closest('.SECTION');
      var numberOfSuccess= section.find('.TEST.SUCCESS').length;
      var numberOfErrors = section.find('.TEST.ERROR').length;
      output.html(
        '<SPAN class='+(numberOfErrors==0?'SUCCESS':'ERROR')+'>tests passed:'+numberOfSuccess+' failed:'+numberOfErrors+'</SPAN>'
      )}
    );
    return 'test Status: ';
  }

  jc.updateResultsTestStatus = function() {
    // updates jc.results.testStatus with the number of test passed vs failed
    jc.results.testStatus = {
      nbPassed : $('.TEST.SUCCESS').length,
      nbFailed : $('.TEST.ERROR').length,
      dateTime : new Date()
    };
    return jc.results;
  }

  jc.writeTestResults = function () {
    // if jc.arguments.testResultFileName, appends a line with {fileName:  ,nbPassed:  ,nbFailed: }

    if (jc.arguments.testResultFileName == undefined) return;

    var result = {
      fileName:window.document.location.href.match(/(.*)\?/)[1],
      nbPassed: $('.TEST.SUCCESS').length,
      nbFailed: $('.TEST.ERROR').length
    }
    jc.fso.writeFile(jc.arguments.testResultFileName, JSON.stringify(result), 8);
  }

  jc.helps.jc = {inspect:jc.inspect,
                 keys:jc.keys,copy:jc.copy,pad:jc.pad,
                 inherit:jc.inherit,
                 toString:jc.toString,toHtml:jc.toHtml,
                 codeExample:jc.codeExample,findInArrayOfObject:jc.findInArrayOfObject,help:jc.help,testStatus:jc.testStatus,
                 /*tableOfContent:jc.tableOfContent,*/link:jc.link
  };

  // Editor ////////////////////////////////////////////////////////////////////////////
  // the goal of Editor is to offer a genenral mechanism in order to help implement 
  // jcObject edition capabilities.
  // this mechanism is the following:
  // an object that would like to propose edition capabilities has to offer the following interface
  //   .edit()  similar to .span() but return html code representing the object in edition.
  //            usually .edit() calls jc.editor.html(...) in order to get the necessary html code that will
  //            interact with jc.editor
  //   .codeElement this property must be created by edit() and must containt the codeElement that contains the .edit() function 
  //                and that will be updated after edition
  //
  //   .getEditableValue(editor)  will be called by the editor when the user selects a given DOM EDITOR element
  //                              this is the responsibility of the object to look on editor's properties that are specific to this
  //                              object to know how to get the value. the returned value can be a simple type (undefined,number,string)
  //                              or a function. if this function has a .code property, it is considered to be a jcFunc and .code represents
  //                              only the body of the function (usually an expression)
  //   .setEditableValue(editor)  will be called by the editor when the user has finished to edit a given value.
  //                              this method has the responsibility to upgrade the code
  //   .updateCode()              not strictly speaking part of the Editor interface, but common practice to encapsulate the code update
  //                              in updateCode and call this function in setEditableValue through a window.setTimout(
  //   
  //--------------
  //  jc.editor is a single instance object that provides most of the services and that dialogs with the DOM elements composing
  //            the user interface.
  //
  //  jc.editor.html(...) return html code needed to create the editor for a simple value
  //                      if the value is simple (undefined, number, string or function) it will 
  //                      be handled natively.
  //                      if value is an object, it will return the code of object.edit()
  //                      TODO: provide mechanism for simple object / arrays
  //
  //  jc.editor.simpleTypeToolBar$ a jQuery storing the necessary toolBar for the simple types
  //
  ///////////////////////////////////////////////////////////////////////////////////////

  jc.Editor = function(){

  }

  jc.Editor.prototype.createToolBar = function() {
    this.toolBar$ = $('<SPAN/>')
      .append('<input type="radio" name="type" value="string" onclick="jc.editor.force(\'string\');">String</input>')
      .append('<input type="radio" name="type" value="number" onclick="jc.editor.force(\'number\')">Number</input>')
      .append('<input type="radio" name="type" value="function" onclick="jc.editor.force(\'function\')">Function</input>')
      .append(this.funcCode$=$('<input type="text"  name="funcCode" value="" onchange="jc.editor.funcCodeChange();" onclick="jc.editor.funcCodeClick();">'))
      .append('<input type="radio" name="type" value="undefined" onclick="jc.editor.force(\'undefined\')">undefined</input>');
  };


  jc.Editor.prototype.funcCodeClick = function() {
    this.force('function');
    $('[value=function]',this.toolBar$).attr('checked',true);
    this.funcCode$.focus();
  }

  jc.Editor.prototype.funcCodeChange = function() {
    this.value = f(this.funcCode$.val());
    this.type = 'function';
    this.jcObject.setEditableValue(this);
    return false; //?????
  }

  ////////////
  //TODO: there is problem at least in IE7: when the users click on another control, first a change event is triggerd
  //normally it should be followed by a click envent, but as the control is destroyed and re-created, it seems to "capture" the next click
  //event
  // ?????? peut être qu'avec un setTimeout(0) on peut passer outre, en laissant d'abord le click se faire et en updatant le code via le timer
  //  pas mieux : l'evenement click n'arrive jamais sur l'endroit où on a cliqué et si dans le change on return true, c'est encore pire, on ne retrouve 
  //              jamais le focus.  &&%ç%*&@
  ////////////

  jc.Editor.eventHandler = function(event) {
    // the event handler that will recieve click, keypress and change event
    var obj = jc.vars[event.target.jcObject];
    if (obj == undefined) throw new Error('event on a editor linked to a non existing object '+event.target.jcObject);
    switch (event.type) {
      case 'click':
        if (obj.codeElement !== jc.selectedElement) {
          jc.selectElement(obj.codeElement);
        }
        jc.editor.setCurrentEditor(event.target);
      return false; // prevent bubbling

      case 'change':
        var value = event.target.value;
        switch (jc.editor.type) {
          case 'number':
            if (!isNaN(Number(value))) {
              value = Number(value);
            }
            else {
              jc.editor.force('string');
              return false; // a new event will take place and finish the job
            }
            break;
          case 'function':
            value = f(jc.editor.funcCode$.val());
            break;
          case 'undefined':
            value = undefined;
            break;
        }
        jc.editor.value = value;
        obj.setEditableValue(jc.editor);
        return false;

      default :
        window.alert('unexpected event',event.type)
        return true;
    }
  }

  jc.Editor.prototype.force = function(type) {
    if (type == this.type) return;

    var editor$ = $(this.currentEditor);
    switch (type) {
      case 'undefined':
        this.value = undefined;
        this.funcCode$.val('');
        editor$.val('');
        break;
      case 'function':
        var code = (this.value == undefined?'undefined':this.value.toString());
        this.funcCode$.val(code);
        break;
      case 'number':
        if (this.value == undefined) {
          this.value = 0;
        }
        var n = Number(this.value)
        if (isNaN(n)) {
          this.force('string');
          return;
        }
        else {
          this.value = n;
        }
        this.funcCode$.val('');
        break;
      case 'string':
        this.funcCode$.val('');
        break;
    }
    this.type = type;
    editor$.change();  // will update the value, update the code, run the sheet and so updage the editors and tool bars
    this.setCurrentEditor(this.currentEditor); // will refresh the toolbar and refocus the editor according to the new situation
  }


  jc.Editor.prototype.setCurrentEditor = function(editor) {
    this.currentEditor = editor;
    if (editor) {
      this.jcObject = jc.vars[editor.jcObject];
      jc.objectToolBar$.append(jc.editor.toolBar$);
      this.value = this.jcObject.getEditableValue(this);
      this.type = (this.value && this.value.isV)?'function':typeof this.value;
      var radio$ = $('[value='+this.type+']',this.toolBar$);
      radio$.attr('checked',true);

      if (this.type == 'function') {
        this.funcCode$.val(this.value.code());
        if (this.funcCode$[0] != window.document.activeElement){
          this.funcCode$.focus();
        }
      }
      else {
        this.funcCode$.val('');
        if (editor != window.document.activeElement){
          editor.focus();
        }
      }
    }
  }

  jc.Editor.prototype.attr = function(attr) {
    // return the attr value of the html editor
    return this.currentEditor[attr];
  }
  
  jc.Editor.prototype.html = function(value,params) {
    // value : the initial value of the editor
    // params : an object that at least has jcObject:nameOfTheObject in jc.vars
    
    var type = typeof value;
    if (value && value.isV && value.code()) {
      type = 'function ';
      value = value.valueOf();
      type += (typeof value == 'number')?'RIGHT':'LEFT';
    }
    else if (value == undefined) {
      value = '';
    }
    else if (type == 'object') {
      throw new Error('objects are not yet supported in edition')
    }

    var h = '<INPUT class="EDITOR '+type+'"'+jc.htmlAttribute('value',value);
    for (var p in params) {
      h += jc.htmlAttribute(p,params[p]);
    }
    h += '>';
    return h;
  };


  jc.editor = new jc.Editor();
  jc.editor.createToolBar();

  // Table of Content //////////////////////////////////////////////////////////////////
  jc.tableOfContent = {
    toc : [],
    updateSections : function (element) {
      var currentNumbers = [];
      this.toc = [];
      $('.SECTION').each(function (i,e) {
        if ($(e).hasClass('CUT')) return;
        var title = e.firstChild;
        var level = jc.level(e);

        currentNumbers[level] = (currentNumbers[level] || 0)+1;
        currentNumbers.length = level+1;
        var number = currentNumbers.join('.');
        var t = title.innerHTML.replace(/^[\d\.]*(\s|\&nbsp;)*/,'');
        title.outerHTML = '<H'+(level+1)+' class="SECTIONTITLE EDITABLE" contentEditable='+(e===jc.selectedElement)+'>'+number+' '+t+'</H'+(level+1)+'>';
        jc.tableOfContent.toc.push({number:number,level:level,title:jc.textContent(t),sectionId:e.id});
      });
    },
    find : function(title) {
      return this.toc[jc.findInArrayOfObject({title:title},this.toc)];
    },
    span : function() {
      var h = '<DIV class=INTERACTIVE>';
      $.each(this.toc,function(i,t){
        h += '<div class=TOC'+t.level+'>'+t.number+' <a href="#'+t.sectionId+'">'+t.title+'</a></div>'
      });
      return new jc.HTML(h+'</DIV>');
    }
  };
    
  jc.link = function(text,url) {
    // if no url is given, text is used as a search into table of content to find the section
    // TODO: futur version will accept http url
    url = url || text;
    var entry = jc.tableOfContent.find(url);
    if (entry) {
      return new jc.HTML('<a class=LINK href="#'+entry.sectionId+'">'+text+'</a>');
    }
    return new jc.HTML('<span class=INVALIDLINK title="#'+url+' is not found in the table of content">'+text+'</span>');
  }

  jc.level = function(element) {
    // returns the level of the element = number of section between body and the element
    // please note that the first section has level = 0 according to this definition 
    // (but the title will be a <H1>)
    return $(element).parentsUntil('BODY').filter('.SECTION').length;
  }


  // Template //////////////////////////////////////////////////////////////////////////
 
  jc.Template = function(name){
    this.name = name;
  };

  jc.Template.urlBase = 'http://tablord.com/templates/';

  jc.Template.prototype.url = function(){
    return jc.Template.urlBase + this.name;
  }

  jc.Template.prototype.insertBefore = function(element,itemprop) {
    var newElement$ = this.element$(itemprop);
    newElement$.insertBefore(element);
    jc.selectElement(newElement$[0]);
    jc.setModified(true);
    jc.run();
  }

  jc.Template.prototype.insertAfter  = function(element,itemprop) {
    var element$ = $(element);
    if (element$.hasClass('CODE')) {
      if (element$.next().hasClass('OUTPUT')) element$=element$.next();
      if (element$.next().hasClass('TEST')) element$=element$.next();
    }
    var newElement$ = this.element$(itemprop);
    newElement$.insertAfter(element$);
    jc.selectElement(newElement$[0]);
    jc.setModified(true);
    jc.run();
  }

  jc.Template.prototype.convert = function(element,itemprop) {
    // convert element to template(name)

    var e$ = $(element);
    var data = $.extend(true,e$.data('itemData') || {},e$.getMicrodata());
    var id = element.id;
    var containers = $.extend(true,e$.data('containers') || {},jc.Template.getElement$Containers(e$));
    var k = jc.keys(data);
    if (k.length > 1) throw new Error('element.convert error: data has more than 1 head key\n'+jc.toJSCode(data));
    var newData = {};
    newData[itemprop || 'items'] = data[k[0]] || {};
    var new$ = this.element$(itemprop,id);
    if (this.convertData) {
      this.convertData(data,new$);
    }
    else {
      new$.setMicrodata(newData);    
      jc.Template.setElement$Containers(new$,containers);
    }
    new$
    .data('itemData',newData) // keep data in a element property so it can retrieve lost data in case of a convertion mistake (not handling all fields)
    .data('containers',containers);

    if (jc.selectedElement===element) {
      e$.replaceWith(new$);
      jc.selectElement(new$[0]);
    }
    else {
      e$.replaceWith(new$);
    }   
    return this;
  }

  jc.Template.prototype.element$ = function(itemprop,id) {
    if (this.html === undefined) throw new Error('in order to define a template at least define .fields, .html or .element$()');
    if (id === undefined) {
      jc.blockNumber++;
      id = 'item'+jc.pad(jc.blockNumber,4);
    }
    var new$ = $(this.html).attr('id',id);
    if (itemprop) new$.attr('itemprop',itemprop);
    return new$;
  }

  jc.Template.prototype.toString = function() {
    return 'template '+this.name+' created ['+this.url()+']';
  }

  jc.Template.prototype.span = function() {
    return 'template '+this.name+' created [<a href="'+this.url()+'">'+this.url()+'</a>]';
  }

  jc.Template.prototype.find = function(criteria,fields) {
    // return the data of a template collection as mongodb would do
   
    return jc.getItems$(this.url()).getData(criteria,fields);
  }

  jc.Template.MicrodataToData = function(microdata) {
    // transforms the microdata structure where all properties are array into a structure
    // closer to mongoBD.
    // in order to do so:
    // - properties which names end with [] will be kept as array
    // - properties which names do not end with [] will be transformed as the value of the first element
    //   of the array. if the array has more than one element, an Error will be raised.
    

  }


  jc.Template.urlToName = function(url) {
    if (url === undefined) return undefined;
    return url.match(/.*\/(.*)$/)[1];
  }

  jc.Template.moveContainerContent = function(oldElement$,newElement$) {
    // move into newElement$ all Container's content found in oldElements
    // both oldElement$ and newElement$ should be jquery with one single element to give predictable results
  }

  jc.Template.setElement$Containers = function(element$,containers){
    // move the content of the different containers stored in containers into the containers of element$
    // element$  a jQuery of 1 element that potentially has embedded containers
    // containers an object {containerName:jQueryOfContentOfContainer,....}
    element$.children().each(function(i,e) {
      var containerName = e.container;
      var e$ = $(e);
      if (containerName) {
        e$.empty();
        if (containers[containerName]) {
          containers[containerName].appendTo(e$);
        }
      }
      else {
        jc.Template.setElement$Containers(e$,containers);
      }
    });
  }

  jc.Template.getElement$Containers = function(element$,containers){
    // returns a object {containerName:jqueryOfcontentOfThisContainer,....}
    // the containers parameter is normally undefined, but needed for the recursive search
    //    all containers found will be added to containers
    containers = containers || {};
    element$.children().each(function(i,e) {
      var containerName = e.container;
      if (containerName) {
        containers[containerName] = $(e).children();
      }
      else {
        jc.Template.getElement$Containers($(e),containers);
      }
    });
    return containers;
  }



  jc.updateTemplateChoice = function () {}; // dummy so far, will be trully defined later on when creating menu;

  jc.template = function(newTemplate,itemprop) {
    // create a new template and register it
    // it will inherit from jc.Template 
    // newTemplate is a simple object that must at least define
    // .name: a name like an id optionaly followed by #version
    // and must define one of the 3
    // .fields: {field1:{options},field2:{options}....}
    //          field1 is the name of the field if field name ends with [] the field is an array of values
    //          options is an object
    //          types
    //          - number:{}                     the field is a number
    //          - string:{}                     the field is a string:  default if nothing is specified
    //          - function:function(data){...}  the field is calculated (=> readonly) and the html is the result of this function
    //          - select:{choice1:val1,choice2:val2...) the field is a <SELECT>
    //          - container:"template1 template2" 
    //                 a container that accepts the specified template names and how the itemprop . if "", accepts anything
    //
    //          formating
    //          - label: specifies the label in front of the field. by default fieldName
    //
    //    if fields is defined, standard html code will automatically be generated
    //    so do not define .fields if you want to define .html
    // .html: a string representing the html code of the template
    // .element$: a function() returning a DOM Element; normally not defined and inherited form jc.Template

    itemprop = itemprop || newTemplate.name;
    var newT = new jc.Template(newTemplate.name);
    newT.html = newTemplate.html;
    if (newTemplate.fields) {
      var h = '<DIV class="ELEMENT" itemprop="'+itemprop+'" itemscope itemtype="'+newT.url()+'"><TABLE width="100%">';
      for (var f in newTemplate.fields) {
        var label = f.label || f;
        if (newTemplate.fields[f].container) {
          h += '<TR><TH>'+label+'</TH><TD class=LEFT><DIV container="'+f+'" templates="'+newTemplate.fields[f].container+'"></DIV></TD></TR>';
        }
        else {
          h += '<TR><TH>'+label+'</TH><TD class=LEFT width="90%"><DIV class="FIELD EDITABLE" itemprop="'+f+'"></DIV></TD></TR>';
        }
      }
      newT.html = h + '</TABLE></DIV>';
    }
    if (newTemplate.element$) newT.element$ = newTemplate.element$;
    if (newTemplate.convertData)  newT.convertData  = newTemplate.convertData;
    jc.templates[newT.name] = newT;
    jc.updateTemplateChoice();
    var elementsToConvert$ = $('[itemtype="'+newT.url()+'"]');
    elementsToConvert$.each(function(idx,e){newT.convert(e,e.itemprop || 'items')});
    return newT;
  }


  jc.template({
    name : 'code',
    element$: function() {
      jc.blockNumber++;
      return $('<PRE class="ELEMENT CODE EDITABLE" id='+jc.blockId('code')+'>');
    },
    convertData: function(data,element$) {element$.html('Object('+jc.toJSCode(data)+')')}
  });

  jc.template({
    name : 'richText',
    element$: function() {
      jc.blockNumber++;
      return $('<DIV  class="ELEMENT RICHTEXT EDITABLE" id='+jc.blockId('rich')+'>');
    }
  });

  jc.template({
    name : 'section',
    element$ : function() {
      jc.blockNumber++;
      var n$ = $('<DIV  class="ELEMENT SECTION" id='+jc.blockId('sect')+'></DIV>')
               .append('<H1 class="SECTIONTITLE EDITABLE"></H1>')
               .append('<DIV container="sectionContent"></DIV>');
      return n$;
    }
  });

  jc.template({
    name : 'paste',
    element$: function() {
      return $('.CUT').detach().removeClass('CUT');
    }
  });

  //////////////////////////////////////////////////////////////////////////////////////
  // EDI ///////////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////////////

  jc.richedit = {
    exec:      function(command,value) {window.document.execCommand(command,false,value || null)},
    bold:      function(){jc.richedit.exec('bold')},
    italic:    function(){jc.richedit.exec('italic')},
    underline: function(){jc.richedit.exec('underline')},
    strike:    function(){jc.richedit.exec('strikeThrough')},
    h1:        function(){jc.richedit.exec('formatBlock','<h1>')},
    h2:        function(){jc.richedit.exec('formatBlock','<h2>')},
    div:       function(){jc.richedit.exec('formatBlock','<div>')},
    p:         function(){jc.richedit.exec('formatBlock','<p>')},
    ol:        function(){jc.richedit.exec('insertOrderedList')},
    ul:        function(){jc.richedit.exec('insertUnorderedList')},
    pre:       function(){jc.richedit.exec('formatBlock','<pre>')}
  }

  jc.findblockNumber = function() {
    $('.CODE').each(function(i,e) {
      var n = Number(e.id.slice(4));
      if (!isNaN(n)) {
        jc.blockNumber = Math.max(jc.blockNumber,n);
      }
    });
    jc.blockNumber++;
  }

  jc.blockId = function(prefix) {
    return prefix+jc.pad(jc.blockNumber,4);
  }

  jc.removeErrors = function(html) {
    return html.replace(/<SPAN class\=ERROR>(.+?)<\/SPAN>/g,"$1")
  }
               

  jc.outputElement = function(element) {
    // return the output element associated with element if any
    // if applied on another element than id=codexxxx return undefined;
    if ((element == undefined) || (element.id.slice(0,4) !== 'code')) return;
    var outId = element.id.replace(/code/,"out");
    var out = window.document.getElementById(outId);
    if (out == undefined) {
      var tag = (element.tagName=='SPAN'?'SPAN':'DIV');
      out = $('<'+tag+' class=OUTPUT id='+outId+'>no output</'+tag+'>').insertAfter(element)[0];
    }
    return out;
  }

  jc.testElement = function(element) {
    // returns the test element if any
    // if applied on another element than id=codexxxx return undefined;
    if ((element == undefined) || (element.id.slice(0,4) !== 'code')) return;
    return window.document.getElementById(element.id.replace(/code/,"test"));
  }

  jc.showCode = function(event) {
    var button = event.target || window.event.srcElement; //IE7 compatibility
    $('.CODE').toggleClass('HIDDEN',!button.checked);
    $('body').attr('showCode',button.checked);
  }

  jc.showCut = function(event) {
    var button = event.target || window.event.srcElement; //IE7 compatibility
    $('.CUT').toggleClass('HIDDEN',!button.checked);
    $('body').attr('showCut',button.checked);
  }
      
  jc.showTest = function(event) {
    var button = event.target || window.event.srcElement; //IE7 compatibility
    $('.TEST').toggleClass('HIDDEN',!button.checked);
    $('body').attr('showTest',button.checked);
  }
      
  jc.showTrace = function(event) {
    var button = event.target || window.event.srcElement; //IE7 compatibility
    $('.TRACE').toggleClass('HIDDEN',!button.checked);
    $('body').attr('showTrace',button.checked);
  }

  jc.setAutoRun = function(event) {
    var button = event.target || window.event.srcElement; //IE7 compatibility
    jc.autoRun = button.checked;
    $('body').attr('autoRun',jc.autoRun);
  }

  jc.print = function() {
    jc.selectElement(undefined);
    window.print();
  }
     
  jc.updateTemplateChoice = function() {
    var currentValue = jc.templateChoice$.val();
    jc.templateChoice$.empty();
    jc.currentContainer$ = $(jc.selectedElement).closest('[container]')  
    var acceptedTemplates = jc.currentContainer$.attr('templates');
    if (acceptedTemplates) {
      acceptedTemplates = acceptedTemplates.split(' ');
    }
    else {
      acceptedTemplates = jc.keys(jc.templates);
    }
    for (var i=0;i<acceptedTemplates.length;i++) {
      var template = jc.templates[acceptedTemplates[i]];
      if (template) jc.templateChoice$.append(
        '<OPTION value="'+acceptedTemplates[i]+'">'+acceptedTemplates[i]+'</OPTION>'
      );
    }
    if (jc.selectedElement &&
        jc.selectedElement.itemtype) {
      var name = jc.Template.urlToName(jc.selectedElement.itemtype);
      if (name && ($.inArray(name,acceptedTemplates)!=-1)) {
        jc.templateChoice$.val(name);
        return;
      }
    }
    if ($.inArray(currentValue,acceptedTemplates)!=-1) {
      jc.templateChoice$.val(currentValue);
      return;
    }
    jc.templateChoice$.val(acceptedTemplates[0]);
  } 

  jc.initToolBars = function() {
    $('#menu').remove();
    var b$ = $('BODY');

    jc.objectToolBar$ = $(
      '<DIV id=objectToolBar></DIV>'
    );
    
    jc.helpToolBar$ = $('<DIV>search</DIV>').append('<INPUT>').append('<DIV>');

    jc.templateChoice$ = $('<SELECT>');
    jc.updateTemplateChoice();

    jc.selectionToolBar$ = $('<DIV>')
      .append('<SPAN id=codeId>no selection</SPAN>')
      .append('<BUTTON id="cutBtn" onclick=jc.cutBlock(jc.selectedElement);>cut</BUTTON>')
      .append('<BUTTON onclick="jc.templates[jc.templateChoice$.val()].insertBefore(jc.selectedElement,jc.currentContainer$.attr(\'container\'))">&#8593;</BUTTON>')
      .append('<BUTTON onclick="jc.templates[jc.templateChoice$.val()].convert(jc.selectedElement,jc.currentContainer$.attr(\'container\'))">&#8596;</BUTTON>')
      .append(jc.templateChoice$)
      .append('<BUTTON onclick="jc.templates[jc.templateChoice$.val()].insertAfter(jc.selectedElement,jc.currentContainer$.attr(\'container\'))">&#8595;</BUTTON>')
      .append('<BUTTON id="showHtmlBtn" onclick=jc.showOutputHtml(this);>&#8594;html</BUTTON>')
      .append('<BUTTON id="toTestBtn" onclick=jc.copyOutputToTest(this);>&#8594;test</BUTTON>')
      .append(jc.objectToolBar$)
      .hide();

    jc.menu$ =  $(
    '<DIV id=menu class=TOOLBAR>'+
      '<DIV>'+
        '<INPUT onclick="jc.showCode(event)"'+(b$.attr('showCode')=="true"?' checked':'')+' type=checkbox>codes</INPUT>'+
        '<INPUT onclick="jc.showCut(event)"'+(b$.attr('showCut')=="true"?' checked':'')+' type=checkbox>cuts</INPUT>'+
        '<INPUT onclick="jc.showTest(event)"'+(b$.attr('showTest')=="true"?' checked':'')+' type=checkbox>tests</INPUT>'+
        '<INPUT onclick="jc.showTrace(event)"'+(b$.attr('showTrace')=="true"?' checked':'')+' type=checkbox>traces</INPUT>'+
        '<INPUT onclick="jc.setAutoRun(event)"'+(jc.autoRun?' checked':'')+' type=checkbox>auto run</INPUT>'+
      '</DIV>'+
      '<DIV>'+
        '<BUTTON id=runUntilSelectedBtn onclick=jc.execUntilSelected(); style="color: #8dff60;">&#9658;|</BUTTON>'+
        '<BUTTON id=runAllBtn onclick=jc.execAll(); style="color: #8dff60;">&#9658;&#9658;</BUTTON>'+
        '<BUTTON id=stopAnimation onclick=jc.clearTimers(); style="color: red">&#9632;</BUTTON>'+
        '<BUTTON id="clearOutputsBtn" onclick="jc.clearOutputs();">clear</BUTTON>'+
        '<BUTTON id="saveBtn" onclick="jc.save();">save</BUTTON>'+
        '<BUTTON onclick="jc.print();">print</BUTTON>'+
      '</DIV>'+
    '</DIV>')
    .append(jc.selectionToolBar$)

    $('BODY').prepend(jc.menu$);

    // make all button the same size
    var h=0;
    var w=0;
    jc.menu$.find('button').each(function(i,e){
      w=Math.max(w,e.offsetWidth);
      h=Math.max(h,e.offsetHeight);
    }).width(w).height(h);

    $('#richTextToolBar').remove(); // kill anything previouly in the saved document
    jc.richTextToolBar$ =  $('<SPAN id=richTextToolBar class=TOOLBAR></SPAN>')
      .append('<BUTTON onclick=jc.richedit.bold();><b>B</b></BUTTON>')
      .append('<BUTTON onclick=jc.richedit.italic();><i>i</i></BUTTON>')
      .append('<BUTTON onclick=jc.richedit.underline();><U>U</U></BUTTON>')
      .append('<BUTTON onclick=jc.richedit.strike();><strike>S</strike></BUTTON>')
      .append('<BUTTON onclick=jc.richedit.h1();><b>H1</b></BUTTON>')
      .append('<BUTTON onclick=jc.richedit.h2();><b>H2</b></BUTTON>') 
      .append('<BUTTON onclick=jc.richedit.div();>div</BUTTON>')
      .append('<BUTTON onclick=jc.richedit.p();>&#182;</BUTTON>') 
      .append('<BUTTON onclick=jc.richedit.ol();>#</BUTTON>')
      .append('<BUTTON onclick=jc.richedit.ul();>&#8226;</BUTTON>')
      .append('<BUTTON onclick=jc.richedit.pre();>{}</BUTTON>')
    
  }

  jc.setModified = function(state) {
    jc.modified = state;
    $('#saveBtn').toggleClass('WARNING',state);
  }

  jc.setUpToDate = function(state) {
    if (state === jc.setUpToDate.state) return;
    if (state) {
      $('#runAllBtn').removeClass('WARNING');
    }
    else {
      $('#runAllBtn').addClass('WARNING');
      $('*').removeClass('SUCCESS ERROR');
    }
    jc.setUpToDate.state = state;
  }
  
  jc.clearOutputs = function() {
    $('.OUTPUT').remove();
  }

  jc.save = function() {
    // save the sheet under fileName or the current name if fileName is not specified
    var fileName = window.prompt('save this sheet in this file?',window.location.pathname);
    if (fileName == undefined) return;
    window.document.documentElement.APPLICATIONNAME = fileName;
    jc.removeCutBlocks();
    jc.selectElement(undefined);
    var fso = new ActiveXObject("Scripting.FileSystemObject");
    var file = fso.OpenTextFile(fileName,2,true);
    var html = new jc.HTML('<!DOCTYPE html>\n'+window.document.documentElement.outerHTML)
    file.Write(html.removeJQueryAttr().toAscii());
    file.Close();
    jc.setModified(false);
    window.alert('file saved');
  }

  jc.writeResults = function() {
    // write the jc.results as JSON in a file of the same name .jres
    var resFileName = ''+jc.url.drive+jc.url.path+jc.url.fileName+'.jres';
    jc.fso.writeFile(resFileName,JSON.stringify(jc.results));
  }



  jc.beforeUnload = function() {  //TODO avec hta, ne fonctionne pas bien
    if (jc.modified) {
      if (window.confirm('your file has been modified since last save\n;save it now?')) {
        jc.save();
      }
    }
  }

  jc.copyOutputToTest = function() {
    if (jc.selectedElement == undefined) return;

    var out = jc.outputElement(jc.selectedElement);
    var test = jc.testElement(jc.selectedElement);
    if (test == undefined) {
      $(out).after($('<DIV id="'+jc.selectedElement.id.replace(/code/,"test")+'" class=TEST>'+out.innerHTML+'</DIV>'));
    }
    else if (!$(test).hasClass('SUCCESS')) {
      test.innerHTML = out.innerHTML;
      $(test).removeClass('ERROR').addClass('SUCCESS');
    }
    else {
      $(test).remove();
    }
    jc.setModified(true);
  }

  jc.cutBlock = function(element,cut) {
    cut = cut || !$(element).hasClass('CUT');
    $(element)
    .add(jc.outputElement(element))
    .add(jc.testElement(element))
    .toggleClass('CUT',cut);
    jc.setModified(true);
    jc.setUpToDate(false);
  }

  jc.removeCutBlocks = function() {
    $('.CUT').remove();
  }


  jc.editables$ = function(element) {
    // returns a JQuery of the tags that are editable in element (JQuery can be .length==0 if nothing is editable)
    var e$ = $(element);
    if (e$.hasClass('EDITABLE')) return e$;
    return e$.find('.EDITABLE');
  }


  jc.selectElement = function(element) {
    var e = jc.selectedElement;
    if (e) { 
      if (element && (e === element)) { // if already selected nothing to do but give focus again
        e.focus();
        return;
      }
      
      // remove the old selection
      $(e).removeClass('SELECTED');
      jc.editables$(e)
        .attr('contentEditable',false)
        .each(function(i,e){jc.reformatRichText(e)});
    }

    // set the new selection
    jc.selectedElement = element;
    if (element == undefined){
      $('#codeId').text('no selection');
      jc.selectionToolBar$.hide();
      return;
    }
    jc.menu$.show();
    jc.selectionToolBar$.show(500);
    $('#codeId').html(element.id+'<SPAN style="color:red;cursor:pointer;" onclick="jc.selectElement(undefined);">&nbsp;&#215;&nbsp;</SPAN>');
    $(element).addClass('SELECTED');
    jc.updateTemplateChoice();
    jc.editables$(element).attr('contentEditable',true);
    element.focus();
  }

  // EDI eventHandlers ///////////////////////////////////////////////////////////////

  jc.bodyKeyDown = function(event) {
    // special keys at EDI level
/*
    switch (event.keyCode) {
      case 120: 
        jc.templateChoice$.val('code');
        break;
      case 121:
        jc.templateChoice$.val('richText');
        break;
      case 122:
        jc.templateChoice$.val('section');
        break;
      case 123:
        jc.templateChoice$.val('paste');
        break;
    }
*/
    return true;
  }


  jc.elementClick = function(event) {
    var element = event.currentTarget; // not target, since target can be an child element, not the div itself
    if ($(element).hasClass('EMBEDDED')) {
      return true; //EMBEDDED code is ruled by its container (richText / section...) so let the event bubble
    }
    jc.selectElement(element);
    return false;  // prevent bubbling
  }

  jc.editableKeyDown = function(event) {
    if ($.inArray(event.keyCode,[16,17,18,20,27,33,34,35,36,37,38,39,40,45,91,92,93]) != -1) return; // non modifying keys like shift..
    jc.setModified(true);
    jc.setUpToDate(false);
    if ((event.keyCode==13) && event.ctrlKey) { 
      jc.run(); 
    }
  }

  jc.elementEditor = function(event) {
    // generic editor event handler for click and keypress
    // assumes that the DOM element that has a class=EDITOR also has an id="name of the corresponding JCalc element"
    // this handler just dispatch the event at the right object eventHandler
    var element = event.currentTarget;
    var jcObject = jc.vars[element.jcObject]
    return jcObject.editorEvent(event);
  }
  

  // formating / display / execution ////////////////////////////////////////////////////


  jc.format = function(obj,options,col) {
    // format obj using by priority
    // 1) options[col].format
    // 2) options.format
    // 3 the jc.defaults.format
    // and according to the type

    if (options) {
      var colFormatOptions = options.cols && options.cols[col] && options.cols[col].format;
      var format = $.extend(true,{},jc.defaults.format,options.format,colFormatOptions);
    }
    else {
      var format = jc.defaults.format;
    }
    if (typeof obj === 'number') {
      return format.number(obj)
    }
    if (obj === undefined) {
      return format.undef();
    }
    if (obj === null) {
      return format.nullObj();
    }
    if (obj === '') {
      return format.emptStr();
    }
    if (typeof obj === 'function') {
      return format.func(obj);
    }
    if ($.isArray(obj)) {
      return format.array(obj);
    }
    if (obj.span) {
      return obj.span().toString(); //span() usually return a HTML object;
    }
    if (obj.outerHTML) { // an Element
      return format.domElement(obj);
    }
    if ($.isPlainObject(obj)) {
      return format.obj(obj);
    }
    if (obj.getUTCDate) {
      return format.date(obj)
    }
    if (obj.valueOf) {
      var val = obj.valueOf();   // typicall the case of v() where valueOf return whatever has been stored in the V object
      if (val !== obj) {         // if the valueOf is not itself
        return jc.format(val,options);   // format the result of valueOf
      }
    }
    return jc.toHtml(obj.toString());
  }

  jc.setFormatOptions = function(options,format) {
    if (options.format === undefined) options.format = {};
    if (jc.formatters[format] === undefined) throw new Error('the format '+format+" dosen't exist")
    jc.formatters[format](options)
    return options;
  }

  jc.formatters = {
    '0'          : function(options) {options.format.number = function(n){return n.toFixed(0)}},
    '0.0'        : function(options) {options.format.number = function(n){return n.toFixed(1)}},
    '0.00'       : function(options) {options.format.number = function n2(n){return n.toFixed(2)}},
    '0.000'      : function(options) {options.format.number = function(n){return n.toFixed(3)}},
    '0.0000'     : function(options) {options.format.number = function(n){return n.toFixed(4)}},
    '0.00000'    : function(options) {options.format.number = function(n){return n.toFixed(5)}},
    '0.000000'   : function(options) {options.format.number = function(n){return n.toFixed(6)}},
    '0%'         : function(options) {options.format.number = function(n){return Number(n*100).toFixed(0)+'%'}},
    '0.0%'       : function(options) {options.format.number = function(n){return Number(n*100).toFixed(1)+'%'}},
    '0.00%'      : function(options) {options.format.number = function(n){return Number(n*100).toFixed(2)+'%'}},
    '0.000%'     : function(options) {options.format.number = function(n){return Number(n*100).toFixed(3)+'%'}},
    '0.0000%'    : function(options) {options.format.number = function(n){return Number(n*100).toFixed(4)+'%'}},
    '0.00000%'   : function(options) {options.format.number = function(n){return Number(n*100).toFixed(5)+'%'}},
    '0.000000%'  : function(options) {options.format.number = function(n){return Number(n*100).toFixed(6)+'%'}},
    'undefinedBlank' : function(options) {options.format.undef = function(){return ''}}
  }
  jc.displayResult = function(result,output) {
    $(output.outputElement)
    .empty().removeClass('ERROR').addClass('SUCCESS')
    .append((result !== undefined) && (result !== null) && (typeof result.node$ === 'function') && result.node$() 
            || jc.format(result)
           )
    .prepend(output.toString())
    .before(trace.span().toString()) // traces are not part of the result
  }

  jc.execCode = function(element) {
    var element$ = $(element);
    if (element$.hasClass('DELETED')) return;

    // if template, lauch exec method if any
    if (element.itemtype) {
      var t = jc.templates[element.itemtype];
      if (t && t.exec) {
        t.exec(element$);
      }
      jc.output = undefined;  // so that any errors from the EDI will be reported in a dialog, not in the last outputElement.
      return
    }

    // Execute CODE ELEMENT
    // clear if any previous WRONG marker
    var wrong$ = $('.WRONG',element);
    if (wrong$.length > 0) wrong$.replaceWith(function(i,c){return c});

    var out  = jc.outputElement(element);
    var test = jc.testElement(element)
    jc.output = newOutput(element,out);
    var res = jc.securedEval(jc.toString(element.innerHTML));
    jc.displayResult(res,jc.output);
    // test
    if (test != undefined) {
      if (out && (jc.trimHtml(out.innerHTML) == jc.trimHtml(test.innerHTML))) {   //TODO rethink how to compare
        $(test).removeClass('ERROR').addClass('SUCCESS');
      }
      else {
        $(test).removeClass('SUCCESS').addClass('ERROR');
      }
    }
    jc.output = undefined;  // so that any errors from the EDI will be reported in a dialog, not in the last outputElement.
  }

  jc.execCodes = function(fromCodeId,toCodeId) {
    // execute CODE element starting from fromCodeId and ending with toCodeId
    // it does not clean the environement first, since this function is intended to be used
    // by the user in order to execute some codes repeatidly
    // nor it will perform any finalization (but it will register output.finalize functions
    // that will be executed at the end of the sheet execution
    // please note that it is POSSIBLE to run the code containing the jc.execCodes() allowing 
    // some recursivity. Of course this can also result in an never ending loop if not used properly

    var include = false;
    var code$ = $('.CODE');
    fromCodeId = fromCodeId || code$.first().attr('id');
    toCodeId = toCodeId || code$.last().attr('id');
    code$.each(function(i,e) {
      if (e.id === fromCodeId) include=true;
      if (include) jc.execCode(e);
      if (e.id === toCodeId) include = false;
    });
  }

  jc.runHtaFile = function(fileName,noWait,parameters) {
    // run an other file
    // if runOnce is false or undefined, just open the file and returns without waiting
    //            is true run the file with ?runonce. it is the file responsibility to behave in this manner
    // parameters is encoded for uri and added to the searchstring 
    var params = [];
    if (noWait) {
      runOnce=false;
    }
    else {
      runOnce=true;
      params.push('runonce')
    }
    if (parameters) {
      for (var p in parameters) {
        params.push(encodeURIComponent(p)+'='+encodeURIComponent(parameters[p]));
      }
    }
    var resultFileName = fileName.replace(/\.hta/i,'.jres');
    if (params.length > 0) {
      var cmd = 'mshta.exe '+fileName+'?'+params.join('&');
    }
    else {
      var cmd = fileName;
    }
    var errCode = jc.shell.Run(cmd,1,runOnce);
    if (runOnce) {
      var json = jc.fso.readFile(resultFileName);
      var res = JSON.parse(json);
      res.cmd = cmd;
      res.errCode = errCode;
      return res;
    }
  }

  jc.runTests = function(/*files...*/) {
    // run every specified files as test files and return a table with all results
    var results = [];
    for (var i=0; i<arguments.length; i++) {
      var res = jc.runHtaFile(arguments[i]);
      results.push({file:arguments[i],errCode:res.errCode,nbPassed:res.testStatus.nbPassed,nbFailed:res.testStatus.nbFailed,dateTime:res.testStatus.dateTime});
    }
    return table().addRows(results).style(function(t,r,c){return ((c=='nbFailed')&&(t.cell(r,c) != 0))?{backgroundColor:'red'}:{}});
  }

  jc.animate = function (interval,fromCodeId,toCodeId,endCondition) {
    // run every "interval" all codes between fromCodeId to toCodeId
    // if fromCodeId is undefined, the CODE element where this function is called will be used
    fromCodeId = fromCodeId || jc.output.codeElement.id;
    toCodeId = toCodeId || fromCodeId;
    if (jc.inAnimation == false) {
      jc.intervalTimers.push(window.setInterval(function() {
        jc.inAnimation = true;
        jc.execCodes(fromCodeId,toCodeId);
        jc.inAnimation = false;
      }
      ,interval));
    }
    return new Date().toString();
  }

  jc.clearTimers = function () {
    for (var i = 0;i<jc.intervalTimers.length;i++) {
      window.clearInterval(jc.intervalTimers[i]);
    };
    jc.intervalTimers = [];
    jc.inAnimation = false;
  }

  jc.finalize = function() {
    for (var i=0;i<jc.finalizations.length;i++) {
      var out = jc.finalizations[i];
      jc.errorHandler.code = out.finalizationFunc.toString();
      out.finalizationFunc();
      out.finalizationFunc = undefined;  // so that displayResult will not show ... to be finalized...
      jc.displayResult(out,out);
    }
  }

  jc.run = function() {
    if (jc.autoRun) {
      jc.execAll();
    }
    else {
      jc.execUntilSelected();
    }
  }

  jc.updateContainers = function() {
    // make sure that containers are never empty (= have a fake element)
    // and that no fake element remains if there is another element inside the container
    $('.ELEMENT.EMPTY:not(:only-child)').remove();
    var c$ = $('[container]:empty');
    c$.append('<DIV class="ELEMENT EMPTY" contentEditable=false>empty container: click here to add an element</DIV>');
  }
 
  jc.execAll = function() {
    $('.TRACE').remove();
    trace.off();
    jc.clearTimers();
    jc.finalizations = [];
    jc.vars = {}; // run from fresh
    jc.results = {};
    jc.IElement.idNumber = 0;
    jc.simulation = new Simulation('_simulation');
    jc.tableOfContent.updateSections();
    jc.editables$(jc.selectedElement).each(function(i,e){jc.reformatRichText(e)});
    $('.CODE').add('[itemtype]').each(function(i,e) {jc.execCode(e);});
    jc.updateContainers();
    jc.finalize();
    jc.writeResults();
    jc.setUpToDate(true);
  }

  jc.execUntilSelected = function() {
    $('.TRACE').remove();
    trace.off();
    jc.clearTimers();
    jc.finalizations = [];
    jc.vars = {}; // run from fresh
    jc.results = {};
    jc.IElement.idNumber = 0;
    jc.tableOfContent.updateSections();
    jc.updateContainers();
    jc.editables$(jc.selectedElement).each(function(i,e){jc.reformatRichText(e)});
    $('*').removeClass('SUCCESS').removeClass('ERROR')
    var $codes = $('.CODE');
    if ($(jc.selectedElement).hasClass('CODE')){
      var lastI = $codes.index(jc.selectedElement);
    }
    else {
      var $last = $('.CODE',jc.selectedElement).last();
      if ($last.length === 0) { // selected element is a section or rich text that has no internal CODE element
        $codes.add(jc.selectedElement); // we add this element (even if not a code) just to know where to stop
        var lastI = $codes.index(jc.selectedElement)-1;
      }
      else {
        var lastI = $codes.index($last);
      }
    }
    $('.CODE').each(function(i,e) {
      if (i>lastI) return false;
      jc.execCode(e);
    });
    // no finalization since not all code is run, so some element will not exist
    jc.setUpToDate(false);
  }

  jc.reformatRichText = function(element) {
    if ((element == undefined) || ($(element).hasClass('CODE'))) return;
    var mark = /\{\{[#]?(.*?)\}\}/;
    var h = element.innerHTML;
    var idx=-1;
    var change=false;
    while ((idx=h.search(mark))!=-1) {
      jc.blockNumber++;
      if (h.charAt(idx+2) == '#') {
        h = h.replace(mark,'<SPAN class="CODE EMBEDDED" id='+ jc.blockId('code')+' style="DISPLAY: none;">jc.link("$1")</SPAN><SPAN class=OUTPUT contentEditable=false id='+ jc.blockId('out')+'>no output</SPAN>');
      }
      h = h.replace(mark,'<SPAN class="CODE EMBEDDED" id='+ jc.blockId('code')+' style="DISPLAY: none;">$1</SPAN><SPAN class=OUTPUT contentEditable=false id='+ jc.blockId('out')+'>no output</SPAN>');
      change = true; 
    }
    if (change) {
      jc.setUpToDate(false);
    }
    element.innerHTML = h;
  }

  jc.showOutputHtml = function(checkBox) {
    if ($(jc.selectedElement).hasClass('CODE')) {
      var out = jc.outputElement(jc.selectedElement) || {id:'no output',innerHTML:''};
      var test = jc.testElement(jc.selectedElement) || {id:'no test',innerHTML:''};
      var diff = '';
      if (out && test) {
        var i = 0;
        var hout  = jc.trimHtml(out.innerHTML)
        var htest = jc.trimHtml(test.innerHTML)
        while ((i<hout.length) && (i<htest.length) && (hout.charAt(i) === htest.charAt(i))) {
          i++;
        }
        diff = 'first difference at position '+i+'\n'+
               'out :'+hout.slice(i,i+20)+'\n'+
               'test:'+htest.slice(i,i+20)+'\n\n';
      }  
      window.alert(diff+
                   out.id+':\n'+out.innerHTML+'\n\n'+
                   test.id+':\n'+test.innerHTML);
    }
    else {
      window.alert(jc.selectedElement.outerHTML);
    }
  }


  // upgrades from previous versions ////////////////////////////////////////////////////////////////////////////////
    jc.upgradeModules = function() {
    // checks that this is the lastest modules and if not replaces what is needed
    var modulesNeeded = ['jquery-1.5.1.min.js','jcalcEdi.js','units.js','jcalc.js','axe.js','stateMachine.js','BOM.js','sys.js','ocrRdy.js','finance.js'];
    var allModules = modulesNeeded.concat('jquery.js'); // including deprecated modules
    var modules = [];
    var $script = $('SCRIPT').filter(function(){return $.inArray(this.src,allModules)!=-1});
    $script.each(function(i,e){modules.push(e.src)});
    if (modules.toString() == modulesNeeded.toString()) return; // everything is just as expected

    // otherwise we have to upgrade
    var h = '';
    $.each(modulesNeeded,function(i,m){h+='<SCRIPT src="'+m+'"></SCRIPT>'});
    window.prompt('your need to edit your scripts to upgrade',h);
  }

    
  jc.upgradeFramework = function() {
    // upgrades the sheet framework from previous versions
    
    $('*').removeClass('OLD').removeClass('AUTOEXEC');// not in use anymore
    $('.OUTPUT').add('.CODE').add('.RICHTEXT').removeAttr('onclick');  // no longer in the HTML but bound dynamically
    $('.RICHTEXT .CODE').add('.SECTIONTITLE .CODE').addClass('EMBEDDED');        // reserved for code inside another element
    $('#localToolBar').add('.BOTTOMTOOLBAR').add('.TOOLBAR').remove();           // no longer saved with the document and must be regenerated at init
    $('#topToolBar').remove();     // no longer in use since v0160
    $('#insideToolBar').remove();  // no longer in use since v0160
    $('#bottomToolBar').remove();  // no longer in use since v0160
    $('.CODE').add('.RICHTEXT').add('.SECTION').addClass('ELEMENT'); // since v160 all ELEMENT are selectable
    $('.CODE:not(.EMBEDDED)').add('.RICHTEXT').add('.SECTIONTITLE').addClass('EDITABLE'); // since v160 EDITABLE tags will be set to contentEditable=true /false when the itself or its parent is selected
    // since v0.0110 the menu is fixed in a #menu DIV and all sheet is contained in a #jcContent DIV
    jc.content$ = $('#jcContent').removeAttr('style').attr('container','items');
    var b$ = $('BODY');
    if (jc.content$.length == 0) {                                   
      b$.wrapInner('<DIV id=jcContent container="items"/>');
    }
    $('.CONTAINER').removeClass('.CONTAINER').attr('container','sectionContent');
    $('.SECTIONCONTAINER').removeClass('SECTIONCONTAINER').attr('container','sectionContent');

    // since v0.0145 the <body> attributes hideCodes,hideCut,hideTest,hideTrace are deprecated
    var b$ = $('BODY');
    if (b$.attr('hideCode')) b$.attr('showCode' ,b$.attr('hideCode')!=false);
    if (b$.attr('hideCut') ) b$.attr('showCut'  ,b$.attr('hideCut')!=false);
    if (b$.attr('hideTest')) b$.attr('showTest' ,b$.attr('hideTest')!=false);
    if (b$.attr('hideCode')) b$.attr('showTrace',b$.attr('hideTrace')!=false);
    b$.removeAttr('hideCode')
      .removeAttr('hideCut')
      .removeAttr('hideTest')
      .removeAttr('hideTrace');
  }


  $(window).load(function () {
    // upgrades ////////////////////////////////////////////////////
    jc.upgradeModules();
    jc.upgradeFramework();
    if (window.document.compatMode != 'CSS1Compat') {
      window.alert('your document must have <!DOCTYPE html> as first line in order to run properly: please save and re-run it');
    }
    // prepare the sheet ///////////////////////////////////////////
    jc.url = jc.urlComponents(window.document.location.href);
    $('.SELECTED').removeClass('SELECTED');
    $('.ELEMENT').live("click",jc.elementClick);
    $('.EDITABLE').live("keydown",jc.editableKeyDown);
    $('.EDITOR').live("change",jc.Editor.eventHandler).live("click",jc.Editor.eventHandler);
    $('.OUTPUT').removeClass('SUCCESS').removeClass('ERROR');
    $('.TEST').removeClass('SUCCESS').removeClass('ERROR');

    $('.SCENE').live("click",function(event){event.stopPropagation()}); // cancel bubbling of click to let the user control clicks
    $('.INTERACTIVE').live("click",function(event){event.stopPropagation()}); // cancel bubbling of click to let the user control clicks
    $('.LINK').live("click",function(event){event.stopPropagation()}); // cancel bubbling of click to let the user control clicks

    jc.findblockNumber();
    jc.initToolBars();
    $(window).bind('beforeunload',jc.beforeUnload);
    $('body').keydown(jc.bodyKeyDown);
    jc.autoRun = $('body').attr('autoRun')!==false;
    if (jc.autoRun) jc.execAll();
  });  
  
  window.onerror = jc.errorHandler;
