Object.size = function(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};
Object.keys = function(obj) {
    var keys = [];
    for (key in obj) {
        keys.push(key);
    }
    return keys;
};

function getDate(args){
    var date;
    if(typeof args == "number"){
        if(args>10000000){
            date =  new Date(args);
        }else{
            var today = new Date().getTime();
            args = args*86400*1000;
            date = new Date(today+args);
        }
    }else{
        date = new Date();
    }
    var day = date; 
    var dd = day.getDate(); 
    var mm = day.getMonth()+1;//January is 0! 
    var yyyy = day.getFullYear(); 
    if(dd<10){dd='0'+dd} 
    if(mm<10){mm='0'+mm} 
    return yyyy+'/'+mm+'/'+dd;
}