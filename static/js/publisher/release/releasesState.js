import { RISKS } from "./constants";

function getRevisionsMap(revisions) {
  const revisionsMap = {};
  revisions.forEach(rev => {
    rev.channels = [];
    revisionsMap[rev.revision] = rev;
  });

  return revisionsMap;
}

// init channels data in revision history
function initReleasesData(revisionsMap, releases) {
  // go through releases from older to newest
  releases
    .slice()
    .reverse()
    .forEach(release => {
      if (release.revision) {
        const rev = revisionsMap[release.revision];

        if (rev) {
          const channel = release.branch
            ? `${release.track}/${release.risk}/${release.branch}`
            : `${release.track}/${release.risk}`;

          if (rev.channels.indexOf(channel) === -1) {
            rev.channels.push(channel);
          }
        }
      }
    });

  return releases;
}

// transforming channel map list data into format used by this component
function getReleaseDataFromChannelMap(channelMapsList, revisionsMap) {
  const releasedChannels = {};
  const releasedArchs = {};

  channelMapsList.forEach(mapInfo => {
    const { track, architecture, map } = mapInfo;
    map.forEach(channelInfo => {
      if (channelInfo.info === "released" || channelInfo.info === "branch") {
        const channel =
          track === "latest"
            ? `${track}/${channelInfo.channel}`
            : channelInfo.channel;

        if (!releasedChannels[channel]) {
          releasedChannels[channel] = {};
        }

        // XXX bartaz
        // this may possibly lead to issues with revisions in multiple architectures
        // if we have data about given revision in revision history we can store it
        if (revisionsMap[channelInfo.revision]) {
          releasedChannels[channel][architecture] =
            revisionsMap[channelInfo.revision];
          // but if for some reason we don't have full data about revision in channel map
          // we need to ducktype it from channel info
        } else {
          releasedChannels[channel][architecture] = channelInfo;
          releasedChannels[channel][architecture].architectures = [
            architecture
          ];
        }

        releasedArchs[architecture] = true;
      }
    });
  });

  return releasedChannels;
}

// for channel without release get next (less risk) channel with a release
function getTrackingChannel(releasedChannels, track, risk, arch) {
  let tracking = null;
  // if there is no revision for this arch in given channel (track/risk)
  if (
    !(
      releasedChannels[`${track}/${risk}`] &&
      releasedChannels[`${track}/${risk}`][arch]
    )
  ) {
    // find the next channel that has any revision
    for (let i = RISKS.indexOf(risk); i >= 0; i--) {
      const trackingChannel = `${track}/${RISKS[i]}`;

      if (
        releasedChannels[trackingChannel] &&
        releasedChannels[trackingChannel][arch]
      ) {
        tracking = trackingChannel;
        break;
      }
    }
  }

  return tracking;
}

function getUnassignedRevisions(revisionsMap, arch) {
  let filteredRevisions = Object.values(revisionsMap).reverse();
  if (arch) {
    filteredRevisions = filteredRevisions.filter(revision => {
      return (
        revision.architectures.includes(arch) &&
        (!revision.channels || revision.channels.length === 0)
      );
    });
  }
  return filteredRevisions;
}

export {
  getUnassignedRevisions,
  getTrackingChannel,
  getRevisionsMap,
  initReleasesData,
  getReleaseDataFromChannelMap
};
