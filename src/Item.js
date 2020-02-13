const Methods = require('./Methods')

global.Item = (function () {
    const _static = {
        items: {},
    }

    return class Item {
        static get items() {
            return _static.items
        }

        static get(id) {
            return Item.items[id]
        }

        constructor(id = 1, type = 0, icon = '', name = '', creator = '', description = '', cost = 0, isCash = false, method = { command: '', arguments: {} }) {
            this.id = id
            this.type = type
            this.icon = icon
            this.name = name
            this.creator = creator
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