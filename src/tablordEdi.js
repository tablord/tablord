// tablordEdi.js
//
// everything that is related to the EDI 
//
// (CC-BY-SA 2019)Marc Nicole  according to https://creativecommons.org/
///////////////////////////////////////////////////////////////////////////////////////////////////////////////



  //////////////////////////////////////////////////////////////////////////////////////
  // EDI ///////////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////////////

  tb.richedit = {
    exec:      function(command,value) {window.document.execCommand(command,false,value || null)},
    bold:      function(){tb.richedit.exec('bold')},
    italic:    function(){tb.richedit.exec('italic')},
    underline: function(){tb.richedit.exec('underline')},
    strike:    function(){tb.richedit.exec('strikeThrough')},
    h1:        function(){tb.richedit.exec('formatBlock','<h1>')},
    h2:        function(){tb.richedit.exec('formatBlock','<h2>')},
    div:       function(){tb.richedit.exec('formatBlock','<div>')},
    p:         function(){tb.richedit.exec('formatBlock','<p>')},
    ol:        function(){tb.richedit.exec('insertOrderedList')},
    ul:        function(){tb.richedit.exec('insertUnorderedList')},
    pre:       function(){tb.richedit.exec('formatBlock','<pre>')}
  }

  tb.initMenu = function() {
    tb.dialogs = {};
    tb.dialogs.showHtml$ = $(
    	'<div id="showHtml" class="modal fade no_print" role="dialog">'+
    	  '<div class="modal-dialog" role="document">'+
    		'<div class="modal-content">'+
    		  '<div class="modal-header">'+
    			'<h5 class="modal-title" id="showHtmlTitle">Show Html</h5>'+
    			'<button type="button" class="close" data-dismiss="modal" aria-label="Close">'+
    			  '<span aria-hidden="true">&times;</span>'+
    			'</button>'+
    		  '</div>'+
    		  '<div class="modal-body" id="showHtmlBody"></div>'+
    		'</div>'+
    	  '</div>'+
    	'</div>'
    );
    
    tb.menu = {};
    tb.menu.$ = $(
    	'<div id="menu" class="TOOLBAR no_print" style="float:right;max-width:50%;">'+
            '<div class="btn-toolbar mb-1" role="toolbar" aria-label="main buttons">'+
                '<div class="btn-group btn-group-sm mr-2" role="group" aria-label="run btns">'+
                    '<button id="runUntilSelectedBtn" type="button" class="btn btn-dark"  onclick=tb.execUntilSelected(); style="color: #8dff60;" ><i class="fas fa-step-forward"></i></button>'+
                    '<button id="runAllBtn" type="button" class="btn btn-dark" onclick=tb.execAll(); style="color: #8dff60;" ><i class="fas fa-play"></i></button>'+
                    '<button id="stopAnimation" type="button" class="btn btn-dark" onclick=tb.clearTimers(); style="color: red" disabled=true ><i class="fas fa-stop"></i></button>'+
                '</div>'+
                '<div class="btn-group btn-group-sm mr-2" role="group" aria-label="actions on sheet">'+
                    '<button id="saveBtn" type="button" class="btn btn-dark"><i class="fas fa-cloud-upload-alt"></i></button>'+
                    '<button id="printBtn" type="button" class="btn btn-dark"><i class="fas fa-print"></i></button>'+
                    '<button id="helpBtn" type="button" class="btn btn-dark"><i class="fas fa-question-circle"></i></button>'+
                    '<button id="btnGroupDrop1" type="button" class="btn btn-dark dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false"><i class="fas fa-cog"></i></button>'+
                    '<div class="dropdown-menu" aria-labelledby="btnGroupDrop1">'+
                        '<a class="dropdown-item" id="clearOutputsBtn" onclick="tb.clearOutputs();" >clear outputs</a>'+
                        '<input id="showCode" type=checkbox>code<br/>'+
                        '<input id="showCut" type=checkbox>cut<br/>'+
                        '<input id="showDeleted" type=checkbox>deleted<br/>'+
                        '<input id="showTest" type=checkbox>test<br/>'+
                        '<input id="showTrace" type=checkbox>trace<br/>'+
                        '<input id="autoRun" type=checkbox>auto run'+
                    '</div>'+
                '</div>'+
            '</div>'+
            '<div id="selectionToolBar">'+
        		'<div class="btn-toolbar" role="toolbar">'+
        			'<div class="btn-group btn-group-sm mr-2" role="group">'+
        				'<button id="codeId" type="button" class="btn btn-outline-dark">no selection</button>'+
        				'<button id="markBtn" class="btn btn-dark" title="mark the selected element"><i class="far fa-check-square"></i></button>'+
        				'<button id="cutBtn" class="btn btn-dark" title="cut marked elements"><i class="fas fa-cut"></i></button>'+
        				'<button id="copyBtn" class="btn btn-dark" title="copy cut/marked/selected element"><i class="fas fa-copy"></i></button>'+
        				'<button id="deleteBtn" class="btn btn-dark" title="delete marked/selected element"><i class="fas fa-trash"></i></button>'+
        				'<button id="restoreBtn" class="btn btn-dark" title="show deleted elements to undelete"><i class="fas fa-trash-restore"></i></button>'+
        				'<button id="pasteBtn" class="btn btn-dark title="paste cut elements" where="afterItemscope" template="https://tablord.com/templates/paste" >'+
        					'<i class="fas fa-paste"></i></button>'+
        				'<button id="moveUpBtn" class="btn btn-dark" title="move selected before previous element"><i class="fas fa-arrow-up"></i></button>'+
        				'<button id="moveDownBtn" class="btn btn-dark" title="move selected after previous element"><i class="fas fa-arrow-down"></i></button>'+
        				'<button id="showHtmlBtn" class="btn btn-dark">&#8594;html</button>'+
        				'<button id="toTestBtn">&#8594;test</button>'+
                    '</div>'+
        			'<div id="insertAfter" class="btn-group btn-group-sm mr-2" role="group" where="afterItemscope">'+
                        '<button id="insertSectionBtn" class="btn btn-dark" title="section" template="https://tablord.com/templates/section">'+
        					'<i class="fas fa-heading"></i></button>'+
        				'<button id="insertText" class="btn btn-dark" title="Text" template="https://tablord.com/templates/richText">'+
        					'<i class="fas fa-paragraph"></i></button>'+
        				'<button id="cloneEmptyBtn" class="btn btn-dark" title="empty copy of selected element"><i class="far fa-clone"></i></button>'+
                        '<button id="insertCodeBtn" class="btn btn-dark" title="code" template="https://tablord.com/templates/code">{}</button>'+
                        '<button id="insertTemplateBtn" class="btn btn-dark dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">...</button>'+
        				'<div id="templateChoice" class="dropdown-menu"></div>'+
        			'</div>'+
        		'</div>'+
        		'<div id="objectToolBar"></div>'+
    			'<div>'+
                  '<details id="properties"><summary>properties</summary>'+
                    '<input id="itemprop" type="text" placeholder="itemprop">'+
                    '<input id="itemtype" placeholder="itemtype"><br>'+
                    '<input id="func" placeholder="function code">'+
                    '<input id="format" placeholder="format"><br>'+
                    
                    '<input type="radio" name="type" value="number">number '+
                    '<input type="radio" name="type" value="string">string '+
                    '<input type="radio" name="type" value="date">date<br> '+
    
                    'c-<input type="radio" name="layout" value="c-1">1 '+
                    '<input type="radio" name="layout" value="c-2">2 '+
                    '<input type="radio" name="layout" value="c-3">3 '+
                    '<input type="radio" name="layout" value="c-4">4 '+
                    '<input type="radio" name="layout" value="c-5">5 '+
                    '<input type="radio" name="layout" value="c-6">6 '+
                    '<input type="radio" name="layout" value="c-7">7 '+
                    '<input type="radio" name="layout" value="c-8">8 '+
                    '<input type="radio" name="layout" value="c-9">9 '+
                    '<input type="radio" name="layout" value="c-10">10 '+
                    '<input type="radio" name="layout" value="c-11">11 '+
                    '<input type="radio" name="layout" value="c-12">12<br>'+
                    
                    '<input type="radio" name="severity" value="INFO">INFO '+
                    '<input type="radio" name="severity" value="OK">OK '+
                    '<input type="radio" name="severity" value="WARNING">WARNING '+
                    '<input type="radio" name="severity" value="DANGER">DANGER '+
                    '<input type="radio" name="severity" value="">--<br>'+
                    '<input type="checkbox" value="FLEX">FLEX<br>'+
                    '<input type="checkbox" value="NOTE">NOTE<br>'+
                    '<input type="checkbox" value="ADDRESS">ADDRESS<br>'+
                  '</details>'+
                '</div>'+
            '</div>'+
			'<div id="helpPanel">'+
				'<button id="hideHelpBtn" style="color:red;cursor:pointer;">&nbsp;&#215;&nbsp;</button>'+
				'<input id="helpSearch" placeholder="help search"/>'+
			    '<div id="helpOutput" style="overflow:auto;max-height:400px;"></div>'+
			'</div>'+
			'<div id="debug" style="overflow:auto;max-height:400px;"></div>'+
		'</div>'+
        ''
    );
    // create in tb.menu one xxxx$ jquery having the button, input... that has an id
    $('body').prepend(tb.menu.$);
    // for easier access and better perf
    $('[id]',tb.menu.$).each(function(){
      var e$ = $(this);
      if (tb[this.id+'Click']) e$.click(tb[this.id+'Click']); // if a corresponding function bind it
      if (tb[this.id+'Change']) e$.click(tb[this.id+'Change']); // if a corresponding function bind it
      
      tb.menu[this.id+'$'] = e$;
    });
    tb.menu.runUntilSelectedBtn$.click(tb.execUntilSelected);
    tb.menu.runAllBtn$.click(tb.execAll);
    tb.menu.stopAnimation$.click(tb.clearTimers);
    tb.menu.saveBtn$.click(tb.save);
    tb.menu.helpBtn$.click(function(){tb.menu.helpPanel$.toggle(100)});

    tb.menu.showCode$.prop('checked',tb.sheetOptions.showCode);
    tb.menu.showCut$.prop('checked',tb.sheetOptions.showCut);
    tb.menu.showDeleted$.prop('checked',tb.sheetOptions.showDeleted);
    tb.menu.showTest$.prop('checked',tb.sheetOptions.showTest);
    tb.menu.showTrace$.prop('checked',tb.sheetOptions.showTrace);
    tb.menu.autoRun$.prop('checked',tb.autoRun);
    
    tb.menu.insertAfter$.click(tb.templateButtonClick);
    
    tb.menu.selectionToolBar$.hide();
    
    tb.menu.properties$.click(function(event){
      $(event.currentTarget).children().each(function(){
        var className = $(this).val()
        if (className) {
           tb.selected.element$.toggleClass(className,$(this).prop('checked'))
        }
      })
      tb.setModified(true);
    })
    .change(function(event){
      var e$ = tb.selected.element$;
      if (tb.menu.itemprop$.val()) e$.attr('itemprop',tb.menu.itemprop$.val())
      else e$.removeAttr('itemprop');
      if (tb.menu.itemtype$.val()) e$.attr('itemitype',tb.menu.itemtype$.val())
      else e$.removeAttr('itemtype');
      if (tb.menu.func$.val()) e$.attr('func',tb.menu.func$.val())
      else e$.removeAttr('func');
      if (tb.menu.format$.val()) e$.attr('format',tb.menu.format$.val())
      else e$.removeAttr('format');
      tb.run();
      tb.setModified(true);
    })
 
    tb.updateTemplateChoice();
    
    tb.menu.helpSearch$.keyup(tb.helpSearchKeyup);
  }
  //////////////////////////////////////////////////////////////////////////////
  // event handler for button input etc ////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////
  // a function that is xxxxxxClick or xxxxxxChange is automatically bound to the 
  // click or change event of the button id="xxxxxx"
  
  tb.showCodeClick = function(event) {
    // click event handler for the show Code checkbox
    var button = event.target || window.event.srcElement; //IE7 compatibility
    $('.CODE').toggleClass('HIDDEN',!button.checked);
    tb.sheetOptions.showCode = button.checked;
  }

  tb.showCutClick = function(event) {
    // click event handler for the show cut checkbox
    var button = event.target || window.event.srcElement; //IE7 compatibility
    $('.CUT').toggleClass('HIDDEN',!button.checked);
    tb.sheetOptions.showCut = button.checked;
  }

  tb.showDeletedClick = function(event) {
    // click event handler for the show cut checkbox
    var button = event.target || window.event.srcElement; //IE7 compatibility
    $('.CUT').toggleClass('HIDDEN',!button.checked);
    tb.sheetOptions.showCut = button.checked;
  }
  
  tb.showTestClick = function(event) {
    // click event handler for the show test checkbox
    var button = event.target || window.event.srcElement; //IE7 compatibility
    $('.TEST').toggleClass('HIDDEN',!button.checked);
    tb.sheetOptions.showTest = button.checked;
  }

  tb.showTraceClick = function(event) {
    // click event handler for the show trace checkbox
    var button = event.target || window.event.srcElement; //IE7 compatibility
    $('.TRACE').toggleClass('HIDDEN',!button.checked);
    tb.sheetOptions.showTrace = button.checked;
  }

  tb.setAutoRunClick = function(event) {
    // click event handler for the auto run checkbox
    var button = event.target || window.event.srcElement; //IE7 compatibility
    tb.autoRun = button.checked;
    $('body').attr('autoRun',tb.autoRun);
  }

  tb.printBtnClick = function(event) {
    // click event handler for the print button
    tb.selectElement(undefined);
    window.print();
  }

  tb.moveUpBtnClick = function(event) {
    // simple version: at itemscope boundaries
    tb.moveElement(tb.selected.element$.itemscopeOrThis(),'before');
  }
  
  tb.moveDownBtnClick = function(event) {
    // simple version: at itemscope boundaries
    tb.moveElement(tb.selected.element$.itemscopeOrThis(),'after');
  }
  
  tb.toTestBtnClick = function(event) {
    tb.copyOutputToTest();
  }
  
  tb.hideHelpBtnClick = function(event) {
    tb.menu.helpPanel$.hide(300);
  }
  
  tb.helpSearchKeyup = function(event) {
    // event handler for the help search box
    tb.menu.helpOutput$.html(tb.help.index.help$(event.currentTarget.value));
  }

  tb.markBtnClick = function(event) {
    // simple version marks only Selected Element
    var target$ = event.shiftKey?tb.selected.element$:tb.selected.element$.itemscopeOrThis();
    target$.toggleClass('MARKED');
  }
  
  tb.cutBtnClick = function(event) {
    // simple version
    // TODO choose if itemscope / element etc... taking shift keys into consideration
    tb.cutBlock(tb.selected.element$.itemscopeOrThis());
  }

  tb.deleteBtnClick = function(event) {
    // look for MARKED elements or if none for SELECTED element
    // and add the DELETED class
    var e$ = $('.MARKED')
    if (e$.length === 0) {
      e$ = event.shiftKey?tb.selected.element$:tb.selected.element$.itemscopeOrThis();
    }
    if (e$.hasClass('DELETED')) {
      e$.removeClass('DELETED');
      return;
    }
    if (e$.hasClass('SELECTED')) tb.selectElement(undefined);
    e$.removeClass('MARKED').addClass('DELETED');
  }

  tb.templateButtonClick = function(event) {
    var where = $(event.target).closest('[where]').attr('where');
    var template = $(event.target).closest('[template]').attr('template');
    if (where===undefined || template === undefined) return;
    tb.templates[template].insertNew(tb.selected.element,where,tb.selected.container$.attr('container'));
    event.stopPropagation(); // in order to have embedded buttons like the drop down menu
                             // otherwise the event will be treated twice issue #13
  }

  tb.showHtmlBtnClick = function(event) {
    if (tb.selected.element$.hasClass('CODE')) {
      var out = tb.outputElement$(tb.selected.element$)[0] || {id:'no output',innerHTML:''};
      var test = tb.testElement$(tb.selected.element$)[0] || {id:'no test',innerHTML:''};
      var hout  = out.innerHTML;
      var htest = test.innerHTML;
      diff = tb.diff(hout,htest).span().toString();
      $('#showHtmlBody').html(
        '<fieldset><legend>'+tb.selected.element.id+'</div></legend><div  class=CODEEXAMPLE>'+tb.toHtml(tb.selected.element.outerHTML)+'</fieldset>'+
        '<fieldset><legend>diff <span class="DIFF DEL">output</span> vs <span class="DIFF ADD">test</legend>'+diff+'</fieldset>')
    }
    else {
      $('#showHtmlBody').html(
        '<fieldset><legend>'+tb.selected.element.id+'</legend>'+tb.toHtml(tb.selected.element.outerHTML)+'</fieldset>')
    }
    $('#showHtml').modal()
  }

  // method to manipulate the document /////////////////////////////////////////
  
  tb.updateTemplateChoice = function() {
    // update the template selection box according to the context i.e. the acceptedTemplate of the current container
    tb.menu.templateChoice$.empty();
    var acceptedTemplates = tb.selected.container$.attr('templates');
    if (acceptedTemplates) {
      acceptedTemplates = acceptedTemplates.split(' ');
    }
    else {
      acceptedTemplates = tb.keys(tb.templates);
    }
    for (var i=0;i<acceptedTemplates.length;i++) {
      var template = tb.templates[acceptedTemplates[i]];
      if (template) tb.menu.templateChoice$.append(
        '<button class="dropdown-item" template="'+template.url+'">'+template.name+'</button>'
      );
    }
  }

  tb.setModified = function(state) {
    // set the modified state and modify the save button accordingly
    tb.modified = state;
    tb.menu.saveBtn$.toggleClass('btn-warning',state).toggleClass('btn-dark',!state);
  }

  tb.setUpToDate = function(state) {
    // set if the sheet is up to date or not (has to be re-run)
    if (state === tb.setUpToDate.state) return;
    if (state) {
      tb.menu.runAllBtn$.removeClass('btn-warning').addClass('btn-dark');
    }
    else {
      tb.menu.runAllBtn$.removeClass('btn-dark').addClass('btn-warning');
      $('.OUTPUT').add('.TEST').removeClass('SUCCESS ERROR');
    }
    tb.setUpToDate.state = state;
  }

  tb.clearOutputs = function() {
    // remove all outputs
    $('.OUTPUT').remove();
  }

  tb.saveRemote = function() {
    // save to a remote server
    var csrftoken = jQuery("[name=csrfmiddlewaretoken]").val();
    tb.removeCutBlocks();
    tb.selectElement(undefined);
    $.post(window.location,
            {csrfmiddlewaretoken:csrftoken,
             toBeSaved:$('#tbContent').html()},
            function(data){
                tb.menu.debug$.html(data);
                tb.setModified(false);
            })
    .fail(function(data){tb.menu.debug$.html(data)})
  }

  tb.save = tb.saveRemote;


  tb.pushTestResults = function() {
    // send the test result to the server
    var csrftoken = jQuery("[name=csrfmiddlewaretoken]").val();
    $.post(window.location,
            {csrfmiddlewaretoken:csrftoken,
             passed:tb.results.testStatus.nbPassed,
             failed:tb.results.testStatus.nbFailed,
             testTime:tb.results.testStatus.dateTime.toISOString()},
            function(data){
                if (tb.url.arguments.test_close) {
                    tb.canClose=true; // this will be polled by the test laucher
                }
                tb.menu.debug$.html(data);
            })
    .fail(function(data){tb.menu.debug$.html(data)})
  }


  tb.beforeUnload = function(event) {  //TODO avec hta, ne fonctionne pas bien
    // event handler before closing check if a save is needed and desired
    if (tb.modified) {
      event.returnValue='ouups?';
      return 'ouups?'
    }
  }

  tb.copyOutputToTest = function() {
    // set the current element's output as the test element if no test element existed or if it failed
    // if a SUCCESS test existed, remove the test
    if (tb.selected.element == undefined) return;

    var out$ = tb.outputElement(tb.selected.element);
    var test$ = tb.testElement(tb.selected.element);
    if (test$.length === 0) {
      out$.after($('<DIV id="'+tb.selected.element.id.replace(/code/,"test")+'" class="TEST SUCCESS">'+out.innerHTML+'</DIV>'));
    }
    else if (!test$.hasClass('SUCCESS')) {
      test$.html(out$.html()).removeClass('ERROR').addClass('SUCCESS');
    }
    else {
      test$.remove();
    }
    tb.setModified(true);
  }

  
  tb.cutBlock = function(element$,cut) {
    // cut or "uncut" element
    // if cut is true or false, set the cut state
    // if cut is undefined, toggle the cut state
    cut = cut || !element$.hasClass('CUT');
    element$
    .add(tb.outputElement$(element$))  // TODO: all those function should have JQuery as parameter
    .add(tb.testElement$(element$))
    .toggleClass('CUT',cut);
    tb.setModified(true);
    tb.setUpToDate(false);
  }

  tb.removeCutBlocks = function() {
    // remove all CUT elements
    $('.CUT').remove();
  }

  tb.cloneItemscope = function(empty) {
    // clone the selected itemscope (or element)
    // - empty: if true, clone the elements but remove any text
    // TODO: do that with marked elements in the future
    function prepare(clones$) {
      // renumber the ids found
      // and clear text if empty is true
      if (clones$.length === 0) return;
      clones$.filter('[id]').attr('id',function(i,id){
        return tb.blockId(tb.blockPrefix(id));
      });
      if (empty) {clones$.contents().filter(function() {
          return this.nodeType == 3; //Node.TEXT_NODE
        }).remove();
      }
      clones$.removeClass('SELECTED');
      prepare(clones$.children());
    }
    
    var element$ = tb.selected.element$.itemscopeOrThis(); //TODO add marked
    var newElement$ = element$.clone();
    prepare(newElement$);
    newElement$.insertAfter(element$);
    tb.selectElement(newElement$[0]);
    tb.setUpToDate(false);
  }

  tb.editables$ = function(element) {
    // returns a JQuery of the tags that are editable in element (JQuery can be .length==0 if nothing is editable)
    var e$ = $(element);
    if (e$.hasClass('EDITABLE')) return e$;
    return e$.find('.EDITABLE');
  }


  tb.selectElement = function(element) {
    // select element as tb.selected.element and update the EDI accordingly
    tb.editor.setCurrentEditor(undefined);
    var e = tb.selected.element;
    if (e) {
      if (element && (e === element)) { // if already selected nothing to do but give focus again
        e.focus();
        return;
      }

      // remove the old selection
      $(e).removeClass('SELECTED');
      $('.ITEMSCOPE').removeClass('ITEMSCOPE');
      tb.editables$(e)
        .attr('contentEditable',false)
        .each(function(i,e){tb.reformatRichText(e)});
    }

    // set the new selection
    tb.selected.element = element;
    tb.selected.element$ = $(element);
    e$ = tb.selected.element$;
    tb.selected.itemscope$ = e$.closest('[itemscope]');
    tb.selected.container$ = e$.parent().closest('[container]');
    if (element == undefined){
      $('#codeId').text('no selection');
      tb.menu.selectionToolBar$.hide();
      return;
    }
    tb.menu.$.show();
    tb.menu.selectionToolBar$.show(500);
    tb.menu.codeId$.html(element.id+'<SPAN style="color:red;cursor:pointer;" onclick="tb.selectElement(undefined);">&nbsp;&#215;&nbsp;</SPAN>');
    tb.menu.properties$.children().each(function(){
      var checkbox$ = $(this);
      var c = checkbox$.val();
      if (c) {
        checkbox$.prop('checked',e$.hasClass(c));
      };
    });
    var itemprop = e$.attr('itemprop')
    tb.menu.itemprop$.val(itemprop);
    tb.menu.itemtype$.val(e$.attr('itemtype'));
    tb.menu.func$.val(e$.attr('func'));
    tb.menu.format$.val(e$.attr('format'));

    e$.addClass('SELECTED');
    if (itemprop) {
      e$.parent().closest('[itemscope]').addClass('ITEMSCOPE')
    }
    tb.updateTemplateChoice();
    tb.editables$(element).attr('contentEditable',true);
    element.focus();
  }

  tb.moveElement = function(element$,where) {
    // moves element$ at a position defined by where
    // -element$: the element to move
    // - where : cf [$.fn.neighbour]
    if (element$.length!==1) return;
    var whereToInsert$ = element$;
    if (where==='before' || where=='beforeItemscope') {
      do {
        whereToInsert$ = whereToInsert$.prev();
      } while (whereToInsert$.length && !whereToInsert$.hasClass('ELEMENT')); // also skip OUTPUT TEST.. and decorative tags
      element$.insertBefore(whereToInsert$);
    }
    else {
      whereToInsert$ = whereToInsert$.next();
      var traillingTags$ = whereToInsert$.nextUntil('.ELEMENT'); 
      if (traillingTags$.length) whereToInsert$ = traillingTags$.last();
      element$.insertAfter(whereToInsert$);
    }
    tb.setModified(true);
  }

  // EDI eventHandlers ///////////////////////////////////////////////////////////////

  tb.bodyKeyDown = function(event) {
    // special keys at EDI level
    switch (event.keyCode) {
      case 112:
        tb.help.index.show(window.document.selection.createRange().text); //TODO: works only with IE7
        break;
    }
    return true;
  }

  tb.bodyKeyUp = function(event) {
    tb.menu.debug$.html(tb.inspect(window.document.selection).span().toString())
  }


  tb.elementClick = function(event) {
    // event handler for click on an ELEMENT
    var element = event.currentTarget; // not target, since target can be an child element, not the div itself
    if ($(element).hasClass('EMBEDDED')) {
      return true; //EMBEDDED code is ruled by its container (richText / section...) so let the event bubble
    }
    tb.selectElement(element);
    return false;  // prevent bubbling
  }

  tb.editableKeyDown = function(event) {
    // keyDown event handler for EDITABLE ELEMENT in order to see if the ELEMENT is modified and so the sheet
    // also treat ctrl-enter as a run key
    if ($.inArray(event.keyCode,[16,17,18,20,27,33,34,35,36,37,38,39,40,45,91,92,93]) != -1) return; // non modifying keys like shift..
    tb.setModified(true);
    tb.setUpToDate(false);
    if ((event.keyCode==13) && event.ctrlKey) {
      event.stopPropagation();
      tb.run();
    }
  }

  tb.elementEditor = function(event) {
    // generic editor event handler for click and keypress
    // assumes that the DOM element that has a class=EDITOR also has an id="name of the corresponding Tablord element"
    // this handler just dispatch the event at the right object eventHandler
    var element = event.currentTarget;
    var tbObject = tb.vars[element.tbObject]
    return tbObject.editorEvent(event);
  }


  //  display / execution ////////////////////////////////////////////////////


  tb.displayResult = function(result,output) {
    // display result in output (that must be a tb.Output object
    $(output.outputElement)
    .empty().removeClass('ERROR').addClass('SUCCESS')
    .append(((result !== undefined) && (result !== null) && (typeof result.node$ === 'function') && result.node$() )
            || tb.format(result)
           )
    .prepend(output.toString())
    .before(trace.span().toString()) // traces are not part of the result
  }

  tb.execCode = function(element) {
    // execute the code of element
    // skip all CUT element
    var element$ = $(element);
    if (element$.hasClass('CUT')) return;

    // if template, lauch exec method if any
    if (element$.attr('itemtype')) {
      var t = tb.templates[tb.Template.urlToName(element$.attr('itemtype'))];
      if (t && t.exec) {
        t.exec(element$);
      }
      tb.output = undefined;  // so that any errors from the EDI will be reported in a dialog, not in the last outputElement.
      return
    }

    // Execute CODE ELEMENT
    // clear if any previous WRONG marker
    var wrong$ = $('.WRONG',element).add('font',element);  //TODO: check in future: IE7 had a tendency to add FONT instead of the SPAN if the text is edited
    if (wrong$.length > 0) wrong$.replaceWith(function(i,c){return c});

    var out$  = tb.outputElement$(element$);
    var test$ = tb.testElement$(element$)
    tb.output = tb.newOutput(element$[0],out$[0]);
    var res = tb.securedEval(tb.htmlToText(element.innerHTML));
    tb.displayResult(res,tb.output);
    // test
    if (test$.length) {
      if ((tb.trimHtml(out$.html()) == tb.trimHtml(test$.html()))) {   //TODO rethink how to compare
        test$.removeClass('ERROR').addClass('SUCCESS');
      }
      else {
        test$.removeClass('SUCCESS').addClass('ERROR');
      }
    }
    tb.output = undefined;  // so that any errors from the EDI will be reported in a dialog, not in the last outputElement.
  }

  tb.execCodes = function(fromCodeId,toCodeId) {
    // execute CODE element starting from fromCodeId and ending with toCodeId
    // it does not clean the environement first, since this function is intended to be used
    // by the user in order to execute some codes repeatidly
    // nor it will perform any finalization (but it will register output.finalize functions
    // that will be executed at the end of the sheet execution
    // please note that it is POSSIBLE to run the code containing the tb.execCodes() allowing
    // some recursivity. Of course this can also result in an never ending loop if not used properly

    var code$ = $('.CODE');
    fromCodeId = fromCodeId || code$.first().attr('id');
    toCodeId = toCodeId || code$.last().attr('id');
    code$.filterFromToId(fromCodeId,toCodeId).each(function(i,e) {
      tb.execCode(e);
    });
  }

  tb.runHtaFile = function(fileName,noWait,parameters) {
    // run an other file
    // if noWait is false or undefined, just open the file and returns without waiting
    //           is true run the file with ?runonce. it is the file responsibility to behave in this manner
    //                   this function will return the result object produced by the .hta file
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


    fileName = tb.absoluteFileName(fileName,tb.url.absolutePath);
    var resultFileName = fileName.replace(/\.hta/i,'.jres');
    if (params.length > 0) {
      var cmd = 'mshta.exe '+fileName+'?'+params.join('&');
    }
    else {
      var cmd = fileName;
    }
    var errCode = tb.shell.Run(cmd,1,runOnce);
    if (runOnce) {
      var res = {};
      try {
        var json = tb.fso.readFile(resultFileName);
        res = JSON.parse(json);
        res.cmd = cmd;
        res.errCode = errCode;
      }
      catch (e) {
        res.errCode = e.message;
      }
      return res;
    }
  }

  tb.runTests = function(/*files...*/) {
    // run every specified files as test files and return a table with all results
    var results = [];
    for (var i=0; i<arguments.length; i++) {
      var res = tb.runHtaFile(arguments[i]);
      results.push({file:arguments[i],
                    errCode:res.errCode,
                    nbPassed:res.testStatus&&res.testStatus.nbPassed,
                    nbFailed:res.testStatus&&res.testStatus.nbFailed,
                    dateTime:res.testStatus&&res.testStatus.dateTime,
                    exec$ms :res.execStat.execAll$ms});
    }
    return table().addRows(results).colStyle(function(r,c,value){return (value !== 0)?{backgroundColor:'red'}:{}},'nbFailed');
  }

  tb.animate = function (interval,fromCodeId,toCodeId,endCondition) {
    // run every "interval" all codes between fromCodeId to toCodeId
    // if fromCodeId is undefined, the CODE element where this function is called will be used
    fromCodeId = fromCodeId || tb.output.codeElement.id;
    toCodeId = toCodeId || fromCodeId;
    if (tb.inAnimation == false) {
      $('#stopAnimation').attr('disabled',false);
      $('.CODE').filterFromToId(fromCodeId,toCodeId).addClass('INANIMATION');
      tb.intervalTimers.push(window.setInterval(function() {
        tb.inAnimation = true;
        tb.execCodes(fromCodeId,toCodeId);
        tb.inAnimation = false;
      }
      ,interval));
    }
    return new Date().toString();
  }

  tb.clearTimers = function () {
    // clear all existing intervalTimers used by [[tb.animate]]
    for (var i = 0;i<tb.intervalTimers.length;i++) {
      window.clearInterval(tb.intervalTimers[i]);
    };
    tb.intervalTimers = [];
    tb.inAnimation = false;
    $('#stopAnimation').attr('disabled',true);
    $('.INANIMATION').removeClass('INANIMATION');
  }

  tb.finalize = function() {
    // execute all finalization code
    for (var i=0;i<tb.finalizations.length;i++) {
      var out = tb.finalizations[i];
      tb.errorHandler.code = out.finalizationFunc.toString();
      out.finalizationFunc();
      out.finalizationFunc = undefined;  // so that displayResult will not show ... to be finalized...
      tb.displayResult(out,out);
    }
  }

  tb.run = function() {
    // run either all CODE ELEMENT or the CODE ELEMENT from the first to the selected.element
    if (tb.autoRun) {
      tb.execAll();
    }
    else {
      tb.execUntilSelected();
    }
  }

  tb.updateContainers = function() {
    // make sure that containers are never empty (= at least have a RICHTEXT ELEMENT)
    var c$ = $('[container]:not(:has(> *))');
    c$.append('<DIV class="ELEMENT EDITABLE RICHTEXT c-12" id='+tb.blockId('rich')+'></DIV>');
  }
  
  tb.createVarFromItemprop = function(i,element) {
    // create an instance of tb.Var or tb.Table depending on the type of element
    var e$ = $(element);
    var itemprop = e$.attr('itemprop');
    if (e$.attr('itemscope') !== undefined) {  // itemscope is represented by a tb.Table with one or more line
      table(itemprop).add(tb.Template.getData(e$));
    }
    else {
      var variable = tb.vars[itemprop];
      if (variable) { 
        if (variable instanceof tb.Var) {
          var _var = variable;
          variable = new tb.Array(variable.name);
          variable.push(_var);
          tb.vars[itemprop] = variable;
        }
        else if (variable instanceof tb.Array) {
          _var = new tb.Var(itemprop);
          _var.setValue(e$.getItempropValue())
          variable.push(_var)
        }
        else throw Error('internal error: unexpected class '+variable.toString()+'while createVarFromItemprop of'+element.outerHTML);
      }
      else {
        v(itemprop,e$.getItempropValue()) // TODO implement different types (number moment duration) depending on class ???
      }
    }
  }
  
  tb.createVars = function() {
    // look in the DOM for itemprops that have no itemscope ancestor
    // for each create a tb.vars.<that itemprop> with the itemprop name with the content of that itemprop
    // 1) if the itemprop ends with [], it is forced to an array (but the name of the array has not the []) 
    //    and the value is pushed into it
    // 2) if the itemprop has the same name of an already existing tb.vars that is not an array,
    //    the var is first converted to an array with the already existing var as [0]
    //    the new itemprop is pushed into it
    // 3) the content of the variable depends on the itemprop tag according to 
    //    [tb.createVarFromItemprop]
    var globalItemprops = $('[itemprop]').filter(function(){return $(this).parents('[itemscope]').length === 0});
    globalItemprops.each(tb.createVarFromItemprop)
  }
  
  tb.updateFunctionElements = function() {
    // update every element that has an itemprop and a func attribute
    $('[func]').each(function(){
      e$ = $(this);
      e$.html(tb.format(e$.prop('tbVar').valueOf(),{format:{fmtStr:e$.attr('format')}}))
    })
  }

  tb.prepareExec = function() {
    // reset the environement before so that no side effect
    // let [[Feature]]s object collect data on the document
    tb.results = {execStat:{start: new Date()}};

    for (var i=0; i<tb.features.length; i++) tb.features[i].reset();
    trace.off();
    tb.clearTimers();
    $('.TRACE').remove();
    $('.BOX').remove();
    $('.OUTPUT').add('.TEST').removeClass('SUCCESS').removeClass('ERROR')
    tb.finalizations = [];
    tb.vars = {}; // run from fresh
    tb.createVars();
    tb.IElement.idNumber = 0;
    for (var i=0; i<tb.features.length; i++) tb.features[i].update && tb.features[i].update();
    tb.simulation = new tb.Simulation('tb.simulation');
    tb.editables$(tb.selected.element).each(function(i,e){tb.reformatRichText(e)});
    tb.results.execStat.prepare$ms=Date.now()-tb.results.execStat.start;
  }

  tb.execAll = function() {
    // execute all [[CODE]] [[ELEMENT]]
    tb.prepareExec();
    $('.CODE').add('[itemtype]').each(function(i,e) {tb.execCode(e);});
    tb.updateContainers();
    tb.finalize();
    tb.results.execStat.execAll$ms=Date.now()-tb.results.execStat.start;
    tb.updateFunctionElements();
    tb.setUpToDate(true);
  }

  tb.execUntilSelected = function() {
    // execute all [[CODE]] [[ELEMENT]] until the selected Element
    tb.prepareExec();
    var $codes = $('.CODE');
    if (tb.selected.element$.hasClass('CODE')){
      var lastI = $codes.index(tb.selected.element);
    }
    else {
      var $last = $('.CODE',tb.selected.element).last();
      if ($last.length === 0) { // selected element is a section or rich text that has no internal CODE element
        $codes.add(tb.selected.element); // we add this element (even if not a code) just to know where to stop
        var lastI = $codes.index(tb.selected.element)-1;
      }
      else {
        var lastI = $codes.index($last);
      }
    }
    $('.CODE').each(function(i,e) {
      if (i>lastI) return false;
      tb.execCode(e);
    });
    // no finalization since not all code is run, so some element will not exist
    tb.setUpToDate(false);
  }

  tb.reformatRichText = function(element) {
    // reformat a [[RICHTEXT]] [[ELEMENT]] in order to find potential [[EMBEDDED]] [[CODE]]

    if ((element == undefined) || ($(element).hasClass('CODE'))) return;

    var change = false;
    $(element).replaceText(/\{\{([#]{0,2})(.*?)\}\}/g,
                           function(s,command,code) {
                             change = true;  // if called, this function will change the document
                             switch (command) {
                               case ''   : return '<SPAN class="CODE EMBEDDED ELEMENT" id='+ tb.blockId('code')+'">&nbsp;'+code+'</SPAN>';
                               case '##' : return '<SPAN class="CODE EMBEDDED ELEMENT" id='+ tb.blockId('code')+'">&nbsp;tb.elementBox("'+code+'")</SPAN>';
                               case '#'  : return '<SPAN class="CODE EMBEDDED ELEMENT" id='+ tb.blockId('code')+'">&nbsp;tb.link("'+code+'")</SPAN>';
                             }
                           },
                           function(e) {  //replace in any tag except those having CODE or OUTPUT class
                             return e.className.search(/OUTPUT|CODE/)=== -1;
                           });
    if (change) {
      element.normalize();
      tb.setUpToDate(false);
    }
  }


  // upgrades from previous versions ////////////////////////////////////////////////////////////////////////////////
    tb.upgradeModules = function() {
    // checks that this is the lastest modules and if not replaces what is needed
    var modulesNeeded = ['jquery-1.5.1.min.js','tablordEdi.js','units.js','tablord.js','axe.js','simulation.js','sys.js','ocrRdy.js','finance.js','diff.js'];
    var allModules = modulesNeeded.concat('jquery.js'); // including deprecated modules
    var modules = [];
    var $script = $('SCRIPT').filter(function(){return $.inArray(tb.fileName(this.src),allModules)!=-1});
    $script.each(function(i,e){modules.push(tb.fileName(e.src))});
    if (modules.toString() == modulesNeeded.toString()) return; // everything is just as expected

    // otherwise we have to upgrade
    var h = '';
    $.each(modulesNeeded,function(i,m){h+='<SCRIPT src="'+m+'"></SCRIPT>'});
    window.prompt(/*'your need to edit your scripts to upgrade\n'+*/modules+'\n'+modulesNeeded,h);
  }


  tb.upgradeFramework = function() {
    // upgrades the sheet framework from previous versions
    // the past before v1.0.0 has been forgotten since no real sheet in production before

    // in order to fix issue #1
    $('.EMBEDDED').css('display','');
    $('.EMBEDDED[style=""]').removeAttr('style');

    // EMPTY element are not longer in use but might still be present in existing sheets
    $('.ELEMENT.EMPTY:not(:only-child)').remove();
    tb.updateContainers();

    // add an INDENT class to indent where is needed and no longer to any container
    $('[container=sectionContent]').addClass('INDENT'); // container=sectionContent was the former definition

  }


  $(function () {
    // upgrades ////////////////////////////////////////////////////
    try {
      //tb.upgradeModules();
      tb.upgradeFramework();
      if (window.document.compatMode != 'CSS1Compat') {
        window.alert('your document must have <!DOCTYPE html> as first line in order to run properly: please save and re-run it');
      }
      // prepare the sheet ///////////////////////////////////////////
      tb.url = tb.urlComponents(window.document.location.href);
      tb.tbContent$ = $('#tbContent');
      $('.SELECTED').removeClass('SELECTED');
      $(document)
      .on("click",'.ELEMENT',tb.elementClick)
      .on("keydown",'.EDITABLE',tb.editableKeyDown)
      .on("change",'.EDITOR',tb.editorEventHandler)
      .on("click",'.EDITOR',tb.editorEventHandler)
      .on("click",'.SCENE',function(event){event.stopPropagation()})       // cancel bubbling of click to let the user control clicks
      .on("click",'.INTERACTIVE',function(event){event.stopPropagation()}) // cancel bubbling of click to let the user control clicks
      .on("click",'.LINK',function(event){event.stopPropagation()})        // cancel bubbling of click to let the user control clicks
      .on("click",'.HELPLINK',function(event){tb.help.index.show(event.target.innerHTML)})
      .on("click",'.BOXLINK',tb.openCloseBox)                              // open or close Box and cancel bubbling of click since it is only to open close
      .on("click",'.BOX',function(event){event.stopPropagation()});    // cancel bubbling of click


      $('.OUTPUT').removeClass('SUCCESS').removeClass('ERROR');
      $('.TEST').removeClass('SUCCESS').removeClass('ERROR');



      tb.findblockNumber();
      //tb.initToolBars();
      tb.initMenu();
      tb.editor = new tb.Editor();
      $(window).bind('beforeunload',tb.beforeUnload);
      $('body').keydown(tb.bodyKeyDown)//.keyup(tb.bodyKeyUp);
      tb.autoRun = $('body').attr('autoRun')!==false;
      tb.help.update(tb,'tb.');
      tb.updateContainers();
    }
    catch (e) {
      window.alert(e.toString());
    }
    if (tb.autoRun) tb.execAll();
  });


