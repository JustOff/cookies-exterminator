let EXPORTED_SYMBOLS = ["Whitelist"];

let Whitelist = function(Prefs, Notifications) {
	this.whiteList = {};
	this.greyList = {};

	this.init = function() {
		this.loadFromPrefs();
	};

	this.loadFromPrefs = function() {
		this.whiteList = {};
		this.greyList = {};

		let whitelistedDomains = Prefs.getValue("whitelistedDomains");

		if (whitelistedDomains != "") {
			let separatedDomains = whitelistedDomains.split(';');
			
			for (let domain of separatedDomains) {
				this.whiteList[domain] = true;
			}
		}

		let greylistedDomains = Prefs.getValue("greylistedDomains");

		if (greylistedDomains != "") {
			let separatedDomains = greylistedDomains.split(';');

			for (let domain of separatedDomains) {
				this.greyList[domain] = true;
			}
		}
	};

	this.saveToPrefs = function(domains, prefname) {
		let whitelistedDomains = "";

		for (let domain in domains) {
			if (domains[domain]) {
				whitelistedDomains += domain + ";";
			}
		}

		whitelistedDomains = whitelistedDomains.slice(0, -1);

		Prefs.setValue(prefname, whitelistedDomains);
		if (prefname == "whitelistedDomains" && whitelistedDomains == "") {
			Prefs.setValue("enableProcessing", false);
			Notifications.notifyDisabled();
		}
		Prefs.save();
	};

	this.addToWhitelist = function(domain) {
		this.whiteList[domain] = true;
		this.saveToPrefs(this.whiteList, "whitelistedDomains");
	};

	this.addToGreylist = function(domain) {
		this.greyList[domain] = true;
		this.saveToPrefs(this.greyList, "greylistedDomains");
	};

	this.removeFromWhitelist = function(domain) {
		delete this.whiteList[domain];
		this.saveToPrefs(this.whiteList, "whitelistedDomains");
	};

	this.removeFromGreylist = function(domain) {
		delete this.greyList[domain];
		this.saveToPrefs(this.greyList, "greylistedDomains");
	};

	this.isWhitelisted = function(domain) {
		return this.whiteList[domain] || this.checkForWildcard(domain, this.whiteList);
	};

	this.isGreylisted = function(domain) {
		return this.greyList[domain] || this.checkForWildcard(domain, this.greyList);
	};

	this.checkForWildcard = function(domain, domains) {
		if (typeof domain === "string") {
			while (domain.indexOf(".") != -1) {
				domain = domain.substring(domain.indexOf(".") + 1);
				if (domain.indexOf(".") != -1 && domains[domain]) {
					return domain;
				}
			}
		}

		return null;
	};

	this.onPrefsApply = function() {
		this.loadFromPrefs();
	};
};
