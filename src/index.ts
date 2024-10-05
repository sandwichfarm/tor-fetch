import SocksProxyAgent from 'socks-proxy-agent';
import axios from 'axios';
import crossFetch, { Request, Response } from 'cross-fetch';
import type { Agent } from 'http';

let net: typeof import('net') | undefined;
let os: typeof import('os') | undefined;
let fs: typeof import('fs') | undefined;
let path: typeof import('path') | undefined;

// Conditionally import Node.js-specific modules if running in a Node.js environment
if (typeof window === 'undefined') {
  net = require('net');
  os = require('os');
  fs = require('fs');
  path = require('path');
}

interface ProxySettings {
  ipaddress: string;
  port: number;
  type: number;
}

let _defaultProxySettings: ProxySettings = createProxySettings('localhost', 9050);

/**
 * Creates proxy settings for Tor.
 * @param ipaddress - The IP address of the Tor proxy.
 * @param port - The port of the Tor proxy.
 * @param type - The type of the proxy (e.g., 4 or 5).
 * @returns The proxy settings object.
 */
const createProxySettings = (ipaddress?: string, port?: number, type?: number): ProxySettings => {
  const dps = _defaultProxySettings || {};
  const proxySetup: ProxySettings = {
    ipaddress: ipaddress || dps.ipaddress || '127.0.0.1',
    port: port || dps.port || 9050,
    type: type || dps.type || 5,
  };

  if (proxySetup.ipaddress === 'localhost') {
    proxySetup.ipaddress = '127.0.0.1';
  }

  return proxySetup;
};

/**
 * Attaches common error details for Tor-related errors.
 * @param err - The error object to attach details to.
 */
const attachCommonErrorDetails = (err: Error | null) => {
  if (!err || typeof err.message !== 'string') return;

  if (err.message.includes('ECONNREFUSED') || err.message.toLowerCase() === 'socket closed') {
    const attachment = `


 - Are you running \`tor\`?
See easy guide here (OSX, Linux, Windows):
https://github.com/talmobi/tor-request#requirements

 Quickfixes:
  OSX: \`brew install tor && tor\`         # installs and runs tor
  Debian/Ubuntu: \`apt-get install tor\`   # should auto run as daemon after install
  Windows: download the Windows Expert Bundle from \`https://www.torproject.org/download/tor/\`
           Unzip and run tor.exe inside the Tor/ directory.
`;
    if (!err.message.includes(attachment)) {
      err.message += attachment;
    }
  }
};

/**
 * Attaches common error details for Tor ControlPort-related errors.
 * @param err - The error object to attach details to.
 */
const attachCommonControlPortErrorDetails = (err: Error | null) => {
  if (!err || typeof err.message !== 'string') return;

  if (err) {
    const attachment = ` - Have you enabled the ControlPort in your \`torrc\` file? (${getTorrcLocation()})

See easy guide here (OSX, Linux, Windows):
https://github.com/talmobi/tor-request#optional-configuring-tor-enabling-the-controlport

 Sample torrc file:
     ControlPort 9051
     HashedControlPassword 16:AEBC98A67.....E81DF

   Generate HashedControlPassword with (last output line):
     \`tor --hash-password my_secret_password\`

   Tell tor-request the password to use:
     \`import torFetch from "tor-request";
      torFetch.TorControlPort.password = "my_secret_password";\`
`;
    if (!err.message.includes(attachment)) {
      err.message += attachment;
    }
  }
};

/**
 * Gets the location of the Tor configuration file (torrc).
 * @returns The location of the torrc file or an error message if not found.
 */
const getTorrcLocation = (): string => {
  if (typeof path === 'undefined' || typeof fs === 'undefined' || typeof os === 'undefined') {
    return 'torrc not available in browser environment';
  }

  const suffixes = ['', '.sample'];
  const paths = [
    '/usr/local/etc/tor/torrc',
    '/tor/etc/tor/torrc',
    '/etc/tor/torrc',
    '/lib/etc/tor/torrc',
    '~/.torrc',
    '~/Library/Application Support/TorBrowser-Data/torrc',
  ];

  for (const torPath of paths) {
    for (const suffix of suffixes) {
      const resolvedPath = path.resolve(torPath + suffix).replace('~', os.homedir());
      try {
        if (fs.existsSync(resolvedPath)) {
          return torPath + ' ?';
        }
      } catch (err) {
        // ignore
      }
    }
  }

  return 'torrc not found, specify with `tor --default-torrc <PATH>`';
};

