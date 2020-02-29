const Router = require('koa-router')
const Serialize = require('../protocol/Serialize')
const router = new Router()

router.get('/users', ctx => ctx.body = User.users.length)

router.post('/notice', async ctx => {
    const { text } = ctx.request.body
    if (text === '')
        return
    const users = User.users
    for (const user of users)
        user.send(Serialize.SystemMessage('<color=#EFE4B0>[SERVER] ' + text + '</color>'))
    console.log('[SERVER] ' + text)
    ctx.body = { status: 'SUCCESS' }
})

router.post('/charging', async ctx => {
    const {
        user_id,
        point,
        point_offer,
        device,
        ad_name,
        seq_id,
    } = ctx.request.body
    console.log(ctx.request.body)
    ctx.body = { status: 'SUCCESS' }
})

module.exports = router