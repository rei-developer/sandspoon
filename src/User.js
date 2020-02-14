const Serialize = require('./protocol/Serialize')
const Character = require('./Character')
const { TeamType, RoomType } = require('./util/const')
const PlayerState = require('./PlayerState')
const DB = require('./DB')
const Data = require('./Data')
const pix = require('./util/pix')
const Score = require('./Score')
const Reward = require('./Reward')
const filtering = require('./util/filtering-text')
const moment = require('moment')

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
            this.sex = 1
            this.level = 1
            this.exp = 0
            this.maxExp = this.getMaxExp()
            this.coin = 0
            this.cash = 0
            this.point = 0
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
            this.blueGraphics = 'Mania'
            this.memo = ''
            this.lastChatTime = new Date()
            this.alert = 0
            this.admin = admin
            this.timestamp = 0
            this.inventory = []
            this.clan = null
            return (async () => {
                if (verify === 'test')
                    this.verify = { id: 113049585880204162131, loginType: 0 }
                await this.loadUserData()
                return this
            })()
        }

        setUpLevel(value = 1) {
            this.level += value
            this.maxExp = this.getMaxExp()
        }

        setUpExp(value) {
            if (this.level > 200)
                return
            this.exp = Math.max(this.exp + value, 0)
            while (this.exp >= this.maxExp) {
                this.exp -= this.maxExp
                this.setUpLevel()
            }
        }

        getMaxExp(level = this.level) {
            return (Math.pow(level, 2) * (level * 5)) + 200
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
            if (User.users.some((u) => u.verify.id === verify.id && u.verify.loginType === verify.loginType))
                return
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
            if (!user || !user.name)
                throw new Error('존재하지 않는 계정입니다. : ' + user)
            const inventory = await DB.LoadInventorys(user.id)
            if (inventory) {
                this.inventory = inventory.map(i => ({
                    id: i.item_id,
                    num: i.num,
                    expiry: i.expiry
                }))
            }
            const clanMember = await DB.FindMyClanByUserId(user.id)
            if (clanMember)
                this.clan = Clan.clans[clanMember.clan_id]
            this.id = user.id
            this.rank = Data.rank.find(r => r.id === this.id).rank
            this.name = user.name
            this.sex = user.sex
            this.level = user.level
            this.exp = user.exp
            this.maxExp = this.getMaxExp()
            this.coin = user.coin
            this.cash = user.cash
            this.point = user.point
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
            if (this.clanId)
                return
            if (this.coin < 10000)
                return this.send(Serialize.MessageClan('NOT_ENOUGH_COIN'))
            if (name.length < 1 || name.length > 12)
                return this.send(Serialize.MessageClan('AN_IMPOSSIBLE_LENGTH'))
            if (name.match(/[^가-힣a-zA-Z0-9]+/))
                return this.send(Serialize.MessageClan('AN_IMPOSSIBLE_WORD'))
            if (!filtering.check(name))
                return this.send(Serialize.MessageClan('FILTERING'))
            const clan = await Clan.create(this.id, name)
            if (!clan)
                return
            this.coin -= 10000
            this.clan = clan
            let members = []
            for (let i = 0; i < this.clan.members.length; ++i) {
                const memberId = this.clan.members[i]
                members.push(await DB.FindUserClanInfoById(memberId))
            }
            members = await Promise.all(members)
            this.send(Serialize.GetClan(this.clan, members))
        }

        async inviteClan(name) {
            if (!this.clan)
                return
            const member = await DB.FindUserClanInfoById(this.id)
            if (!member)
                return
            if (member.clanLevel < 3)
                return this.send(Serialize.MessageClan('NO_PERMISSIONS'))
            const memberCount = this.clan.members.length
            if (memberCount >= 40)
                return this.send(Serialize.MessageClan('FULL_MEMBER'))
            if (memberCount >= this.clan.level * 10)
                return this.send(Serialize.MessageClan('LOW_LEVEL'))
            this.clan.invite(this, name)
        }

        async joinClan(id) {
            if (this.clan)
                return
            if (await Clan.get(id).enter(this.id)) {
                this.clan = Clan.get(id)
                this.getClan()
            }
        }

        async cancelClan(id) {
            await DB.DeleteInviteClan(id)
        }

        async kickClan(id) {
            if (!this.clan)
                return
            const member = await DB.FindUserClanInfoById(this.id)
            if (!member)
                return
            if (member.clanLevel < 4)
                return this.send(Serialize.MessageClan('NO_PERMISSIONS'))
            if (this.clan.masterId == id)
                return this.send(Serialize.MessageClan('AN_INIMITABLE_MEMBER'))
            this.clan.leave(id)
            const findUser = User.users.find(u => u.id === id)
            if (findUser)
                findUser.clan = null
            this.getClan()
        }

        async getClan() {
            if (!this.clan) {
                this.send(Serialize.GetClan())
                const invites = await DB.LoadInviteClans(this.id)
                this.send(Serialize.InviteClan(invites.map(i => ({
                    id: i.clan_id,
                    name: Clan.get(i.clan_id).name,
                }))))
                return
            }
            let members = []
            for (let i = 0; i < this.clan.members.length; ++i) {
                const memberId = this.clan.members[i]
                members.push(await DB.FindUserClanInfoById(memberId))
            }
            members = await Promise.all(members)
            this.send(Serialize.GetClan(this.clan, members))
        }

        async leaveClan() {
            if (!this.clan)
                return
            if (this.clan.masterId === this.id) {
                if (this.clan.members.length > 1)
                    return this.send(Serialize.MessageClan('MEMBER_STILL_EXISTS'))
                this.coin += this.clan.coin
            }
            this.clan.leave(this.id)
            this.clan = null
            this.send(Serialize.GetClan())
        }

        async setOptionClan(data) {
            if (!this.clan)
                return
            const member = await DB.FindUserClanInfoById(this.id)
            if (!member)
                return
            if (member.clanLevel < 4)
                return this.send(Serialize.MessageClan('NO_PERMISSIONS'))
            data.notice = data.notice.replace(/<br>/g, '\n')
            this.clan.setOption(data)
            this.getClan()
        }

        async payClan(data) {
            if (!this.clan)
                return
            data = Number(data)
            if (isNaN(data))
                return this.send(Serialize.MessageClan('WRONG_NUMBER'))
            if (data < 1)
                return this.send(Serialize.MessageClan('BELOW_STANDARD'))
            if (this.coin < data)
                return this.send(Serialize.MessageClan('NOT_ENOUGH_COIN'))
            this.clan.setUpCoin(data)
            this.coin -= data
            this.send(Serialize.UpdateClan(this.clan))
        }

        async donateClan(data) {
            if (!this.clan)
                return
            data = Number(data)
            if (isNaN(data))
                return this.send(Serialize.MessageClan('WRONG_NUMBER'))
            if (data < 1)
                return this.send(Serialize.MessageClan('BELOW_STANDARD'))
            if (this.exp < data)
                return this.send(Serialize.MessageClan('NOT_ENOUGH_EXP'))
            this.clan.setUpExp(data)
            this.setUpExp(-data)
            this.send(Serialize.UpdateClan(this.clan))
        }

        async withdrawClan(data) {
            if (!this.clan)
                return
            if (this.clan.masterId !== this.id)
                return this.send(Serialize.MessageClan('NO_PERMISSIONS'))
            data = Number(data)
            if (isNaN(data))
                return this.send(Serialize.MessageClan('WRONG_NUMBER'))
            if (data < 1)
                return this.send(Serialize.MessageClan('BELOW_STANDARD'))
            if (this.clan.coin < data)
                return this.send(Serialize.MessageClan('NOT_ENOUGH_CLAN_COIN'))
            this.clan.setUpCoin(-data)
            this.coin += data
            this.send(Serialize.UpdateClan(this.clan))
        }

        async levelUpClan() {
            if (!this.clan)
                return
            const member = await DB.FindUserClanInfoById(this.id)
            if (!member)
                return
            if (member.clanLevel < 4)
                return this.send(Serialize.MessageClan('NO_PERMISSIONS'))
            if (this.clan.level >= 4)
                return this.send(Serialize.MessageClan('HIGH_LEVEL'))
            const cost = (this.clan.level * this.clan.level) * 100000
            if (this.clan.coin < cost)
                return this.send(Serialize.MessageClan('NOT_ENOUGH_CLAN_COIN'))
            this.clan.setUpCoin(-cost)
            this.clan.setUpLevel()
        }

        async setUpMemberLevelClan(data) {
            if (!this.clan)
                return
            const member = await DB.FindUserClanInfoById(this.id)
            if (!member)
                return
            if (member.clanLevel < 4)
                return this.send(Serialize.MessageClan('NO_PERMISSIONS'))
            if (this.id === data)
                return this.send(Serialize.MessageClan('OWN_SELF'))
            if (this.clan.masterId === data)
                return this.send(Serialize.MessageClan('AN_INIMITABLE_MEMBER'))
            const targetMember = await DB.FindUserClanInfoById(data)
            if (!targetMember)
                return
            if (targetMember.clanLevel >= 4)
                return this.send(Serialize.MessageClan('LEVEL_LIMIT'))
            this.clan.setMemberLevel(data, targetMember.clanLevel + 1)
            this.send(Serialize.GetClan())
        }

        async setDownMemberLevelClan(data) {
            if (!this.clan)
                return
            const member = await DB.FindUserClanInfoById(this.id)
            if (!member)
                return
            if (member.clanLevel < 4)
                return this.send(Serialize.MessageClan('NO_PERMISSIONS'))
            if (this.id === data)
                return this.send(Serialize.MessageClan('OWN_SELF'))
            if (this.clan.masterId === data)
                return this.send(Serialize.MessageClan('AN_INIMITABLE_MEMBER'))
            const targetMember = await DB.FindUserClanInfoById(data)
            if (!targetMember)
                return
            if (member.clanLevel === targetMember.clanLevel)
                return this.send(Serialize.MessageClan('SAME_LEVEL_AS_ME'))
            if (targetMember.clanLevel <= 1)
                return this.send(Serialize.MessageClan('LEVEL_LIMIT'))
            this.clan.setMemberLevel(data, targetMember.clanLevel - 1)
            this.send(Serialize.GetClan())
        }

        async changeMasterClan(data) {
            if (!this.clan)
                return
            if (this.clan.masterId !== this.id)
                return this.send(Serialize.MessageClan('NO_PERMISSIONS'))
            if (this.id === data)
                return this.send(Serialize.MessageClan('OWN_SELF'))
            this.clan.changeMaster(this, data)
            this.send(Serialize.GetClan())
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

        async getBilling() {
            const items = await DB.LoadBilling(this.id)
            this.send(Serialize.GetBilling(items))
        }

        async getPayInfoItem(id) {
            const item = await DB.FindBilling(id, this.id)
            if (!item)
                return
            this.send(Serialize.GetPayInfoItem(item))
        }

        async useBilling(id) {
            const item = await DB.FindBilling(id, this.id)
            if (!item)
                return
            if (item.useState > 0)
                return this.send(Serialize.MessageShop('ALREADY_USED'))
            if (item.refundRequestState === 1)
                return this.send(Serialize.MessageShop('ALREADY_REQUESTED_REFUND'))
            if (item.refundRequestState === 2)
                return this.send(Serialize.MessageShop('ALREADY_REFUNDED'))
            if (item.allowState < 1)
                return this.send(Serialize.MessageShop('NOT_ALLOWED'))
            if (!await DB.UpdateBillingUseState(id, this.id))
                return this.send(Serialize.MessageShop('FAILED'))
            const cash = Number(item.productId)
            this.cash += cash
            this.send(Serialize.UpdateBilling(id, 1, 0))
            this.send(Serialize.UpdateCashAndCoin(this.cash, this.coin))
            this.send(Serialize.MessageShop('USE_SUCCESS'))
        }

        async refundBilling(id) {
            const item = await DB.FindBilling(id, this.id)
            if (!item)
                return
            if (item.useState > 0)
                return this.send(Serialize.MessageShop('ALREADY_USED'))
            if (item.refundRequestState === 1)
                return this.send(Serialize.MessageShop('ALREADY_REQUESTED_REFUND'))
            if (item.refundRequestState === 2)
                return this.send(Serialize.MessageShop('ALREADY_REFUNDED'))
            if (item.allowState < 1)
                return this.send(Serialize.MessageShop('NOT_ALLOWED'))
            const days = moment().diff(moment(item.purchaseDate), 'days')
            if (days >= 7)
                return this.send(Serialize.MessageShop('NON_REFUNDABLE'))
            if (!await DB.UpdateBillingRefundRequestState(id, this.id, 1))
                return this.send(Serialize.MessageShop('FAILED'))
            this.send(Serialize.UpdateBilling(id, 0, 1))
            this.send(Serialize.MessageShop('REQUEST_REFUND_SUCCESS'))
        }

        getShop(page) {
            const GET_COUNT = 15
            let items = []
            for (let i = ((page - 1) * GET_COUNT) + 1; i <= ((page - 1) * GET_COUNT) + GET_COUNT; ++i) {
                const item = Item.get(i)
                if (item)
                    items.push(item)
            }
            this.send(Serialize.GetShop(items))
        }

        getInfoItem(id) {
            const item = Item.get(id)
            if (!item)
                return
            if (item.type === 'SKIN') {
                const check = this.inventory.find(i => i.id === id)
                this.send(Serialize.GetSkinItem(item, check ? moment(check.expiry, 'YYYY-MM-DD HH:mm:ss').format('YYYY-MM-DD HH:mm:ss') : '-'))
            }
        }

        buyItem(data) {
            const item = Item.get(data.id)
            if (!item)
                return
            if (item.type === 'SKIN') {
                if (item.isCash) {
                    if (this.cash < (item.cost * data.days))
                        return this.send(Serialize.MessageShop('NOT_ENOUGH_CASH'))
                    this.cash -= item.cost * data.days
                } else {
                    if (this.coin < (item.cost * data.days))
                        return this.send(Serialize.MessageShop('NOT_ENOUGH_COIN'))
                    this.coin -= item.cost * data.days
                }
                const check = this.inventory.find(i => i.id === data.id)
                let date
                if (check) {
                    const min = moment().diff(moment(check.expiry), 'minutes')
                    date = moment(min > 0 ? new Date() : check.expiry, 'YYYY-MM-DD HH:mm:ss').add(data.days, 'days').format('YYYY-MM-DD HH:mm:ss')
                    check.expiry = date
                    this.send(Serialize.MessageShop('UPDATE_SUCCESS'))
                } else {
                    date = moment(new Date(), 'YYYY-MM-DD HH:mm:ss').add(data.days, 'days').format('YYYY-MM-DD HH:mm:ss')
                    this.addItem(data.id, 1, date)
                    this.send(Serialize.MessageShop('BUY_SUCCESS'))
                }
                this.blueGraphics = item.icon
                this.send(Serialize.UpdateCashAndCoin(this.cash, this.coin))
            }
        }

        addItem(id, num, expiry) {
            this.inventory.push({ id, num, expiry })
        }

        checkSkinExpiry() {
            this.inventory.map(i => {
                const item = Item.get(i.id)
                if (!item)
                    return
                if (item.type === 'SKIN' && item.icon === this.blueGraphics) {
                    const min = moment().diff(moment(i.expiry), 'minutes')
                    if (min > 0)
                        this.blueGraphics = 'Mania'
                }
            })
        }

        getSkinList() {
            let skins = []
            this.inventory.map(i => {
                const item = Item.get(i.id)
                if (!item)
                    return
                if (item.type === 'SKIN') {
                    const min = moment().diff(moment(i.expiry), 'minutes')
                    if (min < 0) {
                        skins.push({
                            id: i.id,
                            icon: item.icon,
                            name: item.name,
                            expiry: moment(i.expiry, 'YYYY-MM-DD HH:mm:ss').format('YYYY-MM-DD HH:mm:ss')
                        })
                    }
                }
            })
            this.send(Serialize.GetSkinList(skins))
        }

        getRank(page) {
            const GET_COUNT = 15
            let ranks = []
            for (let i = 0; i < Data.rank.length; ++i)
                ranks.push(Data.rank[i])
            this.send(Serialize.GetRank(ranks.splice((page - 1) * GET_COUNT, GET_COUNT)))
        }

        getUserInfoRank(id) {
            const user = Data.rank.find(r => r.id === id)
            this.send(Serialize.GetUserInfoRank(user, this.getMaxExp(user.level)))
        }

        setSkin(id) {
            if (id < 1)
                this.blueGraphics = 'Mania'
            else {
                const check = this.inventory.find(i => i.id === id)
                if (!check)
                    return
                const item = Item.get(id)
                if (!item)
                    return
                const min = moment().diff(moment(check.expiry), 'minutes')
                if (min > 0)
                    return
                this.blueGraphics = item.icon
            }
            this.send(Serialize.UserData(this))
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
            if (this.command(message))
                return
            const room = Room.get(this.roomId)
            if (!room)
                return
            message = message.substring(0, 35).replace(/</g, '&lt;').replace(/>/g, '&gt;')
            const now = new Date().getTime()
            if (this.lastChatTime.getTime() > now)
                return this.send(Serialize.SystemMessage('<color=red>운영진에 의해 채팅이 금지되었습니다.</color> (' + this.lastChatTime + ')'))
            let text = message.replace(/[^ㄱ-ㅎ가-힣]/g, '')
            if (!filtering.check(text)) {
                ++this.alert
                if (this.alert >= 5)
                    this.send(Serialize.QuitGame())
                else {
                    this.send(Serialize.Vibrate())
                    this.send(Serialize.SystemMessage('<color=red>금칙어를 언급하여 경고 ' + this.alert + '회를 받았습니다. 5회 이상시 자동 추방됩니다.</color>'))
                }
                return
            }
            console.log(this.name + '(#' + this.roomId + '@' + this.place + '): ' + message)
            switch (room.type) {
                case RoomType.GAME:
                    if (this.game.team === TeamType.RED)
                        this.redChat(message)
                    else
                        this.blueChat(message)
                    break
                case RoomType.PLAYGROUND:
                    this.publish(Serialize.ChatMessage(this.type, this.index, this.name, message))
                    break
            }
        }

        command(message) {
            if (this.admin < 1)
                return false
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
                    if (piece.length <= 1)
                        return true
                    target = Room.get(this.roomId).users.find(u => u.name === piece[1])
                    if (!target)
                        return true
                    if (piece.length <= 2)
                        this.teleport(target.place, target.x, target.y)
                    else {
                        const target2 = Room.get(this.roomId).users.find(u => u.name === piece[2])
                        if (target2)
                            target2.teleport(target.place, target.x, target.y)
                    }
                    break
                case '!보석':
                    if (piece.length <= 1) {
                        this.send(Serialize.SystemMessage('<color=red>!보석,지급 개수 (1 ~ 10000)</color>'))
                        return true
                    }
                    cash = Number(piece[1])
                    if (cash < 1 || cash > 10000)
                        cash = 1
                    for (const user of User.users) {
                        user.cash += cash
                        user.send(Serialize.SystemMessage('<color=#FFC90E>' + this.name + '님께서 보석 ' + cash + '개를 지급해주셨습니다!!!</color>'))
                    }
                    break
                case '!채금':
                    if (piece.length <= 2) {
                        this.send(Serialize.SystemMessage('<color=red>!채금,닉네임,일 단위 (1 ~ 3650)</color>'))
                        return true
                    }
                    name = piece[1]
                    days = piece.length > 2 ? Number(piece[2]) : 3650
                    if (days < 1 || days > 3650)
                        days = 3650
                    target = User.users.find(u => u.name === name)
                    if (target) {
                        const d = new Date()
                        d.setDate(d.getDate() + days)
                        target.lastChatTime = d
                        target.send(Serialize.SystemMessage('<color=red>운영진에 의해 채팅이 금지되었습니다.</color>'))
                        this.send(Serialize.SystemMessage('<color=red>' + name + (pix.maker(name) ? '를' : '을') + ' ' + days + '일 동안 채팅을 금지함.</color>'))
                    } else
                        this.send(Serialize.SystemMessage('<color=red>' + name + (pix.maker(name) ? '는' : '은') + ' 접속하지 않았거나 존재하지 않음.</color>'))
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
                    } else
                        this.send(Serialize.SystemMessage('<color=red>' + name + (pix.maker(name) ? '는' : '은') + ' 접속하지 않았거나 존재하지 않음.</color>'))
                    break
                case '!차단':
                    if (piece.length <= 2) {
                        this.send(Serialize.SystemMessage('<color=red>!차단,닉네임,욕설 사용,일 단위 (1 ~ 3650)</color>'))
                        return true
                    }
                    name = piece[1]
                    description = piece[2]
                    days = piece.length > 2 ? Number(piece[3]) : 3650
                    if (days < 1 || days > 3650)
                        days = 3650
                    target = User.users.find(u => u.name === name)
                    if (target)
                        this.ban(target, name, description, days)
                    else
                        this.send(Serialize.ChatMessage(null, null, null, '<color=red>' + name + (pix.maker(name) ? '는' : '은') + ' 접속하지 않았거나 존재하지 않음.</color>'))
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
                        if (description !== '')
                            target.memo = description
                        this.send(Serialize.SystemMessage('<color=#FFC90E>' + name + '#메모: </color>' + target.memo))
                    } else
                        this.send(Serialize.SystemMessage('<color=red>' + name + (pix.maker(name) ? '는' : '은') + ' 접속하지 않았거나 존재하지 않음.</color>'))
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
            if (this.roomId)
                return
            this.timestamp = 0
            this.speedhackrate = 0
            this.setState('Basic')
            this.send(Serialize.LeaveWardrobe())
            let room = Room.available(type)
            if (!room)
                room = Room.create(type)
            room.join(this)
        }

        leave() {
            if (!this.roomId)
                return
            Room.get(this.roomId).leave(this)
        }

        hit() {
            if (!this.roomId)
                return
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
            if (!this.roomId)
                return
            Room.get(this.roomId).teleport(this, place, x, y)
        }

        result(ad) {
            if (!this.game.result)
                return
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
                logger.log('유저 정보 저장 실패 ' + JSON.stringify(user.getJSON()))
            if (this.inventory.length > 0) {
                if (!await DB.DeleteInventory(this.id))
                    logger.log('유저 인벤토리 삭제 실패 ' + JSON.stringify(user.getJSON()))
                if (!await DB.InsertInventory(this.id, this.inventory))
                    logger.log('유저 인벤토리 저장 실패 ' + JSON.stringify(user.getJSON()))
            }
        }

        send(data) {
            if (this.socket.readyState === 1)
                this.socket.send(data)
        }

        notice(data) {
            const users = User.users
            for (const user of users)
                user.send(data)
        }

        publish(data) {
            if (!this.roomId)
                return
            Room.get(this.roomId).publish(data)
        }

        broadcast(data) {
            if (!this.roomId)
                return
            Room.get(this.roomId).broadcast(this, data)
        }

        broadcastToMap(data) {
            if (!this.roomId)
                return
            Room.get(this.roomId).broadcastToMap(this, data)
        }

        publishToMap(data) {
            if (!this.roomId)
                return
            Room.get(this.roomId).publishToMap(this.place, data)
        }
    }
})()