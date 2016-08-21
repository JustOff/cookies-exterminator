let EXPORTED_SYMBOLS = ["Tabs"];

let Tabs = function(Crusher, Buttons) {
    this.onClose = function(event) {
        let tab = event.target;
        let browser = tab.linkedBrowser;
        let domain = browser.contentDocument.domain;
        
        if (domain) {
            Crusher.prepare(domain);
        }
    };
    
    this.onTabProgress = {    
        onLocationChange: function(aBrowser, aWebProgress, aRequest, aURI, aFlag) {
            if (aFlag & Components.interfaces.LOCATION_CHANGE_SAME_DOCUMENT) {
                return;
            }
            
            let domain = aBrowser.contentDocument.domain;
            let previousDomain = aBrowser.previousDomain;
            
            if (previousDomain == undefined) {
                aBrowser["previousDomain"] = previousDomain = domain;
            }
            
            if (previousDomain && previousDomain != domain) {
                Crusher.prepare(previousDomain);
            }
            
            aBrowser.previousDomain = domain;
        }
    };
    
    this.onProgress = {
        onLocationChange: function(aWebProgress, aRequest, aLocation, aFlag) {
            if (aFlag & Components.interfaces.nsIWebProgress.LOCATION_CHANGE_SAME_DOCUMENT) {
                return;
            }
            
            let window = aWebProgress.DOMWindow;
            let domain = window.document.domain;
            domain = domain === undefined ? null : domain;
            
            Buttons.refresh(domain);
        }
    };
    
    this.init = function(window) {
        let tabBrowser = window.gBrowser;
        
        tabBrowser.tabContainer.addEventListener("TabClose", this.onClose, false);
        tabBrowser.addTabsProgressListener(this.onTabProgress);
        tabBrowser.addProgressListener(this.onProgress);
    };
    
    this.clear = function(window) {
        let tabBrowser = window.gBrowser;
        
        tabBrowser.tabContainer.removeEventListener("TabClose", this.onClose, false);
        tabBrowser.removeTabsProgressListener(this.onTabProgress);
        tabBrowser.removeProgressListener(this.onProgress);
    };
};