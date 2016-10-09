let EXPORTED_SYMBOLS = ["Utils"];

Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://gre/modules/Timer.jsm");

let Utils = function() {
	this.getRawDomain = function(fullDomain) {
		return (fullDomain && fullDomain.substr(0, 4) == "www.") ?
			   fullDomain.substr(4, fullDomain.length) :
			   fullDomain;
	};

	this.setTimeout = function(method, delayInSeconds) {
		setTimeout(function() {
			if (Services) {
				method();
			}
		}, delayInSeconds * 1000);
	};
};
