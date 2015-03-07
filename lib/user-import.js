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

  // Include parameter values in post
  addArgs.source = this.request.query.source;

  if (req.query.origin !== undefined) {
    var timestamp = parseInt(this.request.query.processed_timestamp);
    addArgs.origin = {
      "name" : this.request.query.origin ,
      "processed" : convertToDate(timestamp)
    }
  }

  // POST submission values
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
    addArgs.email = {
      "address" : this.request.body.email,
      "status" : this.request.body.email_status
    }
    if (this.request.body.email_acquired_timestamp !== undefined) {
      var timestamp = parseInt(this.request.body.email_acquired_timestamp);
      addArgs.email.acquired = convertToDate(timestamp);
    }
  }
  if (this.request.body.drupal_uid !== undefined) {
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
    res.send(201, addArgs);
    dslogger.log('Save executed on: ' + addArgs + '. Raw response from mongo:');
    console.log("Created log entry." + addArgs);
  });
};

/**
 * Retrieve existing user log documents. Example request:
 * /api/v1/imports/2014-09-01/2014-10-01?type=user&exists=1&source=niche.com
 *
 * @param req
 *   The request object in the GET callback.
 * @param res
 *   The response object in the GET callback.
 */
UserImport.prototype.get = function(req, res) {

  if (req.param("start_date") == 0) {
    var targetStartDate = new Date('2014-08-01');
  }
  else {
    var targetStartDate = new Date(req.param("start_date"));
  }
  if (req.param("end_date") == 0) {
    var targetEndDate = new Date();
  }
  else {
    var targetEndDate = new Date(req.param("end_date"));
  }

  var data = {
    request: req,
    response: res
  };
  this.docModel.find( {
    $and : [
      { 'logged_date' : {$gte : targetStartDate, $lte : targetEndDate} },
      { 'source' : req.query.source }
    ]},
    function (err, docs) {
      if (err) {
        data.response.send(500, err);
        dslogger.error(err);
        return;
      }

      // Send results
      console.log('Summary query returned.');
      data.response.send(201, docs);
  })
};

module.exports = UserImport;
