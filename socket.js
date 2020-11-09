const { MongoClient } = require("mongodb");

const dotenv = require('dotenv');
dotenv.config();
const uri = process.env.URI;
var http = require('http');
const { get } = require("https");
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
var agents = new Users();

io.sockets.on('connection', function (socket) {    
    //console.log('New User');
    socket.on('join', (userID, callback) => {
        console.log('Usuarios conectados');
        users.removeUser(userID.curp);
        socket.join(userID.sala);
        users.addUser(socket.id, userID.curp, userID.sala);
        console.log(users.getUserList());
        getAgentsOnlineDB(socket.id);
        callback();
    });

    socket.on('joinAgent', (userID) => {
        console.log('Agentes conectados');
        agents.removeUser(userID.curp);
        socket.join(userID.sala);
        agents.addUser(socket.id, userID.curp, userID.sala);
        console.log(agents.getUserList());
        getAgentsOnlineDB(socket.id);
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
        getAgentsOnlineDB(socket.id);
    });

    socket.on('disconnect', () => {
        let user = users.getUser(socket.id);

        if (user) {
            users.removeUser(user.curp);
            console.log('Socket disconnected: ' + user.curp);
            console.log('Usuarios conectados');
            console.log(users.getUserList());
        } else {
            let agent = agents.getUser(socket.id);
            if(agent) {
                agents.removeUser(agent.curp);
                console.log('Agente disconnected: ' + agent.curp);
                console.log('Agentes conectados');
                console.log(agents.getUserList());
            }
        }
    })
});

server.listen(process.env.PORT, function(){
    console.log('Servidor de sockets activo');

    testDB();
    //getAgentsOnlineDB();
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

async function getAgentsOnlineDB(id) {
    
    var client = new MongoClient(uri);

    await client.connect().then((client)=> {
        const database = client.db(databaseName);
        const collection = database.collection("agent");
    
        // Query for a movie that has the title 'The Room'
        const query = { status : "online" };
     
        const options = {};
    
        collection.find(query, options).toArray(function(err, result) {
            if (err) throw err;
            console.log(result);
            console.log(getMacAddressList(result));
            io.sockets.to(id).emit('setAgentOnline', getMacAddressList(result));
            client.close();
          });
    }).catch((e)=>{
        console.log(e);
    });

    
}

async function testDB() {
    try {
        var client = new MongoClient(uri);

        await client.connect();

        const database = client.db("smart_campus");
        const collection = database.collection("agent");
    
        // Query for a movie that has the title 'The Room'
        const query = {status : "online"};
    
        const options = {};
    
        const agent = await collection.find(query, options).toArray()
        .then(agentsOnline => {
            console.log(getMacAddressList(agentsOnline));
        });
    
    } finally {
        await client.close();
    }
}