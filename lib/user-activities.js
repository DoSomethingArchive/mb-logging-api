/**
 * Interface to bulk user logging requests.
 *
 *  GET to /v1/user/activity
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

/**
 * Constructor to the Log object.
 *
 * @param model
 *   The model of the log document.
 */
function UserActivities(model) {
  this.docModel = model;
}

/**
 * Retrieve user activity log documents.
 *
 * @param request
 *   The request object in the GET callback.
 * @param response
 *   The response object in the GET callback.
 */
UserActivities.prototype.get = function(request, response) {
  if (request.query.birthdate) {
    getByBirthdate(request, response, this);
  }
  else if (request.query.drupal_register_date) {
    getByDrupalRegisterDate(request, response, this);
  }
  else {
    getAllActivities(request, response, this);
  }
};

// Export the Users class
module.exports = UserActivities;
