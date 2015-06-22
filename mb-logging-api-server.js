var express           = require('express');
var mongoose          = require('mongoose');
var bodyParser        = require('body-parser');
var FileStreamRotator = require('file-stream-rotator');
var fs                = require('fs');
var morgan            = require('morgan');

var UserImport = require('./lib/user-import');
var UserImportSummary = require('./lib/user-import-summary');
var UserActivity = require('./lib/user-activity');

var mb_config = require(__dirname + '/config/mb_config.json');
var logDirectory = __dirname + '/logs';

/**
 * Express Setup
 */
var app = express();

// ensure log directory exists
fs.existsSync(logDirectory) || fs.mkdirSync(logDirectory);

// var accessLogStream = fs.createWriteStream(__dirname + '/access.log',{flags: 'a'});

// create a rotating write stream
var accessLogStream = FileStreamRotator.getStream({
  filename: logDirectory + '/access-%DATE%.log',
  frequency: 'daily',
  verbose: false
});

// configure app to use bodyParser() to get the data from a POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Toggle tools and logging based on enviroment setting
if (app.get('env') == 'development') {
  // To output objects for debugging
  // console.log("/ request: " + util.inspect(request, false, null));
  var util = require('util');
  app.use(morgan('dev', {stream: accessLogStream}));
}
else if (app.get('env') == 'production') {
  app.use(morgan('common', {
    skip: function(req, res) { return res.statusCode < 400 },
    stream: accessLogStream
  }));
}

// DEFINE ROUTES
// =============================================================================
var router = express.Router();

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
    var userActivity = new UserActivity(userActivityModel);
    userActivity.get(req, res);
  });


// REGISTER ROUTES
// =============================================================================
// All of routes will be prefixed with /api
app.use('/api', router);

/**
 * Start server.
 */
var port = process.env.MB_LOGGING_API_PORT || mb_config.default.port;
app.listen(port, function() {
  console.log('Message Broker Logging API server listening on port %d in %s mode.', port, app.settings.env);
});


// Mongoose (MongoDB)
// =============================================================================
// All configurations related to the mb-logging Mongo database.
if (app.get('env') == 'production') {
  var mongoUri = mb_config.mongo.production;
}
else {
  var mongoUri = mb_config.mongo.development;
}
mongoose.connect(mongoUri);
mongoose.connection.on('error', function(err) {
  console.log('Unable to connect to the Mongo database (%s). Check to make sure the database is running.', mongoUri);
  process.exit();
});

// Define schema / models
var userImportModel;
var userImportCollectionName_Niche = 'userimport-niche';
var userImportCollectionName_HerCampus = 'userimport-hercampus';
var userImportCollectionName_ATT_iChannel = 'userimport-att-ichannel';
var userImportCollectionName_TeenLife = 'userimport-teenlife';

var importSummaryModel;
var importSummaryCollectionName = 'import-summary';

var userActivityModel;
var userActivityCollectionName = 'user-activity';

// Connection to Mongo event
mongoose.connection.once('open', function() {

  // userImport
  //
  // User import logging schema for existing entries
  var userImportLoggingSchema = new mongoose.Schema({
    logged_date : { type: Date, default: Date.now },
    origin : {
      name : { type : String, trim : true },
      processed : { type: Date }
    },
    source : {
      type : String,
      lowercase : 1,
      trim : true,
      enum: ['niche', 'niche.com', 'hercampus', 'att-ichannel', 'teenlife']
    },
    phone : {
      number : { type : String, trim : true },
      status : { type : String, trim : true },
      acquired : { type: Date }
    },
    email : {
      address : { type : String, trim : true },
      status : { type : String, trim : true },
      acquired : { type: Date }
    },
    drupal : {
      email : { type : String, trim : true },
      uid : { type : Number }
    }
  });
  userImportLoggingSchema.set('autoIndex', false);

  userImportModel_niche = mongoose.model(userImportCollectionName_Niche, userImportLoggingSchema);
  userImportModel_hercampus = mongoose.model(userImportCollectionName_HerCampus, userImportLoggingSchema);
  userImportModel_att_ichannel = mongoose.model(userImportCollectionName_ATT_iChannel, userImportLoggingSchema);
  userImportModel_teenlife = mongoose.model(userImportCollectionName_TeenLife, userImportLoggingSchema);

  // importSummary
  //
  // User import logging schema for summary reports
  var importSummaryLoggingSchema = new mongoose.Schema({
    logged_date : { type: Date, default: Date.now },
    target_CSV_file : { type : String, trim : true },
    signup_count : { type : Number },
    skipped : { type : Number },
    source : {
      type : String,
      lowercase : 1,
      trim : true,
      enum: ['niche', 'niche.com', 'hercampus', 'att-ichannel', 'teenlife']
    },
    log_type : {
      type : String,
      lowercase : 1,
      trim : true,
      enum: ['user_import']
    },
  });
  importSummaryLoggingSchema.set('autoIndex', false);

  // Logging summary model
  importSummaryModel = mongoose.model(importSummaryCollectionName, importSummaryLoggingSchema);

  // userActivity
  //
  // External application user event logging schema for "in the future" email list generation
  var userActivityLoggingSchema = new mongoose.Schema({
    logged_date : { type: Date, default: Date.now },
    email : { type : String, trim : true },
    source : {
      type : String,
      trim : true,
      enum: ['CGG', 'AGG']
    },
    activity : {
      type : String,
      lowercase : 1,
      trim : true,
      enum: ['vote']
    },
    activity_date : { type: Date, default: Date.now },
    activity_details : { type : String }
  });
  userActivityLoggingSchema.set('autoIndex', false);

  // Log user activity model
  userActivityModel = mongoose.model(userActivityCollectionName, userActivityLoggingSchema);

  console.log("Connection to Mongo (%s) succeeded! Ready to go...\n\n", mongoUri);
});
