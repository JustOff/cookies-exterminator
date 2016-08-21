let EXPORTED_SYMBOLS = ["Crusher"];

Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://gre/modules/Timer.jsm");

let Crusher = function(Prefs, Buttons, Whitelist, Log, Notifications) {
    this.prepare = function(domain) {
        if (!Prefs.getValue("suspendCrushing")) {
            let timestamp = Date.now();
            
            setTimeout(this.execute.bind(this, domain, timestamp),
                       Prefs.getValue("crushingDelay") * 1000);
        }
    };
    
    this.execute = function(domain, timestamp) {
        let crushedSomething = false;
        let crushedCookiesDomains = {};
        
        let cookiesEnumerator = Prefs.getValue("keepCrushingThirdPartyCookies") ?
                                Services.cookies.enumerator :
                                Services.cookies.getCookiesFromHost(domain);
                
        while (cookiesEnumerator.hasMoreElements()) {
            let cookie = cookiesEnumerator.getNext().QueryInterface(Components.interfaces.nsICookie2);

            if (this.mayBeCrushed(cookie, timestamp)) {
                Services.cookies.remove(cookie.host, cookie.name, cookie.path, false);
                
                crushedSomething = true;
                crushedCookiesDomains[cookie.rawHost] = true;
            }
        }
        
        if (crushedSomething) {
            let crushedCookiesDomainsString = "";
            
            for (let domain in crushedCookiesDomains) {
                crushedCookiesDomainsString += domain + ", ";
            }
            
            crushedCookiesDomainsString = crushedCookiesDomainsString.slice(0, -2);
            
            Buttons.notify(crushedCookiesDomainsString);
            Notifications.notify(crushedCookiesDomainsString);
            Log.log(crushedCookiesDomainsString); 
        } else {
            Buttons.notify();
        }
    };
    
    this.mayBeCrushed = function(cookie, timestamp) {
        let cookieLastAccessTimestamp = cookie.lastAccessed / 1000; // cut redundant 000
        
        if (cookieLastAccessTimestamp > timestamp ||
            Whitelist.isWhitelisted(cookie.rawHost) ||
            (!Prefs.getValue("keepCrushingSessionCookies") && cookie.isSession)) {
            return false;
        }
        
        let windowsEnumerator = Services.wm.getEnumerator("navigator:browser");
        
        while (windowsEnumerator.hasMoreElements()) {
            let window = windowsEnumerator.getNext().QueryInterface(Components.interfaces.nsIDOMWindow);
            let tabBrowser = window.gBrowser;
            
            for (let browser of tabBrowser.browsers) {
                let domain = browser.contentDocument.domain;
                
                if (domain) {
                    let rawHost = domain.substr(0, 4) == "www." ?
                                  domain.substr(4, domain.length) :
                                  domain;
                                  
                    if (cookie.rawHost == domain || cookie.rawHost == rawHost) {
                        return false;
                    }
                    
                    if (Prefs.getValue("keepCrushingLocalStorage")) {
                        let storage = browser.contentWindow.localStorage;
                        
                        if (storage) {
                            storage.clear();
                        }
                    }
                }
            }
        }
        
        return true;
    };
};