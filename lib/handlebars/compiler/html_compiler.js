// BEGIN(BROWSER)

(function(Handlebars) {

var dom = 'Handlebars.dom';

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
    debugger;
    this.opcode('helper')
  }
};

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

Handlebars.HTMLCompiler2 = function() {};

var compiler2 = Handlebars.HTMLCompiler2.prototype;

compiler2.compile = function(opcodes) {
  this.output = [];
  this.stackNumber = 0;
  this.preamble();

  processOpcodes(this, opcodes);

  this.postamble();
  console.log(this.output.join("\n"));
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
  return topStack(this);
};

function invoke(receiver, method) {
  var params = [].slice.call(arguments, 2);
  return receiver + "." + method + "(" + params.join(", ") + ")";
}

function helper() {
  var args = [].slice.call(arguments, 0);
  args.unshift('Handlebars.dom');
  return invoke.apply(this, args);
}

compiler2.openElement = function(tagName) {
  var elRef = pushStack(this);
  this.push("var " + elRef + " = el = " + invoke('document', 'createElement', quotedString(tagName)));
};

compiler2.attribute = function(name, value) {
  this.push(invoke('el', 'setAttribute', quotedString(name), quotedString(value.join(''))));
};

compiler2.closeElement = function() {
  var elRef = popStack(this);
  this.push(invoke(this.el(), 'appendChild', elRef));
};

compiler2.dynamic = function(parts) {
  var parentRef = topStack(this);
  var parts = "[" + parts.map(quotedString).join(", ") + "]";
  this.push(helper('append', this.el(), 'context', parts));
};

compiler2.ambiguous = function(string) {
  var parentRef = topStack(this);
  this.push(helper('ambiguous', this.el(), 'context', quotedString(string)));
};

function escapeString(string) {
  return string.replace(/'/g, "\\'");
}

function quotedString(string) {
  return "'" + escapeString(string) + "'";
}

function pushStack(compiler) {
  return "element" + (++compiler.stackNumber);
}

function popStack(compiler) {
  return "element" + (compiler.stackNumber--);
}

function topStack(compiler) {
  return "element" + compiler.stackNumber;
}

// These methods are runtime for now. If they are too expensive,
// I may inline them at compile-time.
Handlebars.dom = {
  append: function(element, context, parts) {
    var value = this.resolve(context, parts);
    element.appendChild(document.createTextNode(value));
  },

  ambiguous: function(element, context, string) {
    if (Handlebars.htmlHelpers[string]) {
      console.warn("Not implemented");
    } else {
      var value = this.resolve(context, [string]);
      element.appendChild(document.createTextNode(value));
    }
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