/**
 * Creates a SOCKS proxy agent for Tor.
 * @param url - The URL for which to create the agent.
 * @returns The SOCKS proxy agent.
 */
const createAgent = (url: string): Agent => {
  const ps = createProxySettings();

  let protocol = 'socks://';
  switch (String(ps.type)) {
    case '4':
      protocol = 'socks4://';
      break;
    default:
      protocol = 'socks://';
  }

  const proxyUri = `${protocol}${ps.ipaddress}:${ps.port}`;
  return new SocksProxyAgent(proxyUri) as Agent;
};

/**
 * Makes a request through Tor similar to the fetch API.
 * @param input - The request input, either a string URL or a Request object.
 * @param init - The request initialization options.
 * @returns A Promise that resolves to a Response object.
 */
const torFetch = async (input: Request | string, init?: RequestInit): Promise<Response> => {
  const { signal } = init || {};
  const url = typeof input === 'string' ? input : input.url;

  const params = {
    url,
    method: init?.method || 'GET',
    headers: init?.headers,
    data: init?.body,
    signal: init?.signal,
    httpAgent: createAgent(url),
  };

  try {
    const res = await axios(params);
    return new Response(res.data, { status: res.status, statusText: res.statusText });
  } catch (err) {
    if (axios.isCancel(err)) {
      throw new Error('Request was aborted');
    }
    attachCommonErrorDetails(err as Error);
    throw err;
  }
};

/**
 * Creates a verb function for HTTP methods.
 * @param verb - The HTTP method.
 * @returns A function that makes a request using the specified HTTP method.
 */
const verbFunc = (verb: string) => {
  const method = verb === 'del' ? 'DELETE' : verb.toUpperCase();
  return async (uri: string, options?: RequestInit) => {
    return torFetch(uri, { ...options, method });
  };
};

torFetch.get = verbFunc('get');
torFetch.head = verbFunc('head');
torFetch.post = verbFunc('post');
torFetch.put = verbFunc('put');
torFetch.patch = verbFunc('patch');
torFetch.del = verbFunc('del');

interface TorControlPortType {
  password: string;
  host: string;
  port: number;
  send: (commands: string[], done: (err: Error | null, data?: string) => void) => void;
}

const TorControlPort: TorControlPortType = {
  password: '',
  host: 'localhost',
  port: 9051,

  /**
   * Sends commands to the Tor ControlPort.
   * @param commands - The array of commands to send.
   * @param done - The callback function.
   */
  send: (commands: string[], done: (err: Error | null, data?: string) => void) => {
    if (typeof net === 'undefined') {
      done(new Error('ControlPort is not available in browser environment'));
      return;
    }

    const socket = net.connect({
      host: TorControlPort.host,
      port: TorControlPort.port,
    }, () => {
      const commandString = commands.join('\n') + '\n';
      socket.write(commandString);
    });

    socket.on('error', (err) => {
      attachCommonControlPortErrorDetails(err);
      done(err || new Error('ControlPort communication error'));
    });

    let data = '';
    socket.on('data', (chunk) => {
      data += chunk.toString();
    });

    socket.on('end', () => {
      done(null, data);
    });
  },
};

/**
 * Renews the Tor session by sending a newnym signal to the ControlPort.
 * @param done - The callback function.
 */
const renewTorSession = (done: (err: Error | null, message?: string) => void) => {
  const password = TorControlPort.password || '';
  const commands = [
    `authenticate "${password}"`,
    'signal newnym',
    'quit',
  ];

  TorControlPort.send(commands, (err, data) => {
    if (err) {
      attachCommonControlPortErrorDetails(err);
      done(err);
      return;
    }

    const lines = data?.split(os?.EOL || '\n').slice(0, -1);
    const success = lines.every((val) => val.length <= 0 || val.includes('250'));

    if (!success) {
      const comerr = new Error(`Error communicating with Tor ControlPort\n${data}`);
      attachCommonControlPortErrorDetails(comerr);
      done(comerr);
      return;
    }

    done(null, 'Tor session successfully renewed!!');
  });
};

export default torFetch;