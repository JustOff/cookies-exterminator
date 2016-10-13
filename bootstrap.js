let Cc = Components.classes, Ci = Components.interfaces, Cu = Components.utils;

Cu.import("resource://gre/modules/Services.jsm");

const extName = "cookies-xtrm";
const extJSPath = "chrome://" + extName + "/content/";

// future global references of module symbols
let Prefs = null;
let Whitelist = null;
let Buttons = null;
let Log = null;
let Windows = null;

let onPrefsApply = null;
let appInfo = null;

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
	Cu.import(extJSPath + "crusher.js", Imports);
	Cu.import(extJSPath + "tabs.js", Imports);
	Cu.import(extJSPath + "windows.js", Imports);
	Cu.import(extJSPath + "notifications.js", Imports);
	Cu.import(extJSPath + "utils.js", Imports);

	let Utils = new Imports.Utils();

	// create new objects from module symbols with passed dependencies
	Prefs = new Imports.Prefs(extName, appInfo);
	Whitelist = new Imports.Whitelist(Prefs);
	Buttons = new Imports.Buttons(extName, appInfo, Prefs, Whitelist, Utils);
	Log = new Imports.Log(Prefs);
	let Notifications = new Imports.Notifications(extName, Prefs, Utils);
	Crusher = new Imports.Crusher(Prefs, Buttons, Whitelist, Log, Notifications, Utils);
	Tabs = new Imports.Tabs(Crusher, Buttons);
	Windows = new Imports.Windows(Tabs, Buttons, Crusher, Prefs);

	// initialize
	Prefs.init();
	if (reason == ADDON_INSTALL) {
		Prefs.importFromPermissions();
	}
	Whitelist.init();
	Windows.init(); // this will do the rest

	// add preferences and log windows event observers
	Services.obs.addObserver(Prefs.onOpen, "cookextermPrefsLoad", false);

	onPrefsApply = {
		observe: function(aSubject, aTopic, aData) {
			Prefs.onApply.observe(aSubject, aTopic, aData);
			Whitelist.onPrefsApply();
			Buttons.onPrefsApply();
		}
	};

	Services.obs.addObserver(onPrefsApply, "cookextermPrefsApply", false);
	Services.obs.addObserver(Log.onOpen, "cookextermLogOpen", false);
	Services.obs.addObserver(Log.onClear, "cookextermLogClear", false);
	Services.obs.addObserver(Crusher.handleCookieChanged, "cookie-changed", false);
	Services.obs.addObserver(Crusher.handleDomStorageChanged, "dom-storage2-changed", false);
}

function shutdown(data, reason) {
	// cleanup
	if(reason == APP_SHUTDOWN) {
		Windows.clear(true);
		return;
	} else {
		Windows.clear();
	}

	// remove preferences and log windows event observers
	Services.obs.removeObserver(Prefs.onOpen, "cookextermPrefsLoad");
	Services.obs.removeObserver(onPrefsApply, "cookextermPrefsApply");
	Services.obs.removeObserver(Log.onOpen, "cookextermLogOpen");
	Services.obs.removeObserver(Log.onClear, "cookextermLogClear");
	Services.obs.removeObserver(Crusher.handleCookieChanged, "cookie-changed");
	Services.obs.removeObserver(Crusher.handleDomStorageChanged, "dom-storage2-changed");

	// unload own modules
	Cu.unload(extJSPath + "preflib.js");
	Cu.unload(extJSPath + "buttons.js");
	Cu.unload(extJSPath + "whitelist.js");
	Cu.unload(extJSPath + "log.js");
	Cu.unload(extJSPath + "crusher.js");
	Cu.unload(extJSPath + "tabs.js");
	Cu.unload(extJSPath + "windows.js");
	Cu.unload(extJSPath + "notifications.js");
	Cu.unload(extJSPath + "utils.js");
}

function install() {}

function uninstall() {}