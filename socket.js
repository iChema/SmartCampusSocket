var mongoDb = require('mongodb');


const dotenv = require('dotenv');
dotenv.config();
const uri = process.env.URI;
const { get } = require("https");
const { type } = require("os");
var databaseName = process.env.DATABASE_NAME;
var users = [];
var agents = [];

/*

const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);

*/


const { createServer } = require("http");
const { Server } = require("socket.io");

const httpServer = createServer();
const io = new Server(httpServer, { /* options */ });

// A class that describes the attributes 
// that each socket user has
class User {
    constructor(socketId, id, type) {
        this.socketId = socketId;
        this.id = id;
        this.type = type;
    }
}

// Functions to manage the list of users and agents
function addUser(socketId, id, type) {
    let user = new User(socketId, id, type);
    users.push(user);
    return user;
}

function addAgent(socketId, id, type) {
    let agent = new User(socketId, id, type);
    agents.push(agent);
    return agent;
}

function getUserBySocketId(id) {
    return users.filter((user) => user.socketId === id)[0];
}

function getAgentBySocketId(id) {
    return agents.filter((user) => user.socketId === id)[0];
}

function getUserById(id) {
    return users.filter((user) => user.id === id)[0];
}

function getAgentById(id) {
    return agents.filter((user) => user.id === id)[0];
}

function removeUser(id) {
    let user = getUserById(id);

    if (user) {
        users = users.filter((user) => user.id !== id);
    }
    return user;
}

function removeAgent(id) {
    let user = getAgentById(id);

    if (user) {
        agents = agents.filter((user) => user.id !== id);
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
        getAgentsDB(socket.id)
        getUserLocationDB(socket.id)
        console.log("Users")
        console.log(users)
    });

    // Update the position of the user's match with an agent
    socket.on('here', (macAddressAgent) => {
        try {
            agentId = getIdFromMac(macAddressAgent);
            //console.log(agentId)
            user = getUserBySocketId(socket.id);
            updateUserPosition(agentId, user.id);
            getUserLocationDB(1)
        } catch (e) { }
    });

    // When agent user join to the socket service
    socket.on('joinAgent', (agentId) => {
        removeAgent(agentId);
        addAgent(socket.id, agentId, 0);
        setAgentStatus(agentId, true);
        getAgentsOnlineDB(1);
        getAgentsDB(1);
        console.log("Agents")
        console.log(agents)
    });

    // Get the list of the agents online
    /*
    socket.on('getAgentsOnline', () => {
        //getAgentsOnlineDB(socket.id);
    });

    socket.on('getAgents', () => {
        getAgentsDB(socket.id)
    });
    */

    // Send a broadcast message by the type
    socket.on('message', function (msg) {
        let user = getUserBySocketId(socket.id);
        if (user) {
            io.sockets.to(user.type).emit('message', msg);
        }
    });

    socket.on('getAgents', ()  => {
        getAgentsDB(1);
    });

    // Triggered when a user disconect
    socket.on('disconnect', () => {
        let user = getUserBySocketId(socket.id);

        if (user) {
            removeUser(user.id);
        } else {
            let agent = getAgentBySocketId(socket.id);

            if (agent) {
                removeAgent(agent.id);
                setAgentStatus(agent.id, false);
                getAgentsOnlineDB(1);
                getAgentsDB(1);
            }
        }
        console.log(users)
    })
});

//--------------------HELPERS-----------------------
// Change de Mac Address of the device for an identifier 
function getIdFromMac(mac) {
    return parseInt(mac.replaceAll(':', ''), 16);
}

// Change de identifier of the agent for the mac address  
function getMacFromID(id) {
    //id.toString(16).match(/.{1,2}/g).reverse().join(':').toUpperCase();
    return id.toString(16).match(/.{1,2}/g).join(':').toUpperCase();
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

    var client = mongoDb.MongoClient;

    await client.connect(uri, { useUnifiedTopology: true }).then((client) => {
        const database = client.db(databaseName);
        const collection = database.collection("agent");

        // Query for a agents that has the status 'online'
        const query = { status: "online" };

        const options = {};

        collection.find(query, options).toArray(function (err, result) {
            if (err) throw err;
            //console.log(result);
            io.sockets.to(id).emit('setAgentsOnline', getMacAddressList(result));
            client.close();
        });
    }).catch((e) => {
        console.log(e);
    });
}

// Gets the list of the agents in database
async function getAgentsDB(id) {

    var client = mongoDb.MongoClient;

    await client.connect(uri, { useUnifiedTopology: true }).then((client) => {
        const database = client.db(databaseName);
        const collection = database.collection("agent");

        // Query for a agents that has the status 'online'
        const query = {};

        const options = {};

        collection.find(query, options).toArray(function (err, result) {
            if (err) throw err;
            io.sockets.to(id).emit('setAgents', result);
            client.close();
        });
    }).catch((e) => {
        console.log(e);
    });
}

// Gets the list of the agents in database
async function getUserLocationDB(id) {

    var client = mongoDb.MongoClient;

    await client.connect(uri, { useUnifiedTopology: true }).then((client) => {
        const database = client.db(databaseName);
        const collection = database.collection("user_location_agent_data");

        // Query for a agents that has the status 'online'
        const query = {};

        const options = {};

        collection.find(query, options).toArray(function (err, result) {
            if (err) throw err;
            io.sockets.to(id).emit('setLocationUser', result);
            client.close();
        });
    }).catch((e) => {
        console.log(e);
    });
}

// Update agent status in database when connecting or disconnecting
async function setAgentStatus(agentId, bool) {
    var client = mongoDb.MongoClient;
    let status = (bool) ? 'online' : 'offline'

    await client.connect(uri, { useUnifiedTopology: true }).then((client) => {
        const database = client.db(databaseName);
        const collection = database.collection("agent");

        // Query for a agents that has the status 'online'
        const query = { _id: agentId };

        const options = { $set: { status: status } };

        collection.updateOne(query, options, function (err, result) {
            if (err) throw err;
            client.close();
        });
    }).catch((e) => {
        console.log(e);
    });
}

// Update agent status in database when connecting or disconnecting
async function updateUserPosition(agentId, userId) {

    var client = mongoDb.MongoClient;

    await client.connect(uri, { useUnifiedTopology: true }).then((client) => {
        const database = client.db(databaseName);
        const collection = database.collection("position_user");

        collection.insertOne({
            'agent': agentId,
            'user': userId,
            'updatedAt': new Date()
        }, () => {            
            client.close();
        })
    }).catch((e) => {
        console.log(e);
    });
}

// Begin the socket service
httpServer.listen(process.env.PORT, function () {
    console.log('Servidor de sockets activo', process.env.PORT);
});