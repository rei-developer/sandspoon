const DB = require('./DB')
const GameMap = require('./GameMap')

module.exports = (function () {
    const _static = {
        rank: new Proxy({}, {
            get: function (target, name) {
                return target.hasOwnProperty(name) ? target[name] : { rank: 0, level: 0 }
            }
        }),
        rankKeys: []
    }
    return class Data {
        static async loadData() {
            await Data.loadMaps(257)
            await Data.loadRanks()
            await Data.loadClans()
        }

        static async loadMaps(count) {
            console.log('맵 로딩중...')

            for (let i = 1; i <= count; ++i) {
                const map = await GameMap.load(i)
                GameMap.add(map)
            }

            console.log('맵 로딩 완료.')
        }

        static async loadClans() {
            console.log('클랜 로딩중...')

            const clans = await DB.LoadClans()
            for (let i = 0; i < clans.length; ++i) {
                const clanData = clans[i]
                const clan = new Clan(
                    clanData.id,
                    clanData.master_id,
                    clanData.name,
                    clanData.level1_name,
                    clanData.level2_name,
                    clanData.level3_name,
                    clanData.level4_name,
                    clanData.level5_name,
                    clanData.notice,
                    clanData.level,
                    clanData.exp,
                    clanData.coin,
                    new Date(clanData.regdate),
                    clanData.condition
                )
                const clanmembers = await DB.GetClanMembers(clan.id)

                for (let j = 0; j < clanmembers.length; ++j) {
                    clan.members.push(clanmembers[j].user_id)
                }
                Clan.clans[clan.id] = clan
            }

            console.log('클랜 로딩 완료.')
        }

        static async loadRanks() {
            console.log('랭킹 로딩중...')

            let users = await DB.LoadRanks()
            let rankNum = 0
            for (const user of users) {
                if (user.admin == 0) Data.rankKeys.push(user.name)
                Data.rank[user.name] = { rank: user.admin > 0 ? 0 : ++rankNum, level: user.level }
            }

            console.log('랭킹 로딩 완료.')
        }

        static get rank() {
            return _static.rank
        }

        static get rankKeys() {
            return _static.rankKeys
        }
    }
})()

/*const DB = require('./DB')
const GameMap = require('./GameMap')

module.exports = (function () {
    const _static = {
        rank: new Proxy({}, {
            get: function (target, name) {
                return target.hasOwnProperty(name) ? target[name] : { rank: 0, level: 0 }
            }
        }),
        rankKeys: []
    }
    return class Data {
        static async loadData () {
            await Data.loadMaps(257)
            await Data.loadRanks()
            await Data.loadClans()
        }

        static async loadMaps (count) {
            console.log('맵 로딩중...')

            for (let i = 1; i <= count; ++i) {
                const map = await GameMap.load(i)
                GameMap.add(map)
            }

            console.log('맵 로딩 완료.')
        }

        static async loadClans () {
            console.log('클랜 로딩중...')

            const clans = await DB.LoadClans()
            for (let i = 0; i < clans.length; ++i) {
                const clanData = clans[i]
                const clan = new Clan(clanData.id, clanData.master_id, clanData.name, clanData.level, clanData.exp, clanData.coin, new Date(clanData.regdate))
                const clanmembers = await DB.GetClanMembers(clan.id)
                for (let j = 0; j < clanmembers.length; ++j) {
                    clan.members.push(clanmembers[j].user_id)
                }
                Clan.clans[clan.id] = clan
            }

            console.log('클랜 로딩 완료.')
        }

        static async loadRanks () {
            console.log('랭킹 로딩중...')

            let users = await DB.LoadRanks()
            let rankNum = 0
            for (const user of users) {
                if (user.admin == 0) Data.rankKeys.push(user.name)
                Data.rank[user.name] = { rank: user.admin > 0 ? 0 : ++rankNum, level: user.level }
            }

            console.log('랭킹 로딩 완료.')
        }

        static get rank () {
            return _static.rank
        }

        static get rankKeys() {
            return _static.rankKeys
        }
    }
})()*/