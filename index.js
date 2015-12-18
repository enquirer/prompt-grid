/*!
 * grid-prompt <https://github.com/doowb/grid-prompt>
 *
 * Copyright (c) 2015, Brian Woodward.
 * Licensed under the MIT License.
 */

'use strict';

var util = require('util');
var Separator = require('inquirer2/lib/objects/separator');
var observe = require('inquirer2/lib/utils/events');
var Base = require('inquirer2/lib/prompts/base');
var utils = require('inquirer2/lib/utils/');

/**
 * Grid prompt constructor. Register with [inquirer2][] to use.
 *
 * ```js
 * var inquirer = require('inquirer2');
 * inquirer.registerPrompt('grid', require('grid-prompt'));
 * inquirer.prompt([
 *   {
 *     type: 'grid',
 *     name: 'menu',
 *     message: 'Layout your grid.',
 *     choices: [
 *       'cell 1-1',
 *       'cell 1-2',
 *       'cell 1-3',
 *       'cell 2-1',
 *       'cell 2-2',
 *       'cell 2-3',
 *       'cell 3-1',
 *       'cell 3-2',
 *       'cell 3-3'
 *     ]
 *   }
 * ], function(answers) {
 *   console.log(JSON.stringify(answers, null, 2));
 * });
 * ```
 */

function Prompt() {
  Base.apply(this, arguments);

  if (!this.opt.choices) {
    this.throwParamError('choices');
  }

  this.options = this.opt.options || {};
  this.selected = 0;
  this.cols = this.options.cols || 3;
  this.rows = Math.ceil(this.opt.choices.length / this.cols);
  // console.log(this.rows, this.cols);

  var def = this.opt.default;

  // Default being a Number
  if (utils.isNumber(def) && def >= 0 && def < this.opt.choices.realLength) {
    this.selected = def;
  }

  // Default being a String
  if (typeof def === 'string') {
    this.selected = this.opt.choices.pluck('value').indexOf(def);
  }

  // Make sure no default is set (so it won't be printed)
  this.opt.default = null;
  this.decorateChoices();
}

/**
 * Extend `Base`
 */

util.inherits(Prompt, Base);

/**
 * Add convience methods to `this.opt.choices`
 */

Prompt.prototype.decorateChoices = function() {

  /**
   * Swap 2 items in the `choices` array and ensure the `realChoices` array is updated.
   */

  this.opt.choices.swap = function(from, to) {
    var item = this.choices[to];
    this.choices[to] = this.choices[from];
    this.choices[from] = item;
    this.realChoices = this.choices.filter(Separator.exclude);
    return this.choices;
  };

  /**
   * Map over the `choices` array.
   */

  this.opt.choices.map = function(fn) {
    return this.choices.map(fn);
  };
};

/**
 * Start the Inquiry session
 * @param  {Function} cb      Callback when prompt is done
 * @return {this}
 */

Prompt.prototype._run = function (cb) {
  this.done = cb;

  var events = observe(this.rl);
  events.keypress.takeUntil(events.line).forEach(this.onKeypress.bind(this));
  events.normalizedUpKey.takeUntil(events.line).forEach(this.onUpKey.bind(this));
  events.normalizedDownKey.takeUntil(events.line).forEach(this.onDownKey.bind(this));
  events.numberKey.takeUntil(events.line).forEach(this.onNumberKey.bind(this));
  events.line.take(1).forEach(this.onSubmit.bind(this));

  // Init the prompt
  utils.cliCursor.hide();
  this.render();

  return this;
};

/**
 * Render the prompt to screen
 * @return {Prompt} self
 */

Prompt.prototype.render = function () {
  // Render question
  var message = this.getQuestion();

  // Render choices or answer depending on the state
  if (this.status === 'answered') {
    message += utils.chalk.cyan(this.opt.choices.map(function(choice) {
      if (choice.type === 'separator') {
        return '<Separator>';
      }
      return choice.short
    }).join(', '));
  } else {
    var choicesStr = gridRender.call(this, this.opt.choices, this.selected, this.cols);
    message += utils.chalk.dim('(Use arrow keys to move. Hold down Shift to move item.)');
    message += '\n' + choicesStr;
  }

  this.screen.render(message);
  return this;
};

/**
 * When user press `enter` key
 */

Prompt.prototype.onSubmit = function () {
  this.status = 'answered';
  var choices = this.opt.choices.map(function(choice) {
    if (choice.type === 'separator') {
      return choice;
    }
    return choice.value;
  });

  // Rerender prompt
  this.render();

  this.screen.done();
  utils.cliCursor.show();
  this.done(choices);
};

/**
 * When user presses Up key
 */

Prompt.prototype.onUpKey = function (e) {
  // if `shift` key is pressed, move the up
  if (e.key.shift === true) {
    this.moveUp();
  }
  var pos = this.toPosition(this.selected);
  pos.r = (pos.r > 0) ? pos.r - 1 : (this.rows - 1);
  this.selected = this.toIndex(pos);
  this.render();
};

