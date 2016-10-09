let EXPORTED_SYMBOLS = ["Windows"];

Components.utils.import("resource://gre/modules/Services.jsm");

let Windows = function(Tabs, Buttons, Crusher, Prefs) {
	this.windowListener = {
		onOpenWindow: function(nsIObj) {
			let domWindow = nsIObj.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
								  .getInterface(Components.interfaces.nsIDOMWindow);

			domWindow.addEventListener("load", function() {
				domWindow.removeEventListener("load", arguments.callee, false);
				domWindow.setTimeout(function() {
					if (domWindow.document.documentElement.getAttribute("windowtype") === "navigator:browser") {
						Tabs.init(domWindow);
						Buttons.init(domWindow);
					}
				}, 0, domWindow);
			}, false);
		},

		onCloseWindow: function(nsIObj) {
			let domWindow = nsIObj.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
								  .getInterface(Components.interfaces.nsIDOMWindow);

			if (domWindow.document.documentElement.getAttribute("windowtype") === "navigator:browser") {
				let windowsEnumerator = Services.wm.getEnumerator("navigator:browser");
				let windowsCounter = 0;

				while (windowsEnumerator.hasMoreElements()) {
					windowsEnumerator.getNext();
					windowsCounter++;
				}

				if (windowsCounter > 1) {
					let tabBrowser = domWindow.gBrowser;

					let domains = [];

					for (let tab of tabBrowser.tabs) {
						let browser = tab.linkedBrowser;
						let domain = browser.contentDocument.domain;

						domains.push(domain);
					}

					Crusher.prepare(domains);
				}

				Tabs.clear(domWindow);
				Buttons.clear(domWindow);
			}
		}
	};

	this.init = function(firstRun) {		  
		let windowsEnumerator = Services.wm.getEnumerator("navigator:browser");

		while (windowsEnumerator.hasMoreElements()) {
			let window = windowsEnumerator.getNext().QueryInterface(Components.interfaces.nsIDOMWindow);

			Tabs.init(window);
			Buttons.init(window, firstRun);
		}

		Services.wm.addListener(this.windowListener);
	};

	this.clear = function() {
		Crusher.prepare(null, true);

		Services.wm.removeListener(this.windowListener);

		let windowsEnumerator = Services.wm.getEnumerator("navigator:browser");

		while (windowsEnumerator.hasMoreElements()) {
			let window = windowsEnumerator.getNext().QueryInterface(Components.interfaces.nsIDOMWindow);

			Tabs.clear(window);
			Buttons.clear(window);
		}
	}
};
