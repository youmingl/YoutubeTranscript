import { useState, useEffect, useRef } from 'react';
import './collapsible-transcript.css';
import { LoadingOutlined } from '@ant-design/icons';
import { Spin } from 'antd';
import LRUCache from './lru-cache';

const SERVER_URL = 'https://chatailab.com'
const NO_TRANSCRIPT = 'No transcript available'
const SUMMARIZE_TRANSCRIPT_SUFFIX = '/summary'
const FORMAT_TRANSCRIPT_SUFFIX = '/format'
const antIcon = <LoadingOutlined style={{ fontSize: 24 }} spin />;

const TRANSCRIPT_CACHE_SIZE = 200;
const lruCache = new LRUCache(TRANSCRIPT_CACHE_SIZE);
interface AppProps {
  url: string;
}

const CollapsibleTranscript: React.FC<AppProps> = ({ url }) => {
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState("");

  const toggleExpand = (tab: string) => {
    if (tab === activeTab) {
      setIsExpanded(!isExpanded);
    } else {
      setIsExpanded(true);
      setActiveTab(tab);
    }
  };


  const [transcripts, setTranscript] = useState<DisplayTranscriptSentence[]>([]);
  const [keyPoints, setKeyPoints] = useState<string>('');

  const [hasFormattedScript, setHasFormattedScript] = useState(false);
  const [hasKeyPointsGenerated, setHasKeyPointsGenerated] = useState(false);
  const hasRequestedFormatScript = useRef(false);
  const hasRequestedSummarizeScript = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const prevUrlRef = useRef('');
  // const prevIsExpanded = useRef(false);

  // set expanded as false when navigated to a new URL
  useEffect(() => {
    // Reset the isExpanded state if the URL changes
    if (prevUrlRef.current !== url) {
      setIsExpanded(false);
      setHasFormattedScript(false);
      setHasKeyPointsGenerated(false);
      setActiveTab("");
      hasRequestedFormatScript.current = false;
      hasRequestedSummarizeScript.current = false;
      prevUrlRef.current = url;
      // if navigated to a new video, clear state
      // prevIsExpanded.current = false;
      setTranscript([]);
      setKeyPoints('');
    }
  }, [url]);

  useEffect(() => {
    if (isExpanded && activeTab === "key-points") {
      if (hasRequestedSummarizeScript.current != true) {
        hasRequestedSummarizeScript.current = true;
        if (abortControllerRef.current) {
          // Cancel the previous fetch request
          abortControllerRef.current.abort();
        }
    
        // Create a new AbortController for the new fetch request
        abortControllerRef.current = new AbortController();
    
        (async () => {
          const cachedKeyPoints = await lruCache.get(url + SUMMARIZE_TRANSCRIPT_SUFFIX);
          if (cachedKeyPoints) {
            // let formattedSentences = deserializeList(cachedTranscript);
            setHasKeyPointsGenerated(true);
            setKeyPoints(cachedKeyPoints);
          } else {
            const subText = await fetchCaptionFromVideo(url, abortControllerRef.current!.signal);
            if (subText === NO_TRANSCRIPT) {
              setKeyPoints('');
            } else {
              summarizeTranscript(url, subText, abortControllerRef.current!.signal);
            }
          }
        })();
      }
    } else if (isExpanded && activeTab === "transcript") {
      if (hasRequestedFormatScript.current != true) {
        hasRequestedFormatScript.current = true;
          // only set if it has been expanded, so toggle off and on won't trigger this again.
        // prevIsExpanded.current = isExpanded;

        if (abortControllerRef.current) {
          // Cancel the previous fetch request
          abortControllerRef.current.abort();
        }
    
        // Create a new AbortController for the new fetch request
        abortControllerRef.current = new AbortController();
    
        (async () => {
          const cachedTranscript = await lruCache.get(url + FORMAT_TRANSCRIPT_SUFFIX);
          if (cachedTranscript) {
            let formattedSentences = deserializeList(cachedTranscript);
            setHasFormattedScript(true);
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
  }, [isExpanded, activeTab]);

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
    return transcripts.map((transcript: DisplayTranscriptSentence, index: number) => {
      let newLineBreak = <></>
      if (index!= 0 && transcript.sentence.length > 0 && transcript.sentence[0] === '\n') {
        newLineBreak = <><br /><br /></>
      }
      return <a className="transcript_link" onClick={() => jumpVideo(transcript.startTime)}>{newLineBreak}{transcript.sentence}</a>
    })
  }
    
  const summarizeTranscript = async (videoUril: string, transcript: TranscriptNode[], signal: AbortSignal) => {
    const data = { transcript: transcript };
    const url = SERVER_URL + "/summarize";
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    .then((response) => response.json())
    .then((response) => {
      const summary = response.output_text;
      // console.log(summary);
      lruCache.set(videoUril + SUMMARIZE_TRANSCRIPT_SUFFIX, summary);
      setKeyPoints(summary+'');
      // return console.log("summary:" + summary);
    })
    .catch((err) => {console.log(err)});
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
      lruCache.set(videoUril + FORMAT_TRANSCRIPT_SUFFIX, serializeList(displayTranscriptSentences));
      setHasFormattedScript(true);
      setTranscript(displayTranscriptSentences);
    })
    .catch((err) => {console.log(err)});
  }

  return (
    <div className="collapsible-container">
      <div className="collapsible-tabs">
        <button
          className={`collapsible-tab ${activeTab === "key-points" ? "active" : ""}`}
          onClick={() => toggleExpand("key-points")}
        >
          Key Points
        </button>
        <button
          className={`collapsible-tab ${activeTab === "transcript" ? "active" : ""}`}
          onClick={() => toggleExpand("transcript")}
        >
          Transcript
        </button>
      </div>
      {isExpanded && (
        <div className={`collapsible-content ${isExpanded ? "expanded" : ""}`}>
          {activeTab === "key-points" ? (
            <div className="key-points-content">
              <a>{keyPoints}</a>
            </div>
          ) : (
            <div className="transcript-content">
              <p>{renderTranscript(transcripts)}</p>
            </div>
          )}
        </div>
      )}
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