  // global variables /////////////////////////////////////////////////

  var jc = {name:'JCalc',
            version:'0.1',
            authors:['Marc Nicole'],
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
                    var tag = (out.tagName=='SPAN')?'SPAN':'PRE';  // if span, one can only insert span, not div
                    var code = jc.errorHandler.code || '';
                    var faults = message.match(/« (.+?) »/);
                    if (faults != null) {
                      var fault = faults[1];
                      code = code.replace(new RegExp(fault,'g'),'<SPAN class="ERROR">'+fault+'</SPAN>');
                    }
                    out.innerHTML = trace.span()+message+'<'+tag+' class="CODEINERROR">'+code+'</'+tag+'>';
                  }
                  $(out).removeClass('SUCCESS').addClass('ERROR');
                  out.scrollIntoView();
                  return true;
                }
              return false;
            }
           };


  jc.credits = {name:jc.name,version:jc.version,authors:jc.authors};
  jc.helps = {'jc.credits':jc.credits};

  // classical formating functions
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

  jc.resize = function() {
    var viewPort = jc.getViewPortSize();
    $('#jcContent')
      .height(viewPort.height-$('#menu').outerHeight(true)-30)
      .width($('#menu').width);
  }

  //JQuery extentions /////////////////////////////////////////////////
  $.prototype.span = function() {
    var s = [];
    for (var i=0; i < this.length; i++) {
      s.push(i+': <code class="INSPECTHTML">'+jc.toHtml(jc.trimHtml(jc.purgeJQueryAttr(this[i].outerHTML)))+'</code>');
    }
    return new jc.HTML('JQuery of '+this.length+' elements<br>'+s.join('<br>'));
  }  

  $.prototype.toString = function(){
    return '[object JQuery] length:'+ this.length;
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
    

  // debug //////////////////////////////////////////////////////////



  function a(/*objects*/) {
    var message = '';
    for (var i=0; i<arguments.length; i++){
      message += jc.inspect(arguments[i]);
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
  
  jc.Inspector.prototype.legend = function(obj) {
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
    else {
      l = this.obj.toString();
    } 
    return l;
  }

  jc.Inspector.prototype.toString = function (){
    var r = this.legend(this.obj)+' '+this.name+'\n';
    for (var k in this.obj) { r += k+':  '+this.obj[k]+'\n' };
    return r;
  }

  jc.Inspector.prototype.span = function (depth){
    depth = depth || this.depth;
    if (this.obj === undefined) {
      return '<SPAN style=color:red;>undefined</SPAN>';
    }
    if (typeof this.obj === 'number') {
      return this.obj.toString();
    }
    if (this.obj === '') {
      return '<SPAN style=color:red;>empty string</SPAN>';
    }
    if (typeof this.obj === 'string') {
      return '<SPAN class=INSPECT>'+jc.toHtml(JSON.stringify(this.obj))+'</SPAN>';
    }
    if (this.obj.toGMTString !== undefined) {
      return '<SPAN style=color:red;>'+this.obj.toString()+' (ms:'+this.obj.valueOf()+')</SPAN>';
    }
    var r = '<DIV class=INSPECT><fieldset><legend>'+this.legend(this.obj)+' '+this.name+'</legend>';
    r += '<table class=INSPECT>';
    for (var k in this.obj) {
      r += '<tr><th valign="top">'+k+'</th><td valign="top" style="text-align:left;">'+
           (  (typeof this.obj[k] == 'function')?jc.help(this.obj[k]):
                 ((depth == 1)?jc.toHtml(this.obj[k]):jc.inspect(this.obj[k]).span(depth-1))
           )
          +'</td></tr>'; 
    };
    return new jc.HTML(r+'</table></fieldset></DIV>');
  }

  // general purpose helpers ////////////////////////////////////////////


  jc.inspect = function(obj,name,depth){
    return new jc.Inspector(obj,name,depth);
  }


  jc.keys = function(obj) {
    // returns an Array with all keys (=properties) of an object
    var res = [];
    for (var k in obj) {
      res.push(k);
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

  jc.pad = function(integer,numberOfDigits){
    return ('00000000000000000'+integer).slice(-numberOfDigits);
  }

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

  // helpers specific to jcalc ////////////////////////////////////////////////////////////////////

  jc.createVar = function(pathName,value) {
    //pathName is a string using the dot notation

  }

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
             .replace(/</g,"&lt;")
             .replace(/>/g,"&gt;")
             .replace(/ /g,"&nbsp;")
             .replace(/\r/g,'')
             .replace(/\n/g,"<br>");
  }

  jc.htmlAttribute = function(attr,value) {
    // write an attribute according to its type
    var h = ' '+attr+'='+(typeof value == 'number'?value:'"'+jc.toHtml(value).replace(/"/g,'&quot;')+'"');
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
    return new jc.HTML('<b>'+signature+'</b><br>'+comments.join('<br>')+(constructor?jc.inspect(func.prototype,'methods').span():''));
  }

  jc.signature = function(func) {
    // returns only the signature of the function
    return func.toString().match(/(function.*?\))/)[0];
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
                 keys:jc.keys,copy:jc.copy,pad:jc.pad,toString:jc.toString,toHtml:jc.toHtml,
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
        title.outerHTML = '<H'+(level+1)+' class=SECTIONTITLE contentEditable='+(e===jc.selectedElement)+'>'+number+' '+t+'</H'+(level+1)+'>';
        jc.tableOfContent.toc.push({number:number,level:level,title:jc.textContent(t),sectionId:e.id});
      });
    },
    find : function(title) {
      return this.toc[jc.findInArrayOfObject({title:title},this.toc)];
    },
    span : function() {
      var h = '';
      $.each(this.toc,function(i,t){
        h += '<div class=TOC'+t.level+'>'+t.number+' <a href="#'+t.sectionId+'">'+t.title+'</a></div>'
      });
      return new jc.HTML(h);
    }
  };
    
  jc.link = function(text,url) {
    // if no url is given, text is used as a search into table of content to find the section
    // TODO: futur version will accept http url
    url = url || text;
    var entry = jc.tableOfContent.find(url);
    if (entry) {
      return new jc.HTML('<a href="#'+entry.sectionId+'">'+text+'</a>');
    }
    return new jc.HTML('<span class=INVALIDLINK title="#'+url+' is not found in the table of content">'+text+'</span>');
  }

  jc.level = function(element) {
    // returns the level of the element = number of section between body and the element
    // please note that the first section has level = 0 according to this definition 
    // (but the title will be a <H1>)
    return $(element).parentsUntil('BODY').filter('.SECTION').length;
  }

  // EDI ///////////////////////////////////////////////////////////////////////////////

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
      out = $('<'+tag+' class=OUTPUT id='+outId+'>no output</'+tag+'>')[0];
      $(out).insertAfter(element);
    }
    return out;
  }

  jc.testElement = function(element) {
    // returns the test element if any
    // if applied on another element than id=codexxxx return undefined;
    if ((element == undefined) || (element.id.slice(0,4) !== 'code')) return;
    return window.document.getElementById(element.id.replace(/code/,"test"));
  }

  jc.hideCode = function(event) {
    var button = event.target || window.event.srcElement; //IE7 compatibility
    $('.CODE').toggleClass('HIDDEN',button.checked);
    button.scrollIntoView();
    window.document.body.hideCode=button.checked;
  }

  jc.hideCut = function(event) {
    var button = event.target || window.event.srcElement; //IE7 compatibility
    $('.CUT').toggleClass('HIDDEN',button.checked);
    button.scrollIntoView();
    window.document.body.hideCut=button.checked;
  }
      
  jc.hideTest = function(event) {
    var button = event.target || window.event.srcElement; //IE7 compatibility
    $('.TEST').toggleClass('HIDDEN',button.checked);
    button.scrollIntoView();
    window.document.body.hideTest=button.checked;
  }
      
  jc.hideTrace = function(event) {
    var button = event.target || window.event.srcElement; //IE7 compatibility
    $('.TRACE').toggleClass('HIDDEN',button.checked);
    button.scrollIntoView();
    window.document.body.hideTrace=button.checked;
  }

  jc.autoRun = function(event) {
    var button = event.target || window.event.srcElement; //IE7 compatibility
    jc.autoRun = window.document.body.autoRun=button.checked;
  }

  jc.print = function() {
    jc.selectElement(undefined);
    jc.menu$.hide();
    jc.content$.css('overflow','visible');
    window.print();
    jc.content$.css('overflow','scroll');
    jc.resize();
  }
      
  jc.initToolBars = function() {
    $('#menu').remove();
    jc.menu$ =  $(
    '<DIV id=menu class=TOOLBAR>'+
      '<DIV>'+
        '<INPUT onclick="jc.hideCode(event)"'+(window.document.body.hideCode===true?' checked':'')+' type=checkbox>hide codes</INPUT>'+
        '<INPUT onclick="jc.hideCut(event)"'+(window.document.body.hideCut===true?' checked':'')+' type=checkbox>hide Cut</INPUT>'+
        '<INPUT onclick="jc.hideTest(event)"'+(window.document.body.hideTest===true?' checked':'')+' type=checkbox>hide tests</INPUT>'+
        '<INPUT onclick="jc.hideTrace(event)"'+(window.document.body.hideTrace===true?' checked':'')+' type=checkbox>hide traces</INPUT>'+
        '<INPUT onclick="jc.autoRun(event)"'+(jc.autoRun?' checked':'')+' type=checkbox>auto run</INPUT>'+
        '<BUTTON onclick=jc.selectElement(undefined);>hide ToolBars</BUTTON>'+
        '<BUTTON onclick="jc.print();">print...</BUTTON>'+
      '</DIV>'+
      '<DIV>'+
        '<SPAN>'+ 
           '<BUTTON id=runUntilSelectedBtn onclick=jc.execUntilSelected(); style="color: #8dff60;">&#9658;|</BUTTON>'+
           '<BUTTON id=runAllBtn onclick=jc.execAll(); style="color: #8dff60;">&#9658;&#9658;</BUTTON>'+
           '<BUTTON id=stopAnimation onclick=jc.clearTimers(); style="color: red">&#9632;</BUTTON>'+
           '<BUTTON id="saveBtn" onclick="jc.save();">save</BUTTON>'+
           '<SPAN id=codeId>no element</SPAN>'+
           '<BUTTON onclick=jc.showOutputHtml(this);>show html</BUTTON>'+
           '<BUTTON onclick=jc.copyOutputToTest(this);>&#8594;test</BUTTON>'+
           '<BUTTON onclick=jc.cutBlock(jc.selectedElement);>&#8595; cut &#8595;</BUTTON>'+
        '</SPAN>'+
        '<SPAN id=objectToolBar></SPAN>'+
      '</DIV>'+
    '</DIV>');
    $('BODY').prepend(jc.menu$);

    jc.objectToolBar$ = jc.menu$.find('#objectToolBar');

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
    
    $('#topToolBar').remove();
    jc.topToolBar$ = $('<DIV id=topToolBar class=TOOLBAR/>')
      .append('<BUTTON onclick="jc.insertNewSection(this.parentNode);">&#8593; new section &#8593;</BUTTON>')
      .append('<BUTTON onclick="jc.insertNewRichText(this.parentNode);">&#8593; new richtext &#8593;</BUTTON>')
      .append('<BUTTON onclick="jc.insertNewCodeBlock(this.parentNode);">&#8593; new code &#8593;</BUTTON>')
      .append('<BUTTON onclick="jc.paste(this.parentNode);">&#8593; paste &#8593;</BUTTON>')

    $('#insideToolBar').remove();
    jc.insideToolBar$ = $('<DIV id=insideToolBar class=TOOLBAR/>')
      .append('<BUTTON onclick=jc.insertNewSection(this.parentNode);>new section</BUTTON>')
      .append('<BUTTON onclick=jc.insertNewRichText(this.parentNode);>new rich text</BUTTON>')
      .append('<BUTTON onclick=jc.insertNewCodeBlock(this.parentNode);>new code</BUTTON>')
      .append('<BUTTON onclick=jc.paste(this.parentNode);>paste</BUTTON>')

    $('#bottomToolBar').remove();
    jc.bottomToolBar$ = $('<DIV id=bottomToolBar class=TOOLBAR></DIV>')
      .append('<BUTTON onclick=jc.insertNewSection(this.parentNode);>&#8595; new section &#8595;</BUTTON>')
      .append('<BUTTON onclick=jc.insertNewRichText(this.parentNode);>&#8595; new rich text &#8595;</BUTTON>')
      .append('<BUTTON onclick=jc.insertNewCodeBlock(this.parentNode);>&#8595; new code &#8595;</BUTTON>')
      .append('<BUTTON onclick=jc.paste(this.parentNode);>&#8595; paste &#8595;</BUTTON>')
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

  jc.save = function() {
    // save the sheet under fileName or the current name if fileName is not specified
    var fileName = window.prompt('save this sheet in this file?',window.location.pathname);
    if (fileName == undefined) return;
    window.document.documentElement.APPLICATIONNAME = fileName;
    jc.removeCutBlocks();
    jc.selectElement(undefined);
    var fso = new ActiveXObject("Scripting.FileSystemObject");
    var file = fso.OpenTextFile(fileName,2,true);
    var html = new jc.HTML(window.document.documentElement.outerHTML)
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

  jc.insertNewCodeBlock = function(beforeThatElement) {
    // insert a new code and output DIV 
    // -beforeThatElement is where it must be inserted (usually the topToolBar, but can be any Element)
    jc.blockNumber++;
    var newCode = window.document.createElement('<PRE class=CODE id='+jc.blockId('code')+' contentEditable=true>');
    var newOutput = jc.outputElement(newCode);
    beforeThatElement.parentNode.insertBefore(newCode,beforeThatElement);
    beforeThatElement.parentNode.insertBefore(newOutput,beforeThatElement);
    jc.selectElement(newCode);
    jc.setModified(true);
    jc.run();
  }

  jc.insertNewRichText = function(beforeThatElement) {
    // insert a new richText DIV 
    // -beforeThatElement is where it must be inserted (usually the topToolBox, but can be any Element)
    jc.blockNumber++;
    var newRichText = window.document.createElement('<DIV id='+jc.blockId('rich')+' class=RICHTEXT contentEditable=false>');
    beforeThatElement.parentNode.insertBefore(newRichText,beforeThatElement);
    jc.selectElement(newRichText);
    jc.setModified(true);
    jc.run()
  }

  jc.insertNewSection = function(beforeThatElement) {
    //insert a new section that consist of one title and one div as futur container of embeeded elements
    jc.blockNumber++;
    var $parents = $(beforeThatElement).parentsUntil('BODY');
    var currentLevel = $parents.length+1;
    var newSection = window.document.createElement('<DIV id='+jc.blockId('sect')+' class=SECTION>');
    var title = window.document.createElement('<H'+currentLevel+' class=SECTIONTITLE contentEditable=true>');
    var container = window.document.createElement('<DIV class=SECTIONCONTAINER>');
    newSection.appendChild(title);
    newSection.appendChild(container);
    beforeThatElement.parentNode.insertBefore(newSection,beforeThatElement);
    jc.tableOfContent.updateSections();
    jc.selectElement(newSection);
    jc.setModified(true);
    jc.run();
  }

  jc.paste = function(beforeThatElement) {
    jc.setModified(true);
    var $cut = $('.CUT').detach().removeClass('CUT');
    $(beforeThatElement).before($cut);
    jc.run();
  }

  jc.detachLocalToolBars = function() {
    // detach local tool bars
    jc.topToolBar$.add(jc.bottomToolBar$).add(jc.insideToolBar$).detach();
  }

  jc.moveLocalToolBars = function(element) {
    if (element == undefined) throw new Error('moveLocalToolBar(undefined) is forbidden');

    jc.detachLocalToolBars();
    
    if ($(element).hasClass('EMBEDDED')) {
      return;
    }

    $(element).before(jc.topToolBar$);
    lastElementOfBlock = jc.testElement(element) || jc.outputElement(element) || element;
    $(lastElementOfBlock).after(jc.bottomToolBar$);
    jc.objectToolBar$.children().detach();
                                            
    if ($(element).hasClass('SECTION')) {
      var container$ = $('.SECTIONCONTAINER',element).first()
      if (container$.children().length == 0) {
        container$.append(jc.insideToolBar$);
      }
    }
    else {
      if ($(element).hasClass('RICHTEXT')) {
        jc.objectToolBar$.append(jc.richTextToolBar$);
      }
    }
  }


  jc.$editables = function(element) {
    // returns a JQuery of the tags that are editable in element
    if ($(element).hasClass('SECTION')) return $(element.firstChild);
    return $(element);
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
      jc.$editables(e)
        .attr('contentEditable',false)
        .each(function(i,e){jc.reformatRichText(e)});
    }

    // set the new selection
    jc.selectedElement = element;
    if (element == undefined){
      $('#codeId').text('no selection');
      jc.detachLocalToolBars();
      return;
    }
    jc.menu$.show(500);
    $('#codeId').text(element.id);
    jc.moveLocalToolBars(element);
    $(element).addClass('SELECTED');
    jc.$editables(element).attr('contentEditable',true);
    element.focus();
  }

  // EDI eventHandlers ///////////////////////////////////////////////////////////////

  jc.codeClick = function(event) {
    var code = event.currentTarget; // not target, since target can be an child element, not the div itself
    if ($(code).hasClass('EMBEDDED')) {
      return true; //EMBEDDED code is ruled by its container (richText / section...) so let the event bubble
    }
    jc.selectElement(code);
    return false;  // prevent bubbling
  }

  jc.outClick = function(event) {
    if (event.target.tagName == 'A') {/*a link, just let the system do*/ return true}
    var element = event.currentTarget; // not target, since target can be an child element, not the div itself
    var code = window.document.getElementById(element.id.replace(/out/,"code"))
    if ($(code).hasClass('EMBEDDED')) {
      return true; //EMBEDDED code is ruled by its container (richText / section...) so let the event bubble
    }
    if (jc.selectedElement === code) {
      jc.run(code);
    }
    else {
      jc.selectElement(code);
    }

    return false;  // prevent bubbling
  }

  jc.richTextClick = function(event) {
    var rich = event.currentTarget; // the user clicked on an internal part (title or container).parentNode
    jc.selectElement(rich);
    return false;  // prevent bubbling
  }

  jc.sectionClick = function(event) {
    var section = event.currentTarget; // the user clicked on an internal part (title or container).parentNode
    if (!$(section).hasClass('SECTION')) window.alert("ouups: on click sur un element interne d'une section, mais currentTarget n'est pas une SECTION");
    jc.selectElement(section);
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

  jc.sectionTitleKeyPress = function(event) {
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
    .append(((result !== undefined) && result.$) || jc.format(result).toString())
    .prepend(output.toString())
    .prepend(trace.span().toString())
  }

  jc.displayError = function(error,output) {
    if (error.message) {
      if (error.message == "Erreur d'execution inconnue") {
        error.message += "this block can not be displayed in a {{ inline code}}; use a separate code block"
      }
      var faults = error.message.match(/« (.+?) »/);
      if (faults != null) {
        var fault = faults[1];
        var code = (error.code || '').replace(new RegExp(fault,'g'),'<SPAN class="ERROR">'+fault+'</SPAN>');
      }
      error = error.name+': '+error.message;
    }
    var tag = (output.outputElement.tagName=='SPAN')?'SPAN':'PRE';  // if span, one can only insert span, not div
    output.outputElement.innerHTML = trace.span()+error+(code?'<'+tag+' class="CODEINERROR">'+code+'</'+tag+'>':'');
    $(output.outputElement).removeClass('SUCCESS').addClass('ERROR');
  }


  jc.execCode = function(element) {
    if ($(element).hasClass('DELETED')) return;

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

 
  jc.execAll = function() {
    $('.TRACE').remove();
    jc.clearTimers();
    jc.finalizations = [];
    jc.vars = {}; // run from fresh
    jc.simulation = new Simulation('_simulation');
    jc.tableOfContent.updateSections();
    jc.$editables(jc.selectedElement).each(function(i,e){jc.reformatRichText(e)});
    $('.CODE').each(function(i,e) {jc.execCode(e);});
    jc.finalize();
    jc.setUpToDate(true);
  }

  jc.execUntilSelected = function() {
    $('.TRACE').remove();
    jc.clearTimers();
    jc.finalizations = [];
    jc.vars = {}; // run from fresh
    jc.tableOfContent.updateSections();
    jc.$editables(jc.selectedElement).each(function(i,e){jc.reformatRichText(e)});
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
    window.alert(out.id+':\n'+out.innerHTML+'\n\n'+
                 test.id+':\n'+test.innerHTML);
/*
    var outHtmlId = 'html'+jc.selectedElement.id;
    var outHtml = window.document.getElementById(outHtmlId);
    if (!checkBox.checked && outHtml) {
      outHtml.outerHTML = '';
    }
    var out = jc.outputElement(jc.selectedElement) || jc.selectedElement;
    if (outHtml == undefined) {
      out.insertAdjacentHTML('afterend','<DIV id='+outHtmlId+' class=DEBUG>html</DIV>');
      var outHtml = window.document.getElementById(outHtmlId);
    }
    outHtml.innerHTML = jc.toHtml(out.innerHTML);
*/
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

    // since v0.0110 the menu is fixed in a #menu DIV and all sheet is contained in a #jcContent DIV
    jc.content$ = $('#jcContent').css('border','none');
    if (jc.content$.length == 0) {                                   
      $('BODY').wrapInner('<DIV id=jcContent style="overflow:scroll;"/>');
    }
  }


  $(window).load(function () {
    // upgrades ////////////////////////////////////////////////////
    jc.upgradeModules();
    jc.upgradeFramework();

    // prepare the sheet ///////////////////////////////////////////
    $('.SELECTED').removeClass('SELECTED');
    $('.CODE').live("click",jc.codeClick).live("keypress",jc.editorKeyPress);
    $('.RICHTEXT').live("click",jc.richTextClick).live("keypress",jc.richTextKeyPress);
    $('.SECTIONTITLE').live("keypress",jc.sectionTitleKeyPress);
    $('.EDITOR').live("change",jc.Editor.eventHandler).live("click",jc.Editor.eventHandler);
    $('.OUTPUT').removeClass('SUCCESS').removeClass('ERROR').live("click",jc.outClick);
    $('.SECTION').live("click",jc.sectionClick);
    $('.TEST').removeClass('SUCCESS').removeClass('ERROR');
    $('.INTERACTIVE').live("click",function(event){event.stopPropagation()}); // cancel bubbling of click to let the user control clicks
    jc.findblockNumber();
    jc.initToolBars();
    if ($('.CODE').add('.SECTION').add('.RICHTEXT').length == 0) {  // if really empty sheet
      jc.content$.append(jc.bottomToolBar$)
    }
    $(window).resize(jc.resize).bind('beforeunload',jc.beforeUnload);

    if (window.document.body.autoRun!==false) jc.execAll();
    jc.resize();
  });  
  
  window.onerror = jc.errorHandler;
