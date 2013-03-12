module("HTML Macros", {
  setup: function() {
  },

  teardown: function() {
    delete Handlebars.htmlMacros.testing;
  }
});

test("A simple HTML macro can replace a tagName", function() {
  Handlebars.registerHTMLMacro('testing', function test(element) {
    return element.attributes.is && element.attributes.is[0] === 'span';
  }, function mutate(element) {
    element.tag = 'span';
    element.removeAttr('is');
  });

  var template = Handlebars.compileHTML("<div is='span'><b>hi</b></div>");
  var fragment = template();

  equalHTML(fragment, "<span><b>hi</b></span>");
});

test("A simple HTML macro can completely remove the node", function() {
  Handlebars.registerHTMLMacro('testing', function test(element) {
    return element.tag === 'noop';
  }, function mutate() {
    return 'veto';
  });

  var template = Handlebars.compileHTML("lorem<noop><b>ipsum</b></noop>dolor");
  var fragment = template();

  equalHTML(fragment, "loremdolor");
});

test("An HTML macro can transclude its children into a new node", function() {
  Handlebars.registerHTMLMacro('testing', function test(element) {
    return element.tag === 'transclude';
  }, function mutate(element) {
    var tagName = element.getAttr('tag');
    element.removeAttr('tag');
    return new Handlebars.HTMLElement(tagName, element.attributes, element.children, element.helpers);
  });

  var template = Handlebars.compileHTML("<transclude tag='p'>lorem <b>ipsum</b> dolor</transclude>");
  var fragment = template();

  equalHTML(fragment, "<p>lorem <b>ipsum</b> dolor</p>");
});