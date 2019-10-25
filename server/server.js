const express = require("express");
const app = express();
// server.listen(process.env.PORT || 3000);
const server = app
  .use((req, res) => res.sendFile(INDEX))
  .listen(process.env.PORT || 3001, () => {
    console.log("server running on port 3001");
  });

const io = require("socket.io")(server);
let connections = [];
let connectedNames = [];
let rooms = [];
let roomsState = [];
let roomNumb = 10;

io.on("connection", function(socket) {
  connections.push(socket.id);
  console.log("Подключения:");
  console.log(connections);

  socket.on("setName", name => {
    socket.name = name;
    let oldNote = connectedNames.find(element => element.id === socket.id);
    if (oldNote === undefined) {
      let person = {
        name,
        id: socket.id,
        roomId: -1
      };
      connectedNames.push(person);
    } else {
      oldNote.name = name;
      console.log(name + " изменено!");
    }
    console.log(connectedNames);
  });
  socket.on("newMessage", message => {
    socket.broadcast.to(socket.roomId).emit("addMessage", {
      name: socket.name,
      text: `${message}`
    });
  });
  socket.on("setRoom", roomId => {
    // СДЕЛАТЬ ПРОВЕРКУ НА СУЩЕСТВОВАНИЕ КОМНАТЫ
    let oldNote = connectedNames.find(element => element.id === socket.id);
    if (oldNote !== undefined) {
      oldNote.roomId = roomId;
      socket.join(roomId, () => {
        console.log(`Подключено к комнате #${roomId}`);
        console.log("Подключенные имена:");
        console.log(connectedNames);
        socket.roomId = roomId;
        socket.emit("setRoomNumber", roomId);
        socket.to(roomId).broadcast.emit("addMessage", {
          name: "Admin",
          text: `Игрок ${oldNote.name} подключён к комнате ${roomId}!`
        });
        socket.emit("addMessage", {
          name: "Admin",
          text: `Игрок ${oldNote.name} подключён к комнате ${roomId}!`
        });
      });
    }
  });

  socket.on("createRoom", () => {
    let oldNote = connectedNames.find(element => element.id === socket.id);
    if (oldNote !== undefined) {
      oldNote.roomId = roomNumb;
      console.log("Подключенные имена:");
      console.log(connectedNames);
      socket.roomId = roomNumb;
      socket.join(roomNumb, () => {
        // console.log(oldNote.roomId);
        console.log(`Создана комната #${roomNumb}`);
        socket.emit("setRoomNumber", roomNumb);
        roomNumb++;
      });
      // СОЗДАТЬ ОБЩИЙ СТЕЙТ КОМНАТЫ
    }
  });

  socket.on("startGame", obj => {
    let roomState = {};
    roomState.roomId = socket.roomId;
    roomState.roomState = obj;
    if (io.sockets.adapter.rooms[socket.roomId] !== undefined) {
      console.log("Комнаты:");
      console.log(io.sockets.adapter.rooms[socket.roomId].sockets);
      let gamerIds = Object.keys(
        io.sockets.adapter.rooms[socket.roomId].sockets
      );
      let gamers = [];
      for (const iterator of gamerIds) {
        console.log(iterator + "---");
        let gamerObj = {
          id: iterator,
          data: obj
        };
        gamers.push(gamerObj);
      }
      roomState.gamers = gamers;
      // в цикле создать объект данных каждого игрока
      roomsState.push(roomState);
    }

    console.log("Стейт комнат: ");
    console.log(roomsState);
    socket.to(socket.roomId).broadcast.emit("setStartGame", obj);
  });

  socket.on("typing", function() {
    socket.to(socket.roomId).broadcast.emit("addMessage");
  });

  socket.on("leaveRoom", function() {
    console.log(`${socket.name} уходит с комнаты!`);
    let oldNote = connectedNames.find(element => element.id === socket.id);
    if (oldNote !== undefined) {
      oldNote.roomId = -1;
      socket.emit("setRoomNumber", -1);
    }
    console.log("Подключенные имена:");
    console.log(connectedNames);
  });
  socket.on("disconnect", function() {
    connections.splice(connections.indexOf(socket.id), 1);
    let oldNote = connectedNames.findIndex(element => element.id === socket.id);
    if (oldNote !== -1) {
      // console.log();
      if (connectedNames[oldNote].roomId !== -1) {
        socket.to(socket.roomId).broadcast.emit("addMessage", {
          name: "Admin",
          text: `Игрок ${connectedNames[oldNote].name} вышел с сервера!`
        });
      }
    }
    connectedNames.splice(oldNote, 1);
    console.log("Подключения:");
    console.log(connections);
    console.log("Подключенные имена:");
    console.log(connectedNames);
  });
});
