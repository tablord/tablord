

tb.Axe = function Axe(name) {
  // Axe objects simulate an axe
  this._name = name;
  this.functions = [{f:tb.Axe.prototype.faccelerate,init:{t:-Infinity,p:0,v:0,a:0,phase:'init'}}];
  this.decimals = 3;
}
tb.Axe.className = 'tb.Axe';

tb.Axe.prototype.toString = function() {
  return '[Axe'+this._name+' with '+this.functions.length+' functions]';
}

tb.Axe.prototype.appendFunction = function (f,init) {
  let last = this.functions.length-1;
  if ((last<0) || (init.t < this.functions[last].init.t)) {
    throw new Error("tb.Axe.appendFunction: can't append a function with time "+init.t+" since last function starts at "+this.functions[last].init.t);
  }
  let res = this.functions[last].f(this.functions[last].init,init.t); // calculate the next last point of previous function
  init.p = res.p;
  init.v = res.v;
  this.functions.push({f:f,init:init});
}


tb.Axe.prototype.faccelerate = function (init,t) {
  //returns {t:t,p:xxx,v:xxx,a:init.a,j:xxxx} for a given t
  if (init.t == -Infinity) return {t:t,a:init.a,v:init.v,p:init.p};
  let dt = t-init.t;
  let res = {t:t,a:init.a};
  res.v = init.v+init.a*(t-init.t);
  res.p = init.p+(init.v*dt)+(0.5*init.a*Math.pow(dt,2));
  return res;
}

tb.Axe.prototype.faccelerate.toString = function(){
  return "accelerate";
}

tb.Axe.prototype.accelerate = function(init){
  this.appendFunction(tb.Axe.prototype.faccelerate,init);
  return this;
}

tb.Axe.prototype.move = function(init){
  //init is an object specifing one or more of the following parameters
  // t: initial time
  // p: final position
  // a: default acceleration

//TODO pour les petits d�placement (d < df) ce n'est pas encore ok !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

  let t,t1,tc,t2,t3,tf,ts,a1,a2,a3,v0,v1,v2,v3,d,d1,d2,d3,dc,ds,df, dir,at_t,defaults;
  t = init.t || (this.simulation && this.simulation.time$s);
  at_t = this.at(t);
  d = init.p - at_t.p;
  dir = d>0?1:-1;
  v0 = at_t.v;
  defaults = d>=0?this.forward:this.backward;

  a1 = init.a1 ||  init.a || defaults.a1;
  a2 = init.a2 || -init.a || defaults.a2;
  a3 = init.a3 || -init.a || defaults.a3;

  v3 = init.v3 || defaults.v3 || 0;
  v2 = init.v2 || defaults.v2 || v3;
  v1 = init.v1 || defaults.v1;
  if ((v1*dir<0)||(v2*dir<0)||(v3*dir<0)) throw new Error('v1:'+v1+' v2:'+v2+' v3:'+v3+'must be same sign as deplacement:'+d+'(p(t:'+t+'):'+at_t.p+'-init.p:'+init.p+')');
  if ((a1*dir<0)||(a2*dir>0)||(a3*dir>0)) throw new Error('a1:'+a1+'must be same sign and a2:'+a2+' a3:'+a3+'must be oposite sign as deplacement:'+d);

  do {
    // make sure that abs(v1)>abs(v2)>abs(v3)
    v2 = v1*dir > v2*dir?v2:v1;
    v3 = v2*dir > v3*dir?v3:v2;

    t1 = (v1-v0)/a1;
    t2 = (v2-v1)/a2;
    t3 = (v3-v2)/a3;

    d1 = (v0+v1)/2*t1;
    d2 = (v1+v2)/2*t2;
    d3 = (v2+v3)/2*t3;
    if (v2==0) {
      df = 0;
      tf = init.tf || 0;
    }
    else {
      if ((init.df && init.tf) !== undefined) {
        throw new Error("can't specify both df and tf together")
      }
      if (init.tf) {
        tf = init.tf;
        if (tf < t3) throw new Error('tf:'+tf+' must be > t3:'+t3);
        ts = tf-t3;
        ds = ts*v2;
        df = ds+d3;
      }
      else if (init.df) {
        df = init.df;
        if (df*dir < d3*dir) throw new Error('df:'+df+' must be longer than d3:'+d3);
        ds = df-d3;
        ts = ds/v2;
        tf = ts+t3;
      }
      else throw new Error("either df or tf must be specified when v2!=0")
    }

    if (df*dir > d*dir) {
      // the distance is so short that breaking distance is bigger
      // in that case recalculate for v2 as highest speed
      v2 = v3;
      df = ds = tf = ts = 0;
      tc = -1; // just to force the while to loop again
      continue;
    }

    let dc = d-d1-d2-df;
    let tc = dc / v1;
    if (tc < 0) {
      v1 = 0.9*v1; // ***** dirty and stupid
    }
  }
  while (tc < 0);

  trace({t:t,t1:t1,tc:tc,t2:t2,t3:t3,tf:tf,ts:ts,a1:a1,a2:a2,a3:a3,v1:v1,v2:v2,v3:v3,d:d,d1:d1,d2:d2,d3:d3,dc:dc,df:df})


  // if t is before the last function init time, it means that the user initiate a move before the end of the
  // previous move. we have to cancel the planned future function in order to replace by new ones
  let i = this.functions.length-1;
  while ((i >= 0) && (t <= this.functions[i].init.t)) {
    i--;
  }
  this.functions.length = i+1;

  // now add the move
  this.appendFunction(tb.Axe.prototype.faccelerate,{t:t,a:a1,phase:'t1'});
  this.appendFunction(tb.Axe.prototype.faccelerate,{t:t+t1,a:0,phase:'tc'});
  this.appendFunction(tb.Axe.prototype.faccelerate,{t:t+t1+tc,a:a2,phase:'t2'});
  this.appendFunction(tb.Axe.prototype.faccelerate,{t:t+t1+tc+t2,a:0,phase:'ts'});
  if (ts>0) {
    this.appendFunction(tb.Axe.prototype.faccelerate,{t:t+t1+tc+t2+ts,a:a3,phase:'t3'});
  }
  if (t3>0) {
    this.appendFunction(tb.Axe.prototype.faccelerate,{t:t+t1+tc+t2+ts+t3,a:0,phase:'stop'});
  }
  return this;
}


