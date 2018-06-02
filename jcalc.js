  // global variables /////////////////////////////////////////////////

  var jc = {debug:{},
            codeElementBeingExecuted:undefined,
            currentElement:undefined,
            localToolBar:undefined
           };

  // jcalc library /////////////////////////////////////////////////////
    
  
  // calcul ///////////////////
  function V(name,value) {
    this._name =name;
    this._value=value;
  }

  V.prototype.valueOf = function () {
    if (this._func) {
      try {
        this._value = this._func();
        this._error = undefined;
        return this._value;
      }
      catch (e) {
        this._value = undefined;
        this._error = "in "+this._name+', '+e.message;
        throw new Error(this._error);
      }
    }
    if (!this._value) {
      this._error = "Error in "+this._name+'> _value is undefined';
      throw new Error(this._error);
    }
    return this._value;
  }

  V.prototype.toString = function() {
    return this._name+":"+this._value?this._value:this._error;
  }

  function v(name,value) {
    if (typeof value == "function") {
      var nv = new V(name,0);
      nv._func = value;
      return v[name] = nv;
    }
    if (value != undefined) {
      return v[name] = new V(name,value);
    }
    return v[name];
  }

  function JcFunc (jcFunc) {
    if (typeof jcFunc == "string") {
      if (jcFunc.search(/return/)) {
        jcFunc = 'return '+jcFunc;
      }
      return new Function('',"with (v) {"+jcFunc+"}");
    }
    else if (typeof jcFunc == "function") {
      return jcFunc;
    }
    else {
      this._error = 'jcFunc argument must either be a function() or a string representing the code of an expression like A+3 or return A+3'; 
      throw new Error(this._error);
    }
  }

  function f(jcFunc) {
    return new JcFunc(jcFunc);
  }

  // table //////////////////////////////////////////////

  function Row(obj) {
    for (var k in obj) {
      this[k] = obj[k];
    }
  }

  Row.prototype.toString = function() {
    return "[Row]";
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
      if (withRow.hasOwnProperty(col) && (this._cols[col]==undefined)) {
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
        h += (col=="_id")?'<th>'+this[i][col]+'</th>':'<td>'+this[i][col]+'</td>';
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
    this._html += '<p>';
    if (arguments.length == 0) {
      this._tagsEnd.push('</p>');
      return this;
    }
    for (var i=0;i<arguments.length;i++) {
      var e = arguments[i];
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
    this._html += '</p>';
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
    return '<div class="SUCCESS">'+obj+'</div>';  // valueOf or toString if nothing better
  }
    
  // helpers /////////////////////////////////////////////

  function range(min,max) {    //TODO devrait être un itérateur, mais n'existe pas encore dans cette version
    var a = [];
    for (var i = min; i <= max; i++) {
      a.push(i);
    }
    return a;
  }
