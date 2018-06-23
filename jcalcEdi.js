
  // edi related functions ////////////////////////////////////////////
  var geval = eval;

  function securedEval(code) {
  // NRT0001
  // a bit more secured: since IE<9 executes localy, it was possible do destroy local variable by defining functions or var
  // with this trick, one can still create global variables by just assigning (eg: v='toto' destroys the global variable v
  // to be checked what could be done to improve
    return geval(code)
  }

  function a(/*messages*/) {
    var message = '';
    for (var i=0; i<arguments.length; i++){
      message += inspect(arguments[i]);
    }
    window.alert(message);
  }

  // Inspector ////////////////////////////////////////////////////////
  jc.Inspector = function(obj) {
    this.obj = obj;
  }
  

  jc.Inspector.prototype.toString = function (){
    var r = this.obj+'\n';
    for (var k in this.obj) { r += k+':  '+this.obj[k]+'\n' };
    return r;
  }

  jc.Inspector.prototype.span = function (){
    var r = '<h3>'+this.obj+'</h3><table>';
    for (var k in this.obj) { r += '<tr><th valign="top">'+k+'</th><td valign="top" style="text-align:left;">'+jc.toHtml(''+this.obj[k])+'</td></tr>' };
    return r+'</table>';
  }

  function inspect(obj){
    return new jc.Inspector(obj);
  }

  // helpers ///////////////////////////////////////////////////////////
  jc.copy = function(obj) {
    // makes a copy of obj this version only copies the first level
    // does not copy any inheritance (result is an Object instance)
    var o = {};
    for (var k in obj) {
      o[k] = obj[k]
    }
    return o;
  }


  jc.toHtml = function(htmlCode) {
    // transform htmlCode in such a manner that the code can be visualised in a <code>...
    return htmlCode.replace(/&/g,"&amp;")
                   .replace(/</g,"&lt;")
                   .replace(/>/g,"&gt;")
                   .replace(/\\/,'\\\\')
                   .replace(/\r/,'\\r')
                   .replace(/\n/,"\\n<br>");
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

  jc.trimHtml = function(html) {
  // suppress all unsignificant blanks and non visible char
    return html.replace(/[ \t\r\n]+/g,' ').replace(/> /,'>').replace(/ </,'<');
  }

  jc.testElement = function(element) {
    // returns the test element if any

    return window.document.getElementById(element.id.replace(/code/,"test"));
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
      element.contentEditable=false;
    }
  }

  jc.codeClick = function(element) {
    jc.currentElement = element;
    var localToolBar = $('#localToolBar').removeClass("HIDDEN")[0];
    localToolBar.parentNode.insertBefore(localToolBar,element);
    window.document.getElementById('codeId').innerHTML = element.id;
  }

  jc.richTextClick = function(element) {
    jc.currentElement = element;
    var localToolBar = $('#localToolBar').toggleClass("HIDDEN",false)[0];
    element.contentEditable=true;
    localToolBar.parentNode.insertBefore(localToolBar,element);
    window.document.getElementById('codeId').innerHTML = element.id;
  }

  jc.outClick = function(element) {
    var code = window.document.getElementById(element.id.replace(/out/,"code"))
    jc.execCode(code);
  }

  jc.execCode = function(element) {

    function displayResult (result,out) {
      try {
        out.innerHTML = view(result);
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
          code = (error.code || '').replace(new RegExp(fault,'g'),'<SPAN class="ERROR">'+fault+'</SPAN>');
        }
        error = error.name+': '+error.message;
      }
      var tag = (out.tagName=='SPAN')?'SPAN':'PRE';  // if span, one can only insert span, not div
      out.innerHTML = error+(code?'<'+tag+' class="CODEINERROR">'+code+'</'+tag+'>':'');
      $(out).removeClass('SUCCESS').addClass('ERROR');
    }

    //-------------
    try {
      if (jc.codeElementBeingExecuted) {
        throw new Error("re-entry in jc.execCode");
      }

      jc.codeElementBeingExecuted = element; 
      var out  = window.document.getElementById(element.id.replace(/code/,"out"));
      var test = window.document.getElementById(element.id.replace(/code/,"test"));
  
      var code = 'output = new HTML(); with (v) {'+jc.removeTags(element.innerHTML)+'};';
      var res = securedEval(code);
      if (res == undefined) {
        displayError('undefined',out);
      }
      else if (res._error) {
        displayError('res._error',out);
a('ce code est il encore utile??');
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
    catch (e) {
      e.code = (e.code || '')+element.innerHTML;
      displayError(e,out);
    }
    finally {
      jc.codeElementBeingExecuted = undefined;
    }
  }

  jc.execAll = function() {
    $('.CODE').each(function(i,e) {jc.execCode(e);});
  }

  jc.execAutoExec = function() {
    $('.CODE').each(function(i,e) {
      if ($(e).hasClass('AUTOEXEC') || (e==jc.currentElement)) {
        jc.execCode(e);
      }
    })
  }

  jc.showOutputHtml = function(checkBox) {
    var outHtmlId = jc.currentElement.id.replace(/(rich)|(code)/,"html");
    var outHtml = window.document.getElementById(outHtmlId);
    if (!checkBox.checked && outHtml) {
      outHtml.outerHTML = '';
    }
    var out = window.document.getElementById(jc.currentElement.id.replace(/code/,"out"));
    if (outHtml == undefined) {
      out.insertAdjacentHTML('afterend','<DIV id='+outHtmlId+' class=DEBUG>html</DIV>');
      var outHtml = window.document.getElementById(outHtmlId);
    }
    outHtml.innerHTML = jc.toHtml(out.innerHTML);
  }

  jc.toggleAutoExec = function() {
    $(jc.currentElement).toggleClass("AUTOEXEC");
  }


  jc.debug = function(/*messages*/) {
    var n ='';
    for (var i = 0;i<arguments.length;i++) {
      n += '<DIV>'+arguments[i]+'</DIV>';
    };
    jc.debug.insertAdjacentHTML('beforeend',n);

  };


  window.attachEvent('onload',function () {
    jc.debug = window.document.getElementById('debug');
    jc.localToolBar = window.document.getElementById('localToolBar');
    $('.CODE').bind("keypress",undefined,jc.editorKeyPress);
    $('.RICHTEXT').bind("keypress",undefined,jc.richTextKeyPress);
  });  
  
