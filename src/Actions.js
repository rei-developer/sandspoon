const Serialize = require('./protocol/Serialize')
const { TeamType } = require('./util/const')
const pix = require('./util/pix')

const dr = [
    [1, 0], [-1, 0], [0, 1], [0, -1], [1, 0]
]

class State {
    constructor(args = {}) { }

    doAction(context, self) { }

    update(context) { }
}

class DoorState {
    constructor(args = {}) {
        this.openSound = args['openSound'] || 'door03'
        this.closeSound = args['closeSound'] || 'door04'
        this.knockSound = args['knockSound'] || 'door06'
        this.isOpen = false
        this.isAlive = true
    }

    doAction(context, self) {
        const door = context
        if (this.isAlive) {
            if (this.isOpen) {
                if (self.game.team === TeamType.RED) return
                self.publishToMap(Serialize.PlaySound(this.closeSound))
                door.move(-1, 0)
                this.isOpen = false
            } else {
                const max = self.game.team === TeamType.RED ? 10 : 0
                let r = parseInt(Math.random() * max)
                if (r === 0) {
                    self.publishToMap(Serialize.PlaySound(this.openSound))
                    door.move(1, 0)
                    this.isOpen = true
                    if (self.game.team === TeamType.RED) {
                        r = parseInt(Math.random() * 10)
                        if (r === 0) this.isAlive = false
                    }
                } else self.publishToMap(Serialize.PlaySound(this.knockSound))
            }
        } else self.send(Serialize.InformMessage('<color=red>오니가 철창문을 고장냈다.</color>'))
    }
}

class FireShopState {
    constructor(args = {}) {
        this.count = 0
    }

    doAction(context, self) {
        const { mode } = Room.get(context.roomId)
        if (self.game.team === TeamType.RED)
            return
        mode.buyItem(self, 1)
    }

    update(context) {
        try {
            if (++this.count % 10 == 0) {
                const { mode } = Room.get(context.roomId)
                if (mode.redTeam.length > 0) {
                    for (const red of mode.redTeam) {
                        if (red.place === context.place) {
                            const range = Math.abs(red.x - context.x) + Math.abs(red.y - context.y)
                            if (range > 10)
                                continue
                            if (red.game.hp < 0) {
                                mode.moveToKickOut(red)
                                red.game.hp = 100
                                red.send(Serialize.InformMessage('<color=red>인간진영에서 추방되었습니다.</color>'))
                            } else {
                                red.game.hp -= 40
                                red.send(Serialize.InformMessage('<color=red>인간진영에서 벗어나세요!!!!</color>'))
                                red.send(Serialize.PlaySound('Warn'))
                            }
                        }
                    }
                }
                this.count = 0
            }
        } catch (e) {
            console.log(e)
        }
    }
}

class ProtecterState {
    constructor(args = {}) {
        this.count = 0
    }

    doAction(context, self) { }

    update(context) {
        if (++this.count % 10 == 0) {
            const { mode } = Room.get(context.roomId)
            for (const blue of mode.blueTeam) {
                if (blue.place === context.place) {
                    const range = Math.abs(blue.x - context.x) + Math.abs(blue.y - context.y)
                    if (range > 10)
                        continue
                    if (blue.game.hp < 0) {
                        mode.moveToBase(blue)
                        blue.game.hp = 100
                        blue.send(Serialize.InformMessage('<color=red>오니진영에서 추방되었습니다.</color>'))
                    } else {
                        blue.game.hp -= 40
                        blue.send(Serialize.InformMessage('<color=red>오니진영에서 벗어나세요!!!!</color>'))
                        blue.send(Serialize.PlaySound('Warn'))
                    }
                }
            }
            this.count = 0
        }
    }
}

class RescueState {
    constructor(args = {}) {
        this.count = 0
    }

