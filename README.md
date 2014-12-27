[https://david-dm.org/DoSomething/mb-logging-api.svg](https://david-dm.org/DoSomething/mb-logging-api.svg)

mb-logging-api
==============

An API to send logging data for persistant storage. Currently the persistant storage is a MongoDB.

###Endpoints

* GET /api - report basic details about the API
* GET /api/v1
* POST to /api/v1/imports
  * @param type string
    ex. &type=user : The type of import, helps to define what collection the
     POST is added to.
  * @param exists integer
    &exists=1 : Flag to log entries of existing Drupal, Mailchimp and Mobile
    Commons users in the userImportModel.
  * @param source string
    &source=niche : Unique name to identify the source of the import data.
* POST to /api/v1/imports/summaries
   * @param type string
     ex. &type=user : The type of import.
   * @param source string
     &source=niche.com : Unique name to identify the source of the import data.
