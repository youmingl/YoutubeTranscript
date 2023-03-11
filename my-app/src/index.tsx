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

function handleClick() {
  console.log();

  // chrome.identity.getAuthToken({interactive: true}, function(token) {
  // });
}

root.render(
  <GoogleOAuthProvider clientId="267861215901-arjt6hqgluapprlta0qv7utjpqj0opne.apps.googleusercontent.com">
        <React.StrictMode>
            <App />
        </React.StrictMode>
    </GoogleOAuthProvider>,
  // <div>
  //   <script src="https://accounts.google.com/gsi/client" async defer></script>
  //   <div id="g_id_onload"
  //       data-client_id="267861215901-arjt6hqgluapprlta0qv7utjpqj0opne.apps.googleusercontent.com"
  //       data-context="signin"
  //       data-ux_mode="popup"
  //       data-callback="handleClick"
  //       data-nonce=""
  //       data-auto_prompt="false">
  //   </div>

  //   <div class="g_id_signin"
  //       data-type="standard"
  //       data-shape="pill"
  //       data-theme="outline"
  //       data-text="signin_with"
  //       data-size="large"
  //       data-logo_alignment="left">
  //   </div>
  // </div>
  

);

// <button onClick={handleClick}>
// <script src="https://accounts.google.com/gsi/client" async defer></script>
// Sign in with Google
// </button>
// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
