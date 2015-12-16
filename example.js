/**
 * Sort prompt example
 */

"use strict";
var inquirer = require("inquirer2")();
inquirer.registerPrompt('grid', require('./'));

inquirer.prompt([
  {
    type: 'grid',
    name: 'table',
    message: 'Layout your grid.',
    options: {
      cols: 3,
    },
    choices: [
      'cell 1-1',
      'cell 1-2',
      'cell 1-3',
      'cell 2-1',
      'cell 2-2',
      'cell 2-3',
      'cell 3-1',
      'cell 3-2',
      'cell 3-3'
    ]
  }
], function(answers) {
  console.log(JSON.stringify(answers, null, 2));
});
