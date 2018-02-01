var socketio = require('socket.io');
// 定义聊天状态值
var io;
var guestNumber = 1;
var nickNames = {};
var namesUsed = [];
var currentRoom = {};

// 分配昵称
function assignGuestName(socket,guestNumber,nickNames,namesUsed){
    var name = 'Guest' + guestNumber; // 自动生成昵称
    nickNames[socket.id]=name; // 关联昵称和socket连接
    socket.emit('nameResult', { // 让新用户知道自己的昵称
        success:true,
        name:name
    });
    namesUsed.push(name); // 存放被占用的昵称
    return guestNumber + 1;
}

// 进入聊天室
function joinRoom(socket,room){
    socket.join(room);
    currentRoom[socketio.id] = room;
    socket.emit('joinResult', {room:room});
    socket.broadcast.to(room).emit('message',
        {text:nickNames[socket.id]+'has joined'+room+'.'}
    );

    // clients -> client
    var usersInRoom = io.sockets.clients(room);
    if(usersInRoom.length > 1) {
        var usersInRoomSummary = 'Users currently in '+ room + ': ';
        for(var index in usersInRoom) {
            var userSocketId = usersInRoom[index].id;
            if(index>0){
                usersInRoomSummary += '. ';
            }
            usersInRoomSummary += nickNames[userSocketId];
        }
    }
    usersInRoomSummary += '.';
    socket.emit('message',{ text:usersInRoomSummary });
}

// 变更昵称
function handleNameChangeAttempts(socket,nickNames,namesUsed){
    socket.on('nameAttempt', function (data) {
        var name = data.nick;
        if (name.indexOf('Guest') == 0) {
            socketio.emit('nameResult', {
                success: false,
                message: 'Name cannot begin with "Guest".'
            });
        } else {
            if (namesUsed.indexOf('name') == -1) {
                var previousName = nickNames[socket.id];
                var previousNameIndex = namesUsed.indexOf(previousName);
                namesUsed.push(name);
                nickNames[socket.id] = name;
                delete namesUsed[previousNameIndex];

                socket.emit('nameResult', {
                    success: true,
                    name: name
                });
                socket.broadcast.to(currentRoom[socket.id]).emit('message', {
                    text: previousName + ' is now known as ' + name + '.'
                });
            } else {
                socket.emit('message', {
                    success: false,
                    message: 'That name is already in use.'
                })
            }
        }
    });
}

// 发送聊天消息
function handleMessageBroadcasting(socket){
    socket.on('message', function(message){
        socket.broadcast.to(message.room).emit('message',{
            text:nickNames[socket.id] + ': ' + message.text
        });
    });
}

// 创建房间
function handleRoomJoining(socket){
    socket.on('join', function(room){
        socket.leave(currentRoom[socket.id]);
        joinRoom(socket, room.newRoom);
    })
}

// 退出聊天，移除昵称和昵称记录
function handleClientDisconnection(socket){
    socket.on('disconnect',function(){
        var nameIndex = namesUsed.indexOf(nickNames[socket.id]);
        delete namesUsed[nameIndex];
        delete nickNames[socket.id];
        console.log('disconnect... ');
    });
}

exports.listen = function(server){
    io = socketio.listen(server);
    io.set('log level', 1);

    io.sockets.on("connection", function(socket){
        guestNumber = assignGuestName(socket,guestNumber,nickNames,namesUsed);  //给连接的用户分发访客名
        joinRoom(socket, '萌新报到');  // 把连接上的用户放入聊天室Lobby里
        handleMessageBroadcasting(socket, nickNames);   // 处理用户消息
        handleNameChangeAttempts(socket, nickNames, namesUsed); // 变更昵称
        handleRoomJoining(socket); // 创建/加入聊天室
        socket.on('rooms',function(){
            // 提供聊天室列表
            socket.emit('rooms', io.sockets.manager.rooms);
        });
        handleClientDisconnection(socket, nickNames, namesUsed); // 用户退出聊天室后的清除逻辑
    });
}