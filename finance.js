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
  var f = function account() {return account.execute()};
  this._orders.push(f);
  return account;
}

jc.CashFlow.prototype.debt = function(name,startDate,endDate,currency) {
  startDate= new Date(startDate || this._startDate);
  endDate = new Date(endDate || this._endDate);
  currency = currency || this.currency;
  var debt = new jc.CashFlow(name,startDate,endDate,currency,'debt',this);
  var f = function debt() {return debt.execute()};
  this._orders.push(f);
  return debt;
}

jc.CashFlow.prototype.recieve = function(subject,amount,date,currency) {
  // add an order of receiving amount at date. 

  // TODO does not handle currency conversion yet
  var f = function recieve() {return {date:new Date(date),amount:amount,subject:subject} };
  this._orders.push(f);
  return this;
}

jc.CashFlow.prototype.pay = function(subject,amount,date,currency) {
  var f = function pay() {return {date:new Date(date),amount:-amount,subject:subject} };
  this._orders.push(f);
  return this;
}

jc.CashFlow.prototype.monthly = function(startDate,endDate) {
  startDate = new Date(startDate || this._startDate);
  endDate = new Date(endDate || this._endDate);
  var permanentOrders = new jc.PermanentOrders(this);
  var f = function monthly() {
    var payments = [];
    for (var date = new Date(startDate); date <= endDate; date.setMonth(date.getMonth()+1)) {
      payments = payments.concat(permanentOrders.execute(new Date(date)));
    }
    return payments;
  };
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
  // returns the PARENT cashFlow in order to continue method chainning
  return (this._parent || this); // return the parent or itself if no parent in order to enable span()
}

jc.CashFlow.prototype.execute = function() {
  // execute all orders in order to create the ._payments 
  // it will also recalculate all nested orders
  // DOESN'T update the balance
  // returns the array of ._payments

  this._payments = [];
  for (var i in this._orders){
    this._payments = this._payments.concat(this._orders[i]())
  }
  return this._payments;
}
    

jc.CashFlow.prototype.span = function(options) {
  this.execute(); // finalize if needed this
  this.updateBalance();
  return '<var>'+this._name+'</var>'+table().addRows(this._payments).span(options);
}


// PermanentOrders ///////////////////////////////////////////////////////////////

//TODO: restructure PermanentOrders so that it is fully responsible for the execution
// the monthly methods will set the parameters, including a .nextDate field that will be 
// set to PermanentOrders.nextMonth or PermanentOrders.nextWeek or .nextYear


jc.PermanentOrders = function(parent) {
  this._orders = [];
  this._parent = parent;
}

jc.PermanentOrders.prototype.pay = function(subject,amount,day,currency){
  // 
  var f = function pay (d){return {date:d,amount:-amount,subject:subject}};
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