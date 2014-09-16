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
 *   ex. &type=user : The type of import, helps to define what collection the
 *   POST is added to.
 *
 * @param exists integer
 *   &exists=1 : Flag to log entries of existing Drupal, Mailchimp and Mobile
 *   Commons users
 *
 * @param source string
 *   &source=niche : Unique name to identify the source of the import data.
 */
app.post('/api/v1/imports', function(req, res) {
  if (req.body.type === undefined || req.body.exists === undefined || req.body.source === undefined ||
      (req.body.email === undefined && req.body.phone === undefined && req.body.drupal_uid === undefined)) {
    res.send(400, 'Type, exists and source not specified or no email, phone or Drupal uid specified.');
    dslogger.error('POST /api/v1/imports request. No type, exists and source not specified or no email, phone or Drupal uid specified.');
  }
  else {
    var userImport = new UserImport(userImportModel);
    userImport.post(req, res);
  }
});

/**
 * POST to /api/v1/imports/summaries
 * @param type string
 *   ex. &type=user : The type of import.
 *
 * @param source string
 *   &source=niche : Unique name to identify the source of the import data.
 */
app.post('/api/v1/imports/summaries', function(req, res) {
  if (req.body.type === undefined || req.body.source === undefined ||
      req.body.target_CSV_file === undefined || req.body.signup_count === undefined || req.body.skipped === undefined) {
    res.send(400, 'Type or source not specified or no target CSV file, signup count and skipped values specified.');
    dslogger.error('POST /api/v1/imports/summaries request. Type or source not specified or no target CSV file, signup count and skipped values specified.');
  }
  else {
    var userImportSummary = new UserImportSummary(userImportSummaryModel);
    userImportSummary.post(req, res);
  }
});
