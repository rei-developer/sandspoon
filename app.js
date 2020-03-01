require('./src/Clan')
require('./src/Shop')
require('./src/Item')
require('./src/Room')
require('./src/User')

const lex = require('greenlock-koa').create({
    version: 'draft-11',
    configDir: '/etc/letsencrypts',
    server: 'https://acme-v02.api.letsencrypt.org/directory', // 'https://acme-v02-staging.api.letsencrypt.org/directory',
    approveDomains: (opts, certs, cb) => {
        if (certs)
            opts.domains = ['www.sandspoon.com']
        else {
            opts.email = 'sandspoons@gmail.com'
            opts.agreeTos = true
        }
        cb(null, { options: opts, certs })
    },
    communityMember: true,
    configDir: require('os').homedir() + '/acme/etc',
    renewWithin: 81 * 24 * 60 * 60 * 1000,
    renewBy: 80 * 24 * 60 * 60 * 1000
})
const http = require('http')
const https = require('https')
const Koa = require('koa')
const Router = require('koa-router')
const bodyparser = require('koa-bodyparser')
const Server = require('./src/Server')
const androidpublisher = require('./src/api/androidpublisher')
const api = require('./src/api/api')
const auth = require('./src/api/auth')
const app = new Koa()
const router = new Router()
const Data = require('./src/Data')
const DB = require('./src/DB')
const config = require('./src/config')

router.use(bodyparser())
router.use('/androidpublisher', androidpublisher.routes())
router.use('/api', api.routes())
router.use('/verify', auth.routes())
router.get('/', ctx => ctx.body = config.VERSION)

app.use(router.routes()).use(router.allowedMethods())

const Logger = require('./Logger')
global.logger = new Logger('[INFO]', true)

async function start() {
    try {
        await Data.loadData()
        let lastRankUpdated = new Date().getDay()
        setInterval(() => {
            const users = User.users
            for (const user of users)
                DB.UpdateUser(user)
            const day = new Date().getDay()
            if (lastRankUpdated != day) {
                lastRankUpdated = day
                Data.loadRanks()
            }
        }, 1000 * 300)
        https.createServer(lex.httpsOptions, lex.middleware(app.callback())).listen(443)
        http.createServer(lex.middleware(require('redirect-https')())).listen(80)
        new Server().run(config.PORT)
        console.log('server is running.')
    } catch (e) {
        console.log(e)
    }
}

process.on('SIGINT', async () => {
    const users = User.users
    for (const user of users)
        if (!await DB.UpdateUser(user))
            logger.log('저장 실패 ' + JSON.stringify(user.getJSON()))
    logger.writeFile('./log.txt')
    console.log('Caught interrupt signal.')
    process.exit()
})

start()