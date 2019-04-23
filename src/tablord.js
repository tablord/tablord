
  // tablord library /////////////////////////////////////////////////////


  // calcul ///////////////////
  tb.Var = function(name,value) {
    //rarely use it directly, but use the v() function instead that also register the variable
    //in the tb.vars namespace
    this.setName(name);
    this.setValue(value);
  }
  tb.Var.className = 'tb.Var';

  tb.Var.prototype.setName = function(name) {
    // for internal use only
    // changes the name of the variable and also
    // updates .label and .unit
    if (name == undefined) return;

    this.name =name;
    var lu = name.match(/(^.+)\$(.+)/)
    if (lu != null) {
      this.label = lu[1];
      this.unit  = lu[2];
    }
    else this.label = this.name;
  }

  tb.Var.prototype.setValue = function(value){
    if (typeof value == "function") {
      this.func = value;
      this.type = 'function';
    }
    else {
      this.value=value;
      this.func = undefined;
      this.type = typeof value;
    }
    return this;
  }

  tb.Var.prototype.valueOf = function () {
    // return the value of the variable
    // if the variable is in fact a function, executes the function and return its value
    if (this.func) {
      var row = this.row && this.row._;
      var res = this.func(row,this.col);
      return res
    }
    return this.value;
  }

  tb.Var.prototype.toJSCode = function () {
    // return a string that can be interpreted by eval and will give the same result as the value
    return this.code()?'f('+tb.toJSCode(this.code())+')':tb.toJSCode(this.value);
  }

  tb.Var.prototype.code = function() {
    // return the code of the embedded function if such a function exists
    //        or undefined if not a function
    if (this.func) return this.func.toString();
    return undefined
  }

  tb.Var.prototype.to = function(unit) {
    // return the value converted to unit
    return tb.Units.convert(this.valueOf(),this.unit,unit);
  }

  tb.Var.prototype.toString = function() {
    // return the summary of the variable
    return '[object tb.Var('+this.name+'):'+(this.func?this.toJSCode()+'==>':'')+this.valueOf()+']';
  }

  tb.Var.prototype.view = function(options) {
    // returns an HTML object with VariableName = value
    options = $.extend(true,{},tb.defaults,options);
    return tb.html('<var>'+this.label+'</var> = <span class=VALUE>'+tb.format(this.valueOf(),options)+'</span>'+(this.unit?'&nbsp;<span class=UNIT>'+this.unit+'</span>':''));
  }

  tb.Var.prototype.edit = function() {
    // returns an HTML object with the necessary controls to edit the variable
    this.codeElement = tb.output.codeElement;
    $(this.codeElement).addClass('AUTOEDIT').attr('tbObject',this.name);
    return tb.html('<var>'+this.label+'</var>'+tb.editor.html(this.valueOf(),{tbObject:this.name})+(this.unit?'&nbsp;<span class=UNIT>'+this.unit+'</span>':''));
  }


  tb.Var.prototype.getEditableValue = function(editor) {
    if (this.func) {
      return this;
    }
    else {
      return this.value;
    }
  }

  tb.Var.prototype.setEditableValue = function(editor) {
    // implementation of the [[tb.EditableObject.prototype.setEditableValue]]
    this.setValue(editor.value);
    tb.setModified(true);
    var obj = this;
    window.setTimeout(function(){obj.updateCode();tb.run()},0);
  }

  tb.Var.prototype.updateCode = function() {
    // implementation of the [[tb.EditableObject.prototype.updateCode]]
    var code = 'v('+tb.toJSCode(this.name)+','+this.toJSCode()+')';
    this.codeElement.innerHTML = tb.toHtml(code+'.edit()');
  }


  tb.Var.prototype.isV = true;

  function v(name,value) {
    // v(name) returns the variable name: rarely used since name alone will represent the same as well as tb.vars[name]
    // v(name,value) creates a new variable if it does not already exists and sets a new value
    if (value != undefined) {
      if (value.toUTCString) { // a Date: v stors a Date as this
        return tb.vars[name]=value;
      }
      if (tb.vars[name]) {
        tb.vars[name].setValue(value);
        return tb.vars[name]
      }
      return tb.vars[name] = new tb.Var(name,value);
    }
    return tb.vars[name];
  }


  /////////////////////////////////////////////////////////////////////////

  function f(tbFunc) {
    // tbFunc can eiter be a true function (rare since in that case it just returns the function)
    // or a string that is the body of a function that will be called with 2 parameters row and col
    // in case this function is used inside a table

    if (typeof tbFunc == "string") {
      try {
        var code = tbFunc;
        if (tbFunc.search(/return/)== -1) {
          tbFunc.replace(/^\s*\{(.*)\}\s*$/,'({$1})');
          code = 'return '+tbFunc;
        }
        var f = new Function('rowData','col','value','with (tb.vars){with(rowData||{}) {'+code+'}}');
        f.userCode = tbFunc;
        f.toString = function(){return this.userCode};
        f.toJson = function(){return 'f('+JSON.stringify(this.userCode)+')'};
        return f;
      }
      catch (e) {
        e.message = 'Error while compiling tbFunc\n'+tbFunc+'\n'+e.message;
        throw e;
      }
    }
    else if (typeof tbFunc == "function") {
      return tbFunc;
    }
    this.error = 'tbFunc argument must either be a function() or a string representing the code of an expression like A+3 or return A+3\n'+code;
    throw new Error(this.error);
  }

  // Row //////////////////////////////////////////////

  tb.Row = function Row(obj,table) {
    // create a Row from an object or a Row.
    // only ownProperties (not inherited) are used is the Row
    this._ = {};
    this.table = table;
    if (obj.isRow) obj = obj._;
    for (var k in obj) {
      if (obj.hasOwnProperty(k)) {
        this.setCell(k,obj[k]);
      }
    }
  }
  tb.Row.className = 'tb.Row';

  tb.Row.prototype.cell = function(col) {
    return this._[col];
  }

  tb.Row.prototype.val = function(col) {
    return this._[col] && this._[col].valueOf();
  }

  tb.Row.prototype.setCell = function (col,value) {
    if (typeof value == "function") {
      var f = new tb.Var(undefined,value);  //wrap the function into a V
      f.row = this;       //and assign the _row,_col
      f.col = col;
      this._[col] = f;
      return this;
    }
    this._[col] = value;
    return this;
  }

  tb.Row.prototype.toString = function() {
    return "[object Row]";
  }

  tb.Row.prototype.eachCol = function(func) {
    // func must be function(colname,colObject)
    for (var col in this._) {
      func(col,this._[col]);
    }
    return this;
  }

  tb.Row.prototype.reduce = function(reduceF,criteria,initialValue) {
    // apply a reduce function on a column
    // criteria is an optional f(tbFunc) that process only row that return true
    var first = true;
    var r;
    if (initialValue !== undefined) {
      r = initialValue;
      first = false;
    }
    for (var colName in this._) {
      var value = this.val(colName);
      if ((criteria===undefined)||(criteria.call(this,this._,colName,value))) {
        if (first) {
          r = value;
          first = false;
        }
        else {
          r = reduceF(r,value);
        }
      }
    }
    return r;
  }

  tb.Row.prototype.sum = function(criteria) {
    // return the sum of the row
    return this.reduce(function(a,b){return a+b},criteria)
  }

  tb.Row.prototype.min = function(criteria) {
    // return the min of the row
    return this.reduce(Math.min,criteria);
  }

  tb.Row.prototype.max = function(criteria) {
    // return the min of the row
    return this.reduce(Math.max,criteria);
  }

  tb.Row.prototype.average = function(criteria) {
    // return the average of the row
    var sc = this.reduce(colName,function(r,b){r.count++;r.sum+=b;return r},criteria,{count:0,sum:0});
    return sc.sum/sc.count;
  }

  tb.Row.prototype.rms = function(colName,criteria) {
    // return the root mean square of the row
    var sc = this.reduce(function(r,b){r.count++;r.sum+=b*b;return r},criteria,{count:0,sum:0});
    return Math.sqrt(sc.sum/sc.count);
  }

  tb.Row.prototype.toJSCode = function() {
    var e = [];
    this.eachCol(function(colName,colObject){
      e.push(tb.toJSCode(colName)+':'+tb.toJSCode(colObject));
    });
    return '{'+ e.join(',')+ '}';
  }

  tb.Row.prototype.span = function (options) {
    options = options || {};
    if (!options.cols) {
      options.cols = {};
      this.eachCol(function (col) {
        options.cols[col]=1;
      });
    }
    var h = '<table><thead><tr>';  // TODO modify to style
    for (var col in options.cols) {
      h += '<th>'+col+'</th>';
    }
    h += '</tr></thead><tbody>';
    h += '<tr>';
    for (var col in options.cols) {
      var cell = this._[col];
      h += (col=="_id")?'<th>'+cell+'</th>':'<td>'+tb.format(cell)+'</td>';
    }
    h += '</tr></tbody></table>';
    return tb.html(h);
  }

  tb.Row.prototype.list = function() {
    var h = '<table>';
    this.eachCol(function (col,val) {h += '<tr><th>'+col+'</th><td>'+val+'</td></tr>'});
    return tb.html(h+'</table>');
  }

  tb.Row.prototype.isRow = true;


