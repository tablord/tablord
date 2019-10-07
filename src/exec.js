// exec.js
//
// everything that is related to the execution of the sheet 
//
// (CC-BY-SA 2019)Marc Nicole  according to https://creativecommons.org/
///////////////////////////////////////////////////////////////////////////////////////////////////////////////


// edi related functions ////////////////////////////////////////////
var geval = eval;

tb.securedEval = function (code) {
    // execute code
    // a bit more secured than eval: since IE<9 executes localy, it was possible do destroy local variable by defining functions or var
    // with this trick, one can still create global variables by just assigning (eg: tb.vars='toto' destroys the global variable tb.vars)
    // to be checked what could be done to improve
    code.replace(/^\s*{(.*)}\s*$/, '({$1})');  // if the code is just a litteral object {..} add brakets in order to deal with the with(tb.vars){ } statement

    code = 'let output = tb.output; with (tb.vars) {\n' + code + '\n};';   //output becomes a closure, so finalize function can use it during finalizations
    return geval(code)
};

// debug //////////////////////////////////////////////////////////

function a(/*objects*/) {
    // show a dialog with the text view of the objects
    // returns the last object in order to be able to use a(x) in an expression
    let message = '';
    for (let i = 0; i < arguments.length; i++) {
        message += tb.inspect(arguments[i]).toString() + '\n';
    }
    window.alert(message);
    return arguments[arguments.length - 1];
}


function trace(/*objects*/) {
    // write to the trace the content of all objects passed in the parameters
    // use trace.on() to enable traces and trace.off() to disable traces
    // you can also use trace.push() and trace.pop() to save restore the trace states
    if (trace._on) {
        let message = '';
        for (let i = 0; i < arguments.length; i++) {
            message += tb.inspect(arguments[i]).span();
        }
        trace.messages.push(message);
        if (trace.messages.length > tb.tracesMaxLength) {
            trace.messages.pop();
            trace.messages[0] = '...';
        }
    }
    return trace;
}

trace._on = false;
trace.stack = [];
trace.messages = [];
trace.on = function () {
    // enable the capture of trace
    // return trace for method chaining
    trace._on = true;
    return trace
};
trace.off = function () {
    // disable the capture of trace
    // return trace for method chaining
    trace._on = false;
    return trace
};
trace.push = function () {
    // push the current trace state on a stack
    // return trace for method chaining
    trace.stack.push(trace._on);
    return trace
};
trace.pop = function () {
    // restore the previously pushed trace state from the stack
    // return trace for method chaining
    trace._on = trace.stack.pop();
    return trace
};
trace.span = function () {
    // return an html object displaying the traces
    if (trace.messages.length > 0) {
        let h = '<DIV class=TRACE>' + trace.messages.length + ' traces:<table class=DEBUG><tr><td class=TRACE>' + trace.messages.join('</td></tr><tr><td class=TRACE>') + '</td></tr></table></DIV>';
        trace.messages = [];
        return new tb.HTML(h);
    }
    return '';
};

tb.help.update({a: a, trace: trace}, '');
tb.help.update(trace, 'trace.');


// Inspector ////////////////////////////////////////////////////////
tb.Inspector = function Inspector(obj, depth, name) {
    // Inspector object are made to have both .toString and .span methods
    // so they can be displayed either in an html or plain text context
    // - obj the object to be inspected
    // - depth (default 1) give at what depth object properties are also inspected
    // - name (optional) gives a name to be shown in the display
    this.obj = obj;
    this.name = name || '';
    this.depth = depth || 1;
};
tb.Inspector.className = 'tb.Inspector';

tb.Inspector.prototype.legend = function () {
    // returns the legend for a given object
    let l;
    if ($.isPlainObject(this.obj)) {
        l = '{}';
    } else if ($.isArray(this.obj)) {
        l = '[]';
    } else if ($.isFunction(this.obj)) {
        l = tb.signature(this.obj);
    } else if (this.obj === null) {
        l = 'null';
    } else if (this.obj === undefined) {
        l = 'undefined';
    } else if (this.obj.toString) {
        l = this.obj.toString();
    } else {
        l = 'special object';
    }
    return l;
};


