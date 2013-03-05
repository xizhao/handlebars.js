module("HTML-based compiler (output)", {
  teardown: function() {
    delete Handlebars.htmlHelpers.testing;
    delete Handlebars.htmlHelpers.RESOLVE;
  }
});

function equalHTML(fragment, html) {
  var div = document.createElement("div");
  div.appendChild(fragment.cloneNode(true));

  equal(div.innerHTML, html);
}

test("Simple content produces a document fragment", function() {
  var template = Handlebars.compileHTML("content");
  var fragment = template();

  equalHTML(fragment, "content");
});

test("Simple elements are created", function() {
  var template = Handlebars.compileHTML("<div>content</div>");
  var fragment = template();

  equalHTML(fragment, "<div>content</div>");
});

test("Simple elements can have attributes", function() {
  var template = Handlebars.compileHTML("<div class='foo' id='bar'>content</div>");
  var fragment = template();

  equalHTML(fragment, '<div class="foo" id="bar">content</div>');
});

test("The compiler can handle nesting", function() {
  var html = '<div class="foo"><p><span id="bar" data-foo="bar">hi!</span></p></div> More content';
  var template = Handlebars.compileHTML(html);
  var fragment = template();

  equalHTML(fragment, html);
});

test("The compiler can handle quotes", function() {
  compilesTo('<div>"This is a title," we\'re on a boat</div>');
});

function compilesTo(html, expected, context) {
  var template = Handlebars.compileHTML(html);
  var fragment = template(context);

  equalHTML(fragment, expected || html);
  return fragment;
}

test("The compiler can handle simple handlebars", function() {
  compilesTo('<div>{{title}}</div>', '<div>hello</div>', { title: 'hello' });
});

test("The compiler can handle paths", function() {
  compilesTo('<div>{{post.title}}</div>', '<div>hello</div>', { post: { title: 'hello' }});
});

test("The compiler can handle escaping HTML", function() {
  compilesTo('<div>{{title}}</div>', '<div>&lt;strong&gt;hello&lt;/strong&gt;</div>', { title: '<strong>hello</strong>' });
});

test("The compiler can handle unescaped HTML", function() {
  compilesTo('<div>{{{title}}}</div>', '<div><strong>hello</strong></div>', { title: '<strong>hello</strong>' });
});

test("The compiler can handle simple helpers", function() {
  Handlebars.registerHTMLHelper('testing', function(path, options) {
    return this[path[0]];
  });

  compilesTo('<div>{{testing title}}</div>', '<div>hello</div>', { title: 'hello' });
});

test("The compiler tells helpers what kind of expression the path is", function() {
  Handlebars.registerHTMLHelper('testing', function(path, options) {
    return options.types[0] + '-' + path;
  });

  compilesTo('<div>{{testing "title"}}</div>', '<div>string-title</div>');
  compilesTo('<div>{{testing 123}}</div>', '<div>number-123</div>');
  compilesTo('<div>{{testing true}}</div>', '<div>boolean-true</div>');
  compilesTo('<div>{{testing false}}</div>', '<div>boolean-false</div>');
});

test("The compiler provides the current element as an option", function() {
  var textNode;
  Handlebars.registerHTMLHelper('testing', function(options) {
    textNode = document.createTextNode("testy");
    options.element.appendChild(textNode);
  });

  compilesTo('<div>{{testing}}</div>', '<div>testy</div>');
  equal(textNode.textContent, 'testy');
});

test("It is possible to override the resolution mechanism", function() {
  Handlebars.registerHTMLHelper('RESOLVE', function(parts, options) {
    if (parts[0] === 'zomg') {
      options.element.appendChild(document.createTextNode(this.zomg));
    } else {
      options.element.appendChild(document.createTextNode(parts.join("-")));
    }
  });

  compilesTo('<div>{{foo}}</div>', '<div>foo</div>');
  compilesTo('<div>{{foo.bar}}</div>', '<div>foo-bar</div>');
  compilesTo('<div>{{zomg}}</div>', '<div>hello</div>', { zomg: 'hello' });
});

test("Simple data binding using text nodes", function() {
  var callback;

  Handlebars.registerHTMLHelper('RESOLVE', function(parts, options) {
    var context = this,
        textNode = document.createTextNode(context[parts[0]]);

    callback = function() {
      var value = context[parts[0]],
          parent = textNode.parentNode,
          originalText = textNode;

      textNode = document.createTextNode(value);
      parent.insertBefore(textNode, originalText);
      parent.removeChild(originalText);
    };

    options.element.appendChild(textNode);
  });

  var object = { title: 'hello' };
  var fragment = compilesTo('<div>{{title}} world</div>', '<div>hello world</div>', object);

  object.title = 'goodbye';
  callback();

  equalHTML(fragment, '<div>goodbye world</div>');

  object.title = 'brown cow';
  callback();

  equalHTML(fragment, '<div>brown cow world</div>');
});