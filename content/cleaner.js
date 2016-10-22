let EXPORTED_SYMBOLS = ["Cleaner"];

let Cc = Components.classes, Ci = Components.interfaces, Cu = Components.utils;

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/PrivateBrowsingUtils.jsm");

let ioService = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
let securityManager = Cc["@mozilla.org/scriptsecuritymanager;1"].getService(Ci.nsIScriptSecurityManager);
let domStorageManager = Cc["@mozilla.org/dom/storagemanager;1"].getService(Ci.nsIDOMStorageManager);

let Cleaner = function(Prefs, Buttons, Whitelist, Log, Notifications, Utils) {
	let Cleaner = this;

	this.storageTracker = {};
	
	this.handleCookieChanged = function(aSubject, aTopic, aData) {
		if (aData == "added" && aSubject instanceof Ci.nsICookie2) {
			Cleaner.prepare(aSubject);
		}
	};

	this.handleDomStorageChanged = function(aSubject, aTopic, aData) {
		if (aSubject.key != null && aSubject.oldValue == null && aSubject.url != "" && aData != "sessionStorage") {
			let uri;
			try {
				uri = ioService.newURI(aSubject.url, null, null);
			} catch(e) {
				return;
			}
			if (uri.scheme == "file") {
				return;
			}
			let port = uri.port == -1 ? (uri.scheme == "https" ? 443: 80) : uri.port;
			Cleaner.storageTracker[uri.scheme + "://" + uri.host + ":" + port] = true;
//Cu.reportError("[+s] " + uri.scheme + "://" + uri.host + ":" + port + " - " + (aData ? aData : "unknown"));
		}
	};

	this.cookiesToClean = [];

	this.cookiesCleanAll = false;

	this.prepare = function(cookie) {
		let master = false;
		if (Prefs.getValue("enableProcessing")) {
			if (cookie === "Cleanup") {
				this.execute("Cleanup");
			} else {
				if (cookie === "@") {
					if (this.cookiesCleanAll) {
						this.cookiesCleanAll = false;
						this.cookiesToClean = [];
						Utils.setTimeout(this.execute.bind(this, "CleanAll"), Prefs.getValue("cleanDelay") - 3);
					} else {
						let cookies = this.cookiesToClean;
						this.cookiesToClean = [];
						Utils.setTimeout(this.execute.bind(this, cookies), Prefs.getValue("cleanDelay") - 3);
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
		let cleanedDomains = {};
		let cleanedSomething = false;

		let cleanup = anycookies === "Cleanup";
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

		let baseDomainsInTabs = this.getBaseDomainsInTabs();

		for (let cookie of cookies) {
			if (this.mayBeCleaned(cookie.rawHost, cookie.isSession, baseDomainsInTabs, cleanup, cookie)) {
				if (typeof cookie.originAttributes === "object") {
					Services.cookies.remove(cookie.host, cookie.name, cookie.path, false, cookie.originAttributes);
				} else {
					Services.cookies.remove(cookie.host, cookie.name, cookie.path, false);
				}
				if (cookie.rawHost != "") {
					cleanedSomething = true;
					cleanedDomains[cookie.rawHost] = true;
				}
//Cu.reportError("[" + this.jobID + "][-] " + cookie.host + " : " + cookie.name);
			} else {
//Cu.reportError("[" + this.jobID + "][*] " + cookie.host + " : " + cookie.name);
			}
		}

		if (Prefs.getValue("cleanLocalStorage") && (cleanup || cleanAll)) {
			loop: for (let url in this.storageTracker) {
				let uri;
				try {
					uri = ioService.newURI(url, null, null);
				} catch(e) {
					continue loop;
				}
				if (this.mayBeCleaned(uri.host, false, baseDomainsInTabs, cleanup, false)) {
					delete this.storageTracker[url];
					if (clearStorage(uri)) {
						cleanedDomains[uri.host] = true;
						cleanedSomething = true;
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

		if (cleanedSomething) {
			let cleanedDomainsString = "";

			for (let domain in cleanedDomains) {
				cleanedDomainsString += domain + ", ";
			}

			cleanedDomainsString = cleanedDomainsString.slice(0, -2);

			Notifications.notify(cleanedDomainsString);
			Buttons.notify(cleanedDomainsString);
			Log.log(cleanedDomainsString, "cookies/storage");
		} else {
			Buttons.notify();
		}
	};
	
	this.mayBeCleaned = function(host, isSession, baseDomainsInTabs, cleanup, cookie) {
		if (Whitelist.isWhitelisted(host)) {
			return false;
		}
		if (cleanup) {
			return true;
		}
		if (Whitelist.isGreylisted(host)
					|| (isSession && !Prefs.getValue("cleanSessionCookies"))) {
			return false;
		}
		for (let domain in baseDomainsInTabs) {
//if (cookie) { Cu.reportError("[" + this.jobID + "][?] " + cookie.host + " : " + cookie.name + " ? " + domain); }
//if (!cookie) { Cu.reportError("[" + this.jobID + "s][?] " + host + " : " + domain); }
			if (Utils.getBaseDomain(host) == domain) {
				return false;
			}
		}
		return true;
	};

	this.getBaseDomainsInTabs = function() {
		let domainsInTabs = {};
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
					domainsInTabs[Utils.getBaseDomain(Utils.UTF8toACE(domain))] = true;
				}
			}
		}
		return domainsInTabs;
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
						if (port != "file") {
							rhost = ""; for (let i = host.length - 1; i >= 0; ) { rhost += host[i--]; }
							if (rhost.startsWith(".")) { rhost = rhost.substr(1); }
							Cleaner.storageTracker[scheme + "://" + rhost + ":" + port] = true;
						}
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
