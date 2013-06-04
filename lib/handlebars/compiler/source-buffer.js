// BEGIN(BROWSER)

function SourceBuffer() {
  var buffer = [];

  this.copies = '';
  this.vars = '';

  this.push = function() {
    buffer.push(buffer.slice.call(arguments));
  };
  this.forEach = function(callback, scope) {
    buffer.forEach(callback, scope);
  };
}

// END(BROWSER)

module.exports = SourceBuffer;
