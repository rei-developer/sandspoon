module.exports = (function () {
    const _static = {
        directionTable: [
            [0, 4, 0],
            [2, 0, 8],
            [0, 6, 0]
        ]
    }

    return class Character {
        constructor () {
            this.x = 0
            this.y = 0
            this.direction = { x: 0, y: -1 }
            this.graphics = 'Mania'
            this.dirty = true
        }

        static get directionTable () {
            return _static.directionTable
        }

        setPosition (x, y) {
            this.x = x
            this.y = y
            this.dirty = true
        }

        move (x, y) {
            this.x += x
            this.y += y
            this.dirty = true
        }

        turn (x, y) {
            this.direction.x = x
            this.direction.y = y
            this.dirty = true
        }

        getDirection (x, y) {
            return Character.directionTable[x + 1][y + 1]
        }
    }
})()