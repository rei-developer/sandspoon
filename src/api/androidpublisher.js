const Router = require('koa-router')
const DB = require('../DB')
const request = require('request')
const { google } = require('googleapis')
const OAuth2 = google.auth.OAuth2
const router = new Router()
const dotenv = require('dotenv')

dotenv.config()

const { CLIENT_ID, CLIENT_SECRET, REDIRECT_URL } = process.env

const scopes = ['https://www.googleapis.com/auth/androidpublisher']
const min30 = 30 * 60 * 1000

let tokenStorage = {
    accessToken: null,
    tokenType: null,
    expiresIn: null,
    refreshToken: null
}
let repeatRefresh = null

if (repeatRefresh === null)
    repeatRefresh = setInterval(() => RefreshIABTokenInterval, 120)//min30)

async function RefreshIABTokenInterval() {
    console.log("A")
    try {
        const url = 'https://www.googleapis.com/oauth2/v4/token'
        const payload = {
            refresh_token: tokenStorage.refreshToken,
            grant_type: 'refresh_token',
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET
        }
        await new Promise((resolve, reject) => {
            request.post(url, { form: payload }, async (err, response, body) => {
                if (err) {
                    repeatRefresh = null
                    clearInterval(repeatRefresh)
                    return reject({ message: err, status: 'FAILED' })
                }
                const data = await JSON.parse(body)
                tokenStorage.accessToken = data.access_token
                tokenStorage.tokenType = data.token_type
                tokenStorage.expiresIn = data.expires_in
                resolve({ status: 'SUCCESS' })
            })
        })
    } catch (err) {
        console.error(err)
    }
}

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

router.get('/check/server', ctx => ctx.body = { status: tokenStorage.accessToken ? 'SUCCESS' : 'FAILED' })

router.get('/token/request', ctx => {
    const oauth2Client = new OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URL)
    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        approval_prompt: 'force'
    })
    ctx.redirect(url)
})

router.get('/token/redirect', async ctx => {
    try {
        if (ctx.query.code === null || ctx.query.code === undefined)
            return resolve({ tokenStorage, status: 'SUCCESS' })
        const url = 'https://www.googleapis.com/oauth2/v4/token'
        const payload = {
            grant_type: 'authorization_code',
            code: ctx.query.code,
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            redirect_uri: REDIRECT_URL
        }
        const result = await new Promise((resolve, reject) => {
            request.post(url, { form: payload }, async (err, response, body) => {
                if (err)
                    return reject({ message: err, status: 'FAILED' })
                const data = await JSON.parse(body)
                tokenStorage.accessToken = data.access_token
                tokenStorage.tokenType = data.token_type
                tokenStorage.expiresIn = data.expires_in
                tokenStorage.refreshToken = data.refresh_token
                resolve({ tokenStorage, status: 'SUCCESS' })
            })
        })
        ctx.body = result
    } catch (err) {
        console.error(err)
        ctx.body = err
    }
})

router.get('/receipt/validation', async ctx => {
    const packageName = 'com.sandspoons.detective'
    const {
        userId,
        transactionId,
        productId,
        token,
        date
    } = ctx.query
    try {
        const billingId = await CreateBilling({ userId, transactionId, productId, token, date })
        if (!billingId)
            return reject({ message: '영수증 발행 도중 문제가 발생했습니다. 고객센터에 문의해주세요.', status: 'FAILED' })
        const url = `https://www.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/products/${productId}/tokens/${token}?access_token=${tokenStorage.accessToken}`
        const result = await new Promise((resolve, reject) => {
            request.get(url, async (err, response, body) => {
                if (err)
                    return reject({ message: err, status: 'FAILED' })
                const data = await JSON.parse(body)
                console.log(data)
                if (!data.orderId || data.orderId != transactionId || data.purchaseState > 0)
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