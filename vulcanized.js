
    (function() {
        Polymer('data-base',{
            db: '',
            login: '',
            ready: function() {
                this.db = new Firebase(this.url);
                if (this.login.indexOf('google') >= 0) {
                    this.loginWithGoogle();
                } else if (this.login.indexOf('facebook') >= 0 || this.login.indexOf('fb') >= 0) {
                    this.loginWithFacebook();
                }
            },
            query: function(node, callback) {
                this.db.child(node).once('value', function(obj) {
                    if (typeof callback === "function") {
                        callback(obj.val());
                    }
                });
            },
            update: function(node, info, callback) {
                var updateNode = this.db.child(node);
                updateNode.update(info, function() {
                    if (typeof callback === "function") {
                        callback();
                    }
                });
            },
            loginWithGoogle: function() {
                var my = this;
                this.db.authWithOAuthPopup("google", function(error, authData) {
                    my.fire('google-login', authData);
                });
            },
            loginWithFacebook: function() {
                var my = this;
                this.db.authWithOAuthPopup("facebook", function(error, authData) {
                    my.fire('facebook-login', authData);
                });
            }
        });
    })();
    ;

    (function() {
        function size(obj) {
            var size = 0,
                key;
            for (key in obj) {
                if (obj.hasOwnProperty(key)) size++;
            }
            return size;
        };

        function keys(obj) {
            var keys = [];
            for (key in obj) {
                keys.push(key);
            }
            return keys;
        };


        var User = function(name, info) {
            var my = this;
            my.name = name;
            my.info = info.info;
            my.videos = info.videos;

            function isToday(timestamp) {
                var today = new Date().toDateString();
                var someday = new Date(timestamp).toDateString();
                return today == someday;
            }
            return {
                photo: function() {
                    return my.info.image;
                },
                videos: function() {
                    return keys(my.videos);
                },
                sentences: function(youtubeid) {
                    if (arguments.length == 0) {
                        var videos = this.videos();
                        var amt = 0;
                        for (var i = 0; i < videos.length; i++) {
                            var sentences = my.videos[videos[i]]['sentences'];
                            amt += size(sentences);
                        }
                        return amt;
                    } else {
                        if (my.videos.hasOwnProperty(youtubeid)) {
                            return Object.keys(my.videos[youtubeid].sentences);
                        } else {
                            return "";
                        }
                    }
                },
                studyHistory: function() {
                    var history = {}
                    this.eachSentence(function(youtubeid, sIdx, sInfo) {
                        var studyInfo = {};
                        var studyTime = sInfo['startTime'];
                        for (i = 0; i < studyTime.length; i++) {
                            var dateKey = getDate(studyTime[i]);
                            if (!history.hasOwnProperty(dateKey)) {
                                history[dateKey] = {
                                    studyTimes: {},
                                    spendTime: 0,
                                    sentenceAmt: 0
                                }
                            }
                            studyInfo = history[dateKey];
                            if (!studyInfo.studyTimes.hasOwnProperty(youtubeid + '_' + sIdx)) {
                                studyInfo.studyTimes[youtubeid + '_' + sIdx] = 0;
                                studyInfo.sentenceAmt += 1;
                            }
                            studyInfo.spendTime += sInfo['eachSpendTime'][i];
                            studyInfo.studyTimes[youtubeid + '_' + sIdx] += 1;
                        };
                    });
                    return history;
                },
                videoInfo: function() {
                    var vid = this.study.vid;
                    var youtubeid = this.study.youtubeid;
                    if (my.videos==null || !my.videos.hasOwnProperty(youtubeid)) {
                        return {};
                    }
                    var sentenceData = JSON.parse(localStorage.getItem(vid));
                    var total = sentenceData.en.length;
                    var accmu = this.sentences(youtubeid).length;
                    var progress = parseInt(accmu * 1000.0 / total) / 10.0;
                    var sentenceKeys = my.videos[youtubeid]['sentences'];
                    sentenceKeys = Object.keys(sentenceKeys);
                    var rtnSentencesInfo = [];
                    for (var i = 0; i < sentenceKeys.length; i++) {
                        var key = sentenceKeys[i];
                        var obj = this.sentenceInfo(youtubeid, key);
                        obj['idx'] = parseInt(key.substr(3)) + 1;
                        rtnSentencesInfo.push(obj);
                    }
                    return {
                        progress: progress,
                        sentences: rtnSentencesInfo
                    };
                },
                sentenceInfo: function(youtubeid, idx) {
                    var rawInfo = my.videos[youtubeid]['sentences'][idx];
                    var practiceTimesKeys = Object.keys(rawInfo);
                    var practiceTimes = practiceTimesKeys.length;
                    var spendTime = 0,
                        todaySpendTime = 0,
                        startTime = [],
                        eachSpendTime = [];
                    var wrongAns = [];
                    var corrects = 0,
                        total = 0;
                    for (var i in practiceTimesKeys) {
                        var key = practiceTimesKeys[i];
                        var idx = rawInfo[key];
                        spendTime += idx.spendTime;
                        corrects += idx.corrects;
                        total += idx.total;
                        if (idx.hasOwnProperty('wrongAns')) {
                            wrongAns = wrongAns.concat(idx['wrongAns']);
                        }
                        if (isToday(idx.startTime)) {
                            todaySpendTime += idx.spendTime;
                        }
                        startTime.push(idx.startTime);
                        eachSpendTime.push(idx.spendTime);
                    }
                    spendTime = parseInt(spendTime * 1000) / 1000.0;
                    return {
                        startTime: startTime,
                        eachSpendTime: eachSpendTime,
                        totalSpendTime: spendTime,
                        todaySpendTime: todaySpendTime,
                        wrongAns: wrongAns,
                        score: parseInt(corrects * 10000.0 / total) / 100.0,
                        practiceTimes: practiceTimes
                    }
                },
                eachSentence: function(callback) {
                    var videoKeys = this.videos();
                    var totalSpendTime = 0,
                        todaySpendTime = 0;
                    for (var i in videoKeys) {
                        var videoKey = videoKeys[i];
                        var sentenceKeys = this.sentences(videoKey);
                        for (var j in sentenceKeys) {
                            var sentenceKey = sentenceKeys[j];
                            var sentenceInfo = this.sentenceInfo(videoKey, sentenceKey);
                            if (typeof callback == 'function') {
                                callback(videoKey, sentenceKey, sentenceInfo);
                            }
                            totalSpendTime += sentenceInfo.totalSpendTime;
                            todaySpendTime += sentenceInfo.todaySpendTime;
                        }
                    }
                    return {
                        total: totalSpendTime,
                        today: todaySpendTime
                    };
                },
                spendTime: function() {
                    var totalSpendTime = 0,
                        todaySpendTime = 0;
                    this.eachSentence(function(videoKey, sentenceKey, sentenceInfo) {
                        totalSpendTime += sentenceInfo.totalSpendTime;
                        todaySpendTime += sentenceInfo.todaySpendTime;
                    });
                    return {
                        total: totalSpendTime,
                        today: todaySpendTime
                    };
                },
                updateSentence: function(sentObj) {
                    var saveObj = {};
                    var self = this;
                    var nodeName = my.name + "/videos/" + this.study.youtubeid + "/sentences";
                    var sentences = this.db.query(nodeName,function(saveObj) {
                        saveObj = saveObj == null ? {}:saveObj;
                        var key = 'idx' + (sentObj.idx < 10 ? '0' : '') + sentObj.idx;
                        if (!saveObj.hasOwnProperty(key)) {
                            saveObj[key] = [];
                        }
                        var info = sentObj.info();
                        delete info.sentence;
                        saveObj[key].push(info);
                        self.db.update(nodeName,saveObj);
                    });
                }
            }
        };

        Polymer('user-info',{
            user: '',
            ready: function() {
                var my = this;
                this.$.users.query(my.name, function(data) {
                    my.user = new User(my.name, data);
                    my.user.db = my.$.users;
                    my.fire('user-info-ready');
                });
            },
            updateSentence:function(sentObj){
                this.user.updateSentence(this.$.users,this.$.user,sendObj);
            },
            info: function() {
                console.log(this.user);
            }
        });
    })();
    ;

    (function() {
        Polymer('user-card',{
        	total:0,sentence:0,video:0,
        	img:'http://www.filecluster.com/howto/wp-content/uploads/2014/07/User-Default.jpg',
            fireHover: false,
            ready2Go: false,
            user: '',
            ready: function() {
            	var my = this;
                this.addEventListener("user-info-ready",function(e){
                    my.$.main.classList.add('cardinit');
                	my.user = my.$.data.user;
                	my.$.img.src = my.user.photo();
                	var spendTime = my.user.spendTime();
	                my.today = my.timeConvert(spendTime.today);
	                my.total = my.timeConvert(spendTime.total);
	                my.video = my.user.videos().length;
	                my.sentence = my.user.sentences();
                    my.ready2Go = true;
                });
            },
            click: function(e) {
                this.fire('user-card-click', this.name);
            },
            timeConvert: function(n) {
                var sec = parseInt(n);
                var min = sec > 60 ? parseInt(sec / 60) : 0;
                var hour = min > 60 ? parseInt(min / 60) : 0;
                if (hour > 0) {
                    return hour + '小時' + min % 60 + '分鐘';
                }
                if (min > 0) {
                    return min + '分' + sec % 60 + '秒';
                }
                return min + '分' + sec + '秒';
            },
            onHovered: function() {
                if (this.ready2Go && !this.fireHover) {
                    this.fire('user-card-onHovered', this.user);
                    this.fireHover = true;
                }
            },
            onUnhovered: function() {
                if (this.ready2Go && this.fireHover) {
                    this.fire('user-card-onUnhovered', this.user);
                    this.fireHover = false;
                }
            }
        });
    })();
    ;

(function(){
	Polymer('user-card-list',{
		ready:function(){
			this.users = [
			{name:'marty'},
			{name:'Lynn'},
			{name:'NaNa'},
			{name:'NiNa'}];
	    }
	});
})();
;

    (function() {
        Polymer('video-card',{
            seqAmt: 0,
            ready: function() {
                var my = this;
                this.$.img.src = 'http://img.youtube.com/vi/' + this.youtubeid + '/0.jpg';
            },
            click: function(e) {
            	var my = this;
                this.$.video.query(my.vid, function(captions) {
                    my.captions = captions;
                    my.seqAmt = captions.en.length;
                    localStorage.setItem(my.vid,JSON.stringify(captions));
                    my.fire('video-card-click', {
                        vid: my.vid,
                        youtubeid: my.youtubeid,
                        name: my.name
                    });
                });
            }
        });
    })();
    ;

    (function() {
        Polymer('video-card-list',{
            videos: [],
            ready: function() {
                var my = this;
            this.$.db.query('videos', function(data) {
                my.$.db.query('order', function(list) {
                    list = list.split(',');
                    var videoList = [];
                    for (var i in list) {
                        var videoInfo = data[list[i]];
                        videoList.push(videoInfo);
                    }
                    my.videos = videoList;
                });
            });
            }
        });
    })();
    ;

(function() {
  
  Polymer('core-shared-lib',{
    
    notifyEvent: 'core-shared-lib-load',
    
    ready: function() {
      if (!this.url && this.defaultUrl) {
        this.url = this.defaultUrl;
      }
    },
    
    urlChanged: function() {
      require(this.url, this, this.callbackName);
    },
    
    provide: function() {
      this.async('notify');
    },
    
    notify: function() {
      this.fire(this.notifyEvent, arguments);
    }
    
  });

  var apiMap = {};
  
  function require(url, notifiee, callbackName) {
    // make hashable string form url
    var name = nameFromUrl(url);
    // lookup existing loader instance
    var loader = apiMap[name];
    // create a loader as needed
    if (!loader) {
      loader = apiMap[name] = new Loader(name, url, callbackName);
    }
    loader.requestNotify(notifiee);
  }
  
  function nameFromUrl(url) {
    return url.replace(/[\:\/\%\?\&\.\=\-]/g, '_') + '_api';
  }

  var Loader = function(name, url, callbackName) {
    this.instances = [];
    this.callbackName = callbackName;
    if (this.callbackName) {
      window[this.callbackName] = this.success.bind(this);
    } else {
      if (url.indexOf(this.callbackMacro) >= 0) {
        this.callbackName = name + '_loaded';
        window[this.callbackName] = this.success.bind(this);
        url = url.replace(this.callbackMacro, this.callbackName);
      } else {
        // TODO(sjmiles): we should probably fallback to listening to script.load
        throw 'core-shared-api: a %%callback%% parameter is required in the API url';
      }
    }
    //
    this.addScript(url);
  };
  
  Loader.prototype = {
    
    callbackMacro: '%%callback%%',
    loaded: false,
    
    addScript: function(src) {
      var script = document.createElement('script');
      script.src = src;
      script.onerror = this.error.bind(this);
      var s = document.querySelector('script');
      s.parentNode.insertBefore(script, s);
      this.script = script;
    },
    
    removeScript: function() {
      if (this.script.parentNode) {
        this.script.parentNode.removeChild(this.script);
      }
      this.script = null;
    },
    
    error: function() {
      this.cleanup();
    },
    
    success: function() {
      this.loaded = true;
      this.cleanup();
      this.result = Array.prototype.slice.call(arguments);
      this.instances.forEach(this.provide, this);
      this.instances = null;
    },
    
    cleanup: function() {
      delete window[this.callbackName];
    },

    provide: function(instance) {
      instance.notify(instance, this.result);
    },
    
    requestNotify: function(instance) {
      if (this.loaded) {
        this.provide(instance);
      } else {
        this.instances.push(instance);
      }
    }
    
  };
  
})();
;

  Polymer('google-client-api',{
    defaultUrl: 'https://apis.google.com/js/client.js?onload=%%callback%%',
    notifyEvent: 'api-load',
    get api() {
      return gapi.client;
    },
    get auth() {
      return gapi.auth;
    }
  });
