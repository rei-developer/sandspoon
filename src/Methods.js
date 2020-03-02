const { TeamType } = require('./util/const')
const pix = require('./util/pix')
const Serialize = require('./protocol/Serialize')

class DefaultMethod {
    constructor(args = {}) { }

    doing(self, item) { }
}

class FireMethod {
    constructor(args = {}) { }

    doing(self, item) {
        if (self.game.team === TeamType.RED)
            return
        const room = Room.get(self.roomId)
        for (const red of room.mode.redTeam) {
            if (red.place === self.place) {
                const range = Math.abs(red.x - self.x) + Math.abs(red.y - self.y)
                if (range <= 2) {
                    if (red.game.hp < 0) {
                        room.mode.moveToKickOut(red)
                        red.game.hp = 100
                        ++room.mode.score.blue
                        ++self.score.kill
                        ++red.score.death
                        red.send(Serialize.InformMessage('<color=red>사망했습니다.</color>'))
                        self.send(Serialize.InformMessage('<color=red>' + red.name + ' 소탕 완료!</color>'))
                        self.publish(Serialize.NoticeMessage(red.name + (pix.maker(red.name) ? '가' : '이') + ' 소탕되다.'))
                        self.publish(Serialize.PlaySound('A3'))
                        self.publish(Serialize.UpdateModeCount(room.mode.score.red, room.mode.score.blue))
                    } else {
                        red.game.hp -= parseInt(Math.random() * 75) + 25
                        self.publishToMap(Serialize.SetAnimation(red, 'Fire', 'Fire'))
                    }
                }
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