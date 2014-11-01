var study = {};
var username = '';
var db = new Firebase("https://voice-tube.firebaseio.com/");
var cdn = new Firebase("https://voice-tube-cdn.firebaseio.com/");


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