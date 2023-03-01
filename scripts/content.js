const tag = "Transcript:"

    function getVideoId() {
        // Get the current YouTube video URL
        let videoUrl = window.location.href;

        // Extract the video ID from the URL
        let videoId = videoUrl.split('v=')[1];

        // Check if there is an ampersand after the video ID (which separates the ID from other parameters)
        if (videoId.includes('&')) {
        videoId = videoId.split('&')[0];
        }

        // Log the video ID to the console
        console.log(`${tag} ${videoId}`);
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
        console.log(`Transcript2 ${captionsText}`);

        const player = document.querySelector('#columns #primary #below');

        // `document.querySelector` may return null if the selector doesn't match anything.
        if (player) {
            let badgeId = 'full-transcript';

            const previousBadge = document.getElementById(badgeId);
            if (previousBadge) {
                previousBadge.remove();
            }
            const badge = document.createElement("a");
            // Use the same styling as the publish information in an article's header
            badge.classList.add("Color-secondary-text", "type--caption");
            // badge.textContent = caption;
            badge.style.color = 'white';
            badge.id = badgeId;
            // let element = document.getElementById(badgeId);
            badge.innerHTML = captionsText;
            badge.style.overflow = 'scroll';
            badge.style.height = '400px';
            badge.style.fontSize = '20px';
            // Support for article docs with date
            console.log(`Transcript ${captionsText}`);
            player.insertAdjacentElement('beforebegin', badge);
        }
    }

async function fetchVideo() {
        const url = window.location.href;
    const text = await (await fetch(url)).text();
    const match = text.match(/ytInitialPlayerResponse\s*=\s*({.+?})\s*;\s*(?:var\s+meta|<\/script|\n)/)[1];
    const data = JSON.parse(match);
    const baseUrl = data.captions.playerCaptionsTracklistRenderer.captionTracks[0].baseUrl;

        console.log(`match ${baseUrl}`)

       fetchCaption(baseUrl);
}

async function fetchCaption(baseUrl) {
    let subs = await (await fetch(baseUrl)).text();
        let xml = new DOMParser().parseFromString(subs,"text/xml");
        let textNodes = [...xml.getElementsByTagName('text')];
        let subsText = textNodes.map(x => x.textContent).join("\n").replaceAll('&#39;',"'");
        subsText = subsText.replace(/\n/g, ' ')
        console.log(subsText);
        insertTranscript(subsText);
}

    document.addEventListener("yt-navigate-finish", function (event) {
        fetchVideo();
      });