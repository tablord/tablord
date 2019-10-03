
  // classical formating functions ////////////////////////////////////////////

  tb.Format = function() {
    // this class is compatible with the format property of options object used in tb.format(value,options)
    // but it has methods that helps to build this object
  }
  tb.Format.className='tb.Format';

  tb.Format.prototype.fixed = function(decimals) {
    // returns a formating object {number:function(obj)} that formats the number with fixed decimals
    let o = this.constructor === tb.Format?this:new tb.Format();
    let f = function (n) {return n.toFixed(decimals)};
    f.toString = function() {return 'display precision of '+decimals+' decimals'};
    o.number = f;
    return o;
  }

  tb.Format.prototype.undefinedBlank = function() {
    // returns a format object {undef:f()}
    let o = this.constructor === tb.Format?this:new tb.Format();
    let f = function () {return ''};
    f.toString = function() {return 'undefined is blank'};
    o.undef = f;
    return o;
  }

  tb.Format.prototype.percent = function(decimals) {
    // returns a fomating function(obj) that formats the number with fixed decimals
    let o = this.constructor === tb.Format?this:new tb.Format();
    let f = function (n) {return Number(100*n).toFixed(decimals)+'%'};
    f.toString = function() {return 'display number as percent with a precision of '+decimals+' decimals'};
    o.number = f;
    return o;
  }

  $.extend(tb,tb.Format.prototype); // make those methods directly availlable to tb


  tb.format = function(obj,options) {
    // format obj using by priority
    // 1) options.format
    // 2) the tb.defaults.format
    // and according to the type
    let fmt;
    if (options) {
      fmt = $.extend(true,{},tb.defaults.format,options.format);
    }
    else {
      fmt = tb.defaults.format;
    }
    if (typeof obj === 'number') {
      return fmt.number(obj,fmt.fmtStr)
    }
    if (obj === undefined) {
      return fmt.undef();
    }
    if (obj === null) {
      return fmt.nullObj();
    }
    if (obj === '') {
      return fmt.emptStr();
    }
    if (typeof obj === 'function') {
      return fmt.func(obj);
    }
    if ($.isArray(obj)) {
      return fmt.array(obj);
    }
    if (obj.span) {
      return obj.span().toString(); //span() usually return a HTML object;
    }
    if (obj.outerHTML) { // an Element
      return fmt.domElement(obj);
    }
    if (moment.isMoment(obj)) {
      return fmt.moment(obj);
    }
    if (moment.isDuration(obj)) {
      return fmt.duration(obj);
    }
    if (obj.getUTCDate) {
      return fmt.date(obj);
    }
    if (obj.constructor == Object) {
      return fmt.obj(obj);
    }
    if (obj.valueOf) {
      let val = obj.valueOf();   // typicall the case of v() where valueOf return whatever has been stored in the V object
      if (val !== obj) {         // if the valueOf is not itself
        return tb.format(val,options);   // format the result of valueOf
      }
    }
    if (obj.toString) {
      return tb.toHtml(obj.toString());
    }
    return 'special object';
  }
