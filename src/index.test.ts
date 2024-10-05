import { describe, it, expect, vi } from 'vitest';
import { TorControlPort, renewTorSession, torfetch } from './index';
import { SocksProxyAgent } from 'socks-proxy-agent';
import axios from 'axios';
import net from 'net';

vi.mock('axios');
vi.mock('net');

const dummyURL = 'http://example.com';

const mockAxiosResponse = (data: any, status = 200) => {
  (axios as any).mockResolvedValue({
    data,
    status,
    statusText: 'OK',
  });
};

describe('torfetch', () => {
  it('should make a GET request using torfetch.get', async () => {
    const mockResponseData = 'mock data';
    mockAxiosResponse(mockResponseData);

    const response = await torfetch.get(dummyURL);
    expect(response.status).toBe(200);
    expect(response.statusText).toBe('OK');
    expect(await response.text()).toBe(mockResponseData);
  });

  it('should create SOCKS proxy agent', () => {
    const agent = new SocksProxyAgent('socks://127.0.0.1:9050');
    expect(agent).toBeInstanceOf(SocksProxyAgent);
  });

  it('should attach error details for ECONNREFUSED errors', async () => {
    const error = new Error('ECONNREFUSED');
    (axios as any).mockRejectedValue(error);
    try {
      await torfetch(dummyURL);
    } catch (err: any) {
      expect(err.message).toContain('Are you running `tor`?');
    }
  });
});

describe('TorControlPort', () => {
  it('should send commands to Tor ControlPort', async () => {
    const socketMock = {
      write: vi.fn(),
      on: vi.fn((event, callback) => {
        if (event === 'data') {
          callback('250 OK');
        }
        if (event === 'end') {
          callback();
        }
      }),
    };
    (net.connect as any).mockReturnValue(socketMock);

    await new Promise<void>((resolve, reject) => {
      TorControlPort.send(['signal newnym'], (err, data) => {
        try {
          expect(err).toBeNull();
          expect(data).toContain('250 OK');
          resolve();
        } catch (e) {
          reject(e);
        }
      });
    });
  });

  it('should attach error details when sending to ControlPort fails', async () => {
    const socketMock = {
      write: vi.fn(),
      on: vi.fn((event, callback) => {
        if (event === 'error') {
          callback(new Error('Failed to connect'));
        }
      }),
    };
    (net.connect as any).mockReturnValue(socketMock);

    await new Promise<void>((resolve, reject) => {
      TorControlPort.send(['signal newnym'], (err) => {
        try {
          expect(err).toBeInstanceOf(Error);
          expect(err?.message).toContain('Have you enabled the ControlPort in your `torrc` file?');
          resolve();
        } catch (e) {
          reject(e);
        }
      });
    });
  });
});

describe('renewTorSession', () => {
  it('should successfully renew Tor session', async () => {
    const socketMock = {
      write: vi.fn(),
      on: vi.fn((event, callback) => {
        if (event === 'data') {
          callback('250 OK\n250 OK\n250 closing connection');
        }
        if (event === 'end') {
          callback();
        }
      }),
    };
    (net.connect as any).mockReturnValue(socketMock);

    await new Promise<void>((resolve, reject) => {
      renewTorSession((err, message) => {
        try {
          expect(err).toBeNull();
          expect(message).toBe('Tor session successfully renewed!!');
          resolve();
        } catch (e) {
          reject(e);
        }
      });
    });
  });

  it('should handle error while renewing Tor session', async () => {
    const socketMock = {
      write: vi.fn(),
      on: vi.fn((event, callback) => {
        if (event === 'data') {
          callback('515 Something went wrong');
        }
        if (event === 'end') {
          callback();
        }
      }),
    };
    (net.connect as any).mockReturnValue(socketMock);

    await new Promise<void>((resolve, reject) => {
      renewTorSession((err) => {
        try {
          expect(err).toBeInstanceOf(Error);
          expect(err?.message).toContain('Error communicating with Tor ControlPort');
          resolve();
        } catch (e) {
          reject(e);
        }
      });
    });
  });
});