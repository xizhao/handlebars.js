module("HTML-based compiler (output)");

function equalHTML(fragment, html) {
  var div = document.createElement("div");
  div.appendChild(fragment);

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
}

test("The compiler can handle simple handlebars", function() {
  compilesTo('<div>{{title}}</div>', '<div>hello</div>', { title: 'hello' });
});
