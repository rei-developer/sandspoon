const { StatusType } = require('./util/const')
const pix = require('./util/pix')
const Serialize = require('./protocol/Serialize')

class DefaultMethod {
    constructor(args = {}) { }

    doing(self, item) { }
}

class YuzuhaMethod {
    constructor(args = {}) { }

    doing(self, item) {
        const room = Room.get(self.roomId)
        const { users } = room.places[self.place]
        for (const user of users) {
            if (self === user)
                continue
            if (!(self.x === user.x && self.y === user.y || self.x + self.direction.x === user.x && self.y - self.direction.y === user.y))
                continue
            const blood = user.game.status.find(s => s === StatusType.BLOOD)
            const washedBlood = user.game.status.find(s => s === StatusType.WASHED_BLOOD)
            const result = blood || washedBlood ? true : false
            self.send(Serialize.UpdateRoomGameInfo('루미놀 검사 결과', result ? '양성' : '음성', `${user.name}의 몸을 루미놀 검사 지시약으로 판독해보니, ${result ? '혈흔이 묻혀진 것으로 판단된다.' : '아무런 이상이 없는 것으로 판단된다.'}`))
            if (result)
                ++self.score.assist
            return self.send(Serialize.PlaySound('result'))
        }
        self.send(Serialize.InformMessage('<color=red>앞에 대상이 없습니다.</color>'))
    }
}

module.exports = new Proxy({
    Yuzuha: YuzuhaMethod,
}, {
    get: function (target, name) {
        return target.hasOwnProperty(name) ? target[name] : DefaultMethod
    }
})