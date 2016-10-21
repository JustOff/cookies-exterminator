Components.utils.import("resource://gre/modules/Services.jsm");

let Imports = {};
Components.utils.import("chrome://cookies-xtrm/content/utils.js", Imports);
let Utils = new Imports.Utils();

function onWindowLoad() {
	Services.obs.notifyObservers(window, "cookextermPrefsEvent", "Load");

	Utils.updateDomainsListbox(window, "domainsWhitelistBox", "whitelistedDomains");
	Utils.updateDomainsListbox(window, "domainsGreylistBox", "greylistedDomains");

	let tabbox = window.document.getElementById("tabbox");

	if (window.arguments && window.arguments[0] == "whitelist") {
		let tab = window.document.getElementById("whitelistTab");
		let tabpanel = window.document.getElementById("whitelistTabpanel");

		tabbox.selectedTab = tab;
		tabbox.selectedPanel = tabpanel;
	} else {
		let tab = window.document.getElementById("generalTab");
		let tabpanel = window.document.getElementById("generalTabpanel");

		tabbox.selectedTab = tab;
		tabbox.selectedPanel = tabpanel;
	}
}

function onReset() {
	Services.obs.notifyObservers(window, "cookextermPrefsEvent", "Load");

	Utils.updateDomainsListbox(window, "domainsWhitelistBox", "whitelistedDomains");
	Utils.updateDomainsListbox(window, "domainsGreylistBox", "greylistedDomains");
} 

function onApply() {
	if (checkWhitelistEmpty()) {
		Services.obs.notifyObservers(window, "cookextermPrefsEvent", "Apply");
		window.close();
	}
}

function onSelect(domainsListbox) {
	let selectedDomain = domainsListbox.getSelectedItem(0);

	if (selectedDomain) {
		let newDomainTextbox = window.document.getElementById("newDomainTextbox");
		let newDomainTextboxGrey = window.document.getElementById("newDomainTextboxGrey");

		newDomainTextbox.value = selectedDomain.value;
		newDomainTextboxGrey.value = selectedDomain.value;
	}
}

function onAddDomain(domListbox, domTextbox, listedDomains) {
	let domainsListbox = window.document.getElementById(domListbox);
	let domainToAdd = window.document.getElementById(domTextbox).value.trim();

	if (domainToAdd != "") {
		domainToAdd = Utils.UTF8toACE(domainToAdd);
		let separatedDomains = window.document.getElementById(listedDomains).value.split(';');
		if (separatedDomains.indexOf(domainToAdd) != -1) {
			return;
		}
		let domString = window.document.getElementById(listedDomains).value;
		if (domString == "") {
			window.document.getElementById(listedDomains).value = domainToAdd;
		} else {
			window.document.getElementById(listedDomains).value = domString + ";" + domainToAdd;
		}
		Utils.updateDomainsListbox(window, domListbox, listedDomains);
		separatedDomains = Utils.updateDomainsListbox(window, domListbox, listedDomains);
		domainsListbox.ensureIndexIsVisible(separatedDomains.indexOf(domainToAdd));

		window.document.getElementById("newDomainTextbox").value = "";
		window.document.getElementById("newDomainTextboxGrey").value = "";
	}
}

function onEditDomain(domListbox, domTextbox, listedDomains) {
	let domainsListbox = window.document.getElementById(domListbox);
	let selectedDomain = domainsListbox.getSelectedItem(0);
	let domainToAdd = window.document.getElementById(domTextbox).value.trim();

	if (selectedDomain && domainToAdd != "") {
		let domainToRemove = Utils.UTF8toACE(selectedDomain.value);
		domainToAdd = Utils.UTF8toACE(domainToAdd);
		let separatedDomains =  window.document.getElementById(listedDomains).value.split(';');
		let domains = [];
		for (let domain of separatedDomains) {
			if (domain != domainToRemove) {
				domains.push(domain);
			} else {
				domains.push(domainToAdd);
			}
		}
		window.document.getElementById(listedDomains).value = domains.join(';');
		separatedDomains = Utils.updateDomainsListbox(window, domListbox, listedDomains);
		domainsListbox.ensureIndexIsVisible(separatedDomains.indexOf(domainToAdd));

		window.document.getElementById("newDomainTextbox").value = "";
		window.document.getElementById("newDomainTextboxGrey").value = "";
	}
}

