
  // edi related functions ////////////////////////////////////////////

  var geval = eval;

  function a(message) {
    window.alert(message);
  }

  function inspect(obj) {
    var r = '';
    for (var k in obj) { r += k+':'+obj[k]+'  ' };
    return r;
  }

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
    var tests = testElements(element);
    for (var i = 0;i<tests.length;i++) {
      tests[i].className = 'INFO';
    };
    if (event.keyCode==10) {  //only IE
      jc.execCode(element); 
    }
  }

  jc.codeClick = function(element) {
    jc.currentElement = element;
    var localToolBar = $('#localToolBar')[0];
    localToolBar.parentNode.insertBefore(localToolBar,element);
    localToolBar.hidden = false;
    window.document.getElementById('codeId').innerHTML = element.id;
  }

  jc.outClick = function(out) {
    code = window.document.getElementById(out.id.replace(/out/,"code"))
    jc.execCode(code);
  }

  jc.execCode = function(element) {
    if (jc.codeElementBeingExecuted) {
      a("reentré!!!");
      return;
    }

    jc.codeElementBeingExecuted = element; 
    var out = window.document.getElementById(element.id.replace(/code/,"out"));
    tests = jc.testElements(element);
    var code = 'with (v) {'+jc.removeTags(element.innerHTML)+'};';
    try {
      var res = geval(code);
      if (res == undefined) {
        out.innerHTML = '<div class="ERROR">undefined</div>';
      }
      else if (res._error) {
        out.innerHTML = '<div class="ERROR">'+res._error+'</div>';
      }
      else {
        out.innerHTML = '<div class="SUCCESS">'+view(res)+'</div>';
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
      var code = '';
      var faults = e.message.match(/« (.+?) »/);
      if (faults != null) {
        var fault = faults[1];
        code = '<DIV class=CODE>'+element.innerHTML.replace(new RegExp(fault,'g'),'<span class="ERROR">'+fault+'</span>')+'</DIV>';
      }
      out.innerHTML = '<div class="ERROR">'+e.name+': '+e.message+code+'</div>';
    }
    finally {
      jc.codeElementBeingExecuted = undefined;
    }
  }

  jc.execAll = function() {
    $('.CODE').each(function(i,e) {jc.execCode(e);});
  }

  jc.showOutputHtml = function(checkBox) {
    var outHtmlId = jc.currentElement.id.replace(/code/,"html");
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


  jc.debug = function(/*messages*/) {
    var n ='';
    for (var i = 0;i<arguments.length;i++) {
      n += '<DIV>'+arguments[i]+'</DIV>';
    };
    jc.debug.insertAdjacentHTML('beforeend',n);

  };


  window.attachEvent('onload',function () {
    jc.debug = window.document.getElementById('debug');
    jc.debug.innerHTML = '<DIV>debug</DIV>';
    jc.localToolBar = window.document.getElementById('localToolBar');
    $('.CODE').bind("keypress",undefined,jc.editorKeyPress);
  });  
  
