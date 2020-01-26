const mysql = require('promise-mysql')
const config = require("./config")

const pool = mysql.createPool({
    host: 'sandspoon.com',
    port: 3306,
    user: 'root',
    password: config.SECRET,
    database: 'sandspoon',
    connectionLimit: 100
})

module.exports = {
    async query(...args) {
        const conn = await pool.getConnection()
        try {
            return await conn.query(...args)
        } catch (e) {
            throw e
        } finally {
            conn.release()
        }
    },
    async LoadPortals(id) {
        try {
            return await this.query('SELECT * FROM portals WHERE place = ?', [id])
        } catch (e) {
            console.error(e)
        }
    },
    async LoadClans() {
        try {
            return await this.query('SELECT * FROM clans')
        } catch (e) {
            console.error(e)
        }
    },
    async LoadRanks() {
        try {
            return await this.query('SELECT name, level, exp, admin FROM users WHERE verify = 1 ORDER BY point DESC')
        } catch (e) {
            console.error(e)
        }
    },
    async FindUserById(id) {
        try {
            const [row] = await this.query("SELECT * FROM users WHERE id = ?", [id])
            return row
        } catch (e) {
            console.error(e)
        }
    },
    async FindUserClanInfoById(id) {
        try {
            const [row] = await this.query(
                `SELECT
                    u.id,
                    u.name,
                    u.level,
                    u.blue_graphics avatar,
                    date_format(u.updated, '%Y-%m-%d') updated,
                    cm.level clanLevel,
                    cm.exp clanExp,
                    cm.coin clanCoin,
                    date_format(cm.regdate, '%Y-%m-%d') clanRegdate
                FROM users u
                LEFT JOIN clan_members cm ON cm.user_id = u.id
                WHERE u.id = ?`
                , [id])
            return row
        } catch (e) {
            console.error(e)
        }
    },
    async FindUserByOauth(uid, loginType) {
        try {
            const [row] = await this.query("SELECT * FROM users WHERE uid = ? AND login_type = ?", [uid, loginType])
            return row
        } catch (e) {
            console.error(e)
        }
    },
    async FindUserByName(name) {
        try {
            const [row] = await this.query("SELECT * FROM users WHERE name = ?", [name])
            return row
        } catch (e) {
            console.error(e)
        }
    },
    async UpdateUser(user) {
        try {
            await this.query('UPDATE users SET `uuid` = ?, `level` = ?, `exp` = ?, `coin` = ?, `cash` = ?, `point` = ?, `kill` = ?, `death` = ?, `assist` = ?, `blast` = ?, `rescue` = ?, `rescue_combo` = ?, `survive` = ?, `escape` = ?, `red_graphics` = ?, `blue_graphics` = ?, `memo` = ?, `last_chat` = ? WHERE `id` = ?', [
                user.verify.uuid,
                user.level,
                user.exp,
                user.coin,
                user.cash,
                user.point,
                user.kill,
                user.death,
                user.assist,
                user.blast,
                user.rescue,
                user.rescueCombo,
                user.survive,
                user.escape,
                user.redGraphics,
                user.blueGraphics,
                user.memo,
                user.lastChatTime,
                user.id
            ])
            return true
        } catch (e) {
            console.error(e)
        }
    },
    async UpdateClanOption(clanId, data) {
        try {
            await this.query('UPDATE clans SET `notice` = ?, `level1_name` = ?, `level2_name` = ?, `level3_name` = ?, `level4_name` = ?, `level5_name` = ? WHERE `id` = ?', [
                data.notice,
                data.level[0],
                data.level[1],
                data.level[2],
                data.level[3],
                data.level[4],
                clanId
            ])
            return true
        } catch (e) {
            console.error(e)
        }
    },
    async UpdateClanLevel(clanId, level) {
        try {
            await this.query('UPDATE clans SET `level` = ? WHERE `id` = ?', [level, clanId])
            return true
        } catch (e) {
            console.error(e)
        }
    },
    async UpdateClanExp(clanId, exp) {
        try {
            await this.query('UPDATE clans SET `exp` = ? WHERE `id` = ?', [exp, clanId])
            return true
        } catch (e) {
            console.error(e)
        }
    },
    async UpdateClanCoin(clanId, coin) {
        try {
            await this.query('UPDATE clans SET `coin` = ? WHERE `id` = ?', [coin, clanId])
            return true
        } catch (e) {
            console.error(e)
        }
    },
    async UpdateClanMemberLevel(clanId, userId, level) {
        try {
            await this.query('UPDATE clan_members SET `level` = ? WHERE `clan_id` = ? AND `user_id` = ?', [level, clanId, userId])
            return true
        } catch (e) {
            console.error(e)
        }
    },
    async UpdateClanMasterLevel(clanId, userId) {
        try {
            await this.query('UPDATE clans SET `master_id` = ? WHERE `id` = ?', [userId, clanId])
            return true
        } catch (e) {
            console.error(e)
        }
    },
    async FindMyClanByUserId(id) {
        try {
            const [row] = await this.query('SELECT * FROM clan_members WHERE user_id = ?', [id])
            return row
        } catch (e) {
            console.error(e)
        }
    },
    async GetClanMembers(clanId) {
        try {
            return await this.query('SELECT * FROM clan_members WHERE clan_id = ?', [clanId])
        } catch (e) {
            console.error(e)
        }
    },
    async CreateClan(masterId, clanname) {
        const conn = await pool.getConnection()
        try {
            await conn.beginTransaction()
            const row = await conn.query('INSERT INTO clans (master_id, name) VALUES (?, ?)', [masterId, clanname])
            await conn.query('INSERT INTO clan_members (clan_id, user_id, level) VALUES (?, ?, ?)', [row.insertId, masterId, 5])
            await conn.commit()
            return row
        } catch (e) {
            await conn.rollback()
            console.error(e)
        } finally {
            conn.release()
        }
    },
    async FindInviteClan(clanId, userId) {
        try {
            return await this.query('SELECT * FROM invite_clans WHERE clan_id = ? AND target_id = ?', [clanId, userId])
        } catch (e) {
            console.error(e)
        }
    },
    async ClearInviteClan(userId) {
        try {
            await this.query('DELETE FROM invite_clans WHERE target_id = ?', [userId])
        } catch (e) {
            console.error(e)
        }
    },
    async GetInviteClans(userId) {
        try {
            return await this.query('SELECT * FROM invite_clans WHERE target_id = ?', [userId])
        } catch (e) {
            console.error(e)
        }
    },
    async InviteClan(clanId, userId, targetId) {
        try {
            await this.query('INSERT INTO invite_clans (clan_id, user_id, target_id) VALUES (?, ?, ?)', [clanId, userId, targetId])
            return true
        } catch (e) {
            console.error(e)
        }
    },

    async EnterClan(clanId, userId) {
        try {
            await this.query('INSERT INTO clan_members (clan_id, user_id) VALUES (?, ?)', [clanId, userId])
            return true
        } catch (e) {
            console.error(e)
        }
    },
    async LeaveClan(userId) {
        try {
            await this.query('DELETE FROM clan_members WHERE user_id = ?', [userId])
            return true
        } catch (e) {
            console.error(e)
        }
    },
    async DeleteInviteClan(clanId) {
        try {
            await this.query('DELETE FROM invite_clans WHERE clan_id = ?', [clanId])
            return true
        } catch (e) {
            console.error(e)
        }
    },
    async DeleteClan(clanId) {
        try {
            await this.query('DELETE FROM clans WHERE id = ?', [clanId])
            return true
        } catch (e) {
            console.error(e)
        }
    },
    async InsertBlock(uid, uuid, loginType, description, date) {
        try {
            await this.query('INSERT INTO blocks (login_type, uid, uuid, description, date) VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))', [loginType, uid, uuid, description, date])
            return true
        } catch (e) {
            console.error(e)
        }
    }
}