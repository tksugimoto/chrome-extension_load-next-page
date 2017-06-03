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

		const appendElements = (() => {
			// 常に"target-element"の最後に挿入する
			// ページ読み込み時に基準位置を計算
			const targetElements = document.querySelectorAll(setting["target-element"]);
			const baseElement = targetElements[targetElements.length - 1].nextSibling;
			const containerElement = baseElement.parentNode;
			return element => {
				containerElement.insertBefore(element, baseElement);
			};
		})();

		const encoding = (() => {
			const metaCharset = document.querySelector("meta[charset]");
			if (metaCharset) return metaCharset.getAttribute("charset");

			const metaHttpEquiv = document.querySelector('meta[http-equiv="content-type"]');
			if (metaHttpEquiv) {
				const contentType = metaHttpEquiv.content;
				if (contentType.match(/charset=(.+)/i)) {
					const charset = RegExp.$1;
					return charset;
				}
			}
			return "UTF-8";
		})();

		function createGetNextPageButton(nextPageUrl) {
			if (!nextPageUrl) return;
			const button = document.createElement("input");
			button.type = "button";
			button.value = "次のページを読み込み";
			button.addEventListener("click", () => {
				button.disabled = true;
				button.value = "次のページを読み込み中";
				button.style.color = "graytext";
				fetch(nextPageUrl, {
					credentials: "include"
				}).then(response => {
					if (encoding.toUpperCase() === "UTF-8") {
						return response.text();
					} else {
						return response.blob().then(blob => {
							return new Promise(resolve => {
								const reader = new FileReader();
								reader.addEventListener("loadend", () => {
									resolve(reader.result);
								});
								reader.readAsText(blob, encoding);
							});
						});
					}
				}).then(htmlSource => {
					const parser = new DOMParser();
					const doc = parser.parseFromString(htmlSource, "text/html");

					const nextUrl = getNextUrl(doc, nextPageUrl);

					appendElements(document.createElement("hr"));
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