;

  (function() {
    'use strict';

    // Stores whether the API client is done loading.
    var clientLoaded_ = false;

    // Loaders and loading statuses for all APIs, indexed by API name.
    // This helps prevent multiple loading requests being fired at the same time
    // by multiple google-api-loader elements.
    var statuses_ = {};
    var loaders_ = {};

    Polymer('google-api-loader', {
      /**
       * Fired when the requested API is loaded.
       * @event google-api-load
       */

      /**
       * Fired if an error occurs while loading the requested API.
       * @event google-api-load-error
       */

      /**
       * Name of the API to load, e.g. 'urlshortener'.
       *
       * You can find the full list of APIs on the
       * <a href="https://developers.google.com/apis-explorer"> Google APIs
       * Explorer</a>.
       * @attribute name
       * @type string
       * @required
       */
      name: '',

      /**
       * Version of the API to load, e.g. 'v1'.
       * @attribute version
       * @type string
       * @required
       */
      version: '',

      /**
       * App Engine application ID for loading a Google Cloud Endpoints API.
       * @attribute appId
       * @type string
       */

      // Used to fix events potentially being fired multiple times by
      // core-shared-lib.
      waiting: false,

      successEventName: 'google-api-load',
      errorEventName: 'google-api-load-error',

      /**
       * Returns the loaded API.
       * @method api
       */
      get api() {
        if (window.gapi && window.gapi.client &&
            window.gapi.client[this.name]) {
          return window.gapi.client[this.name];
        } else {
          return undefined;
        }
      },

      handleLoadResponse: function(response) {
        if (response && response.error) {
          statuses_[this.name] = 'error';
          this.fireError(response);
        } else {
          statuses_[this.name] = 'loaded';
          this.fireSuccess();
        }
      },

      fireSuccess: function() {
        this.fire(this.successEventName,
            { 'name': this.name, 'version': this.version });
      },

      fireError: function(response) {
        if (response && response.error) {
          this.fire(this.errorEventName, {
            'name': this.name,
            'version': this.version,
            'error': response.error });
        } else {
          this.fire(this.errorEventName, {
            'name': this.name,
            'version': this.version });
        }
      },

      doneLoadingClient: function() {
        clientLoaded_ = true;
        // Fix for API client load event being fired multiple times by
        // core-shared-lib.
        if (!this.waiting) {
          this.loadApi();
        }
      },

      createSelfRemovingListener: function(eventName) {
        var self = this;
        var handler = function () {
          loaders_[self.name].removeEventListener(eventName, handler);
          self.loadApi();
        };

        return handler;
      },

      loadApi: function() {
        if (clientLoaded_ && this.name && this.version) {
          this.waiting = false;
          // Is this API already loaded?
          if (statuses_[this.name] == 'loaded') {
            this.fireSuccess();
          // Is a different google-api-loader already loading this API?
          } else if (statuses_[this.name] == 'loading') {
            this.waiting = true;
            loaders_[this.name].addEventListener(this.successEventName,
                this.createSelfRemovingListener(this.successEventName));
            loaders_[this.name].addEventListener(this.errorEventName,
                this.createSelfRemovingListener(this.errorEventName));
          // Did we get an error when we tried to load this API before?
          } else if (statuses_[this.name] == 'error') {
            this.fireError();
          // Otherwise, looks like we're loading a new API.
          } else {
            var root;
            if (this.appId) {
              root = 'https://' + this.appId + '.appspot.com/_ah/api';
            }
            statuses_[this.name] = 'loading';
            loaders_[this.name] = this;
            gapi.client.load(this.name, this.version,
                this.handleLoadResponse.bind(this), root);
          }
        }
      }
    });
  })();
;

  Polymer('google-jsapi',{
    defaultUrl: 'https://www.google.com/jsapi?callback=%%callback%%',
    notifyEvent: 'api-load',
    get api() {
      return google;
    }
  });
;


  Polymer('google-maps-api',{

    defaultUrl: 'https://maps.googleapis.com/maps/api/js?callback=%%callback%%',

    /**
     * A Maps API key. To obtain an API key, see developers.google.com/maps/documentation/javascript/tutorial#api_key.
     *
     * @attribute apiKey
     * @type string
     */
    apiKey: null,

   /**
     * A Maps API for Business Client ID. To obtain a Maps API for Business Client ID, see developers.google.com/maps/documentation/business/.
     * If set, a Client ID will take precedence over an API Key.
     *
     * @attribute clientId
     * @type string
     */
    clientId: null,

    /**
     * The libraries to load with this api. Defaults to "places", but an example
     * value might be, "places,geometry"
     * see developers.google.com/maps/documentation/javascript/libraries
     *
     * @attribute libraries
     * @type string
     */
    libraries: "places",

    /**
     * Version of the Maps API to use.
     *
     * @attribute version
     * @type string
     * @default '3.exp'
     */
    version: '3.exp',

    notifyEvent: 'api-load',

    ready: function() {
      var url = this.defaultUrl + '&v=' + this.version;
      url += "&libraries=" + this.libraries;
      if (this.apiKey && !this.clientId) {
        url += '&key=' + this.apiKey;
      }
      if (this.clientId) {
        url += '&client=' + this.clientId;
      }
      this.url = url;
    },

    /**
     * Provides the google.maps JS API namespace.
     *
     * @property api
     * @type google.maps
     */
    get api() {
      return google.maps;
    }
  });
;

  Polymer('google-plusone-api',{
    defaultUrl: 'https://apis.google.com/js/plusone.js?onload=%%callback%%',
    notifyEvent: 'api-load',
    get api() {
      return gapi;
    }
  });
;

  Polymer('google-youtube-api',{
    defaultUrl: 'https://www.youtube.com/iframe_api',
    notifyEvent: 'api-load',
    callbackName: 'onYouTubeIframeAPIReady',
    get api() {
      return YT;
    }
  });
