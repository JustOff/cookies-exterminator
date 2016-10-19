let EXPORTED_SYMBOLS = ["Prefs"];

let Cc = Components.classes, Ci = Components.interfaces, Cu = Components.utils;

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/FileUtils.jsm");
Cu.import("resource://gre/modules/NetUtil.jsm");

let BACKUP_VERSION = "1.0";

let Prefs = function(extName, appInfo, Utils) {
	this.defaultPrefs = {
		enableProcessing: false,
		enableLogging: true,
		enableNotifications: true,
		keepCrushingSessionCookies: true,
		keepCrushingLocalStorage: true,
		crushingDelay: 10,
		whitelistedDomains: "",
		whitelistedDomainsTemp: "",
		toolbarButtonPlaceId: "nav-bar",
		toolbarButtonNextItemId: ""
	};

	this.currentPrefs = {};

	this.prefsBranch = Services.prefs.getBranch("extensions." + extName + ".");
	this.defaultBranch = Services.prefs.getDefaultBranch("extensions." + extName + ".");
	if (appInfo == "PaleMoon") {
		this.syncBranch = Services.prefs.getDefaultBranch("services.sync.prefs.sync.extensions." + extName + ".");
	}

	this.init = function() {
		for (let prefName in this.defaultPrefs) {
			let prefValue = this.defaultPrefs[prefName];

			switch (typeof prefValue) {
				case "string": {
					this.defaultBranch.setCharPref(prefName, prefValue);
					this.currentPrefs[prefName] = this.prefsBranch.getCharPref(prefName);
				} break;
				case "number": {
					this.defaultBranch.setIntPref(prefName, prefValue);
					this.currentPrefs[prefName] = this.prefsBranch.getIntPref(prefName);
				} break;
				case "boolean": {
					this.defaultBranch.setBoolPref(prefName, prefValue);
					this.currentPrefs[prefName] = this.prefsBranch.getBoolPref(prefName);
				} break;
			}

			if (appInfo == "PaleMoon") {
				this.syncBranch.setBoolPref(prefName, true);
			}
		}
	};

	this.save = function() {
		for (let prefName in this.currentPrefs) {
			let prefValue = this.currentPrefs[prefName];

			switch (typeof prefValue) {
				case "string": {
					this.prefsBranch.setCharPref(prefName, prefValue);
				} break;
				case "number": {
					this.prefsBranch.setIntPref(prefName, prefValue);
				} break;
				case "boolean": {
					this.prefsBranch.setBoolPref(prefName, prefValue);
				} break;
			}
		}   
	};

	this.getValue = function(prefName) {
		return this.currentPrefs[prefName];
	};

	this.setValue = function(prefName, prefValue) {
		this.currentPrefs[prefName] = prefValue;
	};

	this.feedPrefWindow = function(window, feedDefaults) {
		for (let prefName in this.defaultPrefs) {
			let prefControl = window.document.getElementById(prefName);

			if (prefControl) {
				let prefValue = feedDefaults ? this.defaultPrefs[prefName] : this.currentPrefs[prefName];

				if (prefControl.type == "number") {
					prefControl.valueNumber = prefValue;
				} else if (prefControl.tagName == "checkbox") {
					prefControl.checked = prefValue;
				} else {
					prefControl.value = prefValue;
				}
			}
		}
	};

	this.saveFromPrefWindow = function(window) {
		for (let prefName in this.currentPrefs) {
			let prefControl = window.document.getElementById(prefName);

			if (prefControl) {
				let prefValue = null;

				if (prefControl.type == "number" || prefControl.tagName == "menulist") {
					prefValue = parseInt(prefControl.value);
				} else if (prefControl.tagName == "checkbox") {
					prefValue = prefControl.checked;
				} else {
					prefValue = prefControl.value;
				}

				if (prefValue != null) {
					this.currentPrefs[prefName] = prefValue;
				}
			}
		}

		this.save();
	};

	this.exportPrefs = function() {
		let file = Utils.chooseFile("save", ["text"], "cookies-xtrm-conf.txt");
		if (file) {
			let data = {prefs: {}};
			for (let prefName in this.currentPrefs) {
				data["prefs"][prefName] = this.currentPrefs[prefName];
			}
			data["version"] = BACKUP_VERSION;
			data = Utils.toJSON(data);
			data = Utils.md5hash(data) + data;
			let ostream;
			try {
				ostream = FileUtils.openAtomicFileOutputStream(file);
			} catch (e) {
				ostream = FileUtils.openSafeFileOutputStream(file);
			}
			let converter = Cc["@mozilla.org/intl/scriptableunicodeconverter"]
				.createInstance(Ci.nsIScriptableUnicodeConverter);
			converter.charset = "UTF-8";
			let istream = converter.convertToInputStream(data);
			NetUtil.asyncCopy(istream, ostream, function(status) {
				try {
					if (!Components.isSuccessCode(status)) {
						throw Utils.translate("FileError");
					}
					Utils.alert(Utils.translate("ExportOK"));
				} catch(e) {
					Utils.alert(e);
				}
			});
		}
	};

	this.importPrefs = function(window) {
		let file = Utils.chooseFile("open", ["text"], "cookies-xtrm-conf.txt");
		if (file) {
			let Prefs = this;
			NetUtil.asyncFetch(file, function(istream, status) {
				try {
					if (!Components.isSuccessCode(status)) {
						throw Utils.translate("FileError");
					}
					let data = NetUtil.readInputStreamToString(istream, istream.available(), {charset:"UTF-8"});
					let datahash = data.slice(0,32);
					data = data.slice(32);
					if (datahash != Utils.md5hash(data)) {
						throw "File is corrupted!";
					}
					data = Utils.fromJSON(data);
					if (data["version"] != BACKUP_VERSION) {
						throw "Incompatible backup version!";
					}
					for (let prefName in Prefs.currentPrefs) {
						let prefControl = window.document.getElementById(prefName);
						if (prefControl) {
							let prefValue = data["prefs"][prefName];
							if (prefControl.type == "number") {
								prefControl.valueNumber = prefValue;
							} else if (prefControl.tagName == "checkbox") {
								prefControl.checked = prefValue;
							} else {
								prefControl.value = prefValue;
							}
						}
					}
					Utils.updateDomainsListbox(window, "domainsListbox", "whitelistedDomains");
					Utils.updateDomainsListbox(window, "domainsListboxTemp", "whitelistedDomainsTemp");
					Utils.alert(Utils.translate("ImportOK"));
				} catch(e) {
					Utils.alert(e);
				}
			});
		}
	};

	this.onLoad = {
		Prefs: this,
		feedPrefWindow: this.feedPrefWindow,
		observe: function(aSubject, aTopic, aData) {
			this.feedPrefWindow.call(this.Prefs, aSubject);
		}
	};

	this.onExport = {
		Prefs: this,
		exportPrefs: this.exportPrefs,
		observe: function(aSubject, aTopic, aData) {
			this.exportPrefs.call(this.Prefs, null);
		}
	};

	this.onImport = {
		Prefs: this,
		importPrefs: this.importPrefs,
		observe: function(aSubject, aTopic, aData) {
			this.importPrefs.call(this.Prefs, aSubject);
		}
	};

	this.onApply = {
		Prefs: this,
		saveFromPrefWindow: this.saveFromPrefWindow,
		observe: function(aSubject, aTopic, aData) {
			this.saveFromPrefWindow.call(this.Prefs, aSubject);
		}
	};

	this.importFromPermissions = function() {
		if (this.getValue("whitelistedDomains") != "" || this.getValue("whitelistedDomainsTemp") != "") {
			return;
		}
		let white = [], grey = [];
		let permissions = Services.perms.enumerator;
		while (permissions.hasMoreElements()) {
			let perm = permissions.getNext().QueryInterface(Ci.nsIPermission);
            if (perm.type == "cookie") {
				let host = perm.principal ? perm.principal.URI.host : perm.host;
				if (perm.capability == 1) {
					if (white.indexOf(host) == -1) {
						white.push(host);
					}
				} else if (perm.capability == 8) {
					if (grey.indexOf(host) == -1) {
						grey.push(host);
					}
				}
            }
        }
		if (white.length > 0) {
			this.setValue("whitelistedDomains", white.join(";"));
		}
		if (grey.length > 0) {
			this.setValue("whitelistedDomainsTemp", grey.join(";"));
		}
		if (white.length > 0 || grey.length > 0) {
			this.save();
		}
	};
};
