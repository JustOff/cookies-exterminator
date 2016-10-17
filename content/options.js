Components.utils.import("resource://gre/modules/Services.jsm");

let Imports = {};
Components.utils.import("chrome://cookies-xtrm/content/utils.js", Imports);
let Utils = new Imports.Utils();

function onWindowLoad() {
	Services.obs.notifyObservers(window, "cookextermPrefsEvent", "Load");

	Utils.updateDomainsListbox(window, "domainsListbox", "whitelistedDomains");
	Utils.updateDomainsListbox(window, "domainsListboxTemp", "whitelistedDomainsTemp");

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

	Utils.updateDomainsListbox(window, "domainsListbox", "whitelistedDomains");
	Utils.updateDomainsListbox(window, "domainsListboxTemp", "whitelistedDomainsTemp");
} 

function onApply() {
	Services.obs.notifyObservers(window, "cookextermPrefsEvent", "Apply");
	window.close();
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
	let newDomainTextbox = window.document.getElementById(domTextbox);

	if (newDomainTextbox.value != "") {
		let domainToAdd = Utils.UTF8toACE(newDomainTextbox.value);
		window.document.getElementById(listedDomains).value += ";" + domainToAdd;
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
	let newDomainTextbox = window.document.getElementById(domTextbox);

	if (selectedDomain && newDomainTextbox.value != "") {
		let domainToRemove = Utils.UTF8toACE(selectedDomain.value);
		let domainToAdd = Utils.UTF8toACE(newDomainTextbox.value);
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

		window.document.getElementById("newDomainTextbox").value = "";
		window.document.getElementById("newDomainTextboxGrey").value = "";
	}
}

function exportData() {
	Services.obs.notifyObservers(window, "cookextermPrefsEvent", "Export");
}

function importData() {
	Services.obs.notifyObservers(window, "cookextermPrefsEvent", "Import");
}