;

    Polymer('google-youtube',{
      /**
       * Fired when the YouTube player is fully initialized and ready for use.
       *
       * @event google-youtube-ready
       */

      /**
       * Fired when the state of the player changes. `e.detail.data` is set to one of
       * [the documented](https://developers.google.com/youtube/iframe_api_reference#onStateChange)
       * states.
       *
       * @event google-youtube-state-change
       * @param {Object} e Event parameters.
       */

      /**
       * Fired when playback fails due to an error. `e.detail.data` is set to one of
       * [the documented](https://developers.google.com/youtube/iframe_api_reference#onError)
       * error codes.
       *
       * @event google-youtube-error
       * @param {Object} e Event parameters.
       */

      /**
       * Sets the id of the video to play. Changing this attribute will trigger a call
       * to cue a new video into the player.
       *
       * You can [search for videos programmatically](https://developers.google.com/youtube/v3/docs/search/list)
       * using the YouTube Data API, or just hardcode known video ids to display on your page.
       *
       * @attribute videoid
       * @type string
       * @default 'mN7IAaRdi_k'
       */
      videoid: 'mN7IAaRdi_k',

      /**
       * Sets the height of the player on the page.
       * Accepts anything valid for a CSS measurement, e.g. '200px' or '50%'.
       * If the unit of measurement is left off, 'px' is assumed.
       *
       * @attribute height
       * @type string
       * @default '270px'
       */
      height: '270px',

      /**
       * Sets the width of the player on the page.
       * Accepts anything valid for a CSS measurement, e.g. '200px' or '50%'.
       * If the unit of measurement is left off, 'px' is assumed.
       *
       * @attribute width
       * @type string
       * @default '480px'
       */
      width: '480px',

      /**
       * Exposes the current player state.
       * Using this attribute is an alternative to listening to `google-youtube-state-change` events,
       * and can simplify the logic in templates with conditional binding.
       *
       * The [possible values](https://developers.google.com/youtube/iframe_api_reference#onStateChange):
       *   - -1 (unstarted)
       *   - 0 (ended)
       *   - 1 (playing)
       *   - 2 (paused)
       *   - 3 (buffering)
       *   - 5 (video cued)
       *
       * @attribute state
       * @type number
       * @default -1
       */
      state: -1,

      /**
       * Exposes the current playback time, in seconds.
       *
       * You can divide this value by the `duration` to determine the playback percentage.
       *
       * @attribute currenttime
       * @type number
       */
      currenttime: 0,

      /**
       * Exposes the video duration, in seconds.
       *
       * You can divide the `currenttime` to determine the playback percentage.
       *
       * @attribute duration
       * @type number
       */
      duration: 1, // To avoid divide-by-zero errors if used before video is cued.

      /**
       * Exposes the current playback time, formatted as a (HH:)MM:SS string.
       *
       *
       * @attribute currenttimeformatted
       * @type string
       */
      currenttimeformatted: '0:00',

      /**
       * Exposes the video duration, formatted as a (HH:)MM:SS string.
       *
       * @attribute durationformatted
       * @type string
       */
      durationformatted: '0:00', // To avoid divide-by-zero errors if used before video is cued.

      /**
       * The fraction of the bytes that have been loaded for the current video, in the range [0-1].
       *
       * @attribute fractionloaded
       * @type number
       */
      fractionloaded: 0,

      /**
       * A shorthand to enable a set of player attributes that, used together, simulate a "chromeless" YouTube player.
       *
       * Equivalent to setting the following attributes:
       * - `controls="0"`
       * - `modestbranding="1"`
       * - `showinfo="0"`
       * - `iv_load_policy="3"`
       * - `rel="0"`
       *
       * The "chromeless" player has minimal YouTube branding in cued state, and the native controls
       * will be disabled during playback. Creating your own custom play/pause/etc. controls is recommended.
       *
       * @attribute chromeless
       * @type boolean
       * @default false
       */
      chromeless: false,

      /**
       * The URL of an image to use as a custom thumbnail.
       *
       * This is optional; if not provided, the standard YouTube embed (which uses the thumbnail associated
       * with the video on YouTube) will be used.
       *
       * If `thumbnail` is set, than an `<img>` containing the thumbnail will be used in lieu of the actual
       * YouTube embed. When the thumbnail is clicked, the `<img>` is swapped out for the actual YouTube embed,
       * which will have [`autoplay=1`](https://developers.google.com/youtube/player_parameters#autoplay) set by default (in addtional to any other player parameters specified on this element).
       *
       * Please note that `autoplay=1` won't actually autoplay videos on mobile browsers, so two taps will be required
       * to play the video there. Also, on desktop browsers, setting `autoplay=1` will prevent the playback
       * from [incrementing the view count](https://support.google.com/youtube/answer/1714329) for the video.
       *
       * @attribute thumbnail
       * @type string
       * @default ''
       */
      thumbnail: '',

      /**
       * If `fluid` is set, then the player will set its width to 100% to fill
       * the parent container, while adding `padding-top` to preserve the
       * apect ratio provided by `width` and `height`. If `width` and `height`
       * have not been set, the player will fall back to a 16:9 aspect ratio.
       * This is useful for responsive designs where you don't want to 
       * introduce letterboxing on your video.
       *
       * @attribute fluid
       * @type boolean
       * @default false
       */
      fluid: false,

      /**
       * Sets fluid width/height
       *
       * If the fluid attribute is set, the aspect ratio of the video will
       * be inferred (if set in pixels), or assumed to be 16:9. The element
       * will give itself enough top padding to force the player to use the
       * correct aspect ratio, even as the screen size changes.
       *
       */
      ready: function() {
        if (this.hasAttribute('fluid')) {
          var ratio = parseInt(this.height, 10) / parseInt(this.width, 10);
          if (isNaN(ratio)) {
            ratio = 9/16;
          }
          ratio *= 100;
          this.width = '100%';
          this.height = 'auto';
          this.style['padding-top'] = ratio + '%';
        }
      },

      /**
       * Plays the current video.
       *
       * Note that on certain mobile browsers, playback
       * [can't be initiated programmatically](https://developers.google.com/youtube/iframe_api_reference#Mobile_considerations).
       *
       * @method play
       */
      play: function() {
        if (this.player && this.player.playVideo) {
          this.player.playVideo();
        }
      },

      /**
       * Modifies the volume of the current video.
       *
       * Developers should take care not to break expected user experience by programmatically
       * modifying the volume on mobile browsers.
       * Note that the YouTube player, in addition, does not display volume controls in a
       * mobile environment.
       *
       * @method setVolume
       * @param {number} volume The new volume, an integer between 0 (muted) and 100 (loudest).
       */      
      setVolume: function(volume) {
        if (this.player && this.player.setVolume) {
          this.player.setVolume(volume);
        }
      },
      
      /**
       * Mutes the current video.
       *
       * Developers should take care not to break expected user experience by programmatically
       * modifying the volume on mobile browsers.
       * Note that the YouTube player, in addition, does not display volume controls in a
       * mobile environment.
       *
       * @method mute
       */        
      mute: function() {
        if (this.player && this.player.mute) {
          this.player.mute();
        }
      },

      /**
       * Unmutes the current video.
       *
       * Developers should take care not to break expected user experience by programmatically
       * modifying the volume on mobile browsers.
       * Note that the YouTube player, in addition, does not display volume controls in a
       * mobile environment.
       *
       * @method unMute
       */        
      unMute: function() {
        if (this.player && this.player.unMute) {
          this.player.unMute();
        }
      },
      
      /**
       * Pauses the current video.
       *
       * @method pause
       */
      pause: function() {
        if (this.player && this.player.pauseVideo) {
          this.player.pauseVideo();
        }
      },

      /**
       * Skips ahead (or back) to the specified number of seconds.
       *
       * @method seekTo
       * @param {number} seconds Number of seconds to seek to.
       */
      seekTo: function(seconds) {
        if (this.player && this.player.seekTo) {
          this.player.seekTo(seconds, true);
        }
      },

      videoidChanged: function() {
        this.currenttime = 0;
        this.currenttimeformatted = this.toHHMMSS(0);
        this.fractionloaded = 0;
        this.duration = 0;
        this.durationformatted = this.toHHMMSS(0);

        if (this.player && this.player.cueVideoById) {
          this.player.cueVideoById(this.videoid);
        } else {
          this.pendingVideoId = this.videoid;
        }
      },

      player: null,
      updatePlaybackStatsInterval: null,
      pendingVideoId: '',
      autoplay: 0,

      apiLoad: function() {
        // Establish some defaults. Attributes set on the google-youtube element
        // can override defaults, or specify addtional player parameters. See
        // https://developers.google.com/youtube/player_parameters
        var playerVars = {
          playsinline: 1,
          controls: 2,
          autohide: 1,
          // This will (intentionally) be overwritten if this.attributes['autoplay'] is set.
          autoplay: this.autoplay
        };

        if (this.chromeless) {
          playerVars.controls = 0;
          playerVars.modestbranding = 1;
          playerVars.showinfo = 0;
          // Disable annotations.
          playerVars.iv_load_policy = 3;
          // Disable related videos on the end screen.
          playerVars.rel = 0;
        }

        for (var i = 0; i < this.attributes.length; i++) {
          var attribute = this.attributes[i];
          playerVars[attribute.nodeName] = attribute.value;
        }
        this.player = new YT.Player(this.$.player, {
          videoId: this.videoid,
          width: '100%',
          height: '100%',
          playerVars: playerVars,
          events: {
            onReady: function(e) {
              if (this.pendingVideoId && this.pendingVideoId != this.videoid) {
                this.player.cueVideoById(this.pendingVideoId);
                this.pendingVideoId = '';
              }
              this.fire('google-youtube-ready', e);
            }.bind(this),
            onStateChange: function(e) {
              this.state = e.data;

              // The YouTube Player API only exposes playback data about a video once
              // playback has begun.
              if (this.state == 1) {
                this.duration = this.player.getDuration();
                this.durationformatted = this.toHHMMSS(this.duration);

                if (!this.updatePlaybackStatsInterval) {
                  this.updatePlaybackStatsInterval = setInterval(this.updatePlaybackStats.bind(this), 1000);
                }
              } else {
                // We only need to update the stats if the video is playing.
                if (this.updatePlaybackStatsInterval) {
                  clearInterval(this.updatePlaybackStatsInterval);
                  this.updatePlaybackStatsInterval = null;
                }
              }
              this.fire('google-youtube-state-change', e);
            }.bind(this),
            onError: function(e) {
              // Set the player state to 0 ('ended'), since playback will have stopped.
              this.state = 0;
              this.fire('google-youtube-error', e);
            }.bind(this)
          }
        });
      },

      updatePlaybackStats: function() {
        this.currenttime = Math.round(this.player.getCurrentTime());
        this.currenttimeformatted = this.toHHMMSS(this.currenttime);
        this.fractionloaded = this.player.getVideoLoadedFraction();
      },

      toHHMMSS: function(totalSeconds) {
        var hours = Math.floor(totalSeconds / 3600);
        totalSeconds -= hours * 3600;
        var minutes = Math.floor(totalSeconds / 60);
        var seconds = Math.round(totalSeconds - (minutes * 60));

        var hourPortion = '';
        if (hours > 0) {
          hourPortion += hours + ':';

          if (minutes < 10) {
            minutes = '0' + minutes;
          }
        }

        if (seconds < 10) {
          seconds = '0' + seconds;
        }

        return hourPortion + minutes + ':' + seconds;
      },

      handleThumbnailTap: function() {
        this.autoplay = 1;
        this.thumbnail = '';
      }
    });
  ;

  (function() {
    /*
     * Chrome uses an older version of DOM Level 3 Keyboard Events
     *
     * Most keys are labeled as text, but some are Unicode codepoints.
     * Values taken from: http://www.w3.org/TR/2007/WD-DOM-Level-3-Events-20071221/keyset.html#KeySet-Set
     */
    var KEY_IDENTIFIER = {
      'U+0009': 'tab',
      'U+001B': 'esc',
      'U+0020': 'space',
      'U+002A': '*',
      'U+0030': '0',
      'U+0031': '1',
      'U+0032': '2',
      'U+0033': '3',
      'U+0034': '4',
      'U+0035': '5',
      'U+0036': '6',
      'U+0037': '7',
      'U+0038': '8',
      'U+0039': '9',
      'U+0041': 'a',
      'U+0042': 'b',
      'U+0043': 'c',
      'U+0044': 'd',
      'U+0045': 'e',
      'U+0046': 'f',
      'U+0047': 'g',
      'U+0048': 'h',
      'U+0049': 'i',
      'U+004A': 'j',
      'U+004B': 'k',
      'U+004C': 'l',
      'U+004D': 'm',
      'U+004E': 'n',
      'U+004F': 'o',
      'U+0050': 'p',
      'U+0051': 'q',
      'U+0052': 'r',
      'U+0053': 's',
      'U+0054': 't',
      'U+0055': 'u',
      'U+0056': 'v',
      'U+0057': 'w',
      'U+0058': 'x',
      'U+0059': 'y',
      'U+005A': 'z',
      'U+007F': 'del'
    };

    /*
     * Special table for KeyboardEvent.keyCode.
     * KeyboardEvent.keyIdentifier is better, and KeyBoardEvent.key is even better than that
     *
     * Values from: https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent.keyCode#Value_of_keyCode
     */
    var KEY_CODE = {
      13: 'enter',
      27: 'esc',
      33: 'pageup',
      34: 'pagedown',
      35: 'end',
      36: 'home',
      32: 'space',
      37: 'left',
      38: 'up',
      39: 'right',
      40: 'down',
      46: 'del',
      106: '*'
    };

    /*
     * KeyboardEvent.key is mostly represented by printable character made by the keyboard, with unprintable keys labeled
     * nicely.
     *
     * However, on OS X, Alt+char can make a Unicode character that follows an Apple-specific mapping. In this case, we
     * fall back to .keyCode.
     */
    var KEY_CHAR = /[a-z0-9*]/;

    function transformKey(key) {
      var validKey = '';
      if (key) {
        var lKey = key.toLowerCase();
        if (lKey.length == 1) {
          if (KEY_CHAR.test(lKey)) {
            validKey = lKey;
          }
        } else if (lKey == 'multiply') {
          // numpad '*' can map to Multiply on IE/Windows
          validKey = '*';
        } else {
          validKey = lKey;
        }
      }
      return validKey;
    }

    var IDENT_CHAR = /U\+/;
    function transformKeyIdentifier(keyIdent) {
      var validKey = '';
      if (keyIdent) {
        if (IDENT_CHAR.test(keyIdent)) {
          validKey = KEY_IDENTIFIER[keyIdent];
        } else {
          validKey = keyIdent.toLowerCase();
        }
      }
      return validKey;
    }

    function transformKeyCode(keyCode) {
      var validKey = '';
      if (Number(keyCode)) {
        if (keyCode >= 65 && keyCode <= 90) {
          // ascii a-z
          // lowercase is 32 offset from uppercase
          validKey = String.fromCharCode(32 + keyCode);
        } else if (keyCode >= 112 && keyCode <= 123) {
          // function keys f1-f12
          validKey = 'f' + (keyCode - 112);
        } else if (keyCode >= 48 && keyCode <= 57) {
          // top 0-9 keys
          validKey = String(48 - keyCode);
        } else if (keyCode >= 96 && keyCode <= 105) {
          // num pad 0-9
          validKey = String(96 - keyCode);
        } else {
          validKey = KEY_CODE[keyCode];
        }
      }
      return validKey;
    }

    function keyboardEventToKey(ev) {
      // fall back from .key, to .keyIdentifier, and then to .keyCode
      var normalizedKey = transformKey(ev.key) || transformKeyIdentifier(ev.keyIdentifier) || transformKeyCode(ev.keyCode) || '';
      return {
        shift: ev.shiftKey,
        ctrl: ev.ctrlKey,
        meta: ev.metaKey,
        alt: ev.altKey,
        key: normalizedKey
      };
    }

    /*
     * Input: ctrl+shift+f7 => {ctrl: true, shift: true, key: 'f7'}
     * ctrl/space => {ctrl: true} || {key: space}
     */
    function stringToKey(keyCombo) {
      var keys = keyCombo.split('+');
      var keyObj = Object.create(null);
      keys.forEach(function(key) {
        if (key == 'shift') {
          keyObj.shift = true;
        } else if (key == 'ctrl') {
          keyObj.ctrl = true;
        } else if (key == 'alt') {
          keyObj.alt = true;
        } else {
          keyObj.key = key;
        }
      });
      return keyObj;
    }

    function keyMatches(a, b) {
      return Boolean(a.alt) == Boolean(b.alt) && Boolean(a.ctrl) == Boolean(b.ctrl) && Boolean(a.shift) == Boolean(b.shift) && a.key === b.key;
    }

    /**
     * Fired when a keycombo in `keys` is pressed.
     *
     * @event keys-pressed
     */
    function processKeys(ev) {
      var current = keyboardEventToKey(ev);
      for (var i = 0, dk; i < this._desiredKeys.length; i++) {
        dk = this._desiredKeys[i];
        if (keyMatches(dk, current)) {
          ev.preventDefault();
          ev.stopPropagation();
          this.fire('keys-pressed', current, this, false);
          break;
        }
      }
    }

    function listen(node, handler) {
      if (node && node.addEventListener) {
        node.addEventListener('keydown', handler);
      }
    }

    function unlisten(node, handler) {
      if (node && node.removeEventListener) {
        node.removeEventListener('keydown', handler);
      }
    }

    Polymer('core-a11y-keys', {
      created: function() {
        this._keyHandler = processKeys.bind(this);
      },
      attached: function() {
        listen(this.target, this._keyHandler);
      },
      detached: function() {
        unlisten(this.target, this._keyHandler);
      },
      publish: {
        /**
         * The set of key combinations to listen for.
         *
         * @attribute keys
         * @type string (keys syntax)
         * @default ''
         */
        keys: '',
        /**
         * The node that will fire keyboard events.
         *
         * @attribute target
         * @type Node
         * @default null
         */
        target: null
      },
      keysChanged: function() {
        // * can have multiple mappings: shift+8, * on numpad or Multiply on numpad
        var normalized = this.keys.replace('*', '* shift+*');
        this._desiredKeys = normalized.toLowerCase().split(' ').map(stringToKey);
      },
      targetChanged: function(oldTarget) {
        unlisten(oldTarget, this._keyHandler);
        listen(this.target, this._keyHandler);
      }
    });
  })();
