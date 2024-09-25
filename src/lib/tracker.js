import { parse } from 'user-agent';

const AliWebTrackerConfig = {
    host: 'host',
    project: 'project',
    logStore: 'logStore'
}

function getExtraData() {
    return {
        title: document.title,
        url: location.href,
        timestamp: Date.now(),
        userAgent: parse(navigator.userAgent).name
    }
}

class SendTracker {
    constructor() {
        this.url = `http://${AliWebTrackerConfig.project}.${AliWebTrackerConfig.host}/logstores/${AliWebTrackerConfig.logStore}/track`
        this.xhr = new XMLHttpRequest()
    }

    send(data = {}) {
        let extraData = getExtraData();
        let log = {...extraData, ...data};
        this.xhr.open('POST', this.url, true)
        let body = JSON.stringify({
            "__log__": [
                log
            ]
        });
        this.xhr.setRequestHeader('x-log-apiversion', '0.6.0');
        this.xhr.setRequestHeader('x-log-bodyrawsize', body.length);
        this.xhr.setRequestHeader('Content-Type', 'application/json');
        this.xhr.onload = function() {
            console.log(this.xhr);
        }
        this.xhr.onerror = function(error) {
            console.log(error);
        }
        this.xhr.send(body);
    }
}

export default new SendTracker()
