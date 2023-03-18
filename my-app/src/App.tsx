import { useState, useEffect, useRef } from 'react';
import './App.css';
import { LoadingOutlined } from '@ant-design/icons';
import { Spin } from 'antd';
import CollapsibleTranscript from './collapsible-transcript';

const SERVER_URL = 'https://chatailab.com'
const NO_TRANSCRIPT = 'No transcript available'
const antIcon = <LoadingOutlined style={{ fontSize: 24 }} spin />;

interface AppProps {
  url: string;
}

const App: React.FC<AppProps> = ({ url }) => {
  const [transcripts, setTranscript] = useState<DisplayTranscriptSentence[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  useEffect(() => {
    if (abortControllerRef.current) {
      // Cancel the previous fetch request
      abortControllerRef.current.abort();
    }

    // Create a new AbortController for the new fetch request
    abortControllerRef.current = new AbortController();

    (async () => {
      const subText = await fetchCaptionFromVideo(url, abortControllerRef.current!.signal);
      if (subText === NO_TRANSCRIPT) {
        setTranscript([]);
      } else {
        formatTranscript(subText, abortControllerRef.current!.signal);
      }
    })();

    return () => { // Clean up the effect by aborting any ongoing requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [url]); 

  const fetchCaptionFromVideo= async (url: string, signal: AbortSignal) => {
    const text = await (await fetch(url, {signal : signal})).text();
  
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
      return await fetchCaption(baseUrl, signal);
    } else {
      return NO_TRANSCRIPT;
    }
  }
  
  const fetchCaption= async (baseUrl: string, signal: AbortSignal) => {
    let subs = await (await fetch(baseUrl, {signal: signal})).text();
    let xml = new DOMParser().parseFromString(subs, "text/xml");
    //@ts-ignore
    let textNodes = [...xml.getElementsByTagName("text")];
    let subsTextNodes = textNodes
      .map((x) => new TranscriptNode(x.textContent.replaceAll("&#39;", "'"), x.getAttribute("start")))
    return subsTextNodes;
  }
  
  const jumpVideo = (time: number) => {
    document.getElementsByTagName('video')[0].currentTime = time;
  }
  
  const renderTranscript = (transcripts: DisplayTranscriptSentence[]) => {
    return transcripts.map((transcript: DisplayTranscriptSentence) => {
      let newLineBreak = <></>
      if (transcript.sentence.length > 0 && transcript.sentence[0] === '\n') {
        newLineBreak = <><br /><br /></>
      }
      return <a className="transcript_link" onClick={() => jumpVideo(transcript.startTime)}>{newLineBreak}{transcript.sentence}</a>
    })
  }
  
  const formatTranscript = async (transcript: TranscriptNode[], signal: AbortSignal) => {
    const transcriptString = transcript.map((node: TranscriptNode) => {
      return new DisplayTranscriptSentence('\n' + node.transcript, node.startTime)
    });
    console.log('get transcript ', transcriptString.length);
    setTranscript(transcriptString);
    const data = { transcript: transcript };
    const url = SERVER_URL + "/transcript";
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      signal: signal
    })
    .then((response) => response.json())
    .then((data) => {
      return data.transcript.map((transcriptSentence: any) => new DisplayTranscriptSentence(transcriptSentence.sentence, transcriptSentence.startTime))
    })
    .then((displayTranscriptSentences: DisplayTranscriptSentence[]) => {
      setTranscript(displayTranscriptSentences);
    })
    .catch((err) => {console.log(err)});
  }

  // return (
  //   <div className="transcript-element">
  //     {transcripts.length === 0 ? <div className="transcript-loading">Loading Transcript <Spin indicator={antIcon} /></div> :
  //     <div>
  //       <p className="center">-------Transcript-------</p>
  //       <div className="transcript-content">
  //       <p>
  //         {renderTranscript(transcripts)}
  //         </p>
  //         </div>
  //         </div>
  //         }
  //   </div>
  // );

  // return (
  //   <div className="App">
  //     <CollapsibleTranscript />
  //   </div>
  // );

  return <div className="App">URL: {url}</div>;
};

class TranscriptNode {
  transcript: string;
  startTime: number;

  constructor(transcript: string, startTime: number) {
    this.transcript = transcript;
    this.startTime = startTime;
  }
}

class DisplayTranscriptSentence {
  sentence: string;
  startTime: number;

  constructor(sentence: string, startTime: number) {
    this.sentence = sentence;
    this.startTime = startTime;
  }
}

export default App;
