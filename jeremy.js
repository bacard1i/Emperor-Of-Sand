var APP_ID = "312369995";
var USER_TOKEN = "XX7seyZt4OaHGPgksFUldL2Ig0cH6jqcKSAfOAiAGBzw1HosDl9vfQTGRQEo2zkkcwP9ADc3L20nYNaI0l7E4g";
var SECRET = "e79f8b9be485692b0e5f9dd895826368";
var BASE = "https://www.qobuz.com/api.json/0.2";

// Phase 1: Multiple Tidal backends for reliability
var TIDAL_BACKENDS = [
  "https://sultans-curse.onrender.com",
  "https://hifi-api.onrender.com",
  "https://tidal.hifi-api.com"
];

var TIMEOUT_MS = 8000;
var _streamCache = new Map();
var STREAM_CACHE_TTL = 12 * 60 * 1000;
var _searchCache = new Map();
var SEARCH_CACHE_TTL = 8 * 60 * 1000;

function cleanText(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }
function normalizeQ(s) {
  if (!s) return '';
  return cleanText(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ').replace(/\brmx\b/g, "remix").replace(/\s+/g, ' ').trim();
}
function getFullTitle(item) {
  var base = item.title || item.name || '';
  var ver = item.version || item.title_version || '';
  return (ver && base.toLowerCase().indexOf(ver.toLowerCase()) === -1) ? base + " " + ver : base;
}

function md5(str) { 
  function RotateLeft(lValue, iShiftBits) { return (lValue<<iShiftBits) | (lValue>>>(32-iShiftBits)); }
  function AddUnsigned(lX,lY) { var lX4,lY4,lX8,lY8,lResult; lX8=(lX&0x80000000); lY8=(lY&0x80000000); lX4=(lX&0x40000000); lY4=(lY&0x40000000); lResult=(lX&0x3FFFFFFF)+(lY&0x3FFFFFFF); if(lX4&lY4) return (lResult^0x80000000^lX8^lY8); if(lX4|lY4) { if(lResult&0x40000000) return (lResult^0xC0000000^lX8^lY8); else return (lResult^0x40000000^lX8^lY8); } else return (lResult^lX8^lY8); }
  function F(x,y,z) { return (x&y) | ((~x)&z); }
  function G(x,y,z) { return (x&z) | (y&(~z)); }
  function H(x,y,z) { return (x^y^z); }
  function I(x,y,z) { return (y ^ (x | (~z))); }
  function FF(a,b,c,d,x,s,ac) { a=AddUnsigned(a,AddUnsigned(AddUnsigned(F(b,c,d),x),ac)); return AddUnsigned(RotateLeft(a,s),b); }
  function GG(a,b,c,d,x,s,ac) { a=AddUnsigned(a,AddUnsigned(AddUnsigned(G(b,c,d),x),ac)); return AddUnsigned(RotateLeft(a,s),b); }
  function HH(a,b,c,d,x,s,ac) { a=AddUnsigned(a,AddUnsigned(AddUnsigned(H(b,c,d),x),ac)); return AddUnsigned(RotateLeft(a,s),b); }
  function II(a,b,c,d,x,s,ac) { a=AddUnsigned(a,AddUnsigned(AddUnsigned(I(b,c,d),x),ac)); return AddUnsigned(RotateLeft(a,s),b); }
  function ConvertToWordArray(str) { var lWordCount; var lMessageLength = str.length; var lNumberOfWords_temp1=lMessageLength+8; var lNumberOfWords_temp2=(lNumberOfWords_temp1-(lNumberOfWords_temp1%64))/64; var lNumberOfWords = (lNumberOfWords_temp2+1)*16; var lWordArray=Array(lNumberOfWords-1); var lBytePosition = 0; var lByteCount = 0; while ( lByteCount < lMessageLength ) { lWordCount = (lByteCount-(lByteCount%4))/4; lBytePosition = (lByteCount%4)*8; lWordArray[lWordCount] = (lWordArray[lWordCount] | (str.charCodeAt(lByteCount)<<lBytePosition)); lByteCount++; } lWordCount = (lByteCount-(lByteCount%4))/4; lBytePosition = (lByteCount%4)*8; lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80<<lBytePosition); lWordArray[lNumberOfWords-2] = lMessageLength<<3; lWordArray[lNumberOfWords-1] = lMessageLength>>>29; return lWordArray; }
  function WordToHex(lValue) { var WordToHexValue="",WordToHexValue_temp="",lByte,lCount; for(lCount=0;lCount<=3;lCount++) { lByte=(lValue>>>(lCount*8))&255; WordToHexValue_temp = "0" + lByte.toString(16); WordToHexValue = WordToHexValue + WordToHexValue_temp.substr(WordToHexValue_temp.length-2,2); } return WordToHexValue; }
  var x=Array(); var k,AA,BB,CC,DD,a,b,c,d; var S11=7,S12=12,S13=17,S14=22; var S21=5,S22=9 ,S23=14,S24=20; var S31=4,S32=11,S33=16,S34=23; var S41=6,S42=10,S43=15,S44=21; x = ConvertToWordArray(str); a=0x67452301; b=0xEFCDAB89; c=0x98BADCFE; d=0x10325476; for(k=0;k<x.length;k+=16) { AA=a; BB=b; CC=c; DD=d; a=FF(a,b,c,d,x[k+0], S11,0xD76AA478); d=FF(d,a,b,c,x[k+1], S12,0xE8C7B756); c=FF(c,d,a,b,x[k+2], S13,0x242070DB); b=FF(b,c,d,a,x[k+3], S14,0xC1BDCEEE); a=FF(a,b,c,d,x[k+4], S11,0xF57C0FAF); d=FF(d,a,b,c,x[k+5], S12,0x4787C62A); c=FF(c,d,a,b,x[k+6], S13,0xA8304613); b=FF(b,c,d,a,x[k+7], S14,0xFD469501); a=FF(a,b,c,d,x[k+8], S11,0x698098D8); d=FF(d,a,b,c,x[k+9], S12,0x8B44F7AF); c=FF(c,d,a,b,x[k+10],S13,0xFFFF5BB1); b=FF(b,c,d,a,x[k+11],S14,0x895CD7BE); a=FF(a,b,c,d,x[k+12],S11,0x6B901122); d=FF(d,a,b,c,x[k+13],S12,0xFD987193); c=FF(c,d,a,b,x[k+14],S13,0xA679438E); b=FF(b,c,d,a,x[k+15],S14,0x49B40821); a=GG(a,b,c,d,x[k+1], S21,0xF61E2562); d=GG(d,a,b,c,x[k+6], S22,0xC040B340); c=GG(c,d,a,b,x[k+11],S23,0x265E5A51); b=GG(b,c,d,a,x[k+0], S24,0xE9B6C7AA); a=GG(a,b,c,d,x[k+5], S21,0xD62F105D); d=GG(d,a,b,c,x[k+10],S22,0x2441453); c=GG(c,d,a,b,x[k+15],S23,0xD8A1E681); b=GG(b,c,d,a,x[k+4], S24,0xE7D3FBC8); a=GG(a,b,c,d,x[k+9], S21,0x21E1CDE6); d=GG(d,a,b,c,x[k+14],S22,0xC33707D6); c=GG(c,d,a,b,x[k+3], S23,0xF4D50D87); b=GG(b,c,d,a,x[k+8], S24,0x455A14ED); a=GG(a,b,c,d,x[k+13],S21,0xA9E3E905); d=GG(d,a,b,c,x[k+2], S22,0xFCEFA3F8); c=GG(c,d,a,b,x[k+7], S23,0x676F02D9); b=GG(b,c,d,a,x[k+12],S24,0x8D2A4C8A); a=HH(a,b,c,d,x[k+5], S31,0xFFFA3942); d=HH(d,a,b,c,x[k+8], S32,0x8771F681); c=HH(c,d,a,b,x[k+11],S33,0x6D9D6122); b=HH(b,c,d,a,x[k+14],S34,0xFDE5380C); a=HH(a,b,c,d,x[k+1], S31,0xA4BEEA44); d=HH(d,a,b,c,x[k+4], S32,0x4BDECFA9); c=HH(c,d,a,b,x[k+7], S33,0xF6BB4B60); b=HH(b,c,d,a,x[k+10],S34,0xBEBFBC70); a=HH(a,b,c,d,x[k+13],S31,0x289B7EC6); d=HH(d,a,b,c,x[k+0], S32,0xEAA127FA); c=HH(c,d,a,b,x[k+3], S33,0xD4EF3085); b=HH(b,c,d,a,x[k+6], S34,0x4881D05); a=HH(a,b,c,d,x[k+9], S31,0xD9D4D039); d=HH(d,a,b,c,x[k+12],S32,0xE6DB99E5); c=HH(c,d,a,b,x[k+15],S33,0x1FA27CF8); b=HH(b,c,d,a,x[k+2], S34,0xC4AC5665); a=II(a,b,c,d,x[k+0], S41,0xF4292244); d=II(d,a,b,c,x[k+7], S42,0x432AFF97); c=II(c,d,a,b,x[k+14],S43,0xAB9423A7); b=II(b,c,d,a,x[k+5], S44,0xFC93A039); a=II(a,b,c,d,x[k+12],S41,0x655B59C3); d=II(d,a,b,c,x[k+3], S42,0x8F0CCC92); c=II(c,d,a,b,x[k+10],S43,0xFFEFF47D); b=II(b,c,d,a,x[k+1], S44,0x85845DD1); a=II(a,b,c,d,x[k+8], S41,0x6FA87E4F); d=II(d,a,b,c,x[k+15],S42,0xFE2CE6E0); c=II(c,d,a,b,x[k+6], S43,0xA3014314); b=II(b,c,d,a,x[k+13],S44,0x4E0811A1); a=II(a,b,c,d,x[k+4], S41,0xF7537E82); d=II(d,a,b,c,x[k+11],S42,0xBD3AF235); c=II(c,d,a,b,x[k+2], S43,0x2AD7D2BB); b=II(b,c,d,a,x[k+9], S44,0xEB86D391); a=AddUnsigned(a,AA); b=AddUnsigned(b,BB); c=AddUnsigned(c,CC); d=AddUnsigned(d,DD); } var temp = WordToHex(a)+WordToHex(b)+WordToHex(c)+WordToHex(d); return temp.toLowerCase(); }

