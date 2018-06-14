
  // edi related functions ////////////////////////////////////////////

  var geval = eval;

  function a(message) {
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
  jc.toHtml = function(htmlCode) {
    // transform htmlCode in such a manner that the code can be visualised in a <code>...
    return htmlCode.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\\/,'\\\\').replace(/\n/,"<br>");
  }

  jc.removeErrors = function(html) {
    return html.replace(/<SPAN class\=ERROR>(.+?)<\/SPAN>/g,"$1")
  }
               
  jc.removeTags = function(html) {
    return html.replace(/<.+?>/g,"")
               .replace(/&nbsp;/g," ")
               .replace(/&lt;/g,"<")
               .replace(/&gt;/g,">")
               .replace(/&amp;/g,"&")
  }

  jc.testElements = function(element) {
    // returns a pseudo array of Elements containing the test values.
    // if no tests returns []

    var testElements = window.document.getElementById(element.id.replace(/code/,"test"));
    return testElements?testElements.children:[];
  }

  jc.editorKeyPress = function(event) {
    var element = event.srcElement;
    window.document.getElementById(element.id.replace(/code/,"out")).children[0].className = 'OLD';
    var tests = jc.testElements(element);
    for (var i = 0;i<tests.length;i++) {
      tests[i].className = 'INFO';
    };
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
    var localToolBar = $('#localToolBar').toggleClass("HIDDEN",false)[0];
    localToolBar.parentNode.insertBefore(localToolBar,element);
    localToolBar.hidden = false;
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

    function displayResult (result) {
      var tag = (out.tagName == 'DIV')?'DIV':'SPAN';
      try {
        out.innerHTML = '<'+tag+' class="SUCCESS">'+view(result)+'</'+tag+'>';
      }
      catch (e) {
        displayError(e);
      }
    }

    function displayError(error,code) {
      if (error.message) {
        var faults = error.message.match(/« (.+?) »/);
        if (faults != null) {
          var fault = faults[1];
          code = (code || '').replace(new RegExp(fault,'g'),'<SPAN class="ERROR">'+fault+'</SPAN>');
        }
        error = error.name+': '+error.message;
      }
      if (out.tagName == 'DIV') {
        out.innerHTML = '<DIV class="ERROR">'+error+(code?'<DIV class="CODEINERROR">'+code+'</DIV>':'')+'</DIV>';
      }
      else {
        out.innerHTML = '<SPAN class="ERROR">'+error+(code?'<SPAN class="CODEINERROR">'+code+'</SPAN>':'')+'</SPAN>';
      }
    }

    //-------------
    try {
      if (jc.codeElementBeingExecuted) {
        throw new Error("re-entry in jc.execCode");
      }

      jc.codeElementBeingExecuted = element; 
      var out = window.document.getElementById(element.id.replace(/code/,"out"));
      tests = jc.testElements(element);
      var code = 'with (v) {'+jc.removeTags(element.innerHTML)+'};';
  
      var res = geval(code);
      if (res == undefined) {
        displayError('undefined');
      }
      else if (res._error) {
        displayError('res._error');
      }
      else {
        displayResult(res);
      }
      for (var i = 0;i<tests.length;i++) {
        var div = tests[i];
        if (div.innerHTML == res) {   //TODO rethink how to compare
          div.className = 'SUCCESS';
        }
        else {
          div.className = 'ERROR';
        }
      }
    }
    catch (e) {
      displayError(e,element.innerHTML);
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
  
