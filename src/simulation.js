// Simulation /////////////////////////////////////////////////////////////////////////
// is the time keeper for the entire simulation
// one instance (tb.simulation) is automatically created, which is ok for most purpose
///////////////////////////////////////////////////////////////////////////////////////

tb.Simulation = function(name) {
  this.name = name;
  this.length = 0;
  this.step$s = 0.1;
  this.time$s = 0;
  this.timeDecimals = 3;
}
tb.Simulation.className = 'tb.Simulation';

tb.Simulation.prototype.runSteps = function(nbSteps) {
  nbSteps = nbSteps || 1;
  for (let s= 1; s <= nbSteps; s++) {
    for (let i=0; i< this.length; i++) {
      this[i].runOnce(this.time$s);
    }
    this.time$s += this.step$s;
  }
  return this;
}

tb.Simulation.prototype.runWhile = function(jcFunc) {
  let jcCond = f(jcFunc);
  while (jcCond()==true){
    this.runSteps();
  }
  return this;
}

tb.Simulation.prototype.time = function(time$s) {
  this.time$s = time$s - this.step$s;
  return this;
}

tb.Simulation.prototype.step = function(step$s) {
  this.time$s += this.step$s - step$s;
  this.step$s = step$s;
  return this;
}

tb.Simulation.prototype.toString = function(options) {
  options = options || {};
  return '[Simulation "'+this.name+'" time: '+this.time$s.toFixed(options.timeDecimals || this.timeDecimals)+']';
}


// StateMachine ///////////////////////////////////////////////////////////////

tb.StateMachine = function(name,simulation) {
  this.name = name;
  this.simulation = simulation;
  this.length = 0;  //number of states
  this.currentState = undefined;
  this.log = [];
  this.simulation[this.simulation.length++] = this;
  this.timeDecimals = this.simulation.timeDecimals;
}
tb.StateMachine.className = 'tb.StateMachine';

tb.StateMachine.prototype.state = function(name) {
  let s = new tb.State(name,this)
  this[name] = s;
  return this[this.length++] = s;
}

tb.StateMachine.prototype.span = function(options) {
  options = options ||{};
  let h = '<DIV class=STATEMACHINE>'+this.name;
  for (let i=0; i<this.length; i++) {
    h += this[i].span();
  }
  if (options.log) {
    h += 'Log<TABLE>';
    for (let i=0; i<this.log.length; i++) {
      h += '<TR><TD>'+this.log[i].time.toFixed(options.timeDecimals || this.timeDecimals)+'</TD><TD>'+this.log[i].transition.span()+'</TD></TR>';
    }
    h += '</TABLE>';
  }
  return h+'</DIV>';
}

tb.StateMachine.prototype.view = tb.StateMachine.prototype.span;

tb.StateMachine.prototype.runOnce = function(time) {
  let where = 'runOnce';
  try {
    where='runOnce/runF';
    if (this.currentState.runF) {
      this.currentState.runF();
    }
    for (let i = 0; i<this.currentState.length; i++) {
      let trans = this.currentState[i];
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

tb.StateMachine.prototype.toString = function() {
  return '[StateMachine '+this.name+' of '+this.length+' states; currentState='+this.currentState.name+']';
}

tb.stateMachine = function(name,simulation) {
  // creates a new stateMachine
  // - name: the name of the stateMachine, the stateMachine will be stored in tb.vars[name]
  // - simulation (optional, by default tb.simulation;
  simulation = simulation || tb.simulation;
  return tb.vars[name] = new tb.StateMachine(name,simulation);
}


// State //////////////////////////////////////////////////////////////////////

tb.State = function(name,stateMachine) {
  // a state of a StateMachine use stateMachine.state to create a new state
  this.name = name;
  this.stateMachine = stateMachine;
  this.length = 0; // number of transition
}
tb.State.className = 'tb.State';

tb.State.prototype.initial = function() {
  this.stateMachine.currentState = this;
  return this;
}

tb.State.prototype.entry = function(jcCode) {
  this.entryCode = jcCode;
  return this;
}

tb.State.prototype.run = function(jcCode) {
  this.runCode = jcCode;
  return this;
}

tb.State.prototype.exit = function(jcCode) {
  this.exitCode = jcCode;
  return this;
}

tb.State.prototype.transition = function(nextStateName,jcCond) {
  this[this.length++] = new tb.Transition(nextStateName,jcCond,this);
  return this;
}

tb.State.prototype.wait = function(time) {
  // return true if the we are in this state more than "time"
  return this.stateMachine.simulation.time$s >= this.entryTime$s + time;
}

tb.State.prototype.state = function (name) {  //same as StateMachine.state, but to ease writing, is also a method of state
  let s = new tb.State(name,this.stateMachine);
  this.stateMachine[name] = s;
  return this.stateMachine[this.stateMachine.length++] = s;
}

tb.State.prototype.end = function () {
  // terminate the declaration of the state machine and compile the code
  // return the state machine so that it can easily be displayed

  let sm = this.stateMachine;
  for (let i = 0; i< sm.length; i++) {
    sm[i].compile();
  }
  return this.stateMachine;
}

tb.State.prototype.compile = function() {
  let where;
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
    for (let i=0; i<this.length; i++) {
      this[i].compile();
    }
  }
  catch (e) {
    throw new Error('[State '+this.name+':'+where+'] '+e.message);
  }
}

tb.State.prototype.span = function(){
  let h = '<DIV class="SMSTATE'+((this.stateMachine.currentState==this)?' SMCURRENTSTATE':'')+'">'+this.name+'<br>';
  if (this.entryCode) h+= 'entry: <SPAN class=CODEVIEW>'+this.entryCode+'</SPAN>';
  if (this.runCode)   h+= 'run  : <SPAN class=CODEVIEW>'+this.runCode+'</SPAN>';
  if (this.exitCode)  h+= 'exit : <SPAN class=CODEVIEW>'+this.exitCode+'</SPAN>';
  for (let i=0; i<this.length; i++) {
    h += this[i].span();
  }
  return h+'</DIV>';
}

// Transition ///////////////////////////////////////////////////////////////


tb.Transition = function(nextStateName,jcCondition,state) {
  this.state = state;
  this.nextStateName = nextStateName;
  this.cond = jcCondition;
}
tb.Transition.className = 'tb.Transition';

tb.Transition.prototype.span = function () {
  return '<DIV class=SMTRANSITION>'+this.cond+' -->'+this.nextStateName+'</DIV>';
}

tb.Transition.prototype.compile = function() {
  try {
    this.condF = f(this.cond);
    this.next = this.state.stateMachine[this.nextStateName];
  }
  catch (e) {
    throw new Error('-->'+this.nextStateName+': '+e.message);
  }
}
