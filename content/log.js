let EXPORTED_SYMBOLS = ["Log"];

let Log = function(Prefs) {
	this.loggedMessages = [];

	this.log = function(crushedDomainsString, scope) {
		if (Prefs.getValue("enableLogging") && crushedDomainsString) {
			let date = new Date();
			let readableDate = date.getDate() + "." +
							   ("0" + (date.getMonth() + 1)).slice(-2) + "." +
							   date.getFullYear() + " " + date.getHours() + ":" +
							   ("0" + date.getMinutes()).slice(-2) + ":" +
							   ("0" + date.getSeconds()).slice(-2);

			let message = readableDate + " - cleaned " + scope + " from " +
						  crushedDomainsString;

			this.loggedMessages.push(message);
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