    doAction(context, self) {
        const { mode } = Room.get(context.roomId)
        if (self.game.team === TeamType.RED || self.game.caught) return
        if (!mode.caught) return self.send(Serialize.InformMessage('<color=#B5E61D>아직 인질을 구출할 수 없습니다.</color>'))
        if (mode.score.red < 1) return self.send(Serialize.InformMessage('<color=#B5E61D>붙잡힌 인질이 없습니다.</color>'))
        let count = 0
        for (const red of mode.redTeam)
            mode.moveToKickOut(red)
        for (const blue of mode.blueTeam) {
            if (blue.game.caught) {
                blue.teleport(self.place, self.x, self.y)
                blue.game.caught = false
                ++count
            }
        }
        mode.score.red = 0
        mode.caught = false
        self.publish(Serialize.NoticeMessage(self.name + ' 인질 ' + count + '명 구출!'))
        self.publish(Serialize.PlaySound('Rescue'))
        self.publish(Serialize.UpdateModeCount(0))
        self.score.rescue += count
        ++self.score.rescueCombo
    }

    update(context) {
        if (++this.count % 10 == 0) {
            const { mode } = Room.get(context.roomId)
            for (const red of mode.redTeam) {
                if (red.place === context.place) {
                    const range = Math.abs(red.x - context.x) + Math.abs(red.y - context.y)
                    if (range > 2) continue
                    if (red.game.hp < 0) {
                        mode.moveToBase(red)
                        red.game.hp = 100
                        red.send(Serialize.InformMessage('<color=red>인질구출 스위치에서 벗어나지 않아 강제로 추방되었습니다.</color>'))
                    } else {
                        red.game.hp -= 40
                        red.send(Serialize.InformMessage('<color=red>인질구출 스위치에서 벗어나세요!!!!</color>'))
                        red.send(Serialize.PlaySound('Warn'))
                    }
                }
            }
            this.count = 0
        }
    }
}

class TanaState {
    constructor(args = {}) {
        this.toggle = false
    }

    doAction(context, self) {
        const tana = context
        self.publishToMap(Serialize.PlaySound('Sha'))
        tana.move(this.toggle ? -1 : 1, 0)
        this.toggle = !this.toggle
    }
}

class ObstacleState {
    constructor(args = {}) {
        this.moveSound = args['moveSound'] || '3'
    }

    doAction(context, self) {
        const room = Room.get(context.roomId)
        if (!room) return
        self.publishToMap(Serialize.PlaySound(this.moveSound))
        if (room.isPassable(self.place, context.x + self.direction.x, context.y - self.direction.y, self.direction, true))
            context.move(self.direction.x, -self.direction.y)
        else
            context.move(-self.direction.x, self.direction.y)
    }
}

const PlayerState = require('./PlayerState')

class AkariState {
    constructor(args = {}) {
        this.count = 0
    }

    doAction(context, self) {
        // if (self.game.team === TeamType.RED) return
        const room = Room.get(self.roomId)
        const light = room.akari(self.place)
        const users = room.sameMapUsers(self.place)
        for (const user of users) {
            if (user.state === PlayerState.Tansu) continue
            user.send(Serialize.PlaySound(light ? 'clap01' : 'clap00'))
            room.mode.drawAkari(user)
        }
    }

    update(context) {
        if (++this.count % 4 == 0) {
            const room = Room.get(context.roomId)
            if (!room) return
            const red = room.places[context.place].users.find((u) => u.getTeam() === TeamType.RED)
            if (red) {
                const light = room.akari(context.place)
                const users = room.sameMapUsers(context.place)
                for (const user of users) {
                    if (user.state === PlayerState.Tansu) continue
                    room.mode.drawAkari(user)
                }
            }
            this.count = 0
        }
    }
}

class TansuState {
    constructor(args = {}) {
        this.users = []
    }

    doAction(context, self) {
        if (self.direction.x !== 0 || self.direction.y !== 1) return
        const room = Room.get(context.roomId)
        if (!room) return
        const { mode } = room
        if (self.game.team === TeamType.BLUE) {
            if (self.state === PlayerState.Tansu) {
                self.state = PlayerState.Basic
                self.send(Serialize.LeaveWardrobe())
                this.users.splice(this.users.indexOf(self), 1)
                self.game.tansu = null
                self.publishToMap(Serialize.PlaySound('Close1'))
                self.broadcastToMap(Serialize.CreateGameObject(self))
                mode.drawAkari(self)
            } else {
                if (this.users.length >= 1) {
                    self.send(Serialize.InformMessage('<color=red>장농 안에 누군가 있다.</color>'))
                    self.publishToMap(Serialize.PlaySound('Crash'))
                    return
                }
                self.setState('Tansu')
                self.game.tansu = this
                this.users.push(self)
                self.send(Serialize.EnterWardrobe())
                self.publishToMap(Serialize.PlaySound('Close1'))
                self.broadcastToMap(Serialize.RemoveGameObject(self))
            }
        } else {
            self.publishToMap(Serialize.PlaySound('Crash'))
            if (this.users.length > 0 && parseInt(Math.random() * 20 + 1) === 1) {
                const target = pix.sample(this.users, 1)[0]
                this.users.splice(this.users.indexOf(target), 1)
                if (target) {
                    target.game.tansu = null
                    this.users.splice(this.users.indexOf(target), 1)
                    mode.attack(self, target)
                }
            }
        }
    }
}

