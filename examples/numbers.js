var colors = require('ansi-colors');
var braces = require('braces');
var Prompt = require('..');
var prompt = new Prompt({
  name: 'table',
  message: 'Rearrange cells',
  choices: braces.expand('{1..9}')
});

console.log();
console.log(colors.yellow('yellow'), 'means that a cell is being "moved"');
console.log();

prompt.run()
  .then(function(answer) {
    console.log('(green cells have been changed)')
    console.log(answer);
  })
  .catch(function(err) {
    console.log(err);
  })
