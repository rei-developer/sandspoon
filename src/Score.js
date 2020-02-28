module.exports = class Score {
    constructor() {
        this.init()
    }

    init() {
        this.sum = 0
        this.kill = 0
        this.killForWardrobe = 0
        this.killCombo = 0
        this.death = 0
        this.deathForWardrobe = 0
        this.assist = 0
        this.blast = 0
        this.rescue = 0
        this.rescueCombo = 0
        this.escape = 0
        this.survive = 0
        this.surviveForWardrobe = 0
        this.foundKey = 0
    }

    send(self) {
        self.kill += this.kill + this.killForWardrobe
        self.death += this.death + this.deathForWardrobe
        self.assist += this.assist
        self.blast += this.blast
        self.rescue += this.rescue
        self.rescueCombo += this.rescueCombo
        self.escape += this.escape
        self.survive += this.survive + this.surviveForWardrobe
        this.init()
    }
}