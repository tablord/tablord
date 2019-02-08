// Simulation /////////////////////////////////////////////////////////////////////////
// is the time keeper for the entire simulation
// one instance (jc._simulation) is automatically created, which is ok for most purpose
///////////////////////////////////////////////////////////////////////////////////////

function Simulation(name) {
  this.name = name;
  this.length = 0;
  this.step$s = 0.1;
  this.time$s = 0;
  this.timeDecimals = 3;
}

Simulation.prototype.runSteps = function(nbSteps) {
  nbSteps = nbSteps || 1;
  for (var s= 1; s <= nbSteps; s++) {
    for (var i=0; i< this.length; i++) {
      this[i].runOnce(this.time$s);
    }
    this.time$s += this.step$s;
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
  return '[Simulation "'+this.name+'" time: '+this.time$s.toFixed(options.timeDecimals || this.timeDecimals)+']';
}


// StateMachine ///////////////////////////////////////////////////////////////

function StateMachine(name,simulation) {
  this.name = name;
  this.simulation = simulation;
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
  var h = '<DIV class=STATEMACHINE>'+this.name;
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
    if (this.currentState.runF) {
      this.currentState.runF();
    }
    for (var i = 0; i<this.currentState.length; i++) {
      var trans = this.currentState[i];
      where='runOnce/transition-->'+trans.next.name;
      if (trans.condF(this.currentState) == true) {  //currentState is passed to condF so the user can call wait(...)
        if (this.currentState.exitF) {
          where='runOnce/exitF';
          this.currentState.exitF()
        };
        this.currentState = trans.next;
        this.currentState.entryTime$s = time;
        if (this.currentState.entryF) {
          where='runOnce/entryF';
          this.currentState.entryTime = time;
          this.currentState.entryF()
        };
        this.log.push({transition:trans,time:time});
        break;
      }
    }
  }
  catch (e) {
    throw new Error(this.currentState.name+' at time='+time+' in '+where+': '+e.message);
  }
  return this;
}

StateMachine.prototype.toString = function() {
  return '[StateMachine '+this.name+' of '+this.length+' states; currentState='+this.currentState.name+']';
}

function stateMachine(name,simulation) {
  simulation = simulation || jc.simulation;
  return jc.vars[name] = new StateMachine(name,simulation);
}


// State //////////////////////////////////////////////////////////////////////

function State(name,stateMachine) {
  this.name = name;
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

State.prototype.wait = function(time) {
  // return true if the we are in this state more than "time"
  return this.stateMachine.simulation.time$s >= this.entryTime$s + time;
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
  var where;
  try {
    if (this.entryCode) { 
      where = 'entry';
      this.entryF = f(this.entryCode);
    }
    if (this.runCode) { 
      where = 'run';
      this.runF = f(this.runCode);
    }
    if (this.exitCode) { 
      where = 'exit';
      this.exitF = f(this.exitCode);
    }
    for (var i=0; i<this.length; i++) {
      this[i].compile();
    }
  }
  catch (e) {
    throw new Error('[State '+this.name+':'+where+'] '+e.message);
  }
}

State.prototype.span = function(){
  var h = '<DIV class="SMSTATE'+((this.stateMachine.currentState==this)?' SMCURRENTSTATE':'')+'">'+this.name+'<br>';
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
    throw new Error('-->'+this.nextStateName+': '+e.message);
  }
}
