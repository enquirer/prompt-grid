var colors = require('ansi-colors');
var braces = require('braces');
var Prompt = require('..');
var prompt = new Prompt({
  name: 'table',
  message: 'Rearrange the letters of the alphabet',
  choices: braces.expand('{A..Z}')
});

console.log();
console.log(colors.yellow('yellow'), 'means that a cell is being "moved"');
console.log();

prompt.run()
  .then(function(answer) {
    // console.log(answer);
    console.log('(green cells have been changed)')
  })
  .catch(function(err) {
    console.log(err);
  })
