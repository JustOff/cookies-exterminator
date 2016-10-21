let EXPORTED_SYMBOLS = ["Notifications"];

Components.utils.import("resource://gre/modules/Services.jsm");

let AlertsService = Components.classes["@mozilla.org/alerts-service;1"]
							  .getService(Components.interfaces.nsIAlertsService);

let Notifications = function(extName, Prefs, Utils) {
	this.contentURL = "chrome://" + extName + "/skin/";
	this.iconFileName = "icon.png";

	this.alertName = "cookextermNotification";
	
	this.notify = function(cleanedDomainsString) {
		if (Prefs.getValue("enableNotifications") && cleanedDomainsString) {
			AlertsService.showAlertNotification(this.contentURL + this.iconFileName, 
												Utils.translate("AlertTitle"), cleanedDomainsString, 
												false, "", null, this.alertName);
		}
	};

	this.notifyIncompat = function(addon) {
		try {
			AlertsService.showAlertNotification(this.contentURL + this.iconFileName, 
												Utils.translate("AlertTitle2"), Utils.translate("ConflictMessage") + " " + addon,
												false, "", null, this.alertName);
			let mrw = Services.wm.getMostRecentWindow("navigator:browser");
			let nb = mrw.gBrowser.getNotificationBox();
			nb.appendNotification(Utils.translate("ConflictMessage") + " " + addon, this.alertName,
									this.contentURL + this.iconFileName, nb.PRIORITY_WARNING_HIGH, null);
		} catch(e) {}
	};

	this.notifyDisabled = function() {
		try {
			AlertsService.showAlertNotification(this.contentURL + this.iconFileName, 
												Utils.translate("AlertTitle2"), Utils.translate("DisabledMessage"),
												false, "", null, this.alertName);
			let mrw = Services.wm.getMostRecentWindow("navigator:browser");
			let nb = mrw.gBrowser.getNotificationBox();
			nb.appendNotification(Utils.translate("DisabledMessage"), this.alertName,
									this.contentURL + this.iconFileName, nb.PRIORITY_WARNING_HIGH, null);
		} catch(e) {}
	};
};
