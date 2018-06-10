// window.alert('jQuery loaded');

function JQuery() {
  this.length = 0;
}

JQuery.prototype.isJQuery = function () {
  return true;
}

JQuery.prototype.addClass = function(className,context) {
  for (var i = 0; i< context.children.length; i++) {
    if ((context.children[i].className || '').search(className) != -1) {
      this[this.length++] = context.children[i];
    }
    this.addClass(className,context.children[i]);
  }
}

JQuery.prototype.addId = function(id,context) {
  for (var i = 0; i< context.children.length; i++) {
    if (context.children[i].id == id) {
      this[this.length++] = context.children[i];
      return; //only one id
    }
    this.addId(id,context.children[i]);
  }
}

JQuery.prototype.addTag = function(tag,context) {
  for (var i = 0; i< context.children.length; i++) {
    if (context.children[i].tagName==tag) {
      this[this.length++] = context.children[i];
    }
    this.addTag(tag,context.children[i]);
  }
}

JQuery.prototype.add =function (sel,context) {
  if (sel == undefined) {
    return window.document.documentElement;
  }
  var c= context || window.document.documentElement;
  if (sel.tagName != undefined) {  // sel is a DOM Element
    this[this.length++] = sel;
  }
  else {
    if (sel.search(/^\./)==0) {
      var className = sel.slice(1);
      this.addClass(className,c);
    }
    else if (sel.search(/^\#/)==0) {
      var id = sel.slice(1);
      this.addId(id,c);
    }
    else { //un Tag
      this.addTag(sel,c);
    }
  } 
  return this; 
}

JQuery.prototype.each = function (f) {
  for (var i=0; i < this.length; i++) {
    if (f(i,this[i]) == false) {break};
  }
}

JQuery.prototype.hasClass = function(name){
  for (var i=0; i< this.length; i++){
    if ((this[i].className || '').search(name) != -1) {
      return true;
    }
  }
  return false;
}

JQuery.prototype.toggleClass = function(name,add) { //limited version: only on class at a time
  this.each(function(i,e) {
    if ((add==true) || (e.className == undefined) || ((e.className.search(name) == -1) && (add != false))) {
      e.className += ' '+name;
    }
    else {
      e.className = e.className.replace(new RegExp(name),'');
    }
  });
  return this;
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
  