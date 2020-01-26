const Serialize = require('./protocol/Serialize')
const DB = require('./DB')

global.Clan = (function () {
    const _static = {
        clans: {},
    }

    return class Clan {
        static get clans() {
            return _static.clans
        }

        static add(clan) {
            Clan.clans[clan.id] = clan
        }

        static async create(userId, clanname) {
            const clanData = await DB.CreateClan(userId, clanname)
            if (clanData) {
                const clan = new Clan(clanData.insertId, userId, clanname)
                clan.members.push(userId)
                Clan.add(clan)
                return clan
            }
        }

        static get(id) {
            return Clan.clans[id]
        }

        constructor(
            id = 0,
            masterId = 0,
            name = '',
            level1_name = '신입',
            level2_name = '클랜원',
            level3_name = '간부',
            level4_name = '부마스터',
            level5_name = '마스터',
            notice = '',
            level = 1,
            exp = 0,
            coin = 0,
            regdate = 0,
            condition = 0,
            members = []
        ) {
            this.id = id
            this.masterId = masterId
            this.name = name
            this.level1_name = level1_name
            this.level2_name = level2_name
            this.level3_name = level3_name
            this.level4_name = level4_name
            this.level5_name = level5_name
            this.notice = notice
            this.level = level
            this.exp = exp
            this.coin = coin
            this.regdate = regdate
            this.condition = condition
            this.members = members
            this.room = null
        }

        async invite(user, targetName) {
            const target = await DB.FindUserByName(targetName)
            if (!target || !target.id)
                return user.send(Serialize.MessageClan('NON_EXISTENT_USER'))
            if (this.members.find(m => m.id === target.id))
                return user.send(Serialize.MessageClan('ALREADY_EXISTING_MEMBER'))
            if (await DB.FindMyClanByUserId(target.id))
                return user.send(Serialize.MessageClan('ALREADY_SUBSCRIBED_MEMBER'))
            await DB.InviteClan(this.id, user.id, target.id)
        }

        async enter(userId) {
            const findIndex = this.members.indexOf(userId)
            if (findIndex === -1) {
                if (await DB.FindInviteClan(this.id, userId)) {
                    await DB.ClearInviteClan(userId)
                    if (await DB.EnterClan(this.id, userId)) {
                        this.members.push(userId)
                        return true
                    }
                }
            }
            return false
        }

        async leave(userId) {
            const findIndex = this.members.indexOf(userId)
            if (findIndex !== -1) {
                if (await DB.LeaveClan(userId)) {
                    this.members.splice(findIndex, 1)
                    if (!this.members.length) {
                        await DB.DeleteClan(this.id)
                        delete Clan.clans[this.id]
                    }
                }
            }
        }

        async setUpLevel() {
            this.level += 1
            await DB.UpdateClanLevel(this.id, this.level)
        }

        async setMemberLevel(userId, level) {
            const findIndex = this.members.indexOf(userId)
            if (findIndex !== -1) {
                await DB.UpdateClanMemberLevel(this.id, userId, level)
            }
        }

        async changeMaster(userId, targetId) {
            const findIndex = this.members.indexOf(userId)
            const findTargetIndex = this.members.indexOf(targetId)
            if (findIndex !== -1 || findTargetIndex !== -1) {
                this.masterId = targetId
                await DB.UpdateClanMemberLevel(this.id, userId, 2)
                await DB.UpdateClanMemberLevel(this.id, targetId, 5)
                await DB.UpdateClanMasterLevel(this.id, targetId)
            }
        }

        async setUpCoin(coin) {
            this.coin += coin
            await DB.UpdateClanCoin(this.id, this.coin)
        }

        async setOption(data) {
            this.notice = data.notice
            if (data.level[0] !== "")
                this.level1_name = data.level[0]
            if (data.level[1] !== "")
                this.level2_name = data.level[1]
            if (data.level[2] !== "")
                this.level3_name = data.level[2]
            if (data.level[3] !== "")
                this.level4_name = data.level[3]
            if (data.level[4] !== "")
                this.level5_name = data.level[4]
            await DB.UpdateClanOption(this.id, data)
        }
    }
})()