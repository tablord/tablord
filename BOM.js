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
function Part(name,product){
  this._name = name;
  this._product = product;
  this._needs = table(name,false);
}

Part.prototype.add = function (quantity,condition,neededAt) {
  var variables = [];
  for (var i in condition) {
    variables.push(condition[i].split(ProductVariable.SEPARATOR)[0])
  }
  this._needs.add({quantity:quantity,condition:condition,variables:variables,neededAt:neededAt});
  return this;
}

Part.prototype.sort = function() {
  this._needs.sort({variables:function(a,b){
    var res = a.length - b.length;
    if (res != 0) return res;

    // knowing that the different values are already in alphabetical order we can just sort by alphabetical representation of condition
    if (a>b) return  1;
    if (a<b) return -1;
    return 0;
  }});
  return this;
}

Part.prototype.span = function() {
  return this._needs.view();
}


Part.prototype.code = function() {
  // returns executable source code that calculates the most demanding plan of need for all possible scenarii
  // code will look like
  //
  //  var variant = new Variant();
  //  with (variant) {
  //    add(5,[],0);
  //    variable1.worst(function(){
  //      add(7,[variable1_true],0);
  //      add(8,[variable1_false],0);
  //    });
  //    variable1.worst(function(){
  //      variable2.worst(function(){
  //        add(10,[variable1_true,variable2_170],0);
  //        ...
  //      });
  //    });
  //  }

  var currentVariables = '';
  var nbVariables = 0;
  var source = 'with(variant) {\n';
  var indent = '  ';
  this._needs.forEachRow(function(i,row) {

    if (currentVariables != row.variables) {
      for (var v=0; v<nbVariables; v++) {
        source += (indent=indent.slice(0,-2))+'});\n';
      }
      for (var v in row.variables){
        source += indent+row.variables[v]+'.worst(function(){\n';
        indent += '  ';
      }
      currentVariables = row.variables+'';
      nbVariables = row.variables.length;
    }
    source += indent+'add('+row.quantity+',['+row.condition+'],'+row.neededAt+');\n';
  });
  for (var v=0; v<nbVariables; v++) {
    source += (indent=indent.slice(0,-2))+'});\n';
  }
  source += '}';
  return source;
}

// Plan of Need //////////////////////////////////
function PlanOfNeed () {
  this.plan = [];
  this.needsUpdate = false;
}

PlanOfNeed.prototype.push = function(need) {
  this.plan.push(need);
}

PlanOfNeed.prototype.pop = function() {
  return this.plan.pop();
}

PlanOfNeed.prototype.add = function(time,quantity) {
  this.needsUpdate = true;
  for (var i=this.plan.length-1; i>=0; i--) {
    if (time == this.plan[i].time) {
      this.plan[i].quantity += quantity;
      return this;
    }
    if (time > this.plan[i].time) {
      this.plan.splice(i+1,0,{time:time,quantity:quantity});
      return this;
    }
  }
  this.plan.splice(0,0,{time:time,quantity:quantity});
  return this;
}

PlanOfNeed.prototype.copy = function() {
  // return an independent copy of this
  var p = new PlanOfNeed();
  for (var i=0; i<this.plan.length; i++) {
    p.plan.push(jc.copy(this.plan[i]))
  }
  p.needsUpdate = this.needsUpdate;
  return p;
}

PlanOfNeed.prototype.cumulAt = function(time) {
  // return the cumul at a given time
  this.update();
  if (time < this.plan[0].time) {
    return 0;
  }
  for (var i=0;i<this.plan.length; i++) {
    if (time >= this.plan[i].time) {
      return this.plan[i];
    }
  }
}

PlanOfNeed.prototype.max = function(other) {
  var iThis = 0;
  var iOther = 0;
  var cThis = 0;
  var cOther = 0;
  var cumul = 0;
  var res = [];

  while ((iThis < this.plan.length) || (iOther < other.plan.length)) {
    if ((iThis < this.plan.length) && (this.plan[iThis].time < other.plan[iOther].time)) {
      cThis += this.plan[iThis].quantity;
      if (cThis > cumul) {
        res.push({time:this.plan[iThis].time,quantity:cThis-cumul,cumul:cThis});
        cumul = cThis;
      }
      iThis++;
    }
    else {
      cOther += other.plan[iOther].quantity;
      if (cOther > cumul) {
        res.push({time:other.plan[iOther].time,quantity:cOther-cumul,cumul:cOther});
        cumul = cOther;
      }
      iOther++;
    }
  }
  this.plan = res;
  return this; 
} 

PlanOfNeed.prototype.sum = function(other){  //TODO could be optimized in similar fashion than max
  for (var i=0;i<other.plan.length;i++) {
    this.add(other.plan[i].time,other.plan[i].quantity);
  }
  return this;
}

