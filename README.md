# SLS handler factory

Some helpers for easily manage AWS Lambda handlers creation.

### Prerequisites

Requires aws-sdk package (if executed in AWS Lambda, it is already installed).

```
npm install --save-dev aws-sdk
```

### Usage

For detailed documentation, look typescript files.

The main class is `HandlerFactory`, this is a handlers factory, and adds some sugar, as an event emitter, async callbacks and simple async handler manage.

```typescriptº
import {HandlerFactory} from 'sls-handler-factory';
const factory = new HandlerFactory();
factory.eventEmitter.on('error', (err) => console.log(err.stack));
factory.callbacks.onSucceeded(async () => {
	// Here you can handle infrastructure, e.g. here you could persist the domain state.
});
export const handle = factory.build(async (input, ctx) => {
	// Here lies your domain logic.
});
```

## npm scripts

Build the js files from typescript:

```
npm run build
```

Running tests:

```
npm run test
```

Running style check:

```
npm run style
```

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests to us.

## Versioning

We use [SemVer](http://semver.org/) for versioning. For the versions available, see the tags on this repository.

## Authors

- **Aitor Guerrero** - _Initial work_ - [AitorGuerrero](https://github.com/AitorGuerrero)

## License

This project is licensed under the ISC License - see the [LICENSE.md](LICENSE.md) file for details
