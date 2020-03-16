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
        if (self.game.camera)
            return
        const room = Room.get(self.roomId)
        if (room.mode.redTeam.length > 0) {
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
                            self.publish(Serialize.UpdateModeRedAndBlue(room.mode.score.red, room.mode.score.blue))
                        } else {
                            red.game.hp -= (parseInt(Math.random() * 20) + 80) - ((range - 1) * 60)
                            self.publishToMap(Serialize.SetAnimation(red, 'Fire', 'Fire'))
                        }
                    }
                }
            }
        }
        const { events } = room.places[self.place]
        if (events.length > 0) {
            for (const event of events) {
                if (event.graphics !== 'ao')
                    continue
                const range = Math.abs(event.x - self.x) + Math.abs(event.y - self.y)
                if (range <= 2) {
                    const r = parseInt(Math.random() * 1)
                    if (r === 0) {
                        ++room.mode.score.blue
                        ++self.game.kill
                        self.send(Serialize.InformMessage('<color=red>' + event.name + ' 소탕 완료!</color>'))
                        self.publish(Serialize.PlaySound('A3'))
                        self.publishToMap(Serialize.RemoveGameObject(event))
                        room.removeEvent(event)
                    } else {
                        event.setUpHp(-(parseInt(Math.random() * 20) + 80))
                        self.publishToMap(Serialize.SetAnimation(event, 'Fire', 'Fire'))
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