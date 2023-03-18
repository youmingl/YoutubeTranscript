import { useState, useEffect } from 'react';

import React from 'react';
import ReactDOM from 'react-dom';
// import App from './App';
import CollapsibleTranscript from './collapsible-transcript';

const injectApp = (url: string) => {
    const targetElement = document.querySelector('#columns #primary #below #above-the-fold');
    console.log('render url targetElement', targetElement);

    if (!targetElement) return;
    let transcriptDiv = document.getElementById('transcript-element');
    if (!transcriptDiv) {
        transcriptDiv = document.createElement('div');
        transcriptDiv.id = 'transcript-element'
        targetElement.insertAdjacentElement('beforebegin', transcriptDiv);
    }

    ReactDOM.render(<CollapsibleTranscript url={url} />, transcriptDiv);
};

const requestCurrentUrl = (): Promise<string> => {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'getCurrentUrl' }, (response) => {
        resolve(response.url || '');
      });
    });
  };

// handle url change within tab
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'urlChanged') {
      let url = request.message;
      console.log(url);
    injectApp(url);
  }
});

// handle first page load or refresh, request the url from background.js
document.addEventListener("yt-navigate-finish", function (event) {
    (async () => {
        const currentUrl = await requestCurrentUrl();
        console.log('request current Url ', currentUrl);
        injectApp(currentUrl);
      })();
  });