;


  Polymer('core-range', {
    
    /**
     * The number that represents the current value.
     *
     * @attribute value
     * @type number
     * @default 0
     */
    value: 0,
    
    /**
     * The number that indicates the minimum value of the range.
     *
     * @attribute min
     * @type number
     * @default 0
     */
    min: 0,
    
    /**
     * The number that indicates the maximum value of the range.
     *
     * @attribute max
     * @type number
     * @default 100
     */
    max: 100,
    
    /**
     * Specifies the value granularity of the range's value.
     *
     * @attribute step
     * @type number
     * @default 1
     */
    step: 1,
    
    /**
     * Returns the ratio of the value.
     *
     * @attribute ratio
     * @type number
     * @default 0
     */
    ratio: 0,
    
    observe: {
      'value min max step': 'update'
    },
    
    calcRatio: function(value) {
      return (this.clampValue(value) - this.min) / (this.max - this.min);
    },
    
    clampValue: function(value) {
      return Math.min(this.max, Math.max(this.min, this.calcStep(value)));
    },
    
    calcStep: function(value) {
      return this.step ? (Math.round(value / this.step) / (1 / this.step)) : value;
    },
    
    validateValue: function() {
      var v = this.clampValue(this.value);
      this.value = this.oldValue = isNaN(v) ? this.oldValue : v;
      return this.value !== v;
    },
    
    update: function() {
      this.validateValue();
      this.ratio = this.calcRatio(this.value) * 100;
    }
    
  });
  
;

  
    Polymer('paper-progress', {
      
      /**
       * The number that represents the current secondary progress.
       *
       * @attribute secondaryProgress
       * @type number
       * @default 0
       */
      secondaryProgress: 0,
      
      step: 0,
      
      observe: {
        'value secondaryProgress min max': 'update'
      },
      
      update: function() {
        this.super();
        this.secondaryProgress = this.clampValue(this.secondaryProgress);
        this.secondaryRatio = this.calcRatio(this.secondaryProgress) * 100;
      }
      
    });
    
  ;


  (function() {
    
    var SKIP_ID = 'meta';
    var metaData = {}, metaArray = {};

    Polymer('core-meta', {
      
      /**
       * The type of meta-data.  All meta-data with the same type with be
       * stored together.
       * 
       * @attribute type
       * @type string
       * @default 'default'
       */
      type: 'default',
      
      alwaysPrepare: true,
      
      ready: function() {
        this.register(this.id);
      },
      
      get metaArray() {
        var t = this.type;
        if (!metaArray[t]) {
          metaArray[t] = [];
        }
        return metaArray[t];
      },
      
      get metaData() {
        var t = this.type;
        if (!metaData[t]) {
          metaData[t] = {};
        }
        return metaData[t];
      },
      
      register: function(id, old) {
        if (id && id !== SKIP_ID) {
          this.unregister(this, old);
          this.metaData[id] = this;
          this.metaArray.push(this);
        }
      },
      
      unregister: function(meta, id) {
        delete this.metaData[id || meta.id];
        var i = this.metaArray.indexOf(meta);
        if (i >= 0) {
          this.metaArray.splice(i, 1);
        }
      },
      
      /**
       * Returns a list of all meta-data elements with the same type.
       * 
       * @property list
       * @type array
       * @default []
       */
      get list() {
        return this.metaArray;
      },
      
      /**
       * Retrieves meta-data by ID.
       *
       * @method byId
       * @param {String} id The ID of the meta-data to be returned.
       * @returns Returns meta-data.
       */
      byId: function(id) {
        return this.metaData[id];
      }
      
    });
    
  })();
  
;

  
    Polymer('core-iconset', {
  
      /**
       * The URL of the iconset image.
       *
       * @attribute src
       * @type string
       * @default ''
       */
      src: '',

      /**
       * The width of the iconset image. This must only be specified if the
       * icons are arranged into separate rows inside the image.
       *
       * @attribute width
       * @type number
       * @default 0
       */
      width: 0,

      /**
       * A space separated list of names corresponding to icons in the iconset
       * image file. This list must be ordered the same as the icon images
       * in the image file.
       *
       * @attribute icons
       * @type string
       * @default ''
       */
      icons: '',

      /**
       * The size of an individual icon. Note that icons must be square.
       *
       * @attribute iconSize
       * @type number
       * @default 24
       */
      iconSize: 24,

      /**
       * The horizontal offset of the icon images in the inconset src image.
       * This is typically used if the image resource contains additional images
       * beside those intended for the iconset.
       *
       * @attribute offsetX
       * @type number
       * @default 0
       */
      offsetX: 0,
      /**
       * The vertical offset of the icon images in the inconset src image.
       * This is typically used if the image resource contains additional images
       * beside those intended for the iconset.
       *
       * @attribute offsetY
       * @type number
       * @default 0
       */
      offsetY: 0,
      type: 'iconset',

      created: function() {
        this.iconMap = {};
        this.iconNames = [];
        this.themes = {};
      },
  
      ready: function() {
        // TODO(sorvell): ensure iconset's src is always relative to the main
        // document
        if (this.src && (this.ownerDocument !== document)) {
          this.src = this.resolvePath(this.src, this.ownerDocument.baseURI);
        }
        this.super();
        this.updateThemes();
      },

      iconsChanged: function() {
        var ox = this.offsetX;
        var oy = this.offsetY;
        this.icons && this.icons.split(/\s+/g).forEach(function(name, i) {
          this.iconNames.push(name);
          this.iconMap[name] = {
            offsetX: ox,
            offsetY: oy
          }
          if (ox + this.iconSize < this.width) {
            ox += this.iconSize;
          } else {
            ox = this.offsetX;
            oy += this.iconSize;
          }
        }, this);
      },

      updateThemes: function() {
        var ts = this.querySelectorAll('property[theme]');
        ts && ts.array().forEach(function(t) {
          this.themes[t.getAttribute('theme')] = {
            offsetX: parseInt(t.getAttribute('offsetX')) || 0,
            offsetY: parseInt(t.getAttribute('offsetY')) || 0
          };
        }, this);
      },

      // TODO(ffu): support retrived by index e.g. getOffset(10);
      /**
       * Returns an object containing `offsetX` and `offsetY` properties which
       * specify the pixel locaion in the iconset's src file for the given
       * `icon` and `theme`. It's uncommon to call this method. It is useful,
       * for example, to manually position a css backgroundImage to the proper
       * offset. It's more common to use the `applyIcon` method.
       *
       * @method getOffset
       * @param {String|Number} icon The name of the icon or the index of the
       * icon within in the icon image.
       * @param {String} theme The name of the theme.
       * @returns {Object} An object specifying the offset of the given icon 
       * within the icon resource file; `offsetX` is the horizontal offset and
       * `offsetY` is the vertical offset. Both values are in pixel units.
       */
      getOffset: function(icon, theme) {
        var i = this.iconMap[icon];
        if (!i) {
          var n = this.iconNames[Number(icon)];
          i = this.iconMap[n];
        }
        var t = this.themes[theme];
        if (i && t) {
          return {
            offsetX: i.offsetX + t.offsetX,
            offsetY: i.offsetY + t.offsetY
          }
        }
        return i;
      },

      /**
       * Applies an icon to the given element as a css background image. This
       * method does not size the element, and it's often necessary to set 
       * the element's height and width so that the background image is visible.
       *
       * @method applyIcon
       * @param {Element} element The element to which the background is
       * applied.
       * @param {String|Number} icon The name or index of the icon to apply.
       * @param {Number} scale (optional, defaults to 1) A scaling factor 
       * with which the icon can be magnified.
       * @return {Element} The icon element.
       */
      applyIcon: function(element, icon, scale) {
        var offset = this.getOffset(icon);
        scale = scale || 1;
        if (element && offset) {
          var icon = element._icon || document.createElement('div');
          var style = icon.style;
          style.backgroundImage = 'url(' + this.src + ')';
          style.backgroundPosition = (-offset.offsetX * scale + 'px') + 
             ' ' + (-offset.offsetY * scale + 'px');
          style.backgroundSize = scale === 1 ? 'auto' :
             this.width * scale + 'px';
          if (icon.parentNode !== element) {
            element.appendChild(icon);
          }
          return icon;
        }
      }

    });

  ;

