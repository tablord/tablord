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

            defaults:{
              format:{            // default formating methods  this can be redefined in some JCalc objects like v table... in options.
                undef:function(){return '<SPAN style=color:red;>undefined</SPAN>'},
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
  jc.toFixed = function(decimals) {
    // returns a fomating function(obj) that formats the number with fixed decimals
    var f = function (n) {return n.toFixed(decimals)};
    f.toString = function() {return 'display precision of '+decimals+' decimals'};
    return f;
  }

    
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


  //JQuery extentions /////////////////////////////////////////////////
  $.prototype.span = function() {
    var s = ['<ol start=0>'];
    for (var i=0; i < this.length; i++) {
      s.push('<li class="INSPECTHTML">'+jc.toHtml(jc.trimHtml(jc.purgeJQueryAttr(this[i].outerHTML)))+'</li>');
    }
    s.push('</ol>');
    return new jc.HTML('JQuery of '+this.length+' elements<br>'+s.join('<br>'));
  }  

  $.prototype.toString = function(){
    return '[object JQuery] length:'+ this.length;
  }

  $.prototype.asNode = function() {
    var query = this;
    return {node$:function() {return query}}
  }

  // edi related functions ////////////////////////////////////////////
  var geval = eval;

  jc.securedEval = function(code) {
  // NRT0001
  // a bit more secured: since IE<9 executes localy, it was possible do destroy local variable by defining functions or var
  // with this trick, one can still create global variables by just assigning (eg: jc.vars='toto' destroys the global variable jc.vars)
  // to be checked what could be done to improve

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
      
      return obj.toJson();
    }
  }    

  // debug //////////////////////////////////////////////////////////



  function a(/*objects*/) {
    var message = '';
    for (var i=0; i<arguments.length; i++){
      message += jc.inspect(arguments[i]).toString();
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
  jc.Inspector = function Inspector(obj,name,depth) {
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
    r += '<table class=INSPECT>';
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
    else {
      l = obj.toString();
    } 
    return l;
  }


  jc.inspect = function(obj,name,depth){
    return new jc.Inspector(obj,name,depth);
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

  jc.findInArrayOfObject = function(criteria,a) {
    // find the first object in the array of object a that has all criteria true
    // example jc.findInArrayOfObject({toto:5},[{toto:1,tutu:5},{toto:5}])
    // will return 1
    next: for (var i=0; i<a.length; i++) {
      for (var k in criteria) {
        if (a[i][k] !== criteria[k]) continue next;
      }
      return i;
    }
  }

  jc.pad = function(integer,numberOfDigits){
    return ('00000000000000000'+integer).slice(-numberOfDigits);
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

  jc.toJScode = function(obj,stringQuote) {
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
        if (!jc.isJSid(name)) name = jc.toJScode(name,stringQuote);
        sa.push(name+':'+jc.toJScode(value,stringQuote))
      });
      return '{'+sa.join(',')+'}';
    }
    else if ($.isArray(obj)) {
      var sa=[];
      $.each(obj, function(i,value) {sa.push(jc.toJScode(value,stringQuote))});
      return '['+sa.join(',')+']';
    }
    else if (obj === undefined) {
      return 'undefined';
    }
    else if (typeof obj === 'function') {
      return obj.toString();
    }
    return obj.toJson();
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
    return html.replace(/[ \t\r\n]+/g,' ').replace(/> /,'>').replace(/ </,'<');
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
    return func.toString().match(/(function.*?\))/)[0];
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
    return new jc.HTML('<div class=HELP><b>'+signature+'</b><br>'+comments.join('<br>')+(constructor?jc.inspect(func.prototype,'methods').span():'')+'</DIV>');
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
 
  jc.Template = function(){};
  jc.Template.urlBase = 'http://tablord.com/templates/';

  jc.Template.prototype.insertBefore = function(element) {
    var newElement$ = this.node$();
    newElement$.insertBefore(element);
    jc.selectElement(newElement$[0]);
    jc.setModified(true);
    jc.run();
  }

  jc.Template.prototype.insertAfter  = function(element) {
    var element$ = $(element);
    if (element$.hasClass('CODE')) {
      if (element$.next().hasClass('OUTPUT')) element$=element$.next();
      if (element$.next().hasClass('TEST')) element$=element$.next();
    }
    var newElement$ = this.node$();
    newElement$.insertAfter(element$);
    jc.selectElement(newElement$[0]);
    jc.setModified(true);
    jc.run();
  }

  jc.Template.prototype.node$ = function() {
    if (this.html == undefined) throw new Error('in order to define a template at least define .html or node$()');
    return $(this.html);
  }
  

  jc.updateTemplateChoice = function () {}; // dummy so far, will be trully defined later on when creating menu;

  jc.template = function(newTemplate) {
    // create a new template and register it
    // it will inherit from jc.Template 
    // newTemplate is a simple object that must at least define
    // .name: a name like an id
    // or
    // .url: where is located the description of the template
    // and must define one of the 3
    // .fields: {field1:type,field2:type....}
    //          field1 is the name of the field
    //          type is one of the string 'number','string','function'
    //    if fields is defined, standard html code will automatically be generated
    //    so do not define .fields if you want to define .html
    // .html: a string representing the html code of the template
    // .node$: a function() returning a DOM Element; normally not defined and inherited form jc.Template
    if (newTemplate.url == undefined) newTemplate.url = jc.Template.urlBase+newTemplate.name+'.html';
    if (newTemplate.fields) {
      var h = '<DIV class="ELEMENT" itemscope itemtype="'+newTemplate.url+'"><TABLE width="100%">';
      for (var f in newTemplate.fields) {
        h += '<TR><TH>'+f+'</TH><TD class=LEFT width="90%"><DIV class="FIELD EDITABLE" itemprop="'+f+'"></DIV></TD></TR>';
      }
      newTemplate.html = h + '</TABLE></DIV>';
    }
    newTemplate = $.extend(true,{},jc.Template.prototype,newTemplate);
    jc.templates[newTemplate.url] = newTemplate;
    if (newTemplate.name == undefined) newTemplate.name = newTemplate.url.match(/^.*\/([\w\._$]+).htm[l]?$/i)[1];
    jc.updateTemplateChoice();
    return 'template '+newTemplate.name+' created ['+newTemplate.url+']';
  }

  jc.template.setElements$WithData = function(elements$,data){
    // set all itemprop elements with data (recurse through children and data)
    elements$.each(function(i,element){
      var e$ = $(element);
      var itemprop = element.itemprop;
      if (itemprop !== undefined) {
        if (e$.hasClass('EDITABLE')) {
          e$.html(data[itemprop]===undefined?'':data[itemprop]);  //TODO JSON ???
          return;
        }
        else if (element.itemscope !== undefined) {
          jc.template.setElements$WithData(e$.children(),data[itemprop]); 
        } 
        else throw new Error('an element with itemprop must either be an itemscope or be class=EDITABLE\n'+jc.format(element));
      }
      else {  // this node is not an itemprop, look in its children with the same data
        jc.template.setElements$WithData(e$.children(),data); 
      }
    });
  }

  jc.template.getElements$Data = function(elements$){
    // get all itemprop elements with data (recurse through children and data)
    var data = {};
    elements$.each(function(i,element){
      var e$ = $(element);
      var itemprop = element.itemprop;
      if (itemprop !== undefined) {
        if (e$.hasClass('EDITABLE')) {
          data[itemprop] = e$.html();
        }
        else if (element.itemscope !== undefined) {
          data[itemprop] = jc.template.getElements$Data(e$.children()); 
        } 
        else throw new Error('an element with itemprop must either be an itemscope or be class=EDITABLE\n'+jc.format(element));
      }
      else {  // this node is not an itemprop, look if its children have data
        $.extend(true,data,jc.template.getElements$Data(e$.children())); 
      }
    });
    return data;
  }


  jc.template.data = function(url) {
    // get all data from all templates in the document having the itemtype=url
    var data = [];
    var templates$ = $('[itemtype="'+url+'"]');
    templates$.each(function(i,e){
      data.push(jc.template.getElements$Data($(e)));
    });
    return data;
  }

  jc.template.convertTo = function(element,url) {
    // convert element to template(url)
    var e$ = $(element);
    var data = $.extend(true,element.itemData || {},jc.template.getElements$Data(e$));
    var new$ = jc.templates[url].node$();
    jc.template.setElements$WithData(new$,data);
    new$[0].itemData = data; // keep data in a element property so it can retrieve lost in case of a convertion mistake (not handling all fields)
    e$.replaceWith(new$);
  }

  jc.template({
    name    : 'code',
    url     : 'code',
    node$ : function() {
      jc.blockNumber++;
      return $('<PRE class="ELEMENT CODE EDITABLE" id='+jc.blockId('code')+'>');
    }
  });

  jc.template({
    name : 'richText',
    url  : 'richText',
    node$ : function() {
      jc.blockNumber++;
      return $('<DIV  class="ELEMENT RICHTEXT EDITABLE" id='+jc.blockId('rich')+'>');
    }
  });

  jc.template({
    name : 'section',
    url  : 'section',
    node$ : function() {
      jc.blockNumber++;
      var n$ = $('<DIV  class="ELEMENT SECTION" id='+jc.blockId('sect')+'></DIV>')
               .append('<H1 class="SECTIONTITLE EDITABLE"></H1>')
               .append('<DIV class=CONTAINER></DIV>');
      return n$;
    }
  });

  jc.template({
    name : 'paste',
    url  : 'paste',
    node$ : function() {
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
      $('<'+tag+' class=OUTPUT id='+outId+'>no output</'+tag+'>').insertAfter(element);
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
    for (var t in jc.templates) {
      jc.templateChoice$.append('<OPTION value="'+jc.templates[t].url+'">'+
                                 jc.templates[t].name+'</OPTION>');
    }
    jc.templateChoice$.val(currentValue)
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
      .append('<BUTTON onclick="jc.templates[jc.templateChoice$.val()].insertBefore(jc.selectedElement)">&#8593;</BUTTON>')
      .append('<BUTTON onclick="jc.template.convertTo(jc.selectedElement,jc.templateChoice$.val())">&#8596;</BUTTON>')
      .append(jc.templateChoice$)
      .append('<BUTTON onclick="jc.templates[jc.templateChoice$.val()].insertAfter(jc.selectedElement)">&#8595;</BUTTON>')
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

  jc.editorKeyPress = function(event) {
    jc.setModified(true);
    jc.setUpToDate(false);
    var element = event.srcElement;
    $(element.id.replace(/code/,"#out")).removeClass('SUCCESS').removeClass('ERROR');
    $(element.id.replace(/code/,"#test")).removeClass('SUCCESS').removeClass('ERROR');
    if (event.keyCode==10) {  //only IE
      jc.run(); 
    }
  }

  jc.richTextKeyPress = function(event) {
    jc.setModified(true);
    var element = event.srcElement;
    if (event.keyCode==10) {  //only IE
      jc.run(); 
    }
  }

  jc.editableKeyPress = function(event) {
    jc.setModified(true);
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


  jc.format = function(obj,options) {
    if (options) {
      var format = $.extend(true,{},jc.defaults.format,options.format);
    }
    else {
      var format = jc.defaults.format;
    }
    if (typeof obj === 'number') {
      return format.number(obj)
    }
    if (obj == undefined) {
      return format.undef();
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
      return obj.span();
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
    return jc.toHtml(obj);       // fallback is to let display either valueOf or toString
  }

  jc.displayResult = function(result,output) {
    $(output.outputElement)
    .empty().removeClass('ERROR').addClass('SUCCESS')
    .append(((result !== undefined) && (result !== null) && (typeof result.node$ === 'function') && result.node$() )
            || jc.format(result).toString()
           )
    .prepend(output.toString())
    .before(trace.span().toString()) // traces are not part of the result
  }

  jc.execCode = function(element) {
    if ($(element).hasClass('DELETED')) return;
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
      if (jc.trimHtml(out.innerHTML) == jc.trimHtml(test.innerHTML)) {   //TODO rethink how to compare
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
    $('.CONTAINER:empty').append('<DIV class="ELEMENT EMPTY" contentEditable=false>empty container: click here to add an element</DIV>');
  }
 
  jc.execAll = function() {
    $('.TRACE').remove();
    jc.clearTimers();
    jc.finalizations = [];
    jc.vars = {}; // run from fresh
    jc.IElement.idNumber = 0;
    jc.simulation = new Simulation('_simulation');
    jc.tableOfContent.updateSections();
    jc.updateContainers();
    jc.editables$(jc.selectedElement).each(function(i,e){jc.reformatRichText(e)});
    $('.CODE').each(function(i,e) {jc.execCode(e);});
    jc.finalize();
    jc.setUpToDate(true);
  }

  jc.execUntilSelected = function() {
    $('.TRACE').remove();
    jc.clearTimers();
    jc.finalizations = [];
    jc.vars = {}; // run from fresh
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
    jc.content$ = $('#jcContent').removeAttr('style').addClass('CONTAINER');
    var b$ = $('BODY');
    if (jc.content$.length == 0) {                                   
      b$.wrapInner('<DIV id=jcContent class="CONTAINER"/>');
    }

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
    $('.SELECTED').removeClass('SELECTED');
    $('.ELEMENT').live("click",jc.elementClick);
    $('.CODE').live("keypress",jc.editorKeyPress);
    $('.RICHTEXT').live("keypress",jc.richTextKeyPress);
    $('.EDITABLE').live("keypress",jc.editableKeyPress);
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
