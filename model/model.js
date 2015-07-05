module.exports = (function() {

  var express = require('express');
  var app = express();
  var mongoose  = require('mongoose');
  var mb_config = require('config/mb_config.json');
  
  if (app.get('env') == 'development') {
    // To output objects for debugging
    // console.log("/process request: " + util.inspect(request, false, null));
    var util = require('util');
  }
  
  var models = {};

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
  var userImportCollectionName_Niche = 'userimport-niche';
  var userImportCollectionName_HerCampus = 'userimport-hercampus';
  var userImportCollectionName_ATT_iChannel = 'userimport-att-ichannel';
  var userImportCollectionName_TeenLife = 'userimport-teenlife';
  
  var importSummaryCollectionName = 'import-summary';
  
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
  
    models.userImportModel_niche = mongoose.model(userImportCollectionName_Niche, userImportLoggingSchema);
    models.userImportModel_hercampus = mongoose.model(userImportCollectionName_HerCampus, userImportLoggingSchema);
    models.userImportModel_att_ichannel = mongoose.model(userImportCollectionName_ATT_iChannel, userImportLoggingSchema);
    models.userImportModel_teenlife = mongoose.model(userImportCollectionName_TeenLife, userImportLoggingSchema);
  
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
    models.importSummaryModel = mongoose.model(importSummaryCollectionName, importSummaryLoggingSchema);
  
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
    models.userActivityModel = mongoose.model(userActivityCollectionName, userActivityLoggingSchema);
  
    console.log("Connection to Mongo (%s) succeeded! Ready to go...\n\n", mongoUri);
  });

  return models;
  
})();