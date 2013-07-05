/*!
 * pushwechat - lib/pushwechat.js 
 * Author: dead-horse <dead_horse@qq.com>
 */


/**
 * Module dependencies.
 */
var proxy = require('./proxy');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var utility = require('utility');

var Pusher = function (username, pwd) {
  this.username = username || '';
  this.pwd = pwd || '';
  if (!this.username || !this.pwd) {
    throw new Error('Must have username, password and token');
  }
  EventEmitter.call(this);
  setInterval(this._refresh.bind(this), 10 * 60 * 1000);
  this._login(this._refresh.bind(this));
};
util.inherits(Pusher, EventEmitter);

Pusher.prototype._login = function(callback) {
  var self = this;
  proxy.login(self.username, self.pwd, function (err, cookie, token) {
    if (err) {
      return callback(err);
    }
    self.cookie = cookie;
    self.token = token;
    callback && callback(null, cookie, token);
  });
};

Pusher.prototype.afterLogin = function (callback, args) {
  var self = this;
  this._login(function (err, cookie) {
    if (err) {
      var cb = args[args.length - 1];
      return typeof cb === 'function' && cb(err);
    }
    callback.apply(self, args);
  });
};

Pusher.prototype._refresh = function () {
  var self = this;
  proxy.refresh(this.cookie, function (err, token) {
    if (err) {
      return self._login(function (err) {
        if (err) {
          self.cookie = null;
          self.token = null;
          self.emit('PWechatError', err);
        } else {
          self.emit('connect');          
        }
      });
    }
    self.token = token;
  });
};

/**
 * 给单个用户发送微信消息
 * @param {String} fakeId 用户fakeId
 * @param {String} content 发送内容
 */
Pusher.prototype.singleSend = function (fakeId, content, callback) {
  var self = this;
  if (self.cookie) {
    return proxy.singleSend(fakeId, content, self.cookie, self.token, function (err, data) {
      if (err) {
        self.cookie = null;
      }
      callback(err, data);
    });
  }
  self.afterLogin(self.singleSend, arguments);
};

/**
 * 给单个用户发送微信图文消息
 * @param {String} username 用户username
 * @param {String} appMsgId 素材Id 如10000005
 * @param {Array} appMsgs
 * [
 *      {
 *          title 标题
 *          digest 正文摘要
 *          content 正文展开
 *          fileid 封面图片Id 如10000002
 *          sourceurl 链接地址
 *      }
 * ]
 */
Pusher.prototype.singleSendAppMsgs = function (username, appMsgId, appMsgs, callback) {
    var self = this;
    if (self.cookie) {
        return proxy.singleSendAppMsgs(username, appMsgId, appMsgs, self.cookie, self.token, function (err, data) {
            if (err) {
                self.cookie = null;
            }
            callback(err, data);
        });
    }
    self.afterLogin(self.singleSend, arguments);
};
/**
 * 获取包含关键字的消息
 * @param {String} keyword 消息中包含的关键字
 * @param {Number} count 获取条数
 * @param {Number} fromMsgId 从这个msgId开始往前查找
 */
Pusher.prototype.getMessage = function (keyword, count, fromMsgId, callback) {
  var self = this;
  if (self.cookie) {
    return proxy.getMessage(self.cookie, self.token, keyword, count, fromMsgId, function (err, data) {
      if (err) {
        self.cookie = null;
      }
      callback(err, data);
    });      
  }
  self.afterLogin(self.getMessage, arguments);
};

/**
 * 获取公众账号的粉丝
 */
Pusher.prototype.getUsers = function (callback) {
  var self = this;
  if (self.cookie) {
    return proxy.getUsers(self.cookie, self.token, function (err, data) {
      if (err) {
        self.cookie = null;
      }
      callback(err, data);
    });      
  }
  self.afterLogin(self.getUsers, arguments);
};


exports.create = function (username, pwd, token) {
  return new Pusher(username, pwd, token);
};

