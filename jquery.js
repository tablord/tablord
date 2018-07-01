// window.alert('jQuery loaded');

function JQuery() {
  this.length = 0;
}


// utility functions /////////////////////////////



JQuery.each = function(o,func) {
  if (o.length != undefined) { //Array like
    for (var i=0; i<o.length; i++) {
      if (func(i,o[i])==false) return o;
    }
  }
  else {
    for (var name in o) {
      if (func(name,o[name])==false) return o;
    }
  }
  return o;
}

JQuery.map = function (a,func) {
  var res = [];
  for (var i=0; i<a.length; i++) {
    var r = func(a[i],i);
    if (r != null) res.push(r);
  }
  return res;
}

// JQuery methodes //////////////////////////////

JQuery.prototype.isJQuery = function () {
  return true;
}

JQuery.prototype.hasClass = function(className){
  for (var i=0; i< this.length; i++){
    if ((this[i].className || '').search(new RegExp('\\b'+className+'\\b')) != -1) {
      return true;
    }
  }
  return false;
}

JQuery.prototype.addClass = function(className) {
  return this.toggleClass(className,true);
}

JQuery.prototype.removeClass = function(className) {
  return this.toggleClass(className,false);
}

JQuery.prototype.toggleClass = function(className,add) { //limited version: only on class at a time
  this.each(function(i,e) {
    if (e.className == undefined) { e.className = className; return;};
    var classMissing = (e.className.search(new RegExp('\\b'+className+'\\b')) == -1);
    if ((add!==false) && classMissing) {e.className += ' '+className; return};  //if add & missing   OR  add==undefined & missing
    if ((add===false) || ((add===undefined) && !classMissing)) {
      e.className = e.className.replace(new RegExp('\\b'+className+'\\b','g'),'').replace(/^\s+/,'').replace(/\s+$/,'').replace(/\s+/g,' ');
    }
  });
  return this;
}

// selection methods ///////////

JQuery.prototype.addClassSel = function(className,context) {
  for (var i = 0; i< context.children.length; i++) {
    if ((context.children[i].className || '').search(new RegExp('\\b'+className+'\\b')) != -1) {
      this[this.length++] = context.children[i];
    }
    this.addClassSel(className,context.children[i]);
  }
  return this;
}


JQuery.prototype.addIdSel = function(id,context) {
  for (var i = 0; i< context.children.length; i++) {
    if (context.children[i].id == id) {
      this[this.length++] = context.children[i];
      return; //only one id
    }
    this.addIdSel(id,context.children[i]);
  }
  return this;
}

JQuery.prototype.addTagSel = function(tag,context) {
  for (var i = 0; i< context.children.length; i++) {
    if (context.children[i].tagName==tag) {
      this[this.length++] = context.children[i];
    }
    this.addTagSel(tag,context.children[i]);
  }
  return this;
}

JQuery.prototype.add =function (sel,context) {
  if (sel == undefined) {
    return this;
  }
  var c= context || window.document.documentElement;
  if (sel.tagName != undefined) {  // sel is a DOM Element
    this[this.length++] = sel;
    return this;
  }

  if (sel.search(/^\./)==0) {
    var className = sel.slice(1);
    return this.addClassSel(className,c);
  }
  if (sel.search(/^\#/)==0) {
    var id = sel.slice(1);
    return this.addIdSel(id,c);
  }

  //un Tag
  return this.addTagSel(sel,c);
}

JQuery.prototype.each = function (f) {
  // f is function(i,element)
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
    s.push(jc.toHtml(this[i].outerHTML));
  }
  return this.toString()+'<br><code class="INSPECTHTML">'+s.join('<br>')+'</code>';
}  
  