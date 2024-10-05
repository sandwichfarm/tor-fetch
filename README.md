# @sandwichfarm/torfetch

**TorFetch**: Fetch API over the Tor network.

## Installation

```bash
npm install @sandwichfarm/torfetch
```

## Usage

```javascript
import torFetch from '@sandwichfarm/torfetch';

(async () => {
  try {
    const response = await torFetch('https://check.torproject.org/');
    const body = await response.text();
    console.log(body);
  } catch (error) {
    console.error('Error:', error);
  }
})();
```

## Features

- Fetch API over the Tor network.
- Supports renewing Tor sessions via ControlPort.
- Conditional Node.js imports for compatibility.

## Requirements

- **Node.js environment with Tor running**.
- For ControlPort functionality, ensure ControlPort is enabled in your `torrc` file.

## Notes

This package is primarily designed for **Node.js environments**. Due to limitations with accessing the Tor network and Node.js-specific modules, browser environments are not fully supported. Use in browser environments may result in errors or limited functionality.

## Enabling ControlPort

To use the ControlPort functionality (e.g., to renew Tor sessions), you need to enable the ControlPort in your `torrc` file.

### Sample `torrc` file:

```
ControlPort 9051
HashedControlPassword 16:AEBC98A67.....E81DF
```

Generate `HashedControlPassword` with:

```bash
tor --hash-password my_secret_password
```

Tell `torFetch` the password to use:

```javascript
import torFetch from '@sandwichfarm/torfetch';

torFetch.TorControlPort.password = 'my_secret_password';
```

## License

MIT