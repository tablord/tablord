
  // edi related functions ////////////////////////////////////////////

  var geval = eval;

  function a(message) {
    window.alert(message);
  }

  function inspect(obj) {
    var a = [];
    for (var k in obj) { a.push(k)};
    return a;
  }

  function htmlToStr(html) {
    return html.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\n/,"<br>");
  }

  function removeTagsAndErrors(html) {
    return html.replace(/<p class\="ERROR">.+?<\/p>/g,"")
               .replace(/<.+?>/g,"")
               .replace(/&nbsp;/," ")
  }

  function testElements(element) {
    // returns a pseudo array of Elements containing the test values.
    // if no tests returns []

    var testElements = window.document.getElementById(element.id.replace(/code/,"test"));
    return testElements?testElements.children:[];
  }

  function editorKeyPress(event) {
    var element = event.srcElement;
    window.document.getElementById(element.id.replace(/code/,"out")).children[0].className = 'OLD';
    var tests = testElements(element);
    for (var i = 0;i<tests.length;i++) {
      tests[i].className = 'INFO';
    };

    if (event.keyCode==10) {
      
      execCode(element); //only IE
    }
  }

  function codeClick(element) {
    jc.currentElement = element;
    var localToolBar = $('#localToolBar')[0];
    localToolBar.parentNode.insertBefore(localToolBar,element);

    execCode(element);
  }

  function execCode(element) {
    jc.codeElementBeingExecuted = element; 
    var out = window.document.getElementById(element.id.replace(/code/,"out"));
    tests = testElements(element);
    var code = 'with (v) {'+removeTagsAndErrors(element.innerHTML)+'};';
    element.attachEvent("onkeypress",editorKeyPress);
    try {
      var res = geval(code);
      if (res == undefined) {
        out.innerHTML = '<div class="ERROR">undefined</div>';
      }
      else if (res._error) {
        out.innerHTML = '<div class="ERROR">'+res._error+'</div>';
      }
      else {
        out.innerHTML = view(res);
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
      out.innerHTML = '<div class="ERROR">'+e.name+': '+e.message+'<br>'+htmlToStr(code)+'</div>';
    }
    jc.codeElementBeingExecuted = undefined;
  }

  function execAll() {
    $('.CODE').each(function(i,e) {execCode(e);});
  }

  function debug(/*messages*/) {
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

  });  
  
