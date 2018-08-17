
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
    // updates .label and .unit
    if (name == undefined) return;

    this.name =name;
    var lu = name.match(/(^.+)\$(.+)/)
    if (lu != null) {
      this.label = '<var>'+lu[1]+'</var>';
      this.unit  = lu[2]?'<span class=UNIT>'+jc.Units.symbole(lu[2])+'</span>':'';
    }
  }

  V.prototype.setValue = function(value){
    if (typeof value == "function") {
      this.func =value;
      this.type = 'FUNCTION';
    }
    else {
      this.value=value;
      this.func = undefined;
      this.type = (typeof value).toUpperCase();
    }
  }

  V.prototype.valueOf = function () {
    // return the value of the variable
    // if the variable is in fact a function, executes the function and return its value
    if (this.func) {
      var row = this.row && this.row._;
      return this.func(row,this.col);
    }
    return this.value;
  }

  V.prototype.toJson = function () {
    return this.code()?'f('+JSON.stringify(this.code())+')':JSON.stringify(this.value);
  }

  V.prototype.code = function() {
    // return the code of the embedded function if such a function exists
    //        or undefined if not a function
    if (this.func) return this.func.toString();
    return undefined
  }
 
  V.prototype.to = function(unit) {
    // return the value converted to unit
    return jc.Units.convert(this.valueOf(),this.unit,unit);
  }

  V.prototype.toString = function() {
    // return the summary of the variable
    return '[object V('+this.name+'):'+this.valueOf()+']';
  }

  V.prototype.view = function() {
    // returns an HTML object with VariableName = value
    return jc.html(this.label+'= <span class=VALUE>'+this.valueOf()+'</span>'+this.unit);
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
      try {
        var code = jcFunc;
        if (jcFunc.search(/return/)== -1) {
          code = 'return '+jcFunc;
        }
        var f = new Function('row','col','with (jc.vars){with(row||{}) {'+code+'}}');
        f.userCode = jcFunc;
        f.toString = function(){return this.userCode};
        f.joJson = function(){return 'f("'+JSON.stringify(this.userCode)+'")'};
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
    this.error = 'jcFunc argument must either be a function() or a string representing the code of an expression like A+3 or return A+3\n'+code; 
    throw new Error(this.error);
  }

  // table //////////////////////////////////////////////

  function Row(obj) {
    this._ = {};
    for (var k in obj) {
      this.setCell(k,obj[k]);
    }
  }

  Row.prototype.cell = function(col) {
    return this._[col].valueOf();
  }  

  Row.prototype.setCell = function (col,value) {
    if (typeof value == "function") {
      var f = new V(undefined,value);  //convert the function into a V
      f.row = this;       //and assign the _row,_col 
      f.col = col;
      this._[col] = f;
      return this;
    }
    this._[col] = value;
    return this;
  }

  Row.prototype.toString = function() {
    return "[object Row]";
  }

  Row.prototype.eachCol = function(func) {
    // func must be function(colname,colObject)
    for (var col in this._) {
      func(col,this._[col]);
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
      var cell = this._[col];
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
    this._cols = {};
  }
  
  Table.prototype.cols = function(cols) {
    // set the columns that are displayed by default
    // return the table for command chaining
    // cols is an object like
    // { colname: true,   // any value make the column visible
    //   colname:{style:"css style"  // like 
    this._cols = cols;
    return this;
  }

  Table.prototype.updateCols = function(withRow) {
    // updates the cols description with the fields found in withRow
    // normally for internal use only
    // return the table for command chaining

    for (var col in withRow._) {
      if (this._cols[col]==undefined) {
        this._cols[col] = 1;
      }
    }
    return this;
  }

  Table.prototype.add = function(row) {
    row = new Row(row); // transform it to a Row
    row.table = this;
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

  Table.prototype.cell = function(row,col) {
    return this[row] && this[row]._[col];
  }

  Table.prototype.setCell = function(row,col,value) {
    this[row].setCell(col,value);
  }

  Table.prototype.cellType = function(row,col) {
    var c = this.cell(row,col);
    return c.type || (typeof c).toUpperCase();
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
      e.push(row.toJSON())
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
    options.cols = options.cols || this._cols;
    if (options.cols['*']) {
      delete options.cols['*'];
      for (var col in this._cols) {
        if (!options.cols[col]) {
          options.cols[col] = this._cols[col];
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
    for (var i=0;i<options.rows.length;i++) {
      var row = options.rows[i];
      h += '<tr>';
      for (var col in options.cols) {
        var c = options.cols[col];
        if (options.cols[col] != 0) {
          if (this.code) {
            var type = (this.cellType(row,col));
            var cell = '<input class="EDITOR '+type+'" '+
                               jc.htmlAttribute('jcObject',this.name)+
                               jc.htmlAttribute('jcRow',i)+jc.htmlAttribute('jcCol',col)+
                               jc.htmlAttribute('value',jc.format(this.cell(row,col),options))+'></input>';
          }
          else {
            var cell = jc.format(this[i]._[col],options);
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
    this.code = jc.output.codeElement;   
    $(this.code).addClass('AUTOEDIT').attr('jcObject',this.name);
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
        this.setCell(event.target.jcRow,event.target.jcCol,value);
        this.code.innerHTML = jc.toHtml(this.generateCode());
        jc.setModified(true);
        jc.run();
//        this.setEditedCell(undefined);
      default :
        return true;
    }
  }

  Table.force = function(type) {
    var cell$ = $(jc.vars[jc.selectedElement.jcObject].editedCell).removeClass('STRING NUMBER FUNCTION UNDEFINED').addClass(type);
    if (type='UNDEFINED') cell$.value = '';
    cell$.focus();
  }

  Table.funcCodeEvent = function(event) {
    if ((event.type == 'keypress') && (event.keyCode!=10)){
      return true;
    }
    if (event.type == 'click'){
      Table.force('FUNCTION');
      $('[value=FUNCTION]',jc.objectToolBar$).attr('checked',true);
      event.target.focus();
      return false;
    }
    var table = jc.vars[jc.selectedElement.jcObject];
    var editor = table.editedCell;
    table.setCell(editor.jcRow,editor.jcCol,f($('[name=funcCode]',jc.objectToolBar$).attr('value')));
    table.code.innerHTML = jc.toHtml(table.generateCode());
    jc.setModified(true);
    jc.run();
    table.setEditedCell(editor);
    return false;  // no bubbling
  }
    


  /*************** voir comment changer le code d'une cellule?? et en particulier comment régler les erreurs de compilation
    tout comme erreurs d'executions: mettre le message dans output atteint la limite actuelle, en particulier si hors execution d'un bloc de code
    tout comme dans les finalization *********/

  Table.prototype.toolBar$ = $('<SPAN/>')
    .append('<input type="radio" name="type" value="STRING" onclick="Table.force(\'STRING\')">String</input>')
    .append('<input type="radio" name="type" value="NUMBER" onclick="Table.force(\'NUMBER\')">Number</input>')
    .append('<input type="radio" name="type" value="FUNCTION" onclick="Table.force(\'FUNCTION\')">Function</input>')
    .append($('<input type="text"  name="funcCode" value="" />').change(Table.funcCodeEvent).keypress(Table.funcCodeEvent).click(Table.funcCodeEvent))
    .append('<input type="radio" name="type" value="UNDEFINED" onclick="Table.force(\'UNDEFINED\')">undefined</input>')
    .append('<button>&#8595;</button>')
    .append('<input type="text" name="colName" />')
    .append('<button>&#8595;</button>')
    


  
  Table.prototype.setEditedCell = function(cell) {
    this.editedCell = cell;
    jc.objectToolBar$.empty();
    if (cell) {
      jc.objectToolBar$.append(this.toolBar$);
      var type = this.cellType(cell.jcRow,cell.jcCol);
      var radio$ = $('[value='+type+']',this.toolBar$)
      radio$.attr('checked',true);
      $('[name=funcCode]',this.toolBar$).attr('value',type=='FUNCTION'?this.cell(cell.jcRow,cell.jcCol).code():'')
      $('[name=colName]',this.toolBar$).attr('value',cell.jcCol);
    }
  }


  Table.prototype.generateCode = function() {
    // generate the code that represents the element as edited
    // can be used to replace the existing code 
    var code = 'table('+JSON.stringify(this.name)+')\n';
    code += '.cols('+JSON.stringify(this._cols)+')\n';
    for (var i=0; i<this.length; i++) {
      code += '.add('+this[i].toJSON()+')\n';
    }
    return code+'.edit()';
  }
        

  // factory ////////////////////////////////////////////////
  table = function(name,local) {
    // returns an already existing table or creates a new table
    // - name is the name of the instance
    // - if local=true, the instance is not registered in v
    if (jc.vars[name] && jc.vars[name].constructor == Table){
      return jc.vars[name];
    }

    if ((local == true) || (name == undefined)) {
      return new Table(name);
    }
    return jc.vars[name] = new Table(name);
  }

/***************************************
 les evenements keypress ne semblent être reçu qu'au niveau le plus haut de content editable
******************************************/

  // Output ///////////////////////////////////////////////

  function newOutput (codeElement,outputElement) {
    // outputElement is, if specified, the Element where HTML will be dumped
    //         element is essential if HTML uses the finalize() method
    h = new jc.HTML();
    h.codeElement = codeElement;
    h.outputElement = outputElement;
    return h;
  }


  // html ///////////////////////////////////////////////



  function jc.HTML(html) {
    this.htmlCode = html || '';
    this.tagsEnd = [];
  }


  jc.HTML.prototype.toString = function() {
    return this.htmlCode+this.tagsEnd.join('');
  }

  jc.HTML.prototype.removeJQueryAttr = function() {
    this.htmlCode = this.htmlCode.replace(/jQuery\d+="\d+"/g,'');
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
    this.htmlCode += html;
    return this;
  }

  jc.HTML.prototype.showHtml = function (html) {
  // show html as html code
    this.htmlCode += '<span class=INSPECTHTML>'+jc.toHtml(html)+'</span>';
    return this;
  }

  jc.HTML.prototype.showDiff = function(e1,e2) {
    if (e1.length != e2.length) {
      this.htmlCode += '<span class=ERROR>e1.length=='+e1.length+' != e2.length=='+e2.length+'</span>';
    }
    for (var i=0; (i<e1.length) && (i<e2.length); i++) {
      if (e1.charAt(i) != e2.charAt(i)) break;
    }
    this.htmlCode += '<span class=SUCCESS>'+e1.slice(0,i)+'</span><br>e1:<span class=ERROR>'+e1.slice(i)+'</span><br>e2:<span class=ERROR>'+e2.slice(i)+'</span>';
    return this;
  }

  jc.HTML.prototype.showHtmlDiff = function(e1,e2) {
    if (e1.length != e2.length) {
      this.htmlCode += '<span class=ERROR>e1.length=='+e1.length+' != e2.length=='+e2.length+'</span>';
    }
    for (var i=0; (i<e1.length) && (i<e2.length); i++) {
      if (e1.charAt(i) != e2.charAt(i)) break;
    }
    this.htmlCode += '<span class=SUCCESS>'+jc.toHtml(e1.slice(0,i))+'</span><br>e1:<span class=CODEINERROR>'+jc.toHtml(e1.slice(i))+'</span><br>e2:<span class=CODEINERROR>'+jc.toHtml(e2.slice(i))+'</span>';
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
    this.htmlCode += '<'+tagName+'>';
    var tagEnd = '</'+tagName+'>';
    if (elements.length == 0) {
      this.tagsEnd.push(tagEnd);
      return this;
    }
    for (var i=0;i<elements.length;i++) {
      var e = elements[i];
      if (e.span) {
        this.htmlCode += e.span();
      }
      else if (e.view) {
        this.htmlCode  += e.view();
      }
      else {
        this.htmlCode  += e;
      }
    }  
    this.htmlCode += tagEnd;
    return this;
  }

  jc.HTML.prototype.inspect = function(/*objects*/) {
    for (var i=0; i<arguments.length; i++) {
      this.htmlCode += jc.inspect(arguments[i]).span();
    }
    return this;
  }

  jc.HTML.prototype.end = function() {
    this.htmlCode += this.tagsEnd.pop();
    return this;
  }  
    
  jc.HTML.prototype.sendTo = function(jquerySelector){
    var that = this;
    $(jquerySelector).each(function(i,e){e.innerHTML = that.html});
    return this
  }

  jc.HTML.prototype.finalize = function(finalizationFunc) {
    // finalizationFunc must be a function() {...}
    // note that as this function is defined within a code that will be created in secureEval, we are
    // also inside with(v) so any user variable is availlable as well as output is availlable because of the closure mecanism

    if ((this.codeElement == undefined) || (this.outputElement == undefined)) {
      throw new Error('HTML.finalize can only be used if a code and output Element was associated');
    }
    this.finalizationFunc = finalizationFunc;
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

  
  // helpers /////////////////////////////////////////////

  function range(min,max) {    //TODO devrait être un itérateur, mais n'existe pas encore dans cette version
    var a = [];
    for (var i = min; i <= max; i++) {
      a.push(i);
    }
    return a;
  }