class ManiaState {
    constructor(args = {}) {
        this.count = 0
        this.step = 0
        this.i = 0
        this.msgCount = -1
        this.message = args['message'] // || ['허허... 좀 비켜보시게나.']
        this.fixed = args['fixed']
    }

    doAction(context, self) {
        this.msgCount = (++this.msgCount) % this.message.length
        self.send(Serialize.ChatMessage(context.type, context.index, context.name, this.message[this.msgCount]))
    }

    update(context) {
        if (this.fixed) return
        const room = Room.get(context.roomId)
        if (!room) return
        if (this.step <= 0) {
            this.i = parseInt(Math.random() * 4)
            this.step = parseInt(Math.random() * 5) + 1
        }
        context.dirty = true
        let i = this.i
        --this.step
        context.direction.x = dr[i][0]
        context.direction.y = -dr[i][1]
        const direction = context.getDirection(dr[i][0], -dr[i][1])
        if (room.isPassable(context.place, context.x, context.y, direction, false) && room.isPassable(context.place, context.x + dr[i][0], context.y + dr[i][1], 10 - direction, true)) {
            context.x += dr[i][0]
            context.y += dr[i][1]
        }
        this.count++
        if (this.count % 500 == 0) {
            this.msgCount = (++this.msgCount) % this.message.length
            context.publishToMap(Serialize.ChatMessage(context.type, context.index, context.name, this.message[this.msgCount]))
        }
        if (this.count > 1500) this.count = 0
    }
}

class RabbitState {
    constructor(args = {}) {
        this.count = 0
        this.step = 0
        this.i = 0
        this.msgCount = -1
        this.message = args['message']
        this.fixed = args['fixed']
    }

    doAction(context, self) {
        const room = Room.get(context.roomId)
        if (!room) return

        self.publish(Serialize.NoticeMessage(self.name + ' 토깽이 사냥!'))
        self.publish(Serialize.PlaySound('Eat'))
        context.publishToMap(Serialize.RemoveGameObject(context))
        room.removeEvent(context)
    }

    update(context) {
        if (this.fixed) return
        const room = Room.get(context.roomId)
        if (!room) return
        if (this.step <= 0) {
            this.i = parseInt(Math.random() * 4)
            this.step = parseInt(Math.random() * 5) + 1
        }
        context.dirty = true
        let i = this.i
        --this.step
        context.direction.x = dr[i][0]
        context.direction.y = -dr[i][1]
        const direction = context.getDirection(dr[i][0], -dr[i][1])
        if (room.isPassable(context.place, context.x, context.y, direction, false) && room.isPassable(context.place, context.x + dr[i][0], context.y + dr[i][1], 10 - direction, true)) {
            context.x += dr[i][0]
            context.y += dr[i][1]
        }
        this.count++
        if (this.count > 1500) this.count = 0
    }
}

class OniState {
    constructor(args = {}) {
        this.count = 0
        this.step = 0
        this.i = 0
        this.msgCount = -1
        this.message = args['message']
        this.fixed = args['fixed']
    }

    doAction(context, self) { }

