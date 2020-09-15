let show_context_menu = false;
let show_border = true;
let action = '';

console.log('这是content script!');

// 注意，必须设置了run_at=document_start 此段代码才会生效
document.addEventListener('DOMContentLoaded', function () {
    console.log('屏蔽右键菜单');
    document.oncontextmenu = function () {
        return show_context_menu;
    };

    chrome.storage.local.get({action: ''}, function (value) {
        action = value.action || 'title';
    });

    console.log('监听鼠标点击事件');
    document.onmousedown = function (e) {
        if (e.button === 2 && !show_context_menu && $('.crawler-result-show').length == 0) {
            // let show = $('.crawler-result-show');
            let xpath = getXpath(e);
            if (action === 'title') {
                let res = getTitle(e);
                res.xpathArticleTitle = xpath;
                resultShow(res);
            } else if (action === 'text') {
                let text = getText(e);
                let html = getHtml(e);
                chrome.storage.local.get({'crawlerResult': {}}, function (value) {
                    let res = value.crawlerResult;
                    res.text = text;
                    res.html = html;
                    res.xpathArticleContent = xpath;
                    resultShow(res);
                });
            }
            // show_context_menu = true
            show_border = false;
        }
    };

    /**
     * 爬取结果对象初始化
     * @returns
     */
    function crawlerResult() {
        return {
            webUrl: '',
            columnUrl: '',
            columnTitle: '',
            charset: '',
            xpathArticleTitle: '',
            xpathArticleContent: '',
            text: '',
            html: '',
            articleList: [],
            invalidResults: []
        }
    }

    /**
     * 浏览器本地保存
     * @param config
     */
    function saveLocalStorage(config) {
        chrome.storage.local.set(config, function () {
            console.log('saveLocalStorage成功');
        })
    }

    /**
     * 根据鼠标点击获取点击区域的xpath
     * @param e
     * @returns {string}
     */
    function getXpath(e) {
        // 去除window、document、html等,从body开始
        let paths = e.path;
        paths.reverse();
        paths = paths.slice(3);
        // 寻找最后一个具有id属性的元素
        paths = paths.reverse();
        let index = paths.length;
        for (let i = 0; i < paths.length; i++) {
            let v = paths[i];
            if (v.id) {
                index = i + 1;
                break;
            }
        }
        paths = paths.slice(0, index);
        //获取xpath值
        paths = paths.reverse();
        let xp = [''];
        let children = null;
        for (let i = 0; i < paths.length; i++) {
            let path = paths[i];
            // 如果元素有id，这里通常是第一个
            if (path.id) {
                xp.push('/*[@id="' + path.id + '"]');
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
            for (let j = 0; j < children.length; j++) {
                if (children[j].localName === path.localName) {
                    x_children.push(children[j])
                }
            }
            // 获得xpath序号
            if (x_children.length === 1) {
                xp.push(path.localName)
            } else {
                let x_idx = 0;
                for (let j = 0; j < x_children.length; j++) {
                    if (x_children[j] === path) {
                        xp.push(path.localName + '[' + (x_idx + 1) + ']');
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

    /**
     * 获取标题数组
     * @param e 鼠标点击div时间
     * @returns {{webUrl: string, columnUrl: string, columnTitle: string, charset: string, xpathArticleTitle: string, xpathArticleContent: string, articleList: Array, invalidResults: Array}}
     */
    function getTitle(e) {
        let srcElement = e.srcElement;
        let currentTarget = e.currentTarget;
        let as = $(srcElement).find('a');
        const res = crawlerResult();
        res.webUrl = currentTarget.domain;
        res.columnUrl = currentTarget.baseURI;
        res.columnTitle = currentTarget.title;
        res.charset = currentTarget.charset;
        let invalidTitle = /^(首页|下一页|上一页|确定|末页|尾页|更多(\s+>>)?|\d+)$/;
        let invalidHref = /^(\.\/|\.\.\/)((\.\.\/)+)?$/;
        for (let i = 0; i < as.length; i++) {
            let a = as[i];
            if (!a.attributes['href']) {
                continue
            }
            let title = a.title;
            if (!title) {
                title = a.innerText
            }
            let href = a.attributes['href'].value;
            if (invalidTitle.test(title) || invalidHref.test(href)) {
                res.invalidResults.push({
                    'title': title
                })
            } else {
                res.articleList.push({
                    'url': a.href,
                    'title': title
                })
            }
        }
        return res
    }

    /**
     * 获取内容正文
     * @param e
     * @returns {string}
     */
    function getText(e) {
        return e.srcElement.innerText;
    }

    /**
     * 获取内容正文(包括html标签)
     * @param e
     * @returns {string}
     */
    function getHtml(e) {
        return e.srcElement.outerHTML;
    }

    /**
     * 展示获取的结果
     * @param res
     */
    function resultShow(res) {
        const keyDict = {
            webUrl: {
                id: 'self-web-info-webUrl',
                name: '主页链接'
            },
            columnTitle: {
                id: 'self-web-info-columnTitle',
                name: '分类标题'
            },
            columnUrl: {
                id: 'self-web-info-columnUrl',
                name: '分类链接'
            },
            charset: {
                id: 'self-web-info-charset',
                name: '网站编码'
            },
            xpathArticleTitle: {
                id: 'self-web-info-xpathArticleTitle',
                name: '标题路径'
            },
            xpathArticleContent: {
                id: 'self-web-info-xpathArticleContent',
                name: '正文路径'
            },
        };
        let divHead = `
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
	    `;
        let divBody = '';
        Object.keys(keyDict).forEach(k => {
            let value = keyDict[k];
            divBody +=
                `<tr>
                    <td>${value.name}</td>
                    <td id="${value.id}"></td>
                </tr>
                `
        });
        const divFoot = `</tbody>
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
        let div = divHead + divBody + divFoot;
        div = $(div);
        Object.keys(keyDict).forEach(k => {
            let value = keyDict[k];
            div.find(`#${value.id}`).html(res[k]);
        });
        const height = document.documentElement.clientHeight;
        const width = document.documentElement.clientWidth;
        div.find('.self-res-div').css({
            'max-height': height - 350 + 'px',
            'max-width': width * 0.5 + 'px',
        });
        const tip = div.find('#self-span-tip');
        showTip(tip, action);
        div.find('#self-button-switch').click(function () {
            action = action === 'title' ? 'text' : 'title';
            saveLocalStorage({'action': action});
            showTip(tip, action);
        });
        let tBody = div.find('#self-result-table tbody');
        if (action === 'title') {
            tBody.append($('<tr><td colspan="2">标题有效结果</td></tr>'));
            let articleList = res.articleList;
            for (let i = 0; i < articleList.length; i++) {
                let a = articleList[i];
                tBody.append(articleColumn(a, i));
            }
            tBody.append($('<tr><td colspan="2">标题无效结果</td></tr>'));
            let invalidResults = res.invalidResults;
            for (let i = 0; i < invalidResults.length; i++) {
                let a = invalidResults[i];
                tBody.append(articleColumn(a, i));
            }
        } else if (action === 'text') {
            let articleList = res.articleList;
            let trs = [];
            trs.push($(`<tr><td colspan="2">标题结果(共${articleList.length}条)</td></tr>`));
            for (let i = 0; i < articleList.length; i++) {
                let a = articleList[i];
                trs.push(articleColumn(a, i));
            }
            trs.splice(3, trs.length - 5, $('<tr><td colspan="2">......</td></tr>'));
            tBody.html(trs);

            let text = res.text;
            tBody.append($('<tr><td colspan="2">正文结果(约' + text.length + '字)</td></tr>'));
            if (text.length > 100) {
                text = text.substr(0, 50) + '<br>......<br>' + text.substr(-50);
            }
            tBody.append($('<tr><td colspan="2" style="width: 20em">' + text + '</td></tr>'));
        }
        let button_submit = $('<button id="self-button-submit" style="margin:0 10px;">确定选择</button>');
        button_submit.click(function () {
            saveResult(res);
        });
        let button_select_text = $('<button id="self-button-select-text" style="margin:0 10px;">选择正文</button>');
        button_select_text.click(function () {
            tBody.find('a:first')[0].click();
            saveLocalStorage({'action': 'text'});
            saveLocalStorage({'crawlerResult': res});
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
        button_reselect.click(function () {
            remove_result_show();
        });
        let footer = div.find('.self-footer');
        footer.append(button_submit);
        footer.append(button_select_text);
        footer.append(button_reselect);
        $('body').append(div);
    }

    /**
     * table展示标题数组时生产列数据
     * @param article 文章对象
     * @param index 序号
     * @returns {jQuery.fn.init|jQuery|HTMLElement}
     */
    function articleColumn(article, index) {
        return $(`
            <tr>
                <td style="text-align: right;">${index + 1}</td>
                <td><a href="${article.url}" target="_blank">${article.title}</a></td>
            </tr>
        `)
    }

    /**
     * 显示当前行为方式的提示
     * @param ele
     * @param action
     */
    function showTip(ele, action) {
        ele.html(action === 'title' ? '抓取标题' : '抓取正文');
    }

    /**
     * 保存爬取结果
     * @param res
     */
    function saveResult(res) {
        let config = {
            token: null
        };
        chrome.storage.sync.get(config, function (value) {
            let token = value.token;
            delete res.text;
            delete res.html;
            delete res.invalidResults;
            if (token) {
                $.ajax({
                    // url:'http://47.106.140.189/crawler/plugin/save',
                    url: 'http://localhost:7120/plugin/save',
                    type: 'post',
                    data: JSON.stringify(res),
                    async: true,
                    dataType: 'json',
                    headers: {'Content-Type': 'application/json;charset=utf8', 'token': token}
                }).success(function (response) {
                    alert('添加成功');
                    saveLocalStorage({'action': 'title'});
                    action = 'title';
                    remove_result_show();
                }).fail(function (response) {
                    alert('添加失败')
                })
            } else {
                alert('操作失败，请登录或刷新')
            }
        })
    }

    function remove_result_show() {
        $('.crawler-result-show').remove();
        show_context_menu = false;
        show_border = true;
    }

    document.onmouseover = function (e) {
        if (show_border) {
            $(e.srcElement).addClass('myself-mouseover-selected')
        }
    };

    document.onmouseout = function (e) {
        if (show_border) {
            $(e.srcElement).removeClass('myself-mouseover-selected')
        }
    };

    window.addEventListener("message", receiveMessage, false);

    function receiveMessage(event) {
        let origin = event.origin || event.originalEvent.origin;
        if (origin !== 'http://localhost:7000') {
            return
        }
        let data = event.data;
        saveLocalStorage(data)
    }

});
