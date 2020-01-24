const Serialize = require('./protocol/Serialize')
const Character = require('./Character')
const { TeamType, RoomType } = require('./const')
const PlayerState = require('./PlayerState')
const DB = require('./DB')
const Data = require('./Data')
const pix = require('./pix')
const Score = require('./Score')
const Reward = require('./Reward')
const filtering = require('./filtering-text')

global.User = (function () {
    const _static = {
        users: [],
        index: 0
    }
    return class User extends Character {
        constructor(socket, verify, admin = 1) {
            super()
            this.type = 1
            this.index = 0
            this.socket = socket
            this.verify = verify
            this.roomId = 0
            this.place = 1
            this.game = {}
            this.score = new Score()
            this.reward = new Reward()
            this.state = PlayerState.Basic
            this.id = 0
            this.rank = 0
            this.name = '테스트'
            this.level = 80
            this.exp = 0
            this.maxExp = this.getMaxExp()
            this.coin = 1000000
            this.cash = 0
            this.win = 0
            this.lose = 0
            this.kill = 0
            this.death = 0
            this.assist = 0
            this.blast = 0
            this.rescue = 0
            this.rescueCombo = 0
            this.survive = 0
            this.escape = 0
            this.redGraphics = 'ao'
            this.blueGraphics = 'Someok'
            this.memo = ''
            this.lastChatTime = new Date()
            this.alert = 0
            this.admin = admin
            this.timestamp = 0
            this.tempReboot = false
            this.clan = null
            return (async () => {
                if (verify === 'test') {
                    // this.verify = { id: 110409668035092753325, loginType: 0}
                    this.verify = { id: 113049585880204162131, loginType: 0 }
                    await this.loadUserData()
                    return this
                }
                await this.loadUserData()
                return this
            })()
        }

        setUpLevel(value = 1) {
            this.level += value
            this.maxExp = this.getMaxExp()
        }

        setUpExp(value) {
            if (this.level > 99) return
            this.exp = Math.max(this.exp + value, 0)
            while (this.exp >= this.maxExp) {
                this.exp -= this.maxExp
                this.setUpLevel()
            }
        }

        getMaxExp() {
            return (Math.pow(this.level, 2) * (this.level * 5)) + 200
        }

        static get users() {
            return _static.users
        }

        static get index() {
            return _static.index
        }

        static set index(value) {
            _static.index = value
        }

        static getByUser(user) {
            return User.users.find((u) => u === user)
        }

        static async create(socket, verify) {
            if (User.users.some((u) => u.verify.id === verify.id && u.verify.loginType === verify.loginType)) return
            if (verify === 'test') {
                const user = await new User(socket, verify, 1)
                User.add(user)
                return user
            }
            const user = await new User(socket, verify)
            User.add(user)
            return user
        }

        static add(user) {
            user.index = ++User.index
            User.users.push(user)
        }

        static removeByUser(user) {
            User.users.splice(User.users.indexOf(user), 1)
        }

        static removeByIndex(index) {
            User.users.splice(index, 1)
        }

        async loadUserData() {
            const user = await DB.FindUserByOauth(this.verify.id, this.verify.loginType)
            if (!user || !user.name) throw new Error('존재하지 않는 계정입니다. : ' + user)
            const clanMember = await DB.FindMyClanByUserId(user.id)
            if (clanMember) {
                this.clan = Clan.clans[clanMember.clan_id]
            }
            this.id = user.id
            this.rank = Data.rank[user.name].rank
            this.name = user.name
            this.level = user.level
            this.exp = user.exp
            this.maxExp = this.getMaxExp()
            this.coin = user.coin
            this.cash = user.cash
            this.win = user.win
            this.lose = user.lose
            this.kill = user.kill
            this.death = user.death
            this.assist = user.assist
            this.blast = user.blast
            this.rescue = user.rescue
            this.rescueCombo = user.rescue_combo
            this.survive = user.survive
            this.escape = user.escape
            this.redGraphics = user.red_graphics
            this.blueGraphics = user.blue_graphics
            this.memo = user.memo
            this.lastChatTime = new Date(user.last_chat)
            this.admin = user.admin
        }

        async createClan(name) {
            if (this.clanId) return
            if (this.coin < 10000) return
            if (name.length < 1 || name.length > 12) return
            if (name.match(/[^가-힣a-zA-Z0-9]+/)) return
            if (!filtering.check(name)) return
            const clan = await Clan.create(this.id, name)
            if (clan) {
                this.coin -= 10000
                this.clan = clan
                let members = []
                for (let i = 0; i < this.clan.members.length; ++i) {
                    const memberId = this.clan.members[i]
                    members.push(DB.FindUserClanInfoById(memberId))
                }
                members = await Promise.all(members)
                this.send(Serialize.GetClan(this.clan, members))
            }
        }

        async inviteClan(name) {
            if (!this.clan) return
            if (this.clan.masterId !== this.id) return
            this.clan.invite(this.id, name)
        }

        async joinClan(id) {
            if (this.clan) return
            if (await Clan.get(id).enter(this.id)) {
                this.clan = Clan.get(id)
                this.getClan()
            }
        }

        async cancelClan(id) {
            DB.DeleteInviteClan(id)
        }

        async kickClan(id) {
            if (!this.clan) return
            if (this.clan.masterId !== this.id) return
            if (this.clan.masterId == id) return
            this.clan.leave(id)
            const findUser = User.users.find(u => u.id === id)
            if (findUser)
                findUser.clan = null
            this.getClan()
        }

        async getClan() {
            if (!this.clan) {
                this.send(Serialize.GetClan())
                const invites = await DB.GetInviteClans(this.id)
                this.send(Serialize.InviteClan(invites.map(i => ({
                    id: i.clan_id,
                    name: Clan.get(i.clan_id).name,
                }))))
                return
            }
            let members = []
            for (let i = 0; i < this.clan.members.length; ++i) {
                const memberId = this.clan.members[i]
                members.push(DB.FindUserClanInfoById(memberId))
            }

            members = await Promise.all(members)
            this.send(Serialize.GetClan(this.clan, members))
        }

        async leaveClan() {
            if (!this.clan) return
            if (this.clan.masterId === this.id && this.clan.members.length > 1) return
            this.clan.leave(this.id)
            this.clan = null
            this.send(Serialize.GetClan())
        }

        async setOptionClan(data) {
            if (!this.clan) return
            //if (this.clan.masterId !== this.id) return
            data.notice = data.notice.replace(/<br>/g, '\n')
            this.clan.setOption(data)
            await DB.UpdateClanOption(this.clan.id, data)
            this.getClan()
        }

        async tempSkinBuy() {
            if (this.coin < 5000) return

            const skins = [
                'base',
                'Bbangdori',
                //'catman',
                'Loliny',
                'Mania',
                'orange',
                'Prisoner',
                'Red_Witch',
                'Someok',
                //'Yuzuha',
                //'YuzuhaBlue'
            ]

            const i = Math.floor(Math.random() * skins.length)

            this.blueGraphics = skins[i]
            this.coin -= 5000
            this.send(Serialize.TempSkinBuy(this.blueGraphics, this.coin))
        }

        setState(state) {
            this.state = PlayerState[state]
        }

        setGraphics(graphics) {
            this.graphics = graphics
            this.publishToMap(Serialize.SetGraphics(this))
        }

        turn(x, y) {
            this.state.turn(this, x, y)
        }

        move(x, y, timestamp) {
            this.timestamp = timestamp
            this.state.move(this, x, -y)
        }

        chat(message) {
            if (this.command(message)) return
            const room = Room.get(this.roomId)
            if (!room) return
            message = message.substring(0, 35).replace(/</g, '&lt;').replace(/>/g, '&gt;')
            const now = new Date().getTime()
            if (this.lastChatTime.getTime() > now) {
                this.send(Serialize.SystemMessage('<color=red>운영진에 의해 채팅이 금지되었습니다.</color> (' + this.lastChatTime + ')'))
                return
            }
            let text = message.replace(/[^ㄱ-ㅎ가-힣]/g, '')
            if (!filtering.check(text)) {
                ++this.alert
                if (this.alert >= 5) this.send(Serialize.QuitGame())
                else {
                    this.send(Serialize.Vibrate())
                    this.send(Serialize.SystemMessage('<color=red>금칙어를 언급하여 경고 ' + this.alert + '회를 받았습니다. 5회 이상시 자동 추방됩니다.</color>'))
                }
                return
            }

            console.log(this.name + '(#' + this.roomId + '@' + this.place + '): ' + message)

            switch (room.type) {
                case RoomType.GAME:
                    if (this.game.team === TeamType.RED) this.redChat(message)
                    else this.blueChat(message)
                    break
                case RoomType.PLAYGROUND:
                    this.publish(Serialize.ChatMessage(this.type, this.index, this.name, message))
                    break
            }
        }

        command(message) {
            if (this.admin === 0) return false
            if (message.substring(0, 1) === '#') {
                this.notice(Serialize.SystemMessage('<color=#EFE4B0>@[' + (this.admin === 1 ? '운영자' : '개발자') + '] ' + this.name + ': ' + message.substring(1) + '</color>'))
                return true
            }

            const piece = message.split(',')
            let name
            let target
            let description
            let days
            let cash

            switch (message.substring(0, 3)) {
                case '!tp':
                    if (piece.length <= 1) return true
                    target = Room.get(this.roomId).users.find(u => u.name === piece[1])
                    if (!target) return true
                    if (piece.length <= 2) this.teleport(target.place, target.x, target.y)
                    else {
                        const target2 = Room.get(this.roomId).users.find(u => u.name === piece[2])
                        if (target2) target2.teleport(target.place, target.x, target.y)
                    }
                    break
                case '!캡슐':
                    if (piece.length <= 1) {
                        this.send(Serialize.SystemMessage('<color=red>!캡슐,지급 개수 (1 ~ 10000)</color>'))
                        return true
                    }
                    cash = Number(piece[1])
                    if (cash < 1 || cash > 10000) cash = 1
                    for (const user of User.users) {
                        user.cash += cash
                        user.send(Serialize.SystemMessage('<color=#FFC90E>' + this.name + '님께서 캡슐 ' + cash + '개를 지급해주셨습니다!!!</color>'))
                    }
                    break
                case '!채금':
                    if (piece.length <= 2) {
                        this.send(Serialize.SystemMessage('<color=red>!채금,닉네임,일 단위 (1 ~ 3650)</color>'))
                        return true
                    }
                    name = piece[1]
                    days = piece.length > 2 ? Number(piece[2]) : 3650
                    if (days < 1 || days > 3650) days = 3650
                    target = User.users.find(u => u.name === name)
                    if (target) {
                        const d = new Date()
                        d.setDate(d.getDate() + days)
                        target.lastChatTime = d
                        target.send(Serialize.SystemMessage('<color=red>운영진에 의해 채팅이 금지되었습니다.</color>'))
                        this.send(Serialize.SystemMessage('<color=red>' + name + (pix.maker(name) ? '를' : '을') + ' ' + days + '일 동안 채팅을 금지함.</color>'))
                    } else this.send(Serialize.SystemMessage('<color=red>' + name + (pix.maker(name) ? '는' : '은') + ' 접속하지 않았거나 존재하지 않음.</color>'))
                    break
                case '!채해':
                    if (piece.length <= 1) {
                        this.send(Serialize.SystemMessage('<color=red>!채해,닉네임</color>'))
                        return true
                    }
                    name = piece[1]
                    target = User.users.find(u => u.name === name)
                    if (target) {
                        const d = new Date()
                        target.lastChatTime = d
                        target.send(Serialize.SystemMessage('<color=red>운영진에 의해 채팅 금지가 해제되었습니다.</color>'))
                        this.send(Serialize.SystemMessage('<color=red>' + name + (pix.maker(name) ? '를' : '을') + ' 채팅 금지를 해제함.</color>'))
                    } else this.send(Serialize.SystemMessage('<color=red>' + name + (pix.maker(name) ? '는' : '은') + ' 접속하지 않았거나 존재하지 않음.</color>'))
                    break
                case '!차단':
                    if (piece.length <= 2) {
                        this.send(Serialize.SystemMessage('<color=red>!차단,닉네임,욕설 사용,일 단위 (1 ~ 3650)</color>'))
                        return true
                    }
                    name = piece[1]
                    description = piece[2]
                    days = piece.length > 2 ? Number(piece[3]) : 3650
                    if (days < 1 || days > 3650) days = 3650
                    target = User.users.find(u => u.name === name)
                    if (target) this.ban(target, name, description, days)
                    else this.send(Serialize.ChatMessage(null, null, null, '<color=red>' + name + (pix.maker(name) ? '는' : '은') + ' 접속하지 않았거나 존재하지 않음.</color>'))
                    break
                case '!메모':
                    if (piece.length <= 1) {
                        this.send(Serialize.SystemMessage('<color=red>!메모,닉네임,내용 (공백시 정보 요청)</color>'))
                        return true
                    }
                    name = piece[1]
                    description = piece.length > 2 ? piece[2] : ''
                    target = User.users.find(u => u.name === name)
                    if (target) {
                        if (description !== '') target.memo = description
                        this.send(Serialize.SystemMessage('<color=#FFC90E>' + name + '#메모: </color>' + target.memo))
                    } else this.send(Serialize.SystemMessage('<color=red>' + name + (pix.maker(name) ? '는' : '은') + ' 접속하지 않았거나 존재하지 않음.</color>'))
                    break
                default:
                    return false
            }
            return true
        }

        async ban(user, name, description, days) {
            if (user) {
                await DB.InsertBlock(user.verify.loginType, user.verify.id, user.verify.uuid, description, days)
                user.send(Serialize.QuitGame())
                this.publish(Serialize.SystemMessage('<color=red>' + name + (pix.maker(name) ? '를' : '을') + ' ' + days + '일 동안 접속을 차단함. (' + description + ')</color>'))
                console.log(name + (pix.maker(name) ? '를' : '을') + ' ' + days + '일 동안 접속을 차단함. (' + description + ')')
            } else {
                const findUser = await DB.FindUserByName(name)
                if (findUser) {
                    await DB.InsertBlock(findUser.login_type, findUser.uid, findUser.uuid, description, days)
                    this.publish(Serialize.SystemMessage('<color=red>' + name + (pix.maker(name) ? '를' : '을') + ' ' + days + '일 동안 접속을 차단함. (' + description + ')</color>'))
                    console.log(name + (pix.maker(name) ? '를' : '을') + ' ' + days + '일 동안 접속을 차단함. (' + description + ')')
                }
            }
        }

        redChat(message) {
            this.publish(Serialize.ChatMessage(this.type, this.index, `<color=#00A2E8>${this.name}</color>`, message))
        }

        blueChat(message) {
            if (this.game.caught)
                this.publishToMap(Serialize.ChatMessage(this.type, this.index, `<color=#808080>${this.name}</color>`, message))
            else
                this.publish(Serialize.ChatMessage(this.type, this.index, `<color=#00A2E8>${this.name}</color>`, message))
        }


        entry(type = RoomType.GAME) {
            if (this.roomId) return
            this.timestamp = 0
            this.speedhackrate = 0
            this.setState('Basic')
            this.send(Serialize.LeaveWardrobe())

            let room = Room.available(type)
            if (!room) room = Room.create(type)
            room.join(this)
        }

        leave() {
            if (!this.roomId) return
            Room.get(this.roomId).leave(this)
        }

        hit() {
            if (!this.roomId) return
            Room.get(this.roomId).hit(this)
        }

        portal(place, x, y, dx = 0, dy = 0) {
            this.timestamp = 0
            this.broadcastToMap(Serialize.RemoveGameObject(this))
            this.place = place
            this.setPosition(x, y)
            if (!(dx == dy && dx == 0))
                this.turn(dx, dy)
            this.send(Serialize.Portal(place, x, y, this.direction))
        }

        teleport(place, x, y) {
            if (!this.roomId) return
            Room.get(this.roomId).teleport(this, place, x, y)
        }

        result(ad) {
            if (!this.game.result) return
            switch (ad) {
                case 1:
                    this.entry(RoomType.GAME)
                    break
                case 2:
                    this.reward.cash += 2
                    break
            }
            this.reward.send(this)
            this.score.send(this)
            this.game.result = false
        }

        getJSON() {
            return {
                index: this.index,
                type: this.type,
                id: this.id,
                name: this.name,
                level: this.level,
                exp: this.exp,
                coin: this.coin,
                admin: this.admin
            }
        }

        async disconnect() {
            this.leave()
            User.removeByUser(this)
            if (!await DB.UpdateUser(this))
                logger.log('저장 실패 ' + JSON.stringify(user.getJSON()))
        }

        send(data) {
            if (this.socket.readyState === 1)
                this.socket.send(data)
        }

        notice(data) {
            const users = User.users
            for (const user of users) {
                user.send(data)
            }
        }

        publish(data) {
            if (!this.roomId) return
            Room.get(this.roomId).publish(data)
        }

        broadcast(data) {
            if (!this.roomId) return
            Room.get(this.roomId).broadcast(this, data)
        }

        broadcastToMap(data) {
            if (!this.roomId) return
            Room.get(this.roomId).broadcastToMap(this, data)
        }

        publishToMap(data) {
            if (!this.roomId) return
            Room.get(this.roomId).publishToMap(this.place, data)
        }
    }
})()