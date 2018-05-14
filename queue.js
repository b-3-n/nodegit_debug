'use strict';

const assert = require('assert');

// Queue that takes an asynchronous function that is called when dequeuing an
// item. The queue automatically drains itself until it is empty, thus the API
// has no dequeue function. Allows to specify the number of parallel invocations
// of the function.
class Queue {
  // - fn(key, value). Must return a promsie.
  // - maxParallel: The maximum number of parallel invocations of fn.
  constructor(fn, maxParallel) {
    this.fn_ = fn;
    this.maxParallel_ = maxParallel;

    // Instead of an array with expensive shifting operations we use a Set which
    // preserves insertion order.
    this.entries_ = new Set();
    this.inProgress_ = 0;
  }

  // Add key value pair for processing.
  Enqueue(value) {
    const promise = new Promise((resolve, reject) => {
      this.entries_.add({resolve, reject, value});
    }); 
    this.Dequeue_();
    return promise;
  }

  // Returns the current queue size.
  Size() {
    return this.entries_.size;
  }
  
  FinishSuccessfully_(itVal, res) {
    this.entries_.delete(itVal[0]);
    --this.inProgress_;
    this.Dequeue_();
    itVal[0].resolve(res);
  }

  FinishUnsuccessfully_(itVal, err) {
    this.entries_.delete(itVal[0]);
    --this.inProgress_;
    this.Dequeue_();
    itVal[0].reject(err);
  }

  Dequeue_() {
    if (this.inProgress_ < this.maxParallel_ && this.Size() > this.inProgress_) {
      const it = this.entries_.entries();
      for (let i = 0; i < this.inProgress_; ++i) {
        assert(!it.next().done);
      }
      const itVal = it.next().value;
      const [{resolve, reject, value}, _] = itVal;
      ++this.inProgress_;

      let promise;
      try {
        promise = this.fn_(value)
      } catch(err) {
        this.FinishUnsuccessfully_(itVal, err);
        return;
      }
      promise.then(res => {
        this.FinishSuccessfully_(itVal, res);
      }).catch(err => {
        this.FinishUnsuccessfully_(itVal, err);
      }) 
    }
  }
}

module.exports = Queue;
