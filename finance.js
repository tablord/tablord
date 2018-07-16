jc.cashFlow = function cashFlow(name,startDate,endDate,currency) {
  return new jc.CashFlow(name,startDate,endDate,currency,'main',undefined);
}

jc.CashFlow = function(name,startDate,endDate,currency,type,parent) {
  this._name = name;
  this._startDate = new Date(startDate);
  this._endDate   = new Date(endDate);
  this._currency  = currency;
  this._parent = parent; // if this cashFlow is included in another CashFlow
  this._type = type;
  this._orders = [];   // of object that generates payments
  this._payments = []; // of {date,amount,subject}
  (parent || v)[name]=this;
}



jc.CashFlow.defaults = {
  duration : {year:10}, // 10 year by default
  currency : 'EUR'
}

jc.CashFlow.prototype.account = function(name,startDate,endDate,currency) {
  startDate= new Date(startDate || this._startDate);
  endDate = new Date(endDate || this._endDate);
  currency = currency || this.currency;
  var account = new jc.CashFlow(name,startDate,endDate,currency,'account',this);
  var f = function() {
    account.end();
    this._finalBalance = account._payments[account._payments.length-1].balance;
    return account._payments;
  };
  f.toString = function(){return jc.inspect(account._orders,'account ').toString()+account._payments.length+' payments'};
  this._orders.push(f);
  return account;
}

jc.CashFlow.prototype.debt = function(name,startDate,endDate,currency) {
  startDate= new Date(startDate || this._startDate);
  endDate = new Date(endDate || this._endDate);
  currency = currency || this.currency;
  var debt = new jc.CashFlow(name,startDate,endDate,currency,'debt',this);
  var f = function() {
    debt.end();
    var balance = debt._payments[debt._payments.length-1].balance;
    if (balance != 0) {
      debt._payments.push({date:endDate,amount:-balance,subject:'final balance for '+name,balance:0});
    }
    return debt._payments;
  };
  f.toString = function(){return jc.inspect(debt._orders,'debt').toString()+debt._payments.length+' payments'};
  this.ended = false;
  this._orders.push(f);
  return debt;
}

jc.CashFlow.prototype.recieve = function(subject,amount,date,currency) {
  // add an order of receiving amount at date. 

  // TODO does not handle currency conversion yet
  date= new Date(date);
  var f = function () {return {date:date,amount:amount,subject:subject} };
  f.toString = function(){return 'recieve/pay'}
  this._orders.push(f);
  return this;
}

jc.CashFlow.prototype.pay = function(subject,amount,date,currency) {
  return this.recieve(subject,-amount,date,currency);
}

jc.CashFlow.prototype.monthly = function(startDate,endDate) {
  startDate = new Date(startDate || this._startDate);
  endDate = new Date(endDate || this._endDate);
  var permanentOrders = new jc.PermanentOrders(this);
  var f = function () {
    var payments = [];
    for (var date = startDate; date <= endDate; date.setMonth(date.getMonth()+1)) {
      payments = payments.concat(permanentOrders.execute(date));
    }
    return payments;
  };
  f.toString = function(){return jc.inspect(permanentOrders._orders,'monthly').toString()};
  this._orders.push(f);
  return permanentOrders;
}

jc.CashFlow.prototype.updateBalance = function() {
  // update the balance field of each records
  // as records are shared between the different levels of cashFlow 
  // this function has to be called before reading any balance field
  var balance = 0;
  for (var i in this._payments) {
    balance += this._payments[i].amount;
    this._payments[i].balance = balance;
  }
}  
  
jc.CashFlow.prototype.end = function() {
  // updates the payments according to all previous orders
  // returns the PARENT cashFlow in order to continue method chainning

  this._payments = [];
  for (var i=0;i<this._orders.length;i++) {
    this._payments = this._payments.concat(this._orders[i](this));
a(this._orders[i].toString(),this._payments)
  }
  this._payments.sort(function(a,b){return a.date-b.date});
  this.updateBalance();
  return (this._parent || this); // return the parent or itself if no parent in order to enable span()
}

jc.CashFlow.prototype.span = function(options) {
  this.end(); // finalize if needed this
  return '<var>'+this._name+'</var>'+table().addRows(this._payments).span(options);
}

jc.PermanentOrders = function(parent) {
  this._orders = [];
  this._parent = parent;
}

jc.PermanentOrders.prototype.pay = function(subject,amount,currency){
  var f = function(d){return {date:d,amount:-amount,subject:subject}};
  f.toString = function(){return 'pay'};
  this._orders.push(f)
  return this;
}

jc.PermanentOrders.prototype.execute = function(date) {
  var payments = [];
  for (var i in this._orders) {
    payments.push(this._orders[i](new Date(date)));  // make sure that every date are independent !! (*&&%ç@ of Date system in js)
  }
  return payments;
}

jc.PermanentOrders.prototype.end = function() {
  return this._parent;
}

jc.PermanentOrders.prototype.toString = function() {
  return '[object PermanentOrders]';
}