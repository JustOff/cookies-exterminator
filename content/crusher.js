let EXPORTED_SYMBOLS = ["Crusher"];

Components.utils.import("resource://gre/modules/Services.jsm");

let Crusher = function(Prefs, Buttons, Whitelist, Log, Notifications, Utils) {
	this.prepare = function(domain, cleanup) {
		if (!Prefs.getValue("suspendCrushing")) {
			let timestamp = Date.now();

			if (cleanup) {
				this.execute(domain, timestamp, cleanup);
			} else {
				Utils.setTimeout(this.execute.bind(this, domain, timestamp),
								 Prefs.getValue("crushingDelay"));
			}
		}
	};

	this.execute = function(domain, timestamp, cleanup) {
		if (cleanup) {
			this.executeForCookies(Services.cookies.enumerator, timestamp, cleanup);
		} else if (Prefs.getValue("keepCrushingThirdPartyCookies")) {
			this.executeForCookies(Services.cookies.enumerator, timestamp);
		} else if (typeof domain === "string") {
			this.executeForCookies(Services.cookies.getCookiesFromHost(domain), timestamp);
		} else if (domain.constructor === Array) {
			for (let currentDomain of domain) {
				this.executeForCookies(Services.cookies.getCookiesFromHost(currentDomain), timestamp);
			}
		}
	};

	this.executeForCookies = function(cookiesEnumerator, timestamp, cleanup) {
		let crushedSomething = false;
		let crushedCookiesDomains = {};
		let checkedCookiesDomains = {};

		while (cookiesEnumerator.hasMoreElements()) {
			let cookie = cookiesEnumerator.getNext().QueryInterface(Components.interfaces.nsICookie2);

			let cookieRawDomain = Utils.getRawDomain(cookie.rawHost);

			if (!!!checkedCookiesDomains[cookieRawDomain]) {
Components.utils.reportError("HR");
Components.utils.reportError(cookie.host);
Components.utils.reportError(cookieRawDomain);
				if (this.mayBeCrushed(cookie, cookieRawDomain, timestamp, cleanup)) {
					Services.cookies.remove(cookie.host, cookie.name, cookie.path, false);
					crushedSomething = true;
					crushedCookiesDomains[cookieRawDomain] = true;
				}
				checkedCookiesDomains[cookieRawDomain] = true;
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

	this.mayBeCrushed = function(cookie, cookieRawDomain, timestamp, cleanup) {
		if (cleanup) {
			return true;
		}

		let cookieLastAccessTimestamp = cookie.lastAccessed / 1000; // cut redundant 000

		if (cookieLastAccessTimestamp > timestamp ||
			Whitelist.isWhitelisted(cookieRawDomain) ||
			Whitelist.isWhitelistedTemp(cookieRawDomain) ||
			(!Prefs.getValue("keepCrushingSessionCookies") && cookie.isSession)) {
			return false;
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

Components.utils.reportError("?");
Components.utils.reportError(rawDomain);
Components.utils.reportError(cookieRawDomain);
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
