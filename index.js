/*!
 * prompt-grid <https://github.com/enquirer/prompt-grid>
 *
 * Copyright (c) 2015-2017, Brian Woodward.
 * Released under the MIT License.
 */

'use strict';

var util = require('util');
var swap = require('arr-swap');
var strip = require('strip-color');
var colors = require('ansi-colors');
var repeat = require('repeat-string');
var center = require('center-align');
var longest = require('longest');
var isNumber = require('is-number');
var Prompt = require('prompt-base');

/**
 * Create a new prompt.
 *
 * ```js
 * var prompt = new GridPrompt({
 *   type: 'grid',
 *   name: 'menu',
 *   message: 'Layout your grid.',
 *   choices: [
 *     'cell 1-1',
 *     'cell 1-2',
 *     'cell 1-3',
 *     'cell 2-1',
 *     'cell 2-2',
 *     'cell 2-3',
 *     'cell 3-1',
 *     'cell 3-2',
 *     'cell 3-3'
 *   ]
 * };
 * prompt.run()
 *   .then(function(answer) {
 *     console.log(answer);
 *   });
 * ```
 */

function GridPrompt() {
  Prompt.apply(this, arguments);
  this.options.expandHeight = false;
  this.question.default = null;
  var len = this.choices.length;
  this.cols = Math.ceil(this.question.options.cols || Math.sqrt(len));
  this.rows = Math.ceil(len / this.cols);
  this.origKeys = this.choices.keys.slice();
  this.choices.check();
  this.overrideActions();
}

/**
 * Extend `Prompt`
 */

util.inherits(GridPrompt, Prompt);

/**
 * When user presses Up key
 */

GridPrompt.prototype.overrideActions = function() {
  this.choices.swap = function(a, b) {
    var choices = this.choices.slice();
    this.keymap = {};
    this.choices = [];
    this.items = [];
    this.keys = [];
    this.addChoices(swap(choices, a, b));
  };

  this.action('space', function(pos) {
    return pos;
  });

  this.action('number', function(pos) {
    return pos;
  });

  this.action('toPosition', function(pos) {
    var grid = {};
    grid.r = Math.floor(pos / this.prompt.cols);
    grid.c = (pos % this.prompt.cols);
    return grid;
  });

  this.action('toIndex', function(grid) {
    var pos = (this.prompt.cols * grid.r) + grid.c;
    if (pos < 0) return pos = 0;
    if (pos > this.choices.length - 1) {
      pos = this.choices.length - 1;
    }
    return pos;
  });

  this.action('up', function(pos, key) {
    if (key.shift === true) {
      this.moveUp(pos, key);
    }
    var grid = this.toPosition(this.position(pos));
    grid.r = (grid.r > 0) ? grid.r - 1 : (this.prompt.rows - 1);
    return this.toIndex(grid);
  });

  this.action('right', function(pos, key) {
    if (key.shift === true) {
      this.moveRight(pos, key);
    }
    var grid = this.toPosition(this.position(pos));
    grid.c = (grid.c < this.prompt.cols - 1) ? grid.c + 1 : 0;
    return this.toIndex(grid);
  });

  this.action('down', function(pos, key) {
    if (key.shift === true) {
      this.moveDown(pos, key);
    }
    var grid = this.toPosition(this.position(pos));
    grid.r = (grid.r < this.prompt.rows - 1) ? grid.r + 1 : 0;
    return this.toIndex(grid);
  });

  this.action('left', function(pos, key) {
    if (key.shift === true) {
      this.moveLeft(pos, key);
    }
    var grid = this.toPosition(this.position(pos));
    grid.c = (grid.c > 0) ? grid.c - 1 : this.prompt.cols - 1;
    return this.toIndex(grid);
  });

  /**
   * Move the cell up.
   */

  this.actions.moveUp = function(pos, key) {
    pos = this.position(pos);
    var grid = this.toPosition(pos);
    grid.r = grid.r > 0 ? grid.r - 1 : this.prompt.rows - 1;
    this.choices.swap(pos, this.toIndex(grid));
  };

  /**
   * Move the cell right.
   */

  this.actions.moveRight = function(pos, key) {
    pos = this.position(pos);
    var grid = this.toPosition(pos);
    grid.c = grid.c < this.prompt.cols - 1 ? grid.c + 1 : 0;
    this.choices.swap(pos, this.toIndex(grid));
  };

  /**
   * Move the cell down.
   */

  this.actions.moveDown = function(pos, key) {
    var idx = this.position(pos);
    var grid = this.toPosition(idx);
    grid.r = grid.r < this.prompt.rows - 1 ? grid.r + 1 : 0;
    this.choices.swap(idx, this.toIndex(grid));
  };

  /**
   * Move the cell left.
   */

  this.actions.moveLeft = function(pos, key) {
    var idx = this.position(pos);
    var grid = this.toPosition(idx);
    grid.c = grid.c > 0 ? grid.c - 1 : this.prompt.cols - 1;
    this.choices.swap(idx, this.toIndex(grid));
  };
};

/**
 * Override built-in `.renderOutput` method
 * @return {String}
 */

GridPrompt.prototype.renderOutput = function() {
  var message = colors.dim('(Use shift+(up|down|left|right) to move cells)');
  return message + '\n' + this.renderGrid();
};

/**
 * Override built-in `.renderAnswer` method
 * @return {String}
 */

GridPrompt.prototype.renderAnswer = function() {
  var keys = this.origKeys;
  for (var i = 0; i < this.choices.length; i++) {
    var choice = this.choices.choices[i];
    if (choice.key !== keys[i]) {
      choice.name = colors.green(strip(choice.name));
    }
  }
  return '\n' + this.renderGrid()
};

/**
 * Render the grid with updated cells.
 * @param  {Number} pos Position of the pos
 * @return {String} Rendered content
 */

GridPrompt.prototype.renderGrid = function() {
  var key = this.keypress;
  var num = 10;
  var cols = this.cols;
  var pos = this.position;
  var line = repeat('─', num);
  var toLine = function() {
    return line;
  };

  var arr = new Array(cols).join(' ').split(' ');
  var output = '┌' + arr.map(toLine).join('┬');

  output += '┐\n';

  var rowSep = '├' + arr.map(toLine).join('┼') + '┤\n';
  var len = this.choices.length;
  var max = Math.floor(Math.max(longest(this.choices.keys).length, 10));

  this.choices.forEach(function(choice, i) {
    var c = (i % cols);

    var cell = ' ';
    if (choice.type === 'separator') {
      cell += center(' ', max);
    } else {
      // use choice.key to center to ensure the length is based
      // on an unstyled string, then replace it with choice.name,
      // which might be styled
      var line = center(choice.key, max);
      line = line.replace(choice.key, choice.name);
      cell += line;
    }

    if (i === pos && choice.key === choice.name) {
      var color = isMoving(key) ? colors.yellow : colors.cyan;
      cell = color('-' + cell.slice(1, -1) + '-');
    }
    if (c === 0) {
      cell = '│' + cell;
    }

    cell += '│';
    if (c === (cols - 1) && i !== len - 1) {
      cell += '\n' + rowSep;
    }
    output += cell;
  });

  output += '\n└' + arr.map(toLine).join('┴') + '┘';
  return output.replace(/\n$/, '');
};

function isMoving(key) {
  if (!key || key.shift !== true) return false;
  return key.name === 'up'
    || key.name === 'down'
    || key.name === 'left'
    || key.name === 'right';
}

/**
 * Expose `GridPrompt`
 */

module.exports = GridPrompt;
