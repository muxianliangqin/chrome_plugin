var show_context_menu = false
var show_border = true
console.log('这是content script!');

// 注意，必须设置了run_at=document_start 此段代码才会生效
document.addEventListener('DOMContentLoaded', function()
{
	console.log('屏蔽右键菜单')
	document.oncontextmenu = function(){
		return show_context_menu
	}
	console.log('监听鼠标点击事件')
	document.onmousedown = function(e){
		if (e.button==2 && !show_context_menu){
			var xpath = getXpath(e)
			var as = getAs(e)
			resShow(xpath,as)
			show_context_menu = true
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
		var xp = ['']
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
			var x_children = []
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
		let div = `
		<div class="crawler-result-show">
			<p><span>xpath:'+xpath+'</span></p>
			<ul></ul>
		</div>
		`
		div = $(div)
		var ul = div.find('ul')
		for (var i=0;i<as.length;i++){
			var a = as[i]
			ul.append($('<li><a href='+a.href+' target="_blank">'+a.title+'</a></li>'))
		}
		let button_submit = $('<button style="margin-right:10px;">确定选择</button>')
        button_submit.click(function(){
            confirm_result()
        })
		let button_reselect = $('<button style="margin-left:10px;">重新选择</button>')
        button_reselect.click(function(){
            remove_result_show()
        })
        div.append(button_submit)
        div.append(button_reselect)
		$('body').append(div)
	}

	function confirm_result(){
		remove_result_show()
		$.ajax({
			url:'http://47.106.140.189/weChat/findGroups',
			// url:'https://www.aiqiyue.xyz/weChat/findGroups',
			method: 'post',
			data:{
				'userId':3
			}
		}).done(function(response){
			console.log(response)
		})
	}

	function remove_result_show () {
		$('.crawler-result-show').remove()
		show_context_menu = false
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
