
  // jcalc library /////////////////////////////////////////////////////
    
  
  // calcul ///////////////////
  function V(name,value) {
    //constructor for a new instance of V
    //rarely use it directly, but use the v() function instead that also register the variable
    //in the v namespace
    this.setName(name);
    this.setValue(value);
  }

  V.prototype.setName = function(name) {
    // for internal use only
    // changes the name of the variable and also
    // updates ._label and ._unit
    if (name == undefined) return;

    this._name =name;
    var lu = name.match(/(^.+)\$(.+)/)
    if (lu != null) {
      this._label = lu[1];
      this._unit  = lu[2];
    }
  }

  V.prototype.setValue = function(value){
    if (typeof value == "function") {
      this._func =value;
    }
    else {
      this._value=value;
      this._func = undefined;
    }
  }

  V.prototype.label = function() {
    // return the label (= variable name without the units)
    return '<var>'+(this._label || this._name)+'</var>';
  }

  V.prototype.unit = function() {
    // return the units of the variable
    return this._unit?'<span class=UNIT>'+jc.Units.symbole(this._unit)+'</span>':'';
  }
 
  V.prototype.valueOf = function () {
    // return the value of the variable
    // if the variable is in fact a function, executes the function and return its value
    if (this._func) {
      return this._func(this._row,this._col);
    }
    return this._value;
  }
 
  V.prototype.to = function(unit) {
    // return the value converted to unit
    return jc.Units.convert(this.valueOf(),this._unit,unit);
  }

  V.prototype.toString = function() {
    // return the summary of the variable
    return '[object V('+this._name+'):'+this.valueOf()+']';
  }

  V.prototype.view = function() {
    // returns an HTML object with VariableName = value
    return jc.html(this.label()+'= <span class=VALUE>'+this.valueOf()+'</span>'+this.unit());
  }

  V.prototype.isV = true;

  function v(name,value) {
    // v(name) returns the variable name: rarely used since name alone will represent the same as well as jc.vars[name]
    // v(name,value) creates a new variable if it does not already exists and sets a new value
    if (value != undefined) {
      if (value.toUTCString) { // a Date: v stors a Date as this
        return jc.vars[name]=value;
      }
      if (jc.vars[name]) {
        jc.vars[name].setValue(value);
        return jc.vars[name]
      }
      return jc.vars[name] = new V(name,value);
    }
    return jc.vars[name];
  }


  /////////////////////////////////////////////////////////////////////////

  function f(jcFunc) {
    // jcFunc can eiter be a true function (rare since in that case it just returns the function)
    // or a string that is the body of a function that will be called with 2 parameters row and col 
    // in case this function is used inside a table

    if (typeof jcFunc == "string") {
      var code = jcFunc;
      try {
        if (jcFunc.search(/return/)== -1) {
          jcFunc = 'return '+jcFunc;
        }
        var f = new Function('row','col','with (jc.vars){with(row||{}) {'+jcFunc+'}}');
        f.code = code;
        f.toString = function (){return this.code};
        return f;
      }
      catch (e) {
        e.message = 'Error while compiling jcFunc\n'+jcFunc+'\n'+e.message;
        throw e;
      }
    }
    else if (typeof jcFunc == "function") {
      return jcFunc;
    }
    this._error = 'jcFunc argument must either be a function() or a string representing the code of an expression like A+3 or return A+3\n'+code; 
    throw new Error(this._error);
  }

  // table //////////////////////////////////////////////

  function Row(obj) {
    for (var k in obj) {
      var c = obj[k];
      if (typeof c == "function") {
        c = new V(undefined,c);  //convert the function into a V
        c._row = this;       //and assign the _row,_col 
        c._col = k;
      }
      this[k] = c;
    }
  }

  Row.prototype.toString = function() {
    return "[object Row]";
  }

  Row.prototype.eachCol = function(func) {
    // func must be function(colname,colObject)
    for (var col in this) {
      if (this.hasOwnProperty(col) && (col != '_table')) {
        func(col,this[col]);
      }
    }
  }

  Row.prototype.toJSON = function() {
    var e = [];
    this.eachCol(function(colName,colObject){
      e.push(JSON.stringify(colName)+':'+JSON.stringify(colObject));
    });
    return '{'+ e.join(',')+ '}';
  }

  Row.prototype.span = function (options) {
    options = options || {};
    if (!options.cols) {
      options.cols = {};
      this.eachCol(function (col) {
        options.cols[col]=1;
      });
    }
    var h = '<table cellpadding="4" cellspacing="0"><thead><tr>';  // TODO modify to style
    for (var col in options.cols) {
      h += '<th>'+col+'</th>';
    }
    h += '</tr></thead><tbody>';    
    h += '<tr>';
    for (var col in options.cols) {
      var cell = this[col];
      h += (col=="_id")?'<th>'+cell+'</th>':'<td>'+cell+'</td>';  //******************** format???
    }
    h += '</tr></tbody></table>';
    return jc.html(h);
  }

  Row.prototype.list = function() {
    var h = '<table>';
    this.eachCol(function (col,val) {h += '<tr><th>'+col+'</th><td>'+val+'</td></tr>'});
    return h+'</table>';
  }

  Row.prototype.isRow = function() {
    return true;
  }

