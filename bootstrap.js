let Cc = Components.classes, Ci = Components.interfaces, Cu = Components.utils;

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/PrivateBrowsingUtils.jsm");

const extName = "cookies-xtrm";
const extJSPath = "chrome://" + extName + "/content/";
const buttonCSS = "chrome://" + extName + "/skin/button.css";

const INCOMPATIBLE = {
	"trackerblock%40privacychoice.org": "TrackerBlock",
	"optout%40dubfire.net": "TACO",
	"john%40velvetcache.org": "Beef Taco"
};

let styleSheetService = Cc["@mozilla.org/content/style-sheet-service;1"].getService(Ci.nsIStyleSheetService);
let styleSheetURI = Services.io.newURI(buttonCSS, null, null);
let Prefs, Log, Buttons, Cleaner, Tabs, gWindowListener, onPrefsEvent, appInfo;
let compat = true;

function browserWindowObserver(handlers) {
	this.handlers = handlers;
}

browserWindowObserver.prototype = {
	observe: function(aSubject, aTopic, aData) {
		if (aTopic == "domwindowopened") {
			aSubject.QueryInterface(Ci.nsIDOMWindow).addEventListener("load", this, false);
		} else if (aTopic == "domwindowclosed") {
			if (aSubject.document.documentElement.getAttribute("windowtype") == "navigator:browser") {
				this.handlers.onShutdown(aSubject);
			}
		}
	},
	handleEvent: function(aEvent) {
		let aWindow = aEvent.currentTarget;
		aWindow.removeEventListener(aEvent.type, this, false);

		if (aWindow.document.documentElement.getAttribute("windowtype") == "navigator:browser") {
			this.handlers.onStartup(aWindow);
		}
	}
};

function browserWindowStartup(aWindow) {
	if (!PrivateBrowsingUtils.isWindowPrivate(aWindow)) {
		Tabs.init(aWindow);
		Buttons.init(aWindow);
	}
}

function browserWindowShutdown(aWindow) {
	if (!PrivateBrowsingUtils.isWindowPrivate(aWindow)) {
		Tabs.clear(aWindow);
		Buttons.clear(aWindow);
		let windowsEnumerator = Services.wm.getEnumerator("navigator:browser");
		if (windowsEnumerator.hasMoreElements()) {
			Cleaner.prepare();
		}
	}
}

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

	if (!styleSheetService.sheetRegistered(styleSheetURI, styleSheetService.USER_SHEET)) {
		styleSheetService.loadAndRegisterSheet(styleSheetURI, styleSheetService.USER_SHEET);
	}

	let Imports = {};
	Cu.import(extJSPath + "preflib.js", Imports);
	Cu.import(extJSPath + "buttons.js", Imports);
	Cu.import(extJSPath + "whitelist.js", Imports);
	Cu.import(extJSPath + "log.js", Imports);
	Cu.import(extJSPath + "cleaner.js", Imports);
	Cu.import(extJSPath + "tabs.js", Imports);
	Cu.import(extJSPath + "notifications.js", Imports);
	Cu.import(extJSPath + "utils.js", Imports);

	let Utils = new Imports.Utils();
	Prefs = new Imports.Prefs(extName, appInfo, Utils);
	let Notifications = new Imports.Notifications(extName, Prefs, Utils);
	let Whitelist = new Imports.Whitelist(Prefs, Notifications);
	Buttons = new Imports.Buttons(extName, appInfo, Prefs, Whitelist, Utils);
	Log = new Imports.Log(Prefs, Utils);
	Cleaner = new Imports.Cleaner(Prefs, Buttons, Whitelist, Log, Notifications, Utils);
	Tabs = new Imports.Tabs(Cleaner, Buttons, Utils);

	Prefs.init();
	if (reason == ADDON_INSTALL) {
		Prefs.importFromPermissions();
	}

	try { // See https://bugzilla.mozilla.org/show_bug.cgi?id=1358846
		let addons = Services.prefs.getCharPref("extensions.enabledAddons").split(",");
		for (let i in addons) {
			let addon = addons[i].split(":")[0];
			if (INCOMPATIBLE[addon]) {
				Notifications.notifyIncompat(INCOMPATIBLE[addon]);
				compat = false;
				return;
			}
		}
	} catch(e) {}

	if (Prefs.getValue("enableProcessing") && Prefs.getValue("whitelistedDomains") == "") {
		Prefs.setValue("enableProcessing", false);
		Prefs.save();
		Notifications.notifyDisabled();
	}

	Whitelist.init();
	Utils.setTimeout(Cleaner.getScopesFromDB.bind(this, null), 10);
	Utils.setTimeout(Cleaner.preloadIndexedDB.bind(this, null), 20);

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

	gWindowListener = new browserWindowObserver({
		onStartup: browserWindowStartup,
		onShutdown: browserWindowShutdown
	});
	Services.ww.registerNotification(gWindowListener);

	let winenu = Services.wm.getEnumerator("navigator:browser");
	while (winenu.hasMoreElements()) {
		browserWindowStartup(winenu.getNext());
	}
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
			Cleaner.prepare("Cleanup");
			return;
		}

		Services.ww.unregisterNotification(gWindowListener);

		let winenu = Services.wm.getEnumerator("navigator:browser");
		while (winenu.hasMoreElements()) {
			browserWindowShutdown(winenu.getNext());
		}

		Services.obs.removeObserver(onPrefsEvent, "cookextermPrefsEvent");
		Services.obs.removeObserver(Log.onEvent, "cookextermLogEvent");
		Services.obs.removeObserver(Cleaner.handleCookieChanged, "cookie-changed");
		Services.obs.removeObserver(Cleaner.handleDomStorageChanged, "dom-storage2-changed");
	}

	Cu.unload(extJSPath + "preflib.js");
	Cu.unload(extJSPath + "buttons.js");
	Cu.unload(extJSPath + "whitelist.js");
	Cu.unload(extJSPath + "log.js");
	Cu.unload(extJSPath + "cleaner.js");
	Cu.unload(extJSPath + "tabs.js");
	Cu.unload(extJSPath + "notifications.js");
	Cu.unload(extJSPath + "utils.js");

	if (styleSheetService.sheetRegistered(styleSheetURI, styleSheetService.USER_SHEET)) {
		styleSheetService.unregisterSheet(styleSheetURI, styleSheetService.USER_SHEET);
	}
}

function install() {}

function uninstall() {}
