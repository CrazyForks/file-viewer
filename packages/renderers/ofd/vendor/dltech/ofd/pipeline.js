
'use strict';
const _pipeline = async function(...funcs){
  let value;
  for (let index = 0; index < funcs.length; index += 1) {
    value = await funcs[index].call(this, value);
  }
  return value;
};

export const pipeline = _pipeline;
