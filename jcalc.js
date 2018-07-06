
  // jcalc library /////////////////////////////////////////////////////
    
  
  // calcul ///////////////////
  function V(name,value) {
    this.setName(name);
    if (typeof value == "function") {
      this._func =value;
    }
    else {
      this._value=value;
    }
  }

  V.prototype.setName = function(name) {
    if (name == undefined) return;

    this._name =name;
    var lu = name.match(/(^.+)\$(.+)/)
    if (lu != null) {
      this._label = lu[1];
      this._unit  = lu[2];
    }
  }

  V.prototype.label = function() {
    return '<var>'+(this._label || this._name)+'</var>';
  }

  V.prototype.unit = function() {
    return this._unit?'<span class=UNIT>'+this._unit+'</span>':'';
  }
 
  V.prototype.valueOf = function () {
    if (this._func) {
      return this._func(this._row,this._col);
    }
    if (this._value == undefined) {
      this._error = "Error in "+this._name+'> _value is undefined';
      throw new Error(this._error);
    }
    return this._value;
  }

  V.prototype.toString = function() {
    return '[object V('+this._name+'):'+this.valueOf()+']';
  }

  V.prototype.span = function() {
    return this.label()+'= <span class=VALUE>'+this.valueOf()+'</span>'+this.unit();
  }

  V.prototype.view = function() {
    return '<DIV>'+this.span()+'</DIV>';
  }

  function v(name,value) {
    if (value != undefined) {
      return v[name] = new V(name,value);
    }
    return v[name];
  }


  /////////////////////////////////////////////////////////////////////////

  function f(jcFunc) {
    if (typeof jcFunc == "string") {
      try {
        if (jcFunc.search(/return/)== -1) {
          jcFunc = 'return '+jcFunc;
        }
        return new Function('row','col','with (v){with(row||{}) {'+jcFunc+'}}');
      }
      catch (e) {
        e.message = 'Error while compiling jcFunc\n'+jcFunc+'\n'+e.message;
        throw e;
      }
    }
    else if (typeof jcFunc == "function") {
      return jcFunc;
    }
    this._error = 'jcFunc argument must either be a function() or a string representing the code of an expression like A+3 or return A+3'; 
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

  Row.prototype.span = function (options) {
    options = options || {};
    if (!options.cols) {
      options.cols = {};
      this.eachCol(function (col) {
        options.cols[col]=1;
      });
    }
    var h = '<table border="1px"><thead><tr>';  // TODO modify to style
    for (var col in options.cols) {
      h += '<th>'+col+'</th>';
    }
    h += '</tr></thead><tbody>';    
    h += '<tr>';
    for (var col in options.cols) {
      var cell = this[col];
      h += (col=="_id")?'<th>'+cell+'</th>':'<td>'+cell+'</td>';
    }
    h += '</tr></tbody></table>';
    return h;
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
    this._name = name;
    this._length = 0;
    this._cols = {};
  }
  
  Table.prototype.cols = function(cols) {
    this._cols = cols;
    return this;
  }

  Table.prototype.updateCols = function(withRow) {
    for (var col in withRow) {
      if ((col != "_table") && withRow.hasOwnProperty(col) && (this._cols[col]==undefined)) {
        this._cols[col] = 1;
      }
    }
    return this;
  }

  Table.prototype.add = function(row) {
    if (row.isRow == undefined) {  //ie normal literal object
      row = new Row(row); // transform it to a Row
    }
    if (row._id) {
      if (this[row._id]) {
        throw new Error('row._id == "'+row._id+'" already exists');
      }
      this[row._id] = row;
    }
    row._table = this;
    this[this._length++] = row;
    this.updateCols(row);
    return this;
  }
  
  Table.prototype.addRows = function(rows) {
    for (var i=0; i<rows.length; i++) {
      this.add(rows[i]);
    }
    return this;
  }

  Table.prototype.forEachRow = function(func) {
    // func must be function(i,row)
    for (var i=0; i<this._length; i++) {
      func(i,this[i])
    }
  }

  Table.prototype.sort = function(cols) {
    // sort the table according to the "cols" criteria
    // cols is an object of the form:
    //   {  col1: 1    // 1 means ascending  alphabetic or numeric order
    //      col2:-1    //-1 means descending alphabetic or numeric order
    //      col3: function(a,b) {... // any function that compare a and b and returns >0 if a>b, <0 if a<b, 0 if a==b
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

    this._savedLenght = this.length;  // to be compatible with sort, must rename _length in .length, but potentially can be used by the _id of a Row
    this.length = this._length;
    Array.prototype.sort.call(this,order);
    this.length = this._savedLength;
    return this;
  }

  Table.prototype.toString = function() {
    return '[object Table('+this._name+') of '+this._length+' rows]';
  }

  Table.prototype.span = function(options) {
    // options:{
    //    cols:{
    //      col1:{head:1},  // any value make this col as <th>
    //      col2:1          // any value make this col visible
            
    options = options || {};
    options.cols = options.cols || this._cols;
    options.rows = options.rows || range(0,this._length-1);
    var h = '<table border="1px"><thead><tr>';  // TODO modify to style
    for (var col in options.cols) {
      h += '<th>'+col+'</th>';
    }
    h += '</tr></thead><tbody>';    
    for (var i in options.rows) {
      h += '<tr>';
      for (var col in options.cols) {
        var cell = this[i][col];
        h += ((col=="_id") || (options.cols[col].head))?'<th>'+cell+'</th>':'<td>'+cell+'</td>';
      }
      h += '</tr>';
    }
    h += '</tbody></table>';
    return h;
  }

  Table.prototype.view = function(options) {
    return '<div><var>'+this._name+'</var>'+this.span(options)+'</div>';
  }

  function table(name,local) {
    // if local=true, do not put in v
    if ((local == true) || (name == undefined)) {
      return new Table(name);
    }
    return v[name] = new Table(name);
  }



  // html ///////////////////////////////////////////////

  function HTML(codeElement,outputElement) {
    // outputElement is, if specified, the Element where HTML will be dumped
    //         element is essential if HTML uses the finalize() method
    this._html = '';
    this._tagsEnd = [];
    this._codeElement = codeElement;
    this._outputElement = outputElement;
  }


  HTML.prototype.html = function (html) {
  // insert any html
    this._html += html;
    return this;
  }

  HTML.prototype.showHtml = function (html) {
  // show html as html code
    this._html += '<span class=INSPECTHTML>'+jc.toHtml(html)+'</span>';
    return this;
  }

  HTML.prototype.showDiff = function(e1,e2) {
    if (e1.length != e2.length) {
      this._html += '<span class=ERROR>e1.length=='+e1.length+' != e2.length=='+e2.length+'</span>';
    }
    for (var i=0; (i<e1.length) && (i<e2.length); i++) {
      if (e1.charAt(i) != e2.charAt(i)) break;
    }
    this._html += '<span class=SUCCESS>'+e1.slice(0,i)+'</span><br>e1:<span class=ERROR>'+e1.slice(i)+'</span><br>e2:<span class=ERROR>'+e2.slice(i)+'</span>';
    return this;
  }

  HTML.prototype.showHtmlDiff = function(e1,e2) {
    if (e1.length != e2.length) {
      this._html += '<span class=ERROR>e1.length=='+e1.length+' != e2.length=='+e2.length+'</span>';
    }
    for (var i=0; (i<e1.length) && (i<e2.length); i++) {
      if (e1.charAt(i) != e2.charAt(i)) break;
    }
    this._html += '<span class=SUCCESS>'+jc.toHtml(e1.slice(0,i))+'</span><br>e1:<span class=CODEINERROR>'+jc.toHtml(e1.slice(i))+'</span><br>e2:<span class=CODEINERROR>'+jc.toHtml(e2.slice(i))+'</span>';
    return this;
  }
    
    
  
  HTML.prototype.p = function (/*elements*/) {
    this.tag('P',arguments);
    return this;
  }
  HTML.prototype.ul = function (/*elements*/) {
    this.tag('UL',arguments);
    return this;
  }
  HTML.prototype.li = function (/*elements*/) {
    this.tag('LI',arguments);
    return this;
  }
  HTML.prototype.pre = function (/*elements*/) {
    this.tag('PRE',arguments);
    return this;
  }
  HTML.prototype.hr = function (){
    this.tag('HR',[]);
    return this
  }
  HTML.prototype.h = function (/*elements*/) {
    this.tag('H'+jc.htmlIndent,arguments);
    return this;
  }

  HTML.prototype.indent = function(levels) {
    levels = levels || 1;
    jc.htmlIndent += levels;
    return this;
  }

  HTML.prototype.tag = function(tagName,elements) {
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

  HTML.prototype.inspect = function(/*objects*/) {
    for (var i=0; i<arguments.length; i++) {
      this._html += inspect(arguments[i]).span();
    }
    return this;
  }

  HTML.prototype.end = function() {
    this._html += this._tagsEnd.pop();
    return this;
  }  
    
  HTML.prototype.sendTo = function(jquerySelector){
    var that = this;
    $(jquerySelector).each(function(i,e){e.innerHTML = that._html});
    return this
  }

  HTML.prototype.view = function() {
    return this._html+this._tagsEnd.join('');
  }

  HTML.prototype.finalize = function(finalizationFunc) {
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
    
  HTML.prototype.alert = function(message) {
    window.alert(message);
    return this;
  }
  // helpers /////////////////////////////////////////////

  function range(min,max) {    //TODO devrait être un itérateur, mais n'existe pas encore dans cette version
    var a = [];
    for (var i = min; i <= max; i++) {
      a.push(i);
    }
    return a;
  }

