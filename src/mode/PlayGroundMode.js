const Serialize = require('../protocol/Serialize')
const Event = require('../Event')

module.exports = class PlayGroundMode {
    constructor(roomId) {
        this.roomId = roomId
        this.count = 20
        this.maxCount = this.count
        this.tick = 0
        this.type = 3
        this.room = Room.get(this.roomId)
        const objects = require('../../Assets/Mods/Mod' + ('' + 0).padStart(3, '0') + '.json')[1]
        for (const object of objects) {
            const event = new Event(this.roomId, object)
            this.room.addEvent(event)
        }
    }

    moveToPlaza(self) {
        self.teleport(79, 30, 62)
    }

    join(self) {
        self.game = {}
        self.setGraphics(self.blueGraphics)
        self.teleport(79, 30, 62)
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
        for (const event of events)
            self.send(Serialize.CreateGameObject(event))
    }

    drawUsers(self) {
        const sameMapUsers = this.room.sameMapUsers(self.place)
        for (const user of sameMapUsers) {
            if (self === user)
                continue
            user.send(Serialize.CreateGameObject(self))
            self.send(Serialize.CreateGameObject(user))
        }
    }

    attack(self, target) {
        return true
    }

    doAction(self, target) {
        target.doAction(self)
        return true
    }

    spawnRabbit() {
        const range = 3
        const objects = require('../../Assets/Mods/Eve000.json')[2]
        for (const object of objects) {
            for (let i = 0; i < 10; i++) {
                const event = new Event(this.roomId, object)
                const x = Math.floor(-range + Math.random() * (range * 2 + 1))
                const y = Math.floor(-range + Math.random() * (range * 2 + 1))
                event.place = 79
                event.x = 30 + x
                event.y = 62 + y
                this.room.addEvent(event)
                this.room.publishToMap(event.place, Serialize.CreateGameObject(event))
            }
        }
        this.room.publish(Serialize.NoticeMessage('토깽이를 잡고 실력을 키우자! (아침 9시 ~ 자정)'))
        this.room.publish(Serialize.PlaySound('Bikkuri'))
    }

    update() {
        if (++this.tick % 10 === 0) {
            this.tick = 0
            const date = new Date()
            const hour = date.getHours()
            const minute = date.getMinutes()
            const second = date.getSeconds()
            if (hour >= 9 || hour === 0) {
                if (hour >= 9 && minute % 5 === 0 && second === 0 && this.count >= this.maxCount)
                    this.spawnRabbit()
                if (--this.count === 0)
                    this.count = this.maxCount
            }
        }
    }
}