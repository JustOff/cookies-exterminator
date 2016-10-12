let EXPORTED_SYMBOLS = ["Crusher"];

Components.utils.import("resource://gre/modules/Services.jsm");
//Components.utils.import("resource://gre/modules/Console.jsm");

let Crusher = function(Prefs, Buttons, Whitelist, Log, Notifications, Utils) {
	this.prepare = function(cookie) {
		if (!Prefs.getValue("suspendCrushing")) {
			if (cookie === true) {
				this.execute(true);
			} else {
				Utils.setTimeout(this.execute.bind(this, cookie), Prefs.getValue("crushingDelay"));
			}
		}
	};

	this.execute = function(cookie) {
		if (cookie === true) {
			this.executeForCookies(Services.cookies.enumerator, true);
		} else if (cookie) {
			let cookies = Components.classes["@mozilla.org/array;1"]
                        .createInstance(Components.interfaces.nsIMutableArray);
			cookies.appendElement(cookie, false);
			this.executeForCookies(cookies.enumerate());
		} else {
			this.executeForCookies(Services.cookies.enumerator);
		} 
	};

this.jobID = 0;

	this.executeForCookies = function(cookiesEnumerator, cleanup) {
		let crushedSomething = false;
		let crushedCookiesDomains = {};
this.jobID++;

		while (cookiesEnumerator.hasMoreElements()) {
			let cookie = cookiesEnumerator.getNext().QueryInterface(Components.interfaces.nsICookie2);

			if (this.mayBeCrushed(cookie, cleanup)) {
				if (typeof cookie.originAttributes === "object") {
					Services.cookies.remove(cookie.host, cookie.name, cookie.path, false, cookie.originAttributes);
				} else {
					Services.cookies.remove(cookie.host, cookie.name, cookie.path, false);
				}
				crushedSomething = true;
				crushedCookiesDomains[cookie.rawHost] = true;
Components.utils.reportError("[" + this.jobID + "][-] " + cookie.host + " : " + cookie.name);
			} else {
Components.utils.reportError("[" + this.jobID + "][*] " + cookie.host + " : " + cookie.name);
			}
		}

		if (cleanup) {
			return;
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
	
	this.mayBeCrushed = function(cookie, cleanup) {
		if (Whitelist.isWhitelisted(cookie.rawHost)) {
			return false;
		}

		if (cleanup) {
			return true;
		}

		if (Whitelist.isWhitelistedTemp(cookie.rawHost) ||
			(!Prefs.getValue("keepCrushingSessionCookies") && cookie.isSession)) {
			return false;
		}

		let windowsEnumerator = Services.wm.getEnumerator("navigator:browser");

		while (windowsEnumerator.hasMoreElements()) {
			let window = windowsEnumerator.getNext().QueryInterface(Components.interfaces.nsIDOMWindow);
			let tabBrowser = window.gBrowser;

			for (let browser of tabBrowser.browsers) {
				let domain = browser.contentDocument.domain;
//				let domain = browser.contentDocument.location.host;

//console.log(browser.contentDocument);
//Components.utils.reportError("L: " + browser.contentDocument.location.host);

				if (domain) {
//				if (domain && domain != "") {
					domain = Utils.UTF8toACE(domain);

//Components.utils.reportError("?: " + domain);
					if (cookie.rawHost == domain ||
							cookie.isDomain && cookie.rawHost == domain.substring(domain.indexOf(".") + 1)) {
						return false;
					}

					if (Prefs.getValue("keepCrushingLocalStorage")) {
						let storage = browser.contentWindow.localStorage;
//						let storage = null;
//						try {
//							storage = browser.contentWindow.localStorage;
//						} catch(e) {}

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
