var express = require('express')
    , mongoose = require('mongoose')
    , UserImport = require('./lib/user-import-niche')
    , UserImportSummary = require('./lib/user-import-summary')
    , dslogger = require('./lib/dslogger')
    ;

/**
 * Initialize the logging mechanism. Defines filename to write to and whether
 * or not to also log to the console.
 */
dslogger.init('mb-logging-api-server', false);

/**
 * Parse command line arguments.
 *
 * -port -p
 *   Allows the caller to set the port that this app should run on.
 */
var listenForPort = false;
var overridePort = false;
var defaultPort = 4766;

process.argv.forEach(function(val, idx, arr) {
  if (listenForPort) {
    listenForPort = false;
    overridePort = parseInt(val);
  }

  if (val === '-port' || val === '-p') {
    listenForPort = true;
  }
});

/**
 * Express Setup
 */
var app = express();

app.configure(function() {
  // Replaces express.bodyParser() - parses request body and populates request.body
  app.use(express.urlencoded());
  app.use(express.json());

  // Checks request.body for HTTP method override
  app.use(express.methodOverride());

  // Perform route lookup based on url and HTTP method
  app.use(app.router);

  // Show all errors in development
  app.use(express.errorHandler({dumpException: true, showStack: true}));
});

/**
 * Start server.
 */
var port = overridePort || process.env.MB_LOGGING_API_PORT || defaultPort;
app.listen(port, function() {
  console.log('Message Broker Logging API server listening on port %d in %s mode.', port, app.settings.env);
});

/**
 * Mongo setup and config.
 */
var mongoUri = 'mongodb://localhost/mb-logging';
mongoose.connect(mongoUri);
mongoose.connection.on('error', function(err) {
  console.log('Unable to connect to the Mongo database (%s). Check to make sure the database is running.', mongoUri);
  process.exit();
});

var userImportModel;
var userImportCollectionName = 'userimport-niche';
var userImportSummaryModel;
var userImportSummaryCollectionName = 'userimport-summary';
mongoose.connection.once('open', function() {

  // User import logging schema for existing entries
  var userImportLoggingSchema = new mongoose.Schema({
    logged_date : { type: Date, default: Date.now },
    phone : {
      number : { type : String, trim : true },
      status : { type : String, trim : true }
    },
    email : {
      address : { type : String, trim : true },
      status : { type : String, trim : true },
      acquired : { type: Date, default: Date.now }
    },
    drupal : {
      email : { type : String, trim : true },
      uid : { type : Number }
    }
  });
  userImportLoggingSchema.set('autoIndex', false);
  // Logging model
  userImportModel = mongoose.model(userImportCollectionName, userImportLoggingSchema);

  // User import logging schema for summary reports
  var userImportSummarySchema = new mongoose.Schema({
    logged_date : { type: Date, default: Date.now },
    target_CSV_file : { type : String, trim : true },
    signup_count : { type : Number },
    skipped : { type : Number }
  });
  userImportSummarySchema.set('autoIndex', false);
  // Logging summary model
  userImportSummaryModel = mongoose.model(userImportSummaryCollectionName, userImportSummarySchema);

  console.log("Connection to Mongo (%s) succeeded! Ready to go...\n\n", mongoUri);
});

/**
 * Routes
 */

/**
 * GET /api - report basic details about the API
 * GET /api/v1
 */
app.get('/api', function(req, res) {
  res.send(200, 'Message Broker Logging API (mb-logging-api). Available versions: v1 (/api/v1) See https://github.com/DoSomething/mb-logging-api for the related git repository.');
});
app.get('/api/v1', function(req, res) {
  res.send(200, 'Message Broker Logging API (mb-logging-api). Version 1.x.x, see wiki (https://github.com/DoSomething/mb-logging-api/wiki) for documentation');
});

/**
 * POST to /api/v1/imports
 *
 * @param type string
 *
 *
 * @param exists integer
 *
 *
 * @param source string
 *
 */
app.post('/api/v1/imports', function(req, res) {
  if (req.body.email === undefined && req.body.phone === undefined && req.body.drupal_uid === undefined) {
    res.send(400, 'No email, phone or Drupal uid specified.');
    dslogger.error('POST /api/imports request. No email, phone or Drupal uid specified.');
  }
  else {
    var userImport = new UserImport(userImportModel);
    userImport.post(req, res);
  }
});

/**
 * POST to /api/userimport/existing
 */
app.post('/api/v1/imports/summary', function(req, res) {
  if (req.body.target_CSV_file === undefined || req.body.signup_count === undefined || req.body.skipped === undefined) {
    res.send(400, 'No target CSV file, signup count and skipped values specified.');
    dslogger.error('POST /api/userimport/niche/summary request. No target CSV file, signup count and skipped values specified.');
  }
  else {
    var userImportSummary = new UserImportSummary(userImportSummaryModel);
    userImportSummary.post(req, res);
  }
});

/**
 * GET from /api/v1/imports/:start_timestamp/:end_timestamp
 */
app.get('/api/v1/imports/summary/:start_date/:end_date', function(req, res) {
  if (req.query.type == 'user' && req.query.exists == 1) {
    var userImportSummary = new UserImportSummary(userImportSummaryModel);
    userImportSummary.get(req, res);
  }
  else {
    res.send(400, 'type or exists setting specified not supported at this time.');
    dslogger.error('GET /api/v1/imports request. type or exists setting specified not supported at this time.');
  }
});
