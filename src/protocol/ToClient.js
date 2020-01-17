const { ENUM } = require('../pix')

module.exports = {
    ...ENUM(
        'USER_DATA',
        'VIBRATE',
        'CONNECTION_COUNT',
        'SYSTEM_MESSAGE',
        'INFORM_MESSAGE',
        'NOTICE_MESSAGE',
        'CHAT_MESSAGE',
        'PORTAL',
        'CREATE_GAME_OBJECT',
        'REMOVE_GAME_OBJECT',
        'SET_GRAPHICS',
        'PLAY_SOUND',
        'UPDATE_ROOM_USER_COUNT',
        'UPDATE_MODE_USER_COUNT',
        'SET_GAME_TEAM',
        'MODE_DATA',
        'GET_CLAN',
        'INVITE_CLAN',
        'DEAD_ANIMATION',
        'RESULT_GAME',
        'ENTER_WARDROBE',
        'LEAVE_WARDROBE',
        'SWITCH_LIGHT',
        'QUIT_GAME',
        'UPDATE_MODE_SCORE',
        'TEMP_SKIN_BUY'
    )
}