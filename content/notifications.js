let EXPORTED_SYMBOLS = ["Notifications"];

Components.utils.import("resource://gre/modules/Services.jsm");

let AlertsService = Components.classes["@mozilla.org/alerts-service;1"]
							  .getService(Components.interfaces.nsIAlertsService);

let Notifications = function(extName, Prefs, Utils) {
	this.contentURL = "chrome://" + extName + "/skin/";
	this.iconFileName = "notification.png";

	this.alertName = "cookextermNotification";

	this.suppress = false;
	this.lastMessage = "";
	this.timer = null;

	this.notify = function(cleanedDomainsString) {
		if (Prefs.getValue("enableNotifications") && cleanedDomainsString) {
			let title;
			if (cleanedDomainsString == this.lastMessage && !this.suppress) {
				title = Utils.translate("AlertSuppress");
				this.suppress = true;
			} else if (cleanedDomainsString == this.lastMessage && this.suppress) {
				return;
			} else {
				title = Utils.translate("AlertTitle");
				this.lastMessage = cleanedDomainsString;
				this.suppress = false;
			}
			AlertsService.showAlertNotification(this.contentURL + this.iconFileName, title,
												cleanedDomainsString, false, "", null, this.alertName);
			if (this.timer) {
				Utils.clearTimeout(this.timer);
				this.timer = null;
			}
			let alertName = this.alertName;
			this.timer = Utils.setTimeout(function() {
				AlertsService.closeAlert(alertName);
			}, Prefs.getValue("notificationTimeout"));
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
