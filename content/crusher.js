let EXPORTED_SYMBOLS = ["Crusher"];

let Cc = Components.classes, Ci = Components.interfaces, Cu = Components.utils;

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/PrivateBrowsingUtils.jsm");

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
				let port = uri.port == -1 ? (uri.scheme == "https" ? 443: 80) : uri.port;
				Crusher.storageTracker[uri.scheme + "://" + uri.host + ":" + port] = true;
//Cu.reportError("[+s] " + uri.scheme + "://" + uri.host + ":" + port);
			}
		}
	};

	this.cookiesToClean = [];

	this.cookiesCleanAll = false;

	this.prepare = function(cookie) {
		let master = false;
		if (Prefs.getValue("enableProcessing")) {
			if (cookie === true) {
				this.execute(true);
			} else {
				if (cookie === "@") {
					if (this.cookiesCleanAll) {
						this.cookiesCleanAll = false;
						this.cookiesToClean = [];
						Utils.setTimeout(this.execute.bind(this, "CleanAll"), Prefs.getValue("crushingDelay") - 3);
					} else {
						let cookies = this.cookiesToClean;
						this.cookiesToClean = [];
						Utils.setTimeout(this.execute.bind(this, cookies), Prefs.getValue("crushingDelay") - 3);
					}
				} else {
					master = !this.cookiesCleanAll && this.cookiesToClean.length == 0;
					if (cookie) {
//Cu.reportError("[+] " + cookie.host + " : " + cookie.name);
						this.cookiesToClean.push(cookie);
					} else {
						this.cookiesCleanAll = true;
					}
					if (master) {
						Utils.setTimeout(this.prepare.bind(this, "@"), 3);
					}
				}
			}
		}
	};

//this.jobID = 0;
	this.execute = function(anycookies) {
		let cookies = [];
		let crushedDomains = {};
		let crushedSomething = false;

		let cleanup = anycookies === true;
		let cleanAll = anycookies === "CleanAll";
//this.jobID++;

		if (cleanup || cleanAll) {
			let cookiesEnumerator = Services.cookies.enumerator;
			while (cookiesEnumerator.hasMoreElements()) {
				cookies.push(cookiesEnumerator.getNext().QueryInterface(Ci.nsICookie2));
			}
		} else {
			cookies = anycookies;
		} 

		for (let cookie of cookies) {
			if (this.mayBeCrushedCookie(cookie, cleanup)) {
				if (typeof cookie.originAttributes === "object") {
					Services.cookies.remove(cookie.host, cookie.name, cookie.path, false, cookie.originAttributes);
				} else {
					Services.cookies.remove(cookie.host, cookie.name, cookie.path, false);
				}
				crushedSomething = true;
				crushedDomains[cookie.rawHost] = true;
//Cu.reportError("[" + this.jobID + "][-] " + cookie.host + " : " + cookie.name);
			} else {
//Cu.reportError("[" + this.jobID + "][*] " + cookie.host + " : " + cookie.name);
			}
		}

		if (cleanup || cleanAll) {
			for (let url in this.storageTracker) {
				let uri = ioService.newURI(url, null, null);
				if (this.mayBeCrushedStorage(uri.host, cleanup)) {
					if (clearStorage(uri)) {
						delete this.storageTracker[url];
						crushedDomains[uri.host] = true;
						crushedSomething = true;
//Cu.reportError("[" + this.jobID + "s][-] " + url);
					}
				} else {
//Cu.reportError("[" + this.jobID + "s][*] " + url);
				}
			}
		}

		if (cleanup) {
			return;
		}

		if (crushedSomething) {
			let crushedDomainsString = "";

			for (let domain in crushedDomains) {
				crushedDomainsString += domain + ", ";
			}

			crushedDomainsString = crushedDomainsString.slice(0, -2);

			Notifications.notify(crushedDomainsString);
			Buttons.notify(crushedDomainsString);
			Log.log(crushedDomainsString, "cookies/storage");
		} else {
			Buttons.notify();
		}
	};
	
	this.mayBeCrushedCookie = function(cookie, cleanup) {
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

		loop1: while (windowsEnumerator.hasMoreElements()) {
			let window = windowsEnumerator.getNext().QueryInterface(Ci.nsIDOMWindow);

			if (PrivateBrowsingUtils.isWindowPrivate(window)) {
				continue loop1;
			}

			let tabBrowser = window.gBrowser;
			loop2: for (let tab of tabBrowser.tabs) {
//Cu.reportError(tab.linkedBrowser.currentURI.spec);
				if (window.privateTab && window.privateTab.isTabPrivate(tab)) {
					continue loop2;
				}
				let domain;
				try {
					domain = tab.linkedBrowser.contentDocument.domain;
				} catch(e) {}

				if (domain) {
//Cu.reportError("[" + this.jobID + "][?] " + cookie.host + " : " + cookie.name + " ? " + domain);
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

		loop1: while (windowsEnumerator.hasMoreElements()) {
			let window = windowsEnumerator.getNext().QueryInterface(Ci.nsIDOMWindow);

			if (PrivateBrowsingUtils.isWindowPrivate(window)) {
				continue loop1;
			}

			let tabBrowser = window.gBrowser;

			loop2: for (let tab of tabBrowser.tabs) {
				if (window.privateTab && window.privateTab.isTabPrivate(tab)) {
					continue loop2;
				}
				let domain;
				try {
					domain = tab.linkedBrowser.contentDocument.domain;
				} catch(e) {}

				if (domain) {
//Cu.reportError("[" + this.jobIDs + "s][?] " + host + " ? " + domain);
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
		}
		return true;
	} catch(e) {
		return false;
	}
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
