let EXPORTED_SYMBOLS = ["Whitelist"];

let Whitelist = function(Prefs, Notifications) {
	this.domains = {};
	this.domainsTemp = {};

	this.init = function() {
		this.loadFromPrefs();
	};

	this.loadFromPrefs = function() {
		this.domains = {};
		this.domainsTemp = {};

		let whitelistedDomains = Prefs.getValue("whitelistedDomains");

		if (whitelistedDomains != "") {
			let separatedDomains = whitelistedDomains.split(';');
			
			for (let domain of separatedDomains) {
				this.domains[domain] = true;
			}
		}

		let greylistedDomains = Prefs.getValue("greylistedDomains");

		if (greylistedDomains != "") {
			let separatedDomainsTemp = greylistedDomains.split(';');

			for (let domain of separatedDomainsTemp) {
				this.domainsTemp[domain] = true;
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

	this.addDomain = function(domain) {
		this.domains[domain] = true;
		this.saveToPrefs(this.domains, "whitelistedDomains");
	};

	this.addDomainTemp = function(domain) {
		this.domainsTemp[domain] = true;
		this.saveToPrefs(this.domainsTemp, "greylistedDomains");
	};

	this.removeDomain = function(domain) {
		delete this.domains[domain];
		this.saveToPrefs(this.domains, "whitelistedDomains");
	};

	this.removeDomainTemp = function(domain) {
		delete this.domainsTemp[domain];
		this.saveToPrefs(this.domainsTemp, "greylistedDomains");
	};

	this.isWhitelisted = function(domain) {
		return this.domains[domain] || this.checkForWildcard(domain, this.domains);
	};

	this.isWhitelistedTemp = function(domain) {
		return this.domainsTemp[domain] || this.checkForWildcard(domain, this.domainsTemp);
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
