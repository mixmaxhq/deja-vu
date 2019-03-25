deja-vu
=======
No one likes having to do a double take, particularly when the data in your
`console` suspiciously looks nothing like the schema that is defined in the
documentation that you've conveniently immediately adjacent to you logs.
But this is the real world, and the world that that documentation you've been
trying to religiously follow for the last seven hours doesn't exist. I'm sorry.
It's true. What's even better is when a service doesn't only give you "good"
data, but it also gives it to you multiple times (without warning). While
you can only really ¯\_(ツ)_/¯ at blatantly wrong schema, deja-vu will take
care or filtering our all those pesky "_duplicate_" events. That's right,
it's time for less face-palming - so let's see how deja-vu works.

## Installation
deja-vu ia a node module, so, you know, use npm.
```sh
npm install deja-vu --save
```

## Usage
deja-vu is designed on a simple principle, if you can tell deja-vu how to
uniquely identify an event and how to know when it originall occurred. Then
deja-vu will handle ignoring duplicate events. The one other thing that
deja-vu relies on is a connection to a Redis deployment.

```js
const DejaVu = require('deja-vu');
const redis = require('redis');

const deja = new DejaVu({
  redisConnection: redis.createClient(process.env.REDIS_LOCATION)
});
```

After that, to use deja-vu, simply tell it how to understand your event.
```js
deja.registerHandler('warmFuzzy', {
  prefix: 'warmFuzzies', // Used to namespace keys in Redis
  timestampFn: (eve) => eve.timestamp, // A function for extracting a ms timestamp
  idFn: (eve) => eve._id, // A function for extracting a unique identifier
  valFn: (eve) => eve.val, // A function for extracting something fun to store as the value.
  timeLimit: 60 * 60 * 1000 // Explained below
});
```

The only non-obvious parameter from above is `timeLimit`. It is used in order to
define a time frame, outside of which we will not consider an event. This is the
one truly hard and fast requirement of deja-vu as it means we can't replay
extremely old events that we _might_ want to process (for example if you were
having a bad day, your queuing cluster blew up and now you need to reprocess
events). However, you can always use the `timestampFn` to get around this.

After you've told deja-vu how to interact with your events, we can unleash
it on the world! It's extremely simple to use:

```js
deja.inspectEvent('warmFuzzies', {
  _id: 'oldFlame',
  timestamp: 1401587522000, // Oh so long ago..
  val: 'our tires were slashed'
}).then((seen) => {
  if (seen) {
    console.log('this is the first time we\'ve seen this event.');
  } else {
    console.log('we\'ve seen this event in within the time limit.');
  }
}).catch((err) => {
  console.log('womp womp, failed to check your event: ' + err);
});

```
