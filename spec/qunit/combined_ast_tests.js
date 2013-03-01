(function() {

module("HTML-based compiler (AST)");

function preprocessHTML(html) {
  return Handlebars.preprocessHTML(html);
}

function id(string) {
  return new Handlebars.AST.IdNode([string]);
}

function hash(pairs) {
  return pairs ? new Handlebars.AST.HashNode(pairs) : null;
}

function mustache(string, pairs, raw) {
  var params;

  if (({}).toString.call(string) === '[object Array]') {
    params = string;
  } else {
    params = [id(string)];
  }

  return new Handlebars.AST.MustacheNode(params, hash(pairs), raw || false);
}

function string(data) {
  return new Handlebars.AST.StringNode(data);
}

function element(tagName, attrs, children) {
  if (arguments.length === 2) {
    children = attrs;
    attrs = [];
  }

  return new Handlebars.HTMLElement(tagName, attrs, children);
}

function block(helper, children) {
  return new Handlebars.BlockElement(helper, children);
}

test("a simple piece of content", function() {
  deepEqual(preprocessHTML('some content'), ['some content']);
});

test("a piece of content with HTML", function() {
  deepEqual(preprocessHTML('some <div>content</div> done'), [
    "some ",
    element("div", [ "content" ]),
    " done"
  ]);
});

test("a piece of Handlebars with HTML", function() {
  deepEqual(preprocessHTML('some <div>{{content}}</div> done'), [
    "some ",
    element("div", [ mustache('content') ]),
    " done"
  ]);
});

test("Handlebars embedded in an attribute", function() {
  deepEqual(preprocessHTML('some <div class="{{foo}}">content</div> done'), [
    "some ",
      element("div", [[ "class", [mustache('foo')] ]], [
      "content"
    ]),
    " done"
  ]);
});

test("Handlebars embedded in an attribute with other content surrounding it", function() {
  deepEqual(preprocessHTML('some <a href="http://{{link}}/">content</a> done'), [
    "some ",
      element("a", [[ "href", ["http://", mustache('link'), "/"] ]], [
      "content"
    ]),
    " done"
  ]);
});

test("A more complete embedding example", function() {
  var html = "{{embed}} {{some 'content'}} " +
             "<div class='{{foo}} {{bind-class isEnabled truthy='enabled'}}'>{{ content }}</div>" +
             " {{more 'embed'}}";

  deepEqual(preprocessHTML(html), [
    mustache('embed'), ' ',
    mustache([id('some'), string('content')]), ' ',
    element("div", [
      ["class", [mustache('foo'), ' ', mustache([id('bind-class'), id('isEnabled')], [['truthy', string('enabled')]])]]
    ], [
      mustache('content')
    ]),
    ' ', mustache([id('more'), string('embed')])
  ]);
});

test("Simple embedded block helpers", function() {
  var html = "{{#if foo}}<div>{{content}}</div>{{/if}}";

  deepEqual(preprocessHTML(html), [
    block(mustache([id('if'), id('foo')]), [
      element('div', [ mustache('content') ])
    ])
  ]);
});

})();
