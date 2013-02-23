// BEGIN(BROWSER)

(function(Handlebars) {

Handlebars.preprocessHTML = function(html) {
  var ast = Handlebars.parse(html);
  return new Handlebars.HTMLProcessor().accept(ast);
};

Handlebars.HTMLProcessor = function() {
  this.elementStack = [{ children: [] }];
  this.tokenizer = new HTML5Tokenizer.Tokenizer('');
};

// TODO: ES3 polyfill
var processor = Handlebars.HTMLProcessor.prototype = Object.create(Handlebars.Visitor.prototype);

processor.program = function(program) {
  var statements = program.statements;

  for (var i=0, l=statements.length; i<l; i++) {
    debugger;
    this.accept(statements[i]);
  }

  processTokens(this.elementStack, [this.tokenizer.tokenizeEOF()]);

  return this.elementStack[0].children;
};

processor.content = function(content) {
  var tokens = this.tokenizer.tokenizePart(content.string);
  return processTokens(this.elementStack, tokens);
};

processor.mustache = function(mustache) {
  var token = this.tokenizer.token;

  // TODO: Monkey patch Chars.addChar like attributes
  if (token instanceof Chars) {
    processToken(this.elementStack, token);
    this.tokenizer.token = null;
  }

  pushChild(this, mustache);
};

function processTokens(elementStack, tokens) {
  tokens.forEach(function(token) {
    processToken(elementStack, token);
  });
}

function currentElement(processor) {
  var elementStack = processor.elementStack;
  return elementStack[elementStack.length - 1];
}

function pushChild(processor, token) {
  var state = processor.tokenizer.state;

  switch(state) {
    case "attributeValueSingleQuoted":
    case "attributeValueUnquoted":
    case "attributeValueDoubleQuoted":
      processor.tokenizer.token.addToAttributeValue(token);
      return;
    default:
      var element = currentElement(processor);
      element.children.push(token);
  }
}

HTML5Tokenizer.StartTag.prototype.addToAttributeValue = function(char) {
  var value = this.currentAttribute[1] = this.currentAttribute[1] || [];

  if (value.length && typeof value[value.length - 1] === 'string' && typeof char === 'string') {
    value[value.length - 1] += char;
  } else {
    value.push(char);
  }
};

var Chars = HTML5Tokenizer.Chars,
    StartTag = HTML5Tokenizer.StartTag,
    EndTag = HTML5Tokenizer.EndTag;

function processToken(elementStack, token) {
  var currentElement = elementStack[elementStack.length - 1];
  if (token instanceof Chars) {
    currentElement.children.push(token.chars);
  } else if (token instanceof EndTag) {
    if (currentElement.tag === token.tagName) {
      elementStack.pop();
      elementStack[elementStack.length - 1].children.push(currentElement);
    } else {
      throw new Error("Closing tag " + token.tagName + " did not match last open tag " + currentElement.tag);
    }
  } else if (token instanceof StartTag) {
    elementStack.push(new Handlebars.HTMLElement(token.tagName, token.attributes));
  }
}

Handlebars.HTMLElement = function(tag, attributes, children) {
  this.tag = tag;
  this.attributes = attributes || [];
  this.children = children || [];
};

})(Handlebars);

// END(BROWSER)
