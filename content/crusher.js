let EXPORTED_SYMBOLS = ["Crusher"];

Components.utils.import("resource://gre/modules/Services.jsm");

let Crusher = function(Prefs, Buttons, Whitelist, Log, Notifications, Utils) {
	let Crusher = this;

	this.handleCookieChanged = function(aSubject, aTopic, aData) {
		switch (aData) {
			case "added":
				let cookie = aSubject.QueryInterface(Components.interfaces.nsICookie2);
				Crusher.prepare(cookie);
				break;
		}
	};

	this.handleDomStorageChanged = function(aSubject, aTopic, aData) {
		let de = aSubject;
		try {
			de = de.QueryInterface(Components.interfaces.nsIDOMStorageEvent);
		} catch(e) {
			// ignore
		}

		// ignore entries that just changed
		if (de.newValue && de.oldValue) return;

		if (de.oldValue != null && de.newValue == null) {
		// entry removed
		// ignored for now
		} else {
			// entry added
			Crusher.prepareStorage(de.url);
		}
	}
	
	this.prepare = function(cookie) {
		if (!Prefs.getValue("suspendCrushing")) {
			if (cookie === true) {
				this.execute(true);
			} else {
//if (cookie) { Components.utils.reportError("[+] " + cookie.host + " : " + cookie.name); }
				Utils.setTimeout(this.execute.bind(this, cookie), Prefs.getValue("crushingDelay"));
			}
		}
	};

this.jobID = 0;

	this.prepareStorage = function(url) {
		if (!Prefs.getValue("suspendCrushing") && Prefs.getValue("keepCrushingLocalStorage")) {
			if (url === true) {
				this.executeStorage(true);
			} else {
if (url) { Components.utils.reportError("[+s] 4" + url); }
				Utils.setTimeout(this.executeStorage.bind(this, url), Prefs.getValue("crushingDelay"));
			}
		}
	}
	
	this.execute = function(onecookie) {
		let cookies = [];
		let crushedCookiesDomains = {};
		let crushedSomething = false;

		let cleanup = onecookie === true;
this.jobID++;

		if (!cleanup && onecookie) {
			cookies.push(onecookie);
		} else {
			let cookiesEnumerator = Services.cookies.enumerator;
			while (cookiesEnumerator.hasMoreElements()) {
				cookies.push(cookiesEnumerator.getNext().QueryInterface(Components.interfaces.nsICookie2));
			}
		} 

		for (let cookie of cookies) {
			if (this.mayBeCrushed(cookie, cleanup)) {
				if (typeof cookie.originAttributes === "object") {
					Services.cookies.remove(cookie.host, cookie.name, cookie.path, false, cookie.originAttributes);
				} else {
					Services.cookies.remove(cookie.host, cookie.name, cookie.path, false);
				}
				crushedSomething = true;
				crushedCookiesDomains[cookie.rawHost] = true;
//Components.utils.reportError("[" + this.jobID + "][-] " + cookie.host + " : " + cookie.name);
			} else {
//Components.utils.reportError("[" + this.jobID + "][*] " + cookie.host + " : " + cookie.name);
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
				let domain;
				try {
					domain = browser.contentDocument.domain;
				} catch(e) {}

				if (domain) {
					domain = Utils.UTF8toACE(domain);

					if (cookie.rawHost == domain ||
							cookie.isDomain && cookie.rawHost == domain.substring(domain.indexOf(".") + 1)) {
						return false;
					}
/*
					if (Prefs.getValue("keepCrushingLocalStorage")) {
						let storage;
						try {
							storage = browser.contentWindow.localStorage;
						} catch(e) {}

						if (storage) {
Components.utils.reportError("[" + this.jobID + "][-SC] " + domain + "(" + cookie.rawHost + ")");
							storage.clear();
						}
					}
*/
				}
			}
		}

		return true;
	};
	
this.jobIDs = 0;

	this.executeStorage = function(url) {
		let cleanup = url === true;
this.jobIDs++;

		if (!cleanup && url) {
Components.utils.reportError("[" + this.jobIDs + "s][*] " + url);
		}
	}
};
