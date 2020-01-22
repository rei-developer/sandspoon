const Serialize = require('./protocol/Serialize')
const { ModeType, MapType } = require('./const')
const RescueMode = require('./RescueMode')
const InfectMode = require('./InfectMode')
const Event = require('./Event')

module.exports = class GameMode {
    constructor(roomId) {
        this.roomId = roomId
        this.map = MapType.TATAMI //MapType.ASYLUM + parseInt(Math.random() * MapType.DESERT)
        this.count = 0
        this.type = 0
        this.room = Room.get(this.roomId)

        const range = 6
        const objects = require('../Assets/Mods/Eve000.json')[3]
        for (const object of objects) {
            const range = 3
            for (let i = 0; i < 10; i++) {
                const event = new Event(this.roomId, object)
                const x = Math.floor(-range + Math.random() * (range * 2 + 1))
                const y = Math.floor(-range + Math.random() * (range * 2 + 1))
                event.place = 42
                event.x = 9 + x
                event.y = 7 + y
                this.room.addEvent(event)
                this.room.publishToMap(event.place, Serialize.CreateGameObject(event))
            }
        }
    }

    moveToBase(self) {
        switch (this.map) {
            case MapType.ASYLUM:
                self.teleport(2, 8, 13)
                break
            case MapType.TATAMI:
                self.teleport(42, 9, 7)
                break
            case MapType.GON:
                self.teleport(60, 16, 11)
                break
            case MapType.LABORATORY:
                self.teleport(99, 10, 8)
                break
            case MapType.SCHOOL:
                self.teleport(149, 14, 8)
                break
            case MapType.MINE:
                self.teleport(154, 9, 8)
                break
            case MapType.ISLAND:
                self.teleport(199, 10, 8)
                break
            case MapType.MANSION:
                self.teleport(215, 10, 9)
                break
            case MapType.DESERT:
                self.teleport(249, 7, 17)
                break
        }
    }

    join(self) {
        self.game = {}
        self.setGraphics(self.blueGraphics)
        this.moveToBase(self)
    }

    leave(self) {
        self.game = {}
        self.setGraphics(self.blueGraphics)
    }

    drawAkari(self) {
        self.send(Serialize.SwitchLight(this.room.places[self.place].akari))
    }

    drawEvents(self) {
        const { events } = this.room.places[self.place]
        for (const event of events) {
            self.send(Serialize.CreateGameObject(event))
        }
    }

    drawUsers(self) {
        const sameMapUsers = this.room.sameMapUsers(self.place)
        for (const user of sameMapUsers) {
            if (self === user) continue
            user.send(Serialize.CreateGameObject(self))
            self.send(Serialize.CreateGameObject(user))
        }
    }

    attack(self, target) {
        return true
    }

    doAction(self, event) {
        event.doAction(self)
        return true
    }

    update() {
        if (this.room.users.length >= 4) {
            const mode = ModeType.RESCUE + parseInt(Math.random() * ModeType.INFECT)
            switch (mode) {
                case ModeType.RESCUE:
                    this.room.changeMode(RescueMode)
                    break
                case ModeType.INFECT:
                    this.room.changeMode(InfectMode)
                    break
            }
            return
        } else {
            if (this.count % 100 === 0) {
                this.room.publish(Serialize.NoticeMessage('4명부터 시작합니다. (' + this.room.users.length + '/' + this.room.max + '명)'))
            }
        }
        if (++this.count === 10000) this.count = 0
    }
}