async function withTimeout(promise, ms){ return Promise.race([promise, new Promise((_,r)=>setTimeout(()=>r(new Error("timeout")),ms))]); }

async function qobuzApi(endpoint, params){
  var url = BASE + endpoint + "?app_id=" + APP_ID + "&user_auth_token=" + USER_TOKEN;
  if(params) for(var k in params) url += "&" + k + "=" + encodeURIComponent(params[k]);
  var res = await fetch(url); if(!res.ok) throw new Error("Qobuz HTTP "+res.status); return res.json();
}

var searchQobuz = async function(query, limit){
  if(!limit) limit=25;
  var cacheKey = "q_"+query+"_"+limit;
  var cached = _searchCache.get(cacheKey);
  if(cached && Date.now()-cached.ts < SEARCH_CACHE_TTL) return cached.data;
  try{
    var data = await withTimeout(qobuzApi("/track/search", {query:query, limit:limit*2}), TIMEOUT_MS);
    var items = (data.tracks && data.tracks.items) || [];
    var result = items.slice(0,limit).map(function(t){
      var sr = t.maximum_sampling_rate || t.sampling_rate || 0;
      var bit = t.maximum_bit_depth || t.bit_depth || 16;
      return {
        id: String(t.id), title: cleanText(getFullTitle(t)),
        artist: t.performer ? t.performer.name : (t.artist ? t.artist.name : "Unknown"),
        album: t.album ? t.album.title : "", albumId: t.album ? String(t.album.id) : null,
        duration: t.duration || 0,
        audioQuality: bit + "-bit / " + sr + " kHz (Q)",
        cover: t.album && t.album.image ? t.album.image.large : "",
        isrc: t.isrc || null, source: "Qobuz", qobuzId: String(t.id)
      };
    });
    _searchCache.set(cacheKey, {data:result, ts:Date.now()});
    return result;
  }catch(e){ return []; }
};

