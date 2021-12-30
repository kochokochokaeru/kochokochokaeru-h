var ws = new WebSocket(ws_url)
var imgheadurl
var data

ws.onopen = function () {
    for (var i = 0; i < data.sum; i++) {
        document.getElementById("comments").append("<img class='imghead' src='" + imgheadurl + "'>",
            "<div class='username'>" + data.id + "</div>",
            "<div class='text'>" + data.message + "</div>")
    }
}