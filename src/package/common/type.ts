import type { App } from 'vue'

/**
 * 声明vue包装
 */
export interface AppWrapper {
  $el: Node,

  unmount(): void
}

/**
 * 声明别名
 */
export type Rendered = App | AppWrapper;

/**
 * 文件引用，支持三种
 */
export type FileRef = File | Blob | ArrayBuffer;

/**
 * 文件处理逻辑，用于声明文件处理器
 * @param buffer 二进制缓存
 * @param target 目标dom
 * @param type 目标扩展名。部分渲染器会用它选择语言、容错策略或格式提示。
 */
export type FileHandler = (buffer: ArrayBuffer, target: HTMLDivElement, type?: string) => Promise<Rendered>;

/**
 * 文件处理器组合
 */
export interface FileHandlerComposite {

  // 可接受的类型
  accepts: Array<string>;
  // 处理器
  handler: FileHandler
}
