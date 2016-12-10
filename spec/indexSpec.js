'use strict';

const _ = require('underscore');
const DejaVu = require('..');
const redis = require('redis');

describe('DejaVu', () => {
  
  describe('new DejaVu', () => {
    it('should throw if constructed without a Redis connection', () => {
      expect(() => { new DejaVu({}) }).toThrowError(/Must provide a Redis connection/);
    });
  });

  describe('registerHandler', () => {
    const handlerProto = {
      prefix: 'foo',
      timestampFn: () => {},
      idFn: () => {},
      valFn: () => {},
      window: 60 * 60 * 1000 // one hour window
    };
    
    it('should be able to register a handler', () => {
      let dv = new DejaVu({redisConnection: 'yolo'});
      dv.registerHandler('type0', handlerProto);
      expect(dv._handlers['type0']).not.toBeUndefined();
    });

    it('should throw if the handler is missing the prefix property', () => {
      let dv = new DejaVu({redisConnection: 'yolo'});
      expect(() => {
        dv.registerHandler('type0', {});
      }).toThrowError(/Handler must specify a prefix to namespace events./);
    });

    it('should throw if the handler is missing the timestampFn property', () => {
      let dv = new DejaVu({redisConnection: 'yolo'});
      expect(() => {
        dv.registerHandler('type0', _.pick(_.clone(handlerProto), 'prefix'));
      }).toThrowError(/Handler must specify a timestampFn./);
    });

    it('should throw if the handler is missing the idFn property', () => {
      let dv = new DejaVu({redisConnection: 'yolo'});
      expect(() => {
        dv.registerHandler('type0', _.pick(_.clone(handlerProto), 'prefix', 'timestampFn'));
      }).toThrowError(/Handler must specify an idFn./);
    });

    it('should throw if the handler is missing the valFn property', () => {
      let dv = new DejaVu({redisConnection: 'yolo'});
      expect(() => {
        dv.registerHandler('type0', _.omit(_.clone(handlerProto), 'valFn', 'window'));
      }).toThrowError(/Handler must specify a valFn./);
    });

    it('should throw if the handler is missing the window property', () => {
      let dv = new DejaVu({redisConnection: 'yolo'});
      expect(() => {
        dv.registerHandler('type0', _.omit(_.clone(handlerProto), 'window'));
      }).toThrowError(/Handler must specify a window./);
    });

    it('should throw if we try to register mutliple handlers for the same type', () => {
      let dv = new DejaVu({redisConnection: 'yolo'});
      
      expect(() => {
        dv.registerHandler('type0', _.clone(handlerProto));
      }).not.toThrowError(/cannot overwrite existing handler/);

      expect(() => {
        dv.registerHandler('type0', _.clone(handlerProto));
      }).toThrowError(/cannot overwrite existing handler/);
    });
  });

  describe('inspectEvent', () => {
    const handler = {
      prefix: 'foo',
      timestampFn: (eve) => eve.timestamp,
      idFn: (eve) => eve._id,
      valFn: (eve) => eve.val,
      window: 60 * 60 * 1000 // one hour window
    };

    const redisConnection = redis.createClient('redis://localhost:6379', { db: 1 });
    const dv = new DejaVu({ redisConnection });
    dv.registerHandler('type0', handler);

    beforeEach((done) => {
      redisConnection.flushdb(done);
    });
    
    it('should ignore events outside the desired window', (done) => {
      const eve = {
        _id: 'yolo1',
        timestamp: Date.now(),
        val: 'yolo1val'
      };

      dv.inspectEvent('type0', eve, (err, val) => {
        // This should be the first time we've seen this event, so val === true.
        expect(err).toBe(null);
        expect(val).toBe(true);

        dv.inspectEvent('type0', eve, (err, val) => {
          // We just saw this event, so now val === false.
          expect(err).toBe(null);
          expect(val).toBe(false);
          done();
        });
      });
    });
  });
});
