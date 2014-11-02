var study = {
  name: "The Power to Create",
  username: "marty",
  vid: "17821",
  youtubeid: "lZgjpuFGb_8"
};
var db = new Firebase("https://voice-tube.firebaseio.com/");

function updateSentence(sentObj){
	var saveObj = {};
	var sentences = db.child(study.username+"/"+study.youtubeid+"/sentences");
	sentences.once('value',function(obj){
		if(obj.val() != null){
			saveObj = obj.val();
		}
		var key = 'idx'+(sentObj.idx<10? '0':'')+sentObj.idx;
		if(!saveObj.hasOwnProperty(key)){
			saveObj[key] = [];
		}
		var info = sentObj.info();
		delete info.sentence;
		saveObj[key].push(info);
		sentences.update(saveObj);
	});				
}

function insertVoiceTube(vid,youtubeid,exam){
	document.querySelector('#ctx').innerHTML = 
	"<voice-tube id='v' vid='"+vid+
	"' youtubeid='"+youtubeid+
	"' exam='"+exam+
	"' size='32'></voice-tube>";
}

var User = function(name,info) {
  var my = this;
  my.name = name;
  my.image = info.image;
  my.info = info;
  function isToday(timestamp){
  	var today = new Date().toDateString();
  	var someday = new Date(timestamp).toDateString();
  	return today == someday;
  }
  return {
  	videos:function(){
  		return Object.keys(my.info);
  	},
  	sentences: function(youtubeid){
  		if(arguments.length==0){
  			var videos = this.videos();
  			var amt = 0;
  			for(var i=0;i<videos.length;i++){
  				var sentences = my.info[videos[i]]['sentences'];
  				amt += Object.size(sentences);
  			}
  		  return amt;
  		}else{
	  		if(my.info.hasOwnProperty(youtubeid)){
	  			return Object.keys(my.info[youtubeid].sentences);
	  		}else{
	  			return "";
	  		}
  		}
  	},
    /**
    影片學習進度
    每個句子的熟悉度
    各句子中學習的單字
    **/
    videoInfo: function(video){
      var vid = video.vid;
      var youtubeid = video.youtubeid;
      var sentenceData = JSON.parse(localStorage.getItem(vid));
      var total = sentenceData.en.length;
      var accmu = this.sentences(youtubeid).length;
      var progress = parseInt(accmu*1000.0/total)/10.0;
      var sentenceKeys = my.info[youtubeid]['sentences'];
      sentenceKeys = Object.keys(sentenceKeys);
      var rtnSentencesInfo = [];
      for(var i=0;i<sentenceKeys.length;i++){
        var key = sentenceKeys[i];
        var obj = this.sentenceInfo(youtubeid,key);
        obj['idx'] = parseInt(key.substr(3))+1;
        rtnSentencesInfo.push(obj);
      }
      return {
        progress: progress,
        sentences: rtnSentencesInfo
      };
    },
  	sentenceInfo: function(youtubeid,idx){
  		var rawInfo = my.info[youtubeid]['sentences'][idx];
  		var practiceTimesKeys = Object.keys(rawInfo);
  		var practiceTimes = practiceTimesKeys.length;
  		var spendTime = 0,todaySpendTime = 0;
  		var wrongAns = [];
      var corrects = 0,total = 0;
  		for(var i in practiceTimesKeys){
  			var key = practiceTimesKeys[i];
  			var idx = rawInfo[key];
  			spendTime += idx.spendTime;
  			corrects += idx.corrects;
  			total += idx.total;
  			if(idx.hasOwnProperty('wrongAns')){
  				wrongAns = wrongAns.concat(idx['wrongAns']);
  			}
  			if(isToday(idx.startTime)){
  				todaySpendTime += idx.spendTime;
  			}
  		}
  		spendTime = parseInt(spendTime*1000)/1000.0;
  		return {
  			totalSpendTime: spendTime,
  			todaySpendTime: todaySpendTime,
  			wrongAns: wrongAns,
  			score: parseInt(corrects*10000.0/total)/100.0,
        practiceTimes: practiceTimes
  		}
  	},
    spendTime:function(){
    	var videoKeys = this.videos();
    	var totalSpendTime = 0,todaySpendTime = 0;
    	for(var i in videoKeys){
    		var videoKey = videoKeys[i];
    		var sentenceKeys = this.sentences(videoKey);
    		for(var j in sentenceKeys){
    			var sentenceKey = sentenceKeys[j];
    			var sentenceInfo = this.sentenceInfo(videoKey,sentenceKey);
    			totalSpendTime += sentenceInfo.totalSpendTime;
    			todaySpendTime += sentenceInfo.todaySpendTime;
    		}
    	}
    	return {
			total:totalSpendTime,
			today:todaySpendTime
    	};
    }
  }
};