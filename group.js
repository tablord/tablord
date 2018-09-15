// Groups ////////////////////////////////////////////////////////////////
// a class that regroups names that are linked togther 


jc.Groups = function() {
  this.names = {};  //{name1:1,name2:1,name3:0}
  this.groups = {}; //{0:[name3],1:[name1,name2]}
  this.nextGroupNumber = 0;
}

jc.Groups.prototype.regroup = function(names) {
  //names: array of names
  //regroup the different names under one single group number
  //if names are not known in different groups, a new group number will be given
  var currentGroupNumber = this.nextGroupNumber++;
  var currentGroup = this.groups[currentGroupNumber] = [];  // new empty group
  for (var i in names) {
    var name = names[i];
    var g = this.names[name];
    if (g == undefined) {
      currentGroup.push(name);
      this.names[name] = currentGroupNumber;
    }
    else {
      if (g != currentGroupNumber) { //we must merge g and currentGroup
        for (var j in currentGroup) {
          this.names[currentGroup[j]] = g;
          this.groups[g].push(currentGroup[j]);
        }
        currentGroup = this.groups[g];
        delete this.groups[currentGroupNumber];
        currentGroupNumber = g;
      }
      //else nothing to do, since name is already in the right group
    }
  }
  return this;
}

jc.Groups.prototype.toString = function() {
  return '[object Groups]';
}

jc.Groups.prototype.span = function() {
  return '<fieldset><label>'+this.toString()+'</label>'+jc.inspect(this.names,'names').span()+jc.inspect(this.groups,'groups').span()+'</fieldset>';
}  
