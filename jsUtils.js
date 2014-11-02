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

