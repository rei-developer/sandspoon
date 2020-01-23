const { TeamType, ModeType, MapType } = require('../const')
const ToClient = require('./ToClient')
const my = {}

my.UserData = function (user) {
    const packet = {}
    packet._head = ToClient.USER_DATA
    packet.index = user.index
    packet.id = user.id
    packet.clanname = user.clan && user.clan.name || ''
    packet.name = user.name
    packet.rank = user.rank
    packet.level = user.level
    packet.exp = user.exp
    packet.maxExp = user.maxExp
    packet.coin = user.coin
    packet.cash = user.cash
    packet.win = user.win
    packet.lose = user.lose
    packet.kill = user.kill
    packet.death = user.death
    packet.assist = user.assist
    packet.blast = user.blast
    packet.rescue = user.rescue
    packet.survive = user.survive
    packet.escape = user.escape
    packet.graphics = user.graphics
    packet.redGraphics = user.redGraphics
    packet.blueGraphics = user.blueGraphics
    packet.admin = user.admin
    return JSON.stringify(packet)
}

my.Vibrate = function () {
    const packet = {}
    packet._head = ToClient.VIBRATE
    return JSON.stringify(packet)
}

my.ConnectionCount = function (count) {
    const packet = {}
    packet._head = ToClient.CONNECTION_COUNT
    packet.count = count
    return JSON.stringify(packet)
}

my.SystemMessage = function (message) {
    const packet = {}
    packet._head = ToClient.SYSTEM_MESSAGE
    packet.text = message
    return JSON.stringify(packet)
}

my.InformMessage = function (message) {
    const packet = {}
    packet._head = ToClient.INFORM_MESSAGE
    packet.text = message
    return JSON.stringify(packet)
}

my.NoticeMessage = function (message) {
    const packet = {}
    packet._head = ToClient.NOTICE_MESSAGE
    packet.text = message
    return JSON.stringify(packet)
}

my.ChatMessage = function (type, index, name, text) {
    const packet = {}
    packet._head = ToClient.CHAT_MESSAGE
    packet.type = type
    packet.index = index
    packet.name = name
    packet.text = text
    return JSON.stringify(packet)
}

my.Portal = function (place, x, y, dir) {
    const packet = {}
    packet._head = ToClient.PORTAL
    packet.place = place
    packet.x = x
    packet.y = y
    packet.dir = dir
    return JSON.stringify(packet)
}

my.RemoveGameObject = function (obj) {
    const packet = {}
    packet._head = ToClient.REMOVE_GAME_OBJECT
    packet.type = obj.type
    packet.index = obj.index;
    return JSON.stringify(packet)
}

my.CreateGameObject = function (obj, hide = false) {
    const packet = {}
    packet._head = ToClient.CREATE_GAME_OBJECT
    packet.index = obj.index
    packet.clanname = hide ? '' : (obj.clan && obj.clan.name || '')
    packet.type = obj.type
    packet.name = hide ? '' : obj.name
    packet.team = (obj.hasOwnProperty('game') && obj.game.hasOwnProperty('team')) ? obj.game.team : TeamType.BLUE
    packet.level = hide ? 0 : (obj.level || 0)
    packet.graphics = obj.graphics
    packet.x = obj.x
    packet.y = obj.y
    packet.dir = obj.direction
    packet.collider = obj.collider
    return JSON.stringify(packet)
}

my.SetGraphics = function (obj) {
    const packet = {}
    packet._head = ToClient.SET_GRAPHICS
    packet.type = obj.type
    packet.index = obj.index
    packet.graphics = obj.graphics
    return JSON.stringify(packet)
}

my.PlaySound = function (name) {
    const packet = {}
    packet._head = ToClient.PLAY_SOUND
    packet.name = name
    return JSON.stringify(packet)
}

my.UpdateRoomUserCount = function (count) {
    const packet = {}
    packet._head = ToClient.UPDATE_ROOM_USER_COUNT
    packet.count = count
    return JSON.stringify(packet)
}

my.UpdateModeUserCount = function (count) {
    const packet = {}
    packet._head = ToClient.UPDATE_MODE_USER_COUNT
    packet.count = count
    return JSON.stringify(packet)
}

my.SetGameTeam = function (obj) {
    const packet = {}
    packet._head = ToClient.SET_GAME_TEAM
    packet.type = obj.type
    packet.index = obj.index
    packet.team = (obj.hasOwnProperty('game') && obj.game.hasOwnProperty('team')) ? obj.game.team : TeamType.BLUE
    return JSON.stringify(packet)
}

my.ModeData = function (mode) {
    const packet = {}
    packet._head = ToClient.MODE_DATA
    packet.type = mode.type
    packet.count = mode.count
    packet.maxCount = mode.maxCount
    switch (mode.type) {
        case ModeType.RESCUE:
            packet.hostage = mode.score.red
            break
        case ModeType.INFECT:
            packet.alive = mode.blueTeam.length
            break
    }
    return JSON.stringify(packet)
}

my.GetClan = function (clan, members = []) {
    const packet = {}
    packet._head = ToClient.GET_CLAN
    packet.hasClan = !!clan
    if (packet.hasClan) {
        packet.name = clan.name
        packet.level = clan.level
        packet.level1_name = clan.level1_name
        packet.level2_name = clan.level2_name
        packet.level3_name = clan.level3_name
        packet.level4_name = clan.level4_name
        packet.level5_name = clan.level5_name
        packet.notice = clan.notice
        packet.level = clan.level
        packet.exp = clan.exp
        packet.coin = clan.coin
        packet.regdate = clan.regdate
        packet.condition = clan.condition
        packet.masterId = clan.masterId
        packet.members = members.map(m => ({
            id: m.id,
            avatar: m.avatar,
            level: m.level,
            name: m.name,
            clanLevel: m.clanLevel,
            clanExp: m.clanExp,
            clanCoin: m.clanCoin,
            updated: m.updated
        }))
    }
    return JSON.stringify(packet)
}

my.InviteClan = function (invites) {
    const packet = {}
    packet._head = ToClient.INVITE_CLAN
    packet.invites = invites
    return JSON.stringify(packet)
}

my.DeadAnimation = function () {
    const packet = {}
    packet._head = ToClient.DEAD_ANIMATION
    return JSON.stringify(packet)
}

my.ResultGame = function (winner, rank, persons, mission, exp, coin) {
    const packet = {}
    packet._head = ToClient.RESULT_GAME
    packet.winner = winner
    packet.rank = rank
    packet.persons = persons
    packet.mission = mission
    packet.exp = exp
    packet.coin = coin
    return JSON.stringify(packet)
}

my.EnterWardrobe = function () {
    const packet = {}
    packet._head = ToClient.ENTER_WARDROBE
    return JSON.stringify(packet)
}

my.LeaveWardrobe = function () {
    const packet = {}
    packet._head = ToClient.LEAVE_WARDROBE
    return JSON.stringify(packet)
}

my.SwitchLight = function (active) {
    const packet = {}
    packet._head = ToClient.SWITCH_LIGHT
    packet.active = active
    return JSON.stringify(packet)
}

my.QuitGame = function () {
    const packet = {}
    packet._head = ToClient.QUIT_GAME
    return JSON.stringify(packet)
}

my.TempSkinBuy = function (blueGraphics, coin) {
    const packet = {}
    packet._head = ToClient.TEMP_SKIN_BUY
    packet.blueGraphics = blueGraphics
    packet.coin = coin
    return JSON.stringify(packet)
}

module.exports = {
    ...my
}