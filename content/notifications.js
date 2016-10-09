let EXPORTED_SYMBOLS = ["Notifications"];

let AlertsService = Components.classes["@mozilla.org/alerts-service;1"]
							  .getService(Components.interfaces.nsIAlertsService);

let Notifications = function(extName, Prefs) {
	this.contentURL = "chrome://" + extName + "/skin/";
	this.iconFileName = "icon.png";

	this.alertName = "cookextermNotification";
	this.alertTitle = "Cleaned cookies from";

	this.notify = function(crushedDomainsString) {
		if (Prefs.getValue("enableNotifications") && crushedDomainsString) {
			AlertsService.showAlertNotification(this.contentURL + this.iconFileName, 
												this.alertTitle, crushedDomainsString, 
												false, "", null, this.alertName);
		}
	};
};
