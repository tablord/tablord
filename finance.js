// Date politics in jc.finance.
// dates must be considered as unmutable. so if a date variable has to be changed,
// always make a v = new Date(v)
// ok:    v = (new Date(v)).setDate(25);
// wrong: v = v.setDate(25)   // or even v = new Date(v.setDate(25)) is wrong since it change v
//                            // so any d = v previously will see the date change!!!
//

// some new Date methods

Date.prototype.nextMonth = function nextMonth() {
  // return a date that is one month ahead than date
  var d = new Date(this);
  d.setMonth(d.getMonth()+1);
  return d;
}

Date.prototype.adjustDay = function AdjustDay(day) {
  // return a date that is the same month but different day if day is not undefined
  var d = new Date(this);
  d.setDate(day);
  return d;
}


//////////////////////////////////////////////////////////////////////////////

jc.finance = {
  defaults:{
    format:function(f){return f.yyyymmdd().fixed(2).undefinedToBlank()}
  }
}



//////// Order /////////////////////////////////////////////////////////////////////////////////////////////////
// an Order is the basic class of all finance module and must have the 2 following functions
// .execute(currency)  recalculate its internal state and returns an array of events
//                     which are simple objects {date,subject,
//                                       [amount$currency if a payement/receivable],
//                                       [budget$currency if budget adjusment],
//                                       name$currency the total off the account after this event if account
//                                                     the remaining budget if budget
// .span()     display this order
////////////////////////////////////////////////////////////////////////////////////////////////////////////////               



jc.finance.Order = function(date,subject,amount,currency){
  this._date = new Date(date);
  this._subject = subject;
  this._amount = amount;
  this.initCurrency(currency);
}

jc.finance.Order.prototype.initCurrency = function(currency) {
  if (jc.Units[currency] == undefined) throw new Error('an Order object must have a valid currency: unknown '+currency);
  this._currency = currency;
  this._amountField = 'amount$'+currency;
}

jc.finance.Order.prototype.convertTo = function(currency) {
  if ((currency == undefined) || (currency == this._currency)) return this;
  var amountField = 'amount$'+this._currency;
  var toAmountField = 'amount$'+currency;
  for (var i in this._payments) {
    this._payments[i][toAmountField] = jc.Units.convert(this._payments[i][amountField],this._currency,currency);
  }
  return this;
}

jc.finance.Order.prototype.setDate = function(date) {
  // set the date.
  // the main purpose of this method is to be overridden so it can adjust the date in permanent orders
  this._date = date;
  return this;
}

jc.finance.Order.prototype.execute = function(currency,date) {
  // if currency != undefined, also creates a field for that currency if needed
  // if date != undefined calls .setDate(date) to change the date
  // returns an array of one single payement
  var p = {date : date || this._date,subject : this._subject};
  p[this._amountField] = this._amount;
  this._payments = [p];  // overkill to use an array for one single payment, but enables to use generic convertTo
  this.convertTo(currency);
  return this._payments;
}

jc.finance.Order.prototype.span = function() {
  return jc.finance.defaults.format(jc.format(this._date))+' '+ this._subject+' '+this._amount+' '+this._currency;
}

jc.finance.Order.prototype.toString = function() {
  return '[object Order]';
}

// Account  //////////////////////////////////////////////////////////////////////////////////////////

jc.cashFlow = function Account(name,currency,startDate,endDate) {
  // returns a new Account object of type 'main'
  return new jc.finance.Account(name,currency,startDate,endDate,undefined);
}

jc.finance.Account = function(name,currency,startDate,endDate,parent) {
  this._name = name;
  this._startDate = new Date(startDate);
  this._endDate   = new Date(endDate);
  this.initCurrency(currency);
  this._balanceField = name+'$'+this._currency;
  this._parent = parent; // if this cashFlow is included in another CashFlow
  this._orders = [];   // of object that generates payments
  this._payments = []; // of {date,amount$currency...,subject}
  (parent || v)[name]=this;
}

$.extend(jc.finance.Account.prototype,jc.finance.Order.prototype);

jc.finance.Account.prototype.account = function(name,currency,startDate,endDate) {
  // create a new account inside a Account object
  // returns the newly created account for method chaining (use .end() to get this again
  
  try {
    currency = currency || this._currency;
    startDate= new Date(startDate || this._startDate);
    endDate = new Date(endDate || this._endDate);
    var account = new jc.finance.Account(name,currency,startDate,endDate,this);
    this._orders.push(account);
    return account;
  }
  catch (e) {
    throw new Error(e.message += '<br><u><b>account</b></u> '+jc.finance.help(jc.finance.CashFlow.prototype.account));
  }
}

