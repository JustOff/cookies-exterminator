let EXPORTED_SYMBOLS = ["Buttons"];

Components.utils.import("resource://gre/modules/Services.jsm");

function $(node, childId) {
	if (node.getElementById) {
		return node.getElementById(childId);
	} else {
		return node.querySelector("#" + childId);
	}
}

let Buttons = function(extName, appInfo, Prefs, Whitelist, Utils) {
	this.contentURL = "chrome://" + extName + "/content/";
	this.skinURL = "chrome://" + extName + "/skin/";

	this.iconFileNames = {
		normal: "icon_default.png",
		normal_s: "icon_default_s.png",
		unknown: "icon_unknown.png",
		suspended: "icon_suspended.png",
		cleaned: "icon_cleaned.png",
		greylisted: "icon_greylisted.png",
		greylisted_s: "icon_greylisted_s.png",
		whitelisted: "icon_whitelisted.png",
		whitelisted_s: "icon_whitelisted_s.png"
	};

	this.xulDocFileNames = {
		prefs: "options.xul",
		log: "log.xul"
	};

	this.buttonId = "cookextermButton";

	this.menuitemIds = {
		enable: "cookextermEnable",
		viewLog: "cookextermViewLog",
		menuitemManageCookies: "cookextermManageCookies",
		manageWhitelist: "cookextermManageWhitelist",
		whiteList: "cookextermWhiteList",
		cleanOnWinClose: "cookextermCleanOnWinClose",
		cleanOnTabsClose: "cookextermCleanOnTabsClose"
	};

	this.menupopupId = "cookextermMenupopup";

	this.notificationIconTimeout = 2;

	this.init = function(window) {
		let document = window.document;

		if (document.getElementById(this.buttonId)) {
			return; // button already exists
		}

		// create button element
		let button = document.createElement("toolbarbutton");
		button.setAttribute("id", this.buttonId);
		button.setAttribute("label", Utils.translate("Name"));
		button.setAttribute("type", "menu");
		button.setAttribute("class", "toolbarbutton-1 chromeclass-toolbar-additional");
		button.setAttribute("tooltiptext", Utils.translate("TTinitial"));
		button.style.listStyleImage = "url(" + this.skinURL + this.iconFileNames.normal + ")";
		button.style.MozBoxOrient = "inherit";

		let Buttons = this;

		// create menuitems
		let menuitemEnable = document.createElement("menuitem");
		menuitemEnable.setAttribute("id", this.menuitemIds.enable);
		menuitemEnable.setAttribute("type", "checkbox");
		menuitemEnable.setAttribute("label", Utils.translate("MLenable"));
		menuitemEnable.addEventListener("command", function(event) {
			if (Prefs.getValue("enableProcessing")) {
				Prefs.setValue("enableProcessing", false);
			} else {
				Prefs.setValue("enableProcessing", true);
			}

			Prefs.save();
			Buttons.refresh();
		}, false);

		let menuitemWhiteList = document.createElement("menuitem");
		menuitemWhiteList.setAttribute("id", this.menuitemIds.whiteList);
		menuitemWhiteList.setAttribute("type", "radio");
		menuitemWhiteList.setAttribute("name", "clean");
		menuitemWhiteList.addEventListener("command", function(event) {
			let window = Services.wm.getMostRecentWindow("navigator:browser");
			let domain = window.gBrowser.contentDocument.domain;

			if (domain) {
				let baseDomain = Utils.getBaseDomain(domain);

				if (!(Whitelist.isWhitelisted(baseDomain) === true)) {
					Whitelist.addToWhitelist(baseDomain);

					if (Whitelist.isGreylisted(baseDomain) === true) {
						Whitelist.removeFromGreylist(baseDomain);
					}

					Buttons.refresh();
				}
			}
		}, false);

		let menuitemCleanOnWinClose = document.createElement("menuitem");
		menuitemCleanOnWinClose.setAttribute("id", this.menuitemIds.cleanOnWinClose);
		menuitemCleanOnWinClose.setAttribute("label", Utils.translate("MLcleanOnWinClose"));
		menuitemCleanOnWinClose.setAttribute("type", "radio");
		menuitemCleanOnWinClose.setAttribute("name", "clean");
		menuitemCleanOnWinClose.addEventListener("command", function(event) {
			let window = Services.wm.getMostRecentWindow("navigator:browser");
			let domain = window.gBrowser.contentDocument.domain;

			if (domain) {
				let baseDomain = Utils.getBaseDomain(domain);

				if (!(Whitelist.isGreylisted(baseDomain) === true)) {
					Whitelist.addToGreylist(baseDomain);

					if (Whitelist.isWhitelisted(baseDomain) === true) {
						Whitelist.removeFromWhitelist(baseDomain);
					}

					Buttons.refresh();
				}
			}
		}, false);

		let menuitemCleanOnTabsClose = document.createElement("menuitem");
		menuitemCleanOnTabsClose.setAttribute("id", this.menuitemIds.cleanOnTabsClose);
		menuitemCleanOnTabsClose.setAttribute("label", Utils.translate("MLcleanOnTabsClose"));
		menuitemCleanOnTabsClose.setAttribute("type", "radio");
		menuitemCleanOnTabsClose.setAttribute("name", "clean");
		menuitemCleanOnTabsClose.addEventListener("command", function(event) {
			let window = Services.wm.getMostRecentWindow("navigator:browser");
			let domain = window.gBrowser.contentDocument.domain;

			if (domain) {
				let baseDomain = Utils.getBaseDomain(domain);

				if (Whitelist.isWhitelisted(baseDomain) === true 
						|| Whitelist.isGreylisted(baseDomain) === true) {

					Whitelist.removeFromWhitelist(baseDomain);
					Whitelist.removeFromGreylist(baseDomain);

					Buttons.refresh();
				}
			}
		}, false);

		let menuitemManageCookies = document.createElement("menuitem");
		menuitemManageCookies.setAttribute("id", this.menuitemIds.manageCookies);
		menuitemManageCookies.setAttribute("label", Utils.translate("MLmanageCookies"));
		menuitemManageCookies.addEventListener("command", function(event) {
			if (appInfo == "SeaMonkey") {
				Services.wm.getMostRecentWindow("navigator:browser").toDataManager();
			} else {
				let existingWindow = Services.wm.getMostRecentWindow("Browser:Cookies");
				if (!existingWindow) {
					let features = "chrome,centerscreen," + Services.prefs.getBoolPref("browser.preferences.instantApply") ? "dialog=no" : "modal";
					existingWindow = Services.wm.getMostRecentWindow(null)
						.openDialog("chrome://browser/content/preferences/cookies.xul", "Browser:Cookies", features, null);
				}
				existingWindow.focus();
			}
		}, false);

		let menuitemManageWhitelist = document.createElement("menuitem");
		menuitemManageWhitelist.setAttribute("id", this.menuitemIds.manageWhitelist);
		menuitemManageWhitelist.setAttribute("label", Utils.translate("MLmanageWhitelist"));
		menuitemManageWhitelist.addEventListener("command", function(event) {
			let existingWindow = Services.wm.getMostRecentWindow("cookextermPrefsWindow");
			if (existingWindow) {
				existingWindow.focus();
			} else {
				let window = Services.wm.getMostRecentWindow("navigator:browser");
				window.openDialog(Buttons.contentURL + Buttons.xulDocFileNames.prefs, "", "minimizable,centerscreen,modal", "whitelist");
			}
		}, false);

		let menuitemViewLog = document.createElement("menuitem");
		menuitemViewLog.setAttribute("id", this.menuitemIds.viewLog);
		menuitemViewLog.setAttribute("label", Utils.translate("MLlog"));
		menuitemViewLog.addEventListener("command", function(event) {
			let existingWindow = Services.wm.getMostRecentWindow("cookextermLogWindow");
			if (existingWindow) {
				existingWindow.focus();
			} else {
				let window = Services.wm.getMostRecentWindow("navigator:browser");
				window.openDialog(Buttons.contentURL + Buttons.xulDocFileNames.log, "", "minimizable,centerscreen,resizable");
			}
		}, false);

		let menuitemSeparator1 = document.createElement("menuseparator");
		let menuitemSeparator2 = document.createElement("menuseparator");
		let menuitemSeparator3 = document.createElement("menuseparator");

		// create menupopup element
		let menupopup = document.createElement("menupopup");
		menupopup.setAttribute("id", this.menupopupId);
		menupopup.addEventListener("popupshowing", function(event) {
			let window = Services.wm.getMostRecentWindow("navigator:browser");
			let document = window.document;

			let menuitemEnable = document.getElementById(Buttons.menuitemIds.enable);
			if (Prefs.getValue("enableProcessing")) {
				menuitemEnable.setAttribute("checked", true);
				menuitemEnable.setAttribute("label", Utils.translate("MLenable"));
			} else {
				menuitemEnable.removeAttribute("checked");
				menuitemEnable.setAttribute("label", Utils.translate("MLdisable"));
			}
			if (Prefs.getValue("whitelistedDomains") == "") {
				menuitemEnable.setAttribute("disabled", "true");
			} else {
				menuitemEnable.removeAttribute("disabled");
			}
			let menuitemWhiteList = document.getElementById(Buttons.menuitemIds.whiteList);
			let menuitemCleanOnWinClose = document.getElementById(Buttons.menuitemIds.cleanOnWinClose);
			let menuitemCleanOnTabsClose = document.getElementById(Buttons.menuitemIds.cleanOnTabsClose);
			let domain;
			try {
				domain = window.gBrowser.contentDocument.domain;
				if (window.privateTab && window.privateTab.isTabPrivate(window.gBrowser.selectedTab)) {
					domain = null;
				}
			} catch(e) {}

			if (domain) {
				let baseDomain = Utils.getBaseDomain(domain);

				if (Whitelist.isWhitelisted(baseDomain) === true) {
					menuitemWhiteList.setAttribute("checked", "true");
				} else if (Whitelist.isGreylisted(baseDomain) === true) {
					menuitemCleanOnWinClose.setAttribute("checked", "true");
				} else {
					menuitemCleanOnTabsClose.setAttribute("checked", "true");
				}
				menuitemWhiteList.removeAttribute("disabled");
				menuitemWhiteList.setAttribute("label", Utils.translate("MLwhiteList") + " " + Utils.ACEtoUTF8(baseDomain));
				menuitemCleanOnWinClose.removeAttribute("disabled");
				menuitemCleanOnTabsClose.removeAttribute("disabled");
			} else {
				menuitemWhiteList.setAttribute("disabled", "true");
				menuitemWhiteList.setAttribute("label", Utils.translate("MLwhiteList"));
				menuitemCleanOnWinClose.setAttribute("disabled", "true");
				menuitemCleanOnTabsClose.setAttribute("disabled", "true");
				menuitemCleanOnTabsClose.setAttribute("checked", "true");
			}

			let menuitemViewLog = window.document.getElementById(Buttons.menuitemIds.viewLog);
			menuitemViewLog.setAttribute("disabled", !Prefs.getValue("enableLogging"));
		}, false);

		// append menuitems to the menupopup
		if (Prefs.getValue("toolbarButtonPlaceId") == "nav-bar") {
			menupopup.appendChild(menuitemCleanOnTabsClose);
			menupopup.appendChild(menuitemCleanOnWinClose);
			menupopup.appendChild(menuitemWhiteList);
			menupopup.appendChild(menuitemSeparator1);
			menupopup.appendChild(menuitemManageWhitelist);
			menupopup.appendChild(menuitemSeparator2);
			menupopup.appendChild(menuitemManageCookies);
			menupopup.appendChild(menuitemViewLog);
			menupopup.appendChild(menuitemSeparator3);
			menupopup.appendChild(menuitemEnable);
		} else {
			menupopup.appendChild(menuitemEnable);
			menupopup.appendChild(menuitemSeparator3);
			menupopup.appendChild(menuitemViewLog);
			menupopup.appendChild(menuitemManageCookies);
			menupopup.appendChild(menuitemSeparator2);
			menupopup.appendChild(menuitemManageWhitelist);
			menupopup.appendChild(menuitemSeparator1);
			menupopup.appendChild(menuitemWhiteList);
			menupopup.appendChild(menuitemCleanOnWinClose);
			menupopup.appendChild(menuitemCleanOnTabsClose);
		}

		// append menupopup to the button
		button.appendChild(menupopup);

		let toolbox = $(document, "navigator-toolbox");
			toolbox.palette.appendChild(button);

		let toolbarId = Prefs.getValue("toolbarButtonPlaceId"),
			nextItemId = Prefs.getValue("toolbarButtonNextItemId"),
			toolbar = toolbarId && $(document, toolbarId),
			nextItem = toolbar && nextItemId != "" && $(document, nextItemId);
		
		if (toolbar) {
			if (nextItem && nextItem.parentNode && nextItem.parentNode.id.replace("-customization-target", "") == toolbarId) {
				toolbar.insertItem(this.buttonId, nextItem);
			} else {
				let ids = (toolbar.getAttribute("currentset") || "").split(",");
				nextItem = null;
				for (let i = ids.indexOf(this.buttonId) + 1; i > 0 && i < ids.length; i++) {
					nextItem = $(document, ids[i])
					if (nextItem) {
						break;
					}
				}
				toolbar.insertItem(this.buttonId, nextItem);
			}
			if (appInfo != "SeaMonkey") {
				window.setToolbarVisibility(toolbar, true);
			}
		}

		this.onCustomization = this.onCustomization.bind(this);
		this.afterCustomization = this.afterCustomization.bind(this);

		window.addEventListener("customizationchange", this.onCustomization, false);
		window.addEventListener("aftercustomization", this.afterCustomization, false);

		this.refresh();
	};

	this.onCustomization = function(event) {
		try {
			let ucs = Services.prefs.getCharPref("browser.uiCustomization.state");
			if ((/\"nav\-bar\"\:\[.*?\"cookextermButton\".*?\]/).test(ucs)) {
				Prefs.setValue("toolbarButtonPlaceId", "nav-bar");
				Prefs.save();
			} else {
				this.setPrefs(null, null);
			}
		} catch(e) {}
	};

	this.afterCustomization = function(event) {
		let toolbox = event.target,
			b = $(toolbox.parentNode, this.buttonId),
			toolbarId, nextItemId;
		if (b) {
			let parent = b.parentNode,
				nextItem = b.nextSibling;
			if (parent && (parent.localName == "toolbar" || parent.classList.contains("customization-target"))) {
				toolbarId = parent.id;
				nextItemId = nextItem && nextItem.id;
			}
			if ((toolbarId.substring(0, 7) == "nav-bar" && b.firstChild.childNodes[0].id == this.menuitemIds.enable) 
					|| (toolbarId.substring(0, 7) != "nav-bar" && b.firstChild.childNodes[0].id == this.menuitemIds.cleanOnTabsClose)) {
				let mnp = b.firstChild;
				for (let i = mnp.childNodes.length - 2; i >= 0; i--) {
					mnp.appendChild(mnp.childNodes[i]);
				}
			}
		}
		this.setPrefs(toolbarId, nextItemId);
	};

	this.setPrefs = function(toolbarId, nextItemId) {
		Prefs.setValue("toolbarButtonPlaceId", toolbarId == "nav-bar-customization-target" ? "nav-bar" : toolbarId || "");
		Prefs.setValue("toolbarButtonNextItemId", nextItemId || "");
		Prefs.save();
	};

	this.notify = function(cleanedDomainsString) {
		if (Prefs.getValue("toolbarButtonPlaceId") == "") {
			return;
		}

		let windowsEnumerator = Services.wm.getEnumerator("navigator:browser");

		while (windowsEnumerator.hasMoreElements()) {
			let window = windowsEnumerator.getNext().QueryInterface(Components.interfaces.nsIDOMWindow);
			let button = window.document.getElementById(this.buttonId);

			if (!button) {
				continue;
			}

			let Buttons = this;

			if (cleanedDomainsString) {
				button.setAttribute("tooltiptext", Utils.translate("TTcleaned") + " " + cleanedDomainsString);
				button.style.listStyleImage = "url(" + this.skinURL + this.iconFileNames.cleaned + ")";

				Utils.setTimeout(function() {
					Buttons.refresh(window);
				}, Buttons.notificationIconTimeout);
			}
		}
	};

	this.refresh = function(window) {
		if (Prefs.getValue("toolbarButtonPlaceId") == "") {
			return;
		}

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
		let domain;

		if (button) {
			try {
				domain = Utils.UTF8toACE(window.gBrowser.contentDocument.domain);
				if (window.privateTab && window.privateTab.isTabPrivate(window.gBrowser.selectedTab)) {
					domain = null;
				}
			} catch(e) {}

			if (!Prefs.getValue("enableProcessing")) {
				button.setAttribute("tooltiptext", Utils.translate("TTsuspended"));
				if (!domain) {
					button.style.listStyleImage = "url(" + this.skinURL + this.iconFileNames.suspended + ")";
				} else if (Whitelist.isWhitelisted(domain)) {
					button.style.listStyleImage = "url(" + this.skinURL + this.iconFileNames.whitelisted_s + ")";
				} else if (Whitelist.isGreylisted(domain)) {
					button.style.listStyleImage = "url(" + this.skinURL + this.iconFileNames.greylisted_s + ")";
				} else {
					button.style.listStyleImage = "url(" + this.skinURL + this.iconFileNames.normal_s + ")";
				}
			} else {
				if (!domain) {
					button.style.listStyleImage = "url(" + this.skinURL + this.iconFileNames.unknown + ")";
				} else if (Whitelist.isWhitelisted(domain)) {
					button.style.listStyleImage = "url(" + this.skinURL + this.iconFileNames.whitelisted + ")";
				} else if (Whitelist.isGreylisted(domain)) {
					button.style.listStyleImage = "url(" + this.skinURL + this.iconFileNames.greylisted + ")";
				} else {
					button.style.listStyleImage = "url(" + this.skinURL + this.iconFileNames.normal + ")";
				}
				if (button.getAttribute("tooltiptext") == Utils.translate("TTsuspended")) {
					button.setAttribute("tooltiptext", Utils.translate("TTinitial"));
				}
			}
		}
	};

	this.clear = function(window) {
		let button = window.document.getElementById(this.buttonId);

		if (button) {
			button.parentNode.removeChild(button);
		}

		let navigatorToolbox = window.document.getElementById("navigator-toolbox");

		// customization palette seems to be beyond DOM document
		// so just try to remove it the hard way
		for (let nodeIndex in navigatorToolbox.palette.childNodes) {
			let childNode = navigatorToolbox.palette.childNodes[nodeIndex];

			if (childNode && childNode.id == this.buttonId) {
				navigatorToolbox.palette.removeChild(childNode);
			}
		}

		window.removeEventListener("customizationchange", this.onCustomization, false);
		window.removeEventListener("aftercustomization", this.afterCustomization, false);
	};

	this.onPrefsApply = function() {
		this.refresh();
	};
};
