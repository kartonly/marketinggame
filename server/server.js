const express = require('express');
const app = express();
// server.listen(process.env.PORT || 3000);
const server = app
  .use((req, res) => res.sendFile(INDEX))
  .listen(process.env.PORT || 3001, () => {
    console.log('server running on port 3001');
  });

const io = require('socket.io')(server);
let connections = [];
let connectedNames = [];
// let rooms = [];
let roomsState = [];
let roomNumb = 10;
let events = [{
    id: 1,
    title: 'Выход на рынок нового конкурента',
    description: 'снижение всех видов трафика на 30%'
  },
  {
    id: 2,
    title: 'Изменение алгоритма поисковой машины',
    description: 'падение трафика из органической выдачи в первый месяц после изменения на 50% восстановление трафика к 3-му месяцу на уровень первого месяца'
  },
  {
    id: 3,
    title: 'Изменение подрядчика по контекстной рекламе',
    description: 'увеличение реальной стоимости привлечения клиента на 5%, увеличение конверсии от контекстной рекламы на 30%'
  }, {
    id: 4,
    title: 'Ввод в эксплуатацию нового офисного здания рядом',
    description: 'Увеличение трафика от канала прямого захода в первый месяц после этого в 3 раза и после этого во второй месяц увеличение конверсии в клиента на 5%'
  },
  {
    id: 5,
    title: 'Появление серии негативных публикаций о компании и руководителе компании',
    description: 'Снижение конверсии трафика в звонки на 50%'
  }
];
let cards = [{
    id: 1,
    title: 'Нанять SMM-менеджера',
    text: 'Описание карточки, описание карточки',
    change: 'money',
    params: 100
  },
  {
    id: 2,
    title: 'Заказать SEO-оптимизацию',
    text: 'Описание карточки, описание карточки',
    change: 'money',
    params: 200
  },
  {
    id: 3,
    title: 'Улучшение юзабилити',
    text: 'Описание карточки, описание карточки',
    change: 'money',
    params: -300
  },
  {
    id: 4,
    title: 'Реклама в соцсетях',
    text: 'Описание карточки, описание карточки',
    change: 'money',
    params: -400
  },
  {
    id: 5,
    title: 'PR-компания компании',
    text: 'Описание карточки, описание карточки',
    change: 'money',
    params: 500
  }
];
io.on('connection', function (socket) {
  connections.push(socket.id);
  console.log('Подключения:');
  console.log(connections);

  socket.on('setName', name => {
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
      console.log(name + ' изменено!');
    }
    console.log(connectedNames);
  });
  socket.on('newMessage', message => {
    socket.broadcast.to(socket.roomId).emit('addMessage', {
      name: socket.name,
      text: `${message}`
    });
  });
  socket.on('setRoom', roomId => {
    // СДЕЛАТЬ ПРОВЕРКУ НА СУЩЕСТВОВАНИЕ КОМНАТЫ
    let oldNote = connectedNames.find(element => element.id === socket.id);
    if (oldNote !== undefined) {
      oldNote.roomId = roomId;
      socket.join(roomId, () => {
        console.log(`Подключено к комнате #${roomId}`);
        console.log('Подключенные имена:');
        console.log(connectedNames);
        socket.roomId = roomId;
        socket.emit('setRoomNumber', roomId);
        io.sockets.to(roomId).emit('addMessage', {
          name: 'Admin',
          text: `Игрок ${oldNote.name} подключён к комнате ${roomId}!`
        });
      });
    }
  });

  socket.on('createRoom', () => {
    let oldNote = connectedNames.find(element => element.id === socket.id);
    if (oldNote !== undefined) {
      oldNote.roomId = roomNumb;
      console.log('Подключенные имена:');
      console.log(connectedNames);
      socket.roomId = roomNumb;
      socket.join(roomNumb, () => {
        // console.log(oldNote.roomId);
        console.log(`Создана комната #${roomNumb}`);
        socket.emit('setRoomNumber', roomNumb);
        roomNumb++;
      });
      // СОЗДАТЬ ОБЩИЙ СТЕЙТ КОМНАТЫ
    }
  });

  socket.on('startGame', obj => {
    let roomState = {};

    roomState.roomId = socket.roomId;
    roomState.roomState = obj;
    let gamerNames = [];
    if (io.sockets.adapter.rooms[socket.roomId] !== undefined) {
      console.log('Комнаты:');
      console.log(io.sockets.adapter.rooms[socket.roomId].sockets);
      let gamerIds = Object.keys(
        io.sockets.adapter.rooms[socket.roomId].sockets
      );
      let gamers = [];
      let attackers = 0;
      for (const id of gamerIds) {
        gamerNames.push({
          name: connectedNames.find(el => el.id === id).name,
          id,
          isattacker: false
        })
        attackers++;
        console.log(id + '---');
        let gamerObj = {
          id,
          data: Object.assign({}, obj)
        };
        gamers.push(gamerObj);
      }
      roomState.constAttackers = attackers;
      roomState.attackers = attackers;
      roomState.gamers = gamers;
      roomsState.push(roomState);
    }

    console.log('Стейт комнат: ');
    console.log(roomsState);
    let gamerNamesObj = {
      gamers: gamerNames
    };
    io.sockets.to(socket.roomId).emit('setGamers', gamerNamesObj);
    socket.to(socket.roomId).broadcast.emit('setStartGame', obj);
  });

  // socket.on('typing', function () {
  //   socket.to(socket.roomId).broadcast.emit('addMessage');
  // });

  socket.on('doStep', function (cardId) {
    console.log('Сделан шаг "' + cards.find(el => el.id === cardId).title + '" игроком ' + socket.name)
    let card = cards.find(el => el.id === cardId);
    let room = roomsState.find(el => el.roomId === socket.roomId)
    let gamer = room.gamers.find(el => el.id === socket.id)
    gamer.data[card.change] = card.params + gamer.data[card.change]
    io.sockets.to(socket.roomId).emit('changeGamerStatus', socket.id)
    room.attackers--
    let gamers = roomsState.find(el => el.roomId === socket.roomId).gamers
    console.log('Игроки без хода: ' + room.attackers)
    if (room.attackers === 0) {
      setTimeout(() => {
        for (const gamer of gamers) {
          io.sockets.to(gamer.id).emit('setStartGame', gamer.data);
        }
        socket.emit('doNextStep')
        io.sockets.to(socket.roomId).emit('doNextStep')
        room.attackers = room.constAttackers
        room.roomState.month--
        if (room.roomState.month === 0) {
          let gamersRate = [];
          for (const gamer of gamers) {
            let position = {
              id: gamer.id,
              money: gamer.data.money
            }
            gamersRate.push(position)
          }
          gamersRate.sort((a, b) => {
            if (a.money > b.money) {
              return -1
            } else if (a.money < b.money) {
              return 1
            }
            return 0
          })
          console.log('Рейтинг игроков:');
          console.log(gamersRate)
          let winners = {}
          for (let index = 1; index < 4; index++) {
            let a = gamersRate.shift();
            if (typeof a !== 'undefined') {
              winners[index] = Object.assign(a);
              winners[index].name = connectedNames.find(el => el.id === a.id).name
            } else winners[index] = a;
            // console.log(gamersRate.shift());
            // console.log(winners[index]);
            // let gamer = Object.assign(winners[index])
            // winners[index].name = connectedNames.find(el => el.id === gamer.id).name
          }
          console.log(winners)
          io.sockets.to(room.roomId).emit('addMessage', {
            name: 'Admin',
            text: `Финито ля комедиа!`
          })

          io.sockets.to(room.roomId).emit('finish', winners)
        } else {
          if (Math.floor(Math.random() * 10) % 2 == 0) {
            let randomEvent = events[Math.floor(Math.random() * events.length)]
            console.log('Событие');
            console.log(randomEvent);
            socket.emit('gameEvent')
            io.sockets.to(room.roomId).emit('gameEvent', randomEvent)
          }
        }
      }, 2000);
    }
  })
  socket.on('leaveRoom', function () {
    console.log(`${socket.name} уходит с комнаты!`);
    let oldNote = connectedNames.find(element => element.id === socket.id);
    if (oldNote !== undefined) {
      oldNote.roomId = -1;
      socket.emit('setRoomNumber', -1);
    }
    console.log('Подключенные имена:');
    console.log(connectedNames);
  });
  socket.on('disconnect', function () {
    connections.splice(connections.indexOf(socket.id), 1);
    let oldNote = connectedNames.findIndex(element => element.id === socket.id);
    if (oldNote !== -1) {
      // console.log();
      if (connectedNames[oldNote].roomId !== -1) {
        io.sockets.to(socket.roomId).emit('addMessage', {
          name: 'Admin',
          text: `Игрок ${connectedNames[oldNote].name} вышел из игры!`
        });
      }
    }
    connectedNames.splice(oldNote, 1);
    console.log('Подключения:');
    console.log(connections);
    console.log('Подключенные имена:');
    console.log(connectedNames);
  });
});