tb.Inspector.prototype.toString = function () {
    // display the object hold by the inspector as a string

    // BE CARFULL IN DEBUGGING THAT FUNCTION: DO NOT CALL a(....),
    // since it will create an inspector recursivelly
    // use window.alert instead !!
    if (this.obj === undefined) {
        return 'undefined';
    }
    if (this.obj === null) {
        return 'null';
    }
    if (this.obj.inspectString) {  // obj knows how to inspect itself
        return this.obj.inspectString()
    }
    if (typeof this.obj === 'number') {
        return this.obj.toString();
    }
    if (this.obj === '') {
        return 'empty string';
    }
    if (typeof this.obj === 'string') {
        return JSON.stringify(this.obj);
    }
    if (this.obj.toGMTString !== undefined) {
        return this.obj.toGMTString() + ' (ms:' + this.obj.valueOf() + ')';
    }
    let r = this.legend() + ' ' + this.name + '\n';
    for (let k in this.obj) {
        r += k + ':  ' + tb.summary(this.obj[k]) + '\n'
    }
    return r;
};

tb.Inspector.prototype.span = function (depth) {
    // return a HTML object to display the content of the inspector
    // depth specify at what depth an object property is also inspected
    depth = depth || this.depth;
    if (this.obj === undefined) {
        return '<SPAN class="INSPECT META">undefined</SPAN>';
    }
    if (this.obj === null) {
        return '<SPAN class="INSPECT META">null</SPAN>';
    }
    if (typeof this.obj === 'number') {
        return this.obj.toString();
    }
    if (this.obj === '') {
        return '<SPAN class="INSPECT META">empty string</SPAN>';
    }
    if (typeof this.obj === 'string') {
        return '<SPAN class=INSPECT>' + tb.toHtml(JSON.stringify(this.obj)) + '</SPAN>';
    }
    if (this.obj.toGMTString !== undefined) {
        return '<SPAN class="INSPECT META">' + this.obj.toString() + ' (ms:' + this.obj.valueOf() + ')</SPAN>';
    }
    let r = '<DIV class=INSPECT><fieldset><legend>' + this.legend() + ' ' + this.name + '</legend>';
    r += '<table>';
    for (let k in this.obj) {
        if (k === 'constructor') continue;
        r += '<tr><th>' + k + '</th><td>' +
            ((typeof this.obj[k] == 'function') ? tb.help(this.obj[k]) :
                    ((depth === 1) ? tb.toHtml(this.obj[k]) : tb.inspect(this.obj[k]).span(depth - 1))
            )
            + '</td></tr>';
    }
    return new tb.HTML(r + '</table></fieldset></DIV>');
};


tb.inspect = function (obj, depth, name) {
    // return an Inspector object so obj can be displayed either in an html or plain text context
    // - depth (default 1) give at what depth object properties are also inspected
    // - name (optional) gives a name to be shown in the display
    return new tb.Inspector(obj, depth, name);
};

tb.codeExample = function (example) {
    // return an html object with example wrapped in span class=CODEEXAMPLE
    return tb.html('<span class=CODEEXAMPLE>' + example + '</span>');
};


// navigation within document ////////////////////////////////////////////////////////
tb.sectionBeingExecuted$ = function () {
    // returns a jQuery containing the deepest section that contains the code currently in execution
    return $(tb.currentElementBeingExecuted).closest('.SECTION');
};

tb.testStatus = function () {
    // set a finalize function that will write to the current output the number of test Failure
    // in the section that includes the code that executes this function
    // mostly used in a small code inside the title of a section to summerize the tests below
    let output = tb.output; // closure on tb.output
    output.finalize(function () {
            let section = $(output.codeElement).closest('.SECTION');
            let numberOfSuccess = section.find('.TEST.SUCCESS').length;
            let numberOfErrors = section.find('.TEST.ERROR').length;
            output.html(
                '<SPAN class=' + (numberOfErrors === 0 ? 'SUCCESS' : 'ERROR') + '>tests passed:' + numberOfSuccess + ' failed:' + numberOfErrors + '</SPAN>'
            )
        }
    );
    return 'test Status: ';
};

tb.updateResultsTestStatus = function () {
    // updates tb.results.testStatus with the number of test passed vs failed
    tb.results.testStatus = {
        error: tb.lastError,
        nbPassed: $('.TEST.SUCCESS').length,
        nbFailed: $('.TEST.ERROR').length,
        dateTime: new Date()
    };
    return tb.results;
};

