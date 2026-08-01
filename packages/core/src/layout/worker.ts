import type { LayoutInput, LayoutResult } from './types';
import { computeForceLayout } from './algorithms/force';

// A simple Web Worker wrapper for offloading layout computation
// The host app can instantiate this worker or provide its own.

self.addEventListener('message', (event: MessageEvent<LayoutInput>) => {
  const input = event.data;
  
  let result: LayoutResult;
  switch (input.algorithm) {
    case 'force':
    default:
      result = computeForceLayout(input);
      break;
  }

  self.postMessage(result);
});
