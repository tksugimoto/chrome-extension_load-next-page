"use strict";
chrome.runtime.onMessage.addListener((request, sender) => {
	if (request.method === "open-option-page") {
		chrome.tabs.create({
			url: chrome.runtime.getURL("options.html"),
			openerTabId: sender.tab.id
		});
	}
});
