const Serialize = require('./protocol/Serialize')
const RescueMode = require('./mode/RescueMode')
const InfectMode = require('./mode/InfectMode')
const HideMode = require('./mode/HideMode')
const EscapeMode = require('./mode/EscapeMode')
const DeathMatchMode = require('./mode/DeathMatchMode')

module.exports = class GameMode {
    constructor(roomId) {
        this.roomId = roomId
        this.count = 0
        this.type = 0
        this.room = Room.get(this.roomId)
    }

    moveToBase(self) {
        self.teleport(42, 9, 7)
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

    useItem(self) { }

    doAction(self, event) {
        event.doAction(self)
        return true
    }

    update() {
        if (this.room.users.length >= 4) {
            const modes = [
                RescueMode,
                InfectMode,
                HideMode,
                EscapeMode,
                
            ]
            const i = Math.floor(Math.random() * modes.length)
            return this.room.changeMode(modes[i])
        } else {
            if (this.count % 100 === 0)
                this.room.publish(Serialize.NoticeMessage('4명부터 시작합니다. (' + this.room.users.length + '/' + this.room.max + '명)'))
        }
        if (++this.count === 10000)
            this.count = 0
    }
}
