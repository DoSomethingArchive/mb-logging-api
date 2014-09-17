/**
 * Interface to the User model.
 */
var dslogger = require('./dslogger')
    ;

// Initialize logger.
dslogger.init('mb-logging-api-server', false);

/**
 * Constructor to the UserImportSummary object.
 *
 * @param model
 *   The model of the userImportSummary document.
 */
function UserImportSummary(model) {
  this.docModel = model;
}

/**
 * Converts a timestamp in seconds to a Date object.
 *
 * @param timestamp
 *   Timestamp in seconds.
 */
var convertToDate = function(timestamp) {
  return new Date(timestamp * 1000);
};

/**
 * Create a log document from the supplied values
 *
 * @param req
 *  The request object in a POST callback.
 * @param res
 *  The response object in a POST callback.
 */
UserImportSummary.prototype.post = function(req, res) {
  this.request = req;
  this.response = res;
  var addArgs = {};

  if (this.request.body.logging_timestamp !== undefined) {
    // Convert timestamp string to Date object
    var timestamp = parseInt(this.request.body.logging_timestamp);
    addArgs.logged_date = convertToDate(timestamp);
  }
  if (this.request.body.target_CSV_file !== undefined) {
    addArgs.target_CSV_file = this.request.body.target_CSV_file;
  }
  if (this.request.body.signup_count !== undefined) {
    addArgs.signup_count = this.request.body.signup_count;
  }
  if (this.request.body.skipped !== undefined) {
    addArgs.skipped = this.request.body.skipped;
  }
  if (this.request.body.source !== undefined) {
    addArgs.source = this.request.body.source;
  }
  if (this.request.body.type !== undefined) {
    addArgs.log_type = this.request.body.type;
  }

  var logEntry = new this.docModel(addArgs);
  logEntry.save(function(err) {
    if (err) {
      res.send(500, err);
      dslogger.error(err);
    }
    // Added log entry to db
    dslogger.log('Save executed on: ' + addArgs + '. Raw response from mongo:');
    dslogger.log(addArgs);
    return console.log("Created summary log entry using UserImportSummary POST method.");
  });

  res.send(201);
  return res.send(logEntry);
};

module.exports = UserImportSummary;