(function() {
  
  // mono-state
  var meta;
  
  Polymer('core-icon', {

    /**
     * The URL of an image for the icon. If the src property is specified,
     * the icon property should not be.
     *
     * @attribute src
     * @type string
     * @default ''
     */
    src: '',

    /**
     * Specifies the icon name or index in the set of icons available in
     * the icon's icon set. If the icon property is specified,
     * the src property should not be.
     *
     * @attribute icon
     * @type string
     * @default ''
     */
    icon: '',

    /**
     * Alternative text content for accessibility support.
     * If alt is present and not empty, it will set the element's role to img and add an aria-label whose content matches alt.
     * If alt is present and is an empty string, '', it will hide the element from the accessibility layer
     * If alt is not present, it will set the element's role to img and the element will fallback to using the icon attribute for its aria-label.
     * 
     * @attribute alt
     * @type string
     * @default ''
     */
    alt: null,

    observe: {
      'icon': 'updateIcon',
      'alt': 'updateAlt'
    },

    defaultIconset: 'icons',

    ready: function() {
      if (!meta) {
        meta = document.createElement('core-iconset');
      }

      // Allow user-provided `aria-label` in preference to any other text alternative.
      if (this.hasAttribute('aria-label')) {
        // Set `role` if it has not been overridden.
        if (!this.hasAttribute('role')) {
          this.setAttribute('role', 'img');
        }
        return;
      }
      this.updateAlt();
    },

    srcChanged: function() {
      var icon = this._icon || document.createElement('div');
      icon.textContent = '';
      icon.setAttribute('fit', '');
      icon.style.backgroundImage = 'url(' + this.src + ')';
      icon.style.backgroundPosition = 'center';
      icon.style.backgroundSize = '100%';
      if (!icon.parentNode) {
        this.appendChild(icon);
      }
      this._icon = icon;
    },

    getIconset: function(name) {
      return meta.byId(name || this.defaultIconset);
    },

    updateIcon: function(oldVal, newVal) {
      if (!this.icon) {
        this.updateAlt();
        return;
      }
      var parts = String(this.icon).split(':');
      var icon = parts.pop();
      if (icon) {
        var set = this.getIconset(parts.pop());
        if (set) {
          this._icon = set.applyIcon(this, icon);
          if (this._icon) {
            this._icon.setAttribute('fit', '');
          }
        }
      }
      // Check to see if we're using the old icon's name for our a11y fallback
      if (oldVal) {
        if (oldVal.split(':').pop() == this.getAttribute('aria-label')) {
          this.updateAlt();
        }
      }
    },

    updateAlt: function() {
      // Respect the user's decision to remove this element from
      // the a11y tree
      if (this.getAttribute('aria-hidden')) {
        return;
      }

      // Remove element from a11y tree if `alt` is empty, otherwise
      // use `alt` as `aria-label`.
      if (this.alt === '') {
        this.setAttribute('aria-hidden', 'true');
        if (this.hasAttribute('role')) {
          this.removeAttribute('role');
        }
        if (this.hasAttribute('aria-label')) {
          this.removeAttribute('aria-label');
        }
      } else {
        this.setAttribute('aria-label', this.alt ||
                                        this.icon.split(':').pop());
        if (!this.hasAttribute('role')) {
          this.setAttribute('role', 'img');
        }
        if (this.hasAttribute('aria-hidden')) {
          this.removeAttribute('aria-hidden');
        }
      }
    }

  });
  
})();
;


    Polymer('core-iconset-svg', {


      /**
       * The size of an individual icon. Note that icons must be square.
       *
       * @attribute iconSize
       * @type number
       * @default 24
       */
      iconSize: 24,
      type: 'iconset',

      created: function() {
        this._icons = {};
      },

      ready: function() {
        this.super();
        this.updateIcons();
      },

      iconById: function(id) {
        return this._icons[id] || (this._icons[id] = this.querySelector('#' + id));
      },

      cloneIcon: function(id) {
        var icon = this.iconById(id);
        if (icon) {
          var content = icon.cloneNode(true);
          content.removeAttribute('id');
          var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          svg.setAttribute('viewBox', '0 0 ' + this.iconSize + ' ' +
              this.iconSize);
          // NOTE(dfreedm): work around https://crbug.com/370136
          svg.style.pointerEvents = 'none';
          svg.appendChild(content);
          return svg;
        }
      },

      get iconNames() {
        if (!this._iconNames) {
          this._iconNames = this.findIconNames();
        }
        return this._iconNames;
      },

      findIconNames: function() {
        var icons = this.querySelectorAll('[id]').array();
        if (icons.length) {
          return icons.map(function(n){ return n.id });
        }
      },

      /**
       * Applies an icon to the given element. The svg icon is added to the
       * element's shadowRoot if one exists or directly to itself.
       *
       * @method applyIcon
       * @param {Element} element The element to which the icon is
       * applied.
       * @param {String|Number} icon The name the icon to apply.
       * @return {Element} The icon element
       */
      applyIcon: function(element, icon) {
        var root = element;
        // remove old
        var old = root.querySelector('svg');
        if (old) {
          old.remove();
        }
        // install new
        var svg = this.cloneIcon(icon);
        if (!svg) {
          return;
        }
        svg.setAttribute('height', '100%');
        svg.setAttribute('width', '100%');
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        svg.style.display = 'block';
        root.insertBefore(svg, root.firstElementChild);
        return svg;
      },
      
      /**
       * Tell users of the iconset, that the set has loaded.
       * This finds all elements matching the selector argument and calls 
       * the method argument on them.
       * @method updateIcons
       * @param selector {string} css selector to identify iconset users, 
       * defaults to '[icon]'
       * @param method {string} method to call on found elements, 
       * defaults to 'updateIcon'
       */
      updateIcons: function(selector, method) {
        selector = selector || '[icon]';
        method = method || 'updateIcon';
        var deep = window.ShadowDOMPolyfill ? '' : 'html /deep/ ';
        var i$ = document.querySelectorAll(deep + selector);
        for (var i=0, e; e=i$[i]; i++) {
          if (e[method]) {
            e[method].call(e);
          }
        }
      }
      

    });

  ;


    Polymer('core-input', {
      publish: {
        /**
         * Placeholder text that hints to the user what can be entered in
         * the input.
         *
         * @attribute placeholder
         * @type string
         * @default ''
         */
        placeholder: '',
  
        /**
         * If true, this input cannot be focused and the user cannot change
         * its value.
         *
         * @attribute disabled
         * @type boolean
         * @default false
         */
        disabled: false,
  
        /**
         * If true, the user cannot modify the value of the input.
         *
         * @attribute readonly
         * @type boolean
         * @default false
         */
        readonly: false,

        /**
         * If true, this input will automatically gain focus on page load.
         *
         * @attribute autofocus
         * @type boolean
         * @default false
         */
        autofocus: false,

        /**
         * If true, this input accepts multi-line input like a `<textarea>`
         *
         * @attribute multiline
         * @type boolean
         * @default false
         */
        multiline: false,
  
        /**
         * (multiline only) The height of this text input in rows. The input
         * will scroll internally if more input is entered beyond the size
         * of the component. This property is meaningless if multiline is
         * false. You can also set this property to "fit" and size the
         * component with CSS to make the input fit the CSS size.
         *
         * @attribute rows
         * @type number|'fit'
         * @default 'fit'
         */
        rows: 'fit',
  
        /**
         * The current value of this input. Changing inputValue programmatically
         * will cause value to be out of sync. Instead, change value directly
         * or call commit() after changing inputValue.
         *
         * @attribute inputValue
         * @type string
         * @default ''
         */
        inputValue: '',
  
        /**
         * The value of the input committed by the user, either by changing the
         * inputValue and blurring the input, or by hitting the `enter` key.
         *
         * @attribute value
         * @type string
         * @default ''
         */
        value: '',

        /**
         * Set the input type. Not supported for `multiline`.
         *
         * @attribute type
         * @type string
         * @default text
         */
        type: 'text',

        /**
         * If true, the input is invalid if its value is null.
         *
         * @attribute required
         * @type boolean
         * @default false
         */
        required: false,

        /**
         * A regular expression to validate the input value against. See
         * https://developer.mozilla.org/en-US/docs/Web/Guide/HTML/HTML5/Constraint_validation#Validation-related_attributes
         * for more info. Not supported if `multiline` is true.
         *
         * @attribute pattern
         * @type string
         * @default '.*'
         */
        // FIXME(yvonne): The default is set to .* because we can't bind to pattern such
        // that the attribute is unset if pattern is null.
        pattern: '.*',

        /**
         * If set, the input is invalid if the value is less than this property. See
         * https://developer.mozilla.org/en-US/docs/Web/Guide/HTML/HTML5/Constraint_validation#Validation-related_attributes
         * for more info. Not supported if `multiline` is true.
         *
         * @attribute min
         */
        min: null,

        /**
         * If set, the input is invalid if the value is greater than this property. See
         * https://developer.mozilla.org/en-US/docs/Web/Guide/HTML/HTML5/Constraint_validation#Validation-related_attributes
         * for more info. Not supported if `multiline` is true.
         *
         * @attribute max
         */
        max: null,

        /**
         * If set, the input is invalid if the value is not `min` plus an integral multiple
         * of this property. See
         * https://developer.mozilla.org/en-US/docs/Web/Guide/HTML/HTML5/Constraint_validation#Validation-related_attributes
         * for more info. Not supported if `multiline` is true.
         *
         * @attribute step
         */
        step: null,

        /**
         * The maximum length of the input value.
         *
         * @attribute maxlength
         * @type number
         */
        maxlength: null,
  
        /**
         * If this property is true, the text input's inputValue failed validation.
         *
         * @attribute invalid
         * @type boolean
         * @default false
         */
        invalid: false,

        /**
         * If this property is true, validate the input as they are entered.
         *
         * @attribute validateImmediately
         * @type boolean
         * @default true
         */
        validateImmediately: true
      },

      ready: function() {
        this.handleTabindex(this.getAttribute('tabindex'));
      },

      disabledChanged: function() {
        if (this.disabled) {
          this.setAttribute('aria-disabled', true);
        } else {
          this.removeAttribute('aria-disabled');
        }
      },

      invalidChanged: function() {
        this.classList.toggle('invalid', this.invalid);
        this.fire('input-'+ (this.invalid ? 'invalid' : 'valid'), {value: this.inputValue});
      },

      inputValueChanged: function() {
        if (this.validateImmediately) {
          this.updateValidity_();
        }
      },

      valueChanged: function() {
        this.inputValue = this.value;
      },

      requiredChanged: function() {
        if (this.validateImmediately) {
          this.updateValidity_();
        }
      },

      attributeChanged: function(attr, oldVal, curVal) {
        if (attr === 'tabindex') {
          this.handleTabindex(curVal);
        }
      },

      handleTabindex: function(tabindex) {
        if (tabindex > 0) {
          this.$.input.setAttribute('tabindex', -1);
        } else {
          this.$.input.removeAttribute('tabindex');
        }
      },

      /**
       * Commits the inputValue to value.
       *
       * @method commit
       */
      commit: function() {
         this.value = this.inputValue;
      },

      updateValidity_: function() {
        if (this.$.input.willValidate) {
          this.invalid = !this.$.input.validity.valid;
        }
      },

      keypressAction: function(e) {
        // disallow non-numeric input if type = number
        if (this.type !== 'number') {
          return;
        }
        var c = String.fromCharCode(e.charCode);
        if (e.charCode !== 0 && !c.match(/[\d-\.e]/)) {
          e.preventDefault();
        }
      },

      inputChangeAction: function() {
        this.commit();
        if (!window.ShadowDOMPolyfill) {
          // re-fire event that does not bubble across shadow roots
          this.fire('change', null, this);
        }
      },

      focusAction: function(e) {
        if (this.getAttribute('tabindex') > 0) {
          // Forward focus to the inner input if tabindex is set on the element
          // This will not cause an infinite loop because focus will not fire on the <input>
          // again if it's already focused.
          this.$.input.focus();
        }
      },

      inputFocusAction: function(e) {
        if (window.ShadowDOMPolyfill) {
          // re-fire non-bubbling event if polyfill
          this.fire('focus', null, this, false);
        }
      },

      inputBlurAction: function() {
        if (window.ShadowDOMPolyfill) {
          // re-fire non-bubbling event
          this.fire('blur', null, this, false);
        }
      },

      /**
       * Forwards to the internal input / textarea element.
       *
       * @method blur
       */
      blur: function() {
        this.$.input.blur();
      },

      /**
       * Forwards to the internal input / textarea element.
       *
       * @method click
       */
      click: function() {
        this.$.input.click();
      },

      /**
       * Forwards to the internal input / textarea element.
       *
       * @method focus
       */
      focus: function() {
        this.$.input.focus();
      },

      /**
       * Forwards to the internal input / textarea element.
       *
       * @method select
       */
      select: function() {
        this.$.input.select();
      },

      /**
       * Forwards to the internal input / textarea element.
       *
       * @method setSelectionRange
       * @param {number} selectionStart
       * @param {number} selectionEnd
       * @param {String} selectionDirection (optional)
       */
      setSelectionRange: function(selectionStart, selectionEnd, selectionDirection) {
        this.$.input.setSelectionRange(selectionStart, selectionEnd, selectionDirection);
      },

      /**
       * Forwards to the internal input element, not implemented for multiline.
       *
       * @method setRangeText
       * @param {String} replacement
       * @param {number} start (optional)
       * @param {number} end (optional)
       * @param {String} selectMode (optional)
       */
      setRangeText: function(replacement, start, end, selectMode) {
        if (!this.multiline) {
          this.$.input.setRangeText(replacement, start, end, selectMode);
        }
      },

      /**
       * Forwards to the internal input, not implemented for multiline.
       *
       * @method stepDown
       * @param {number} n (optional)
       */
      stepDown: function(n) {
        if (!this.multiline) {
          this.$.input.stepDown(n);
        }
      },

      /**
       * Forwards to the internal input, not implemented for multiline.
       *
       * @method stepUp
       * @param {number} n (optional)
       */
      stepUp: function(n) {
        if (!this.multiline) {
          this.$.input.stepUp(n);
        }
      },

      get willValidate() {
        return this.$.input.willValidate;
      },

      get validity() {
        return this.$.input.validity;
      },

      get validationMessage() {
        return this.$.input.validationMessage;
      },

      /**
       * Forwards to the internal input / textarea element and updates state.
       *
       * @method checkValidity
       * @return {boolean}
       */
      checkValidity: function() {
        var r = this.$.input.checkValidity();
        this.updateValidity_();
        return r;
      },

      /**
       * Forwards to the internal input / textarea element and updates state.
       *
       * @method setCustomValidity
       * @param {number} message
       */
      setCustomValidity: function(message) {
        this.$.input.setCustomValidity(message);
        this.updateValidity_();
      }

    });
  ;

