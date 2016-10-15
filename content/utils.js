let EXPORTED_SYMBOLS = ["Utils"];

let Cc = Components.classes, Ci = Components.interfaces, Cu = Components.utils;

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/Timer.jsm");

let eTLDService = Cc["@mozilla.org/network/effective-tld-service;1"].getService(Ci.nsIEffectiveTLDService);
let IDNService = Cc["@mozilla.org/network/idn-service;1"].getService(Ci.nsIIDNService);

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

	this.alert = function(message) {
		let prompts = Cc["@mozilla.org/embedcomp/prompt-service;1"].getService(Ci.nsIPromptService);
		let mrw = Services.wm.getMostRecentWindow("navigator:browser");
		return prompts.alert(mrw, "Cookies Exterminator", message);
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
			} catch (e) {
				Cu.reportError("Error parsing " + str + ": " + e);
			}
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

		if (whitelistedDomains.value != "") {
			let separatedDomains = whitelistedDomains.value.split(';');

			for (let domain of separatedDomains) {
				domain = this.ACEtoUTF8(domain);
				domainsListbox.appendItem(domain, domain);
			}
		}

		this.sortDomainsListbox(domainsListbox);
	};

	this.sortDomainsListbox = function(domainsListbox) {
		let rows = domainsListbox.getRowCount();

		for (let i = 0; i < rows; i++) {
			for (let j = rows - 1; j > i; j--) {
				let domain = domainsListbox.getItemAtIndex(i);
				let anotherDomain = domainsListbox.getItemAtIndex(j);

				if (anotherDomain.value < domain.value) {
					domain.value = anotherDomain.value;
					anotherDomain.value = domain.label;
					domain.label = domain.value;
					anotherDomain.label = anotherDomain.value;
				}
			}
		}
	};
};