// Col   //////////////////////////////////////////////////////////////
  tb.Col = function Col(name,table) {
    // Col objects represent a column of a Table
    // internal use only
    this.name = name;
    this.table = table;
  }
  tb.Col.className = 'tb.Col';

  tb.Col.prototype.toString = function() {
    return '[object Col '+this.name+']';
  }


// Table //////////////////////////////////////////////////////////////

  tb.Table = function Table(name) {
    // constructor of a new Table instance
    this.name = name;
    this.length = 0;
    this.pk = undefined;
    this.pks = {};
    this.cols = {};
    var leftStyle = function(table,row,col,value,style){if (typeof value!=='number') style.textAlign='left'};
    leftStyle.toString = function(){return 'left for not numbers'};
    this.options = {tableStyle:{},
                    styles:[leftStyle],
                    defValues:{},
                    colOrder:[],
                    visibleCols:tb.heir(this.cols)
                   };
  }
  tb.Table.className = 'tb.Table';

  tb.Table.prototype.set = tb.set;
  tb.Table.prototype.get = tb.get;

  tb.Table.prototype.rename = function(name) {
    // if name is undefined return the name
    // otherwise set a new name and return this

    if (name===undefined) {
      return this.name;
    }
    if (this.name) delete tb.vars[name];
    this.name = name
    tb.vars[name] = this;
    return this;
  }

  tb.Table.prototype.registerPk = function(row) {
    if (this.pk !== undefined) {
      var pkVal = row.cell(this.pk).valueOf();
      if (this.pks[pkVal]===undefined){
        this.pks[pkVal] = row;
      }
      else {
        throw new Error('duplicated value in primaryKey: '+pkVal+' found twice at '+this.pks[pk].index+' and '+i);
      }
    }
  }

  tb.Table.prototype.primaryKey = function(pkCol) {
    // set the primary key colName
    this.pk = pkCol;
    this.pks = {};
    for (var i=0;i<this.length;i++) {
      this.registerPk(this[i]);
    }
    return this;
  }


  tb.Table.prototype.defCol = function(name, defValue, style) {
    // set the column attribute
    //
    // defValue is the value that is used when a new Row is added and that column is not defined
    // it can be a JavaScript value (number, object.. or an f(tbFunc)
    // the style if set will call colStyle
    var c = new tb.Col(name);
    this.cols[name]=c;
    this.options.defValues[name]=defValue;
    c.defValue = defValue;
    if (style) this.colStyle(style,name);
    return this;
  }

  tb.Table.prototype.updateCols = function(withRow) {
    // updates the cols description with the fields found in withRow
    // normally for internal use only
    // return the table for command chaining

    for (var col in withRow._) {
      if (this.cols[col]==undefined) {
        this.cols[col] = new tb.Col(col);
        if ($.inArray(col,this.options.colOrder)===-1) this.options.colOrder.push(col);
      }
    }
    return this;
  }

  tb.Table.prototype.colOrder = function(order) {
    // if order = array of colName: set a new order
    // if order == undefined return the current order
    if (order) {
      this.options.colOrder = order;
      return this;
    }

    order = this.options.colOrder.concat(); // make a copy
    for (var col in this.cols) {
      if ($.inArray(col,this.options.colOrder)===-1) order.push(col);
    }
    return order;
  }

  tb.Table.prototype.show = function(columns,visible) {
    // show all columns specified in the columns array
    // if visible = true or undefined,  ensure this columns are visible if it exist
    // if visible = false, ensure this columns are hidden
    // if visible = null,  reset to the default (specialy for View)
    if (visible === null) {
      for (var i in columns) {
        delete this.options.visibleCols[columns[i]];
      }
    }
    else {
      visible = visible !== false;
      for (var i in columns) {
        this.options.visibleCols[columns[i]] = visible ;
      }
    }
    return this;
  }

  tb.Table.prototype.hide = function(columns) {
    this.show(columns,false);
    return this;
  }

  tb.Table.prototype.showOnly = function(columns) {
    this.hide(tb.keys(this.cols)).show(columns);
    return this;
  }

  tb.Table.prototype.add = function(row) {
    // add a row
    // row can be either a simple object or a Row object
    // return the table for method chaining

    row = new tb.Row($.extend(true,{},this.options.defValues,row),this);
    row.index = this.length;
    this[this.length++] = row;
    this.registerPk(row);
    this.updateCols(row);
    return this;
  }

  tb.Table.prototype.addRows = function(rows) {
    // add multiple rows
    // rows must be an array or array-like of objects
    // columns are ajusted automatically
    for (var i=0; i<rows.length; i++) {
      this.add(rows[i]);
    }
    return this;
  }

  tb.Table.prototype.update = function(cols,keepOnlyValue) {
    // cols is an object {colName:value,....}
    // value can be a simple value like a number or a string,
    // but can also be a tbFunc produced by f(tbFunc)
    // that will either be stored in the table
    // or be used during the update to calculate the static value of the cell
    // if keepOnlyValue == true

    this.forEachRow(function(i,row){
      for (var colName in cols) {
        if (keepOnlyValue) {
          var val = cols[colName];
          if (typeof val === 'function') val = val.call(row,row._,colName);
          if (val !== null) row.setCell(colName,val);
        }
        else {
          row.setCell(colName,cols[colName]);
        }
      }
    });
    for (var colName in cols) {
      if (this.cols[colName]==undefined) {
        this.cols[colName] = new tb.Col();
        if ($.inArray(colName,this.options.colOrder)===-1) this.options.colOrder.push(colName);
      }
    }
    return this;
  }

  tb.Table.prototype.forEachRow = function(func) {
    // execute func for each row of the table
    // func must be function(i,row) in which this represents the Row object
    // return the table for command chaining
    for (var i=0; i<this.length; i++) {
      func(i,this[i])
    }
    return this;
  }


  tb.Table.prototype.cell = function(row,col) {
    // return the content of the cell: if the cell is a function: return the function
    if (typeof row == 'number'){
      return this[row] && this[row].cell(col);
    }
    row = this.pks[row];
    return row && row.cell(col);
  }

  tb.Table.prototype.val = function(row,col) {
    // return the VALUE of the cell: if a function, this function is calculated first
    var c=this.cell(row,col);
    if (c===undefined) return undefined;
    return c.valueOf();
  }

  tb.Table.prototype.reduce = function(colName,reduceF,criteria,initialValue) {
    // apply a reduce function on a column
    // criteria is an optional f(tbFunc) that process only row that return true
    var first = true;
    var r;
    if (initialValue !== undefined) {
      r = initialValue;
      first = false;
    }
    for (var i=0;i<this.length;i++) {
      var value = this.val(i,colName);
      if ((criteria===undefined)||(criteria.call(this[i],this[i]._,colName,value))) {
        if (first) {
          r = value;
          first = false;
        }
        else {
          r = reduceF(r,value);
        }
      }
    }
    return r;
  }

  tb.Table.prototype.sum = function(colName,criteria) {
    // return the sum of the column
    return this.reduce(colName,function(a,b){return a+b},criteria)
  }

  tb.Table.prototype.min = function(colName,criteria) {
    // return the min of the column
    return this.reduce(colName,Math.min,criteria);
  }

  tb.Table.prototype.max = function(colName,criteria) {
    // return the min of the column
    return this.reduce(colName,Math.max,criteria);
  }

  tb.Table.prototype.average = function(colName,criteria) {
    // return the average of the column
    var sc = this.reduce(colName,function(r,b){r.count++;r.sum+=b;return r},criteria,{count:0,sum:0});
    return sc.sum/sc.count;
  }

  tb.Table.prototype.rms = function(colName,criteria) {
    // return the root mean square of the column
    var sc = this.reduce(colName,function(r,b){r.count++;r.sum+=b*b;return r},criteria,{count:0,sum:0});
    return Math.sqrt(sc.sum/sc.count);
  }

  tb.Table.prototype.setCell = function(row,col,value) {
    if (this.cols[col] === undefined) {
      this.cols[col] = new tb.Col(col);
      if ($.inArray(col,this.options.colOrder==-1)) this.options.colOrder.push(col);
    }
    if (typeof row === 'number') {
      var r = this[row];
    }
    else {
      var r = this.pks[row];
    }
    if (r === undefined) {
      r = {};
      r[col]=value;
      if (typeof row === 'string') r[this.pk]=row;
      this.add(r);
      return this;
    }

    if (col === this.pk) {
      this.pks[r.val(col)]=undefined;
      this.registerPk(r);
    }
    r.setCell(col,value);
    return this;
  }

  tb.Table.prototype.lookup = function(criteria) {
    // return the data of the first row matching the criteria

    var row = this.findFirst(criteria);
    if (row) return row._;
    return {}; // if not found, return empty data, so it can still be dereferenced
  }

  tb.Table.prototype.tableStyle = function(style) {
    for (var attr in style) {
      this.options.tableStyle[attr] = style[attr];
    }
    return this;
  }

  tb.Table.prototype.colStyle = function(style,colName){
    // set the style for a column
    // style can be either an object of $.css() parameters
    //       or a function(data,col,value) where this represents the row object which is compatible with f("tbFunc")
    //       and which return an object of css parameters

    var fStyle = function(table,row,col,value,compoundStyle) {
      if (col === colName) {
        $.extend(true,compoundStyle,typeof style === 'function'?style.call(row,row._,col,value):style);
      }
    }
    fStyle.toString = function() {return 'colStyle for '+colName+': '+tb.toJSCode(style)}
    this.options.styles.push(fStyle);
    return this;
  }

  tb.Table.prototype.rowStyle = function(style,rowNumber){
    // set the style for a row
    var expRow = this[rowNumber];
    var fStyle = function(table,row,col,value,compoundStyle) {
      if (row === expRow) {
        $.extend(true,compoundStyle,typeof style === 'function'?style.call(row,row._,col,value):style);
      }
    }
    fStyle.toString = function() {return 'rowStyle for '+expRow+': '+tb.toJSCode(style)}
    this.options.styles.push(fStyle);
    return this;
  }

  tb.Table.prototype.style = function(newStyle,rowNumber,colName){
    // .style(newStyle)  will set the default newStyle for the complete table
    // .style(newStyle,rowNumber) will set the default style for a given row
    // .style(newStyle,undefined,colName) will set the default style for a column
    // .style(newStyle,rowNumber,colName) will set the style for a given cell
    // newStyle can either be an object {cssAttr=val,...} or a function(table,rowNumber,colName)

    if ((rowNumber === undefined) && (colName === undefined)){
      var fStyle = function(table,row,col,value,compoundStyle) {
        $.extend(true,compoundStyle,typeof newStyle === 'function'?newStyle.call(row,row._,col,value):newStyle);
      }
      this.options.styles.push(fStyle);
      fStyle.toString = function() {return 'general style: '+tb.toJSCode(newStyle)}
      return this;
    }
    if (rowNumber === undefined) {
      this.colStyle(newStyle,colName);
      return this;
    }
    if (colName === undefined) {
      this.rowStyle(newStyle,rowNumber);
      return this;
    }

    var expRow = this[rowNumber];
    var fStyle = function(table,row,col,value,compoundStyle) {
      if ((row === expRow) && (col === colName)) {
        $.extend(true,compoundStyle,typeof newStyle === 'function'?newStyle.call(row,row._,col,value):newStyle);
      }
    }
    fStyle.toString = function() {return 'cell style for '+expRow+','+colName+': '+tb.toJSCode(newStyle)}
    this.options.styles.push(fStyle);
    return this;
  }


  tb.Table.prototype.compoundStyle = function(row,colName,value) {
    // calculate the compound style for a given cell
    var style = (this.parent && this.parent.compoundStyle(row,colName,value)) || {};
    for (var i=0;i<this.options.styles.length;i++) {
      this.options.styles[i](this,row,colName,value,style);
    }
    return style;
  }

  tb.Table.prototype.sort = function(cols) {
    // sort the table according to the "cols" criteria
    // cols is an object of the form:
    //   {  col1: 1    // 1 means ascending  alphabetic or numeric order
    //      col2:-1    //-1 means descending alphabetic or numeric order
    //      col3: function(a,b) {... // any function that compare a and b and returns >0 if a>b, <0 if a<b, 0 if a==b
    // return the table for command chaining
    function order(a,b) {
      for (var col in cols) {
        if (typeof cols[col] == 'function') {
          var res = cols[col](a.cell(col),b.cell(col))
          if (res != 0) return res;
        }
        if (a.cell(col) > b.cell(col)) return  cols[col];
        if (a.cell(col) < b.cell(col)) return -cols[col];
      }
      return 0;
    }

    Array.prototype.sort.call(this,order);
    return this;
  }

  tb.Table.prototype.find = function(criteria) {
    // return a new view of this table that has only the rows that match the criteria
    // the rows of this view ARE THE ORIGINAL ROWS
    // any function in a cell still refer to the original table.

    var view = new tb.View(this);
    for (var i=0; i<this.length; i++) {
      if (tb.objMatchCriteria(this[i]._,criteria)){
        view[view.length++] = this[i];
      }
    }
    return view;
  }

  tb.Table.prototype.findFirst = function(criteria) {
    // mongoDB find() as if the table was a small mongoDB
    // return the first Row of this table that match the criteria
    for (var i=0; i<this.length; i++) {
      if (tb.objMatchCriteria(this[i]._,criteria)){
        return this[i];
      }
    }
  }

  tb.Table.prototype.toString = function() {
    // return a string summarizing the table
    return '[object Table('+this.name+') of '+this.length+' rows]';
  }

  tb.Table.prototype.toJSCode = function() {
    var e = [];
    this.forEachRow(function(i,row){
      e.push(row.toJSCode())
    });
    return '['+e.join(',\n')+']';
  }

  tb.Table.prototype.node$ = function() {
    // display the table without its name
    var t$ = $('<table/>').css(this.options.tableStyle || {});
    var h$ = $('<thead/>');
    var b$ = $('<tbody/>');
    var r$ = $('<tr/>');
    var colOrder = this.colOrder();
    for (var i in colOrder) {
      if (this.options.visibleCols[colOrder[i]] !== false) r$.append('<th>'+colOrder[i]+'</th>');
    }
    h$.append(r$);
    for (var rowNumber=0;rowNumber<this.length;rowNumber++) {
      var row = this[rowNumber];
      r$ = $('<tr/>');
      for (var i in colOrder) {
        var col = colOrder[i];
        if (this.options.visibleCols[col] !== false) {
          var val = row.val(col)
          var cell$ = col===this.pk?$('<th></th>'):$('<td></td>');
          var style = this.compoundStyle(row,col,val);
          cell$.html(tb.format(val,style)).css(style);
          r$.append(cell$);
        }
      }
      b$.append(r$);
    }
    t$.append(h$).append(b$);
    return t$;
  }

  tb.Table.prototype.span = function() {
    // deprecated: only for backward compatibility: use node$ instead
    return tb.html(this.node$()[0].outerHTML);
  }

  tb.Table.prototype.view = function() {
    //display the table, including its name in a <div>
    var table = this;
    return {node$:function(){return $('<div>').append('<var>'+table.name+'</var>').append(table.node$())}};
  }


  // editor interface ////////////////////////////////////////////////////

  tb.Table.prototype.edit = function(options) {
    // edit is similar to span, but gernerates HTML code in order to edit the object interactively
    // it will also set the code to AUTOEDIT class which means that it should no longer be modified by the user since it will
    // be generated by the edition mecanism.

    // premier jet: toute la table est éditée peut être simple et efficasse: en cas de tables partielles, faire simplement plusieurs tables et faire une fct pour lier plusieurs tables
    this.codeElement = tb.output.codeElement;
    $(this.codeElement).addClass('AUTOEDIT').attr('tbObject',this.name);

    var h = '<div><var>'+this.name+'</var><table><tr><th>#</th>';
    for (var col in this.cols) {
      h += '<th>'+col+'</th>';
    }
    h += '</tr>';
    for (var row=0; row<this.length; row++) {
      h += '<tr><th draggable=true>'+row+'</th>';
      for (var col in this.cols) {
        h += '<td>'+tb.editor.html(this.cell(row,col),{tbObject:this.name,'tbRow':row,tbCol:col})+'</td>';
      }
      h += '</tr>';
    }
    h+='</table></div>';
    return tb.html(h);
  }

  tb.Table.prototype.getEditableValue = function(editor) {
    return this.cell(Number(editor.attr('tbRow')),editor.attr('tbCol'));
  }

  tb.Table.prototype.setEditableValue = function(editor) {
    this.setCell(Number(editor.attr('tbRow')),editor.attr('tbCol'),editor.value);
    tb.setModified(true);
    var obj = this;
    window.setTimeout(function(){obj.updateCode();tb.run()},0);
  }


  tb.Table.prototype.updateCode = function() {
    // generate the code that represents the element as edited
    // can be used to replace the existing code
    var code = 'table('+JSON.stringify(this.name)+')\n';
    for (var i=0; i<this.length; i++) {
      code += '.add('+this[i].toJSCode()+')\n';
    }
    this.codeElement.innerHTML = tb.toHtml(code+'.edit()');
  }


  // factory ////////////////////////////////////////////////
  table = function(name,local) {
    // returns an already existing table or creates a new table
    // - name is the name of the instance
    // - if local=true, the instance is not registered in v
    if (tb.vars[name] && tb.vars[name].constructor == Table){
      return tb.vars[name];
    }

    if ((local == true) || (name == undefined)) {
      return new tb.Table(name);
    }
    return tb.vars[name] = new tb.Table(name);
  }

