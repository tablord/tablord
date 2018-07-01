  // global variables /////////////////////////////////////////////////

  var jc = {codeElementBeingExecuted:undefined,
            currentElement:undefined,
            output:undefined,
            codeElementBeingExecuted:undefined,
            traces:[],
            tracesMaxLength:100,
            localToolBar:undefined,
            htmlIndent:1,
            simulation:undefined, // will be set by StateMachine.js
            blockNumber:0,
            errorHandler:function(message,url,line) {
                var out  = jc.outputElement(jc.codeElementBeingExecuted);
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

  // edi related functions ////////////////////////////////////////////
  var geval = eval;

  jc.securedEval = function(code) {
  // NRT0001
  // a bit more secured: since IE<9 executes localy, it was possible do destroy local variable by defining functions or var
  // with this trick, one can still create global variables by just assigning (eg: v='toto' destroys the global variable v
  // to be checked what could be done to improve

    jc.errorHandler.code = code;
    code = 'var output = jc.output; with (v) {'+code+'};';
    return geval(code)
  }


  // debug //////////////////////////////////////////////////////////



  function a(/*messages*/) {
    var message = '';
    for (var i=0; i<arguments.length; i++){
      message += inspect(arguments[i]);
    }
    window.alert(message);
  }


  function trace(/*messages*/) {
    var message = '';
    for (var i=0; i<arguments.length; i++){
      message += view(arguments[i]);
    }
    jc.traces.push(message);
    if (jc.traces.length > jc.tracesMaxLength) {
      jc.traces.pop();
      jc.traces[0]='...';
    }
  }

  trace.span = function () {
    if (jc.traces.length > 0){
      var h = '<DIV class=TRACE>'+jc.traces.length+' traces:<table class=DEBUG><tr><td class=TRACE>'+jc.traces.join('</td></tr><tr><td class=TRACE>')+'</td></tr></table></DIV>';
      jc.traces = [];
      return h
    }
    return '';
  }


  // object viewers /////////////////////////////////////

  function view(obj) {
    if (typeof obj == 'function') {
      return jc.help(obj);
    }
    if (obj.span) {
      return obj.span();
    }
    if (obj.view) {      
      return obj.view();
    }
    if (obj.outerHTML) { // an Element
      return 'DOM Element<span class="INSPECTHTML">'+jc.toHtml(jc.trimHtml(obj.outerHTML))+'</span>';
    }
    if (obj == '[object Object]') {
      return inspect(obj).span();
    }
    return obj;
  }
  

  // Inspector ////////////////////////////////////////////////////////
  jc.Inspector = function(obj,name,depth) {
    this.obj = obj;
    this.name = name || '';
    this.depth = depth || 1;
  }
  
  jc.Inspector.prototype.toString = function (){
    var r = this.obj+' '+this.name+'\n';
    for (var k in this.obj) { r += k+':  '+this.obj[k]+'\n' };
    return r;
  }

  jc.Inspector.prototype.span = function (depth){
    depth = depth || this.depth;
    if (typeof this.obj == 'string') {
      return '<SPAN class=INSPECT>'+this.obj+'</SPAN>';
    }
    var r = '<DIV class=INSPECT><fieldset><legend>'+((this.obj != '[object Object]')?this.obj:'{}')+' '+this.name+'</legend>';
    r += '<table class=INSPECT>';
    for (var k in this.obj) {
      r += '<tr><th valign="top">'+k+'</th><td valign="top" style="text-align:left;">'+
           (  (typeof this.obj[k] == 'function')?jc.help(this.obj[k]):
                 ((depth == 1)?jc.toHtml(''+this.obj[k]):inspect(this.obj[k]).span(depth-1))
           )
          +'</td></tr>'; 
    };
    return r+'</table></fieldset></DIV>';
  }

  function inspect(obj,name,depth){
    return new jc.Inspector(obj,name,depth);
  }

  // general purpose helpers ////////////////////////////////////////////

  jc.keys = function(obj) {
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

  jc.toHtml = function(htmlCode) {
    // transform htmlCode in such a manner that the code can be visualised in a <code>...
    return htmlCode.replace(/&/g,"&amp;")
                   .replace(/</g,"&lt;")
                   .replace(/>/g,"&gt;")
                   .replace(/\\/g,'\\\\')
                   .replace(/\r/g,'')
                   .replace(/\n/g,"<br>");
  }


  jc.trimHtml = function(html) {
  // suppress all unsignificant blanks and non visible char
    return html.replace(/[ \t\r\n]+/g,' ').replace(/> /,'>').replace(/ </,'<');
  }


  jc.help = function(func) {
  // returns the signature of the function and the first comment in a pretty html 
  // - func: the function to be inspected
    var source = func.toString().split('\n');
    var comments = []
    var signature = source[0].match(/(function.*\))/)[0];
    for (var i=1; i<source.length; i++) {
      var comment = source[i].match(/^\s*\/\/(.*)$/);
      if (comment && (comment.length ==2)) {
        comments.push(comment[1]);
      }
      else break;
    }
    return '<b>'+signature+'</b><br>'+comments.join('<br>');
  }
  
  // Table of Content //////////////////////////////////////////////////////////////////
  

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
               
  jc.removeTags = function(html) {
    var res = html.replace(/<.+?>/g,"")
               .replace(/&nbsp;/g," ")
               .replace(/&lt;/g,"<")
               .replace(/&gt;/g,">")
               .replace(/&amp;/g,"&");
    return res;
  }

  jc.outputElement = function(element) {
    // return the output element associated with element if any
    // if applied on another element than id=codexxxx return undefined;
    if (element.id.slice(0,4) !== 'code') return;
    return window.document.getElementById(element.id.replace(/code/,"out"));
  }

  jc.testElement = function(element) {
    // returns the test element if any
    // if applied on another element than id=codexxxx return undefined;
    if (element.id.slice(0,4) !== 'code') return;
    return window.document.getElementById(element.id.replace(/code/,"test"));
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
      '<BUTTON onclick=jc.insertNewSection(jc.localToolBar);>^ new section ^</BUTTON>'+
      '<BUTTON onclick=jc.insertNewRichText(jc.localToolBar);>^ new richtext ^</BUTTON>'+
      '<BUTTON onclick=jc.insertNewCodeBlock(jc.localToolBar);>^ new code ^</BUTTON>'+
      '<SPAN id=codeId>no element</SPAN>'+
      '<INPUT onclick="$(\'.CODE\').toggleClass(\'HIDDEN\',this.checked);this.scrollIntoView();" type=checkbox>hide codes</INPUT>'+
      '<INPUT onclick="$(\'.DELETED\').toggleClass(\'HIDDEN\',this.checked);this.scrollIntoView();" type=checkbox>hide deleted</INPUT>'+
      '<INPUT onclick="$(\'.TEST\').toggleClass(\'HIDDEN\',this.checked);" type=checkbox>hide tests</INPUT>'+
      '<INPUT onclick="$(\'.TRACE\').toggleClass(\'HIDDEN\',this.checked);" type=checkbox>hide traces</INPUT>'+
      '<DIV class=RICHEDITTOOLBAR style="float:left;">'+
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
      '</DIV>'+
      '<DIV>'+
        '<BUTTON onclick=jc.execAutoExec();>run</BUTTON>'+
        '<BUTTON onclick=jc.execAll();>run all</BUTTON>'+
        '<BUTTON onclick=jc.showOutputHtml(this);>show html</BUTTON>'+
        '<BUTTON onclick=jc.copyOutputToTest(this);>--&gt;test</BUTTON>'+
        '<BUTTON onclick=jc.toggleAutoExec();>autoexec</BUTTON>'+
        '<BUTTON onclick=jc.save();>save</BUTTON>'+
        '<BUTTON onclick=jc.deleteBlock(jc.currentElement);>V delete V</BUTTON>'+
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

  jc.save = function() {
    // save the sheet under fileName or the current name if fileName is not specified
    var fileName = window.location.pathname;
    var fso = new ActiveXObject("Scripting.FileSystemObject");
    var file = fso.OpenTextFile(fileName,2,true);
    file.Write(window.document.documentElement.outerHTML);
    file.Close();
a(fileName+' saved');
  }

  jc.copyOutputToTest = function() {
    var out = jc.outputElement(jc.currentElement);
    var test = jc.testElement(jc.currentElement);
    if (test == undefined) {
      out.insertAdjacentHTML('afterend','<DIV id="'+jc.currentElement.id.replace(/code/,"test")+'" class=TEST>'+out.innerHTML+'</DIV>');
    }
    else {
      test.innerHTML = out.innerHTML;
      $(test).removeClass('ERROR').addClass('SUCCESS');
    }
  }

  jc.deleteBlock = function(codeElement) {
    $(codeElement)
    .add(jc.outputElement(codeElement))
    .add(jc.testElement(codeElement))
    .addClass('DELETED');
  }

  jc.insertNewCodeBlock = function(beforeThatElement) {
    // insert a new code and output DIV 
    // -beforeThatElement is where it must be inserted (usually the localToolBox, but can be any Element)

    jc.blockNumber++;
    var newCode = window.document.createElement('<PRE onclick=jc.editElement(this); class=CODE id='+jc.blockId('code')+' contentEditable=true>');
    var newOutput = window.document.createElement('<DIV class="OUTPUT OLD" onclick=jc.outClick(this) id='+jc.blockId('out')+'>');
    newOutput.innerHTML='no output';
    beforeThatElement.parentNode.insertBefore(newCode,beforeThatElement);
    beforeThatElement.parentNode.insertBefore(newOutput,beforeThatElement);
    $(newCode).bind("keypress",undefined,jc.editorKeyPress);
    jc.editElement(newCode);
  }

  jc.insertNewRichText = function(beforeThatElement) {
    // insert a new richText DIV 
    // -beforeThatElement is where it must be inserted (usually the localToolBox, but can be any Element)
    jc.blockNumber++;
    var newRichText = window.document.createElement('<DIV id='+jc.blockId('rich')+' class=RICHTEXT onclick=jc.editElement(this); contentEditable=false>');
    $(newRichText).bind("keypress",undefined,jc.richTextKeyPress);
    beforeThatElement.parentNode.insertBefore(newRichText,beforeThatElement);
    jc.editElement(newRichText);
  }

  jc.insertNewSection = function(beforeThatElement) {
    //insert a new section that consist of one title and one div as futur container of embeeded elements
    //a bottomToolBar is added in the container
    
    jc.blockNumber++;
    var currentLevel = 1;
    if (beforeThatElement.parentNode != window.document.body) {
      var parentSectionTitle = beforeThatElement.parentNode.previousSibling;
      var tag = parentSectionTitle.tagName;
      if (tag.slice(0,1) === 'H') {
        currentLevel = Number(tag.slice(1))+1;
      }
    }
    var newSection = window.document.createElement('<SECTION id='+jc.blockId('sect')+' class=SECTION>');
    var title = window.document.createElement('<H'+currentLevel+' class=SECTIONTITLE onclick=jc.editElement(this.parentNode); contentEditable=true>');
    var container = window.document.createElement('<DIV class=SECTIONCONTAINER>');
    newSection.appendChild(title);
    newSection.appendChild(container);
    beforeThatElement.parentNode.insertBefore(newSection,beforeThatElement);
    jc.initBottomToolBar(container);
    jc.editElement(newSection);
  }

  jc.editorKeyPress = function(event) {
    var element = event.srcElement;
    $(element.id.replace(/code/,"#out")).removeClass('SUCCESS').removeClass('ERROR');
    $(element.id.replace(/code/,"#test")).removeClass('SUCCESS').removeClass('ERROR');
    if (event.keyCode==10) {  //only IE
      jc.execAutoExec(); 
    }
  }

  jc.richTextKeyPress = function(event) {
    var element = event.srcElement;
    if (event.keyCode==10) {  //only IE
      jc.execAutoExec(); 
    }
  }

  jc.moveLocalToolBar = function(element) {
    var localToolBar = $(jc.localToolBar).removeClass("HIDDEN")[0];
    element.parentNode.insertBefore(localToolBar,element);
    window.document.getElementById('codeId').innerHTML = element.id;
  }

  jc.editElement = function(element) {
    jc.currentElement = element;
    jc.moveLocalToolBar(element);
    if (element.tagName !='SECTION') element.contentEditable=true;
    element.focus();
  }

  jc.outClick = function(element) {
    var code = window.document.getElementById(element.id.replace(/out/,"code"))
    jc.execCode(code);
  }

  jc.execCode = function(element) {

    function displayResult (result,out) {
      try {
        out.innerHTML = trace.span()+view(result);
        $(out).removeClass('ERROR').addClass('SUCCESS');
      }
      catch (e) {
        e.code='displayResult> view(result)'
        displayError(e,out);
      }
    }

    function displayError(error,out) {
      if (error.message) {
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

    //-------------
    if ($(element).hasClass('DELETED')) return;


    jc.codeElementBeingExecuted = element; 
    var out  = jc.outputElement(element);
    var test = jc.testElement(element)
    jc.output = new HTML();
    var res = jc.securedEval(jc.removeTags(element.innerHTML));
    if (res == undefined) {
      displayError('undefined',out);
    }
    else {
      displayResult(res,out);
    }
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

  jc.execAll = function() {
    $('.CODE').each(function(i,e) {jc.execCode(e);});
  }

  jc.execAutoExec = function() {
    if ($(jc.currentElement).hasClass('RICHTEXT')) {
      jc.currentElement.contentEditable=false;
      jc.reformatRichText(jc.currentElement);
    }
    $('.CODE').each(function(i,e) {
      if ($(e).hasClass('AUTOEXEC') || (e==jc.currentElement)) {
        jc.execCode(e);
      }
    })
  }

  jc.reformatRichText = function(element) {
    var mark = /\{\{(.*?)\}\}/;
    var h = element.innerHTML;
    while (h.search(mark)!=-1) {
      h = h.replace(mark,'<SPAN class="CODE AUTOEXEC" id=code'+ jc.blockNumber+' style="DISPLAY: none;">$1</SPAN><SPAN class=OUTPUT id=out'+ jc.blockNumber+'>no output</SPAN>');
      jc.blockNumber++;
    }
    element.innerHTML = h;
  }

  jc.showOutputHtml = function(checkBox) {
    var outHtmlId = 'html'+jc.currentElement.id;
    var outHtml = window.document.getElementById(outHtmlId);
    if (!checkBox.checked && outHtml) {
      outHtml.outerHTML = '';
    }
    var out = jc.outputElement(jc.currentElement) || jc.currentElement;
    if (outHtml == undefined) {
      out.insertAdjacentHTML('afterend','<DIV id='+outHtmlId+' class=DEBUG>html</DIV>');
      var outHtml = window.document.getElementById(outHtmlId);
    }
    outHtml.innerHTML = jc.toHtml(out.innerHTML);
  }

  jc.toggleAutoExec = function() {
    $(jc.currentElement).toggleClass("AUTOEXEC");
  }



  window.attachEvent('onload',function () {
    $('.CODE').bind("keypress",undefined,jc.editorKeyPress);
    $('.RICHTEXT').bind("keypress",undefined,jc.richTextKeyPress);
    $('.OUTPUT').removeClass('SUCCESS').removeClass('ERROR');
    $('.TEST').removeClass('SUCCESS').removeClass('ERROR');
    jc.findblockNumber();
    jc.initLocalToolBar();
    jc.initBottomToolBar();
  });  
  
  window.onerror = jc.errorHandler;
