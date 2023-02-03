const dotenv = require("dotenv");
const axios = require("axios");
const fs = require("node:fs");

// init dotenv
dotenv.config();

class Youtube {
  #API_KEY = process.env.API_KEY;
  #PLAYLIST_URL = `https://www.googleapis.com/youtube/v3/playlistItems`;
  #VIDEOS_URL = `https://www.googleapis.com/youtube/v3/videos`;

  #getPlaylistId(playlistLink) {
    if (!playlistLink || typeof playlistLink !== "string") return null;
    const regex = /list=([a-zA-Z0-9_-]+)/;
    const match = playlistLink.match(regex);
    if (!match) return null;
    return match ? match[1] : null;
  }
  async #getVideoIds(playlistId) {
    try {
      const videoIds = [];
      let totalNumberOfVideos = 0,
        nextPage = null;
      do {
        const res = await axios.get(this.#PLAYLIST_URL, {
          params: {
            part: "snippet",
            maxResults: 2,
            playlistId,
            key: this.#API_KEY,
            pageToken: nextPage,
          },
        });
        // getting total videos count
        if (!totalNumberOfVideos)
          totalNumberOfVideos = res.data.pageInfo.totalResults;

        // if next page available
        nextPage = res.data?.nextPageToken ?? null;

        res.data.items.map((video) =>
          videoIds.push(video.snippet.resourceId.videoId)
        );
      } while (nextPage);
      return { totalVideos: totalNumberOfVideos, videoIds };
    } catch (error) {
      console.log(error);
    }
  }
  async #getVideos(videoIds) {
    try {
      const res = await axios.get(this.#VIDEOS_URL, {
        params: {
          part: "contentDetails",
          id: videoIds.join(","),
          key: this.#API_KEY,
        },
      });
      return res.data.items;
    } catch (error) {
      console.log(error);
    }
  }
  #totalLengthInSeconds(durationStr = null) {
    if (!durationStr || typeof durationStr !== "string") return 0;
    const regEx = /\d+[HMS]/g;
    const match = durationStr && durationStr.match(regEx);
    if (!match) return 0;
    const suffix = {
      H: 60 * 60,
      M: 60,
      S: 1,
    };
    const totalLength = match.reduce((acc, curr) => {
      const number = Number(curr.slice(0, -1));
      acc += number * suffix[curr[curr.length - 1]];
      return acc;
    }, 0);
    return totalLength;
  }
  async calcAll(playlistURL) {
    const playlistId = this.#getPlaylistId(playlistURL);
    const { totalVideos, videoIds } = await this.#getVideoIds(playlistId);
    const videos = await this.#getVideos(videoIds);
    const totalPlaylistLengthInSec = videos.reduce((acc, curr) => {
      acc += this.#totalLengthInSeconds(curr.contentDetails.duration);
      return acc;
    }, 0);
    return { totalVideos, duration: totalPlaylistLengthInSec };
  }
  static async getPlaylistDuration(playlistURL) {
    const yt = new this();
    return await yt.calcAll(playlistURL);
  }
}
function main() {
  Youtube.getPlaylistDuration(
    "https://youtube.com/playlist?list=PLXQpH_kZIxTWQfh_krE4sI_8etq5rH_z6"
  ).then((res) => {
    console.log(res.totalVideos);
    let secLeft = res.duration;
    const days = parseInt(secLeft / (60 * 60 * 24));
    secLeft = secLeft % (60 * 60 * 24);
    const hours = parseInt(secLeft / (60 * 60));
    secLeft = secLeft % (60 * 60);
    const minutes = parseInt(secLeft / 60);
    secLeft = secLeft % 60;
    console.log(days, "d\n", hours, "h\n", minutes, "m\n", secLeft, "s");
  });
}
main();
