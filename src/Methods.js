const { StatusType } = require('./util/const')
const pix = require('./util/pix')
const Serialize = require('./protocol/Serialize')

class DefaultMethod {
    constructor(args = {}) { }

    doing(self, item) { }
}

class FireMethod {
    constructor(args = {}) { }

    doing(self, item) {
        const room = Room.get(self.roomId)
        for (const red of room.mode.redTeam) {
            if (red.place === self.place) {
                const range = Math.abs(red.x - self.x) + Math.abs(red.y - self.y)
                if (range > 1)
                    continue
                if (red.game.hp < 0) {
                    mode.moveToKickOut(red)
                    red.game.hp = 100
                    ++self.score.kill
                    ++red.score.death
                    red.send(Serialize.InformMessage('<color=red>사망했습니다.</color>'))
                    self.publish(Serialize.UpdateModeCount(mode.score.red, mode.score.blue))
                } else {
                    red.game.hp -= 30
                    self.publishToMap(Serialize.SetAnimation(red, 'Fire', 'Fire'))
                }
                const inventory = self.game.inventory.filter(i => i.id === item.id)
                if (!inventory)
                    return
                self.send(Serialize.UpdateGameItem(item.icon, --inventory.num))
                if (inventory.num < 1)
                    self.send(Serialize.RemoveGameItem())
            }
        }
    }
}

module.exports = new Proxy({
    Fire: FireMethod,
}, {
    get: function (target, name) {
        return target.hasOwnProperty(name) ? target[name] : DefaultMethod
    }
})