const assert = require('assert');
const { callAsync } = require('promise-callbacks');

class DejaVu {
  /**
   * Constructs an new instance of DejaVu to identify "original" events.
   * @param {Object} options The constructor options.
   * @param {Object} options.redisConnection A connection to a Redis deployment.
   */
  constructor(options) {
    assert(options.redisConnection, 'Must provide a Redis connection');
    this._redisConnection = options.redisConnection;
    this._handlers = {};
  }

  /**
   * isNew returns if an event is new or not.
   * @param {String} prefix The prefix to namespace events under.
   * @param {Number} timeLimit The timeLimit to filtet event timestamps by (in ms).
   * @param {Function} timestampFn A function for extracting an event's timestamp.
   * @param {Function} idFn A function for extracting an event's ID.
   * @param {Object} eve The event of interest.
   */
  async _isNew(prefix, timeLimit, timestampFn, idFn, eve) {
    const now = Date.now();
    const occurredAt = timestampFn(eve);
    if (!occurredAt) return false;
    if (now - occurredAt > timeLimit) return false;

    const eventId = idFn(eve);
    // Safety belts.
    if (!eventId) return false;

    const val = await callAsync((done) =>
      this._redisConnection.exists(`${prefix}:${eventId}`, done)
    );
    return val === 0;
  }

  /**
   * Marks an event as having been seen. It uses the idFn along with the prefix
   * to generate the key to store the value returned by the valFn under.
   * @property {String} prefix The prefix to namespace the event under.
   * @property {Number} ttl How long the event should live in Redis before
   *     expiring (in seconds).
   * @property {Function} idFn A function for extracting an event's ID.
   * @property {Function} valFn A function for extracting the value to store
   *    for an event in Redis.
   * @property {Object} eve The event to mark as seen.
   */
  async _markAsSeen(prefix, ttl, idFn, valFn, eve) {
    const eventId = idFn(eve);
    return eventId
      ? callAsync((done) =>
          this._redisConnection.setex(`${prefix}:${eventId}`, ttl, valFn(eve), done)
        )
      : // Safety belts.
        undefined;
  }

  /**
   * @typedef EventHandler
   * @property {String} prefix The prefix to use to namespace events.
   * @property {Function} timestampFn A function for extracting when an event
   *    occurred.
   * @property {Function} idFn A function for extracting an event's ID.
   * @property {Function} valFn A function for extracting the value to store
   *    for an event in Redis.
   * @property {Number} timeLimit The number of milliseconds before now, within
   *    which we should consider events.
   * @property {Number} ttl How long an event should remain in Redis before
   *    expiring.
   */

  /**
   * Registers the given handler for the given type.
   * @param {String} type The event type to register the handler for.
   * @param {EventHandler} handler The event handler to register.
   * @throws Error If there was already a handler registered for the given type.
   */
  registerHandler(type, handler) {
    if (this._handlers[type]) throw new Error('cannot overwrite existing handler');

    // Ensure they our required properties exist on the handler.
    assert(handler.prefix, 'Handler must specify a prefix to namespace events.');
    assert(handler.timestampFn, 'Handler must specify a timestampFn.');
    assert(handler.idFn, 'Handler must specify an idFn.');
    assert(handler.valFn, 'Handler must specify a valFn.');
    assert(handler.timeLimit, 'Handler must specify a timeLimit.');

    // Be nice, if the user didn't specify the ttl on the handler, set it for
    // them from the timeLimit.
    if (!handler.ttl) handler.ttl = Math.floor(handler.timeLimit / 1000);

    this._handlers[type] = handler;
  }

  /**
   * Checks if this is the first time we've seen an event of the given type. If
   * it is, we mark the event as seen and return true, otherwise we return
   * false. If the event occurred outside our timeLimit of consideration, we also
   * return false.
   * @param {String} type The type of the event that we're inspecting.
   * @param {Object} eve The event we're inspecting.
   */
  async inspectEvent(type, eve) {
    const handler = this._handlers[type];
    if (!handler) throw new Error('no such handler for the given event type');

    const { prefix, timestampFn, idFn, valFn, timeLimit, ttl } = handler;
    const isNew = await this._isNew(prefix, timeLimit, timestampFn, idFn, eve);
    if (!isNew) return false;
    await this._markAsSeen(prefix, ttl, idFn, valFn, eve);
    return true;
  }
}

module.exports = DejaVu;
