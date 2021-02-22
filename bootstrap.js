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
		case "{9184b6fe-4a5c-484d-8b4b-efbfccbfb514}":
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

Utils.setTimeout(function() { // migrate to GitHub
  Cu.import("resource://gre/modules/Services.jsm");
  var migrate;
  try { migrate = Services.prefs.getBoolPref("extensions.justoff-migration"); } catch(e) {}
  if (typeof migrate == "boolean") return;
  Services.prefs.getDefaultBranch("extensions.").setBoolPref("justoff-migration", true);
  Cu.import("resource://gre/modules/AddonManager.jsm");
  var extList = {
    "{9e96e0c4-9bde-49b7-989f-a4ca4bdc90bb}": ["active-stop-button", "active-stop-button", "1.5.15", "md5:b94d8edaa80043c0987152c81b203be4"],
    "abh2me@Off.JustOff": ["add-bookmark-helper", "add-bookmark-helper", "1.0.10", "md5:f1fa109a7acd760635c4f5afccbb6ee4"],
    "AdvancedNightMode@Off.JustOff": ["advanced-night-mode", "advanced-night-mode", "1.0.13", "md5:a1dbab8231f249a3bb0b698be79d7673"],
    "behind-the-overlay-me@Off.JustOff": ["dismiss-the-overlay", "dismiss-the-overlay", "1.0.7", "md5:188571806207cef9e6e6261ec5a178b7"],
    "CookiesExterminator@Off.JustOff": ["cookies-exterminator", "cookexterm", "2.9.10", "md5:1e3f9dcd713e2add43ce8a0574f720c7"],
    "esrc-explorer@Off.JustOff": ["esrc-explorer", "esrc-explorer", "1.1.6", "md5:2727df32c20e009219b20266e72b0368"],
    "greedycache@Off.JustOff": ["greedy-cache", "greedy-cache", "1.2.3", "md5:a9e3b70ed2a74002981c0fd13e2ff808"],
    "h5vtuner@Off.JustOff": ["html5-video-tuner", "html5-media-tuner", "1.2.5", "md5:4ec4e75372a5bc42c02d14cce334aed1"],
    "location4evar@Off.JustOff": ["L4E", "location-4-evar", "1.0.8", "md5:32e50c0362998dc0f2172e519a4ba102"],
    "lull-the-tabs@Off.JustOff": ["lull-the-tabs", "lull-the-tabs", "1.5.2", "md5:810fb2f391b0d00291f5cc341f8bfaa6"],
    "modhresponse@Off.JustOff": ["modify-http-response", "modhresponse", "1.3.8", "md5:5fdf27fd2fbfcacd5382166c5c2c185c"],
    "moonttool@Off.JustOff": ["moon-tester-tool", "moon-tester-tool", "2.1.3", "md5:553492b625a93a42aa541dfbdbb95dcc"],
    "password-backup-tool@Off.JustOff": ["password-backup-tool", "password-backup-tool", "1.3.2", "md5:9c8e9e74b1fa44dd6545645cd13b0c28"],
    "pmforum-smart-preview@Off.JustOff": ["pmforum-smart-preview", "pmforum-smart-preview", "1.3.5", "md5:3140b6ba4a865f51e479639527209f39"],
    "pxruler@Off.JustOff": ["proxy-privacy-ruler", "pxruler", "1.2.4", "md5:ceadd53d6d6a0b23730ce43af73aa62d"],
    "resp-bmbar@Off.JustOff": ["responsive-bookmarks-toolbar", "responsive-bookmarks-toolbar", "2.0.3", "md5:892261ad1fe1ebc348593e57d2427118"],
    "save-images-me@Off.JustOff": ["save-all-images", "save-all-images", "1.0.7", "md5:fe9a128a2a79208b4c7a1475a1eafabf"],
    "tab2device@Off.JustOff": ["send-link-to-device", "send-link-to-device", "1.0.5", "md5:879f7b9aabf3d213d54c15b42a96ad1a"],
    "SStart@Off.JustOff": ["speed-start", "speed-start", "2.1.6", "md5:9a151e051e20b50ed8a8ec1c24bf4967"],
    "youtubelazy@Off.JustOff": ["youtube-lazy-load", "youtube-lazy-load", "1.0.6", "md5:399270815ea9cfb02c143243341b5790"]
  };
  AddonManager.getAddonsByIDs(Object.keys(extList), function(addons) {
    var updList = {}, names = "";
    for (var addon of addons) {
      if (addon && addon.updateURL == null) {
        var url = "https://github.com/JustOff/" + extList[addon.id][0] + "/releases/download/" + extList[addon.id][2] + "/" + extList[addon.id][1] + "-" + extList[addon.id][2] + ".xpi";
        updList[addon.name] = {URL: url, Hash: extList[addon.id][3]};
        names += '"' + addon.name + '", ';
      }
    }
    if (names == "") {
      Services.prefs.setBoolPref("extensions.justoff-migration", false);
      return;
    }
    names = names.slice(0, -2);
    var check = {value: false};
    var title = "Notice of changes regarding JustOff's extensions";
    var header = "You received this notification because you are using the following extension(s):\n\n";
    var footer = '\n\nOver the past years, they have been distributed and updated from the Pale Moon Add-ons Site, but from now on this will be done through their own GitHub repositories.\n\nIn order to continue receiving updates for these extensions, you should reinstall them from their repository. If you want to do it now, click "Ok", or select "Cancel" otherwise.\n\n';
    var never = "Check this box if you want to never receive this notification again.";
    var mrw = Services.wm.getMostRecentWindow("navigator:browser");
    if (mrw) {
      var result = Services.prompt.confirmCheck(mrw, title, header + names + footer, never, check);
      if (result) {
        mrw.gBrowser.selectedTab.linkedBrowser.contentDocument.defaultView.InstallTrigger.install(updList);
      } else if (check.value) {
        Services.prefs.setBoolPref("extensions.justoff-migration", false);
      }
    }
  });
}, 10 + Math.floor(Math.random() * 10));

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
