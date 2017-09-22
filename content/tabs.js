let EXPORTED_SYMBOLS = ["Tabs"];

let Tabs = function(Cleaner, Buttons, Utils) {
	this.onClose = function(event) {
		let uri = Utils.getURIFromTab(event.target);
		if (uri) {
			Cleaner.trackTabs(uri);
		}
	};

	this.onTabProgress = {	
		onLocationChange: function(aBrowser, aWebProgress, aRequest, aURI, aFlag) {
			if (aFlag & Components.interfaces.nsIWebProgressListener.LOCATION_CHANGE_SAME_DOCUMENT) {
				return;
			}
			try {
				if (aURI.host && aURI.scheme && (aURI.scheme == "http" || aURI.scheme == "https")) {
					if (aBrowser.previousURI && aBrowser.previousURI.host != aURI.host) {
						Cleaner.trackTabs(aBrowser.previousURI);
					}
					aBrowser["previousURI"] = aURI;
				}
			} catch(e) {}
		}
	};

	this.onProgress = {
		onLocationChange: function(aWebProgress, aRequest, aLocation, aFlag) {
			try {
				Buttons.refresh();
			} catch(e) {}
		}
	};

	this.init = function(window) {
		let tabBrowser = window.gBrowser || window.getBrowser();
		tabBrowser.tabContainer.addEventListener("TabClose", this.onClose, false);
		tabBrowser.addTabsProgressListener(this.onTabProgress);
		tabBrowser.addProgressListener(this.onProgress);
	};

	this.clear = function(window) {
		let tabBrowser = window.gBrowser;
		tabBrowser.tabContainer.removeEventListener("TabClose", this.onClose, false);
		tabBrowser.removeTabsProgressListener(this.onTabProgress);
		tabBrowser.removeProgressListener(this.onProgress);
	};
};
