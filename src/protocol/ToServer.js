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
        'TEMP_SKIN_BUY',
        'SET_OPTION_CLAN',
        'PAY_CLAN',
        'DONATE_CLAN',
        'WITHDRAW_CLAN',
        'LEVEL_UP_CLAN',
        'MEMBER_INFO_CLAN',
        'SET_UP_MEMBER_LEVEL_CLAN',
        'SET_DOWN_MEMBER_LEVEL_CLAN',
        'CHANGE_MASTER_CLAN'
    )
}