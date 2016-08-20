let EXPORTED_SYMBOLS = ["Whitelist"];

Components.utils.import("resource://gre/modules/Timer.jsm");

let Whitelist = function(Prefs) {
    this.domains = {};
    
    this.init = function() {
        this.loadFromPrefs();
    };
    
    this.loadFromPrefs = function() {
        this.domains = {};
        
        let whitelistedDomains = Prefs.getValue("whitelistedDomains");
        
        if (whitelistedDomains != "") {
            let separatedDomains = whitelistedDomains.split(';');
            
            for (let domain of separatedDomains) {
                this.domains[domain] = true;
            }
        }
    };
    
    this.saveToPrefs = function() {
        let whitelistedDomains = "";
        
        for (let domain in this.domains) {
            if (this.domains[domain]) {
                whitelistedDomains += domain + ";";
            }
        }
        
        whitelistedDomains = whitelistedDomains.slice(0, -1);
        
        Prefs.setValue("whitelistedDomains", whitelistedDomains);
        Prefs.save();
    };
    
    this.addDomain = function(domain) {
        this.domains[domain] = true;
        this.saveToPrefs();
    };
    
    this.removeDomain = function(domain) {
        this.domains[domain] = undefined;
        this.saveToPrefs();
    }
    
    this.isWhitelisted = function(domain) {
        return this.domains[domain];
    }
    
    this.onPrefsApply = {
        Whitelist: this,
        loadFromPrefs: this.loadFromPrefs,
        observe: function(aSubject, aTopic, aData) {
            let that = this;
            
            setTimeout(function() {
                that.loadFromPrefs.call(that.Whitelist, true);
            }, 500);
        }
    };
};