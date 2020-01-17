module.exports = class Place {
    constructor (roomId, place) {
        this.roomId = roomId
        this.users = []
        this.events = []
        this.akari = true
        this.place = place
    }

    addUser (user) {
        this.users.push(user)
    }

    removeUser (user) {
        this.users.splice(this.users.indexOf(user), 1)
    }

    removeAllUsers () {
        this.users = []
    }

    addEvent (event) {
        this.events.push(event)
    }

    removeEvent (event) {
        this.events.splice(this.events.indexOf(event), 1)
    }

    removeAllEvents () {
        this.events = []
    }

    update () {
        if (!this.users) return

        const users = []
        const events = []

        for (let i = 0; i < this.users.length; ++i) {
            if (this.users[i].dirty) users.push(this.users[i])
        }

        for (let i = 0; i < this.events.length; ++i) {
            const event = this.events[i]
            event.update()
            if (event.dirty) events.push(event)
        }

        if (users.length + events.length <= 0) return

        const buffer = new ArrayBuffer(2 + 11 * (users.length + events.length))
        const view = new DataView(buffer)
        
        // 첫번째 바이트의 값 0 - 위치 동기화 코드
        // 두번쨰 바이트의 값 동기화 개체수 - 최대 255 // 한 공간 플레이어 50 + 이벤트 a(0-205)

        view.setUint8(0, 0)
        view.setUint8(1, users.length + events.length)

        let offset = 2

        for (let i = 0; i < users.length; ++i) {
            const u = users[i]
            u.dirty = false
            view.setInt8(offset, u.type)
            view.setInt32(offset + 1, u.index, true)
            view.setInt16(offset + 5, u.x, true)
            view.setInt16(offset + 7, u.y, true)
            view.setInt8(offset + 9, u.direction.x)
            view.setInt8(offset + 10, u.direction.y)
            offset += 11
        }

        for (let i = 0; i < events.length; ++i) {
            const u = events[i]
            u.dirty = false
            view.setInt8(offset, u.type)
            view.setInt32(offset + 1, u.index, true)
            view.setInt16(offset + 5, u.x, true)
            view.setInt16(offset + 7, u.y, true)
            view.setInt8(offset + 9, u.direction.x)
            view.setInt8(offset + 10, u.direction.y)
            offset += 11
        }

        for (const user of this.users) {
            user.send(buffer)
        }
    }
}