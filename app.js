require('./src/User')
require('./src/Room')
require('./src/Clan')

const lex = require('greenlock-koa').create({
    version: 'draft-11',
    configDir: '/etc/letsencrypts',
    server: 'https://acme-staging-v02.api.letsencrypt.org/directory',
    approveDomains: (opts, certs, cb) => {
        if (certs) {
            opts.domains = ['sandspoon.com']
        } else {
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

const https = require('https')
const Koa = require('koa')
const Router = require('koa-router')
const bodyparser = require('koa-bodyparser')
const Data = require('./src/Data')
const DB = require('./src/DB')
const Server = require('./src/Server')
const auth = require('./src/api/auth')
const androidpublisher = require('./src/api/androidpublisher')
const app = new Koa()
const router = new Router()

const VERSION = '0.2.1'
const PORT = 50000

router.get('/', ctx => {
    ctx.body = VERSION
})

app.use(bodyparser())
    .use(router.routes())
    .use(auth.routes())
    .use(androidpublisher.routes())

const Logger = require('./Logger')
global.logger = new Logger('[INFO]', true)

async function start() {
    try {
        await Data.loadData()
        let lastRankUpdated = new Date().getDay()
        setInterval(() => {
            const users = User.users
            for (const user of users) {
                DB.UpdateUser(user)
            }
            const day = new Date().getDay()
            if (lastRankUpdated != day) {
                lastRankUpdated = day
                Data.loadRanks()
            }
        }, 1000 * 300)
        https.createServer(lex.httpsOptions, lex.middleware(app.callback())).listen(443)
        new Server().run(PORT)
        console.log('server is running.')
    } catch (e) {
        console.log('A')
        console.log(e)
    }
}

process.on('SIGINT', async () => {
    const users = User.users
    for (const user of users) {
        user.tempReboot = true
        if (await DB.UpdateUser(user))
            logger.log(user.name + ' 저장 완료')
        else {
            logger.log('저장 실패 ' + JSON.stringify(user.getJSON()))
        }
    }
    logger.writeFile('./log.txt')
    console.log('Caught interrupt signal.')
    process.exit()
})

start()