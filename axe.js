

function Axe (name) {
  this._name = name;
  this.functions = [{f:Axe.prototype.faccelerate,init:{t:0,p:0,v:0,a:0}}];
}

Axe.prototype.toString = function() {
  return '[Axe'+this._name+' with '+this.functions.length+' functions]';
}

Axe.prototype.appendFunction = function (f,init) {
  var last = this.functions.length-1;
  if ((last<0) || (init.t < this.functions[last].init.t)) {
    throw new Error("Axe.appendFunction: can't append a function with time "+init.t+" since last function starts at "+this.functions[last].init.t);
  }
  var res = this.functions[last].f(this.functions[last].init,init.t); // calculate the next last point of previous function
  init.p = res.p;
  init.v = res.v;
  this.functions.push({f:f,init:init});
} 


Axe.prototype.faccelerate = function (init,t) {
  //returns {t:t,p:xxx,v:xxx,a:init.a,j:xxxx} for a given t
  var dt = t-init.t;
  var res = {t:t,a:init.a};
  res.v = init.v+init.a*(t-init.t);
  res.p = init.p+(init.v*dt)+(0.5*init.a*Math.pow(dt,2));
  return res;
}

Axe.prototype.faccelerate.toString = function(){
  return "accelerate";
}

Axe.prototype.accelerate = function(init){
  this.appendFunction(Axe.prototype.faccelerate,init);
  return this;
}

Axe.prototype.move = function(init,output){
  var t = init.t || (this.simulation && this.simulation.time$s);
  var at_t = this.at(t);
  var d = init.p - at_t.p;
  var dir = d>0?1:-1;
  var v = at_t.v;
  var defaults = d>=0?this.forward:this.backward;
trace(init,{t:t,d:d,v:v},defaults)



  var a1 = init.a1 ||  init.a || defaults.a1;
  var a2 = init.a2 || -init.a || defaults.a2;
  var a3 = init.a3 || -init.a || defaults.a3;


  var v3 = init.v3 || defaults.v3 || 0;
  var v2 = init.v2 || defaults.v2 || v3;
  var v1 = init.v1 || defaults.v1;

  if ((v2==0)  && ((tf != undefined) || (df != undefined))) {
    throw new Error("can't specify tf or df if V2==0")
  }
  if ((init.df != undefined) && (init.tf != undefined)) {
    throw new Error("can't specify both df and tf together")
  }

  do {
    // make sure that abs(v1)>abs(v2)>abs(v3)
    v2 = v1*dir > v2*dir?v2:v1;
    v3 = v2*dir > v3*dir?v3:v2;

    var t1 = (v1-v)/a1;
    var t2 = (v2-v1)/a2;
    var t3 = (v3-v2)/a3;

    var df = init.df || (init.tf)?init.tf*v2 + t3*(v2+v3)/2 : 0;
    var tf = init.tf || (v2 != 0)?(df-(v2+v3)/2/a3)/v2 : 0;
    var ts = tf-t3;

    var d1 = (v+v1)/2*t1;
    var d2 = (v1+v2)/2*t2;
    var d3 = (v2+v3)/2*t3;
    var dc = d-d1-d2-df;
    var tc = dc / v1;
    if (tc < 0) {
      v1 = 0.9*v1; // ***** dirty and stupid
    }
  }
  while (tc < 0);

  // if t is before the last function init time, it means that the user initiate a move before the end of the 
  // previous move. we have to cancel the planned future function in order to replace by new ones
  var i = this.functions.length-1;
  while ((i >= 0) && (t < this.functions[i].init.t)) {
    i--;
  }
  this.functions.length = i+1;

  // now add the move
trace('acc');
  this.appendFunction(Axe.prototype.faccelerate,{t:t,a:a1});
trace('vc');
  this.appendFunction(Axe.prototype.faccelerate,{t:t+t1,a:0});
trace('dec');
  this.appendFunction(Axe.prototype.faccelerate,{t:t+t1+tc,a:a2});
trace('approach');
  this.appendFunction(Axe.prototype.faccelerate,{t:t+t1+tc+t2,a:0});
trace('approach ok')
  if (ts>0) {
trace('final')
    this.appendFunction(Axe.prototype.faccelerate,{t:t+t1+tc+t2+ts,a:a3});
trace('final ok')
  }
  if (t3>0) {
trace('target',{t:t,t1:t1,tc:tc,t2:t2,t3:t3,tf:tf,ts:ts,a1:a1,a2:a2,a3:a3,v1:v1,v2:v2,v3:v3,d:d,d1:d1,d2:d2,d3:d3,dc:dc,df:df})
    this.appendFunction(Axe.prototype.faccelerate,{t:t+t1+tc+t2+ts+t3,a:0});
trace('target reached')
  }
  if (output) output.inspect({t:t,t1:t1,tc:tc,t2:t2,t3:t3,tf:tf,ts:ts,a1:a1,a2:a2,a3:a3,v1:v1,v2:v2,v3:v3,d:d,d1:d1,d2:d2,d3:d3,dc:dc,df:df})
                    .html(this.move.help());
  return this;
}


