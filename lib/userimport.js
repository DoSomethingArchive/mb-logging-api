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
function UserImport(model) {
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
UserImport.prototype.post = function(req, res) {
  this.request = req;
  this.response = res;
  var addArgs = {};

  if (this.request.body.logging_timestamp !== undefined) {
    // Convert timestamp string to Date object
    var timestamp = parseInt(this.request.body.logging_timestamp);
    addArgs.logged_date = convertToDate(timestamp);
  }
  if (this.request.body.phone !== undefined) {
    addArgs.phone = {
      "number" : this.request.body.phone,
      "status" : this.request.body.phone_status
    }
  }
  if (this.request.body.email !== undefined) {
    var timestamp = parseInt(this.request.body.email_acquired_timestamp);
    addArgs.email = {
      "address" : this.request.body.email,
      "status" : this.request.body.email_status,
      "acquired" : convertToDate(timestamp)
    }
  }
  if (this.request.body.drupal !== undefined) {
    addArgs.drupal = {
      "email" : this.request.body.email,
      "uid" : this.request.body.drupal_uid
    }
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
    return console.log("Created log entry.");
  });

  return res.send(logEntry);
};

/**
 * Saves a log document.
 *
 * @param args
 *  Values to update the document with.
 * @param response
 *  Response object to handle responses back to the sender.
 */
UserImport.prototype.addLog = function(args, response) {
  var self = {};
  self.args = args;
  self.response = response;
  
  console.log(this.docModel);
  
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

module.exports = UserImport;