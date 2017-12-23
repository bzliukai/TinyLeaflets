//监听pagehide事件阻止页面进入bfcache，修复部分浏览器后退不刷新页面的问题
window.addEventListener('pagehide', function (e) {
    var _body = $(document.body);
    var _bfcache = _body.attr('data-bfcache') || 'false';
    if (_bfcache === 'false') {
        _body.children().remove();
        _body.append('<div class="loadtext" data-load="1" data-text="加载中..."></div>');
        // 要等到回调函数完成，用户按返回才执行script标签的代码
        setTimeout(function () {
            _body.append("<script type='text/javascript'>window.location.reload();<\/script>");
        });
    }
});
//动态改变根元素字体大小
$(window).resize(function () {
    var except = ['input', 'select', 'textarea'];
    if (except.indexOf(document.activeElement.nodeName.toLowerCase()) === -1) {
        setTimeout(function () {
            var width = window.innerWidth;
            if (width > window.innerHeight) {
                width = window.innerHeight;
            }
            $('html').css({ fontSize: Math.min(window.innerWidth, width) / 3.2 });
            $('body').css({ maxWidth: width });
        }, 100);
    }
});
$(window).resize();

/*
    监听器
*/
var Listeners = function () {
    var s = this;
    //公用变量名
    s.publicName1 = '__ListenersisRegistered__';
    s.publicName2 = '__ListenersCallbackList__';
};
//注册监听器
Listeners.prototype.register = function (object) {
    var s = this;
    if (!object[s.publicName1]) {
        object[s.publicName1] = true;
        object[s.publicName2] = object[s.publicName2] || {};
        object.dispatchEvent = s.dispatchEvent.bind(object);
        object.on = object.addEventListener = s.addEventListener.bind(object);
        object.off = object.removeEventListener = s.removeEventListener.bind(object);
    }
};
//删除监听器
Listeners.prototype.remove = function (object) {
    var s = this;
    object[s.publicName1] = false;
    object[s.publicName2] = null;
    object.dispatchEvent = null;
    object.on = object.addEventListener = null;
    object.off = object.removeEventListener = null;
};
//事件派送
Listeners.prototype.dispatchEvent = function (type, data, phase) {
    var s = this;
    phase = phase || 1;
    type = type.toLowerCase();
    if (s[Listeners.publicName2][phase]) {
        var list = s[Listeners.publicName2][phase][type];
        if (list) {
            list.forEach(function (item) {
                item.call(s, data);
            });
        }
    }
    var typeName = type.toLowerCase().replace(/^([a-z])/g, type[0].toUpperCase());
    if (s['on' + typeName] && isType(s['on' + typeName], 'function')) {
        s['on' + typeName].call(s, data);
    }
};
//添加事件监听
Listeners.prototype.addEventListener = function (type, callback, phase) {
    var s = this;
    phase = phase || 1;
    type = type.toLowerCase();
    s[Listeners.publicName2][phase] = s[Listeners.publicName2][phase] || {};
    s[Listeners.publicName2][phase][type] = s[Listeners.publicName2][phase][type] || [];
    s[Listeners.publicName2][phase][type].push(callback);
};
//删除事件监听
Listeners.prototype.removeEventListener = function (type, callback, phase) {
    var s = this;
    phase = phase || 1;
    type = type.toLowerCase();
    if (s[Listeners.publicName2][phase] && s[Listeners.publicName2][phase][type]) {
        var list = s[Listeners.publicName2][phase][type];
        if (typeof callback === 'string' && callback.toLowerCase() === 'all') {
            list.length = 0;
        } else {
            var i = list.indexOf(callback);
            if (i !== -1) { list.splice(i, 1); }
        }
    }
};
Listeners = new Listeners();
/*
    滚动到底部事件
*/
(function () {
    //公用变量名
    var publicName1 = '__ScrolltoBottomEventList__';
    var publicName2 = '__isonScrolltoBottomEvent__';
    //滚动事件
    function scroll() {
        var s = this;
        if (s === window) {
            var h = s.innerHeight;
            var t = document.body.scrollTop;
            var sh = document.body.scrollHeight;
        } else {
            var t = s.scrollTop;
            var h = s.clientHeight;
            var sh = s.scrollHeight;
        }
        if (sh - h - t <= 2) {
            s[publicName1].forEach(function (item) {
                setTimeout(function () {
                    item.call(s);
                });
            });
        }
    };
    //绑定滚动到底部事件
    window.onScrolltoBottom = HTMLElement.prototype.onScrolltoBottom = function (callback) {
        var s = this;
        s[publicName1] = s[publicName1] || [];
        if (callback === undefined) {
            scroll.call(s);
        } else {
            s[publicName1].push(callback);
            if (!s[publicName2]) {
                s[publicName2] = true;
                s.addEventListener('scroll', scroll);
            }
        }
    };
    //解除滚动到底部事件
    window.offScrolltoBottom = HTMLElement.prototype.offScrolltoBottom = function (callback) {
        var s = this;
        if (s[publicName1]) {
            var index = s[publicName1].indexOf(callback);
            if (index !== -1) {
                s[publicName1].splice(index, 1);
            }
        }
    };
})();
/*
    分页加载
*/
function PagingLoad(param, loadtext) {
    var s = this;
    //当前页
    s.page = param.data.page || 1;
    //总页数
    s.totalPage = param.data.page || 1;
    //链接参数
    s.parameter = param;
    //是否正在加载
    s.isLoading = false;
    //是否有请求过数据
    s.isRequestData = false;
    //加载文本提示元素
    s._loadtext = loadtext;
    //保存ajax对象
    s._ajaxRequest = null;
    //注册监听器
    Listeners.register(s);
};
PagingLoad.prototype.requestData = function () {
    var s = this;
    if (s.isLoading) {
        s._ajaxRequest && s._ajaxRequest.abort();
    } else {
        s.isLoading = true;
    }
    s.isRequestData = true;
    s._loadtext && s._loadtext.attr({ 'data-load': 1, 'data-text': '加载中...' });
    //return setTimeout(function () {
    //    s.isLoading = false;
    //    s.parameter.success();
    //    if (s._loadtext) {
    //        if (s.page >= s.totalPage) {
    //            s._loadtext.attr({ 'data-load': 0, 'data-text': '没有更多了' });
    //        } else {
    //            s._loadtext.attr({ 'data-load': 0, 'data-text': '滑动到底部加载更多' });
    //        }
    //    }
    //}, 500);
    s._ajaxRequest = $.ajax({
        //提交数据的类型 POST GET
        type: s.parameter.type || 'post',
        //提交的网址
        url: s.parameter.url,
        //缓存
        cache: s.parameter.cache || false,
        // 异步true;同步false
        async: s.parameter.async,
        //提交的数据
        data: s.parameter.data,
        //返回数据的格式 "xml", "html", "script", "json", "jsonp", "text".
        dataType: s.parameter.dataType || 'json',
        //成功返回之后调用的函数
        success: function (data) {
            s.isLoading = false;
            s.parameter.success(data);
            if (s._loadtext) {
                if (s.page >= s.totalPage) {
                    s._loadtext.attr({ 'data-load': 0, 'data-text': '没有更多了' });
                } else {
                    s._loadtext.attr({ 'data-load': 0, 'data-text': '滑动到底部加载更多' });
                }
            }
        },
        //调用执行后调用的函数
        complete: s.parameter.complete,
        //调用出错执行的函数
        error: s.parameter.error
    });
};
/*
    加载提示
*/
if (window.PopupTexts) {
    var loadingtip = {
        timer: null,
        popupbox: new PopupTexts(),
        show: function (text) {
            clearTimeout(loadingtip.timer);
            loadingtip.timer = setTimeout(function () {
                loadingtip.popupbox.show({
                    content: '<div class="loadAnimate">' + text + '</text>',
                    shadeColor: 'rgba(0,0,0,0)',
                    background: 'rgba(0,0,0,.8)',
                    is_hitShadecp: false,
                    is_shadeResEvent: true
                });
            }, 500);
            loadingtip.popupbox.show({ content: '', shadeColor: 'rgba(0,0,0,0)', is_hitShadecp: false, is_shadeResEvent: true });
        },
        close: function () {
            clearTimeout(loadingtip.timer);
            loadingtip.timer = null;
            loadingtip.popupbox.close();
        }
    };
}
/*
    公用组件事件
*/
var publicFunction = {};
//消除微信浏览器垂直滑动时页面整体下移
publicFunction.eliminateWxDefaultEffect = function (obj) {
    if (obj instanceof jQuery) obj = obj[0];
    if (obj === window) {
        if (window.parent !== window) {
            window.frameElement.parentNode.scrollTop = 1;
            window.frameElement.parentNode.addEventListener('scroll', scrolling);
        }
    }
    obj.scrollTop = 1;
    obj.addEventListener('scroll', scrolling);
    //事件
    function scrolling() {
        var _this = this;
        if (this === window) {
            _this = window.document.body;
            var clientHeight = _this.scrollHeight - window.innerHeight;
        } else {
            var clientHeight = _this.scrollHeight - _this.clientHeight;
        }
        if (_this.scrollTop === 0) {
            _this.scrollTop = 1;
        } else if (_this.scrollTop === clientHeight) {
            _this.scrollTop = clientHeight - 1;
        }
    };
};
//设置Cookie
publicFunction.setCookie = function (name, value, date) {
    var exp = new Date();
    date = date || 30 * 24 * 60 * 60 * 1000;
    exp.setTime(exp.getTime() + date);
    document.cookie = name + "=" + escape(value) + ";expires=" + exp.toGMTString();
};
//获取Cookie
publicFunction.getCookie = function (name) {
    var arr,
        reg = new RegExp("(^| )" + name + "=([^;]*)(;|$)");
    if (arr = document.cookie.match(reg)) {
        return unescape(arr[2]);
    }
};
//删除Cookie
publicFunction.delCookie = function (name) {
    var exp = new Date();
    var cval = dom.getCookie(name);
    exp.setTime(exp.getTime() - 1);
    if (cval != null) {
        document.cookie = name + "=" + cval + ";expires=" + exp.toGMTString();
    }
};
/*switch开关按钮*/
publicFunction.switch_btn = function () {
    var _this = $(event.currentTarget);
    var _input = _this.find('input[type=hidden]');
    var _switch_btn_chunk = _this.find('.switch_btn_chunk');
    var state = _this.attr('data-state');
    var option = _this.attr('data-option');
    if (option) {
        option = option.split(',');
    }
    if (state === '1') {
        _this.attr('data-state', 0);
        _input.val(0);
        _switch_btn_chunk.text(option[0]);
    } else if (state === '0') {
        _this.attr('data-state', 1);
        _input.val(1);
        _switch_btn_chunk.text(option[1]);
    }
    publicFunction.dispatchEvent('switch_change', _this);
};
/*关注按钮*/
publicFunction.listen_btn = function () {
    var _this = $(event.currentTarget);
    var id = _this.attr('data-id');
    if (_this.hasClass('btn1')) {
        if (_this.attr('data-state') == 'yet') {
            this.cancelListenData.call(_this, id, function () {
                _this.attr('data-state', 'not');
            });
        }
        else if (_this.attr('data-state') == 'not') {
            this.listenData.call(_this, id, function () {
                _this.attr('data-state', 'yet');
            });
        }
    }
    else if (_this.hasClass('btn2')) {
        if (_this.attr('data-state') == 'not') {
            this.listenData.call(_this, id, function () {
                _this.attr('data-state', 'yet');
            });
        }
    }
};
//收听ajax
publicFunction.listenData = function (id, callback) {
    this.attr('data-state', 'load');
    $.get('./api/site/teacher/member_listen_action.php', {
        action: 'insert',
        token: publicFunction.getCookie('tooken'),
        appKey: publicFunction.getCookie('appKey'),
        tid: id
    }, function () {
        if (callback) {
            callback();
        }
    });
};
//取消收听ajax
publicFunction.cancelListenData = function (id, callback) {
    this.attr('data-state', 'load');
    $.get('./api/site/teacher/member_listen_action.php', {
        action: 'delete',
        token: publicFunction.getCookie('tooken'),
        appKey: publicFunction.getCookie('appKey'),
        tid: id
    }, function () {
        if (callback) {
            callback();
        }
    });
};
/*多选按钮*/
publicFunction.checkboxs = function () {
    var _this = null;
    var _target = $(event.currentTarget);
    if (_target.hasClass('checkboxs')) {
        _this = _target;
    } else {
        _this = _target.find('.checkboxs');
        if (_this.length < 1) {
            return;
        }
    }
    var _input = _this.find('input[type=hidden]');
    var checked = _this.attr('data-checked');
    if (checked === 'true') {
        checked = false;
        _this.attr('data-checked', checked);
        _input.val(0);
    } else {
        checked = true;
        _this.attr('data-checked', checked);
        _input.val(1);
    }
    publicFunction.dispatchEvent('checkboxs_change', {
        target: _target,
        checked: checked,
        checkboxs: _this,
    });
};
/*折叠按钮*/
publicFunction.folded_btn = function () {
    var _this = $(event.currentTarget);
    var folded_text = _this.parent().find('.folded_text');
    var state = _this.attr('data-state');
    if (state === '0') {
        _this.attr('data-state', 1);
        folded_text.removeClass('folded');
    } else if (state === '1') {
        _this.attr('data-state', 0);
        folded_text.addClass('folded');
    }
    event.preventDefault();
    event.stopPropagation();
};
//注册监听器
Listeners.register(publicFunction);
//判断是否有历史记录，如果没有，头部栏的后退按钮将跳转到首页
(function () {
    if (!document.referrer) {
        var $_Retreat = $('.headbar .retreat');
        if ($_Retreat.length) {
            if ($_Retreat[0].nodeName.toLocaleLowerCase() !== 'a') {
                $_Retreat.attr('onclick', 'location.href=\'./?' + publicFunction.getCookie('site_file_name') + '/index.html\'');
            }
        }
    }
})();

$('a').each(function () {
    var _this = $(this);
    var _href = _this.attr('href');
    if (_href && !/^tel|javascript/.test(_href)) {
        _this.attr('href', '/pwWechat/html/pwWechat/' + _href);
    }
});