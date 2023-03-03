const tag = "Transcript:";

document.addEventListener("yt-navigate-finish", function (event) {
  if (isVideoPage()) {
    (async () => {
      const subText = await fetchCaptionFromVideo();
      formatTranscript(subText);
      insertTranscript(subText);
    })();
  }
});

function getVideoId() {
  // Get the current YouTube video URL
  let videoUrl = window.location.href;

  // Extract the video ID from the URL
  let videoId = videoUrl.split("v=")[1];

  // Check if there is an ampersand after the video ID (which separates the ID from other parameters)
  if (videoId.includes("&")) {
    videoId = videoId.split("&")[0];
  }

  // Log the video ID to the console
  //   console.log(`${tag} ${videoId}`);
  return videoId;
}

function isVideoPage() {
  let videoUrl = window.location.href;
  // Check if the URL contains "youtube.com/watch"
  if (videoUrl.includes("youtube.com/watch")) {
    // Do something
    return true;
  } else {
    return false;
  }
}

function insertTranscript(captionsText) {
  const player = document.querySelector(
    "#columns #primary #below #above-the-fold"
  );

  // `document.querySelector` may return null if the selector doesn't match anything.
  if (player) {
    let badgeId = "full-transcript";

    const previousBadge = document.getElementById(badgeId);
    if (previousBadge) {
      previousBadge.remove();
    }
    const transcriptView = document.createElement("a");
    // Use the same styling as the publish information in an article's header
    transcriptView.classList.add("Color-secondary-text", "type--caption");
    transcriptView.style.color = "white";
    transcriptView.id = badgeId;
    transcriptView.innerHTML = captionsText.replace(/\n/g, "<br>");
    transcriptView.style.overflow = "scroll";
    transcriptView.style.height = "400px";
    transcriptView.style.fontSize = "20px";
    player.insertAdjacentElement("afterend", transcriptView);
  }
}

async function fetchCaptionFromVideo() {
  const url = window.location.href;
  const text = await (await fetch(url)).text();
  const match = text.match(
    /ytInitialPlayerResponse\s*=\s*({.+?})\s*;\s*(?:var\s+meta|<\/script|\n)/
  )[1];
  const data = JSON.parse(match);
  // todo: get subtitle of different language
  const baseUrl =
    data.captions.playerCaptionsTracklistRenderer.captionTracks[0].baseUrl;
  //   console.log(`match ${baseUrl}`);
  return await fetchCaption(baseUrl);
}

async function fetchCaption(baseUrl) {
  let subs = await (await fetch(baseUrl)).text();
  let xml = new DOMParser().parseFromString(subs, "text/xml");
  let textNodes = [...xml.getElementsByTagName("text")];
  let subsText = textNodes
    .map((x) => x.textContent)
    .join("\n")
    .replaceAll("&#39;", "'");
  subsText = subsText.replace(/\n/g, " ");
  //   console.log(subsText);
  return subsText;
}

async function formatTranscript(transcript) {
  const data = { transcript: transcript };

  fetch("http://127.0.0.1:5000/transcript", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
    .then((response) => response.json())
    .then((data) => {
      insertTranscript(data.transcript);
      console.log(`formatted transcript ${data.transcript}`);
    })
    .catch((error) => console.error(error));
}
