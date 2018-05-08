let EXPORTED_SYMBOLS = ["Utils"];

let Cc = Components.classes, Ci = Components.interfaces, Cu = Components.utils;

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/Timer.jsm");

let eTLDService = Cc["@mozilla.org/network/effective-tld-service;1"].getService(Ci.nsIEffectiveTLDService);
let IDNService = Cc["@mozilla.org/network/idn-service;1"].getService(Ci.nsIIDNService);

let Utils = function() {
	this.getHostFromTab = function(tab, window) {
		let URI = this.getURIFromTab(tab, window);
		return URI ? URI.host : null;
	};

	this.getURIFromTab = function(tab, window) {
		if (window && window.privateTab && window.privateTab.isTabPrivate(tab)) {
			return null;
		}
		try {
			return (tab.linkedBrowser.currentURI.scheme == "http" || tab.linkedBrowser.currentURI.scheme == "https") ?
					tab.linkedBrowser.currentURI : null;
		} catch(e) {
			return null;
		}
	};

	this.getBaseDomain = function(fullDomain) {
		try {
			return eTLDService.getBaseDomainFromHost(fullDomain);
		} catch(e) {
			return this.UTF8toACE(fullDomain);
		}
	};

	this.ACEtoUTF8 = function(domain) {
		return IDNService.convertACEtoUTF8(domain);
	};

	this.UTF8toACE = function(domain) {
		return IDNService.convertUTF8toACE(domain);
	};

	this.setTimeout = function(method, delayInSeconds) {
		return setTimeout(function() {
			if (Services) {
				method();
			}
		}, delayInSeconds * 1000);
	};

	this.clearTimeout = function(timer) {
		clearTimeout(timer);
	};

	this.alert = function(message) {
		let prompts = Cc["@mozilla.org/embedcomp/prompt-service;1"].getService(Ci.nsIPromptService);
		let mrw = Services.wm.getMostRecentWindow("navigator:browser");
		return prompts.alert(mrw, this.translate("Name"), message);
	};

	this.translate = function(key) {
		if (!this.bundle) {
			this.bundle = Cc["@mozilla.org/intl/stringbundle;1"].getService(Ci.nsIStringBundleService)
				.createBundle("chrome://cookies-xtrm/locale/cookies-xtrm.properties" + "?" + Math.random());
		}
		return this.bundle.GetStringFromName(key);
	};

	this.chooseFile = function(mode, filters, name) {
		let fp = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
		let mrw = Services.wm.getMostRecentWindow("navigator:browser");
		fp.init(mrw, null, mode == "save" ? fp.modeSave :
			mode == "folder" ? fp.modeGetFolder : fp.modeOpen);
		for (let i in filters) {
			switch (filters[i]) {
				case "images":
					fp.appendFilters(fp.filterImages);
					break;
				case "html":
					fp.appendFilters(fp.filterHTML);
					break;
				case "text":
					fp.appendFilters(fp.filterText);
					break;
			}
		}
		fp.defaultString = name;

		let result = fp.show();
		if (result == fp.returnOK || result == fp.returnReplace) {
			return fp.file;
		}
	};

	this.toJSON = function(object) {
		return JSON.stringify(object);
	};
	
	this.fromJSON = function(str) {
		if (!str || /^ *$/.test(str))
			return {};
		try {
			return JSON.parse(str);
		} catch (e) {
			str = str.replace(/\(|\)/g, '').replace(/(\w+):/g, '"$1":')
			try {
				return JSON.parse(str);
			} catch (e) {}
			return {};
		}
	};

	this.toHexString = function(charCode) {
		return ("0" + charCode.toString(16)).slice(-2);
	};

	this.md5hash = function(data) {
		let converter = Cc["@mozilla.org/intl/scriptableunicodeconverter"]
			.createInstance(Ci.nsIScriptableUnicodeConverter);
		converter.charset = "UTF-8";
		let result = {};
		let utf8data = converter.convertToByteArray(data, result);
		let ch = Cc["@mozilla.org/security/hash;1"].createInstance(Ci.nsICryptoHash);
		ch.init(ch.MD5);
		ch.update(utf8data, utf8data.length);
		let hash = ch.finish(false);
		let hexhash = [...hash].map(char => this.toHexString(char.charCodeAt(0))).join("");
		return hexhash;
	};

	this.updateDomainsListbox = function(window, listbox, domains) {
		let domainsListbox = window.document.getElementById(listbox);
		let rows = domainsListbox.getRowCount();

		for (let i = 0; i < rows; i++) {
			domainsListbox.removeItemAt(0);
		}

		let whitelistedDomains = window.document.getElementById(domains);

		let sortedDomains = [];
		if (whitelistedDomains.value != "") {
			let separatedDomains = whitelistedDomains.value.split(';');
			
			for (let domain of separatedDomains) {
				sortedDomains.push(this.ACEtoUTF8(domain));
			}

			sortedDomains.sort();

			for (let domain of sortedDomains) {
				domainsListbox.appendItem(domain, domain);
			}
		}
		return sortedDomains;
	};
};
