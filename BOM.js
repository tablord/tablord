function Bom(name,condition) {
  this._name = name;
  this.condition = condition;
  this.lines = new table();
}

Bom.prototype.add = function(line){
  this.lines.add(line);
}

Bom.prototype.toString = function() {
  return '[object Bom '+this._name+']';
}

Bom.prototype.span = function() {
  var h = '<h3>BOM '+this._name+'</h3>';
  h += '<p>condition:('+this.condition.join(' && ')+')</p>';
  h += this.lines.span({cols:{part:1,quantity:1,neededAt:1}});
  return h;
}

function bom(name,condition /*,lines*/) {
  var b = new Bom(name,condition);
  for (var i=2; i< arguments.length; i++){
    b.add(arguments[i]);
  }
  return b;
}


// Product ///////////////////////////////////////
function Product(name){
  this._name = name;
  this.boms=[];
  this.variables={};
}

Product.prototype.add = function(bom) {
  this.boms.push(bom);
}

Product.prototype.updateVariables = function () {
  for (var i=0; i < this.boms.length; i++) {
    var b = this.boms[i];
    for (var n=0; n < b.condition.length; n++) {
      var c = b.condition[n].split('=');
      if (this.variables[c[0]]) {
        var pv = this.variables[c[0]];
      }
      else {
        var pv = new ProductVariable(c[0]);
      }
      this.variables[c[0]] = pv.add(c[1]);
    }
  }
  return this;
}

Product.prototype.toString = function() {
  return '[object Product '+this._name+']';
}

Product.prototype.span = function() {
  var h='<h2>Product '+this._name+'</h2>';
  for (var vn in this.variables) {
    h += this.variables[vn].span();
  }
  for (var i=0; i<this.boms.length; i++) {
    h += this.boms[i].span();
  }
  return h;
}

function product(name /*,boms*/) {
  var p = new Product(name);
  for (var i=1; i< arguments.length; i++){
    p.add(arguments[i]);
  }
  return v[name] = p;
}

  
// ProductVariable  ///////////////////////////////
function ProductVariable (name) {
  this._name = name;
  this.length = 0;
}

ProductVariable.prototype.add = function(value){
  this[value] = (this[value] || {});
  this[value].value=value;
  this[this.length++]=this[value];
  return this;
}

ProductVariable.prototype.join = Array.prototype.join;

ProductVariable.prototype.toString = function() {
  return '[object ProductVariable '+this._name+']';
}

ProductVariable.prototype.span = function(){
  var h = '<span>ProductVariable '+this._name+' {';
  for (var i=0; i<this.length; i++){
    h += this[i].value+' ';
  }
  return h +'}</span>';
}

