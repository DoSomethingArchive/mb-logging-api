/**
 * Interface to the User model.
 */
var   util = require('util');

/**
 * Constructor to the Log object.
 *
 * @param model
 *   The model of the log document.
 */
function UserActivity(model) {
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
 * Create a log document from the supplied values for a user activity.
 *
 * @param req
 *  The request object in a POST callback.
 * @param res
 *  The response object in a POST callback.
 */
UserActivity.prototype.post = function(req, res) {
  this.request = req;
  this.response = res;
  var addArgs = {};

  // Include parameter values in post
  addArgs.email = this.request.body.email;
  addArgs.source = this.request.body.source.toUpperCase();

  addArgs.activity = this.request.query.type;
  addArgs.activity_date = this.request.body.activity_date;
  addArgs.activity_details = this.request.body.activity_details;

  addArgs.logged_date = new Date();

  var logEntry = new this.docModel(addArgs);
  logEntry.save(function(err) {
    if (err) {
      res.send(500, err);
    }

    // Added log entry to db
    res.send(201, addArgs);
    console.log('Save executed on: ' + util.inspect(addArgs, false, null) + '.');
  });
};

/**
 * Retrieve existing user activity log documents. Example request GET:
 * /api/v1/user/activity/2014-09-01T00:00:00/2014-10-01T00:00:00?type=vote&targetEmail=<test@test.com>&source=AGG
 *
 * @param req
 *   The request object in the GET callback.
 * @param res
 *   The response object in the GET callback.
 */
UserActivity.prototype.get = function(req, res) {

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
      { 'source' : req.query.source },
      { 'email' : req.query.targetEmail }
    ]},
    function (err, docs) {
      if (err) {
        data.response.send(500, err);
        return;
      }

      // Send results
      console.log('Logged votes returned for ' + req.query.targetEmail + ' returned.');
      data.response.send(201, docs);
  })
};

module.exports = UserActivity;
