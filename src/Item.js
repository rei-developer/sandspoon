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

        constructor(id = 1, num = 1, icon = '', name = '', description = '', cost = 0, method = { command: '', arguments: {} }) {
            this.id = id
            this.num = num
            this.icon = icon
            this.name = name
            this.description = description
            this.cost = cost
            this.method = new Methods[method.command](method.arguments)
        }

        doing(self) {
            this.method.doing(self, this)
        }
    }
})()