import { useState, useEffect } from 'react';
import './App.css';
import { LoadingOutlined } from '@ant-design/icons';
import { Spin } from 'antd';

const SERVER_URL = 'https://chatailab.com'
const NO_TRANSCRIPT = 'No transcript available'
const antIcon = <LoadingOutlined style={{ fontSize: 24 }} spin />;

function App() {
  const [transcript, setTranscript] = useState("");

  useEffect(() => {
    document.addEventListener("yt-navigate-finish", function (event) {
      if (isVideoPage()) {
        (async () => {
          const subText = await fetchCaptionFromVideo();
          if (subText === NO_TRANSCRIPT) {
            setTranscript(subText);
          } else {
            formatTranscript(subText);
          }
        })();
      }
    });
  }, []); 

  const isVideoPage = () => {
    let videoUrl = window.location.href;
    // Check if the URL contains "youtube.com/watch"
    if (videoUrl.includes("youtube.com/watch")) {
      // Do something
      return true;
    } else {
      return false;
    }
  }

  const fetchCaptionFromVideo= async () => {
    const url = window.location.href;
    const text = await (await fetch(url)).text();

    //@ts-ignore
    const match = text.match(
      /ytInitialPlayerResponse\s*=\s*({.+?})\s*;\s*(?:var\s+meta|<\/script|\n)/
    )[1];
    const data = JSON.parse(match);
    // todo: get subtitle of different language
    if (data.captions && data.captions.playerCaptionsTracklistRenderer) {
      const baseUrl =
      data.captions.playerCaptionsTracklistRenderer.captionTracks[0].baseUrl;
      //   console.log(`match ${baseUrl}`);
      return await fetchCaption(baseUrl);
    } else {
      return NO_TRANSCRIPT;
    }
  }

  const fetchCaption= async (baseUrl: string) => {
    let subs = await (await fetch(baseUrl)).text();
    let xml = new DOMParser().parseFromString(subs, "text/xml");
    //@ts-ignore
    let textNodes = [...xml.getElementsByTagName("text")];
    let subsText = textNodes
      .map((x) => x.textContent)
      .join("\n")
      .replaceAll("&#39;", "'");
    subsText = subsText.replace(/\n/g, " ");
    return subsText;
  }

  const formatTranscript = async (transcript: string) => {
    const data = { transcript: transcript };
    const url = SERVER_URL + "/transcript";
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    .then((response) => response.json())
    .then((data) => {
      setTranscript(data.transcript);
      console.log(
        `formatted transcript ${data.transcript} error: ${data.error}`
      );
    })
    .catch((err) => {console.log(err)});
  }

  const newlineText = (text: string) => {
    const newText = text.split('\n').map(str => <p>{str}</p>);
    
    return newText;
  }
  return (
    <div className="as-transcript">
      {transcript === '' ? <div>Loading Transcript <Spin indicator={antIcon} /></div> : <div>{newlineText(transcript)}</div>}
    </div>
  );
}

export default App;
