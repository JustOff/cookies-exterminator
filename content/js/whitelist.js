let EXPORTED_SYMBOLS = ["Whitelist"];

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
    };
    
    this.isWhitelisted = function(domain) {
        return this.domains[domain] || this.checkForWildcard(domain);
    };
    
    this.checkForWildcard = function(domain) {
        if (typeof domain === "string") {
            let domainParts = domain.split('.');
            let domainPartsAmount = domainParts.length;

            let domainEnding = domainParts[domainPartsAmount - 1];
            let partialDomain = domainEnding;

            for (let i = domainPartsAmount - 2; i >= 0; i--) {
                partialDomain = domainParts[i] + '.' + partialDomain;
                
                let dottedDomain = '.' + partialDomain;
                
                if (this.domains[dottedDomain]) {
                    return dottedDomain;
                }
                
                if (i > 0) {
                    let wildcardDomain = '*' + dottedDomain;
                    
                    if (this.domains[wildcardDomain]) {
                        return wildcardDomain;
                    }
                }
            }
        }
        
        return null;
    };
    
    this.onPrefsApply = function() {
        this.loadFromPrefs();
    };
};