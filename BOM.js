// BOM Module
///////////////////////////////////////////////////////////////////////////////////



jc.Bom = function(name,condition) {
  this.name = name;
  this.condition = condition.sort();  //important that we keep always the same order
  this.lines = [];                    
}

jc.Bom.prototype.add = function(line){
  // add a line to the bom
  // the line is an object that has at least {part,quantity,neededAt}

  this.lines.push(line);
  return this;
}

jc.Bom.prototype.forEachLine = function(func){
  // func must be function(lineNumber,line)
  $.each(this.lines,func);
  return this;
}

jc.Bom.prototype.toString = function() {
  return '[object Bom '+this.name+']';
}

jc.Bom.prototype.span = function() {
  var h = '<fieldset><legend>BOM '+this.name+'</legend>';
  h += '<p>condition:('+this.condition.join(' && ')+')</p>';
  h += table().addRows(this.lines).span({cols:{part:{head:1},quantity:1,neededAt:1}});
  return h +'</fieldset>';
}

jc.bom = function(name,condition /*,lines*/) {
  var b = new jc.Bom(name,condition);
  for (var i=2; i< arguments.length; i++){
    b.add(arguments[i]);
  }
  return b;
}

// Part //////////////////////////////////////////
jc.Part = function(name,product){
  this.name = name;
  this.product = product;
  this.needs = [];
  this.source = '';
  this.conditions = {};
  this.mostDemandingPlan = new jc.PlanOfNeed();
}

jc.Part.prototype.add = function (quantity,condition,neededAt) {
  condition.sort();
  this.needs.push({quantity:quantity,condition:condition,neededAt:neededAt});
  this.conditions[condition.toString()]=condition;
  return this;
}


jc.Part.prototype.code = function() {
  // returns executable source code that calculates the most demanding plan of need for all possible scenarii
  // the function has 2 parameters
  // scenario
  // .add(7,'width_170,setup_manual',0)
  // .add(8,'width_210,setup_manual',0)

  var source = 'scenario\n';
  $.each(this.needs,function(i,need) {
if (typeof need.quantity != 'number') throw new Error('need.quantity must be a number: is '+typeof need.quantity);
    source += '.add('+need.quantity+',"'+need.condition.toString()+'",'+need.neededAt+')\n';
  });
  this.source = source;
  return this;
}

jc.Part.prototype.compile = function(){
  try {
    this._computeNeeds = new Function('scenario',this.source);
  }
  catch (e) {
    throw new Error('Part.compile:'+e.message+'\n'+this.source);
  }
  return this;
}

jc.Part.prototype.computeNeeds = function(){
  var conditions = [];
  for (var cond in this.conditions) {
    conditions.push(this.conditions[cond]);
  }
  this.scenarii = new jc.Scenarii(this.product,conditions);
  this.scenarii.computeNeeds(this._computeNeeds);
  this.mostDemandingPlan = this.scenarii.worst;
  return this;
}

jc.Part.prototype.update = function() {
  // update everything for this part
  this.code().compile().computeNeeds();
  return this;
}

jc.Part.prototype.span = function() {
  return '<fieldset><legend>'+this.name+'</legend>'+
         jc.inspect(jc.keys(this.conditions),'conditions').span()+
         table().addRows(this.needs).span()+
         '<PRE class=CODEVIEW>'+this.source+'</PRE>'+
         '<fieldset><legend>most demanding plan</legend>'+this.mostDemandingPlan.span()+'</fieldset>'+
         '</fieldset>';
}


// Plan of Need //////////////////////////////////
jc.PlanOfNeed = function() {
  // constructor of a PlanOfNeed object which purpose is to collect
  // needs {time,quantity} 
  this.plan = [];
  this.needsUpdate = false;
}

jc.PlanOfNeed.prototype.push = function(need) {
  // push a new need to the plan
  // it's the caller responsibility to push the need in
  // a chronological order
  this.plan.push(need);
}

jc.PlanOfNeed.prototype.pop = function() {
  // pop the last pushed need
  return this.plan.pop();
}

