export {}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.active) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length && isVideoPage(tabs[0].url as string)) {
                console.log({ url: tabs[0].url });
                chrome.tabs.sendMessage(tabId, {
                    action: 'urlChanged',
                    message: tabs[0].url,
                });
            }
        });
        return true; // Required to use sendResponse asynchronously


        }
  });

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
if (request.action === 'getCurrentUrl') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length > 0 && isVideoPage(tabs[0].url as string)) {
        sendResponse({ url: tabs[0].url });
    }
    });
    return true; // Required to use sendResponse asynchronously
}
});

const isVideoPage = (url: string): boolean => {
    const videoPagePattern = /^https?:\/\/(?:www\.)?youtube\.com\/watch\?(?=.*v=\w+)(?:\S+)?$/;
    return videoPagePattern.test(url);
  };