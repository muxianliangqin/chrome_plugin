var show_right_button = false
var show_border = true
console.log('这是content script!');

// 注意，必须设置了run_at=document_start 此段代码才会生效
document.addEventListener('DOMContentLoaded', function()
{
	console.log('屏蔽右键菜单')
	document.oncontextmenu = function(){
		return show_right_button
	}
	console.log('监听鼠标点击事件')
	document.onmousedown = function(e){
		if (e.button==2){
			var xpath = getXpath(e)
			var as = getAs(e)
			resShow(xpath,as)
			show_right_button = true
			show_border = false
		}
	}
	
	function getAs(e){
		var ele = e.srcElement
		var as = $(ele).find('a')
		var res = []
		for (var i=0;i<as.length;i++){
			var a = as[i]
			var title = a.title
			if (!title){
				title = a.innerText
			}
			a = {
				'host':a.host,
				'baseURI':a.baseURI,
				'href':a.href,
				'title':title
			}
			res.push(a)
		}
		return res
	}
	
	function getXpath(e){
		var paths = e.path
		// 去除window、document、html等,从body开始
		paths.reverse()
		paths = paths.slice(3)
		// 寻找最后一个具有id属性的元素
		paths = paths.reverse()
		var index = paths.length
		for(var i=0;i<paths.length;i++){
			var v = paths[i]
			if (v.id) {
				index = i + 1 
				break;
			}
		}
		paths = paths.slice(0,index)
		//获取xpath值
		paths = paths.reverse()
		xp = ['']
		var children = null
		for(var i=0;i<paths.length;i++){
			var path = paths[i]
			// 如果元素有id，这里通常是第一个
			if (path.id) {
				xp.push('/*[@id="'+path.id+'"]')
				children = path.children
				continue
			}
			// children == null时，这里通常是html/body
			if (children == null) {
				xp.push(path.localName)
				children = path.children
				continue
			}
			// 只保留元素名相同的
			x_children = []
			for(var j=0;j<children.length;j++){
				if (children[j].localName == path.localName){
					x_children.push(children[j])
				}
			}
			// 获得xpath序号
			if (x_children.length == 1) {
				xp.push(path.localName)
			} else {
				var x_idx = 0
				for(var j=0;j<x_children.length;j++){
					if (x_children[j] == path){
						xp.push(path.localName+'['+(x_idx+1)+']')
						break
					} else {
						x_idx = x_idx + 1
					}
				}
			}
			children = path.children
		}
		var xpath = xp.join('/')
		return xpath
	}
	
	function resShow(xpath,as){
		var div = $('<div></div>')
		div.addClass('chrome-plugin-demo-panel')
		var span = $('<span>xpath:'+xpath+'</span>')
		div.append(span)
		
		var ul = $('<ul></ul>')
		for (var i=0;i<as.length;i++){
			var a = as[i]
			ul.append($('<li><a href='+a.href+' target="_blank">'+a.title+'</a></li>'))
		}
		div.append(ul)
		
		var buttom_comfirm = $('<button style="margin-right:10px;">确定选择</button>')
		buttom_comfirm.click(function(){
			confirm_result()
		})
		var buttom_reselect = $('<button style="margin-left:10px;">重新选择</button>')
		buttom_reselect.click(function(){
			remove_result_show()
		})
		var p = $('<p></p>')
		p.append(buttom_comfirm)
		p.append(buttom_reselect)
		div.append(p)
		
		$('body').append(div)
	}

	function confirm_result(){
		remove_result_show()
		$.ajax({
			url:'http://47.106.140.189:7001/weChat/findGroups',
			method: 'post',
			data:{
				'userId':3
			}
		}).done(function(response){
			console.log(response)
		})
	}

	function remove_result_show () {
		$('.chrome-plugin-demo-panel').remove()
		show_right_button = false
		show_border = true
	}
	
	document.onmouseover = function(e){	
		if (show_border){
			$(e.srcElement).addClass('myself-mouseover-selected')
		}
	}
	document.onmouseout = function(e){
		if (show_border){
			$(e.srcElement).removeClass('myself-mouseover-selected')
		}
	}
	
});

// 向页面注入JS
function injectCustomJs(jsPath)
{
	jsPath = jsPath || 'js/inject.js';
	var temp = document.createElement('script');
	temp.setAttribute('type', 'text/javascript');
	// 获得的地址类似：chrome-extension://ihcokhadfjfchaeagdoclpnjdiokfakg/js/inject.js
	temp.src = chrome.extension.getURL(jsPath);
	temp.onload = function()
	{
		// 放在页面不好看，执行完后移除掉
		this.parentNode.removeChild(this);
	};
	document.body.appendChild(temp);
}

// 接收来自后台的消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse)
{
	console.log('收到来自 ' + (sender.tab ? "content-script(" + sender.tab.url + ")" : "popup或者background") + ' 的消息：', request);
	if(request.cmd == 'update_font_size') {
		var ele = document.createElement('style');
		ele.innerHTML = `* {font-size: ${request.size}px !important;}`;
		document.head.appendChild(ele);
	}
	else {
		tip(JSON.stringify(request));
		sendResponse('我收到你的消息了：'+JSON.stringify(request));
	}
});

// 主动发送消息给后台
// 要演示此功能，请打开控制台主动执行sendMessageToBackground()
function sendMessageToBackground(message) {
	chrome.runtime.sendMessage({greeting: message || '你好，我是content-script呀，我主动发消息给后台！'}, function(response) {
		tip('收到来自后台的回复：' + response);
	});
}

// 监听长连接
chrome.runtime.onConnect.addListener(function(port) {
	console.log(port);
	if(port.name == 'test-connect') {
		port.onMessage.addListener(function(msg) {
			console.log('收到长连接消息：', msg);
			tip('收到长连接消息：' + JSON.stringify(msg));
			if(msg.question == '你是谁啊？') port.postMessage({answer: '我是你爸！'});
		});
	}
});

window.addEventListener("message", function(e)
{
	console.log('收到消息：', e.data);
	if(e.data && e.data.cmd == 'invoke') {
		eval('('+e.data.code+')');
	}
	else if(e.data && e.data.cmd == 'message') {
		tip(e.data.data);
	}
}, false);


function initCustomEventListen() {
	var hiddenDiv = document.getElementById('myCustomEventDiv');
	if(!hiddenDiv) {
		hiddenDiv = document.createElement('div');
		hiddenDiv.style.display = 'none';
		hiddenDiv.id = 'myCustomEventDiv';
		document.body.appendChild(hiddenDiv);
	}
	hiddenDiv.addEventListener('myCustomEvent', function() {
		var eventData = document.getElementById('myCustomEventDiv').innerText;
		tip('收到自定义事件：' + eventData);
	});
}

var tipCount = 0;
// 简单的消息通知
function tip(info) {
	info = info || '';
	var ele = document.createElement('div');
	ele.className = 'chrome-plugin-simple-tip slideInLeft';
	ele.style.top = tipCount * 70 + 20 + 'px';
	ele.innerHTML = `<div>${info}</div>`;
	document.body.appendChild(ele);
	ele.classList.add('animated');
	tipCount++;
	setTimeout(() => {
		ele.style.top = '-100px';
		setTimeout(() => {
			ele.remove();
			tipCount--;
		}, 400);
	}, 3000);
}