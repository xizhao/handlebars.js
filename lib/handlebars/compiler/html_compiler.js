// BEGIN(BROWSER)

(function(Handlebars) {

Handlebars.compileHTML = function(string) {
  var ast = Handlebars.preprocessHTML(string),
      compiler1 = new Handlebars.HTMLCompiler1(),
      compiler2 = new Handlebars.HTMLCompiler2();

  var opcodes = compiler1.compile(ast);
  return compiler2.compile(opcodes);
};

Handlebars.HTMLCompiler1 = function() {};

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
  this.opcode('dynamic', mustache.id.string);
};

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
  this.output.push("var element0, el;");
  this.output.push("var frag = element0 = document.createDocumentFragment();");
};

compiler2.postamble = function() {
  this.output.push("return frag;");
};

compiler2.content = function(string) {
  var parentRef = topStack(this);
  this.output.push(parentRef + ".appendChild(Handlebars.dom.frag(" + parentRef + ", '" + escapeString(string) + "'));");
};

compiler2.openElement = function(tagName) {
  var elRef = pushStack(this);
  this.output.push("var " + elRef + " = el = document.createElement('" + tagName + "');");
};

compiler2.attribute = function(name, value) {
  this.output.push("el.setAttribute(" + quotedString(name) + ", " + quotedString(value.join('')) + ");");
};

compiler2.closeElement = function() {
  var elRef = popStack(this);
  var parentRef = topStack(this);
  this.output.push(parentRef + ".appendChild(" + elRef + ");");
};

compiler2.dynamic = function(path) {
  var parentRef = topStack(this);
  this.output.push("Handlebars.dom.append(" + parentRef + ", context, " + quotedString(path) + ");");
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

Handlebars.dom = {
  append: function(element, context, string) {
    element.appendChild(document.createTextNode(context[string]));
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
