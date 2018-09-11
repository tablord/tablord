// BOM Module
///////////////////////////////////////////////////////////////////////////////////



jc.Bom = function(name,condition) {
  this.name = name;
  this.condition = condition.sort();  //important that we keep always the same order
  this.lines = [];
}

jc.Bom.prototype.add = function(line){
  this.lines.push(line);
}

jc.Bom.prototype.forEachLine = function(func){
  // func must be function(lineNumber,line)
  $.each(this.lines,func);
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
  this.mostDemandingPlan = new jc.PlanOfNeed();
}

jc.Part.prototype.add = function (quantity,condition,neededAt) {
  var variables = [];
  for (var i in condition) {
    variables.push(condition[i].split(jc.ProductVariable.SEPARATOR)[0])
  }
  this.needs.push({quantity:quantity,condition:condition,variables:variables,neededAt:neededAt});
  return this;
}

jc.Part.prototype.groupAndSort = function() {
  this.groups = new jc.Groups();
  var that = this;
  $.each(this.needs,function(i,need) {that.groups.regroup(need.variables)});
  $.each(this.needs,function(i,need) {need.group=that.groups.names[need.variables[0]]});
  this.needs.sort(function(a,b) {return a.group-b.group});
  return this;
}

jc.Part.prototype.code = function() {
  // returns executable source code that calculates the most demanding plan of need for all possible scenarii
  // code will look like
  //
  //  with (this.product.variant) {
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

  var currentGroup = undefined;
  var nbVariables = 0;
  var source = 'with(this.product.variant.clearPlan()) {\n';
  var indent = '  ';
  var that = this;
  $.each(this.needs,function(i,row) {

    if (currentGroup != row.group) {
      for (var v=0; v<nbVariables; v++) {
        source += (indent=indent.slice(0,-2))+'});\n';
      }
      nbVariables = 0;
      for (var v in that.groups.groups[row.group]){
        source += indent+that.groups.groups[row.group][v]+'.worst(function(){\n';
        indent += '  ';
        nbVariables++;
      }
      currentGroup = row.group;
    }
    source += indent+'add('+row.quantity+',['+row.condition+'],'+row.neededAt+');\n';
  });
  for (var v=0; v<nbVariables; v++) {
    source += (indent=indent.slice(0,-2))+'});\n';
  }
  source += '}';
  this.source = source;
  return this;
}

jc.Part.prototype.compile = function(){
  try {
    this._computeNeeds = new Function(this.source);
  }
  catch (e) {
    e.message = 'Part.compile: '+e.message;
    e.source = this.source;
    throw e;
  }
  return this;
}

jc.Part.prototype.computeNeeds = function(){
trace('computeNeeds');
  this._computeNeeds();
  this.mostDemandingPlan = this.product.variant.plan;
  return this;
}

jc.Part.prototype.span = function() {
  return '<fieldset><legend>'+this.name+'</legend>'+
         table().addRows(this.needs).span()+
         '<PRE class=CODEVIEW>'+this.source+'</PRE>'+
         this.mostDemandingPlan.span()+
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
  var res = new jc. PlanOfNeed();

  function processThis (This) {
    cThis += This.plan[iThis].quantity;
    if (cThis > cumul) {
      res.push({time:This.plan[iThis].time,quantity:cThis-cumul,cumul:cThis});
      cumul = cThis;
    }
    iThis++;
  }

  function processOther (other) {
    cOther += other.plan[iOther].quantity;
    if (cOther > cumul) {
      res.push({time:other.plan[iOther].time,quantity:cOther-cumul,cumul:cOther});
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
  return table('plan of need').addRows(this.plan).view({time:1,quantity:1,cumul:1});  
}


// Scenarii ///////////////////////////////////////////////////////////////////////////

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

trace('Scenarii for ',product.name)
  this.product = product;
  this.scenarii = [];
  var neededVariables = {};
  for (var i=0;i<conditions.length;i++) {
    for (var j=0;j<conditions[i].length;j++) {
      neededVariables[jc.ProductVariable.variable(conditions[i][j])] = product.variables[jc.ProductVariable.variable(conditions[i][j])];
    }
  }
trace(neededVariables)
  var permutationsOfConditions = jc.permutations(conditions);
  for (var p=0; p<permutationsOfConditions.length; p++) {
    $.each(neededVariables,function(name,v){v.remainingQuantity = v.quantity;trace(v)});
    var conditionsByPriority = permutationsOfConditions[p];
trace('conditionsByPriority',conditionsByPriority)
    var scenario = {};
    for (var priority=0; priority<conditionsByPriority.length; priority++) {
      var cond = conditionsByPriority[priority];
trace('for cond',cond.toString());

      // find the max quantity available for this condition
      var q = Infinity;
      for (var i=0;i<cond.length;i++) {
trace(q,i,cond,cond[i]);
trace(product.values[cond[i]])
        q = Math.min(q,product.values[cond[i]].max,product.values[cond[i]].variable.remainingQuantity);
      }

      // now remove that quantity from all variable involved in cond
      for (var j=0;j<cond.length;j++) {
        product.values[cond[j]].variable.remainingQuantity -= q;
      }
      scenario[cond.toString()] = q;
    }
    this.scenarii.push(scenario);
trace(p,this.scenarii)
  }
}

jc.Scenarii.prototype.span = function() {
  return table().addRows(this.scenarii).span();
}

// Product ///////////////////////////////////////
jc.Product = function(name){
  this.name = name;
  this.boms=[];
  this.variables={};  //direct access to variables
  this.values={};     //direct access to values of variable
  this.parts={};
  this.variant = new jc.Variant();  // will be used as a global access of variables and conditions as well 
                                    // as a calculation context
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
trace('addPartNeed',line)
      prod.addPartNeed(line.part,line.quantity,cond,line.neededAt);
    })
  }
  
  for (var part in this.parts) {
trace('parts groupAndSort',part)
    this.parts[part].groupAndSort();
  }
  return this;
}

