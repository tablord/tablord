

function Axe (name) {
  this._name = name;
  this.functions = [{f:Axe.prototype.faccelerate,init:{t:0,p:0,v:0,a:0,j:0}}];
}


Axe.prototype.insertFunction = function (f,init) {
  var t = init.t || this.functions[this.functions.length-1].t;  //insertion time is either specitied in init or just replaces the last function
                                                                //that is usually acceleration {a:0}
  for (var i=this.functions.length-1;i>=0;i--) {
    if (t > this.functions[i].init.t) {
      this.functions.splice(i+1,0,{f:f,init:init});
      break;
    }
    if (t = this.functions[i].init.t) {
      this.functions.splice(i+1,1,{f:f,init:init}); // replaces
      break;
    }
  }
  if ((i == 0) && (t < this.functions[i].init.t)) {
    this.functions.splice(0,0,{f:f,init:init});
  }
  // recalculate the init value from that point
  for (i=i;i<this.functions.length-1;i++) {
    var tEnd = (this.functions[i].init.t+this.functions[i].init.dt) || this.functions[i+1].init.t; // end time is either specified or if not is the next function start
    var res = this.functions[i].f(this.functions[i].init,tEnd);
    var next = this.functions[i+1].init;
    next.t = res.t;
    next.p = res.p;
    next.v = res.v;
  }
}

Axe.prototype.faccelerate = function (init,t) {
  //returns {t:t,p:xxx,v:xxx,a:init.a,j:xxxx} for a given t
  var res = {t:t,a:init.a};
  res.v = init.v+init.a*(t-init.t);
  res.p = init.p+(0.5*init.a*Math.pow(t-init.t,2));
  return res;
}

Axe.prototype.faccelerate.toString = function(){
  return "accelerate";
}

Axe.prototype.accelerate = function(init){
  this.insertFunction(Axe.prototype.faccelerate,init);
  return this;
}

Axe.prototype.sample = function(start,end,step) {
// return a Table with all values form start to end, step by step

  var samples = table('axe');  ///////////////////////////////////////////********************************************
  var i = 0;
  for (var t = start; t <= end; t += step) {
    while ((i < this.functions.length) && (this.functions[i].init.t <= t)) i++;
    i--;
    samples.add(this.functions[i].f(this.functions[i].init,t));
  }
  return samples;
}

Axe.prototype.span = function() {
  var cols = {t:1,p:1,v:1,a:1,j:1};
  for (var i in this.functions) {
    f = this.functions[i];
    for (var c in f.init) {
      cols[c]=1;
    }
  }

  var h = '<table border="1px"><thead><tr><th>f</th>';
  for (var col in cols) {
    h += '<th>'+col+'</th>';
  }
  h += '</tr></thead><tbody>';    
  for (var i in this.functions) {
    f = this.functions[i];
    h += '<tr><td>'+f.f.toString()+'</td>';
    for (var col in cols) {  
      h += '<td>'+f.init[col]+'</td>';
    }
    h += '</tr>';
  }
  h += '</tbody></table>';
  return h;
}

Axe.prototype.view = function() {
  return '<div class="SUCCESS">'+this._name+this.span()+'</div>';
}
  
function axe(name) {
  return v[name] = new Axe(name);
}

