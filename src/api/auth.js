const Router = require('koa-router')
const DB = require('../DB')
const router = new Router()
const https = require('https')
const jwt = require('jsonwebtoken')
const filtering = require('../util/filtering-text')
const config = require('../config')
const dotenv = require('dotenv')

dotenv.config()

const { KEY } = process.env

const OAUTH_ID = { GOOGLE: '112494846092-ar8ml4nm16mr7bhd3cekb87846fr5k0e.apps.googleusercontent.com' }
const LOGIN_TYPE = { GOOGLE: 0 }

function VerifyGoogle(token) {
    const option = {
        host: 'www.googleapis.com',
        path: '/oauth2/v3/tokeninfo?id_token=' + token
    }
    return new Promise((resolve, reject) => {
        https.get(option, res => {
            res.setEncoding('utf8')
            let data = ''
            res.on('data', chunk => {
                data += chunk
            })
            res.on('end', () => {
                resolve(JSON.parse(data))
            })
        }).on('error', e => {
            reject(e)
        })
    })
}

function IssueToken(key, data) {
    return new Promise((resolve, reject) => {
        jwt.sign(data, key, {
            expiresIn: '1d',
            subject: 'user'
        }, (err, token) => {
            if (err)
                reject(err)
            resolve(token)
        })
    })
}

async function FindUser({ id, loginType }) {
    try {
        const users = await DB.query('SELECT * FROM users WHERE `uid` = ? AND `login_type` = ?', [id, loginType])
        return users[0]
    } catch (e) {
        throw e
    }
}

async function FindUserById(id) {
    try {
        const users = await this.query('SELECT id, name FROM users WHERE `id` = ?', [id])
        return users[0]
    } catch (e) {
        throw e
    }
}

async function RegisterUser({ id, loginType, name }) {
    try {
        await DB.query('INSERT INTO users (`uid`, `login_type`, `name`) VALUES (?, ?, ?)', [id, loginType, name])
    } catch (e) {
        throw e
    }
}

async function BlockedUserByUUID(uuid) {
    try {
        const users = await DB.query('SELECT * FROM blocks WHERE `uuid` = ? AND `date` > DATE(NOW())', [uuid])
        return users[0]
    } catch (e) {
        throw e
    }
}

async function BlockedUserByUID(loginType, uid) {
    try {
        const users = await DB.query('SELECT * FROM blocks WHERE `login_type` = ? AND `uid` = ? AND `date` > DATE(NOW())', [loginType, uid])
        return users[0]
    } catch (e) {
        throw e
    }
}

function VerifyToken(key, token) {
    return new Promise((resolve, reject) => {
        jwt.verify(token, key, (err, decode) => {
            if (err)
                reject(new Error('FAILED'))
            resolve(decode)
        })
    })
}

async function VerifyUser({ id, name, loginType }) {
    try {
        await DB.query('UPDATE users SET `name` = ?, `verify` = 1 WHERE `uid` = ? AND `login_type` = ?', [name, id, loginType])
    } catch (e) {
        throw new Error('RE_REQUEST')
    }
}

async function InsertNoticeMessage(userId, targetId, title, content, cash) {
    try {
        await this.query('INSERT INTO notice_messages (`user_id`, `target_id`, `title`, `content`, `cash`) VALUES (?, ?, ?, ?, ?)', [userId, targetId, title, content, cash])
        return true
    } catch (e) {
        throw e
    }
}

router.post('/register', async ctx => {
    try {
        const { token, name, recommend } = ctx.request.body
        const verify = await VerifyToken(KEY, token)
        const user = await FindUser(verify)
        if (/[^가-힣]/.test(name))
            throw new Error('FAILED')
        if (user.verify === 0) {
            if (!filtering.check(name))
                throw new Error('UNAVAILABLE_NAME')
            await VerifyUser(Object.assign(verify, { name }))
            if (recommend && recommend !== '') {
                const recommendId = Number(recommend)
                if (!isNaN(recommendId) && recommendId > 0) {
                    const target = await FindUserById(recommendId)
                    if (target) {
                        await InsertNoticeMessage(user.id, target.id, '추천인 가입 보석 지급 안내', `안녕하세요?<br><br>[${target.name}]님의 추천으로 추천인 가입을 통해 계정을 생성하셨기 때문에 보석 20개를 지급해드립니다.`, 20)
                        await InsertNoticeMessage(target.id, user.id, '추천인 가입 보석 지급 안내', `안녕하세요?<br><br>[${name}]님께서 추천인 가입을 통해 계정을 생성하셨기 때문에 보석 50개를 지급해드립니다.<br><br><color=red>(추천인 코드를 절대 악용하지 마세요. 운영진이 로그를 통해 모두 확인이 가능합니다. 부정 수급 또는 어뷰징 행위시 계정이 정지될 수 있습니다.)</color>`, 50)
                    }
                }
            }
            ctx.body = 'LOGIN_SUCCESS'
        } else {
            throw new Error('FAILED')
        }
    } catch (e) {
        ctx.body = e.message
    }
})

router.post('/google', async ctx => {
    try {
        const { token, uuid, version } = ctx.request.body
        if (version && version < config.VERSION)
            return ctx.body = { status: 'NOT_UPDATED', version: config.VERSION }
        const blocked = await BlockedUserByUUID(uuid)
        if (blocked)
            return ctx.body = { status: 'BLOCKED', date: blocked.date, description: blocked.description }
        const verify = await VerifyGoogle(token)
        if (verify.aud === OAUTH_ID.GOOGLE) {
            const data = {
                id: verify.sub,
                loginType: LOGIN_TYPE.GOOGLE,
                name: verify.name,
                uuid
            }
            const blocked2 = await BlockedUserByUID(data.loginType, data.id)
            if (blocked2)
                return ctx.body = { status: 'BLOCKED', date: blocked2.date, description: blocked2.description }
            const user = await FindUser(data)
            const my = await IssueToken(KEY, data)
            if (!user) {
                await RegisterUser(data)
                ctx.body = {
                    status: 'REGISTER_SUCCESS',
                    token: my
                }
            } else if (user.verify === 0) {
                ctx.body = {
                    status: 'REGISTER_SUCCESS',
                    token: my
                }
            } else {
                ctx.body = {
                    status: 'LOGIN_SUCCESS',
                    token: my
                }
            }
        }
    } catch (e) {
        ctx.body = { status: 'FAILED' }
    }
})

module.exports = router