PlanOfNeed.prototype.update = function() {
  if (this.needsUpdate==false) return;
  var cumul = 0;
  for (var i=0;i<this.plan.length;i++){
    this.plan[i].cumul = cumul += this.plan[i].quantity; 
  }
  this.needsUpdate = false;
  return this;
}

PlanOfNeed.prototype.toString = function() {
  return '[object PlanOfNeed]';
}

PlanOfNeed.prototype.span = function() {
  this.update();
  return table('plan of need').addRows(this.plan).view({time:1,quantity:1,cumul:1});  
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
    this.parts[part] = new Part(part,this);
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
      var c = b.condition[n].split(ProductVariable.SEPARATOR);
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

Product.prototype.setConstraints = function(scenario) {
  // scenario = {quantity:qq,
  //             max:{
  //               'cond1_c1':xx,
  //               'cond1_c2':yy,  etc..
  //             }
  for (var variable in this.variables) {
    this.variables[variable].quantity = scenario.quantity;
  }
  for (var cond in scenario.max) {
    this.variables[cond.split(ProductVariable.SEPARATOR)[0]][cond].max = scenario.max[cond];
  }
  return this;
}

Product.prototype.updateScenarii = function() {
  for (var variable in this.variables) {
    this.variables[variable].updateScenarii();
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

// Variant /////////////////////////////////

function Variant () {
  this.plan= new PlanOfNeed(); 
}

Variant.prototype.clearPlan = function(){
  this.plan= new PlanOfNeed();
  return this;
}

Variant.prototype.add = function(quantity,condition,neededAt){
  var cond = Math.min.apply(null,condition);
  this.plan.add(neededAt,quantity*cond);
  return this;
}

Variant.prototype.toString = function(){
  return '[object ProductContext]';
}

Variant.prototype.span = function () {
  var h = inspect(this);
  h += this.plans[i].span();
  return h;
}
// ProductVariable  ///////////////////////////////

function ProductVariable (name) {
  this._name = name;
  this.length = 0;
  this.quantity = 0;
  this.scenarii = [];
//this[n]       :array like of values  {value: ,max:}
//this[value]   :access by value
}

ProductVariable.SEPARATOR = '_';

ProductVariable.prototype.add = function(value,max){
  if (this[value] == undefined) {
    this[value] = {};
    this[this.length++]=this[value];
  }  
  this[value].value=value;
  this[value].max=max || 0;
  return this;
}

ProductVariable.prototype.updateScenarii = function() {
  // remove any previous scenarii
  this.scenarii = [];
  var values=[];
  for (var i=0; i<this.length; i++) {
    values.push(this[i].value);
  }
  var permutationsOfValues = permutations(values);
  for (var i=0; i<permutationsOfValues.length; i++) {
    var availlable = this.quantity;
    var valuesByPriority = permutationsOfValues[i];
    var scenario = {};
    for (var priority=0; priority<valuesByPriority.length; priority++) {
      var value = valuesByPriority[priority]
      var q = Math.min(availlable,this[value].max)
      availlable -= q;
      scenario[value] = q;
    }
    this.scenarii.push(scenario);
  }
  return this;
}

ProductVariable.prototype.worst = function(func) {
  // func must be function() and modifies the variant (that is defined and with(variant){})
  // according to the result by calling Variants methods
  // in particular add that add a new need

  var mostDemandingPlan = new PlanOfNeed();
  var previousPlan = jc.copy(ProductVariable.context.plan);

  for (var s=0; s<this.scenarii.length; s++) {
    var scenario = this.scenarii[s];
    for (var i=0; i<this.length; i++) {
      var value = this[i].value;
      ProductVariable.context[value] = scenario[value];
    }
    
    func(ProductVariable.context.clearPlan());
    mostDemandingPlan = mostDemandingPlan.max(ProductVariable.context.plan);
    
    //par pr�caution, on d�truit les variables, mais en fait inutile si le code appelant est ok
    for (var i=0; i<this.length; i++) {
      ProductVariable.context[this[i].value] = undefined; // comme cela un appel echouera
    }
  }
  
  ProductVariable.context.plan = previousPlan.sum(mostDemandingPlan);
  return ProductVariable.context;
}

ProductVariable.prototype.join = Array.prototype.join;

ProductVariable.prototype.toString = function() {
  return '[object ProductVariable '+this._name+']';
}

ProductVariable.prototype.span = function(){
  var h = '<span>ProductVariable <var>'+this._name+'</var> for '+this.quantity+'<br>';
  var t = table();
  for (var i=0; i<this.length; i++){
    t.add(this[i]);
  }
  h += t.span({cols:{value:{head:1},max:1}});
  var t = table();
  for (var i=0; i<this.scenarii.length; i++){
    t.add(this.scenarii[i]);
  }
  return h+t.span()+'</span>';
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

