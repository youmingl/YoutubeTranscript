import { useState, useEffect } from 'react';
import { LoadingOutlined } from '@ant-design/icons';
import { Spin } from 'antd';
import { GoogleLogin } from '@react-oauth/google';

// chrome.action.onClicked.addListener(function() {
//     chrome.tabs.create({url: 'scripts/index.html'});
//   });