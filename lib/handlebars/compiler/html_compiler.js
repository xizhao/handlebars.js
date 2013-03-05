// BEGIN(BROWSER)

(function(Handlebars) {

var dom = 'dom';

Handlebars.htmlHelpers = {};

Handlebars.registerHTMLHelper = function(name, callback) {
  Handlebars.htmlHelpers[name] = callback;
};

Handlebars.compileHTML = function(string, options) {
  var ast = Handlebars.preprocessHTML(string),
      compiler1 = new Handlebars.HTMLCompiler1(options),
      compiler2 = new Handlebars.HTMLCompiler2(options);

  var opcodes = compiler1.compile(ast);
  return compiler2.compile(opcodes);
};

function merge(options, defaults) {
  for (var prop in defaults) {
    if (options.hasOwnProperty(prop)) { continue; }
    options[prop] = defaults[prop];
  }
}

Handlebars.HTMLCompiler1 = function(options) {
  this.options = options || {};

  var knownHelpers = {
    'helperMissing': true,
    'blockHelperMissing': true,
    'each': true,
    'if': true,
    'unless': true,
    'with': true,
    'log': true
  };

  this.options.knownHelpers = this.options.knownHelpers || {};
  merge(knownHelpers, this.options.knownHelpers);
};

var compiler1 = Handlebars.HTMLCompiler1.prototype;

compiler1.compile = function(ast) {
  this.opcodes = [];
  processChildren(this, ast);
  return this.opcodes;
};

function processChildren(compiler, children) {
  var node;

  for (var i=0, l=children.length; i<l; i++) {
    node = children[i];

    if (typeof node === 'string') {
      compiler.string(node);
    } else if (node instanceof Handlebars.HTMLElement) {
      compiler.element(node);
    } else if (node instanceof Handlebars.BlockElement) {

    } else {
      compiler[node.type + "Content"](node);
    }
  }
}

compiler1.opcode = function(type) {
  var params = [].slice.call(arguments, 1);
  this.opcodes.push({ type: type, params: params });
};

compiler1.string = function(string) {
  this.opcode('content', string);
};

compiler1.element = function(element) {
  this.opcode('openElement', element.tag);

  element.attributes.forEach(function(attribute) {
    this.attribute(attribute);
  }, this);

  processChildren(this, element.children);

  this.opcode('closeElement');
};

compiler1.attribute = function(attribute) {
  this.opcode('attribute', attribute[0], attribute[1]);
};

compiler1.mustacheContent = function(mustache) {
  var type = classifyMustache(mustache, this.options);

  if (type === 'simple') {
    this.opcode('dynamic', mustache.id.parts);
  } else if (type === 'ambiguous') {
    this.opcode('ambiguous', mustache.id.string);
  } else {
    processParams(this, mustache.params);
    this.opcode('helper', mustache.id.string, mustache.params.length);
  }

  appendMustache(this, mustache);
};

compiler1.ID = function(id) {
  this.opcode('id', id.parts);
};

compiler1.STRING = function(string) {
  this.opcode('string', string.stringModeValue);
};

compiler1.BOOLEAN = function(boolean) {
  this.opcode('literal', boolean.stringModeValue);
};

compiler1.INTEGER = function(integer) {
  this.opcode('literal', integer.stringModeValue);
}

function classifyMustache(mustache, options) {
  var isHelper   = mustache.isHelper;
  var isEligible = mustache.eligibleHelper;

  // if ambiguous, we can possibly resolve the ambiguity now
  if (isEligible && !isHelper) {
    var name = mustache.id.parts[0];

    if (options.knownHelpers[name]) {
      isHelper = true;
    } else if (options.knownHelpersOnly) {
      isEligible = false;
    }
  }

  if (isHelper) { return "helper"; }
  else if (isEligible) { return "ambiguous"; }
  else { return "simple"; }
}

function processParams(compiler, params) {
  params.forEach(function(param) {
    compiler[param.type](param);
  });
}

function appendMustache(compiler, mustache) {
  if (mustache.escaped) {
    compiler.opcode('appendText');
  } else {
    compiler.opcode('appendFragment');
  }
}

Handlebars.HTMLCompiler2 = function() {};

var compiler2 = Handlebars.HTMLCompiler2.prototype;

compiler2.compile = function(opcodes) {
  this.output = [];
  this.elementNumber = 0;
  this.stackNumber = 0;
  this.stack = [];

  this.preamble();
  processOpcodes(this, opcodes);
  this.postamble();

  console.debug(this.output.join("\n"));

  return new Function('context', this.output.join("\n"));
};

function processOpcodes(compiler, opcodes) {
  opcodes.forEach(function(opcode) {
    compiler[opcode.type].apply(compiler, opcode.params);
  });
}

compiler2.preamble = function() {
  this.push("var element0, el");
  this.push("var frag = element0 = document.createDocumentFragment()");
  this.push("var dom = Handlebars.dom")
};

compiler2.postamble = function() {
  this.output.push("return frag;");
};

compiler2.content = function(string) {
  this.push(invoke(this.el(), 'appendChild', helper('frag', this.el(), quotedString(string))));
};

compiler2.push = function(string) {
  this.output.push(string + ";");
};

compiler2.el = function() {
  return topElement(this);
};

compiler2.id = function(parts) {
  pushStackLiteral(this, quotedString('id'));
  pushStackLiteral(this, quotedArray(parts));
};

compiler2.literal = function(literal) {
  pushStackLiteral(this, quotedString(typeof literal));
  pushStackLiteral(this, literal);
};

compiler2.string = function(string) {
  pushStackLiteral(this, quotedString('string'));
  pushStackLiteral(this, quotedString(string));
};

compiler2.appendText = function() {
  this.push(helper('appendText', this.el(), popStack(this)));
};

compiler2.appendFragment = function() {
  this.push(helper('appendFragment', this.el(), popStack(this)));
};

compiler2.openElement = function(tagName) {
  var elRef = pushElement(this);
  this.push("var " + elRef + " = el = " + invoke('document', 'createElement', quotedString(tagName)));
};

compiler2.attribute = function(name, value) {
  this.push(invoke('el', 'setAttribute', quotedString(name), quotedString(value.join(''))));
};

compiler2.closeElement = function() {
  var elRef = popElement(this);
  this.push(invoke(this.el(), 'appendChild', elRef));
};

compiler2.dynamic = function(parts) {
  pushStackLiteral(this, helper('resolve', 'context', quotedArray(parts)));
};

compiler2.ambiguous = function(string) {
  pushStackLiteral(this, helper('ambiguous', this.el(), 'context', quotedString(string)));
};

compiler2.helper = function(name, size) {
  var parentRef = topElement(this),
      args = [],
      types = [];

  for (var i=0; i<size; i++) {
    args.push(popStack(this));
    types.push(popStack(this));
  }

  var options = '{types:' + array(types) + '}';
  pushStackLiteral(this, helper('helper', quotedString(name), this.el(), 'context', array(args), options));
};

function invoke(receiver, method) {
  var params = [].slice.call(arguments, 2);
  return receiver + "." + method + "(" + params.join(", ") + ")";
}

function helper() {
  var args = [].slice.call(arguments, 0);
  args.unshift(dom);
  return invoke.apply(this, args);
}

function escapeString(string) {
  return string.replace(/'/g, "\\'");
}

function quotedString(string) {
  return "'" + escapeString(string) + "'";
}

function quotedArray(list) {
  return array(list.map(quotedString).join(", "));
}

function array(array) {
  return "[" + array + "]";
}

function pushElement(compiler) {
  return "element" + (++compiler.elementNumber);
}

function popElement(compiler) {
  return "element" + (compiler.elementNumber--);
}

function topElement(compiler) {
  return "element" + compiler.elementNumber;
}

function pushStack(compiler) {
  var stack = compiler.stack,
      stackNumber = "stack" + (++compiler.stackNumber);

  stack.push({ literal: false, value: stackNumber });
}

function pushStackLiteral(compiler, literal) {
  compiler.stack.push({ literal: true, value: literal });
}

function popStack(compiler) {
  var stack = compiler.stack,
      poppedValue = stack.pop();

  if (!poppedValue.literal) {
    stackNumber--;
  }
  return poppedValue.value;
}

function topStack(compiler) {
  var stack = compiler.stack;

  return stack[stack.length - 1].value;
}

// These methods are runtime for now. If they are too expensive,
// I may inline them at compile-time.
Handlebars.dom = {
  append: function(element, context, parts, escaped) {
    var value = this.resolve(context, parts);
    this.appendValue(element, value, escaped);
  },

  appendText: function(element, value) {
    if (value === undefined) { return; }
    element.appendChild(document.createTextNode(value));
  },

  appendFragment: function(element, value) {
    if (value === undefined) { return; }
    element.appendChild(this.frag(element, value));
  },

  appendValue: function(element, value, escaped) {
    if (escaped) {
      this.appendText(element, value);
    } else {
      this.appendFragment(element, value);
    }
  },

  ambiguous: function(element, context, string, escaped) {
    var helper, value, args;

    if (helper = Handlebars.htmlHelpers[string]) {
      return this.helper(string, element, context, [], { element: element });
    } else {
      return this.resolve(context, [string]);
    }
  },

  helper: function(name, element, context, args, options) {
    var helper = Handlebars.htmlHelpers[name];
    options.element = element;
    args.push(options);
    return helper.apply(context, args);
  },

  resolve: function(context, parts) {
    return parts.reduce(function(current, part) {
      return current[part];
    }, context)
  },

  frag: function(element, string) {
    /*global DocumentFragment*/
    if (element instanceof DocumentFragment) {
      element = document.createElement('div');
    }

    var range = document.createRange();
    range.setStart(element);
    range.collapse(false);
    return range.createContextualFragment(string);
  }
};

})(Handlebars);

// END(BROWSER)
