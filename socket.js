const { MongoClient } = require("mongodb");

const dotenv = require('dotenv');
dotenv.config();
const uri = process.env.URI;
const client = new MongoClient(uri);
var http = require('http');
var server = http.createServer();
var io = require('socket.io').listen(server);
var databaseName = process.env.DATABASE_NAME
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

    socket.on('getAgentsOnline', ()=>{
        getAgentsOnlineDB();
    });

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

server.listen(process.env.PORT, function(){
    console.log('Servidor de sockets activo');

    getAgentsOnlineDB();
});

function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
}

function getMacAddressList(agentsOnline) {
    list = [];

    agentsOnline.forEach(agentx => {
        mac = agentx['_id'];
        list.push(mac.toString( 16 ).match( /.{1,2}/g ).reverse().join( ':' ) );
    });

    return list;
}

async function getAgentsOnlineDB() {
    try {
        await client.connect();

        const database = client.db(databaseName);
        const collection = database.collection("agent");
    
        // Query for a movie that has the title 'The Room'
        const query = { status : "online" };
     
        const options = {};
    
        const agents = await collection.find(query, options)
        .toArray()
        .then(agentsOnline => {
            //return agentsOnline
            io.sockets.emit('setAgentOnline', getMacAddressList(agentsOnline));
            console.log(getMacAddressList(agentsOnline));
        });
    } catch(e) {
        console.log(e);
        await client.close();
    }finally {
        await client.close();
    }
}

async function testDB() {
    try {
        await client.connect();

        const database = client.db("smart_campus");
        const collection = database.collection("agents");
    
        // Query for a movie that has the title 'The Room'
        const query = { id: 1 };
    
        const options = {};
    
        const agent = await collection.findOne(query, options);
    
        // since this method returns the matched document, not a cursor, print it directly
        console.log(agent);
    } finally {
        await client.close();
    }
}