const fs = require('fs')

class Logger {
    constructor (prefix, display = false) {
        this.prefix = prefix
        this.logs = []
        this.display = display
    }

    log (message) {
        const logging = this.prefix + ' ' +  message + ' ' + new Date()
        if (this.display) console.log(logging)
        this.logs.push(logging)
    }

    writeFile (path) {
        fs.writeFileSync(path, this.logs.join('\n'), 'utf8')
    }
}

module.exports = Logger