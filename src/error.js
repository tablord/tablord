// error.js
//
// a small lib to try to address all common browser error reporting
//
// (CC-BY-SA 2019)Marc Nicole  according to https://creativecommons.org/
///////////////////////////////////////////////////////////////////////////////////////////////////////////////
const regExpF = /at f.*\(.*?\),.*:(\d+):(\d+)/;

tb.errorLine = function(error) {
  // retrieve the line of Error
  let lineNo = error.lineNumber //firefox
               || error.line;    //safary
  if (lineNo === undefined){
    let m = error.stack.match(regExpF);
    lineNo = Number(m && m[1])   //chrome find in f  
  } 
  return lineNo;
}

tb.errorCol = function(error) {
  // retrieve the col of an error
  let colNo = error.columnNumber //firefox
               || error.column;    //safary
  if (colNo === undefined){
    let m = error.stack.match(regExpF);
    colNo = Number(m && m[2])   //chrome find in f  
  } 
  return colNo;
}