Axe.prototype.move.help = function() {
  var h ="   |<-------------- tt ----------------->|       \n"+
         "   |<--t1-->|<----- tc ------->|<t2>|    |       \n"+
         "   |        +------------------+ v1 |    |       \n"+
         "   |       /                    \\   |<tf>|       \n"+
         "   |      /                      \\a2|    |       \n"+
         "   |  a1 /                        \\ |ts|t|       \n"+
         "   |    /          dc              \\|  |3|       \n"+
         "   |   /                            +--+ v2      \n"+
         "   |  /d1                        d2 |   \\|       \n"+
         "   | /                              |    + v3    \n"+
         "   |+ v                             |(df)|       \n"+
         "   +---------------------------------------------\n";
  h = '<pre>'+jc.toHtml(h)+'</pre>';
  h += 'by default: \n'+
       'a1 = a,  a2 = -a  a3 = a2 \n';
  return jc.html(h);
}
      
Axe.prototype.at = function(t) {
  t = t || this.simulation.time$s;
  var i = this.functions.length-1;
  while ((i > 0) && (t < this.functions[i].init.t)) i--;
  return this.functions[i].f(this.functions[i].init,t);
}
     

Axe.prototype.sample = function(start,end,step) {
// return a Table with all values form start to end, step by step

  var samples = table();
  var i = 0;
  for (var t = start; t <= end; t += step) {
    while ((i < this.functions.length) && (this.functions[i].init.t <= t)) i++;
    if (i>0) {
      i--;
    }
    samples.add(this.functions[i].f(this.functions[i].init,t));
  }
  return samples;
}

Axe.prototype.span = function() {
  var cols = {t:1,p:1,v:1,a:1,j:1};
  for (var i in this.functions) {
    var f = this.functions[i];
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
    var f = this.functions[i];
    h += '<tr><td>'+f.f.toString()+'</td>';
    for (var col in cols) {  
      h += '<td>'+((f.init[col]!==undefined)?f.init[col]:'--')+'</td>';
    }
    h += '</tr>';
  }
  h += '</tbody></table>';
  return h;
}

Axe.prototype.view = function() {
  return '<div class="SUCCESS">'+this._name+this.span()+'</div>';
}
  
function axe(name,params,simulation) {
  // params = {forward:{..same as move},backward:{..same as move},a:default acceleration,v1:default maxSpeed, v2:default approachSpeed}
  var a = new Axe(name);
  a.simulation = simulation || jc.simulation;
  a.forward = $.extend(true,{a1:params.a,a2:-params.a,a3:-params.a,v1: (params.v1 || 1),v2: (params.v2 || 0),v3: (params.v3 || 0)},params.forward);
  a.backward = $.extend(true,{a1:-params.a,a2:params.a,a3:params.a,v1:-(params.v1 || 1),v2:-(params.v2 || 0),v3:-(params.v3 || 0)},params.backward);
  return jc.vars[name] = a;
}

