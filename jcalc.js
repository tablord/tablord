  // global variables /////////////////////////////////////////////////

  var jc = {debug:{},
            codeElementBeingExecuted:undefined,
            currentElement:undefined,
            localToolBar:undefined
           };

  // jcalc library /////////////////////////////////////////////////////
    
  // calcul ///////////////////
  function V(name,value) {
    this.name =name;
    this.value=value;
  }

  V.prototype.valueOf = function () {
    if (this.func) {
      try {
        this.value = this.func();
        this.error = undefined;
        return this.value;
      }
      catch (e) {
        this.value = undefined;
        this.error = "in "+this.name+', '+e.message;
        throw new Error(this.error);
      }
    }
    if (!this.value) {
      this.error = "Error in "+this.name+'> value is undefined';
      throw new Error(this.error);
    }
    return this.value;
  }

  V.prototype.toString = function() {
    return this.name+":"+this.value?this.value:this.error;
  }
  

  function v(name,value) {
    if (value != undefined) {
      return v[name] = new V(name,value);
    }
    else {
      return v[name];
    }
  }

  function c(name,jcFunc) {
    var nv = v(name, 0);
    if (typeof jcFunc == "string") {
      if (jcFunc.search(/return/)) {
        jcFunc = 'return '+jcFunc;
      }
      nv.func = Function('',"with (v) {"+jcFunc+"}");
    }
    else if (typeof jcFunc == "function") {
      nv.func = jcFunc;
    }
    else {
      nv.error = 'jcFunc argument must either be a function() or a string representing the code of an expression like A+3 or return A+3'; 
      throw new Error(this.error);
    }
    return nv;
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

  Table.prototype.view = function() {
    var h = '<table border="1px"><hr>';
    for (var col in this._cols) {
      h += '<th>'+col+'</th>';
    }
    h += '</hr>';    
    for (var i=0; i<this._length;i++) {
      h += '<tr>';
      for (var col in this._cols) {
        h += (col=="_id")?'<th>'+this[i][col]+'</th>':'<td>'+this[i][col]+'</td>';
      }
      h += '</tr>';
    }
    h += '</table>';
    
    return h;
  }

  function table(name) {
    return v[name] = new Table(name);
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
  function existsIn(element,array){
    // returns true if element is in array
    for (var i =0;i<array.length;i++) {
      if (array[i] == element) {
        return true;
      }
    }
    return false;
  }


