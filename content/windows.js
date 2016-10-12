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
					Crusher.prepare();
					Crusher.prepareStorage();
				}

				Tabs.clear(domWindow);
				Buttons.clear(domWindow);
			}
		}
	};

	this.init = function() {		  
		let windowsEnumerator = Services.wm.getEnumerator("navigator:browser");

		while (windowsEnumerator.hasMoreElements()) {
			let window = windowsEnumerator.getNext().QueryInterface(Components.interfaces.nsIDOMWindow);

			Tabs.init(window);
			Buttons.init(window);
		}

		Services.wm.addListener(this.windowListener);
	};

	this.clear = function(shutdown) {
		if (shutdown) {
			Crusher.prepare(true);
			Crusher.prepareStorage(true);
			return;
		}

		Services.wm.removeListener(this.windowListener);

		let windowsEnumerator = Services.wm.getEnumerator("navigator:browser");

		while (windowsEnumerator.hasMoreElements()) {
			let window = windowsEnumerator.getNext().QueryInterface(Components.interfaces.nsIDOMWindow);

			Tabs.clear(window);
			Buttons.clear(window);
		}
	}
};
