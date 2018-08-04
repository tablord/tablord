  // global variables /////////////////////////////////////////////////

  var jc = {name:'JCalc',
            version:'0.1',
            authors:['Marc Nicole'],
            selectedElement:undefined,
            output: {}, //a new Output is created for each code. 
                        //it hold both the code and output Elements as well as the htlm
                        //at init an empty object so _codeElement and _outputElement are undefined
            traces:[],
            tracesMaxLength:100,
            localToolBar:undefined,
            htmlIndent:1,
            simulation:undefined, // will be set by StateMachine.js
            blockNumber:0,
            finalizations:[],     // a stack of output to be finalized
            
            modified:false,       // file is modified

            vars:{},              // where all user variables are stored

            defaults:{
              format:{            // default formating methods  this can be redefined in some JCalc objects like v table... in options.
                undef:function(){return '<SPAN style=color:red;>undefined</SPAN>'},
                emptStr:function(){return '<SPAN style=color:red;>empty string</SPAN>'},
                func:function(f){return jc.help(f)},
                array:function(a){return a.toString()},              
                domElement:function(element){return 'DOM Element<SPAN class="INSPECTHTML">'+jc.toHtml(jc.trimHtml(jc.purgeJQueryAttr(obj.outerHTML)))+'</SPAN>'},
                obj:function(obj){return jc.inspect(obj).span()},
                date:function(date){return date.yyyymmdd()},
                number:function(n){return n.toString()}
              }
            },

            errorHandler:function(message,url,line) {
                var out  = jc.output._outputElement;
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
    return function (n) {return n.toFixed(decimals)};
  }

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

    
    

  //JQuery extentions /////////////////////////////////////////////////
  $.prototype.span = function() {
    var s = [];
    for (var i=0; i < this.length; i++) {
      s.push(i+': <code class="INSPECTHTML">'+jc.toHtml(jc.trimHtml(jc.purgeJQueryAttr(this[i].outerHTML)))+'</code>');
    }
    return new jc.HTML('JQuery of '+this.length+' elements<br>'+s.join('<br>'));
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
      else return obj.toJson();
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
    if (trace.on) { 
      var message = '';
      for (var i=0; i<arguments.length; i++){
        message += jc.inspect(arguments[i]).span();
      }
      jc.traces.push(message);
      if (jc.traces.length > jc.tracesMaxLength) {
        jc.traces.pop();
        jc.traces[0]='...';
      }
    }
  }

  trace.on = true;  // user can disable trace with trace.on = false anywhere in its code
  
  trace.span = function () {
    if (jc.traces.length > 0){
      var h = '<DIV class=TRACE>'+jc.traces.length+' traces:<table class=DEBUG><tr><td class=TRACE>'+jc.traces.join('</td></tr><tr><td class=TRACE>')+'</td></tr></table></DIV>';
      jc.traces = [];
      return new jc.HTML(h);
    }
    return '';
  }

  

  // Inspector ////////////////////////////////////////////////////////
  jc.Inspector = function(obj,name,depth) {
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
    

  jc.help = function(func) {
  // returns the signature of the function and the first comment in a pretty html 
  // - func: the function to be inspected
  // if func is undefined returns all helps of all installed modules
    if (func == undefined) {
      var h = '';
      for (var module in jc.helps) {
        h += jc.inspect(jc.helps[module],module).span();
      }
      return new jc.HTML(h);
    }

    var source = func.toString().split('\n');
    var comments = []
    var signature = source[0].match(/(function.*?\))/)[0];
    for (var i=1; i<source.length; i++) {
      var comment = source[i].match(/^\s*\/\/(.*)$/);
      if (comment && (comment.length ==2)) {
        comments.push(jc.toHtml(comment[1]));
      }
      else break;
    }
    return new jc.HTML('<b>'+signature+'</b><br>'+comments.join('<br>'));
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
      var section = $(output._codeElement).closest('.SECTION');
      var numberOfSuccess= section.find('.TEST.SUCCESS').length;
      var numberOfErrors = section.find('.TEST.ERROR').length;
      output.html(
        '<SPAN class='+(numberOfErrors==0?'SUCCESS':'ERROR')+'>tests passed:'+numberOfSuccess+' failed:'+numberOfErrors+'</SPAN>'
      )}
    );
  }

  jc.helps.jc = {inspect:jc.inspect,
                 keys:jc.keys,copy:jc.copy,pad:jc.pad,toString:jc.toString,toHtml:jc.toHtml,
                 codeExample:jc.codeExample,findInArrayOfObject:jc.findInArrayOfObject,help:jc.help,testStatus:jc.testStatus,
                 /*tableOfContent:jc.tableOfContent,*/link:jc.link
  };

  
  // Table of Content //////////////////////////////////////////////////////////////////
  jc.tableOfContent = {
    toc : [],
    updateSections : function (element) {
      var currentNumbers = [];
      this.toc = [];
      $('.SECTION').each(function (i,e) {
        if ($(e).hasClass('DELETED')) return;
        var title = e.firstChild;
        var level = Number(title.tagName.slice(1))-1;
        currentNumbers[level] = (currentNumbers[level] || 0)+1;
        currentNumbers.length = level+1;
        var number = currentNumbers.join('.');
        var t = title.innerHTML.replace(/^[\d\.]*(\s|\&nbsp;)*/,'');
        title.innerHTML = number+' '+t;
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
    if (element.id.slice(0,4) !== 'code') return;
    var outId = element.id.replace(/code/,"out");
    var out = window.document.getElementById(outId);
    if (out == undefined) {
      var tag = (element.tagName=='SPAN'?'SPAN':'DIV');
      out = $('<'+tag+' class=OUTPUT id='+outId+'>no output</'+tag+'>')[0];
      $(out).bind("click",undefined,jc.outClick).insertAfter(element);
    }
    return out;
  }

  jc.testElement = function(element) {
    // returns the test element if any
    // if applied on another element than id=codexxxx return undefined;
    if (element.id.slice(0,4) !== 'code') return;
    return window.document.getElementById(element.id.replace(/code/,"test"));
  }

  jc.hideCode = function(event) {
    var button = event.target || window.event.srcElement; //IE7 compatibility
    $('.CODE').toggleClass('HIDDEN',button.checked);
    button.scrollIntoView();
    window.document.body.hideCode=button.checked;
  }

  jc.hideDeleted = function(event) {
    var button = event.target || window.event.srcElement; //IE7 compatibility
    $('.DELETED').toggleClass('HIDDEN',button.checked);
    button.scrollIntoView();
    window.document.body.hideDeleted=button.checked;
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
    window.document.body.autoRun=button.checked;
  }
      
  jc.initLocalToolBar = function() {
    jc.localToolBar = $('#localToolBar')[0];  // start with localToolBar hidden so that its position is irrelevent
    if (jc.localToolBar == undefined) {
      jc.localToolBar = window.document.createElement('DIV');
      jc.localToolBar.id='localToolBar';
      window.document.body.insertBefore(jc.localToolBar,window.document.body.lastChild);
    }
    $(jc.localToolBar).addClass('HIDDEN');
    jc.localToolBar.innerHTML = 
      '<DIV>'+
        '<BUTTON onclick=jc.insertNewSection(jc.localToolBar);>&#8593; new section &#8593;</BUTTON>'+
        '<BUTTON onclick=jc.insertNewRichText(jc.localToolBar);>&#8593; new richtext &#8593;</BUTTON>'+
        '<BUTTON onclick=jc.insertNewCodeBlock(jc.localToolBar);>&#8593; new code &#8593;</BUTTON>'+
      '</DIV>'+
      '<DIV>'+
        '<SPAN id=codeId>no element</SPAN>'+
        '<INPUT onclick="jc.hideCode(event)"'+(window.document.body.hideCode===true?' checked':'')+' type=checkbox>hide codes</INPUT>'+
        '<INPUT onclick="jc.hideDeleted(event)"'+(window.document.body.hideDeleted===true?' checked':'')+' type=checkbox>hide deleted</INPUT>'+
        '<INPUT onclick="jc.hideTest(event)"'+(window.document.body.hideTest===true?' checked':'')+' type=checkbox>hide tests</INPUT>'+
        '<INPUT onclick="jc.hideTrace(event)"'+(window.document.body.hideTrace===true?' checked':'')+' type=checkbox>hide traces</INPUT>'+
        '<INPUT onclick="jc.autoRun(event)"'+(window.document.body.autoRun!==false?' checked':'')+' type=checkbox>auto run</INPUT>'+
        '<BUTTON onclick=jc.hideToolBars();>hide ToolBars</BUTTON>'+
      '</DIV>'+
      '<DIV class=RICHEDITTOOLBAR>'+
        '<BUTTON onclick=jc.richedit.bold();><b>B</b></BUTTON>'+ 
        '<BUTTON onclick=jc.richedit.italic();><i>i</i></BUTTON>'+ 
        '<BUTTON onclick=jc.richedit.underline();><U>U</U></BUTTON>'+ 
        '<BUTTON onclick=jc.richedit.strike();><strike>S</strike></BUTTON>'+ 
        '<BUTTON onclick=jc.richedit.h1();><b>H1</b></BUTTON>'+ 
        '<BUTTON onclick=jc.richedit.h2();><b>H2</b></BUTTON>'+ 
        '<BUTTON onclick=jc.richedit.div();>div</BUTTON>'+ 
        '<BUTTON onclick=jc.richedit.p();>&#182;</BUTTON>'+ 
        '<BUTTON onclick=jc.richedit.ol();>#</BUTTON>'+ 
        '<BUTTON onclick=jc.richedit.ul();>&#8226;</BUTTON>'+ 
        '<BUTTON onclick=jc.richedit.pre();>{}</BUTTON>'+ 
        '<BUTTON id=runUntilSelectedBtn onclick=jc.execUntilSelected(); style=color:green;>&#9658;|</BUTTON>'+
        '<BUTTON id=runAllBtn onclick=jc.execAll(); style=color:green;>&#9658;&#9658;</BUTTON>'+
        '<BUTTON onclick=jc.showOutputHtml(this);>show html</BUTTON>'+
        '<BUTTON onclick=jc.copyOutputToTest(this);>&#8594;test</BUTTON>'+
        '<BUTTON onclick=jc.toggleAutoExec();>autoexec</BUTTON>'+
        '<BUTTON id="saveBtn" onclick="jc.save();">save</BUTTON>'+
        '<BUTTON onclick=jc.deleteBlock(jc.selectedElement);>&#8595; delete &#8595;</BUTTON>'+
      '</DIV>';
  }

  jc.initBottomToolBar = function (section) {
    // makes sure that the last element of the section is a bottom tool bar
    // if section is undefined, the document body is used 
    // if needed a new bottomToolBar is created

    section = section || window.document.body
    var bottomToolBar = section.lastChild;
    if ((bottomToolBar == undefined) || (! $(bottomToolBar).hasClass('BOTTOMTOOLBAR'))) {
      bottomToolBar = window.document.createElement('DIV');
      bottomToolBar.className = 'BOTTOMTOOLBAR';
      section.appendChild(bottomToolBar);
    }
    bottomToolBar.innerHTML = 
      '<BUTTON onclick=jc.insertNewSection(this.parentNode);>^ new section ^</BUTTON>'+
      '<BUTTON onclick=jc.insertNewRichText(this.parentNode);>^ new rich text ^</BUTTON>'+
      '<BUTTON onclick=jc.insertNewCodeBlock(this.parentNode);>^ new code ^</BUTTON>';
  }

  jc.setModified = function(state) {
    jc.modified = state;
    $('#saveBtn').toggleClass('MODIFIED',state);
  }

  jc.save = function() {
    // save the sheet under fileName or the current name if fileName is not specified
    var fileName = window.prompt('save this sheet in this file?',window.location.pathname);
    if (fileName == undefined) return;
    window.document.documentElement.APPLICATIONNAME = fileName;
    jc.removeDeletedBlocks();
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
    var out = jc.outputElement(jc.selectedElement);
    var test = jc.testElement(jc.selectedElement);
    if (test == undefined) {
      out.insertAdjacentHTML('afterend','<DIV id="'+jc.selectedElement.id.replace(/code/,"test")+'" class=TEST>'+out.innerHTML+'</DIV>');
    }
    else {
      test.innerHTML = out.innerHTML;
      $(test).removeClass('ERROR').addClass('SUCCESS');
    }
  }

  jc.deleteBlock = function(element,del) {
    del = del || !$(element).hasClass('DELETED');
    $(element)
    .add(jc.outputElement(element))
    .add(jc.testElement(element))
    .find('*')
    .andSelf()
    .toggleClass('DELETED',del);
    jc.setModified(true);
  }

  jc.removeDeletedBlocks = function() {
    $('.DELETED').remove();
  }

  jc.insertNewCodeBlock = function(beforeThatElement) {
    // insert a new code and output DIV 
    // -beforeThatElement is where it must be inserted (usually the localToolBox, but can be any Element)

    jc.blockNumber++;
    var newCode = window.document.createElement('<PRE onclick=jc.selectElement(this); class=CODE id='+jc.blockId('code')+' contentEditable=true>');
    var newOutput = jc.outputElement(newCode);
    beforeThatElement.parentNode.insertBefore(newCode,beforeThatElement);
    beforeThatElement.parentNode.insertBefore(newOutput,beforeThatElement);
    $(newCode).bind("keypress",undefined,jc.editorKeyPress);
    jc.selectElement(newCode);
    jc.setModified(true);
  }

  jc.insertNewRichText = function(beforeThatElement) {
    // insert a new richText DIV 
    // -beforeThatElement is where it must be inserted (usually the localToolBox, but can be any Element)
    jc.blockNumber++;
    var newRichText = window.document.createElement('<DIV id='+jc.blockId('rich')+' class=RICHTEXT onclick=jc.selectElement(this); contentEditable=false>');
    $(newRichText).bind("keypress",undefined,jc.richTextKeyPress);
    beforeThatElement.parentNode.insertBefore(newRichText,beforeThatElement);
    jc.selectElement(newRichText);
    jc.setModified(true);
  }

  jc.insertNewSection = function(beforeThatElement) {
    //insert a new section that consist of one title and one div as futur container of embeeded elements
    //a bottomToolBar is added in the container
    jc.setModified(true);
    
    jc.blockNumber++;
    var currentLevel = 1;
    if (beforeThatElement.parentNode != window.document.body) {
      var parentSectionTitle = beforeThatElement.parentNode.previousSibling;
      var tag = parentSectionTitle.tagName;
      if (tag.slice(0,1) === 'H') {
        currentLevel = Number(tag.slice(1))+1;
      }
    }
    var newSection = window.document.createElement('<DIV id='+jc.blockId('sect')+' class=SECTION>');
    var title = window.document.createElement('<H'+currentLevel+' class=SECTIONTITLE onclick=jc.selectElement(this.parentNode); contentEditable=true>');
    var container = window.document.createElement('<DIV class=SECTIONCONTAINER>');
    newSection.appendChild(title);
    $(title).bind("keypress",undefined,jc.sectionTitleKeyPress);
    newSection.appendChild(container);
    beforeThatElement.parentNode.insertBefore(newSection,beforeThatElement);
    jc.initBottomToolBar(container);
    jc.tableOfContent.updateSections();
    jc.selectElement(newSection);
  }

  jc.editorKeyPress = function(event) {
    jc.setModified(true);
    var element = event.srcElement;
    $(element.id.replace(/code/,"#out")).removeClass('SUCCESS').removeClass('ERROR');
    $(element.id.replace(/code/,"#test")).removeClass('SUCCESS').removeClass('ERROR');
    if (event.keyCode==10) {  //only IE
      jc.execUntilSelected(); 
    }
  }

  jc.richTextKeyPress = function(event) {
    jc.setModified(true);
    var element = event.srcElement;
    if (event.keyCode==10) {  //only IE
      jc.execUntilSelected(); 
    }
  }

  jc.sectionTitleKeyPress = function(event) {
    jc.setModified(true);
  }

  jc.moveLocalToolBar = function(element) {
    var localToolBar = $(jc.localToolBar).removeClass("HIDDEN")[0];
    element.parentNode.insertBefore(localToolBar,element);
    window.document.getElementById('codeId').innerHTML = element.id;
  }

  jc.$editables = function(element) {
    // returns a JQuery of the tags that are editable in element
    if ($(element).hasClass('SECTION')) return $(element.firstChild);
    return $(element);
  }

  jc.hideToolBars = function() {
    $('.BOTTOMTOOLBAR').add(jc.localToolBar).addClass('HIDDEN');
    jc.selectElement(undefined);
  }

  jc.selectElement = function(element) {
    var e = jc.selectedElement;
    if (e === element) {
      e.focus();
      return;
    }
    $(e).removeClass('SELECTED');
    jc.$editables(e)
    .attr('contentEditable',false)
    .each(function(i,e){jc.reformatRichText(e)});
    $('.BOTTOMTOOLBAR').addClass('HIDDEN');
    jc.selectedElement = element;
    if (element == undefined){
      $(jc.localToolBar).addClass('HIDDEN');
      return;
    }

    jc.moveLocalToolBar(element);
    $(element).addClass('SELECTED');
    jc.$editables(jc.selectedElement).attr('contentEditable',true);
    element.focus();
    //show only the necessary BottomToolBars
    while (element != null) {
      if ($(element).hasClass('SECTION')){
        $(element.lastChild.lastChild).removeClass('HIDDEN');
      }
      element = element.parentNode;
    }
    $(window.document.body.lastChild).removeClass('HIDDEN');
  }

  jc.outClick = function(event) {
    var element = event.currentTarget; // not target, since target can be an child element, not the div itself
    var code = window.document.getElementById(element.id.replace(/out/,"code"))
    jc.selectElement(code);
    jc.execUntilSelected(code);
  }

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
    if (obj === undefined) {
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

  jc.displayResult = function(result,out) {
      var h = jc.format(result);    // result has to be calculated first, since programmer can use trace in functions like span()
      out.innerHTML = trace.span()+h;
      $(out).removeClass('ERROR').addClass('SUCCESS');
  }

  jc.displayError = function(error,out) {
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
    var tag = (out.tagName=='SPAN')?'SPAN':'PRE';  // if span, one can only insert span, not div
    out.innerHTML = trace.span()+error+(code?'<'+tag+' class="CODEINERROR">'+code+'</'+tag+'>':'');
    $(out).removeClass('SUCCESS').addClass('ERROR');
  }


  jc.execCode = function(element) {
    if ($(element).hasClass('DELETED')) return;

    var out  = jc.outputElement(element);
    var test = jc.testElement(element)
    jc.output = newOutput(element,out);
    var res = jc.securedEval(jc.toString(element.innerHTML));
    jc.displayResult(res,out);
    // test
    if (test != undefined) {
      if (jc.trimHtml(out.innerHTML) == jc.trimHtml(test.innerHTML)) {   //TODO rethink how to compare
        $(test).removeClass('ERROR').addClass('SUCCESS');
      }
      else {
        $(test).removeClass('SUCCESS').addClass('ERROR');
      }
    }
  }

  jc.finalize = function() {
    for (var i=0;i<jc.finalizations.length;i++) {
      var out = jc.finalizations[i];
      jc.errorHandler.code = out._finalize+''; 
      out._finalize();
      out._finalize = undefined;  // so that displayResult will not show ... to be finalized...
      jc.displayResult(out,out._outputElement);
    }
  }

  jc.execAll = function() {
    jc.finalizations = [];
    jc.vars = {}; // run from fresh
    jc.tableOfContent.updateSections();
    jc.$editables(jc.selectedElement).each(function(i,e){jc.reformatRichText(e)});
    $('.CODE').each(function(i,e) {jc.execCode(e);});
    jc.finalize();
  }

  jc.execUntilSelected = function() {
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
    jc.finalize();
  }

  jc.reformatRichText = function(element) {
    if ((element == undefined) || ($(element).hasClass('CODE'))) return;
    var mark = /\{\{[#]?(.*?)\}\}/;
    var h = element.innerHTML;
    var idx=-1;
    while ((idx=h.search(mark))!=-1) {
      jc.blockNumber++;
      if (h.charAt(idx+2) == '#') {
        h = h.replace(mark,'<SPAN class="CODE AUTOEXEC" id='+ jc.blockId('code')+' style="DISPLAY: none;">jc.link("$1")</SPAN><SPAN class=OUTPUT contentEditable=false id='+ jc.blockId('out')+'>no output</SPAN>');
      }
      h = h.replace(mark,'<SPAN class="CODE AUTOEXEC" id='+ jc.blockId('code')+' style="DISPLAY: none;">$1</SPAN><SPAN class=OUTPUT contentEditable=false id='+ jc.blockId('out')+'>no output</SPAN>');
    }
    element.innerHTML = h;
  }

  jc.showOutputHtml = function(checkBox) {
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
  }

  jc.toggleAutoExec = function() {
    $(jc.selectedElement).toggleClass("AUTOEXEC");
  }



  window.attachEvent('onload',function () {
    // upgrades ////////////////////////////////////////////////////
    jc.upgradeModules();

    $('*').removeClass('OLD');  // not in use anymore
    $('.OUTPUT').removeAttr('onclick');  // no longer in the HTML but bound dynamically
 
    // prepare the sheet ///////////////////////////////////////////
    $('.SELECTED').removeClass('SELECTED');
    $('.CODE').bind("keypress",undefined,jc.editorKeyPress);
    $('.RICHTEXT').bind("keypress",undefined,jc.richTextKeyPress);
    $('.SECTIONTITLE').bind("keypress",undefined,jc.sectionTitleKeyPress);
    $('.OUTPUT').removeClass('SUCCESS').removeClass('ERROR').bind("click",undefined,jc.outClick);
    $('.TEST').removeClass('SUCCESS').removeClass('ERROR');
    jc.findblockNumber();
    jc.initLocalToolBar();
    jc.initBottomToolBar();
    window.onbeforeunload = jc.beforeUnload;

    if (window.document.body.autoRun!==false) jc.execAll();
  });  
  
  window.onerror = jc.errorHandler;
