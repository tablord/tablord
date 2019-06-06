// 
// undo.js
// the core for all undoable actions
//
// (CC-BY-SA 2019)Marc Nicole  according to https://creativecommons.org/
/////////////////////////////////////////////////////////////////////////////////

  tb.UndoSystem = function() {
    // the Class that has only one instance where all EDI related object register
    // there action in order to make them undoable
    this.clear();
  };
  tb.UndoSystem.className = 'tb.UndoSystem';
  
  tb.UndoSystem.prototype.clear = function() {
    // clear the undo redo stack // should never be used by a user
    // except to test the undoSystem itself
    this.undoStack = [];  // array of [[undoAction]]
    this.redoStack = [];
    this.openAction = undefined;  // the action in construction
    return this;
  };
  tb.UndoSystem.prototype.begin = function(caption) {
    // begin a new action
    // return this for method chaining
    console.assert(this.openAction===undefined,'UndoSystem.begin while another begin has not been ended.');
    
    this.openAction = {caption:caption,steps:[]};
  };
  
  tb.UndoSystem.prototype.end = function(){
    // end an action and push it to the undoStack
    // return this for method chaining
    this.undoStack.push(this.openAction);
    this.openAction = undefined;
    return this;
  };
  
  tb.UndoSystem.prototype.add = function(undoObj) {
    // add a function object to the openAction
    // -undoObj: an [[undoObj]]
    // return this for method chaining
    this.openAction.steps.push(undoObj);
    return this;
  };
  
  tb.help.add('undoAction','undo','an undoAction is of the form {caption:"a caption",steps:[ of [[undoObj]]  ]');
  tb.help.add('undoObj','undo','an undoableObj is of the form {undo:[[undoFunction]],redo:[[undoFunction]]... other properties depending on undoFunction');
  tb.help.add('undoFunction','undo','an undoableObj is a function([[undoObj]]) that is capable of undoing (or redoing) based on the information of the undoObj');
  
  tb.UndoSystem.prototype.undo = function() {
    // undo the last action
    // return the caption of the undo action or undefined if nothing to undo
    if (this.undoStack.length === 0) return undefined;
    var action = this.undoStack.pop();
    for (var i = action.steps.length-1; i>=0;i--) {
      action.steps[i].undo(action.steps[i]);
    }
    this.redoStack.push(action);
    return 'undo '+action.caption;
  };
  
  tb.UndoSystem.prototype.redo = function() {
    // redo the last undone action
    // return the caption of the redo action or undefined if nothing to undo
    if (this.redoStack.length === 0) return undefined;
    var action = this.redoStack.pop();
    for (var i = 0; i< action.steps.length;i++) {
      action.steps[i].redo(action.steps[i]);
    }
    this.undoStack.push(action);
    return 'redo '+action.caption;
  };
  
  tb.UndoSystem.prototype.span = function() {
    // display the UndoSystem
    var h = '<h2>redo</h2>';
    for (var i=0;i<this.redoStack.length;i++){
      h += '<p>'+this.redoStack[i].caption+'</p>';
    }
    h += '<h2>undo</h2>';
    for (i=this.undoStack.length-1;i>=0;i--){
      h += '<p>'+this.undoStack[i].caption+'</p>';
    }
    return new tb.HTML(h);
  };
  
  tb.undo = new tb.UndoSystem();
  
  // JQuery extension for undoable actions
  

  $.fn.undoableAddClass = function(className) {
    // limited version of $.addClass, but that also register in undo the necessary object
    var elements$ = this.not('.'+className).addClass(className); // be sure to take only what will change
    tb.undo.add({undo:function(){elements$.removeClass(className)},  //thanks closures!!
                 redo:function(){elements$.addClass(className)}
    });
    return this;
  };

  $.fn.undoableRemoveClass = function(className) {
    // limited version of $.removeClass, but that also register in undo the necessary object
    var elements$ = this.not('.'+className).removeClass(className); // be sure to take only what will change
    tb.undo.add({undo:function(){elements$.addClass(className)},  //thanks closures!!
                 redo:function(){elements$.removeClass(className)}
    });
    return this;
  };
  
  $.fn.undoableAttr = function(attribute,value) {
    // limited version of $.attr(), but that also register in undo the necessary object
    // this must be a single element
    console.assert(this.length===1,'undoableAttr can operate only on single element');
    var element$ = this;
    var oldValue = element$.attr(attribute);
    element$.attr(attribute,value);
    tb.undo.add({undo:function(){if(oldValue===undefined) element$.removeAttr(attribute); else element$.attr(attribute,oldValue)},
                 redo:function(){element$.attr(attribute,value)}
    });
    return element$;
  };

  $.fn.undoableProp = function(property,value) {
    // limited version of $.prop(), but that also register in undo the necessary object
    // this must be a single element
    console.assert(this.length===1,'undoableProp can operate only on single element');
    var element$ = this;
    var oldValue = element$.prop(attribute);
    element$.prop(attribute,value);
    tb.undo.add({undo:function(){if(oldValue===undefined) element$.removeProp(property); else element$.prop(property,oldValue);},
                 redo:function(){element$.prop(property,value)}
    });
    return this;
  };
  
  $.fn.undoableInsertBefore = function(target$) {
    // same as $.insertAfter(target$) but can be undone
    
    this.each(function(){
      var element$ = $(this);
      var n$ = element$.next();
      if (n$.length) tb.undo.add({undo:function(){element$.insertBefore(n$)},
                                  redo:function(){element$.insertBefore(target$)} });
      else // no previous sibling ==> prepend to parent
        var p$ = element$.parent();
        tb.undo.add({undo:function(){element$.appendTo(p$)},
                     redo:function(){element$.insertBefore(target$)} });
      element$.insertBefore(target$);
    });
    
  }
  
  $.fn.undoableInsertAfter = function(target$) {
    // same as $.insertAfter(target$) but can be undone
    
    this.each(function(){
      var element$ = $(this);
      var p$ = element$.prev();
      if (p$.length) tb.undo.add({undo:function(){element$.insertAfter(p$)},
                                  redo:function(){element$.insertAfter(target$)} });
      else // no previous sibling ==> prepend to parent
        var p$ = element$.parent();
        tb.undo.add({undo:function(){element$.prependTo(p$)},
                     redo:function(){element$.insertAfter(target$)} });
      element$.insertAfter(target$);
    });
    
  }
  
  