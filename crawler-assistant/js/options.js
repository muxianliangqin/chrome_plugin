$(function () {
    let config = {
        token: null
    }
    chrome.storage.sync.get(config,function (value) {
        if (value.token) {
            $('#token').val(value.token)
            $('#tip').html('token已经配置').removeClass('fail').addClass('success')
        }
    })
    $('#submit').click(function () {
        var param = {
            token: $('#token').val()
        }
        $.ajax({
            method:'post',
            url:'http://localhost:7010/checkToken',
            data:param
        }).done(function (response) {
            if (response.errorCode == '0000') {
                param.userInfo = response.content
                chrome.storage.sync.set(param, function() {
                    $('#tip').html('token配置成功').removeClass('fail').addClass('success')
                });
            } else {
                let config = {
                    token:null,
                    userInfo:null
                }
                chrome.storage.sync.set(config, function() {
                    $('#tip').html('token错误').removeClass('success').addClass('fail')
                });

            }
        })
    })
})
