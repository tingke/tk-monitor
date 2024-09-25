import getLastEvent from '../utils/getLastEvent';
import getSelector from '../utils/getSelector';
import tracker from './tracker';

export function injectJsError() {
    window.addEventListener('error', function(event) {
        let lastEvent = getLastEvent();
        console.log('JsError', event);

        if(event.target && (event.target.src || event.target.link)) {
            let log = {
                kind: 'stability',  // 大类型
                type: 'error',      // 小类型
                errorType: 'resourceError', // js执行错误
                filename: event.target.src || event.target.href, // 文件名
                tagName: event.target.tagName, // 标签名
                selector: getSelector(event), // 选中DOM节点
            }
            console.log('log', log);
            tracker.send(log);
        }else {

            let log = {
                kind: 'stability',  // 大类型
                type: 'error',      // 小类型
                errorType: 'jsError', // js执行错误
                message: event.message, // 报错信息
                filename: event.filename, // 文件名
                position: `${event.lineno}:${event.colno}`, // 错误定位
                stack: getStack(event.error.stack), // 报错堆栈
                selector: lastEvent? getSelector(lastEvent): '', // 选中DOM节点
            }
            console.log('log', log);
            tracker.send(log);
        }

    }, true)
}

function getStack(stack) {
    return stack.split('\n').slice(1).map(item => item.replace(/^\s+at\s+/g, "")).join('^')
}



