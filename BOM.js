function Bom(name,condition) {
  this._name = name;
  this._condition = condition;
  this.lines = new table();
}

Bom.prototype.add = function(line){
  this.lines.add(line);
}

Bom.prototype.span = function() {
  var h = '<h3>[BOM '+this._name+']</h3>';
  h += '<p>condition:('+this._condition.join(' && ')+')</p>';
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
}

Product.prototype.add = function(bom) {
  this.boms.push(bom);
}

Product.prototype.span = function() {
  var h='<h2>[Product '+this._name+']</h2>';
  for (var i=0;i<this.boms.length;i++) {
    h += this.boms[i].span();
  }
  return h;
}

function product(name /*,boms*/) {
  var p = new Product(name);
  for (var i=1; i< arguments.length; i++){
    p.add(arguments[i]);
  }
a(inspect(p))
  return v[name] = p;

}
  
