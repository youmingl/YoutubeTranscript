/*global chrome*/
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { GoogleOAuthProvider } from '@react-oauth/google';

window.onload = function() {
    document.querySelector('button')?.addEventListener('click', function() {
        var manifest = chrome.runtime.getManifest();
        var auth_url = 'https://accounts.google.com/o/oauth2/auth?';
        var client_id = encodeURIComponent(manifest.oauth2!.client_id);
        var scopes = encodeURIComponent(manifest.oauth2!.scopes!.join(' '));
        // var redirect_url = chrome.identity.getRedirectURL("oauth2.html");
        var redirect_url = encodeURIComponent(chrome.identity.getRedirectURL());
        // var redirect_url = encodeURIComponent('https://' + chrome.runtime.id + '.chromiumapp.org/provider_cb'); 

        var auth_params = {
            client_id: client_id,
            redirect_uri: redirect_url,
            access_type: 'offline',
            response_type: 'id_token',
            scope: scopes,
            login_hint: 'real_email@gmail.com' // fake or non-existent won't work
        };

        const url = new URLSearchParams(Object.entries(auth_params));
        console.log(url.toString());
        auth_url += url;

        chrome.identity.launchWebAuthFlow({url: auth_url, interactive: true}, function(responseUrl) { 
            console.log(responseUrl);
        });
    });
  };