// Table of Content //////////////////////////////////////////////////////////////////
tb.tableOfContent = {
    toc: [],
    reset: function () {
        tb.tableOfContent.toc = [];
    },
    update: function () {
        let currentNumbers = [];
        this.toc = [];
        $('.SECTION').each(function (i, e) {
            if ($(e).hasClass('DELETED')) return;
            let title = $('.SECTIONTITLE', e)[0];
            let level = tb.level(e);

            currentNumbers[level] = (currentNumbers[level] || 0) + 1;
            currentNumbers.length = level + 1;
            let number = currentNumbers.join('.');
            let t = $.trim(title.innerHTML).replace(/^[\d\.]*(\s|\&nbsp;)*/, '');
            title.outerHTML = '<H' + (level + 1) + ' class="SECTIONTITLE EDITABLE" contentEditable=' + (e === tb.selected.element) + '>' + number + ' ' + t + '</H' + (level + 1) + '>';
            tb.tableOfContent.toc.push({number: number, level: level, title: tb.textContent(t), sectionId: e.id});
        });
    },
    find: function (title) {
        return this.toc[tb.findInArrayOfObject({title: title}, this.toc)];
    },
    span: function () {
        let h = '<DIV class=INTERACTIVE>';
        $.each(this.toc, function (i, t) {
            h += '<div class=TOC' + t.level + '>' + t.number + ' <a href="#' + t.sectionId + '">' + t.title + '</a></div>'
        });
        return new tb.HTML(h + '</DIV>');
    }
};
tb.features.push(tb.tableOfContent);

// Notes //////////////////////////////////////////////////////////////////////////////
tb.note = function (html, ref) {
    // insert a note into the [[tb.notes]] having the html given in parameter
    // if ref is present ref is associated with the note and can be reused with [[tb.ref]] function
    // returns an html object wth the note number
    tb.notes.entries.push({html: html, ref: ref});
    if (ref) tb.notes.refs[ref] = {no: tb.notes.entries.length, nbRefs: 0};
    return tb.html('<a class=REF id=cite_ref' + tb.notes.entries.length + ' href="#cite_note' + tb.notes.entries.length + '" title="' + html + '"><sup>[' + tb.notes.entries.length + ']</sup></a>');
};

tb.ref = function (ref) {
    // insert a reference to an already existing note
    let r = tb.notes.refs[ref];
    if (r === undefined) throw new Error('unknown ref "' + ref + '"');
    r.nbRefs++;
    return tb.html('<a class=REF id=cite_ref' + r.no + '_' + r.nbRefs + ' href="#cite_note' + r.no + '" title="' + tb.notes.entries[r.no - 1].html + '"><sup>[' + r.no + ']</sup></a>');
};

tb.notes = function () {
    // returns an html object with all the foot notes
    let h = '';
    for (let no = 1; no <= tb.notes.entries.length; no++) {
        h += '<div id=cite_note' + no + '><b>' + no + '</b>&nbsp;<a href="#cite_ref' + no + '">&#8593;</a>';
        let e = tb.notes.entries[no - 1];
        let r = tb.notes.refs[e.ref];
        let nb = r ? r.nbRefs : 0;
        for (let n = 1; n <= nb; n++) {
            h += '<a href="#cite_ref' + no + '_' + n + '">&#8593;</a>';
        }
        h += e.html + '</div>';
    }
    return tb.html(h);
};

tb.notes.reset = function () {
    // reset the notes
    tb.notes.entries = [];
    tb.notes.refs = {};
};

tb.features.push(tb.notes);

tb.link = function (text, url) {
    // if no url is given, text is used as a search into table of content to find the section
    // url can be either a full url or an id of an [[ELEMENT]]
    // TODO: futur version will accept http url
    url = url || text;
    let e$ = $('#' + url);
    if (e$.length == 1) {
        return new tb.HTML('<a class=LINK href="#' + url + '">' + text + '</a>');
    }
    let entry = tb.tableOfContent.find(url);
    if (entry) {
        return new tb.HTML('<a class=LINK href="#' + entry.sectionId + '">' + text + '</a>');
    }
    return new tb.HTML('<span class=INVALIDLINK title="#' + url + ' is not found in the table of content">' + text + '</span>');
};

