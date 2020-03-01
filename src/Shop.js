const Methods = require('./Methods')

global.Shop = (function () {
    const _static = {
        shops: {},
    }

    return class Shop {
        static get shops() {
            return _static.shops
        }

        static get(id) {
            return Shop.shops[id]
        }

        constructor(id = 1, type = 0, icon = '', name = '', creator = '', creatorId = 0, description = '', cost = 0, isCash = false, method = { command: '', arguments: {} }) {
            this.id = id
            this.type = type
            this.icon = icon
            this.name = name
            this.creator = creator
            this.creatorId = creatorId
            this.description = description
            this.cost = cost
            this.isCash = isCash
            this.method = new Methods[method.command](method.arguments)
        }

        doing(self) {
            this.method.doing(self, this)
        }
    }
})()