let EXPORTED_SYMBOLS = ["Notifications"];

Components.utils.import("resource://gre/modules/Services.jsm");

let AlertsService = Components.classes["@mozilla.org/alerts-service;1"]
							  .getService(Components.interfaces.nsIAlertsService);

let Notifications = function(extName, Prefs, Utils) {
	this.contentURL = "chrome://" + extName + "/skin/";
	this.iconFileName = "icon.png";

	this.alertName = "cookextermNotification";
	this.alertTitle = "Cleaned cookies/storage from";
	this.conflictMessage = "Cookies Exterminator was NOT enabled because of conflicting add-on: ";
	this.conflictTitle = "Cookies Exterminator Alert";
	
	this.notify = function(crushedDomainsString) {
		if (Prefs.getValue("enableNotifications") && crushedDomainsString) {
			AlertsService.showAlertNotification(this.contentURL + this.iconFileName, 
												this.alertTitle, crushedDomainsString, 
												false, "", null, this.alertName);
		}
	};

	this.incompat = function(addon) {
		try {
			AlertsService.showAlertNotification(this.contentURL + this.iconFileName, 
												this.conflictTitle, this.conflictMessage + addon,
												false, "", null, this.alertName);
			let mrw = Services.wm.getMostRecentWindow("navigator:browser");
			let nb = mrw.gBrowser.getNotificationBox();
			nb.appendNotification(this.conflictMessage + addon, this.alertName,
									this.contentURL + this.iconFileName, nb.PRIORITY_WARNING_HIGH, null);
		} catch(e) {}
	};
};
