var APP_ID = "312369995";
var USER_TOKEN = "XX7seyZt4OaHGPgksFUldL2Ig0cH6jqcKSAfOAiAGBzw1HosDl9vfQTGRQEo2zkkcwP9ADc3L20nYNaI0l7E4g";
var SECRET = "e79f8b9be485692b0e5f9dd895826368";
var BASE = "https://www.qobuz.com/api.json/0.2";
var TIDAL_BACKEND = "https://sultans-curse.onrender.com";

var TIMEOUT_MS = 15000;
var _streamCache = new Map();
var STREAM_CACHE_TTL = 5 * 60 * 1000;
var _searchCache = new Map();
var SEARCH_CACHE_TTL = 3 * 60 * 1000;

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

function md5(str){ /* keep same full MD5 function */ return temp.toLowerCase(); }

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
        audioQuality: bit + "-bit / " + sr + " kHz",
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
    var result = { streamUrl: data.url, track: { audioQuality: (data.bit_depth||24)+"-bit / "+(data.sample_rate||data.sampling_rate||0)+" kHz", source: "Qobuz" } };
    _streamCache.set(cacheKey, {result:result, ts:Date.now()});
    return result;
  }catch(e){ if(retry<2) return getQobuzStream(trackId, retry+1); throw new Error("Qobuz stream failed"); }
};

var searchTidal = async function(query, limit){
  if(!limit) limit=25;
  try{
    var res = await withTimeout(fetch(TIDAL_BACKEND + "/search/?s=" + encodeURIComponent(query) + "&limit=" + limit), TIMEOUT_MS);
    var data = await res.json();
    return (data.tracks || []).map(function(t){
      return Object.assign({}, t, { source: "Tidal", tidalId: t.id, audioQuality: t.audioQuality || "LOSSLESS" });
    });
  }catch(e){ 
    console.log("[Jeremy] Tidal search error:", e.message);
    return []; 
  }
};

var getTidalStream = async function(trackId){
  try{
    var res = await withTimeout(fetch(TIDAL_BACKEND + "/track/?id=" + trackId + "&quality=LOSSLESS"), TIMEOUT_MS);
    return await res.json();
  }catch(e){ return { streamUrl: null }; }
};

function mergeSmart(qobuzTracks, tidalTracks, limit){
  var final = [];
  var seenISRC = new Set();
  var seenKey = new Set();

  qobuzTracks.forEach(function(t){
    var key = t.isrc || normalizeQ(t.title + "|" + t.artist);
    if(!seenKey.has(key)){
      seenKey.add(key);
      if(t.isrc) seenISRC.add(t.isrc);
      final.push(t);
    }
  });

  tidalTracks.forEach(function(t){
    if(t.isrc && seenISRC.has(t.isrc)) return;
    var key = t.isrc || normalizeQ(t.title + "|" + t.artist);
    if(seenKey.has(key)) return;

    seenKey.add(key);
    if(t.isrc) seenISRC.add(t.isrc);
    final.push(t);
  });

  return final.slice(0, limit);
}

var getAlbum = async function(albumId){ /* same as before */ };

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
  version: "3.5",
  description: "Qobuz Hi-Res + Tidal Fallback • Best Quality Available",
  labels: ["QOBUZ", "TIDAL", "HI-RES", "SMART"],

  searchTracks: async function(query, limit){
    if(!limit) limit=25;
    var cacheKey = "search_"+query+"_"+limit;
    var cached = _searchCache.get(cacheKey);
    if(cached && Date.now()-cached.ts < SEARCH_CACHE_TTL) return { tracks: cached.data, total: cached.data.length };

    var [qobuz, tidal] = await Promise.all([
      searchQobuz(query, limit),
      searchTidal(query, limit)
    ]);
    var merged = mergeSmart(qobuz, tidal, limit);
    _searchCache.set(cacheKey, { data: merged, ts: Date.now() });
    return { tracks: merged, total: merged.length };
  },

  getTrackStreamUrl: async function(trackId){
    try { return await getQobuzStream(trackId); }
    catch(e) { return await getTidalStream(trackId); }
  },

  getAlbum: getAlbum,
  preloadTrack: preloadTrack
};