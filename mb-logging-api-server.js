var express           = require('express');
var mongoose          = require('mongoose');
var bodyParser        = require('body-parser');
var FileStreamRotator = require('file-stream-rotator');
var fs                = require('fs');
var morgan            = require('morgan');
 
var routes = require('./routes/routes');
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

// REGISTER ROUTES
// =============================================================================
// All of routes will be prefixed with /api
app.use('/api', routes);

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
