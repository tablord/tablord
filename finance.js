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
    format:function(val){return jc.format(val).yyyymmdd().fixed(2).undefinedToBlank()}
  }
}



//////// Order /////////////////////////////////////////////////////////////////////////////////////////////////
// an Order is the basic class of all finance module and must have the 2 following functions
// .execute(currency)  recalculate its internal state and returns an array of events
//                     which are simple objects {date,subject,
//                                       [amount$currency if a payment/receivable],
//                                       [budget$currency if budget adjusment],
//                                       name$currency the total off the account after this event if account
//                                                     the remaining budget if budget
// .span()     display this order
////////////////////////////////////////////////////////////////////////////////////////////////////////////////               



jc.finance.Order = function(date,subject,amount,currency,budgetAdjustment){
  this._budgetAdjustment = budgetAdjustment || false;
  this._date = new Date(date);
  this._subject = subject;
  this._amount = amount;
  this.initCurrency(currency);
}

jc.finance.Order.prototype.initCurrency = function(currency) {
  // for internal use only: prepare the order for currency
  if (jc.Units[currency] == undefined) throw new Error('an Order object must have a valid currency: unknown '+currency);
  this._currency = currency;
  this._amountField = 'amount$'+currency;
}

jc.finance.Order.prototype.convertTo = function(currency) {
  // for internal use only: add a new amount$curency field to all ._payments if needed
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
  // returns an array of one single payment
  var p = {date : date || this._date,subject : this._subject};
  p[this._amountField] = this._amount;
  if (this._budgetAdjustment) p.budgetAdjustment = true;
  this._payments = [p];  // overkill to use an array for one single payment, but enables to use generic convertTo
  this.convertTo(currency);
  return this._payments;
}

jc.finance.Order.prototype.span = function() {
  return jc.finance.defaults.format(this._date)+' '+ this._subject+' '+this._amount+' '+this._currency;
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

jc.finance.Account.prototype.budget = function(name,initialBudget,currency,startDate,endDate) {
  // create a new budget inside a CashFlow object
  // a budget is like an account but it has a special field budget$currency
  // a .pay or .recieve changes the account$currency field and the budget field
  // but .adjust only affects the budget field
  try {
    currency = currency || this._currency;
    startDate= new Date(startDate || this._startDate);
    endDate = new Date(endDate || this._endDate);
    var budget = new jc.finance.Budget(name,initialBudget,currency,startDate,endDate,this);
    this._orders.push(budget);
    return budget;
  }
  catch (e) {
    throw new Error(e.message += '<br><u><b>budget</b></u> '+jc.help(jc.finance.Account.prototype.budget));
  }
}

jc.finance.Account.prototype.recieve = function(date,subject,amount,currency) {
  // add an order of receiving amount at date. 
  // currency is optional and uses by default this CashFlow currency
  currency = currency || this._currency;
  this._orders.push(new jc.finance.Order(date,subject,amount,currency));
  return this;
}

jc.finance.Account.prototype.pay = function(date,subject,amount,currency) {
  // add an order of payment of amount
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

jc.finance.Account.prototype.update = function() {
  // update the balance field of each records
  // as records are shared between the different levels of cashFlow 
  // this function has to be called before reading any balance field
  // as Account, it takes into account only true payments, not budgetAdjustments
  var balance = 0;
  var amountField = 'amount$'+this._currency;
  this._payments.sort(function(a,b){return a.date-b.date});
  for (var i in this._payments) {
    if (this._payments[i].budgetAdjustment==undefined) {
      balance += this._payments[i][amountField];
      this._payments[i][this._balanceField] = balance;
    }
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
  this.update();
  var p = this._payments;
  if (!options || !options.showBudgetAdjustmentInAccount) {
    p=$.grep(p,function(payment,i) {return !payment.budgetAdjustment});
  }
  var t = table().addRows(p).sort({date:1});
  options = $.extend(true,{},{cols:t._cols,format:jc.finance.defaults.format},{cols:{date:1,subject:{style:"text-align:left;"}}},options);
  return '<var>'+this._name+'</var>'+t.span(options);
}

jc.finance.Account.prototype.toString = function() {
  return '[object Account]';
}


// Budget ////////////////////////////////////////////////////////////////////////
//   Budget is a special type of account

jc.finance.Budget = function(name,initialBudget,currency,startDate,endDate,parent) {
  jc.finance.Account.call(this,name,currency,startDate,endDate,parent);
  if (initialBudget) this.adjustBudget(this._startDate,name,initialBudget);
}

$.extend(jc.finance.Budget.prototype,jc.finance.Account.prototype);

jc.finance.Budget.prototype.update = function() {
  // update the balance field of each records
  // as records are shared between the different levels of cashFlow 
  // this function has to be called before reading any balance field
  // as Budget, it takes into account all payments and budgetAdjustments
  // it also calculated the internal fields ._totalBudget and ._totalPaid

  var balance = 0;
  var amountField = this._amountField;
  this._totalBudget = 0;
  this._totalPaid = 0;
  this._firstPayment = undefined;
  this._lastPayment = undefined;
  this._payments.sort(function(a,b){return a.date-b.date});
  for (var i in this._payments) {
    var p = this._payments[i];
    balance += p[amountField];
    p[this._balanceField] = balance;
    if (p.budgetAdjustment) {
      this._totalBudget += p[amountField];
    }
    else {
      if (!this._firstPayment) this._firstPayment = p;
      this._lastPayment = p;
      this._totalPaid -= p[amountField];
    }
  }
}  

jc.finance.Budget.prototype.span = function(options) {
  this.execute(); 
  this.update();
  var p = this._payments;
  var t = table().addRows(p).sort({date:1});
  options = $.extend(true,{},{cols:t._cols,format:jc.finance.defaults.format},{cols:{date:1,subject:{style:"text-align:left;"}}},options);
  return '<var>'+this._name+'</var>'+t.span(options)+
         '<table><tr><th>total Budget:</th><td>'+this._totalBudget+'</td></tr>'+
                '<tr><th>total Paid:</th><td>'+this._totalPaid+'</td></tr>'+
                '<tr><th>% Paid:</th><td>'+(this._totalPaid/this._totalBudget*100).toFixed(1)+'</td></tr>'+
                '<tr><th>estimated end Date:</th><td>'+options.format(this._estimatedEndDate())+'</td></tr></table>';
}

jc.finance.Budget.prototype.adjustBudget = function(date,subject,amount,currency){
  // add an order of budjet adjustment at date. 
  // currency is optional and uses by default this Budget currency
  currency = currency || this._currency;
  this._orders.push(new jc.finance.Order(date,subject,amount,currency,true));
  return this;
}

jc.finance.Budget.prototype._estimatedEndDate = function() {
  if ((this._firstPayment === undefined) || (this._firstPayment === this._lastPayment)) return NaN;
  var deltaP = this._totalPaid + this._firstPayment[this._amountField];
  var stillToBePaid = this._totalBudget - this._totalPaid;
  var deltaT = this._lastPayment.date - this._firstPayment.date;
  return new Date(this._lastPayment.date.valueOf() + (stillToBePaid/deltaP*deltaT));
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
  // execute all Orders of this PermanentOrders for every date of the PermanentOrders
  // returns all resulting payments, adding an amount$currency field if necessary
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