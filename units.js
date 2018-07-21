// this module handles units conversion and display
// it is relatively simple since JavaScript does not allow to redefine operators like + * etc..
// so only conversion and unit display is supported


jc.Units = {
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

  EUR:     {type:'currency',k:1,         symbole:'€'},
  USD:     {type:'currency',k:0.86,      symbole:'$'},
  CHF:     {type:'currency',k:0.87,      symbole:'chf'}
}

jc.Units.convert = function(value,from,to) {
  // convert the value from unit "from" to "to"
  // an error is thrown if the 2 units are not from the same type
  if (jc.Units[from].type != jc.Units[to].type) throw new Error("can't convert "+from+' to '+to+' since they are not of the same type ('+jc.Units[from].type+' != '+jc.Units[to].type+')');

  return value * jc.Units[from].k / jc.Units[to].k;
}

jc.Units.symbole = function(unit) {
  // returns the "pretty" symbole for unit or unit itself if none if found
  var u = jc.Units[unit];
  if (u == undefined) return unit;
  return u.symbole;
}

jc.helps['jc.Units'] = {converts:jc.Units.convert,symbole:jc.Units.symbole};
  
  

     