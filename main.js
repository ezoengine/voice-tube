var study = {};
var username = '';
var db = new Firebase("https://voice-tube.firebaseio.com/");

function clearDB(){
	var sentList = v.info();
	var initObj = {};
	initObj[username] = {};
	initObj[username][study.youtubeid] = {vid:study.vid};
	db.set(initObj);
	console.log('clearDB',initObj);
}

function updateSentence(sentObj){
	var saveObj = {};
	var sentences = db.child(username+"/"+study.youtubeid+"/sentences");
	sentences.once('value',function(obj){
		if(obj.val() != null){
			saveObj = obj.val();
		}
		qq = saveObj;

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
  	sentenceInfo: function(youtubeid,idx){
  		var rawInfo = my.info[youtubeid]['sentences'][idx];
  		var practiceTimesKeys = Object.keys(rawInfo);
  		var practiceTimes = practiceTimesKeys.length;
  		var spendTime = 0,todaySpendTime = 0;
  		var wrongAns = [];
  		for(var i in practiceTimesKeys){
  			var key = practiceTimesKeys[i];
  			var idx = rawInfo[key];
  			var corrects = 0,total = 0;
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
  			score: parseInt((corrects*1.0/total)*10000)/100.0
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