var http = require('http');
var server = http.createServer();
var io = require('socket.io').listen(server);
var curp = {};

class Users {
    constructor() {
        this.users = [];
    }

    addUser(id, curp, sala) {
        let user = { id, curp, sala };
        this.users.push(user);
        return user;
    }

    getUserList() {
        let list = [];
        this.users.forEach(user => list.push(user.curp));

        return list;
    }

    getUser(id) {
        return this.users.filter((user) => user.id === id)[0];
    }

    getUser2(curp) {
        return this.users.filter((user) => user.curp === curp)[0];
    }

    removeUser(curp) {
        let user = this.getUser2(curp);

        if (user) {
            this.users = this.users.filter((user) => user.curp !== curp);
        }

        return user;
    }

}

var users = new Users();

io.sockets.on('connection', function (socket) {
    //console.log('New User');
    socket.on('join', (userID, callback) => {
        console.log('Usuarios conectados');
        users.removeUser(userID.curp);
        socket.join(userID.sala);
        users.addUser(socket.id, userID.curp, userID.sala);
        console.log(users.getUserList());
        callback();
    });

    socket.on('joinAgent', () => {
        console.log(users.getUserList());
    });

    socket.on('message', function (msg) {
        let user = users.getUser(socket.id);

        if (user) {
            io.sockets.to(user.sala).emit('message', msg);
        }
    });

    function updateUsers() {
        io.sockets.emit('users', Object.keys(curp))
    }

    socket.on('disconnect', () => {
        let user = users.getUser(socket.id);

        if (user) {
            users.removeUser(user.curp);
            console.log('Socket disconnected: ' + user.curp);
            console.log('Usuarios conectados');
            console.log(users.getUserList());
        }
        updateUsers();
    })
});

server.listen(3000, function(){
    console.log('Servidor de sockets activo');
});

function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
}