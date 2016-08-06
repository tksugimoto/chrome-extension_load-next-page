"use strict";

chrome.storage.local.get(settings => {
	Object.keys(settings).sort().reduce((matchedSettings, key) => {
		const setting = settings[key];
		if (!setting["next-page-link"]) return matchedSettings;// 次ページリンクのSelectorが未設定
		if (!setting["target-element"]) return matchedSettings;// 対象要素のSelectorが未設定
		if (!location.href.startsWith(setting["target-url"])) return matchedSettings;
		matchedSettings.push(setting);
		return matchedSettings;
	}, []).forEach(setting => {
		const nextPageLinkSelector = setting["next-page-link"];

		function getNextUrl(doc, base = location.href) {
			const nextPageLink = doc.querySelector(nextPageLinkSelector);
			if (!nextPageLink) return null; // 次ページリンク要素が存在しない

			const nextPageUrl = nextPageLink.getAttribute("href");
			if (!nextPageUrl) return null; // 次ページリンクが存在しない
			return new URL(nextPageUrl, base).href;
		}

		if (!document.querySelector(setting["target-element"])) return "対象要素が存在しない";

		function appendElements(element) {
			const targetElements = document.querySelectorAll(setting["target-element"]);
			const lastTarget = targetElements[targetElements.length - 1];
			lastTarget.parentNode.insertBefore(element, lastTarget.nextSibling);
		}

		function createGetNextPageButton(nextPageUrl) {
			const button = document.createElement("input");
			button.type = "button";
			button.value = "次のページを読み込み";
			button.addEventListener("click", () => {
				fetch(nextPageUrl, {
					credentials: "include"
				}).then(response => {
					return response.text();
				}).then(htmlSource => {
					const parser = new DOMParser();
					const doc = parser.parseFromString(htmlSource, "text/html");
					
					const nextUrl = getNextUrl(doc, nextPageUrl);

					doc.querySelectorAll(setting["target-element"]).forEach(appendElements);
					container.parentNode.removeChild(container);
					createGetNextPageButton(nextUrl);
				});
			});

			button.title = "by Chrome拡張（右クリックで設定ページを開く）";
			button.addEventListener("contextmenu", evt => {
				chrome.runtime.sendMessage({
					method: "open-option-page"
				});
				evt.preventDefault();
			});

			const container = document.createElement("div");
			container.style.textAlign = "center";
			container.style.padding = "10px";
			container.appendChild(button);
			appendElements(container);
		}

		createGetNextPageButton(getNextUrl(document));
	});
});
