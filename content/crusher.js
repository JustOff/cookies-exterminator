let EXPORTED_SYMBOLS = ["Crusher"];

let Cc = Components.classes, Ci = Components.interfaces, Cu = Components.utils;

Cu.import("resource://gre/modules/Services.jsm");

let ioService = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
let securityManager = Cc["@mozilla.org/scriptsecuritymanager;1"].getService(Ci.nsIScriptSecurityManager);
let domStorageManager = Cc["@mozilla.org/dom/storagemanager;1"].getService(Ci.nsIDOMStorageManager);

let Crusher = function(Prefs, Buttons, Whitelist, Log, Notifications, Utils) {
	let Crusher = this;

	this.storageTracker = {};
	
	this.handleCookieChanged = function(aSubject, aTopic, aData) {
		switch (aData) {
			case "added":
				let cookie = aSubject.QueryInterface(Ci.nsICookie2);
				Crusher.prepare(cookie);
				break;
		}
	};

	this.handleDomStorageChanged = function(aSubject, aTopic, aData) {
		if (aTopic == "dom-storage2-changed") {
			if (aSubject.key == null) {
				// cleared
			} else if (aSubject.oldValue == null) {
				// added
				let uri = ioService.newURI(aSubject.url, null, null);
				Crusher.storageTracker[uri.scheme + "://" + uri.host + ":" + (uri.port == -1 ? 80 : uri.port)] = true;
Cu.reportError("[+s] " + uri.scheme + "://" + uri.hostPort);
			}
		}
	}
	
	this.prepare = function(cookie) {
		if (Prefs.getValue("enableProcessing")) {
			if (cookie === true) {
				this.execute(true);
			} else {
//if (cookie) { Cu.reportError("[+] " + cookie.host + " : " + cookie.name); }
				Utils.setTimeout(this.execute.bind(this, cookie), Prefs.getValue("crushingDelay"));
			}
		}
	};

	this.prepareStorage = function(host) {
		if (Prefs.getValue("enableProcessing") && Prefs.getValue("keepCrushingLocalStorage")) {
			if (host === true) {
				this.executeStorage(true);
			} else {
				Utils.setTimeout(this.executeStorage.bind(this, host), Prefs.getValue("crushingDelay"));
			}
		}
	};
this.jobID = 0;

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
				cookies.push(cookiesEnumerator.getNext().QueryInterface(Ci.nsICookie2));
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
//Cu.reportError("[" + this.jobID + "][-] " + cookie.host + " : " + cookie.name);
			} else {
//Cu.reportError("[" + this.jobID + "][*] " + cookie.host + " : " + cookie.name);
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
			Log.log(crushedCookiesDomainsString, "cookies");
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
			let window = windowsEnumerator.getNext().QueryInterface(Ci.nsIDOMWindow);
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
				}
			}
		}

		return true;
	};
this.jobIDs = 0;

	this.executeStorage = function(onehost) {
		let crushedStorageDomains = {};
		let crushedSomething = false;

		let cleanup = onehost === true;
this.jobIDs++;

//		if (cleanup) {
//		} else {
			for (let url in this.storageTracker) {
				let uri = ioService.newURI(url, null, null);
				if (this.mayBeCrushedStorage(uri.host, cleanup)) {
					if (clearStorage(uri)) {
						delete this.storageTracker[url];
						crushedStorageDomains[uri.host] = true;
						crushedSomething = true;
Cu.reportError("[" + this.jobIDs + "s][-] " + url);
					}
				} else {
Cu.reportError("[" + this.jobIDs + "s][*] " + url);
				}
			}
//		}

		if (crushedSomething) {
			let crushedStorageDomainsString = "";

			for (let domain in crushedStorageDomains) {
				crushedStorageDomainsString += domain + ", ";
			}

			crushedStorageDomainsString = crushedStorageDomainsString.slice(0, -2);

			Buttons.notify(crushedStorageDomainsString);
			Notifications.notify(crushedStorageDomainsString);
			Log.log(crushedStorageDomainsString, "storage");
		} else {
			Buttons.notify();
		}
	};

	this.mayBeCrushedStorage = function(host, cleanup) {
		if (Whitelist.isWhitelisted(host)) {
			return false;
		}

		if (cleanup) {
			return true;
		}

		if (Whitelist.isWhitelistedTemp(host)) {
			return false;
		}

		let windowsEnumerator = Services.wm.getEnumerator("navigator:browser");

		while (windowsEnumerator.hasMoreElements()) {
			let window = windowsEnumerator.getNext().QueryInterface(Ci.nsIDOMWindow);
			let tabBrowser = window.gBrowser;

			for (let browser of tabBrowser.browsers) {
				let domain;
				try {
					domain = browser.contentDocument.domain;
				} catch(e) {}

				if (domain) {
					domain = Utils.UTF8toACE(domain);

					if (host == domain) {
						return false;
					}
				}
			}
		}

		return true;
	};

	this.getScopesFromDB = function() {
		let Cc = Components.classes, Ci = Components.interfaces, Cu = Components.utils;
		let directoryService = Cc["@mozilla.org/file/directory_service;1"].getService(Ci.nsIProperties);
		let storageService = Cc["@mozilla.org/storage/service;1"].getService(Ci.mozIStorageService);
		
		try {
			// Firefox provide no API to get localstorage from all scopes, so direct access
			let dbFile = directoryService.get("ProfD", Ci.nsIFile);
			dbFile.append("webappsstore.sqlite");
			if (!dbFile) {
				return;
			}
			this.db = storageService.openDatabase(dbFile);
			if (!this.db) {
				return;
			}
			this.dbQuery = this.db.createStatement("SELECT DISTINCT scope FROM webappsstore2;");
		} catch (e) {}
		this.dbQuery.executeAsync({
			handleResult: function(aResultSet) {
				let port, scheme, host, rhost;
				try {
					for (let row = aResultSet.getNextRow(); row; row = aResultSet.getNextRow()) {
						[host, scheme, port] = row.getResultByName("scope").split(":");
						rhost = ""; for (let i = host.length - 1; i >= 0; ) { rhost += host[i--]; }
						if (rhost.startsWith(".")) { rhost = rhost.substr(1); }
						Crusher.storageTracker[scheme + "://" + rhost + ":" + port] = true;
//Cu.reportError("[i] " + scheme + "://" + rhost + ":" + port);
					}
				} catch (e) {}
			},
			handleError: function(aError) {
			},
			handleCompletion: function(aReason) {
				if (this.dbQuery) {
					this.dbQuery.finalize();
				}
				if (this.db) {
					this.db.asyncClose();
				};
			}
		});
	};
};

function clearStorage(uri) {
	try {
		let storage = getLocalStorage(uri);
		if (storage) {
			storage.clear();
			return true;
		}
	} catch(e) {}
	return false;
};

function getLocalStorage(uri) {
	let principal, storage;
	try {
		principal = securityManager.getNoAppCodebasePrincipal(uri);
		storage = domStorageManager.getLocalStorageForPrincipal(principal, null);
	} catch (e) {
		return null;
	}

	if (!storage || storage.length < 1) return null;
	return storage;
};
