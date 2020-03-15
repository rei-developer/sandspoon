const Serialize = require('../protocol/Serialize')
const { TeamType, ModeType } = require('../util/const')
const PlayerState = require('../PlayerState')
const Event = require('../Event')
const pix = require('../util/pix')

const STATE_READY = 0
const STATE_GAME = 1
const STATE_RESULT = 3

module.exports = class ProtectMode {
    constructor(roomId) {
        this.roomId = roomId
        this.redTeam = []
        this.blueTeam = []
        this.count = 230
        this.maxCount = 230
        this.supplyCount = 5
        this.score = {
            blue: 0
        }
        this.tick = 0
        this.state = STATE_READY
        this.type = ModeType.PROTECT
        this.room = Room.get(this.roomId)
        const objects = require('../../Assets/Mods/Mod' + ('' + 6).padStart(3, '0') + '.json')[1]
        for (const object of objects) {
            const event = new Event(this.roomId, object)
            this.room.addEvent(event)
        }
    }

    getJSON() {
        return {
            mode: this.type,
            count: this.count,
            maxCount: this.maxCount,
            blue: this.score.blue,
            persons: this.blueTeam.length
        }
    }

    moveToBase(self) {
        self.teleport(79, 30, 62)
    }

    join(self) {
        self.game = this.gameObject()
        self.game.team = TeamType.BLUE
        self.setGraphics(self.blueGraphics)
        this.blueTeam.push(self)
        this.moveToBase(self)
        switch (this.state) {
            case STATE_GAME:
                self.send(Serialize.NoticeMessage('마을을 침입하는 오니들을 모두 소탕하라.'))
                self.send(Serialize.PlaySound('A4'))
                break
        }
        self.publishToMap(Serialize.SetGameTeam(self))
        self.publish(Serialize.ModeData(this))

        self.send(Serialize.SystemMessage('<color=red>★ 이제부터 30초 광고 시청이 가능합니다. 보석 10개를 얻어보세요!!</color>'))
    }

    drawAkari(self) {
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

    spawnOni() {
        const range = 10
        const objects = require('../../Assets/Mods/Eve000.json')[6]
        for (const object of objects) {
            for (let i = 0; i < parseInt(this.blueTeam.length / 2) + 1; i++) {
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
        this.room.publish(Serialize.PlaySound('BEEP'))
        this.supplyCount = 35 - this.blueTeam.length
    }

    doAction(self, event) {
        if (!self.game.camera)
            event.doAction(self)
        return true
    }

    leave(self) {
        this.blueTeam.splice(this.blueTeam.indexOf(self), 1)
        self.game = {}
        self.setGraphics(self.blueGraphics)
    }

    gameObject() {
        return {
            team: TeamType.BLUE,
            spawnTime: 10,
            tansu: null,
            hp: 100,
            kill: 0,
            inventory: [],
            useItemId: 0,
            judgment: false,
            camera: false,
            result: false,
            count: 0
        }
    }

    publishToBlue(data) {
        for (const blue of this.blueTeam)
            blue.send(data)
    }

    result(winner) {
        this.state = STATE_RESULT
        const slice = this.room.users.slice(0)
        for (const user of slice) {
            user.roomId = 0
            user.game.result = true
        }
        Room.remove(this.room)
        for (const blue of this.blueTeam)
            blue.score.sum += blue.game.kill * 10
        const ranks = slice.sort((a, b) => b.score.sum - a.score.sum)
        const persons = slice.length
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
                        for (const blue of this.blueTeam)
                            this.moveToBase(blue)
                        this.publishToBlue(Serialize.NoticeMessage('마을을 침입하는 오니들을 모두 소탕하라.'))
                        this.room.publish(Serialize.PlaySound('A4'))
                    }
                    break
                case STATE_GAME:
                    if (--this.supplyCount === 0)
                        this.spawnOni()
                    if (this.count === 5)
                        this.room.publish(Serialize.PlaySound('Second'))
                    else if (this.count === 0)
                        this.result(this.score.blue < this.blueTeam.length * 10 ? TeamType.RED : TeamType.BLUE)
                    break
            }
            --this.count
        }
    }
}