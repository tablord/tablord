// mindset.js
//
// tools to create visual interactions with an array of arbitary objects
//
// CC-BY-SA Marc Nicole 2018
/////////////////////////////////////////////////////////////////////////////////


// IWordCloud  ///////////////////////////////////////////////

tb.IWordCloud = function (name,css,arrayOfObjects,objectCaption,scene) {
  // create a new WordClould
  // name is mandatory and will be assigned to the IElement
  // arrayOfObject: an array of object that will be analysed
  // objectCaption: either a the field name specifying which field of the object is used as object caption
  //                or a function(obj) returning the html code to be used as object caption
  // scene: the scene that contains the WordCloud

  tb.IElement.call(this,name,css,'',scene);
  this.objects = arrayOfObjects;
  this.wordsIE = {};
  this.objsIE  = [];
  this.objectCaption = typeof objectCaption === 'function'?objectCaption:function(o) {return o[objectCaption].toString()};
  this.repulsionForce = tb.spring(150,1);
  this.focusedForce = tb.spring(0,5);
  this.wordObjectForce = tb.ySpring(2);
  this.wordRegExp = /\w+/g;
}
tb.IWordCloud.className = 'tb.IWordCloud';

tb.makeInheritFrom(tb.IWordCloud,tb.IElement);

tb.IWordCloud.clickHandler = function(event) {
  // eventHandler for click on elements
  event.currentTarget.IElement.scene.focus(event.currentTarget.IElement);
}

tb.IWordCloud.prototype.element$ = function() {
  // create the worldCloud Element and all neccessary internal IElements
  let objIndex;
  let wordRegExp = this.wordRegExp;

  function scan(field,weight) {
    if (weight===0) return;
    let word;
    let duplicate = {};
    if (typeof field === 'string') {  // TODO traiter les Array comme dans MongoDb???
      m = field.match(wordRegExp) || [];
      for (let i = 0; i<m.length; i++) {
        word = m[i];
        if (duplicate[word] === undefined) {
          objIndex[word] = (objIndex[word] || 0) + weight;
        }
      }
    }
  }


  for (let i = 0; i<this.objects.length;i++) {
    let obj = this.objects[i];
    let objIE = new tb.IElement(this.name+'_'+i,
                               {top:500+Math.random()*200,left:800+Math.random()*200},
                               this.objectCaption(obj),
                               this);
    objIE.$.addClass('CLOUD OBJECT');
    objIE.obj = obj;
    objIE.wordsIE = {};
    this.objsIE.push(objIE);

    objIndex = {};
    if (this.fieldSet) {
      for (let f in fieldSet) {
        scan(obj[f],fieldSet[f]);
      }
    }
    else {
      for (let f in obj) {
        if (obj.hasOwnProperty(f)) scan(obj[f],1);
      }
    }
    for (let word in objIndex) {
      let e = this.wordsIE[word]
      if (e==undefined) {
        e = new tb.IElement(word,{top:300+Math.random()*200,left:300+Math.random()*200},word,this);
        e.$.addClass('CLOUD WORD');
        e.objectsIE = [];
        e.rank = 0;
        this.$.append(e.element$().css('cursor','pointer').click(tb.IWordCloud.clickHandler));
      }
      e.rank += objIndex[word];
      e.objectsIE.push(objIE);
      this.wordsIE[word] = e;
      objIE.wordsIE[word] = e;
    }
    this.$.append(objIE.element$().css('cursor','pointer').click(tb.IWordCloud.clickHandler));
  }

  return this.$;
}

tb.IWordCloud.prototype.focus = function(iE) {
  if (this.focusedIE) this.focusedIE.$.removeClass('FOCUSED');
  this.focusedIE = iE;
  this.focusedIE.$.addClass('FOCUSED');
}

tb.IWordCloud.prototype.animate = function(deltaT$ms){
  let ei,ej,f;
  let w = this.width();
  let h = this.height();
  for (let word in this.wordsIE) {
    this.wordsIE[word].prepareAnimation();
  }
  for (let i = 0;i<this.objsIE.length;i++) {
    this.objsIE[i].prepareAnimation();
  }

  tb.repulseIElements(tb.values(this.wordsIE),this.repulsionForce);
  tb.repulseIElements(this.objsIE,this.repulsionForce);

  // the focused iElement is only attracted by the center
  if (this.focusedIE) {
    if (this.focusedIE.obj) {
      this.focusedIE.applyForceToAll(tb.values(this.focusedIE.wordsIE),this.wordObjectForce);
      this.focusedIE.f = this.focusedForce(this.focusedIE,{p:{x:w*0.66,y:h*0.5}});
    }
    else {
      this.focusedIE.applyForceToAll(this.focusedIE.objectsIE,this.wordObjectForce);
      this.focusedIE.f = this.focusedForce(this.focusedIE,{p:{x:w*0.33,y:h*0.5}});
    }
  }

  for (word in this.wordsIE) {
    this.wordsIE[word]
    .bounceOnBorders(0,0,h,w)
    .animate(deltaT$ms);
  }
  for (let i = 0;i<this.objsIE.length;i++) {
    this.objsIE[i]
    .bounceOnBorders(0,0,h,w)
    .animate(deltaT$ms);
  }
  return this;
}

tb.IElement.prototype.wordCloud = function (name,css,arrayOfObjects,objectCaption) {
  return this.scene.add(new tb.IWordCloud(name,css,arrayOfObjects,objectCaption,this.scene));
}
