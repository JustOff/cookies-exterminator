let Cc = Components.classes, Ci = Components.interfaces, Cu = Components.utils;

Cu.import("resource://gre/modules/Services.jsm");

const extName = "cookies-xtrm";
const extJSPath = "chrome://" + extName + "/content/";

const INCOMPATIBLE = {
	"trackerblock%40privacychoice.org": "TrackerBlock",
	"optout%40dubfire.net": "TACO",
	"john%40velvetcache.org": "Beef Taco"
};

// future global references of module symbols
let Prefs = null;
let Whitelist = null;
let Buttons = null;
let Log = null;
let Windows = null;

let onPrefsApply = null;
let appInfo = null;
let compat = true;

function startup(data, reason) {
	appInfo = Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULAppInfo);
	switch (appInfo.ID) {
		case "{ec8030f7-c20a-464f-9b0e-13a3a9e97384}":
			appInfo = "Firefox";
			break;
		case "{8de7fcbb-c55c-4fbe-bfc5-fc555c87dbc4}":
			appInfo = "PaleMoon";
			break;
		case "{92650c4d-4b8e-4d2a-b7eb-24ecf4f6b63a}":
			appInfo = "SeaMonkey";
			break;
	}
	
	// object as a scope for imports
	let Imports = {};

	// import own modules
	Cu.import(extJSPath + "preflib.js", Imports);
	Cu.import(extJSPath + "buttons.js", Imports);
	Cu.import(extJSPath + "whitelist.js", Imports);
	Cu.import(extJSPath + "log.js", Imports);
	Cu.import(extJSPath + "cleaner.js", Imports);
	Cu.import(extJSPath + "tabs.js", Imports);
	Cu.import(extJSPath + "windows.js", Imports);
	Cu.import(extJSPath + "notifications.js", Imports);
	Cu.import(extJSPath + "utils.js", Imports);

	let Utils = new Imports.Utils();

	// create new objects from module symbols with passed dependencies
	Prefs = new Imports.Prefs(extName, appInfo, Utils);
	let Notifications = new Imports.Notifications(extName, Prefs, Utils);
	Whitelist = new Imports.Whitelist(Prefs, Notifications);
	Buttons = new Imports.Buttons(extName, appInfo, Prefs, Whitelist, Utils);
	Log = new Imports.Log(Prefs, Utils);
	let Cleaner = new Imports.Cleaner(Prefs, Buttons, Whitelist, Log, Notifications, Utils);
	let Tabs = new Imports.Tabs(Cleaner, Buttons);
	Windows = new Imports.Windows(Tabs, Buttons, Cleaner, Prefs);

	// initialize
	Prefs.init();
	if (reason == ADDON_INSTALL) {
		Prefs.importFromPermissions();
	}

	let addons = Services.prefs.getCharPref("extensions.enabledAddons").split(",");
	for (let i in addons) {
		let addon = addons[i].split(":")[0];
		if (INCOMPATIBLE[addon]) {
			Notifications.notifyIncompat(INCOMPATIBLE[addon]);
			compat = false;
			return;
		}
	}

	if (Prefs.getValue("enableProcessing") && Prefs.getValue("whitelistedDomains") == "") {
		Prefs.setValue("enableProcessing", false);
		Prefs.save();
		Notifications.notifyDisabled();
	}

	Whitelist.init();
	Utils.setTimeout(Cleaner.getScopesFromDB.bind(this, null), 10);
	Windows.init(); // this will do the rest

	// add preferences and log windows event observers

	onPrefsEvent = {
		observe: function(aSubject, aTopic, aData) {
			if (aData == "Apply") {
				Prefs.onApply.observe(aSubject, aTopic, null);
				Whitelist.onPrefsApply();
				Buttons.onPrefsApply();
			} else if (aData == "Load") {
				Prefs.onLoad.observe(aSubject, aTopic, null);
			} else if (aData == "Export") {
				Prefs.onExport.observe(aSubject, aTopic, null);
			} else if (aData == "Import") {
				Prefs.onImport.observe(aSubject, aTopic, null);
			}
		}
	};

	Services.obs.addObserver(onPrefsEvent, "cookextermPrefsEvent", false);
	Services.obs.addObserver(Log.onEvent, "cookextermLogEvent", false);
	Services.obs.addObserver(Cleaner.handleCookieChanged, "cookie-changed", false);
	Services.obs.addObserver(Cleaner.handleDomStorageChanged, "dom-storage2-changed", false);
}

function shutdown(data, reason) {
	let logWindow = Services.wm.getMostRecentWindow("cookextermLogWindow");
	if (logWindow) {
		logWindow.close();
	}
	let prefWindow = Services.wm.getMostRecentWindow("cookextermPrefsWindow");
	if (prefWindow) {
		prefWindow.close();
	}

	if (compat) {
		if(reason == APP_SHUTDOWN) {
			Windows.clear(true);
			return;
		} else {
			Windows.clear();
		}

		// remove preferences and log windows event observers
		Services.obs.removeObserver(onPrefsEvent, "cookextermPrefsEvent");
		Services.obs.removeObserver(Log.onEvent, "cookextermLogEvent");
		Services.obs.removeObserver(Cleaner.handleCookieChanged, "cookie-changed");
		Services.obs.removeObserver(Cleaner.handleDomStorageChanged, "dom-storage2-changed");
	}

	// unload own modules
	Cu.unload(extJSPath + "preflib.js");
	Cu.unload(extJSPath + "buttons.js");
	Cu.unload(extJSPath + "whitelist.js");
	Cu.unload(extJSPath + "log.js");
	Cu.unload(extJSPath + "cleaner.js");
	Cu.unload(extJSPath + "tabs.js");
	Cu.unload(extJSPath + "windows.js");
	Cu.unload(extJSPath + "notifications.js");
	Cu.unload(extJSPath + "utils.js");
}

function install() {}

function uninstall() {}