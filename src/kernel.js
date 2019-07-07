// kernel.js
//
// This defines the global tb variable where all modules will plug 
//
// (CC-BY-SA 2019)Marc Nicole  according to https://creativecommons.org/
///////////////////////////////////////////////////////////////////////////////////////////////////////////////

  var tb = {name:'Tablord',
            version:'1.0',
            authors:['Marc Nicole'],
            rights:'CC-BY-SA 2018',
            selected: {   // is updated by selectElement 
              element:undefined,
              element$:$(),    // element as a jQuery of 0 or 1 element
              itemscope$:$(),  // the containing itemscope (can be the element itself)
              container$:$(),  // the containing container (always a parent if any)
            },
            output: undefined,
                        //a new Output is created for each code.
                        //it hold both the code and output Elements as well as the htlm
                        //at init an empty object so _codeElement and _outputElement are undefined
                        //tb.output is only defined during user code execution in order to catch errors
                        //from user code in association with the right output.
                        //please note that tb.output == undefined during finalization code, but the finalization code
                        //defined by the user can still access output due to the closure mechanism of JavaScript

            traces:[],
            tracesMaxLength:100,
            htmlIndent:1,
            simulation:undefined, // will be set in tb.execAll()
            blockNumber:0,
            finalizations:[],     // a stack of output to be finalized

            intervalTimers:[],    // a list of intervalTimer handle in order to kill them (clearInterval) at the next run
            inAnimation:false,    // true when execution take place through tb.animate()
            modified:false,       // file is modified

            templates:{},         // all native, locally defined and imported templates

            vars:{},              // where all user variables are stored

            autoRun:true,
            sheetOptions: {
              get showCode() {return tb.tbContent$.attr('showCode') || true},
              set showCode(value) {tb.tbContent$.attr('showCode',value)},
              get showCut() {return tb.tbContent$.attr('showCut') || true},
              set showCut(value) {tb.tbContent$.attr('showCut',value)},
              get showDeleted() {return tb.tbContent$.attr('showCode') || false},
              set showDeleted(value) {tb.tbContent$.attr('showCode',value)},
              get showTest() {return tb.tbContent$.attr('showTest') || true},
              set showTest(value) {tb.tbContent$.attr('showTest',value)},
              get showTrace() {return tb.tbContent$.attr('showTrace') || true},
              set showTrace(value) {tb.tbContent$.attr('showTrace',value)},
            },
            features:[],          // list of Features. cf tb.Features for more informations
            url:{},               // the url of the sheet decomposed in protocol {host user password domain path fileName ext tag search arguments}
            results:{},           // if != {}, when the sheet is closed a file with the same name .jres will be written and its content is JSON.stringify(tb.results)

            defaults:{
              format:{            // default formating methods  this can be redefined in some Tablord objects like v table... in options.
                undef:function(){return '<SPAN style=color:red;>undefined</SPAN>'},
                nullObj:function(){return '<SPAN style=color:red;>null</SPAN>'},
                emptStr:function(){return '<SPAN style=color:red;>empty string</SPAN>'},
                func:function(f){return tb.help(f)},
                array:function(a){return a.toString()},
                domElement:function(element){return 'DOM Element<SPAN class="INSPECTHTML">'+tb.toHtml(tb.trimHtml(tb.purgeJQueryAttr(element.outerHTML)))+'</SPAN>'},
                obj:function(obj){return tb.inspect(obj).span().toString()},
                date:function(date){return date.yyyymmdd()},
                moment:function(moment){return moment.format()},
                duration:function(duration){return duration.format()},
                number:function(n,fmtStr){
                  if (fmtStr) return numeral(n).format(fmtStr);
                  else return n.toString()
                },
                string:function(s){return s}
              }
            }
           };



  tb.credits = {name:tb.name,version:tb.version,authors:tb.authors,rights:tb.rights};
