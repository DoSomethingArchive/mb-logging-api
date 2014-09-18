var express = require('express')
    , mongoose = require('mongoose')
    , UserImport = require('./lib/user-import')
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

// Replaces express.bodyParser() - parses request body and populates request.body
app.use(express.urlencoded());
app.use(express.json());

// Checks request.body for HTTP method override
app.use(express.methodOverride());

// Perform route lookup based on url and HTTP method
app.use(app.router);

/// catch 404 and forwarding to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

/// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.send(500, err.status);
    /*
    res.render('error', {
      message: err.message,
      error: err
    });
    */
  });
  // Show all errors in development with express
  app.use(express.errorHandler({dumpException: true, showStack: true}));
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
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
var importSummaryModel;
var importSummaryCollectionName = 'import-summary';

mongoose.connection.once('open', function() {

  // User import logging schema for existing entries
  var userImportLoggingSchema = new mongoose.Schema({
    logged_date : { type: Date, default: Date.now },
    source : {
      type : String,
      lowercase : 1,
      trim : true,
      enum: ['niche.com']
    },
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
  var importSummarySchema = new mongoose.Schema({
    logged_date : { type: Date, default: Date.now },
    target_CSV_file : { type : String, trim : true },
    signup_count : { type : Number },
    skipped : { type : Number },
    source : {
      type : String,
      lowercase : 1,
      trim : true,
      enum: ['niche.com']
    },
    log_type : {
      type : String,
      lowercase : 1,
      trim : true,
      enum: ['user_import']
    },
  });
  importSummarySchema.set('autoIndex', false);
  // Logging summary model
  importSummaryModel = mongoose.model(importSummaryCollectionName, importSummarySchema);

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
 *   Commons users in the userImportModel.
 *
 * @param source string
 *   &source=niche : Unique name to identify the source of the import data.
 */
app.post('/api/v1/imports', function(req, res) {
  if (req.query.type === undefined || req.query.exists === undefined || req.query.source === undefined ||
      (req.body.email === undefined && req.body.phone === undefined && req.body.drupal_uid === undefined)) {
    res.send(400, 'Type, exists and source not specified or no email, phone or Drupal uid specified.');
    dslogger.error('POST /api/v1/imports request. No type, exists and source not specified or no email, phone or Drupal uid specified.');
  }
  else {
    // @todo: Future use of parameter to change the model based on exists
    // flag value.
    var userImport = new UserImport(userImportModel);
    userImport.post(req, res);
  }
});

/**
 * GET from /api/v1/imports/:start_timestamp/:end_timestamp
 */
app.get('/api/v1/imports/:start_date/:end_date', function(req, res) {
  var sd = new Date(req.param("start_date"));
  var ed = new Date(req.param("end_date"));
  if (sd != 'Invalid Date' && ed != 'Invalid Date') {
    if (req.query.type == 'user_import' && req.query.exists == 1 && req.query.source !== undefined) {
      var userImport = new UserImport(userImportModel);
      userImport.get(req, res);
    }
    else {
      res.send(400, 'type or exists setting specified not supported at this time.');
      dslogger.error('GET /api/v1/imports request. type or exists setting specified not supported at this time.');
    }
  }
  else {
    res.send(400, 'Validation error: /api/v1/imports/:start_date/:end_date -> Invalid start or end dates.');
    dslogger.error('GET /api/v1/imports/:start_date/:end_date request. Invalid start or end dates.');
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
app.post('/api/v1/imports/summaries', function(req, res) {
  if (req.query.type === undefined || req.query.source === undefined ||
      req.body.target_CSV_file === undefined || req.body.signup_count === undefined || req.body.skipped === undefined) {
    res.send(400, 'Type or source not specified or no target CSV file, signup count and skipped values specified.');
    dslogger.error('POST /api/v1/imports/summaries request. Type or source not specified or no target CSV file, signup count and skipped values specified.');
  }
  else {
    var userImportSummary = new UserImportSummary(importSummaryModel);
    userImportSummary.post(req, res);
  }
});

/**
 * GET from /api/v1/imports/summaries/:start_timestamp/:end_timestamp
 */
app.get('/api/v1/imports/summaries/:start_date/:end_date', function(req, res) {
  var sd = new Date(req.param("start_date"));
  var ed = new Date(req.param("end_date"));
  if (sd != 'Invalid Date' && ed != 'Invalid Date') {
    if (req.query.type == 'user_import' && req.query.exists == 1) {
      console.log(req.param("start_date"));
      var userImportSummary = new UserImportSummary(importSummaryModel);
      userImportSummary.get(req, res);
    }
    else {
      res.send(400, 'type or exists setting specified not supported at this time.');
      dslogger.error('GET /api/v1/imports/summaries/:start_date/:end_date request. type or exists setting specified not supported at this time.');
    }
  }
  else {
    res.send(400, 'Validation error: /api/v1/imports/summaries/:start_date/:end_date -> Invalid start or end dates.');
    dslogger.error('GET /api/v1/imports/summaries/:start_date/:end_date request. Invalid start or end dates.');
  }
});
