var express = require('express')
    , mongoose = require('mongoose')
    , User = require('./lib/log')
    , dslogger = require('./lib/dslogger')
    ;

// Initialize the logging mechanism. Defines filename to write to and whether
// or not to also log to the console.
dslogger.init('mb-logging-api-server', false);

/**
 * Parse command line arguments.
 *
 * -port -p
 *   Allows the caller to set the port that this app should run on.
 */
var listenForPort = false;
var overridePort = false;
var defaultPort = 4722;

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

// Start server
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

var loggingModel;
var loggingCollectionName = 'import-user-niche';
mongoose.connection.once('open', function() {

  // User schema
  var userImportLoggingSchema = new mongoose.Schema({
    logging_date : Date,
    media : {
      type : String,
      required : true,
      enum : ['email', 'phone', 'other', 'undefined'],
      default : 'undefined'
    },
    address : String,
    status : String,
    acquired : Date
  });
  userImportLoggingSchema.set('autoIndex', false);

  // Logging model
  loggingModel = mongoose.model(loggingCollectionName, userImportLoggingSchema);

  console.log("Connection to Mongo (%s) succeeded! Ready to go...\n\n", mongoUri);
});

/**
 * Routes
 */

/**
 * POST to /log
 */
app.post('/log', function(req, res) {
  if (req.body.media === undefined || req.body.address === undefined || req.body.status === undefined) {
    res.send(400, 'No media, address or status specified.');
  }
  else {
    var log = new Log(loggingModel);
    log.post(req, res);
  }
});