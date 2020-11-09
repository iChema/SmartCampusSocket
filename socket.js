const { MongoClient } = require("mongodb");

const dotenv = require('dotenv');
dotenv.config();
const uri = process.env.URI;
var http = require('http');
const { get } = require("https");
const { type } = require("os");
var server = http.createServer();
var io = require('socket.io').listen(server);
var databaseName = process.env.DATABASE_NAME;
var users = [];
var agents = [];

// A class that describes the attributes 
// that each socket user has
class User {
    constructor(socketId,id,type) {
        this.socketId = socketId;
        this.id = id;
        this.type = type;
    }
}


// Functions to manage the list of users and agents
function addUser(socketId, id, type) {
    let user = new User(socketId,id,type);
    this.users.push(user);
    return user;
}

function addAgent(socketId, id, type) {
    let agent = new User(socketId,id,type);
    this.agents.push(agent);
    return agent;
}

function getUserBySocketId(id) {
    return this.users.filter((user) => user.socketId === id)[0];
}

function getAgentBySocketId(id) {
    return this.agents.filter((user) => user.socketId === id)[0];
}

function getUserById(id) {
    return this.users.filter((user) => user.id === id)[0];
}

function getAgentById(id) {
    return this.agents.filter((user) => user.id === id)[0];
}

function removeUser(id) {
    let user = getUserById(id);

    if (user) {
        this.users = this.users.filter((user) => user.id !== id);
    }

    return user;
}

function removeAgent(id) {
    let user = getAgentById(id);

    if (user) {
        this.agents = this.agents.filter((user) => user.id !== id);
    }

    return user;
}

io.sockets.on('connection', function (socket) {    

    // When human user join to the socket service
    socket.on('join', (user) => {
        removeUser(user.id);
        socket.join(user.type);
        addUser(socket.id, user.id, user.type);
        getAgentsOnlineDB(socket.id);
    });

    // Update the position of the user's match with an agent
    socket.on('here',(macAddressAgent)=> {
        try{
            agentId = getIdFromMac(macAddressAgent);
            user = getUserBySocketId(socket.id);
            updateUserPosition(agentId,user.id);
        } catch (e) {}
    });

    // When agent user join to the socket service
    socket.on('joinAgent', (agentId) => {
        removeAgent(agentId);
        addAgent(socket.id, agentId, 0);
        setAgentOnline(agentId,true);
    });

    // Get the list of the agents online
    socket.on('getAgentsOnline', ()=>{
        getAgentsOnlineDB(socket.id);
    });

    // Send a broadcast message by the type
    socket.on('message', function (msg) {
        let user = getUserBySocketId(socket.id);

        if (user) {
            io.sockets.to(user.type).emit('message', msg);
        }
    });

    // Triggered when a user disconect
    socket.on('disconnect', () => {
        let user = getUserBySocketId(socket.id);

        if (user) {
            users.removeUser(user.id);
        } else {
            let agent = getAgentBySocketId(socket.id);

            if(agent) {
                agents.removeUser(agent.id);
                setAgentStatus(agent.id,false);
            }
        }
    })
});

//--------------------HELPERS-----------------------
// Change de Mac Address of the device for an identifier 
function getIdFromMac(mac){
    return int(mac.replace(':', ''), 16);
}

// Change de identifier of the agent for the mac address  
function getMacFromID(id) {
    return id.toString( 16 ).match( /.{1,2}/g ).reverse().join( ':' )
}

// Gets the identifications of the agent list
function getMacAddressList(agentsOnline) {
    let list = [];

    agentsOnline.forEach(agent => {
        id = agent['_id'];
        list.push(getMacFromID(id));
    });

    return list;
}

//-----------------DATABASE-------------------
// Gets the list of the agents online in database
async function getAgentsOnlineDB(id) {
    
    var client = new MongoClient(uri);

    await client.connect().then((client)=> {
        const database = client.db(databaseName);
        const collection = database.collection("agent");
    
        // Query for a agents that has the status 'online'
        const query = { status : "online" };
     
        const options = {};
    
        collection.find(query, options).toArray(function(err, result) {
            if (err) throw err;
            io.sockets.to(id).emit('setAgentOnline', getMacAddressList(result));
            client.close();
          });
    }).catch((e)=>{
        console.log(e);
    });
}

// Update agent status in database when connecting or disconnecting
async function setAgentStatus(agentId,bool) {
    var client = new MongoClient(uri);
    let status =  (bool) ? 'online' : 'offline'

    await client.connect().then((client)=> {
        const database = client.db(databaseName);
        const collection = database.collection("agent");
    
        // Query for a agents that has the status 'online'
        const query = { _id : agentId };
     
        const options = {};
    
        collection.updateOne(query, { 'status' : status } ,options).toArray(function(err, result) {
            if (err) throw err;
            client.close();
          });
    }).catch((e)=>{
        console.log(e);
    });
}

// Update agent status in database when connecting or disconnecting
async function updateUserPosition(agentId,userId){
    var client = new MongoClient(uri);

    await client.connect().then((client)=> {
        const database = client.db(databaseName);
        const collection = database.collection("position_user");
    
        collection.insertOne({
            'agent': agentId,
            'user' : userId,
            'updatedAt' : new Date() 
        },()=>{
            client.close();
        })
    }).catch((e)=>{
        console.log(e);
    });
}

// Begin the socket service
server.listen(process.env.PORT, function(){
    console.log('Servidor de sockets activo');
});