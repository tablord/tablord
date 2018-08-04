

function Axe (name) {
  this._name = name;
  this.functions = [{f:Axe.prototype.faccelerate,init:{t:0,p:0,v:0,a:0}}];
}

Axe.prototype.toString = function() {
  return '[Axe'+this._name+' with '+this.functions.length+' functions]';
}

Axe.prototype.appendFunction = function (f,init) {
  var last = this.functions.length-1;
  if (init.t < this.functions[last].t) {
    throw new Error("Axe.appendFunction: can't append a function with time "+init.t+" since last function starts at "+this.functions[last].t);
  }
  var res = this.functions[last].f(this.functions[last].init,init.t); // calculate the next last point of previous function
  init.p = res.p;
  init.v = res.v;
  this.functions.push({f:f,init:init});
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
  this.appendFunction(Axe.prototype.faccelerate,init);
  return this;
}


Axe.prototype.move = function(init){
  var a1 = init.a1 || init.a;
  var a2 = init.a2 || -init.a;
  var a3 = init.a3 || a2;


  var v3 = init.v3 || 0;
  var v2 = init.v2 || v3;
  var v1 = init.v1;
  var v  = init.v || 0;   //*************************work around: a corriger le recalcul pour avoir le v du précédent

  var d  = init.d;
  
  do {
    v2 = ((v1/v2)>1)?v2:v1; //if abs(v2) > abs(v1) v2 is limited to v1
    var t  = init.t;
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
//a(jc.inspect({t:t,t1:t1,tc:tc,t2:t2,t3:t3,tf:tf,ts:ts,a1:a1,a2:a2,a3:a3,v:v,v1:v1,v2:v2,v3:v3,d:d,d1:d1,d2:d2,d3:d3,dc:dc,df:df}))
  }
  while (tc < 0);
  this.appendFunction(Axe.prototype.faccelerate,{t:t,a:a1,comment:jc.inspect({t1:t1,tc:tc,t2:t2,t3:t3,tf:tf,ts:ts,a:init.a,a1:a1,a2:a2,a3:a3,v:v,v1:v1,v2:v2,v3:v3,d:d,d1:d1,d2:d2,d3:d3,dc:dc,df:df})});
  this.appendFunction(Axe.prototype.faccelerate,{t:t+t1,a:0});
  this.appendFunction(Axe.prototype.faccelerate,{t:t+t1+tc,a:a2});
  this.appendFunction(Axe.prototype.faccelerate,{t:t+t1+tc+t2,a:0});
  this.appendFunction(Axe.prototype.faccelerate,{t:t+t1+tc+t2+ts,a:a3});
  this.appendFunction(Axe.prototype.faccelerate,{t:t+t1+tc+t2+ts+t3,a:0});

  return this;
}


Axe.prototype.move.help = function() {
  var h ="   |<-------------- tt ----------------->|       \n"+
         "   |<--t1-->|<----- tc ------->|<t2>|    |       \n"+
         "   |        +------------------+ v1 |    |       \n"+
         "   |       /                    \   |<tf>|       \n"+
         "   |      /                      \a2|    |       \n"+
         "   |  a1 /                        \ |ts|t|       \n"+
         "   |    /          dc              \|  |3|       \n"+
         "   |   /                            +--+ v2      \n"+
         "   |  /d1                        d2 |   \|       \n"+
         "   | /                              |    + v3    \n"+
         "   |+ v                             |(df)|       \n"+
         "   +---------------------------------------------\n"
  return '<pre>'+toHtml(h)+'</pre>';
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
  
function axe(name) {
  return jc.vars[name] = new Axe(name);
}

