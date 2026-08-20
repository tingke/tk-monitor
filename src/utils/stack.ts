/** 堆栈按行拆分、去掉首行错误信息、^ 连接（迁移自旧代码并加空值防护） */
export function formatStack(stack?: string): string | undefined {
  if (!stack) return undefined;
  return stack
    .split('\n')
    .slice(1)
    .map((line) => line.replace(/^\s*at\s+/, ''))
    .join('^');
}
