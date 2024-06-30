// 试一下，这里我们需要做一个observable，但是它的值不是由用户传入的，而是根据事件和其他observable计算出来的
// 我们使用mobx来作为这套系统的observable实现
// 我们需要实现的重点是，将事件系统和observable系统结合起来
// 1. 事件源需要被转换成action，当事件源触发时，action会被调用
// 2. action会返回一个新的状态，这个状态会被作为observable的值
// 3. 如果有多个事件触发，那么action会被调用多次，每次返回的状态会被合并
// 4. 合并的方式是，将每次返回的状态进行浅合并
// 5. 事件源可以直接转换成observable，这样我们可以实现混合订阅observable和事件源
// 6. observable可以被转换成事件源，这样可以兼容其他系统

// 给它一个名字，叫做declarative observable

export * from './async';
export * from './event';
export * from './latch';
export * from './observable';
