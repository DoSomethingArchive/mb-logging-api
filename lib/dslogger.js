var fs = require('fs')
    ;

// Directory logs will get written to.
var LOG_DIR = './dslogger/';

function DSLogger() {

}

/**
 * Initialize DSLogger.
 *
 * @param filename
 *   Base name of the file to write to.
 * @param logToConsole
 *   Whether or not DSLogger should also log to the console.
 */
DSLogger.prototype.init = function(filename, logToConsole) {
  this.baseFilename = filename;
  this.logToConsole = logToConsole;
};

/**
 * Regular log to file.
 *
 * @param chunk
 *   Chunk to write to the log.
 */
DSLogger.prototype.log = function(chunk) {
  // Create error log filename.
  var filename = LOG_DIR + this.baseFilename + '_' + getTimeString() + '.log';

  // Write to the log.
  this.writeToFile(filename, chunk, false);

  // Write to console.
  if (this.logToConsole) {
    console.log(chunk);
  }
};

/**
 * Log an error.
 *
 * @param chunk
 *   Chunk to write to the log.
 */
DSLogger.prototype.error = function(chunk) {
  // Create error log filename.
  var filename = LOG_DIR + this.baseFilename + '_' + getTimeString() + '_error.log';

  // Write to the log.
  this.writeToFile(filename, chunk, true);

  // Write to console.
  if (this.logToConsole) {
    console.error(chunk);
  }
};

/**
 * Does the actual writing of a message to the file.
 *
 * @param filename
 *   Name of the file to write to.
 * @param chunk
 *   Chunk to write to the log.
 * @param isError
 *   Flag whether or not it's an error message.
 */
DSLogger.prototype.writeToFile = function(filename, chunk, isError) {
  // Check if the file already exists.
  try {
    fs.statSync(filename);
  }
  catch(e) {
    if (e.code === 'ENOENT') {
      // @todo Any need to close the stream or something?
    }
  }

  // Create the directory if it doesn't exist.
  try {
    fs.mkdirSync(LOG_DIR);
  }
  catch(e) {
    // If directory already exists, then no problem. Otherwise, error out.
    if (e.code !== 'EEXIST') {
      console.warn('Exception on mkdir for: ' + LOG_DIR + '. Code: ' + e.code);
      return;
    }
  }

  // Create a writable stream, if none exists already.
  var stream;
  if (!isError) {
    if (typeof(this.stream) === 'undefined') {
      this.stream = fs.createWriteStream(filename, {flags: 'a'});
    }

    stream = this.stream;
  }
  else {
    if (typeof(this.errorStream) === 'undefined') {
      this.errorStream = fs.createWriteStream(filename, {flags: 'a'});
    }

    stream = this.errorStream;
  }

  // Default to treating chunk as a string.
  var message = chunk;
  // But if chunk is an object, convert to JSON string.
  if (typeof(chunk) === 'object') {
    message = JSON.stringify(chunk);
  }

  // Prepend with a timestamp.
  var date = new Date();
  message = '[' + date.toString() + '] ' + message;

  // Add new line to end of message.
  message += '\n';

  // Write to the log.
  stream.write(message);
}

/**
 * Get the string of current date to use in filenames.
 *
 * @return String of today's date (mdY)
 */
var getTimeString = function() {
  var date = new Date();

  var day = date.getDate().toString();
  if (day.length == 1) {
    day = '0' + day;
  }

  var month = date.getMonth() + 1;
  month = month.toString();
  if (month.length == 1) {
    month = '0' + month;
  }

  var year = date.getFullYear().toString();

  var time = month + day + year;
  return time;
};

module.exports = new DSLogger();
