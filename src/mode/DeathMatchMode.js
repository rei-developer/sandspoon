const Serialize = require('../protocol/Serialize')
const { TeamType, ModeType, MapType } = require('../util/const')
const PlayerState = require('../PlayerState')
const Event = require('../Event')
const pix = require('../util/pix')

const STATE_READY = 0
const STATE_GAME = 1
const STATE_RESULT = 3

module.exports = class DeathMatchMode {
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
        this.tick = 0
        this.state = STATE_READY
        this.type = ModeType.DEATH_MATCH
        this.room = Room.get(this.roomId)
        const objects = require('../../Assets/Mods/Mod' + ('' + 5).padStart(3, '0') + '.json')[this.map]
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
            persons: this.blueTeam.length
        }
    }

    moveToBase(self) {
        switch (this.map) {
            case MapType.ASYLUM:
                self.teleport(21, 9, 7)
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
                self.teleport(226, 10, 9)
                break
            case MapType.DESERT:
                self.teleport(249, 7, 17)
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
        switch (this.state) {
            case STATE_READY:
                self.game.team = TeamType.BLUE
                self.setGraphics(self.blueGraphics)
                this.blueTeam.push(self)
                this.moveToBase(self)
                break
            case STATE_GAME:
                if (this.redTeam.length >= this.blueTeam.length) {
                    self.game.team = TeamType.RED
                    self.setGraphics(self.redGraphics)
                    this.redTeam.push(self)
                    this.moveToKickOut(self)
                    self.send(Serialize.NoticeMessage('모든 인간을 섬멸하라.'))
                } else {
                    self.game.team = TeamType.BLUE
                    self.setGraphics(self.blueGraphics)
                    this.blueTeam.push(self)
                    this.moveToBase(self)
                    self.send(Serialize.NoticeMessage('모든 오니를 소탕하라.'))
                }
                self.send(Serialize.PlaySound('A4'))
                break
        }
        self.publishToMap(Serialize.SetGameTeam(self))
        self.publish(Serialize.ModeData(this))

        self.send(Serialize.SystemMessage('<color=red>★ 이제부터 30초 광고 시청이 가능합니다. 보석 10개를 얻어보세요!!</color>'))
    }

    drawAkari(self) {
        if (self.game.team === TeamType.BLUE)
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
            if (self === user)
                continue
            if (user.state === PlayerState.Tansu)
                continue
            self.send(Serialize.CreateGameObject(user))
            user.send(Serialize.CreateGameObject(self))
        }
    }

    attack(self, target) {
        if (self.game.team === TeamType.BLUE)
            return true
        if (self.game.team === target.game.team)
            return false
        ++this.score.red
        this.moveToBase(target)
        target.send(Serialize.DeadAnimation())
        self.send(Serialize.NoticeMessage(target.name + (pix.maker(target.name) ? '를' : '을') + ' 맛있게 냠냠!!'))
        self.send(Serialize.PlaySound('Eat'))
        self.broadcast(Serialize.NoticeMessage(target.name + (pix.maker(target.name) ? '가' : '이') + ' 사망하다.'))
        self.broadcast(Serialize.PlaySound('Shock'))
        self.publish(Serialize.UpdateModeCount(this.score.red, this.score.blue))
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
        return true
    }

    buyItem(self, id) {
        const item = Item.get(id)
        if (!item)
            return
        if (self.coin < item.cost)
            return self.send(Serialize.InformMessage('<color=red>골드가 부족합니다.</color>'))
        self.coin -= item.cost
        self.game.useItemId = id
        this.addItem(self, id, item.num)
        self.send(Serialize.InformMessage('<color=red>' + item.name + ' 구입 완료</color>'))
    }

    addItem(self, id, num = 1) {
        const inventory = self.game.inventory.find(item => item.id === id)
        if (inventory)
            inventory.num += num
        else
            self.game.inventory.push({ id, num })
        const item = Item.get(id)
        if (!item)
            return
        self.send(Serialize.UpdateGameItem(item.icon, inventory ? inventory.num : num))
    }

    useItem(self) {
        if (self.game.useItemId < 1)
            return self.send(Serialize.InformMessage('<color=red>구입한 아이템이 없습니다.</color>'))
        const inventory = self.game.inventory.find(item => item.id === self.game.useItemId)
        if (!inventory)
            return self.send(Serialize.InformMessage('<color=red>구입한 아이템이 없습니다.</color>'))
        if (--inventory.num === 0)
            return self.send(Serialize.InformMessage('<color=red>아이템을 모두 소비했습니다.</color>'))
        const itemInfo = Item.get(self.game.useItemId)
        if (!itemInfo)
            return
        itemInfo.doing(self)
        self.send(Serialize.UpdateGameItem(itemInfo.icon, inventory.num))
        if (inventory.num < 1)
            self.send(Serialize.RemoveGameItem())
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
                break
        }
        self.game = {}
        self.setGraphics(self.blueGraphics)
    }

    gameObject() {
        return {
            team: TeamType.BLUE,
            spawnTime: 10,
            tansu: null,
            hp: 100,
            inventory: [],
            useItemId: 0,
            judgment: false,
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
        if (winner === TeamType.BLUE) {
            for (const blue of this.blueTeam) {
                if (blue.state === PlayerState.Tansu) {
                    blue.score.sum += 800
                    blue.score.surviveForWardrobe += 1
                } else {
                    blue.score.sum += 400
                    blue.score.survive += 1
                }
            }
        }
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
            const mission = "생존" + (blue.state === PlayerState.Tansu ? " (장농)" : "")
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
                        const lottos = pix.sample(this.blueTeam, parseInt(this.blueTeam.length / 2))
                        for (const lotto of lottos) {
                            this.blueTeam.splice(this.blueTeam.indexOf(lotto), 1)
                            this.redTeam.push(lotto)
                            this.moveToKickOut(lotto)
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
                        this.publishToRed(Serialize.NoticeMessage('모든 인간을 섬멸하라.'))
                        this.publishToBlue(Serialize.NoticeMessage('모든 오니를 소탕하라.'))
                        this.room.publish(Serialize.PlaySound('A4'))
                    }
                    break
                case STATE_GAME:
                    if (this.redTeam.length === 0)
                        this.result(TeamType.BLUE)
                    else if (this.blueTeam.length === 0)
                        this.result(TeamType.RED)
                    if (this.count === 5)
                        this.room.publish(Serialize.PlaySound('Second'))
                    else if (this.count === 0)
                        this.result(this.score.red >= this.score.blue ? TeamType.RED : TeamType.BLUE)
                    break
            }
            --this.count
        }
    }
}