let EXPORTED_SYMBOLS = ["Notifications"];

Components.utils.import("resource://gre/modules/Timer.jsm");
let AlertsService = Components.classes["@mozilla.org/alerts-service;1"]
                              .getService(Components.interfaces.nsIAlertsService);

let Notifications = function(extName, Prefs) {
    this.contentURL = "chrome://" + extName + "/content/";
    this.iconFileName = "icon.png";
    
    this.alertName = "ctcNotification";
    
    this.alertTitle = "Crush Those Cookies";
    this.alertText = "Crushed cookies from ";
    
    this.notify = function(crushedDomainsString) {
        if (Prefs.getValue("enableNotifications") && crushedDomainsString) {
            AlertsService.showAlertNotification(this.contentURL + this.iconFileName, 
                                                this.alertTitle,
                                                this.alertText + crushedDomainsString, 
                                                false, "", null, this.alertName);
        }
    };
};