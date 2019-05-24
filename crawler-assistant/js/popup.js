$(function () {
    let config = {
        userInfo:null
    }
    chrome.storage.sync.get(config,function (value) {
        let userInfo = value.userInfo
        if (userInfo) {
            $('#login').show()
            $('#username').html(userInfo.username)
            $('#logout').hidden()
        } else {
            $('#login').hidden()
            $('#logout').show()
        }
    })
})