// mindset.js
//
// tools to create visual interactions with an array of arbitary objects
//
// CC-BY-SA Marc Nicole 2018
/////////////////////////////////////////////////////////////////////////////////

jc.WordIndex = function (arrayOfObjects,fieldSet,wordRegExp) {
  // create a new WordIndex by scanning all string fields of
  // the objects in ArrayOfObjects
  // fieldSet limits the search to the fields described and give a given ponderation to the different fields
  //   f.ex: {name:5,description:1} will give an importance 5 time bigger
  //   to a word in the field name than in description
  //   if undefined, all own properties (not inherited) will be used
  // wordRegExp: a RegExp expression in order to find the words. must be global
  //   by default /\w+/g
  this.index = {};
  this.add(arrayOfObjects,fieldSet,wordRegExp);
}

jc.WordIndex.prototype.add = function(arrayOfObjects,fieldSet,wordRegExp) {
  // complement the index with a new array of objects
  var obj,f,s,m,objIndex;
  wordRegExp = wordRegExp || /\w+/g;

  var index = this.index;
 
  function scan(field,weight) {
    if (weight===0) return;
    var word;
    var duplicate = {};
    if (typeof field === 'string') {  // TODO traiter les Array comme dans MongoDb???
      m = field.match(wordRegExp) || [];
      for (var i = 0; i<m.length; i++) {
        word = m[i];
        if (duplicate[word] === undefined) {
          objIndex[word] = (objIndex[word] || 0) + weight;
        }
      }
    }
  }    
    
  for (var i=0; i<arrayOfObjects.length; i++) {
    obj = arrayOfObjects[i];
    objIndex = {};
    if (fieldSet) {
      for (f in fieldSet) {
        scan(obj[f],fieldSet[f]);
      }          
    }
    else {
      for (f in obj) {
        if (obj.hasOwnProperty(f)) scan(obj[f],1);
      }          
    }
    for (var w in objIndex) {
      if (index[w] === undefined) index[w]=[];
      index[w].push({r:objIndex[w],o:obj});
    }
  }
}


// JcElements to view WordIndex ///////////////////////////////////////////////

jc.IWordCloud = function JcWordCloud(name,css,wordIndex,scene) {
  jc.IElement.call(this,name,css,'',scene);
  var width  = css.width || 400;
  var height = css.height || 400;
  this.wordIndex = wordIndex;
  this.elements = [];
  this.repulsionForce = jc.spring(200,1);
  for (var w in wordIndex.index) {
    this.elements.push(new jc.IElement(this.name+'__'+w,{top:Math.random()*height,left:Math.random()*width},w,scene));
  }
}

jc.makeInheritFrom(jc.IWordCloud,jc.IElement);

jc.IWordCloud.prototype.node$ = function(css,html) {
  for (var i = 0; i<this.elements.length; i++) {
    this.$.append(this.elements[i].node$());
  }
  return this.$;
}

jc.IWordCloud.prototype.animate = function(deltaT$ms){
  var ei,ej,f;
  var w = this.width();
  var h = this.height();
  for (var i = 0;i<this.elements.length;i++) {
    this.elements[i].prepareAnimation();
  }
  // repulse all elements
  for (var i = 0;i<this.elements.length;i++) {
    ei = this.elements[i];
    // symetric repulsion forces from the others
    for (var j = i+1;j<this.elements.length;j++) {
      ej = this.elements[j];
      f = this.repulsionForce(ei,ej);
      ei.f.x += f.x;
      ej.f.x -= f.x;
      ei.f.y += f.y;
      ej.f.y -= f.y;
    }
    // bounce on borders 
    var eiw = 100;
    var eih =  20;
    if ((ei.p.x<0) && (ei.v.x<0)) {
      ei.p.x = 0;
      ei.v.x = - ei.v.x*0.8;
    }
    if ((ei.p.x+eiw>w) && (ei.v.x > 0)) {
      ei.p.x = w-eiw;
      ei.v.x = - ei.v.x*0.8;
    }
    if ((ei.p.y<0) && (ei.v.y<0)) {
      ei.p.y = 0;
      ei.v.y = - ei.v.y*0.8;
    }
    if ((ei.p.y+eih>h) && (ei.v.y > 0)) {
      ei.p.y = h-eih;
      ei.v.y = - ei.v.y*0.8;
    }
  }
  for (var i = 0;i<this.elements.length;i++) {
    this.elements[i].animate(deltaT$ms);
  }

  return this;
}

jc.IElement.prototype.wordCloud = function (name,css,wordIndex) {
    return this.scene.add(new jc.IWordCloud(name,css,wordIndex,this.scene));
}

