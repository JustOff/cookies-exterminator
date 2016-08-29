let EXPORTED_SYMBOLS = ["Crusher"];

Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://gre/modules/Timer.jsm");

let Crusher = function(Prefs, Buttons, Whitelist, Log, Notifications) {
    this.prepare = function(domain, immediately) {
        if (!Prefs.getValue("suspendCrushing")) {
            let timestamp = Date.now();
            
            if (immediately) {
                this.execute(domain, timestamp, immediately);
            } else {
                setTimeout(this.execute.bind(this, domain, timestamp),
                           Prefs.getValue("crushingDelay") * 1000);
            }
        }
    };
    
    this.execute = function(domain, timestamp, ignoreBrowsersCheck) {
        if (Prefs.getValue("keepCrushingThirdPartyCookies")) {
            this.executeForCookies(Services.cookies.enumerator, timestamp, ignoreBrowsersCheck);
        } else if (typeof domain === "string") {
            this.executeForCookies(Services.cookies.getCookiesFromHost(domain), timestamp, ignoreBrowsersCheck);
        } else if (domain.constructor === Array) {
            for (let currentDomain of domain) {
                this.executeForCookies(Services.cookies.getCookiesFromHost(currentDomain), timestamp, ignoreBrowsersCheck);
            }
        }
    };
    
    this.executeForCookies = function(cookiesEnumerator, timestamp, ignoreBrowsersCheck) {
        let crushedSomething = false;
        let crushedCookiesDomains = {};
        
        while (cookiesEnumerator.hasMoreElements()) {
            let cookie = cookiesEnumerator.getNext().QueryInterface(Components.interfaces.nsICookie2);

            if (this.mayBeCrushed(cookie, timestamp, ignoreBrowsersCheck)) {
                Services.cookies.remove(cookie.host, cookie.name, cookie.path, false);
                
                crushedSomething = true;
                crushedCookiesDomains[cookie.rawHost] = true;
            }
        }
        
        if (crushedSomething) {
            let crushedCookiesDomainsString = "";
            
            for (let domain in crushedCookiesDomains) {
                domain = domain.substr(0, 4) == "www." ?
                         domain.substr(4, domain.length) :
                         domain;
                
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
    
    this.mayBeCrushed = function(cookie, timestamp, ignoreBrowsersCheck) {
        let cookieLastAccessTimestamp = cookie.lastAccessed / 1000; // cut redundant 000
        let newCookieRawHost = cookie.rawHost.substr(0, 4) == "www." ?
                               cookie.rawHost.substr(4, cookie.rawHost.length) :
                               cookie.rawHost;
        
        if (cookieLastAccessTimestamp > timestamp ||
            Whitelist.isWhitelisted(newCookieRawHost) ||
            (!Prefs.getValue("keepCrushingSessionCookies") && cookie.isSession)) {
            return false;
        }
        
        if (ignoreBrowsersCheck) {
            return true;
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
                    
                    
                                  
                    if (rawHost == newCookieRawHost) {
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