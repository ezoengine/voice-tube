var study = {
    name: "The Power to Create",
    username: "marty",
    vid: "17821",
    youtubeid: "lZgjpuFGb_8"
};
var db = new Firebase("https://voice-tube.firebaseio.com/");

function updateSentence(sentObj) {
    var saveObj = {};
    var sentences = db.child("users/" + study.username + "/videos/" + study.youtubeid + "/sentences");
    sentences.once('value', function(obj) {
        if (obj.val() != null) {
            saveObj = obj.val();
        }
        var key = 'idx' + (sentObj.idx < 10 ? '0' : '') + sentObj.idx;
        if (!saveObj.hasOwnProperty(key)) {
            saveObj[key] = [];
        }
        var info = sentObj.info();
        delete info.sentence;
        saveObj[key].push(info);
        sentences.update(saveObj);
    });
}

function insertVoiceTube(vid, youtubeid, exam) {
    document.querySelector('#ctx').innerHTML =
        "<voice-tube id='v' vid='" + vid +
        "' youtubeid='" + youtubeid +
        "' exam='" + exam +
        "' size='32'></voice-tube>";
}
