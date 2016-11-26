(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Split a filename into [root, dir, basename, ext], unix version
// 'root' is just a slash, or nothing.
var splitPathRe =
    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
var splitPath = function(filename) {
  return splitPathRe.exec(filename).slice(1);
};

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function(path) {
  var result = splitPath(path),
      root = result[0],
      dir = result[1];

  if (!root && !dir) {
    // No dirname whatsoever
    return '.';
  }

  if (dir) {
    // It has a dirname, strip trailing slash
    dir = dir.substr(0, dir.length - 1);
  }

  return root + dir;
};


exports.basename = function(path, ext) {
  var f = splitPath(path)[2];
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPath(path)[3];
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

}).call(this,require('_process'))
},{"_process":3}],3:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],4:[function(require,module,exports){
var editMode;
var step;

enterEditMode = module.exports.enterEditMode = function(){
    editMode = true;
    step = -1;
}

enterVisualMode = module.exports.enterVisualMode = function(){
    editMode = false;
    step = -1;
}

incrementStep = module.exports.incrementStep = function(){
    ++step;
}

decrementStep = module.exports.decementStep = function(){
    --step;
}

isOnEditMode = module.exports.isOnEditMode = function(){
    return editMode;
}

getCurrentStep = module.exports.getCurrentStep = function(){
    return step;
}
},{}],5:[function(require,module,exports){
var paper = {};
var temporalSymbolTable = {};

module.exports.init = function(){
    paper = Raphael(document.getElementById("paper"), 0,0);
}

updateSymbolTable = module.exports.updateSymbolTable = function(updatedSymbolTable){
    temporalSymbolTable = updateSymbolTable;
    draw();
}

draw = module.exports.draw = function(){
    // get temporal symbol table and draw it
    //var rect1 = paper.rect(20,20,100,100).attr({fill: "blue"});
}

                
},{}],6:[function(require,module,exports){
var ansic = require('./parser/ansic.js');
var raphael = require('./graphics/graphics.js');
var symbolTable = require('./parser/symbolTable.js');
var execution = require('./execution.js');

/* Graphic elements */
var editor;
var externalConsole;


window.onload = function init(){
    
    /* Graphic library init */
    raphael.init();
    
    /* Codemirror autocomplete init */
    
    function passAndHint(cm) {
        setTimeout(function() {cm.execCommand("autocomplete");}, 100);
      	return CodeMirror.Pass;
    }
      
    function myHint(cm) {
     	return CodeMirror.showHint(cm, CodeMirror.ternHint, {async: true}); 
    }
     
    CodeMirror.commands.autocomplete = function(cm) {
        CodeMirror.showHint(cm, myHint);
    }
    
    /* Code mirror init */
    editor = CodeMirror.fromTextArea(document.getElementById("code"), {
        lineNumbers: true,
        styleActiveLine: true,
        theme: 'eclipse',
        mode: 'text/x-csrc',
        matchBrackets: true,
        extraKeys: {
            "Ctrl-Space": "autocomplete",
            "Ctrl-Enter": "evaluate"
        }
    });
    
    externalConsole = CodeMirror.fromTextArea(document.getElementById("console"), {
        readOnly: true,
        theme: '3024-night',
        mode: 'none'
    });
    
    
    /* Buttons init */
    document.getElementById("visualize").onclick = visualizeExecution;
    document.getElementById("back").onclick = stepBack;
    document.getElementById("forward").onclick = stepForward;
    document.getElementById("edit").onclick = editCode;
    
    /* Execution init, enter edit mode and clean canvas */
    editCode();
    
}

visualizeExecution = function(){
    var execSuccesful = evaluateText(externalConsole, editor.getValue());
    if(execSuccesful) {
        execution.enterVisualMode();
        
        /* Change buttons state */
        document.getElementById("visualize").disabled = true;
        document.getElementById("back").disabled = true;
        document.getElementById("forward").disabled = false;
        document.getElementById("edit").disabled = false;
        
        /* Disable editor */
        editor.setOption("readOnly", "nocursor");
        
    }   
}

stepBack = function(){
    if(!execution.isOnEditMode()){
        execution.decementStep();
        
        document.getElementById("forward").disabled = false;

        var symTableHist = symbolTable.getSymbolTableHistory();
        
        if(execution.getCurrentStep() < 0){
            document.getElementById("back").disabled = true;
            return;
        }
        
        var currentStep = execution.getCurrentStep();
        var symTableSnapshot = symTableHist[currentStep];
        
        console.log(symTableSnapshot);
        externalConsole.setValue(symbolTable.hello(symTableSnapshot.table));
        editor.setCursor(symTableSnapshot.line); 
        /* Draw */
        
        
    }
        
}

stepForward = function(){
    if(!execution.isOnEditMode()){
        execution.incrementStep();

        var symTableHist = symbolTable.getSymbolTableHistory();
        document.getElementById("back").disabled = false;
        
        if(execution.getCurrentStep() >= symTableHist.length){
            document.getElementById("forward").disabled = true;
            return;
        }
        
        var currentStep = execution.getCurrentStep();
        var symTableSnapshot = symTableHist[currentStep];
        
        console.log(symTableSnapshot);
        externalConsole.setValue(symbolTable.hello(symTableSnapshot.table));
        editor.setCursor(symTableSnapshot.line); 
        /* Draw */

    }
}

editCode = function(){
    /* Erase canvas */
    execution.enterEditMode();
    document.getElementById("visualize").disabled = false;
    document.getElementById("back").disabled = true;
    document.getElementById("forward").disabled = true;
    document.getElementById("edit").disabled = true;
    
    /* Enable editor */
    editor.setOption("readOnly", false);
}


function evaluateText(consoleWindow, text) {
    
    var ast;
    //try{
        symbolTable.free();
        ast = ansic.parse(text);
        console.log(symbolTable.getSymbolTableHistory());
        consoleWindow.setValue("Compilation success.");
    /*} catch (exception) {
        consoleWindow.setValue("Parse Error: " + exception.message);
        return false;
    }*/
    
    return true;
}

},{"./execution.js":4,"./graphics/graphics.js":5,"./parser/ansic.js":7,"./parser/symbolTable.js":13}],7:[function(require,module,exports){
(function (process){
/* parser generated by jison 0.4.17 */
/*
  Returns a Parser object of the following structure:

  Parser: {
    yy: {}
  }

  Parser.prototype: {
    yy: {},
    trace: function(),
    symbols_: {associative list: name ==> number},
    terminals_: {associative list: number ==> name},
    productions_: [...],
    performAction: function anonymous(yytext, yyleng, yylineno, yy, yystate, $$, _$),
    table: [...],
    defaultActions: {...},
    parseError: function(str, hash),
    parse: function(input),

    lexer: {
        EOF: 1,
        parseError: function(str, hash),
        setInput: function(input),
        input: function(),
        unput: function(str),
        more: function(),
        less: function(n),
        pastInput: function(),
        upcomingInput: function(),
        showPosition: function(),
        test_match: function(regex_match_array, rule_index),
        next: function(),
        lex: function(),
        begin: function(condition),
        popState: function(),
        _currentRules: function(),
        topState: function(),
        pushState: function(condition),

        options: {
            ranges: boolean           (optional: true ==> token location info will include a .range[] member)
            flex: boolean             (optional: true ==> flex-like lexing behaviour where the rules are tested exhaustively to find the longest match)
            backtrack_lexer: boolean  (optional: true ==> lexer regexes are tested in order and for each matching regex the action code is invoked; the lexer terminates the scan when a token is returned by the action code)
        },

        performAction: function(yy, yy_, $avoiding_name_collisions, YY_START),
        rules: [...],
        conditions: {associative list: name ==> set},
    }
  }


  token location info (@$, _$, etc.): {
    first_line: n,
    last_line: n,
    first_column: n,
    last_column: n,
    range: [start_number, end_number]       (where the numbers are indexes into the input string, regular zero-based)
  }


  the parseError function receives a 'hash' object with these members for lexer and parser errors: {
    text:        (matched text)
    token:       (the produced terminal token, if any)
    line:        (yylineno)
  }
  while parser (grammar) errors will also provide these members, i.e. parser errors deliver a superset of attributes: {
    loc:         (yylloc)
    expected:    (string describing the set of expected tokens)
    recoverable: (boolean: TRUE when the parser has a error recovery rule available for this particular error)
  }
*/
var ansic = (function(){
var o=function(k,v,o,l){for(o=o||{},l=k.length;l--;o[k[l]]=v);return o},$V0=[1,17],$V1=[1,18],$V2=[1,16],$V3=[1,11],$V4=[1,12],$V5=[1,13],$V6=[1,14],$V7=[1,20],$V8=[5,7,10,27,70,71,72,73,79],$V9=[1,24],$Va=[1,30],$Vb=[7,10,12,14,20,27,62],$Vc=[12,20,58,62,70,71,72,73,76,79],$Vd=[1,34],$Ve=[1,33],$Vf=[7,10,12,14,20],$Vg=[10,12,14,20,58,62,70,71,72,73,76,79],$Vh=[1,40],$Vi=[2,64],$Vj=[5,7,8,9,10,24,26,27,28,29,30,31,62,70,71,72,73,76,78,79,105,106,109,111,112,113,114,115,116,117],$Vk=[7,8,9,10,24,26,27,28,29,30,31,62,70,71,72,73,76,78,79,105,106,109,111,112,113,114,115,116,117],$Vl=[1,54],$Vm=[1,83],$Vn=[1,84],$Vo=[1,85],$Vp=[1,73],$Vq=[1,76],$Vr=[1,77],$Vs=[1,78],$Vt=[1,79],$Vu=[1,80],$Vv=[1,81],$Vw=[1,57],$Vx=[1,55],$Vy=[1,56],$Vz=[1,59],$VA=[1,60],$VB=[1,61],$VC=[1,62],$VD=[1,63],$VE=[1,64],$VF=[1,65],$VG=[1,66],$VH=[1,99],$VI=[1,112],$VJ=[5,7,8,9,10,24,26,27,28,29,30,31,62,70,71,72,73,76,78,79,105,106,109,110,111,112,113,114,115,116,117],$VK=[7,8,9,10,24,26,27,28,29,30,31,62,76,78,105,106,109,111,112,113,114,115,116,117],$VL=[7,8,9,10,24,26,27,28,29,30,31,62,76,78,105,106,109,110,111,112,113,114,115,116,117],$VM=[2,2],$VN=[7,8,9,10,12,24,26,27,28,29,30,31,62,76,78,105,106,109,110,111,112,113,114,115,116,117],$VO=[1,121],$VP=[12,15,20,56,62],$VQ=[12,15,20,56,62,78],$VR=[12,15,20,26,27,28,29,33,34,38,39,40,41,43,44,47,49,51,53,55,56,62,78],$VS=[2,24],$VT=[12,15,20,26,27,28,29,33,34,38,39,40,41,43,44,47,49,51,53,55,56,58,62,78],$VU=[12,15,20,53,55,56,62,78],$VV=[1,142],$VW=[10,12,14,15,17,18,20,26,27,28,29,33,34,38,39,40,41,43,44,47,49,51,53,55,56,58,62,78],$VX=[7,8,9,10,24,26,27,28,29,30,31],$VY=[12,15,20,51,53,55,56,62,78],$VZ=[1,143],$V_=[12,15,20,49,51,53,55,56,62,78],$V$=[1,148],$V01=[12,15,20,47,49,51,53,55,56,62,78],$V11=[1,149],$V21=[12,15,20,26,47,49,51,53,55,56,62,78],$V31=[1,150],$V41=[1,151],$V51=[12,15,20,26,43,44,47,49,51,53,55,56,62,78],$V61=[1,152],$V71=[1,153],$V81=[1,154],$V91=[1,155],$Va1=[12,15,20,26,38,39,40,41,43,44,47,49,51,53,55,56,62,78],$Vb1=[12,15,20,26,28,29,38,39,40,41,43,44,47,49,51,53,55,56,62,78],$Vc1=[1,158],$Vd1=[1,159],$Ve1=[1,160],$Vf1=[12,20],$Vg1=[1,170],$Vh1=[1,171],$Vi1=[20,62,78],$Vj1=[1,204],$Vk1=[2,110],$Vl1=[1,223],$Vm1=[1,222],$Vn1=[1,225],$Vo1=[70,71,72,73,78,79],$Vp1=[20,78],$Vq1=[10,12,14,20];
var parser = {trace: function trace() { },
yy: {},
symbols_: {"error":2,"start":3,"translation_unit":4,"EOF":5,"primary_expression":6,"IDENTIFIER":7,"CONSTANT":8,"STRING_LITERAL":9,"(":10,"expression":11,")":12,"postfix_expression":13,"[":14,"]":15,"argument_expression_list":16,".":17,"PTR_OP":18,"assignment_expression":19,",":20,"unary_expression":21,"unary_operator":22,"cast_expression":23,"SIZEOF":24,"type_name":25,"&":26,"*":27,"+":28,"-":29,"~":30,"!":31,"multiplicative_expression":32,"/":33,"%":34,"additive_expression":35,"shift_expression":36,"relational_expression":37,"<":38,">":39,"LE_OP":40,"GE_OP":41,"equality_expression":42,"EQ_OP":43,"NE_OP":44,"and_expression":45,"exclusive_or_expression":46,"^":47,"inclusive_or_expression":48,"|":49,"logical_and_expression":50,"AND_OP":51,"logical_or_expression":52,"OR_OP":53,"conditional_expression":54,"?":55,":":56,"assignment_operator":57,"=":58,"constant_expression":59,"declaration":60,"declaration_specifiers":61,";":62,"init_declarator_list":63,"type_specifier":64,"init_declarator":65,"declarator":66,"initializer":67,"storage_class_specifier":68,"TYPEDEF":69,"TYPE_NAME":70,"CHAR":71,"INT":72,"DOUBLE":73,"struct_or_union_specifier":74,"struct_or_union":75,"{":76,"struct_declaration_list":77,"}":78,"STRUCT":79,"struct_declaration":80,"specifier_qualifier_list":81,"struct_declarator_list":82,"struct_declarator":83,"enum_specifier":84,"ENUM":85,"enumerator_list":86,"enumerator":87,"pointer":88,"direct_declarator":89,"parameter_type_list":90,"identifier_list":91,"parameter_list":92,"ELLIPSIS":93,"parameter_declaration":94,"abstract_declarator":95,"direct_abstract_declarator":96,"initializer_list":97,"statement":98,"labeled_statement":99,"compound_statement":100,"expression_statement":101,"selection_statement":102,"iteration_statement":103,"jump_statement":104,"CASE":105,"DEFAULT":106,"statement_list":107,"declaration_list":108,"IF":109,"ELSE":110,"SWITCH":111,"WHILE":112,"DO":113,"FOR":114,"CONTINUE":115,"BREAK":116,"RETURN":117,"external_declaration":118,"function_definition":119,"$accept":0,"$end":1},
terminals_: {2:"error",5:"EOF",7:"IDENTIFIER",8:"CONSTANT",9:"STRING_LITERAL",10:"(",12:")",14:"[",15:"]",17:".",18:"PTR_OP",20:",",24:"SIZEOF",26:"&",27:"*",28:"+",29:"-",30:"~",31:"!",33:"/",34:"%",38:"<",39:">",40:"LE_OP",41:"GE_OP",43:"EQ_OP",44:"NE_OP",47:"^",49:"|",51:"AND_OP",53:"OR_OP",55:"?",56:":",58:"=",62:";",69:"TYPEDEF",70:"TYPE_NAME",71:"CHAR",72:"INT",73:"DOUBLE",76:"{",78:"}",79:"STRUCT",85:"ENUM",93:"ELLIPSIS",105:"CASE",106:"DEFAULT",109:"IF",110:"ELSE",111:"SWITCH",112:"WHILE",113:"DO",114:"FOR",115:"CONTINUE",116:"BREAK",117:"RETURN"},
productions_: [0,[3,2],[6,1],[6,1],[6,1],[6,3],[13,1],[13,4],[13,3],[13,4],[13,3],[13,3],[16,1],[16,3],[21,1],[21,2],[21,2],[21,4],[22,1],[22,1],[22,1],[22,1],[22,1],[22,1],[23,1],[23,4],[32,1],[32,3],[32,3],[32,3],[35,1],[35,3],[35,3],[36,1],[37,1],[37,3],[37,3],[37,3],[37,3],[42,1],[42,3],[42,3],[45,1],[45,3],[46,1],[46,3],[48,1],[48,3],[50,1],[50,3],[52,1],[52,3],[54,1],[54,5],[19,1],[19,3],[57,1],[11,1],[11,3],[59,1],[60,2],[60,3],[61,1],[63,1],[65,1],[65,3],[68,1],[64,1],[64,1],[64,1],[64,1],[64,1],[74,5],[74,2],[75,1],[77,1],[77,2],[80,3],[81,1],[82,1],[83,1],[84,4],[84,5],[84,2],[86,1],[86,3],[87,1],[87,3],[66,2],[66,1],[89,1],[89,3],[89,4],[89,3],[89,4],[89,4],[89,3],[88,1],[88,2],[90,1],[90,3],[92,1],[92,3],[94,2],[94,2],[94,1],[91,1],[91,3],[25,1],[25,2],[95,1],[95,1],[95,2],[96,3],[96,2],[96,3],[96,3],[96,4],[96,2],[96,3],[96,3],[96,4],[67,1],[67,3],[67,4],[97,1],[97,3],[98,1],[98,1],[98,1],[98,1],[98,1],[98,1],[99,3],[99,4],[99,3],[100,2],[100,3],[100,3],[100,4],[108,1],[108,2],[107,1],[107,2],[101,1],[101,2],[102,5],[102,7],[102,5],[103,5],[103,7],[103,6],[103,7],[104,2],[104,2],[104,2],[104,3],[4,1],[4,2],[118,1],[118,1],[119,4],[119,3],[119,3],[119,2]],
performAction: function anonymous(yytext, yyleng, yylineno, yy, yystate /* action[1] */, $$ /* vstack */, _$ /* lstack */) {
/* this == yyval */

var $0 = $$.length - 1;
switch (yystate) {
case 1:
 
        return this.$; 
    
break;
case 2: case 90:

        this.$ = parserUtils.generateTuple($$[$0], parserUtils.typeEnum.ID);
    
break;
case 3:

        number = Number($$[$0]);
        // Return pair of value with its type
        // Only int and double are supported
        // TODO Support more types
        if(number % 1 === 0){
            this.$ = parserUtils.generateTuple(number, parserUtils.typeEnum.INT);
        } else {
            this.$ = parserUtils.generateTuple(number, parserUtils.typeEnum.DOUBLE);
        } 
    
break;
case 4:
this.$ = [$$[$0]] // TODO Support;
break;
case 5:
this.$ = [$$[$0-1]] //TODO Support;
break;
case 6: case 12: case 14: case 18: case 19: case 20: case 21: case 22: case 23: case 24: case 26: case 30: case 33: case 34: case 39: case 44: case 48: case 50: case 52: case 54: case 62: case 63: case 66: case 67: case 68: case 71: case 74: case 78: case 79: case 80: case 122:
this.$ = $$[$0];
break;
case 7: case 9:
this.$ = [$$[$0-3], $$[$0-1]];
break;
case 8: case 124:
this.$ = [$$[$0-2]];
break;
case 10:

		// Constructs a js object to hold value of struct variable and member element
		var structElementTuple = {type : parserUtils.typeEnum.STRUCT_ELEMENT, structVariable : $$[$0-2].value, structMember : $$[$0]}; 
		this.$ = structElementTuple;
	
break;
case 11: case 162: case 163:
this.$ = [$$[$0-2], $$[$0-1], $$[$0]];
break;
case 13: case 58: case 139: case 156:
this.$ = [$$[$0-2], $$[$0-1]];
break;
case 27:

        this.$ = arithmetic.multiply($$[$0-2], $$[$0]);
    
break;
case 28:

        this.$ = arithmetic.divide($$[$0-2], $$[$0]);
    
break;
case 29:

        this.$ = arithmetic.mod($$[$0-2], $$[$0]);
    
break;
case 31:

        //console.log("Addition found at line " + _$[$0-2].first_line + ", col" + _$[$0-2].first_column);
        this.$ = arithmetic.add($$[$0-2], $$[$0]);
    
break;
case 32:

        this.$ = arithmetic.subtract($$[$0-2], $$[$0]);
    
break;
case 42: case 46:
this.$ = $$[$0] ;
break;
case 55:

        this.$ = assignment.compoundAssign($$[$0-2], $$[$0-1], $$[$0]);
    
break;
case 57: case 59: case 110: case 111: case 125: case 127: case 128: case 129: case 130: case 131: case 132: case 142: case 157: case 159: case 160:
this.$ = [$$[$0]];
break;
case 60:
this.$ = [$$[$0-1]] // Ignore;
break;
case 61:

		console.log("Declaration: declaration_specifiers init_declarator_list ';' ");
		console.log("Declaration specifiers");
		console.log($$[$0-2]);
        declaration.declareType($$[$0-1], $$[$0-2]);
        symbolTable.saveCurrentState(_$[$0-2].first_line);
		this.$ = [$$[$0-2], $$[$0-1]]
    
break;
case 64:

        declaration.simpleDeclare($$[$0]);
        this.$ = $$[$0];
    
break;
case 65:

        declaration.complexDeclare($$[$0-2], $$[$0]);
        this.$ = $$[$0-2];
    
break;
case 69:

		this.$ = parserUtils.generateTuple("INT", parserUtils.typeEnum.INT);
	
break;
case 70:

		this.$ = parserUtils.generateTuple("INT",parserUtils.typeEnum.DOUBLE);
	
break;
case 72:

		symbolTable.insert($$[$0-3]);
		symbolTable.setType($$[$0-3], parserUtils.typeEnum.STRUCT_TYPE);
		symbolTable.setObject($$[$0-3], $$[$0-1]);

		symbolTable.saveCurrentState(_$[$0-4].first_line);
		this.$ = [$$[$0-4], $$[$0-3], $$[$0-2]]; 
	
break;
case 73:

		console.log("Struct " + $$[$0]);
		this.$ = parserUtils.generateTuple($$[$0], parserUtils.typeEnum.STRUCT_TYPE);
	
break;
case 75:

		this.$ = [$$[$0]];
	
break;
case 76:
 
		$$[$0-1].push( $$[$0] );
		this.$ = $$[$0-1];	
	
break;
case 77:

		if( typeof $$[$0-2] == "object") {
			// Unify identifier with its datatype
			// Example of result of unification is 	Object { value="x",  type= Object { value="INT",  type=1 }} 
			this.$ = parserUtils.generateTuple($$[$0-1].value, $$[$0-2]); 
		} else {
			throw new Error("Unknown type " + $$[$0-2] + " in struct declaration. Line" + _$[$0-2].first_line);
		}
	
break;
case 88: case 98:
this.$ = [$$[$0-1], $$[$0]] //TODO;
break;
case 89:
this.$ = $$[$0] //Directly sends tuple of identifier;
break;
case 97:
this.$ = [$$[$0]]//TODO;
break;
case 112: case 143: case 158: case 164:
this.$ = [$$[$0-1], $$[$0]];
break;
case 123: case 137: case 138: case 153: case 154: case 155:
this.$ = [$$[$0-1]];
break;
case 126: case 133: case 135:
this.$ = [$$[$0-2], $$[$0]];
break;
case 134:
this.$ = [$$[$0-3], $$[$0-2], $$[$0]];
break;
case 140:
this.$ =[$$[$0]];
break;
case 141:
this.$ =[$$[$0-1], $$[$0]];
break;
case 144:
this.$ = [$$[$0]] //no use;
break;
case 145:

        symbolTable.saveCurrentState(_$[$0-1].first_line);
    
break;
case 161:
this.$ = [$$[$0-3], $$[$0-2], $$[$0-1], $$[$0]];
break;
}
},
table: [{3:1,4:2,7:$V0,10:$V1,27:$V2,60:5,61:6,64:8,66:7,70:$V3,71:$V4,72:$V5,73:$V6,74:15,75:19,79:$V7,88:9,89:10,118:3,119:4},{1:[3]},{5:[1,21],7:$V0,10:$V1,27:$V2,60:5,61:6,64:8,66:7,70:$V3,71:$V4,72:$V5,73:$V6,74:15,75:19,79:$V7,88:9,89:10,118:22,119:4},o($V8,[2,157]),o($V8,[2,159]),o($V8,[2,160]),{7:$V0,10:$V1,27:$V2,62:$V9,63:25,65:26,66:23,88:9,89:10},{60:29,61:31,64:8,70:$V3,71:$V4,72:$V5,73:$V6,74:15,75:19,76:$Va,79:$V7,100:28,108:27},o($Vb,[2,62]),{7:$V0,10:$V1,89:32},o($Vc,[2,89],{10:$Vd,14:$Ve}),o($Vb,[2,67]),o($Vb,[2,68]),o($Vb,[2,69]),o($Vb,[2,70]),o($Vb,[2,71]),o($Vf,[2,97],{88:35,27:$V2}),o($Vg,[2,90]),{7:$V0,10:$V1,27:$V2,66:36,88:9,89:10},{7:[1,37]},{7:[2,74]},{1:[2,1]},o($V8,[2,158]),{58:$Vh,60:29,61:31,62:$Vi,64:8,70:$V3,71:$V4,72:$V5,73:$V6,74:15,75:19,76:$Va,79:$V7,100:39,108:38},o($Vj,[2,60]),{62:[1,41]},{62:[2,63]},{60:43,61:31,64:8,70:$V3,71:$V4,72:$V5,73:$V6,74:15,75:19,76:$Va,79:$V7,100:42},o($V8,[2,164]),o($Vk,[2,140]),{6:75,7:$Vl,8:$Vm,9:$Vn,10:$Vo,11:58,13:71,19:67,21:69,22:72,23:93,24:$Vp,26:$Vq,27:$Vr,28:$Vs,29:$Vt,30:$Vu,31:$Vv,32:92,35:91,36:90,37:89,42:88,45:87,46:86,48:82,50:74,52:70,54:68,60:29,61:31,62:$Vw,64:8,70:$V3,71:$V4,72:$V5,73:$V6,74:15,75:19,76:$Va,78:[1,44],79:$V7,98:47,99:48,100:49,101:50,102:51,103:52,104:53,105:$Vx,106:$Vy,107:45,108:46,109:$Vz,111:$VA,112:$VB,113:$VC,114:$VD,115:$VE,116:$VF,117:$VG},{7:$V0,10:$V1,27:$V2,62:$V9,63:25,65:26,66:94,88:9,89:10},o($Vc,[2,88],{10:$Vd,14:$Ve}),{6:75,7:$VH,8:$Vm,9:$Vn,10:$Vo,13:71,15:[1,96],21:98,22:72,23:93,24:$Vp,26:$Vq,27:$Vr,28:$Vs,29:$Vt,30:$Vu,31:$Vv,32:92,35:91,36:90,37:89,42:88,45:87,46:86,48:82,50:74,52:70,54:97,59:95},{7:[1,104],12:[1,102],61:106,64:8,70:$V3,71:$V4,72:$V5,73:$V6,74:15,75:19,79:$V7,90:100,91:101,92:103,94:105},o($Vf,[2,98]),{12:[1,107]},o($Vb,[2,73],{76:[1,108]}),{60:43,61:31,64:8,70:$V3,71:$V4,72:$V5,73:$V6,74:15,75:19,76:$Va,79:$V7,100:109},o($V8,[2,162]),{6:75,7:$VH,8:$Vm,9:$Vn,10:$Vo,13:71,19:111,21:69,22:72,23:93,24:$Vp,26:$Vq,27:$Vr,28:$Vs,29:$Vt,30:$Vu,31:$Vv,32:92,35:91,36:90,37:89,42:88,45:87,46:86,48:82,50:74,52:70,54:68,67:110,76:$VI},o($Vj,[2,61]),o($V8,[2,163]),o($Vk,[2,141]),o($VJ,[2,136]),{6:75,7:$Vl,8:$Vm,9:$Vn,10:$Vo,11:58,13:71,19:67,21:69,22:72,23:93,24:$Vp,26:$Vq,27:$Vr,28:$Vs,29:$Vt,30:$Vu,31:$Vv,32:92,35:91,36:90,37:89,42:88,45:87,46:86,48:82,50:74,52:70,54:68,62:$Vw,76:$Va,78:[1,113],98:114,99:48,100:49,101:50,102:51,103:52,104:53,105:$Vx,106:$Vy,109:$Vz,111:$VA,112:$VB,113:$VC,114:$VD,115:$VE,116:$VF,117:$VG},{6:75,7:$Vl,8:$Vm,9:$Vn,10:$Vo,11:58,13:71,19:67,21:69,22:72,23:93,24:$Vp,26:$Vq,27:$Vr,28:$Vs,29:$Vt,30:$Vu,31:$Vv,32:92,35:91,36:90,37:89,42:88,45:87,46:86,48:82,50:74,52:70,54:68,60:43,61:31,62:$Vw,64:8,70:$V3,71:$V4,72:$V5,73:$V6,74:15,75:19,76:$Va,78:[1,115],79:$V7,98:47,99:48,100:49,101:50,102:51,103:52,104:53,105:$Vx,106:$Vy,107:116,109:$Vz,111:$VA,112:$VB,113:$VC,114:$VD,115:$VE,116:$VF,117:$VG},o($VK,[2,142]),o($VL,[2,127]),o($VL,[2,128]),o($VL,[2,129]),o($VL,[2,130]),o($VL,[2,131]),o($VL,[2,132]),o([10,14,17,18,20,26,27,28,29,33,34,38,39,40,41,43,44,47,49,51,53,55,58,62],$VM,{56:[1,117]}),{6:75,7:$VH,8:$Vm,9:$Vn,10:$Vo,13:71,21:98,22:72,23:93,24:$Vp,26:$Vq,27:$Vr,28:$Vs,29:$Vt,30:$Vu,31:$Vv,32:92,35:91,36:90,37:89,42:88,45:87,46:86,48:82,50:74,52:70,54:97,59:118},{56:[1,119]},o($VN,[2,144]),{20:$VO,62:[1,120]},{10:[1,122]},{10:[1,123]},{10:[1,124]},{6:75,7:$Vl,8:$Vm,9:$Vn,10:$Vo,11:58,13:71,19:67,21:69,22:72,23:93,24:$Vp,26:$Vq,27:$Vr,28:$Vs,29:$Vt,30:$Vu,31:$Vv,32:92,35:91,36:90,37:89,42:88,45:87,46:86,48:82,50:74,52:70,54:68,62:$Vw,76:$Va,98:125,99:48,100:49,101:50,102:51,103:52,104:53,105:$Vx,106:$Vy,109:$Vz,111:$VA,112:$VB,113:$VC,114:$VD,115:$VE,116:$VF,117:$VG},{10:[1,126]},{62:[1,127]},{62:[1,128]},{6:75,7:$VH,8:$Vm,9:$Vn,10:$Vo,11:130,13:71,19:67,21:69,22:72,23:93,24:$Vp,26:$Vq,27:$Vr,28:$Vs,29:$Vt,30:$Vu,31:$Vv,32:92,35:91,36:90,37:89,42:88,45:87,46:86,48:82,50:74,52:70,54:68,62:[1,129]},o($VP,[2,57]),o($VQ,[2,54]),o($VR,$VS,{57:131,58:[1,132]}),o($VQ,[2,52],{53:[1,134],55:[1,133]}),o($VT,[2,14],{10:[1,136],14:[1,135],17:[1,137],18:[1,138]}),{6:75,7:$VH,8:$Vm,9:$Vn,10:$Vo,13:71,21:98,22:72,23:139,24:$Vp,26:$Vq,27:$Vr,28:$Vs,29:$Vt,30:$Vu,31:$Vv},{6:75,7:$VH,8:$Vm,9:$Vn,10:[1,141],13:71,21:140,22:72,24:$Vp,26:$Vq,27:$Vr,28:$Vs,29:$Vt,30:$Vu,31:$Vv},o($VU,[2,50],{51:$VV}),o($VW,[2,6]),o($VX,[2,18]),o($VX,[2,19]),o($VX,[2,20]),o($VX,[2,21]),o($VX,[2,22]),o($VX,[2,23]),o($VY,[2,48],{49:$VZ}),o($VW,[2,3]),o($VW,[2,4]),{6:75,7:$VH,8:$Vm,9:$Vn,10:$Vo,11:144,13:71,19:67,21:69,22:72,23:93,24:$Vp,25:145,26:$Vq,27:$Vr,28:$Vs,29:$Vt,30:$Vu,31:$Vv,32:92,35:91,36:90,37:89,42:88,45:87,46:86,48:82,50:74,52:70,54:68,64:147,70:$V3,71:$V4,72:$V5,73:$V6,74:15,75:19,79:$V7,81:146},o($V_,[2,46],{47:$V$}),o($V01,[2,44],{26:$V11}),o($V21,[2,42],{43:$V31,44:$V41}),o($V51,[2,39],{38:$V61,39:$V71,40:$V81,41:$V91}),o($Va1,[2,34]),o($Va1,[2,33],{28:[1,156],29:[1,157]}),o($Vb1,[2,30],{27:$Vc1,33:$Vd1,34:$Ve1}),o($VR,[2,26]),{58:$Vh,62:$Vi},{15:[1,161]},o($Vg,[2,93]),o([15,56],[2,59]),o($VT,$VS),o($VW,$VM),{12:[1,162]},{12:[1,163],20:[1,164]},o($Vg,[2,96]),{12:[2,99],20:[1,165]},o($Vf1,[2,106]),o($Vf1,[2,101]),o($Vf1,[2,105],{89:10,66:166,95:167,88:168,96:169,7:$V0,10:$Vg1,14:$Vh1,27:$V2}),o($Vg,[2,91]),{64:147,70:$V3,71:$V4,72:$V5,73:$V6,74:15,75:19,77:172,79:$V7,80:173,81:174},o($V8,[2,161]),{62:[2,65]},o($Vi1,[2,122]),{6:75,7:$VH,8:$Vm,9:$Vn,10:$Vo,13:71,19:111,21:69,22:72,23:93,24:$Vp,26:$Vq,27:$Vr,28:$Vs,29:$Vt,30:$Vu,31:$Vv,32:92,35:91,36:90,37:89,42:88,45:87,46:86,48:82,50:74,52:70,54:68,67:176,76:$VI,97:175},o($VJ,[2,137]),o($VK,[2,143]),o($VJ,[2,138]),{6:75,7:$Vl,8:$Vm,9:$Vn,10:$Vo,11:58,13:71,19:67,21:69,22:72,23:93,24:$Vp,26:$Vq,27:$Vr,28:$Vs,29:$Vt,30:$Vu,31:$Vv,32:92,35:91,36:90,37:89,42:88,45:87,46:86,48:82,50:74,52:70,54:68,62:$Vw,76:$Va,78:[1,177],98:114,99:48,100:49,101:50,102:51,103:52,104:53,105:$Vx,106:$Vy,109:$Vz,111:$VA,112:$VB,113:$VC,114:$VD,115:$VE,116:$VF,117:$VG},{6:75,7:$Vl,8:$Vm,9:$Vn,10:$Vo,11:58,13:71,19:67,21:69,22:72,23:93,24:$Vp,26:$Vq,27:$Vr,28:$Vs,29:$Vt,30:$Vu,31:$Vv,32:92,35:91,36:90,37:89,42:88,45:87,46:86,48:82,50:74,52:70,54:68,62:$Vw,76:$Va,98:178,99:48,100:49,101:50,102:51,103:52,104:53,105:$Vx,106:$Vy,109:$Vz,111:$VA,112:$VB,113:$VC,114:$VD,115:$VE,116:$VF,117:$VG},{56:[1,179]},{6:75,7:$Vl,8:$Vm,9:$Vn,10:$Vo,11:58,13:71,19:67,21:69,22:72,23:93,24:$Vp,26:$Vq,27:$Vr,28:$Vs,29:$Vt,30:$Vu,31:$Vv,32:92,35:91,36:90,37:89,42:88,45:87,46:86,48:82,50:74,52:70,54:68,62:$Vw,76:$Va,98:180,99:48,100:49,101:50,102:51,103:52,104:53,105:$Vx,106:$Vy,109:$Vz,111:$VA,112:$VB,113:$VC,114:$VD,115:$VE,116:$VF,117:$VG},o($VN,[2,145]),{6:75,7:$VH,8:$Vm,9:$Vn,10:$Vo,13:71,19:181,21:69,22:72,23:93,24:$Vp,26:$Vq,27:$Vr,28:$Vs,29:$Vt,30:$Vu,31:$Vv,32:92,35:91,36:90,37:89,42:88,45:87,46:86,48:82,50:74,52:70,54:68},{6:75,7:$VH,8:$Vm,9:$Vn,10:$Vo,11:182,13:71,19:67,21:69,22:72,23:93,24:$Vp,26:$Vq,27:$Vr,28:$Vs,29:$Vt,30:$Vu,31:$Vv,32:92,35:91,36:90,37:89,42:88,45:87,46:86,48:82,50:74,52:70,54:68},{6:75,7:$VH,8:$Vm,9:$Vn,10:$Vo,11:183,13:71,19:67,21:69,22:72,23:93,24:$Vp,26:$Vq,27:$Vr,28:$Vs,29:$Vt,30:$Vu,31:$Vv,32:92,35:91,36:90,37:89,42:88,45:87,46:86,48:82,50:74,52:70,54:68},{6:75,7:$VH,8:$Vm,9:$Vn,10:$Vo,11:184,13:71,19:67,21:69,22:72,23:93,24:$Vp,26:$Vq,27:$Vr,28:$Vs,29:$Vt,30:$Vu,31:$Vv,32:92,35:91,36:90,37:89,42:88,45:87,46:86,48:82,50:74,52:70,54:68},{112:[1,185]},{6:75,7:$VH,8:$Vm,9:$Vn,10:$Vo,11:58,13:71,19:67,21:69,22:72,23:93,24:$Vp,26:$Vq,27:$Vr,28:$Vs,29:$Vt,30:$Vu,31:$Vv,32:92,35:91,36:90,37:89,42:88,45:87,46:86,48:82,50:74,52:70,54:68,62:$Vw,101:186},o($VL,[2,153]),o($VL,[2,154]),o($VL,[2,155]),{20:$VO,62:[1,187]},{6:75,7:$VH,8:$Vm,9:$Vn,10:$Vo,13:71,19:188,21:69,22:72,23:93,24:$Vp,26:$Vq,27:$Vr,28:$Vs,29:$Vt,30:$Vu,31:$Vv,32:92,35:91,36:90,37:89,42:88,45:87,46:86,48:82,50:74,52:70,54:68},o($VX,[2,56]),{6:75,7:$VH,8:$Vm,9:$Vn,10:$Vo,11:189,13:71,19:67,21:69,22:72,23:93,24:$Vp,26:$Vq,27:$Vr,28:$Vs,29:$Vt,30:$Vu,31:$Vv,32:92,35:91,36:90,37:89,42:88,45:87,46:86,48:82,50:74,52:70,54:68},{6:75,7:$VH,8:$Vm,9:$Vn,10:$Vo,13:71,21:98,22:72,23:93,24:$Vp,26:$Vq,27:$Vr,28:$Vs,29:$Vt,30:$Vu,31:$Vv,32:92,35:91,36:90,37:89,42:88,45:87,46:86,48:82,50:190},{6:75,7:$VH,8:$Vm,9:$Vn,10:$Vo,11:191,13:71,19:67,21:69,22:72,23:93,24:$Vp,26:$Vq,27:$Vr,28:$Vs,29:$Vt,30:$Vu,31:$Vv,32:92,35:91,36:90,37:89,42:88,45:87,46:86,48:82,50:74,52:70,54:68},{6:75,7:$VH,8:$Vm,9:$Vn,10:$Vo,12:[1,192],13:71,16:193,19:194,21:69,22:72,23:93,24:$Vp,26:$Vq,27:$Vr,28:$Vs,29:$Vt,30:$Vu,31:$Vv,32:92,35:91,36:90,37:89,42:88,45:87,46:86,48:82,50:74,52:70,54:68},{7:[1,195]},{7:[1,196]},o($VT,[2,15]),o($VT,[2,16]),{6:75,7:$VH,8:$Vm,9:$Vn,10:$Vo,11:144,13:71,19:67,21:69,22:72,23:93,24:$Vp,25:197,26:$Vq,27:$Vr,28:$Vs,29:$Vt,30:$Vu,31:$Vv,32:92,35:91,36:90,37:89,42:88,45:87,46:86,48:82,50:74,52:70,54:68,64:147,70:$V3,71:$V4,72:$V5,73:$V6,74:15,75:19,79:$V7,81:146},{6:75,7:$VH,8:$Vm,9:$Vn,10:$Vo,13:71,21:98,22:72,23:93,24:$Vp,26:$Vq,27:$Vr,28:$Vs,29:$Vt,30:$Vu,31:$Vv,32:92,35:91,36:90,37:89,42:88,45:87,46:86,48:198},{6:75,7:$VH,8:$Vm,9:$Vn,10:$Vo,13:71,21:98,22:72,23:93,24:$Vp,26:$Vq,27:$Vr,28:$Vs,29:$Vt,30:$Vu,31:$Vv,32:92,35:91,36:90,37:89,42:88,45:87,46:199},{12:[1,200],20:$VO},{12:[1,201]},{10:$Vj1,12:[2,108],14:$Vh1,27:$V2,88:203,95:202,96:169},o([7,10,12,14,27],[2,78]),{6:75,7:$VH,8:$Vm,9:$Vn,10:$Vo,13:71,21:98,22:72,23:93,24:$Vp,26:$Vq,27:$Vr,28:$Vs,29:$Vt,30:$Vu,31:$Vv,32:92,35:91,36:90,37:89,42:88,45:205},{6:75,7:$VH,8:$Vm,9:$Vn,10:$Vo,13:71,21:98,22:72,23:93,24:$Vp,26:$Vq,27:$Vr,28:$Vs,29:$Vt,30:$Vu,31:$Vv,32:92,35:91,36:90,37:89,42:206},{6:75,7:$VH,8:$Vm,9:$Vn,10:$Vo,13:71,21:98,22:72,23:93,24:$Vp,26:$Vq,27:$Vr,28:$Vs,29:$Vt,30:$Vu,31:$Vv,32:92,35:91,36:90,37:207},{6:75,7:$VH,8:$Vm,9:$Vn,10:$Vo,13:71,21:98,22:72,23:93,24:$Vp,26:$Vq,27:$Vr,28:$Vs,29:$Vt,30:$Vu,31:$Vv,32:92,35:91,36:90,37:208},{6:75,7:$VH,8:$Vm,9:$Vn,10:$Vo,13:71,21:98,22:72,23:93,24:$Vp,26:$Vq,27:$Vr,28:$Vs,29:$Vt,30:$Vu,31:$Vv,32:92,35:91,36:209},{6:75,7:$VH,8:$Vm,9:$Vn,10:$Vo,13:71,21:98,22:72,23:93,24:$Vp,26:$Vq,27:$Vr,28:$Vs,29:$Vt,30:$Vu,31:$Vv,32:92,35:91,36:210},{6:75,7:$VH,8:$Vm,9:$Vn,10:$Vo,13:71,21:98,22:72,23:93,24:$Vp,26:$Vq,27:$Vr,28:$Vs,29:$Vt,30:$Vu,31:$Vv,32:92,35:91,36:211},{6:75,7:$VH,8:$Vm,9:$Vn,10:$Vo,13:71,21:98,22:72,23:93,24:$Vp,26:$Vq,27:$Vr,28:$Vs,29:$Vt,30:$Vu,31:$Vv,32:92,35:91,36:212},{6:75,7:$VH,8:$Vm,9:$Vn,10:$Vo,13:71,21:98,22:72,23:93,24:$Vp,26:$Vq,27:$Vr,28:$Vs,29:$Vt,30:$Vu,31:$Vv,32:213},{6:75,7:$VH,8:$Vm,9:$Vn,10:$Vo,13:71,21:98,22:72,23:93,24:$Vp,26:$Vq,27:$Vr,28:$Vs,29:$Vt,30:$Vu,31:$Vv,32:214},{6:75,7:$VH,8:$Vm,9:$Vn,10:$Vo,13:71,21:98,22:72,23:215,24:$Vp,26:$Vq,27:$Vr,28:$Vs,29:$Vt,30:$Vu,31:$Vv},{6:75,7:$VH,8:$Vm,9:$Vn,10:$Vo,13:71,21:98,22:72,23:216,24:$Vp,26:$Vq,27:$Vr,28:$Vs,29:$Vt,30:$Vu,31:$Vv},{6:75,7:$VH,8:$Vm,9:$Vn,10:$Vo,13:71,21:98,22:72,23:217,24:$Vp,26:$Vq,27:$Vr,28:$Vs,29:$Vt,30:$Vu,31:$Vv},o($Vg,[2,92]),o($Vg,[2,94]),o($Vg,[2,95]),{7:[1,218]},{61:106,64:8,70:$V3,71:$V4,72:$V5,73:$V6,74:15,75:19,79:$V7,93:[1,219],94:220},o($Vf1,[2,103]),o($Vf1,[2,104]),o($Vf1,$Vk1,{89:32,96:221,7:$V0,10:$Vg1,14:$Vh1}),o($Vf1,[2,111],{10:$Vl1,14:$Vm1}),{7:$V0,10:$Vg1,12:$Vn1,14:$Vh1,27:$V2,61:106,64:8,66:36,70:$V3,71:$V4,72:$V5,73:$V6,74:15,75:19,79:$V7,88:168,89:10,90:226,92:103,94:105,95:224,96:169},{6:75,7:$VH,8:$Vm,9:$Vn,10:$Vo,13:71,15:[1,227],21:98,22:72,23:93,24:$Vp,26:$Vq,27:$Vr,28:$Vs,29:$Vt,30:$Vu,31:$Vv,32:92,35:91,36:90,37:89,42:88,45:87,46:86,48:82,50:74,52:70,54:97,59:228},{64:147,70:$V3,71:$V4,72:$V5,73:$V6,74:15,75:19,78:[1,229],79:$V7,80:230,81:174},o($Vo1,[2,75]),{7:$V0,10:$V1,27:$V2,66:233,82:231,83:232,88:9,89:10},{20:[1,235],78:[1,234]},o($Vp1,[2,125]),o($VJ,[2,139]),o($VL,[2,133]),{6:75,7:$Vl,8:$Vm,9:$Vn,10:$Vo,11:58,13:71,19:67,21:69,22:72,23:93,24:$Vp,26:$Vq,27:$Vr,28:$Vs,29:$Vt,30:$Vu,31:$Vv,32:92,35:91,36:90,37:89,42:88,45:87,46:86,48:82,50:74,52:70,54:68,62:$Vw,76:$Va,98:236,99:48,100:49,101:50,102:51,103:52,104:53,105:$Vx,106:$Vy,109:$Vz,111:$VA,112:$VB,113:$VC,114:$VD,115:$VE,116:$VF,117:$VG},o($VL,[2,135]),o($VP,[2,58]),{12:[1,237],20:$VO},{12:[1,238],20:$VO},{12:[1,239],20:$VO},{10:[1,240]},{6:75,7:$VH,8:$Vm,9:$Vn,10:$Vo,11:58,13:71,19:67,21:69,22:72,23:93,24:$Vp,26:$Vq,27:$Vr,28:$Vs,29:$Vt,30:$Vu,31:$Vv,32:92,35:91,36:90,37:89,42:88,45:87,46:86,48:82,50:74,52:70,54:68,62:$Vw,101:241},o($VL,[2,156]),o($VQ,[2,55]),{20:$VO,56:[1,242]},o($VU,[2,51],{51:$VV}),{15:[1,243],20:$VO},o($VW,[2,8]),{12:[1,244],20:[1,245]},o($Vf1,[2,12]),o($VW,[2,10]),o($VW,[2,11]),{12:[1,246]},o($VY,[2,49],{49:$VZ}),o($V_,[2,47],{47:$V$}),o($VW,[2,5]),{6:75,7:$VH,8:$Vm,9:$Vn,10:$Vo,13:71,21:98,22:72,23:247,24:$Vp,26:$Vq,27:$Vr,28:$Vs,29:$Vt,30:$Vu,31:$Vv},{12:[2,109]},{10:$Vj1,12:$Vk1,14:$Vh1,96:221},{10:$Vj1,12:$Vn1,14:$Vh1,27:$V2,61:106,64:8,70:$V3,71:$V4,72:$V5,73:$V6,74:15,75:19,79:$V7,88:203,90:226,92:103,94:105,95:224,96:169},o($V01,[2,45],{26:$V11}),o($V21,[2,43],{43:$V31,44:$V41}),o($V51,[2,40],{38:$V61,39:$V71,40:$V81,41:$V91}),o($V51,[2,41],{38:$V61,39:$V71,40:$V81,41:$V91}),o($Va1,[2,35]),o($Va1,[2,36]),o($Va1,[2,37]),o($Va1,[2,38]),o($Vb1,[2,31],{27:$Vc1,33:$Vd1,34:$Ve1}),o($Vb1,[2,32],{27:$Vc1,33:$Vd1,34:$Ve1}),o($VR,[2,27]),o($VR,[2,28]),o($VR,[2,29]),o($Vf1,[2,107]),{12:[2,100]},o($Vf1,[2,102]),o($Vf1,[2,112],{10:$Vl1,14:$Vm1}),{6:75,7:$VH,8:$Vm,9:$Vn,10:$Vo,13:71,15:[1,248],21:98,22:72,23:93,24:$Vp,26:$Vq,27:$Vr,28:$Vs,29:$Vt,30:$Vu,31:$Vv,32:92,35:91,36:90,37:89,42:88,45:87,46:86,48:82,50:74,52:70,54:97,59:249},{12:[1,250],61:106,64:8,70:$V3,71:$V4,72:$V5,73:$V6,74:15,75:19,79:$V7,90:251,92:103,94:105},{12:[1,252]},o($Vq1,[2,118]),{12:[1,253]},o($Vq1,[2,114]),{15:[1,254]},o($Vb,[2,72]),o($Vo1,[2,76]),{62:[1,255]},{62:[2,79]},{62:[2,80]},o($Vi1,[2,123]),{6:75,7:$VH,8:$Vm,9:$Vn,10:$Vo,13:71,19:111,21:69,22:72,23:93,24:$Vp,26:$Vq,27:$Vr,28:$Vs,29:$Vt,30:$Vu,31:$Vv,32:92,35:91,36:90,37:89,42:88,45:87,46:86,48:82,50:74,52:70,54:68,67:257,76:$VI,78:[1,256]},o($VL,[2,134]),{6:75,7:$Vl,8:$Vm,9:$Vn,10:$Vo,11:58,13:71,19:67,21:69,22:72,23:93,24:$Vp,26:$Vq,27:$Vr,28:$Vs,29:$Vt,30:$Vu,31:$Vv,32:92,35:91,36:90,37:89,42:88,45:87,46:86,48:82,50:74,52:70,54:68,62:$Vw,76:$Va,98:258,99:48,100:49,101:50,102:51,103:52,104:53,105:$Vx,106:$Vy,109:$Vz,111:$VA,112:$VB,113:$VC,114:$VD,115:$VE,116:$VF,117:$VG},{6:75,7:$Vl,8:$Vm,9:$Vn,10:$Vo,11:58,13:71,19:67,21:69,22:72,23:93,24:$Vp,26:$Vq,27:$Vr,28:$Vs,29:$Vt,30:$Vu,31:$Vv,32:92,35:91,36:90,37:89,42:88,45:87,46:86,48:82,50:74,52:70,54:68,62:$Vw,76:$Va,98:259,99:48,100:49,101:50,102:51,103:52,104:53,105:$Vx,106:$Vy,109:$Vz,111:$VA,112:$VB,113:$VC,114:$VD,115:$VE,116:$VF,117:$VG},{6:75,7:$Vl,8:$Vm,9:$Vn,10:$Vo,11:58,13:71,19:67,21:69,22:72,23:93,24:$Vp,26:$Vq,27:$Vr,28:$Vs,29:$Vt,30:$Vu,31:$Vv,32:92,35:91,36:90,37:89,42:88,45:87,46:86,48:82,50:74,52:70,54:68,62:$Vw,76:$Va,98:260,99:48,100:49,101:50,102:51,103:52,104:53,105:$Vx,106:$Vy,109:$Vz,111:$VA,112:$VB,113:$VC,114:$VD,115:$VE,116:$VF,117:$VG},{6:75,7:$VH,8:$Vm,9:$Vn,10:$Vo,11:261,13:71,19:67,21:69,22:72,23:93,24:$Vp,26:$Vq,27:$Vr,28:$Vs,29:$Vt,30:$Vu,31:$Vv,32:92,35:91,36:90,37:89,42:88,45:87,46:86,48:82,50:74,52:70,54:68},{6:75,7:$VH,8:$Vm,9:$Vn,10:$Vo,11:263,12:[1,262],13:71,19:67,21:69,22:72,23:93,24:$Vp,26:$Vq,27:$Vr,28:$Vs,29:$Vt,30:$Vu,31:$Vv,32:92,35:91,36:90,37:89,42:88,45:87,46:86,48:82,50:74,52:70,54:68},{6:75,7:$VH,8:$Vm,9:$Vn,10:$Vo,13:71,21:98,22:72,23:93,24:$Vp,26:$Vq,27:$Vr,28:$Vs,29:$Vt,30:$Vu,31:$Vv,32:92,35:91,36:90,37:89,42:88,45:87,46:86,48:82,50:74,52:70,54:264},o($VW,[2,7]),o($VW,[2,9]),{6:75,7:$VH,8:$Vm,9:$Vn,10:$Vo,13:71,19:265,21:69,22:72,23:93,24:$Vp,26:$Vq,27:$Vr,28:$Vs,29:$Vt,30:$Vu,31:$Vv,32:92,35:91,36:90,37:89,42:88,45:87,46:86,48:82,50:74,52:70,54:68},o($VT,[2,17]),o($VT,[2,25]),o($Vq1,[2,116]),{15:[1,266]},o($Vq1,[2,120]),{12:[1,267]},o($Vq1,[2,113]),o($Vq1,[2,119]),o($Vq1,[2,115]),o($Vo1,[2,77]),o($Vi1,[2,124]),o($Vp1,[2,126]),o($VK,[2,146],{110:[1,268]}),o($VL,[2,148]),o($VL,[2,149]),{12:[1,269],20:$VO},{6:75,7:$Vl,8:$Vm,9:$Vn,10:$Vo,11:58,13:71,19:67,21:69,22:72,23:93,24:$Vp,26:$Vq,27:$Vr,28:$Vs,29:$Vt,30:$Vu,31:$Vv,32:92,35:91,36:90,37:89,42:88,45:87,46:86,48:82,50:74,52:70,54:68,62:$Vw,76:$Va,98:270,99:48,100:49,101:50,102:51,103:52,104:53,105:$Vx,106:$Vy,109:$Vz,111:$VA,112:$VB,113:$VC,114:$VD,115:$VE,116:$VF,117:$VG},{12:[1,271],20:$VO},o($VQ,[2,53]),o($Vf1,[2,13]),o($Vq1,[2,117]),o($Vq1,[2,121]),{6:75,7:$Vl,8:$Vm,9:$Vn,10:$Vo,11:58,13:71,19:67,21:69,22:72,23:93,24:$Vp,26:$Vq,27:$Vr,28:$Vs,29:$Vt,30:$Vu,31:$Vv,32:92,35:91,36:90,37:89,42:88,45:87,46:86,48:82,50:74,52:70,54:68,62:$Vw,76:$Va,98:272,99:48,100:49,101:50,102:51,103:52,104:53,105:$Vx,106:$Vy,109:$Vz,111:$VA,112:$VB,113:$VC,114:$VD,115:$VE,116:$VF,117:$VG},{62:[1,273]},o($VL,[2,151]),{6:75,7:$Vl,8:$Vm,9:$Vn,10:$Vo,11:58,13:71,19:67,21:69,22:72,23:93,24:$Vp,26:$Vq,27:$Vr,28:$Vs,29:$Vt,30:$Vu,31:$Vv,32:92,35:91,36:90,37:89,42:88,45:87,46:86,48:82,50:74,52:70,54:68,62:$Vw,76:$Va,98:274,99:48,100:49,101:50,102:51,103:52,104:53,105:$Vx,106:$Vy,109:$Vz,111:$VA,112:$VB,113:$VC,114:$VD,115:$VE,116:$VF,117:$VG},o($VL,[2,147]),o($VL,[2,150]),o($VL,[2,152])],
defaultActions: {20:[2,74],21:[2,1],26:[2,63],110:[2,65],202:[2,109],219:[2,100],232:[2,79],233:[2,80]},
parseError: function parseError(str, hash) {
    if (hash.recoverable) {
        this.trace(str);
    } else {
        function _parseError (msg, hash) {
            this.message = msg;
            this.hash = hash;
        }
        _parseError.prototype = Error;

        throw new _parseError(str, hash);
    }
},
parse: function parse(input) {
    var self = this, stack = [0], tstack = [], vstack = [null], lstack = [], table = this.table, yytext = '', yylineno = 0, yyleng = 0, recovering = 0, TERROR = 2, EOF = 1;
    var args = lstack.slice.call(arguments, 1);
    var lexer = Object.create(this.lexer);
    var sharedState = { yy: {} };
    for (var k in this.yy) {
        if (Object.prototype.hasOwnProperty.call(this.yy, k)) {
            sharedState.yy[k] = this.yy[k];
        }
    }
    lexer.setInput(input, sharedState.yy);
    sharedState.yy.lexer = lexer;
    sharedState.yy.parser = this;
    if (typeof lexer.yylloc == 'undefined') {
        lexer.yylloc = {};
    }
    var yyloc = lexer.yylloc;
    lstack.push(yyloc);
    var ranges = lexer.options && lexer.options.ranges;
    if (typeof sharedState.yy.parseError === 'function') {
        this.parseError = sharedState.yy.parseError;
    } else {
        this.parseError = Object.getPrototypeOf(this).parseError;
    }
    function popStack(n) {
        stack.length = stack.length - 2 * n;
        vstack.length = vstack.length - n;
        lstack.length = lstack.length - n;
    }
    _token_stack:
        var lex = function () {
            var token;
            token = lexer.lex() || EOF;
            if (typeof token !== 'number') {
                token = self.symbols_[token] || token;
            }
            return token;
        };
    var symbol, preErrorSymbol, state, action, a, r, yyval = {}, p, len, newState, expected;
    while (true) {
        state = stack[stack.length - 1];
        if (this.defaultActions[state]) {
            action = this.defaultActions[state];
        } else {
            if (symbol === null || typeof symbol == 'undefined') {
                symbol = lex();
            }
            action = table[state] && table[state][symbol];
        }
                    if (typeof action === 'undefined' || !action.length || !action[0]) {
                var errStr = '';
                expected = [];
                for (p in table[state]) {
                    if (this.terminals_[p] && p > TERROR) {
                        expected.push('\'' + this.terminals_[p] + '\'');
                    }
                }
                if (lexer.showPosition) {
                    errStr = 'Parse error on line ' + (yylineno + 1) + ':\n' + lexer.showPosition() + '\nExpecting ' + expected.join(', ') + ', got \'' + (this.terminals_[symbol] || symbol) + '\'';
                } else {
                    errStr = 'Parse error on line ' + (yylineno + 1) + ': Unexpected ' + (symbol == EOF ? 'end of input' : '\'' + (this.terminals_[symbol] || symbol) + '\'');
                }
                this.parseError(errStr, {
                    text: lexer.match,
                    token: this.terminals_[symbol] || symbol,
                    line: lexer.yylineno,
                    loc: yyloc,
                    expected: expected
                });
            }
        if (action[0] instanceof Array && action.length > 1) {
            throw new Error('Parse Error: multiple actions possible at state: ' + state + ', token: ' + symbol);
        }
        switch (action[0]) {
        case 1:
            stack.push(symbol);
            vstack.push(lexer.yytext);
            lstack.push(lexer.yylloc);
            stack.push(action[1]);
            symbol = null;
            if (!preErrorSymbol) {
                yyleng = lexer.yyleng;
                yytext = lexer.yytext;
                yylineno = lexer.yylineno;
                yyloc = lexer.yylloc;
                if (recovering > 0) {
                    recovering--;
                }
            } else {
                symbol = preErrorSymbol;
                preErrorSymbol = null;
            }
            break;
        case 2:
            len = this.productions_[action[1]][1];
            yyval.$ = vstack[vstack.length - len];
            yyval._$ = {
                first_line: lstack[lstack.length - (len || 1)].first_line,
                last_line: lstack[lstack.length - 1].last_line,
                first_column: lstack[lstack.length - (len || 1)].first_column,
                last_column: lstack[lstack.length - 1].last_column
            };
            if (ranges) {
                yyval._$.range = [
                    lstack[lstack.length - (len || 1)].range[0],
                    lstack[lstack.length - 1].range[1]
                ];
            }
            r = this.performAction.apply(yyval, [
                yytext,
                yyleng,
                yylineno,
                sharedState.yy,
                action[1],
                vstack,
                lstack
            ].concat(args));
            if (typeof r !== 'undefined') {
                return r;
            }
            if (len) {
                stack = stack.slice(0, -1 * len * 2);
                vstack = vstack.slice(0, -1 * len);
                lstack = lstack.slice(0, -1 * len);
            }
            stack.push(this.productions_[action[1]][0]);
            vstack.push(yyval.$);
            lstack.push(yyval._$);
            newState = table[stack[stack.length - 2]][stack[stack.length - 1]];
            stack.push(newState);
            break;
        case 3:
            return true;
        }
    }
    return true;
}};

    var symbolTable;
	"use strict";
 
var symbolTable = require('./symbolTable.js');
var parserUtils = require('./parserUtils.js');
var arithmetic = require('./arithmetic.js');
var assignment = require('./assignment.js');
var declaration = require('./declaration.js');
var struct = require('./struct.js');/* generated by jison-lex 0.3.4 */
var lexer = (function(){
var lexer = ({

EOF:1,

parseError:function parseError(str, hash) {
        if (this.yy.parser) {
            this.yy.parser.parseError(str, hash);
        } else {
            throw new Error(str);
        }
    },

// resets the lexer, sets new input
setInput:function (input, yy) {
        this.yy = yy || this.yy || {};
        this._input = input;
        this._more = this._backtrack = this.done = false;
        this.yylineno = this.yyleng = 0;
        this.yytext = this.matched = this.match = '';
        this.conditionStack = ['INITIAL'];
        this.yylloc = {
            first_line: 1,
            first_column: 0,
            last_line: 1,
            last_column: 0
        };
        if (this.options.ranges) {
            this.yylloc.range = [0,0];
        }
        this.offset = 0;
        return this;
    },

// consumes and returns one char from the input
input:function () {
        var ch = this._input[0];
        this.yytext += ch;
        this.yyleng++;
        this.offset++;
        this.match += ch;
        this.matched += ch;
        var lines = ch.match(/(?:\r\n?|\n).*/g);
        if (lines) {
            this.yylineno++;
            this.yylloc.last_line++;
        } else {
            this.yylloc.last_column++;
        }
        if (this.options.ranges) {
            this.yylloc.range[1]++;
        }

        this._input = this._input.slice(1);
        return ch;
    },

// unshifts one char (or a string) into the input
unput:function (ch) {
        var len = ch.length;
        var lines = ch.split(/(?:\r\n?|\n)/g);

        this._input = ch + this._input;
        this.yytext = this.yytext.substr(0, this.yytext.length - len);
        //this.yyleng -= len;
        this.offset -= len;
        var oldLines = this.match.split(/(?:\r\n?|\n)/g);
        this.match = this.match.substr(0, this.match.length - 1);
        this.matched = this.matched.substr(0, this.matched.length - 1);

        if (lines.length - 1) {
            this.yylineno -= lines.length - 1;
        }
        var r = this.yylloc.range;

        this.yylloc = {
            first_line: this.yylloc.first_line,
            last_line: this.yylineno + 1,
            first_column: this.yylloc.first_column,
            last_column: lines ?
                (lines.length === oldLines.length ? this.yylloc.first_column : 0)
                 + oldLines[oldLines.length - lines.length].length - lines[0].length :
              this.yylloc.first_column - len
        };

        if (this.options.ranges) {
            this.yylloc.range = [r[0], r[0] + this.yyleng - len];
        }
        this.yyleng = this.yytext.length;
        return this;
    },

// When called from action, caches matched text and appends it on next action
more:function () {
        this._more = true;
        return this;
    },

// When called from action, signals the lexer that this rule fails to match the input, so the next matching rule (regex) should be tested instead.
reject:function () {
        if (this.options.backtrack_lexer) {
            this._backtrack = true;
        } else {
            return this.parseError('Lexical error on line ' + (this.yylineno + 1) + '. You can only invoke reject() in the lexer when the lexer is of the backtracking persuasion (options.backtrack_lexer = true).\n' + this.showPosition(), {
                text: "",
                token: null,
                line: this.yylineno
            });

        }
        return this;
    },

// retain first n characters of the match
less:function (n) {
        this.unput(this.match.slice(n));
    },

// displays already matched input, i.e. for error messages
pastInput:function () {
        var past = this.matched.substr(0, this.matched.length - this.match.length);
        return (past.length > 20 ? '...':'') + past.substr(-20).replace(/\n/g, "");
    },

// displays upcoming input, i.e. for error messages
upcomingInput:function () {
        var next = this.match;
        if (next.length < 20) {
            next += this._input.substr(0, 20-next.length);
        }
        return (next.substr(0,20) + (next.length > 20 ? '...' : '')).replace(/\n/g, "");
    },

// displays the character position where the lexing error occurred, i.e. for error messages
showPosition:function () {
        var pre = this.pastInput();
        var c = new Array(pre.length + 1).join("-");
        return pre + this.upcomingInput() + "\n" + c + "^";
    },

// test the lexed token: return FALSE when not a match, otherwise return token
test_match:function (match, indexed_rule) {
        var token,
            lines,
            backup;

        if (this.options.backtrack_lexer) {
            // save context
            backup = {
                yylineno: this.yylineno,
                yylloc: {
                    first_line: this.yylloc.first_line,
                    last_line: this.last_line,
                    first_column: this.yylloc.first_column,
                    last_column: this.yylloc.last_column
                },
                yytext: this.yytext,
                match: this.match,
                matches: this.matches,
                matched: this.matched,
                yyleng: this.yyleng,
                offset: this.offset,
                _more: this._more,
                _input: this._input,
                yy: this.yy,
                conditionStack: this.conditionStack.slice(0),
                done: this.done
            };
            if (this.options.ranges) {
                backup.yylloc.range = this.yylloc.range.slice(0);
            }
        }

        lines = match[0].match(/(?:\r\n?|\n).*/g);
        if (lines) {
            this.yylineno += lines.length;
        }
        this.yylloc = {
            first_line: this.yylloc.last_line,
            last_line: this.yylineno + 1,
            first_column: this.yylloc.last_column,
            last_column: lines ?
                         lines[lines.length - 1].length - lines[lines.length - 1].match(/\r?\n?/)[0].length :
                         this.yylloc.last_column + match[0].length
        };
        this.yytext += match[0];
        this.match += match[0];
        this.matches = match;
        this.yyleng = this.yytext.length;
        if (this.options.ranges) {
            this.yylloc.range = [this.offset, this.offset += this.yyleng];
        }
        this._more = false;
        this._backtrack = false;
        this._input = this._input.slice(match[0].length);
        this.matched += match[0];
        token = this.performAction.call(this, this.yy, this, indexed_rule, this.conditionStack[this.conditionStack.length - 1]);
        if (this.done && this._input) {
            this.done = false;
        }
        if (token) {
            return token;
        } else if (this._backtrack) {
            // recover context
            for (var k in backup) {
                this[k] = backup[k];
            }
            return false; // rule action called reject() implying the next rule should be tested instead.
        }
        return false;
    },

// return next match in input
next:function () {
        if (this.done) {
            return this.EOF;
        }
        if (!this._input) {
            this.done = true;
        }

        var token,
            match,
            tempMatch,
            index;
        if (!this._more) {
            this.yytext = '';
            this.match = '';
        }
        var rules = this._currentRules();
        for (var i = 0; i < rules.length; i++) {
            tempMatch = this._input.match(this.rules[rules[i]]);
            if (tempMatch && (!match || tempMatch[0].length > match[0].length)) {
                match = tempMatch;
                index = i;
                if (this.options.backtrack_lexer) {
                    token = this.test_match(tempMatch, rules[i]);
                    if (token !== false) {
                        return token;
                    } else if (this._backtrack) {
                        match = false;
                        continue; // rule action called reject() implying a rule MISmatch.
                    } else {
                        // else: this is a lexer rule which consumes input without producing a token (e.g. whitespace)
                        return false;
                    }
                } else if (!this.options.flex) {
                    break;
                }
            }
        }
        if (match) {
            token = this.test_match(match, rules[index]);
            if (token !== false) {
                return token;
            }
            // else: this is a lexer rule which consumes input without producing a token (e.g. whitespace)
            return false;
        }
        if (this._input === "") {
            return this.EOF;
        } else {
            return this.parseError('Lexical error on line ' + (this.yylineno + 1) + '. Unrecognized text.\n' + this.showPosition(), {
                text: "",
                token: null,
                line: this.yylineno
            });
        }
    },

// return next match that has a token
lex:function lex() {
        var r = this.next();
        if (r) {
            return r;
        } else {
            return this.lex();
        }
    },

// activates a new lexer condition state (pushes the new lexer condition state onto the condition stack)
begin:function begin(condition) {
        this.conditionStack.push(condition);
    },

// pop the previously active lexer condition state off the condition stack
popState:function popState() {
        var n = this.conditionStack.length - 1;
        if (n > 0) {
            return this.conditionStack.pop();
        } else {
            return this.conditionStack[0];
        }
    },

// produce the lexer rule set which is active for the currently active lexer condition state
_currentRules:function _currentRules() {
        if (this.conditionStack.length && this.conditionStack[this.conditionStack.length - 1]) {
            return this.conditions[this.conditionStack[this.conditionStack.length - 1]].rules;
        } else {
            return this.conditions["INITIAL"].rules;
        }
    },

// return the currently active lexer condition state; when an index argument is provided it produces the N-th previous condition state, if available
topState:function topState(n) {
        n = this.conditionStack.length - 1 - Math.abs(n || 0);
        if (n >= 0) {
            return this.conditionStack[n];
        } else {
            return "INITIAL";
        }
    },

// alias for begin(condition)
pushState:function pushState(condition) {
        this.begin(condition);
    },

// return the number of states currently on the stack
stateStackSize:function stateStackSize() {
        return this.conditionStack.length;
    },
options: {},
performAction: function anonymous(yy,yy_,$avoiding_name_collisions,YY_START) {
var YYSTATE=YY_START;
switch($avoiding_name_collisions) {
case 0:/* IGNORE */                                 
break;
case 1:/* IGNORE */
break;
case 2:/* IGNORE */
break;
case 3:return 8
break;
case 4:return 'RIGHT_ASSIGN'
break;
case 5:return 'LEFT_ASSIGN'
break;
case 6:return 'ADD_ASSIGN'
break;
case 7:return 'SUB_ASSIGN'
break;
case 8:return 'MUL_ASSIGN'
break;
case 9:return 'DIV_ASSIGN'
break;
case 10:return 'MOD_ASSIGN'
break;
case 11:return 'AND_ASSIGN'
break;
case 12:return 'XOR_ASSIGN'
break;
case 13:return 'OR_ASSIGN'
break;
case 14:return 'RIGHT_OP'
break;
case 15:return 'LEFT_OP'
break;
case 16:return 'INC_OP'
break;
case 17:return 'DEC_OP'
break;
case 18:return 18
break;
case 19:return 51
break;
case 20:return 53
break;
case 21:return 40
break;
case 22:return 41
break;
case 23:return 43
break;
case 24:return 44
break;
case 25:return 62
break;
case 26:return 76
break;
case 27:return 78
break;
case 28:return 20
break;
case 29:return 56
break;
case 30:return 58
break;
case 31:return 10
break;
case 32:return 12
break;
case 33:return 14
break;
case 34:return 15
break;
case 35:return 17
break;
case 36:return 26
break;
case 37:return 31
break;
case 38:return 30
break;
case 39:return 29
break;
case 40:return 28
break;
case 41:return 27
break;
case 42:return 33
break;
case 43:return 34
break;
case 44:return 38
break;
case 45:return 39
break;
case 46:return 47
break;
case 47:return 49
break;
case 48:return 55
break;
case 49:return 116
break;
case 50:return 105
break;
case 51:return 71
break;
case 52:return 115
break;
case 53:return 106
break;
case 54:return 113
break;
case 55:return 73
break;
case 56:return 110
break;
case 57:return 'FLOAT'
break;
case 58:return 114
break;
case 59:return 109
break;
case 60:return 72
break;
case 61:return 'LONG'
break;
case 62:return 117
break;
case 63:return 'SHORT'
break;
case 64:return 'SIGNED'
break;
case 65:return 24
break;
case 66:return 79
break;
case 67:return 111
break;
case 68:return 69
break;
case 69:return 'UNION'
break;
case 70:return 'UNSIGNED'
break;
case 71:return 'VOID'
break;
case 72:return 112
break;
case 73:return 7 
break;
case 74:return 9
break;
case 75:return 5
break;
case 76:return 'INVALID'
break;
}
},
rules: [/^(?:[\t\v\n\f\s]+)/,/^(?:\/\/.*)/,/^(?:[\/][*][^*]*[*]+([^\/*][^*]*[*]+)*[\/])/,/^(?:[0-9]+(\.[0-9]+)?\b)/,/^(?:>>=)/,/^(?:<<=)/,/^(?:\+=)/,/^(?:-=)/,/^(?:\*=)/,/^(?:\/=)/,/^(?:%=)/,/^(?:&=)/,/^(?:\^=)/,/^(?:\|=)/,/^(?:>>)/,/^(?:<<)/,/^(?:\+\+)/,/^(?:--)/,/^(?:->)/,/^(?:&&)/,/^(?:\|\|)/,/^(?:<=)/,/^(?:>=)/,/^(?:==)/,/^(?:!=)/,/^(?:;)/,/^(?:\{)/,/^(?:\})/,/^(?:,)/,/^(?::)/,/^(?:=)/,/^(?:\()/,/^(?:\))/,/^(?:\[)/,/^(?:\])/,/^(?:\.)/,/^(?:&)/,/^(?:!)/,/^(?:~)/,/^(?:-)/,/^(?:\+)/,/^(?:\*)/,/^(?:\/)/,/^(?:%)/,/^(?:<)/,/^(?:>)/,/^(?:\^)/,/^(?:\|)/,/^(?:\?)/,/^(?:break\b)/,/^(?:case\b)/,/^(?:char\b)/,/^(?:continue\b)/,/^(?:default\b)/,/^(?:do\b)/,/^(?:double\b)/,/^(?:else\b)/,/^(?:float\b)/,/^(?:for\b)/,/^(?:if\b)/,/^(?:int\b)/,/^(?:long\b)/,/^(?:return\b)/,/^(?:short\b)/,/^(?:signed\b)/,/^(?:sizeof\b)/,/^(?:struct\b)/,/^(?:switch\b)/,/^(?:typedef\b)/,/^(?:union\b)/,/^(?:unsigned\b)/,/^(?:void\b)/,/^(?:while\b)/,/^(?:[_a-zA-Z][_a-zA-Z0-9]*)/,/^(?:"[^"]+")/,/^(?:$)/,/^(?:.)/],
conditions: {"INITIAL":{"rules":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76],"inclusive":true}}
});
return lexer;
})();
parser.lexer = lexer;
function Parser () {
  this.yy = {};
}
Parser.prototype = parser;parser.Parser = Parser;
return new Parser;
})();


if (typeof require !== 'undefined' && typeof exports !== 'undefined') {
exports.parser = ansic;
exports.Parser = ansic.Parser;
exports.parse = function () { return ansic.parse.apply(ansic, arguments); };
exports.main = function commonjsMain(args) {
    if (!args[1]) {
        console.log('Usage: '+args[0]+' FILE');
        process.exit(1);
    }
    var source = require('fs').readFileSync(require('path').normalize(args[1]), "utf8");
    return exports.parser.parse(source);
};
if (typeof module !== 'undefined' && require.main === module) {
  exports.main(process.argv.slice(1));
}
}
}).call(this,require('_process'))
},{"./arithmetic.js":8,"./assignment.js":9,"./declaration.js":10,"./parserUtils.js":11,"./struct.js":12,"./symbolTable.js":13,"_process":3,"fs":1,"path":2}],8:[function(require,module,exports){
var parserUtils = require('./parserUtils.js');
var symbolTable = require('./symbolTable.js');

var add = module.exports.add = function(operand1, operand2){
    
    // Convert identifiers to its value
    if(operand1.type === parserUtils.typeEnum.ID)
        operand1 = symbolTable.getObject(operand1.value);
    
    if(operand2.type === parserUtils.typeEnum.ID)
        operand2 = symbolTable.getObject(operand2.value);
    
    // Assure correct type of arguments
    if(operand1.type !== parserUtils.typeEnum.INT
        && operand1.type !== parserUtils.typeEnum.DOUBLE)
        throw new TypeError("Arguments of addition must be numbers");
    
    if(operand2.type !== parserUtils.typeEnum.INT
        && operand2.type !== parserUtils.typeEnum.DOUBLE)
        throw new TypeError("Arguments of addition must be numbers");
    
    var op1Val = operand1.value;
    var op2Val = operand2.value;
    
    
    if(isNaN(op1Val) || isNaN(op2Val)){
        throw new TypeError("Invalid arguments of addition");
    }
    
    // Calculate return type
    var resultType;
    if(operand1.type === parserUtils.typeEnum.INT && operand2.type ===  parserUtils.typeEnum.INT)
        resultType = parserUtils.typeEnum.INT;
    else
        resultType = parserUtils.typeEnum.DOUBLE;
    
    return parserUtils.generateTuple(op1Val + op2Val, resultType);
    
}

var subtract = module.exports.subtract = function(operand1, operand2){
    
    if(operand1.type === parserUtils.typeEnum.ID)
        operand1 = symbolTable.getObject(operand1.value);
    
    if(operand2.type === parserUtils.typeEnum.ID)
        operand2 = symbolTable.getObject(operand2.value);
    
    // Assure correct type of arguments
    if(operand1.type !== parserUtils.typeEnum.INT
        && operand1.type !== parserUtils.typeEnum.DOUBLE)
        throw new TypeError("Arguments of addition must be numbers");
    
    if(operand2.type !== parserUtils.typeEnum.INT
        && operand2.type !== parserUtils.typeEnum.DOUBLE)
        throw new TypeError("Arguments of addition must be numbers");
    
    var op1Val = operand1.value;
    var op2Val = operand2.value;
    
    
    if(isNaN(op1Val) || isNaN(op2Val)){
        throw new TypeError("Invalid arguments of addition");
    }
    
    // Calculate return type
    var resultType;
    if(operand1.type === parserUtils.typeEnum.INT && operand2.type ===  parserUtils.typeEnum.INT)
        resultType = parserUtils.typeEnum.INT;
    else
        resultType = parserUtils.typeEnum.DOUBLE;
    
    return parserUtils.generateTuple(op1Val - op2Val, resultType);
    
}

var multiply = module.exports.multiply = function(operand1, operand2){
    
    // Convert identifiers to its value
    if(operand1.type === parserUtils.typeEnum.ID)
        operand1 = symbolTable.getObject(operand1.value);
    
    if(operand2.type === parserUtils.typeEnum.ID)
        operand2 = symbolTable.getObject(operand2.value);
    
    // Assure correct type of arguments
    if(operand1.type !== parserUtils.typeEnum.INT
        && operand1.type !== parserUtils.typeEnum.DOUBLE)
        throw new TypeError("Arguments of multiplication must be numbers");
    
    if(operand2.type !== parserUtils.typeEnum.INT
        && operand2.type !== parserUtils.typeEnum.DOUBLE)
        throw new TypeError("Arguments of multiplication must be numbers");
    
    var op1Val = operand1.value;
    var op2Val = operand2.value;
    
    
    if(isNaN(op1Val) || isNaN(op2Val)){
        throw new TypeError("Invalid arguments of multiplication");
    }
    
    // Calculate return type
    var resultType;
    if(operand1.type === parserUtils.typeEnum.INT && operand2.type ===  parserUtils.typeEnum.INT)
        resultType = parserUtils.typeEnum.INT;
    else
        resultType = parserUtils.typeEnum.DOUBLE;
    
    return parserUtils.generateTuple(op1Val * op2Val, resultType);
}

// TODO: Division by 0
var divide = module.exports.divide = function(operand1, operand2){
    
    // Convert identifiers to its value
    if(operand1.type === parserUtils.typeEnum.ID)
        operand1 = symbolTable.getObject(operand1.value);
    
    if(operand2.type === parserUtils.typeEnum.ID)
        operand2 = symbolTable.getObject(operand2.value);
    
    // Assure correct type of arguments
    if(operand1.type !== parserUtils.typeEnum.INT
        && operand1.type !== parserUtils.typeEnum.DOUBLE)
        throw new TypeError("Arguments of division must be numbers");
    
    if(operand2.type !== parserUtils.typeEnum.INT
        && operand2.type !== parserUtils.typeEnum.DOUBLE)
        throw new TypeError("Arguments of division must be numbers");
    
    var op1Val = operand1.value;
    var op2Val = operand2.value;
    
    
    if(isNaN(op1Val) || isNaN(op2Val)){
        throw new TypeError("Invalid arguments of division");
    }
    
    // Calculate return type
    var resultDivision;
    var resultType;
    if(operand1.type === parserUtils.typeEnum.INT && operand2.type ===  parserUtils.typeEnum.INT){
        resultDivision = ~~(op1Val / op2Val);
        resultType = parserUtils.typeEnum.INT;
    } else {
        resultDivision = op1Val / op2Val;
        resultType = parserUtils.typeEnum.DOUBLE;
    }
    
    return parserUtils.generateTuple(resultDivision, resultType);
}

var mod = module.exports.mod = function(operand1, operand2){
    // Convert identifiers to its value
    if(operand1.type === parserUtils.typeEnum.ID)
        operand1 = symbolTable.getObject(operand1.value);
    
    if(operand2.type === parserUtils.typeEnum.ID)
        operand2 = symbolTable.getObject(operand2.value);
    
    if(operand1.type !== parserUtils.typeEnum.INT)
            throw new TypeError("Arguments of remainder must be integer numbers.");
        
    if(operand2.type !== parserUtils.typeEnum.INT)
            throw new TypeError("Arguments of remainder must be integer numbers.");
    
    var op1Val = operand1.value;
    var op2Val = operand2.value;
    var modulus = op1Val % op2Val;
        
    if(isNaN(op1Val) || isNaN(op2Val) || isNaN(modulus)){
        throw new TypeError("Value of remainder is invalid.");
    }
    
    return parserUtils.generateTuple(modulus, parserUtils.typeEnum.INT);
}
},{"./parserUtils.js":11,"./symbolTable.js":13}],9:[function(require,module,exports){
var parserUtils = require('./parserUtils.js');
var symbolTable = require('./symbolTable');

var compoundAssign = module.exports.compoundAssign = function(identifier, operator, tuple){
    if(operator === '=')
        return assign(identifier, tuple);
    else
        throw new TypeError('Assignment operator ' + operator + ' not supported');
    
    
}

var assign = function(receiver, tuple){

    if(receiver.type == parserUtils.typeEnum.STRUCT_ELEMENT){
        assignStructElement(receiver, tuple);
        return tuple;
    }

    // Check if receiver has already been defined in symbol table
    if(!symbolTable.lookUp(receiver.value))
        throw new Error('Identifier ' + receiver.value + ' is not defined.');
    
    // If it is an identifier, convert to its value
    if(tuple.type === parserUtils.typeEnum.ID)
        tuple = symbolTable.getObject(tuple.value);
    
    // Compare types
    var idType = symbolTable.getType(receiver.value);
    var tupleType = tuple.type;
    
    if(!isAssignable(idType.type, tupleType))
        throw new Error('Type ' + parserUtils.getReversedTypeEnum(tupleType) + ' can not be assigned to type ' + parserUtils.getReversedTypeEnum(idType));
    
    // Cast according to type
    var objectToAssign = cast(symbolTable.getType(receiver.value), tuple);
    
    // Apply assignment operator
    symbolTable.setObject(receiver.value, tuple);
    return symbolTable.getObject(receiver.value);
}

var assignStructElement = function(receiver, exprToAssign){
    console.log("assignStructElement");
    console.log(receiver);
    console.log(exprToAssign);
    var structObject = symbolTable.getObject(receiver.structVariable);
    console.log(structObject);

    if(structObject === undefined)
        throw new Error("Undefined structure variable: " + receiver.structVariable);
    
    if(! structObject.value.hasOwnProperty(receiver.structMember))
        throw new Error("Undefined member " + receiver.structMember + " of structure " + receiver.structVariable );

    var memberPrototypeType = structObject.value[receiver.structMember].type;

    // If it is an identifier, convert to its value
    if(exprToAssign.type === parserUtils.typeEnum.ID)
        exprToAssign = symbolTable.getObject(exprToAssign.value);

    if(!isAssignable(memberPrototypeType.type, exprToAssign.type))
        throw new Error("Mismatch type in assignment of member " + receiver.structMember  + " of structure " + receiver.structVariable  );

    structObject.value[receiver.structMember] = parserUtils.generateTuple(exprToAssign, memberPrototypeType) ;
    symbolTable.setObject(receiver.structVariable, structObject);
    console.log(structObject);
}

// TODO: With more types the cast is more complex
var cast = module.exports.cast = function(objectiveType, object){
    return parserUtils.generateTuple(object.value, objectiveType);
}

var isAssignable = module.exports.isAssignable = function(objectiveType , receivedType){
    if(objectiveType === receivedType)
        return true;
    
    if(objectiveType === parserUtils.typeEnum.DOUBLE){
        if(receivedType === parserUtils.typeEnum.INT)
            return true;
    }
    
    return false;
}
},{"./parserUtils.js":11,"./symbolTable":13}],10:[function(require,module,exports){
symbolTable = require('./symbolTable.js');
assignment = require('./assignment.js');

/* 
* Receives an identifier, wrapped in a tuple with value and type elements.
* The identifier represents the name of a variable declared without initialization.
* E.g. int a;   declarator -> a
*/ 
simpleDeclare = module.exports.simpleDeclare = function(declarator){
    if(symbolTable.lookUp(declarator.value)){
        symbolTable.free();
        throw new Error('Multiple definition of ' + declarator.value);
    }
    
    symbolTable.insert(declarator.value);
}

/* 
* Receives an identifier, wrapped in a tuple with value and type elements,
* and an initializer, also wrapped.
* The identifier represents the name of a variable initialized with 'initializer'
* E.g. int a = 3;   declarator -> a , initializer -> 3
*/ 
complexDeclare = module.exports.complexDeclare = function(declarator, initializer){
    
    simpleDeclare(declarator);
    
    // Convert identifiers to its value
    if(initializer.type === parserUtils.typeEnum.ID)
        initializer = symbolTable.getObject(initializer.value);
    
    symbolTable.setObject(declarator.value, initializer);
}

/*
* Receives an identifier and a type. Both wrapped in a tuple with value and type elements. See parserUtils.
* Set type to the identifier in symbol table.
* Because of grammar structure, initialization of value with variable occurs first.
* Therefore type should be checked.
* In case of struct type, all members should be initialized with undefined value.
*/
declareType = module.exports.declareType = function(declarator, type){
    
    console.log("Declaration.Declare type. Declarator:" + declarator + ", type:" + type);

    // Send to struct initialization. Type is not yet assigned.
    if(type.type == parserUtils.typeEnum.STRUCT_TYPE){
        var members = initializeStruct(declarator, type);
        symbolTable.setObject(declarator.value, members);
    }

    // Declarator has no object assigned
    var objectAssigned = symbolTable.getObject(declarator.value);
    
    if(objectAssigned === undefined){
        symbolTable.setType(declarator.value, type);
        return;
    }
    
    // Check if type can be assigned
    if(!assignment.isAssignable(type.type, objectAssigned.type)){
        console.log("Type is not assignable");
        console.log("Intended type:");
        console.log(type.type);
        console.log("Variable type:");
        console.log(objectAssigned.type);
        symbolTable.free();
        throw new TypeError('Type ' + parserUtils.getReversedTypeEnum(objectAssigned.type) + 
                           ' can not be assigned to type ' + parserUtils.getReversedTypeEnum(type.type));
    }
    
    symbolTable.setType(declarator.value, type);
    
}

/* 
*   Initializes a struct in the symbol table. 
*   All members of struct have undefined value.
*   The value property of a struct variable is a hashmap of tuples, 
*   with value and type.
*/
initializeStruct = function(structDeclarator, structType){
    var structMembersInitialized = {};

    // Get struct members from original struct specification
    var structMembersPrototype =  symbolTable.getObject(structType.value);
    
    for(var i = 0; i < structMembersPrototype.length; i++){
        var structProtoMember = structMembersPrototype[i];

        // TODO Consider struct case
        // TODO Consider pointer case
        var initializedMember = parserUtils.generateTuple(undefined, structProtoMember.type);
        structMembersInitialized[structProtoMember.value] = initializedMember;
    }

    return parserUtils.generateTuple(structMembersInitialized, parserUtils.typeEnum.STRUCT_TYPE);
}
},{"./assignment.js":9,"./symbolTable.js":13}],11:[function(require,module,exports){
var typeEnum = module.exports.typeEnum = {
    INT: 1,
    DOUBLE: 2,
    ID: 3,
    STRUCT_TYPE : 4,
    STRUCT_DECLARATION_LIST : 5,
    STRUCT_ELEMENT : 6
};

var getReversedTypeEnum = module.exports.getReversedTypeEnum = function(typeNumber){
    for(var key in typeEnum){
        if(typeEnum[key] === typeNumber)
            return key;
    }
    
    throw new Error("Type number not found.");
}

var generateTuple = module.exports.generateTuple = function(val, typ){
    return Object.freeze({value: val, type: typ });
}
},{}],12:[function(require,module,exports){
arguments[4][1][0].apply(exports,arguments)
},{"dup":1}],13:[function(require,module,exports){
parserUtils = require('./parserUtils.js');

// List of symbol tables with row number associated.
var symbolTableHistory = [];
var symbolTable = {};

var free = module.exports.free = function(){
    symbolTable = {};
    symbolTableHistory = [];
}

var insert = module.exports.insert = function(key){
    symbolTable[key] = {type: undefined, object: undefined};
}

var setObject = module.exports.setObject = function(key, object){
    symbolTable[key].object = object;
}

var getObject = module.exports.getObject = function(key){
    return symbolTable[key].object;
}

var setType = module.exports.setType = function(key, type){
    symbolTable[key].type = type;
}

var getType = module.exports.getType = function(key){
    return symbolTable[key].type;
}

var lookUpSymbolTable = module.exports.lookUp = function(key){
    return symbolTable.hasOwnProperty(key);
}

var getSymbolTableHistory = module.exports.getSymbolTableHistory = function(){
    return symbolTableHistory;
}

var saveCurrentState = module.exports.saveCurrentState = function(currentRow){
    symbolTableHistory.push( {table:JSON.parse(JSON.stringify(symbolTable)), line:currentRow - 1} );
}


var print =  module.exports.print  = function(){
    console.log("Print symbol table.");
    for(key in symbolTable){
        if(symbolTable[key].object === undefined)
            console.log("Key: " + key + ", Object value: undefined, Type: " + symbolTable[key].type);
        else
            console.log("Key: " + key + " Object value: " + symbolTable[key].object.value + " Type: " + symbolTable[key].type);
    }
}

var hello = module.exports.hello = function(snap){
        var toReturn = "Symbol table: \n";
    for(key in snap){
        if(snap[key].object === undefined){
            toReturn += ("Key: " + key + " Object value: undefined, Type: " +  JSON.stringify(snap[key].type) + "\n");
        } else if ( Array.isArray(snap[key].object)){
            var arryValue = "\n Object value:";
            for(var i = 0; i < snap[key].object.length; i++)
                arryValue += ("\n\t " +  JSON.stringify(snap[key].object[i].value));
            toReturn += ("Key: " + key + ", " + arryValue + ",\n\t\t Type: " +  JSON.stringify(snap[key].type) + "\n");
        } else {
            toReturn += ("Key: " + key + " Object value: " +  JSON.stringify(snap[key].object) + "\n\t\t Type: " +  JSON.stringify(snap[key].type) + "\n");
        }
            
    }
    //return JSON.stringify(snap, null, 2);
    return toReturn;
}
},{"./parserUtils.js":11}]},{},[6]);
