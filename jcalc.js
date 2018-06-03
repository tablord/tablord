  // global variables /////////////////////////////////////////////////

  var jc = {debug:{},
            codeElementBeingExecuted:undefined,
            currentElement:undefined,
            localToolBar:undefined,
            stack:[]
           };

  // jcalc library /////////////////////////////////////////////////////
    
  
  // calcul ///////////////////
  function V(name,value) {
    this._name =name;
    this._value=value;
  }

  V.prototype.valueOf = function () {
    if (!this._value) {
      this._error = "Error in "+this._name+'> _value is undefined';
      throw new Error(this._error);
    }
    return this._value;
  }

  V.prototype.toString = function() {
    return 'v('+this._name+'):'+(this._value?this._value:this._error);
  }

  function v(name,value) {
    if (value) {
      if (value.isJcFunc) {
        value._name = name;
        return v[name] = value;
      }
      return v[name] = new V(name,value);
    }
    return v[name];
  }

  function JcFunc (jcFunc) {
    if (typeof jcFunc == "string") {
      if (jcFunc.search(/return/)) {
        jcFunc = 'return '+jcFunc;
      }
      this._func = new Function('row','col','with (v){with(row) {'+jcFunc+'}}');
    }
    else if (typeof jcFunc == "function") {
      this._func = jcFunc;
    }
    else {
      this._error = 'jcFunc argument must either be a function() or a string representing the code of an expression like A+3 or return A+3'; 
      throw new Error(this._error);
    }
  }

  JcFunc.prototype.isJcFunc = function() {
    return true;
  }

  JcFunc.prototype.span = function() {
    return '<SPAN class=SUCCESS>'+this.valueOf()+'</SPAN>';
  }

  JcFunc.prototype.valueOf = function() {
    return this._func(this._row || {},this._col);
  }

  JcFunc.prototype.toString = function() {
    var n = '';
    if (this._name) {n = this._name};
    if (this._row) {n += ': '+this._row._table._name+'['+this._row._id+']['+this._col+']'};
    return n+this._func.toString();
  }
    
  JcFunc.prototype._ = function(row,col) {  //TODO first implementation: only absolute row / col; to be completed
    if (!this._table) {
      throw new Error('_(row,col) can only be used inside a cell of a table');
    }
    row = row || this._table[this._row];
    col = col || this._col;
    return this._table[row][col];
  }

  function f(jcFunc) {
    return new JcFunc(jcFunc);
  }

  // table //////////////////////////////////////////////

  function Row(obj) {
    for (var k in obj) {
      var c = obj[k];
      if (c.constructor == JcFunc) {
        c._row = this;
        c._col = k;
      }
      this[k] = c;
    }
  }

  Row.prototype.toString = function() {
    return "[Row]";
  }

  Row.prototype.span = function (options) {
    options = options || {};
    if (!options.cols) {
      options.cols = {};
      for (var col in this) {
        if (this.hasOwnProperty(col) && (col != '_table')) {
          options.cols[col]=1;
        }
      }
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

  Row.prototype.isRow = function() {
    return true;
  }


  function Table(name) {
    this._name = name;
    this._length = 0;
    this._cols = {_id:1};
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
  
  Table.prototype.toString = function() {
    return 'table '+this._name+' of '+this._length+' rows';
  }

  Table.prototype.span = function(options) {
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
        h += (col=="_id")?'<th>'+cell+'</th>':'<td>'+cell+'</td>';
      }
      h += '</tr>';
    }
    h += '</tbody></table>';
    return h;
  }

  Table.prototype.view = function(options) {
    return '<div class="SUCCESS">'+this._name+this.span(options)+'</div>';
  }

  function table(name) {
    return v[name] = new Table(name);
  }

  // html ///////////////////////////////////////////////

  function HTML() {
    this._html = '';
    this._tagsEnd = [];
  }

  HTML.prototype.p = function (/*elements*/) {
    this.tag('p',arguments);
    return this;
  }
  HTML.prototype.ul = function (/*elements*/) {
    this.tag('ul',arguments);
    return this;
  }
  HTML.prototype.li = function (/*elements*/) {
    this.tag('li',arguments);
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

  HTML.prototype.end = function() {
    this._html += this._tagsEnd.pop();
    return this;
  }  
    
  HTML.prototype.view = function() {
    return '<div class="TEXT">'+this._html+this._tagsEnd.join('')+'</div>'
  }

  function h() {
    return new HTML();
  }
  // object viewers /////////////////////////////////////

  function view(obj) {
    if (obj.view) {      // this objet has a viewer: just use it
      return obj.view();
    }
    else if (obj.outerHTML) { // an Element
      return 'view of Element<br><code class="INSPECT">'+htmlToStr(obj.outerHTML)+'</code>';
    }
    if (obj.valueOf) {
      return '<div class="SUCCESS">'+obj.valueOf()+'</div>';
    }
    else {
      return '<div class="SUCCESS">'+obj+'</div>';
    }
  }
    
  // helpers /////////////////////////////////////////////

  function range(min,max) {    //TODO devrait être un itérateur, mais n'existe pas encore dans cette version
    var a = [];
    for (var i = min; i <= max; i++) {
      a.push(i);
    }
    return a;
  }
