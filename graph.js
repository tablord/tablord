// graph.js
//
// This is module is a base for creating graphs of nodes
// 
//
// (CC-BY-SA 2018) Marc NICOLE according to https://creativecommons.org/
///////////////////////////////////////////////////////////////////////////////////////////////////////////////

  jc.GraphNode = function GraphNode(type,name,object,graph){
  // constructor of a new node
  // name is a unique id within type and the new object will be linked to graph
  // object is the original object used to create this GraphNode if any

    this.type = type;
    this.name = name;
    if (object) this.object = object;
    this.graph = graph;
    this.links = [];
    this.dist  = Infinity;
  }

  jc.GraphNode.prototype.caption = function() {
    return this._caption?'<span title='+this.name+'>'+this._caption+'</span>':this.name;
  }

  jc.GraphNode.prototype.css = function() {
    return this.graph.typesCss[this.type] || {};
  }

  jc.GraphNode.prototype.setCaption = function(caption) {
    this._caption = caption;
    return this;
  }

  jc.GraphNode.prototype.id = function() {
    return this.type+'_'+this.name;
  }

  jc.GraphNode.prototype.linkWith = function(type,name) {
  // creates a bidirectional link with the node (type,node)
  // if this node doesn't already exist or if the type doesn't already exists
  //   it will be created
  // if name === undefined nothing is done
    if (name === undefined) return this;
    var node = this.graph.node(type,name);
    this.linkNode(node);
    return this;
  }

  jc.GraphNode.prototype.linkNode = function(node){
  // link with a node
    if (node == undefined) return this;
    if ($.inArray(node,this.links) == -1) this.links.push(node);
    if ($.inArray(this,node.links) == -1) node.links.push(this);
    return this;
  }
  
  jc.GraphNode.prototype.linkCategories = function(categories,type,delimiter) {
  // link this node with the categories
  // - categories: a string containing categories separated by delimiters. if undefined==> does nothing
  // - type      : type unde which every category is registred as a node. by default type = "categories"
  // - delimiter : a string or RegExp. by default / +/
  // a node (type,category) is created for each category

    if (categories === undefined) return this;
    type = type || 'categories';
    delimiter = delimiter || / +/;
    var catArray = categories.split(delimiter);
    for (var i = 0;i<catArray.length;i++) {
      var c = this.graph.node(type,catArray[i]);
      this.linkNode(c);
      c.linkWith('_',type);
    }
    return this;
  }
    

  jc.GraphNode.prototype.setDist = function(dist,callback) {
  // recursively set the distance to this node and all links
  // YET all links have a distance of 1... may be changed in the future if needed
  // after the distance is calculated callback(node,dist) is called if callback!= undefined
  //   giving a chance to update according to its distance from the start)
  //   if callback returns false, stop the recusion process to node links.
  // if dist = 0 or undefined, first reset all node's dist to Infinity
    if (!dist) {
      this.graph.resetDist();
      dist = 0;
    }
    if (this.dist <= dist) return; // a shorter or same lenght path has already been found
    this.dist = dist;
    if (callback && (callback(this,dist) === false)) return;

    for (var i = 0;i < this.links.length; i++) {
      this.links[i].setDist(dist+1,callback);      
    }
    return this;
  }

  jc.GraphNode.prototype.focus = function () {
    this.graph.focus(this);
  }

  jc.GraphNode.prototype.toString = function() {
    return '[object GraphNode ('+this.id()+' dist:'+this.dist+')]';
  }



// Graph /////////////////////////////////////////////////////////////////

  jc.Graph = function Graph(name) {
  // constructor for Graph objects

    this.name = name;
    this.types = {};
    this.typesCss = {};
  }

  jc.makeInheritFrom(jc.Graph,jc.IElement);

  jc.Graph.prototype.node = function(type,name) {
  // get the specified node or creates it if needed
    if (!(type in this.types)) this.types[type] = {};
    var n = this.types[type][name];
    if (n) return n;
    return this.types[type][name] = new jc.GraphNode(type,name,undefined,this);
  }

  jc.Graph.prototype.eachNode = function(func) {
  // applys func(node) on each node of the graph
    for (var t in this.types) {
      for (var n in this.types[t]) {
        func(this.node(t,n))
      }
    }
  }
  
  jc.Graph.prototype.resetDist = function() {
  // reset all nodes dist to Infinity;
    this.eachNode(function(node){node.dist = Infinity});
  }


  jc.Graph.prototype.toString = function() {
    return '[object Graph '+this.name+']';
  }

  jc.Graph.prototype.span = function() {
    return jc.inspect(this.types,this.toString(),2).span();
  }

  jc.Graph.prototype.createCloud = function(name,css,maxDist) {
  // returns a cloud with elements representing nodes that have a dist <= maxDist
    this.cloud = jc.cloud(name || (this.name+'_scene'),css || {height:400});
    this.cloud.maxDist = (maxDist == undefined?Infinity:maxDist);
    this.cloud.centripetalForce = function(iE,center) {
      var dist = iE.node.dist;
      return jc.spring(dist*100,0.1)(iE,center);
    }
    this.linkForce = jc.spring(100,1);
    this.updateCloud();
    return this.cloud;
  }

  jc.Graph.prototype.updateCloud = function() {
  // update the node.iE
    var cloud = this.cloud;
    var linkForce = this.linkForce;
    this.eachNode(function(node) {
      if (node.dist <= cloud.maxDist) {
        if (node.iE == undefined) {
          node.iE = cloud.div(node.id(),{top:100,left:100,cursor:'pointer'},node.caption());
          node.iE.$.click(jc.Graph.clickHandler).css(node.css());
          node.iE.node = node;
        }
      }
      else {
        cloud.remove(node.iE);
        node.iE = undefined;
      }
    });
    this.eachNode(function(node) {
      if (node.iE) {
        node.iE.clearForces();
        for (var i = 0; i<node.links.length; i++) {
          if (node.links[i].iE) node.iE.addForce(node.links[i].iE,linkForce);
        }
        cloud.container$.append(node.iE.$);
      }
    });
    
    if (this.focusedNode) this.focusedNode.iE.$.addClass('FOCUSED');
    return this.cloud;
  }

  jc.Graph.clickHandler = function(event) {
    event.currentTarget.IElement.node.graph.focus(event.currentTarget.IElement.node);
  }
    
  jc.Graph.prototype.focus = function(node) {
    if (this.focusedNode) this.focusedNode.iE.$.removeClass('FOCUSED');
    this.focusedNode = node;
    node.setDist();
    if (this.cloud == undefined) return;
    this.updateCloud();
  }


  jc.graph = function(name) {
    var g = new jc.Graph(name);
    jc.vars[name] = g;
    return g
  }