// Table //////////////////////////////////////////////////////////////

  function Table(name) {
    // constructor of a new Table instance
    this.name = name;
    this.length = 0;
    this.cols = {};
    this.ids = {};
  }
  
  Table.prototype.cols = function(cols) {
    // set the columns that are displayed by default
    // return the table for command chaining
    // cols is an object like
    // { colname: true,   // any value make the column visible
    //   colname:{style:"css style"  // like 
    this.cols = cols;
    return this;
  }

  Table.prototype.updateCols = function(withRow) {
    // updates the cols description with the fields found in withRow
    // normally for internal use only
    // return the table for command chaining

    for (var col in withRow) {
      if (withRow.hasOwnProperty(col) && (this.cols[col]==undefined)) {
        this.cols[col] = 1;
      }
    }
    return this;
  }

  Table.prototype.add = function(row) {
    if (row._id) {
      if (this.ids[row._id]) {
        throw new Error('row._id == "'+row._id+'" already exists');
      }
      this.ids[row._id] = row;
    }
    this[this.length++] = row;
    this.updateCols(row);
    return this;
  }
  
  Table.prototype.addRows = function(rows) {
    // add multiple rows
    // rows must be an array or array-like of objects
    // columns are ajusted automatically
    for (var i=0; i<rows.length; i++) {
      this.add(rows[i]);
    }
    return this;
  }

  Table.prototype.forEachRow = function(func) {
    // execute func for each row of the table
    // func must be function(i,row)
    // return the table for command chaining
    for (var i=0; i<this.length; i++) {
      func(i,this[i])
    }
    return this;
  }

  Table.prototype.sort = function(cols) {
    // sort the table according to the "cols" criteria
    // cols is an object of the form:
    //   {  col1: 1    // 1 means ascending  alphabetic or numeric order
    //      col2:-1    //-1 means descending alphabetic or numeric order
    //      col3: function(a,b) {... // any function that compare a and b and returns >0 if a>b, <0 if a<b, 0 if a==b
    // return the table for command chaining
    function order(a,b) {
      for (var col in cols) {
        if (typeof cols[col] == 'function') {
          var res = cols[col](a[col],b[col])
          if (res != 0) return res;
        }
        if (a[col] > b[col]) return  cols[col];
        if (a[col] < b[col]) return -cols[col];
      }
      return 0;
    }
    Array.prototype.sort.call(this,order);
    return this;
  }

  Table.prototype.toString = function() {
    // return a string summarizing the table
    return '[object Table('+this.name+') of '+this.length+' rows]';
  }

  Table.prototype.toJSON = function() {
    var e = [];
    this.forEachRow(function(i,row){
      e.push(JSON.stringify(row))
    });
    return '['+e.join(',\n')+']';
  }

  Table.prototype.span = function(options) {
    // display the table without its name
    // the span(options) method of table can take many option to customize the presentation of the table
    // options:{
    //    cols:{
    //      col1:{className:'HEAD'},  // set the class(es) of this col
    //      col2:1          // any value make this col visible
    //      '*':1           // adds any not already defined col as visible
    options = $.extend(true,{},jc.defaults,options);
    options.cols = options.cols || this.cols;
    if (options.cols['*']) {
      delete options.cols['*'];
      for (var col in this.cols) {
        if (!options.cols[col]) {
          options.cols[col] = this.cols[col];
        }
      }
    }
    options.rows = options.rows || range(0,this.length-1);
    
    if (this.code) {
      options.format.undef = function(){return ''};
    }
    var h = '<table><thead><tr>';  // TODO modify to style
    for (var col in options.cols) {
      h += '<th>'+col+'</th>';
    }
    h += '</tr></thead><tbody>';    
    for (var i in options.rows) {
      h += '<tr>';
      for (var col in options.cols) {
        var c = options.cols[col];
        if (options.cols[col] != 0) {
          if (this.code) {
            var type = (typeof this[i][col]).toUpperCase();
            var cell = '<input class="EDITOR '+type+'" jcObject='+JSON.stringify(this._name)+' jcRow="'+i+'" jcCol='+JSON.stringify(col)+
                              ' value="'+jc.format(this[i][col],options)+'"></input>';     //**** TODO verifier que STRINGIFY est ok pour cela en particulier si le string contient "
          }
          else {
a('cell',i,col,this[i][col])
            var cell = jc.format(this[i][col].valueOf(),options);
          }
          var attrs = (c.style?'style="'+c.style+'"':'')+
                      (c.className?' class="'+c.className+'" ':'');
          h += ((col=="_id") || (options.cols[col].head))?'<th '+attrs+'>'+cell+'</th>':'<td '+attrs+'>'+cell+'</td>';
        }
      }
      h += '</tr>';
    }
    h += '</tbody></table>';
    return jc.html(h);
  }
      
  Table.prototype.view = function(options) {
    //display the table, including its name in a <div>
    return jc.html('<div><var>'+this.name+'</var>'+this.span(options)+'</div>');
  }


  // editor interface ////////////////////////////////////////////////////
  
  Table.prototype.edit = function(options) {
    // edit is similar to span, but gernerates HTML code in order to edit the object interactively
    // it will also set the code to AUTOEDIT class which means that it should no longer be modified by the user since it will
    // be generated by the edition mecanism.
    
    // premier jet: toute la table est éditée peut être simple et efficasse: en cas de tables partielles, faire simplement plusieurs tables et faire une fct pour lier plusieurs tables
    this.code = jc.output._codeElement;   
    $(this.code).addClass('AUTOEDIT').attr('jcObject',this._name);
    return this.view(options);
    // the events will be "live" registered
  }

  Table.prototype.editorEvent = function(event){
    // editorEvent is a event handler that will recieve click, keypress and change event
    // as it is called by jc.elementEditor, this represents the jcObject beeing edited (here the Table object)
    switch (event.type) {
      case 'click':
        if (this.code !== jc.selectedElement) {
          jc.selectElement(this.code);
        }
        this.setEditedCell(event.target);
        event.target.focus();
        return false; // prevent bubbling
      case 'change':
        var value = event.target.value;
        if (!isNaN(Number(value))) value = Number(value);  //TODO: s'appuyer sur une classe ??
        this[event.target.jcRow][event.target.jcCol] = value;
        this.code.innerHTML = jc.toHtml(this.generateCode());
        jc.setModified(true);
        this.setEditedCell(undefined);
      default :
        return true;
    }
  }

  Table.force = function(type) {
    var cell$ = $(jc.vars[jc.selectedElement.jcObject].editedCell).removeClass('STRING NUMBER FUNCTION UNDEFINED').addClass(type);
    if (type='UNDEFINED') cell$.value = '';
    cell$.focus();
  }

  Table.prototype.toolBar$ = $('<SPAN/>')
    .append('<input type="radio" name="format" value="STRING" onclick="Table.force(\'STRING\')">String</input>')
    .append('<input type="radio" name="format" value="NUMBER" onclick="Table.force(\'NUMBER\')">Number</input>')
    .append('<input type="radio" name="format" value="FUNCTION" onclick="Table.force(\'FUNCTION\')">Function</input>')
    .append('<input type="text"  name="funcCode" value="" />')
    .append('<input type="radio" name="format" value="UNDEFINED" onclick="Table.force(\'UNDEFINED\')">undefined</input>')
  
  Table.prototype.setEditedCell = function(cell) {
    this.editedCell = cell;
    jc.objectToolBar$.empty();
    if (cell) {
      jc.objectToolBar$.append(this.toolBar$);
      var format = cell.className.match(/NUMBER|STRING|FUNCTION|UNDEFINED/).toString();
      var radio$ = $('[value='+format+']',this.toolBar$)
      radio$.attr('checked',true);
      $('[name=funcCode]',this.toolBar$).attr('value',format=='FUNCTION'?this[cell.row][cell.col].toString():'')
    }
  }


  Table.prototype.generateCode = function() {
    // generate the code that represents the element as edited
    // can be used to replace the existing code 
    var code = 'table('+JSON.stringify(this._name)+')\n';
    code += '.cols('+JSON.stringify(this._cols)+')\n';
    for (var i=0; i<this._length; i++) {
      code += '.add('+this[i].toJSON()+')\n';
    }
    return code+'.edit()';
  }
        

  // factory ////////////////////////////////////////////////
  table = function(name,local) {
    // creates a new table
    // - name is the name of the instance
    // - if local=true, the instance is not registered in v
    if ((local == true) || (name == undefined)) {
      return new Table(name);
    }
    return jc.vars[name] = new Table(name);
  }


  // Output ///////////////////////////////////////////////

  function newOutput (codeElement,outputElement) {
    // outputElement is, if specified, the Element where HTML will be dumped
    //         element is essential if HTML uses the finalize() method
    h = new jc.HTML();
    h._codeElement = codeElement;
    h._outputElement = outputElement;
    return h;
  }


  // html ///////////////////////////////////////////////



  function jc.HTML(html) {
    this._html = html || '';
    this._tagsEnd = [];
  }


  jc.HTML.prototype.toString = function() {
    return this._html+this._tagsEnd.join('');
  }

  jc.HTML.prototype.removeJQueryAttr = function() {
    this._html = this._html.replace(/jQuery\d+="\d+"/g,'');
    return this;
  }
  
  jc.HTML.prototype.toAscii = function() {
    // same as toString(), but no character is bigger than &#255; every such a character is transformed into &#xxx;
    // Needed for this /&ç&"@ activeX of FileSystem
    var h = this.toString();
    var asciiH = '';
    var i = 0;
    var last = 0;
    while (i <= h.length) {
      c = h.charCodeAt(i);
      if (c> 255) {
        asciiH += h.slice(last,i)+'&#'+c+';';
        last = i+1;
      }
      i++;
    }
    asciiH += h.slice(last);
    return asciiH;
  }
    
  jc.HTML.prototype.span = jc.HTML.prototype.toString;

  jc.HTML.prototype.html = function (html) {
  // insert any html
    this._html += html;
    return this;
  }

  jc.HTML.prototype.showHtml = function (html) {
  // show html as html code
    this._html += '<span class=INSPECTHTML>'+jc.toHtml(html)+'</span>';
    return this;
  }

  jc.HTML.prototype.showDiff = function(e1,e2) {
    if (e1.length != e2.length) {
      this._html += '<span class=ERROR>e1.length=='+e1.length+' != e2.length=='+e2.length+'</span>';
    }
    for (var i=0; (i<e1.length) && (i<e2.length); i++) {
      if (e1.charAt(i) != e2.charAt(i)) break;
    }
    this._html += '<span class=SUCCESS>'+e1.slice(0,i)+'</span><br>e1:<span class=ERROR>'+e1.slice(i)+'</span><br>e2:<span class=ERROR>'+e2.slice(i)+'</span>';
    return this;
  }

  jc.HTML.prototype.showHtmlDiff = function(e1,e2) {
    if (e1.length != e2.length) {
      this._html += '<span class=ERROR>e1.length=='+e1.length+' != e2.length=='+e2.length+'</span>';
    }
    for (var i=0; (i<e1.length) && (i<e2.length); i++) {
      if (e1.charAt(i) != e2.charAt(i)) break;
    }
    this._html += '<span class=SUCCESS>'+jc.toHtml(e1.slice(0,i))+'</span><br>e1:<span class=CODEINERROR>'+jc.toHtml(e1.slice(i))+'</span><br>e2:<span class=CODEINERROR>'+jc.toHtml(e2.slice(i))+'</span>';
    return this;
  }
    
  jc.HTML.prototype.p = function (/*elements*/) {
    this.tag('P',arguments);
    return this;
  }
  jc.HTML.prototype.ul = function (/*elements*/) {
    this.tag('UL',arguments);
    return this;
  }
  jc.HTML.prototype.li = function (/*elements*/) {
    this.tag('LI',arguments);
    return this;
  }
  jc.HTML.prototype.pre = function (/*elements*/) {
    this.tag('PRE',arguments);
    return this;
  }
  jc.HTML.prototype.hr = function (){
    this.tag('HR',[]);
    return this
  }
  jc.HTML.prototype.h = function (/*elements*/) {
    this.tag('H'+jc.htmlIndent,arguments);
    return this;
  }

  jc.HTML.prototype.indent = function(levels) {
    levels = levels || 1;
    jc.htmlIndent += levels;
    return this;
  }

  jc.HTML.prototype.tag = function(tagName,elements) {
    this._html += '<'+tagName+'>';
    var tagEnd = '</'+tagName+'>';
    if (elements.length == 0) {
      this._tagsEnd.push(tagEnd);
      return this;
    }
    for (var i=0;i<elements.length;i++) {
      var e = elements[i];
      if (e.span) {
        this._html += e.span();
      }
      else if (e.view) {
        this._html  += e.view();
      }
      else {
        this._html  += e;
      }
    }  
    this._html += tagEnd;
    return this;
  }

  jc.HTML.prototype.inspect = function(/*objects*/) {
    for (var i=0; i<arguments.length; i++) {
      this._html += jc.inspect(arguments[i]).span();
    }
    return this;
  }

  jc.HTML.prototype.end = function() {
    this._html += this._tagsEnd.pop();
    return this;
  }  
    
  jc.HTML.prototype.sendTo = function(jquerySelector){
    var that = this;
    $(jquerySelector).each(function(i,e){e.innerHTML = that._html});
    return this
  }

  jc.HTML.prototype.finalize = function(finalizationFunc) {
    // finalizationFunc must be a function() {...}
    // note that as this function is defined within a code that will be created in secureEval, we are
    // also inside with(v) so any user variable is availlable as well as output is availlable because of the closure mecanism

    if ((this._codeElement == undefined) || (this._outputElement == undefined)) {
      throw new Error('HTML.finalize can only be used if a code and output Element was associated');
    }
    this._finalize = finalizationFunc;
    jc.finalizations.push(this);
    return this;
  }
    
  jc.HTML.prototype.alert = function(message) {
    window.alert(message);
    return this;
  }

  jc.html = function(htmlcode) {
    return new jc.HTML(htmlcode);
  }

