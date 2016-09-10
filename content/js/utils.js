let EXPORTED_SYMBOLS = ["Utils"];

Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://gre/modules/Timer.jsm");

let Utils = function() {
    this.getRawDomain = function(fullDomain) {
        return fullDomain.substr(0, 4) == "www." ?
               fullDomain.substr(4, fullDomain.length) :
               fullDomain;
    };
    
    this.setTimeout = function(method, delay) {
        setTimeout(function() {
            if (Services) {
                method();
            }
        }, delay);
    };
};