tb.elementBox = function (text, id) {
    // return an html object that has a clickable text that will open a box with the copy of the element id
    // - id: the id of the element to display in the box like "rich0007"
    //       if id is not found, it will try to find id as a [[SECTIONTITLE]]
    //       if id == undefined text is used as id or title
    id = id || text;
    let e$ = $('#' + id);
    if (e$.length == 1) {
        return tb.html('<span class=BOXLINK data-showId="#' + id + '">' + text + '</span>');
    }
    let entry = tb.tableOfContent.find(id);
    if (entry) {
        return new tb.HTML('<span class=BOXLINK data-showId="#' + entry.sectionId + '">' + text + '</span>');
    }
    return new tb.HTML('<span class=INVALIDLINK title="#' + id + ' is not found">' + text + '</span>');
};

tb.openCloseBox = function (event) {
    //
    let boxTextElement = event.target;
    let box$ = $('.BOX', boxTextElement);
    let open = box$.length === 0;
    box$.remove();
    if (open) {
        let id = $(boxTextElement).attr('data-showId');
        $('<DIV class=BOX>').html($(id).html()).appendTo(boxTextElement);
    }
    event.stopPropagation(); // prevent bubbling of the event
};

tb.level = function (element) {
    // returns the level of the element = number of section between body and the element
    // please note that the first section has level = 0 according to this definition
    // (but the title will be a <H1>)
    return $(element).parentsUntil('BODY').filter('.SECTION').length;
};

tb.findblockNumber = function () {
    // search the next block number in an existing document
    $('.ELEMENT').each(function (i, e) {
        let n = Number(e.id.slice(4));
        if (!isNaN(n)) {
            tb.blockNumber = Math.max(tb.blockNumber, n);
        }
    });
    tb.blockNumber++;
};

tb.blockId = function (prefix) {
    // increment tb.blockNumber and
    // return the block id using prefix which must be a 4 characters prefix
    if (prefix.length !== 4) throw new Error('Element Id must hace a 4 char prefix for the id');
    return prefix + tb.pad(tb.blockNumber++, 4);
};

tb.blockPrefix = function (id) {
    return id.slice(0, 4);
};

//  display / execution ////////////////////////////////////////////////////

tb.displayResult = function (result, output) {
    // display result in output (that must be a tb.Output object
    // if code first show that code
    $(output.outputElement)
        .empty().removeClass('ERROR').addClass('SUCCESS')
        .append(((result !== undefined) && (result !== null) && (typeof result.node$ === 'function') && result.node$())
            || tb.format(result)
        )
        .prepend(output.toString())
        .before(trace.span().toString()) // traces are not part of the result
};

tb.execCodeElement = function (element$) {
    // execute a CODE ELEMENT
    let code = element$.attr('data-code') || ' ';
    let source$ = element$.children('.SOURCE');
    let out$ = element$.children('.OUTPUT');
    let test$ = element$.children('.TEST');
    tb.output = tb.newOutput(element$[0], out$[0]);
    if (out$.length === 0) {
        out$ = $('<' + element$.prop('tagName') + ' class="OUTPUT">');
        element$.prepend(out$);
    }
    if (source$.length === 0) {
        source$ = $('<pre class="SOURCE">');
        element$.prepend(source$);
    }
    source$.html(element$.hasClass('SHOW') ? Prism.highlight(code, Prism.languages.javascript, 'javascript') : '');

    try {
        let res = tb.securedEval(code);
        tb.displayResult(res, tb.output);
        if (test$.length) {
            if ((tb.trimHtml(out$.html()) == tb.trimHtml(test$.html()))) {   //TODO rethink how to compare
                test$.removeClass('ERROR').addClass('SUCCESS');
            } else {
                test$.removeClass('SUCCESS').addClass('ERROR');
            }
        }
        tb.output = undefined;
        return true;
    } catch (err) {
        tb.showElementError(element$[0], err);
        tb.output = undefined;
        return false;  // will break the each loop
    }
};

tb.execCode = function (element) {
    // execute the code of element
    // skip all DELETED element
    let element$ = $(element);
    if (element$.hasClass('DELETED')) throw new Error('should not call DELETED ELEMENT');

    // if template, lauch exec method if any
    if (element$.attr('itemtype')) {
        let t = tb.templates[element$.attr('itemtype')];
        if (t && t.exec) {
            t.exec(element$);
        }
        tb.output = undefined;  // so that any errors from the EDI will be reported in a dialog, not in the last outputElement.
        return
    }

    throw new Error('all executable should be handled through itemtypes')
};

