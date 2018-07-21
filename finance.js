// Date politics in jc.
// dates must be considered as unmutable. so if a date variable has to be changed,
// always make a v = new Date(v)
// ok:    v = (new Date(v)).setDate(25);
// wrong: v = v.setDate(25)   // or even v = new Date(v.setDate(25)) is wrong since it change v
//                            // so any d = v previously will see the date change!!!
//



jc.cashFlow = function cashFlow(name,currency,startDate,endDate) {
  // returns a new CahFlow object of type 'main'
  return new jc.CashFlow(name,currency,startDate,endDate,'main',undefined);
}

jc.CashFlow = function(name,currency,startDate,endDate,type,parent) {
  this._name = name;
  this._startDate = new Date(startDate);
  this._endDate   = new Date(endDate);
  if (jc.Units[currency] == undefined) throw new Error('a CashFlow object must have a valid currency: unknown '+currency);
  this._currency  = currency;
  this._balanceField = name+'$'+this._currency;
  this._parent = parent; // if this cashFlow is included in another CashFlow
  this._type = type;
  this._orders = [];   // of object that generates payments
  this._payments = []; // of {date,amount,subject}
  (parent || v)[name]=this;
}

jc.CashFlow.defaults = {
}

jc.CashFlow.prototype.account = function(name,currency,startDate,endDate) {
  currency = currency || this._currency;
  startDate= new Date(startDate || this._startDate);
  endDate = new Date(endDate || this._endDate);
  var account = new jc.CashFlow(name,currency,startDate,endDate,'account',this);
  var f = function account() {return account.execute()};
  this._orders.push(f);
  return account;
}

jc.CashFlow.prototype.debt = function(name,currency,startDate,endDate) {
  currency = currency || this._currency;
  startDate= new Date(startDate || this._startDate);
  endDate = new Date(endDate || this._endDate);
  var debt = new jc.CashFlow(name,currency,startDate,endDate,'debt',this);
  var f = function debt() {return debt.execute()};
  this._orders.push(f);
  return debt;
}

jc.CashFlow.prototype.recieve = function(date,subject,amount,currency) {
  // add an order of receiving amount at date. 
  // currency is optional and uses by default this CashFlow currency
  currency = currency || this._currency;
  var cf = this;
  var f = function recieve() {
    var p = {date:new Date(date),subject:subject};
    p['amount$'+currency] = amount,
    p['amount$'+cf._currency] = jc.Units.convert(amount,currency,cf._currency);
    return p;
  };
  this._orders.push(f);
  return this;
}

jc.CashFlow.prototype.pay = function(date,subject,amount,currency) {
  // add an order of payement of amount
  // currency is optional and uses by default this CashFlow currency
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
  var t = table().addRows(this._payments).sort({date:1});
  options = $.extend(true,{},{cols:t._cols,format:function(f){return f.yyyymmdd().fixed(2).undefinedToBlank()}},{cols:{subject:{style:"text-align:left;"}}},options);
  return '<var>'+this._name+'</var>'+t.span(options);
}


// PermanentOrders ///////////////////////////////////////////////////////////////


jc.PermanentOrders = function(startDate,endDate,parent) {
  this._orders = [];
  this._startDate = startDate;
  this._endDate = endDate;
  this._parent = parent;
  this._currency = parent._currency;
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

jc.PermanentOrders.prototype.pay = function(subject,amount,currency,day){
  // pays within the permanent odrer the amount for that subject
  // currency is by default the currency of the permanent order

  currency = currency || this._currency;
  var cf = this;
  var f = function pay(d) {
    var p = {date:jc.PermanentOrders.adjustDay(d,day),subject:subject};
    p['amount$'+currency] = -amount,
    p['amount$'+cf._currency] = jc.Units.convert(-amount,currency,cf._currency);
    return p;
  };
  this._orders.push(f);
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