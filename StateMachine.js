function Simulation(name) {
  this._name = name;
  this.length = 0;
  this.step$s = 0.1;
  this.time$s = -this.step$s;
  this.timeDecimals = 3;
}

Simulation.prototype.runSteps = function(nbSteps) {
  nbSteps = nbSteps || 1;
  for (var s= 1; s <= nbSteps; s++) {
    this.time$s += this.step$s;
    for (var i=0; i< this.length; i++) {
      this[i].runOnce(this.time$s);
    }
  }
  return this;
}

Simulation.prototype.runWhile = function(jcFunc) {
  var jcCond = f(jcFunc);
  while (jcCond()==true){ 
    this.runSteps();
  } 
  return this;
}

Simulation.prototype.time = function(time$s) {
  this.time$s = time$s - this.step$s;
  return this;
}

Simulation.prototype.step = function(step$s) {
  this.time$s += this.step$s - step$s;
  this.step$s = step$s;
  return this;
}

Simulation.prototype.toString = function(options) {
  options = options || {};
  return '[Simulation "'+this._name+'" time: '+this.time$s.toFixed(options.timeDecimals || this.timeDecimals)+']';
}

function simulation(name) {
  return v[name] = new Simulation(name);
}

jc.simulation = simulation('_simulation');

// StateMachine ///////////////////////////////////////////////////////////////

function StateMachine(name,simulation) {
  this._name = name;
  this.simulation = simulation || jc.simulation;
  this.length = 0;  //number of states
  this.currentState = undefined;
  this.log = [];
  this.simulation[this.simulation.length++] = this;
  this.timeDecimals = this.simulation.timeDecimals;
}

StateMachine.prototype.state = function(name) {
  var s = new State(name,this)
  this[name] = s;
  return this[this.length++] = s;
}

StateMachine.prototype.span = function(options) {
  options = options ||{};
  var h = '<DIV class=STATEMACHINE>'+this._name;
  for (var i=0; i<this.length; i++) {
    h += this[i].span();
  }
  if (options.log) {
    h += 'Log<TABLE>';
    for (var i=0; i<this.log.length; i++) {
      h += '<TR><TD>'+this.log[i].time.toFixed(options.timeDecimals || this.timeDecimals)+'</TD><TD>'+this.log[i].transition.span()+'</TD></TR>';
    }
    h += '</TABLE>';
  }
  return h+'</DIV>';
}

StateMachine.prototype.view = StateMachine.prototype.span;

StateMachine.prototype.runOnce = function(time) {
  var where = 'runOnce';
  try {
    where='runOnce/runF';
    this.currentState.runF();
    for (var i = 0; i<this.currentState.length; i++) {
      if (this.currentState[i].condF() == true) {
        if (this.currentState.exitF) {where='runOnce/exitF';this.currentState.exitF()};
        var trans = this.currentState[i];
        this.currentState = this.currentState[i].next;
        if (this.currentState.entryF) {where='runOnce/entryF';this.currentState.entryF()};
        this.log.push({transition:trans,time:time});
        break;
      }
    }
  }
  catch (e) {
    e.message = this.currentState._name+' at time='+this.time+' in '+where+': '+e.message;
    throw e;
  }
  return this;
}

StateMachine.prototype.toString = function() {
  return '[StateMachine '+this._name+' of '+this.length+' states; currentState='+this.currentState._name+']';
}

function stateMachine(name) {
  return v[name] = new StateMachine(name);
}


// State //////////////////////////////////////////////////////////////////////

function State(name,stateMachine) {
  this._name = name;
  this.stateMachine = stateMachine;
  this.length = 0; // number of transition
}

State.prototype.initial = function() {
  this.stateMachine.currentState = this;
  return this;
}

State.prototype.entry = function(jcCode) {
  this.entryCode = jcCode;
  return this;
}

State.prototype.run = function(jcCode) {
  this.runCode = jcCode;
  return this;
}

State.prototype.exit = function(jcCode) {
  this.exitCode = jcCode;
  return this;
}

State.prototype.transition = function(nextStateName,jcCond) {
  this[this.length++] = new Transition(nextStateName,jcCond,this);
  return this;
}

State.prototype.state = function (name) {  //same as StateMachine.state, but to ease writing, is also a method of state
  var s = new State(name,this.stateMachine);
  this.stateMachine[name] = s;
  return this.stateMachine[this.stateMachine.length++] = s;
}

State.prototype.end = function () {
  // terminate the declaration of the state machine and compile the code
  // return the state machine so that it can easily be displayed

  var sm = this.stateMachine;
  for (var i = 0; i< sm.length; i++) {
    sm[i].compile();
  }
  return this.stateMachine;
}

State.prototype.compile = function() {
  try {
    if (this.entryCode) { 
      this.entryF = f(this.entryCode);
    }
    if (this.runCode) { 
      this.runF = f(this.runCode);
    }
    if (this.entryCode) { 
      this.exitF = f(this.exitCode);
    }
    for (var i=0; i<this.length; i++) {
      this[i].compile();
    }
  }
  catch (e) {
    e.message = '[State '+this._name+'] '+e.message
    throw e;
  }
}

State.prototype.span = function(){
  var h = '<DIV class="SMSTATE'+((this.stateMachine.currentState==this)?' SMCURRENTSTATE':'')+'">'+this._name+'<br>';
  if (this.entryCode) h+= 'entry: <SPAN class=CODEVIEW>'+this.entryCode+'</SPAN>';
  if (this.runCode)   h+= 'run  : <SPAN class=CODEVIEW>'+this.runCode+'</SPAN>';
  if (this.exitCode)  h+= 'exit : <SPAN class=CODEVIEW>'+this.exitCode+'</SPAN>';
  for (var i=0; i<this.length; i++) {
    h += this[i].span();
  }
  return h+'</DIV>';
}

// Transition ///////////////////////////////////////////////////////////////


function Transition(nextStateName,jcCondition,state) {
  this.state = state;
  this.nextStateName = nextStateName;
  this.cond = jcCondition;
}

Transition.prototype.span = function () {
  return '<DIV class=SMTRANSITION>'+this.cond+' -->'+this.nextStateName+'</DIV>';
}

Transition.prototype.compile = function() {
  try {
    this.condF = f(this.cond);
    this.next = this.state.stateMachine[this.nextStateName];
  }
  catch (e) {
    e.message = '-->'+this.nextStateName+': '+e.message;
    throw e;
  }
}
