var APP_ID = "312369995";
var USER_TOKEN = "XX7seyZt4OaHGPgksFUldL2Ig0cH6jqcKSAfOAiAGBzw1HosDl9vfQTGRQEo2zkkcwP9ADc3L20nYNaI0l7E4g";
var SECRET = "e79f8b9be485692b0e5f9dd895826368";
var BASE = "https://www.qobuz.com/api.json/0.2";
var TIDAL_BACKEND = "https://sultans-curse.onrender.com";

  // ==================== CACHING ====================
  cache: new Map(),
  CACHE_TTL: 1000 * 60 * 8, // 8 minutes

  getCache: function(key) {
    var item = this.cache.get(key);
    if (!item || Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  },

  setCache: function(key, value) {
    this.cache.set(key, {
      value: value,
      expiry: Date.now() + this.CACHE_TTL
    });
  },

  // ==================== PRELOADING ====================
  preloadQueue: [],
  MAX_PRELOAD: 12,

  smartPreload: function(currentTrackId, upcomingTracks) {
    var self = this;
    upcomingTracks.slice(0, this.MAX_PRELOAD).forEach(function(track) {
      if (!self.preloadQueue.includes(track.id)) {
        self.preloadQueue.unshift(track.id);
        if (track.source === "Qobuz") {
          self.getQobuzStream(track.id).catch(function(){});
        } else if (track.source === "Tidal") {
          fetch(self.TIDAL_BACKEND + "/stream/" + track.id).catch(function(){});
        }
      }
    });
    if (this.preloadQueue.length > this.MAX_PRELOAD * 2) {
      this.preloadQueue = this.preloadQueue.slice(0, this.MAX_PRELOAD);
    }
  },

  // ==================== MD5 ====================
  md5: function(string) {
    // Full MD5 function (same as before)
    function RotateLeft(lValue, iShiftBits) {
      return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));
    }
    function AddUnsigned(lX, lY) {
      var lX4, lY4, lX8, lY8, lResult;
      lX8 = (lX & 0x80000000);
      lY8 = (lY & 0x80000000);
      lX4 = (lX & 0x40000000);
      lY4 = (lY & 0x40000000);
      lResult = (lX & 0x3FFFFFFF) + (lY & 0x3FFFFFFF);
      if (lX4 & lY4) return (lResult ^ 0x80000000 ^ lX8 ^ lY8);
      if (lX4 | lY4) {
        if (lResult & 0x40000000) return (lResult ^ 0xC0000000 ^ lX8 ^ lY8);
        else return (lResult ^ 0x40000000 ^ lX8 ^ lY8);
      } else return (lResult ^ lX8 ^ lY8);
    }
    function F(x, y, z) { return (x & y) | ((~x) & z); }
    function G(x, y, z) { return (x & z) | (y & (~z)); }
    function H(x, y, z) { return (x ^ y ^ z); }
    function I(x, y, z) { return (y ^ (x | (~z))); }
    function FF(a, b, c, d, x, s, ac) {
      a = AddUnsigned(a, AddUnsigned(AddUnsigned(F(b, c, d), x), ac));
      return AddUnsigned(RotateLeft(a, s), b);
    }
    function GG(a, b, c, d, x, s, ac) {
      a = AddUnsigned(a, AddUnsigned(AddUnsigned(G(b, c, d), x), ac));
      return AddUnsigned(RotateLeft(a, s), b);
    }
    function HH(a, b, c, d, x, s, ac) {
      a = AddUnsigned(a, AddUnsigned(AddUnsigned(H(b, c, d), x), ac));
      return AddUnsigned(RotateLeft(a, s), b);
    }
    function II(a, b, c, d, x, s, ac) {
      a = AddUnsigned(a, AddUnsigned(AddUnsigned(I(b, c, d), x), ac));
      return AddUnsigned(RotateLeft(a, s), b);
    }
    function ConvertToWordArray(string) {
      var lWordCount;
      var lMessageLength = string.length;
      var lNumberOfWords_temp1 = lMessageLength + 8;
      var lNumberOfWords_temp2 = (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64;
      var lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16;
      var lWordArray = Array(lNumberOfWords - 1);
      var lBytePosition = 0;
      var lByteCount = 0;
      while (lByteCount < lMessageLength) {
        lWordCount = (lByteCount - (lByteCount % 4)) / 4;
        lBytePosition = (lByteCount % 4) * 8;
        lWordArray[lWordCount] = (lWordArray[lWordCount] | (string.charCodeAt(lByteCount) << lBytePosition));
        lByteCount++;
      }
      lWordCount = (lByteCount - (lByteCount % 4)) / 4;
      lBytePosition = (lByteCount % 4) * 8;
      lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition);
      lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
      lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
      return lWordArray;
    }
    function WordToHex(lValue) {
      var WordToHexValue = "", WordToHexValue_temp = "", lByte, lCount;
      for (lCount = 0; lCount <= 3; lCount++) {
        lByte = (lValue >>> (lCount * 8)) & 255;
        WordToHexValue_temp = "0" + lByte.toString(16);
        WordToHexValue = WordToHexValue + WordToHexValue_temp.substr(WordToHexValue_temp.length - 2, 2);
      }
      return WordToHexValue;
    }
    function Utf8Encode(string) {
      string = string.replace(/\r\n/g, "\n");
      var utftext = "";
      for (var n = 0; n < string.length; n++) {
        var c = string.charCodeAt(n);
        if (c < 128) {
          utftext += String.fromCharCode(c);
        } else if ((c > 127) && (c < 2048)) {
          utftext += String.fromCharCode((c >> 6) | 192);
          utftext += String.fromCharCode((c & 63) | 128);
        } else {
          utftext += String.fromCharCode((c >> 12) | 224);
          utftext += String.fromCharCode(((c >> 6) & 63) | 128);
          utftext += String.fromCharCode((c & 63) | 128);
        }
      }
      return utftext;
    }

    var x = Array();
    var k, AA, BB, CC, DD, a, b, c, d;
    var S11 = 7, S12 = 12, S13 = 17, S14 = 22;
    var S21 = 5, S22 = 9, S23 = 14, S24 = 20;
    var S31 = 4, S32 = 11, S33 = 16, S34 = 23;
    var S41 = 6, S42 = 10, S43 = 15, S44 = 21;

    string = Utf8Encode(string);
    x = ConvertToWordArray(string);
    a = 0x67452301; b = 0xEFCDAB89; c = 0x98BADCFE; d = 0x10325476;

    for (k = 0; k < x.length; k += 16) {
      AA = a; BB = b; CC = c; DD = d;
      a = FF(a, b, c, d, x[k + 0], S11, 0xD76AA478);
      d = FF(d, a, b, c, x[k + 1], S12, 0xE8C7B756);
      c = FF(c, d, a, b, x[k + 2], S13, 0x242070DB);
      b = FF(b, c, d, a, x[k + 3], S14, 0xC1BDCEEE);
      a = FF(a, b, c, d, x[k + 4], S11, 0xF57C0FAF);
      d = FF(d, a, b, c, x[k + 5], S12, 0x4787C62A);
      c = FF(c, d, a, b, x[k + 6], S13, 0xA8304613);
      b = FF(b, c, d, a, x[k + 7], S14, 0xFD469501);
      a = FF(a, b, c, d, x[k + 8], S11, 0x698098D8);
      d = FF(d, a, b, c, x[k + 9], S12, 0x8B44F7AF);
      c = FF(c, d, a, b, x[k + 10], S13, 0xFFFF5BB1);
      b = FF(b, c, d, a, x[k + 11], S14, 0x895CD7BE);
      a = FF(a, b, c, d, x[k + 12], S11, 0x6B901122);
      d = FF(d, a, b, c, x[k + 13], S12, 0xFD987193);
      c = FF(c, d, a, b, x[k + 14], S13, 0xA679438E);
      b = FF(b, c, d, a, x[k + 15], S14, 0x49B40821);
      a = GG(a, b, c, d, x[k + 1], S21, 0xF61E2562);
      d = GG(d, a, b, c, x[k + 6], S22, 0xC040B340);
      c = GG(c, d, a, b, x[k + 11], S23, 0x265E5A51);
      b = GG(b, c, d, a, x[k + 0], S24, 0xE9B6C7AA);
      a = GG(a, b, c, d, x[k + 5], S21, 0xD62F105D);
      d = GG(d, a, b, c, x[k + 10], S22, 0x2441453);
      c = GG(c, d, a, b, x[k + 15], S23, 0xD8A1E681);
      b = GG(b, c, d, a, x[k + 4], S24, 0xE7D3FBC8);
      a = GG(a, b, c, d, x[k + 9], S21, 0x21E1CDE6);
      d = GG(d, a, b, c, x[k + 14], S22, 0xC33707D6);
      c = GG(c, d, a, b, x[k + 3], S23, 0xF4D50D87);
      b = GG(b, c, d, a, x[k + 8], S24, 0x455A14ED);
      a = GG(a, b, c, d, x[k + 13], S21, 0xA9E3E905);
      d = GG(d, a, b, c, x[k + 2], S22, 0xFCEFA3F8);
      c = GG(c, d, a, b, x[k + 7], S23, 0x676F02D9);
      b = GG(b, c, d, a, x[k + 12], S24, 0x8D2A4C8A);
      a = HH(a, b, c, d, x[k + 5], S31, 0xFFFA3942);
      d = HH(d, a, b, c, x[k + 8], S32, 0x8771F681);
      c = HH(c, d, a, b, x[k + 11], S33, 0x6D9D6122);
      b = HH(b, c, d, a, x[k + 14], S34, 0xFDE5380C);
      a = HH(a, b, c, d, x[k + 1], S31, 0xA4BEEA44);
      d = HH(d, a, b, c, x[k + 4], S32, 0x4BDECFA9);
      c = HH(c, d, a, b, x[k + 7], S33, 0xF6BB4B60);
      b = HH(b, c, d, a, x[k + 10], S34, 0xBEBFBC70);
      a = HH(a, b, c, d, x[k + 13], S31, 0x289B7EC6);
      d = HH(d, a, b, c, x[k + 0], S32, 0xEAA127FA);
      c = HH(c, d, a, b, x[k + 3], S33, 0xD4EF3085);
      b = HH(b, c, d, a, x[k + 6], S34, 0x4881D05);
      a = HH(a, b, c, d, x[k + 9], S31, 0xD9D4D039);
      d = HH(d, a, b, c, x[k + 12], S32, 0xE6DB99E5);
      c = HH(c, d, a, b, x[k + 15], S33, 0x1FA27CF8);
      b = HH(b, c, d, a, x[k + 2], S34, 0xC4AC5665);
      a = II(a, b, c, d, x[k + 0], S41, 0xF4292244);
      d = II(d, a, b, c, x[k + 7], S42, 0x432AFF97);
      c = II(c, d, a, b, x[k + 14], S43, 0xAB9423A7);
      b = II(b, c, d, a, x[k + 5], S44, 0xFC93A039);
      a = II(a, b, c, d, x[k + 12], S41, 0x655B59C3);
      d = II(d, a, b, c, x[k + 3], S42, 0x8F0CCC92);
      c = II(c, d, a, b, x[k + 10], S43, 0xFFEFF47D);
      b = II(b, c, d, a, x[k + 1], S44, 0x85845DD1);
      a = II(a, b, c, d, x[k + 8], S41, 0x6FA87E4F);
      d = II(d, a, b, c, x[k + 15], S42, 0xFE2CE6E0);
      c = II(c, d, a, b, x[k + 6], S43, 0xA3014314);
      b = II(b, c, d, a, x[k + 13], S44, 0x4E0811A1);
      a = II(a, b, c, d, x[k + 4], S41, 0xF7537E82);
      d = II(d, a, b, c, x[k + 11], S42, 0xBD3AF235);
      c = II(c, d, a, b, x[k + 2], S43, 0x2AD7D2BB);
      b = II(b, c, d, a, x[k + 9], S44, 0xEB86D391);
      a = AddUnsigned(a, AA);
      b = AddUnsigned(b, BB);
      c = AddUnsigned(c, CC);
      d = AddUnsigned(d, DD);
    }
    var temp = WordToHex(a) + WordToHex(b) + WordToHex(c) + WordToHex(d);
    return temp.toLowerCase();
  },

  // ==================== QOBUZ ====================
  searchQobuz: async function(query, limit) {
    var self = this;
    var cacheKey = "qobuz_search_" + query + "_" + limit;
    var cached = self.getCache(cacheKey);
    if (cached) return cached;

    try {
      var url = self.QOBUZ_BASE + "/track/search?app_id=" + self.APP_ID + "&user_auth_token=" + self.USER_AUTH_TOKEN + "&query=" + encodeURIComponent(query) + "&limit=" + (limit * 2);
      var res = await fetch(url);
      if (!res.ok) return [];

      var data = await res.json();
      var results = (data.tracks?.items || []).slice(0, limit).map(function(t) {
        return {
          id: String(t.id),
          title: t.title,
          artist: t.performer?.name || "Unknown",
          album: t.album?.title || "",
          duration: t.duration || 0,
          audioQuality: (t.maximum_bit_depth || 16) + "-bit / " + (t.maximum_sampling_rate || 44100) + " kHz",
          cover: t.album?.image?.large || "",
          isrc: t.isrc || null,
          source: "Qobuz"
        };
      });

      self.setCache(cacheKey, results);
      return results;
    } catch (e) {
      return [];
    }
  },

  getQobuzStream: async function(trackId) {
    var self = this;
    var cacheKey = "qobuz_stream_" + trackId;
    var cached = self.getCache(cacheKey);
    if (cached) return cached;

    try {
      var timestamp = Math.floor(Date.now() / 1000);
      var sigString = "trackgetFileUrlformat_id27intentstreamtrack_id" + trackId + timestamp + self.APP_SECRET;
      var signature = self.md5(sigString);

      var url = self.QOBUZ_BASE + "/track/getFileUrl?app_id=" + self.APP_ID + "&user_auth_token=" + self.USER_AUTH_TOKEN + "&track_id=" + trackId + "&format_id=27&intent=stream&request_ts=" + timestamp + "&request_sig=" + signature;

      var res = await fetch(url);
      if (!res.ok) return { streamUrl: null };

      var data = await res.json();
      var result = {
        streamUrl: data.url || null,
        track: {
          audioQuality: (data.bit_depth || 24) + "-bit / " + (data.sample_rate || 96000) + " kHz",
          source: "Qobuz"
        }
      };

      self.setCache(cacheKey, result);
      return result;
    } catch (e) {
      return { streamUrl: null, error: e.message };
    }
  },

  // ==================== TIDAL ====================
  searchTidal: async function(query, limit) {
    var self = this;
    try {
      var res = await fetch(self.TIDAL_BACKEND + "/search?q=" + encodeURIComponent(query) + "&limit=" + limit);
      if (!res.ok) return [];
      var data = await res.json();
      return (data.tracks || []).map(function(t) {
        return Object.assign({}, t, { source: "Tidal" });
      });
    } catch (e) {
      return [];
    }
  },

  getTidalStream: async function(trackId) {
    var self = this;
    try {
      var res = await fetch(self.TIDAL_BACKEND + "/stream/" + trackId);
      return await res.json();
    } catch (e) {
      return { streamUrl: null };
    }
  },

  // ==================== MERGE ====================
  mergeWithSmartQuality: function(qobuzTracks, tidalTracks, limit) {
    var map = new Map();

    qobuzTracks.forEach(function(track) {
      var key = track.isrc || (track.title + "|" + track.artist).toLowerCase();
      map.set(key, track);
    });

    tidalTracks.forEach(function(track) {
      var key = track.isrc || (track.title + "|" + track.artist).toLowerCase();
      if (!map.has(key)) {
        map.set(key, track);
      } else {
        var existing = map.get(key);
        var better = (parseInt(existing.audioQuality) || 16) >= (parseInt(track.audioQuality) || 16) ? existing : track;
        map.set(key, better);
      }
    });

    return Array.from(map.values()).slice(0, limit);
  },

  // ==================== PUBLIC METHODS ====================
  searchTracks: async function(query, limit = 20) {
    try {
      var qobuzResults = await this.searchQobuz(query, limit);

      if (qobuzResults.length >= Math.floor(limit * 0.6)) {
        return { tracks: qobuzResults, total: qobuzResults.length };
      }

      var tidalResults = await this.searchTidal(query, limit);
      var merged = this.mergeWithSmartQuality(qobuzResults, tidalResults, limit);

      return { tracks: merged, total: merged.length };
    } catch (e) {
      return { tracks: [], total: 0, error: "Search failed. Please try again." };
    }
  },

  searchArtists: async function(query, limit = 10) {
    try {
      var res = await fetch(this.TIDAL_BACKEND + "/search/artists?q=" + encodeURIComponent(query) + "&limit=" + limit);
      if (!res.ok) return { artists: [], total: 0 };
      return await res.json();
    } catch (e) {
      return { artists: [], total: 0 };
    }
  },

  searchPlaylists: async function(query, limit = 10) {
    try {
      var res = await fetch(this.TIDAL_BACKEND + "/search/playlists?q=" + encodeURIComponent(query) + "&limit=" + limit);
      if (!res.ok) return { playlists: [], total: 0 };
      return await res.json();
    } catch (e) {
      return { playlists: [], total: 0 };
    }
  },

  getTrackStreamUrl: async function(trackId, source = "Qobuz", nextTracks = []) {
    try {
      var result;

      if (source === "Qobuz") {
        result = await this.getQobuzStream(trackId);
        if (!result.streamUrl) {
          result = await this.getTidalStream(trackId);
        }
      } else {
        result = await this.getTidalStream(trackId);
      }

      if (nextTracks.length > 0) {
        this.smartPreload(trackId, nextTracks);
      }

      return result;
    } catch (e) {
      return { streamUrl: null, error: "Failed to load stream." };
    }
  }
};

Jeremy;