// View  //////////////////////////////////////////////////////////////

  tb.View = function View(parent) {
    this.parent = parent;
    this.length = 0;

    this.pk = parent.pk;
    this.pks = parent.pks;          //hash table is empty but inherit from primary key
    this.options = {tableStyle:tb.heir(parent.options.tableStyle),
                    styles:[],      //no additionnal styles, since it will be computed
                    colOrder:parent.options.colOrder,
                    visibleCols:tb.heir(parent.options.visibleCols)
                   };
    this.cols = {};
    for (var col in parent.cols) this.cols[col] = new tb.Col(col,this);
  }
  tb.View.className = 'tb.View';

  tb.View.prototype.set = tb.set;
  tb.View.prototype.get = tb.get;
  tb.View.prototype.rename = tb.Table.prototype.rename;
  tb.View.prototype.colOrder = tb.Table.prototype.colOrder;
  tb.View.prototype.show = tb.Table.prototype.show;
  tb.View.prototype.hide = tb.Table.prototype.hide;
  tb.View.prototype.forEachRow = tb.Table.prototype.forEachRow;
  tb.View.prototype.cell = function(row,col) {
    // return the content of the cell: if the cell is a function: return the function
    if (typeof row == 'number'){
      return this[row] && this[row].cell(col);
    }
    row = parent.pks[row];
    if ((row===undefined) || ($.inArray(row,this) == -1)) return undefined;
    return row.cell(col);
  }

  tb.View.prototype.val = tb.Table.prototype.val;
  tb.View.prototype.lookup = tb.Table.prototype.lookup;
  tb.View.prototype.tableStyle = tb.Table.prototype.tableStyle;
  tb.View.prototype.colStyle = tb.Table.prototype.colStyle;
  tb.View.prototype.rowStyle = tb.Table.prototype.rowStyle;
  tb.View.prototype.style = tb.Table.prototype.style;
  tb.View.prototype.compoundStyle = tb.Table.prototype.compoundStyle;
  tb.View.prototype.sort = tb.Table.prototype.sort;
  tb.View.prototype.find = tb.Table.prototype.find;
  tb.View.prototype.reduce = tb.Table.prototype.reduce;
  tb.View.prototype.sum = tb.Table.prototype.sum;
  tb.View.prototype.max = tb.Table.prototype.max;
  tb.View.prototype.min = tb.Table.prototype.min;
  tb.View.prototype.average = tb.Table.prototype.average;
  tb.View.prototype.rms = tb.Table.prototype.rms;

  tb.View.prototype.toString = function() {
    // return a string summarizing the table
    return '[object View '+this.name+' of Table '+this.parent.name+' of '+this.length+' rows]';
  }

  tb.View.prototype.toJSON = tb.Table.prototype.toJSON;
  tb.View.prototype.node$ = tb.Table.prototype.node$;


  // Output ///////////////////////////////////////////////

  function newOutput (codeElement,outputElement) {
    // outputElement is, if specified, the Element where HTML will be dumped
    //         element is essential if HTML uses the finalize() method
    h = new tb.HTML();
    h.codeElement = codeElement;
    h.outputElement = outputElement;
    h.span = function(){return ''};  // so that if a statment ends with an output, it will no show the output twice
    return h;
  }


  // html ///////////////////////////////////////////////



  tb.HTML = function(html) {
    this.htmlCode = html || '';
    this.tagsEnd = [];
  }
  tb.HTML.className = 'tb.HTML';

  tb.HTML.prototype.asNode = function() {
    var html = this;
    return {node$:function() {return $(html.toString())},html:html}
  }

  tb.HTML.prototype.toString = function() {
    return this.htmlCode+this.tagsEnd.join('');
  }

  tb.HTML.prototype.removeJQueryAttr = function() {
    this.htmlCode = this.htmlCode.replace(/jQuery\d+="\d+"/g,'');
    return this;
  }

  tb.HTML.prototype.toAscii = function() {
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

  tb.HTML.prototype.span = tb.HTML.prototype.toString;

  tb.HTML.prototype.html = function (html) {
  // insert any html
    this.htmlCode += html;
    return this;
  }

  tb.HTML.prototype.showHtml = function (html) {
  // show html as html code
    this.htmlCode += '<span class=INSPECTHTML>'+tb.toHtml(html)+'</span>';
    return this;
  }

  tb.HTML.prototype.showDiff = function(e1,e2) {
    if (e1.length != e2.length) {
      this.htmlCode += '<span class=DIFFSAME>e1.length=='+e1.length+' != e2.length=='+e2.length+'</span>';
    }
    for (var i=0; (i<e1.length) && (i<e2.length); i++) {
      if (e1.charAt(i) != e2.charAt(i)) break;
    }
    this.htmlCode += '<span class=DIFFSAME>'+e1.slice(0,i)+'</span><br>e1:<span class=DIFFERENT>'+e1.slice(i)+'</span><br>e2:<span class=DIFFERENT>'+e2.slice(i)+'</span>';
    return this;
  }

  tb.HTML.prototype.showHtmlDiff = function(e1,e2) {
    if (e1.length != e2.length) {
      this.htmlCode += '<span class=DIFFERENT>e1.length=='+e1.length+' != e2.length=='+e2.length+'</span>';
    }
    for (var i=0; (i<e1.length) && (i<e2.length); i++) {
      if (e1.charAt(i) != e2.charAt(i)) break;
    }
    this.htmlCode += '<span class=DIFFSAME>'+tb.toHtml(e1.slice(0,i))+'</span><br>e1:<span class=DIFFERENT>'+tb.toHtml(e1.slice(i))+'</span><br>e2:<span class=DIFFERENT>'+tb.toHtml(e2.slice(i))+'</span>';
    return this;
  }

  tb.HTML.prototype.p = function (/*elements*/) {
    this._tag('P',arguments);
    return this;
  }
  tb.HTML.prototype.ul = function (/*elements*/) {
    this._tag('UL',arguments);
    return this;
  }
  tb.HTML.prototype.ol = function (/*elements*/) {
    this._tag('OL',arguments);
    return this;
  }
  tb.HTML.prototype.li = function (/*elements*/) {
    this._tag('LI',arguments);
    return this;
  }
  tb.HTML.prototype.pre = function (/*elements*/) {
    this._tag('PRE',arguments);
    return this;
  }
  tb.HTML.prototype.hr = function (){
    this._tag('HR',[]);
    return this
  }
  tb.HTML.prototype.h = function (/*elements*/) {
    this._tag('H'+tb.htmlIndent,arguments);
    return this;
  }

  tb.HTML.prototype.indent = function(levels) {
    // increment the header level
    // levels: number of level to increment (default is 1)
    levels = levels || 1;
    tb.htmlIndent += levels;
    return this;
  }

  tb.HTML.prototype.tag = function(tagNameAndAttributes /*,elements*/) {
    // adds to the html <tagNameAndAttributes>span of all elements</tagName>
    // if element is empty, only adds <tagNameAndAttributes> and push the
    // closing </tagName> on the stack waiting for an .end()
    var elements = [];
    for (var i = 1; i<arguments.length; i++) elements.push(arguments[i]);
    this._tag(tagNameAndAttributes,elements);
    return this;
  }

  tb.HTML.prototype._tag = function(tagNameAndAttributes ,elements) {
    this.htmlCode += '<'+tagNameAndAttributes+'>';
    var tagEnd = '</'+tagNameAndAttributes.split(' ')[0]+'>';
    if ((elements == undefined) || (!elements.length)) {
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

  tb.HTML.prototype.end = function() {
    // close the last opened tag
    this.htmlCode += this.tagsEnd.pop();
    return this;
  }

  tb.HTML.prototype.inspect = function(/*objects*/) {
    // adds to the HTML object the inspection of all objects passed in parameters
    for (var i=0; i<arguments.length; i++) {
      this.htmlCode += tb.inspect(arguments[i]).span();
    }
    return this;
  }



  tb.HTML.prototype.sendTo = function(jquerySelector){
    var that = this;
    $(jquerySelector).each(function(i,e){e.innerHTML = that.html});
    return this
  }

  tb.HTML.prototype.finalize = function(finalizationFunc) {
    // finalizationFunc must be a function() {...}
    // note that as this function is defined within a code that will be created in secureEval, we are
    // also inside with(v) so any user variable is availlable as well as output is availlable because of the closure mecanism

    if ((this.codeElement == undefined) || (this.outputElement == undefined)) {
      throw new Error('HTML.finalize can only be used if a code and output Element was associated');
    }
    this.finalizationFunc = finalizationFunc;
    tb.finalizations.push(this);
    return this;
  }

  tb.HTML.prototype.alert = function(message) {
    window.alert(message);
    return this;
  }

  tb.html = function(htmlcode) {
    return new tb.HTML(htmlcode);
  }


  // interactive Elements ////////////////////////////////////////////////////////
  tb.IElement = function IElement(name,css,innerHtml,scene) {
    //create a new IElement that can be added inside scene
    //css is an object like {top:100,left:200....} that surcharge {top:0,left:0}
    //html is html code that will be used as innerHTML
    //scene is the scene whom this element belongs to
    this.name = name;
    this.scene = scene;
    this.forces = {};
    this.f = {x:0,y:0}; //Newton
    this.a = {x:0,y:0}; //pixel/s2
    this.v = {x:0,y:0}; //pixel/s
    this.p = {x:(css.left || 0)+(css.width || 0)/2,y:(css.top || 0)+(css.height || 0)/2}; //pixel
    this.m = 1; //kg;
    this.$ = this.create$(css||{top:0,left:0},innerHtml || '');
    this.$[0].IElement = this; // special attribute back to the IElement
    this.$.$end = this;
  }
  tb.IElement.className = 'tb.IElement';

  tb.IElement.prototype.create$ = function(css,html) {
    // return the jQuery object corresponding to the DOM element of the IElement
    return $('<DIV>'+html+'</DIV>').addClass('IELEMENT').css(css);
  }

  tb.IElement.prototype.top = function(newValue) {
    // if newValue == undefined, return the current value of top
    // else set the new value
    if (newValue == undefined) return this.$.position().top;
    this.$.css('top',newValue);
    return this;
  }

  tb.IElement.prototype.left = function(newValue) {
    // if newValue === undefined, return the current value of left
    // else set the new value
    if (newValue == undefined) return this.$.position().left;
    this.$.css('left',newValue);
    return this;
  }

  tb.IElement.prototype.width = function(newValue) {
    // if newValue === undefined, return the current value of width
    // else set the new value
    if (newValue == undefined) return this.$.width();
    this.$.width(newValue);
    return this;
  }

  tb.IElement.prototype.height = function(newValue) {
    // if newValue === undefined, return the current value of height
    // else set the new value
    if (newValue == undefined) return this.$.height();
    this.$.height(newValue);
    return this;
  }

  tb.IElement.prototype.html = function(newValue) {
    // if newValue === undefined, return the current value of html
    // else set the new value
    if (newValue == undefined) return this.$.html();
    this.$.html(newValue);
    return this;
  }

  tb.IElement.prototype.css = function(name,newValue) {
    // if newValue === undefined, return the current value of html
    // else set the new value
    // can also be used with an object like {top:50,left:50,....}
    if (typeof name === 'object') {
      this.$.css(name);
      return this;
    }
    if (newValue == undefined) return this.$.css(name);
    this.$.css(name,newValue);
    return this;
  }

  tb.IElement.prototype.addForce = function(iElement,force) {
    // add a force between this element and another iElement
    this.forces[iElement.name] = force;
  }

  tb.IElement.prototype.addForces = function(forces) {
    // add new forces
    // forces is an object {IElementName:forceFunction,....}
    // forceFunction can be generated by tb.spring or any function(thisElement, otherElement) that return a force{x,y}
    // or undefined to cancel the force produced by a given element
    $.extend(this.forces,forces);
    return this;
  }

  tb.IElement.prototype.clearForces = function() {
  // remove all forces on an IElement
    this.forces = {};
  }

  tb.IElement.prototype.prepareAnimation = function() {
    this.f = {x:0,y:0};
    if (!this.p) this.p = {x:this.left()+this.width()/2,y:this.top()+this.height()/2};
    return this;
  }

  tb.IElement.prototype.applyForceWith = function(otherIElement,force){
    //apply a force between this and the otherIElement
    f = force(this,otherIElement);
    this.f.x += f.x;
    this.f.y += f.y;
    otherIElement.f.x -= f.x;
    otherIElement.f.y -= f.y;
    return this;
  }

  tb.IElement.prototype.applyForceToAll = function(iElements,force) {
    // apply a force between this and each element of iElements
    for (var i = 0;i<iElements.length;i++) {
      this.applyForceWith(iElements[i],force);
    }
  }

  tb.IElement.prototype.bounceOnBorders = function(top,left,bottom,right) {
    // modifies position and velocity in order to keep p inside a rectangle
    if ((this.p.x<left) && (this.v.x<0)) {
      this.p.x = left;
      this.v.x = - this.v.x*0.8;
    }
    if ((this.p.x>right) && (this.v.x > 0)) {
      this.p.x = right;
      this.v.x = - this.v.x*0.8;
    }
    if ((this.p.y<top) && (this.v.y<0)) {
      this.p.y = top;
      this.v.y = - this.v.y*0.8;
    }
    if ((this.p.y>bottom) && (this.v.y > 0)) {
      this.p.y = bottom;
      this.v.y = - this.v.y*0.8;
    }
    return this;
  }

  tb.IElement.prototype.animate = function(deltaT$ms) {
    // calculate all forces on this element, then calculate a new acceleration, speed and position

    var deltaT = (deltaT$ms || 100)/1000;
    var friction = {x:0,y:0,u:1};
    var thisElement = this;

    $.each(this.forces,function(name,forceFunc){
      if (!forceFunc) return;
      var fe=forceFunc(thisElement,thisElement.scene[name]);
      thisElement.f.x += fe.x;
      thisElement.f.y += fe.y;
    });

    thisElement.f.x = tb.limit(thisElement.f.x,-500,500);
    thisElement.f.y = tb.limit(thisElement.f.y,-500,500);

    friction.x = -this.v.x*friction.u;
    friction.y = -this.v.y*friction.u;

    this.a.x =  (this.f.x+friction.x) / this.m;
    this.a.y =  (this.f.y+friction.y) / this.m;
    this.v.x += this.a.x * deltaT;
    this.v.y += this.a.y * deltaT;
    this.p.x += this.v.x * deltaT;
    this.p.y += this.v.y * deltaT;
    this.left(this.p.x - this.width()/2)
        .top( this.p.y - this.height()/2);
    return this;
  }

  tb.IElement.prototype.div = function(name,css,html) {
    return this.scene.add(new tb.IElement(name,css,html,this.scene));
  }

  tb.IElement.prototype.value = function(name,css,html) {
    return this.scene.add(new tb.IValue(name,css,html,this.scene));
  }

  tb.IElement.prototype.checkBox = function(name,css,html) {
    return this.scene.add(new tb.ICheckBox(name,css,html,this.scene));
  }

  tb.IElement.prototype.trace = function(/*objects*/){
    trace(arguments);
    return this;
  }

  tb.IElement.prototype.end = function() {
    return this.scene;
  }

  tb.IElement.prototype.toString = function() {
    return '[object '+tb.functionName(this.constructor)+' '+this.name+']';
  }

  tb.IElement.prototype.element$ = function() {
    return this.$;
  }


  // forceFunctions ///////////////////////////////////////////
  tb.spring = function(d,k) {
    // return a function that tries to keep 2 elements at a distance of d
    // with a spring of strength of k
    //
    k = k !== undefined ? k:1;
    d = d !== undefined ? d:100;
    return function springForce(thisElement,otherElement) {
      var f = {};
      f.delta = {x:otherElement.p.x-thisElement.p.x,y:otherElement.p.y-thisElement.p.y};
      f.dist = Math.sqrt(Math.pow(f.delta.x,2)+Math.pow(f.delta.y,2));
      f.force = (f.dist-d)*k;
      if (f.dist>0) {
        f.x = f.delta.x/f.dist*f.force;
        f.y = f.delta.y/f.dist*f.force;
      }
      else{
        f.x = f.force;
        f.y = f.force
      }
      return f;
    }
  }

  tb.ySpring = function(k) {
    // return a function that tries to keep 2 elements at the same y
    // with a spring of strength of k
    //
    k = k !== undefined ? k:1;
    return function springForce(thisElement,otherElement) {
      var f = {};
      f.dist = otherElement.p.y-thisElement.p.y;
      f.x = 0;
      f.y = f.dist*k;
      return f;
    }
  }

  tb.repulseForce = function repulseForce(iE1,iE2) {
  // standard repulse force between 2 elements
    var dist2 = tb.dist2(iE1.p,iE2.p);
    var k = 100;
    var f = {x:0,y:0};
    if (dist2 > 0) {
      f.x = (iE1.p.x-iE2.p.x) / dist2 * k;
      f.y = (iE1.p.y-iE2.p.y) / dist2 * k;
    }
    else {
      f.x = k;
      f.y = k;
    }
    return f;
  }

  tb.centripetalForce = tb.spring(0,1);


  tb.repulseIElements = function(iElements,repulsionForce){
  // repulse all iElements between them by repulseForce

    for (var i = 0;i<iElements.length;i++) {
      for (var j = i+1;j<iElements.length;j++) {
        iElements[i].applyForceWith(iElements[j],repulsionForce);
      }
    }
  }

  tb.repulseAndCenterIElements = function(iElements,repulsionForce,centripetalForce,center){
  // repulse all iElements between them by repulseForce
  // and attract all to center {x,y}
    var iECenter = {f:{x:0,y:0},p:center};
    for (var i = 0;i<iElements.length;i++) {
      for (var j = i+1;j<iElements.length;j++) {
        iElements[i].applyForceWith(iElements[j],repulsionForce);
      }
      iElements[i].applyForceWith(iECenter,centripetalForce);
    }
  }


  // IValue //////////////////////////////////////////////////

  tb.IValue = function (name,css,html,scene) {
    tb.IElement.call(this,name,css,html || name,scene);
  }
  tb.IValue.className = 'tb.IValue';

  tb.makeInheritFrom(tb.IValue,tb.IElement);

  tb.IValue.prototype.value = function(newValue) {
    // when used without parameters, return the current value
    // (same as valueOf)
    // with a parameter set a new value
    if (newValue===undefined) return this.$.children('INPUT').val();
    this.$.children('INPUT').val(newValue);
    return this;
  }

  tb.IValue.prototype.valueOf = function() {
    // returns the state of the value attribute
    return this.value();
  }

  tb.IValue.prototype.create$ = function(css,html) {
    // return the JQuery for a checkBox
    // this checkBox will have the class IELEMENT and so will be positionned absolute
    return $('<SPAN class=IELEMENT>'+html+'<INPUT type="number" value=0></INPUT></SPAN>').css(css);
  }


  // ICheckBox //////////////////////////////////////////////////

  tb.ICheckBox = function (name,css,html,scene) {
    // ICheckBox is an IElement for <INPUT type=checkbox>
    tb.IElement.call(this,name,css,html || name,scene);
  }
  tb.ICheckBox.className = 'tb.ICheckBox';

  tb.makeInheritFrom(tb.ICheckBox,tb.IElement);

  tb.ICheckBox.prototype.checked = function(newState) {
    // when used without parameters, return the current state of the corresponding checkBox (generally created with output.iCheckBox)
    // (same as valueOf)
    // with a parameter (true or false) set a new state to the checked attribute of the iCheckBox
    if (newState===undefined) return this.$.children().prop('checked');
    this.$.children().prop('checked',newState);
    return this;
  }

  tb.ICheckBox.prototype.valueOf = function() {
    // returns the state of the checked attribute
    return this.checked();
  }

  tb.ICheckBox.prototype.create$ = function(css,html) {
    // return the HTML code for a checkBox with id=id and text as content
    // this checkBox will have the class IELEMENT and so will be positionned absolute
    // at the same time a ICheckBox is created with the same id allowing to interact
    // easily with the checkBox in user code
    return $('<SPAN class=IELEMENT><INPUT type="checkbox">'+html+'</INPUT></SPAN>').css(css);
  }

  // Scene ///////////////////////////////////////////////////////////////////////

  tb.Scene = function Scene(name,css,html) {
  // a scene has itself as scene so all .div.. methods of IElement are also valid
    tb.IElement.call(this,name,css || {},html || '',this);
    this.length = 0;
  }
  tb.Scene.className = 'tb.Scene';

  tb.makeInheritFrom(tb.Scene,tb.IElement);

  tb.Scene.prototype.create$ = function(css,html) {
    this.container$ = $('<DIV class=SCENECONTAINER>');
    return $('<DIV class=SCENE>').css(css).html(html).append(this.container$);
  }

  tb.Scene.prototype.add = function(iElement) {
    // add an IElement to the Scene;
    this[iElement.name] = iElement;
    this[this.length++] = iElement;
    this.container$.append(iElement.element$())
    return iElement;
  }

  tb.Scene.prototype.remove = function(iElement) {
  // remove iElement from the sceen
  // it does'nt destroy the iElement itself
  // but it also detach the DOM element so it is no longer part of the DOM tree
    if (iElement == undefined) return this;
    var pos = $.inArray(iElement,this);
    if (pos === -1) throw new Error ("can't remove iElement "+iElement.name+" from scene "+this.name+" since it doesn't belongs to that scene");
    Array.prototype.splice.call(this,pos,1);
    delete this[iElement.name];
    iElement.$.detach();
    return this;
  }

  tb.Scene.prototype.animate = function(deltaT$ms) {
    var deltaT$ms = deltaT$ms || 100;

    for (var i = 0;i<this.length;i++) {
      this[i].prepareAnimation();
    }

    for (var i = 0;i<this.length;i++) {
      this[i].animate(deltaT$ms)
    }
  }

  tb.Scene.prototype.node$ = function() {
    return this.$;
  }

  tb.scene = function(name,css) {
    // creates a new Scene and return a fake IElement that has scene as "parent"
    // so that method chaining is only done at IElement level
    var scene = new tb.Scene(name,css);
    tb.vars[name] = scene;
    return scene;
  }

  // Cloud ///////////////////////////////////////////////

  tb.Cloud = function Cloud(name,css,html) {
    // Cloud is a Scene that contains IElement that represents a Cloud of information
    tb.Scene.call(this,name,css,html);
    this.repulseForce = tb.repulseForce;
    this.centripetalForce = tb.centripetalForce;
  }
  tb.Cloud.className = 'tb.Cloud';

  tb.makeInheritFrom(tb.Cloud,tb.Scene);

  tb.Cloud.prototype.animate = function(deltaT$ms) {
    var deltaT$ms = deltaT$ms || 100;
    var center = {x:this.width()/2,y:this.height()/2};
    var t = 0;
    var l = 0;
    var b = this.height();
    var r = this.width();

    for (var i = 0;i<this.length;i++) {
      this[i].prepareAnimation();
    }

    tb.repulseAndCenterIElements(this,this.repulseForce,this.centripetalForce,center);

    for (var i = 0;i<this.length;i++) {
      this[i].bounceOnBorders(t,l,b,r).animate(deltaT$ms);
    }
  }

  tb.cloud = function(name,css){
    var cloud = new tb.Cloud(name,css);
    tb.vars[name] = cloud;
    return cloud;
  }

  // helpers /////////////////////////////////////////////

  function range(min,max) {    //TODO devrait être un itérateur, mais n'existe pas encore dans cette version
    var a = [];
    for (var i = min; i <= max; i++) {
      a.push(i);
    }
    return a;
  }