var getQobuzStream = async function(trackId, retry){
  if(!retry) retry=0;
  var cacheKey = "qs_"+trackId;
  var cached = _streamCache.get(cacheKey);
  if(cached && Date.now()-cached.ts < STREAM_CACHE_TTL) return cached.result;
  try{
    var ts = Math.floor(Date.now()/1000);
    var sig = md5("trackgetFileUrlformat_id27intentstreamtrack_id"+trackId+ts+SECRET);
    var url = BASE + "/track/getFileUrl?app_id="+APP_ID+"&user_auth_token="+USER_TOKEN+
              "&track_id="+trackId+"&format_id=27&intent=stream&request_ts="+ts+"&request_sig="+sig;
    var r = await fetch(url); if(!r.ok) throw new Error("HTTP "+r.status);
    var data = await r.json();
    var result = { streamUrl: data.url, track: { audioQuality: (data.bit_depth||24)+"-bit / "+(data.sample_rate||data.sampling_rate||0)+" kHz (Q)", source: "Qobuz" } };
    _streamCache.set(cacheKey, {result:result, ts:Date.now()});
    return result;
  }catch(e){ if(retry<2) return getQobuzStream(trackId, retry+1); throw new Error("Qobuz stream failed"); }
};

var searchTidal = async function(query, limit, retry) {
  if (!limit) limit = 25;
  if (retry === undefined) retry = 0;

  for (var i = 0; i < TIDAL_BACKENDS.length; i++) {
    var backend = TIDAL_BACKENDS[i];
    try {
      var url = backend + "/search/?s=" + encodeURIComponent(query) + "&limit=" + limit;
      var res = await withTimeout(fetch(url), TIMEOUT_MS);
      var raw = await res.json();

      var payload = raw.data || raw;
      var tidalTracks = [];
      if (payload.tracks) {
        tidalTracks = Array.isArray(payload.tracks) ? payload.tracks : (payload.tracks.items || []);
      } else if (payload.items) {
        tidalTracks = payload.items;
      } else if (payload.data && payload.data.tracks) {
        tidalTracks = Array.isArray(payload.data.tracks) ? payload.data.tracks : (payload.data.tracks.items || []);
      }

      if (tidalTracks && tidalTracks.length > 0) {
        return tidalTracks.map(function(t) {
          var tid = t.id || t.trackId || "";
          return Object.assign({}, t, {
            id: "tidal:" + tid,
            source: "Tidal",
            tidalId: tid,
            audioQuality: (t.audioQuality || t.audio_quality || t.quality || "LOSSLESS") + " (T)",
            title: cleanText(getFullTitle(t) || t.title || "")
          });
        });
      }
    } catch (e) {
      continue; // try next backend
    }
  }
  return [];
};

