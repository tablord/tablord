  // Template //////////////////////////////////////////////////////////////////////////

  tb.Template = function Template(url){
    // Template objects are generators of DOM ELEMENT
    // there is one single instance for any number of DOM instances
    // for example Template('https://tablord.com/templates/code') is the Template object of all CODE Elements
    // normally users create template through the [[tb.template]] function
    // - url: set the url field of the Template
    this.url = url;
  };

  tb.Template.className = 'tb.Template';

  Object.defineProperty(tb.Template.prototype,'name',{
    // get the default name. a template can replace the name by supplying it in the tb.template function
    // name is just more convenient for the user, but only the url is the identified
    get: function() {return tb.Template.urlToName(this.url)} // the name is just the last part after /
  })


  tb.Template.prototype.insertNew = function(element,where,itemprop) {
    // insert this Template close to element as an itemprop
    // - element where to calculate the insertion
    // - where: 'after', 'afterItemscope', 'before' or 'beforeItemscope'
    //   (that can be element itself) as insert point
    // - itemprop if not '' or undefined will force the itemprop of the template

    var element$ = $(element).neighbour$(where);
    var newElement$ = this.element$()
    if (itemprop) newElement$.attr('itemprop',itemprop)
    var after = (where==='after' || where === 'afterItemscope');
    if (after) newElement$.insertAfter(element$)
    else       newElement$.insertBefore(element$);
    tb.selectElement(newElement$[0]);
    tb.setModified(true);
    tb.run();
  }

  tb.Template.prototype.convert = function(element,itemprop) {
    // convert element to template(name) as itemprop

    var e$ = $(element);
    var microdata = $.extend(true,e$.data('itemData') || {},e$.getMicrodata());
    var id = e$.attr('id');
    var containers = $.extend(true,e$.data('containers') || {},tb.Template.getElement$Containers(e$));
    var k = tb.keys(microdata);
    if (k.length > 1) throw new Error('element.convert error: microdata has more than 1 head key\n'+tb.toJSCode(microdata));
    var newData = {};
    newData[itemprop || 'item'] = microdata[k[0]] || {};
    var new$ = this.element$(itemprop,id);
    if (this.convertData) {
      this.convertData(microdata,new$);
    }
    else {
      new$.setMicrodata(newData);
      tb.Template.setElement$Containers(new$,containers);
    }
    new$
    .data('itemData',newData) // keep data in a element property so it can retrieve lost data in case of a convertion mistake (not handling all fields)
    .data('containers',containers);

    if (tb.selected.element===element) {
      e$.replaceWith(new$);
      tb.selectElement(new$[0]);
    }
    else {
      e$.replaceWith(new$);
    }
    return this;
  }

  tb.Template.prototype.element$ = function(itemprop) {
    // return a jQuery containing a new instance of this Template as itemprop and setting its id
    if (this.html === undefined) throw new Error('in order to define a template at least define .fields, .html or .element$()');
    var new$ = $(this.html).attr('id',tb.blockId('item'));
    if (itemprop) new$.attr('itemprop',itemprop);
    new$.attr('itemscope','').attr('itemtype',this.url);
    return new$;
  }

  tb.Template.prototype.toString = function() {
    // return a string for a template
    return 'template '+this.name+' created ['+this.url+']';
  }

  tb.Template.prototype.span = function() {
    // return an html object representing the this Template
    return tb.html('template '+this.name+' created [<a href="'+this.url+'">'+this.url+'</a>]');
  }

  tb.Template.prototype.find = function(criteria,fields) {
    // return the data of a template collection as mongodb would do using criteria and returning only the specified fields

    return tb.getItems$(this.url()).getData(criteria,fields,this.remap);
  }

  tb.Template.prototype.table = function(criteria,fields) {
    // return a table of all data matching the optional criteria containing only the specified fields
    return table().addRows(tb.getItems$(this.url()).getData(criteria,fields,this.remap));
  }

  tb.Template.microdataToData = function(microdata) {
    // transforms the microdata structure where all properties are array into a structure
    // closer to mongoBD.
    // in order to do so:
    // - properties which names end with [] will be kept as array
    // - properties which names do not end with [] will be transformed as the value of the first element
    //   of the array. if the array has more than one element, an Error will be raised.
    a('TODO not yet implemented')
  }

  tb.Template.getData = function(element$) {
    // get the Data (the simplified version of microdata) of element$
    // - element$: a jquery of 1 element that must have an itemscope attribute
    // - criteria: a [[criteria]] or undefined (= take all)
    // - fields: a [[fields]] selector object or undefined (all fields)
    // return the data of that element, possibly remaped, if itemtype correspond to 
    // a registered remplate
    var itemtype = element$.attr('itemtype');
    var remap;
    if (itemtype) {
      var t = tb.templates[itemtype];
      remap = t && t.remap;
    }
    var data = element$.getItemscopeData(remap);
    var section = element$.parent().closest('.SECTION')
    if (section.length === 1) {
      data._section = section.attr('id');
    }
    return data;
  }

  tb.Template.urlToName = function(url) {
    // return the name from the url
    if (url === undefined) return undefined;
    return url.match(/(.*\/)?([^\.]*)/)[2];
  }

  tb.Template.moveContainerContent = function(oldElement$,newElement$) {
    // NOT YET IMPLEMENTED
    // move into newElement$ all Container's content found in oldElements$
    // both oldElement$ and newElement$ should be jquery with one single element to give predictable results

  }

  tb.Template.setElement$Containers = function(element$,containers){
    // move the content of the different containers stored in containers into the containers of element$
    // - element$  a jQuery of 1 element that potentially has embedded containers
    // - containers an object {containerName:jQueryOfContentOfContainer,....}
    element$.children().each(function(i,e) {
      var e$ = $(e);
      var containerName = e$.attr('container');
      if (containerName) {
        e$.empty();
        if (containers[containerName]) {
          containers[containerName].appendTo(e$);
        }
      }
      else {
        tb.Template.setElement$Containers(e$,containers);
      }
    });
  }

  tb.Template.getElement$Containers = function(element$,containers){
    // returns a object {containerName:jqueryOfcontentOfThisContainer,....} with all containers of element$
    // the containers parameter is normally undefined, but needed for the recursive search
    //    all containers found will be added to containers
    containers = containers || {};
    element$.children().each(function(i,e) {
      var containerName = $(e).attr('container');
      if (containerName) {
        containers[containerName] = $(e).children();
      }
      else {
        tb.Template.getElement$Containers($(e),containers);
      }
    });
    return containers;
  }



  tb.updateTemplateChoice = function () {
   // dummy so far, will be trully defined later on when creating menu;

  };

  tb.template = function(newTemplate,itemprop) {
    // create a new template and register it
    // it will inherit from tb.Template
    // - newTemplate: is a simple object that must at least define
    // .name: a name like an id optionaly followed by #version
    //
    // and must define one of the 3
    // .fields: {field1:{options},field2:{options}....}
    //          field1 is the name of the field if field name ends with [] the field is an array of values
    //
    //          options is an object
    //          types
    //          - number:{}                     the field is a number
    //          - string:{}                     the field is a string:  default if nothing is specified
    //          - func:function(data){...}  the field is calculated (=> readonly) and the html is the result of this function
    //          - select:{choice1:val1,choice2:val2...) the field is a SELECT
    //          - container:"template1 template2"    
    //                 a container that accepts the specified template names and how the itemprop . if "", accepts anything
    //
    //          formating
    //          - label: specifies the label in front of the field. by default fieldName
    //
    //    if fields is defined, standard html code will automatically be generated
    //    so do not define .fields if you want to define .html
    // .html: a string representing the html code of the template
    // .element$: a function() returning a DOM Element; normally not defined and inherited form tb.Template
    // .insertNew:  function(element,where,itemprop) that can override the default behaviour to insert before or after another element
    //              those function can help to create complex html (instead of .element$) depending on the context of where to insert the template
    // .remap: a function(data) that will return a new object based on data (that is the object collecting all itemprop of one template instance)
    //         this can be used to have for example native Date object instead of a string or combining two fields in one etc..

    itemprop = itemprop || newTemplate.name;
    var newT = new tb.Template(newTemplate.name);
    $.extend(newT,newTemplate)
    if (newTemplate.fields) {
      var h = '<DIV class="ELEMENT" itemprop="'+itemprop+'" itemscope itemtype="'+newT.url()+'"><TABLE width="100%">';
      for (var f in newTemplate.fields) {
        var label = f.label || f;
        if (newTemplate.fields[f].container) {
          h += '<TR><TH>'+label+'</TH><TD class=LEFT><DIV container="'+f+'" templates="'+newTemplate.fields[f].container+'"></DIV></TD></TR>';
        }
        else {
          h += '<TR><TH>'+label+'</TH><TD class=LEFT width="90%"><DIV class="FIELD EDITABLE" itemprop="'+f+'"></DIV></TD></TR>';
        }
      }
      newT.html = h + '</TABLE></DIV>';
    }
    tb.templates[newT.url] = newT;
    tb.updateTemplateChoice();
    var elementsToConvert$ = $('[itemtype="'+newT.url+'"]');  //TODO not sure it's a good idea to always convert
    elementsToConvert$.each(function(idx,e){newT.convert(e,e.itemprop || 'item')});
    return newT;
  }

  tb.template({
    url : 'https://tablord.com/templates/paste',
    element$: function() {
      return $('.CUT').detach().removeClass('CUT');
    }
  });

  tb.template({
    url : 'https://tablord.com/templates/code',
    element$: function() {
      return $('<PRE class="ELEMENT CODE EDITABLE" id='+tb.blockId('code')+'>');
    },
    convertData: function(data,element$) {element$.html('Object('+tb.toJSCode(data)+')')}
  });

  tb.template({
    url : 'https://tablord.com/templates/section',
    element$ : function() {
      var n$ = $('<DIV  class="ELEMENT SECTION" id='+tb.blockId('sect')+'></DIV>')
               .append('<H1 class="SECTIONTITLE EDITABLE"></H1>')
               .append('<DIV class="INDENT" container=""><DIV  class="ELEMENT RICHTEXT EDITABLE" id='+tb.blockId('rich')+'></DIV>');
      return n$;
    }
  });

  tb.template({
    url : 'https://tablord.com/templates/richText',
    element$: function() {
      return $('<DIV  class="ELEMENT RICHTEXT EDITABLE" id='+tb.blockId('rich')+'>');
    }
  });

  tb.template({
    url : 'https://tablord.com/templates/page_break',
    element$ : function() {
      var n$ = $('<DIV  class="ELEMENT PAGEBREAK" id='+tb.blockId('page')+'></DIV>');
      return n$;
    }
  });


  tb.template({
    url : 'https://tablord.com/templates/time_frame',
    element$ : function() {
      return $('<div class="ELEMENT" id="'+tb.blockId('tfrm')+'" itemscope itemtype="'+this.url()+'">'+
               '<div>Du <input type="date" itemprop="fromDate"> <input type="time" itemprop="fromTime"> '+
                    'au <input type="date" itemprop="toDate"> <input type="time" itemprop="toTime"> '+
                    '(durée :<time itemprop="duration"></time>)</div>'+
                '<h2 class="EDITABLE" itemprop="title">&nbsp;</h2>'+
                '<div container="item[]"></div>');
    },
    exec: function(element) {
      var data = $(element).getItemscopeData()
      // to ensure the data persistance when saved, set the value attr with the current value
      $('[itemprop=fromDate]',element).attr('value',data.fromDate);
      $('[itemprop=fromTime]',element).attr('value',data.fromTime);
      $('[itemprop=toDate]',element).attr('value',data.toDate);
      $('[itemprop=toTime]',element).attr('value',data.toTime);
      data = this.remap(data)
      if (isNaN(data.duration)) {
        $('[itemprop=duration]',element).text('NaN');
      }
      else {
        $('[itemprop=duration]',element).text(data.duration.format('hh[h]mm'));
      }
    },
    remap: function(data){
      var from = moment(data.fromDate +' '+ data.fromTime);
      var to   = moment(data.toDate + ' '+ data.toTime);
      var duration = moment.duration(to-from);
      $.extend(data,{from:from,to:to,duration:duration,title:data.title,_id:data._id});
      delete data.fromDate;
      delete data.fromTime;
      delete data.toDate;
      delete data.toTime;
      return data;
    }
  });
    
  tb.template({
    url:'https://tablord.com/templates/quoteHead',
    html:'<div class="ELEMENT FLEX" itemscope>'+
           '<div class="ELEMENT EDITABLE c-9">description</div>'+
           '<div class="ELEMENT EDITABLE RIGHT c-1">Quantity</div>'+
           '<div class="ELEMENT EDITABLE RIGHT c-1">price/unit</div>'+
           '<div class="ELEMENT VIEW     RIGHT c-1">total</div>'+
         '</div>'
  });
  
  tb.template({
    url:'https://tablord.com/templates/quoteLine',
    html:'<div class="ELEMENT FLEX" itemprop="quote" itemscope>'+
           '<div class="ELEMENT EDITABLE c-9" itemprop="description"></div>'+
           '<div class="ELEMENT EDITABLE number c-1" itemprop="quantity"></div>'+
           '<div class="ELEMENT EDITABLE number c-1" itemprop="pricePerUnit"></div>'+
           '<div class="ELEMENT VIEW     number c-1" itemprop="totalLine" func="quantity*pricePerUnit" format="0,000.00"></div>'+
         '</div>'
  });
  
  tb.template({
    url:'https://tablord.com/templates/quoteTotal',
    html:'<div class="ELEMENT FLEX" itemprop="quote" itemscope>'+
           '<div class="ELEMENT EDITABLE c-11" itemprop="description">Total</div>'+
           '<div class="ELEMENT VIEW     number c-1" itemprop="total" func="item.sum(\'totalLine\')" format="0,000.00"></div>'+
         '</div>'
  });
  
  tb.template({
    url:'https://tablord.com/templates/quoteSectionTotal',
    html:'<div class="ELEMENT FLEX" itemprop="quote" itemscope>'+
           '<div class="ELEMENT EDITABLE c-11" itemprop="description">Total</div>'+
           '<div class="ELEMENT VIEW     number c-1" itemprop="total" func="item.sum(\'totalLine\',{_section:\'change here\')" format="0,000.00"></div>'+
         '</div>'
  });
