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
			var res = getRes(e)
            res.xpath = xpath
			resShow(res)
			// show_context_menu = true
			show_border = false
		}
	}

	function getRes(e){
        let ele = e.srcElement;
        let as = $(ele).find('a');
        let res = {
            origin: e.currentTarget.domain,
            baseURI: e.currentTarget.baseURI,
            title: e.currentTarget.title,
            charset: e.currentTarget.charset,
            clientWidth: e.currentTarget.documentElement.clientWidth,
            clientHeight: e.currentTarget.documentElement.clientHeight,
            validResults: [],
            invalidResults: []
        }
        let invalidTitle = /^首页|下一页|上一页|确定|末页|尾页|\d+$/
        let invalidHref = /^(\.\/|\.\.\/)((\.\.\/)+)?$/
		for (var i=0;i<as.length;i++){
			var a = as[i];
			var title = a.title;
			if (!title) {
                title = a.innerText
            }
            let href = a.attributes['href'].nodeValue
			if (invalidTitle.test(title) | invalidHref.test(href)) {
                res.invalidResults.push({
                    'title':title
                })
            } else {
                res.validResults.push({
                    'href':a.href,
                    'title':title
                })
            }
		}

		return res
	}

	function getXpath(e){
		var paths = e.path;
		// 去除window、document、html等,从body开始
		paths.reverse();
		paths = paths.slice(3);
		// 寻找最后一个具有id属性的元素
		paths = paths.reverse();
		var index = paths.length;
		for(var i=0;i<paths.length;i++){
			var v = paths[i];
			if (v.id) {
				index = i + 1;
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

	function resShow(res){
		let div = `
		<div class="crawler-result-show">
			<div class="self-header">
			    <h3>网站详情</h3>
			    <table>
			        <colgroup>
                        <col width="30%">
                        <col width="70%">
                    </colgroup>
			        <tbody>
			            <tr>
			                <td>主页链接</td>
			                <td id="self-web-info-origin"></td>
                        </tr>
                        <tr>
			                <td>分类标题</td>
			                <td id="self-web-info-title"></td>
                        </tr>
                        <tr>
			                <td>主页链接</td>
			                <td id="self-web-info-baseURI"></td>
                        </tr>
                        <tr>
			                <td>网站编码</td>
			                <td id="self-web-info-charset"></td>
                        </tr>
                        <tr>
			                <td>元素路径</td>
			                <td id="self-web-info-xpath"></td>
                        </tr>
                    </tbody>
                </table>
			</div>
			<div class="self-content">
			    <h3>选择结果</h3>
			    <div class="self-res-div">
			        <table id="self-result-table" style="width: 100%">
                        <colgroup>
                            <col width="5%">
                            <col width="95%">
                        </colgroup>
                        <tbody>
                        </tbody>
			        </table>
                </div>
            </div>
            <div class="self-footer">
            </div>
		</div>
		`
		div = $(div)
        div.find('#self-web-info-origin').html(res.origin);
        div.find('#self-web-info-title').html(res.title);
        div.find('#self-web-info-baseURI').html(res.baseURI);
        div.find('#self-web-info-charset').html(res.charset);
        div.find('#self-web-info-xpath').html(res.xpath);
        div.find('.self-res-div').css({
            'max-height': res.clientHeight - 350 + 'px',
            'max-width': res.clientWidth * 0.5 + 'px',
        })
        var tbody = div.find('#self-result-table tbody');
        tbody.append($('<tr><td colspan="2">有效结果</td></tr>'))
        let validResults = res.validResults;
        for (var i=0;i<validResults.length;i++){
            var a = validResults[i];
            tbody.append(
			    $('<tr>' +
                    '<td style="text-align: right;">'+(i+1)+'</td>' +
                    '<td><a href='+a.href+' target="_blank">'+a.title+'</a></td>' +
                '</tr>')
            );
		}
        tbody.append($('<tr><td colspan="2">无效结果</td></tr>'))
        let invalidResults = res.invalidResults;
        for (var i=0;i<invalidResults.length;i++){
            var a = invalidResults[i];
            tbody.append(
                $('<tr>' +
                    '<td style="text-align: right;">'+(i+1)+'</td>' +
                    '<td><span>'+a.title+'</span></td>' +
                '</tr>')
            );
        }
		let button_submit = $('<button style="margin-right:10px;">确定选择</button>');
        button_submit.click(function(){
            confirm_result(res);
        });
		let button_reselect = $('<button style="margin-left:10px;">重新选择</button>');
        button_reselect.click(function(){
            remove_result_show();
        });
        let footer = div.find('.self-footer');
        footer.append(button_submit);
        footer.append(button_reselect);
		$('body').append(div);
	}

	function confirm_result(res){
        let config = {
            userInfo:null
        }
        chrome.storage.sync.get(config,function (value) {
            let userInfo = value.userInfo
            if (userInfo) {
                res.userId = userInfo.id
                $.ajax({
                    url:'http://47.106.140.189/weChat/plugin/save',
                    // url:'http://localhost:7020/plugin/save',
                    // url:'https://www.aiqiyue.xyz/weChat/findGroups',
                    type: 'post',
                    // traditional: true,
                    data: {
                        crawlerResult: JSON.stringify(res)
					},
					async: true,
					dataType: 'json'
                }).success(function(response){
                    alert('添加成功')
                    remove_result_show()
                }).fail(function (response) {
                    alert('添加失败')
                })
            } else {
                alert('操作失败，请前往【chrome设置->更多工具->扩展程序->详细信息->扩展程序选项】配置秘钥')
            }
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
