
module.exports = (function() {

  var router = require('express').Router();
  
  var UserImport = require('lib/user-import');
  var UserImportSummary = require('lib/user-import-summary');
  var UserActivity = require('lib/user-activity');
  
  /**
   * GET /api - report basic details about the API
   * GET /api/v1
   */
  router.get('/', function(req, res) {
    res.send(200, 'Message Broker Logging API (mb-logging-api). Available versions: v1 (/api/v1) See https://github.com/DoSomething/mb-logging-api for the related git repository.');
  });
  router.get('/v1', function(req, res) {
    res.send(200, 'Message Broker Logging API (mb-logging-api). Version 1.x.x, see wiki (https://github.com/DoSomething/mb-logging-api/wiki) for documentation');
  });
  
  /**
   * POST to /api/v1/imports
   *
   * @param type string
   *   ex. &type=user : The type of import, helps to define what collection the
   *   POST is added to.
   *
   * @param exists integer
   *   &exists=1 : Flag to log entries of existing Drupal, Mailchimp and Mobile
   *   Commons users in the userImportModel.
   *
   * @param source string
   *   &source=niche : Unique name to identify the source of the import data.
   */
  router.post('/v1/imports', function(req, res) {
    if (req.query.type === undefined ||
        req.query.exists === undefined ||
        req.query.source === undefined ||
        req.query.origin === undefined ||
        req.query.processed_timestamp === undefined ||
        (  req.body.email === undefined &&
           req.body.phone === undefined &&
           req.body.drupal_uid === undefined)
      ) {
      res.send(400, 'Type, exists and source, origin or started_timestamp not specified or no email, phone or Drupal uid specified.');
    }
    else {
  
      // Use model based on source
      if (req.query.source.toLowerCase() === 'niche') {
        var userImport = new UserImport(userImportModel_niche);
        userImport.post(req, res);
      }
      else if (req.query.source.toLowerCase() === 'hercampus') {
        var userImport = new UserImport(userImportModel_hercampus);
        userImport.post(req, res);
      }
      else if (req.query.source.toLowerCase() === 'att-ichannel') {
        var userImport = new UserImport(userImportModel_att_ichannel);
        userImport.post(req, res);
      }
      else if (req.query.source.toLowerCase() === 'teenlife') {
        var userImport = new UserImport(userImportModel_teenlife);
        userImport.post(req, res);
      }
      else {
        console.log('POST /api/v1/imports request. Invalid source: ' + req.query.source);
      }
    }
  });
  
  /**
   * POST to /api/v1/imports/summaries
   *
   * @param type string
   *   ex. &type=user : The type of import.
   *
   * @param source string
   *   &source=niche.com : Unique name to identify the source of the import data.
   */
  router.post('/v1/imports/summaries', function(req, res) {
    if (req.query.type === undefined ||
        req.query.source === undefined ||
        req.body.target_CSV_file === undefined ||
        req.body.signup_count === undefined ||
        req.body.skipped === undefined) {
      res.send(400, 'POST /api/v1/imports/summaries request. Type or source not specified or no target CSV file, signup count and skipped values specified.');
    }
    else {
      var userImportSummary = new UserImportSummary(importSummaryModel);
      userImportSummary.post(req, res);
    }
  });
  
  /**
   * POST to /v1/user/activity
   *   Required parameter:
   *     - type: The type of activity to log. Currently only "vote" is supported.
   *
   *   POST values:
   *     - email
   *     - source
   *     - activity
   *
   * GET to /v1/user/activity
   *   Optional parameters:
   *     - type: The type of activity log.
   *     - source: What application produced the log entry.
   *     - offset: The time (in seconds) to offset from the current time.
   *     - interval: The length of time from the offset to request a group of log
   *         entries.
   *
   *     If none of the optional parameters are applied the request will return
   *     all of the existing log entries.
   */
  router.route('/v1/user/activity')
  
    .post(function(req, res) {
      if (req.query.type != 'vote') {
        res.send(400, 'POST /api/v1/user/activity request. Type not supported activity: ' + req.body.type);
      }
      else {
        var userActivity = new UserActivity(userActivityModel);
        userActivity.post(req, res);
      }
    })
  
    .get(function(req, res) {
      if (req.query.type === undefined && req.query.source === undefined) {
        res.send(400, 'GET /api/v1/user/activity request, type and/or source not defined. ');
      }
      else {
        var userActivity = new UserActivity(userActivityModel);
        userActivity.get(req, res);
      }
    });
    
    return router;
    
})();