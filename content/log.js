let EXPORTED_SYMBOLS = ["Log"];

Components.utils.import("resource://gre/modules/Services.jsm");

let Log = function(Prefs, Utils) {
	this.loggedMessages = [];

	this.log = function(cleanedDomainsString, scope) {
		if (Prefs.getValue("enableLogging") && cleanedDomainsString) {
			let date = new Date();
			let readableDate = date.getHours() + ":" +
							   ("0" + date.getMinutes()).slice(-2) + ":" +
							   ("0" + date.getSeconds()).slice(-2);

			let message = readableDate + " - " + cleanedDomainsString;

			this.loggedMessages.push(message);

			if (this.loggedMessages.length > 100) {
				this.loggedMessages.shift();
			}
			
			let logWindow = Services.wm.getMostRecentWindow("cookextermLogWindow");
			if (logWindow) {
				let logTextbox = logWindow.document.getElementById("logTextbox");
				if (logTextbox) {
					logTextbox.value += message + "\n\n";
					logTextbox.selectionStart = logTextbox.value.length;
				}
			}
		}
	};

	this.onEvent = {
		Log: this,
		observe: function(aSubject, aTopic, aData) {
			if (aData == "Open") {
				if (this.Log.loggedMessages.length == 0) {
					return;
				}

				let window = aSubject;
				let logTextbox = window.document.getElementById("logTextbox");
				if (logTextbox) {
					logTextbox.value = this.Log.loggedMessages.join("\n\n") + "\n\n";
					logTextbox.selectionStart = logTextbox.value.length;
				}
			} else if (aData == "Clear") {
				this.Log.loggedMessages = [];
			} else if (aData == "Fetch") {
				let window = aSubject;
				let logListbox = window.document.getElementById("logListbox");
				let whiteList = window.document.getElementById("whitelistedDomains").value.split(';');
				let greyList = window.document.getElementById("greylistedDomains").value.split(';');
				
				let rows = logListbox.getRowCount();
				for (let i = 0; i < rows; i++) {
					logListbox.removeItemAt(0);
				}

				if (this.Log.loggedMessages.length == 0) {
					return;
				}

				let loggedHosts = this.Log.loggedMessages.join(", ").split(/(\s\-\s|,\s)/);
				let loaded = [];
				for (let i = loggedHosts.length; i-- > 0; ) {
					let host = loggedHosts[i];
					if (host.indexOf(" ") != -1 || host.indexOf(":") != -1) {
						continue;
					}
					host = Utils.getBaseDomain(host);
					if (loaded.indexOf(host) == -1 && whiteList.indexOf(host) == -1 
													&& greyList.indexOf(host) == -1) {
						let item = logListbox.appendItem(Utils.ACEtoUTF8(host), host);
						item.setAttribute("type", "checkbox");
						loaded.push(host);
					}
				}
			}
		}
	};
};
