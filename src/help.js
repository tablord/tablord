  // HELP system ///////////////////////////////////////////////////////////////////////
  // must be defined very early so that every module can also add documentation

  tb.HelpIndex = function() {
    // HelpIndex objects contain an index of all functions of the system
    // tb.help.index is created automatically by the system
    this.index = [];
    this.history = [];
    this.historyPos = -1;
  };
  tb.HelpIndex.className = 'tb.HelpIndex';

  tb.HelpIndex.prototype.update = function (object,path) {
    // update the index by adding all methods of object and all static methods of object
    // using path as base path. path must include the .

    for (var prop in object) {
      if (typeof object[prop] == 'function') {
        this.index.push({prop:prop,path:path,func:object[prop]});
        if (object[prop].className===path+prop) {
          this.update(object[prop].prototype,path+prop+'.prototype.');   // methods
          this.update(object[prop],path+prop+'.');                       // static methods
        }
      }
    }
    return this;
  };

  tb.HelpIndex.prototype.add = function(prop,path,markDownLines) {
    // adds a new entry in the help index with a markDown description
    // - prop: the name of the property
    // - path: the context of this property
    // - markDownLines: an array of lines in markDown
    if (markDownLines.length === undefined) throw new Error('HelpIndex.add: markDownLines must be an array like of line');
    this.index.push({prop:prop,path:path,desc:markDownLines});
  };

  tb.HelpIndex.prototype.find = function(name) {
    // return all entry corresponding to `name`: name can be partial
    // if name is a full path (ie. tb.help) the result is an exact match
    // if not (ie no . notation) any entry having name inside is valid
    var res = [];
    var i;
    var m = name.match(/^(.+\.)(.*)$/i);

    if (m) { // fully specified search ==> only one result
      var path = m[1];
      var prop = m[2];
      for (i=0;i<this.index.length;i++) {
        if ((this.index[i].prop === prop) && (this.index[i].path === path)) {
          res.push(this.index[i]);
          return res;
        }
      }
    }
    else { // free search
      var regExp = new RegExp('^(.*)('+name+')(.*)$','i');
      // first priority is find in prop
      for (i=0;i<this.index.length;i++) {
        if ((this.index[i].prop.search(regExp)!==-1) ||
            (this.index[i].path.search(regExp)!==-1)) res.push(this.index[i]);
      }
    }
    return res;
  };

  tb.HelpIndex.prototype.show =function(name) {
    // show in the help Panel the help on `name`
    this.history[++this.historyPos] = tb.helpSearch$.val();
    this.history.length = this.historyPos+1;
    tb.helpSearch$.val(name);
    tb.helpOutput$.html(tb.help.index.help$(name)).show(500);
  };

  tb.HelpIndex.prototype.back = function() {
    // return on the previous search
    if (this.historyPos>=0){
      var name = this.history[this.historyPos--];
      tb.helpSearch$.val(name);
      tb.helpOutput$.html(tb.help.index.help$(name));
    }
  };

  tb.HelpIndex.prototype.help$ = function(name) {
    // return the jquery in order to display the result of the search of `name`
    name = name.replace(/[\$\^\[\]\(\)\\]/g,'\\$&'); // fix chars that have a special meaning for regExp
    var regExp = new RegExp('^(.*)('+name+')(.*)$','i');
    var res = this.find(name);
    var n$ = $('<table style="margin-right:30px">');  //TODO: remove this magic number that reserves the space for the scroll bar (check with HTML5)
    try {
      var l = res.length;
      if (l>30) {
        l = 30;
        n$.append('<tr><td class="WARNING LEFT" colspan=2>'+res.length+' results: only '+l+' first results displayed</td></tr>');
      }

      for (var i = 0; i<l; i++) {
        var path = res[i].path.replace(/([\$\w]+)/ig,'<span class=HELPLINK>$1</span>');
        var desc = res[i].func?tb.help(res[i].func):tb.help.markDownToHtml(res[i].desc);
        n$.append($('<TR><TD valign="top" class=LEFT>'+path+res[i].prop.replace(regExp,'$1<b>$2</b>$3')+'</TD><TD class=LEFT>'+desc+'</TD></TR>'));
      }
    }
    catch (e) {
      n$ = $('<div class=ERROR>'+e.message+' res.length='+res.length+' l='+l+'i='+i+'<br>'+tb.inspect(res[i]).span()+'</div>');
    }
    return n$;
  }

  tb.HelpIndex.prototype.undocumentedClasses = function() {
    // return a list of index entries of function that are potential Classes (start with uppercase)
    // without proper documentation (ie. className property defined on the constructor)
    // for maintenance only
    var res = [];
    for (var i = 0;i<this.index.length; i++) {
      if (tb.constructorName(this.index[i].prop)){
        if (this.index[i].func && (this.index[i].func.className !== (this.index[i].path+this.index[i].prop))) {
          res.push(this.index[i]);
        }
      }
    }
    return res;
  }


  tb.HelpIndex.prototype.badlyDocumentedFunctions = function() {
    // return a list of index entries of function that are badly documented
    // for maintenance only
    var res = '<table>';
    var problems;
    for (var i = 0;i<this.index.length; i++) {
      if (this.index[i].func && (problems = tb.help.docQualityProblems(this.index[i].func))) {
        res += '<tr><th>'+this.index[i].path+this.index[i].prop+'</th><td class=LEFT>'+problems+'</td></tr>';
      }
    }
    return tb.html(res+'</table>');
  }


  tb.helps = {'tb.credits':tb.credits};

  tb.help = function(func) {
  // returns the signature of the function and the first comment in a pretty html
  //         followed by the content of the .[[help]]() static method of func if any
  // func: the function to be inspected

    if (func == undefined) {
      var h = '';
      for (var module in tb.helps) {
        h += tb.inspect(tb.helps[module],module).span();
      }
      return new tb.HTML(h);
    }
    var source = func.toString().split('\n');
    var comments = []
    var signature = tb.signature(func);
    var parameters = signature.replace(/(\/\*.*?\*\/)/g,'')   // remove comments /*...*/
                              .replace(/\s+/,'')              // remove any spaces
                              .replace(/^.*\((.*)\).*$/,'$1') // keep only what is between ()
    if (parameters === '') parameters = undefined
    else                   parameters = parameters.split(',');

    if (func.className){
      comments.push('constructor for '+func.className+' objects')
      comments.push('');
    }

    for (var i=1; i<source.length; i++) {
      var comment = source[i].match(/^\s*\/\/(.*)/);
      if (comment && (comment.length ==2)) {
        comments.push(comment[1]);
      }
      else break;
    }
    var methods = '';
    if (func.className) {
      methods = '<fieldset><legend>methods</legend><table>';
      for (var m in func.prototype) {
        if (typeof func.prototype[m] === 'function'){
          methods += '<tr><th valign="top">'+m+'</th><td valign="top" style="text-align:left;">'+tb.help(func.prototype[m])+'</td></tr>';
        }
      }
      methods += '</table></fieldset><fieldset><legend>static methods</legend><table>';
      for (var m in func) {
        if (typeof func[m] === 'function'){
          methods += '<tr><th valign="top">'+m+'</th><td valign="top" style="text-align:left;">'+tb.help(func[m])+'</td></tr>';
        }
      }
      methods += '</table></fieldset>';
    };
    return new tb.HTML('<SPAN class=HELP><b>'+signature+'</b><br/>'+tb.help.markDownToHtml(comments,parameters)+(func.help?func.help():'')+methods+'</SPAN>');
  }

  // Markdown //// simplified version: TODO replace with better implementation
  tb.help.markDownToHtml = function(markDownLines,parameters) {
    // convert markDown to HTML with link for the help
    // - markDownLines: an array of comments in markDown
    // - parameters: an array of parameters that will be marked as parameters in the text
    // any line starting with .xxxx or - xxxx will be considered as a definition
    // .property describes the property
    // - parameter describes the parameter
    var h = '';
    if (parameters && (parameters.length > 0)) {
      var parameterRegExp = new RegExp('(\\W)('+parameters.join('|')+')(\\W)','g');
    }
    else {
      var parameterRegExp = /ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â©ÃƒÆ’¶ very improbable string that never match/g;
    }
    for (var i = 0; i<markDownLines.length; i++) {
      h += markDownLines[i]
      .replace(/^\s+(\.\S+)/,'<dt>$1<dd>')
      .replace(/^\s+- +(\S+)/,'<dt>$1<dd>')
      .replace(/-{4,}/g,'<hr>')
      .replace(/\s\*\*(\S.*)\*\*\s/g,'<em>$1</em>')
      .replace(/\s\*(\S.*)\*\s/g,'<strong>$1</strong>')
      .replace(/`(.+?)`/g,'<span class="CODEEXAMPLE">$1</span>')
      .replace(/\[\[(.+?)\]\]/g,'<span class=HELPLINK onclick="tb.help.index.show(\'$1\');">$1</span>')
      .replace(parameterRegExp,'$1<span class=PARAMETER>$2</span>$3')
      +'<br>';
    }
    return h;
  }

  tb.help.docQualityProblems = function(func) {
    // list all non quality criteria of a function documentation
    // returns null if everything is ok
    //         or an HTML object listing all problems found
    // - func: the function to check
    var problems = new tb.HTML();

    var source = func.toString().split('\n');
    var comments = []
    var signature = tb.signature(func);
    var parameters = signature.replace(/(\/\*.*?\*\/)/g,'').replace(/^.*\((.*)\).*$/,'$1').split(',');

    for (var i=1; i<source.length; i++) {
      var comment = source[i].match(/^\s*\/\/(.*)$/);
      if (comment && (comment.length ==2)) {
        comments.push(comment[1]);
      }
      else break;
    }
    if (comments.length === 0) {
      problems.li('no documentation comment');
      return problems;
    }

    comment = comments.join(' ');

    for (var i in parameters) {
      if (comment.search(parameters[i]) === -1) problems.li('parameter '+parameters[i]+' is not described');
    }

    if (problems.toString() === '') return null;
    return problems;
  }


  tb.help.index = new tb.HelpIndex();

  tb.help.add = function(prop,path,markDown) {
    // add a topic to the help index
    tb.help.index.add(prop,path,markDown);
  }

  tb.help.add('How to document functions','',[
    'comments that are directly following the function declaration are considered as the public documentation '+
    'of the function, using some kind of markDown syntax',
    '',
    'the text is taken just after the // of the comment line and is transformed in the following manner',
    '',
    'parameters are automatically search in text and marked as <span class=PARAMETERS>parameter</span> ',
    'if the line starts with .xxxxxx or - yyyyyyy it is considered as a description of a method / parameter',
    'text between two [ and two] is linked to the equivalent topic like this [[tb.help]]',
    'text between grave accent (ascii 96) `code` ']);

  tb.help.add('ELEMENT','DOM class=',['an ELEMENT is a DOM element of the document that can be [[SELECTED]].',
                                      'an ELEMENT can also be [[CODE]], [[RICHTEXT]] or [[SECTION]].',
                                      'for other templates:',
                                      '[[itemtype]] specifies the template,',
                                      '[[itemprop]] comes from the [[container]] attribute of the parent container or is "item"',
                                      '[[itemscope]] is also set to be complient with microData (cf [[getMicroData]])']);
  tb.help.add('SELECTED','DOM class=',['an SELECTED [[ELEMENT]] is the DOM element of the document that is currently SELECTED']);
  tb.help.add('CODE','DOM class=',['a CODE [[ELEMENT]] is a DOM element of the document that contains JavaScript CODE. It can also have the [[EMBEDDED]]']);
  tb.help.add('AUTOEDIT','DOM class=',['a [[CODE]] [[ELEMENT]] that is AUTOEDIT is modified automatically by the corresponding [[EDITOR]]s since it contains the .[[edit]]() of an [[EditableObject]]']);
  tb.help.add('EMBEDDED','DOM class=',['a EMBEDDED [[CODE]] [[ELEMENT]] is a DOM element of the document that contains JavaScript CODE but inside another ELEMENT (usually [[RICHTEXT]]).',
                                       'EMBEDDED CODE are hidden unless the parent ELEMENT is edited, so only the OUPUT is visible.']);
  tb.help.add('CODE','DOM class=',['a CODE [[ELEMENT]] is a DOM element of the document that contains JavaScript CODE. It can also have the [[EMBEDDED]]']);
  tb.help.add('RICHTEXT','DOM class=',['a RICHTEXT [[ELEMENT]] is a DOM element of the document that contains HTML that can be freely edited.',
                                       'It can also include [[EMBEDDED]] [[CODE]] [[ELEMENT]]' ]);
  tb.help.add('SECTION','DOM class=',['a SECTION [[ELEMENT]] is a DOM element of the document that contains a [[SECTIONTITLE]] and a [[container]].',
                                       'It helps to structure the document, is automatically numbered and [[tb.tableOfContent]] is updated automatically' ]);
  tb.help.add('SECTIONTITLE','DOM class=',['a SECTIONTITLE is the DOM element of the title of a [[SECTION]].',
                                       'It will be automatically numbered and [[tb.tableOfContent]] is updated automatically',
                                       'title can be used in {{#title}} or {{##title}} instead of id']);

  tb.help.add('CODE','DOM class=',['a CODE [[ELEMENT]] is a DOM element of the document that contains JavaScript CODE. It can also have the [[EMBEDDED]]']);

  tb.help.add('INTERACTIVE','DOM class=',['DOM element with a INTERACTIVE class will stop propagation of click, so a <DIV class=INTERACTIVE> can hold other DOM Element that will have onclick event handlers']);


  tb.help.add('container','DOM attribute ',['a DOM element that has the attribute container="name" is a container that accepts other [[ELEMENT]]'+
                                            ' as content. normally such an element also has the [[templates]] attribute',
                                            ' if the name ends with [], it means that this container can accept multiple [[ELEMENTS]]']);
  tb.help.add('templates','DOM attribute ',['a DOM element that has the attribute templates="template1 template2..." is an element that must '+
                                            ' also have the [[container]] attribute, so it can accept one or many of the specified templates as content.',
                                            ' if this attribute is missing all templates are accepted']);

  tb.help.add('itemtype','DOM attribute ',['a DOM [[ELEMENT]] that has itemtype attribute is a template ',
                                           'it also has the [[itemscope]] attribute also have the [[container]] attribute, so it can accept one or many of the specified templates as content.',
                                            ' if this attribute is missing all templates are accepted']);

  tb.help.add('{{  }} reformat','reformat ',['in a [[RICHTEXT]] [[ELEMENT]] you can type {{code}} in order to place an [[EMBEDDED]] [[CODE]] ',
                                           'there are some shortcuts:',
                                           '{{#title or id or url}} creates a link to a given title or id or url by creating EMBEDDED CODE [[tb.link]]("title or id")',
                                           '{{##title or id}} creates a box with the content of title or id by creating EMBEDDED CODE [[tb.elementBox]]("title or id")']);

  tb.help.add('Feature','Interface', ['an global object like tb.tableOfContent must implement the **Feature interface** which is composed of the following methods:',
                                      '- reset(): the reset method is called before the execution od the sheet ([[tb.execAll]] or [[tb.execUntil]]). it should erase all data from a previous execution',
                                      '- update(): before the execution this method (if it exists) will give a chance to update the document or the object with the current version of the document']);

  tb.help.update = function(object,path) {
    // update the help index with all functions of object that will be recorded under path
    tb.help.index.update(object,path);
  }

