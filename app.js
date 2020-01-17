require('./src/User')
require('./src/Room')
require('./src/Clan')

const http = require('http')
const Koa = require('koa')
const Router = require('koa-router')
const bodyparser = require('koa-bodyparser')
const Server = require('./src/Server')
const auth = require('./src/auth')
const app = new Koa()
const router = new Router()
const Data = require('./src/Data')
const DB = require('./src/DB')

const VERSION = '1.0.0'
const PORT = 50000

router.get('/', (ctx, next) => {
    ctx.body = VERSION
})

app.use(bodyparser())
    .use(router.routes())
    .use(auth.routes())

const Logger = require('./Logger')
global.logger = new Logger('[INFO]', true)

async function test() {
    try {
        throw new Error('hihi')
    } catch (e) {
        console.error(e)
        throw e
    }
}
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
        http.createServer().listen(3001)
        new Server().run(PORT)
        console.log('server is running.')
    } catch (e) {
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