tb.Axe.prototype.move.help = function() {
  let h ="   |<-------------- tt ----------------->|       \n"+
         "   |<--t1-->|<----- tc ------->|<t2>|    |       \n"+
         "   |        +------------------+ v1 |    |       \n"+
         "   |       /                    \\   |<tf>|       \n"+
         "   |      /                      \\a2|    |       \n"+
         "   |  a1 /                        \\ |ts|t|       \n"+
         "   |    /          dc              \\|  |3|       \n"+
         "   |   /                            +--+ v2      \n"+
         "   |  /d1                        d2 |   \\|a3    \n"+
         "   | /                              |    + v3    \n"+
         "   |+ v0                            |(df)|       \n"+
         "   +---------------------------------------------\n";
  h = '<pre>'+tb.toHtml(h)+'</pre>';
  h += 'by default: \n'+
       'a1 = a,  a2 = -a  a3 = a2 \n';
  return tb.html(h);
}

tb.Axe.prototype.at = function(t) {
  t = t || this.simulation.time$s;
  let i = this.functions.length-1;
  while ((i > 0) && (t < this.functions[i].init.t)) i--;
  return this.functions[i].f(this.functions[i].init,t);
}


tb.Axe.prototype.sample = function(start,end,step) {
// return a Table with all values form start to end, step by step

  let samples = table();
  let i = 0;
  for (let t = start; t <= end; t += step) {
    while ((i < this.functions.length) && (this.functions[i].init.t <= t)) i++;
    if (i>0) {
      i--;
    }
    samples.add(this.functions[i].f(this.functions[i].init,t));
  }
  return samples;
}

tb.Axe.prototype.span = function() {
  let cols = {t:1,p:1,v:1,a:1,j:1};
  for (let i in this.functions) {
    let f = this.functions[i];
    for (let c in f.init) {
      cols[c]=1;
    }
  }

  let h = '<table border="1px"><thead><tr><th>f</th>';
  for (let col in cols) {
    h += '<th>'+col+'</th>';
  }
  h += '</tr></thead><tbody>';
  for (let i in this.functions) {
    let f = this.functions[i];
    h += '<tr><td>'+f.f.toString()+'</td>';
    for (let col in cols) {
      h += '<td>'+((f.init[col]!==undefined)?(typeof f.init[col] == 'number'?f.init[col].toFixed(this.decimals):f.init[col]):'--')+'</td>';
    }
    h += '</tr>';
  }
  h += '</tbody></table>';
  return h;
}

tb.Axe.prototype.view = function() {
  return '<div class="SUCCESS">'+this._name+this.span()+'</div>';
}

function axe(name,params,simulation) {
  // params = {forward:{..same as move},backward:{..same as move},a:default acceleration,v1:default maxSpeed, v2:default approachSpeed}
  let a = new tb.Axe(name);
  a.simulation = simulation || tb.simulation;
  a.forward = $.extend(true,{a1:params.a,a2:-params.a,a3:-params.a,v1: (params.v1 || 1),v2: (params.v2 || 0),v3: (params.v3 || 0)},params.forward);
  a.backward = $.extend(true,{a1:-params.a,a2:params.a,a3:params.a,v1:-(params.v1 || 1),v2:-(params.v2 || 0),v3:-(params.v3 || 0)},params.backward);
  return tb.vars[name] = a;
}
