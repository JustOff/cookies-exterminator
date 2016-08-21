let EXPORTED_SYMBOLS = ["Buttons"];

Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://gre/modules/Timer.jsm");

let Buttons = function(extName, Prefs, Whitelist) {
    this.contentURL = "chrome://" + extName + "/content/";
    
    this.iconFileNames = {
        normal: "toolbar_icon.png",
        suspended: "toolbar_icon_suspended.png",
        crushed: "toolbar_icon_crushed.png",
        whitelisted: "toolbar_icon_whitelisted.png"
    };
    
    this.xulDocFileNames = {
        prefs: "prefs.xul",
        log: "log.xul"
    };
    
    this.buttonId = "ctcButton";
    this.buttonLabel = "Crush Those Cookies";
    
    this.tooltipTexts = {
        initial: "Didn't crush any cookies yet",
        suspended: "Suspended",
        crushed: "Recently crushed cookies from ",
        notCrushed: "Previously crushed cookies from "
    };
        
    this.menuitemClass = "menuitem-non-iconic";
    
    this.menuitemIds = {
        suspendResume: "ctcSuspendResume",
        whitelistAddRemove: "ctcWhitelistAddRemove",
        manageWhitelist: "ctcManageWhitelist",
        viewLog: "ctcViewLog"
    };
    
    this.menuitemLabels = {
        suspend: "Suspend crushing cookies",
        resume: "Resume crushing cookies",
        add: "Add ",
        addEnding: " to whitelist",
        remove: "Remove ",
        removeEnding: " from whitelist",
        addRemoveNoDomain: "Current document has no domain",
        manageWhitelist: "Manage whitelisted domains",
        log: "View activity log"
    };
        
    this.menupopupId = "ctcMenupopup";
    
    this.notificationIconTimeout = 5;
    
    this.init = function(window, firstRun) {
        let document = window.document;
        
        if (document.getElementById(this.buttonId)) {
            return; // button already exists
        }
        
        // create button element
        let button = document.createElement("toolbarbutton");
        button.setAttribute("id", this.buttonId);
        button.setAttribute("label", "Crush Those Cookies");
        button.setAttribute("type", "menu");
        button.setAttribute("class", "toolbarbutton-1");
        button.setAttribute("tooltiptext", this.tooltipTexts.initial);
        button.style.listStyleImage = "url(" + this.contentURL + this.iconFileNames.normal + ")";
        
        let Buttons = this;
        
        // create menuitems
        let menuitemSuspendResume = document.createElement("menuitem");
        menuitemSuspendResume.setAttribute("id", this.menuitemIds.suspendResume);
        menuitemSuspendResume.setAttribute("class", this.menuitemClass);
        menuitemSuspendResume.addEventListener("command", function(event) {
            if (Prefs.getValue("suspendCrushing")) {
                Prefs.setValue("suspendCrushing", false);
            } else {
                Prefs.setValue("suspendCrushing", true);
            }
            
            Prefs.save();
            Buttons.refresh();
        }, false);
        
        let menuitemWhitelistAddRemove = document.createElement("menuitem");
        menuitemWhitelistAddRemove.setAttribute("id", this.menuitemIds.whitelistAddRemove);
        menuitemWhitelistAddRemove.setAttribute("class", this.menuitemClass);
        menuitemWhitelistAddRemove.addEventListener("command", function(event) {
            let window = Services.wm.getMostRecentWindow("navigator:browser");
            let domain = window.gBrowser.contentDocument.domain;
            
            if (domain) {
                if (Whitelist.isWhitelisted(domain)) {
                    Whitelist.removeDomain(domain);
                } else {
                    Whitelist.addDomain(domain);
                }
                
                Buttons.refresh();
            }
        }, false);
        
        let menuitemManageWhitelist = document.createElement("menuitem");
        menuitemManageWhitelist.setAttribute("id", this.menuitemIds.manageWhitelist);
        menuitemManageWhitelist.setAttribute("label", this.menuitemLabels.manageWhitelist);
        menuitemManageWhitelist.setAttribute("class", this.menuitemClass);
        menuitemManageWhitelist.addEventListener("command", function(event) {
            let window = Services.wm.getMostRecentWindow("navigator:browser");
            window.openDialog(Buttons.contentURL + Buttons.xulDocFileNames.prefs, "", "modal,centerscreen",
                                                                             "whitelist");
        }, false);
        
        let menuitemViewLog = document.createElement("menuitem");
        menuitemViewLog.setAttribute("id", this.menuitemIds.viewLog);
        menuitemViewLog.setAttribute("label", this.menuitemLabels.log);
        menuitemViewLog.setAttribute("class", this.menuitemClass);
        menuitemViewLog.addEventListener("command", function(event) {
            let window = Services.wm.getMostRecentWindow("navigator:browser");
            window.openDialog(Buttons.contentURL + Buttons.xulDocFileNames.log, "", "modal,centerscreen");
        }, false);
        
        // create menupopup element
        let menupopup = document.createElement("menupopup");
        menupopup.setAttribute("id", this.menupopupId);
        menupopup.addEventListener("popupshowing", function(event) {
            let window = Services.wm.getMostRecentWindow("navigator:browser");
            let document = window.document;
            
            let menuitemSuspendResume = document.getElementById(Buttons.menuitemIds.suspendResume);
            menuitemSuspendResume.setAttribute("label", Prefs.getValue("suspendCrushing") ?
                                                        Buttons.menuitemLabels.resume :
                                                        Buttons.menuitemLabels.suspend);
            
            let menuitemWhitelistAddRemove = document.getElementById(Buttons.menuitemIds.whitelistAddRemove);
            let domain = window.gBrowser.contentDocument.domain;
            
            if (domain) {
                if (Whitelist.isWhitelisted(domain)) {
                    menuitemWhitelistAddRemove.setAttribute("disabled", "false");
                    menuitemWhitelistAddRemove.setAttribute("label", Buttons.menuitemLabels.remove +
                                                                     domain +
                                                                     Buttons.menuitemLabels.removeEnding);
                } else {
                    menuitemWhitelistAddRemove.setAttribute("disabled", "false");
                    menuitemWhitelistAddRemove.setAttribute("label", Buttons.menuitemLabels.add +
                                                                     domain +
                                                                     Buttons.menuitemLabels.addEnding);
                }
            } else {
                menuitemWhitelistAddRemove.setAttribute("disabled", "true");
                menuitemWhitelistAddRemove.setAttribute("label", Buttons.menuitemLabels.addRemoveNoDomain);
            }
            
            let menuitemViewLog = window.document.getElementById(Buttons.menuitemIds.viewLog);
            menuitemViewLog.setAttribute("disabled", !Prefs.getValue("enableLogging"));
        }, false);
        
        // append menuitems to the menupopup
        menupopup.appendChild(menuitemSuspendResume);
        menupopup.appendChild(menuitemWhitelistAddRemove);
        menupopup.appendChild(menuitemManageWhitelist);
        menupopup.appendChild(menuitemViewLog);
        
        // append menupopup to the button
        button.appendChild(menupopup);
        
        let navigatorToolbox = document.getElementById("navigator-toolbox");
        
        // append the button to customization palette
        navigatorToolbox.palette.appendChild(button);
        
        // place (or not) the button into the navigation bar
        let navBar = document.getElementById("nav-bar");
        let buttonsArray = navBar.currentSet.split(",");
        let toolbarButtonPosition = Prefs.getValue("toolbarButtonPosition");
        
        if (toolbarButtonPosition < 0 && firstRun) {
            navBar.insertItem(this.buttonId);
            buttonsArray = navBar.currentSet.split(",");
            Prefs.setValue("toolbarButtonPosition", buttonsArray.indexOf(this.buttonId));
            Prefs.save();
        } else if (toolbarButtonPosition >= 0) {
            let before = null;
            
            for (let i = toolbarButtonPosition; i < buttonsArray.length; i++) {
                before = document.getElementById(buttonsArray[i]);
                
                if (before) {
                    break;
                }
            }
            
            navBar.insertItem(this.buttonId, before);
        }
        
        if (Prefs.getValue("suspendCrushing")) {
            this.setIconAndTooltipSuspended();
        }
        
        this.afterCustomization = this.afterCustomization.bind(this);
        
        window.addEventListener("aftercustomization", this.afterCustomization, false);

        this.refresh();
    };
    
    this.afterCustomization = function(event) {
        let navigatorToolbox = event.target;
        let window = navigatorToolbox.ownerDocument.defaultView;
        
        let navBar = window.document.getElementById("nav-bar");
        let buttonsArray = navBar.currentSet.split(",");
                
        // update button's navigation bar position in preferences and save it
        Prefs.setValue("toolbarButtonPosition", buttonsArray.indexOf(this.buttonId));
        Prefs.save();
    };
    
    this.notify = function(crushedDomainsString) {
        let windowsEnumerator = Services.wm.getEnumerator("navigator:browser");
        
        while (windowsEnumerator.hasMoreElements()) {
            let window = windowsEnumerator.getNext().QueryInterface(Components.interfaces.nsIDOMWindow);
            let button = window.document.getElementById(this.buttonId);
            
            if (!button) {
                continue;
            }
            
            let Buttons = this;
            
            if (crushedDomainsString) {
                button.setAttribute("tooltiptext", this.tooltipTexts.crushed + crushedDomainsString);
                button.style.listStyleImage = "url(" + this.contentURL + this.iconFileNames.crushed + ")";
                
                setTimeout(function() {
                    Buttons.refresh(window);
                }, Buttons.notificationIconTimeout * 1000);
            } else {
                let buttonOldTooltipText = button.getAttribute("tooltiptext");
                
                // old tooltip text started with "Recently", change it to "Previously (...)";
                if (buttonOldTooltipText.substr(0, 1) == "R") {
                    button.setAttribute("tooltiptext", this.tooltipTexts.notCrushed +
                                                       buttonOldTooltipText
                                                       .substr(this.tooltipTexts.crushed.length,
                                                               buttonOldTooltipText.length));
                }
            }
        }
    };
    
    this.refresh = function(window) {
        if (window) {
            this.refreshForWindow(window);
        } else {
            let windowsEnumerator = Services.wm.getEnumerator("navigator:browser");
            
            while (windowsEnumerator.hasMoreElements()) {
                let window = windowsEnumerator.getNext().QueryInterface(Components.interfaces.nsIDOMWindow);
                
                this.refreshForWindow(window);
            }
        }
    };
    
    this.refreshForWindow = function(window) {
        let button = window.document.getElementById(this.buttonId);        
        
        if (button) {
            let domain = window.gBrowser.contentDocument.domain;
            
            if (Prefs.getValue("suspendCrushing")) {
                button.setAttribute("tooltiptext", this.tooltipTexts.suspended);
                button.style.listStyleImage = "url(" + this.contentURL + this.iconFileNames.suspended + ")";
            } else {
                if (!domain || Whitelist.isWhitelisted(domain)) {
                    button.style.listStyleImage = "url(" + this.contentURL + this.iconFileNames.whitelisted + ")";
                } else {
                    button.style.listStyleImage = "url(" + this.contentURL + this.iconFileNames.normal + ")";
                }
                
                let buttonOldTooltipText = button.getAttribute("tooltiptext");
        
                if (buttonOldTooltipText.substr(0, 1) == "S") {
                    button.setAttribute("tooltiptext", this.tooltipTexts.initial);
                }
            }
        }
    };
    
    this.clear = function(window) {
        let button = window.document.getElementById(this.buttonId);
        
        if (button) {
            button.parentNode.removeChild(button);
        }
        
        window.removeEventListener("aftercustomization", this.afterCustomization, false);
    };
    
    this.onPrefsApply = {
        Buttons: this,
        refresh: this.refresh,
        observe: function(aSubject, aTopic, aData) {
            let that = this;
            
            setTimeout(function() {
                that.refresh.call(that.Buttons, true);
            }, 150);
        }
    };
};