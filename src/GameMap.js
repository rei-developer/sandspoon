const fs = require('fs')
const { promisify } = require('util')
const DB = require('./DB')

const readFile = promisify(fs.readFile)

module.exports = (function () {
    const _static = {
        maps: {}
    }

    return class GameMap {
        static get maps() {
            return _static.maps
        }

        static add(map) {
            GameMap.maps[map.id] = map
        }

        static get(id) {
            return GameMap.maps[id]
        }

        static async load(id) {
            const data = await readFile('./Assets/Maps/' + id + '.json')
            const mapdata = JSON.parse(data)
            return await new GameMap(id, mapdata)
        }

        constructor(id, { width, height, data, collisions, priorities }) {
            this.id = id
            this.width = width
            this.height = height
            this.data = data
            this.collisions = collisions
            this.priorities = priorities
            this.portals = []
            return (async () => {
                const portals = await DB.LoadPortals(this.id)
                for (const portal of portals) {
                    this.portals.push({
                        place: portal.place,
                        x: portal.x,
                        y: portal.y,
                        nextPlace: portal.next_place,
                        nextX: portal.next_x,
                        nextY: portal.next_y,
                        nextDirX: portal.next_dir_x,
                        nextDirY: portal.next_dir_y,
                        sound: portal.sound
                    })
                }
                return this
            })()
        }

        getPortal(x, y) {
            for (const portal of this.portals)
                if (portal.x === x && portal.y === y)
                    return portal
            return null
        }

        rangePortal(x, y, range) {
            for (const p of this.portals)
                if (Math.pow(Math.abs(p.x - x), 2) + Math.pow(Math.abs(p.y - y), 2) <= range * range)
                    return true
            return false
        }

        isPassable(x, y, d) {
            if (!this.isValid(x, y))
                return false
            const bit = parseInt((1 << (parseInt(d / 2) - 1)) & 0x0f)
            for (let z = this.data.length - 1; z >= 0; --z) {
                const tileId = this.data[z][x + y * this.width]
                if (tileId === 0)
                    continue
                const collision = this.collisions[tileId - 1]
                if ((collision & bit) != 0)
                    return false
                else if ((collision & 0x0f) === 0x0f)
                    return false
                else if (this.priorities[tileId - 1] === 0)
                    return true
            }
            return true
        }

        isValid(x, y) {
            return (x >= 0 && x < this.width && y >= 0 && y < this.height)
        }
    }
})()