tb.execCodes = function (fromCodeId, toCodeId) {
    // execute CODE element starting from fromCodeId and ending with toCodeId
    // it does not clean the environement first, since this function is intended to be used
    // by the user in order to execute some codes repeatidly
    // nor it will perform any finalization (but it will register output.finalize functions
    // that will be executed at the end of the sheet execution
    // please note that it is POSSIBLE to run the code containing the tb.execCodes() allowing
    // some recursivity. Of course this can also result in an never ending loop if not used properly

    let code$ = $('.CODE');
    fromCodeId = fromCodeId || code$.first().attr('id');
    toCodeId = toCodeId || code$.last().attr('id');
    code$.filterFromToId(fromCodeId, toCodeId).each(function (i, e) {
        return tb.execCode(e);
    });
};


tb.runTests = function (/*files...*/) {
    // run every specified files as test files and return a table with all results
    let results = [];
    for (let i = 0; i < arguments.length; i++) {
        let res = tb.runHtaFile(arguments[i]);
        results.push({
            file: arguments[i],
            errCode: res.errCode,
            nbPassed: res.testStatus && res.testStatus.nbPassed,
            nbFailed: res.testStatus && res.testStatus.nbFailed,
            dateTime: res.testStatus && res.testStatus.dateTime,
            exec$ms: res.execStat.execAll$ms
        });
    }
    return table().addRows(results).colStyle(function (r, c, value) {
        return (value !== 0) ? {backgroundColor: 'red'} : {}
    }, 'nbFailed');
};

tb.animate = function (interval, fromCodeId, toCodeId, endCondition) {
    // run every "interval" all codes between fromCodeId to toCodeId
    // if fromCodeId is undefined, the CODE element where this function is called will be used
    fromCodeId = fromCodeId || tb.output.codeElement.id;
    toCodeId = toCodeId || fromCodeId;
    if (tb.inAnimation == false) {
        $('#stopAnimation').attr('disabled', false);
        $('.CODE').filterFromToId(fromCodeId, toCodeId).addClass('INANIMATION');
        tb.intervalTimers.push(window.setInterval(function () {
                tb.inAnimation = true;
                tb.execCodes(fromCodeId, toCodeId);
                tb.inAnimation = false;
            }
            , interval));
    }
    return new Date().toString();
};

tb.clearTimers = function () {
    // clear all existing intervalTimers used by [[tb.animate]]
    for (let i = 0; i < tb.intervalTimers.length; i++) {
        window.clearInterval(tb.intervalTimers[i]);
    }
    tb.intervalTimers = [];
    tb.inAnimation = false;
    $('#stopAnimation').attr('disabled', true);
    $('.INANIMATION').removeClass('INANIMATION');
};

tb.finalize = function () {
    // execute all finalization code
    for (let i = 0; i < tb.finalizations.length; i++) {
        let out = tb.finalizations[i];
        out.finalizationFunc();
        out.finalizationFunc = undefined;  // so that displayResult will not show ... to be finalized...
        tb.displayResult(out, out);
    }
};

tb.run = function () {
    // run either all CODE ELEMENT or the CODE ELEMENT from the first to the selected.element
    if (tb.autoRun) {
        tb.execAll();
    } else {
        tb.execUntilSelected();
    }
};

tb.updateContainers = function () {
    // make sure that containers are never empty (= at least have a RICHTEXT ELEMENT)
    let c$ = $('[container]:not(:has(> *))');
    if (c$.length) c$.append('<DIV class="ELEMENT EDITABLE RICHTEXT c-12" id=' + tb.blockId('rich') + '></DIV>');
};

tb.createVarFromItemprop = function (i, element) {
    // create an instance of tb.Var or tb.Table depending on the type of element
    let err;
    let e$ = $(element);
    let itemprop = e$.attr('itemprop');
    let variable = tb.vars[itemprop];
    if (e$.attr('itemscope') !== undefined) {  // itemscope is represented by a tb.Table with one or more line
        if (variable && !(variable instanceof tb.Table)) {
            err = new Error(itemprop + ' is already declared and is not a table ');
            tb.showItempropError(element, err);
            throw err;
        }
        let data = tb.Template.getData(e$);
        table(itemprop).add(data);
    } else {// this is a simple tb.Var
        if (variable) {
            err = new Error(itemprop + ' is already declared ');
            tb.showItempropError(element, err);
            throw err;
        }
        _var = e$.getItempropValue();
        if (_var.isVar) { // this is a function
            _var.name = itemprop;
            tb.vars[itemprop] = _var;
        } else v(itemprop, _var);
    }
};

