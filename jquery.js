// window.alert('jQuery loaded');

function JQuery() {
  this.length = 0;
}

JQuery.prototype.isJQuery = function () {
  return true;
}

JQuery.prototype.add =function (sel,context) {
  if (sel == undefined) {
    return window.document.documentElement;
  }
  var c= context || window.document.documentElement;
  if (sel.search(/^\./)==0) {
    var className = sel.slice(1);
    for (var i = 0; i< c.children.length; i++) {
      if (c.children[i].className==className) {
        this[this.length++] = c.children[i];
      }
      this.add(sel,c.children[i]);
    }
  }
  if (sel.search(/^\#/)==0) {
    var id = sel.slice(1);
    for (var i = 0; i< c.children.length; i++) {
      if (c.children[i].id==id) {
        this[this.length++] = c.children[i];
      }
      this.add(sel,c.children[i]);
    }
  } 
  
  return this; 
}

JQuery.prototype.each = function (f) {
  for (var i=0; i < this.length; i++) {
    if (f(i,this[i]) == false) {break};
  }
}

JQuery.prototype.toString = function () {
  return '[jQuery of '+this.length+' elements]';
}



function $(sel,context) {
  return new JQuery().add(sel,context);
}
  
// Events ////////////////////////
JQuery.prototype.bind = function(type,data,f) {
  for (var i=0; i<this.length; i++) {
    this[i].attachEvent("on"+type,f);
  }
  return this;
}

// addition to jQuery  ///////////

JQuery.prototype.view = function () {
  var s = [];
  for (var i=0; i < this.length; i++) {
    s.push(htmlToStr(this[i].outerHTML));
  }
  return 'view of '+this.toString()+'<br><code class="INSPECT">'+s.join('<br>')+'</code>';
}  
  