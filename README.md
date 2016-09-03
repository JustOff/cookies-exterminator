## Crush Those Cookies
This is an extension for Pale Moon web browser which crushes those cookies which are no longer desirable. It simply removes cookies coming from domains which are not bound with any opened documents after specified delay. By default this also includes third-party cookies created inside such documents. Cookie crushing is triggered on changes of domains in opened tabs and also on tabs and browser's windows close. Whitelist can be used to exclude domains, subdomains or basic wildcard domains from crushing cookies of their origin. The extension comes with a toolbar menu button providing quick access to some common actions.

### Usage
Open the .xpi file with Pale Moon or drag the .xpi file inside its window and confirm installation. The menu button should appear in the toolbar. All preferences of the extension are accessible within Add-ons Manager page.

Example of domain whitelisting:
- adding _palemoon.&#8203;org_ to whitelisted domains will prevent removing cookies coming from palemoon.org
- adding _*.palemoon.org_ will prevent removing cookies coming from its subdomains like forum.palemoon.org or addons.palemoon.org
- adding _.palemoon.org_ will prevent removing cookies coming from both palemoon.org and its subdomains like forum.palemoon.org or addons.palemoon.org

### Notice
This is not really stable at its current state as it's driven by a very naive approach and it's generally unfinished. It should be considered more like an experiment.