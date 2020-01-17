const { ENUM } = require('../pix')

module.exports = {
    ...ENUM(
        'HELLO',
        'INPUT_ARROW',
        'INPUT_HIT',
        'ENTER_ROOM',
        'REWARD',
        'ESCAPE',
        'CHAT',
        'CREATE_CLAN',
        'DELETE_CLAN',
        'GET_CLAN',
        'LEAVE_CLAN',
        'INVITE_CLAN',
        'CANCEL_CLAN',
        'JOIN_CLAN',
        'KICK_CLAN',
        'TEMP_SKIN_BUY'
    )
}