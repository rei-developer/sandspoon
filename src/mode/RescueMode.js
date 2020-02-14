const Serialize = require('../protocol/Serialize')
const GameMap = require('../GameMap')
const { TeamType, ModeType, MapType } = require('../util/const')
const PlayerState = require('../PlayerState')
const Event = require('../Event')
const pix = require('../util/pix')

const STATE_READY = 0
const STATE_GAME = 1
const STATE_RESULT = 3

module.exports = class RescueMode {
    constructor(roomId) {
        this.roomId = roomId
        this.redTeam = []
        this.blueTeam = []
        this.map = MapType.ASYLUM + parseInt(Math.random() * MapType.DESERT)
        this.count = 230
        this.maxCount = 230
        this.score = {
            red: 0,
            blue: 0
        }
        this.type = ModeType.RESCUE
        this.persons = 0
        this.caught = false
        this.tick = 0
        this.state = STATE_READY
        this.room = Room.get(this.roomId)
        const objects = require('../../Assets/Mods/Mod' + ('' + 1).padStart(3, '0') + '.json')[this.map]
        for (const object of objects) {
            const event = new Event(this.roomId, object)
            this.room.addEvent(event)
        }
    }

    getJSON() {
        return {
            map: this.map,
            mode: ModeType.RESCUE,
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

    moveToKickOut(self) {
        switch (this.map) {
            case MapType.ASYLUM:
                self.teleport(19, 9, 8)
                break
            case MapType.TATAMI:
                self.teleport(47, 17, 6)
                break
            case MapType.GON:
                self.teleport(72, 15, 8)
                break
            case MapType.LABORATORY:
                self.teleport(89, 16, 12)
                break
            case MapType.SCHOOL:
                self.teleport(118, 5, 15)
                break
            case MapType.MINE:
                self.teleport(166, 34, 31)
                break
            case MapType.ISLAND:
                self.teleport(174, 12, 7)
                break
            case MapType.MANSION:
                self.teleport(218, 19, 8)
                break
            case MapType.DESERT:
                self.teleport(243, 13, 22)
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
                this.moveToPrison(self)
                self.game.caught = true
                ++this.score.red
                self.send(Serialize.NoticeMessage('감옥에 갇힌 인질을 전원 구출하라.'))
                break
        }
        self.publishToMap(Serialize.SetGameTeam(self))
        self.publish(Serialize.ModeData(this))
    }

    drawAkari(self) {
        if (self.game.team === TeamType.BLUE) {
            self.send(Serialize.SwitchLight(this.room.places[self.place].akari))
        }
    }

    drawEvents(self) {
        const { events } = this.room.places[self.place]
        for (const event of events) {
            self.send(Serialize.CreateGameObject(event))
        }
    }

    drawUsers(self) {
        let selfHide = false
        const sameMapUsers = this.room.sameMapUsers(self.place)
        for (const user of sameMapUsers) {
            if (self === user) continue
            if (user.state === PlayerState.Tansu) continue
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
            user.send(Serialize.CreateGameObject(self, selfHide))
        }
    }

    attack(self, target) {
        if (self.game.team === TeamType.BLUE) return true
        if (self.game.team === target.game.team) return false
        if (target.game.caught) return true
        this.moveToPrison(target)
        target.game.caught = true
        target.send(Serialize.DeadAnimation())
        self.send(Serialize.NoticeMessage(target.name + (pix.maker(target.name) ? '를' : '을') + ' 인질로 붙잡았다.'))
        self.send(Serialize.PlaySound('Eat'))
        self.broadcast(Serialize.NoticeMessage(target.name + (pix.maker(target.name) ? '가' : '이') + ' 인질로 붙잡혔다!'))
        self.broadcast(Serialize.PlaySound('Shock'))
        switch (target.state) {
            case PlayerState.Tansu:
                ++self.score.killForWardrobe
                ++target.score.deathForWardrobe
                target.setState('Basic')
                target.send(Serialize.LeaveWardrobe())
                this.drawAkari(target)
                break
            case PlayerState.Basic:
                ++self.score.kill
                ++target.score.death
                break
        }
        ++this.score.red
        self.publish(Serialize.UpdateModeUserCount(this.score.red))
        return true
    }

    doAction(self, event) {
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
                if (self.game.caught)--this.score.red
                break
        }
        self.game = {}
        self.setGraphics(self.blueGraphics)
        self.publish(Serialize.UpdateModeUserCount(this.score.red))
    }

    gameObject() {
        return {
            team: TeamType.BLUE,
            spawnTime: 10,
            tansu: null,
            hp: 100,
            caught: false,
            judgment: false,
            result: false,
            count: 0
        }
    }

    publishToRed(data) {
        for (const red of this.redTeam) {
            red.send(data)
        }
    }

    publishToBlue(data) {
        for (const blue of this.blueTeam) {
            blue.send(data)
        }
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
        for (const red of this.redTeam) {
            red.score.sum += red.score.kill * 10 + red.score.killForWardrobe * 50
        }
        for (const blue of this.blueTeam) {
            blue.score.sum += blue.score.rescue * 10 + blue.score.rescueCombo * 10 - blue.score.death * 10 - blue.score.deathForWardrobe * 20
        }
        const ranks = slice.sort((a, b) => b.score.sum - a.score.sum)
        const persons = slice.length
        for (const red of this.redTeam) {
            const mission = "킬 " + red.score.kill + "\n장농 킬 " + red.score.killForWardrobe
            let exp = 100 + red.score.sum
            let coin = 50 + parseInt(red.score.sum / 2)
            if (exp < 100) exp = 100
            if (coin < 50) coin = 50
            const rank = ranks.indexOf(red) + 1
            red.reward.exp = exp
            red.reward.coin = coin
            if (rank <= 3) red.reward.point = 4 - rank
            red.send(Serialize.ResultGame(winner, rank, persons, mission, exp, coin))
        }
        for (const blue of this.blueTeam) {
            const mission = "구출 " + blue.score.rescue + " (" + blue.score.rescueCombo + "콤보)\n수감 " + (blue.score.death + blue.score.deathForWardrobe)
            let exp = 100 + blue.score.sum
            let coin = 50 + parseInt(blue.score.sum / 2)
            if (exp < 100) exp = 100
            if (coin < 50) coin = 50
            const rank = ranks.indexOf(blue) + 1
            blue.reward.exp = exp
            blue.reward.coin = coin
            if (rank <= 3) blue.reward.point = 4 - rank
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
                        const lottos = pix.sample(this.blueTeam, parseInt(this.blueTeam.length / 4) + 1)
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
                        this.publishToRed(Serialize.NoticeMessage('단 한 명의 인간이라도 감옥에 가둬라.'))
                        this.publishToRed(Serialize.PlaySound('A4'))
                        this.publishToBlue(Serialize.NoticeMessage('감옥에 갇힌 인질을 전원 구출하라.'))
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
                    if (this.count === 5 || this.count % 40 === 0) {
                        this.caught = true
                        this.room.publish(Serialize.InformMessage('<color=#B5E61D>인질 구출이 가능합니다!</color>'))
                        this.room.publish(Serialize.PlaySound('thump'))
                    }
                    if (this.count === 100) {
                        for (const red of this.redTeam) {
                            this.moveToBase(red)
                            red.send(Serialize.InformMessage('<color=red>소멸 시간이 되었습니다. 본진으로 돌아갑니다...</color>'))
                        }
                        this.room.publish(Serialize.PlaySound('A6'))
                    }
                    if (this.redTeam.length === 0) this.result(TeamType.BLUE)
                    else if (this.blueTeam.length === 0) this.result(TeamType.RED)
                    else if (this.score.red === this.blueTeam.length) this.result(TeamType.RED)
                    else if (this.count === 5) this.room.publish(Serialize.PlaySound('Second'))
                    else if (this.count === 0) this.result(this.score.red > 0 ? TeamType.RED : TeamType.BLUE)
                    break
            }
            // if (this.count % 10 === 0) room.publish('gameInfo', { count: this.count, maxCount: this.maxCount })
            --this.count
        }
    }
}