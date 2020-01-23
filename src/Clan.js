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
            level1_name = '',
            level2_name = '',
            level3_name = '',
            level4_name = '',
            level5_name = '',
            notice = '',
            level = 0,
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

        async invite(userId, targetName) {
            const target = await DB.FindUserByName(targetName)
            if (target && target.id) {
                if (this.members.find(m => m.id === target.id))
                    return
                if (await DB.FindMyClanByUserId(target.id))
                    return
                await DB.InviteClan(this.id, userId, target.id)
            }
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
                        delete Clan.clans[this.id]
                        DB.DeleteClan(this.id)
                    }
                }
            }
        }
    }
})()