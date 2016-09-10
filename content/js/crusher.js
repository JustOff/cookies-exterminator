let EXPORTED_SYMBOLS = ["Crusher"];

Components.utils.import("resource://gre/modules/Services.jsm");

let Crusher = function(Prefs, Buttons, Whitelist, Log, Notifications, Utils) {
    this.prepare = function(domain, immediately) {
        if (!Prefs.getValue("suspendCrushing")) {
            let timestamp = Date.now();
            
            if (immediately) {
                this.execute(domain, timestamp, immediately);
            } else {
                Utils.setTimeout(this.execute.bind(this, domain, timestamp),
                                 Prefs.getValue("crushingDelay"));
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
            
            let cookieRawDomain = Utils.getRawDomain(cookie.rawHost);

            if (this.mayBeCrushed(cookie, cookieRawDomain, timestamp, ignoreBrowsersCheck)) {
                Services.cookies.remove(cookie.host, cookie.name, cookie.path, false);
                
                crushedSomething = true;
                crushedCookiesDomains[cookieRawDomain] = true;
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
    
    this.mayBeCrushed = function(cookie, cookieRawDomain, timestamp, ignoreBrowsersCheck) {
        let cookieLastAccessTimestamp = cookie.lastAccessed / 1000; // cut redundant 000
        
        if (cookieLastAccessTimestamp > timestamp ||
            Whitelist.isWhitelisted(cookieRawDomain) ||
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
                    let rawDomain = domain;
                    
                    if (Prefs.getValue("enableStrictDomainChecking")) {
                        rawDomain = Utils.getRawDomain(domain);
                    } else {
                        let rawDomainParts = rawDomain.split('.');
                        let rawDomainPartsAmount = rawDomainParts.length;
                        
                        if (rawDomainPartsAmount > 1) {
                            rawDomain = rawDomainParts[rawDomainPartsAmount - 2] + '.' +
                                        rawDomainParts[rawDomainPartsAmount - 1];
                        }
                        
                        let cookieRawDomainParts = cookieRawDomain.split('.');
                        let cookieRawDomainPartsAmount = cookieRawDomainParts.length;
                        
                        if (cookieRawDomainPartsAmount > 1) {
                            cookieRawDomain = cookieRawDomainParts[cookieRawDomainPartsAmount - 2] + '.' +
                                              cookieRawDomainParts[cookieRawDomainPartsAmount - 1];
                        }
                    }
                    
                    if (rawDomain == cookieRawDomain) {
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