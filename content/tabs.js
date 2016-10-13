let EXPORTED_SYMBOLS = ["Tabs"];

let Tabs = function(Crusher, Buttons) {
	this.onClose = function(event) {
		let tab = event.target;
		let browser = tab.linkedBrowser;
		let domain = browser.contentDocument.domain;

		if (domain) {
			Crusher.prepare();
			Crusher.prepareStorage();
		}
	};

	this.onTabProgress = {	
		onLocationChange: function(aBrowser, aWebProgress, aRequest, aURI, aFlag) {
			if (aFlag & Components.interfaces.nsIWebProgress.LOCATION_CHANGE_SAME_DOCUMENT) {
				return;
			}

			let domain = aBrowser.contentDocument.domain;
			if (domain) {
				let previousDomain = aBrowser.previousDomain;
				if (previousDomain != domain) {
					Crusher.prepare();
					Crusher.prepareStorage();
				}

				aBrowser["previousDomain"] = domain;
			}
		}
	};

	this.onProgress = {
		onLocationChange: function(aWebProgress, aRequest, aLocation, aFlag) {
			if (aFlag & Components.interfaces.nsIWebProgress.LOCATION_CHANGE_SAME_DOCUMENT) {
				return;
			}

			Buttons.refresh();
		}
	};

	this.init = function(window) {
		let tabBrowser = window.gBrowser;

		tabBrowser.tabContainer.addEventListener("TabClose", this.onClose, false);
		tabBrowser.addTabsProgressListener(this.onTabProgress);
		tabBrowser.addProgressListener(this.onProgress);
	};

	this.clear = function(window) {
		let tabBrowser = window.gBrowser;

		for (let tab of tabBrowser.tabs) {
			let browser = window.gBrowser.getBrowserForTab(tab);
			browser["previousDomain"] = undefined;
		}

		tabBrowser.tabContainer.removeEventListener("TabClose", this.onClose, false);
		tabBrowser.removeTabsProgressListener(this.onTabProgress);
		tabBrowser.removeProgressListener(this.onProgress);
	};
};
