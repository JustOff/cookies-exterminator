Components.utils.import("resource://gre/modules/Services.jsm");

function onWindowLoad() {
	Services.obs.notifyObservers(window, "cookextermPrefsLoad", null);

	updateDomainsListbox("domainsListbox", "whitelistedDomains");
	updateDomainsListbox("domainsListboxTemp", "whitelistedDomainsTemp");

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
	Services.obs.notifyObservers(window, "cookextermPrefsLoad", null);

	updateDomainsListbox("domainsListbox", "whitelistedDomains");
	updateDomainsListbox("domainsListboxTemp", "whitelistedDomainsTemp");
} 

function onApply() {
	Services.obs.notifyObservers(window, "cookextermPrefsApply", null);
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
	let domTextbox1 = window.document.getElementById("newDomainTextbox");
	let domTextbox2 = window.document.getElementById("newDomainTextboxGrey");

	if (newDomainTextbox.value != "") {
		domainsListbox.appendItem(newDomainTextbox.value, newDomainTextbox.value);
		domTextbox1.value = ""; domTextbox2.value = "";

		sortDomainsListbox(domainsListbox);
		updateWhitelistedDomains(domListbox, listedDomains);
	}
}

function onEditDomain(domListbox, domTextbox, listedDomains) {
	let domainsListbox = window.document.getElementById(domListbox);
	let selectedDomain = domainsListbox.getSelectedItem(0);
	let newDomainTextbox = window.document.getElementById(domTextbox);
	let domTextbox1 = window.document.getElementById("newDomainTextbox");
	let domTextbox2 = window.document.getElementById("newDomainTextboxGrey");

	if (selectedDomain && newDomainTextbox.value != "") {
		selectedDomain.value = newDomainTextbox.value;
		selectedDomain.label = newDomainTextbox.value;

		domTextbox1.value = ""; domTextbox2.value = "";
		domainsListbox.clearSelection();

		sortDomainsListbox(domainsListbox);
		updateWhitelistedDomains(domListbox, listedDomains);
	}
}

function onRemoveDomain(domListbox, domTextbox, listedDomains) {
	let domainsListbox = window.document.getElementById(domListbox);
	let selectedDomain = domainsListbox.getSelectedItem(0);

	if (selectedDomain) {
		let selectedDomainIndex = domainsListbox.getIndexOfItem(selectedDomain);
		let newDomainTextbox = window.document.getElementById(domTextbox);
		let domTextbox1 = window.document.getElementById("newDomainTextbox");
		let domTextbox2 = window.document.getElementById("newDomainTextboxGrey");

		domainsListbox.removeItemAt(selectedDomainIndex);
		domainsListbox.clearSelection();

		domTextbox1.value = ""; domTextbox2.value = "";

		sortDomainsListbox(domainsListbox);
		updateWhitelistedDomains(domListbox, listedDomains);
	}
}

function updateWhitelistedDomains(domListbox, listedDomains) {
	let whitelistedDomains = window.document.getElementById(listedDomains);
	whitelistedDomains.value = "";

	let domainsListbox = window.document.getElementById(domListbox);
	let rows = domainsListbox.getRowCount();

	for (let i = 0; i < rows; i++) {
		let item = domainsListbox.getItemAtIndex(i);
		whitelistedDomains.value += item.value + ";";
	}

	whitelistedDomains.value = whitelistedDomains.value.slice(0, -1);
}

function updateDomainsListbox(listbox, domains) {
	let domainsListbox = window.document.getElementById(listbox);
	let rows = domainsListbox.getRowCount();

	for (let i = 0; i < rows; i++) {
		domainsListbox.removeItemAt(0);
	}

	let whitelistedDomains = window.document.getElementById(domains);

	if (whitelistedDomains.value != "") {
		let separatedDomains = whitelistedDomains.value.split(';');

		for (let domain of separatedDomains) {
			domainsListbox.appendItem(domain, domain);
		}
	}

	sortDomainsListbox(domainsListbox);
}

function sortDomainsListbox(domainsListbox) {
	let rows = domainsListbox.getRowCount();

	for (let i = 0; i < rows; i++) {
		for (let j = rows - 1; j > i; j--) {
			let domain = domainsListbox.getItemAtIndex(i);
			let anotherDomain = domainsListbox.getItemAtIndex(j);

			if (anotherDomain.value < domain.value) {
				domain.value = anotherDomain.value;
				anotherDomain.value = domain.label;
				domain.label = domain.value;
				anotherDomain.label = anotherDomain.value;
			}
		}
	}
}

window.onload = onWindowLoad;
