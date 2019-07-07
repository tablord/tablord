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
    	'<div id="menu" class="TOOLBAR no_print">'+
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
        				'<button id="pasteBtn" class="btn btn-dark title="paste cut/marked elements" where="after"><i class="fas fa-paste"></i></button>'+
        				'<button id="deleteBtn" class="btn btn-dark" title="delete marked/selected element"><i class="fas fa-trash"></i></button>'+
        				'<button id="moveUpBtn" class="btn btn-dark" title="move selected before previous block element"><i class="fas fa-arrow-up"></i></button>'+
        				'<button id="moveDownBtn" class="btn btn-dark" title="move selected after next block element"><i class="fas fa-arrow-down"></i></button>'+
        				'<button id="moveLeftBtn" class="btn btn-dark" title="move selected before previous element"><i class="fas fa-arrow-left"></i></button>'+
        				'<button id="moveRightBtn" class="btn btn-dark" title="move selected after next element"><i class="fas fa-arrow-right"></i></button>'+
        				'<button id="showHtmlBtn" class="btn btn-dark">&#8594;html</button>'+
        				'<button id="toTestBtn" class="btn btn-dark">&#8594;test</button>'+
                    '</div>'+
        			'<div id="insertAfter" class="btn-group btn-group-sm mr-2" role="group" where="after">'+
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
                    '<div id="item">'+
                      '<input id="itemprop" type="text" placeholder="itemprop">'+
                      '<input id="itemtype" placeholder="itemtype">'+
                      '<input id="format" placeholder="format">'+
                    '</div>'+
                    '<div id="func" style="height:200px;"></div>'+
                    '<div id="error" class="alert alert-danger"></div>'+
                    '<div id="classes">'+
                        '<input type="checkbox" value="SHOW">SHOW<br> '+

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
                    '</div>'+
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
    
    tb.menu.error$.hide();
    tb.menu.funcEditor = ace.edit('func');
    tb.menu.funcEditor.session.setMode("ace/mode/javascript");
    tb.menu.funcEditor.on('blur',function(){
      var code = tb.menu.funcEditor.getValue();
      if (code != tb.selected.element$.attr('func')) {
        if (code) tb.selected.element$.attr('func',code);
        else tb.selected.element$.removeAttr('func');
        tb.run();
        tb.setModified(true);
      }
    });
    tb.menu.classes$.click(function(event){
      $(event.currentTarget).children().each(function(){
        var className = $(this).val();
        if (className) {
           tb.selected.element$.toggleClass(className,$(this).prop('checked'));
        }
      });
      tb.setModified(true);
    });
    tb.menu.item$.focusout(function(event){
      if (tb.menu.itemprop$.val()) tb.selected.element$.attr('itemprop',tb.menu.itemprop$.val());
      else tb.selected.element$.removeAttr('itemprop');
      if (tb.menu.itemtype$.val()) tb.selected.element$.attr('itemtype',tb.menu.itemtype$.val());
      else tb.selected.element$.removeAttr('itemtype');
      if (tb.menu.format$.val()) tb.selected.element$.attr('format',tb.menu.format$.val());
      else tb.selected.element$.removeAttr('format');
      tb.run();
      tb.setModified(true);
    });
 
    tb.updateTemplateChoice();
    
    tb.menu.helpSearch$.keyup(tb.helpSearchKeyup);
  };
  //////////////////////////////////////////////////////////////////////////////
  // event handler for button input etc ////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////
  // a function that is xxxxxxClick or xxxxxxChange is automatically bound to the 
  // click or change event of the button id="xxxxxx"
  
  tb.showCodeClick = function(event) {
    // click event handler for the show Code checkbox
    var button = event.target;
    $('.CODE').toggleClass('HIDDEN',!button.checked);
    tb.sheetOptions.showCode = button.checked;
  };

  tb.showCutClick = function(event) {
    // click event handler for the show cut checkbox
    var button = event.target;
    $('.CUT').toggleClass('HIDDEN',!button.checked);
    tb.sheetOptions.showCut = button.checked;
  }

  tb.showDeletedClick = function(event) {
    // click event handler for the show cut checkbox
    var checkbox = event.target;
    if (checkbox.checked) $('.DELETED').show(300);
    else $('.DELETED').hide(300);
    tb.sheetOptions.showDeleted = checkbox.checked;
  }
  
  tb.showTestClick = function(event) {
    // click event handler for the show test checkbox
    var button = event.target;
    $('.TEST').toggleClass('HIDDEN',!button.checked);
    tb.sheetOptions.showTest = button.checked;
  }

  tb.showTraceClick = function(event) {
    // click event handler for the show trace checkbox
    var button = event.target;
    $('.TRACE').toggleClass('HIDDEN',!button.checked);
    tb.sheetOptions.showTrace = button.checked;
  }

  tb.setAutoRunClick = function(event) {
    // click event handler for the auto run checkbox
    var button = event.target;
    tb.autoRun = button.checked;
    $('body').attr('autoRun',tb.autoRun);
  }

  tb.printBtnClick = function(event) {
    // click event handler for the print button
    tb.selectElement(undefined);
    window.print();
  }
  
  tb.pasteBtnClick = function(event) {
    // paste 
    var elements$ = $('.CUT').removeClass('CUT');
    if (elements$.length === 0) elements$ = tb.cloneElements$($('.MARKED').removeClass('MARKED'));
    var target$ = event.altKey?tb.selected.element$:tb.selected.element$.itemscopeOrThis$().last();
    elements$.insertAfter(target$);
  }

  tb.moveUpBtnClick = function(event) {
    // simple version: at itemscope boundaries
    tb.moveElement(tb.selected.element$.itemscopeOrThis$(),'before');
  }
  
  tb.moveDownBtnClick = function(event) {
    // simple version: at itemscope boundaries
    tb.moveElement(tb.selected.element$.itemscopeOrThis$(),'after');
  }

  tb.moveLeftBtnClick = function(event) {
    // simple version: at element boundaries
    tb.moveElement(tb.selected.element$,'before');
  }

  tb.moveRightBtnClick = function(event) {
    // simple version: at element boundaries
    tb.moveElement(tb.selected.element$,'after');
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
    var target$ = event.altKey?tb.selected.element$:tb.selected.element$.itemscopeOrThis$();
    tb.mark(target$);
  }
  
  tb.cutBtnClick = function(event) {
    // simple version
    // if there are [[MARKED]] [[ELEMENT]], will cut them
    // if element is inside an [[itemscope]], will cut the entire itemscope
    // except if the Alt Key is pressed where it will only take the ELEMENT
    var elements$ = $('.MARKED');
    if (elements$.length ===0) elements$ = event.altKey?tb.selected.element$:tb.selected.element$.itemscopeOrThis$();
    tb.cutBlock(elements$);
  }

  tb.deleteBtnClick = function(event) {
    // look for MARKED elements or if none for SELECTED element
    // and add the DELETED class
    var elements$ = $('.MARKED')
    if (elements$.length === 0) elements$ = event.altKey?tb.selected.element$:tb.selected.element$.itemscopeOrThis$();
    var deleted$ = elements$.find('.DELETED').addBack('.DELETED'); // search for deleted elements including itself
    if (deleted$.length) { // some elements in the selection are deleted, so undelete those
      deleted$.removeClass('DELETED').show(500);
      return;
    }
    if ($('.SELECTED',elements$).length) tb.selectElement(undefined);
    elements$.removeClass('MARKED').addClass('DELETED');
    if (!tb.sheetOptions.showDeleted) elements$.hide(500)
  }

  tb.cloneEmptyBtnClick = function(event) {
    // clone MARKED or the selected.element$
    var elements$ = $('.MARKED')
    if (elements$.length === 0) elements$ = event.altKey?tb.selected.element$:tb.selected.element$.itemscopeOrThis$();
    var target$ = event.altKey?tb.selected.element$:tb.selected.element$.itemscopeOrThis$();
    tb.cloneElements$(elements$,true).insertAfter(target$);
  }
  

  tb.templateButtonClick = function(event) {
    var where = $(event.target).closest('[where]').attr('where');
    if (!event.altKey) where += 'Itemscope';
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
    var element$ = $(event.currentTarget); // not target, since target can be an child element, not the div itself
    if (event.ctrlKey) {
      tb.mark(event.altKey?element$:element$.itemscopeOrThis$());
      return false;
    }
    else if (event.shiftKey){
      return false;
    }
    tb.selectElement(element$);
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
  
  //////////////////////////////////////////////////////////////////////////////
  // method to display changes
  //////////////////////////////////////////////////////////////////////////////


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
  };

  
  tb.showElementError = function(element,error) {
    // report an error that occured inside an element
    // like getting the valueof a tb.Var
    var element$ = $(element);
    var output$ = element$;
    if (element$.hasClass('CODE')) output$ = $('.OUTPUT',element);
    output$.removeClass('SUCCESS').html('<span class="badge badge-pill badge-warning">'+(error.cascade || 'error')+'</span>');
    element$.addClass('ERROR')
    .prop('error',{message:error.message,
                   stack:error.stack,
                   lineNumber:error.lineNumber,
                   columnNumber:error.columnNumber,
                   cascade:error.cascade
    });
    if (!error.cascade) {
      tb.selectElement(element);
      tb.menu.properties$.prop('open',true);
    }
  };
  
  tb.showItempropError = function(element,error) {
    // report an error that occured at the variable creation
    var element$ = $(element);
    element$.addClass('ERROR')
    .prop('error',error);
    tb.selectElement(element);
    tb.menu.properties$.prop('open',true);
    tb.menu.itemprop$[0].focus();
  };
  
  tb.showInternalError = function(html) {
    tb.menu.debug$.html(html).show();
  };
  //////////////////////////////////////////////////////////////////////////////
  // method to manipulate the document /////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

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

  tb.clearOutputs = function() {
    // remove all outputs
    $('.OUTPUT').remove();
  }

  tb.saveRemote = function() {
    // save to a remote server
    var csrftoken = jQuery("[name=csrfmiddlewaretoken]").val();
    tb.removeDeletedBlocks();
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


  tb.copyOutputToTest = function() {
    // set the current element's output as the test element if no test element existed or if it failed
    // if a SUCCESS test existed, remove the test
    
/*    
    if (tb.selected.element == undefined) return;

    var out$ = tb.outputElement$(tb.selected.element$);
    var test$ = tb.testElement$(tb.selected.element$);
    if (test$.length === 0) {
      out$.after($('<DIV id="'+tb.selected.element.id.replace(/code/,"test")+'" class="TEST SUCCESS">'+out$.html()+'</DIV>'));
    }
    else if (!test$.hasClass('SUCCESS')) {
      test$.html(out$.html()).removeClass('ERROR').addClass('SUCCESS');
    }
    else {
      test$.remove();
    }
    tb.setModified(true);
*/
    if (tb.selected.element == undefined) return;

    var out$ = tb.selected.element$.children('.OUTPUT');
    var test$ = tb.selected.element$.children('.TEST');
    if (test$.length === 0) {
      out$.after($('<div class="TEST SUCCESS">'+out$.html()+'</div>'));
    }
    else if (!test$.hasClass('SUCCESS')) {
      test$.html(out$.html()).removeClass('ERROR').addClass('SUCCESS');
    }
    else {
      test$.remove();
    }
    tb.setModified(true);
    
  }

  tb.mark = function(elements$){
    // mark all elements$
    elements$.toggleClass('MARKED');
  }

  tb.cutBlock = function(element$,cut) {
    // cut or "uncut" element
    // if cut is true or false, set the cut state
    // if cut is undefined, toggle the cut state
    cut = cut || !element$.hasClass('CUT');
    element$.toggleClass('CUT',cut).removeClass('MARKED');
    tb.setModified(true);
    tb.setUpToDate(false);
  }

  tb.removeDeletedBlocks = function() {
    // remove all DELETED elements
    $('.DELETED').remove();
  }

  tb.cloneElements$ = function(elements$,empty) {
  // clone the elements$ making sure the ids are renamed properly
  // - empty: if true, clone the elements but remove any text
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
    
    var newElements$ = elements$.clone();
    prepare(newElements$);
    tb.setUpToDate(false);
    tb.setModified(true);
    return newElements$;
  }


  tb.editables$ = function(element) {
    // returns a JQuery of the tags that are editable in element (JQuery can be .length==0 if nothing is editable)
    var e$ = $(element);
    if (e$.hasClass('EDITABLE')) return e$;
    return e$.find('.EDITABLE');
  };

  tb.updateMenu = function() {
    // update the menu with the content of tb.selected.element
    // which can be undefined and it will hide the selectionToolBar
    var element = tb.selected.element;
    if (element == undefined){
      tb.menu.selectionToolBar$.hide();
      return;
    }
    tb.menu.codeId$.html(element.id+'<SPAN style="color:red;cursor:pointer;" onclick="tb.selectElement(undefined);">&nbsp;&#215;&nbsp;</SPAN>');
    var flexParent = tb.selected.element$.parent().hasClass('FLEX');
    tb.menu.moveLeftBtn$.prop('disabled',!flexParent);
    tb.menu.moveRightBtn$.prop('disabled',!flexParent);
    
    var isCode =tb.selected.element$.hasClass('CODE');
    tb.menu.showHtmlBtn$.prop('disabled',!isCode);
    tb.menu.toTestBtn$.prop('disabled',!isCode);
    
    tb.menu.classes$.children().each(function(){
      var checkbox$ = $(this);
      var c = checkbox$.val();
      if (c) {
        checkbox$.prop('checked',tb.selected.element$.hasClass(c));
      };
    });
    tb.menu.itemprop$.val(tb.selected.element$.attr('itemprop'));
    tb.menu.itemtype$.val(tb.selected.element$.attr('itemtype'));
    tb.menu.funcEditor.setValue(tb.selected.element$.attr('func') || '')
    var error = tb.selected.element$.prop('error');
    if (error) {
      var line = error.lineNumber;
      var col = error.columnNumber;
      tb.menu.error$.html('<details><summary>'+error.message+'</summary>'+error.stack.replace('/\n/g','<br>').replace(/ at /g,'<br>at ')+'</details>').show();
      tb.menu.funcEditor.gotoLine(line,col-1);
    }
    else tb.menu.error$.hide();
    tb.menu.format$.val(tb.selected.element$.attr('format'));
    tb.updateTemplateChoice();
    tb.menu.$.show();
    tb.menu.selectionToolBar$.show(500,function(){tb.menu.funcEditor.resize()});
    if (error) {
      element.scrollIntoView();
      tb.menu.funcEditor.focus();
    }
    else {
      element.focus();
    };
    
  };

  tb.selectElement = function(element) {
    // select element as tb.selected.element and update the EDI accordingly
    // element can either be a DOM element or a jQuery of 1 element

    if (element instanceof $) element = element[0];
    tb.editor.setCurrentEditor(undefined);
    var e = tb.selected.element;
    if (e) {
      if (element && (e === element) && !e.error) { // if already selected nothing to do but make sure it is visible
        tb.menu.error$.hide();
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
    tb.selected.itemscope$ =  tb.selected.element$.closest('[itemscope]');
    tb.selected.container$ =  tb.selected.element$.parent().closest('[container]');
    
    tb.selected.element$.addClass('SELECTED');
    if (itemprop) {
      tb.selected.element$.parent().closest('[itemscope]').addClass('ITEMSCOPE')
    }
    tb.updateMenu();
    tb.editables$(element).attr('contentEditable',true);
  }

  tb.moveElement = function(element$,where) {
    // moves element$ at a position defined by where
    // -element$: the element to move
    // - where : cf [$.fn.neighbour]
    if (element$.length===0) return;
    var whereToInsert$ = element$;
    if (where==='before' || where=='beforeItemscope') {
      do {
        whereToInsert$ = whereToInsert$.first().prev();
      } while (whereToInsert$.length && !whereToInsert$.hasClass('ELEMENT')); // also skip any decorative tags
      element$.insertBefore(whereToInsert$);
    }
    else {
      whereToInsert$ = whereToInsert$.last().next();
      var traillingTags$ = whereToInsert$.nextUntil('.ELEMENT'); 
      if (traillingTags$.length) whereToInsert$ = traillingTags$.last();
      element$.insertAfter(whereToInsert$);
    }
    tb.setModified(true);
  }

  // EDI eventHandlers ///////////////////////////////////////////////////////////////

  tb.beforeUnload = function(event) {  //TODO avec hta, ne fonctionne pas bien
    // event handler before closing check if a save is needed and desired
    if (tb.modified) {
      event.returnValue='ouups?';
      return 'ouups?'
    }
  }


  tb.reformatRichText = function(element) {
    // reformat a [[RICHTEXT]] [[ELEMENT]] in order to create [[EMBEDDED]] [[CODE]] out of {{ }} pattern
    // {{code}} will create an ELEMENT EMBEDDED CODE with that code
    // {{#link}} will create a LINK to a section title
    // {{##elementBox}} will create an elementBox

    if ((element == undefined) || ($(element).hasClass('CODE'))) return;

    var change = false;
    $(element).replaceText(/\{\{([#]{0,2})(.*?)\}\}/g,
                           function(s,command,code) {
                             change = true;  // if called, this function will change the document
                             var code$ = tb.templates['https://tablord.com/templates/codeSpan'].element$();
                             switch (command) {
                               case ''   : return code$.attr('func',code)[0].outerHTML;
                               case '##' : return code$.attr('func',"tb.elementBox('"+code+"');")[0].outerHTML;
                               case '#'  : return code$.attr('func',"tb.link('"+code+"');")[0].outerHTML;
                             }
                           },
                           function(e) {  //replace in any tag except those inside CODE
                             return !$(e).hasClass('CODE');
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

    // since 1ba0c957100f7f3712b903f6a9ebc9c95a176662, [[CODE]] is has a [func] and contains the [[OUTPUT]] and [[TEST]] (templates/exec)
    var codes = $('.CODE').not('[func]');
    codes.each(function(i,e){
      var code$ =$(e);
      var func = tb.htmlToText(code$.html());
      var codeId = code$.attr('id');
      var out$ = $('#'+codeId.replace(/code/,'out')).removeAttr('id');
      var test$ = $('#'+codeId.replace(/code/,'test')).removeAttr('id');
      var newCode$;
      if (code$.hasClass('EMBEDDED')){
        newCode$ = tb.templates['https://tablord.com/templates/codeSpan'].element$();
        newCode$.addClass('EMBEDDED');
      }
      else {
        newCode$ = tb.templates['https://tablord.com/templates/code'].element$();
        newCode$.addClass('SHOW');
      }
      newCode$.attr('func',func).attr('id',codeId);
      code$.replaceWith(newCode$);
      newCode$.children('.OUTPUT').replaceWith(out$);
      newCode$.append(test$);
    });
    
    var ugglyEmbedded$ = $('div.EMBEDDED');
    ugglyEmbedded$.replaceTagName('span');
    
    $('.CODE').attr('contentEditable',false);
    
    $('[itemtype="https://tablord.com/template/codeSpan"]').attr('itemtype','https://tablord.com/templates/codeSpan');
    $('[itemtype="https://tablord.com/template/code"]').attr('itemtype','https://tablord.com/templates/code');
    
  };


  $(function () {
    // upgrades ////////////////////////////////////////////////////
    tb.tbContent$ = $('#tbContent');
    tb.initMenu();
    window.onerror = function(message,url,lineNo,colNo,error) {
      tb.showInternalError('Internal Error :'+message+'<br>'+error.stack);
    };

    //tb.upgradeModules();
    tb.upgradeFramework();
    if (window.document.compatMode != 'CSS1Compat') {
      window.alert('your document must have <!DOCTYPE html> as first line in order to run properly: please save and re-run it');
    }
    // prepare the sheet ///////////////////////////////////////////
    tb.url = tb.urlComponents(window.document.location.href);

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
    
    tb.editor = new tb.Editor();
    $(window).bind('beforeunload',tb.beforeUnload);      
    $('body').keydown(tb.bodyKeyDown)//.keyup(tb.bodyKeyUp);
    tb.autoRun = $('body').attr('autoRun')!==false;
    tb.help.update(tb,'tb.');
    tb.updateContainers();

    if (tb.autoRun) tb.execAll();
  });

