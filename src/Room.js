const Serialize = require('./protocol/Serialize')
const GameMap = require('./GameMap')
const Place = require('./Place')
const GameMode = require('./GameMode')
const PlayGroundMode = require('./mode/PlayGroundMode')
const { RoomType } = require('./const')

global.Room = (function () {
    const _static = {
        rooms: {},
        index: 0,
        empties: []
    }

    return class Room {
        static get rooms() {
            return _static.rooms
        }

        static get index() {
            return _static.index
        }

        static set index(value) {
            _static.index = value
        }

        static get empties() {
            return _static.empties
        }

        static set empties(value) {
            _static.empties = value
        }

        static create(type = RoomType.PLAYGROUND) {
            const room = new Room(type)
            Room.add(room)
            return room
        }

        static add(room) {
            room.index = Room.empties.shift() || ++Room.index
            Room.rooms[room.index] = room
            room.setting()
        }

        static remove(room) {
            room.stop()
            Room.rooms[room.index] = null
            delete Room.rooms[room.index]
            Room.empties.push(room.index)
            Room.empties = Room.empties.sort()
        }

        static available(type = RoomType.PLAYGROUND) {
            for (const id in Room.rooms) {
                const room = Room.rooms[id]
                if (room.type === type && room.canJoin()) return room
            }
            return null
        }

        static get(id) {
            return Room.rooms[id]
        }

        constructor(type = RoomType.PLAYGROUND) {
            this.index = 0
            this.type = type
            this.users = []
            this.places = new Proxy({}, {
                get: (target, name) => {
                    return target.hasOwnProperty(name) ? target[name] : target[name] = new Place(this.index, name)
                }
            })
            this.max = 32
            this.mode = null
            this.loop = null
            this.isRunning = false
            this.nextEventUid = 1
            this.lock = false
            this.start()
        }

        setting() {
            switch (this.type) {
                case RoomType.GAME:
                    this.mode = new GameMode(this.index)
                    break
                case RoomType.PLAYGROUND:
                    this.mode = new PlayGroundMode(this.index)
                    break
            }
        }

        addEvent(event) {
            event.roomId = this.index
            event.index = this.nextEventUid++
            this.places[event.place].addEvent(event)
        }

        removeEvent(event) {
            this.places[event.place].removeEvent(event)
            event.roomId = 0
        }

        addUser(user) {
            user.roomId = this.index
            this.users.push(user)
            this.places[user.place].addUser(user)
        }

        removeUser(user) {
            this.users.splice(this.users.indexOf(user), 1)
            this.places[user.place].removeUser(user)
            user.roomId = 0
        }

        changeMode(mode) {
            this.mode = new mode(this.index)
            for (const user of this.users) {
                this.mode.join(user)
            }
        }

        akari(place) {
            return this.places[place].akari = !this.places[place].akari
        }

        publish(data) {
            for (const user of this.users) {
                user.send(data)
            }
        }

        broadcast(self, data) {
            for (const user of this.users) {
                if (user !== self) user.send(data)
            }
        }

        broadcastToMap(self, data) {
            const { users } = this.places[self.place]
            for (const user of users) {
                if (user === self) continue
                user.send(data)
            }
        }

        publishToMap(place, data) {
            const { users } = this.places[place]
            for (const user of users) {
                user.send(data)
            }
        }

        sameMapUsers(place) {
            return this.places[place].users
        }

        isPassable(place, x, y, d, collider = true) {
            if (collider) {
                const { events } = this.places[place]
                for (const event of events) {
                    if (event.collider && event.x === x && event.y === y) {
                        return false
                    }
                }
            }
            return GameMap.get(place).isPassable(x, y, d)
        }

        portal(self) {
            const portal = GameMap.get(self.place).getPortal(self.x, self.y)
            if (!portal) return
            this.teleport(self, portal.nextPlace, portal.nextX, portal.nextY, portal.nextDirX, portal.nextDirY)
            if (portal.sound) this.publishToMap(self.place, Serialize.PlaySound(portal.sound))
        }

        teleport(self, place, x, y, dx = 0, dy = 0) {
            this.places[self.place].removeUser(self)
            self.portal(place, x, y, dx, dy)
            this.places[self.place].addUser(self)
            this.draw(self)
        }

        hit(self) {
            const { users, events } = this.places[self.place]
            for (const user of users) {
                if (!(self.x === user.x && self.y === user.y || self.x + self.direction.x === user.x && self.y - self.direction.y === user.y)) continue
                if (this.mode.attack(self, user)) break
            }
            for (const event of events) {
                if (!(self.x === event.x && self.y === event.y || self.x + self.direction.x === event.x && self.y - self.direction.y === event.y)) continue
                if (this.mode.doAction(self, event)) break
            }
        }

        canJoin() {
            return this.users.length < this.max && !this.lock
        }

        draw(self) {
            this.mode.drawAkari(self)
            this.mode.drawEvents(self)
            this.mode.drawUsers(self)
        }

        join(self) {
            this.addUser(self)
            this.mode.join(self)
            this.publish(Serialize.UpdateRoomUserCount(this.users.length))
        }

        leave(self) {
            this.mode.leave(self)
            this.removeUser(self)
            this.publishToMap(self.place, Serialize.RemoveGameObject(self))
            this.publish(Serialize.UpdateRoomUserCount(this.users.length))
            if (this.users.length <= 0) Room.remove(this)
        }

        start() {
            if (this.isRunning) return
            this.isRunning = true
        }

        pause() {
            this.isRunning = false
        }

        stop() {
            if (!this.isRunning) return
            this.isRunning = false
        }

        update() {
            if (!this.isRunning) return
            for (const place in this.places) {
                this.places[place].update()
            }
            this.mode.update()
        }
    }
})()