var express    = require('express');
var mongoose   = require('mongoose');
var bodyParser = require('body-parser');

var UserImport = require('./lib/user-import');

var mb_config = require(__dirname + '/config/mb_config.json');
var defaultPort = mb_config.default['port'];


/**
 * Express Setup
 */
var app = express();

// configure app to use bodyParser()
// this will let us get the data from a POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

if (app.get('env') == 'development') {
  // To output objects for debugging
  // console.log("/ request: " + util.inspect(request, false, null));
  var util = require('util');
}

// ROUTES API
// =============================================================================
var router = express.Router();
/*
router.get('/', function(req, res) {
  res.json({ message: 'hooray! welcome to our api!' });   
});
*/
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
router.get('/api/v1/imports', function(req, res) {
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
      dslogger.error('POST /api/v1/imports request. Invalid source: ' + req.query.source);
    }
  }
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
  var database = mb_config.mongo.production;
}
else {
  var database = mb_config.mongo.development;
}
mongoose.connect(database);
