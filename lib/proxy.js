/*!
 * pushwechat - lib/proxy.js 
 * Author: dead-horse <dead_horse@qq.com>
 */


/**
 * Module dependencies.
 */
var urllib = require('urllib');
var utility = require('utility');
var translate = require('./translate');
var $ = require('cheerio');

var URLS = {
  login: 'http://mp.weixin.qq.com/cgi-bin/login?lang=zh_CN',
  addGroup: 'http://mp.weixin.qq.com/cgi-bin/modifygroup?t=ajax-friend-group',
  singleSend: 'http://mp.weixin.qq.com/cgi-bin/singlesend?t=ajax-response&lang=zh_CN',
  singleSendAppMsgs: 'http://mp.weixin.qq.com/cgi-bin/operate_appmsg?sub=preview&t=ajax-appmsg-preview',
  refresh: 'http://mp.weixin.qq.com/cgi-bin/indexpage',
  getMessage: 'http://mp.weixin.qq.com/cgi-bin/getmessage?t=ajax-message',
  getUsers:"https://mp.weixin.qq.com/cgi-bin/contactmanagepage"
};

var USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_2) AppleWebKit/537.11 (KHTML, like Gecko) Chrome/23.0.1271.95 Safari/537.11';

var okStatus = [65201, 65202, 0];
exports.login = function (username, pwd, callback) {
  var data = {
    username: username,
    pwd: utility.md5(pwd.substr(0, 16)).toLowerCase(),
    imgcode: '',
    f: 'json'
  };
  urllib.request(URLS.login, {
    type: 'POST',
    data: data
  }, function (err, data, res) {
    try {
      data = JSON.parse(data);    
    } catch (err) {
      return callback(new Error('response error'));
    }
    if (err || (res.statusCode !== 200 && res.statusCode !== 302) || okStatus.indexOf(data.ErrCode) < 0) {
      return callback(err || new Error('login error!' + translate.loginErrorMap(data.ErrCode)));
    }
    var cookies = '';
    var token;
    if (data.ErrMsg) {
      var matchs = data.ErrMsg.match(/token=(\d+)/);
      token = matchs ? matchs[1] : '';
    }
    var cookieReg = /^([\w_]+)=([\w_=]+);/;
    res.headers['set-cookie'].forEach(function (cookie) {
      var cmatchs = cookie.match(cookieReg);
      if (cmatchs) {
        cookies += cmatchs[0];
      }
    });
    callback(null, cookies, token);
  });
};

exports.singleSend = function (fakeId, content, cookie, token, callback) {
  var data;
  if (typeof content === 'string') {
    data = {
      type: 1,
      content: content,
      tofakeid: fakeId,
      ajax: 1,
      token: token,
      error: false
    };
  } else {
    data = {
      tofakeid: fakeId,
      ajax: 1,
      token: token,
      error: false
    };
    for (var key in content) {
      data[key] = content[key];
    }
    data.fileid = data.fileid || data.fid;  
  }
  var headers = {
    cookie: cookie,
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    Referer: 'http://mp.weixin.qq.com/cgi-bin/singlemsgpage'
  };
  urllib.request(URLS.singleSend, {
    type: 'POST',
    headers: headers,
    data: data
  }, function (err, data, res) {
    if (err || res.statusCode !== 200) {
      return callback(err || new Error('singleSend Error! status code:' + res.statusCode));
    }
    try {
      data = JSON.parse(data);
    } catch (err) {
      return callback(new Error('singleSend Error! ' + err.message));
    }
    callback(null, data);
  });
};


exports.singleSendAppMsgs = function (username, appMsgId, appMsgs, cookie, token, callback) {
    var data = {
        preusername: username,
        token: token,
        AppMsgId: appMsgId,
        ajax: 1,
        error: false
    };
    data.count=appMsgs.length;
    for(var i=0; i<appMsgs.length; i++) {
        var appMsg=appMsgs[i];
        data['title'+i]=appMsg.title;
        data['digest'+i]=appMsg.digest;
        data['content'+i]=appMsg.content;
        data['fileid'+i]=appMsg.fileid;
        data['sourceurl'+i]=appMsg.sourceurl;
    };
    var headers = {
        cookie: cookie,
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        Referer: 'http://mp.weixin.qq.com/cgi-bin/singlemsgpage'
    };
    urllib.request(URLS.singleSendAppMsgs, { type: 'POST', headers: headers, data: data }, function (err, data, res) {
        if (err || res.statusCode !== 200) {
            return callback(err || new Error('singleSend Error! status code:' + res.statusCode));
        }
        try {
            data = JSON.parse(data);
        } catch (err) {
            return callback(new Error('singleSend Error! ' + err.message));
        }
        callback(null, data);
    });
};


exports.refresh = function (cookie, callback) {
  urllib.request(URLS.refresh, {headers: {cookie: cookie}}, function (err, data, res) {
    if (err || (res.statusCode !== 302 && res.statusCode !== 200)) {
      return callback(err || new Error('refresh Error! status code:' + res.statusCode));
    }
    var token;
    if (res.headers && res.headers.location) {
      var matchs = res.headers.location.match(/token=(\d+)/);
      token = matchs ? matchs[1] : '';
    }
    return callback(token ? null : new Error('Refresh error, can not get token'), token);
  });
};

exports.getMessage = function (cookie, token, keyword, count, fromMsgId, callback) {
  var data = {
    keyword: keyword,
    count: count,
    frommsgid: fromMsgId,
    token: token,
    ajax: 1
  };
  var headers = {
    'User-Agent': USER_AGENT,
    Referer: 'https://mp.weixin.qq.com/cgi-bin/getmessage?token=1811982400&t=wxm-message&lang=zh_CN&count=10&keyword=%E6%B5%8B%E8%AF%95',
    Cookie: cookie
  };
  urllib.request(URLS.getMessage, {
    type: 'POST',
    headers: headers,
    data: data
  }, function (err, data, res) {
    if (err || res.statusCode !== 200) {
      return callback(err || new Error('getMessage Error! status code:' + res.statusCode));
    }
    try {
      data = JSON.parse(data);
    } catch (err) {
      return callback(new Error('getMessage Error! ' + err.message));
    }
    callback(null, data);
  });
};


// https://mp.weixin.qq.com/cgi-bin/contactmanagepage?t=wxm-friend&token=2058160812&lang=zh_CN&pagesize=10000&pageidx=0&type=0&groupid=0

exports.getUsers = function (cookie, token,callback) {
  var data = {
    t:"wxm-friend",
    token:token,
    lang:"zh_CN",
    pagesize:100000,
    pageidx:0,
    type:0,
    groupid:0
  }
  var headers = {
    'User-Agent': USER_AGENT,
    Referer: 'https://mp.weixin.qq.com/cgi-bin/contactmanagepage',
    Cookie: cookie
  };
  urllib.request(URLS.getUsers, {
    type: 'GET',
    headers: headers,
    data:data
  }, function (err, data, res) {
    if (err || res.statusCode !== 200) {
      return callback(err || new Error('getUsers Error! status code:' + res.statusCode));
    }
    try{
      var outputList = eval($('#json-friendList',data.toString()).text());
    }catch (err) {
       return callback(new Error('getMessage Error! ' + err.message));
    }
    callback(null,outputList);
  });
};
