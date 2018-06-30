//  pell: adapté pour IE7
///////////////////////////

(function(global,factory){
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) : 
                                                                 typeof define === 'function' && define.amd ? define(['exports'],factory):
                                                                                                              (factory((global.pell = {})));
} (this, (function(exports) {
  'use strict';

  var _extends = Object.assign || function(target) {
    for (var i = 1; i < arguments.length;i++) {
      var source = arguments[i];
      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source,key)){
          target[key] = source[key];
        }
      }
    }
    return target;
  };

  var defaultParagraphSeparatorString = 'defaultParagraphSeparator';
  var formatBlock = 'formatBlock';
  var addEventListener = function addEventListener(parent,type,listener) {  
    return parent.attachEvent('on'+type, listener);              //**** 28 addEventListener = attachEvent in IE7 
  };
  var appendChild = function appendChild(parent,child) {
    return parent.appendChild(child);
  };
  var createElement = function createElement(tag) {
    return window.document.createElement(tag);                    //***** 34
  };
  var queryCommandState = function queryCommandState(command) {
    return window.document.queryCommandState(command);            //***** 37
  };
  var queryCommandValue = function queryCommandValue(command) {
    return window.document.queryCommandValue(command);            //***** 40
  };
  var exec = function exec(command /*,value */) {
    var value = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
    return window.document.execCommand(command, false, value);
  };

  var defaultActions = {
    bold: {
      icon:  '<b>B</b>',
      title: 'Bold',
      state: function state() {
        return queryCommandState('bold');
      },
      result: function result() {
        return exec('bold');
      }
    },
    italic: {
      icon: '<i>I</i>',
      title: 'Italic',
      state: function state () {
        return queryCommandState('italic');
      },
      result: function result() {
        return exec('italic');
      }
    },
    underline: {
      icon: '<u>U</u>',
      title: 'underline',
      state: function state () {
        return queryCommandState('underline');
      },
      result: function result() {
        return exec('underline');
      }
    },
    strikethrough: {
      icon: '<strike>U</strike>',
      title: 'underline',
      state: function state () {
        return queryCommandState('strikeThrough');
      },
      result: function result() {
        return exec('strikeThrough');
      }
    },
    heading1: {
      icon: '<b>H1</b>',
      title: 'Heading 1',
      result: function result() {
        return exec(formatBlock, '<h1>');
      }
    },
    heading2: {
      icon: '<b>H2</b>',
      title: 'Heading 2',
      result: function result() {
        return exec(formatBlock, '<h2>');
      }
    },
    paragraph: {
      icon: '&#182;',
      title: 'Paragraph',
      result: function result() {
        return exec(formatBlock, '<p>');
      }
    },
    olist: {
      icon: '&#35;',
      title: 'Ordered List',
      result: function result() {
        return exec('insertOrderedList');
      }
    },
    ulist: {
      icon: '&#8226;',
      title: 'Unordered List',
      result: function result() {
        return exec('insertUnorderedList');
      }
    },
    code: {
      icon: '&lt;/&gt;',
      title: 'Code',
      result: function result() {
        return exec(formatBlock, '<pre>');
      }
    },
    line: {
      icon: '&#8213;',
      title: 'Horizontal Line',
      result: function result() {
        return exec('insertHorizontalRule');
      }
    },
    link: {
      icon: '&#128279;',
      title: 'Link',
      result: function result() {
        var url = window.prompt('Enter the link URL');
        if (url) exec('createLink',url);
      }
    },
    image: {
      icon: '&#128247;',
      title: 'Image',
      result: function result() {
        var url = window.prompt('Enter the image URL');
        if (url) exec('insertImage',url);
      }
    }
  };

  var defaultClasses = {
    actionbar: 'pell-actionbar',
    button: 'pell-button',
    content: 'pell-content',
    selected: 'pell-selected'
  };

  var init = function init(settings) {

    var actions = settings.actions ? JQuery.map(settings.actions,
      function (action) {
        if (typeof action === 'string') return defaultActions[action];
        else if (defaultActions[action.name]) return _extends({},defaultActions[action.name],action);
        return action;
      }): JQuery.map(jc.keys(defaultActions),function(action) {
        return defaultActions[action];
      });

    var classes = _extends({}, defaultClasses, settings.classes);

    var defaultParagraphSeparator = settings[defaultParagraphSeparatorString] || 'div';

    var actionbar = createElement('div');
    actionbar.className = classes.actionbar;
    appendChild(settings.element,actionbar);

    var content = settings.element.content = createElement('div');
    content.contentEditable = true;
    content.className = classes.content;
    content.onchange = function(_ref) {
a('onchange',window.event.srcElement,ref);
      var firstChild = window.event.srcElement.firstChild;  //***** 201  target is  srcElement is IE7
      if (firstChild && firstChild.nodeType === 3) exec ( formatBlock, '<'+defaultParagraphSeparator+'>');
      else if (content.innerHTML === '<br>') content.innerHTML = '';
      settings.onChange(content.innerHTML);
    };
    content.onkeydown = function(event) {
      event = event || window.event;    //**** for IE 7
//a('onkeydown',event);
      if (event.keyCode === 9) {     //*** key not supported by IE7   tab = 9
        event.returnValue = false;    //*** preventDefault() is returnValue in IE7
      }
      else if (event.keyCode === 13 && queryCommandValue(formatBlock) === 'blockquote') {  //enter = 13
a('enter');
        window.setTimeout(function() {
a('timeout');
          return exec(formatBlock,'<'+defaultParagraphSeparator+'>');
        },0);
      }
    };
    appendChild(settings.element,content);
    
    JQuery.each(actions,function(i,action) {        //**** adapté à IE7 + JQuery
      var button = createElement('button');
      button.className = classes.button;
      button.innerHTML = action.icon;
      button.title = action.title;
      button.setAttribute('type','button');
      button.onclick  = function() {
        return action.result() && content.focus();
      };
      if (action.state) {
        var handler = function handler() {return $(button).toggleClass(classes.selected,action.state());}  //*** attention valeur retour
        addEventListener(content, 'keyup', handler);   //** à adapter
        addEventListener(content, 'mouseup', handler);
        addEventListener(button, 'click', handler);
      }
      appendChild(actionbar,button);
    }); 
////
      var button = createElement('button');
      button.className = classes.button;
      button.innerHTML = 'cde';
      button.title = 'encode';
      button.setAttribute('type','button');
      button.onclick  = function() {
        content.innerHTML = content.innerHTML.replace(/\&lt;\$(.*)\$\&gt;/g,'<SPAN class=CODE>&nbsp;$1</SPAN>');
        content.focus();
      };
      appendChild(actionbar,button);
      
////
    if (settings.styleWithCSS) exec('styleWithCSS');
    exec(defaultParagraphSeparatorString,defaultParagraphSeparator);
    return settings.element;
  };

  var pell = {
    exec: exec,
    init: init
  };
  
  exports.exec = exec;
  exports.init = init;
  exports['default'] = pell;

})));