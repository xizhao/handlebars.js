// BEGIN(BROWSER)

(function(Handlebars) {

Handlebars.compileHTML = function(string) {
  var ast = Handlebars.preprocessHTML(string),
      compiler = new Handlebars.HTMLCompiler();

  return compiler.compile(ast);
};

Handlebars.HTMLCompiler = function() {};

var compiler = Handlebars.HTMLCompiler.prototype;

compiler.compile = function(ast) {
  var node;

  this.output = [];
  this.preamble();

  processChildren(this, ast);

  this.postamble();

  console.log(this.output.join("\n"));
  return new Function(this.output.join("\n"));
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

    }
  }
}

function processAttribute(compiler, attribute) {
  compiler.output.push("el.setAttribute('" + attribute[0] + "', '" + attribute[1].join('') + "');");
}

compiler.preamble = function() {
  this.output.push("var frag = document.createDocumentFragment(), parents = [frag];");
};

compiler.postamble = function() {
  this.output.push("return frag;");
};

compiler.string = function(string) {
  this.output.push("parents[parents.length - 1].appendChild(Handlebars.HTMLCompiler.frag(parents[parents.length - 1], '" + string + "'));");
};

compiler.element = function(element) {
  // create a new element and append it to the stack of elements
  // add any attributes to that element
  // process children
  // pop this element off of the stack of elements
  // append it to the last element in the stack

  this.output.push("el = document.createElement('" + element.tag + "'); parents.push(el);");

  element.attributes.forEach(function(attribute) {
    processAttribute(this, attribute);
  }, this);

  processChildren(this, element.children);

  this.output.push("el = parents.pop();");
  this.output.push("parents[parents.length - 1].appendChild(el);");
};

Handlebars.HTMLCompiler.frag = function(element, string) {
  /*global DocumentFragment*/
  if (element instanceof DocumentFragment) {
    element = document.createElement('div');
  }

  var range = document.createRange();
  range.setStart(element);
  range.collapse(false);
  return range.createContextualFragment(string);
};

})(Handlebars);

// END(BROWSER)
