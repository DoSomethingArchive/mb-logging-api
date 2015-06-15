var express    = require('express');        // call express
var bodyParser = require('body-parser');

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

// ROUTES FOR API
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

// REGISTER ROUTES -------------------------------
// all of routes will be prefixed with /api/v1
app.use('/api', router);

/**
 * Start server.
 */
var port = process.env.MB_LOGGING_API_PORT || mb_config.default.port;
app.listen(port, function() {
  console.log('Message Broker Logging API server listening on port %d in %s mode.', port, app.settings.env);
});
