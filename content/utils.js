let EXPORTED_SYMBOLS = ["Utils"];

Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://gre/modules/Timer.jsm");
let eTLDService = Components.classes["@mozilla.org/network/effective-tld-service;1"]
					.getService(Components.interfaces.nsIEffectiveTLDService);

let Utils = function() {
	this.getBaseDomain = function(fullDomain) {
		return eTLDService.getBaseDomainFromHost(fullDomain);
	};

	this.setTimeout = function(method, delayInSeconds) {
		setTimeout(function() {
			if (Services) {
				method();
			}
		}, delayInSeconds * 1000);
	};
};