    update(context) {
        if (++this.count % 5 == 0) {
            if (this.fixed)
                return
            const room = Room.get(context.roomId)
            if (!room)
                return
            if (this.step <= 0) {
                this.i = parseInt(Math.random() * 4)
                this.step = parseInt(Math.random() * 5) + 1
            }
            context.dirty = true
            let i = this.i
            --this.step
            context.direction.x = dr[i][0]
            context.direction.y = -dr[i][1]
            const direction = context.getDirection(dr[i][0], -dr[i][1])
            if (room.isPassable(context.place, context.x, context.y, direction, false) && room.isPassable(context.place, context.x + dr[i][0], context.y + dr[i][1], 10 - direction, true)) {
                context.x += dr[i][0]
                context.y += dr[i][1]
            }
            const { mode } = Room.get(context.roomId)
            if (mode.blueTeam.length > 0) {
                for (const blue of mode.blueTeam) {
                    if (blue.place === context.place) {
                        if (blue.game.camera)
                            continue
                        if (!(blue.x === context.x && blue.y === context.y || blue.x + blue.direction.x === context.x && blue.y - blue.direction.y === context.y))
                            continue
                        blue.game.camera = true
                        blue.setGraphics('Camera')
                        blue.send(Serialize.DeadAnimation())
                        blue.send(Serialize.InformMessage('<color=red>사망했습니다.</color>'))
                        blue.publishToMap(blue.place, Serialize.RemoveGameObject(blue))
                    }
                }
            }
            this.count = 0
        }
    }
}

class BoxState {
    constructor(args = {}) {

    }

    doAction(context, self) {
        const room = Room.get(context.roomId)
        if (!room) return
        const { mode } = room
        if (self.game.team === TeamType.BLUE) {
            if (self.game.vaccine)
                return self.send(Serialize.InformMessage('<color=red>이미 보급품을 사용중입니다..</color>'))
            self.game.vaccine = true
            self.publish(Serialize.NoticeMessage('생존자 ' + self.name + (pix.maker(self.name) ? '가' : '이') + ' 보급품 획득!'))
        } else {
            self.game.team = TeamType.BLUE
            self.setGraphics(self.blueGraphics)
            self.send(Serialize.SetGameTeam(self))
            mode.blueTeam.push(self)
            mode.redTeam.splice(mode.redTeam.indexOf(self), 1)
            // mode.moveToBase(self)
            self.publish(Serialize.NoticeMessage(self.name + (pix.maker(self.name) ? '가' : '이') + ' 보급품 사용!'))
            self.publish(Serialize.UpdateModeCount(mode.blueTeam.length))
        }
        self.publish(Serialize.PlaySound('squeaky'))
        context.publishToMap(Serialize.RemoveGameObject(context))
        room.removeEvent(context)
    }
}

class KeyState {
    constructor(args = {}) {

    }

    doAction(context, self) {
        const room = Room.get(context.roomId)
        if (!room)
            return
        if (self.game.team !== TeamType.BLUE || self.game.camera)
            return
        ++self.game.key
        ++self.score.foundKey
        self.publish(Serialize.NoticeMessage(self.name + (pix.maker(self.name) ? '가' : '이') + ' 키를 발견하다!'))
        self.publish(Serialize.PlaySound('dropen'))
        context.publishToMap(Serialize.RemoveGameObject(context))
        room.removeEvent(context)
    }
}

class EscapeState {
    constructor(args = {}) {
        this.count = 0
    }

    doAction(context, self) {
        const room = Room.get(context.roomId)
        if (!room)
            return
        if (self.game.team === TeamType.RED || self.game.camera)
            return
        if (--self.game.key < 1)
            return self.send(Serialize.InformMessage('<color=red>열쇠가 부족합니다.</color>'))
        const r = parseInt(Math.random() * 3)
        if (r === 0) {
            ++room.mode.score.blue
            ++self.score.escape
            self.game.camera = true
            self.setGraphics('Camera')
            self.publish(Serialize.NoticeMessage(self.name + ' 탈출 성공!'))
            self.publish(Serialize.PlaySound('Rescue'))
            self.publishToMap(self.place, Serialize.RemoveGameObject(self))
        } else {
            self.send(Serialize.InformMessage('<color=red>가짜 열쇠였습니다.</color>'))
            self.publish(Serialize.NoticeMessage(self.name + ' 탈출 시도...'))
            self.publish(Serialize.PlaySound('thump'))
        }
    }

