## Cookies Exterminator

**How it works**

Cookies Exterminator automatically erases cookies, localStorage and IndexedDB objects when they are no longer used by open browser tabs. You don't need to use any blacklists and be concerned about how they are up to date - the unwanted data will be removed on the fly. This will help to defend browser from the most known tracking techniques used on the web and to increase privacy.

**Using the first time**

Right after installation Cookies Exterminator works in passive mode to allow to add the necessary domains to white or grey lists. They are intended for sites where you need to stay logged in as long as possible or until browser restart respectively, even without having any related open tabs. To assist this task there is separate tab in the options, named Redlist, where you can load the list of all domains that already have cookies and selectively add them to white or grey list.

To prevent the accidental loss of all your current cookies, localStorage and IndexedDB Cookies Exterminator will not allow switch to active mode until at least one domain will be added to whitelist. But once active mode will be enabled all the deleted cookies, localStorage and IndexedDB objects be gone forever and can't be recovered in any way. If you want to be safe completely, it's recommended to make backup copies of cookies.sqlite*, webappsstore.sqlite* files and storage subfolder from your profile folder before you start using Cookies Exterminator.

**Daily usage**

While running Cookies Exterminator adds the button to browser toolbar. Its state depends on the site loaded in the selected tab. In the active mode red icon in the button means that cookies, localStorage and IndexedDB objects for the site will be deleted as soon as tab will be closed or you will navigate to the new site in this tab. Green and brown icons indicate that site is in the white or grey list respectively and light red icon - that active tab does not contain the applicable site. When Cookies Exterminator works in the passive mode icons become grey, with or without the small colored dot inside. The button also has the drop-down menu where you can add or remove current site to white or grey list, open the lists of exceptions management dialog, log window, switch active mode etc.

During the removal of cookies, localStorage and IndexedDB objects Cookies Exterminator displays pop-up messages and keeps the log. These messages are quite annoying and can be disabled in the options, but it's recommended to leave them on for a while to understand what's going on. The log can be displayed in the separate window and also may be used in the options as a source for the white or grey lists.

Cookies Exterminator has embedded tool for backup and restore the configuration, including the exceptions lists. The backup file does not contain any private data and can be safely stored or used for sharing with other users.

**Warnings and restrictions**

Despite the smart algorithm used by Cookies Exterminator, it's strongly recommended to switch it temporarily into passive mode or use the dedicated private windows or tabs to conduct any financial or other sensitive transactions.

Cookies Exterminator does not protect from flash cookies (LSO), to avoid them you should not use flash plugin or install BetterPrivacy addon. Cookies Exterminator does not handle any data from private windows and tabs, because the browser does not provide any means to do so. Cookies Exterminator is incompatible with the addons who are trying to persist some cookies, such as Beef Taco or TrackerBlock.

**Other notes**

Cookies Exterminator is written in pure javascript without SDK and has no scheduled background tasks, so it runs fast, uses little memory and can be installed in either Firefox, SeaMonkey or Pale Moon. If you have used Self-Destructing Cookies addon, white and grey lists will be automatically imported from it on first run. The best browsing experience can be achieved while using Cookies Exterminator in conjunction with uBlock Origin and NoScript Security Suite addons.

**Credits**

Cookies Exterminator is inspired by Self-Destructing Cookies and is based on skeleton of Crush Those Cookies addons.
