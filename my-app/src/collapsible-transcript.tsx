import { useState, useEffect, useRef } from 'react';
import React from 'react';
import './collapsible-transcript.css';
import { LoadingOutlined } from '@ant-design/icons';
import { Spin } from 'antd';
import LRUCache from './lru-cache';

const SERVER_URL = 'https://chatailab.com'
// const SERVER_URL = 'http://localhost:12345'

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

  const [keyPointsLoading, setKeyPointsLoading] = useState(false);
  const [transcriptFormatting, setTranscriptFormatting] = useState(false);

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
      setActiveTab("");
      setTranscriptFormatting(false);
      setKeyPointsLoading(false);
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
        setKeyPointsLoading(true);
        (async () => {
          const cachedKeyPoints = await lruCache.get(url + SUMMARIZE_TRANSCRIPT_SUFFIX);
          if (cachedKeyPoints) {
            // let formattedSentences = deserializeList(cachedTranscript);
            setKeyPointsLoading(false);
            setKeyPoints(cachedKeyPoints);
          } else {
            const subText = await fetchCaptionFromVideo(url, abortControllerRef.current!.signal);
            if (subText.transcript.length === 0) {
              setKeyPoints('No Transcript available.');
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

        setTranscriptFormatting(true);
    
        // Create a new AbortController for the new fetch request
        abortControllerRef.current = new AbortController();
    
        (async () => {
          const cachedTranscript = await lruCache.get(url + FORMAT_TRANSCRIPT_SUFFIX);
          if (cachedTranscript) {
            let formattedSentences = deserializeList(cachedTranscript);
            setKeyPointsLoading(false);
            setTranscriptFormatting(false);
            setTranscript(formattedSentences);
          } else {
            const subText = await fetchCaptionFromVideo(url, abortControllerRef.current!.signal);
            if (subText.transcript.length === 0) {
              setTranscript([]);
            } else {
              formatTranscript(url, subText, abortControllerRef.current!.signal);
            }
          }
        })();

      }
    }
  }, [isExpanded, activeTab]);

  interface CaptionTrack {
    baseUrl: string;
    name: {
      simpleText: string;
    };
    vssId: string;
    languageCode: string;
    isTranslatable: boolean;
  }

  interface CaptionResult {
    transcript: TranscriptNode[];
    language: string;
  }

  const fetchCaptionFromVideo= async (url: string, signal: AbortSignal): Promise<CaptionResult> => {
    const text = await (await fetch(url, {signal : signal})).text();
  
    //@ts-ignore
    const match = text.match(
      /ytInitialPlayerResponse\s*=\s*({.+?})\s*;\s*(?:var\s+meta|<\/script|\n)/
    )[1];
    const data = JSON.parse(match);
    // todo: get subtitle of different language
    // console.log(`match ${match}`);

    if (data.captions && data.captions.playerCaptionsTracklistRenderer) {

      // Extract the baseUrl for the captionTrack with languageCode="en" or "cn"
      const captionTracks: CaptionTrack[] = data.captions.playerCaptionsTracklistRenderer.captionTracks;
      const trackEn = captionTracks.find(track => track.languageCode === "en");
      const trackCn = captionTracks.find(track => track.languageCode === "zh-Hans");
      const defaultTr = captionTracks[0];
      const selectedTrack = (trackEn || trackCn || defaultTr);
      const language = selectedTrack?.languageCode;
      const baseUrl = selectedTrack?.baseUrl;
      if (baseUrl != null) {
        //   console.log(`match ${baseUrl}`);
        return await fetchCaption(baseUrl, language, signal);
      } else {
        return {transcript: [], language: "" };
      }
    } else {
      return {transcript: [], language: "" };
    }
  }
  
  const fetchCaption= async (baseUrl: string, language: string, signal: AbortSignal): Promise<CaptionResult>  => {
    let subs = await (await fetch(baseUrl, {signal: signal})).text();
    let xml = new DOMParser().parseFromString(subs, "text/xml");
    //@ts-ignore
    let textNodes = [...xml.getElementsByTagName("text")];
    let subsTextNodes = textNodes
      .map((x) => new TranscriptNode(x.textContent.replaceAll("&#39;", "'"), x.getAttribute("start")))
    return { transcript: subsTextNodes, language };
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
    
  const summarizeTranscript = async (videoUril: string, captionResult: CaptionResult, signal: AbortSignal) => {
    const data = { transcript: captionResult.transcript, language: captionResult.language};
    const url = SERVER_URL + "/summarize";
    console.log(JSON.stringify(data));

    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    .then((response) => response.json())
    .then((response) => {
      let index = 0;
      const summary = response.output_text.replace(/- /g, () => {
        index += 1;
        return `\n${index}. `;
      });
      lruCache.set(videoUril + SUMMARIZE_TRANSCRIPT_SUFFIX, summary);
      setKeyPointsLoading(false);
      setKeyPoints(summary+'');
      // return console.log("summary:" + summary);
    })
    .catch((err) => {console.log(err)});
  }
  
  const formatTranscript = async (videoUril: string, captionResult: CaptionResult, signal: AbortSignal) => {
    const transcriptString = captionResult.transcript.map((node: TranscriptNode) => {
      return new DisplayTranscriptSentence('\n' + node.transcript, node.startTime)
    });
    console.log('get transcript ', transcriptString.length);
    setTranscript(transcriptString);
    const data = { transcript: captionResult, language: captionResult.language };
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
      setTranscriptFormatting(false);
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
            {keyPointsLoading ? (
              <div className="loading-spinner">
                 <span className="loading-text">Generating Summary... </span>
                <Spin className="loading-spinner" indicator={antIcon} />
              </div>
            ) : (
              <p>
              {keyPoints.split('\n').map((line, index) => (
                <React.Fragment key={index}>
                  {index > 0 && <br />}
                  {line}
                </React.Fragment>
              ))}
            </p>
          )}
        </div>
          ) : (
            <div className="transcript-content">
              {transcriptFormatting ? (
              <div className="loading-spinner">
                 <span className="loading-text">Formatting Transcript... </span>
                <Spin className="loading-spinner" indicator={antIcon} />
              </div>
            ) : (<></>) }
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