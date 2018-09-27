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

jc.JcWordCloud = function(name,css,wordIndex,scene) {
  jc.JcElement.call(this,name,css,'',scene);
  this.wordIndex = wordIndex;
  this.elements = [];
  for (var i = 0; i<wordIndex.index.length; i++) {
    this.elements.push(new Jc.Element(this.name+i,{},wordIndex.Index[i],scene));
//TODO, ajouter les ressorts entre les mots de l'index: ?? = ajouter d�j� les objets????
  }
}

$.extend(jc.JcWordCloud.prototype,jc.JcElement.prototype);




jc.WordIndex.prototype.control = function() {
  var h = '<DIV id='+this.id+' class=IELEMENT'+this.attributes()+this.style()+'>';
  for (var i = 0; i<this.elements.length; i++) {
    h += this.elements[i].control();
  }
  h += '</DIV>';
  return h;
}