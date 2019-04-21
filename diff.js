tb.diff = function (t1,t2) {
  return (new tb.Diff(t1,t2)).execute()
}

tb.diffFiles = function (fileName1,fileName2) {
  var t1 = tb.fso.readFile(fileName1);
  var t2 = tb.fso.readFile(fileName2);
  return tb.diff(t1,t2);
}

tb.Diff = function (t1,t2) {
  this.l1 = $.map(t1.split('\n'), function(l,i) {return {i1:i,line:l};});
  this.l2 = $.map(t2.split('\n'), function(l,i) {return {i2:i,line:l};});
  var mods = [];
  this.i1 = 0;
  this.i2 = 0;
}
tb.Diff.className = 'tb.Diff';


tb.Diff.prototype.markIdentical = function () {
  // mark identical lines using the 2 indexes this.i1 and this.i2
trace('markIdentical start @',this.l1[this.i1],this.l2[this.i2])
  while ((this.i1 < this.l1.length) && (this.i2 < this.l2.length)) {
    if (this.l1[this.i1].line != this.l2[this.i2].line) {
trace('...found diff',this.l1[this.i1],this.l2[this.i2])
      return this;
    }
    this.l1[this.i1].status = '=';
    this.l2[this.i2].status = '=';
    this.i1++;
    this.i2++;
  }
trace('...end of 1 text')
  return this;
}

tb.Diff.prototype.resynchronize = function () {
  // assumes that the lines at current index are not identical
  // tries to resynchronize

  function search(line, lines,start) {
    // search line in lines[start...]
    // returns the index where line was found or -1 if not found
    for (var i = start; i < lines.length;i++) {
      if (line.line === lines[i].line) return i;
    }
    return -1;
  }

trace('resynchronize',this.i1,this.i2)
  var lost1 = this.i1;
  var lost2 = this.i2;
  while ((this.i1 < this.l1.length) && (this.i2 < this.l2.length)) {
trace('resynchronize; before search',this.l1[this.i1],this.l2[this.i2])

    var s2 = search(this.l1[this.i1],this.l2,lost2);
    var s1 = search(this.l2[this.i2],this.l1,lost1);
trace('  after search s1='+s1+' s2='+s2)
    if ((s1 === -1) && (s2 === -1)) {
trace('  no match')
      this.i1++;
      this.i2++;
      continue;
    }
    if ((s1 != -1) & (s2 != -1)) {
trace('  2 matches. get the shortest path')
      if ((s1-lost1) > (s2-lost2)) {
        s1 = -1; // just to make s2 win
      }
      else {
        s2 = -1;
      }
    }
    if (s2 !== -1) {
      this.i2 = s2;
trace('  s2',this.l1[this.i1],this.l2[this.i2])
      this.markDiff(lost1,this.i1,lost2,this.i2);
      return this;
    }
    if (s1 !== -1) {
      this.i1 = s1;
trace('  s1',this.l1[this.i1],this.l2[this.i2])
      this.markDiff(lost1,this.i1,lost2,this.i2);
      return this;
    }
trace('NEVER BE HERE')
  }
  this.i1 = this.l1.length;
  this.i2 = this.l2.length;
  this.markDiff(lost1,this.i1,lost2,this.i2);
  return this;
}

tb.Diff.prototype.markDiff = function (begin1,end1,begin2,end2) {
  // mark the lines of 1 as '-' (deleted) between begin1(included) and end1(not included)
  //  and the lines of 2 as '+' (aded) between begin2(included) and end2(notincluded)
trace('....markDiff('+begin1+','+end1+','+begin2+','+end2+')');

  for (var i=begin1; i<end1;i++) {
    this.l1[i].status='-';
  }
  for (var i=begin2; i<end2;i++) {
    this.l2[i].status='+';
  }
}


tb.Diff.prototype.execute = function () {
  // execute the diff
trace('execute',this.i1,this.i2)
  while ((this.i1 < this.l1.length) && (this.i2 < this.l2.length)) {
    this.markIdentical();
    this.resynchronize()
  }
  return this;
}


tb.Diff.prototype.span = function () {
  var h = '';
  var s1=0;
  var s2=0;
  var i1=0;
  var i2=0;

  while ((i1 < this.l1.length) && (i2 < this.l2.length)) {
    while ((i1 < this.l1.length) && (this.l1[i1].status==='=') &&
           (i2 < this.l2.length) && (this.l2[i2].status==='=')) {
      i1++;
      i2++;
    }
    h += '<pre class="DIFF EQUAL">';
    $.each(this.l1.slice(s1,i1),
        function(i,e) {h +='='+tb.pad(s1+i,4)+','+tb.pad(s2+i,4)+' '+tb.toHtml(e.line)+'<br>'});
    h +='</pre>';
    s1 = i1;
    s2 = i2;

    while ((i1 < this.l1.length) && (this.l1[i1].status==='-')) {
      i1++;
    }
    h += '<pre class="DIFF DEL">';
    $.each(this.l1.slice(s1,i1),function(i,e) {h += '-'+tb.pad(s1+i,4)+',     '+tb.toHtml(e.line)+'<br>'});
    h +='</pre>';
    s1 = i1;

    while ((i2 < this.l2.length) && (this.l2[i2].status==='+')) {
      i2++;
    }
    h += '<pre class="DIFF ADD">';
    $.each(this.l2.slice(s2,i2),function(i,e) {h += '+    ,'+tb.pad(s2+i,4)+' '+tb.toHtml(e.line)+'<br>'});
    h +='</pre>';
    s2 = i2;
  }
  return tb.html(h);
}
