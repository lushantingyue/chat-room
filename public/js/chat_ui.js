// 处理用户输入
function processUserInput(chatApp,socket){
    var message = $('#send-message').val();
    var systemMessage;
    if(message.charAt(0) == '/'){
        systemMessage = chatApp.processCommand(message);
        if(systemMessage){
            $('#messages').append(divSystemContentElement(systemMessage));
        }
    } else {
        chatApp.sendMessage($('#room').text(), message);
        $('#messages').append(divEscapedContentElement(message)); // 
        $('#messages').scrollTop($('#messages').prop('scrollHeight')); //聊天历史信息滚动至底部
    }
    $('#send-message').val(''); // 清空发送栏
}

// 用于净化文本信息的辅助函数
function divEscapedContentElement(message){
    return $('<div></div>').text(message);
}

function divSystemContentElement(message){
    return $('<div></div>').html('<i>'+message+'</i>');
}

// 客户端SocketIO初始化
var socket = io.connect();

$(document).ready(function(result){
    var chatApp = new Chat(socket);

    socket.on('nameResult', function(result){
        var message;
        if(result.success){
            message = 'You are now known as ' + result.name + '.';
        } else {
            message = result.message;
        }
        $('#messages').append(divSystemContentElement(message));
    });

    socket.on('joinResult', function(result){
        $('#room').text(result.room);
        $('#messages').append(divSystemContentElement('Room Changed.'));
    });

    socket.on('message', function(result){
        $('#room').text(result.room);
        $('#messages').append(newElement);
    });

    socket.on('rooms', function(result){
        $('room-list').empty();
        
        for(var room in rooms) {
            room = room.substring(1, room.length);
            if (room != '') {
              $('#room-list').append(divEscapedContentElement(room));
            }
        }

        $('#room-list div').click(function(){
            chatApp.processCommand('/join' + $(this).text());
            $('#send-message').focus();
        });
    });

    setInterval(function(){
        socket.emit('rooms');
    },1000);

    $('#send-message').focus();

    $('#send-form').submit(function(){
        processUserInput(chatApp, socket);
        return false;
    })
});

