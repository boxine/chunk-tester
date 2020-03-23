const crypto = require('crypto');


function cmp(a, b) {
    if (a < b) {
        return -1;
    } else if (a > b) {
        return 1;
    } else {
        return 0;
    }
}

function cmpKeys(keys) {
    return (a, b) => {
        for (const k of keys) {
            const res = cmp(a[k], b[k]);
            if (res !== 0) return res;
        }
        return 0;
    };
}

function sha2(str) {
    return crypto.createHash('sha256').update(str).digest('hex');
}

// From https://gist.github.com/egardner/efd34f270cc33db67c0246e837689cb9
function deepEqual(obj1, obj2) {
    if (obj1 === obj2) {
        return true;
    } else if (_isObject(obj1) && _isObject(obj2)) {
        if (Object.keys(obj1).length !== Object.keys(obj2).length) {
            return false;
        }
        for (const prop in obj1) {
            if (!deepEqual(obj1[prop], obj2[prop])) {
                return false;
            }
        }
        return true;
    }

    function _isObject(obj) {
        return typeof obj === 'object' && obj != null;
    }
}

module.exports = {
    cmp,
    cmpKeys,
    deepEqual,
    sha2,
};