(function() {

window.CoreStyle = window.CoreStyle || {
  g: {},
  list: {},
  refMap: {}
};

Polymer('core-style', {
  /**
   * The `id` property should be set if the `core-style` is a producer
   * of styles. In this case, the `core-style` should have text content
   * that is cssText.
   *
   * @attribute id
   * @type string
   * @default ''
   */


  publish: {
    /**
     * The `ref` property should be set if the `core-style` element is a 
     * consumer of styles. Set it to the `id` of the desired `core-style`
     * element.
     *
     * @attribute ref
     * @type string
     * @default ''
     */
    ref: ''
  },

  // static
  g: CoreStyle.g,
  refMap: CoreStyle.refMap,

  /**
   * The `list` is a map of all `core-style` producers stored by `id`. It 
   * should be considered readonly. It's useful for nesting one `core-style`
   * inside another.
   *
   * @attribute list
   * @type object (readonly)
   * @default {map of all `core-style` producers}
   */
  list: CoreStyle.list,

  // if we have an id, we provide style
  // if we have a ref, we consume/require style
  ready: function() {
    if (this.id) {
      this.provide();
    } else {
      this.registerRef(this.ref);
      if (!window.ShadowDOMPolyfill) {
        this.require();
      }  
    }
  },

  // can't shim until attached if using SD polyfill because need to find host
  attached: function() {
    if (!this.id && window.ShadowDOMPolyfill) {
      this.require();
    }
  },

  /****** producer stuff *******/

  provide: function() {
    this.register();
    // we want to do this asap, especially so we can do so before definitions
    // that use this core-style are registered.
    if (this.textContent) {
      this._completeProvide();
    } else {
      this.async(this._completeProvide);
    }
  },

  register: function() {
    var i = this.list[this.id];
    if (i) {
      if (!Array.isArray(i)) {
        this.list[this.id] = [i];
      }
      this.list[this.id].push(this);
    } else {
      this.list[this.id] = this;  
    }
  },

  // stamp into a shadowRoot so we can monitor dom of the bound output
  _completeProvide: function() {
    this.createShadowRoot();
    this.domObserver = new MutationObserver(this.domModified.bind(this))
        .observe(this.shadowRoot, {subtree: true, 
        characterData: true, childList: true});
    this.provideContent();
  },

  provideContent: function() {
    this.ensureTemplate();
    this.shadowRoot.textContent = '';
    this.shadowRoot.appendChild(this.instanceTemplate(this.template));
    this.cssText = this.shadowRoot.textContent;
  },

  ensureTemplate: function() {
    if (!this.template) {
      this.template = this.querySelector('template:not([repeat]):not([bind])');
      // move content into the template
      if (!this.template) {
        this.template = document.createElement('template');
        var n = this.firstChild;
        while (n) {
          this.template.content.appendChild(n.cloneNode(true));
          n = n.nextSibling;
        }
      }
    }
  },

  domModified: function() {
    this.cssText = this.shadowRoot.textContent;
    this.notify();
  },

  // notify instances that reference this element
  notify: function() {
    var s$ = this.refMap[this.id];
    if (s$) {
      for (var i=0, s; (s=s$[i]); i++) {
        s.require();
      }
    }
  },

  /****** consumer stuff *******/

  registerRef: function(ref) {
    //console.log('register', ref);
    this.refMap[this.ref] = this.refMap[this.ref] || [];
    this.refMap[this.ref].push(this);
  },

  applyRef: function(ref) {
    this.ref = ref;
    this.registerRef(this.ref);
    this.require();
  },

  require: function() {
    var cssText = this.cssTextForRef(this.ref);
    //console.log('require', this.ref, cssText);
    if (cssText) {
      this.ensureStyleElement();
      // do nothing if cssText has not changed
      if (this.styleElement._cssText === cssText) {
        return;
      }
      this.styleElement._cssText = cssText;
      if (window.ShadowDOMPolyfill) {
        this.styleElement.textContent = cssText;
        cssText = Platform.ShadowCSS.shimStyle(this.styleElement,
            this.getScopeSelector());
      }
      this.styleElement.textContent = cssText;
    }
  },

  cssTextForRef: function(ref) {
    var s$ = this.byId(ref);
    var cssText = '';
    if (s$) {
      if (Array.isArray(s$)) {
        var p = [];
        for (var i=0, l=s$.length, s; (i<l) && (s=s$[i]); i++) {
          p.push(s.cssText);
        }
        cssText = p.join('\n\n');
      } else {
        cssText = s$.cssText;
      }
    }
    if (s$ && !cssText) {
      console.warn('No styles provided for ref:', ref);
    }
    return cssText;
  },

  byId: function(id) {
    return this.list[id];
  },

  ensureStyleElement: function() {
    if (!this.styleElement) {
      this.styleElement = window.ShadowDOMPolyfill ? 
          this.makeShimStyle() :
          this.makeRootStyle();
    }
    if (!this.styleElement) {
      console.warn(this.localName, 'could not setup style.');
    }
  },

  makeRootStyle: function() {
    var style = document.createElement('style');
    this.appendChild(style);
    return style;
  },

  makeShimStyle: function() {
    var host = this.findHost(this);
    if (host) {
      var name = host.localName;
      var style = document.querySelector('style[' + name + '=' + this.ref +']');
      if (!style) {
        style = document.createElement('style');
        style.setAttribute(name, this.ref);
        document.head.appendChild(style);
      }
      return style;
    }
  },

  getScopeSelector: function() {
    if (!this._scopeSelector) {
      var selector = '', host = this.findHost(this);
      if (host) {
        var typeExtension = host.hasAttribute('is');
        var name = typeExtension ? host.getAttribute('is') : host.localName;
        selector = Platform.ShadowCSS.makeScopeSelector(name, 
            typeExtension);
      }
      this._scopeSelector = selector;
    }
    return this._scopeSelector;
  },

  findHost: function(node) {
    while (node.parentNode) {
      node = node.parentNode;
    }
    return node.host || wrap(document.documentElement);
  },

  /* filters! */
  // TODO(dfreedm): add more filters!

  cycle: function(rgb, amount) {
    if (rgb.match('#')) {
      var o = this.hexToRgb(rgb);
      if (!o) {
        return rgb;
      }
      rgb = 'rgb(' + o.r + ',' + o.b + ',' + o.g + ')';
    }

    function cycleChannel(v) {
      return Math.abs((Number(v) - amount) % 255);
    }

    return rgb.replace(/rgb\(([^,]*),([^,]*),([^,]*)\)/, function(m, a, b, c) {
      return 'rgb(' + cycleChannel(a) + ',' + cycleChannel(b) + ', ' 
          + cycleChannel(c) + ')';
    });
  },

  hexToRgb: function(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
  }

});


})();
;


  (function() {

    var paperInput = CoreStyle.g.paperInput = CoreStyle.g.paperInput || {};
    paperInput.focusedColor = '#4059a9';
    paperInput.invalidColor = '#d34336';

    Polymer('paper-input', {

      publish: {
        /**
         * The label for this input. It normally appears as grey text inside
         * the text input and disappears once the user enters text.
         *
         * @attribute label
         * @type string
         * @default ''
         */
        label: '',

        /**
         * If true, the label will "float" above the text input once the
         * user enters text instead of disappearing.
         *
         * @attribute floatingLabel
         * @type boolean
         * @default false
         */
        floatingLabel: false,

        /**
         * (multiline only) If set to a non-zero value, the height of this
         * text input will grow with the value changes until it is maxRows
         * rows tall. If the maximum size does not fit the value, the text
         * input will scroll internally.
         *
         * @attribute maxRows
         * @type number
         * @default 0
         */
        maxRows: 0,

        /**
         * The message to display if the input value fails validation. If this
         * is unset or the empty string, a default message is displayed depending
         * on the type of validation error.
         *
         * @attribute error
         * @type string
         */
        error: '',

        focused: {value: false, reflect: true}

      },

      get inputValueForMirror() {
        var tokens = this.inputValue ? String(this.inputValue).replace(/&/gm, '&amp;').replace(/"/gm, '&quot;').replace(/'/gm, '&#39;').replace(/</gm, '&lt;').replace(/>/gm, '&gt;').split('\n') : [''];

        // Enforce the min and max heights for a multiline input here to
        // avoid measurement
        if (this.multiline) {
          if (this.maxRows && tokens.length > this.maxRows) {
            tokens = tokens.slice(0, this.maxRows);
          }
          while (this.rows && tokens.length < this.rows) {
            tokens.push('');
          }
        }

        return tokens.join('<br>') + '&nbsp;';
      },

      get inputHasValue() {
        // if type = number, the input value is the empty string until a valid number
        // is entered so we must do some hacks here
        return this.inputValue || (this.type === 'number' && !this.validity.valid);
      },

      syncInputValueToMirror: function() {
        this.$.mirror.innerHTML = this.inputValueForMirror;
      },

      ready: function() {
        this.syncInputValueToMirror();
      },

      prepareLabelTransform: function() {
        var toRect = this.$.floatedLabelText.getBoundingClientRect();
        var fromRect = this.$.labelText.getBoundingClientRect();
        if (toRect.width !== 0) {
          var sy = toRect.height / fromRect.height;
          this.$.labelText.cachedTransform =
            'scale3d(' + (toRect.width / fromRect.width) + ',' + sy + ',1) ' +
            'translate3d(0,' + (toRect.top - fromRect.top) / sy + 'px,0)';
        }
      },

      animateFloatingLabel: function() {
        if (!this.floatingLabel || this.labelAnimated) {
          return;
        }

        if (!this.$.labelText.cachedTransform) {
          this.prepareLabelTransform();
        }

        // If there's still no cached transform, the input is invisible so don't
        // do the animation.
        if (!this.$.labelText.cachedTransform) {
          return;
        }

        this.labelAnimated = true;
        // Handle interrupted animation
        this.async(function() {
          this.transitionEndAction();
        }, null, 250);

        if (this.inputHasValue) {
          this.$.labelText.style.webkitTransform = this.$.labelText.cachedTransform;
          this.$.labelText.style.transform = this.$.labelText.cachedTransform;
        } else {
          // Handle if the label started out floating
          if (!this.$.labelText.style.webkitTransform && !this.$.labelText.style.transform) {
            this.$.labelText.style.webkitTransform = this.$.labelText.cachedTransform;
            this.$.labelText.style.transform = this.$.labelText.cachedTransform;
            this.$.labelText.offsetTop;
          }
          this.$.labelText.style.webkitTransform = '';
          this.$.labelText.style.transform = '';
        }
      },

      inputValueChanged: function(old) {
        this.super();

        this.syncInputValueToMirror();
        if (old && !this.inputValue || !old && this.inputValue) {
          this.animateFloatingLabel();
        }
      },

      placeholderChanged: function() {
        this.label = this.placeholder;
      },

      inputFocusAction: function() {
        this.super(arguments);
        this.focused = true;
      },

      inputBlurAction: function(e) {
        this.super(arguments);
        this.focused = false;
      },

      downAction: function(e) {
        if (this.disabled) {
          return;
        }

        if (this.focused) {
          return;
        }

        // The underline spills from the tap location
        var rect = this.$.underline.getBoundingClientRect();
        var right = e.x - rect.left;
        this.$.focusedUnderline.style.mozTransformOrigin = right + 'px';
        this.$.focusedUnderline.style.webkitTransformOrigin = right + 'px ';
        this.$.focusedUnderline.style.transformOriginX = right + 'px';

        // Animations only run when the user interacts with the input
        this.underlineAnimated = true;

        // Cursor animation only runs if the input is empty
        if (!this.inputHasValue) {
          this.cursorAnimated = true;
        }
        // Handle interrupted animation
        this.async(function() {
          this.transitionEndAction();
        }, null, 250);
      },

      keydownAction: function() {
        this.super();

        // more type = number hacks. see core-input for more info
        if (this.type === 'number') {
          var valid = !this.inputValue && this.validity.valid;
          this.async(function() {
            if (valid !== (!this.inputValue && this.validity.valid)) {
              this.animateFloatingLabel();
            }
          });
        }
      },

      transitionEndAction: function() {
        this.underlineAnimated = false;
        this.cursorAnimated = false;
        this.labelAnimated = false;
      }

    });

  }());

  ;


  Polymer('paper-slider', {

    /**
     * Fired when the slider's value changes.
     *
     * @event core-change
     */

    /**
     * Fired when the slider's value changes due to user interaction.
     *
     * Changes to the slider's value due to changes in an underlying
     * bound variable will not trigger this event.
     *
     * @event change
     */

    /**
     * If true, the slider thumb snaps to tick marks evenly spaced based
     * on the `step` property value.
     *
     * @attribute snaps
     * @type boolean
     * @default false
     */
    snaps: false,

    /**
     * If true, a pin with numeric value label is shown when the slider thumb 
     * is pressed.  Use for settings for which users need to know the exact 
     * value of the setting.
     *
     * @attribute pin
     * @type boolean
     * @default false
     */
    pin: false,

    /**
     * If true, this slider is disabled.  A disabled slider cannot be tapped
     * or dragged to change the slider value.
     *
     * @attribute disabled
     * @type boolean
     * @default false
     */
    disabled: false,

    /**
     * The number that represents the current secondary progress.
     *
     * @attribute secondaryProgress
     * @type number
     * @default 0
     */
    secondaryProgress: 0,

    /**
     * If true, an input is shown and user can use it to set the slider value.
     *
     * @attribute editable
     * @type boolean
     * @default false
     */
    editable: false,

    /**
     * The immediate value of the slider.  This value is updated while the user
     * is dragging the slider.
     *
     * @attribute immediateValue
     * @type number
     * @default 0
     */

    observe: {
      'step snaps': 'update'
    },

    ready: function() {
      this.update();
    },

    update: function() {
      this.positionKnob(this.calcRatio(this.value));
      this.updateMarkers();
    },

    minChanged: function() {
      this.update();
      this.setAttribute('aria-valuemin', this.min);
    },

    maxChanged: function() {
      this.update();
      this.setAttribute('aria-valuemax', this.max);
    },

    valueChanged: function() {
      this.update();
      this.setAttribute('aria-valuenow', this.value);
      this.fire('core-change');
    },

    disabledChanged: function() {
      if (this.disabled) {
        this.removeAttribute('tabindex');
      } else {
        this.tabIndex = 0;
      }
    },

    immediateValueChanged: function() {
      if (!this.dragging) {
        this.value = this.immediateValue;
      }
    },

    expandKnob: function() {
      this.expand = true;
    },

    resetKnob: function() {
      this.expandJob && this.expandJob.stop();
      this.expand = false;
    },

    positionKnob: function(ratio) {
      this.immediateValue = this.calcStep(this.calcKnobPosition(ratio)) || 0;
      this._ratio = this.snaps ? this.calcRatio(this.immediateValue) : ratio;
      this.$.sliderKnob.style.left = this._ratio * 100 + '%';
    },

    inputChange: function() {
      this.value = this.$.input.value;
      this.fire('change');
    },

    calcKnobPosition: function(ratio) {
      return (this.max - this.min) * ratio + this.min;
    },

    trackStart: function(e) {
      this._w = this.$.sliderBar.offsetWidth;
      this._x = this._ratio * this._w;
      this._startx = this._x || 0;
      this._minx = - this._startx;
      this._maxx = this._w - this._startx;
      this.$.sliderKnob.classList.add('dragging');
      this.dragging = true;
      e.preventTap();
    },

    trackx: function(e) {
      var x = Math.min(this._maxx, Math.max(this._minx, e.dx));
      this._x = this._startx + x;
      this.immediateValue = this.calcStep(
          this.calcKnobPosition(this._x / this._w)) || 0;
      var s =  this.$.sliderKnob.style;
      s.transform = s.webkitTransform = 'translate3d(' + (this.snaps ? 
          (this.calcRatio(this.immediateValue) * this._w) - this._startx : x) + 'px, 0, 0)';
    },

    trackEnd: function() {
      var s =  this.$.sliderKnob.style;
      s.transform = s.webkitTransform = '';
      this.$.sliderKnob.classList.remove('dragging');
      this.dragging = false;
      this.resetKnob();
      this.value = this.immediateValue;
      this.fire('change');
    },

    bardown: function(e) {
      this.transiting = true;
      this._w = this.$.sliderBar.offsetWidth;
      var rect = this.$.sliderBar.getBoundingClientRect();
      var ratio = (e.x - rect.left) / this._w;
      this.positionKnob(ratio);
      this.expandJob = this.job(this.expandJob, this.expandKnob, 60);
      this.fire('change');
    },

    knobTransitionEnd: function(e) {
      if (e.target === this.$.sliderKnob) {
        this.transiting = false;
      }
    },

    updateMarkers: function() {
      this.markers = [], l = (this.max - this.min) / this.step;
      for (var i = 0; i < l; i++) {
        this.markers.push('');
      }
    },

    increment: function() {
      this.value = this.clampValue(this.value + this.step);
    },

    decrement: function() {
      this.value = this.clampValue(this.value - this.step);
    },

    incrementKey: function(ev, keys) {
      if (keys.key === "end") {
        this.value = this.max;
      } else {
        this.increment();
      }
      this.fire('change');
    },

    decrementKey: function(ev, keys) {
      if (keys.key === "home") {
        this.value = this.min;
      } else {
        this.decrement();
      }
      this.fire('change');
    }

  });

;

(function(){
	var speech = new SpeechSynthesisUtterance();
	var voices = window.speechSynthesis.getVoices();
    speech.lang = 'en';
	speech.accent = 'en-US';
	function _speak(words){
		if(words){
			speech.text = words;
			window.speechSynthesis.speak(speech);
		}
	}

	Polymer('x-word',{
		word: '',
		size: 32,
		sound: true,
		firstFocusTime: 0,
		spendTime: 0,
		isCorrect: false,
		seeAns: false,
		speakTimes: 0,
		isCompleted: false,
		isInputState: true,
		ignoreFirstCase: true,
		info:function(i){
			if(i){
				this.word = i.word;
				this.firstFocusTime = i.firstFocusTime;
				this.spendTime = i.spendTime;
				this.seeAns = i.seeAns;
				this.speakTimes = i.speakTimes;
				this.$.i.value = i.value;
				this.isCorrect = i.isCorrect;
				this.validate();
				if(!i.isCorrect){
					this.$.ctx.querySelector('span').style.color = '#faa';
					this.isCorrect =i.isCorrect;
				}
			}else{
				return {
					word: this.word,
					firstFocusTime: this.firstFocusTime,
					spendTime: this.spendTime,
					isCorrect: this.isCorrect,
					seeAns: this.seeAns,
					speakTimes: this.speakTimes,
					value: this.$.i.value
				}
			}
		},
		speak:function(){
			_speak(this.word);
		},
		ready:function(){
			$(this.$.ctx).css({
				'transition-duration':'1s'
			});
			$(this.$.i).css({
				'transition-duration':'1s'
			});
		},
		attached: function () {
			this.word = this.innerHTML;
			this.innerHTML = '';
			this.initField();
			this.keyinEvent();
		},
		initField : function(){
			var len = this.word.length;
			this.$.i.style.width = len*this.size*5/7+'px';
			this.$.ctx.style.width = len*this.size*5/7+'px';
			this.$.i.setAttribute('maxlength',len);			
		},
		keyinEvent: function(){
			var self = this;
			this.$.i.addEventListener('focus',function(e){
				if(self.firstFocusTime == 0){
					self.firstFocusTime = new Date().getTime();
				};
				//self.scrollIntoView(true);
			});
			this.$.i.addEventListener('keyup',function(e){
				//console.log('keyCode',e.keyCode);
				var val = self.$.i.value;
				if(val.indexOf(' ')>-1){
					var ele = self.$.i;
					$(ele).val(val.replace(/\s/g,''));
					return;
		        }else if(val.indexOf('.')>-1){
					self.seeAns = true;
					var ele = self.$.i;
					$(ele).val(val.replace('.',''));
					$(ele).css('color','#f78');
					$(ele).val('');
					$(ele).attr('placeholder',self.word);
					self.speak();
					return;
		        }else if(e.keyCode==188 /*,*/ || e.keyCode==18 /*,*/ || e.keyCode==91 /*Mac CMD*/){
					self.speakTimes++;
					self.$.i.value = val.replace(/,/g,'');
					if(self.sound){
						self.speak();
					}
					self.fire('x-word-sound',self.word);
					return;
				} 
				//
				if(self.getAttribute('verify')!=null){
					self.validate();
				}
				if(self.word.length == val.length && 
					e.keyCode!=9 /*tab*/ && e.keyCode!=16 /*shift*/){
					self.focusNext();
				} else if(val.length==0 && e.keyCode==8){
					self.focusPrev();
				} 
			});
		},
		value:function(val){
			this.$.i.value = val;
		},
		validate:function(){
			if(this.word.length === this.$.i.value.length){
				var state = "";
				if(this.word === this.$.i.value || this.ignoreFirstCase && 
					this.capitaliseFirstLetter(this.word)===this.capitaliseFirstLetter(this.$.i.value)){
					state = "ok";
					this.isCorrect = true;
					this.repaceEle();
				}else {
					$(this.$.i).css({'background-color':'#faa'});
					state = "err";
				}
				this.setAttribute(state,'');
				var nowTime = new Date().getTime();
				this.spendTime = nowTime - this.firstFocusTime;
				this.fire('x-word-check',state);
				this.isCompleted = true;
			}
		},
		capitaliseFirstLetter:function(string){
			return string.charAt(0).toUpperCase() + string.slice(1);
		},
		repaceEle:function(){
			this.isInputState = false;
			this.$.i.parentNode.removeChild(this.$.i);
			var txt = document.createElement('span');
			txt.style.marginTop = '7px';
			txt.style.width = this.$.ctx.style.width;
			txt.style.lineHeight = (this.size+4)+'px';
			if(this.isCompleted || this.seeAns){
				$(txt).addClass('seeAns');
				this.isCorrect = false;
			}
			txt.innerHTML = this.word;
			this.$.ctx.appendChild(txt);
		},
		focus:function(){
			if(this.getAttribute('ok')!=null){
				this.focusNext();
			};
			this.$.i.focus();
		},
		focusNext:function(){
			var ele = $(this).nextAll('x-word')[0];
			if(ele) ele.focus();
		},
		focusPrev:function(){
			var ele = $(this).prev();
			while(ele.length>0){
				var xword = ele[0];
				if(xword.tagName === 'X-WORD'){
					if(xword.isInputState){
						ele.focus();
						return;
					}
				}
				ele = ele.prev();
			}
			this.fire('x-word-find-prev-focus',{});
		}
	});
})();
;

(function(){
	var speech = new SpeechSynthesisUtterance();
	var voices = window.speechSynthesis.getVoices();
    speech.lang = 'en';
	speech.accent = 'en-US';
	function _speak(words){
		if(words){
			speech.text = words;
			window.speechSynthesis.speak(speech);
		}
	};
	PolymerExpressions.prototype.isEscapeChar = function(word){
		return word.length==0 || word.length==1 && word.match(/[^\w']/g);
	};
	Polymer('x-sentence',{
		total: 0,
		size: 32,
		sound: true,
		seeAns:[],
		wrongAns:[],
		corrects: 0,
		startTime: 0,
		spendTime: 0,
		speakTimes: 0,
		inputWordAmt: 0,
		isCompleted: false,
		ready:function(){
			var my = this;
			this.addEventListener('x-word-sound',function(e){
				if(my.sound){
					_speak(my.sentence);
				}else{
					my.fire('x-sentence-sound',my.idx);
				}
			});
			// word is completed.
			this.addEventListener('x-word-check',function(e){
				my.refreshState();
				if(my.isCompleted){
					this.fire('x-sentence-completed',{key:my.idx,val:my});
				}else{
					my.focus();
				}
			});
			this.addEventListener('x-word-find-prev-focus',function(e){
				this.fire('x-sentence-find-prev-focus',{key:my.idx,val:my});
			});
		},
		focus:function(){
			var list = this.wordList();
			for(var i=0;i<list.length;i++){
				if(list[i].isInputState){
					list[i].focus();
					return;					
				}
			}
		},
		focusLastWord:function(){
			var list = this.wordList();
			var i=list.length-1;
			for(;i>=0;i--){
				if(list[i].isInputState){
					list[i].focus();
					return;					
				}
			}
			this.fire('x-sentence-find-prev-focus',{key:this.idx,val:this});
		},
		refreshState:function(){
			var wordList = this.$.main.querySelectorAll('x-word');
			var my = this;
			my.corrects = 0;
			my.speakTimes = 0;
			my.spendTime = 0;
			my.seeAns = [];
			my.wrongAns = [];
			my.inputWordAmt = 0;
			my.startTime = wordList[0].firstFocusTime;
			my.total = wordList.length;
			$.each(wordList,function(i,xword){
				if(xword.isCorrect) {
					my.corrects++;
				}else {
					my.wrongAns.push(xword.word);
				}
				if(xword.spendTime>0){
					my.inputWordAmt ++;
				}
				my.speakTimes += xword.speakTimes;
				my.spendTime += xword.spendTime; 
				if(xword.seeAns){
					my.seeAns.push(xword.word);
				}
			});
			if(my.inputWordAmt === wordList.length){
				my.isCompleted = true;
			}
		},
		info:function(i){
			var my = this;
			this.refreshState();
			if(i!=undefined){
					i = JSON.parse(i);
					my.total = i.total;
					my.seeAns = i.seeAns;
					my.wrongAns = i.wrongAns;
					my.corrects = i.corrects;
					my.speakTimes = i.speakTimes;
					my.spendTime = i.spendTime;
					my.isCompleted = i.isCompleted;
					my.startTime = i.startTime;
					$.each(i.sentence,function(idx,info){
						my.wordList(idx).info(info);
					});
			}else {
				i = {
					total:my.total,
					seeAns:my.seeAns,
					wrongAns:my.wrongAns,
					corrects: my.corrects,
					speakTimes:my.speakTimes,
					spendTime:my.spendTime/1000.0,
					isCompleted:my.isCompleted,
					startTime: my.startTime,
					idx:my.idx,
					sentence:[]
				};
				var wordList = my.wordList();
				$.each(wordList,function(idx,xword){
					i.sentence.push(xword.info());
				});
				return i;
			}
		},
		attached: function () {
			var my = this;
			this.sentence = this.innerHTML.trim();
			this.words = this.crawlWord(this.sentence);
			this.innerHTML = '';
		},
		speak:function(){
			_speak(this.sentence);
		},
		wordList: function(idx){
			if(idx!=undefined){
				return this.$.main.querySelectorAll('x-word')[idx];
			}else{
				return this.$.main.querySelectorAll('x-word');
			}
		},
	    crawlWord : function(rawData){
	      var term ='';
	      var ctx = [];
	      this.ans = rawData;
	      for(var i=0;i<rawData.length;i++){
	        var c = ''+rawData.charAt(i);
	        if(c.match(/[^\w']/g)){
	          ctx.push(term);
	          if(c!=' ') {ctx.push(c);}
	          term = '';
	        } else{
	          term += c;
	        }
	      }
	      if(term.length>1){
	      	ctx.push(term);
	      }
	      $(this).html('');
	      return ctx;
	    }
	});
})();
;

(function(){
	window.AudioContext = window.AudioContext || window.webkitAudioContext;
	var audioContext = new AudioContext();
	var audioInput = null,
	    realAudioInput = null,
	    inputPoint = null,
	    audioRecorder = null;
	var rafID = null;
	var analyserContext = null;
	var canvasWidth, canvasHeight;
	var recIndex = 0;

	function doneEncoding( blob ) {
	    var audio = document.createElement('audio');
	      audio.addEventListener('loadeddata', function(e) { 
	          audio.play();
	        }, false);
	      audio.addEventListener('error', function(e) {
	          console.log('error!', e);
	        }, false);
	      audio.src = webkitURL.createObjectURL(blob);
	}

	function initAudio(){
		if (!navigator.getUserMedia)
            navigator.getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
        if (!navigator.cancelAnimationFrame)
            navigator.cancelAnimationFrame = navigator.webkitCancelAnimationFrame || navigator.mozCancelAnimationFrame;
        if (!navigator.requestAnimationFrame)
            navigator.requestAnimationFrame = navigator.webkitRequestAnimationFrame || navigator.mozRequestAnimationFrame;
	    navigator.getUserMedia(
        {
            "audio": {
                "mandatory": {
                    "googEchoCancellation": "true",
                    "googAutoGainControl": "false",
                    "googNoiseSuppression": "false",
                    "googHighpassFilter": "false"
                },
                "optional": []
            },
        }, gotStream, function(e) {
            alert('Error getting audio');
            console.log(e);
        });
	}

	function gotStream(stream) {
	    inputPoint = audioContext.createGain();
	    // Create an AudioNode from the stream.
	    realAudioInput = audioContext.createMediaStreamSource(stream);
	    audioInput = realAudioInput;
	    audioInput.connect(inputPoint);
	    analyserNode = audioContext.createAnalyser();
	    analyserNode.fftSize = 2048;
	    inputPoint.connect( analyserNode );

	    audioRecorder = new Recorder( inputPoint );

	    zeroGain = audioContext.createGain();
	    zeroGain.gain.value = 0.0;
	    inputPoint.connect( zeroGain );
	    zeroGain.connect( audioContext.destination );
	}
	var isInitAudio = false;

	Polymer('voice-recorder',{
		blob: null,
	    ready:function(){
	    	if(!isInitAudio){
	        	initAudio();
	        	isInitAudio = true;
	        }
		},
		play:function(){
			doneEncoding(this.blob);
		},
		toggleRecording:function( e ) {
			var my = this;
		    if (e.toElement.classList.contains("recording")) {
		        // stop recording
		        audioRecorder.stop();
		        e.toElement.classList.remove("recording");
		        audioRecorder.getBuffers( 
		        	function(){
		        		audioRecorder.exportWAV( function(blob){
			        		my.blob = blob;
		        			doneEncoding(blob);
		        		} );
		        	}
		         );
		    } else {
		        // start recording
		        if (!audioRecorder)
		            return;
		        e.toElement.classList.add("recording");
		        audioRecorder.clear();
		        audioRecorder.record();
		    }
		}
	});
})();
;

(function(){
	Polymer('voice-tube',{
		exam: '1..',
		idx: 0,
		size:16,
		captions:'',
	    intervalId:'',
	    playTimeoutId:'',
	    playCurrentTime:0,
	    playNewStartTime:0,
	    youtubewidth: '320px',
	    youtubeheight: '240px',
	    examInfo: {state:{}},
	    playbackRate: 1.0,
	    start_end: [],
	    playSentence:function(e){
	    	var idx = e.toElement.getAttribute('idx');
	    	this.play(idx);
	    	idx = idx - this.start_end[0];
	    	this.sentenceList(idx).focus();
	    },
	    voiceClick:function(e){
	    	var idx = e.toElement.getAttribute('idx');
	    	idx = idx - this.start_end[0];
	    	this.sentenceList(idx).focus();
	    },
		ready:function(){
			var my = this;
			my.player = this.$.youtube;
			my.youtubeid = my.youtubeid.trim();
			my.youtubeid = my.youtubeid.indexOf('http')==0 ? 
			my.youtubeid.substring(my.youtubeid.indexOf('v=')+2):
			my.youtubeid;
			document.addEventListener('google-youtube-ready',function(){
				$.each(my.captions.en,function(i){
					my.captions.en[i].text = my.captions.en[i].text
					.replace(/&#39;|’/g,"'");
					my.captions.en[i].cn = '';
					if(my.captions.hasOwnProperty('zh-Hant')){
						my.captions.en[i].cn = my.captions['zh-Hant'][i].text;
					};
				});
				my.examSetting();
				setTimeout(function(){my.fire('voice-tube-ready')},300);
			});
			// get captions
			if(localStorage.getItem(my.vid)){
				my.captions = JSON.parse(localStorage.getItem(my.vid));
				//localStorage.removeItem(my.vid);
			}
			else{
				alert(my.vid+' without data , please check localstorage');
			}
			// register sentence speak event
			this.addEventListener('x-sentence-sound',function(e){
				my.play(e.detail);
			});
			this.addEventListener('x-sentence-find-prev-focus',function(e){
				var idx = e.detail.key - 1;
				var senList = my.sentenceList();
				for(var i=0;i<senList.length;i++){
					if(senList[i].idx === idx){
						senList[i].focusLastWord();
						return;
					}
				}
				console.log('not found');
			});
			// 
			document.addEventListener('x-sentence-completed',function(e){
				var sentObj = e.detail;
				my.examInfo.state[sentObj.key] = sentObj.val;
				var now = Object.keys(my.examInfo.state).length;
				if(now == my.sentences.length){
					my.completed();
				}
				var nextIdx = parseInt(sentObj.key) - my.start_end[0]+1;
				if(nextIdx<my.start_end[1]){
					my.sentenceList(nextIdx).focus();
				}
			});
		},
		examSetting:function(){
			var my = this;
			var start_end = [0,my.captions.en.length];
			if(my.exam.indexOf('..')>0){
				var tmp = my.exam.split('..');
				start_end[0] = tmp[0]-1;
				if(tmp[1]!=='' && tmp[1] % 1 === 0){
					start_end[1] = tmp[1]-tmp[0] + 1;
				}
			}else if(my.exam!=='' && my.exam %1 === 0){
				start_end=[ parseInt(my.exam)-1 , 1 ];
			}
			for(var i=0;i<my.captions.en.length;i++){
				my.captions.en[i].seq = i+1;
			}
			my.sentences = my.captions.en.splice(start_end[0],start_end[1]);
			my.start_end = start_end;
		},
		completed:function(){
			var s = this.examInfo.state;
			var correctAmt = 0 , total = 0 , spendTime = 0 , wrongAmt = [];
			var speakTimes = 0;
			for(var key in s){
				total += s[key].total;
				spendTime += s[key].spendTime;
				correctAmt += s[key].corrects;
				speakTimes += s[key].speakTimes;
				wrongAmt = wrongAmt.concat(s[key].wrongAns);
			}
			var score = parseInt(correctAmt*100/total);
			this.fire('voice-tube-completed',{
				score: score,
				spendTime: spendTime/1000.0,
				wrongAmt: wrongAmt,
				speakTimes: speakTimes
			});
		},
		pause:function(){
			this.player.pause();
		},
		play:function(idx){
			idx = parseInt(idx) - this.start_end[0];
			var self = this;
			var stTime = self.sentences[idx].start;
			var edTime = parseFloat(stTime)+parseFloat(self.sentences[idx].dur);
			var len = stTime +','+ edTime;
			var start = len.split(',')[0].trim();
			start = self.playNewStartTime+parseFloat(start);
			var end = len.split(',')[1].trim();
			self.player.player.setPlaybackRate(self.playbackRate);
			self.player.seekTo(start);
			self.player.play();
			var duTime = (end - start) / self.playbackRate * 1000;
			clearTimeout(self.playTimeoutId);
			clearInterval(self.intervalId);
			self.playCurrentTime = 0;
			self.playTime();
			self.playTimeoutId = setTimeout(function () {
				self.player.pause();
				clearInterval(self.intervalId);
				self.playCurrentTime = 0;
			}, duTime);
		},
	    playTime:function(){
			var self = this;
			self.intervalId = setInterval(function(){
			self.playCurrentTime += 10; //10ms
			},10);
	    },
	    video:function(){
	    	return this.$.youtube;
	    },
	    sentenceList:function(idx){
			if(idx!=undefined){
				return this.$.sentence.querySelectorAll('x-sentence')[idx];
			} else {
				return this.$.sentence.querySelectorAll('x-sentence');
			}	    	
	    },
	    focus:function(){
	    	this.sentenceList(0).focus();
	    },
	    info:function(idx){
	    	var list = this.sentenceList();
	    	var info = [];
	    	for(var i=0;i<list.length;i++){
	    		info.push(list[i].info());
	    	}
	    	if(idx!=undefined){
	    		return info[idx];
	    	}
	    	return info;
	    }
	});
})();
;

(function(){
	Polymer('c3-timeseries',{
		columns:'',
		width:'72%',
		ready:function(){
			var my = this;
	    },
	    columnsChanged:function(){
	    	var data = JSON.parse(this.columns);
	    	if(typeof data ==='object'){
	    		this.render(data);
	    	}
	    },
	    render:function(data){
	    	var my = this;
	    	var obj = {};
	    	obj['bindto'] = my.$.ch,
	    	obj['data'] = {
		        x: 'x',
		        xFormat: '%Y/%m/%d', // 'xFormat' can be used as custom format of 'x'
		        columns: []
		    };
	    	obj['axis'] = {
		        x: {
		            type: 'timeseries',
		            tick: {
		                format: '%Y/%m/%d'
		            }
		        }
    		};
    		data[0].splice(0, 0, "x");
    		obj['data']['columns'] = data;
    		c3.generate(obj);
	    }
	});
})();
;

(function(){
    function timeConvert(n){
    	var sec = parseInt(n);
    	var min = sec>60 ? parseInt(sec/60): 0;
    	var hour = min>60 ? parseInt(min/60): 0;
    	if(hour>0){
    		return hour + '小時' + min%60 +'分鐘';
    	}
    	if(min>0){
    		return min + '分' + sec%60 +'秒';
    	}
    	return min + '分' + sec +'秒';
    };
	PolymerExpressions.prototype.convert = function(input) {
  		return timeConvert(input);
	};
	Polymer('user-status',{
		ready:function(){
			
	    },
	    info:function(info){
	    	this.progress = info.progress;
	    	this.sentences = info.sentences;
	    },
	    renderChart:function(user){
			var info = user.studyHistory();
			var columns = [[],['time(min)'],['sentence']]
			for(var key in info){
				columns[0].push(key);
				var min = parseInt(info[key].spendTime/60);
				columns[1].push(min);
				columns[2].push(info[key].sentenceAmt);
			}
			this.$.c3t.render(columns);

	    	
	    }

	});
})();
;

    function showUserChart(user) {
        window.user = user;
        var info = user.studyHistory();
        var columns = [
            [],
            ['time(min)'],
            ['sentence']
        ]
        for (var key in info) {
            columns[0].push(key);
            var min = parseInt(info[key].spendTime / 60);
            columns[1].push(min);
            columns[2].push(info[key].sentenceAmt);
        }
        c3t.render(columns);
    }

    //window.onbeforeunload = function() { return "You work will be lost."; };
    //c3t.columns = '[["2013/01/01", "2013/01/02"],["data1", 30, 200],["data2", 310, 100]]'
    var range = localStorage.getItem('selectRange');
    if (range != null) {
        range = JSON.parse(range);
        srange.value = range.start;
        erange.value = range.end;
    }

    go.addEventListener('click', function(e) {
        var range = {
            start: srange.value,
            end: erange.value
        };
        localStorage.setItem('selectRange', JSON.stringify(range));
        $('#selectRange').fadeOut(function() {
            user.range = range;
            showExam();
        });
    });

    function showExam() {
        video.query(user.study.vid, function(captions) {
         localStorage.setItem(user.study.vid,JSON.stringify(captions));
         document.querySelector('#ctx').innerHTML =
            "<voice-tube id='v' vid='" + user.study.vid +
            "' youtubeid='" + user.study.youtubeid +
            "' exam='" + user.range.start + '..' + user.range.end +
            "' size='32'></voice-tube>";         
        });
        $('#showtime').fadeIn();
    }

    addEventListener('user-card-click', function(e) {
        $('#cards').fadeOut(function() {
            $('#videos').fadeIn();
        });
    });

    addEventListener('user-card-onHovered', function(e) {
        var user = e.detail;
        showUserChart(user);
    });

    addEventListener('video-card-click', function(e) {
        user.study = e.detail;
        $('#videos').fadeOut(function() {
            $('#selectRange').fadeIn();
            info = user.videoInfo();
            userStatus.info(info);
            userStatus.renderChart(user);
        });
    });

    addEventListener('x-sentence-completed', function(e) {
        var sentObj = e.detail.val;
        user.updateSentence(sentObj);
    });

    addEventListener('voice-tube-ready', function(e) {
        v.focus();
    });

    addEventListener('voice-tube-completed', function(e) {
        var i = e.detail;
        board.style.display = 'block';
        document.querySelector('#score').innerHTML = i.score;
        document.querySelector('#sc').innerHTML = i.score;
        document.querySelector('#result').innerHTML = '花費時間:' + i.spendTime;
        document.querySelector('#speak').innerHTML = '聆聽次數:' + i.speakTimes;
    });
    