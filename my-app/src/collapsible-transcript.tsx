import { useState, useEffect, useRef } from 'react';
import './collapsible-transcript.css';
import { LoadingOutlined } from '@ant-design/icons';
import { Spin } from 'antd';
import LRUCache from './lru-cache';

const SERVER_URL = 'https://chatailab.com'
const NO_TRANSCRIPT = 'No transcript available'
const antIcon = <LoadingOutlined style={{ fontSize: 24 }} spin />;

const TRANSCRIPT_CACHE_SIZE = 200;
const lruCache = new LRUCache(TRANSCRIPT_CACHE_SIZE);
interface AppProps {
  url: string;
}

const CollapsibleTranscript: React.FC<AppProps> = ({ url }) => {
  
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const [transcripts, setTranscript] = useState<DisplayTranscriptSentence[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  const prevUrlRef = useRef('');
  const prevIsExpanded = useRef(false);

  // set expanded as false when navigated to a new URL
  useEffect(() => {
    // Reset the isExpanded state if the URL changes
    if (prevUrlRef.current !== url) {
      setIsExpanded(false);
      prevUrlRef.current = url;
      // if navigated to a new video, clear state
      prevIsExpanded.current = false;
      setTranscript([]);
    }
  }, [url]);

  useEffect(() => {
    if (prevIsExpanded.current !== isExpanded) {
      if (isExpanded) {
        // only set if it has been expanded, so toggle off and on won't trigger this again.
        prevIsExpanded.current = isExpanded;

        if (abortControllerRef.current) {
          // Cancel the previous fetch request
          abortControllerRef.current.abort();
        }
    
        // Create a new AbortController for the new fetch request
        abortControllerRef.current = new AbortController();
    
        (async () => {
          const cachedTranscript = await lruCache.get(url);
          if (cachedTranscript) {
            let formattedSentences = deserializeList(cachedTranscript);
            setTranscript(formattedSentences);
          } else {
            const subText = await fetchCaptionFromVideo(url, abortControllerRef.current!.signal);
            if (subText === NO_TRANSCRIPT) {
              setTranscript([]);
            } else {
              formatTranscript(url, subText, abortControllerRef.current!.signal);
            }
          }
        })();
      }
    }
    
    // return () => { // Clean up the effect by aborting any ongoing requests
    //   if (abortControllerRef.current && shouldAbort) {
    //     abortControllerRef.current.abort();
    //   }
    // };
  }, [isExpanded]); 

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
  
  const formatTranscript = async (videoUril: string, transcript: TranscriptNode[], signal: AbortSignal) => {
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
      lruCache.set(videoUril, serializeList(displayTranscriptSentences));
      setTranscript(displayTranscriptSentences);
    })
    .catch((err) => {console.log(err)});
  }

  return (
    <div className="collapsible-container">
      <div className="collapsible-header" onClick={toggleExpand}>
        <span className="arrow">{isExpanded ? '▼' : '▶'}</span>
        <span className="title">{isExpanded ? 'Hide Transcript' : 'Show Transcript'}</span>
      </div>
      <div className={`collapsible-content ${isExpanded ? 'expanded' : ''}`}>
        <div className="transcript-element">
        {transcripts.length === 0 ? <div className="transcript-loading">Loading Transcript <Spin indicator={antIcon} /></div> :
        <div>
          <div className="transcript-content">
          <p>
            {renderTranscript(transcripts)}
            </p>
            </div>
            </div>
            }
      </div>
      </div>
    </div>
  );
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

  // Serialize the instance properties to a JSON string
  serialize(): string {
    const data = {
      sentence: this.sentence,
      startTime: this.startTime,
    };
    return JSON.stringify(data);
  }

  // Deserialize a JSON string to create a new instance of DisplayTranscriptSentence
  static deserialize(jsonString: string): DisplayTranscriptSentence {
    const data = JSON.parse(jsonString);
    return new DisplayTranscriptSentence(data.sentence, data.startTime);
  }
}

// Serialize a list of DisplayTranscriptSentence objects
function serializeList(sentences: DisplayTranscriptSentence[]): string {
  const serializedList = sentences.map((sentence) => sentence.serialize());
  return JSON.stringify(serializedList);
}

// Deserialize a JSON string to create a list of DisplayTranscriptSentence objects
function deserializeList(jsonString: string): DisplayTranscriptSentence[] {
  const serializedList = JSON.parse(jsonString) as string[];
  const sentences = serializedList.map((serializedSentence) =>
    DisplayTranscriptSentence.deserialize(serializedSentence)
  );
  return sentences;
}


export default CollapsibleTranscript;