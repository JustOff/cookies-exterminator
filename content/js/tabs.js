let EXPORTED_SYMBOLS = ["Tabs"];

let Tabs = function(Crusher) {
    this.onClose = function(event) {
        let tab = event.target;
        let browser = tab.linkedBrowser;
        let domain = browser.contentDocument.domain;
        
        if (domain) {
            Crusher.prepare(domain);
        }
    };
    
    this.onProgress = {       
        onLocationChange: function(aWebProgress, aRequest, aURI, aFlag) {
            let window = aWebProgress.DOMWindow;
            let domain = window.document.domain;
            
            if (domain) {
                Crusher.prepare(domain);
            }
        }
    };
    
    this.init = function(window) {
        let tabBrowser = window.gBrowser;
        
        tabBrowser.tabContainer.addEventListener("TabClose", this.onClose, false);
        tabBrowser.addProgressListener(this.onProgress);
    };
    
    this.clear = function(window) {
        let tabBrowser = window.gBrowser;
        
        tabBrowser.tabContainer.removeEventListener("TabClose", this.onClose, false);
        tabBrowser.removeProgressListener(this.onProgress);
    };
};