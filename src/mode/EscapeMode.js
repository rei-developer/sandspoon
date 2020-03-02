const Serialize = require('../protocol/Serialize')
const GameMap = require('../GameMap')
const { TeamType, ModeType, MapType } = require('../util/const')
const PlayerState = require('../PlayerState')
const Event = require('../Event')
const pix = require('../util/pix')

const STATE_READY = 0
const STATE_GAME = 1
const STATE_RESULT = 3

module.exports = class EscapeMode {
    constructor(roomId) {
        this.roomId = roomId
        this.redTeam = []
        this.blueTeam = []
        this.map = MapType.ASYLUM + parseInt(Math.random() * MapType.DESERT)
        this.count = 230
        this.maxCount = 230
        this.supplyCount = 5
        this.score = {
            red: 0,
            blue: 0
        }
        this.type = ModeType.ESCAPE
        this.persons = 0
        this.tick = 0
        this.state = STATE_READY
        this.room = Room.get(this.roomId)
        const objects = require('../../Assets/Mods/Mod' + ('' + 4).padStart(3, '0') + '.json')[this.map]
        for (const object of objects) {
            const event = new Event(this.roomId, object)
            this.room.addEvent(event)
        }
    }

    getJSON() {
        return {
            map: this.map,
            mode: this.type,
            count: this.count,
            maxCount: this.maxCount,
            red: this.score.red,
            blue: this.score.blue,
            persons: this.score.red
        }
    }

    moveToBase(self) {
        switch (this.map) {
            case MapType.ASYLUM:
                if (self.game.team === TeamType.RED) self.teleport(29, 9, 19)
                else self.teleport(2, 8, 13)
                break
            case MapType.TATAMI:
                if (self.game.team === TeamType.RED) self.teleport(54, 10, 5)
                else self.teleport(42, 9, 7)
                break
            case MapType.GON:
                if (self.game.team === TeamType.RED) self.teleport(75, 20, 26)
                else self.teleport(60, 16, 11)
                break
            case MapType.LABORATORY:
                if (self.game.team === TeamType.RED) self.teleport(86, 9, 11)
                else self.teleport(99, 10, 8)
                break
            case MapType.SCHOOL:
                if (self.game.team === TeamType.RED) self.teleport(115, 13, 9)
                else self.teleport(149, 14, 8)
                break
            case MapType.MINE:
                if (self.game.team === TeamType.RED) self.teleport(172, 6, 8)
                else self.teleport(154, 9, 8)
                break
            case MapType.ISLAND:
                if (self.game.team === TeamType.RED) self.teleport(189, 7, 7)
                else self.teleport(199, 10, 8)
                break
            case MapType.MANSION:
                if (self.game.team === TeamType.RED) self.teleport(226, 10, 9)
                else self.teleport(238, 17, 8)
                break
            case MapType.DESERT:
                if (self.game.team === TeamType.RED) self.teleport(244, 9, 11)
                else self.teleport(249, 7, 17)
                break
        }
    }

    moveToPrison(self) {
        switch (this.map) {
            case MapType.ASYLUM:
                self.teleport(13, 11, 15)
                break
            case MapType.TATAMI:
                self.teleport(57, 19, 13)
                break
            case MapType.GON:
                self.teleport(74, 14, 12)
                break
            case MapType.LABORATORY:
                self.teleport(96, 7, 30)
                break
            case MapType.SCHOOL:
                self.teleport(122, 6, 12)
                break
            case MapType.MINE:
                self.teleport(169, 13, 6)
                break
            case MapType.ISLAND:
                self.teleport(191, 11, 7)
                break
            case MapType.MANSION:
                self.teleport(217, 31, 8)
                break
            case MapType.DESERT:
                self.teleport(255, 20, 17)
                break
        }
    }

    join(self) {
        self.game = this.gameObject()
        self.setGraphics(self.blueGraphics)
        this.blueTeam.push(self)
        switch (this.state) {
            case STATE_READY:
                this.moveToBase(self)
                break
            case STATE_GAME:
                self.game.camera = true
                self.setGraphics('Camera')
                this.moveToBase(self)
                break
        }
        self.publishToMap(Serialize.SetGameTeam(self))
        self.publish(Serialize.ModeData(this))
    }

    drawAkari(self) {
        if (self.game.team === TeamType.BLUE)
            self.send(Serialize.SwitchLight(this.room.places[self.place].akari))
    }

    drawEvents(self) {
        const { events } = this.room.places[self.place]
        for (const event of events)
            self.send(Serialize.CreateGameObject(event))
    }

    drawUsers(self) {
        let selfHide = false
        const sameMapUsers = this.room.sameMapUsers(self.place)
        for (const user of sameMapUsers) {
            if (self === user)
                continue
            if (user.state === PlayerState.Tansu)
                continue
            let userHide = false
            if (self.game.team !== user.game.team) {
                if (!(self.admin > 0 && user.admin > 0)) {
                    if (self.admin > 0)
                        selfHide = true
                    else if (user.admin > 0)
                        userHide = true
                    else
                        selfHide = userHide = true
                }
            }
            self.send(Serialize.CreateGameObject(user, userHide))
            if (self.camera && !user.camera)
                continue
            user.send(Serialize.CreateGameObject(self, selfHide))
        }
    }

    attack(self, target) {
        if (self.game.team === TeamType.BLUE)
            return true
        if (self.game.team === target.game.team)
            return false
        if (self.game.camera || target.game.camera)
            return false
        target.game.team = TeamType.RED
        target.setGraphics(target.redGraphics)
        target.send(Serialize.SetGameTeam(target))
        target.send(Serialize.DeadAnimation())
        this.redTeam.push(target)
        this.blueTeam.splice(this.blueTeam.indexOf(target), 1)
        self.send(Serialize.NoticeMessage(target.name + (pix.maker(target.name) ? '를' : '을') + ' 맛있게 냠냠!!'))
        self.send(Serialize.PlaySound('Eat'))
        self.broadcast(Serialize.NoticeMessage(target.name + (pix.maker(target.name) ? '가' : '이') + ' 색출되다.'))
        self.broadcast(Serialize.PlaySound('Shock'))
        switch (target.state) {
            case PlayerState.Tansu:
                ++self.score.killForWardrobe
                ++target.score.deathForWardrobe
                target.setState('Basic')
                target.send(Serialize.LeaveWardrobe())
                break
            case PlayerState.Basic:
                ++self.score.kill
                ++target.score.death
                break
        }
        this.room.draw(target)
        return true
    }

    useItem(self) { }

    spawnDoor() {
        const newObjects = require('../../Assets/Mods/Eve000.json')[5]
        for (const object of newObjects) {
            const event = new Event(this.roomId, object)
            const red = pix.sample(this.redTeam, 1)[0]
            if (!red)
                continue
            event.place = red.place
            event.x = red.x
            event.y = red.y
            this.room.addEvent(event)
            this.room.publishToMap(event.place, Serialize.CreateGameObject(event))
        }
    }

    spawnKey() {
        const newObjects = require('../../Assets/Mods/Eve000.json')[4]
        for (const object of newObjects) {
            const event = new Event(this.roomId, object)
            const red = pix.sample(this.redTeam, 1)[0]
            if (!red)
                continue
            event.place = red.place
            event.x = red.x
            event.y = red.y
            this.room.addEvent(event)
            this.room.publishToMap(event.place, Serialize.CreateGameObject(event))
        }
        this.supplyCount = 5
    }

    doAction(self, event) {
        if (self.game.camera)
            return false
        event.doAction(self)
        return true
    }

    leave(self) {
        switch (self.game.team) {
            case TeamType.RED:
                this.redTeam.splice(this.redTeam.indexOf(self), 1)
                break
            case TeamType.BLUE:
                this.blueTeam.splice(this.blueTeam.indexOf(self), 1)
                break
        }
        self.game = {}
        self.setGraphics(self.blueGraphics)
        self.publish(Serialize.UpdateModeCount(this.score.blue))
    }

    gameObject() {
        return {
            team: TeamType.BLUE,
            spawnTime: 10,
            tansu: null,
            hp: 100,
            key: 0,
            camera: false,
            result: false,
            count: 0
        }
    }

    publishToRed(data) {
        for (const red of this.redTeam)
            red.send(data)
    }

    publishToBlue(data) {
        for (const blue of this.blueTeam)
            blue.send(data)
    }

    sameMapRedTeam(place) {
        return this.redTeam.filter(red => red.place === place)
    }

    result(winner) {
        this.state = STATE_RESULT
        const slice = this.room.users.slice(0)
        for (const user of slice) {
            user.roomId = 0
            user.game.result = true
        }
        Room.remove(this.room)
        for (const red of this.redTeam)
            red.score.sum += red.score.kill * 10 + red.score.killForWardrobe * 50
        for (const blue of this.blueTeam)
            blue.score.sum += blue.game.key * 50 + blue.score.foundKey * 20
        const ranks = slice.sort((a, b) => b.score.sum - a.score.sum)
        const persons = slice.length
        for (const red of this.redTeam) {
            const mission = "킬 " + red.score.kill + "\n장농 킬 " + red.score.killForWardrobe
            let exp = 100 + red.score.sum
            let coin = 50 + parseInt(red.score.sum / 2)
            if (exp < 100)
                exp = 100
            if (coin < 50)
                coin = 50
            const rank = ranks.indexOf(red) + 1
            red.reward.exp = exp
            red.reward.coin = coin
            switch (rank) {
                case 1:
                    red.reward.point = 10
                    break
                case 2:
                    red.reward.point = 5
                    break
                case 3:
                    red.reward.point = 1
                    break
            }
            red.send(Serialize.ResultGame(winner, rank, persons, mission, exp, coin))
        }
        for (const blue of this.blueTeam) {
            const mission = "구출 " + blue.score.rescue + " (" + blue.score.rescueCombo + "콤보)\n수감 " + (blue.score.death + blue.score.deathForWardrobe)
            let exp = 100 + blue.score.sum
            let coin = 50 + parseInt(blue.score.sum / 2)
            if (exp < 100)
                exp = 100
            if (coin < 50)
                coin = 50
            const rank = ranks.indexOf(blue) + 1
            blue.reward.exp = exp
            blue.reward.coin = coin
            switch (rank) {
                case 1:
                    blue.reward.point = 10
                    break
                case 2:
                    blue.reward.point = 5
                    break
                case 3:
                    blue.reward.point = 1
                    break
            }
            blue.send(Serialize.ResultGame(winner, rank, persons, mission, exp, coin))
        }
    }

    update() {
        if (++this.tick % 10 === 0) {
            this.tick = 0
            switch (this.state) {
                case STATE_READY:
                    if (this.count <= 230 && this.count > 200) {
                        if (this.count === 210) this.room.publish(Serialize.PlaySound('GhostsTen'))
                        this.room.publish(Serialize.NoticeMessage(this.count - 200))
                    } else if (this.count === 200) {
                        this.room.lock = false // true
                        this.state = STATE_GAME
                        const lottos = pix.sample(this.blueTeam, this.blueTeam.length > 4 ? 2 : 1)
                        for (const lotto of lottos) {
                            this.blueTeam.splice(this.blueTeam.indexOf(lotto), 1)
                            this.redTeam.push(lotto)
                            lotto.game.team = TeamType.RED
                            lotto.setGraphics(lotto.redGraphics)
                            if (lotto.state === PlayerState.Tansu) {
                                lotto.setState('Basic')
                                lotto.send(Serialize.LeaveWardrobe())
                                this.drawAkari(lotto)
                                lotto.game.tansu.users.splice(lotto.game.tansu.users.indexOf(lotto), 1)
                                lotto.game.tansu = null
                            }
                            lotto.send(Serialize.SetGameTeam(lotto))
                        }
                        this.spawnDoor()
                        this.publishToRed(Serialize.NoticeMessage('인간의 탈출을 막고 모두 색출하라.'))
                        this.publishToRed(Serialize.PlaySound('A4'))
                        this.publishToBlue(Serialize.NoticeMessage('오니를 피해 열쇠를 찾아 탈출하라.'))
                        this.publishToBlue(Serialize.PlaySound('A4'))
                    }
                    break
                case STATE_GAME:
                    for (const user of this.redTeam) {
                        const map = GameMap.get(user.place)
                        if ((map.rangePortal(user.x, user.y, 2))) {
                            if (++user.game.count >= 3) {
                                user.game.count = 0
                                if (user.game.hp < 0) {
                                    this.moveToBase(user)
                                    user.game.hp = 100
                                    user.send(Serialize.InformMessage('<color=red>지속적인 게임 플레이 방해로 본진으로 추방되었습니다.</color>'))
                                } else {
                                    user.game.hp -= 40
                                    user.send(Serialize.InformMessage('<color=red>경고!!! 포탈 주변을 막지 마십시오.</color>'))
                                    user.send(Serialize.PlaySound('Warn'))
                                }
                            }
                        } else {
                            if (--user.game.count < 0) user.game.count = 0
                        }
                    }
                    if (--this.supplyCount === 0)
                        this.spawnKey()
                    if (this.score.blue >= parseInt(this.blueTeam.length / 3) || this.redTeam.length === 0)
                        this.result(TeamType.BLUE)
                    else if (this.blueTeam.length === 0)
                        this.result(TeamType.RED)
                    else if (this.count === 5)
                        this.room.publish(Serialize.PlaySound('Second'))
                    else if (this.count === 0)
                        this.result(this.score.blue > 0 ? TeamType.BLUE : TeamType.RED)
                    break
            }
            --this.count
        }
    }
}