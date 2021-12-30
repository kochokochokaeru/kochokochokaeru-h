$(function () {
    var data;
    var now = new Date();
    var timestamp = Math.round(now.getTime() / 1000); //unix时间戳
    date = now.getFullYear() + "/" + now.getMonth() + "/" + now.getDay() + "/" + now.getHours() + ":" + now.getMinutes();
    var num = 0;
    var clicktime = 3;
    var users = Array();
    var dates = Array();
    var comments = Array();
    var buble = new Array();
    $("#attention_box").hide();
    var offset = new Array(); //接收传回来的弹幕对应视频时间
    var ws_url = "ws://server.sforest.in:20480";
    player_onoff();
    var video = document.getElementById("video");
    //弹幕开关

    //加载弹幕  用于刷新按钮
    function showall() {
        var ws = new WebSocket(ws_url);
        $("#attention_box").text("正在载入……");
        attention();
        if ($("#words") != "") {
            ws.onopen = function () {
                var package = {
                    "method": "request_all",
                }
                ws.send(JSON.stringify(package));
            }
        }
        ws.onmessage = function (evt) {
            data = evt.data;
            data = JSON.parse(data);
            console.log("data:=======" + data);
            data = data.data;
            data.sort(function (a, b) {
                return a.offset > b.offset ? 1 : -1;
            });
            console.log(data);
            for (var i = 0; i < data.length; i++) {
                offset[i] = data[i].offset;
                dates[i] = data[i].time;
                users[i] = data[i].user;
                comments[i] = data[i].comment;
                dates[i] = new Date(dates[i] * 1000).toString();
                console.log(comments[i]);
                var commentname = "comment[" + users[i] + "/" + dates[i] + "]'";
                others_words(users[i], comments[i], dates[i]);
                dele_the_same(commentname);
            }
            console.log(users[1]);
            // var i=Math.round(Math.random()*100);
            var i = 0;
            var n = users.length;
            // $("#video").bind('timeupdate', function () {
            //     console.log('timeupdate', this.currentTime);
            //     // for (var i = 0; i < n; i++) {
            //     //     if(this.currentTime == offset[i]){
            //     //         go_bullet(comments[i], "all");
            //     //     }
            //     // }
            //     do{
            //         if(this.currentTime == offset[i]){
            //             go_bullet(comments[i], "all");
            //             i++;
            //         }
            //     }while(i < n)
                
            //     //test(this.currentTime);
            // }); //哦因为视频没播放 这个绑定了也好像用不到？
            test();
            console.log(video.currentTime);
        }

        //收集服务器上的弹幕
        // setTimeout(function(){
        //     ws.onclose = function() {
        //         console.log("关闭ws"); 
        //     }    
        // },5000*3);
    }

    function test() { //用于测试弹幕真实情况 
        for (var i=0; i<comments.length; i++) { 
            setTimeout( (function(i) {
                return function() {
                    go_bullet(comments[i], "all");
                    console.log("发送了" + i + "条啦~");
                }
            })(i), i*3000 );
        }
    }

    function loading() {
        //var offset = Math.round(Math.random() * 70); //视频时间
        var offset = video.currentTime;
        var user = $("#user").val();
        var words = $("#words").val();
        var isok = check();
        console.log(isok);
        if (isok) {
            var ws = new WebSocket(ws_url);
            ws.onopen = function () {
                var package = {
                    "method": "new_comment",
                    "comment": words,
                    "time": timestamp,
                    "user": user,
                    "offset": offset
                }
                $("#words").val("");
                console.log("package:" + user + ":" + words + ";" + timestamp + ";");
                ws.send(JSON.stringify(package));
                ws.onmessage = function (evt) {
                    data = evt.data;
                    data = JSON.parse(data);
                    console.log(data);
                    console.log(data.data[0].comment);
                    text = data.data[0].comment;
                    go_bullet(text, "you");
                    show_bullet(text);
                    ws.close();
                }
                console.log("发送弹幕");
                var msg = "弹幕发送成功";
                attention(msg);
            }
            //发送弹幕
            // setTimeout(function(){
            //     ws.onclose = function() {
            //         console.log("关闭ws"); 
            //     }    
            // },5000*3);
        }
        //else {
        //     var msg = "出了点小差错！";
        //     attention(msg); 
        // }
    }

    //显示或关闭弹幕
    function player_onoff() {
        $("#show").click(function () {
            if (clicktime == 3 || clicktime == 0) {
                clicktime = 1;
                console.log("关闭弹幕"); //关闭弹幕时清除节点？ 试试看

                $("#attention").text("关闭弹幕");
                attention();
                $(".danmaku_container").hide();
            } else {
                clicktime = 0;
                console.log("显示弹幕");
                $("#attention").text("显示弹幕");
                attention();
                $(".danmaku_container").show();
            }
        })
        attention();
    }
    //滚动条 让输入框不要被挡着
    function texting(str) {
        console.log("别挡着");
        $(str).css({
            "margin-bottom": "200px"
        });
    }
    //显示提示
    function attention(msg) {
        $("#attention_box").show();
        $("#attention_box").text(msg);
        setTimeout(function () {
            $("#attention_box").hide();
        }, 2333);
    }
    //前端检查
    function check() {
        var errcode = 222;

        function isBlank(str) {
            return (!str || /^\s * $/.test(str));
        } //是否为空
        function check_uni(str) {
            var patt_illegal = new RegExp(/[\@\#\$\ % \^\ & \ *  {\}\:\\L\ < \ > \?}\'\"\\\/\b\f\n\r\t]/g);
            return patt_illegal.test(str);
        } //是否为字符？非法字符
        if (isBlank($("#user").val())) {
            // $("#user").focus(function(){
            //     // texting("#user");
            //     // $("#user").scrollIntoView(alignWithTop);
            // });
            $("#user").focus();
            errcode = 233; //不能通过
            var msg = "用户名为空";
            attention(msg);
        } else if (check_uni($("#user").val())) {
            // $("#user").focus(function(){
            //     // texting("#user");
            //     // $("#user").scrollIntoView(alignWithTop);
            // });
            $("#user").focus();
            errcode = 666; //不能通过
            var msg = "用户名填写格式不对";
            attention(msg);
        } else if (isBlank($("#words").val())) {
            errcode = 233;
            // $("#words").focus(function(){
            //     // texting("#words");
            //     // $("#words").scrollIntoView(alignWithTop);
            // });
            $("#words").focus();
            var msg = "弹幕为空，请填写弹幕内容";
            attention(msg);
        } else if (check_uni($("#words").val())) {
            errcode = 666;
            // $("#words").focus(function(){
            //     // $("#words").scrollIntoView(alignWithTop);
            // });
            $("#words").focus();
            var msg = "弹幕填写格式不正确，请正确填写弹幕";
            attention(msg);
        } else {
            errcode = 111;
        }
        console.log(errcode);
        if (errcode == 111) {
            $("#user").css({
                opacity: 0.8
            })
            return true; //检查函数 验证通过返回true
        } else {
            return false;
        }

    }

    //设置弹幕随机高度
    function sethigh() {
        var div = document.getElementById("main_container");
        var bullet_high = document.getElementById("main_container").lastElementChild.previousSibling.previousSibling.clientHeight;
        var div_high = div.clientHeight;
        // console.log(div_high);
        div_high = (div_high - bullet_high) + 30;
        var high = 0;
        high = Math.round(div_high + Math.random() * 20);
        // console.log("--------high:"+high);
        return high;
    }

    //先排序offset再根据顺序调用go_bullet
    function which_first(a) {
        var allmessage = new Array();
        var num = users.length;
        for (var i = 0; i < num; i++) {
            allmessage[i] = users[i] + "/" + comments[i];
        }
        for (var i = 0; i < num; i++) {
            a = offset[i] - a;
            if (a < 0) { // i要比现在这个查的弹幕大 现在的往前放
                return true; //可以发弹幕 如果false就待会再调用这个直到
            } else {
                return false;
            }
        }
    }
    //插入弹幕
    function go_bullet(text, method) {
        if (method == "you") {
            var user = $("#user").val();
            num = num++;
            containername = "container[" + num + "]";
            bulletname = "bulletc[" + num + "]";
            say_a_word(user, text);
            console.log("写进评论");
            var colorname = $("#color").val();
            var sizename = $("#size").val();
            var opacityname = $("#opacity").val();
            // font_style(bulletname);
            // $(containername).css({
            //     "top":sethigh(),
            // })
            // highs[num]=sethigh();
            // if((highs[num]-highs[random_style()])<=20){
            //     highs[num]=sethigh()+50;
            // }
            $("#main_container").append("<div class='danmaku_container' id=" + containername + " style=" + "top:" + sethigh() + "px>" +
                "<div class='bullet'" + "id='" + bulletname + "'style=" + "color:" + colorname + ";size:" + sizename + ";opacity:" + opacityname + ";" +
                "margin:20px;" + ">" + text + "</div>" +
                "</div>"); //包含在内
        } else if (method == "all") {
            num = num++;
            containername = "container[" + num + "]";
            bulletname = "bulletc[" + num + "]";
            var color = Array();
            var display = Array();
            var size = Array();

            function setstyle() {
                color[0] = "red";
                color[1] = "yellow";
                color[2] = "green";
                color[3] = "blue";
                color[4] = "purple";
                color[5] = "white";
                display[0] = "1";
                display[1] = "0.8";
                display[2] = "0.7";
                display[3] = "0.5";
                display[4] = "0.4";
                display[5] = "0.6";
                size[0] = "10px";
                size[1] = "75px";
                size[2] = "30px";
                size[3] = "25px";
                size[4] = "40px";
                size[5] = "15px";
            }
            $("#main_container").append("<div class='danmaku_container' id=" + containername + " style=" + "top:" + sethigh() + "px>" +
                "<div class='bullet'" + "id='" + bulletname + "'style=" + "color:" + colorname + ";size:" + sizename + ";opacity:" + opacityname + ";" +
                "margin:20px;" + ">" + text + "</div>" +
                "</div>");
        }
    }
    //服务器发回的评论和弹幕
    function others_words(user, str, time) {
        $("#comments").append("<div class='comment' id='comment[" + user + "/" + time + "]'" + ">" + //div需要id
            "<img class='imghead'  " + "' src='img/icon_sample.png'>" +
            "<div class='username'>" + user + "</div>" //用户名
            +
            "<div class='time'>" + time + "</div>" //时间
            +
            "<div class='text'>" + str //评论内容
            +
            "</div></div>");
        var commentname = "comment[" + user + "/" + time + "]'";
        dele_the_same(commentname);
    }

    function dele_the_same(id) {
        var lastcomment = document.getElementById("main_container").lastElementChild.previousSibling.previousSibling; //最后一个弹幕
        var yours = document.getElementById(id);
        var rest = lastcomment.isEqualNode(yours);
        if (rest) {
            yours.parentNode.removeChild(yours);
        }
    }

    function say_a_word(user, str) {
        $("#comments").append("<div class='comment'>" + "<img class='imghead'  id='" + user + "' src='img/icon_sample.png'>" +
            "<div class='username'>" + user + "</div>" //用户名
            +
            "<div class='time'>" + date + "</div>" //时间
            +
            "<div class='text'>" + str //评论内容
            +
            "</div></div>");
    }
    //按钮设置
    $("#send_btn").bind("click", function () {
        loading();
    })
    $(document).keyup(function (event) {
        if (event.keyCode == 13) {
            $("#send_btn").trigger("click");
        }
    })
    $("#freshen_btn").click(function () {
        if (clicktime = 3) {
            clicktime = 2
            showall();
            $(".danmaku_container").show();
        }
        setTimeout(function () {
            clicktime = 3
        }, 2000);
    })
    $("#setting_box").hide();
    $("#setting").click(function () {
        $("#setting_box").slideToggle();
        $("#slider").slider();
    })
    //改变字体颜色和大小、透明度      哇因为append的时候就已经写入函数了 改变不了

    //评论区
    function show_bullet(data) {
        for (var i = 0; i < data.sum; i++) {
            bulletname = "#bulletc[" + num + "]";
            font_style(bulletname);
        }
    }
})