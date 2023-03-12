/*global chrome*/
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { GoogleOAuthProvider } from '@react-oauth/google';

const rootElement = document.createElement("div");
rootElement.id = "full-transcript";
document.body.appendChild(rootElement);

const root = ReactDOM.createRoot(
  rootElement as HTMLElement
);

let loaded = false;

setInterval(() => {
  const player = document.querySelector(
    "#columns #primary #below #above-the-fold"
  );
  if (player && !loaded) {
    console.log("player is" + player)
    loaded = true;
    player.insertAdjacentElement("afterend", rootElement);
  }
}, 1000)

// function handleClick() {
//   console.log();

//   // chrome.identity.getAuthToken({interactive: true}, function(token) {
//   // });
// }

// root.render(
//   <React.StrictMode>
//     <App />
//   </React.StrictMode>
// );

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
