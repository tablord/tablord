// this module handles units conversion and display
// it is relatively simple since JavaScript does not allow to redefine operators like + * etc..
// so only conversion and unit display is supported


tb.Units = {
  angstrom:{type:'length',k:0.0000000001,symbole:'\xE5'},
  nm:      {type:'length',k:0.000000001, symbole:'\u03B7m'},
  um:      {type:'length',k:0.000001,    symbole:'\u03BCm'},
  mm:      {type:'length',k:0.001,       symbole:'mm'},
  cm:      {type:'length',k:0.01,        symbole:'cm'},
  m:       {type:'length',k:1,           symbole:'m'},
  km:      {type:'length',k:1000,        symbole:'km'},
  inch:    {type:'length',k:0.0254,      symbole:'"'},
  foot:    {type:'length',k:0.3048,      symbole:"'"},
  mile:    {type:'length',k:1609.344,    symbole:"M"},
  NMile:   {type:'length',k:1852,        symbole:"NM"},

  m_s:     {type:'speed',k:1,            symbole:'m/s'},
  km_h:    {type:'speed',k:1000/3600,    symbole:'km/h'},
  mph:     {type:'speed',k:1609.344/3600,symbole:'mph'},

  rpm:     {type:'rotationSpeed',k:1,    symbole:'rpm'},
  rps:     {type:'rotationSpeed',k:60,   symbole:'rps'},

  EUR:     {type:'currency',k:1,         symbole:'�'},
  USD:     {type:'currency',k:0.86,      symbole:'$'},
  CHF:     {type:'currency',k:0.87,      symbole:'chf'}
}

tb.Units.convert = function(value,from,to) {
  // convert the value from unit "from" to "to"
  // an error is thrown if the 2 units are not from the same type
  if (tb.Units[from] == undefined) throw new Error("can't convert from an undefined unit ("+from+")");
  if (tb.Units[to] == undefined) throw new Error("can't convert to an undefined unit ("+to+")");
  if (tb.Units[from].type != tb.Units[to].type) throw new Error("can't convert "+from+' to '+to+' since they are not of the same type ('+tb.Units[from].type+' != '+tb.Units[to].type+')');
  if (from == to) return value; // to avoid NaN (divide by zero) if not necessary
  return value * tb.Units[from].k / tb.Units[to].k;
}

tb.Units.symbole = function(unit) {
  // returns the "pretty" symbole for unit or unit itself if none if found
  var u = tb.Units[unit];
  if (u == undefined) return unit;
  return u.symbole;
}

tb.Units.addUnit = function (newUnit,type,k,unitOfK,symbole) {
  // adds or replace newUnit of the type type
  // the factor for this new unit is k expressed in unitOfK (which has to be previously defined)
  // returns tb.Units in order to do method chaining
  for (var u in this) {
    if ((this[u].type == type) && (this[u].k == 1)) {
      var ref = u;
      break;
    }
  }
  if (ref == undefined) throw new Error("can't add unit "+newUnit+" since the type "+type+" doesn't already exists");
  symbole = symbole||newUnit;
  this[newUnit] = {type:type,k:tb.Units.convert(k,unitOfK,u),symbole:symbole};
  return tb.Units;
}

tb.helps['tb.Units'] = {converts:tb.Units.convert,symbole:tb.Units.symbole};
