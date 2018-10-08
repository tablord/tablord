// mindset.js
//
// tools to create visual interactions with an array of arbitary objects
//
// CC-BY-SA Marc Nicole 2018
/////////////////////////////////////////////////////////////////////////////////


// IWordCloud  ///////////////////////////////////////////////

jc.IWordCloud = function JcWordCloud(name,css,arrayOfObjects,objectCaption,scene) {
  // create a new WordClould
  // name is mandatory and will be assigned to the IElement
  // arrayOfObject: an array of object that will be analysed
  // objectCaption: either a the field name specifying which field of the object is used as object caption
  //                or a function(obj) returning the html code to be used as object caption
  // scene: the scene that contains the WordCloud

  jc.IElement.call(this,name,css,'',scene);
  this.objects = arrayOfObjects;
  this.wordsIE = {};
  this.objsIE  = [];
  this.objectCaption = typeof objectCaption === 'function'?objectCaption:function(o) {return o[objectCaption].toString()};
  this.repulsionForce = jc.spring(200,1);
  this.focusedForce = jc.spring(0,5);
  this.wordRegExp = /\w+/g;
}

jc.makeInheritFrom(jc.IWordCloud,jc.IElement);

jc.IWordCloud.clickHandler = function(event) {
  // eventHandler for click on elements
  event.currentTarget.IElement.scene.focus(event.currentTarget.IElement);
}

jc.IWordCloud.prototype.element$ = function() {
  // create the worldCloud Element and all neccessary internal IElements
  var objIndex;
  var wordRegExp = this.wordRegExp;

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


  for (var i = 0; i<this.objects.length;i++) {
    var obj = this.objects[i];
    var objIE = new jc.IElement(this.name+'_'+i,
                               {top:Math.random()*100,left:Math.random()*100},
                               this.objectCaption(obj),
                               this);
    objIE.$.addClass('CLOUD OBJECT');
    objIE.obj = obj;
    objIE.wordsIE = {};
    this.objsIE.push(objIE);

    objIndex = {};
    if (this.fieldSet) {
      for (var f in fieldSet) {
        scan(obj[f],fieldSet[f]);
      }          
    }
    else {
      for (var f in obj) {
        if (obj.hasOwnProperty(f)) scan(obj[f],1);
      }          
    }
    for (var word in objIndex) {
      var e = this.wordsIE[word]
      if (e==undefined) {
        e = new jc.IElement(word,{top:Math.random()*100,left:Math.random()*100},word,this);
        e.$.addClass('CLOUD WORD');
        e.objectsIE = [];
        e.rank = 0;
        this.$.append(e.element$().css('cursor','pointer').click(jc.IWordCloud.clickHandler));
      }
      e.rank += objIndex[word];
      e.objectsIE.push(objIE);
      this.wordsIE[word] = e;
      objIE.wordsIE[word] = e;
    }
    this.$.append(objIE.element$().css('cursor','pointer').click(jc.IWordCloud.clickHandler));
  }

  return this.$;
}

jc.IWordCloud.prototype.focus = function(iE) {
  if (this.focusedIE) this.focusedIE.$.removeClass('FOCUSED');
  this.focusedIE = iE;
  this.focusedIE.$.addClass('FOCUSED');
}

jc.IWordCloud.prototype.animate = function(deltaT$ms){
  var ei,ej,f;
  var w = this.width();
  var h = this.height();
  for (var word in this.wordsIE) {
    this.wordsIE[word].prepareAnimation();
  }
  for (var i = 0;i<this.objsIE.length;i++) {
    this.objsIE[i].prepareAnimation();
  }
  
  jc.repulseIElements(jc.values(this.wordsIE),this.repulsionForce);
  jc.repulseIElements(this.objsIE,this.repulsionForce);

  // the focused iElement is only attracted by the center
  if (this.focusedIE) {
    if (this.focusedIE.obj) {
      this.focusedIE.applyForceToAll(jc.values(this.focusedIE.wordsIE),this.focusedForce);
      this.focusedIE.f = this.focusedForce(this.focusedIE,{p:{x:w*0.66,y:h*0.5}});
    }
    else {
      for (var i = 0; i<this.focusedIE.objectsIE.length;i++) {
        this.focusedIE.applyForceWith(this.focusedIE.objectsIE[i],this.focusedForce);
      }
      this.focusedIE.f = this.focusedForce(this.focusedIE,{p:{x:w*0.33,y:h*0.5}});
    }
  }

  for (word in this.wordsIE) {
    this.wordsIE[word]
    .bounceOnBorders(0,0,h,w)
    .animate(deltaT$ms);
  }
  for (var i = 0;i<this.objsIE.length;i++) {
    this.objsIE[i]
    .bounceOnBorders(0,0,h,w)
    .animate(deltaT$ms);
  }
  return this;
}

jc.IElement.prototype.wordCloud = function (name,css,arrayOfObjects,objectCaption) {
  return this.scene.add(new jc.IWordCloud(name,css,arrayOfObjects,objectCaption,this.scene));
}

