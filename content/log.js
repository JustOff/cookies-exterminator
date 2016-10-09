let EXPORTED_SYMBOLS = ["Log"];

let Log = function(Prefs) {
	this.loggedMessages = [];

	this.log = function(crushedDomainsString) {
		if (Prefs.getValue("enableLogging") && crushedDomainsString) {
			let date = new Date();
			let readableDate = date.getDate() + "." +
							   ("0" + (date.getMonth() + 1)).slice(-2) + "." +
							   date.getFullYear() + " " + date.getHours() + ":" +
							   ("0" + date.getMinutes()).slice(-2) + ":" +
							   ("0" + date.getSeconds()).slice(-2);

			let message = readableDate + " - crushed cookies from " +
						  crushedDomainsString;

			this.loggedMessages.push(message);
		}
	};

	this.onOpen = {
		Log: this,
		observe: function(aSubject, aTopic, aData) {
			let window = aSubject;
			let logTextbox = window.document.getElementById("logTextbox");

			if (logTextbox) {
				for (let message of this.Log.loggedMessages) {
					logTextbox.value += message + "\n\n";
				}

				logTextbox.selectionStart = logTextbox.value.length;
			}
		}
	};

	this.onClear = {
		Log: this,
		observe: function(aSubject, aTopic, aData) {
			this.Log.loggedMessages = [];
		}
	};
};
