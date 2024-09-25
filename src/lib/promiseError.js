import getLastEvent from '../utils/getLastEvent';
import getSelector from '../utils/getSelector';
import tracker from './tracker';

export function injectPromiseError() {
    window.addEventListener('unhandledrejection', function(event) {
        let lastEvent = getLastEvent();
        console.log('PromiseError', event);
        let message = event.message
        let filename, lineno = 0, colno = 0, stack
        if(typeof event.reason === 'string') {
            message = event.reason
        }else if(typeof event.reason === 'object') {
            if(event.reason.stack) {
                let match = event.reason.stack.match(/at\s+(.+):(\d+):(\d+)/)
                filename = match[1];
                lineno = match[2];
                colno = match[3];
            }
            stack = getStack(event.reason.stack);
        }
        let log = {
            kind: 'stability',  // 大类型
            type: 'error',      // 小类型
            errorType: 'promiseError', // 错误类型
            message, // 报错信息
            filename, // 文件名
            position: `${lineno}:${colno}`, // 错误定位
            stack, // 报错堆栈
            selector: lastEvent? getSelector(lastEvent): '', // 选中DOM节点
        }
        console.log('log', log);
        tracker.send(log);
    })
}

function getStack(stack) {
    return stack.split('\n').slice(1).map(item => item.replace(/^\s+at\s+/g, "")).join('^')
}



