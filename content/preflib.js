let EXPORTED_SYMBOLS = ["Prefs"];

Components.utils.import("resource://gre/modules/Services.jsm");

let Prefs = function(extName, appInfo) {
	this.defaultPrefs = {
		suspendCrushing: false,
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

	this.onOpen = {
		Prefs: this,
		feedPrefWindow: this.feedPrefWindow,
		observe: function(aSubject, aTopic, aData) {
			this.feedPrefWindow.call(this.Prefs, aSubject);
		}
	};

	this.onApply = {
		Prefs: this,
		saveFromPrefWindow: this.saveFromPrefWindow,
		observe: function(aSubject, aTopic, aData) {
			this.saveFromPrefWindow.call(this.Prefs, aSubject);
		}
	};
};
