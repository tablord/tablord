// exec.js
//
// everything that is related to the execution of the sheet 
//
// (CC-BY-SA 2019)Marc Nicole  according to https://creativecommons.org/
///////////////////////////////////////////////////////////////////////////////////////////////////////////////



  // edi related functions ////////////////////////////////////////////
  var geval = eval;

  tb.securedEval = function(code) {
  // execute code
  // a bit more secured than eval: since IE<9 executes localy, it was possible do destroy local variable by defining functions or var
  // with this trick, one can still create global variables by just assigning (eg: tb.vars='toto' destroys the global variable tb.vars)
  // to be checked what could be done to improve
    code.replace(/^\s*\{(.*)\}\s*$/,'({$1})');  // if the code is just a litteral object {..} add brakets in order to deal with the with(tb.vars){ } statement

    tb.errorHandler.code = code;
    code = 'var output = tb.output; with (tb.vars) {\n'+code+'\n};';   //output becomes a closure, so finalize function can use it during finalizations
    return geval(code)
  }

  // debug //////////////////////////////////////////////////////////

  function a(/*objects*/) {
    // show a dialog with the text view of the objects
    // returns the last object in order to be able to use a(x) in an expression
    var message = '';
    for (var i=0; i<arguments.length; i++){
      message += tb.inspect(arguments[i]).toString()+'\n';
    }
    window.alert(message);
    return arguments[arguments.length-1];
  }


  function trace(/*objects*/) {
    // write to the trace the content of all objects passed in the parameters
    // use trace.on() to enable traces and trace.off() to disable traces
    // you can also use trace.push() and trace.pop() to save restore the trace states
    if (trace._on) {
      var message = '';
      for (var i=0; i<arguments.length; i++){
        message += tb.inspect(arguments[i]).span();
      }
      trace.messages.push(message);
      if (trace.messages.length > tb.tracesMaxLength) {
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
    // return an html object displaying the traces
    if (trace.messages.length > 0){
      var h = '<DIV class=TRACE>'+trace.messages.length+' traces:<table class=DEBUG><tr><td class=TRACE>'+trace.messages.join('</td></tr><tr><td class=TRACE>')+'</td></tr></table></DIV>';
      trace.messages = [];
      return new tb.HTML(h);
    }
    return '';
  }

  tb.help.update({a:a,trace:trace},'');
  tb.help.update(trace,'trace.');


  // Inspector ////////////////////////////////////////////////////////
  tb.Inspector = function Inspector(obj,depth,name) {
    // Inspector object are made to have both .toString and .span methods
    // so they can be displayed either in an html or plain text context
    // - obj the object to be inspected
    // - depth (default 1) give at what depth object properties are also inspected
    // - name (optional) gives a name to be shown in the display
    this.obj = obj;
    this.name = name || '';
    this.depth = depth || 1;
  }
  tb.Inspector.className = 'tb.Inspector';

  tb.Inspector.prototype.legend = function() {
    // returns the legend for a given object
    var l;
    if ($.isPlainObject(this.obj)) {
      l = '{}';
    }
    else if ($.isArray(this.obj)) {
      l = '[]';
    }
    else if ($.isFunction(this.obj)) {
      l = tb.signature(this.obj);
    }
    else if (this.obj === null) {
      l = 'null';
    }
    else if (this.obj === undefined) {
      l = 'undefined';
    }
    else if (this.obj.toString) {
      l = this.obj.toString();
    }
    else {
      l = 'special object';
    }
    return l;
  }


  tb.Inspector.prototype.toString = function (){
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
      r += k+':  '+tb.summary(this.obj[k])+'\n'
    };
    return r;
  }

  tb.Inspector.prototype.span = function (depth){
    // return a HTML object to display the content of the inspector
    // depth specify at what depth an object property is also inspected
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
      return '<SPAN class=INSPECT>'+tb.toHtml(JSON.stringify(this.obj))+'</SPAN>';
    }
    if (this.obj.toGMTString !== undefined) {
      return '<SPAN class="INSPECT META">'+this.obj.toString()+' (ms:'+this.obj.valueOf()+')</SPAN>';
    }
    var r = '<DIV class=INSPECT><fieldset><legend>'+this.legend()+' '+this.name+'</legend>';
    r += '<table>';
    for (var k in this.obj) {
      if (k==='constructor') continue;
      r += '<tr><th valign="top">'+k+'</th><td valign="top" style="text-align:left;">'+
           (  (typeof this.obj[k] == 'function')?tb.help(this.obj[k]):
                 ((depth == 1)?tb.toHtml(this.obj[k]):tb.inspect(this.obj[k]).span(depth-1))
           )
          +'</td></tr>';
    };
    return new tb.HTML(r+'</table></fieldset></DIV>');
  }


  tb.inspect = function(obj,depth,name){
    // return an Inspector object so obj can be displayed either in an html or plain text context
    // - depth (default 1) give at what depth object properties are also inspected
    // - name (optional) gives a name to be shown in the display
    return new tb.Inspector(obj,depth,name);
  }

  tb.codeExample = function(example) {
    // return an html object with example wrapped in span class=CODEEXAMPLE
    return tb.html('<span class=CODEEXAMPLE>'+example+'</span>');
  }


  // navigation within document ////////////////////////////////////////////////////////
  tb.sectionBeingExecuted$ = function() {
    // returns a jQuery containing the deepest section that contains the code currently in execution
    return $(tb.currentElementBeingExecuted).closest('.SECTION');
  }

  tb.testStatus = function() {
    // set a finalize function that will write to the current output the number of test Failure
    // in the section that includes the code that executes this function
    // mostly used in a small code inside the title of a section to summerize the tests below
    var output = tb.output; // closure on tb.output
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

  tb.updateResultsTestStatus = function() {
    // updates tb.results.testStatus with the number of test passed vs failed
    tb.results.testStatus = {
      nbPassed : $('.TEST.SUCCESS').length,
      nbFailed : $('.TEST.ERROR').length,
      dateTime : new Date()
    };
    return tb.results;
  }


  // Editor ////////////////////////////////////////////////////////////////////////////
  tb.EditableObject = function (){
  // tb.EditableObject is an interface that must be implemented by any object that want to be editable within the sheet
  // [[tb.Table]] and [[tb.Var]] are typical class that implement the *EditableObject* interface
  // all methods of this class are empty: the declarations are here only for documentation
  //   .codeElement property that must be created by .edit() and must containt the [[CODE]] [[ELEMENT]] that contains the .edit() function
  //                and that will be updated after edition and become also [[AUTOEDIT]]
  //
    throw new Error('abstract class: do not instanciate')
  }
  tb.EditableObject.className = 'tb.EditableObject';

  tb.EditableObject.prototype.edit = function(){
  // similar to .span() but return html code representing the object in edition.
  // usually .edit() calls [[tb.editor.html]](...) in order to get the necessary html code that will
  // interact with tb.editor
    throw new Error('abstract method')
  }

  tb.EditableObject.prototype.getEditableValue = function(editor){
  //  will be called by the editor when the user selects a given [[EDITOR]] element
  //  this is the responsibility of the object to look on editor's properties that are specific to this
  //  object to know how to get the value. the returned value can be a simple type (undefined,number,string)
  //  or a function. if this function has a .code property, it is considered to be a tbFunc and .code represents
  //  only the body of the function (usually an expression)
    throw new Error('abstract method')
  }

  tb.EditableObject.prototype.setEditableValue = function(editor){
  // will be called by the editor when the user has finished to edit a given value.
  // this method has the responsibility to upgrade the code
    throw new Error('abstract method')
  }

  tb.EditableObject.prototype.updateCode = function(){
  // this function must replace the code of the [[CODE]] [[ELEMENT]] (that is stored in .codeElement of this)

  }

  tb.Editor = function (){
  // the goal of Editor is to offer a genenral mechanism in order to help implement
  // tbObject edition capabilities.
  // it is implemented as a class in order to get the documentation eventhought there is only one single instance [[tb.editor]]
  // this mechanism is the following:
  // an object that would like to propose edition capabilities has to offer the following [[TbObject]] interface
  //   .codeElement this property must be created by edit() and must containt the codeElement that contains the .edit() function
  //                and that will be updated after edition
  //
  //
  //--------------
  //  - tb.editor is a single instance object that provides most of the services and that dialogs with the DOM elements composing
  //              the user interface.
  //
  //  - tb.editor.html(...) return html code needed to create the editor for a simple value
  //                      if the value is simple (undefined, number, string or function) it will
  //                      be handled natively.
  //                      if value is an object, it will return the code of object.edit()
  //                      TODO: provide mechanism for simple object / arrays
  //
  //  - tb.editor.simpleTypeToolBar$ a jQuery storing the necessary toolBar for the simple types
  //

    //participant IDE
    //participant tb.editor
    //note over .CODE: represents the CODE\nELEMENT containing\n "tbObject.edit()"
    //note over .OUTPUT: the .OUTPUT that will\ncontain all .EDITOR\n for tbObject
    //note over .EDITOR: is a child ELEMENT\n of .OUTPUT
    //note over tbObject:name:'myVar'
    //IDE -> IDE: .execCode
    //IDE -> tbObject:edit()
    //note right of tbObject:usually gets html code from tb.editor
    //tbObject -> tb.editor: .html(value,{tbObject:'myVar'})
    //tb.editor -->tbObject: <input class=EDITOR tbobject="myVar">
    //tbObject --> IDE: <div...all .EDITORs needed to edit myVar>

    // create a tool bar for the [[tb.Editor]]
    this.toolBar$ = $('<div>')
      .append('<input type="radio" name="type" value="string" autocomplete="off" onclick="tb.editor.force(\'string\');">String')
      .append('<input type="radio" name="type" value="number" autocomplete="off" onclick="tb.editor.force(\'number\')">Number')
      .append('<input type="radio" name="type" value="function" autocomplete="off" onclick="tb.editor.force(\'function\')">Function')
      .append(this.funcCode$=$('<input type="text"  name="funcCode" value="" onchange="tb.editor.funcCodeChange();" onclick="tb.editor.funcCodeClick();">'))
      .append('<input type="radio" name="type" value="undefined" autocomplete="off" onclick="tb.editor.force(\'undefined\')">undefined')
      .hide();
    tb.menu.objectToolBar$.append(this.toolBar$);
  }
  tb.Editor.className = 'tb.Editor';

  tb.Editor.prototype.funcCodeClick = function() {
    // click event handler of the code INPUT of the toolbar of the [[tb.Editor]]
    this.force('function');
    $('[value=function]',this.toolBar$).prop('checked',true);
    this.funcCode$.focus();
  }

  tb.Editor.prototype.funcCodeChange = function() {
    // change event handler of the code INPUT of the toolbar of the [[tb.Editor]]
    this.value = f(this.funcCode$.val());
    this.type = 'function';
    this.tbObject.setEditableValue(this);
    return false; //?????
  }


  tb.Editor.prototype.force = function(type) {
    // force the [[tb.Editor]] to a given type
    // type can be undefined, function, number or string
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
        this.value = (this.value!==undefined)?this.value.toString():'undefined';
        this.funcCode$.val('');
        break;
    }
    this.type = type;
    tb.editorEventHandler({target:this.currentEditor,type:'change'}); // synchronusly run the change event
    //editor$.triggerHandler('change');  // will update the value, update the code, run the sheet and so updage the editors and tool bars
    this.setCurrentEditor(this.currentEditor); // will refresh the toolbar and refocus the editor according to the new situation
  }


  tb.Editor.prototype.setCurrentEditor = function(editor) {
    // set an editor as the current Editor
    this.currentEditor = editor;
    if (editor) {
      this.tbObject = tb.vars[$(editor).attr('tbObject')];
      this.value = this.tbObject.getEditableValue(this);
      this.type = (this.value && this.value.isV)?'function':typeof this.value;
      var radio$ = $('[value='+this.type+']',this.toolBar$);
      radio$.prop('checked',true);
      this.toolBar$.show();
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
    else {
      this.toolBar$.hide();
    }
  }

  tb.Editor.prototype.attr = function(attr) {
    // return the attr value of the html editor
    return $(this.currentEditor).attr(attr);
  }

  tb.Editor.prototype.html = function(value,params) {
    // value : the initial value of the editor
    // params : an object that at least has tbObject:nameOfTheObject in tb.vars

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

    var h = '<INPUT class="EDITOR '+type+'"'+tb.htmlAttribute('value',value);
    for (var p in params) {
      h += tb.htmlAttribute(p,params[p]);
    }
    h += '>';
    return h;
  };




  ////////////
  //TODO: there is problem at least in IE7: when the users click on another control, first a change event is triggerd
  //normally it should be followed by a click envent, but as the control is destroyed and re-created, it seems to "capture" the next click
  //event
  // ?????? peut être qu'avec un setTimeout(0) on peut passer outre, en laissant d'abord le click se faire et en updatant le code via le timer
  //  pas mieux : l'evenement click n'arrive jamais sur l'endroit où on a cliqué et si dans le change on return true, c'est encore pire, on ne retrouve
  //              jamais le focus.  %*&@
  ////////////

  tb.editorEventHandler = function(event) {
    // the event handler for all .EDITOR that will recieve click, keypress and change event
    var target$ = $(event.target);
    var obj = tb.vars[target$.attr('tbObject')];
    if (obj == undefined) throw new Error('event on a editor linked to a non existing object '+$(event.target).attr('tbObject'));
    switch (event.type) {
      case 'click':
        if (obj.codeElement !== tb.selected.element) {
          tb.selectElement(obj.codeElement);
        }
        tb.editor.setCurrentEditor(event.target);
      return false; // prevent bubbling

      case 'change':
        var value = target$.val();
        switch (tb.editor.type) {
          case 'number':
            if (!isNaN(Number(value))) {
              value = Number(value);
            }
            else {
              tb.editor.force('string');
              return false; // a new event will take place and finish the job
            }
            break;
          case 'function':
            value = f(tb.editor.funcCode$.val());
            break;
          case 'undefined':
            value = undefined;
            break;
        }
        tb.editor.value = value;
        obj.setEditableValue(tb.editor);
        return false;

      default :
        window.alert('unexpected event',event.type)
        return true;
    }
  }


  // Table of Content //////////////////////////////////////////////////////////////////
  tb.tableOfContent = {
    toc : [],
    reset : function () {
      tb.tableOfContent.toc = [];
    },
    update : function () {
      var currentNumbers = [];
      this.toc = [];
      $('.SECTION').each(function (i,e) {
        if ($(e).hasClass('CUT')) return;
        var title = $('.SECTIONTITLE',e)[0];
        var level = tb.level(e);

        currentNumbers[level] = (currentNumbers[level] || 0)+1;
        currentNumbers.length = level+1;
        var number = currentNumbers.join('.');
        var t = title.innerHTML.replace(/^[\d\.]*(\s|\&nbsp;)*/,'');
        title.outerHTML = '<H'+(level+1)+' class="SECTIONTITLE EDITABLE" contentEditable='+(e===tb.selected.element)+'>'+number+' '+t+'</H'+(level+1)+'>';
        tb.tableOfContent.toc.push({number:number,level:level,title:tb.textContent(t),sectionId:e.id});
      });
    },
    find : function(title) {
      return this.toc[tb.findInArrayOfObject({title:title},this.toc)];
    },
    span : function() {
      var h = '<DIV class=INTERACTIVE>';
      $.each(this.toc,function(i,t){
        h += '<div class=TOC'+t.level+'>'+t.number+' <a href="#'+t.sectionId+'">'+t.title+'</a></div>'
      });
      return new tb.HTML(h+'</DIV>');
    }
  };
  tb.features.push(tb.tableOfContent);

  // Notes //////////////////////////////////////////////////////////////////////////////
  tb.note = function(html,ref) {
    // insert a note into the [[tb.notes]] having the html given in parameter
    // if ref is present ref is associated with the note and can be reused with [[tb.ref]] function
    // returns an html object wth the note number
    tb.notes.entries.push({html:html,ref:ref});
    if (ref) tb.notes.refs[ref] = {no:tb.notes.entries.length,nbRefs:0};
    return tb.html('<a class=REF id=cite_ref'+tb.notes.entries.length+' href="#cite_note'+tb.notes.entries.length+'" title="'+html+'"><sup>['+tb.notes.entries.length+']</sup></a>');
  }

  tb.ref = function(ref) {
    // insert a reference to an already existing note
    var r = tb.notes.refs[ref];
    if (r === undefined) throw new Error('unknown ref "'+ref+'"');
    r.nbRefs++;
    return tb.html('<a class=REF id=cite_ref'+r.no+'_'+r.nbRefs+' href="#cite_note'+r.no+'" title="'+tb.notes.entries[r.no-1].html+'"><sup>['+r.no+']</sup></a>');
  }

  tb.notes = function() {
    // returns an html object with all the foot notes
    var h = ''
    for (var no = 1; no<= tb.notes.entries.length; no++) {
      h += '<div id=cite_note'+no+'><b>'+no+'</b>&nbsp;<a href="#cite_ref'+no+'">&#8593;</a>';
      var e = tb.notes.entries[no-1];
      var r = tb.notes.refs[e.ref];
      var nb = r?r.nbRefs:0;
      for (var n = 1; n<=nb; n++) {
        h += '<a href="#cite_ref'+no+'_'+n+'">&#8593;</a>';
      }
      h += e.html+'</div>';
    }
    return tb.html(h);
  }

  tb.notes.reset = function(){
    // reset the notes
    tb.notes.entries = [];
    tb.notes.refs = {};
  }

  tb.features.push(tb.notes);

  tb.link = function(text,url) {
    // if no url is given, text is used as a search into table of content to find the section
    // url can be either a full url or an id of an [[ELEMENT]]
    // TODO: futur version will accept http url
    url = url || text;
    var e$ = $('#'+url);
    if (e$.length==1) {
      return new tb.HTML('<a class=LINK href="#'+url+'">'+text+'</a>');
    }
    var entry = tb.tableOfContent.find(url);
    if (entry) {
      return new tb.HTML('<a class=LINK href="#'+entry.sectionId+'">'+text+'</a>');
    }
    return new tb.HTML('<span class=INVALIDLINK title="#'+url+' is not found in the table of content">'+text+'</span>');
  }

  tb.elementBox = function(text,id) {
    // return an html object that has a clickable text that will open a box with the copy of the element id
    // - id: the id of the element to display in the box like "rich0007"
    //       if id is not found, it will try to find id as a [[SECTIONTITLE]]
    //       if id == undefined text is used as id or title
    id = id || text;
    var e$ = $('#'+id);
    if (e$.length == 1) {
      return tb.html('<span class=BOXLINK data-showId="#'+id+'">'+text+'</span>');
    }
    var entry = tb.tableOfContent.find(id);
    if (entry) {
      return new tb.HTML('<span class=BOXLINK data-showId="#'+entry.sectionId+'">'+text+'</span>');
    }
    return new tb.HTML('<span class=INVALIDLINK title="#'+id+' is not found">'+text+'</span>');
  }

  tb.openCloseBox = function(event) {
    //
    var boxTextElement = event.target;
    var box$ = $('.BOX',boxTextElement)
    var open = box$.length === 0;
    box$.remove();
    if (open) {
      var id = $(boxTextElement).attr('data-showId');
      $('<DIV class=BOX>').html($(id).html()).appendTo(boxTextElement);
    }
    event.stopPropagation(); // prevent bubbling of the event
  }

  tb.level = function(element) {
    // returns the level of the element = number of section between body and the element
    // please note that the first section has level = 0 according to this definition
    // (but the title will be a <H1>)
    return $(element).parentsUntil('BODY').filter('.SECTION').length;
  }

  tb.findblockNumber = function() {
    // search the next block number in an existing document
    $('.ELEMENT').each(function(i,e) {
      var n = Number(e.id.slice(4));
      if (!isNaN(n)) {
        tb.blockNumber = Math.max(tb.blockNumber,n);
      }
    });
    tb.blockNumber++;
  }

  tb.blockId = function(prefix) {
    // increment tb.blockNumber and
    // return the block id using prefix which must be a 4 characters prefix
    if (prefix.length !== 4) throw new Error('Element Id must hace a 4 char prefix for the id')
    return prefix+tb.pad(tb.blockNumber++,4);
  }
  
  tb.blockPrefix = function(id) {
    return id.slice(0,4);
  }

  tb.outputElement$ = function(element$) {
    // return the output element associated with element$ if any
    // if applied on another element than id=codexxxx return an empty jquery;
    var id = element$.attr('id');
    if (!id || id.slice(0,4) !== 'code') return $();
    var outId = id.replace(/code/,"out");
    var out$ = $('#'+outId);
    if (out$.length === 0) {
      var tag = (element$.attr('tagName')==='SPAN')?'SPAN':'DIV';
      out$ = $('<'+tag+' class=OUTPUT id='+outId+'>no output</'+tag+'>').insertAfter(element$);
    }
    return out$;
  }

  tb.testElement$ = function(element$) {
    // returns the test element if any
    // if applied on another element than id=codexxxx return an empty jquery;
    var id = element$.attr('id');
    if (!id || id.slice(0,4) !== 'code') return $();
    return $('#'+id.replace(/code/,"test"));
  }
