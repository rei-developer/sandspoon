const Router = require('koa-router')
const request = require('request')
const qs = require('querystring')
const DB = require('../DB')
const router = new Router()

const CLIENT_ID = '403199035553-ptrj3m550enl3jdskim8i5be8maua98f.apps.googleusercontent.com'
const CLIENT_SECRET = 'xsAkSHcdp0CuTnYnnor9vP5f'
const REDIRECT_URL = 'https://www.sandspoon.com/androidpublisher/exchange_token'

let recentlyToken = ''

async function CreateBilling({ userId, transactionId, productId, token, date }) {
    try {
        const result = await DB.query('INSERT INTO billings (`userId`, `transactionId`, `productId`, `purchaseToken`, `purchaseDate`) VALUES (?, ?, ?, ?, STR_TO_DATE(?, "%m/%d/%Y %H:%i:%s"))', [userId, transactionId, productId, token, date])
        return result.insertId
    } catch (e) {
        throw e
    }
}

async function UpdateBilling(id) {
    try {
        await DB.query('UPDATE billings SET `allowState` = 1 WHERE `id` = ?', [id])
        return true
    } catch (e) {
        throw e
    }
}

router.get('/androidpublisher/check_server', ctx => ctx.body = { status: recentlyToken === '' ? 'FAILED' : 'SUCCESS' })

router.get('/androidpublisher/get_code', ctx => {
    const url = 'https://accounts.google.com/o/oauth2/v2/auth'
    const scope = 'https://www.googleapis.com/auth/androidpublisher'
    const codeUrl = url
        + `?scope=${qs.escape(scope)}`
        + `&access_type=offline`
        + `&redirect_uri=${qs.escape(REDIRECT_URL)}`
        + `&response_type=code`
        + `&client_id=${CLIENT_ID}`
    ctx.redirect(codeUrl)
})

router.get('/androidpublisher/exchange_token', async ctx => {
    const form = {
        grant_type: 'authorization_code',
        code: ctx.query.code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URL
    }
    try {
        const result = await new Promise((resolve, reject) => {
            request.post('https://www.googleapis.com/oauth2/v4/token', { form }, (err, response, body) => {
                if (err)
                    return reject({ message: err, status: 'FAILED' })
                const data = JSON.parse(body)
                recentlyToken = data.access_token
                resolve({ recentlyToken, status: 'SUCCESS' })
            })
        })
        ctx.body = result
    } catch (e) {
        console.log(e)
        ctx.body = e
    }
})

router.get('/androidpublisher/validate_purchase', async ctx => {
    const packageName = 'com.sandspoons.detective'
    const {
        userId,
        transactionId,
        productId,
        token,
        date
    } = ctx.query
    const billingId = await CreateBilling({ userId, transactionId, productId, token, date })
    if (!billingId)
        return ctx.body = { message: '영수증 발행 도중 문제가 발생했습니다. 고객센터에 문의해주세요.', status: 'FAILED' }
    const url = `https://www.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/products/${productId}/tokens/${token}?access_token=${recentlyToken}`
    try {
        const result = await new Promise((resolve, reject) => {
            request.get(url, async (err, response, body) => {
                if (err)
                    return reject({ message: err, status: 'FAILED' })
                const data = JSON.parse(body)
                if (!data.orderId || data.orderId !== transactionId || data.purchaseState > 0)
                    return reject({ message: '유효하지 않은 영수증입니다.', status: 'FAILED' })
                if (!await UpdateBilling(billingId))
                    return reject({ message: '영수증 발행 허가 도중 문제가 발생했습니다. 고객센터에 문의해주세요.', status: 'FAILED' })
                resolve({ status: 'SUCCESS' })
            })
        })
        ctx.body = result
    } catch (e) {
        console.log(e)
        ctx.body = e
    }
})

module.exports = router