jc.PlanOfNeed.prototype.add = function(time,quantity) {
  // add a new need to the plan of need
  // this function manages to keep needs in the chronological order
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

jc.PlanOfNeed.prototype.copy = function() {
  // return an independent copy of this
  var p = new jc. PlanOfNeed();
  for (var i=0; i<this.plan.length; i++) {
    p.plan.push(jc.copy(this.plan[i]))
  }
  p.needsUpdate = this.needsUpdate;
  return p;
}

jc.PlanOfNeed.prototype.cumulAt = function(time) {
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

jc.PlanOfNeed.prototype.max = function(other) {
  // returns a new planOfNeed that is the max of this and other
  var iThis = 0;
  var iOther = 0;
  var cThis = 0;
  var cOther = 0;
  var cumul = 0;
  var res = new jc.PlanOfNeed();

  function processThis (This) {
    cThis += This.plan[iThis].quantity;
    if (cThis > cumul) {
      var lastRes = res.plan[res.plan.length-1];
      if (lastRes && (This.plan[iThis].time == lastRes.time)) {
        lastRes.quantity += cThis-cumul;
        lastRes.cumul = cThis;
      }
      else {
        res.push({time:This.plan[iThis].time,quantity:cThis-cumul,cumul:cThis});
      }
      cumul = cThis;
    }
    iThis++;
  }

  function processOther (other) {
    cOther += other.plan[iOther].quantity;
    if (cOther > cumul) {
      var lastRes = res.plan[res.plan.length-1];
      if (lastRes && (other.plan[iOther].time == lastRes.time)) {
        lastRes.quantity += cOther-cumul;
        lastRes.cumul = cOther;
      }
      else {
        res.push({time:other.plan[iOther].time,quantity:cOther-cumul,cumul:cOther});
      }
      cumul = cOther;
    }
    iOther++;
  }

  while ((iThis < this.plan.length) && (iOther < other.plan.length)) {
    if (this.plan[iThis].time < other.plan[iOther].time) {
      processThis(this);
    }
    else {
      processOther(other);
    }
  }
  while (iThis < this.plan.length) {
    processThis(this);
  }
  while (iOther < other.plan.length) {
    processOther(other);
  }
  
  return res;
} 

jc.PlanOfNeed.prototype.sum = function(other){  //TODO could be optimized in similar fashion than max
  // returns a new planOfNeed that is the sum of this and other
  var res = this.copy();
  for (var i=0;i<other.plan.length;i++) {
    res.add(other.plan[i].time,other.plan[i].quantity);
  }
  return res;
}

jc.PlanOfNeed.prototype.update = function() {
  if (this.needsUpdate==false) return;
  var cumul = 0;
  for (var i=0;i<this.plan.length;i++){
    this.plan[i].cumul = cumul += this.plan[i].quantity; 
  }
  this.needsUpdate = false;
  return this;
}

jc.PlanOfNeed.prototype.toString = function() {
  return '[object PlanOfNeed]';
}

jc.PlanOfNeed.prototype.span = function() {
  this.update();
  if (this.plan.length==0) return jc.html('empty planOfNeed');
  return table().addRows(this.plan).span({time:1,quantity:1,cumul:1});  
}


// Scenarii ///////////////////////////////////////////////////////////////////////////
jc.Scenario = function() {
  // create a new Scenario (without any condition quantities at this stage, will be added after creation by jc.Scenario)
  this.planOfNeed = new jc.PlanOfNeed();
}

jc.Scenario.prototype.add = function(quantity,condString,neededAt) {
  // add a new need to the plan of need of this scenario
//trace(quantity,condString,neededAt);
if ((typeof quantity != 'number') || (typeof condString != 'string') || (typeof neededAt != 'number')){
a(typeof quantity,typeof condString,typeof neededAt,'quantity',quantity.prototype)}
  this.planOfNeed.add(neededAt,quantity*this[condString]);
  return this;
}

jc.Scenario.prototype.toString = function() {
  return '[object jc.Scenario]';
}

jc.Scenarii = function(product,conditions) {
  // create all scenarii for conditions
  // product    the product that contains all variables 
  // conditions is an array of condition which are array of variable values
  //            like [['setup_manual','width_170'],['setup_motorized','width_170'].....]
  // PLEASE NOTE 
  // * each condition must be sorted alphabetically before creating a scenarii object
  // * a condition can not use multiple time the same variable (ie: ['width_170','width_210'] is forbidden)

//*** il faut éviter les doublons dans les conditions: à voir où est ce que l'on fait ce traitement
//*** de même aucune condition ne doit possèder 2 fois la même variable genre ['width_170','width_210']

  this.product = product;
  this.scenarii = [];
  this.worst = new jc.PlanOfNeed();

  var neededVariables = {};
  var neededValues ={};
  for (var i=0;i<conditions.length;i++) {
    for (var j=0;j<conditions[i].length;j++) {
      neededVariables[jc.ProductVariable.variable(conditions[i][j])] = product.variables[jc.ProductVariable.variable(conditions[i][j])];
      neededValues[conditions[i][j]] = product.values[conditions[i][j]];
    }
  }

  var permutationsOfConditions = jc.permutations(conditions);
  for (var p=0; p<permutationsOfConditions.length; p++) {
    $.each(neededVariables,function(name,v){v.remainingQuantity = v.quantity});
    $.each(neededValues,function(value,v){v.remainingQuantity = v.max});
    var conditionsByPriority = permutationsOfConditions[p];
    var scenario = new jc.Scenario();
    for (var priority=0; priority<conditionsByPriority.length; priority++) {
      var cond = conditionsByPriority[priority];

      // find the max quantity available for this condition
      var q = Infinity;
      for (var i=0;i<cond.length;i++) {
        q = Math.min(q,product.values[cond[i]].remainingQuantity,product.values[cond[i]].variable.remainingQuantity);
      }

      // now remove that quantity from all variable involved in cond
      for (var j=0;j<cond.length;j++) {
        product.values[cond[j]].variable.remainingQuantity -= q;
        product.values[cond[j]].remainingQuantity -= q;
      }
      scenario[cond.toString()] = q;
    }
    this.scenarii.push(scenario);
  }
}

jc.Scenarii.prototype.computeNeeds = function(computeNeedFunc) {
  for (var i = 0;i<this.scenarii.length;i++) {
    var scenario = this.scenarii[i];
    computeNeedFunc(scenario);
    this.worst = this.worst.max(scenario.planOfNeed);
  }
}

jc.Scenarii.prototype.toString = function() {
  return '[object jc.Scenarii] '+this.scenarii.length+' scenarii';
}

jc.Scenarii.prototype.span = function() {
  var h = table().addRows(this.scenarii).span();
  h += '<h3>worst</h3>'+this.worst.span();
  return h;  
}

// Product ///////////////////////////////////////
jc.Product = function(name){
  this.name = name;
  this.boms=[];
  this.variables={};  //direct access to variables
  this.values={};     //direct access to values of variable
  this.parts={};
}

jc.Product.prototype.addBom = function(bom) {
  this.boms.push(bom);
  return this;
}

jc.Product.prototype.addPartNeed = function(part,quantity,condition,neededAt) {
  if (this.parts[part] == undefined) {
    this.parts[part] = new jc.Part(part,this);
  }
  this.parts[part].add(quantity,condition,neededAt);
  return this;
}

jc.Product.prototype.updateParts = function () {
  for (var i=0; i<this.boms.length; i++) {
    var bom = this.boms[i];
    var cond = bom.condition;
    var prod = this;
    bom.forEachLine(function(i,line) {
      prod.addPartNeed(line.part,line.quantity,cond,line.neededAt);
    })
  }
  
  return this;
}

jc.Product.prototype.updateVariables = function () {
  // updates all variables that are used in BOMs.
  // as well as this.values that registers all values and their variable

  for (var i=0; i < this.boms.length; i++) {
    var b = this.boms[i];
    for (var n=0; n < b.condition.length; n++) {
      var value = b.condition[n];
      var v = jc.ProductVariable.variable(value);
      if (this.variables[v]) {
        var pv = this.variables[v];
      }
      else {
        var pv = new jc.ProductVariable(v,this);
      }
      this.variables[v] = pv.add(value);
      this.values[value] = pv[value];
    }
  }
  return this;
}

jc.Product.prototype.toString = function() {
  return '[object Product '+this.name+']';
}

jc.Product.prototype.span = function() {
  var h='<h2>Product '+this.name+'</h2>';
  h += '<fieldset><legend>BOMs</legend>';
  for (var i=0; i<this.boms.length; i++) {
    h += this.boms[i].span();
  }
  h += '</fieldset><fieldset><legend>Variables</legend>';
  for (var vn in this.variables) {
    h += this.variables[vn].span();
  }
  h += '</fieldset><fieldset><legend>Parts</legend>';
  for (var part in this.parts) {
    h += this.parts[part].span();
  }
  return h+'</fieldset>';
}

jc.Product.prototype.setConstraints = function(scenario) {
  // scenario = {quantity:qq,
  //             max:{
  //               'cond1_c1':xx,
  //               'cond1_c2':yy,  etc..
  //             }
  for (var variable in this.variables) {
    this.variables[variable].quantity = scenario.quantity;
  }
  for (var cond in scenario.max) {
    this.variables[cond.split(jc.ProductVariable.SEPARATOR)[0]][cond].max = scenario.max[cond];
  }
  return this;
}

jc.Product.prototype.update = function() {
  for (var part in this.parts) {
    this.parts[part].update();
  }
  return this;
}

jc.product = function(name /*,boms*/) {
  var p = new jc.Product(name);
  for (var i=1; i< arguments.length; i++){
    p.addBom(arguments[i]);
  }
  return jc.vars[name] = p;
}



// ProductVariable  ///////////////////////////////

jc.ProductVariable = function ProductVariable(name,product) {
  // a ProductVariable has a name and an associated product.
  // it is an array like of values that can be accessed either
  // - by index (with .length = number of values)
  // - by value, each value is defined as a property of the variable
  // 
  // a property .quantity represents the number of product used to calculate the scenarii
  //
  // each value is a simple object {value, max, variable}
  // - value is a string composed with variableName_val like width_170 is a value of variable width
  // - max is the maximum of product that can have this variant
  // - variable is a back reference to the variable itself

  this.name = name;
  this.length = 0;
  this.quantity = 0;
  this.product = product;
//this[n]       :array like of values  {value: ,max:}
//this[value]   :access by value
}

jc.ProductVariable.SEPARATOR = '_';

jc.ProductVariable.variable = function(value) {
  // return the variable name of the value
  return value.split(jc.ProductVariable.SEPARATOR)[0];
}

jc.ProductVariable.prototype.add = function(value,max){
  // add a new value to a variable and give a max limit for the batch 
  if (this[value] == undefined) {
    this[value] = {};
    this[this.length++]=this[value];
  }  
  this[value].value=value;
  this[value].max=max || 0;
  this[value].variable=this;
  return this;
}

jc.ProductVariable.prototype.join = Array.prototype.join;

jc.ProductVariable.prototype.toString = function() {
  return '[object ProductVariable '+this.name+']';
}

jc.ProductVariable.prototype.span = function(){
  var h = '<span>ProductVariable <var>'+this.name+'</var> for '+this.quantity+'<br>';
  var t = table();
  for (var i=0; i<this.length; i++){
    t.add(this[i]);
  }
  h += t.span({cols:{value:{head:1},max:1}});
  return h+'</span>';
}

    


// Permutation ///////// could be in another module //////////////////////
jc.permutations = function(elements){ 
  if (elements.length == 1) { 
    return [elements]; 
  } 
  var res = []; 
  for (var i=0; i<elements.length; i++){ 
    var others = $.makeArray(elements);
    var first = others.splice(i,1);
    var p = jc.permutations(others);
    for (var j=0;j<p.length;j++){
      var pj = p[j];
      var r = $.merge($.makeArray(first),pj);
      res.push(r)
    }
  }
  return res;
}

