let EXPORTED_SYMBOLS = ["Notifications"];

let AlertsService = Components.classes["@mozilla.org/alerts-service;1"]
							  .getService(Components.interfaces.nsIAlertsService);

let Notifications = function(extName, Prefs, Utils) {
	this.contentURL = "chrome://" + extName + "/skin/";
	this.iconFileName = "icon.png";

	this.alertName = "cookextermNotification";
	this.alertTitle = "Cleaned cookies from";
	
	this.messageBuffer = "";

	this.notify = function(crushedDomainsString) {
		if (Prefs.getValue("enableNotifications") && crushedDomainsString) {
			if (crushedDomainsString != "@") {
				if (this.messageBuffer == "") {
					Utils.setTimeout(this.notify.bind(this, "@"), 2);
				}
				this.messageBuffer = this.messageBuffer + ", " + crushedDomainsString;
			} else {
				let messageArray = this.messageBuffer.substring(2).split(", ");
				this.messageBuffer = "";
				messageArray = messageArray.filter(function(item, i, ar){ return ar.indexOf(item) === i; });
				let displayMessage = messageArray.join(", ");
				AlertsService.showAlertNotification(this.contentURL + this.iconFileName, 
													this.alertTitle, displayMessage, 
													false, "", null, this.alertName);
			}
		}
	};
};