/*
  // formaters ///////////////////////////////////////////
  jc.format = function(obj) {
    return new jc.Format(obj);
  }

  jc.Format = function(obj) {
    // returns a format object that contains the reference to obj
    this.obj = obj;
  }

  jc.Format.prototype.yyyymmdd = function() {
    //returns this, with the .formatted set if the formating was successful
    if ((this.formatted) || (this.obj == undefined) || (this.obj.getFullYear == undefined)) return this;
    this.formatted = this.obj.yyyymmdd();
    return this;
  }

  jc.Format.prototype.fixed = function(decimals) {
    // returns this, with .formatted set as a fixed decimal string format if obj was a number
    if ((this.formatted) || (this.obj == undefined) || (typeof this.obj != 'number')) return this;
    this.formatted = this.obj.toFixed(decimals)
    return this;
  }
 
  jc.Format.prototype.undefinedToBlank = function() {
    if (this.formatted !== undefined) return this; 
    if (this.obj == undefined) {
      this.formatted = '';
    }
    return this;
  }

  jc.Format.prototype.toString = function() {
    if (this.formatted !== undefined) return this.formatted;
    if (this.obj == undefined) return 'undefined';
    return this.obj.toString();
  }
*/
  
  // helpers /////////////////////////////////////////////

  function range(min,max) {    //TODO devrait être un itérateur, mais n'existe pas encore dans cette version
    var a = [];
    for (var i = min; i <= max; i++) {
      a.push(i);
    }
    return a;
  }

