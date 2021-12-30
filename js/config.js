$(function (){
    var name = $("#video_name").val();
    var src1 = "http://vodkgeyttp8.vod.126.net/cloudmusic/7ee3/mv/a104/181251ac9d84d0f40c5fa2d8fc263e7e.mp4?wsSecret=002f44c3adb92a5bf6430859fb524b75&wsTime=1554720592";
    $("video").attr("src",src1);
    // $("video").play();
    $("#video_name").text("SEARCH");
    // var viedo_src = $("#video").attr("src","video/");
    // var danmaku;
    var color=Array();
    var display=Array();
    var size=Array();
    function setcolor(){
        color[0]="red";
        color[1]="yellow";         
        color[2]="green";
        color[3]="blue";
        color[4]="purple";
        color[5]="white";
        for (var i = 0; i <= 5; i++) {
            $("#color").append("<option value=" + color[i] + ">" + color[i] + "</option>");
            //颜色选项
        }}
    function setopacity(){
        display[0]="1";
        display[1]="0.8";
        display[2]="0.7";
        display[3]="0.5";
        display[4]="0.4";
        display[5]="0.2";
        for (var i = 0; i <= 5; i++) {
        $("#opacity").append("<option value=" + display[i] +">" + display[i] + "</option>");}
        //透明度
    }
    function setsize(){
        size[0]="50px";
        size[1]="25px";
        size[2]="20px";
        size[3]="15px";
        size[4]="10px";
        size[5]="5px";
        for (var i = 0; i <= 5; i++) {
         $("#size").append("<option value=" + size[i] + ">" + size[i] + "</option>");}
         //字体大小
    }
    $("#color").change(setcolor());
    $("#opacity").change(setopacity());
    $("#size").change(setsize());
$("#red").attr("src","img/pic/red.png");
$("#yellow").attr("src","img/pic/yellow.png");
$("#green").attr("src","img/pic/green.png");
$("#blue").attr("src","img/pic/blue.png");
$("#white").attr("src","img/pic/white.png");
$("#purple").attr("src","img/pic/purple.png");

    function click_color(){
        var colorname=Array();
        for(var i=0;i<=5;i++){
            colorname[i]="#"+color[i];
        }
        var clicktime=22;
        function check_color(str,num){
                clicktime=23;
            $("#color").val(color[num]);
            console.log($("#color").val());
            $(str).css({
                "border-width": "1.2px",
                "border-color":"red",
                "border-radius": "15em",
                "border-style": "inset"
            })
        }
        function checktime(){
            if(clicktime==23){
                $(".color").css({
                    "border": "none"
                });
                $("#color").empty();
                $("#color").change(setcolor());
                clicktime=22;
                return false;
            }
            if(clicktime==22){
                return true;
            }
        }
        $(colorname[0]).click(function(){
            var rest=checktime();
            if(rest){
                check_color(colorname[0],0);
            }
            console.log(checktime());
        })
        $(colorname[1]).click(function(){
            var rest=checktime();
            if(rest){
            check_color(colorname[1],1);}
            console.log(rest);
        })
        $(colorname[2]).click(function(){
            var rest=checktime();
            if(rest){
                check_color(colorname[2],2);
            }
            console.log(rest);
        })
        $(colorname[3]).click(function(){
            var rest=checktime();
            if(rest){
                check_color(colorname[3],3);
            }
            console.log(rest);
        })
        $(colorname[4]).click(function(){
            var rest=checktime();
            if(rest){
                check_color(colorname[4],4);
            }
            console.log(rest);
        })
        $(colorname[5]).click(function(){
            var rest=checktime();
            if(rest){
                check_color(colorname[5],5);
            }
            console.log(rest);
        })
    }
    click_color();
})