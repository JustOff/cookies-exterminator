Components.utils.import("resource://gre/modules/Services.jsm");

const extName = "crush-those-cookies";
const extJSPath = "chrome://" + extName + "/content/js/";

// future global references of module symbols
let Prefs = null;
let Whitelist = null;
let Buttons = null;
let Log = null;
let Windows = null;

let onPrefsApply = null;

function startup(data, reason) {
    // object as a scope for imports
    let Imports = {};
    
    // import own modules
    Components.utils.import(extJSPath + "prefs.js", Imports);
    Components.utils.import(extJSPath + "buttons.js", Imports);
    Components.utils.import(extJSPath + "whitelist.js", Imports);
    Components.utils.import(extJSPath + "log.js", Imports);
    Components.utils.import(extJSPath + "crusher.js", Imports);
    Components.utils.import(extJSPath + "tabs.js", Imports);
    Components.utils.import(extJSPath + "windows.js", Imports);
    Components.utils.import(extJSPath + "notifications.js", Imports);
    Components.utils.import(extJSPath + "utils.js", Imports);
    
    let Utils = new Imports.Utils();
    
    // create new objects from module symbols with passed dependencies
    Prefs = new Imports.Prefs(extName);
    Whitelist = new Imports.Whitelist(Prefs);
    Buttons = new Imports.Buttons(extName, Prefs, Whitelist, Utils);
    Log = new Imports.Log(Prefs);
    
    let Notifications = new Imports.Notifications(extName, Prefs);
    let Crusher = new Imports.Crusher(Prefs, Buttons, Whitelist, Log, Notifications, Utils);
    
    Tabs = new Imports.Tabs(Crusher, Buttons);
    Windows = new Imports.Windows(Tabs, Buttons, Crusher, Prefs);
    
    // initialize
    Prefs.init();
    Whitelist.init();
    Windows.init(reason == ADDON_INSTALL); // this will do the rest
    
    // add preferences and log windows event observers
    Services.obs.addObserver(Prefs.onOpen, "ctcPrefsOpen", false);
    Services.obs.addObserver(Prefs.onReset, "ctcPrefsReset", false);
    
    onPrefsApply = {
        observe: function(aSubject, aTopic, aData) {
            Prefs.onApply.observe(aSubject, aTopic, aData);
            Whitelist.onPrefsApply();
            Buttons.onPrefsApply();
        }
    };
    
    Services.obs.addObserver(onPrefsApply, "ctcPrefsApply", false);
    Services.obs.addObserver(Log.onOpen, "ctcLogOpen", false);
    Services.obs.addObserver(Log.onClear, "ctcLogClear", false);
}

function shutdown(data, reason) {
    // remove preferences and log windows event observers
    Services.obs.removeObserver(Prefs.onOpen, "ctcPrefsOpen");
    Services.obs.removeObserver(Prefs.onReset, "ctcPrefsReset");
    Services.obs.removeObserver(onPrefsApply, "ctcPrefsApply");
    Services.obs.removeObserver(Log.onOpen, "ctcLogOpen");
    Services.obs.removeObserver(Log.onClear, "ctcLogClear");
    
    // cleanup
    Windows.clear();
    
    // unload own modules
    Components.utils.unload(extJSPath + "prefs.js");
    Components.utils.unload(extJSPath + "buttons.js");
    Components.utils.unload(extJSPath + "whitelist.js");
    Components.utils.unload(extJSPath + "log.js");
    Components.utils.unload(extJSPath + "crusher.js");
    Components.utils.unload(extJSPath + "tabs.js");
    Components.utils.unload(extJSPath + "windows.js");
    Components.utils.unload(extJSPath + "notifications.js");
    Components.utils.unload(extJSPath + "utils.js");
}

function install(data, reason) {} // dummy

function uninstall(data, reason) {} // dummy