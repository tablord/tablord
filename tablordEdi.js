// tablordEdi.js
//
// This is the core of tablord both defining the tb namespace that holds all global variables and functions
// and where all EDI behaviour is coded
//
// it needs the tablord.js library and jquery (for now 1.5.1)
//
// (CC-BY-SA 2019) according to https://creativecommons.org/
///////////////////////////////////////////////////////////////////////////////////////////////////////////////




  // global variables /////////////////////////////////////////////////

  var tb = {name:'Tablord',
            version:'0.1',
            authors:['Marc Nicole'],
            rights:'CC-BY-SA 2018',
            selectedElement:undefined,
            output: undefined,
                        //a new Output is created for each code.
                        //it hold both the code and output Elements as well as the htlm
                        //at init an empty object so _codeElement and _outputElement are undefined
                        //tb.output is only defined during user code execution in order to catch errors
                        //from user code in association with the right output.
                        //please note that tb.output == undefined during finalization code, but the finalization code
                        //defined by the user can still access output due to the closure mechanism of JavaScript

            traces:[],
            tracesMaxLength:100,
            htmlIndent:1,
            simulation:undefined, // will be set in tb.execAll()
            blockNumber:0,
            finalizations:[],     // a stack of output to be finalized

            intervalTimers:[],    // a list of intervalTimer handle in order to kill them (clearInterval) at the next run
            inAnimation:false,    // true when execution take place through tb.animate()
            modified:false,       // file is modified

            templates:{},         // all native, locally defined and imported templates

            vars:{},              // where all user variables are stored

            autoRun:true,
            features:[],          // list of Features. cf tb.Features for more informations
            url:{},               // the url of the sheet decomposed in protocol {host user password domain path fileName ext tag search arguments}
            results:{},           // if != {}, when the sheet is closed a file with the same name .jres will be written and its content is JSON.stringify(tb.results)

            defaults:{
              format:{            // default formating methods  this can be redefined in some Tablord objects like v table... in options.
                undef:function(){return '<SPAN style=color:red;>undefined</SPAN>'},
                nullObj:function(){return '<SPAN style=color:red;>null</SPAN>'},
                emptStr:function(){return '<SPAN style=color:red;>empty string</SPAN>'},
                func:function(f){return tb.help(f)},
                array:function(a){return a.toString()},
                domElement:function(element){return 'DOM Element<SPAN class="INSPECTHTML">'+tb.toHtml(tb.trimHtml(tb.purgeJQueryAttr(element.outerHTML)))+'</SPAN>'},
                obj:function(obj){return tb.inspect(obj).span().toString()},
                date:function(date){return date.yyyymmdd()},
                number:function(n){return n.toString()},
                string:function(s){return s}
              }
            },

            errorHandler:function(message,url,line) {
              // the default handler called by JavaScript giving the message, the url of the page or script and the faulty line
              var out  = tb.output.outputElement;
              if (out) {
                if (url) {
                  out.innerHTML = message+'<br>'+url+' line:'+line+'<br>'+trace.span();
                }
                else {
                  var code = tb.errorHandler.code || '';
                  var faults = message.match(/« (.+?) »/);
                  if (faults != null) {
                    var fault = faults[1];
                    code = tb.output.codeElement.innerHTML
                             .replace(/ /g,'&nbsp;')
                             .replace(new RegExp(fault,'g'),'<SPAN class="WRONG">'+fault+'</SPAN>');
                    tb.output.codeElement.innerHTML = code
                    tb.selectElement(tb.output.codeElement);
                  }
                  out.innerHTML = trace.span()+message;
                }
                $(out).removeClass('SUCCESS').addClass('ERROR');
                out.scrollIntoView();
                return true;
              }
              return false;
            }
           };


  tb.credits = {name:tb.name,version:tb.version,authors:tb.authors,rights:tb.rights};

  // HELP system ///////////////////////////////////////////////////////////////////////
  // must be defined very early so that every module can also add documentation

  tb.HelpIndex = function() {
    // HelpIndex objects contain an index of all functions of the system
    // tb.help.index is created automatically by the system
    this.index = [];
    this.history = [];
    this.historyPos = -1;
  }
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
  }

  tb.HelpIndex.prototype.add = function(prop,path,markDownLines) {
    // adds a new entry in the help index with a markDown description
    // - prop: the name of the property
    // - path: the context of this property
    // - markDownLines: an array of lines in markDown
    if (markDownLines.length === undefined) throw new Error('HelpIndex.add: markDownLines must be an array like of line');
    this.index.push({prop:prop,path:path,desc:markDownLines});
  }

  tb.HelpIndex.prototype.find = function(name) {
    // return all entry corresponding to `name`: name can be partial
    // if name is a full path (ie. tb.help) the result is an exact match
    // if not (ie no . notation) any entry having name inside is valid
    var res = [];
    var m = name.match(/^(.+\.)(.*)$/i);

    if (m) { // fully specified search ==> only one result
      var path = m[1];
      var prop = m[2];
      for (var i=0;i<this.index.length;i++) {
        if ((this.index[i].prop === prop) && (this.index[i].path === path)) {
          res.push(this.index[i]);
          return res;
        }
      }
    }
    else { // free search
      var regExp = new RegExp('^(.*)('+name+')(.*)$','i');
      // first priority is find in prop
      for (var i=0;i<this.index.length;i++) {
        if ((this.index[i].prop.search(regExp)!==-1) ||
            (this.index[i].path.search(regExp)!==-1)) res.push(this.index[i]);
      }
    }
    return res;
  }

  tb.HelpIndex.prototype.show =function(name) {
    // show in the help Panel the help on `name`
    this.history[++this.historyPos] = tb.helpSearch$.val();
    this.history.length = this.historyPos+1;
    tb.helpSearch$.val(name);
    tb.helpOutput$.html(tb.help.index.help$(name)).show(500);
  }

  tb.HelpIndex.prototype.back = function() {
    // return on the previous search
    if (this.historyPos>=0){
      var name = this.history[this.historyPos--];
      tb.helpSearch$.val(name);
      tb.helpOutput$.html(tb.help.index.help$(name));
    }
  }

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
      var parameterRegExp = /éèàö very improbable string that never match/g;
    }
    for (var i = 0; i<markDownLines.length; i++) {
      h += markDownLines[i]
      .replace(/^\s+(\.\S+)/,'<dt>$1<dd>')
      .replace(/^\s+- +(\S+)/,'<dt>$1<dd>')
      .replace(/-{4,}/g,'<hr>')
      .replace(/\s\*\*(\S.*)\*\*\s/g,'<em>$1</em>')
      .replace(/\s\*(\S.*)\*\s/g,'<strong>$1</strong>')
      .replace(/`(.+?)`/g,'<code>$1</code>')
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
                                      '[[itemprop]] comes from the [[container]] attribute of the parent container or is "items"',
                                      '[[itemscope]] is also set to be complient with microData (cf [[getMicroData]])']);
  tb.help.add('SELECTED','DOM class=',['an SELECTED [[ELEMENT]] is the DOM element of the document that is currently SELECTED']);
  tb.help.add('CODE','DOM class=',['a CODE [[ELEMENT]] is a DOM element of the document that contains JavaScript CODE. It can also have the [[EMBEDDED]]']);
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

  // classical formating functions ////////////////////////////////////////////

  tb.Format = function() {
    // this class is compatible with the format property of options object used in tb.format(value,options)
    // but it has methods that helps to build this object
  }
  tb.Format.className='tb.Format';

  tb.Format.prototype.fixed = function(decimals) {
    // returns a formating object {number:function(obj)} that formats the number with fixed decimals
    var o = this.constructor === tb.Format?this:new tb.Format();
    var f = function (n) {return n.toFixed(decimals)};
    f.toString = function() {return 'display precision of '+decimals+' decimals'};
    o.number = f;
    return o;
  }

  tb.Format.prototype.undefinedBlank = function() {
    // returns a format object {undef:f()}
    var o = this.constructor === tb.Format?this:new tb.Format();
    var f = function () {return ''};
    f.toString = function() {return 'undefined is blank'};
    o.undef = f;
    return o;
  }

  tb.Format.prototype.percent = function(decimals) {
    // returns a fomating function(obj) that formats the number with fixed decimals
    var o = this.constructor === tb.Format?this:new tb.Format();
    var f = function (n) {return Number(100*n).toFixed(decimals)+'%'};
    f.toString = function() {return 'display number as percent with a precision of '+decimals+' decimals'};
    o.number = f;
    return o;
  }

  $.extend(tb,tb.Format.prototype); // make those methods directly availlable to tb

  tb.getScrollOffsets = function(w) {
    // return the scroll offset for the window w. if w is not specified, window is used
    w = w||window;
    if(w.pageXOffset != null) return {left:w.pageXOffset, top:w.pageYOffset};

    //for IE
    var d = w.document;
    if (window.document.compatMode == "CSS1Compat")
      return {left:d.documentElement.scrollLeft, top:d.documentElement.scrollTop};

    // for browser in quirks mode
    return {left:d.body.scrollLeft, top: d.body.scrollTop };
  }

  tb.getViewPortSize = function(w){
    // return {width,height} of the window w. if w is undefined, window is used
    w = w||window;
    if (w.innerWidth != null) return {width:w.innerWidth,Height:w.innerHeight};

    var d = w.document;
    if (window.document.compatMode == "CSS1Compat")
      return {width:d.documentElement.clientWidth, height:d.documentElement.clientHeight};

    return {width:d.body.clientWidth, height:d.body.clientHeight};
  }



  // some new Date methods

  Date.prototype.nextMonth = function nextMonth(n) {
    // return a date that is one month ahead than date
    var d = new Date(this);
    d.setMonth(d.getMonth()+(n||1));
    return d;
  }

  Date.prototype.nextYear = function nextYear(n) {
    // return a date that is one month ahead than date
    var d = new Date(this);
    d.setFullYear(d.getFullYear()+(n||1));
    return d;
  }

  Date.prototype.adjustDay = function AdjustDay(day) {
    // return a date that is the same month but different day if day is not undefined
    var d = new Date(this);
    d.setDate(day);
    return d;
  }

  Date.prototype.yyyymmdd = function () {
    // return the date in yyyy-mm-dd format
    return this.getFullYear()+'-'+tb.pad(this.getMonth()+1,2)+'-'+tb.pad(this.getDate(),2);
  }


  //JQuery extentions /////////////////////////////////////////////////

  $.fn.span = function() {
    var s = ['<ol start=0>'];
    for (var i=0; i < this.length; i++) {
      switch (this[i].nodeType) {
        case 1:
          s.push('<li class="INSPECTHTML">'+tb.toHtml(tb.trimHtml(tb.purgeJQueryAttr(this[i].outerHTML))));
          break;
        case 3:
          s.push('<li class="INSPECTHTML">textNode: "'+this[i].nodeValue+'"');
          break;
        default:
          s.push('<li class="INSPECTHTML">node type '+this.nodeType)
          break;
      }
    }
    s.push('</ol>');
    return new tb.HTML('JQuery of '+this.length+' elements<br>'+s.join('<br>'));
  }

  $.fn.toString = function(){
    return '[object JQuery] length:'+ this.length;
  }

  $.fn.inspectString = function(){
    var r = this.toString()+'\n';
    for (var i = 0;i<this.length;i++) {
      r += i+') '+this[i].outerHTML+'\n';
    }
    return r;
  }

  $.fn.asNode = function() {
    var query = this;
    return {node$:function() {return query}}
  }

  $.fn.getItems = function(url) {
    // get the matching itemtypes that are descendent of the jquery
    // please note that if an itemtype is embeeded in another instance of itemtype, both will be part of the result
    return this.find('[itemtype~="'+url+'"]');
  }

  $.getItems = function(url) {
    // get all itemtype = url of the document.
    return $('[itemtype~="'+url+'"]');
  }

  $.fn.getItemProp = function(itemprop) {
    // get the first matching itemprop of the first elements of the jquery
    // all elements should be itemscope
    var e = this[0];
    return this.find('[itemprop='+itemprop+']').filter(function(){return $(this).closest('[itemscope=""]')[0] == e}).first().html();
  }

  $.fn.setItemProp = function(itemprop,html) {
    // set the itemprop of the elements of the jquery
    // all elements should be itemscope
    this.each(function(i,e) {
      $(e).find('[itemprop='+itemprop+']').filter(function(){return $(this).closest('[itemscope=""]')[0] == e}).html(html);
    });
    return this;
  }

  $.fn.getItemscopeMicrodata = function() {
    // this must be a single itemscope element jQuery
    // return the microdata under the scope as an object
    // {type:url,
    //  properties: {...},
    //  id:...}   //In addition to microdata specification

    if (! this.is('[itemscope=""]')) throw new Error('getItemscopeMicrodata must be called on a jquery having a itemscope');
    var result={id:this.attr('id') || undefined,
                type:this.attr('itemtype') || '',
                properties:this.children().getMicrodata()}
    return result;
  }

  $.fn.getItemValue = function(){
    // return the value of an element handling all specifications of microdata of the getter of itemValue
    var e = this[0];
    if (e.itemprop === undefined) return null;
    if (e.itemscope) return e;
    if (e.tagName === 'META') return e.content;
    if ($.inArray(e.tagName,['AUDIO','EMBED','IFRAME','IMG','SOURCE','TRACK','VIDEO'])!=-1) return e.src;
    if ($.inArray(e.tagName,['A','AREA','LINK'])!=-1) return e.href;
    if (e.tagName === 'OBJECT') return e.data;
    if ($.inArray(e.tagName,['DATA','METER','SELECT'])!=-1) return this.val();
    if (e.tagName === 'TIME') return e.datetime?e.datetime:this.text();
    return this.text();
  }

  $.fn.setItemValue = function(value){
    // set the value of an element handling all specifications of microdata of the getter of itemValue
    var e = this[0];
    if (e.itemprop === undefined) throw new Error("can't set the itemprop value of an element that is not an itemprop\n"+e.outerHTML);
    else if (e.tagName === 'META') e.content = value;
    else if ($.inArray(e.tagName,['AUDIO','EMBED','IFRAME','IMG','SOURCE','TRACK','VIDEO'])!=-1) e.src=value;
    else if ($.inArray(e.tagName,['A','AREA','LINK'])!=-1) e.href=value;
    else if (e.tagName === 'OBJECT') e.data=value;
    else if ($.inArray(e.tagName,['DATA','METER','SELECT'])!=-1) this.val(value);
    else if (e.tagName === 'TIME') {
      if (e.datetime) {
        e.datetime=value;
      }
      else {
        this.text(value);
      }
    }
    else this.text(value);
    return this;
  }




  $.fn.getItemscopeData = function() {
    // jquery must be a single itemscope element
    var data = {};

    function set(itemprop,value) {
      if (itemprop.slice(-2) == '[]') {
        data[itemprop] = data[itemprop] || [];
        data[itemprop].push(value);
      }
      else {
        data[itemprop] = value;
      }
    }

    if (this[0].id) data._id = this[0].id;
    this.children().each(function(i,element) {
      var itemprop = element.itemprop;
      if (itemprop !== undefined) {
        if (element.itemscope !== undefined) {
          set(itemprop,$(element).getItemscopeData());
        }
        else {
          set(itemprop,$(element).getItemValue());
        }
      }
      else {  // this node is not an itemprop, look if its children have data
        $.extend(true,data,$(element).getItemscopeData());
      }

    });
    return data;
  }

  $.fn.getData = function(criteria,fields) {
    // return data object for the jQuery, very similarly as a mongoDB .find
    // the object is NOT compatible with microdata (cf [[getMicroData]]), but much easier to use
    // even if not as flexible as microdata
    // it assumes that propertie's name that are arrays end with []
    // and all other properties have 0 or 1 value
    // this function assume that all jQuery elements are itemscope
    // So it is possible to get data from nested nodes
    // and is the responsibility of the caller to know what to do
    // the parameter result is only intended for recusivity purpose and should be undefined
    // the structure also set "_id" if id is defined at the itemscope element
    result = [];
    this.each(function(i,element){
      var data = $(element).getItemscopeData();
      if (tb.objMatchCriteria(data,criteria)) {
        if (fields == undefined){
          result.push(data);
        }
        else {
          var ro = {};
          for (var f in fields) {
            if (fields[f] == 1) ro[f] = data[f];
          }
          result.push(ro);
        }
      }
    });
    return result;
  }

  $.fn.getMicrodata = function(result) {
    // return microdata object for the jQuery.
    // the object is JSON compatible with the HTML Microdata specification
    // the only difference with the specifications is that the JQuery's element are
    // not checked for beeing top level microdata item. So it is possible to get microdata from nested nodes
    // and is the responsibility of the caller to know what to do
    // the parameter result is only intended for recusivity purpose and should be undefined
    // in addition to the microdata specifications, the structure also set "id" if id is defined at the itemscope element
    // see also [[getData]] for simple usage
    var result = result || {};
    this.each(function(i,e){
      var e$ = $(e);
      if (e.itemprop) {
        if (result[e.itemprop] == undefined) result[e.itemprop] = [];
        if (e.itemscope !== undefined) {
          result[e.itemprop].push(e$.getItemscopeMicrodata());
        }
        else {
          result[e.itemprop].push(e$.getItemValue());
        }
      }
      else if (e.itemscope !== undefined) {
        if (result.items === undefined) result.items = [];
        result.items.push(e$.getItemscopeMicrodata());
      }
      else { // just an intermediate node
        e$.children().getMicrodata(result);
      }
    });
    return result;
  }

  $.fn.setMicrodata = function(data) {
    // set the itemprop elements under all elements of the jQuery
    // all nodes of the jquery should be itemscope
    // if a node doesn't have an itemprop, "items" is assumed
    // PLEASE NOTE that data will be modified.
    // data is structured as JSON microdata specifies.
    // as all itemprop are arrays (since it is legal to have multiple itemprops having the same name)
    // every itemprop will "consume" the first element of the array
    this.each(function(i,e){
      if (e.itemscope !== undefined)  {
        var itemprop = e.itemprop?e.itemprop:'items';
        var subData = data && data[itemprop] && data[itemprop].shift();
        if (subData !== undefined) {
          $(e).children().setMicrodata(subData.properties);
        }
      }
      else {
        if (e.itemprop) {
          var subData = data && data[e.itemprop] && data[e.itemprop].shift();
          if (subData) {
            $(e).setItemValue(subData);
          }
        }
        else { //an intermedate node look if anything to set in its children
          $(e).children().setMicrodata(data);
        }
      }
    });
    return this;
  }

  $.fn.filterFromToId = function(fromId,toId) {
    // filter the query to keep only query Element that are between the fromId element and toId element
    var inRange = false;
    return this.filter(function() {
      if (this.id === fromId) inRange=true;
      if (this.id === toId) inRange=false;
      return (this.id===toId) || inRange;
    })
  }

  $.fn.replaceText = function(regExp,replacement,accept){
    // like string.replace(regExp,replacement), but only acts on text of the elements of the jQuery (not on the TAG ot the attributes)
    // - accept: function(element) that return true if the text nodes of this element will be replaced
    //                                         undefined if the text nodes of this element will be untouched, but the children will be examined
    //                                         false if the element has to be completely skipped
    //
    // any text node that is part of this will be replaced (if the jquery was made with .contents()) (this is used internally in recusive search)
    accept = accept || function(){return true};

    for (var i = 0; i<this.length; i++) {
      switch (this[i].nodeType) {
        case 3:
          $(this[i]).replaceWith(this[i].nodeValue.replace(regExp,replacement));
          break;
        case 1:
          switch (accept(this[i])) {
            case true:
              $(this[i]).contents().replaceText(regExp,replacement,accept)
              break;
            case false:
              continue;
            case undefined:
              $(this[i]).children().replaceText(regExp,replacement,accept);
              break;
          }
          break;
      }
    }
    return this;
  }



  tb.help.update($,'$.');
  tb.help.update($.fn,'$.prototype.');

  tb.getItems$ = function(url) {
    // returns a jQuery of all itemscope in the document having the itemtype=url
    // if url is undefined, gets all itemscope
    // if url ends with # select any url that match any version
    //   ex: http://www.tablord.com/templates/product#
    //     matches
    //       http://www.tablord.com/templates/product#1line
    //       http://www.tablord.com/templates/product
    //       http://www.tablord.com/templates/product#2
    //
    if (url === undefined) {
      var items$ = $('[itemscope=""]');
    }
    else if (url.slice(-1) === '#') {
      var items$ = $('[itemtype^="'+url.slice(0,-1)+'"]');
    }
    else {
      var items$ = $('[itemtype="'+url+'"]');
    }
    return items$.filter(function(){return $(this).parent().closest('[itemscope=""]').length === 0});
  }


  tb.get = function(/*path*/) {
    // applied as a method (either declare MyClass.prototype.get = tb.get or tb.get.call(obj,path)
    // returns this.path1.path2.path3 or undefined if at any stage it becomes undefined
    // and search also in this.parent is case of undefined property
    // enables a cascad search of a property
    var o = this;
    while (o) {
      var subO = o;
      for (var i=0;i<arguments.length;i++){
        subO = subO[arguments[i]];
        if (subO === undefined) break;
      }
      if (subO !== undefined) return subO;

      o = o.parent;
    }
    return undefined;
  }

  tb.set = function(value /*,path*/) {
    // set the value of the property of this.path1.path2... and creates, if needed the intermediate objects
    var o = this;
    for (var i=1;i<arguments.length-1;i++) {
      var p = o[arguments[i]];
      if (p === undefined) {
        o = o[arguments[i]] = {};
      }
      else {
        o = p;
      }
    }
    o[arguments[i]] = value;
    return this;
  }

  // functions for reduce /////////////////////////////////////////////
  tb.reduce = {};
  tb.reduce.sum = function(a,b) {return a+b};
  tb.reduce.min = Math.min;
  tb.reduce.max = Math.max;
  tb.reduce.sumCount = function(sc,b) {sc.count++;sc.sum+=b;return sc};

  // color functions //////////////////////////////////////////////////

  tb.hue = function(h) {
    // return {r:,g:,b:} for a given h hue
    h = h % 360;
    if (h<0) h+=360;

    if (h <  60) return {r:255,g:h/60*255,b:0};
    if (h < 120) return {r:255-(h-60)/60*255,g:255,b:0};
    if (h < 180) return {r:0,g:255,b:(h-120)/60*255};
    if (h < 240) return {r:0,g:255-(h-180)/60*255,b:255};
    if (h < 300) return {r:(h-240)/60*255,g:0,b:255};
    return {r:255,g:0,b:255-(h-300)/60*255};
  }

  tb.hsl = function(h,s,l) {
    // return a string 'rgb(...)' for h:hue s:saturation l:luminosity
    var color = tb.hue(h); //TODO integrate s,l
    return 'rgb('+color.r+','+color.g+','+color.b+')';
  }

  // JSON ///////////////////////////////////////////////////////////
  //
  // a replacement for ECMA5+

  try {
    var test = JSON == undefined; // in ECMA3 JSON doesn't exist and will make this statement crash
  }
  catch (e) {
    JSON = function(){
      // a replacement JSON class if JSON is missing
    };
    JSON.className='JSON';

    JSON.stringify = function(obj){
      // return a JSON string of obj

      if (typeof obj == 'number') {
        return obj.toString();
      }
      else if (typeof obj == 'string') {
        return '"'+obj.replace(/\\/g,'\\\\').replace(/"/g,"\\\"").replace(/\n/g,"\\n")+'"';
      }
      else if ($.isPlainObject(obj)) {
        var sa=[]
        $.each(obj, function(name,value) {sa.push(JSON.stringify(name)+':'+JSON.stringify(value))});
        return '{'+sa.join(',\n')+'}';
      }
      else if ($.isArray(obj)) {
        var sa=[];
        $.each(obj, function(i,value) {sa.push(JSON.stringify(value))});
        return '['+sa.join(',\n')+']';
      }
      else if (obj === undefined) {
        return 'undefined';
      }
      else if (obj.toJSON) {
        return obj.toJSON();  // if ECMA 5, will also work for dates
      }
      else if (obj.toUTCString) {  // fallback for IE7 that neither has toJSON nor toISOString
        return '"'+obj.toUTCString()+'"';
      }
      throw new Error("INTERNAL ERROR: can't stringify "+tb.inspect(obj));
    };

    JSON.parse = function(json){
      // parse json string and return a simple object corresponding to the json

      return (new Function('return '+json))();  //as jQuery does
    }

  }

  tb.help.update(JSON,'JSON.');
  tb.help.update({JSON:JSON},'');


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

  // general purpose helpers ////////////////////////////////////////////

  tb.summary = function(obj) {
    // return a 1 line summary of obj
    var l;
    if ($.isFunction(obj)) {
      l = tb.signature(obj);
    }
    else if (obj === null) {
      l = 'null';
    }
    else if (obj === undefined) {
      l = 'undefined';
    }
    else if (obj.toString) {
      l = obj.toString();
    }
    else {
      l = '['+typeof obj+']';
    }
    return l;
  }


  tb.inspect = function(obj,depth,name){
    // return an Inspector object so obj can be displayed either in an html or plain text context
    // - depth (default 1) give at what depth object properties are also inspected
    // - name (optional) gives a name to be shown in the display
    return new tb.Inspector(obj,depth,name);
  }

  tb.heir = function (p) {
    // return an heir of p
    if (p==null) throw TypeError();
    if (Object.create) return Object.create(p);
    var t=typeof p;
    if (t !== "object" && t !== "function") throw TypeError();
    function F(){};
    F.prototype = p;
    return new F();
  }

  tb.makeInheritFrom = function(newClass,ancestorClass) {
    // make a newClass inherit from another ancestorClass
    // workaround for the lack of Object.create() in IE7
    // TODO: in IE7 brings an issue since the "constructor" property of ".prototype" becomes enumerable
    //       for newClass. be carefull not to create infinite recursive loop by scanning all properties
    //       that will include "constructor", a reference to itself!
    // return this
    if (typeof newClass !== 'function') throw new Error("makeInheritFrom: newClass is not a function");
    if (typeof ancestorClass !== 'function') throw new Error("makeInheritFrom: ancestorClass is not a function");
    newClass.prototype = tb.heir(ancestorClass.prototype);
    newClass.prototype.constructor = newClass;
    return newClass;
  }

  tb.keys = function(obj) {
    // returns an Array with all keys (=non inherited properties) of an object
    // replacement for ECMA5
    var res = [];
    for (var k in obj) {
      if (obj.hasOwnProperty(k)) res.push(k);
    }
    return res;
  }

  tb.values = function(obj) {
    // returns an Array with all values of all non inherited properties of an object
    var res = [];
    for (var k in obj) {
      if (obj.hasOwnProperty(k)) res.push(obj[k]);
    }
    return res;
  }

  tb.copy = function(obj) {
    // makes a copy of obj this version only copies the first level
    // does not copy any inheritance (result is an Object instance)
    var o = {};
    for (var k in obj) {
      o[k] = obj[k]
    }
    return o;
  }

  tb.objMatchCriteria = function(obj,criteria) {
    // return true if obj is matching criteria
    // - criteria: an object specifying the values of some properties {prop1:value1,....}
    criteria = criteria || {};
    for (var k in criteria) {
      if (obj[k] !== criteria[k]) return false;
    }
    return true;
  }

  tb.findInArrayOfObject = function(criteria,a) {
    // find the first object in the array (or array like) of object a that has all criteria true
    // example tb.findInArrayOfObject({toto:5},[{toto:1,tutu:5},{toto:5}])
    // will return 1
    for (var i=0; i<a.length; i++) {
      if (tb.objMatchCriteria(a[i],criteria)) return i;
    }
    return -1;
  }

  tb.pad = function(integer,numberOfDigits){
    // return a string representing the integer, by filling with 0 in order to return a constant numberOfDigits
    return ('00000000000000000'+integer).slice(-numberOfDigits);
  }


  tb.urlComponents = function(urlOrFileName) {
    // return an object with all components of an url
    // - protocol
    // - user
    // - password
    // - domain
    // - port
    // - path
    // - fileName
    // - ext
    // - tag
    // - search
    //   - arguments (object param=values of search)
    // if url is an ordinary file name it is first transformed to an url with file:///
    var url = urlOrFileName.replace(/\\/g,'/');
    if (/file:|http[s]?:|mailto:|ftp:/i.test(url)==false) url='file:///'+url;
    var urlSplitRegExp = /(\w+):((\/\/((\w+):(\w+)@)?([\w\.]+)(:(\w+))?)|(\/\/\/(\w:)?))?(\/.+\/)?(.+)\.(\w+)(\#(\w+))?(\?(.+))?/;
    var comp = url.match(urlSplitRegExp);
    if (comp == null) throw new Error(url+" doesn't look like an URL");
    var res = {};
    res.protocol = comp[1];
    res.user     = comp[5];
    res.password = comp[6];
    res.domain   = comp[7];
    res.port     = comp[9];
    res.drive    = comp[11];
    res.path     = comp[12];
    res.fileName = comp[13];
    res.ext      = comp[14];
    res.tag      = comp[16];
    res.search   = comp[18] || '';
    if (res.drive) {
      res.absolutePath = res.drive+res.path;
    }
    else {
      res.absolutePath = res.protocol+'://'+res.domain+res.path;
    }
    var args = {};
    var pairs = res.search.split("&");
    for (var i=0;i< pairs.length;i++) {
      var pos = pairs[i].indexOf("=");
      if (pos == -1) {
        var name = pairs[i];
        if (name == '') continue;
        var value = true;
      }
      else {
        var name = pairs[i].substring(0,pos);
        var value= decodeURIComponent(pairs[i].substring(pos+1));
      }
      args[name] = value;
    }
    res.arguments = args;
    return res;
  }

  tb.fileName = function(url) {
    // return the fileName.ext of url (or os file)
    var comp = tb.urlComponents(url);
    return comp.fileName+'.'+comp.ext;
  }

  tb.absoluteFileName = function (relativeFileName,path) {
    // return a absolute path+filename combining the absolute path and the relative fileName
    // TODO implement all .\ : yet works only if relativeFileName has no path
    var comp = tb.urlComponents(relativeFileName)
    if (comp.path === '') {
      return path+comp.fileName+'.'+comp.ext;
    }
    return relativeFileName;
  }


  // Math helpers /////////////////

  tb.limit = function (value,min,max) {
    // return value bounded by min and max
    if (value < min) return min;
    if (value > max) return max;
    return value;
  }

  tb.sign = function(value){
    // returns 0 if value==0
    //         1 if value > 0
    //        -1 if value < 0
    return value===0?0:(value>0?1:-1);
  }

  tb.dist2 = function(p1,p2) {
    // return dist^2 between 2 points p1 and p2 {x,y}
    return Math.pow(p1.x-p2.x,2)+Math.pow(p1.y-p2.y,2);
  }

  tb.dist = function(p1,p2) {
    // return the distance between 2 points p1 and p2 {x,y}
    return Math.sqrt(tb.dist2(p1,p2));
  }

  // helpers specific to Tablord ////////////////////////////////////////////////////////////////////


  tb.purgeJQueryAttr = function(html) {
    // supress all jqueryxxx="yy" attributes in html, since they are meaningless for the user and also compromise the testability
    // since they depend on the context

    var reg = /(.*?)(<.+?>)/g;
    var res,lastIndex=0;
    var result = '';
    while ((res = reg.exec(html)) != null) {
      result += res[1]+res[2].replace(/\s*?jQuery\d+="\d"/g,'');
      lastIndex = res.lastIndex;
    };
    return result;
  }

  tb.htmlToText = function(html) {
    // transform the html content (from innerHTML) to a string as if this content is a text editor
    // removes any tags other than <BR> and <P>
    var res = html
              .replace(/<BR>/ig,'\n')
              .replace(/<P>/ig,'\n\n')
              .replace(/<.+?>/g,"")
              .replace(/&nbsp;/g," ")
              .replace(/&lt;/g,"<")
              .replace(/&gt;/g,">")
              .replace(/&amp;/g,"&");
    return res;
  }

  tb.toHtml = function(code) {
    // transform code in such a manner that the code can be visualised in a <pre>...
    return String(code)
             .replace(/&/g,"&amp;")
             .replace(/>/g,"&gt;")
             .replace(/</g,"<wbr>&lt;")  //indicate that < is a good point to wrap line if necessary
             .replace(/ /g,"&nbsp;")
             .replace(/\r/g,'')
             .replace(/\n/g,"<br>");
  }

  tb.isJSid = function (id) {
    // return true if id is a javaScript id
    return id.match(/^[\w$]+\w*$/) !== null;
  }

  tb.toJSCode = function(obj,stringQuote) {
    // return a string representing obj that can be interpreted by eval
    // stringQuote is by default ' but can be set to "
    stringQuote = stringQuote || "'";
    if (typeof obj == 'number') {
      return obj.toString();
    }
    else if (typeof obj == 'string') {
      if (stringQuote === '"') {
        return '"'+obj.replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/\n/g,"\\n")+'"';
      }
      else {
        return "'"+obj.replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\n/g,"\\n")+"'";
      }
    }
    else if (obj === undefined) {
      return 'undefined';
    }
    else if (obj === null) {
      return 'null';
    }
    else if (typeof obj === 'function') {
      return obj.toString();
    }
    else if (obj.toJSON) {
      return obj.toJSON();
    }
    else if ($.isArray(obj)) {
      var sa=[];
      $.each(obj, function(i,value) {sa.push(tb.toJSCode(value,stringQuote))});
      return '['+sa.join(',')+']';
    }
    else {
      var sa=[];
      $.each(obj, function(name,value) {
        if (!tb.isJSid(name)) name = tb.toJSCode(name,stringQuote);
        sa.push(name+':'+tb.toJSCode(value,stringQuote))
      });
      return '{'+sa.join(',')+'}';
    }
  }

  tb.htmlAttribute = function(attr,value) {
    // return a string as found in html tag for the attribute attr assigning a value
    var h = ' '+attr+'='+(typeof value == 'number'?value:'"'+tb.toHtml(value).replace(/"/g,'&quote;')+'"');
    return h;
  }

  tb.codeExample = function(example) {
    // return an html object with example wrapped in span class=CODEEXAMPLE
    return tb.html('<span class=CODEEXAMPLE>'+example+'</span>');
  }

  tb.trimHtml = function(html) {
  // suppress all unsignificant blanks of html and non visible char but keeps \n
    return html.replace(/[ \t\r]+/g,' ').replace(/> /g,'>').replace(/ </g,'<');
  }

  tb.textContent = function(html) {
  // return the text of html like textcontent that doesn't exist in IE7
  // first remove all tags having HIDDEN in class and then keeps the text only
  // TODO******** not ok for nested tags !!!! ********************************
  // PREFER [[$.text]]
    return html.replace(/\<.*?style\="DISPLAY\: none".*?\<\/.*?\>/g,'').replace(/\<.*?\>/g,'');
  }

  // helpers for functions /////////////////////////////////////////

  tb.signature = function(func) {
    // returns only the signature of the function
    var m = func.toString().match(/(function.*?\))/);
    if (m) return m[0];
    return func.toString();
  }

  tb.functionName = function (func) {
    // returns the name of the function or '' if an anonymous function
    return func.toString().match(/function *([a-zA-Z0-9_$]*)/)[1];
  }

  tb.constructorName = function(name) {
  // returns if name is a constructor name for a function
  // the last identified starting with a capital character
  // 'tb' --> false
  // 'Table' --> true
  // 'tb.Table' --> true
    if (typeof name !== 'string') return false;
    return (name.search(/[A-Z]/) === 0);
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

  tb.writeTestResults = function () {
    // if tb.arguments.testResultFileName, appends a line with {fileName:  ,nbPassed:  ,nbFailed: }

    if (tb.arguments.testResultFileName == undefined) return;

    var result = {
      fileName:window.document.location.href.match(/(.*)\?/)[1],
      nbPassed: $('.TEST.SUCCESS').length,
      nbFailed: $('.TEST.ERROR').length
    }
    tb.fso.writeFile(tb.arguments.testResultFileName, JSON.stringify(result), 8);
  }

  tb.helps.tb = {inspect:tb.inspect,
                 keys:tb.keys,copy:tb.copy,pad:tb.pad,
                 inherit:tb.inherit,
                 toString:tb.toString,toHtml:tb.toHtml,
                 codeExample:tb.codeExample,findInArrayOfObject:tb.findInArrayOfObject,help:tb.help,testStatus:tb.testStatus,
                 /*tableOfContent:tb.tableOfContent,*/link:tb.link
  };

  // Editor ////////////////////////////////////////////////////////////////////////////


  tb.Editor = function Editor(){
  // the goal of Editor is to offer a genenral mechanism in order to help implement
  // tbObject edition capabilities.
  // this mechanism is the following:
  // an object that would like to propose edition capabilities has to offer the following interface
  //   .edit()  similar to .span() but return html code representing the object in edition.
  //            usually .edit() calls tb.editor.html(...) in order to get the necessary html code that will
  //            interact with tb.editor
  //   .codeElement this property must be created by edit() and must containt the codeElement that contains the .edit() function
  //                and that will be updated after edition
  //
  //   .getEditableValue(editor)  will be called by the editor when the user selects a given DOM EDITOR element
  //                              this is the responsibility of the object to look on editor's properties that are specific to this
  //                              object to know how to get the value. the returned value can be a simple type (undefined,number,string)
  //                              or a function. if this function has a .code property, it is considered to be a tbFunc and .code represents
  //                              only the body of the function (usually an expression)
  //   .setEditableValue(editor)  will be called by the editor when the user has finished to edit a given value.
  //                              this method has the responsibility to upgrade the code
  //   .updateCode()              not strictly speaking part of the Editor interface, but common practice to encapsulate the code update
  //                              in updateCode and call this function in setEditableValue through a window.setTimout(
  //
  //--------------
  //  tb.editor is a single instance object that provides most of the services and that dialogs with the DOM elements composing
  //            the user interface.
  //
  //  tb.editor.html(...) return html code needed to create the editor for a simple value
  //                      if the value is simple (undefined, number, string or function) it will
  //                      be handled natively.
  //                      if value is an object, it will return the code of object.edit()
  //                      TODO: provide mechanism for simple object / arrays
  //
  //  tb.editor.simpleTypeToolBar$ a jQuery storing the necessary toolBar for the simple types

  }
  tb.Editor.className = 'tb.Editor';

  tb.Editor.prototype.createToolBar = function() {
    // create a tool bar for the [[tb.Editor]]
    this.toolBar$ = $('<SPAN/>')
      .append('<input type="radio" name="type" value="string" onclick="tb.editor.force(\'string\');">String')
      .append('<input type="radio" name="type" value="number" onclick="tb.editor.force(\'number\')">Number')
      .append('<input type="radio" name="type" value="function" onclick="tb.editor.force(\'function\')">Function')
      .append(this.funcCode$=$('<input type="text"  name="funcCode" value="" onchange="tb.editor.funcCodeChange();" onclick="tb.editor.funcCodeClick();">'))
      .append('<input type="radio" name="type" value="undefined" onclick="tb.editor.force(\'undefined\')">undefined');
  };


  tb.Editor.prototype.funcCodeClick = function() {
    // click event handler of the code INPUT of the toolbar of the [[tb.Editor]]
    this.force('function');
    $('[value=function]',this.toolBar$).attr('checked',true);
    this.funcCode$.focus();
  }

  tb.Editor.prototype.funcCodeChange = function() {
    // change event handler of the code INPUT of the toolbar of the [[tb.Editor]]
    this.value = f(this.funcCode$.val());
    this.type = 'function';
    this.tbObject.setEditableValue(this);
    return false; //?????
  }

  ////////////
  //TODO: there is problem at least in IE7: when the users click on another control, first a change event is triggerd
  //normally it should be followed by a click envent, but as the control is destroyed and re-created, it seems to "capture" the next click
  //event
  // ?????? peut être qu'avec un setTimeout(0) on peut passer outre, en laissant d'abord le click se faire et en updatant le code via le timer
  //  pas mieux : l'evenement click n'arrive jamais sur l'endroit où on a cliqué et si dans le change on return true, c'est encore pire, on ne retrouve
  //              jamais le focus.  &&%ç%*&@
  ////////////

  tb.Editor.eventHandler = function(event) {
    // the event handler that will recieve click, keypress and change event
    var obj = tb.vars[event.target.tbObject];
    if (obj == undefined) throw new Error('event on a editor linked to a non existing object '+event.target.tbObject);
    switch (event.type) {
      case 'click':
        if (obj.codeElement !== tb.selectedElement) {
          tb.selectElement(obj.codeElement);
        }
        tb.editor.setCurrentEditor(event.target);
      return false; // prevent bubbling

      case 'change':
        var value = event.target.value;
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
        this.funcCode$.val('');
        break;
    }
    this.type = type;
    editor$.change();  // will update the value, update the code, run the sheet and so updage the editors and tool bars
    this.setCurrentEditor(this.currentEditor); // will refresh the toolbar and refocus the editor according to the new situation
  }


  tb.Editor.prototype.setCurrentEditor = function(editor) {
    // set an editor as the current Editor
    this.currentEditor = editor;
    if (editor) {
      this.tbObject = tb.vars[editor.tbObject];
      tb.objectToolBar$.append(tb.editor.toolBar$);
      this.value = this.tbObject.getEditableValue(this);
      this.type = (this.value && this.value.isV)?'function':typeof this.value;
      var radio$ = $('[value='+this.type+']',this.toolBar$);
      radio$.attr('checked',true);

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
  }

  tb.Editor.prototype.attr = function(attr) {
    // return the attr value of the html editor
    return this.currentEditor[attr];
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


  tb.editor = new tb.Editor();
  tb.editor.createToolBar();


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
        var title = e.firstChild;
        var level = tb.level(e);

        currentNumbers[level] = (currentNumbers[level] || 0)+1;
        currentNumbers.length = level+1;
        var number = currentNumbers.join('.');
        var t = title.innerHTML.replace(/^[\d\.]*(\s|\&nbsp;)*/,'');
        title.outerHTML = '<H'+(level+1)+' class="SECTIONTITLE EDITABLE" contentEditable='+(e===tb.selectedElement)+'>'+number+' '+t+'</H'+(level+1)+'>';
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


  // Template //////////////////////////////////////////////////////////////////////////

  tb.Template = function Template(name){
    // Template objects are generators of DOM ELEMENT
    // there is one single instance for any number of DOM instances
    // for example Template('code') is the Template object of all CODE Elements
    // normally users create template through the [[tb.template]] function
    // - name: set the name field of the Template
    this.name = name;
  };

  tb.Template.className = 'tb.Template';

  tb.Template.urlBase = 'http://tablord.com/templates/';

  tb.Template.prototype.url = function(){
    // return the url base on the template name
    return tb.Template.urlBase + this.name;
  }

  tb.Template.prototype.insertBefore = function(element,itemprop) {
    // insert this Template before element as an itemprop
    var newElement$ = this.element$(itemprop);
    newElement$.insertBefore(element);
    tb.selectElement(newElement$[0]);
    tb.setModified(true);
    tb.run();
  }

  tb.Template.prototype.insertAfter  = function(element,itemprop) {
    // insert this Template after element as an itemprop
    var element$ = $(element);
    if (element$.hasClass('CODE')) {
      if (element$.next().hasClass('OUTPUT')) element$=element$.next();
      if (element$.next().hasClass('TEST')) element$=element$.next();
    }
    var newElement$ = this.element$(itemprop);
    newElement$.insertAfter(element$);
    tb.selectElement(newElement$[0]);
    tb.setModified(true);
    tb.run();
  }

  tb.Template.prototype.convert = function(element,itemprop) {
    // convert element to template(name) as itemprop

    var e$ = $(element);
    var data = $.extend(true,e$.data('itemData') || {},e$.getMicrodata());
    var id = element.id;
    var containers = $.extend(true,e$.data('containers') || {},tb.Template.getElement$Containers(e$));
    var k = tb.keys(data);
    if (k.length > 1) throw new Error('element.convert error: data has more than 1 head key\n'+tb.toJSCode(data));
    var newData = {};
    newData[itemprop || 'items'] = data[k[0]] || {};
    var new$ = this.element$(itemprop,id);
    if (this.convertData) {
      this.convertData(data,new$);
    }
    else {
      new$.setMicrodata(newData);
      tb.Template.setElement$Containers(new$,containers);
    }
    new$
    .data('itemData',newData) // keep data in a element property so it can retrieve lost data in case of a convertion mistake (not handling all fields)
    .data('containers',containers);

    if (tb.selectedElement===element) {
      e$.replaceWith(new$);
      tb.selectElement(new$[0]);
    }
    else {
      e$.replaceWith(new$);
    }
    return this;
  }

  tb.Template.prototype.element$ = function(itemprop,id) {
    // return a jQuery containing a new instance of this Template as itemprop and setting its id
    if (this.html === undefined) throw new Error('in order to define a template at least define .fields, .html or .element$()');
    if (id === undefined) {
      tb.blockNumber++;
      id = 'item'+tb.pad(tb.blockNumber,4);
    }
    var new$ = $(this.html).attr('id',id);
    if (itemprop) new$.attr('itemprop',itemprop);
    return new$;
  }

  tb.Template.prototype.toString = function() {
    // return a string for a template
    return 'template '+this.name+' created ['+this.url()+']';
  }

  tb.Template.prototype.span = function() {
    // return an html object representing the this Template
    return tb.html('template '+this.name+' created [<a href="'+this.url()+'">'+this.url()+'</a>]');
  }

  tb.Template.prototype.find = function(criteria,fields) {
    // return the data of a template collection as mongodb would do using criteria and returning only the specified fields

    return tb.getItems$(this.url()).getData(criteria,fields);
  }

  tb.Template.microdataToData = function(microdata) {
    // transforms the microdata structure where all properties are array into a structure
    // closer to mongoBD.
    // in order to do so:
    // - properties which names end with [] will be kept as array
    // - properties which names do not end with [] will be transformed as the value of the first element
    //   of the array. if the array has more than one element, an Error will be raised.
    a('TODO not yet implemented')

  }


  tb.Template.urlToName = function(url) {
    // return the name from the url
    if (url === undefined) return undefined;
    return url.match(/.*\/(.*)$/)[1];
  }

  tb.Template.moveContainerContent = function(oldElement$,newElement$) {
    // NOT YET IMPLEMENTED
    // move into newElement$ all Container's content found in oldElements$
    // both oldElement$ and newElement$ should be jquery with one single element to give predictable results

  }

  tb.Template.setElement$Containers = function(element$,containers){
    // move the content of the different containers stored in containers into the containers of element$
    // - element$  a jQuery of 1 element that potentially has embedded containers
    // - containers an object {containerName:jQueryOfContentOfContainer,....}
    element$.children().each(function(i,e) {
      var containerName = e.container;
      var e$ = $(e);
      if (containerName) {
        e$.empty();
        if (containers[containerName]) {
          containers[containerName].appendTo(e$);
        }
      }
      else {
        tb.Template.setElement$Containers(e$,containers);
      }
    });
  }

  tb.Template.getElement$Containers = function(element$,containers){
    // returns a object {containerName:jqueryOfcontentOfThisContainer,....} with all containers of element$
    // the containers parameter is normally undefined, but needed for the recursive search
    //    all containers found will be added to containers
    containers = containers || {};
    element$.children().each(function(i,e) {
      var containerName = e.container;
      if (containerName) {
        containers[containerName] = $(e).children();
      }
      else {
        tb.Template.getElement$Containers($(e),containers);
      }
    });
    return containers;
  }



  tb.updateTemplateChoice = function () {
   // dummy so far, will be trully defined later on when creating menu;

  };

  tb.template = function(newTemplate,itemprop) {
    // create a new template and register it
    // it will inherit from tb.Template
    // - newTemplate: is a simple object that must at least define
    // .name: a name like an id optionaly followed by #version
    //
    // and must define one of the 3
    // .fields: {field1:{options},field2:{options}....}
    //          field1 is the name of the field if field name ends with [] the field is an array of values
    //
    //          options is an object
    //          types
    //          - number:{}                     the field is a number
    //          - string:{}                     the field is a string:  default if nothing is specified
    //          - func:function(data){...}  the field is calculated (=> readonly) and the html is the result of this function
    //          - select:{choice1:val1,choice2:val2...) the field is a SELECT
    //          - container:"template1 template2"
    //                 a container that accepts the specified template names and how the itemprop . if "", accepts anything
    //
    //          formating
    //          - label: specifies the label in front of the field. by default fieldName
    //
    //    if fields is defined, standard html code will automatically be generated
    //    so do not define .fields if you want to define .html
    // .html: a string representing the html code of the template
    // .element$: a function() returning a DOM Element; normally not defined and inherited form tb.Template

    itemprop = itemprop || newTemplate.name;
    var newT = new tb.Template(newTemplate.name);
    newT.html = newTemplate.html;
    if (newTemplate.fields) {
      var h = '<DIV class="ELEMENT" itemprop="'+itemprop+'" itemscope itemtype="'+newT.url()+'"><TABLE width="100%">';
      for (var f in newTemplate.fields) {
        var label = f.label || f;
        if (newTemplate.fields[f].container) {
          h += '<TR><TH>'+label+'</TH><TD class=LEFT><DIV container="'+f+'" templates="'+newTemplate.fields[f].container+'"></DIV></TD></TR>';
        }
        else {
          h += '<TR><TH>'+label+'</TH><TD class=LEFT width="90%"><DIV class="FIELD EDITABLE" itemprop="'+f+'"></DIV></TD></TR>';
        }
      }
      newT.html = h + '</TABLE></DIV>';
    }
    if (newTemplate.element$) newT.element$ = newTemplate.element$;
    if (newTemplate.convertData)  newT.convertData  = newTemplate.convertData;
    tb.templates[newT.name] = newT;
    tb.updateTemplateChoice();
    var elementsToConvert$ = $('[itemtype="'+newT.url()+'"]');
    elementsToConvert$.each(function(idx,e){newT.convert(e,e.itemprop || 'items')});
    return newT;
  }


  tb.template({
    name : 'code',
    element$: function() {
      tb.blockNumber++;
      return $('<PRE class="ELEMENT CODE EDITABLE" id='+tb.blockId('code')+'>');
    },
    convertData: function(data,element$) {element$.html('Object('+tb.toJSCode(data)+')')}
  });

  tb.template({
    name : 'richText',
    element$: function() {
      tb.blockNumber++;
      return $('<DIV  class="ELEMENT RICHTEXT EDITABLE" id='+tb.blockId('rich')+'>');
    }
  });

  tb.template({
    name : 'section',
    element$ : function() {
      tb.blockNumber++;
      var n$ = $('<DIV  class="ELEMENT SECTION" id='+tb.blockId('sect')+'></DIV>')
               .append('<H1 class="SECTIONTITLE EDITABLE"></H1>')
               .append('<DIV container="sectionContent"></DIV>');
      return n$;
    }
  });

  tb.template({
    name : 'paste',
    element$: function() {
      return $('.CUT').detach().removeClass('CUT');
    }
  });

  tb.template({
    name : 'page break',
    element$ : function() {
      tb.blockNumber++;
      var n$ = $('<DIV  class="ELEMENT PAGEBREAK" id='+tb.blockId('page')+'>page break</DIV>');
      return n$;
    }
  });

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
    // return the block id using prefix which must be a 4 characters prefix
    return prefix+tb.pad(tb.blockNumber,4);
  }

  tb.outputElement = function(element) {
    // return the output element associated with element if any
    // if applied on another element than id=codexxxx return undefined;
    if ((element == undefined) || (element.id.slice(0,4) !== 'code')) return;
    var outId = element.id.replace(/code/,"out");
    var out = window.document.getElementById(outId);
    if (out == undefined) {
      var tag = (element.tagName=='SPAN'?'SPAN':'DIV');
      out = $('<'+tag+' class=OUTPUT id='+outId+'>no output</'+tag+'>').insertAfter(element)[0];
    }
    return out;
  }

  tb.testElement = function(element) {
    // returns the test element if any
    // if applied on another element than id=codexxxx return undefined;
    if ((element == undefined) || (element.id.slice(0,4) !== 'code')) return;
    return window.document.getElementById(element.id.replace(/code/,"test"));
  }

  tb.showCode = function(event) {
    // click event handler for the show Code checkbox
    var button = event.target || window.event.srcElement; //IE7 compatibility
    $('.CODE').toggleClass('HIDDEN',!button.checked);
    $('body').attr('showCode',button.checked);
  }

  tb.showCut = function(event) {
    // click event handler for the show cut checkbox
    var button = event.target || window.event.srcElement; //IE7 compatibility
    $('.CUT').toggleClass('HIDDEN',!button.checked);
    $('body').attr('showCut',button.checked);
  }

  tb.showTest = function(event) {
    // click event handler for the show test checkbox
    var button = event.target || window.event.srcElement; //IE7 compatibility
    $('.TEST').toggleClass('HIDDEN',!button.checked);
    $('body').attr('showTest',button.checked);
  }

  tb.showTrace = function(event) {
    // click event handler for the show trace checkbox
    var button = event.target || window.event.srcElement; //IE7 compatibility
    $('.TRACE').toggleClass('HIDDEN',!button.checked);
    $('body').attr('showTrace',button.checked);
  }

  tb.setAutoRun = function(event) {
    // click event handler for the auto run checkbox
    var button = event.target || window.event.srcElement; //IE7 compatibility
    tb.autoRun = button.checked;
    $('body').attr('autoRun',tb.autoRun);
  }

  tb.print = function() {
    // click event handler for the print button
    tb.selectElement(undefined);
    window.print();
  }

  tb.helpSearchChange = function(event) {
    // event handler for the help search box
    tb.helpOutput$.html(tb.help.index.help$(event.currentTarget.value));
  }

  tb.updateTemplateChoice = function() {
    // update the template selection box according to the context i.e. the acceptedTemplate of the current container
    var currentValue = tb.templateChoice$.val();
    tb.templateChoice$.empty();
    tb.currentContainer$ = $(tb.selectedElement).closest('[container]')
    var acceptedTemplates = tb.currentContainer$.attr('templates');
    if (acceptedTemplates) {
      acceptedTemplates = acceptedTemplates.split(' ');
    }
    else {
      acceptedTemplates = tb.keys(tb.templates);
    }
    for (var i=0;i<acceptedTemplates.length;i++) {
      var template = tb.templates[acceptedTemplates[i]];
      if (template) tb.templateChoice$.append(
        '<OPTION value="'+acceptedTemplates[i]+'">'+acceptedTemplates[i]+'</OPTION>'
      );
    }
    if (tb.selectedElement &&
        tb.selectedElement.itemtype) {
      var name = tb.Template.urlToName(tb.selectedElement.itemtype);
      if (name && ($.inArray(name,acceptedTemplates)!=-1)) {
        tb.templateChoice$.val(name);
        return;
      }
    }
    if ($.inArray(currentValue,acceptedTemplates)!=-1) {
      tb.templateChoice$.val(currentValue);
      return;
    }
    tb.templateChoice$.val(acceptedTemplates[0]);
  }

  tb.initToolBars = function() {
    // creates the tools bars
    $('#menu').remove();
    var b$ = $('BODY');

    tb.objectToolBar$ = $(
      '<DIV id=objectToolBar></DIV>'
    );

    tb.templateChoice$ = $('<SELECT>');
    tb.updateTemplateChoice();

    tb.selectionToolBar$ = $('<DIV/>')
      .append('<SPAN id=codeId>no selection</SPAN>')
      .append('<BUTTON id="cutBtn" onclick=tb.cutBlock(tb.selectedElement);>cut</BUTTON>')
      .append('<BUTTON onclick="tb.templates[tb.templateChoice$.val()].insertBefore(tb.selectedElement,tb.currentContainer$.attr(\'container\'))">&#8593;</BUTTON>')
      .append('<BUTTON onclick="tb.templates[tb.templateChoice$.val()].convert(tb.selectedElement,tb.currentContainer$.attr(\'container\'))">&#8596;</BUTTON>')
      .append(tb.templateChoice$)
      .append('<BUTTON onclick="tb.templates[tb.templateChoice$.val()].insertAfter(tb.selectedElement,tb.currentContainer$.attr(\'container\'))">&#8595;</BUTTON>')
      .append('<BUTTON id="showHtmlBtn" onclick=tb.showOutputHtml(this);>&#8594;html</BUTTON>')
      .append('<BUTTON id="toTestBtn" onclick=tb.copyOutputToTest(this);>&#8594;test</BUTTON>')
      .append(tb.objectToolBar$)
      .hide();

    tb.helpSearch$ = $('<INPUT/>').keyup(tb.helpSearchChange);
    tb.helpOutput$ = $('<DIV  style="overflow:auto;max-height:400px;">please type your search above</DIV>');
    tb.helpPanel$ = $('<DIV><SPAN style="color:red;cursor:pointer;" onclick="tb.helpPanel$.hide(300)">&nbsp;&#215;&nbsp;</SPAN></DIV>')
                    .append(tb.helpSearch$)
                    .append('<span style="color:#8dff60;cursor:pointer;" onclick="tb.help.index.back()">&#9668;</span>')
                    .append(tb.helpOutput$)
                    //.hide();
    tb.debug$ = $('<div style="overflow:auto;max-height:400px;">');

    tb.menu$ =  $(
    '<DIV id=menu class=TOOLBAR style="float:right;max-width:50%;">'+
      '<DIV>'+
        '<BUTTON id=runUntilSelectedBtn onclick=tb.execUntilSelected(); style="color: #8dff60;">&#9658;|</BUTTON>'+
        '<BUTTON id=runAllBtn onclick=tb.execAll(); style="color: #8dff60;">&#9658;&#9658;</BUTTON>'+
        '<BUTTON id=stopAnimation onclick=tb.clearTimers(); style="color: red" disabled=true>&#9632;</BUTTON>'+
        '<BUTTON id="clearOutputsBtn" onclick="tb.clearOutputs();">clear</BUTTON>'+
        '<BUTTON id="saveBtn" onclick="tb.save();">save</BUTTON>'+
        '<BUTTON onclick="tb.print();">print</BUTTON>'+
        '<BUTTON onclick="tb.helpPanel$.toggle(100);">help</BUTTON>'+
        '<INPUT onclick="tb.showCode(event)"'+(b$.attr('showCode')=="true"?' checked':'')+' type=checkbox>codes'+
        '<INPUT onclick="tb.showCut(event)"'+(b$.attr('showCut')=="true"?' checked':'')+' type=checkbox>cuts'+
        '<INPUT onclick="tb.showTest(event)"'+(b$.attr('showTest')=="true"?' checked':'')+' type=checkbox>tests'+
        '<INPUT onclick="tb.showTrace(event)"'+(b$.attr('showTrace')=="true"?' checked':'')+' type=checkbox>traces'+
        '<INPUT onclick="tb.setAutoRun(event)"'+(tb.autoRun?' checked':'')+' type=checkbox>auto run'+
      '</DIV>'+
    '</DIV>')
    .append(tb.selectionToolBar$)
    .append(tb.helpPanel$)
    .append(tb.debug$);

    $('BODY').prepend(tb.menu$);

    // make all button the same size
    var h=0;
    var w=0;
    tb.menu$.find('button').each(function(i,e){
      w=Math.max(w,e.offsetWidth);
      h=Math.max(h,e.offsetHeight);
    }).width(w).height(h);

    $('#richTextToolBar').remove(); // kill anything previouly in the saved document
    tb.richTextToolBar$ =  $('<SPAN id=richTextToolBar class=TOOLBAR></SPAN>')
      .append('<BUTTON onclick=tb.richedit.bold();><b>B</b></BUTTON>')
      .append('<BUTTON onclick=tb.richedit.italic();><i>i</i></BUTTON>')
      .append('<BUTTON onclick=tb.richedit.underline();><U>U</U></BUTTON>')
      .append('<BUTTON onclick=tb.richedit.strike();><strike>S</strike></BUTTON>')
      .append('<BUTTON onclick=tb.richedit.h1();><b>H1</b></BUTTON>')
      .append('<BUTTON onclick=tb.richedit.h2();><b>H2</b></BUTTON>')
      .append('<BUTTON onclick=tb.richedit.div();>div</BUTTON>')
      .append('<BUTTON onclick=tb.richedit.p();>&#182;</BUTTON>')
      .append('<BUTTON onclick=tb.richedit.ol();>#</BUTTON>')
      .append('<BUTTON onclick=tb.richedit.ul();>&#8226;</BUTTON>')
      .append('<BUTTON onclick=tb.richedit.pre();>{}</BUTTON>')

  }

  tb.setModified = function(state) {
    // set the modified state and modify the save button accordingly
    tb.modified = state;
    $('#saveBtn').toggleClass('WARNING',state);
  }

  tb.setUpToDate = function(state) {
    // set if the sheet is up to date or not (has to be re-run)
    if (state === tb.setUpToDate.state) return;
    if (state) {
      $('#runAllBtn').removeClass('WARNING');
    }
    else {
      $('#runAllBtn').addClass('WARNING');
      $('*').removeClass('SUCCESS ERROR');
    }
    tb.setUpToDate.state = state;
  }

  tb.clearOutputs = function() {
    // remove all outputs
    $('.OUTPUT').remove();
  }

  tb.save = function() {
    // save the sheet under fileName or the current name if fileName is not specified
    var fileName = window.prompt('save this sheet in this file?',window.location.pathname);
    if (fileName == undefined) return;
    window.document.documentElement.APPLICATIONNAME = fileName;
    tb.removeCutBlocks();
    tb.selectElement(undefined);
    var fso = new ActiveXObject("Scripting.FileSystemObject");
    var file = fso.OpenTextFile(fileName,2,true);
    var html = new tb.HTML('<!DOCTYPE html>\n'+window.document.documentElement.outerHTML)
    file.Write(html.removeJQueryAttr().toAscii());
    file.Close();
    tb.setModified(false);
    window.alert('file saved');
  }

  tb.writeResults = function() {
    if (tb.fso) {
      // write the tb.results as JSON in a file of the same name .jres
      var resFileName = ''+tb.url.drive+tb.url.path+tb.url.fileName+'.jres';
      tb.fso.writeFile(resFileName,JSON.stringify(tb.results));
    }
    else {
      //tb.debug$.html("can't write results if not .hta or connected to tablord.com").addClass('WARNING');
    }
  }

  tb.close = function() {
    // write the jres file and close the window
    tb.updateResultsTestStatus();
    tb.writeResults();
    window.close();
  }


  tb.beforeUnload = function() {  //TODO avec hta, ne fonctionne pas bien
    // event handler before closing check if a save is needed and desired
    if (tb.modified) {
      if (window.confirm('your file has been modified since last save\n;save it now?')) {
        tb.save();
      }
    }
  }

  tb.copyOutputToTest = function() {
    // set the current element's output as the test element if no test element existed or if it failed
    // if a SUCCESS test existed, remove the test
    if (tb.selectedElement == undefined) return;

    var out = tb.outputElement(tb.selectedElement);
    var test = tb.testElement(tb.selectedElement);
    if (test == undefined) {
      $(out).after($('<DIV id="'+tb.selectedElement.id.replace(/code/,"test")+'" class="TEST SUCCESS">'+out.innerHTML+'</DIV>'));
    }
    else if (!$(test).hasClass('SUCCESS')) {
      test.innerHTML = out.innerHTML;
      $(test).removeClass('ERROR').addClass('SUCCESS');
    }
    else {
      $(test).remove();
    }
    tb.setModified(true);
  }

  tb.cutBlock = function(element,cut) {
    // cut or "uncut" element
    // if cut is true or false, set the cut state
    // if cut is undefined, toggle the cut state
    cut = cut || !$(element).hasClass('CUT');
    $(element)
    .add(tb.outputElement(element))
    .add(tb.testElement(element))
    .toggleClass('CUT',cut);
    tb.setModified(true);
    tb.setUpToDate(false);
  }

  tb.removeCutBlocks = function() {
    // remove all CUT elements
    $('.CUT').remove();
  }


  tb.editables$ = function(element) {
    // returns a JQuery of the tags that are editable in element (JQuery can be .length==0 if nothing is editable)
    var e$ = $(element);
    if (e$.hasClass('EDITABLE')) return e$;
    return e$.find('.EDITABLE');
  }


  tb.selectElement = function(element) {
    // select element as tb.selectedElement and update the EDI accordingly
    var e = tb.selectedElement;
    if (e) {
      if (element && (e === element)) { // if already selected nothing to do but give focus again
        e.focus();
        return;
      }

      // remove the old selection
      $(e).removeClass('SELECTED');
      tb.editables$(e)
        .attr('contentEditable',false)
        .each(function(i,e){tb.reformatRichText(e)});
    }

    // set the new selection
    tb.selectedElement = element;
    if (element == undefined){
      $('#codeId').text('no selection');
      tb.selectionToolBar$.hide();
      return;
    }
    tb.menu$.show();
    tb.selectionToolBar$.show(500);
    $('#codeId').html(element.id+'<SPAN style="color:red;cursor:pointer;" onclick="tb.selectElement(undefined);">&nbsp;&#215;&nbsp;</SPAN>');
    $(element).addClass('SELECTED');
    tb.updateTemplateChoice();
    tb.editables$(element).attr('contentEditable',true);
    element.focus();
  }

  // EDI eventHandlers ///////////////////////////////////////////////////////////////

  tb.bodyKeyDown = function(event) {
    // special keys at EDI level
    switch (event.keyCode) {
      case 112:
        tb.help.index.show(window.document.selection.createRange().text); //TODO: works only with IE7
        break;
    }

/*
      case 120:
        tb.templateChoice$.val('code');
        break;
      case 121:
        tb.templateChoice$.val('richText');
        break;
      case 122:
        tb.templateChoice$.val('section');
        break;
      case 123:
        tb.templateChoice$.val('paste');
        break;
    }
*/
    return true;
  }

  tb.bodyKeyUp = function(event) {
    tb.debug$.html(tb.inspect(window.document.selection).span().toString())
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


  // formating / display / execution ////////////////////////////////////////////////////


  tb.format = function(obj,options) {
    // format obj using by priority
    // 1) options.format
    // 2) the tb.defaults.format
    // and according to the type

    if (options) {
      var format = $.extend(true,{},tb.defaults.format,options.format);
    }
    else {
      var format = tb.defaults.format;
    }
    if (typeof obj === 'number') {
      return format.number(obj)
    }
    if (obj === undefined) {
      return format.undef();
    }
    if (obj === null) {
      return format.nullObj();
    }
    if (obj === '') {
      return format.emptStr();
    }
    if (typeof obj === 'function') {
      return format.func(obj);
    }
    if ($.isArray(obj)) {
      return format.array(obj);
    }
    if (obj.span) {
      return obj.span().toString(); //span() usually return a HTML object;
    }
    if (obj.outerHTML) { // an Element
      return format.domElement(obj);
    }
    if (obj.getUTCDate) {
      return format.date(obj)
    }
    if (obj.constructor == Object) {
      return format.obj(obj);
    }
    if (obj.valueOf) {
      var val = obj.valueOf();   // typicall the case of v() where valueOf return whatever has been stored in the V object
      if (val !== obj) {         // if the valueOf is not itself
        return tb.format(val,options);   // format the result of valueOf
      }
    }
    if (obj.toString) {
      return tb.toHtml(obj.toString());
    }
    return 'special object';
  }

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
    if (element.itemtype) {
      var t = tb.templates[element.itemtype];
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

    var out  = tb.outputElement(element);
    var test = tb.testElement(element)
    tb.output = newOutput(element,out);
    var res = tb.securedEval(tb.htmlToText(element.innerHTML));
    tb.displayResult(res,tb.output);
    // test
    if (test != undefined) {
      if (out && (tb.trimHtml(out.innerHTML) == tb.trimHtml(test.innerHTML))) {   //TODO rethink how to compare
        $(test).removeClass('ERROR').addClass('SUCCESS');
      }
      else {
        $(test).removeClass('SUCCESS').addClass('ERROR');
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
    // run either all CODE ELEMENT or the CODE ELEMENT from the first to the SelectedElement
    if (tb.autoRun) {
      tb.execAll();
    }
    else {
      tb.execUntilSelected();
    }
  }

  tb.updateContainers = function() {
    // make sure that containers are never empty (= have a fake [[EMPTY]] [[ELEMENT]])
    // and that no fake element remains if there is another element inside the container
    $('.ELEMENT.EMPTY:not(:only-child)').remove();
    var c$ = $('[container]:empty');
    c$.append('<DIV class="ELEMENT EMPTY" contentEditable=false>empty container: click here to add an element</DIV>');
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
    $('*').removeClass('SUCCESS').removeClass('ERROR')
    tb.finalizations = [];
    tb.vars = {}; // run from fresh
    tb.IElement.idNumber = 0;
    for (var i=0; i<tb.features.length; i++) tb.features[i].update && tb.features[i].update();
    tb.simulation = new tb.Simulation('tb.simulation');
    tb.editables$(tb.selectedElement).each(function(i,e){tb.reformatRichText(e)});
    tb.results.execStat.prepare$ms=Date.now()-tb.results.execStat.start;
  }

  tb.execAll = function() {
    // execute all [[CODE]] [[ELEMENT]]
    tb.prepareExec();
    $('.CODE').add('[itemtype]').each(function(i,e) {tb.execCode(e);});
    tb.updateContainers();
    tb.finalize();
    tb.results.execStat.execAll$ms=Date.now()-tb.results.execStat.start;
    tb.writeResults();
    tb.setUpToDate(true);
  }

  tb.execUntilSelected = function() {
    // execute all [[CODE]] [[ELEMENT]] until the selected Element
    tb.prepareExec();
    var $codes = $('.CODE');
    if ($(tb.selectedElement).hasClass('CODE')){
      var lastI = $codes.index(tb.selectedElement);
    }
    else {
      var $last = $('.CODE',tb.selectedElement).last();
      if ($last.length === 0) { // selected element is a section or rich text that has no internal CODE element
        $codes.add(tb.selectedElement); // we add this element (even if not a code) just to know where to stop
        var lastI = $codes.index(tb.selectedElement)-1;
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
                             tb.blockNumber++;
                             switch (command) {
                               case ''   : return '<SPAN class="CODE EMBEDDED ELEMENT" id='+ tb.blockId('code')+' style="DISPLAY: none;">'+code+'</SPAN>';
                               case '##' : return '<SPAN class="CODE EMBEDDED ELEMENT" id='+ tb.blockId('code')+' style="DISPLAY: none;">tb.elementBox("'+code+'")</SPAN>';
                               case '#'  : return '<SPAN class="CODE EMBEDDED ELEMENT" id='+ tb.blockId('code')+' style="DISPLAY: none;">tb.link("'+code+'")</SPAN>';
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

  tb.showOutputHtml = function(checkBox) {
    if ($(tb.selectedElement).hasClass('CODE')) {
      var out = tb.outputElement(tb.selectedElement) || {id:'no output',innerHTML:''};
      var test = tb.testElement(tb.selectedElement) || {id:'no test',innerHTML:''};
      var hout  = out.innerHTML;
      var htest = test.innerHTML;
      diff = tb.diff(hout,htest).span().toString();
      window.showModalDialog('dialog.htm',[
        '<fieldset><legend>'+tb.selectedElement.id+'</div></legend><div  class=CODEEXAMPLE>'+tb.toHtml(tb.selectedElement.outerHTML)+'</fieldset>'+
        '<fieldset><legend>diff <span class="DIFF DEL">output</span> vs <span class="DIFF ADD">test</legend>'+diff+'</fieldset>'],
        "dialogwidth="+tb.content$.css('width'));
    }
    else {
      window.showModalDialog('dialog.htm',[
        '<fieldset><legend>'+tb.selectedElement.id+'</legend>'+tb.toHtml(tb.selectedElement.outerHTML)+'</fieldset>'],
        "dialogwidth="+tb.content$.css('width'));
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

    $('*').removeClass('OLD').removeClass('AUTOEXEC');// not in use anymore
    $('.OUTPUT').add('.CODE').add('.RICHTEXT').removeAttr('onclick');  // no longer in the HTML but bound dynamically
    $('.RICHTEXT .CODE').add('.SECTIONTITLE .CODE').addClass('EMBEDDED');        // reserved for code inside another element
    $('#localToolBar').add('.BOTTOMTOOLBAR').add('.TOOLBAR').remove();           // no longer saved with the document and must be regenerated at init
    $('#topToolBar').remove();     // no longer in use since v0160
    $('#insideToolBar').remove();  // no longer in use since v0160
    $('#bottomToolBar').remove();  // no longer in use since v0160
    $('.CODE').add('.RICHTEXT').add('.SECTION').addClass('ELEMENT'); // since v160 all ELEMENT are selectable
    $('.CODE:not(.EMBEDDED)').add('.RICHTEXT').add('.SECTIONTITLE').addClass('EDITABLE'); // since v160 EDITABLE tags will be set to contentEditable=true /false when the itself or its parent is selected

    // since v0.0110 the menu is fixed in a #menu DIV and all sheet is contained in a #jcContent DIV
    var jc$ = $('#jcContent')
    if (jc$.length == 1) {
a('convert from jc to tb')
      jc$.removeAttr('style').attr('container','items').attr('id','tbContent'); // since tablord0200
      $('.CODE').each(function(i,code){code.innerHTML = code.innerHTML.replace(/jc\./g,'tb.');});
    }
    tb.content$ = $('#tbContent');
    var b$ = $('BODY');
    if (tb.content$.length == 0) {
      b$.wrapInner('<DIV id=tbContent container="items"/>');
    }
    $('.CONTAINER').removeClass('.CONTAINER').attr('container','sectionContent');
    $('.SECTIONCONTAINER').removeClass('SECTIONCONTAINER').attr('container','sectionContent');

    // since v0.0145 the <body> attributes hideCodes,hideCut,hideTest,hideTrace are deprecated
    var b$ = $('BODY');
    if (b$.attr('hideCode')) b$.attr('showCode' ,b$.attr('hideCode')!=false);
    if (b$.attr('hideCut') ) b$.attr('showCut'  ,b$.attr('hideCut')!=false);
    if (b$.attr('hideTest')) b$.attr('showTest' ,b$.attr('hideTest')!=false);
    if (b$.attr('hideCode')) b$.attr('showTrace',b$.attr('hideTrace')!=false);
    b$.removeAttr('hideCode')
      .removeAttr('hideCut')
      .removeAttr('hideTest')
      .removeAttr('hideTrace');
  }


  $(window).load(function () {
    // upgrades ////////////////////////////////////////////////////
    try {
      //tb.upgradeModules();
      tb.upgradeFramework();
      if (window.document.compatMode != 'CSS1Compat') {
        window.alert('your document must have <!DOCTYPE html> as first line in order to run properly: please save and re-run it');
      }
      // prepare the sheet ///////////////////////////////////////////
      tb.url = tb.urlComponents(window.document.location.href);
      $('.SELECTED').removeClass('SELECTED');
      $('.ELEMENT').live("click",tb.elementClick);
      $('.EDITABLE').live("keydown",tb.editableKeyDown);
      $('.EDITOR').live("change",tb.Editor.eventHandler).live("click",tb.Editor.eventHandler);
      $('.OUTPUT').removeClass('SUCCESS').removeClass('ERROR');
      $('.TEST').removeClass('SUCCESS').removeClass('ERROR');

      $('.SCENE').live("click",function(event){event.stopPropagation()}); // cancel bubbling of click to let the user control clicks
      $('.INTERACTIVE').live("click",function(event){event.stopPropagation()}); // cancel bubbling of click to let the user control clicks
      $('.LINK').live("click",function(event){event.stopPropagation()}); // cancel bubbling of click to let the user control clicks
      $('.HELPLINK').live("click",function(event){tb.help.index.show(event.target.innerHTML)});
      $('.BOXLINK').live("click",tb.openCloseBox); // open or close Box and cancel bubbling of click since it is only to open close
      $('.BOX').live("click",function(event){event.stopPropagation()}); // cancel bubbling of click


      tb.findblockNumber();
      tb.initToolBars();
      $(window).bind('beforeunload',tb.beforeUnload);
      $('body').keydown(tb.bodyKeyDown)//.keyup(tb.bodyKeyUp);
      tb.autoRun = $('body').attr('autoRun')!==false;
      tb.help.update(tb,'tb.');
    }
    catch (e) {
      window.alert(e.message);
    }
    if (tb.autoRun) tb.execAll();
  });

  window.onerror = tb.errorHandler;
