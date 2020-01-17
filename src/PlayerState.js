const Serialize = require('./protocol/Serialize')

const Basic = class PlayerBasicState {
    static turn (self, x, y) {
        if (!self.roomId) return
        self.dirty = true
        self.direction.x = x
        self.direction.y = y
    }

    static move (self, x, y) {
        if (!self.roomId) return
        self.dirty = true
        const room = Room.get(self.roomId)
        self.direction.x = x
        self.direction.y = -y
        const direction = self.getDirection(x, -y)
        if (room.isPassable(self.place, self.x, self.y, direction, false) && room.isPassable(self.place, self.x + x, self.y + y, 10 - direction, true)) {
            self.x += x
            self.y += y
            room.portal(self)
        } else {
            self.teleport(self.place, self.x, self.y)
            self.timestamp = 0
        }
    }
}

const Tansu = class PlayerTansuState {
    static turn (self, x, y) {

    }
    static move (self, x, y) {

    }
}

module.exports = {
    Basic,
    Tansu
}