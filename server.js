var http = require("http");
var fs = require("fs");
var path = require("path");
var mime = require("mime");
// cache 缓存文件内容
var cache = {};

var chatServer = require('./lib/chat_server');

// 2.创建http服务
var server = http.createServer(function(request,response) {
    var filePath = false;
    if(request.url == '/'){
        filePath = 'public/index.html';
    } else {
        filePath = 'public' + request.url;
    }
    var absPath = './' + filePath;
    serveStatic(response, cache, absPath);
});

// 1.提供静态文件服务
function serveStatic(response, cache, absPath) {
    if (cache[absPath]) {
        // 有缓存时，直接返回
        sendFile(response, absPath, cache[absPath]);
    } else {
        fs.exists(absPath, function (exists) {
            if (exists) {    // 当文件存在
                fs.readFile(absPath, function (err, data) {
                    if (err) { // 读取错误
                        send404(response);
                    } else { // 成功读取，则存入缓存
                        cache[absPath] = data;
                        sendFile(response, absPath, data);
                    }
                });
            } else {
                send404(response);
            }
        });
    }

};

// 返回404错误提示
function send404(response) {
    response.writeHead(404, {'Content-Type':'text/plain'});
    response.write('Error 404: resource not found.');
    response.end();
}

//
// 在版本"mime": "^2.2.0", 变更为getType()
function sendFile(response,filePath,fileContent) {
    response.writeHead(
        200,
        {"content-type":mime.lookup(path.basename(filePath))
    });
    // 返回静态文件内容
    response.end(fileContent);
}

// 3.启动服务器，监听端口
server.listen(3002, function() {
    console.log("Server listening on port 3002");
});

// socket-io
chatServer.listen(server);

// "dependencies": {
//     "mime": "^2.2.0",
//         "socket.io": "^2.0.4"
// },