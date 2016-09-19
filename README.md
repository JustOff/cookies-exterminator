## Crush Those Cookies
This is an extension for Pale Moon web browser which crushes those cookies which are no longer desirable. It simply removes cookies coming from domains which are not bound with any opened documents after specified delay. By default this also includes third-party cookies created inside such documents. Cookie crushing is triggered on changes of domains in opened tabs and also on tabs and browser's windows close. Whitelist can be used to exclude domains, subdomains or basic wildcard domains from crushing cookies of their origin. The extension comes with a toolbar menu button providing quick access to some common actions.

### Building
Pack all files (except README.md, update.rdf and build.sh) from this directory into a ZIP archive with .xpi extension. Alternatively, while on Linux, make build.sh an executable via terminal with `chmod +x build.sh` and execute it with `./build.sh`.

### Usage
Open the .xpi file with Pale Moon or drag the .xpi file inside its window and confirm installation. The menu button should appear in the toolbar. All preferences of the extension are accessible within Add-ons Manager page.

Example of manual domain whitelisting:
- adding __palemoon.&#8203;org__ to whitelisted domains will prevent removing cookies coming from palemoon.org
- adding __*.palemoon.org__ will prevent removing cookies coming from its subdomains like forum.palemoon.org or addons.palemoon.org
- adding __.palemoon.org__ will prevent removing cookies coming from both palemoon.org and its subdomains like forum.palemoon.org or addons.palemoon.org

### Notice
As this extension by default removes third-party cookies it might possibly break sessions or negatively affect browsing experience on some websites with distributed content. This may cover banking, social or any other interactive web services. Use it at your own risk.