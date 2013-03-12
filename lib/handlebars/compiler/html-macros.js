// BEGIN(BROWSER)

(function(Handlebars) {

var htmlMacros = {};

Handlebars.registerHTMLMacro = function(name, test, mutate) {
  htmlMacros[name] = { test: test, mutate: mutate };
};

Handlebars.htmlMacros = htmlMacros;

Handlebars.processHTMLMacros = function processHTMLMacros(element) {
  var mutated, newElement;

  for (var prop in htmlMacros) {
    var macro = htmlMacros[prop];
    if (macro.test(element)) {
      newElement = macro.mutate(element);
      if (newElement === undefined) { newElement = element; }
      mutated = true;
      break;
    }
  }

  if (!mutated) {
    debugger;
    return element;
  } else if (newElement instanceof Handlebars.HTMLElement) {
    return processHTMLMacros(newElement);
  } else {
    return newElement;
  }
}

})(Handlebars);

// END(BROWSER)