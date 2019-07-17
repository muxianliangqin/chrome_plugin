let show_context_menu = false;
let show_border = true;
let action = '';

console.log('这是content script!');

// 注意，必须设置了run_at=document_start 此段代码才会生效
document.addEventListener('DOMContentLoaded', function()
{
	console.log('屏蔽右键菜单');
	document.oncontextmenu = function(){
		return show_context_menu;
	};

    chrome.storage.local.get({action: ''}, function (value) {
        action = value.action || 'title';
    });

    console.log('监听鼠标点击事件');
	document.onmousedown = function(e){
		if (e.button=== 2 && !show_context_menu && $('.crawler-result-show').length == 0){
			// let show = $('.crawler-result-show');
			let xpath = getXpath(e);
            if (action === 'title') {
                let res = getTitle(e);
                res.xpathTitle = xpath;
                resultShow(res);
            } else if (action === 'text') {
                let text = getText(e);
                let url = e.currentTarget.baseURI;
                chrome.storage.local.get({'result': {}}, function (value) {
                    let res = value.result;
                    let validResults = res.validResults;
                    if (!validResults
                        || validResults.length === 0
                        || validResults[0].href !== url) {
                        res = {
                            origin: '',
                            baseURI: '',
                            title: '',
                            charset: '',
                            validResults: [],
                            invalidResults: []
                        };
                    }
                    res.text = text;
                    res.xpathText = xpath;
                    resultShow(res);
                });

            }

			// show_context_menu = true
			show_border = false;
		}
	};

	function saveLocalStorage(config) {
        chrome.storage.local.set(config, function () {
            console.log('saveLocalStorage成功');
        })
    }

    function getXpath(e){
        // 去除window、document、html等,从body开始
        let paths = e.path;
        paths.reverse();
        paths = paths.slice(3);
        // 寻找最后一个具有id属性的元素
        paths = paths.reverse();
        let index = paths.length;
        for(let i=0;i<paths.length;i++){
            let v = paths[i];
            if (v.id) {
                index = i + 1;
                break;
            }
        }
        paths = paths.slice(0,index);
        //获取xpath值
        paths = paths.reverse();
        let xp = [''];
        let children = null;
        for(let i=0;i<paths.length;i++){
            let path = paths[i];
            // 如果元素有id，这里通常是第一个
            if (path.id) {
                xp.push('/*[@id="'+path.id+'"]');
                children = path.children;
                continue
            }
            // children == null时，这里通常是html/body
            if (children == null) {
                xp.push('/' + path.localName);
                children = path.children;
                continue
            }
            // 只保留元素名相同的
            let x_children = [];
            for(let j=0;j<children.length;j++){
                if (children[j].localName === path.localName){
                    x_children.push(children[j])
                }
            }
            // 获得xpath序号
            if (x_children.length === 1) {
                xp.push(path.localName)
            } else {
                let x_idx = 0;
                for(let j=0;j<x_children.length;j++){
                    if (x_children[j] === path){
                        xp.push(path.localName+'['+(x_idx+1)+']');
                        break
                    } else {
                        x_idx = x_idx + 1;
                    }
                }
            }
            children = path.children
        }
        return xp.join('/');
    }

	function getTitle(e){
		let srcElement = e.srcElement;
		let currentTarget = e.currentTarget;
        let as = $(srcElement).find('a');
        let res = {
            origin: currentTarget.domain,
            baseURI: currentTarget.baseURI,
            title: currentTarget.title,
            charset: currentTarget.charset,
            validResults: [],
            invalidResults: []
        };
        let invalidTitle = /^(首页|下一页|上一页|确定|末页|尾页|更多(\s+>>)?|\d+)$/;
        let invalidHref = /^(\.\/|\.\.\/)((\.\.\/)+)?$/;
		for (let i=0;i<as.length;i++){
			let a = as[i];
			let title = a.title;
			if (!title) {
                title = a.innerText
            }
            let href = a.attributes['href'].nodeValue;
			if (invalidTitle.test(title) || invalidHref.test(href)) {
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

    function getText(e){
        return e.srcElement.innerText;
    }

	function resultShow(res){
		let div = `
		<div class="crawler-result-show" style="text-align: left">
			<div class="self-header">
			    <h3>
			    网站详情
			    <span style="float:right;margin-right:20px;font-weight: normal;font-size: medium;">
			    	<span id="self-span-tip">抓取标题</span>
			    	<button id="self-button-switch" style="margin-left:10px;">切换</button>
				</span>
			    </h3>
			    <table style="width: 100%">
			        <colgroup>
                        <col width="20%">
                        <col width="80%">
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
			                <td>分类链接</td>
			                <td id="self-web-info-baseURI"></td>
                        </tr>
                        <tr>
			                <td>网站编码</td>
			                <td id="self-web-info-charset"></td>
                        </tr>
                        <tr>
			                <td>标题路径</td>
			                <td id="self-web-info-xpath-title"></td>
                        </tr>
                        <tr>
			                <td>正文路径</td>
			                <td id="self-web-info-xpath-text"></td>
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
		`;
		div = $(div);
        div.find('#self-web-info-origin').html(res.origin);
        div.find('#self-web-info-title').html(res.title);
        div.find('#self-web-info-baseURI').html(res.baseURI);
        div.find('#self-web-info-charset').html(res.charset);
        div.find('#self-web-info-xpath-title').html(res.xpathTitle);
        div.find('#self-web-info-xpath-text').html(res.xpathText);
        const height = document.documentElement.clientHeight;
        const width = document.documentElement.clientWidth;
        div.find('.self-res-div').css({
            'max-height': height - 350 + 'px',
            'max-width': width * 0.5 + 'px',
        });
        const tip = div.find('#self-span-tip');
        showTip(tip, action);
        div.find('#self-button-switch').click(function () {
        	action = action === 'title'?'text':'title';
            saveLocalStorage({'action':action});
            showTip(tip, action);
        });
        let tbody = div.find('#self-result-table tbody');
        if (action === 'title') {
            tbody.append($('<tr><td colspan="2">标题有效结果</td></tr>'));
            let validResults = res.validResults;
            for (let i=0;i<validResults.length;i++){
                let a = validResults[i];
                tbody.append(
                    $('<tr>' +
                        '<td style="text-align: right;">'+(i+1)+'</td>' +
                        '<td><a href='+a.href+' target="_blank">'+a.title+'</a></td>' +
                        '</tr>')
                );
            }
            tbody.append($('<tr><td colspan="2">标题无效结果</td></tr>'));
            let invalidResults = res.invalidResults;
            for (let i=0;i<invalidResults.length;i++){
                let a = invalidResults[i];
                tbody.append(
                    $('<tr>' +
                        '<td style="text-align: right;">'+(i+1)+'</td>' +
                        '<td><span>'+a.title+'</span></td>' +
                        '</tr>')
                );
            }
        } else if (action === 'text') {
            let validResults = res.validResults;
            let trs = [];
            trs.push($('<tr><td colspan="2">标题结果(共'+validResults.length+'条)</td></tr>'));
            for (let i=0;i<validResults.length;i++) {
                let a = validResults[i];
                trs.push(
                    $('<tr>' +
                        '<td style="text-align: right;">' + (i + 1) + '</td>' +
                        '<td><a href=' + a.href + ' target="_blank">' + a.title + '</a></td>' +
                        '</tr>')
                );
            }
            trs.splice(3,trs.length-5,$('<tr><td colspan="2">......</td></tr>'));
            tbody.html(trs);

            let text = res.text;
            tbody.append($('<tr><td colspan="2">正文结果(约' + text.length + '字)</td></tr>'));
            if (text.length > 100) {
                text = text.substr(0,50) + '<br>......<br>' + text.substr(-50);
            }
            tbody.append($('<tr><td colspan="2" style="width: 20em">' + text + '</td></tr>'));
		}
		let button_submit = $('<button id="self-button-submit" style="margin:0 10px;">确定选择</button>');
        button_submit.click(function(){
            save_result(res);
        });
        let button_select_text = $('<button id="self-button-select-text" style="margin:0 10px;">选择正文</button>');
        button_select_text.click(function(){
            tbody.find('a:first')[0].click();
            saveLocalStorage({'action':'text'});
            saveLocalStorage({'result':res});
            remove_result_show();
        });
        if (action === 'title') {
            button_submit.hide();
            button_select_text.show();
        } else if (action === 'text') {
            button_submit.show();
            button_select_text.hide();
        }
        let button_reselect = $('<button id="self-button-reselect" style="margin:0 10px;">重新选择</button>');
        button_reselect.click(function(){
            remove_result_show();
        });
        let footer = div.find('.self-footer');
        footer.append(button_submit);
        footer.append(button_select_text);
        footer.append(button_reselect);
		$('body').append(div);
	}

	function showTip(ele, action) {
        ele.html(action === 'title'?'抓取标题':'抓取正文');
    }

	function save_result(res){
        let config = {
            userInfo:null
        };
        chrome.storage.sync.get(config,function (value) {
            let userInfo = value.userInfo;
            if (userInfo) {
                res.userId = userInfo.id;
                $.ajax({
                    // url:'http://47.106.140.189/crawler/plugin/save',
                    url:'http://localhost:7020/plugin/save',
                    type: 'post',
                    data: {
                        crawlerResult: JSON.stringify(res)
					},
					async: true,
					dataType: 'json'
                }).success(function(response){
                    alert('添加成功');
                    saveLocalStorage({'action':'title'});
                    action = 'title';
                    remove_result_show();
                }).fail(function (response) {
                    alert('添加失败')
                })
            } else {
                alert('操作失败，请前往【chrome设置->更多工具->扩展程序->详细信息->扩展程序选项】配置秘钥')
            }
        })
	}

	function remove_result_show () {
		$('.crawler-result-show').remove();
		show_context_menu = false;
		show_border = true;
	}

	document.onmouseover = function(e){
		if (show_border){
			$(e.srcElement).addClass('myself-mouseover-selected')
		}
	};

	document.onmouseout = function(e){
		if (show_border){
			$(e.srcElement).removeClass('myself-mouseover-selected')
		}
	};

});
