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
        this.users.forEach(user =>  list.push(user.curp));

        return list;
    }

    getUserByID(id) {
        return this.users.filter((user) => user.id === id)[0];
    }

    getUserByCURP(curp) {
        return this.users.filter((user) => user.curp === curp)[0];
    }

    removeUser(curp) {
        //let user = this.getUser(id);
        let user = this.getUserByCURP(curp);

        if(user){
            this.users = this.users.filter((user) => user.curp  !== curp);
        }

        return user;
    }

}

var users = new Users();

io.sockets.on('connection', function(socket) {
    /*
    socket.on('new user', function (data , callback) {
        if (data in numeroControl){
            callback(false);
        } else {
            callback(true);
            socket.user = data;
            numeroControl[socket.user] = socket;
            updateUsers();
        }
    });
    socket.on('join', (userID , callback) => {
        console.log('llego');
        socket.join(userID);
        users.removeUser(socket.id);
        users.addUser(socket.id, userID);
        console.log(users.getUserList());
        callback();
    });
    socket.on('message', function(msg){
        let user = users.getUser(socket.id);

        if(user){
            io.sockets.to(user.numeroControl).emit('message', msg);
        }
    });
    */

    socket.on('join', (userID, callback) => {
        //console.log('Usuarios conectados');
        users.removeUser(userID.curp);
        socket.join(userID.sala);
        users.addUser(socket.id, userID.curp, userID.sala);
        //console.log(users.getUserList());
        callback();
    });

    socket.on('joinAgent', () => {uninstall
        console.log(users.getUserList());
    });

    socket.on('message', function (msg) {
        let user = users.getUserByID(socket.id);

        if (user) {
            io.sockets.to(user.sala).emit('message', msg);
        }
    });

    socket.on('my response', function(msg){
        console.log(msg);
        socket.emit('hola','Hola Agente, soy el socket');
    });

    function updateUsers() {
        io.sockets.emit('users', Object.keys(curp))
    }

    socket.on('disconnect', function (data) {
        if(!socket.user) return;
        delete numeroControl[socket.user];
        updateUsers()
    })
});

server.listen(3000, function(){
    console.log('Servidor de sockets activo');
});

function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
}
