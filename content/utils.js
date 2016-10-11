let EXPORTED_SYMBOLS = ["Utils"];

Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://gre/modules/Timer.jsm");

let eTLDService = Components.classes["@mozilla.org/network/effective-tld-service;1"]
					.getService(Components.interfaces.nsIEffectiveTLDService);
let IDNService = Components.classes["@mozilla.org/network/idn-service;1"]
					.getService(Components.interfaces.nsIIDNService);

let Utils = function() {
	this.getBaseDomain = function(fullDomain) {
		return eTLDService.getBaseDomainFromHost(fullDomain);
	};

	this.ACEtoUTF8 = function(domain) {
		return IDNService.convertACEtoUTF8(domain);
	};

	this.UTF8toACE = function(domain) {
		return IDNService.convertUTF8toACE(domain);
	};

	this.setTimeout = function(method, delayInSeconds) {
		setTimeout(function() {
			if (Services) {
				method();
			}
		}, delayInSeconds * 1000);
	};
};
