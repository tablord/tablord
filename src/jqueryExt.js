// jqueryExt.js
//
// extentions of jquery mostly specific to Tablord 
//
// (CC-BY-SA 2019)Marc Nicole  according to https://creativecommons.org/
///////////////////////////////////////////////////////////////////////////////////////////////////////////////

  //JQuery extentions /////////////////////////////////////////////////

  $.fn.span = function() {
    var s = ['<ol start=0>'];
    for (var i=0; i < this.length; i++) {
      switch (this[i].nodeType) {
        case 1:
          s.push('<li class="INSPECTHTML">'+tb.toHtml(tb.trimHtml(tb.purgeJQueryAttr(this[i].outerHTML))));
          break;
        case 3:
          s.push('<li class="INSPECTHTML">textNode: "'+this[i].nodeValue+'"');
          break;
        default:
          s.push('<li class="INSPECTHTML">node type '+this.nodeType);
          break;
      }
    }
    s.push('</ol>');
    return new tb.HTML('JQuery of '+this.length+' elements<br>'+s.join('<br>'));
  };

  $.fn.toString = function(){
    return '[object JQuery] length:'+ this.length;
  };

  $.fn.inspectString = function(){
    var r = this.toString()+'\n';
    for (var i = 0;i<this.length;i++) {
      r += i+') '+this[i].outerHTML+'\n';
    }
    return r;
  };

  $.fn.asNode = function() {
    var query = this;
    return {node$:function() {return query}};
  };

  $.fn.itemscopeOrThis$ = function() {
    // return the wrapping itemscope of this if any or this otherwise
    // this must be a one element jQuery
    if (this.length !== 1) throw Error('must be a jquery of one element');
    var c$ = this.closest('[itemscope]');
    if (c$.length===1) return c$;
    return this;
  };
  
  
  $.fn.getItems = function(url) {
    // get the matching itemtypes that are descendent of the jquery
    // please note that if an itemtype is embeeded in another instance of itemtype, both will be part of the result
    return this.find('[itemtype~="'+url+'"]');
  };

  $.getItems = function(url) {
    // get all itemtype = url of the document.
    return $('[itemtype~="'+url+'"]');
  };

  $.fn.getItemProp = function(itemprop) {
    // get the first matching itemprop of the first elements of the jquery
    // all elements should be itemscope
    var e = this[0];
    return this.find('[itemprop='+itemprop+']').filter(function(){return $(this).closest('[itemscope=""]')[0] == e}).first().html();
  };

  $.fn.setItemProp = function(itemprop,html) {
    // set the itemprop of the elements of the jquery
    // all elements should be itemscope
    this.each(function(i,e) {
      $(e).find('[itemprop='+itemprop+']').filter(function(){return $(this).closest('[itemscope=""]')[0] == e}).html(html);
    });
    return this;
  };

  $.fn.getItemscopeMicrodata = function() {
    // this must be a single itemscope element jQuery
    // return the microdata under the scope as an object
    // {type:url,
    //  properties: {...},
    //  id:...}   //In addition to microdata specification

    if (! this.is('[itemscope=""]')) throw new Error('getItemscopeMicrodata must be called on a jquery having a itemscope');
    var result={id:this.attr('id') || undefined,
                type:this.attr('itemtype') || '',
                properties:this.children().getMicrodata()};
    return result;
  };

  $.fn.getItempropValue = function(){
    // return the value of an element handling all specifications of microdata of the getter of itemValue
    // if the element is a standard tag (not AUDIO...) and has a [[func]] attribute the return value is a tb.Var instance without name
    //   in that case this tb.Var is cached in the tbVar property of the element
    //   this is the responsibility of the application to destroy the cache when needed (typically tb.prepareExec)
    var tag = this.prop('tagName');
    if (this.attr('itemprop') === undefined) return null;
    if (this.attr('itemscope')) return this[0];
    if (tag === 'META') return this.attr('content');
    if ($.inArray(tag,['AUDIO','EMBED','IFRAME','IMG','SOURCE','TRACK','VIDEO'])!=-1) return this.attr('src');
    if ($.inArray(tag,['A','AREA','LINK'])!=-1) return this.attr('href');
    if (tag === 'OBJECT') return this.attr('data');
    if (tag === 'TIME') return moment(this.attr('datetime') || this.text());
    
    // simple values can be converted to numbers or moment
    var value; 
    if ($.inArray(tag,['DATA','METER','SELECT','INPUT'])!=-1) value = this.val();
    //--- this is not microdata but only valid in Tablord where the class number or date or duration can force
    else value = this.text();
    if (this.attr('func')) {
      var tbVar = this.prop('tbVar');
      if (tbVar) return tbVar;
      tbVar = new tb.Var(undefined,f(this.attr('func')));
      tbVar.sourceElement = this[0];
      this.prop('tbVar',tbVar); // store a direct link to the tb.Var object that contains the function
                                // so it will be easy to update the content at the end of calculation
      return tbVar;
    }
    if (this.hasClass('date')) return moment(value);
    if (this.hasClass('duration')) return moment(value);
    if (this.hasClass('number')) return Number(value);
    return value;
  }

  $.fn.setItemValue = function(value){
    // set the value of an element handling all specifications of microdata of the getter of itemValue
    var tag = this.prop('tagName');
    if (this.attr('itemprop') === undefined) throw new Error("can't set the itemprop value of an element that is not an itemprop\n"+e.outerHTML);
    else if (tag === 'META') this.attr('content',value);
    else if ($.inArray(tag,['AUDIO','EMBED','IFRAME','IMG','SOURCE','TRACK','VIDEO'])!=-1) this.attr('src',value);
    else if ($.inArray(tag,['A','AREA','LINK'])!=-1) this.attr('href',value);
    else if (tag === 'OBJECT') this.attr('data',value);
    else if ($.inArray(tag,['DATA','METER','SELECT','INPUT'])!=-1) this.attr('value',value).val(value); // set also the attribute, so it will be saved
    else if (tag === 'TIME') {
      this.attr('datetime',value);
    }
    else this.text(value);
    return this;
  }




  $.fn.getItemscopeData = function(remap) {
    // jquery must be a single itemscope element
    // - remap: an optional function that remaps the found itemprop in an object
    //
    var data = {};

    function set(itemprop,value) {
      if (itemprop.slice(-2) == '[]') {
        data[itemprop] = data[itemprop] || [];
        data[itemprop].push(value);
      }
      else {
        data[itemprop] = value;
      }
    }

    if (this.attr('id')) data._id = this.attr('id');
    this.children().each(function(i,element) {
      var e$ = $(element);
      var itemprop = e$.attr('itemprop');
      if (itemprop !== undefined) {
        if (e$.attr('itemscope') !== undefined) {
          set(itemprop,e$.getItemscopeData());
        }
        else {
          set(itemprop,e$.getItempropValue());
        }
      }
      else {  
        if (e$.attr('itemscope') === undefined) {
          // this node is not an itemprop nor an itemscope, look if its children have data
          // (that are considered at the same level seen from microdata persective)
          $.extend(true,data,e$.getItemscopeData());
        }
        else { // it should have an itemprop as it is a itemscope included in another
          set('item[]',e$.getItemscopeData()); // store the content in a item array
        }
      }

    });
    if (remap) data = remap(data);
    return data;
  }

  $.fn.getData = function(criteria,fields,remap) {
    // return data object for the jQuery, very similarly as a mongoDB .find
    // the object is NOT compatible with microdata (cf [[getMicroData]]), but much easier to use
    // even if not as flexible as microdata
    // it assumes that propertie's name that are arrays end with []
    // and all other properties have 0 or 1 value
    // this function assume that all jQuery elements are itemscope
    // So it is possible to get data from nested nodes
    // and is the responsibility of the caller to know what to do
    // the structure also set "_id" if id is defined at the itemscope element
    // - criteria: is an object defining what itemscope will be take in the set
    //             if remap, criteria compares *after* the remapping
    // - fields:   an object that describe the fields that are included in the returned data
    // - remap:    a function (data) that return a new object with the remapped fields
    result = [];
    this.each(function(i,element){
      var data = $(element).getItemscopeData(remap);
      if (tb.objMatchCriteria(data,criteria)) {
        if (fields == undefined){
          result.push(data);
        }
        else {
          var ro = {};
          for (var f in fields) {
            if (fields[f] == 1) ro[f] = data[f];
          }
          result.push(ro);
        }
      }
    });
    return result;
  }

  $.fn.getMicrodata = function(result) {
    // return microdata object for the jQuery.
    // the object is JSON compatible with the HTML Microdata specification
    // the only difference with the specifications is that the JQuery's element are
    // not checked for beeing top level microdata item. So it is possible to get microdata from nested nodes
    // and is the responsibility of the caller to know what to do
    // the parameter result is only intended for recusivity purpose and should be undefined
    // in addition to the microdata specifications, the structure also set "id" if id is defined at the itemscope element
    // see also [[getData]] for simple usage
    var result = result || {};
    this.each(function(i,e){
      var e$ = $(e);
      var itemprop = e$.attr('itemprop')
      if (itemprop) {
        if (result[itemprop] == undefined) result[itemprop] = [];
        if (e$.attr('itemscope') !== undefined) {
          result[itemprop].push(e$.getItemscopeMicrodata());
        }
        else {
          result[itemprop].push(e$.getItempropValue());
        }
      }
      else if (e$.attr('itemscope') !== undefined) {
        if (result.items === undefined) result.items = [];
        result.items.push(e$.getItemscopeMicrodata());
      }
      else { // just an intermediate node
        e$.children().getMicrodata(result);
      }
    });
    return result;
  }

  $.fn.setMicrodata = function(data) {
    // set the itemprop elements under all elements of the jQuery
    // all nodes of the jquery should be itemscope
    // if a node doesn't have an itemprop, "items" is assumed
    // PLEASE NOTE that data will be modified.
    // data is structured as JSON microdata specifies.
    // as all itemprop are arrays (since it is legal to have multiple itemprops having the same name)
    // every itemprop will "consume" the first element of the array
    this.each(function(i,e){
      var e$ = $(e);
      if (e$.attr('itemscope') !== undefined)  {
        var itemprop = e$.attr('itemprop') || 'item';
        var subData = data && data[itemprop] && data[itemprop].shift();
        if (subData !== undefined) {
          e$.children().setMicrodata(subData.properties);
        }
      }
      else {
        var itemprop = e$.attr('itemprop');
        if (itemprop) {
          var subData = data && data[itemprop] && data[itemprop].shift();
          if (subData) {
            e$.setItemValue(subData);
          }
        }
        else { //an intermedate node look if anything to set in its children
          e$.children().setMicrodata(data);
        }
      }
    });
    return this;
  }

  $.fn.filterFromToId = function(fromId,toId) {
    // filter the query to keep only query Element that are between the fromId element and toId element
    var inRange = false;
    return this.filter(function() {
      if (this.id === fromId) inRange=true;
      if (this.id === toId) inRange=false;
      return (this.id===toId) || inRange;
    })
  }

  $.fn.replaceTagName = function(newTagName) {
    // replace all element of this with a similar element having newTag
    this.replaceWith(function(){
      var newHtml = this.outerHTML.replace(/^<\w+([ >].*)<\/\w+>$/,'<'+newTagName+'$1</'+newTagName+'>');
      return newHtml;
    });
  }
  
  $.fn.replaceText = function(regExp,replacement,accept){
    // like string.replace(regExp,replacement), but only acts on text of the elements of the jQuery (not on the TAG or the attributes)
    // - accept: function(element) that return true if the text nodes of this element will be replaced
    //                                         undefined if the text nodes of this element will be untouched, but the children will be examined
    //                                         false if the element has to be completely skipped
    //
    // any text node that is part of this will be replaced (if the jquery was made with .contents()) (this is used internally in recusive search)
    accept = accept || function(){return true};

    for (var i = 0; i<this.length; i++) {
      switch (this[i].nodeType) {
        case 3:
          $(this[i]).replaceWith(this[i].nodeValue.replace(regExp,replacement));
          break;
        case 1:
          switch (accept(this[i])) {
            case true:
              $(this[i]).contents().replaceText(regExp,replacement,accept)
              break;
            case false:
              continue;
            case undefined:
              $(this[i]).children().replaceText(regExp,replacement,accept);
              break;
          }
          break;
      }
    }
    return this;
  }

  $.fn.neighbour$ = function(where) {
    // jQuery should be of 1 element and return the neighbour that corresponds 
    // to where.
    // in case, this is a CODE,OUTPUT or TEST, takes also into account
    // those elements to skip them properly
    //  - where: 'after', 'afterItemscope', 'before' or 'beforeItemscope'
    if (this.length !== 1) throw new Error('neighbourg$ needs a 1 element jQuery'+this.toString())
    
    var element$ = this;
    if (where==='beforeItemscope' || where==='afterItemscope') {
      element$ = element$.itemscopeOrThis$();
    }
    if (where==='after' || where==='afterItemscope') return element$.last();
    return element$.first();
  }


  tb.help.update($,'$.');
  tb.help.update($.fn,'$.prototype.');
