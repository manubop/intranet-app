chrome.action.onClicked.addListener((tab) => {
	/*chrome.scripting.executeScript({
    	target: { tabId: tab.id },
    	files: ['scripts/jquery-3.6.0.min.js']
  	});*/
  	/*chrome.tabs.executeScript({
        file: 'scripts/jquery-3.6.0.min.js'
    });*/
	chrome.tabs.create({"url": "main.html"});
})