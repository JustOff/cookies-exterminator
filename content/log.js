let EXPORTED_SYMBOLS = ["Log"];

Components.utils.import("resource://gre/modules/Services.jsm");

let Log = function(Prefs) {
	this.loggedMessages = [];

	this.log = function(crushedDomainsString, scope) {
		if (Prefs.getValue("enableLogging") && crushedDomainsString) {
			let date = new Date();
			let readableDate = date.getHours() + ":" +
							   ("0" + date.getMinutes()).slice(-2) + ":" +
							   ("0" + date.getSeconds()).slice(-2);

			let message = readableDate + " - " + crushedDomainsString;

			this.loggedMessages.push(message);
			
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
				let window = aSubject;
				let logTextbox = window.document.getElementById("logTextbox");
				if (logTextbox) {
					for (let message of this.Log.loggedMessages) {
						logTextbox.value += message + "\n\n";
					}
					logTextbox.selectionStart = logTextbox.value.length;
				}
			} else if (aData == "Clear") {
				this.Log.loggedMessages = [];
			}
		}
	};
};