var getTidalStream = async function(trackId, retryCount) {
  if (!retryCount) retryCount = 0;
  const qualities = ["LOSSLESS", "HIGH", "LOW"];

  for (var b = 0; b < TIDAL_BACKENDS.length; b++) {
    var backend = TIDAL_BACKENDS[b];
    for (const quality of qualities) {
      try {
        var res = await withTimeout(fetch(backend + "/track/?id=" + trackId + "&quality=" + quality), TIMEOUT_MS);
        var data = await res.json();

        if (data.manifest) {
          try {
            var decoded = atob(data.manifest);
            var manifest = JSON.parse(decoded);
            if (manifest.urls && manifest.urls.length > 0) {
              return { streamUrl: manifest.urls[0] };
            }
          } catch (e) {}
        }

        if (data.streamUrl || data.url) {
          return { streamUrl: data.streamUrl || data.url };
        }
      } catch (e) {
        continue;
      }
    }
  }

  // Exponential backoff retry
  if (retryCount < 2) {
    var delay = Math.pow(2, retryCount) * 1000;
    await new Promise(r => setTimeout(r, delay));
    return getTidalStream(trackId, retryCount + 1);
  }

  return { streamUrl: null, error: true, message: "All Tidal backends failed" };
};

function mergeSmart(qobuzTracks, tidalTracks, limit) {
  var final = [];
  var seenISRC = new Set();
  var seenKey = new Set();

  qobuzTracks.forEach(function(t) {
    var key = t.isrc || normalizeQ(t.title + "|" + t.artist);
    if (!seenKey.has(key)) {
      seenKey.add(key);
      if (t.isrc) seenISRC.add(t.isrc);
      final.push(t);
    }
  });

  tidalTracks.forEach(function(t) {
    if (t.isrc && seenISRC.has(t.isrc)) return;
    var key = t.isrc || normalizeQ(t.title + "|" + t.artist);
    if (seenKey.has(key)) return;
    seenKey.add(key);
    if (t.isrc) seenISRC.add(t.isrc);
    final.push(t);
  });

  return final.slice(0, limit);
}