function onRemoveDomain(domListbox, domTextbox, listedDomains) {
	let domainsListbox = window.document.getElementById(domListbox);
	let selectedDomain = domainsListbox.getSelectedItem(0);

	if (selectedDomain) {
		let visibleIndex = domainsListbox.getIndexOfFirstVisibleRow() + domainsListbox.getNumberOfVisibleRows() - 1;
		let domainToRemove = Utils.UTF8toACE(selectedDomain.value);
		let separatedDomains =  window.document.getElementById(listedDomains).value.split(';');
		let domains = [];
		for (let domain of separatedDomains) {
			if (domain != domainToRemove) {
				domains.push(domain);
			}
		}
		window.document.getElementById(listedDomains).value = domains.join(';');
		Utils.updateDomainsListbox(window, domListbox, listedDomains);
		domainsListbox.ensureIndexIsVisible(visibleIndex < domains.length ? visibleIndex : domains.length - 1);
	}
}

function exportData() {
	Services.obs.notifyObservers(window, "cookextermPrefsEvent", "Export");
}

function importData() {
	Services.obs.notifyObservers(window, "cookextermPrefsEvent", "Import");
}

function loadRedlist() {
	let redListbox = window.document.getElementById("redListbox");

	let rows = redListbox.getRowCount();
	for (let i = 0; i < rows; i++) {
		redListbox.removeItemAt(0);
	}
	
	let whiteList = window.document.getElementById("whitelistedDomains").value.split(';');
	let greyList = window.document.getElementById("greylistedDomains").value.split(';');
	
	let hosts = [];
	let cookiesEnumerator = Services.cookies.enumerator;
	while (cookiesEnumerator.hasMoreElements()) {
		let cookie = cookiesEnumerator.getNext().QueryInterface(Components.interfaces.nsICookie2);
		let host = Utils.getBaseDomain(cookie.rawHost);
		if (hosts.indexOf(host) == -1 && whiteList.indexOf(host) == -1 && greyList.indexOf(host) == -1) {
			hosts.push(host);
		}
	}

	hosts.sort();

	for (let host of hosts) {
		let item = redListbox.appendItem(Utils.ACEtoUTF8(host), host);
		item.setAttribute("type", "checkbox");
	}
}

function loadLog() {
	Services.obs.notifyObservers(window, "cookextermLogEvent", "Fetch");
}

function addToList(domListbox, listedDomains, srcListId) {
	let srcListbox = window.document.getElementById(srcListId);
	let hosts = [];
	let domString = window.document.getElementById(listedDomains).value;
	if (domString != "") {
		hosts = domString.split(';');
	}

	let rows = srcListbox.getRowCount();
	for (let i = 0; i < rows; i++) {
		let item = srcListbox.getItemAtIndex(i);
		if (item.checked && hosts.indexOf(item.value) == -1) {
			hosts.push(item.value);
		}
	}

	window.document.getElementById(listedDomains).value = hosts.join(';');
	Utils.updateDomainsListbox(window, domListbox, listedDomains);
	if (srcListId == "redListbox") {
		loadRedlist();
	} else {
		loadLog();
	}
}

function checkWhitelistEmpty() {
	let enabledBox = window.document.getElementById("enableProcessing");
	if (enabledBox.checked && window.document.getElementById("whitelistedDomains").value == "") {
		enabledBox.removeAttribute("checked");
		Utils.alert(Utils.translate("AModeOff"));
		return false;
	}
	return true;
}
