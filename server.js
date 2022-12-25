const MongoClient = require("mongodb").MongoClient;
const url = "mongodb://127.0.0.1:27017/";
const mongoClient = new MongoClient(url);
const client = require("socket.io").listen(4000).sockets;

// Connect to mongo
let db;
async function connectMongo() {
  try {
    await mongoClient.connect();
    // обращаемся к базе данных chats
    db = mongoClient.db("chats");
    console.log("Подключение Mongodb установлено");
  } catch (err) {
    console.log("Возникла ошибка");
    console.log(err);
  }
}

connectMongo().catch(console.error);

// Connect to Socket.io
client.on("connection", async (socket) => {
  let chat = await db.collection("chats");

  // Create function to send status
  sendStatus = function (s) {
    socket.emit("status", s);
  };

  // Get chats from mongo collection
  let msgs = await chat.find().limit(100).sort({ _id: 1 }).toArray();
  // Emit the messages
  socket.emit("output", msgs);
  // Handle input events
  socket.on("input", function (data) {
    let name = data.name;
    let message = data.message;

    // Check for name and message
    if (name == "" || message == "") {
      // Send error status
      sendStatus("Введите имя и сообщение");
    } else {
      // Insert message
      chat.insertOne({ name: name, message: message }, () => {
        client.emit("output", [data]);
        // Send status object
        sendStatus({
          message: "Message sent",
          clear: true,
        });
      });
    }
  });
  // Handle clear
  socket.on("clear", async (data) => {
    if (data.name && data.clear) {
      let res = await chat.deleteMany({ name: data.name });
      if (res) {
        socket.emit("cleared");
      }
    }
  });
  //
  socket.on("refresh", async () => {
    let msgs = await chat.find().limit(100).sort({ _id: 1 }).toArray();
    // Emit the messages
    socket.emit("output", msgs);
  });
  // показать свои сообщения
  socket.on("getMyMsgs", async (data) => {
    let name = data.name;
    if (name) {
      let msgs = await chat.find({name: name}).limit(100).sort({ _id: 1 }).toArray();
      socket.emit("output", msgs);
    }
  });
});