jc.finance.Account.prototype.budget = function(name,currency,startDate,endDate) {
  // create a new budget inside a CashFlow object
  // a budget is like an account but it has a special field budget$currency
  // a .pay or .recieve changes the account$currency field and the budget field
  // but .adjust only affects the budget field
  try {
    currency = currency || this._currency;
    startDate= new Date(startDate || this._startDate);
    endDate = new Date(endDate || this._endDate);
    var budget = new jc.finance.Budget(name,currency,startDate,endDate,this);
    var f = function budget() {return budget.execute()};
    this._orders.push(f);
    this._budgetField = 'budget '+name+'$'+currency;
    return budget;
  }
  catch (e) {
    throw new Error(e.message += '<br><u><b>budget</b></u> '+jc.finance.help(jc.finance.CashFlow.prototype.budget));
  }
}

/*
%%%%%%%%%%%%%% voir ce que l'on veut faire??
jc.finance.CashFlow.prototype.debt = function(name,currency,startDate,endDate) {
  currency = currency || this._currency;
  startDate= new Date(startDate || this._startDate);
  endDate = new Date(endDate || this._endDate);
  var debt = new jc.finance.CashFlow(name,currency,startDate,endDate,this);
  var f = function debt() {return debt.execute()};
  this._orders.push(f);
  return debt;
}
*/

jc.finance.Account.prototype.recieve = function(date,subject,amount,currency) {
  // add an order of receiving amount at date. 
  // currency is optional and uses by default this CashFlow currency
  currency = currency || this._currency;
  this._orders.push(new jc.finance.Order(date,subject,amount,currency));
  return this;
}

jc.finance.Account.prototype.pay = function(date,subject,amount,currency) {
  // add an order of payement of amount
  // currency is optional and uses by default this CashFlow currency
  this.recieve(date,subject,-amount,currency);
  return this;
}

jc.finance.Account.prototype.monthly = function(startDate,endDate) {
  // returns a PermanentOrder object configured to execute
  // the associated payments every month starting with startDate and ending 
  // returns the new PermanentOrders for method chainning
  startDate = new Date(startDate || this._startDate);
  endDate = new Date(endDate || this._endDate);
  var permanentOrders = new jc.finance.PermanentOrders(startDate,endDate,this);
  permanentOrders._nextDate = Date.prototype.nextMonth;
  this._orders.push(permanentOrders);
  return permanentOrders;
}

jc.finance.Account.prototype.updateBalance = function() {
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
  
jc.finance.Account.prototype.end = function() {
  // returns the PARENT cashFlow in order to continue method chainning
  return (this._parent || this); // return the parent or itself if no parent in order to enable span()
}

jc.finance.Account.prototype.execute = function(currency) {
  // execute all orders in order to create the ._payments 
  // it will also recalculate all nested orders
  // DOESN'T update the balance
  // returns the array of ._payments

  this._payments = [];
  for (var i in this._orders){
    this._payments = this._payments.concat(this._orders[i].execute(this._currency))
  }
  this.convertTo(currency);
  return this._payments;
}


jc.finance.Account.prototype.span = function(options) {
  this.execute(); 
  this.updateBalance();
  var t = table().addRows(this._payments).sort({date:1});
  options = $.extend(true,{},{cols:t._cols,format:jc.finance.defaults.format},{cols:{subject:{style:"text-align:left;"}}},options);
  return '<var>'+this._name+'</var>'+t.span(options);
}

jc.finance.Account.prototype.toString = function() {
  return '[object Account]';
}


// PermanentOrders ///////////////////////////////////////////////////////////////


jc.finance.PermanentOrders = function(startDate,endDate,parent) {
  this._orders = [];
  this._startDate = startDate;
  this._endDate = endDate;
  this._parent = parent;
  this._currency = parent._currency;
}

$.extend(jc.finance.PermanentOrders.prototype,jc.finance.Order.prototype);


jc.finance.PermanentOrders.prototype.pay = function(subject,amount,currency,day){
  // pays within the permanent odrer the amount for that subject
  // currency is by default the currency of the permanent order

  var o = new jc.finance.Order(undefined,subject,-amount,currency || this._currency);
  o.setDate = function(date) {this._date=this.date.adjustDate(day);return this};
  this._orders.push(o);
  return this;
}

jc.finance.PermanentOrders.prototype.execute = function(currency) {
  this._payments = [];
  for (var date = new Date(this._startDate);date <= this._endDate;date = this._nextDate.call(date)) {
    for (var i in this._orders) {
      var res = this._orders[i].execute(this._currency,date);
      this._payments = this._payments.concat(res);
    }
  }
  this.convertTo(currency);
  return this._payments;
}

jc.finance.PermanentOrders.prototype.end = function() {
  return this._parent;
}

jc.finance.PermanentOrders.prototype.toString = function() {
  return '[object PermanentOrders]';
}