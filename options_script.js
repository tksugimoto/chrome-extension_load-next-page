const tbody = document.getElementById("tbody");

const settingEntrys = [{
	name: "対象タイトル（メモ用）",
	key: "target-title",
	allowSort: true,
	format: "Exampleニュース"
}, {
	name: "対象URL（先頭一致）",
	key: "target-url",
	allowSort: true,
	format: "http://example.com/article/",
	// 入力欄の大きさ（デフォルト値のX倍）
	sizeX: 2
}, {
	name: "対象要素",
	key: "target-element",
	format: ".pageProperty, #main, .pagenator",
	sizeX: 3
}, {
	name: "次ページのリンク要素",
	key: "next-page-link",
	format: "a.pageNext"
}, {
	name: "保存"
}, {
	name: "削除"
}];

addSettingHeader();
loadSetting().then(settings => {
	Object.keys(settings).sort().forEach(id => {
		const setting = settings[id];
		addSettingElement(id, setting);
	});
}).then(addNewSettingElement);

document.getElementById("add").addEventListener("click", addNewSettingElement);

// 設定をjson形式で書き出す
document.getElementById("share").addEventListener("click", () => {
	loadSetting().then(settings => {
		const settingArray = Object.keys(settings).map(id => settings[id]);
		const textarea = document.getElementById("share_textarea");
		textarea.value = JSON.stringify(settingArray, "", "\t");
		textarea.select();
	});
});

// json形式の設定を読み込む
document.getElementById("load").addEventListener("click", () => {
	const textarea = document.getElementById("share_textarea");
	const settingArray = JSON.parse(textarea.value);
	const baseId = Date.now();
	settingArray.forEach((setting, index) => {
		const id = String(baseId + index);
		saveSetting(setting, id).then(() => {
			addSettingElement(id, setting);
		});
	});
});

// 重複削除
document.getElementById("delete_overlap").addEventListener("click", () => {
	loadSetting().then(settings => {
		const cache = new Set();
		Object.keys(settings).map(id => {
			const setting = JSON.stringify(settings[id]);
			if (cache.has(setting)) {
				console.log("overlap: ", setting);
				removeSetting(id).then(() => {
					document.querySelector(`[data-id="${id}"]`).remove();
				});
			} else {
				cache.add(setting);
			}
		});
	})
});

function addSettingHeader() {
	const tr = document.createElement("tr");
	settingEntrys.forEach(entry => {
		const th = document.createElement("th");
		th.innerText = entry.name;
		tr.appendChild(th);
		if (entry.allowSort) {
			const sortButton = document.createElement("input");
			sortButton.type = "button";
			sortButton.value = "ソート";
			sortButton.addEventListener("click", () => {
				const elems = document.querySelectorAll(`[data-key=${entry.key}]`);
				Array.from(elems).map(elem => {
					return {
						tr: elem.closest("tr"),
						value: elem.value
					};
				}).sort(({value: a}, {value: b}) => {
					if(a < b) return 1;
					if(a > b) return -1;
					return 0;
				}).forEach(({tr}) => {
					tbody.appendChild(tr);
				});
			});
			th.appendChild(sortButton);
		}
	});
	tbody.appendChild(tr);
}

function addNewSettingElement() {
	addSettingElement();
}
function addSettingElement(id, setting) {
	const tr = document.createElement("tr");
	if (id) tr.setAttribute("data-id", id)

	const fields = settingEntrys.filter(_ => _.key).map(entry => {
		const key = entry.key;
		const td = document.createElement("td");
		const input = document.createElement("input");
		input.setAttribute("data-key", key);
		input.placeholder = entry.format;
		if (setting) input.value = setting[key];
		if (entry.sizeX) input.size *= entry.sizeX;
		td.appendChild(input);
		tr.appendChild(td);
		return {key, input}
	});
	
	{
		const button = document.createElement("input");
		button.type = "button";
		button.value = "保存";
		button.disabled = true;

		let savedValue = {};
		const changedSet = new Set();
		fields.forEach(({key, input}) => {
			savedValue[key] = input.value;
			const checkChanged = () => {
				if (savedValue[key] !== input.value) {
					changedSet.add(key);
				} else {
					changedSet.delete(key);
				}
				button.disabled = changedSet.size === 0;
			};
			input.addEventListener("change", checkChanged);
			input.addEventListener("keydown", evt => {
				// ChangeイベントはTabキーでの移動先の決定後に発火するため、移動先が保存ボタンだった場合に、disabled = falseにしても反映が間に合わない
				if (evt.key === "Tab") checkChanged();
			});
		});

		button.addEventListener("click", evt => {
			const setting = {};
			fields.forEach(({key, input}) => {
				setting[key] = input.value;
			});
			saveSetting(setting, id).then(createdId => {
				id = createdId;
				tr.setAttribute("data-id", id);

				savedValue = setting;
				changedSet.clear();
				button.disabled = true;
			});
		});

		const td = document.createElement("td");
		td.appendChild(button);
		tr.appendChild(td);
	}

	{
		const button = document.createElement("input");
		button.type = "button";
		button.value = "削除";
		button.addEventListener("click", () => {
			if (id) {
				if (window.confirm("削除しますか？")) {
					removeSetting(id).then(() => {
						tbody.removeChild(tr);
					});
				}
			} else {
				tbody.removeChild(tr);
			}
		});

		const td = document.createElement("td");
		td.appendChild(button);
		tr.appendChild(td);
	}

	tbody.appendChild(tr);
}

function loadSetting() {
	return new Promise(resolve => {
		chrome.storage.local.get(items => {
			resolve(items);
		});
	});
}

function saveSetting(setting, id = Date.now().toString()) {
	return new Promise(resolve => {
		chrome.storage.local.set({
			[id]: setting
		}, () => {
			resolve(id);
		});
	});
}

function removeSetting(id) {
	return new Promise(resolve => {
		chrome.storage.local.remove(id, resolve);
	});
}
