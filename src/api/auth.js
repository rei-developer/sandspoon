const Router = require('koa-router')
const jwt = require('jsonwebtoken')
const config = require('../config')
const DB = require('../DB')
const router = new Router()
const https = require('https')
const filtering = require('../filtering-text')

const VERSION = config.VERSION

const OAUTH_ID = { GOOGLE: '112494846092-ar8ml4nm16mr7bhd3cekb87846fr5k0e.apps.googleusercontent.com' }
const LOGIN_TYPE = { GOOGLE: 0 }

function verifyGoogle(token) {
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

function issueToken(key, data) {
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

async function findUser({ id, loginType }) {
    try {
        const users = await DB.query('SELECT * FROM users WHERE `uid` = ? AND `login_type` = ?', [id, loginType])
        return users[0]
    } catch (e) {
        throw e
    }
}

async function registerUser({ id, loginType, name }) {
    try {
        await DB.query('INSERT INTO users (`uid`, `login_type`, `name`) VALUES (?, ?, ?)', [id, loginType, name])
    } catch (e) {
        throw e
    }
}

async function blockedUser(uuid) {
    try {
        const users = await DB.query('SELECT * FROM blocks WHERE `uuid` = ? AND date > DATE(NOW())', [uuid])
        return users[0]
    } catch (e) {
        throw e
    }
}

async function blockedUser2(loginType, uid) {
    try {
        const users = await DB.query('SELECT * FROM blocks WHERE `login_type` = ? AND `uid` = ? AND date > DATE(NOW())', [loginType, uid])
        return users[0]
    } catch (e) {
        throw e
    }
}

function verifyToken(key, token) {
    return new Promise((resolve, reject) => {
        jwt.verify(token, key, (err, decode) => {
            if (err)
                reject(new Error('FAILED'))
            resolve(decode)
        })
    })
}

async function verifyUser({ id, name, loginType }) {
    try {
        await DB.query('UPDATE users SET `name` = ?, `verify` = 1 WHERE `uid` = ? AND `login_type` = ?', [name, id, loginType])
    } catch (e) {
        throw new Error('RE_REQUEST')
    }
}

router.post('/verify/register', async ctx => {
    try {
        const { token, name } = ctx.request.body
        const verify = await verifyToken(config.KEY, token)
        const user = await findUser(verify)
        if (/[^가-힣]/.test(name)) throw new Error('FAILED')
        if (user.verify === 0) {
            if (!filtering.check(name))
                throw new Error('UNAVAILABLE_NAME')
            await verifyUser(Object.assign(verify, { name }))
            ctx.body = 'LOGIN_SUCCESS'
        } else {
            throw new Error('FAILED')
        }
    } catch (e) {
        ctx.body = e.message
    }
})

router.post('/verify/google', async ctx => {
    try {
        const { token, uuid, version } = ctx.request.body
        if (version !== VERSION)
            return ctx.body = { status: 'NOT_UPDATED', version: VERSION }
        const blocked = await blockedUser(uuid)
        if (blocked)
            return ctx.body = { status: 'BLOCKED', date: blocked.date, description: blocked.description }
        const verify = await verifyGoogle(token)
        if (verify.aud === OAUTH_ID.GOOGLE) {
            const data = {
                id: verify.sub,
                loginType: LOGIN_TYPE.GOOGLE,
                name: verify.name,
                uuid
            }
            const blocked2 = await blockedUser2(data.loginType, data.id)
            if (blocked2)
                return ctx.body = { status: 'BLOCKED', date: blocked2.date, description: blocked2.description }
            const user = await findUser(data)
            const my = await issueToken(config.KEY, data)
            if (!user) {
                await registerUser(data)
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