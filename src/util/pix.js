function sample(array, count = 1) {
    const copy = array.slice()
    const iter = []
    count = Math.min(count, copy.length)
    while (count) {
        const index = parseInt(Math.random() * copy.length)
        iter.push(copy[index])
        copy.splice(index, 1)
        --count
    }
    return iter
}

function maker(text = '가') {
    if (text)
        return (text[txt.length - 1].charCodeAt() - 44032) % 28 === 0
    else
        return ''
}

function ENUM(...args) {
    const kv = {}
    for (let i = 0; i < args.length; i++)
        kv[args[i]] = i
    return kv
}

module.exports = {
    sample,
    maker,
    ENUM
}