// Date politics in jc.
// dates must be considered as unmutable. so if a date variable has to be changed,
// always make a v = new Date(v)
// ok:    v = (new Date(v)).setDate(25);
// wrong: v = v.setDate(25)   // or even v = new Date(v.setDate(25)) is wrong since it change v
//                            // so any d = v previously will see the date change!!!
//



jc.cashFlow = function cashFlow(name,startDate,endDate,currency) {
  return new jc.CashFlow(name,startDate,endDate,currency,'main',undefined);
}

jc.CashFlow = function(name,startDate,endDate,currency,type,parent) {
  this._name = name;
  this._startDate = new Date(startDate);
  this._endDate   = new Date(endDate);
  this._currency  = currency || (parent && parent._currency) || jc.CashFlow.defaults.currency;
  this._balanceField = name+'$'+this._currency;
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
  currency = currency || this._currency;
  var cf = this;
  var f = function pay() {
    var p = {date:new Date(date),subject:subject};
    p['amount$'+currency] = -amount,
    p['amount$'+cf._currency] = jc.Units.convert(-amount,currency,cf._currency);
    return p;
  };
  this._orders.push(f);
  return this;
}

jc.CashFlow.prototype.monthly = function(startDate,endDate) {
  // returns a PermanentOrder object configured to execute
  // the associated payments every month starting with startDate and ending 
  startDate = new Date(startDate || this._startDate);
  endDate = new Date(endDate || this._endDate);
  var permanentOrders = new jc.PermanentOrders(startDate,endDate,this);
  permanentOrders._nextDate = jc.PermanentOrders.nextMonth;
  var f = function monthly() {
    return permanentOrders.execute();
  };
  this._orders.push(f);
  return permanentOrders;
}

jc.CashFlow.prototype.updateBalance = function() {
  // update the balance field of each records
  // as records are shared between the different levels of cashFlow 
  // this function has to be called before reading any balance field
  var balance = 0;
  var amountField = 'amount$'+this._currency;
  for (var i in this._payments) {
    balance += this._payments[i][amountField];
    this._payments[i][this._balanceField] = balance;
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
  return this.convertToParentCurrency()._payments;
}

jc.CashFlow.prototype.convertToParentCurrency = function() {
  if ((this._parent == undefined) || (this._parent._currency == this._currency)) return this;
  var amountField = 'amount$'+this._currency;
  var parentAmountField = 'amount$'+this._parent._currency;
  for (var i in this._payments) {
    this._payments[i][parentAmountField] = jc.Units.convert(this._payments[i][amountField],this._currency,this._parent._currency);
  }
  return this;
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


jc.PermanentOrders = function(startDate,endDate,parent) {
  this._orders = [];
  this._startDate = startDate;
  this._endDate = endDate;
  this._parent = parent;
}

// some helpers functions

jc.PermanentOrders.nextMonth = function(date,day) {
  // return a date that is one month ahead than date
  var d = new Date(date);
  d.setMonth(date.getMonth()+1);
  return d;
}

jc.PermanentOrders.adjustDay = function(date,day) {
  // return a date that is the same month but different day if day is not undefined
  var d = new Date(date);
  if (day != undefined) d.setDate(day);
  return d;
}

jc.PermanentOrders.prototype.pay = function(subject,amount,day,currency){
  // 
  var f = function pay (d){return {date:jc.PermanentOrders.adjustDay(d,day),amount:-amount,subject:subject}};
  this._orders.push(f)
  return this;
}

jc.PermanentOrders.prototype.execute = function() {
  var payments = [];
  for (var date = new Date(this._startDate);date <= this._endDate;date = this._nextDate(date)) {
    for (var i in this._orders) {
      payments.push(this._orders[i](date));
    }
  }
  return payments;
}

jc.PermanentOrders.prototype.end = function() {
  return this._parent;
}

jc.PermanentOrders.prototype.toString = function() {
  return '[object PermanentOrders]';
}