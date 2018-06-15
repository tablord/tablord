function Bom(name,condition) {
  this._name = name;
  this.condition = condition.sort();  //important that we keep always the same order
  this.lines = new table();
}

Bom.prototype.add = function(line){
  this.lines.add(line);
}

Bom.prototype.forEachLine = function(func){
  // func must be function(lineNumber,line)
  this.lines.forEachRow(func);
}

Bom.prototype.toString = function() {
  return '[object Bom '+this._name+']';
}

Bom.prototype.span = function() {
  var h = '<h3>BOM '+this._name+'</h3>';
  h += '<p>condition:('+this.condition.join(' && ')+')</p>';
  h += this.lines.span({cols:{part:{head:1},quantity:1,neededAt:1}});
  return h;
}

function bom(name,condition /*,lines*/) {
  var b = new Bom(name,condition);
  for (var i=2; i< arguments.length; i++){
    b.add(arguments[i]);
  }
  return b;
}

// Part //////////////////////////////////////////
function Part(name){
  this._name = name;
  this.needs = table(name,false);
}

Part.prototype.add = function (quantity,condition,neededAt) {
  this.needs.add({quantity:quantity,condition:condition,neededAt:neededAt});
  return this;
}

Part.prototype.sort = function() {
  this.needs.sort({condition:1});
  return this;
}

Part.prototype.span = function() {
  return this.needs.view();
}


// Product ///////////////////////////////////////
function Product(name){
  this._name = name;
  this.boms=[];
  this.variables={};
  this.parts={};
}

Product.prototype.addBom = function(bom) {
  this.boms.push(bom);
  return this;
}

Product.prototype.addPartNeed = function(part,quantity,condition,neededAt) {
  if (this.parts[part] == undefined) {
    this.parts[part] = new Part(part);
  }
  this.parts[part].add(quantity,condition,neededAt);
  return this;
}

Product.prototype.updateParts = function () {
  for (var i=0; i<this.boms.length; i++) {
    var cond = this.boms[i].condition;
    var bom = this.boms[i];
    var prod = this
    bom.forEachLine(function(i,line) {
      prod.addPartNeed(line.part,line.quantity,cond,line.neededAt);
    })
  }
  
  for (var part in this.parts) {
    this.parts[part].sort();
  }
  return this;
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
      this.variables[c[0]] = pv.add(b.condition[n]);
    }
  }
  return this;
}

Product.prototype.toString = function() {
  return '[object Product '+this._name+']';
}

Product.prototype.span = function() {
  var h='<h2>Product '+this._name+'</h2>';
  h += '<h3>Variables</h3>';
  for (var vn in this.variables) {
    h += this.variables[vn].span();
  }
  h += '<h3>BOMs</h3>';
  for (var i=0; i<this.boms.length; i++) {
    h += this.boms[i].span();
  }
  h += '<h3>Parts</h3>';
  for (var part in this.parts) {
    h += this.parts[part].span();
  }
  return h;
}

Product.prototype.setScenario = function(scenario) {
  // scenario = {quantity:qq,
  //             max:{
  //               'cond1=c1':xx,
  //               'cond1=c2':yy,  etc..
  //             }
  for (var variable in this.variables) {
    this.variables[variable].quantity = scenario.quantity;
  }
  for (var cond in scenario.max) {
    this.variables[cond.split('=')[0]][cond].max = scenario.max[cond];
  }
  return this;
}

function product(name /*,boms*/) {
  var p = new Product(name);
  for (var i=1; i< arguments.length; i++){
    p.addBom(arguments[i]);
  }
  return v[name] = p;
}

  
// ProductVariable  ///////////////////////////////
function ProductVariable (name) {
  this._name = name;
  this.length = 0;
  this.quantity = 0;
}

ProductVariable.prototype.add = function(value,max){
  if (this[value] == undefined) {
    this[value] = {};
    this[this.length++]=this[value];
  }  
  this[value].value=value;
  this[value].max=max || 0;
  return this;
}

ProductVariable.prototype.join = Array.prototype.join;

ProductVariable.prototype.toString = function() {
  return '[object ProductVariable '+this._name+']';
}

ProductVariable.prototype.span = function(){
  var h = '<span>ProductVariable '+this._name+' for '+this.quantity+'<br>';
  var t = table();
  for (var i=0; i<this.length; i++){
    t.add(this[i]);
  }
  return h+ t.span({cols:{value:{head:1},max:1}}) +'</span>';
}


// Permutation ///////// could be in another module //////////////////////
function permutations(elements){ 
  if (elements.length == 1) { 
    return elements; 
  } 
  var res = []; 
  for (var i=0; i<elements.length; i++){ 
    var first = elements[i];
    var others = elements.slice(0,i).concat(elements.slice(i+1));
    var p = permutations(others);

    for (var j=0;j<p.length;j++){
      res.push([first].concat(p[j]))
    }
  }
  return res;
}