// Phase 1: Basic Artist/Album Navigation (stubs - full support in Phase 2 with Oracle)
var searchArtists = async function(query, limit) {
  if (!limit) limit = 10;
  // Use Tidal search and filter for artists (basic implementation)
  try {
    var results = await searchTidal(query + " artist", limit);
    return results.map(function(r) {
      return {
        id: r.tidalId || r.id,
        name: r.artist || r.title || "Unknown Artist",
        source: "Tidal"
      };
    });
  } catch (e) {
    return [];
  }
};

var getArtistAlbums = async function(artistId) {
  // Stub - returns empty for now. Full implementation in Phase 2
  return [];
};

var getAlbumTracks = async function(albumId) {
  // Stub - returns empty for now. Full implementation in Phase 2
  return [];
};

var getAlbum = async function(albumId){ return null; };

var preloadQueue = [];
var preloadTrack = function(trackId){
  getQobuzStream(trackId).catch(function(){});
  if(preloadQueue.indexOf(trackId) === -1) preloadQueue.unshift(trackId);
  if(preloadQueue.length > 25) preloadQueue.length = 25;
  return Promise.resolve({ status: "preloaded" });
};

return {
  id: "jeremy",
  name: "Jeremy",
  author: "bacardii",
  version: "2.8.0",
  description: "Qobuz Hi-Res + Tidal Fallback • Phase 1: Multi-Backend + Navigation + Better Errors (v2.8.0)",
  labels: ["QOBUZ", "TIDAL", "HI-RES", "SMART", "NAVIGATION"],

  searchTracks: async function(query, limit){
    if(!limit) limit=25;

    if (query.toLowerCase().includes("molecule mouth")) {
      try {
        var tidalOnly = await searchTidal(query, limit);
        return { tracks: tidalOnly || [], total: (tidalOnly || []).length };
      } catch (e) {
        return { tracks: [], total: 0, error: true };
      }
    }

    var cacheKey = "search_"+query+"_"+limit;
    var cached = _searchCache.get(cacheKey);
    if(cached && Date.now()-cached.ts < SEARCH_CACHE_TTL) return { tracks: cached.data, total: cached.data.length };

    try {
      var [qobuz, tidal] = await Promise.all([
        searchQobuz(query, limit),
        searchTidal(query, limit)
      ]);
      var merged = mergeSmart(qobuz || [], tidal || [], limit);
      _searchCache.set(cacheKey, { data: merged, ts: Date.now() });
      return { tracks: merged, total: merged.length };
    } catch (e) {
      return { tracks: [], total: 0, error: true, message: e.message };
    }
  },

  getTrackStreamUrl: async function(trackId) {
    if (typeof trackId === "string" && trackId.indexOf("tidal:") === 0) {
      var realId = trackId.replace("tidal:", "");
      return await getTidalStream(realId);
    } else {
      return await getQobuzStream(trackId);
    }
  },

  // New in v2.8.0
  searchArtists: searchArtists,
  getArtistAlbums: getArtistAlbums,
  getAlbumTracks: getAlbumTracks,

  getAlbum: getAlbum,
  preloadTrack: preloadTrack
};