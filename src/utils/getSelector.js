function getSelector(path) {
    console.log('getSelector', path);

    return path.reverse().filter(el => {
        return el !== document && el !== window;
    }).map(el => {
        if(el.id) {
            return `${el.nodeName.toLowerCase()}#${el.id}`
        }else if(el.className) {
            if(typeof el.className === 'string') {
                return `${el.nodeName.toLowerCase()}.${el.className}`
            }else {
                return `${el.nodeName.toLowerCase()}.${el.className.join('.')}`
            }
        }else {
            return el.nodeName.toLowerCase()
        }
    }).join(' ')
}

function composedPath(event) {
    if(event.path) {
        return event.path
    }

    let target = event.target
    event.path = []
    while(target.parentNode !== null) {
        event.path.push(target)
        target = target.parentNode
    }

    event.path.push(document, window)

    return event.path
}

export default function (event) {
    console.log('event', event);

    const path = composedPath(event);
    if(Array.isArray(path)) {
        return getSelector(path)
    }
    return ''
}
