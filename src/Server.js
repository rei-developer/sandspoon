const Serialize = require('./protocol/Serialize')
const WebSocket = require('ws')
const jwt = require('jsonwebtoken')
const querystring = require('querystring')
const ToServer = require('./protocol/ToServer')
const Encoding = require('text-encoding-utf-8')
const utf8 = new Encoding.TextDecoder('utf-8')
const dotenv = require('dotenv')

dotenv.config()

const { KEY } = process.env

function verifyToken(key, token) {
    return new Promise((resolve, reject) => {
        jwt.verify(token, key, (err, decode) => {
            if (err) reject(new Error('유효하지 않는 토큰입니다.'))
            resolve(decode)
        })
    })
}

const HEART_INTERVAL = 5000
const UPDATE_INTERVAL = 100

function heartbeat() {
    this.isAlive = true
    this.pongTime = Date.now() + HEART_INTERVAL
}

module.exports = class Server {
    constructor() {
        this.io = {}
        this.test = 0
    }

    run(port) {
        this.port = port
        this.io = new WebSocket.Server({ port })
        this.io.on('connection', async (ws, req) => await this.onConnect(ws, req))
        const buffer = new ArrayBuffer(4)
        const view = new DataView(buffer)

        setInterval(() => {
            this.io.clients.forEach((ws) => {
                if (!ws.isAlive)
                    return ws.terminate()
                ws.isAlive = false
                view.setInt32(0, ws.pongTime - Date.now(), true)
                try {
                    ws.ping(buffer)
                } catch (e) {
                    console.error(e)
                }
            })
        }, HEART_INTERVAL)

        setInterval(() => {
            const rooms = Room.rooms
            for (const id in rooms) {
                rooms[id].update()
            }
        }, UPDATE_INTERVAL)
        return this
    }

    login(user) {
        user.checkSkinExpiry()
        user.send(Serialize.UserData(user))
        user.send(Serialize.ConnectionCount(User.users.length))
    }

    async onConnect(socket, req) {
        socket.isAlive = true
        socket.on('pong', heartbeat)

        heartbeat.bind(this)()

        try {
            const { token } = querystring.parse(req.url.slice(1))
            const verify = token !== 'test' && await verifyToken(KEY, token) || 'test'
            const user = await User.create(socket, verify)
            if (!user)
                return
            this.login(user)
            socket.user = user
            console.log(user.name + ' 접속 (동시접속자: ' + User.users.length + '명)')
            const handler = this.onMessage(socket)
            try {
                socket.on('message', async (rawData) => {
                    const bytes = new Uint8Array(rawData)
                    const view = new DataView(bytes.buffer)
                    const type = view.getUint16()
                    if (handler[type])
                        handler[type](bytes.slice(2))
                })
                socket.on('close', async () => this.onDisconnect(socket))
            } catch (e) {
                console.log(e)
            }

        } catch (e) {
            console.log(e)
        }
    }

    onMessage(socket) {
        const { user } = socket
        const handler = {}

        handler[ToServer.HELLO] = async () => this.login(user)

        handler[ToServer.INPUT_ARROW] = async data => {
            const view = new DataView(data.buffer)
            const x = view.getInt8(0)
            const y = view.getInt8(1)
            const type = view.getUint8(2)
            const timestamp = view.getFloat32(3, true)

            if (type === 0)
                user.turn(x, y, timestamp)
            else
                user.move(x, y, timestamp)
        }

        handler[ToServer.INPUT_HIT] = async () => user.hit()

        handler[ToServer.ENTER_ROOM] = async data => user.entry(data[0])

        handler[ToServer.REWARD] = async data => user.result(data[0])

        handler[ToServer.ESCAPE] = async () => user.leave()

        handler[ToServer.CHAT] = async data => user.chat(utf8.decode(data))

        handler[ToServer.CHANGE_USERNAME] = async data => user.changeUsername(utf8.decode(data))

        handler[ToServer.CREATE_CLAN] = async data => user.createClan(utf8.decode(data))

        handler[ToServer.GET_CLAN] = async () => user.getClan()

        handler[ToServer.LEAVE_CLAN] = async () => user.leaveClan()

        handler[ToServer.JOIN_CLAN] = async data => {
            const int32 = new Int32Array(data.buffer)
            user.joinClan(int32[0])
        }

        handler[ToServer.CANCEL_CLAN] = async data => {
            const int32 = new Int32Array(data.buffer)
            user.cancelClan(int32[0])
        }

        handler[ToServer.INVITE_CLAN] = async data => user.inviteClan(utf8.decode(data))

        handler[ToServer.KICK_CLAN] = async data => {
            const int32 = new Int32Array(data.buffer)
            user.kickClan(int32[0])
        }

        handler[ToServer.SET_OPTION_CLAN] = async data => user.setOptionClan(JSON.parse(utf8.decode(data)))

        handler[ToServer.PAY_CLAN] = async data => user.payClan(utf8.decode(data))

        handler[ToServer.DONATE_CLAN] = async data => user.donateClan(utf8.decode(data))

        handler[ToServer.WITHDRAW_CLAN] = async data => user.withdrawClan(utf8.decode(data))

        handler[ToServer.LEVEL_UP_CLAN] = async () => user.levelUpClan()

        handler[ToServer.MEMBER_INFO_CLAN] = async data => {
            const int32 = new Int32Array(data.buffer)
            user.send(Serialize.MemberInfoClan(int32[0]))
        }

        handler[ToServer.SET_UP_MEMBER_LEVEL_CLAN] = async data => {
            const int32 = new Int32Array(data.buffer)
            user.setUpMemberLevelClan(int32[0])
        }

        handler[ToServer.SET_DOWN_MEMBER_LEVEL_CLAN] = async data => {
            const int32 = new Int32Array(data.buffer)
            user.setDownMemberLevelClan(int32[0])
        }

        handler[ToServer.CHANGE_MASTER_CLAN] = async data => {
            const int32 = new Int32Array(data.buffer)
            user.changeMasterClan(int32[0])
        }

        handler[ToServer.GET_BILLING] = async () => user.getBilling()

        handler[ToServer.USE_BILLING] = async data => {
            const int32 = new Int32Array(data.buffer)
            user.useBilling(int32[0])
        }

        handler[ToServer.REFUND_BILLING] = async data => {
            const int32 = new Int32Array(data.buffer)
            user.refundBilling(int32[0])
        }

        handler[ToServer.GET_SHOP] = async data => {
            const int32 = new Int32Array(data.buffer)
            user.getShop(int32[0])
        }

        handler[ToServer.GET_INFO_ITEM] = async data => {
            const int32 = new Int32Array(data.buffer)
            user.getInfoItem(int32[0])
        }

        handler[ToServer.BUY_ITEM] = async data => user.buyItem(JSON.parse(utf8.decode(data)))

        handler[ToServer.GET_SKIN_LIST] = async () => user.getSkinList()

        handler[ToServer.SET_SKIN] = async data => {
            const int32 = new Int32Array(data.buffer)
            user.setSkin(int32[0])
        }

        handler[ToServer.GET_PAY_INFO_ITEM] = async data => {
            const int32 = new Int32Array(data.buffer)
            user.getPayInfoItem(int32[0])
        }

        handler[ToServer.GET_RANK] = async data => {
            const int32 = new Int32Array(data.buffer)
            user.getRank(int32[0])
        }

        handler[ToServer.GET_USER_INFO_RANK] = async data => {
            const int32 = new Int32Array(data.buffer)
            user.getUserInfoRank(int32[0])
        }

        handler[ToServer.GET_USER_INFO_RANK_BY_USERNAME] = async data => user.getUserInfoRankByUsername(utf8.decode(data))

        handler[ToServer.GET_NOTICE_MESSAGE_COUNT] = async () => user.getNoticeMessageCount()

        handler[ToServer.GET_NOTICE_MESSAGE] = async data => user.getNoticeMessage(data[0])

        handler[ToServer.GET_INFO_NOTICE_MESSAGE] = async data => {
            const int32 = new Int32Array(data.buffer)
            user.getInfoNoticeMessage(int32[0])
        }

        handler[ToServer.WITHDRAW_NOTICE_MESSAGE] = async data => {
            const int32 = new Int32Array(data.buffer)
            user.withdrawNoticeMessage(int32[0])
        }

        handler[ToServer.DELETE_NOTICE_MESSAGE] = async data => {
            const int32 = new Int32Array(data.buffer)
            user.deleteNoticeMessage(int32[0])
        }

        handler[ToServer.RESTORE_NOTICE_MESSAGE] = async data => {
            const int32 = new Int32Array(data.buffer)
            user.restoreNoticeMessage(int32[0])
        }

        handler[ToServer.CLEAR_NOTICE_MESSAGE] = async () => user.clearNoticeMessage()

        handler[ToServer.ADD_NOTICE_MESSAGE] = async data => user.addNoticeMessage(JSON.parse(utf8.decode(data)))

        handler[ToServer.ADD_USER_REPORT] = async data => user.addUserReport(JSON.parse(utf8.decode(data)))

        return handler
    }

    async onDisconnect(socket) {
        try {
            const { user } = socket
            user.disconnect()
            socket.user = null
            delete socket.user
            console.log(user.name + ' 종료 (동시접속자: ' + User.users.length + '명)')
        } catch (e) {
            console.log(e.message)
        }
    }
}