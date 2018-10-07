// mindset.js
//
// tools to create visual interactions with an array of arbitary objects
//
// CC-BY-SA Marc Nicole 2018
/////////////////////////////////////////////////////////////////////////////////

jc.WordIndex = function (arrayOfObjects,objHtml,fieldSet,wordRegExp) {
  // create a new WordIndex by scanning all string fields of
  // the objects in ArrayOfObjects
  // objHtml a function(obj) that returns how to display obj in html
  // fieldSet limits the search to the fields described and give a given ponderation to the different fields
  //   f.ex: {name:5,description:1} will give an importance 5 time bigger
  //   to a word in the field name than in description
  //   if undefined, all own properties (not inherited) will be used
  // wordRegExp: a RegExp expression in order to find the words. must be global
  //   by default /\w+/g
  this.objHtml = objHtml;
  this.index = {};
  this.objects = arrayOfObjects;
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
 
  this.objects.concat(arrayOfObjects);    

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
  this.words = [];
  this.objs  = [];
  this.repulsionForce = jc.spring(200,1);
  this.focusedForce = jc.spring(0,5);
  for (var w in wordIndex.index) {
    this.words.push(new jc.IElement(this.name+'__'+w,{top:Math.random()*height,left:Math.random()*width},w,this));
  }
  for (var i=0;i<wordIndex.objects.length;i++) {
    var e = new jc.IElement(
      this.name+'__O'+i,
      {top:Math.random()*height,left:Math.random()*width},
      this.wordIndex.objHtml(wordIndex.objects[i]),
      this
    )
    e.$.css('color','red');
    e.obj = wordIndex.objects[i];
    this.objs.push(e);
  }

  this.focusedWord = this.words[0];
}

jc.makeInheritFrom(jc.IWordCloud,jc.IElement);

jc.IWordCloud.clickHandler = function(event) {
  // eventHandler for click on elements
  event.currentTarget.IElement.scene.focus(event.currentTarget.IElement);
}

jc.IWordCloud.prototype.element$ = function(css,html) {
  for (var i = 0; i<this.words.length; i++) {
    this.$.append(this.words[i].element$().css('cursor','pointer').click(jc.IWordCloud.clickHandler));
  }
  for (var i = 0; i<this.objs.length; i++) {
    this.$.append(this.objs[i].element$().css('cursor','pointer').click(jc.IWordCloud.clickHandler));
  }
  return this.$;
}

jc.IWordCloud.prototype.focus = function(word) {
  if (this.focusedWord) this.focusedWord.$.removeClass('FOCUSED');
  this.focusedWord = word;
  this.focusedWord.$.addClass('FOCUSED');
}

jc.IWordCloud.prototype.animate = function(deltaT$ms){
  var ei,ej,f;
  var w = this.width();
  var h = this.height();
  for (var i = 0;i<this.words.length;i++) {
    this.words[i].prepareAnimation();
  }
  for (var i = 0;i<this.objs.length;i++) {
    this.objs[i].prepareAnimation();
  }
  
  
  jc.repulseIElements(this.words,this.repulsionForce);
  jc.repulseIElements(this.objs,this.repulsionForce);


  // the focused word is only attracted by the center
  if (this.focusedWord) {
    if (this.focusedWord.obj) {
      this.focusedWord.f = this.focusedForce(this.focusedWord,{p:{x:w*0.66,y:h*0.5}});
    }
    else {
      this.focusedWord.f = this.focusedForce(this.focusedWord,{p:{x:w*0.33,y:h*0.5}});
    }
  }


  for (var i = 0;i<this.words.length;i++) {
    this.words[i]
    .bounceOnBorders(0,0,h,w)
    .animate(deltaT$ms);
  }
  for (var i = 0;i<this.objs.length;i++) {
    this.objs[i]
    .bounceOnBorders(0,0,h,w)
    .animate(deltaT$ms);
  }
  return this;
}

jc.IElement.prototype.wordCloud = function (name,css,wordIndex) {
    return this.scene.add(new jc.IWordCloud(name,css,wordIndex,this.scene));
}

