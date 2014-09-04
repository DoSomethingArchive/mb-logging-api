/**
 * Interface to the User model.
 */
var dslogger = require('./dslogger')
    ;

// Initialize logger.
dslogger.init('mb-logging-api-server', false);

/**
 * Constructor to the Log object.
 *
 * @param model
 *   The model of the log document.
 */
function Log(model) {
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
 * @param args
 *  Values to create the document with.
 * @param response
 *  Response object to handle responses back to the sender.
 */
Log.prototype.post = function(args, response) {
  var self = this;
  self.request = req;
  self.response = res;
  
  if (self.request.body.logging_timestamp !== undefined) {
    // Convert timestamp string to Date object
    var timestamp = parseInt(self.request.body.logging_timestamp);
    addArgs.logging_date = convertToDate(timestamp);
  }
  if (self.request.body.media !== undefined) {
    addArgs.media = self.request.media;
  }
  if (self.request.body.media !== undefined  &&
      (self.request.body.media === 'email' || self.request.body.media === 'phone' || self.request.body.media === 'other')) {
    addArgs.media = self.request.media;
  }
  if (self.request.body.address !== undefined) {
    addArgs.address = self.request.address;
  }
  if (self.request.body.status !== undefined) {
    addArgs.status = self.request.status;
  }
  if (self.request.body.acquired_timestamp !== undefined) {
    // Convert timestamp string to Date object
    var timestamp = parseInt(self.request.body.acquired_timestamp);
    addArgs.acquired = convertToDate(timestamp);
  }

  // Update the user document.
  self.addLog(addArgs, self.response);
};

/**
 * Saves a log document.
 *
 * @param args
 *  Values to update the document with.
 * @param response
 *  Response object to handle responses back to the sender.
 */
User.prototype.addLog = function(args, response) {
  var self = {};
  self.args = args;
  self.response = response;
  
  this.docModel.save(function(err) {
    if (err) {
      self.response.send(500, err);
      dslogger.error(err);
    }
    // Added log entry to db
    dslogger.log('Save executed on: ' + self.address + '. Raw response from mongo:');
    dslogger.log(raw);
    self.response.send(true);
  });

};

module.exports = Log;