/**
 * Move the currently selected item up.
 */

Prompt.prototype.moveUp = function() {
  var idx = this.selected;
  var pos = this.toPosition(idx);
  if (pos.r > 0) {
    pos.r = pos.r - 1;
  } else {
    pos.r = this.rows - 1;
  }
  this.opt.choices.swap(idx, this.toIndex(pos));
};

/**
 * When user presses Down key
 */

Prompt.prototype.onDownKey = function (e) {
  // if `shift` key is pressed, move the down
  if (e.key.shift === true) {
    this.moveDown();
  }
  var pos = this.toPosition(this.selected);
  pos.r = (pos.r < this.rows - 1) ? pos.r + 1 : 0;
  this.selected = this.toIndex(pos);
  this.render();
};

/**
 * Move the currently selected item down.
 */

Prompt.prototype.moveDown = function() {
  var idx = this.selected;
  var pos = this.toPosition(idx);
  if (pos.r < this.rows - 1) {
    pos.r = pos.r + 1;
  } else {
    pos.r = 0;
  }
  this.opt.choices.swap(idx, this.toIndex(pos));
};

Prompt.prototype.onKeypress = function(e) {
  if (e.key.name === 'left') return this.onLeftKey(e);
  if (e.key.name === 'right') return this.onRightKey(e);
};

/**
 * When user presses Left key
 */

Prompt.prototype.onLeftKey = function (e) {
  // if `shift` key is pressed, move the item left
  if (e.key.shift === true) {
    this.moveLeft();
  }
  var pos = this.toPosition(this.selected);
  pos.c = (pos.c > 0) ? pos.c - 1 : this.cols - 1;
  this.selected = this.toIndex(pos);
  this.render();
};

/**
 * Move the currently selected item up.
 */

Prompt.prototype.moveLeft = function() {
  var idx = this.selected;
  var pos = this.toPosition(idx);
  if (pos.c > 0) {
    pos.c = pos.c - 1;
  } else {
    pos.c = this.cols - 1;
  }
  this.opt.choices.swap(idx, this.toIndex(pos));
};

/**
 * When user presses Right key
 */

Prompt.prototype.onRightKey = function (e) {
  // if `shift` key is pressed, move the item right
  if (e.key.shift === true) {
    this.moveRight();
  }
  var pos = this.toPosition(this.selected);
  pos.c = (pos.c < this.cols - 1) ? pos.c + 1 : 0;
  this.selected = this.toIndex(pos);
  this.render();
};

/**
 * Move the currently selected item up.
 */

Prompt.prototype.moveRight = function() {
  var idx = this.selected;
  var pos = this.toPosition(idx);
  if (pos.c < this.cols - 1) {
    pos.c = pos.c + 1;
  } else {
    pos.c = 0;
  }
  this.opt.choices.swap(idx, this.toIndex(pos));
};

Prompt.prototype.toPosition = function(idx) {
  var pos = {};
  pos.r = Math.floor(idx / this.cols);
  pos.c = (idx % this.cols);
  return pos;
};

Prompt.prototype.toIndex = function(pos) {
  var idx = (this.cols * pos.r) + pos.c;
  if (idx < 0) idx = 0;
  if (idx > this.opt.choices.length - 1) {
    idx = this.opt.choices.length - 1;
  }

  return idx;
};

/**
 * Jump to an item in the list
 */

Prompt.prototype.onNumberKey = function (input) {
  if (input <= this.opt.choices.length) {
    this.selected = input - 1;
  }
  this.render();
};

/**
 * Function for rendering grid
 * @param  {Number} pointer Position of the pointer
 * @return {String}         Rendered content
 */

function gridRender(choices, pointer, cols) {
  var pos = this.toPosition(pointer);
  var arr = new Array(cols).join(' ').split(' ');
  var output = '';
  // output += '(' + pos.r + ', ' + pos.c + ') [' + pointer + ']\n';
  output += '┌';
  output += arr.map(function() {
    return '──────────';
  }).join('┬');
  output += '┐\n';

  var rowSep = '├' + arr.map(function() {
    return '──────────';
  }).join('┼') + '┤\n';

  var len = choices.length;

  choices.forEach(function (choice, i) {
    var c = (i % cols);
    var isSelected = (i === pointer);
    var cell = (isSelected ? utils.figures.pointer + '' : ' ') + (choice.type === 'separator' ? '          ' : choice.name) + ' ';
    if (isSelected) {
      cell = utils.chalk.cyan(cell);
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

  output += '\n└' + arr.map(function() {
    return '──────────';
  }).join('┴') + '┘';

  return output.replace(/\n$/, '');
}

/**
 * Expose `Prompt`
 */

module.exports = Prompt;