jc.Product.prototype.updateVariables = function () {
  // updates all variables that are used in BOMs.
  // as well as this.values that registers all values and their variable
  // also updates this.variant, the global variable that is used in calculation

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
        this.variant[v] = pv;
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
  h += '<fieldset><legend>Variables</legend>';
  for (var vn in this.variables) {
    h += this.variables[vn].span();
  }
  h += '</fieldset><fieldset><legend>BOMs</legend>';
  for (var i=0; i<this.boms.length; i++) {
    h += this.boms[i].span();
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

jc.Product.prototype.updateScenarii = function() {
  for (var variable in this.variables) {
    this.variables[variable].updateScenarii();
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



// Variant /////////////////////////////////

jc.Variant = function() {
  this.plan= new jc. PlanOfNeed(); 
}


jc.Variant.prototype.clearPlan = function(){
  this.plan= new jc. PlanOfNeed();
  return this;
}

jc.Variant.prototype.add = function(quantity,condition,neededAt){
  var cond = Math.min.apply(null,condition);
trace(jc.inspect({quantity:quantity,condition:condition,min:cond,neededAt:neededAt}))
  this.plan.add(neededAt,quantity*cond);
  return this;
}
  
jc.Variant.prototype.toString = function(){
  return '[object Variant]';
}

jc.Variant.prototype.span = function () {
  var h = jc.inspect(this).span();
  h += this.plan.span();
  return h;
}
// ProductVariable  ///////////////////////////////

jc.ProductVariable = function(name,product) {
  this.name = name;
  this.length = 0;
  this.quantity = 0;
  this.scenarii = [];
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

jc.ProductVariable.prototype.updateScenarii = function() {
  // remove any previous scenarii
  this.scenarii = [];
  var values=[];
  for (var i=0; i<this.length; i++) {
    values.push(this[i].value);
  }
  var permutationsOfValues = jc.permutations(values);
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

jc.ProductVariable.prototype.worst = function(func) {
  // func must be function() and modifies the variant of the product
  // according to the result by calling Variants methods
  // in particular add that add a new need

  var mostDemandingPlan = new jc. PlanOfNeed();
  var previousPlan = jc.copy(this.product.variant.plan);

  for (var s=0; s<this.scenarii.length; s++) {
    var scenario = this.scenarii[s];
trace('scenario',scenario)
    for (var i=0; i<this.length; i++) {
      var value = this[i].value;
      this.product.variant[value] = scenario[value];
    }
    
    func(this.product.variant.clearPlan());
    mostDemandingPlan = mostDemandingPlan.max(this.product.variant.plan);
  }
trace(mostDemandingPlan);  
  this.product.variant.plan = previousPlan.sum(mostDemandingPlan);
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
  var t = table();
  for (var i=0; i<this.scenarii.length; i++){
    t.add(this.scenarii[i]);
  }
  return h+t.span()+'</span>';
}


// Groups ////////////////////////////////////////////////////////////////
// a class that regroups names that are linked togther 


jc.Groups = function() {
  this.names = {};  //{name1:1,name2:1,name3:0}
  this.groups = {}; //{0:[name3],1:[name1,name2]}
  this.nextGroupNumber = 0;
}

jc.Groups.prototype.regroup = function(names) {
  //names: array of names
  //regroup the different names under one single group number
  //if names are not known in different groups, a new group number will be given
  var currentGroupNumber = this.nextGroupNumber++;
  var currentGroup = this.groups[currentGroupNumber] = [];  // new empty group
  for (var i in names) {
    var name = names[i];
    var g = this.names[name];
    if (g == undefined) {
      currentGroup.push(name);
      this.names[name] = currentGroupNumber;
    }
    else {
      if (g != currentGroupNumber) { //we must merge g and currentGroup
        for (var j in currentGroup) {
          this.names[currentGroup[j]] = g;
          this.groups[g].push(currentGroup[j]);
        }
        currentGroup = this.groups[g];
        delete this.groups[currentGroupNumber];
        currentGroupNumber = g;
      }
      //else nothing to do, since name is already in the right group
    }
  }
  return this;
}

jc.Groups.prototype.toString = function() {
  return '[object Groups]';
}

jc.Groups.prototype.span = function() {
  return '<fieldset><label>'+this.toString()+'</label>'+jc.inspect(this.names,'names').span()+jc.inspect(this.groups,'groups').span()+'</fieldset>';
}  
      
    
    


// Permutation ///////// could be in another module //////////////////////
trace.push().off()
jc.permutations = function(elements){ 
trace('permutations('+elements+')');
  if (elements.length == 1) { 
trace('return single ',elements);
    return [elements]; 
  } 
  var res = []; 
  for (var i=0; i<elements.length; i++){ 
    var others = $.makeArray(elements);
    var first = others.splice(i,1);
trace('first',first,'others',others)
    var p = jc.permutations(others);
trace('p',p)
    for (var j=0;j<p.length;j++){
      var pj = p[j];
      var r = $.merge($.makeArray(first),pj);
trace('p['+j+']',p[j],pj,'r',r)
      res.push(r)
    }
  }
trace('return',res).pop();
  return res;
}