    update(context) {
        if (++this.count % 5 == 0) {
            const { mode } = Room.get(context.roomId)
            for (const red of mode.redTeam) {
                if (red.place === context.place) {
                    const range = Math.abs(red.x - context.x) + Math.abs(red.y - context.y)
                    if (range >= parseInt(mode.redTeam.length / 2) + 2)
                        continue
                    if (red.game.hp < 0) {
                        mode.moveToBase(red)
                        red.game.hp = 100
                        red.send(Serialize.InformMessage('<color=red>탈출구에서 벗어나지 않아 강제로 추방되었습니다.</color>'))
                    } else {
                        red.game.hp -= 20
                        red.send(Serialize.InformMessage('<color=red>탈출구에서 벗어나세요!!!!</color>'))
                        red.send(Serialize.PlaySound('Warn'))
                    }
                }
            }
            this.count = 0
        }
    }
}

class EvelevatorState {
    constructor(args = {}) {
        this.openSound = args['openSound'] || 'eopen'
        this.closeSound = args['closeSound'] || 'eclose'
        this.OppenGraphic = args['OppenGraphic'] || 'blank'
        this.closeGraphic = args['closeGraphic'] || 'ev02'
        this.inside = args['inside'] || false
        this.target = null
        this.count = 0
    }

    doAction(context, self) {
        if (!this.inside || !this.target) return
        self.teleport(this.target.place, this.target.x, this.target.y)
    }

    changeState(context, open, outdoor) {
        context.publishToMap(Serialize.RemoveGameObject(context))
        if (open) {
            context.publishToMap(Serialize.PlaySound(this.openSound))
            context.graphics = this.OppenGraphic
            context.collider = false
            if (this.inside) this.target = outdoor
        } else {
            context.publishToMap(Serialize.PlaySound(this.closeSound))
            context.graphics = this.closeGraphic
            context.collider = true
            this.target = null
        }
        context.publishToMap(Serialize.CreateGameObject(context))
    }

    update(context) {
        if (++this.count % 3 === 0 && this.target) {
            for (const u of Room.get(context.roomId).places[context.place].users) {
                if (u.x === context.x && u.y === context.y)
                    u.teleport(this.target.place, this.target.x, this.target.y)
            }
        }
    }
}

class EvelevatorInsideState {
    constructor(args = {}) {
        this.state = 0 // 0 is Open 1  is closing 2 is moving 3 is waiting
        this.passive = true
        this.inDoor = null
        this.outDoors = {}
        this.outerIds = args['outerId']
        this.innerId = args['elevId']
        this.moveSound = args['moveSound'] || 'einside'
        this.floorMax = Object.keys(this.outerIds).length
        this.floor = '0'
    }

    doAction(context, self) {
        if (this.state === 0) {
            this.passive = false
            let r = parseInt(Math.random() * (this.floorMax))
            let keys = Object.keys(this.outerIds)
            if (keys[r] === this.floor)
                r = (r + 1) % this.floorMax
            this.pushButton(context, keys[r])
        } else if (this.state === 1) {
            self.send(Serialize.InformMessage('<color=#B5E61D>엘레베이터가 문이 닫히는 중이다.</color>'))
        } else if (this.state === 2) {
            self.send(Serialize.InformMessage('<color=#B5E61D>엘레베이터가 ' + this.floor + '층으로 가는 중이다.</color>'))
        } else {
            self.send(Serialize.InformMessage('<color=#B5E61D>엘레베이터가 도착중이다.</color>'))
        }
    }

    pushButton(context, target) {
        if (!Room.get(context.roomId) || this.state != 0) return
        context.publishToMap(Serialize.InformMessage('<color=#B5E61D>' + target + '층이 눌렸습니다. 엘레베이터 문이 닫힙니다.</color>'))

        this.state = 1
        let outDoor

        for (const keys in this.outerIds) {
            if (!this.outDoors[keys])
                this.outDoors[keys] = Room.get(context.roomId).places[this.outerIds[keys]].events.find((e) => e.state instanceof EvelevatorState)
            if (keys === this.floor) {
                outDoor = this.outDoors[keys]
                outDoor.publishToMap(Serialize.InformMessage('<color=#B5E61D>엘레베이터 문이 닫힙니다.</color>'))
            }
        }
        this.floor = target
        setTimeout(() => {
            this.closeDoor(context, outDoor)
        }, 1200)
    }

