let EXPORTED_SYMBOLS = ["Buttons"];

Components.utils.import("resource://gre/modules/Services.jsm");

let Buttons = function(extName, Prefs, Whitelist, Utils) {
	this.contentURL = "chrome://" + extName + "/content/";
	this.skinURL = "chrome://" + extName + "/skin/";

	this.iconFileNames = {
		normal: "icon_default.png",
		unknown: "icon_unknown.png",
		suspended: "icon_suspended.png",
		crushed: "icon_crushed.png",
		greylisted: "icon_greylisted.png",
		whitelisted: "icon_whitelisted.png"
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

	this.menuitemIds = {
		enable: "ctcEnable",
		viewLog: "ctcViewLog",
		menuitemManageCookies: "ctcManageCookies",
		manageWhitelist: "ctcManageWhitelist",
		whiteList: "ctcWhiteList",
		cleanOnWinClose: "ctcCleanOnWinClose",
		cleanOnTabsClose: "ctcCleanOnTabsClose"
	};

	this.menuitemLabels = {
		enable: "Enable cookies processing",
		log: "View activity log",
		manageCookies: "Remove individual cookies",
		manageWhitelist: "Manage domains",
		whiteList: "Whitelist ",
		cleanOnWinClose: "Keep until browser exit",
		cleanOnTabsClose: "Preserve only while in use"
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
		button.setAttribute("class", "toolbarbutton-1 chromeclass-toolbar-additional");
		button.setAttribute("tooltiptext", this.tooltipTexts.initial);
		button.style.listStyleImage = "url(" + this.skinURL + this.iconFileNames.normal + ")";
		button.style.MozBoxOrient = "inherit";

		let Buttons = this;

		// create menuitems
		let menuitemEnable = document.createElement("menuitem");
		menuitemEnable.setAttribute("id", this.menuitemIds.enable);
		menuitemEnable.setAttribute("type", "checkbox");
		menuitemEnable.setAttribute("label", this.menuitemLabels.enable);
		menuitemEnable.addEventListener("command", function(event) {
			if (Prefs.getValue("suspendCrushing")) {
				Prefs.setValue("suspendCrushing", false);
			} else {
				Prefs.setValue("suspendCrushing", true);
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
				let rawDomain = Utils.getRawDomain(domain);

				let whitelisted = Whitelist.isWhitelisted(rawDomain);
				if (!whitelisted) {
					Whitelist.addDomain(rawDomain);
				}

				let whitelistedTemp = Whitelist.isWhitelistedTemp(rawDomain);
				if (whitelistedTemp) {
					if (typeof whitelistedTemp === "string") {
						rawDomain = whitelistedTemp;
					}
					Whitelist.removeDomainTemp(rawDomain);
				}

				Buttons.refresh();
			}
		}, false);

		let menuitemCleanOnWinClose = document.createElement("menuitem");
		menuitemCleanOnWinClose.setAttribute("id", this.menuitemIds.cleanOnWinClose);
		menuitemCleanOnWinClose.setAttribute("label", this.menuitemLabels.cleanOnWinClose);
		menuitemCleanOnWinClose.setAttribute("type", "radio");
		menuitemCleanOnWinClose.setAttribute("name", "clean");
		menuitemCleanOnWinClose.addEventListener("command", function(event) {
			let window = Services.wm.getMostRecentWindow("navigator:browser");
			let domain = window.gBrowser.contentDocument.domain;

			if (domain) {
				let rawDomain = Utils.getRawDomain(domain);

				let whitelistedTemp = Whitelist.isWhitelistedTemp(rawDomain);
				if (!whitelistedTemp) {
					Whitelist.addDomainTemp(rawDomain);
				}

				let whitelisted = Whitelist.isWhitelisted(rawDomain);
				if (whitelisted) {
					if (typeof whitelisted === "string") {
						rawDomain = whitelisted;
					}
					Whitelist.removeDomain(rawDomain);
				}

				Buttons.refresh();
			}
		}, false);

		let menuitemCleanOnTabsClose = document.createElement("menuitem");
		menuitemCleanOnTabsClose.setAttribute("id", this.menuitemIds.cleanOnTabsClose);
		menuitemCleanOnTabsClose.setAttribute("label", this.menuitemLabels.cleanOnTabsClose);
		menuitemCleanOnTabsClose.setAttribute("type", "radio");
		menuitemCleanOnTabsClose.setAttribute("name", "clean");
		menuitemCleanOnTabsClose.addEventListener("command", function(event) {
			let window = Services.wm.getMostRecentWindow("navigator:browser");
			let domain = window.gBrowser.contentDocument.domain;

			if (domain) {
				let rawDomain = Utils.getRawDomain(domain);

				let whitelisted = Whitelist.isWhitelisted(rawDomain);
				let whitelistedTemp = Whitelist.isWhitelistedTemp(rawDomain);

				if (whitelisted || whitelistedTemp) {
					if (typeof whitelisted === "string") {
						rawDomain = whitelisted;
					}
					if (typeof whitelistedTemp === "string") {
						rawDomain = whitelistedTemp;
					}

					Whitelist.removeDomain(rawDomain);
					Whitelist.removeDomainTemp(rawDomain);
				}

				Buttons.refresh();
			}
		}, false);

		let menuitemManageCookies = document.createElement("menuitem");
		menuitemManageCookies.setAttribute("id", this.menuitemIds.manageCookies);
		menuitemManageCookies.setAttribute("label", this.menuitemLabels.manageCookies);
		menuitemManageCookies.addEventListener("command", function(event) {
			let existingWindow = Services.wm.getMostRecentWindow("Browser:Cookies");
			if (!existingWindow) {
				let features = "chrome,centerscreen," + Services.prefs.getBoolPref("browser.preferences.instantApply") ? "dialog=no" : "modal";
				existingWindow = Services.wm.getMostRecentWindow(null).openDialog("chrome://browser/content/preferences/cookies.xul", "Browser:Cookies", features, null);
			}
			existingWindow.focus();
		}, false);

		let menuitemManageWhitelist = document.createElement("menuitem");
		menuitemManageWhitelist.setAttribute("id", this.menuitemIds.manageWhitelist);
		menuitemManageWhitelist.setAttribute("label", this.menuitemLabels.manageWhitelist);
		menuitemManageWhitelist.addEventListener("command", function(event) {
			let existingWindow = Services.wm.getMostRecentWindow("ctcPrefsWindow");
			if (existingWindow) {
				existingWindow.focus();
			} else {
				let window = Services.wm.getMostRecentWindow("navigator:browser");
				window.openDialog(Buttons.contentURL + Buttons.xulDocFileNames.prefs, "", "minimizable,centerscreen", "whitelist");
			}
		}, false);

		let menuitemViewLog = document.createElement("menuitem");
		menuitemViewLog.setAttribute("id", this.menuitemIds.viewLog);
		menuitemViewLog.setAttribute("label", this.menuitemLabels.log);
		menuitemViewLog.addEventListener("command", function(event) {
			let existingWindow = Services.wm.getMostRecentWindow("ctcLogWindow");
			if (existingWindow) {
				existingWindow.focus();
			} else {
				let window = Services.wm.getMostRecentWindow("navigator:browser");
				window.openDialog(Buttons.contentURL + Buttons.xulDocFileNames.log, "", "minimizable,centerscreen");
			}
		}, false);

		let menuitemSeparator1 = document.createElement("menuseparator");
		let menuitemSeparator2 = document.createElement("menuseparator");

		// create menupopup element
		let menupopup = document.createElement("menupopup");
		menupopup.setAttribute("id", this.menupopupId);
		menupopup.addEventListener("popupshowing", function(event) {
			let window = Services.wm.getMostRecentWindow("navigator:browser");
			let document = window.document;

			let menuitemEnable = document.getElementById(Buttons.menuitemIds.enable);
			menuitemEnable.setAttribute("checked", Prefs.getValue("suspendCrushing") ? false : true);
			let menuitemWhiteList = document.getElementById(Buttons.menuitemIds.whiteList);
			let menuitemCleanOnWinClose = document.getElementById(Buttons.menuitemIds.cleanOnWinClose);
			let menuitemCleanOnTabsClose = document.getElementById(Buttons.menuitemIds.cleanOnTabsClose);
			let domain = window.gBrowser.contentDocument.domain;

			if (domain) {
				let rawDomain = Utils.getRawDomain(domain);

				let whitelisted = Whitelist.isWhitelisted(rawDomain);
				let whitelistedTemp = Whitelist.isWhitelistedTemp(rawDomain);

				if (whitelistedTemp) {
					if (typeof whitelistedTemp === "string") {
						rawDomain = whitelistedTemp;
					}
					menuitemCleanOnWinClose.setAttribute("checked", "true");
				} else if (whitelisted) {
					if (typeof whitelisted === "string") {
						rawDomain = whitelisted;
					}
					menuitemWhiteList.setAttribute("checked", "true");
				} else {
					menuitemCleanOnTabsClose.setAttribute("checked", "true");
				}
				menuitemWhiteList.setAttribute("disabled", "false");
				menuitemWhiteList.setAttribute("label", Buttons.menuitemLabels.whiteList + rawDomain);
				menuitemCleanOnWinClose.setAttribute("disabled", "false");
				menuitemCleanOnTabsClose.setAttribute("disabled", "false");
			} else {
				menuitemWhiteList.setAttribute("disabled", "true");
				menuitemWhiteList.setAttribute("label", Buttons.menuitemLabels.whiteList);
				menuitemCleanOnWinClose.setAttribute("disabled", "true");
				menuitemCleanOnTabsClose.setAttribute("disabled", "true");
				menuitemCleanOnTabsClose.setAttribute("checked", "true");
			}

			let menuitemViewLog = window.document.getElementById(Buttons.menuitemIds.viewLog);
			menuitemViewLog.setAttribute("disabled", !Prefs.getValue("enableLogging"));
		}, false);

		// append menuitems to the menupopup
		menupopup.appendChild(menuitemEnable);
		menupopup.appendChild(menuitemSeparator1);
		menupopup.appendChild(menuitemViewLog);
		menupopup.appendChild(menuitemManageCookies);
		menupopup.appendChild(menuitemManageWhitelist);
		menupopup.appendChild(menuitemSeparator2);
		menupopup.appendChild(menuitemWhiteList);
		menupopup.appendChild(menuitemCleanOnWinClose);
		menupopup.appendChild(menuitemCleanOnTabsClose);

		// append menupopup to the button
		button.appendChild(menupopup);

		// append the button to customization palette
		// this seems to be required even if the button will be placed elsewhere
		let navigatorToolbox = document.getElementById("navigator-toolbox");
		navigatorToolbox.palette.appendChild(button);

		let toolbarButtonPlaceId = Prefs.getValue("toolbarButtonPlaceId");
		let toolbarButtonPosition = Prefs.getValue("toolbarButtonPosition");

		if (toolbarButtonPlaceId != "") {
			if (firstRun) {
				// if it's the first run then just append the button at the end of the nav-bar
				let navBar = document.getElementById("nav-bar");
				navBar.insertItem(this.buttonId);

				// get button's position
				let buttonsArray = navBar.currentSet.split(",");
				let buttonPosition = buttonsArray.indexOf(this.buttonId) + 1;

				// update button's position in preferences and save it
				Prefs.setValue("toolbarButtonPosition", buttonPosition);
				Prefs.save();
			} else {
				// temporary check for compatibility with previous version
				if (toolbarButtonPosition < 0) {
					toolbarButtonPlaceId = "addon-bar";
					toolbarButtonPosition = -toolbarButtonPosition;

					// update button's place id and position in preferences and save it
					Prefs.setValue("toolbarButtonPlaceId", toolbarButtonPlaceId);
					Prefs.setValue("toolbarButtonPosition", toolbarButtonPosition);
					Prefs.save();
				}

				let someBar = document.getElementById(toolbarButtonPlaceId);
				if (someBar) {
					let buttonsArray = someBar.currentSet.split(",");
					let before = null;

					for (let i = toolbarButtonPosition - 1; i < buttonsArray.length; i++) {
						before = document.getElementById(buttonsArray[i]);
						if (before) {
							break;
						}
					}

					someBar.insertItem(this.buttonId, before);
				}
			}
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

		let button = window.document.getElementById(this.buttonId);

		let newToolbarButtonPlaceId = "";
		let newToolbarButtonPosition = 0;

		if (button) {
			let buttonParent = button.parentNode;
			if (buttonParent.currentSet && buttonParent.id) {
				// get new button's place id
				newToolbarButtonPlaceId = buttonParent.id;

				// get new button's position
				let buttonsArray = buttonParent.currentSet.split(",");
				newToolbarButtonPosition = buttonsArray.indexOf(this.buttonId) + 1;
			}
		}

		// update button's place id and position in preferences and save them
		Prefs.setValue("toolbarButtonPlaceId", newToolbarButtonPlaceId);
		Prefs.setValue("toolbarButtonPosition", newToolbarButtonPosition);
		Prefs.save();
	};

	this.notify = function(crushedDomainsString) {
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

			if (crushedDomainsString) {
				button.setAttribute("tooltiptext", this.tooltipTexts.crushed + crushedDomainsString);
				button.style.listStyleImage = "url(" + this.skinURL + this.iconFileNames.crushed + ")";

				Utils.setTimeout(function() {
					Buttons.refresh(window);
				}, Buttons.notificationIconTimeout);
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

		if (button) {
			let domain = window.gBrowser.contentDocument.domain;

			let rawDomain = Utils.getRawDomain(domain);

			if (Prefs.getValue("suspendCrushing")) {
				button.setAttribute("tooltiptext", this.tooltipTexts.suspended);
				button.style.listStyleImage = "url(" + this.skinURL + this.iconFileNames.suspended + ")";
			} else {
				if (!rawDomain) {
					button.style.listStyleImage = "url(" + this.skinURL + this.iconFileNames.unknown + ")";
				} else if (Whitelist.isWhitelistedTemp(rawDomain)) {
					button.style.listStyleImage = "url(" + this.skinURL + this.iconFileNames.greylisted + ")";
				} else if (Whitelist.isWhitelisted(rawDomain)) {
					button.style.listStyleImage = "url(" + this.skinURL + this.iconFileNames.whitelisted + ")";
				} else {
					button.style.listStyleImage = "url(" + this.skinURL + this.iconFileNames.normal + ")";
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

		let navigatorToolbox = window.document.getElementById("navigator-toolbox");

		// customization palette seems to be beyond DOM document
		// so just try to remove it the hard way
		for (let nodeIndex in navigatorToolbox.palette.childNodes) {
			let childNode = navigatorToolbox.palette.childNodes[nodeIndex];

			if (childNode && childNode.id == this.buttonId) {
				navigatorToolbox.palette.removeChild(childNode);
			}
		}

		window.removeEventListener("aftercustomization", this.afterCustomization, false);
	};

	this.onPrefsApply = function() {
		this.refresh();
	};
};