tb.createVars = function () {
    // look in the DOM for itemprops that have no itemscope ancestor
    // for each create a tb.vars.<that itemprop> with the itemprop name with the content of that itemprop
    // 1) if the itemprop ends with [], it is forced to an array (but the name of the array has not the []) 
    //    and the value is pushed into it
    // 2) if the itemprop has the same name of an already existing tb.vars that is not an array,
    //    the var is first converted to an array with the already existing var as [0]
    //    the new itemprop is pushed into it
    // 3) the content of the variable depends on the itemprop tag according to 
    //    [tb.createVarFromItemprop]
    let globalItemprops = $('[itemprop]').filter(function () {
        return $(this).parents('[itemscope]').length === 0 && // must not be inside a itemscope
            $(this).closest('.DELETED').length === 0;  // nor be deleted or having a deleted parent
    });
    globalItemprops.each(tb.createVarFromItemprop);
};

tb.updateFunctionElements = function () {
    // update every element that has an itemprop and a func attribute
    let elements$ = $('[func]').not('.CODE'); //todo à voir si c'est la bonne solution où si on met une class FUNC aux fonctions
    elements$.each(function () {
        try {
            let this$ = $(this);
            let tbVar = this$.prop('tbVar');
            let value = tbVar.valueOf();
            this$.html(tb.format(value, {format: {fmtStr: this$.attr('format')}})).addClass('SUCCESS');
        } catch (err) {
            // do nothing, since the error has already been registred
        }
    })
};

tb.prepareExec = function () {
    // reset the environement before so that no side effect
    // let [[Feature]]s object collect data on the document
    tb.results = {execStat: {start: new Date()}};

    for (let i = 0; i < tb.features.length; i++) tb.features[i].reset();
    trace.off();
    tb.clearTimers();
    $('.SUCCESS').removeClass('SUCCESS');
    $('.ERROR').removeClass('ERROR').removeProp('error');
    $('.TRACE').remove();
    $('.BOX').remove();
    $('[func]').removeProp('tbVar');
    tb.lastError = undefined;
    tb.finalizations = [];
    tb.vars = {}; // run from fresh
    tb.createVars();
    tb.IElement.idNumber = 0;
    for (let i = 0; i < tb.features.length; i++) tb.features[i].update && tb.features[i].update();
    tb.simulation = new tb.Simulation('tb.simulation');
    tb.editables$(tb.selected.element).each(function (i, e) {
        tb.reformatRichText(e)
    });
    tb.results.execStat.prepare$ms = Date.now() - tb.results.execStat.start;
};

tb.execAll = function () {
    // execute all [[CODE]] [[ELEMENT]]
    tb.prepareExec();
    let elements$ = $('.CODE').add('[itemtype]').not('.DELETED');
    elements$.each(function (i, e) {
        return tb.execCode(e);
    });
    tb.updateContainers();
    tb.finalize();
    tb.results.execStat.execAll$ms = Date.now() - tb.results.execStat.start;
    tb.updateFunctionElements();
    tb.setUpToDate(true);
    tb.selectElement(tb.selected.element); // update properties / error...
};

tb.execUntilSelected = function () {
    // execute all [[CODE]] [[ELEMENT]] until the selected Element
    tb.prepareExec();
    let $codes = $('.CODE');
    let lastI;
    if (tb.selected.element$.hasClass('CODE')) {
        lastI = $codes.index(tb.selected.element);
    } else {
        let $last = $('.CODE', tb.selected.element).last();
        if ($last.length === 0) { // selected element is a section or rich text that has no internal CODE element
            $codes.add(tb.selected.element); // we add this element (even if not a code) just to know where to stop
            let lastI = $codes.index(tb.selected.element) - 1;
        } else {
            lastI = $codes.index($last);
        }
    }
    $('.CODE').each(function (i, e) {
        if (i > lastI) return false;
        tb.execCode(e);
    });
    // no finalization since not all code is run, so some element will not exist
    tb.setUpToDate(false);
};