    closeDoor(context, outDoor) {
        if (!Room.get(context.roomId) || this.state != 1) return

        this.state = 2

        if (outDoor)
            outDoor.state.changeState(outDoor, false)
        if (!this.inDoor)
            this.inDoor = Room.get(context.roomId).places[this.innerId].events.find((e) => e.state instanceof EvelevatorState)

        this.inDoor.state.changeState(this.inDoor, false)
        context.publishToMap(Serialize.PlaySound(this.moveSound))

        setTimeout(() => {
            this.openDoor(context)
        }, 8000)
    }

    openDoor(context) {
        if (!Room.get(context.roomId) || this.state != 2) return

        this.state = 3
        let outDoor = this.outDoors[this.floor]

        outDoor.state.changeState(outDoor, true)
        this.inDoor.state.changeState(this.inDoor, true, outDoor)

        outDoor.publishToMap(Serialize.InformMessage('<color=#B5E61D>엘레베이터 문이 열립니다.</color>'))
        context.publishToMap(Serialize.InformMessage('<color=#B5E61D>' + this.floor + '층 엘레베이터 문이 열립니다.</color>'))

        this.passive = true
        this.count = 0

        setTimeout(() => this.state = 0, 1200)
    }
}

class EvelevatorOutsideState {
    constructor(args = {}) {
        this.elevatorId = args['elevId']
        this.floor = args['floor']
        this.elevatorEvent = null
    }

    doAction(context, self) {
        if (!this.elevatorEvent)
            this.elevatorEvent = Room.get(context.roomId).places[this.elevatorId].events.find((e) => e.state instanceof EvelevatorInsideState)

        const inside = this.elevatorEvent.state
        if (inside.state === 0) {
            if (inside.floor != this.floor)
                inside.pushButton(this.elevatorEvent, this.floor)
        } else if (inside.state === 1) {
            self.send(Serialize.InformMessage('<color=#B5E61D>엘레베이터가 문이 닫히는 중이다.</color>'))
        } else if (inside.state === 2) {
            self.send(Serialize.InformMessage('<color=#B5E61D>엘레베이터가 ' + inside.floor + '층으로 가는 중이다.</color>'))
        } else if (inside.floor != this.floor) {
            self.send(Serialize.InformMessage('<color=#B5E61D>엘레베이터가 ' + inside.floor + '층에 도착중이다.</color>'))
        }

    }
}

class PowerDoorState {
    constructor(args = {}) {
        this.openSound = args['openSound'] || 'door03'
        this.closeSound = args['closeSound'] || 'door04'
        this.knockSound = args['knockSound'] || 'door06'
        this.isOpen = true
        this.hp = 0
    }

    doAction(context, self) {
        const door = context
        if (this.isOpen) {
            if (self.game.team === TeamType.RED) return
            const r = parseInt(Math.random() * 50)
            if (r === 0) {
                self.publishToMap(Serialize.PlaySound(this.closeSound))
                door.move(-1, 0)
                this.isOpen = false
                this.hp *= 5
            } else {
                self.publishToMap(Serialize.PlaySound(this.knockSound))
                this.hp++
            }
        } else {
            if (self.game.team === TeamType.RED && this.hp > 0) {
                self.publishToMap(Serialize.PlaySound(this.knockSound))
                this.hp--
                return
            }
            const max = (self.game.team === TeamType.RED ? 100 : 50)
            const r = parseInt(Math.random() * max)
            if (r === 0) {
                self.publishToMap(Serialize.PlaySound(this.openSound))
                door.move(1, 0)
                this.isOpen = true
                this.hp = 0
            } else {
                self.publishToMap(Serialize.PlaySound(this.knockSound))
            }
        }
    }
}

module.exports = new Proxy({
    door: DoorState,
    tana: TanaState,
    obstacle: ObstacleState,
    akari: AkariState,
    tansu: TansuState,
    fireShop: FireShopState,
    protecter: ProtecterState,
    rescue: RescueState,
    mania: ManiaState,
    rabbit: RabbitState,
    oni: OniState,
    box: BoxState,
    key: KeyState,
    escape: EscapeState,
    elevator: EvelevatorState,
    elevin: EvelevatorInsideState,
    elevout: EvelevatorOutsideState,
    powerDoor: PowerDoorState
}, {
    get: function (target, name) {
        return target.hasOwnProperty(name) ? target[name] : State
    }
})